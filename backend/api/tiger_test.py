"""Tiger Test (محاكي اختبار النمر) — question pool, session building, scoring."""
from __future__ import annotations

import random
from typing import Any

from django.db.models import Exists, OuterRef, Prefetch, Q

from django.core.cache import cache

from .models import (
    Question,
    Answer,
    TigerTestSession,
    TigerTestUsedQuestion,
    TigerTestSettings,
    Video,
    Lesson,
    IncorrectAnswer,
)
from .tiger_test_demo import make_demo_slots
from .chapter_dashboard import TIGER_SLOT_CACHE_KEY, TIGER_SLOT_CACHE_TTL

VERBAL_SUBJECT_ID = "مادة_اللفظي"
QUANT_SUBJECT_ID = "مادة_الكمي"
SECTION_COUNT = 5
VERBAL_PER_SECTION = 13
QUANT_PER_SECTION = 11
QUESTIONS_PER_SECTION = VERBAL_PER_SECTION + QUANT_PER_SECTION  # 24
SECTION_SECONDS = 24 * 60
VERBAL_TOTAL = VERBAL_PER_SECTION * SECTION_COUNT  # 65
QUANT_TOTAL = QUANT_PER_SECTION * SECTION_COUNT  # 55
TOTAL_QUESTIONS = SECTION_COUNT * QUESTIONS_PER_SECTION  # 120
VERBAL_WINDOW_STARTS = (0, 13, 26, 39, 52)

SECTION_TITLES = [
    "1 - القسم الأول",
    "2 - القسم الثاني",
    "3 - القسم الثالث",
    "4 - القسم الرابع",
    "5 - القسم الخامس",
]

SUBJECT_LABELS = {
    "verbal": "اللفظي",
    "quant": "الكمي",
}


def _slot_id_for_passage(parent_id: str, index: int) -> str:
    return f"passage_{parent_id}_{index}"


def _resolve_subject_kind(question: Question) -> str | None:
    """Map a question to verbal/quant via subject FK or lesson/chapter hierarchy."""
    sid = question.subject_id
    if not sid and question.chapter_id:
        try:
            sid = question.chapter.category.subject_id
        except Exception:
            sid = None
    if not sid and question.lesson_id:
        try:
            sid = question.lesson.chapter.category.subject_id
        except Exception:
            sid = None
    if sid == VERBAL_SUBJECT_ID:
        return "verbal"
    if sid == QUANT_SUBJECT_ID:
        return "quant"
    return None


def _passage_answers_ok(pq: dict) -> bool:
    answers = pq.get("answers") or []
    return isinstance(answers, list) and len(answers) > 0


def flatten_all_slots() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build verbal/quant pools without heavy joins, DISTINCT, or prefetching answers."""
    cached = cache.get(TIGER_SLOT_CACHE_KEY)
    if isinstance(cached, (list, tuple)) and len(cached) == 2:
        return list(cached[0]), list(cached[1])

    has_answers = Exists(Answer.objects.filter(question_id=OuterRef("pk")))
    field_names = (
        "id",
        "question_type",
        "subject_id",
        "chapter_id",
        "lesson_id",
        "order_index",
        "passage_questions",
    )

    primary = (
        Question.objects.filter(subject_id__in=[VERBAL_SUBJECT_ID, QUANT_SUBJECT_ID])
        .exclude(section_id__in=["قسم_تحصيلي"])
        .only(*field_names)
        .annotate(has_answers=has_answers)
    )

    verbal: list[dict[str, Any]] = []
    quant: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    def _consume(qs, kind_hint: str | None = None):
        for q in qs:
            kind = kind_hint or _resolve_subject_kind(q)
            if kind not in ("verbal", "quant"):
                continue
            target = verbal if kind == "verbal" else quant
            if q.question_type == Question.QUESTION_TYPE_PASSAGE:
                pq_list = q.passage_questions or []
                if not isinstance(pq_list, list) or len(pq_list) == 0:
                    continue
                for idx, pq in enumerate(pq_list):
                    if not isinstance(pq, dict) or not _passage_answers_ok(pq):
                        continue
                    slot_id = _slot_id_for_passage(q.id, idx)
                    if slot_id in seen_ids:
                        continue
                    seen_ids.add(slot_id)
                    target.append(
                        {
                            "slot_id": slot_id,
                            "parent_id": q.id,
                            "passage_index": idx,
                            "subject": kind,
                            "lesson_id": q.lesson_id,
                            "order_index": q.order_index if q.order_index is not None else 0,
                        }
                    )
            else:
                if not getattr(q, "has_answers", False):
                    continue
                if q.id in seen_ids:
                    continue
                seen_ids.add(q.id)
                target.append(
                    {
                        "slot_id": q.id,
                        "parent_id": q.id,
                        "passage_index": None,
                        "subject": kind,
                        "lesson_id": q.lesson_id,
                        "order_index": q.order_index if q.order_index is not None else 0,
                    }
                )

    _consume(primary)

    # Fallback only for rows missing subject_id (rare) — avoid joining the whole table.
    extra = (
        Question.objects.filter(subject_id__isnull=True)
        .filter(
            Q(chapter__category__subject_id__in=[VERBAL_SUBJECT_ID, QUANT_SUBJECT_ID])
            | Q(
                lesson__chapter__category__subject_id__in=[
                    VERBAL_SUBJECT_ID,
                    QUANT_SUBJECT_ID,
                ]
            )
        )
        .exclude(section_id__in=["قسم_تحصيلي"])
        .select_related(
            "chapter__category",
            "lesson__chapter__category",
        )
        .annotate(has_answers=has_answers)
    )
    if Question.objects.filter(subject_id__isnull=True).exists():
        _consume(extra)

    cache.set(TIGER_SLOT_CACHE_KEY, (verbal, quant), TIGER_SLOT_CACHE_TTL)
    return verbal, quant


def flatten_subject_slots(subject_kind: str) -> list[dict[str, Any]]:
    verbal, quant = flatten_all_slots()
    return verbal if subject_kind == "verbal" else quant


def _used_keys_for_user(user) -> set[str]:
    return set(
        TigerTestUsedQuestion.objects.filter(user=user).values_list(
            "question_key", flat=True
        )
    )


def get_tiger_settings() -> TigerTestSettings:
    obj, _ = TigerTestSettings.objects.get_or_create(pk=1)
    return obj


def _normalize_id_list(raw) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for item in raw or []:
        sid = str(item).strip()
        if sid and sid not in seen:
            seen.add(sid)
            out.append(sid)
    return out


def _is_bank_category_name(name: str) -> bool:
    text = name or ""
    return "تجميع" in text or "بنك" in text


def _lesson_ids_for_subject(subject_id: str) -> list[str]:
    return list(
        Lesson.objects.filter(chapter__category__subject_id=subject_id).values_list(
            "id", flat=True
        )
    )


def _default_bank_ids(subject_id: str) -> list[str]:
    """تجميعات/بنوك إن وُجدت، وإلا كل دروس المادة."""
    lessons = (
        Lesson.objects.filter(chapter__category__subject_id=subject_id)
        .select_related("chapter__category")
        .order_by("chapter__order", "order", "name")
    )
    bank_ids = [
        lesson.id
        for lesson in lessons
        if _is_bank_category_name(getattr(lesson.chapter.category, "name", "") or "")
    ]
    if bank_ids:
        return bank_ids
    return [lesson.id for lesson in lessons]


def resolve_bank_ids(subject_kind: str, selected: list[str] | None = None) -> list[str]:
    subject_id = VERBAL_SUBJECT_ID if subject_kind == "verbal" else QUANT_SUBJECT_ID
    chosen = _normalize_id_list(selected)
    if chosen:
        allowed = set(_lesson_ids_for_subject(subject_id))
        return [sid for sid in chosen if sid in allowed]
    return _default_bank_ids(subject_id)


def _filter_pool_by_banks(pool: list[dict], bank_ids: list[str]) -> list[dict]:
    if not bank_ids:
        return list(pool)
    allowed = set(str(x) for x in bank_ids)
    return [s for s in pool if str(s.get("lesson_id") or "") in allowed]


def _slot_sort_key(slot: dict) -> tuple:
    order = slot.get("order_index")
    if order is None:
        order = 0
    pidx = slot.get("passage_index")
    return (
        int(order),
        str(slot.get("parent_id") or ""),
        -1 if pidx is None else int(pidx),
        str(slot.get("slot_id") or ""),
    )


def _ordered_bank_slots(pool: list[dict], lesson_id: str) -> list[dict]:
    slots = [s for s in pool if str(s.get("lesson_id") or "") == str(lesson_id)]
    slots.sort(key=_slot_sort_key)
    return slots


def _is_passage_slot(slot: dict) -> bool:
    return slot.get("passage_index") is not None and bool(slot.get("parent_id"))


def _passage_siblings(pool: list[dict], slot: dict) -> list[dict]:
    if not _is_passage_slot(slot):
        return [slot]
    pid = str(slot["parent_id"])
    sibs = [
        s
        for s in pool
        if str(s.get("parent_id") or "") == pid and s.get("passage_index") is not None
    ]
    sibs.sort(key=lambda x: x.get("passage_index") or 0)
    return sibs or [slot]


def _expand_complete_passages(
    slots: list[dict],
    lookup_pool: list[dict],
    blocked: set[str] | None = None,
) -> list[dict]:
    """If any sub-question of a passage is included, take the whole passage in order.

    Skip a passage when some of its sub-questions were already used in this test
    or a previous Tiger attempt (never show the same question twice).
    """
    blocked = blocked or set()
    current_ids = {s["slot_id"] for s in slots}
    seen_parents: set[str] = set()
    seen_ids: set[str] = set()
    out: list[dict] = []
    for slot in slots:
        if _is_passage_slot(slot):
            pid = str(slot["parent_id"])
            if pid in seen_parents:
                continue
            seen_parents.add(pid)
            sibs = _passage_siblings(lookup_pool, slot)
            if any(
                sib["slot_id"] in blocked and sib["slot_id"] not in current_ids
                for sib in sibs
            ):
                continue
            for sib in sibs:
                if sib["slot_id"] in seen_ids:
                    continue
                seen_ids.add(sib["slot_id"])
                out.append(sib)
        elif slot["slot_id"] not in seen_ids:
            if slot["slot_id"] in blocked and slot["slot_id"] not in current_ids:
                continue
            seen_ids.add(slot["slot_id"])
            out.append(slot)
    return out


def _passage_groups(slots: list[dict]) -> list[list[dict]]:
    """Keep sub-questions of the same passage consecutive; each still counts as one slot."""
    groups: dict[str, list[dict]] = {}
    singles: dict[str, list[dict]] = {}
    order_keys: list[tuple[str, str]] = []
    for slot in slots:
        if _is_passage_slot(slot):
            pid = str(slot["parent_id"])
            if pid not in groups:
                groups[pid] = []
                order_keys.append(("p", pid))
            groups[pid].append(slot)
        else:
            sid = str(slot["slot_id"])
            singles[sid] = [slot]
            order_keys.append(("s", sid))
    out: list[list[dict]] = []
    for kind, key in order_keys:
        if kind == "p":
            group = groups.pop(key, None)
            if not group:
                continue
            group.sort(key=lambda x: x.get("passage_index") or 0)
            out.append(group)
        else:
            out.append(singles[key])
    return out


def _unique_slots(slots: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for slot in slots:
        sid = slot.get("slot_id")
        if not sid or sid in seen:
            continue
        seen.add(sid)
        out.append(slot)
    return out


def _fit_to_count(
    slots: list[dict],
    count: int,
    lookup_pool: list[dict],
    blocked: set[str] | None = None,
) -> list[dict]:
    """Keep at most `count` slots without splitting a passage or repeating ids."""
    blocked = blocked or set()
    current_ids = {s["slot_id"] for s in slots}
    extra_blocked = blocked - current_ids
    slots = _expand_complete_passages(slots, lookup_pool, extra_blocked)
    slots = _unique_slots(
        [s for s in slots if s["slot_id"] not in extra_blocked]
    )
    if len(slots) <= count:
        return slots
    groups = _passage_groups(slots)
    while groups and sum(len(g) for g in groups) > count:
        drop_at = next((i for i, g in enumerate(groups) if len(g) == 1), 0)
        groups.pop(drop_at)
    return [slot for group in groups for slot in group]


def _append_fitting(
    picked: list[dict],
    candidates: list[dict],
    count: int,
    lookup_pool: list[dict],
    blocked: set[str],
) -> list[dict]:
    picked_ids = {s["slot_id"] for s in picked}
    for slot in candidates:
        if len(picked) >= count:
            break
        if slot["slot_id"] in picked_ids or slot["slot_id"] in blocked:
            continue
        extra = _expand_complete_passages([slot], lookup_pool, blocked)
        extra = [item for item in extra if item["slot_id"] not in picked_ids]
        if not extra:
            continue
        if any(item["slot_id"] in blocked for item in extra):
            continue
        if len(picked) + len(extra) > count:
            continue
        picked.extend(extra)
        picked_ids.update(item["slot_id"] for item in extra)
    return _unique_slots(picked)


def _pick_verbal_section(
    verbal_pool: list[dict],
    bank_ids: list[str],
    blocked: set[str],
    used_windows: set[tuple[str, int]],
) -> list[dict]:
    """13 unused questions from one random bank, using a 13-question window."""
    banks = [bid for bid in bank_ids if _ordered_bank_slots(verbal_pool, bid)]
    if not banks:
        banks = list(
            {
                str(s.get("lesson_id") or "")
                for s in verbal_pool
                if s.get("lesson_id")
            }
        )
    if not banks:
        return []

    random.shuffle(banks)
    chosen_bank = None
    chosen_start = None
    ordered: list[dict] = []
    window: list[dict] = []
    for bank_id in banks:
        ordered = _ordered_bank_slots(verbal_pool, bank_id)
        if not ordered:
            continue
        unused_windows = [
            start
            for start in VERBAL_WINDOW_STARTS
            if (bank_id, start) not in used_windows
        ]
        random.shuffle(unused_windows)
        for start in unused_windows or list(VERBAL_WINDOW_STARTS):
            candidate = ordered[start : start + VERBAL_PER_SECTION]
            unused = [s for s in candidate if s["slot_id"] not in blocked]
            if unused:
                chosen_bank = bank_id
                chosen_start = start
                window = candidate
                break
        if chosen_bank:
            break

    if chosen_bank is None:
        random.shuffle(banks)
        chosen_bank = banks[0]
        ordered = _ordered_bank_slots(verbal_pool, chosen_bank)
        chosen_start = random.choice(list(VERBAL_WINDOW_STARTS))
        window = ordered[chosen_start : chosen_start + VERBAL_PER_SECTION]

    used_windows.add((chosen_bank, chosen_start))
    unused_in_window = [s for s in window if s["slot_id"] not in blocked]
    picked = _append_fitting(
        [], unused_in_window, VERBAL_PER_SECTION, ordered, blocked
    )

    unused_rest = [
        s for s in ordered if s["slot_id"] not in blocked
    ]
    random.shuffle(unused_rest)
    picked = _append_fitting(
        picked, unused_rest, VERBAL_PER_SECTION, ordered, blocked
    )

    unused_any = [s for s in verbal_pool if s["slot_id"] not in blocked]
    random.shuffle(unused_any)
    picked = _append_fitting(
        picked, unused_any, VERBAL_PER_SECTION, verbal_pool, blocked
    )
    return _fit_to_count(picked, VERBAL_PER_SECTION, verbal_pool, blocked)


def _pick_quant_section(
    quant_pool: list[dict],
    blocked: set[str],
) -> list[dict]:
    """11 unused questions from any selected quantitative bank. Never repeats."""
    unused = [s for s in quant_pool if s["slot_id"] not in blocked]
    random.shuffle(unused)
    picked = _append_fitting([], unused, QUANT_PER_SECTION, quant_pool, blocked)
    return _fit_to_count(picked, QUANT_PER_SECTION, quant_pool, blocked)


def _shuffle_section(verbal: list[dict], quant: list[dict]) -> list[dict]:
    """Mix verbal + quant, but never split a passage or insert another question inside it."""
    groups = _passage_groups(list(verbal) + list(quant))
    random.shuffle(groups)
    return [slot for group in groups for slot in group]


def _pad_subject_slots(
    slots: list[dict],
    subject_kind: str,
    count: int,
    start_index: int,
    warnings: list[dict],
    blocked: set[str] | None = None,
) -> list[dict]:
    fitted = _fit_to_count(list(slots), count, list(slots), blocked)
    fitted = _unique_slots(fitted)
    if len(fitted) >= count:
        return fitted
    need = count - len(fitted)
    extra = make_demo_slots(subject_kind, need, start_index=start_index)
    warnings.append(
        {
            "subject": subject_kind,
            "subject_label": SUBJECT_LABELS.get(subject_kind, subject_kind),
            "required": count,
            "found_in_subject": len(fitted),
            "borrowed_from_other": 0,
            "actual": count,
            "shortfall": 0,
            "demo_added": need,
        }
    )
    return fitted + extra


def serialize_tiger_banks() -> dict[str, Any]:
    settings = get_tiger_settings()
    verbal_pool, quant_pool = flatten_all_slots()
    return {
        "verbal": _serialize_bank_side(
            "verbal", settings.verbal_bank_ids, verbal_pool
        ),
        "quant": _serialize_bank_side("quant", settings.quant_bank_ids, quant_pool),
    }


def _serialize_bank_side(
    subject_kind: str, selected_raw, pool: list[dict]
) -> dict[str, Any]:
    subject_id = VERBAL_SUBJECT_ID if subject_kind == "verbal" else QUANT_SUBJECT_ID
    selected_ids = _normalize_id_list(selected_raw)
    counts: dict[str, int] = {}
    for slot in pool:
        lid = str(slot.get("lesson_id") or "")
        if lid:
            counts[lid] = counts.get(lid, 0) + 1
    lessons = (
        Lesson.objects.filter(chapter__category__subject_id=subject_id)
        .select_related("chapter__category")
        .order_by("chapter__category__name", "chapter__order", "order", "name")
    )
    items_by_id: dict[str, dict[str, Any]] = {}
    available: list[dict[str, Any]] = []
    for lesson in lessons:
        item = {
            "id": lesson.id,
            "name": lesson.name,
            "chapter_name": lesson.chapter.name,
            "category_name": lesson.chapter.category.name,
            "subject_id": subject_id,
            "category_id": lesson.chapter.category_id,
            "chapter_id": lesson.chapter_id,
            "slot_count": counts.get(str(lesson.id), 0),
        }
        items_by_id[str(lesson.id)] = item
        if str(lesson.id) not in selected_ids:
            available.append(item)
    selected = [
        items_by_id[sid]
        for sid in selected_ids
        if sid in items_by_id
    ]
    return {
        "selected": selected,
        "available": available,
        "selected_ids": [item["id"] for item in selected],
    }


def update_tiger_banks(verbal_ids, quant_ids) -> dict[str, Any]:
    settings = get_tiger_settings()
    verbal_allowed = set(_lesson_ids_for_subject(VERBAL_SUBJECT_ID))
    quant_allowed = set(_lesson_ids_for_subject(QUANT_SUBJECT_ID))
    settings.verbal_bank_ids = [
        sid for sid in _normalize_id_list(verbal_ids) if sid in verbal_allowed
    ]
    settings.quant_bank_ids = [
        sid for sid in _normalize_id_list(quant_ids) if sid in quant_allowed
    ]
    settings.save()
    return serialize_tiger_banks()


def _intended_subject(slot: dict) -> str:
    return slot.get("borrowed_for") or slot.get("subject") or "quant"


def build_sections_for_user(user) -> tuple[list[list[dict]], list[dict]]:
    """
    Build exactly 5 sections of 24 questions (13 verbal + 11 quant, 120 total).

    Verbal: each section picks one admin-selected bank, then a 13-question window
    (1–13, 14–26, 27–39, 40–52, 53–65). Never repeats a question the student
    already saw in this test or a previous Tiger attempt.

    Quant: 11 unused questions from any selected bank (not tied to one file).
    """
    warnings: list[dict] = []
    previously_used = _used_keys_for_user(user)
    verbal_all, quant_all = flatten_all_slots()
    settings = get_tiger_settings()

    verbal_banks = resolve_bank_ids("verbal", settings.verbal_bank_ids)
    quant_banks = resolve_bank_ids("quant", settings.quant_bank_ids)
    verbal_pool = _filter_pool_by_banks(verbal_all, verbal_banks) or list(verbal_all)
    quant_pool = _filter_pool_by_banks(quant_all, quant_banks) or list(quant_all)

    blocked: set[str] = set(previously_used)
    used_windows: set[tuple[str, int]] = set()
    sections: list[list[dict]] = []

    for section_index in range(SECTION_COUNT):
        verbal = _pick_verbal_section(
            verbal_pool,
            verbal_banks,
            blocked,
            used_windows,
        )
        blocked.update(s["slot_id"] for s in verbal)
        quant = _pick_quant_section(quant_pool, blocked)
        blocked.update(s["slot_id"] for s in quant)

        verbal = _pad_subject_slots(
            verbal,
            "verbal",
            VERBAL_PER_SECTION,
            start_index=section_index * VERBAL_PER_SECTION,
            warnings=warnings,
            blocked=blocked - {s["slot_id"] for s in verbal},
        )
        quant = _pad_subject_slots(
            quant,
            "quant",
            QUANT_PER_SECTION,
            start_index=section_index * QUANT_PER_SECTION,
            warnings=warnings,
            blocked=blocked - {s["slot_id"] for s in quant},
        )
        blocked.update(s["slot_id"] for s in verbal + quant)

        section = _unique_slots(_shuffle_section(verbal, quant))
        if len(section) < QUESTIONS_PER_SECTION:
            section.extend(
                make_demo_slots(
                    "quant",
                    QUESTIONS_PER_SECTION - len(section),
                    start_index=800 + section_index * QUESTIONS_PER_SECTION,
                )
            )
        if len(section) != QUESTIONS_PER_SECTION:
            raise ValueError("تعذر تجهيز أقسام اختبار النمر.")
        sections.append(section)

    _ensure_no_duplicate_slots(sections)
    return sections, warnings


def _ensure_no_duplicate_slots(sections: list[list[dict]]) -> None:
    """Drop any accidental repeat so a student never sees the same slot twice."""
    seen: set[str] = set()
    for idx, section in enumerate(sections):
        kept: list[dict] = []
        for slot in section:
            sid = slot.get("slot_id")
            if not sid or (sid in seen and not slot.get("is_demo")):
                continue
            seen.add(sid)
            kept.append(slot)
        if len(kept) != len(section):
            # Replacements are demo pads so the section stays 24 questions.
            need = QUESTIONS_PER_SECTION - len(kept)
            if need > 0:
                kept.extend(
                    make_demo_slots(
                        "quant",
                        need,
                        start_index=900 + idx * QUESTIONS_PER_SECTION,
                    )
                )
            sections[idx] = kept[:QUESTIONS_PER_SECTION]


def _answer_id_from_dict(a: dict, index: int) -> str:
    raw = a.get("answer_id") or a.get("id") or a.get("key")
    if raw is None or raw == "":
        return chr(ord("a") + index)
    return str(raw).lower()[:1]


def _is_correct_flag(a: dict) -> bool:
    return bool(a.get("is_correct") or a.get("isCorrect"))


def _answers_for_slot(question: Question, slot: dict) -> list[dict]:
    if slot.get("passage_index") is not None:
        pq_list = question.passage_questions or []
        idx = slot["passage_index"]
        if idx >= len(pq_list):
            return []
        pq = pq_list[idx] if isinstance(pq_list[idx], dict) else {}
        raw = pq.get("answers") or []
        out = []
        for i, a in enumerate(raw):
            if not isinstance(a, dict):
                continue
            out.append(
                {
                    "answer_id": _answer_id_from_dict(a, i),
                    "text": a.get("text") or "",
                }
            )
        return out

    return [
        {"answer_id": a.answer_id, "text": a.text}
        for a in question.answers.all().order_by("answer_id")
    ]


def _question_html_for_slot(question: Question, slot: dict) -> str:
    if slot.get("passage_index") is not None:
        pq_list = question.passage_questions or []
        idx = slot["passage_index"]
        pq = (
            pq_list[idx]
            if idx < len(pq_list) and isinstance(pq_list[idx], dict)
            else {}
        )
        passage_text = (question.passage_text or "").strip()
        sub_html = (pq.get("question") or "").strip()
        if passage_text:
            return (
                f'<div class="mb-4 text-dark-600 leading-relaxed">{passage_text}</div>'
                f'<div class="font-semibold text-primary-600 mb-2">السؤال {idx + 1}:</div>'
                f"<div>{sub_html}</div>"
            )
        return sub_html
    return question.question or ""


def _correct_answer_id(question: Question, slot: dict) -> str | None:
    if slot.get("passage_index") is not None:
        pq_list = question.passage_questions or []
        idx = slot["passage_index"]
        if idx >= len(pq_list):
            return None
        pq = pq_list[idx] if isinstance(pq_list[idx], dict) else {}
        for i, a in enumerate(pq.get("answers") or []):
            if isinstance(a, dict) and _is_correct_flag(a):
                return _answer_id_from_dict(a, i)
        return None
    correct = question.answers.filter(is_correct=True).first()
    return correct.answer_id if correct else None


def _sub_question_html(question: Question, slot: dict) -> str:
    pq_list = question.passage_questions or []
    idx = slot["passage_index"]
    pq = (
        pq_list[idx]
        if idx < len(pq_list) and isinstance(pq_list[idx], dict)
        else {}
    )
    return (pq.get("question") or "").strip()


def serialize_slot_for_client(question: Question | None, slot: dict) -> dict:
    if slot.get("is_demo"):
        demo = slot.get("demo") or {}
        return {
            "id": slot["slot_id"],
            "subject": slot.get("subject") or "quant",
            "question": demo.get("question") or "",
            "passage_text": None,
            "is_passage": False,
            "passage_index": None,
            "answers": demo.get("answers") or [],
            "image": None,
            "is_demo": True,
        }
    if not question:
        return {
            "id": slot["slot_id"],
            "subject": slot.get("subject") or "quant",
            "question": "",
            "passage_text": None,
            "is_passage": False,
            "passage_index": slot.get("passage_index"),
            "answers": [],
            "image": None,
        }
    image_url = None
    img = getattr(question, "question_image", None)
    if img:
        try:
            image_url = img.url
        except Exception:
            image_url = None
    is_passage = slot.get("passage_index") is not None
    passage_text = None
    q_html = question.question or ""
    if is_passage:
        passage_text = (question.passage_text or "").strip() or None
        q_html = _sub_question_html(question, slot)
    return {
        "id": slot["slot_id"],
        "subject": slot["subject"],
        "question": q_html,
        "passage_text": passage_text,
        "is_passage": bool(is_passage),
        "passage_index": slot.get("passage_index"),
        "answers": _answers_for_slot(question, slot),
        "image": image_url,
    }


def load_questions_map(section_slots: list[list[dict]] | list[dict]) -> dict[str, Question]:
    parent_ids = set()
    if section_slots and isinstance(section_slots[0], dict):
        iterable = [section_slots]
    else:
        iterable = section_slots or []
    for section in iterable:
        for slot in section:
            if slot.get("is_demo") or not slot.get("parent_id"):
                continue
            parent_ids.add(slot["parent_id"])
    if not parent_ids:
        return {}
    qs = Question.objects.filter(id__in=parent_ids).prefetch_related(
        Prefetch("answers", queryset=Answer.objects.order_by("answer_id"))
    )
    return {q.id: q for q in qs}


def serialize_section_questions(
    section_slots: list[dict], questions_map: dict[str, Question]
) -> list[dict]:
    out = []
    for slot in section_slots:
        q = questions_map.get(slot.get("parent_id")) if slot.get("parent_id") else None
        item = serialize_slot_for_client(q, slot)
        if item.get("answers") or item.get("is_demo") or item.get("question"):
            out.append(item)
    return out


def _explanation_for_slot(question: Question | None, slot: dict) -> str | None:
    if not question:
        return None
    if slot.get("passage_index") is not None:
        pq_list = question.passage_questions or []
        idx = slot["passage_index"]
        pq = (
            pq_list[idx]
            if idx < len(pq_list) and isinstance(pq_list[idx], dict)
            else {}
        )
        text = (pq.get("explanation") or question.explanation or "").strip()
        return text or None
    text = (question.explanation or "").strip()
    return text or None


def _parse_video_seconds(value) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        n = int(value)
        return n if n >= 0 else None
    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        return int(text)
    parts = text.split(":")
    try:
        nums = [int(p) for p in parts]
    except ValueError:
        return None
    if len(nums) == 2:
        return nums[0] * 60 + nums[1]
    if len(nums) == 3:
        return nums[0] * 3600 + nums[1] * 60 + nums[2]
    return None


def _slot_video_times(question: Question | None, slot: dict) -> tuple[int | None, int | None]:
    if not question:
        return None, None
    start = _parse_video_seconds(getattr(question, "video_start_seconds", None))
    end = _parse_video_seconds(getattr(question, "video_end_seconds", None))
    if slot.get("passage_index") is not None:
        pq_list = question.passage_questions or []
        idx = slot["passage_index"]
        pq = (
            pq_list[idx]
            if idx < len(pq_list) and isinstance(pq_list[idx], dict)
            else {}
        )
        p_start = _parse_video_seconds(
            (pq or {}).get("video_start_seconds")
            or (pq or {}).get("videoStartSeconds")
        )
        p_end = _parse_video_seconds(
            (pq or {}).get("video_end_seconds")
            or (pq or {}).get("videoEndSeconds")
        )
        if p_start is not None:
            start = p_start
        if p_end is not None:
            end = p_end
    return start, end


def _video_payload(video: Video | None) -> dict | None:
    if not video:
        return None
    url = (video.video_url or "").strip() or None
    if not url and video.video_file:
        try:
            url = video.video_file.url
        except Exception:
            url = None
    if not url:
        return None
    return {
        "id": video.id,
        "url": url,
        "title": video.title or "",
        "bunny_library_id": video.bunny_library_id or None,
        "lesson_id": video.lesson_id,
    }


def _flatten_lesson_site_numbers(questions: list[Question]) -> dict[str, int]:
    numbered: dict[str, int] = {}
    n = 0
    for q in questions:
        if q.question_type == Question.QUESTION_TYPE_PASSAGE:
            pq_list = q.passage_questions or []
            if not isinstance(pq_list, list):
                continue
            for idx, pq in enumerate(pq_list):
                if not isinstance(pq, dict) or not _passage_answers_ok(pq):
                    continue
                n += 1
                numbered[_slot_id_for_passage(q.id, idx)] = n
        else:
            n += 1
            numbered[q.id] = n
    return numbered


def _source_media_for_lessons(lesson_ids: set[str]) -> tuple[dict, dict, dict]:
    ids = {lid for lid in lesson_ids if lid}
    if not ids:
        return {}, {}, {}
    lessons = {les.id: les for les in Lesson.objects.filter(id__in=ids)}
    videos_by_lesson: dict[str, Video] = {}
    for video in Video.objects.filter(lesson_id__in=ids).order_by("order", "-created_at"):
        if video.lesson_id and video.lesson_id not in videos_by_lesson:
            videos_by_lesson[video.lesson_id] = video
    site_maps: dict[str, dict[str, int]] = {}
    qs = Question.objects.filter(lesson_id__in=ids).only(
        "id",
        "lesson_id",
        "question_type",
        "passage_questions",
        "order_index",
        "created_at",
    ).order_by("lesson_id", "order_index", "created_at")
    by_lesson: dict[str, list[Question]] = {}
    for q in qs:
        by_lesson.setdefault(q.lesson_id, []).append(q)
    for lid, questions in by_lesson.items():
        site_maps[lid] = _flatten_lesson_site_numbers(questions)
    return site_maps, videos_by_lesson, lessons


def _source_link_for_slot(
    parent: Question | None,
    slot: dict,
    site_maps: dict,
    videos_by_lesson: dict,
    lessons: dict,
) -> dict:
    lesson_id = (parent.lesson_id if parent else None) or slot.get("lesson_id")
    video = videos_by_lesson.get(lesson_id) if lesson_id else None
    site_map = site_maps.get(lesson_id) or {}
    site_n = site_map.get(slot.get("slot_id"))
    if site_n is None and parent and parent.order_index:
        site_n = int(parent.order_index)
    start, end = _slot_video_times(parent, slot)
    lesson = lessons.get(lesson_id) if lesson_id else None
    return {
        "lesson_id": lesson_id,
        "lesson_name": (lesson.name if lesson else "") or "",
        "site_question_number": site_n,
        "video": _video_payload(video),
        "video_start_seconds": start,
        "video_end_seconds": end,
    }


def persist_session_incorrect_answers(user, session: TigerTestSession) -> None:
    """Save wrong/skipped Tiger items so نتائجي and الأجوبة الخاطئة can open the source video."""
    try:
        items = build_review_items(session)
        lesson_ids = {item.get("lesson_id") for item in items if item.get("lesson_id")}
        valid_lessons = set(
            Lesson.objects.filter(id__in=lesson_ids).values_list("id", flat=True)
        )
        for item in items:
            if item.get("is_correct") or item.get("is_demo"):
                continue
            qid = str(item.get("id") or "").strip()
            if not qid:
                continue
            lid = item.get("lesson_id") if item.get("lesson_id") in valid_lessons else None
            IncorrectAnswer.objects.update_or_create(
                user=user,
                question_id=qid,
                defaults={
                    "lesson_id": lid,
                    "lesson_name": (item.get("lesson_name") or "")[:200],
                    "category_name": "اختبار النمر",
                    "subject_name": SUBJECT_LABELS.get(item.get("subject"), "")[:200],
                    "question_snapshot": {
                        "question": item.get("question"),
                        "answers": item.get("answers"),
                        "explanation": item.get("explanation"),
                        "site_question_number": item.get("site_question_number"),
                        "video": item.get("video"),
                        "video_start_seconds": item.get("video_start_seconds"),
                        "video_end_seconds": item.get("video_end_seconds"),
                        "subject": item.get("subject"),
                        "source": "tiger",
                    },
                    "user_answer_id": str(item.get("user_answer_id") or "")[:10],
                    "correct_answer_id": str(item.get("correct_answer_id") or "")[:10],
                },
            )
    except Exception:
        # Completing the test must not fail if tracker write has a problem.
        return


def wrong_video_items_for_user(user, limit: int = 80) -> list[dict]:
    """Wrong answers (homework + tiger) with source video + site question number."""
    rows = list(
        IncorrectAnswer.objects.filter(user=user).order_by("-created_at")[:limit]
    )
    lesson_ids = {row.lesson_id for row in rows if row.lesson_id}
    qids = []
    for row in rows:
        snap = row.question_snapshot or {}
        if snap.get("video") and snap.get("site_question_number") is not None:
            continue
        qid = str(row.question_id or "")
        if qid.startswith("passage_"):
            parent_id = qid[len("passage_") : qid.rfind("_")]
            if parent_id:
                qids.append(parent_id)
        elif qid:
            qids.append(qid)

    parents = {
        q.id: q
        for q in Question.objects.filter(id__in=[x for x in qids if x]).only(
            "id",
            "lesson_id",
            "order_index",
            "question_type",
            "passage_questions",
            "video_start_seconds",
            "video_end_seconds",
        )
    }
    for q in parents.values():
        if q.lesson_id:
            lesson_ids.add(q.lesson_id)
    site_maps, videos_by_lesson, lessons = _source_media_for_lessons(lesson_ids)

    out: list[dict] = []
    for row in rows:
        snap = row.question_snapshot or {}
        video = snap.get("video")
        site_n = snap.get("site_question_number")
        start = snap.get("video_start_seconds")
        end = snap.get("video_end_seconds")
        lesson_id = row.lesson_id
        lesson_name = row.lesson_name or ""
        subject = snap.get("subject")
        if not video or site_n is None:
            parent = None
            slot = {"slot_id": row.question_id, "passage_index": None, "lesson_id": lesson_id}
            qid = str(row.question_id or "")
            if qid.startswith("passage_"):
                try:
                    idx = int(qid.rsplit("_", 1)[-1])
                    parent_id = qid[len("passage_") : qid.rfind("_")]
                    parent = parents.get(parent_id)
                    slot["passage_index"] = idx
                    slot["parent_id"] = parent_id
                except Exception:
                    parent = parents.get(qid)
            else:
                parent = parents.get(qid)
            if parent and not lesson_id:
                lesson_id = parent.lesson_id
                slot["lesson_id"] = lesson_id
            link = _source_link_for_slot(
                parent, slot, site_maps, videos_by_lesson, lessons
            )
            video = video or link.get("video")
            site_n = site_n if site_n is not None else link.get("site_question_number")
            start = start if start is not None else link.get("video_start_seconds")
            end = end if end is not None else link.get("video_end_seconds")
            lesson_id = lesson_id or link.get("lesson_id")
            lesson_name = lesson_name or link.get("lesson_name") or ""
        if not video:
            continue
        if not subject:
            if "لفظي" in (row.subject_name or ""):
                subject = "verbal"
            elif "كمي" in (row.subject_name or ""):
                subject = "quant"
        out.append(
            {
                "question_id": row.question_id,
                "lesson_id": lesson_id,
                "lesson_name": lesson_name,
                "subject": subject or "",
                "subject_label": SUBJECT_LABELS.get(subject, row.subject_name or ""),
                "site_question_number": site_n,
                "video": video,
                "video_start_seconds": _parse_video_seconds(start),
                "video_end_seconds": _parse_video_seconds(end),
                "source": snap.get("source")
                or (
                    "tiger"
                    if (row.category_name or "") == "اختبار النمر"
                    else "homework"
                ),
            }
        )

    if len(out) < limit:
        seen = {item["question_id"] for item in out}
        latest = (
            TigerTestSession.objects.filter(
                user=user,
                status=TigerTestSession.STATUS_COMPLETED,
            )
            .order_by("-completed_at", "-created_at")
            .first()
        )
        results = (latest.results or {}) if latest else {}
        if latest and not results.get("abandoned"):
            try:
                for item in build_review_items(latest):
                    if item.get("is_correct") or item.get("is_demo") or not item.get("video"):
                        continue
                    qid = item.get("id")
                    if not qid or qid in seen:
                        continue
                    seen.add(qid)
                    out.append(
                        {
                            "question_id": qid,
                            "lesson_id": item.get("lesson_id"),
                            "lesson_name": item.get("lesson_name") or "",
                            "subject": item.get("subject") or "",
                            "subject_label": SUBJECT_LABELS.get(
                                item.get("subject"), ""
                            ),
                            "site_question_number": item.get("site_question_number"),
                            "video": item.get("video"),
                            "video_start_seconds": item.get("video_start_seconds"),
                            "video_end_seconds": item.get("video_end_seconds"),
                            "source": "tiger",
                        }
                    )
                    if len(out) >= limit:
                        break
            except Exception:
                pass
    return out


def _review_answers_for_slot(question: Question | None, slot: dict) -> list[dict]:
    if slot.get("is_demo"):
        demo = slot.get("demo") or {}
        correct = str((demo.get("correct") or "")).lower()[:1]
        out = []
        for i, a in enumerate(demo.get("answers") or []):
            if not isinstance(a, dict):
                continue
            aid = str(a.get("answer_id") or chr(ord("a") + i)).lower()[:1]
            out.append(
                {
                    "answer_id": aid,
                    "text": a.get("text") or "",
                    "is_correct": bool(correct) and aid == correct,
                }
            )
        return out
    if not question:
        return []
    correct_id = _correct_answer_id(question, slot)
    correct_s = str(correct_id).lower()[:1] if correct_id else None
    return [
        {
            **a,
            "is_correct": bool(correct_s)
            and str(a.get("answer_id") or "").lower()[:1] == correct_s,
        }
        for a in _answers_for_slot(question, slot)
    ]


def build_review_items(
    session: TigerTestSession,
    section_number: int | None = None,
    include_explanation: bool = True,
) -> list[dict]:
    """Post-test review items. Pass section_number to load one section only."""
    all_sections = session.section_slots or []
    answers = session.answers or {}
    if section_number is not None:
        idx = max(0, int(section_number) - 1)
        if idx >= len(all_sections):
            return []
        selected = [(idx, all_sections[idx])]
        number = sum(len(s) for s in all_sections[:idx])
        map_slots = all_sections[idx]
    else:
        selected = list(enumerate(all_sections))
        number = 0
        map_slots = all_sections

    questions_map = load_questions_map(map_slots)
    lesson_ids = {
        q.lesson_id for q in questions_map.values() if getattr(q, "lesson_id", None)
    }
    for _i, section in selected:
        for slot in section:
            if slot.get("lesson_id"):
                lesson_ids.add(slot["lesson_id"])
    site_maps, videos_by_lesson, lessons = _source_media_for_lessons(lesson_ids)
    items: list[dict] = []
    for section_i, section in selected:
        for slot in section:
            number += 1
            parent = questions_map.get(slot.get("parent_id")) if slot.get("parent_id") else None
            base = serialize_slot_for_client(parent, slot)
            source = _source_link_for_slot(
                parent, slot, site_maps, videos_by_lesson, lessons
            )
            if slot.get("is_demo"):
                correct_id = (slot.get("demo") or {}).get("correct")
                explanation = None
            else:
                correct_id = _correct_answer_id(parent, slot) if parent else None
                explanation = (
                    _explanation_for_slot(parent, slot) if include_explanation else None
                )
            user_raw = answers.get(slot["slot_id"])
            user_ans = str(user_raw).lower()[:1] if user_raw else None
            correct_s = str(correct_id).lower()[:1] if correct_id else None
            skipped = not user_ans
            is_correct = bool(user_ans and correct_s and user_ans == correct_s)
            items.append(
                {
                    **base,
                    "answers": _review_answers_for_slot(parent, slot),
                    "number": number,
                    "section_number": section_i + 1,
                    "correct_answer_id": correct_s,
                    "user_answer_id": user_ans,
                    "is_correct": is_correct,
                    "skipped": skipped,
                    "explanation": explanation,
                    **source,
                }
            )
    return items


def score_session(session: TigerTestSession) -> dict:
    sections = session.section_slots or []
    answers = session.answers or {}
    questions_map = load_questions_map(sections)

    verbal_correct = 0
    verbal_total = 0
    quant_correct = 0
    quant_total = 0

    for section in sections:
        for slot in section:
            if slot.get("is_demo"):
                correct_id = (slot.get("demo") or {}).get("correct")
            else:
                q = questions_map.get(slot.get("parent_id"))
                if not q:
                    continue
                correct_id = _correct_answer_id(q, slot)
            user_ans = answers.get(slot["slot_id"])
            subject = slot.get("subject") or "quant"
            if subject == "verbal":
                verbal_total += 1
                if user_ans and correct_id and str(user_ans).lower() == str(correct_id).lower():
                    verbal_correct += 1
            else:
                quant_total += 1
                if user_ans and correct_id and str(user_ans).lower() == str(correct_id).lower():
                    quant_correct += 1

    verbal_pct = round((verbal_correct / verbal_total) * 100, 1) if verbal_total else 0.0
    quant_pct = round((quant_correct / quant_total) * 100, 1) if quant_total else 0.0
    # Final = average of the two section percentages, nearest integer
    parts = []
    if verbal_total:
        parts.append(verbal_pct)
    if quant_total:
        parts.append(quant_pct)
    final_pct = int(round(sum(parts) / len(parts))) if parts else 0

    return {
        "verbal_correct": verbal_correct,
        "verbal_total": verbal_total,
        "verbal_percentage": verbal_pct,
        "quant_correct": quant_correct,
        "quant_total": quant_total,
        "quant_percentage": quant_pct,
        "final_percentage": final_pct,
    }


def namr_stats_for_user(user) -> dict:
    """Light Tiger Test totals for نتائجي — scores only, no question review."""
    empty = {
        "attempts_count": 0,
        "verbal_percentage": 0,
        "quant_percentage": 0,
        "final_percentage": 0,
        "verbal_correct": 0,
        "verbal_total": 0,
        "quant_correct": 0,
        "quant_total": 0,
        "correct_answers": 0,
        "incorrect_answers": 0,
        "answered_questions_total": 0,
    }
    sessions = TigerTestSession.objects.filter(
        user=user,
        status=TigerTestSession.STATUS_COMPLETED,
    ).order_by("-completed_at", "-created_at")

    attempts = []
    verbal_correct = 0
    verbal_total = 0
    quant_correct = 0
    quant_total = 0
    for session in sessions:
        results = session.results or {}
        if results.get("abandoned"):
            continue
        attempts.append(results)
        verbal_correct += int(results.get("verbal_correct") or 0)
        verbal_total += int(results.get("verbal_total") or 0)
        quant_correct += int(results.get("quant_correct") or 0)
        quant_total += int(results.get("quant_total") or 0)

    if not attempts:
        return empty

    latest = attempts[0]
    try:
        verbal_pct = float(latest.get("verbal_percentage") or 0)
    except (TypeError, ValueError):
        verbal_pct = 0.0
    try:
        quant_pct = float(latest.get("quant_percentage") or 0)
    except (TypeError, ValueError):
        quant_pct = 0.0
    parts = []
    if int(latest.get("verbal_total") or 0):
        parts.append(verbal_pct)
    if int(latest.get("quant_total") or 0):
        parts.append(quant_pct)
    try:
        stored_final = latest.get("final_percentage")
        final_pct = int(round(float(stored_final))) if stored_final is not None else (
            int(round(sum(parts) / len(parts))) if parts else 0
        )
    except (TypeError, ValueError):
        final_pct = int(round(sum(parts) / len(parts))) if parts else 0

    correct_answers = verbal_correct + quant_correct
    answered_total = verbal_total + quant_total
    return {
        "attempts_count": len(attempts),
        "verbal_percentage": int(round(verbal_pct)),
        "quant_percentage": int(round(quant_pct)),
        "final_percentage": final_pct,
        "verbal_correct": verbal_correct,
        "verbal_total": verbal_total,
        "quant_correct": quant_correct,
        "quant_total": quant_total,
        "correct_answers": correct_answers,
        "incorrect_answers": max(0, answered_total - correct_answers),
        "answered_questions_total": answered_total,
    }


def mark_questions_used(user, section_slots: list[list[dict]]):
    keys = []
    for section in section_slots:
        for slot in section:
            if slot.get("is_demo"):
                continue
            keys.append(slot["slot_id"])
    if not keys:
        return
    existing = set(
        TigerTestUsedQuestion.objects.filter(
            user=user, question_key__in=keys
        ).values_list("question_key", flat=True)
    )
    to_create = [
        TigerTestUsedQuestion(user=user, question_key=k)
        for k in keys
        if k not in existing
    ]
    if to_create:
        TigerTestUsedQuestion.objects.bulk_create(to_create, ignore_conflicts=True)


def _count_subjects_in_sections(sections: list[list[dict]]) -> tuple[int, int]:
    verbal = quant = 0
    for section in sections:
        for slot in section:
            if slot.get("subject") == "verbal":
                verbal += 1
            else:
                quant += 1
    return verbal, quant


def session_section_count(session: TigerTestSession) -> int:
    sections = session.section_slots or []
    return SECTION_COUNT if not sections else max(1, len(sections))


def session_light_state(session: TigerTestSession) -> dict:
    """Tiny payload for answer/timer sync — no question HTML."""
    sections = session.section_slots or []
    n_sections = len(sections) if sections else 0
    return {
        "ok": True,
        "id": str(session.id),
        "status": session.status,
        "current_section": session.current_section,
        "current_question_index": session.current_question_index,
        "section_time_remaining": session.section_time_remaining,
        "answers": session.answers or {},
        "bookmarked": session.bookmarked or [],
        "deferred": session.deferred or [],
        "seen": session.seen or [],
        "section_count": n_sections,
        "questions_per_section": QUESTIONS_PER_SECTION,
        "section_seconds": SECTION_SECONDS,
    }


def session_to_payload(
    session: TigerTestSession,
    include_questions: bool = True,
    current_section_only: bool = True,
    include_review: bool = False,
) -> dict:
    sections = session.section_slots or []
    n_sections = len(sections) if sections else 0
    current_section_idx = max(
        0, min(session.current_section - 1, max(0, n_sections - 1))
    )

    current_section_questions = []
    if (
        include_questions
        and sections
        and session.status == TigerTestSession.STATUS_IN_SECTION
    ):
        current_slots = (
            sections[current_section_idx] if current_section_idx < len(sections) else []
        )
        questions_map = load_questions_map(
            current_slots if current_section_only else sections
        )
        current_section_questions = serialize_section_questions(
            current_slots, questions_map
        )

    verbal_count, quant_count = _count_subjects_in_sections(sections)
    total_questions = verbal_count + quant_count
    section_counts = [len(s) for s in sections] if sections else []

    titles = SECTION_TITLES[:n_sections] if n_sections else SECTION_TITLES

    return {
        "id": str(session.id),
        "status": session.status,
        "current_section": session.current_section,
        "current_question_index": session.current_question_index,
        "section_time_remaining": session.section_time_remaining,
        "section_started_at": (
            session.section_started_at.isoformat()
            if session.section_started_at
            else None
        ),
        "answers": session.answers or {},
        "bookmarked": session.bookmarked or [],
        "deferred": session.deferred or [],
        "seen": session.seen or [],
        "pool_warnings": session.pool_warnings or [],
        "section_titles": titles,
        "section_count": n_sections or SECTION_COUNT,
        "total_questions": total_questions,
        "verbal_count": verbal_count,
        "quant_count": quant_count,
        "questions_per_section": (
            section_counts[current_section_idx]
            if section_counts
            else QUESTIONS_PER_SECTION
        ),
        "section_question_counts": section_counts,
        "section_seconds": SECTION_SECONDS,
        "current_section_questions": current_section_questions,
        "results": session.results
        if session.status == TigerTestSession.STATUS_COMPLETED
        else None,
        "review": (
            build_review_items(session)
            if include_review and session.status == TigerTestSession.STATUS_COMPLETED
            else None
        ),
    }

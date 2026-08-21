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


def _available_from_pool(
    pool: list[dict], used: set[str], user, exclude_ids: set[str] | None = None
) -> list[dict]:
    """Unused slots only — never repeat a question for the same student."""
    exclude_ids = exclude_ids or set()
    return [
        s for s in pool if s["slot_id"] not in used and s["slot_id"] not in exclude_ids
    ]


def _pick_from_pool(
    pool: list[dict],
    count: int,
    used: set[str],
    user,
    exclude_ids: set[str] | None = None,
) -> list[dict]:
    """Pick unused slots across bank files (lessons). If one file is short, fill from another."""
    if count <= 0:
        return []
    available = _available_from_pool(pool, used, user, exclude_ids)
    if not available:
        return []

    by_bank: dict[str, list[dict]] = {}
    for s in available:
        bank = s.get("lesson_id") or s.get("parent_id") or "_none"
        by_bank.setdefault(str(bank), []).append(s)

    bank_keys = list(by_bank.keys())
    random.shuffle(bank_keys)

    picked: list[dict] = []
    for key in bank_keys:
        if len(picked) >= count:
            break
        bucket = list(by_bank[key])
        random.shuffle(bucket)
        need = count - len(picked)
        picked.extend(bucket[:need])

    for s in picked:
        used.add(s["slot_id"])
    return picked


def _pick_with_fallback(
    primary: list[dict],
    secondary: list[dict],
    count: int,
    used: set[str],
    user,
    subject_kind: str,
    warnings: list[dict],
    already_picked: set[str],
) -> list[dict]:
    """Pick up to `count` from primary, then fill shortfall from secondary."""
    picked = _pick_from_pool(primary, count, used, user, exclude_ids=already_picked)
    found_in_subject = len(picked)
    shortfall = count - len(picked)
    borrowed = 0

    if shortfall > 0:
        exclude = already_picked | {s["slot_id"] for s in picked}
        extra = _pick_from_pool(secondary, shortfall, used, user, exclude_ids=exclude)
        # Keep original subject on borrowed slots (for correct scoring).
        for s in extra:
            copy = dict(s)
            copy["borrowed_for"] = subject_kind
            picked.append(copy)
        borrowed = len(extra)
        shortfall -= borrowed

    if found_in_subject < count:
        warnings.append(
            {
                "subject": subject_kind,
                "subject_label": SUBJECT_LABELS.get(subject_kind, subject_kind),
                "required": count,
                "found_in_subject": found_in_subject,
                "borrowed_from_other": borrowed,
                "actual": len(picked),
                "shortfall": max(0, count - len(picked)),
            }
        )

    return picked


def _passage_groups(slots: list[dict]) -> list[list[dict]]:
    """Keep sub-questions of the same passage consecutive; each still counts as one slot."""
    groups: dict[str, list[dict]] = {}
    order_keys: list[str] = []
    singles: list[list[dict]] = []
    for s in slots:
        if s.get("passage_index") is not None and s.get("parent_id"):
            pid = str(s["parent_id"])
            if pid not in groups:
                groups[pid] = []
                order_keys.append(pid)
            groups[pid].append(s)
        else:
            singles.append([s])
    out: list[list[dict]] = []
    for pid in order_keys:
        g = groups[pid]
        g.sort(key=lambda x: x.get("passage_index") or 0)
        out.append(g)
    out.extend(singles)
    return out


def _distribute_into_sections(verbal: list[dict], quant: list[dict]) -> list[list[dict]]:
    """Always 5 sections of 24 questions: 13 verbal + 11 quantitative."""
    verbal = list(verbal)
    quant = list(quant)
    if len(verbal) < VERBAL_TOTAL or len(quant) < QUANT_TOTAL:
        return []
    sections: list[list[dict]] = []
    for i in range(SECTION_COUNT):
        v = verbal[i * VERBAL_PER_SECTION : (i + 1) * VERBAL_PER_SECTION]
        q = quant[i * QUANT_PER_SECTION : (i + 1) * QUANT_PER_SECTION]
        groups = _passage_groups(v) + _passage_groups(q)
        random.shuffle(groups)
        section = [slot for g in groups for slot in g]
        if len(section) != QUESTIONS_PER_SECTION:
            return []
        sections.append(section)
    return sections


def _intended_subject(slot: dict) -> str:
    return slot.get("borrowed_for") or slot.get("subject") or "quant"


def _fill_to_full_test(merged: list[dict], warnings: list[dict]) -> list[dict]:
    """Pad with demo questions so the test is always 5 × 24 (13 verbal + 11 quant)."""
    verbal_have = sum(1 for s in merged if _intended_subject(s) == "verbal")
    quant_have = len(merged) - verbal_have
    v_need = max(0, VERBAL_TOTAL - verbal_have)
    q_need = max(0, QUANT_TOTAL - quant_have)
    leftover = TOTAL_QUESTIONS - (len(merged) + v_need + q_need)
    if leftover > 0:
        q_need += leftover

    demo_verbal = 0
    demo_quant = 0
    if v_need:
        extra = make_demo_slots("verbal", v_need, start_index=verbal_have)
        merged.extend(extra)
        demo_verbal = len(extra)
    if q_need:
        extra = make_demo_slots("quant", q_need, start_index=quant_have)
        merged.extend(extra)
        demo_quant = len(extra)

    if demo_verbal or demo_quant:
        warnings.append(
            {
                "subject": "demo",
                "subject_label": "أسئلة تجريبية",
                "required": TOTAL_QUESTIONS,
                "found_in_subject": verbal_have + quant_have,
                "borrowed_from_other": 0,
                "actual": len(merged),
                "shortfall": 0,
                "demo_added": demo_verbal + demo_quant,
                "demo_verbal": demo_verbal,
                "demo_quant": demo_quant,
            }
        )
    return merged[:TOTAL_QUESTIONS]


def build_sections_for_user(user) -> tuple[list[list[dict]], list[dict]]:
    """
    Build exactly 5 sections of 24 questions (13 verbal + 11 quant, 120 total).
    Picks unused bank questions first (no repeats for the student), then other
    bank files, then demo questions only if the banks are exhausted.
    """
    warnings: list[dict] = []
    used = _used_keys_for_user(user)
    verbal_pool, quant_pool = flatten_all_slots()

    already: set[str] = set()
    verbal_picked = _pick_with_fallback(
        verbal_pool,
        quant_pool,
        VERBAL_TOTAL,
        used,
        user,
        "verbal",
        warnings,
        already,
    )
    already |= {s["slot_id"] for s in verbal_picked}

    quant_picked = _pick_with_fallback(
        quant_pool,
        verbal_pool,
        QUANT_TOTAL,
        used,
        user,
        "quant",
        warnings,
        already,
    )

    merged: list[dict] = []
    seen: set[str] = set()
    for s in verbal_picked + quant_picked:
        if s["slot_id"] in seen:
            continue
        seen.add(s["slot_id"])
        merged.append(s)

    merged = _fill_to_full_test(merged, warnings)
    verbal_final = [s for s in merged if _intended_subject(s) == "verbal"]
    quant_final = [s for s in merged if _intended_subject(s) != "verbal"]
    if len(verbal_final) < VERBAL_TOTAL:
        need = VERBAL_TOTAL - len(verbal_final)
        verbal_final.extend(quant_final[:need])
        quant_final = quant_final[need:]
    if len(quant_final) < QUANT_TOTAL:
        need = QUANT_TOTAL - len(quant_final)
        quant_final.extend(verbal_final[:need])
        verbal_final = verbal_final[need:]

    sections = _distribute_into_sections(
        verbal_final[:VERBAL_TOTAL], quant_final[:QUANT_TOTAL]
    )
    if len(sections) != SECTION_COUNT:
        raise ValueError("تعذر تجهيز أقسام اختبار النمر.")

    return sections, warnings


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
    qs = Question.objects.filter(lesson_id__in=ids).order_by(
        "lesson_id", "order_index", "created_at"
    )
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


def build_review_items(session: TigerTestSession) -> list[dict]:
    """Full post-test review: student answer vs correct answer for every slot."""
    sections = session.section_slots or []
    answers = session.answers or {}
    questions_map = load_questions_map(sections)
    lesson_ids = {
        q.lesson_id for q in questions_map.values() if getattr(q, "lesson_id", None)
    }
    for section in sections:
        for slot in section:
            if slot.get("lesson_id"):
                lesson_ids.add(slot["lesson_id"])
    site_maps, videos_by_lesson, lessons = _source_media_for_lessons(lesson_ids)
    items: list[dict] = []
    number = 0
    for section_i, section in enumerate(sections):
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
                explanation = _explanation_for_slot(parent, slot)
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
            if session.status == TigerTestSession.STATUS_COMPLETED
            else None
        ),
    }

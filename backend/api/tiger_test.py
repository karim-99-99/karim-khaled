"""Tiger Test (محاكي اختبار النمر) — question pool, session building, scoring."""
import random
from typing import Any

from django.db.models import Prefetch, Q
from django.utils import timezone

from .models import Question, Answer, TigerTestSession, TigerTestUsedQuestion

VERBAL_SUBJECT_ID = "مادة_اللفظي"
QUANT_SUBJECT_ID = "مادة_الكمي"
VERBAL_TOTAL = 65
QUANT_TOTAL = 55
SECTION_COUNT = 5
SECTION_SECONDS = 25 * 60
QUESTIONS_PER_SECTION_TARGET = 24

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


def flatten_subject_slots(subject_kind: str) -> list[dict[str, Any]]:
    """
    Build selectable question slots for verbal or quant.
    Includes questions whose subject is set directly OR via chapter/lesson.
    """
    subject_id = VERBAL_SUBJECT_ID if subject_kind == "verbal" else QUANT_SUBJECT_ID
    qs = (
        Question.objects.filter(
            Q(subject_id=subject_id)
            | Q(chapter__category__subject_id=subject_id)
            | Q(lesson__chapter__category__subject_id=subject_id)
        )
        .exclude(section_id__in=["قسم_تحصيلي"])
        .select_related(
            "subject",
            "chapter__category__subject",
            "lesson__chapter__category__subject",
        )
        .prefetch_related(
            Prefetch("answers", queryset=Answer.objects.order_by("answer_id"))
        )
        .distinct()
    )

    slots: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for q in qs:
        kind = _resolve_subject_kind(q)
        if kind != subject_kind:
            continue
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
                slots.append(
                    {
                        "slot_id": slot_id,
                        "parent_id": q.id,
                        "passage_index": idx,
                        "subject": subject_kind,
                    }
                )
        else:
            if not q.answers.exists():
                continue
            if q.id in seen_ids:
                continue
            seen_ids.add(q.id)
            slots.append(
                {
                    "slot_id": q.id,
                    "parent_id": q.id,
                    "passage_index": None,
                    "subject": subject_kind,
                }
            )
    return slots


def _used_keys_for_user(user) -> set[str]:
    return set(
        TigerTestUsedQuestion.objects.filter(user=user).values_list(
            "question_key", flat=True
        )
    )


def _available_from_pool(
    pool: list[dict], used: set[str], user, exclude_ids: set[str] | None = None
) -> list[dict]:
    exclude_ids = exclude_ids or set()
    available = [
        s for s in pool if s["slot_id"] not in used and s["slot_id"] not in exclude_ids
    ]
    if not available and pool:
        # Reset used history for this pool so the student can reuse after exhausting bank
        TigerTestUsedQuestion.objects.filter(
            user=user, question_key__in=[s["slot_id"] for s in pool]
        ).delete()
        used -= {s["slot_id"] for s in pool}
        available = [s for s in pool if s["slot_id"] not in exclude_ids]
    return available


def _pick_from_pool(
    pool: list[dict],
    count: int,
    used: set[str],
    user,
    exclude_ids: set[str] | None = None,
) -> list[dict]:
    if count <= 0:
        return []
    available = _available_from_pool(pool, used, user, exclude_ids)
    if not available:
        return []
    n = min(count, len(available))
    picked = random.sample(available, n)
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


def _distribute_into_sections(all_slots: list[dict]) -> list[list[dict]]:
    """
    Split slots into up to 5 non-empty sections.
    Never returns an empty section. If fewer than 5 questions, fewer sections.
    """
    slots = list(all_slots)
    random.shuffle(slots)
    total = len(slots)
    if total == 0:
        return []

    n_sections = min(SECTION_COUNT, total)
    # Aim for ~equal size (ideally ~24 when full bank)
    base = total // n_sections
    rem = total % n_sections

    sections: list[list[dict]] = []
    idx = 0
    for i in range(n_sections):
        count = base + (1 if i < rem else 0)
        if count <= 0:
            continue
        chunk = slots[idx : idx + count]
        idx += count
        if chunk:
            sections.append(chunk)
    return sections


def build_sections_for_user(user) -> tuple[list[list[dict]], list[dict]]:
    """
    Build test sections from available verbal/quant questions.
    Fills shortfalls from the other subject and never creates empty sections.
    """
    warnings: list[dict] = []
    used = _used_keys_for_user(user)
    verbal_pool = flatten_subject_slots("verbal")
    quant_pool = flatten_subject_slots("quant")

    if not verbal_pool and not quant_pool:
        raise ValueError("لا توجد أسئلة متاحة لبدء اختبار النمر حالياً.")

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

    # Deduplicate by slot_id (keep first occurrence)
    merged: list[dict] = []
    seen: set[str] = set()
    for s in verbal_picked + quant_picked:
        if s["slot_id"] in seen:
            continue
        seen.add(s["slot_id"])
        merged.append(s)

    if not merged:
        raise ValueError("لا توجد أسئلة كافية لبدء اختبار النمر.")

    sections = _distribute_into_sections(merged)
    if not sections:
        raise ValueError("لا توجد أسئلة كافية لبدء اختبار النمر.")

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


def serialize_slot_for_client(question: Question, slot: dict) -> dict:
    return {
        "id": slot["slot_id"],
        "subject": slot["subject"],
        "question": _question_html_for_slot(question, slot),
        "answers": _answers_for_slot(question, slot),
        "image": (
            question.question_image.url
            if getattr(question, "question_image", None)
            and question.question_image
            else None
        ),
    }


def load_questions_map(section_slots: list[list[dict]]) -> dict[str, Question]:
    parent_ids = set()
    for section in section_slots:
        for slot in section:
            parent_ids.add(slot["parent_id"])
    if not parent_ids:
        return {}
    qs = Question.objects.filter(id__in=parent_ids).prefetch_related("answers")
    return {q.id: q for q in qs}


def serialize_section_questions(
    section_slots: list[dict], questions_map: dict[str, Question]
) -> list[dict]:
    out = []
    for slot in section_slots:
        q = questions_map.get(slot["parent_id"])
        if not q:
            continue
        out.append(serialize_slot_for_client(q, slot))
    return out


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
            q = questions_map.get(slot["parent_id"])
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
    # Final = average of the two section percentages (missing section counts as 0)
    parts = []
    if verbal_total:
        parts.append(verbal_pct)
    if quant_total:
        parts.append(quant_pct)
    final_pct = round(sum(parts) / len(parts), 1) if parts else 0.0

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
    return max(1, len(sections))


def session_to_payload(session: TigerTestSession, include_questions: bool = True) -> dict:
    sections = session.section_slots or []
    questions_map = load_questions_map(sections) if include_questions else {}

    section_questions = []
    if include_questions:
        for section in sections:
            section_questions.append(
                serialize_section_questions(section, questions_map)
            )

    n_sections = len(sections) if sections else 0
    current_section_idx = max(0, min(session.current_section - 1, max(0, n_sections - 1)))
    current_section_questions = (
        section_questions[current_section_idx] if section_questions else []
    )

    verbal_count, quant_count = _count_subjects_in_sections(sections)
    total_questions = verbal_count + quant_count
    section_counts = [len(s) for s in (section_questions or sections)]

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
        "section_count": n_sections,
        "total_questions": total_questions,
        "verbal_count": verbal_count,
        "quant_count": quant_count,
        "questions_per_section": section_counts[current_section_idx]
        if section_counts
        else 0,
        "section_question_counts": section_counts,
        "section_seconds": SECTION_SECONDS,
        "sections": section_questions,
        "current_section_questions": current_section_questions,
        "results": session.results
        if session.status == TigerTestSession.STATUS_COMPLETED
        else None,
    }

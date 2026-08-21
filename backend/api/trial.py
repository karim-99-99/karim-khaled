"""Standalone public 'جرب مجانا' tree — hidden from the paid courses catalog."""

from .models import Section, Subject, Category, Chapter, Lesson, Video

TRIAL_SECTION_ID = "جرب_مجانا"
TRIAL_SUBJECT_ID = "مادة_تجربة_مجانية"
TRIAL_CATEGORY_ID = "فئة_تجربة_مجانية"
TRIAL_CHAPTER_ID = "فصل_تجربة_مجانية"

CATALOG_HIDDEN_SECTION_IDS = ["قسم_تحصيلي", TRIAL_SECTION_ID]


def ensure_trial_tree() -> dict:
    section, _ = Section.objects.get_or_create(
        id=TRIAL_SECTION_ID,
        defaults={"name": "جرب مجانا", "name_en": "Try for free"},
    )
    subject, _ = Subject.objects.get_or_create(
        id=TRIAL_SUBJECT_ID,
        defaults={
            "section": section,
            "name": "جرب مجانا",
            "name_en": "Try for free",
        },
    )
    if subject.section_id != section.id:
        subject.section = section
        subject.save(update_fields=["section"])
    category, _ = Category.objects.get_or_create(
        id=TRIAL_CATEGORY_ID,
        defaults={
            "subject": subject,
            "name": "جرب مجانا",
            "name_en": "Try for free",
            "has_tests": True,
        },
    )
    if category.subject_id != subject.id:
        category.subject = subject
        category.save(update_fields=["subject"])
    chapter, _ = Chapter.objects.get_or_create(
        id=TRIAL_CHAPTER_ID,
        defaults={
            "category": category,
            "name": "الدروس التجريبية",
            "name_en": "Trial lessons",
            "order": 0,
        },
    )
    if chapter.category_id != category.id:
        chapter.category = category
        chapter.save(update_fields=["category"])
    return {
        "section": section,
        "subject": subject,
        "category": category,
        "chapter": chapter,
    }


def trial_meta() -> dict:
    tree = ensure_trial_tree()
    return {
        "section_id": tree["section"].id,
        "subject_id": tree["subject"].id,
        "category_id": tree["category"].id,
        "chapter_id": tree["chapter"].id,
    }


def is_trial_lesson(lesson: Lesson | None) -> bool:
    return bool(lesson and lesson.chapter_id == TRIAL_CHAPTER_ID)


def is_trial_video(video: Video | None) -> bool:
    if not video:
        return False
    if getattr(video, "section_id", None) == TRIAL_SECTION_ID:
        return True
    lesson = getattr(video, "lesson", None)
    if lesson and lesson.chapter_id == TRIAL_CHAPTER_ID:
        return True
    if getattr(video, "lesson_id", None):
        return Lesson.objects.filter(
            id=video.lesson_id, chapter_id=TRIAL_CHAPTER_ID
        ).exists()
    return False

"""
Chapter dashboard: one optimized payload for the Levels page.

Caches shared content (chapter + videos + files). User progress is always fresh.
"""

from django.core.cache import cache
from django.db.models import Count, Exists, OuterRef, Prefetch, Q

from .models import (
    Chapter, Lesson, Video, File, LessonProgress, QuizAttempt,
)
from .serializers import (
    ChapterSerializer, VideoLiteSerializer, FileLiteSerializer,
)

DISABLED_SECTION_IDS = ['قسم_تحصيلي']
CONTENT_CACHE_TTL = 60 * 15  # 15 minutes
CONTENT_CACHE_PREFIX = 'chapter_dash_v2:'
SECTIONS_TREE_CACHE_KEY = 'sections_tree_v1'
SECTIONS_TREE_CACHE_TTL = 60


def content_cache_key(chapter_id: str) -> str:
    return f'{CONTENT_CACHE_PREFIX}{chapter_id}'


TIGER_SLOT_CACHE_KEY = 'tiger_slots_v2'
TIGER_SLOT_CACHE_TTL = 60 * 10


def invalidate_tiger_slot_cache() -> None:
    cache.delete(TIGER_SLOT_CACHE_KEY)


def invalidate_sections_tree_cache() -> None:
    cache.delete(SECTIONS_TREE_CACHE_KEY)


def invalidate_chapter_dashboard_cache(chapter_id) -> None:
    invalidate_sections_tree_cache()
    invalidate_tiger_slot_cache()
    if not chapter_id:
        return
    cache.delete(content_cache_key(str(chapter_id)))


def invalidate_chapter_dashboard_for_lesson(lesson_id) -> None:
    if not lesson_id:
        return
    chapter_id = (
        Lesson.objects.filter(pk=lesson_id)
        .values_list('chapter_id', flat=True)
        .first()
    )
    invalidate_chapter_dashboard_cache(chapter_id)


def _build_content(chapter_id: str):
    # Presence flags on each lesson so the UI can show video/quiz links
    # without waiting to scan the videos/files arrays client-side.
    items_qs = Lesson.objects.annotate(
        question_count=Count('questions', distinct=True),
        has_video=Exists(Video.objects.filter(lesson_id=OuterRef('pk'))),
        has_file=Exists(File.objects.filter(lesson_id=OuterRef('pk'))),
    ).order_by('order', 'name')
    chapter = (
        Chapter.objects
        .filter(pk=chapter_id)
        .exclude(category__subject__section_id__in=DISABLED_SECTION_IDS)
        .prefetch_related(Prefetch('items', queryset=items_qs))
        .first()
    )
    if not chapter:
        return None

    videos_qs = (
        Video.objects
        .filter(Q(chapter_id=chapter_id) | Q(lesson__chapter_id=chapter_id))
        .exclude(section_id__in=DISABLED_SECTION_IDS)
        .only('id', 'lesson_id', 'title', 'video_url', 'bunny_library_id', 'order')
        .order_by('order', '-created_at')
    )
    files_qs = (
        File.objects
        .filter(Q(chapter_id=chapter_id) | Q(lesson__chapter_id=chapter_id))
        .exclude(section_id__in=DISABLED_SECTION_IDS)
        .only('id', 'lesson_id', 'title', 'file_type', 'order')
        .order_by('order', '-created_at')
    )

    return {
        'chapter': ChapterSerializer(chapter).data,
        'videos': VideoLiteSerializer(videos_qs, many=True).data,
        'files': FileLiteSerializer(files_qs, many=True).data,
    }


def get_cached_content(chapter_id: str):
    key = content_cache_key(chapter_id)
    data = cache.get(key)
    if data is not None:
        return data
    data = _build_content(chapter_id)
    if data is not None:
        cache.set(key, data, CONTENT_CACHE_TTL)
    return data


def build_lesson_status(user, chapter_id: str) -> dict:
    """lessonId -> 'completed' | 'started' for the current student."""
    if not user or not getattr(user, 'is_authenticated', False):
        return {}
    if getattr(user, 'role', None) != 'student':
        return {}

    completed_ids = set(
        QuizAttempt.objects
        .filter(user=user, lesson__chapter_id=chapter_id)
        .values_list('lesson_id', flat=True)
        .distinct()
    )
    started_ids = set(
        LessonProgress.objects
        .filter(user=user, lesson__chapter_id=chapter_id)
        .values_list('lesson_id', flat=True)
    )
    status = {}
    for lid in completed_ids:
        if lid:
            status[str(lid)] = 'completed'
    for lid in started_ids:
        if lid and str(lid) not in status:
            status[str(lid)] = 'started'
    return status


def build_chapter_dashboard(chapter_id: str, user=None):
    content = get_cached_content(str(chapter_id))
    if content is None:
        return None
    payload = {
        'chapter': content['chapter'],
        'videos': content['videos'],
        'files': content['files'],
        'lessonStatus': build_lesson_status(user, str(chapter_id)),
    }
    return payload

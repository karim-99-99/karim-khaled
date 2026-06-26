"""
Backfill Video.chapter/category/subject/section from each video's lesson.

Students list videos by chapter_id; missing hierarchy FKs hide videos from
the lesson list while admin lesson_id queries still find them.
"""
from django.core.management.base import BaseCommand

from api.models import Video


class Command(BaseCommand):
    help = "Sync Video chapter/category/subject/section from linked lessons."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many rows would be updated without saving.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        qs = Video.objects.filter(lesson_id__isnull=False).select_related(
            "lesson__chapter__category__subject__section"
        )
        updated = 0
        skipped = 0
        for video in qs.iterator():
            before = (
                video.chapter_id,
                video.category_id,
                video.subject_id,
                video.section_id,
            )
            if dry_run:
                lesson = video.lesson
                if not lesson or not lesson.chapter_id:
                    skipped += 1
                    continue
                ch = lesson.chapter
                after = (
                    ch.id if ch else None,
                    ch.category_id if ch else None,
                    ch.category.subject_id if ch and ch.category else None,
                    ch.category.subject.section_id if ch and ch.category and ch.category.subject else None,
                )
                if before != after:
                    updated += 1
                continue

            if video.sync_hierarchy_from_lesson():
                video.refresh_from_db(fields=["chapter_id", "category_id", "subject_id", "section_id"])
                after = (
                    video.chapter_id,
                    video.category_id,
                    video.subject_id,
                    video.section_id,
                )
                if before != after:
                    updated += 1
            else:
                skipped += 1

        mode = "Would update" if dry_run else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{mode} {updated} video(s). Skipped {skipped}."))

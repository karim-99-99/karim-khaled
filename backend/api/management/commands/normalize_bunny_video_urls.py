"""
Normalize legacy Bunny video URLs to raw Bunny video IDs.

Why:
- New playback flow expects `Video.video_url` to store a raw Bunny ID.
- Some legacy rows may still store full Bunny URLs.

Default behavior is dry-run (no DB writes).
Use --apply to persist updates.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Video
from api.utils import (
    extract_bunny_video_id,
    extract_bunny_library_id,
    is_bunny_video_id,
    looks_like_bunny_url,
)


class Command(BaseCommand):
    help = (
        "Normalize legacy Bunny URLs in Video.video_url to raw Bunny video IDs. "
        "Dry-run by default; pass --apply to write."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist updates to the database. Without this flag the command is dry-run.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Process at most N rows (useful for incremental rollout).",
        )
        parser.add_argument(
            "--verbose-list",
            action="store_true",
            dest="verbose_list",
            help="Print every candidate/update row (can be noisy on large datasets).",
        )

    def handle(self, *args, **options):
        apply_changes = bool(options.get("apply"))
        limit = options.get("limit")
        verbose_list = bool(options.get("verbose_list"))

        qs = (
            Video.objects.exclude(video_url__isnull=True)
            .exclude(video_url="")
            .only("id", "video_url")
            .order_by("id")
        )
        total_with_url = qs.count()

        if limit is not None and limit > 0:
            qs = qs[:limit]

        already_raw = 0
        non_bunny_rows = 0
        bunny_unparsed = 0
        candidates = []  # (video_id, old_url, new_id, library_id)

        for video in qs:
            old = (video.video_url or "").strip()
            if not old:
                continue

            if is_bunny_video_id(old):
                already_raw += 1
                continue

            if not looks_like_bunny_url(old):
                non_bunny_rows += 1
                continue

            new_id = extract_bunny_video_id(old)
            if not new_id:
                bunny_unparsed += 1
                if verbose_list:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[unparsed] {video.id}: {old[:140]}"
                        )
                    )
                continue

            new_lib = extract_bunny_library_id(old)
            candidates.append((video.id, old, new_id, new_lib))
            if verbose_list:
                lib_msg = f" [lib={new_lib}]" if new_lib else ""
                self.stdout.write(
                    f"[candidate] {video.id}: {old[:120]} -> {new_id}{lib_msg}"
                )

        self.stdout.write("")
        self.stdout.write(f"Rows with non-empty video_url (full set): {total_with_url}")
        if limit is not None and limit > 0:
            self.stdout.write(f"Limit applied: {limit}")
        self.stdout.write(f"Already raw Bunny IDs: {already_raw}")
        self.stdout.write(f"Non-Bunny URLs (left untouched): {non_bunny_rows}")
        self.stdout.write(f"Bunny-like but unparsed rows: {bunny_unparsed}")
        self.stdout.write(f"Rows to normalize: {len(candidates)}")

        if candidates and not verbose_list:
            self.stdout.write("Sample candidates (up to 20):")
            for video_id, old, new_id, new_lib in candidates[:20]:
                lib_msg = f" [lib={new_lib}]" if new_lib else ""
                self.stdout.write(f"  - {video_id}: {old[:90]} -> {new_id}{lib_msg}")

        if not apply_changes:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "Dry-run only. Re-run with --apply to persist these updates."
                )
            )
            return

        if not candidates:
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS("No normalization changes were needed."))
            return

        with transaction.atomic():
            for video_id, _, new_id, new_lib in candidates:
                updates = {"video_url": new_id}
                if new_lib:
                    updates["bunny_library_id"] = new_lib
                Video.objects.filter(pk=video_id).update(**updates)

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(f"Updated {len(candidates)} video row(s) successfully.")
        )

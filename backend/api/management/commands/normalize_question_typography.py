from django.core.management.base import BaseCommand

from api.question_typography import normalize_all_stored_questions


class Command(BaseCommand):
    help = (
        "Flatten mixed font sizes in stored questions, answers, and passages "
        "so every part of a question uses the same text size."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist updates. Without this flag the command only reports.",
        )

    def handle(self, *args, **options):
        apply_changes = bool(options.get("apply"))
        summary = normalize_all_stored_questions(apply=apply_changes)
        if apply_changes:
            self.stdout.write(self.style.SUCCESS(str(summary)))
        else:
            self.stdout.write(
                "Dry-run complete. Pass --apply to persist these updates."
            )
            self.stdout.write(str(summary))

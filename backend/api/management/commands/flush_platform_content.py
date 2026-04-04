"""
مسح كامل لمحتوى المنصة من قاعدة البيانات (Neon / Postgres / SQLite):

- أقسام، مواد، تصنيفات، فصول، دروس (مستويات)
- أسئلة، إجابات، فيديوهات، ملفات
- تقدم الطلاب، محاولات الاختبار، مشاهدات الفيديو، سجل Bunny، إجابات خاطئة
- مجموعات الطلاب (اختياري)

لا يمسح حسابات المستخدمين افتراضياً (المدير يبقى). استخدم --delete-students لحذف كل الطلاب.

الاستخدام على Render / الإنتاج:
  FLUSH_PLATFORM_CONFIRM=1 python manage.py flush_platform_content --yes

محلياً (DEBUG=True):
  python manage.py flush_platform_content --yes
"""
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import (
    User,
    Section,
    StudentGroup,
    StudentGroupMembership,
    VideoAccessLog,
    StudentProgress,
    LessonProgress,
    QuizAttempt,
    VideoWatch,
    IncorrectAnswer,
)


class Command(BaseCommand):
    help = (
        "Delete ALL platform content (sections → lessons, questions, videos, files, "
        "progress, quizzes, groups). Keeps user accounts unless --delete-students."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Required: confirm you intend to wipe content.",
        )
        parser.add_argument(
            "--delete-students",
            action="store_true",
            help="Also delete all users with role=student (admins/superusers kept).",
        )

    def handle(self, *args, **options):
        if not options["yes"]:
            raise CommandError("Refusing: pass --yes to confirm.")

        if not settings.DEBUG:
            if os.environ.get("FLUSH_PLATFORM_CONFIRM") != "1":
                raise CommandError(
                    "Production safety: set FLUSH_PLATFORM_CONFIRM=1 in the environment, "
                    "then run again with --yes."
                )

        delete_students = options["delete_students"]

        self.stdout.write(self.style.WARNING("Starting full content flush…"))

        with transaction.atomic():
            # Logs / progress (no FK to Section tree)
            n_log, _ = VideoAccessLog.objects.all().delete()
            self.stdout.write(f"  VideoAccessLog: {n_log}")

            n_sp, _ = StudentProgress.objects.all().delete()
            self.stdout.write(f"  StudentProgress: {n_sp}")

            n_lp, _ = LessonProgress.objects.all().delete()
            self.stdout.write(f"  LessonProgress: {n_lp}")

            n_qa, _ = QuizAttempt.objects.all().delete()
            self.stdout.write(f"  QuizAttempt: {n_qa}")

            n_vw, _ = VideoWatch.objects.all().delete()
            self.stdout.write(f"  VideoWatch: {n_vw}")

            n_ia, _ = IncorrectAnswer.objects.all().delete()
            self.stdout.write(f"  IncorrectAnswer: {n_ia}")

            n_m, _ = StudentGroupMembership.objects.all().delete()
            self.stdout.write(f"  StudentGroupMembership: {n_m}")

            n_g, _ = StudentGroup.objects.all().delete()
            self.stdout.write(f"  StudentGroup: {n_g}")

            # Section CASCADE: Subject → Category → Chapter → Lesson →
            # Question/Answer, Video, File, etc.
            n_sec, _ = Section.objects.all().delete()
            self.stdout.write(f"  Section (and all nested content): {n_sec}")

            if delete_students:
                qs = User.objects.filter(role="student")
                count = qs.count()
                qs.delete()
                self.stdout.write(self.style.WARNING(f"  Deleted {count} student user(s)."))

        admins = User.objects.filter(role="admin").count()
        students = User.objects.filter(role="student").count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Database has 0 sections/chapters/lessons/questions. "
                f"Users: {admins} admin(s), {students} student(s). "
                "Admin can add structure from the panel from scratch."
            )
        )

        if admins == 0:
            self.stdout.write(
                self.style.ERROR(
                    "Warning: no admin users left. Create one with: "
                    "python manage.py createsuperuser"
                )
            )

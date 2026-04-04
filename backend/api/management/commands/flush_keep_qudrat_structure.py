"""
يمسح الفصول والدروس وجميع المحتوى (أسئلة، فيديو، ملفات، تقدم، إلخ)
مع الإبقاء على الهيكل الثابت فقط:

- قسم: قدرات (قسم_قدرات)
- مادتان: الكمي، اللفظي
- لكل مادة تصنيفان: التأسيس، التجميعات

= 4 تصنيفات فارغة (بدون فصول/دروس) يعيد المدير البناء من لوحة الإدارة.

لا يمس المستخدمين (مديرين وطلاب).

الإنتاج:
  FLUSH_PLATFORM_CONFIRM=1 python manage.py flush_keep_qudrat_structure --yes

محلياً (DEBUG=True):
  python manage.py flush_keep_qudrat_structure --yes
"""
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import (
    Section,
    Subject,
    Category,
    Chapter,
    StudentGroup,
    StudentGroupMembership,
    VideoAccessLog,
    StudentProgress,
    LessonProgress,
    QuizAttempt,
    VideoWatch,
    IncorrectAnswer,
)

# يطابق seed_initial_data والواجهة الافتراضية
KEEP_SECTION_IDS = frozenset({"قسم_قدرات"})
KEEP_SUBJECT_IDS = frozenset({"مادة_الكمي", "مادة_اللفظي"})
KEEP_CATEGORY_IDS = frozenset(
    {
        "مادة_الكمي_تأسيس",
        "مادة_الكمي_تجميعات",
        "مادة_اللفظي_تأسيس",
        "مادة_اللفظي_تجميعات",
    }
)


def ensure_qudrat_shell(stdout, style):
    """يضمن وجود القسم والمواد والتصنيفات الأربعة بدون فصول."""
    sec, created = Section.objects.get_or_create(
        id="قسم_قدرات",
        defaults={"name": "قدرات", "name_en": "Qudrat"},
    )
    if created:
        stdout.write(style.SUCCESS("  أنشئ قسم قدرات."))

    for sid, sname, sname_en in [
        ("مادة_الكمي", "الكمي", "Quantitative"),
        ("مادة_اللفظي", "اللفظي", "Verbal"),
    ]:
        subj, cr = Subject.objects.get_or_create(
            id=sid,
            defaults={
                "section": sec,
                "name": sname,
                "name_en": sname_en,
            },
        )
        if not cr and subj.section_id != sec.id:
            subj.section = sec
            subj.save(update_fields=["section"])
        for cid, cname, cname_en in [
            (f"{sid}_تأسيس", "التأسيس", "Foundation"),
            (f"{sid}_تجميعات", "التجميعات", "Collections"),
        ]:
            cat, ccr = Category.objects.get_or_create(
                id=cid,
                defaults={
                    "subject": subj,
                    "name": cname,
                    "name_en": cname_en,
                    "has_tests": True,
                },
            )
            if not ccr and cat.subject_id != subj.id:
                cat.subject = subj
                cat.save(update_fields=["subject"])


class Command(BaseCommand):
    help = (
        "Delete all chapters/lessons/content; keep only Qudrat + Quantitative/Verbal "
        "+ Foundation/Collections (empty). Preserves all user accounts."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Required confirmation.",
        )

    def handle(self, *args, **options):
        if not options["yes"]:
            raise CommandError("مرّر --yes للتأكيد.")

        if not settings.DEBUG:
            if os.environ.get("FLUSH_PLATFORM_CONFIRM") != "1":
                raise CommandError(
                    "للإنتاج: عيّن FLUSH_PLATFORM_CONFIRM=1 ثم أعد التشغيل مع --yes."
                )

        self.stdout.write(
            self.style.WARNING(
                "مسح المحتوى مع الإبقاء على: قدرات + كمي/لفظي + تأسيس/تجميعات (فارغة)…"
            )
        )

        with transaction.atomic():
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

            # يحذف الدروس والأسئلة والفيديو والملفات (CASCADE من الفصل/الدرس)
            n_ch, _ = Chapter.objects.all().delete()
            self.stdout.write(f"  Chapter (وكل ما تحته): {n_ch}")

            n_cat, _ = Category.objects.exclude(id__in=KEEP_CATEGORY_IDS).delete()
            self.stdout.write(f"  Category (محذوفة غير المحفوظة): {n_cat}")

            n_sub, _ = Subject.objects.exclude(id__in=KEEP_SUBJECT_IDS).delete()
            self.stdout.write(f"  Subject (محذوفة غير المحفوظة): {n_sub}")

            n_sec, _ = Section.objects.exclude(id__in=KEEP_SECTION_IDS).delete()
            self.stdout.write(f"  Section (محذوفة غير المحفوظة): {n_sec}")

            ensure_qudrat_shell(self.stdout, self.style)

        self.stdout.write(
            self.style.SUCCESS(
                "تم. بقي قسم قدرات مع مادتي الكمي واللفظي وأربعة تصنيفات (تأسيس/تجميعات) "
                "بدون فصول أو دروس. المدير يضيف الفصول من جديد. الطلاب والمديرون لم يُمسّوا."
            )
        )

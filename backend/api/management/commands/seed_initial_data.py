"""
Load initial structure: Sections, Subjects, Categories, Chapters, Lessons.
Matches the default structure expected by the frontend (storageService.initializeDefaultData).

- Run once for a fresh DB: python manage.py seed_initial_data
- Without --clear: only creates missing records (get_or_create). Does NOT delete existing
  sections/chapters/lessons — so your renames and structure stay in PostgreSQL.
- With --clear: DELETES all Section/Subject/Category/Chapter/Lesson. Use only for a full
  reset. In production set SEED_ALLOW_CLEAR=1 to allow --clear (safety guard).
"""
import os
from django.core.management.base import BaseCommand
from api.models import Section, Subject, Category, Chapter, Lesson, User


def create_category(cat_id, name, section_subject, has_tests=True):
    cat, _ = Category.objects.get_or_create(
        id=cat_id,
        defaults={'subject': section_subject, 'name': name, 'has_tests': has_tests}
    )
    # Create 10 chapters
    for ch in range(1, 11):
        ch_id = f"{cat_id}_فصل_{ch}"
        chapter, _ = Chapter.objects.get_or_create(
            id=ch_id,
            defaults={'category': cat, 'name': f'الفصل {ch}', 'order': ch}
        )
        # Create 20 lessons per chapter
        for lesson in range(1, 21):
            item_id = f"{ch_id}_درس_{lesson}"
            Lesson.objects.get_or_create(
                id=item_id,
                defaults={
                    'chapter': chapter,
                    'name': f'الدرس {lesson}',
                    'has_test': has_tests,
                    'order': lesson
                }
            )
    return cat


class Command(BaseCommand):
    help = 'Seed sections, subjects, categories, chapters, and lessons (mirrors frontend default data)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all Section/Subject/Category/Chapter/Lesson before seeding (use with care)',
        )

    def handle(self, *args, **options):
        if options.get('clear'):
            if os.environ.get('SEED_ALLOW_CLEAR') != '1':
                self.stdout.write(self.style.ERROR(
                    'Refusing to run --clear unless SEED_ALLOW_CLEAR=1 is set (safety). '
                    'This prevents accidental deletion of sections/chapters/lessons in production.'
                ))
                return
            self.stdout.write('Clearing existing structure...')
            Lesson.objects.all().delete()
            Chapter.objects.all().delete()
            Category.objects.all().delete()
            Subject.objects.all().delete()
            Section.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared.'))
        
        # Create default users if they don't exist
        self.stdout.write('Creating default users...')
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@teacher.com',
                'first_name': 'مدير',
                'role': 'admin',
                'is_active_account': True,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin user: admin / admin123'))
        else:
            self.stdout.write(f'Admin user already exists: admin')
        
        student_user, created = User.objects.get_or_create(
            username='student',
            defaults={
                'email': 'student@test.com',
                'first_name': 'طالب تجريبي',
                'role': 'student',
                'is_active_account': True,
            }
        )
        if created:
            student_user.set_password('student123')
            student_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created student user: student / student123'))
        else:
            self.stdout.write(f'Student user already exists: student')

        # Section: قدرات
        sec_qudrat, _ = Section.objects.get_or_create(
            id='قسم_قدرات',
            defaults={'name': 'قدرات'}
        )
        for sid, sname in [
            ('مادة_الكمي', 'الكمي'),
            ('مادة_اللفظي', 'اللفظي'),
        ]:
            subj, _ = Subject.objects.get_or_create(
                id=sid,
                defaults={'section': sec_qudrat, 'name': sname}
            )
            for cid, cname in [
                (f'{sid}_تأسيس', 'التأسيس'),
                (f'{sid}_تجميعات', 'التجميعات'),
            ]:
                create_category(cid, cname, subj, has_tests=True)

        self.stdout.write(self.style.SUCCESS(
            'Seeded: 1 section (قدرات), 2 subjects, 4 categories, 40 chapters, 800 lessons.'
        ))

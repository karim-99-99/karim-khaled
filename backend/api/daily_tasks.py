"""Daily tasks: banks and homework assigned to a group for specific days."""

import datetime
from collections import defaultdict

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyTask, Lesson, QuizAttempt, StudentGroup, StudentGroupMembership, User
from .permissions import IsAuthenticatedDeviceAllowed, IsStaffUser

MAX_SPAN_DAYS = 180


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _local_date(dt):
    if not dt:
        return None
    if timezone.is_aware(dt):
        return timezone.localtime(dt).date()
    return dt.date()


def _lesson_payload(lesson):
    chapter = lesson.chapter
    category = chapter.category if chapter else None
    subject = category.subject if category else None
    section = subject.section if subject else None
    category_name = category.name if category else ''
    return {
        'lesson_id': lesson.id,
        'lesson_name': lesson.name,
        'is_bank': 'تجميع' in (category_name or ''),
        'category_name': category_name,
        'chapter_name': chapter.name if chapter else '',
        'subject_name': subject.name if subject else '',
        'path': {
            'section_id': section.id if section else None,
            'subject_id': subject.id if subject else None,
            'category_id': category.id if category else None,
            'chapter_id': chapter.id if chapter else None,
            'item_id': lesson.id,
        },
    }


def _attempt_index(user_ids, lesson_ids):
    """Attempts keyed by (user_id, lesson_id), newest first."""
    if not user_ids or not lesson_ids:
        return {}
    grouped = defaultdict(list)
    rows = QuizAttempt.objects.filter(
        user_id__in=user_ids,
        lesson_id__in=lesson_ids,
    ).only('user_id', 'lesson_id', 'score', 'completed_at')
    for row in rows:
        grouped[(row.user_id, row.lesson_id)].append(row)
    for key in grouped:
        grouped[key].sort(key=lambda row: row.completed_at, reverse=True)
    return grouped


def _stats_for_task(attempts, task_date):
    """Count only attempts on or after the assigned day."""
    relevant = [
        row for row in attempts
        if _local_date(row.completed_at) and _local_date(row.completed_at) >= task_date
    ]
    if not relevant:
        return {'solved': False, 'latest_score': None, 'attempt_count': 0}
    return {
        'solved': True,
        'latest_score': relevant[0].score,
        'attempt_count': len(relevant),
    }


class DailyTaskGroupListView(APIView):
    """Groups the person who assigns banks and homework can target."""

    permission_classes = [IsStaffUser]

    def get(self, request):
        roots = StudentGroup.objects.filter(parent__isnull=True).order_by('order', 'name')

        def pack(group):
            return {
                'id': group.id,
                'name': group.name,
                'children': [pack(child) for child in group.children.all().order_by('order', 'name')],
            }

        return Response([pack(group) for group in roots])


class DailyTaskMineView(APIView):
    """Student: previous days and today. Future assignments stay hidden."""

    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get(self, request):
        today = timezone.localdate()
        group_ids = list(
            StudentGroupMembership.objects.filter(user=request.user).values_list('group_id', flat=True)
        )
        tasks = list(
            DailyTask.objects.filter(
                group_id__in=group_ids,
                task_date__lte=today,
            ).select_related(
                'lesson',
                'lesson__chapter',
                'lesson__chapter__category',
                'lesson__chapter__category__subject',
                'lesson__chapter__category__subject__section',
            ).order_by('-task_date', 'id')
        ) if group_ids else []

        seen = set()
        unique = []
        for task in tasks:
            key = (task.task_date, task.lesson_id)
            if key in seen:
                continue
            seen.add(key)
            unique.append(task)

        lesson_ids = {task.lesson_id for task in unique}
        attempts = _attempt_index([request.user.id], lesson_ids)

        by_date = defaultdict(list)
        for task in unique:
            stats = _stats_for_task(attempts.get((request.user.id, task.lesson_id), []), task.task_date)
            by_date[task.task_date].append({
                'id': task.id,
                **_lesson_payload(task.lesson),
                **stats,
            })

        days = []
        for day in sorted(by_date, reverse=True):
            items = by_date[day]
            days.append({
                'date': day.isoformat(),
                'is_today': day == today,
                'tasks': items,
                'all_solved': bool(items) and all(item['solved'] for item in items),
            })

        today_tasks = by_date.get(today, [])
        return Response({
            'today': today.isoformat(),
            'today_tasks': today_tasks,
            'all_today_solved': bool(today_tasks) and all(item['solved'] for item in today_tasks),
            'days': days,
        })


class DailyTaskAssignmentView(APIView):
    """Staff: list or create daily banks/homework for a group across a date range."""

    permission_classes = [IsStaffUser]

    def get(self, request):
        group_id = request.query_params.get('group_id')
        start = _parse_date(request.query_params.get('from'))
        end = _parse_date(request.query_params.get('to'))
        if not group_id or not start or not end:
            return Response(
                {'error': 'group_id و from و to مطلوبة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if end < start:
            start, end = end, start
        tasks = DailyTask.objects.filter(
            group_id=group_id,
            task_date__gte=start,
            task_date__lte=end,
        ).select_related(
            'lesson',
            'lesson__chapter',
            'lesson__chapter__category',
            'lesson__chapter__category__subject',
        ).order_by('task_date', 'id')
        today = timezone.localdate()
        return Response({
            'tasks': [
                {
                    'id': task.id,
                    'date': task.task_date.isoformat(),
                    'is_future': task.task_date > today,
                    **_lesson_payload(task.lesson),
                }
                for task in tasks
            ]
        })

    def post(self, request):
        group_id = request.data.get('group_id')
        start = _parse_date(request.data.get('start_date'))
        end = _parse_date(request.data.get('end_date'))
        lesson_ids = request.data.get('lesson_ids') or []
        if not group_id or not start or not end or not isinstance(lesson_ids, list) or not lesson_ids:
            return Response(
                {'error': 'اختر المجموعة والمدة وواجباً أو بنكاً واحداً على الأقل'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if end < start:
            start, end = end, start
        if (end - start).days > MAX_SPAN_DAYS:
            return Response(
                {'error': f'أقصى مدة هي {MAX_SPAN_DAYS} يوماً'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            group = StudentGroup.objects.get(pk=group_id)
        except StudentGroup.DoesNotExist:
            return Response({'error': 'المجموعة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)

        lessons = list(Lesson.objects.filter(id__in=[str(lid) for lid in lesson_ids if lid]))
        if not lessons:
            return Response({'error': 'الواجب أو البنك غير موجود'}, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        skipped = 0
        day = start
        while day <= end:
            for lesson in lessons:
                _, was_created = DailyTask.objects.get_or_create(
                    group=group,
                    lesson=lesson,
                    task_date=day,
                    defaults={'created_by': request.user if request.user.is_authenticated else None},
                )
                if was_created:
                    created += 1
                else:
                    skipped += 1
            day += datetime.timedelta(days=1)
        return Response({'created': created, 'skipped': skipped}, status=status.HTTP_201_CREATED)


class DailyTaskAssignmentDetailView(APIView):
    permission_classes = [IsStaffUser]

    def delete(self, request, pk):
        deleted, _ = DailyTask.objects.filter(pk=pk).delete()
        if not deleted:
            return Response({'error': 'المهمة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'deleted': True})


class DailyTaskReportView(APIView):
    """Staff: who solved each daily task, latest score, and attempt count."""

    permission_classes = [IsStaffUser]

    def get(self, request):
        group_id = request.query_params.get('group_id')
        start = _parse_date(request.query_params.get('from'))
        end = _parse_date(request.query_params.get('to'))
        if not group_id or not start or not end:
            return Response(
                {'error': 'group_id و from و to مطلوبة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if end < start:
            start, end = end, start
        try:
            group = StudentGroup.objects.get(pk=group_id)
        except StudentGroup.DoesNotExist:
            return Response({'error': 'المجموعة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)

        students = list(
            User.objects.filter(
                group_memberships__group=group,
                role='student',
            ).order_by('first_name', 'username').distinct()
        )
        tasks = list(
            DailyTask.objects.filter(
                group=group,
                task_date__gte=start,
                task_date__lte=end,
            ).select_related('lesson').order_by('task_date', 'id')
        )
        attempts = _attempt_index(
            [student.id for student in students],
            {task.lesson_id for task in tasks},
        )
        today = timezone.localdate()
        by_date = defaultdict(list)
        for task in tasks:
            by_date[task.task_date].append(task)

        days = []
        for day in sorted(by_date):
            day_tasks = by_date[day]
            student_rows = []
            for student in students:
                items = []
                for task in day_tasks:
                    stats = _stats_for_task(
                        attempts.get((student.id, task.lesson_id), []),
                        task.task_date,
                    )
                    items.append({
                        'task_id': task.id,
                        'lesson_id': task.lesson_id,
                        'lesson_name': task.lesson.name,
                        'due': day <= today,
                        **stats,
                    })
                student_rows.append({
                    'user_id': student.id,
                    'name': student.first_name or student.username,
                    'username': student.username,
                    'items': items,
                })
            days.append({
                'date': day.isoformat(),
                'is_today': day == today,
                'is_future': day > today,
                'tasks': [
                    {'id': task.id, 'lesson_id': task.lesson_id, 'lesson_name': task.lesson.name}
                    for task in day_tasks
                ],
                'students': student_rows,
            })
        return Response({'group_id': group.id, 'group_name': group.name, 'days': days})

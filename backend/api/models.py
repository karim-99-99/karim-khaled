import uuid

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    """Custom User model with admin/student roles and permissions."""
    
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('content_admin', 'Content admin'),
        ('student', 'Student'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    phone = models.CharField(max_length=20, blank=True, null=True)
    telegram_id = models.CharField(
        max_length=64, blank=True, null=True, unique=True, db_index=True,
        help_text='Telegram user id from Login / OIDC',
    )
    telegram_username = models.CharField(max_length=150, blank=True, null=True)
    is_active_account = models.BooleanField(default=False)  # Admin controls this
    # Optional: limit student access to a date range (admin sets from/until)
    account_active_from = models.DateField(null=True, blank=True, help_text='Student account active from this date (inclusive)')
    account_active_until = models.DateField(null=True, blank=True, help_text='Student account active until this date (inclusive)')
    
    # Permissions (for students, controlled by admin)
    has_abilities_access = models.BooleanField(default=False)
    has_collection_access = models.BooleanField(default=False)
    abilities_subjects_verbal = models.BooleanField(default=False)
    abilities_subjects_quantitative = models.BooleanField(default=False)
    abilities_categories_foundation = models.BooleanField(default=False)
    abilities_categories_collections = models.BooleanField(default=False)

    # Profile avatar choice (student can set on first login)
    AVATAR_CHOICES = [
        ('male_gulf', 'Male (Gulf)'),
        ('female_gulf', 'Female (Gulf)'),
    ]
    avatar_choice = models.CharField(max_length=20, choices=AVATAR_CHOICES, blank=True, null=True)

    # Device / IP restriction (students): single device by default, multi-device only with admin permission
    registered_ip = models.CharField(max_length=45, blank=True, null=True, help_text='IP at registration; access restricted to this IP unless allow_multi_device')
    allow_multi_device = models.BooleanField(default=False, help_text='If True, student can access from any device; admin-controlled')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_content_staff(self):
        """مدير كامل أو مساعد محتوى (رفع وإدارة المواد دون المستخدمين)."""
        return self.role in ('admin', 'content_admin')
    
    @property
    def is_student(self):
        return self.role == 'student'

    def is_within_account_period(self):
        """For students: if account_active_from/until are set, today must be in [from, until]. Admins always True."""
        if self.role != 'student':
            return True
        from django.utils import timezone
        today = timezone.now().date()
        if self.account_active_from is not None and today < self.account_active_from:
            return False
        if self.account_active_until is not None and today > self.account_active_until:
            return False
        return True


class Section(models.Model):
    """Main section: قدرات (Abilities). (تحصيلي removed)"""
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Subject(models.Model):
    """Subjects within a section (e.g., الرياضيات, الأحياء, الكمي, اللفظي)"""
    id = models.CharField(max_length=50, primary_key=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.section.name} - {self.name}"


class Category(models.Model):
    """Categories within a subject (e.g., التأسيس, التجميعات)"""
    id = models.CharField(max_length=50, primary_key=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, null=True)
    has_tests = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.subject.name} - {self.name}"


class Chapter(models.Model):
    """Chapters within a category"""
    id = models.CharField(max_length=50, primary_key=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='chapters')
    name = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, null=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'name']
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"


class Lesson(models.Model):
    """Lessons/Items within a chapter"""
    id = models.CharField(max_length=100, primary_key=True)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, null=True)
    has_test = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'name']
    
    def __str__(self):
        return f"{self.chapter.name} - {self.name}"


class Question(models.Model):
    """Questions with multiple choice answers; passage type has passage_text + passage_questions."""
    QUESTION_TYPE_SINGLE = 'single'
    QUESTION_TYPE_PASSAGE = 'passage'
    QUESTION_TYPE_CHOICES = [
        (QUESTION_TYPE_SINGLE, 'Single'),
        (QUESTION_TYPE_PASSAGE, 'Passage'),
    ]

    id = models.CharField(max_length=100, primary_key=True)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    # Also store references for easy filtering
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)

    question_type = models.CharField(
        max_length=20, choices=QUESTION_TYPE_CHOICES, default=QUESTION_TYPE_SINGLE
    )
    question = models.TextField()  # HTML content with math; placeholder for passage type
    question_en = models.TextField(blank=True, null=True)
    question_image = models.ImageField(upload_to='questions/', blank=True, null=True)
    explanation = models.TextField(blank=True, null=True)  # Explanation for correct answer
    # Optional: seek lesson Bunny/HTML5 video to this segment when student watches explanation
    video_start_seconds = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Start of video explanation for this question (seconds)',
    )
    video_end_seconds = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Optional pause time for video explanation (seconds)',
    )

    passage_text = models.TextField(blank=True, null=True)
    passage_questions = models.JSONField(default=list, blank=True)  # [{"question":"...","answers":[...]}]

    order_index = models.IntegerField(default=0, null=True, blank=True)  # ترتيب السؤال (1, 2, 3...)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_questions')
    
    class Meta:
        ordering = ['order_index', '-created_at']
    
    def __str__(self):
        return f"Question {self.id}"


class Answer(models.Model):
    """Answers for questions"""
    ANSWER_CHOICES = [
        ('a', 'A'),
        ('b', 'B'),
        ('c', 'C'),
        ('d', 'D'),
    ]
    
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    answer_id = models.CharField(max_length=1, choices=ANSWER_CHOICES)
    text = models.TextField()  # HTML content with math
    is_correct = models.BooleanField(default=False)
    
    class Meta:
        unique_together = [['question', 'answer_id']]
        ordering = ['answer_id']
    
    def __str__(self):
        return f"{self.question.id} - {self.answer_id}"


class Video(models.Model):
    """Educational videos"""
    id = models.CharField(max_length=100, primary_key=True)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='videos', null=True, blank=True)
    # Also store references for easy filtering
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='videos', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='videos', null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='videos', null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='videos', null=True, blank=True)
    
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    video_file = models.FileField(upload_to='videos/', blank=True, null=True)
    # External link OR Bunny Stream Video ID (UUID / numeric). Keep flexible.
    video_url = models.CharField(max_length=800, blank=True, null=True)
    # For multi-library Bunny setups: which Stream library contains this video.
    bunny_library_id = models.CharField(max_length=50, blank=True, null=True)
    thumbnail = models.ImageField(upload_to='videos/thumbnails/', blank=True, null=True)
    duration = models.IntegerField(default=0)  # Duration in seconds
    order = models.IntegerField(default=0)
    # Public/free content (e.g. تأسيس) visible without login
    is_public = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_videos')
    
    class Meta:
        ordering = ['order', '-created_at']
        indexes = [
            models.Index(fields=['chapter', 'order'], name='api_video_chapter_order_idx'),
            models.Index(fields=['lesson'], name='api_video_lesson_idx'),
        ]
    
    def sync_hierarchy_from_lesson(self, save=True):
        """Copy chapter/category/subject/section from lesson for student chapter listings."""
        if not self.lesson_id:
            return False
        lesson = self.lesson
        if not lesson or not getattr(lesson, 'chapter_id', None):
            return False
        chapter = lesson.chapter
        if not chapter:
            return False
        self.chapter = chapter
        self.category = chapter.category
        self.subject = chapter.category.subject
        self.section = chapter.category.subject.section
        if save:
            self.save(update_fields=['chapter', 'category', 'subject', 'section'])
        return True

    def resolved_category_name(self):
        """Category name for access checks; follows lesson when FK is missing."""
        if self.category_id and self.category:
            return (self.category.name or '').strip()
        if self.lesson_id and self.lesson and self.lesson.chapter and self.lesson.chapter.category:
            return (self.lesson.chapter.category.name or '').strip()
        return ''

    def __str__(self):
        return self.title


class BunnyStreamLibrary(models.Model):
    """
    Bunny Stream library credentials registered by admin in the website.
    Lets staff add new libraries without editing Render env vars each time.
    """
    library_id = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=200, blank=True, default='')
    security_key = models.CharField(max_length=500, help_text='Token Authentication key from Bunny Security tab')
    stream_api_key = models.CharField(max_length=500, help_text='Library API key from Bunny API tab')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='bunny_libraries'
    )

    class Meta:
        ordering = ['library_id']
        verbose_name_plural = 'Bunny stream libraries'

    def __str__(self):
        return self.label or f"Library {self.library_id}"


class File(models.Model):
    """Files (PDFs, documents, etc.)"""
    id = models.CharField(max_length=100, primary_key=True)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='files', null=True, blank=True)
    # Also store references for easy filtering
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='files', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='files', null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='files', null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='files', null=True, blank=True)
    
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='files/')
    file_type = models.CharField(max_length=50, blank=True, null=True)  # pdf, doc, etc.
    order = models.IntegerField(default=0)
    # Public/free content (e.g. تأسيس) visible without login
    is_public = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_files')
    
    class Meta:
        ordering = ['order', '-created_at']
        indexes = [
            models.Index(fields=['chapter', 'order'], name='api_file_chapter_order_idx'),
            models.Index(fields=['lesson'], name='api_file_lesson_idx'),
        ]
    
    def __str__(self):
        return self.title


class StudentProgress(models.Model):
    """Track student progress on questions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='student_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='student_progress', null=True, blank=True)
    
    # Answer tracking
    selected_answer = models.CharField(max_length=1, blank=True, null=True)  # a, b, c, or d
    is_correct = models.BooleanField(default=False)
    time_spent = models.IntegerField(default=0)  # Time spent in seconds
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['user', 'question']]
        ordering = ['-answered_at', '-started_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.question.id}"


class LessonProgress(models.Model):
    """Track overall progress per lesson"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='progress_records')
    
    # Progress metrics
    total_questions = models.IntegerField(default=0)
    answered_questions = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    
    # Percentage
    completion_percentage = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)])
    accuracy_percentage = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)])
    
    # Last question answered (to track where student stopped)
    last_question = models.ForeignKey(Question, on_delete=models.SET_NULL, null=True, blank=True, related_name='lesson_stopped_at')
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = [['user', 'lesson']]
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', 'lesson'], name='api_lp_user_lesson_idx'),
            models.Index(fields=['lesson'], name='api_lp_lesson_idx'),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.lesson.name} ({self.completion_percentage}%)"
    
    def update_progress(self):
        """Recalculate progress metrics"""
        from django.db.models import Count, Sum
        total = self.lesson.questions.count()
        answered = StudentProgress.objects.filter(user=self.user, question__lesson=self.lesson, answered_at__isnull=False).count()
        correct = StudentProgress.objects.filter(user=self.user, question__lesson=self.lesson, is_correct=True, answered_at__isnull=False).count()
        
        self.total_questions = total
        self.answered_questions = answered
        self.correct_answers = correct
        self.completion_percentage = (answered / total * 100) if total > 0 else 0
        self.accuracy_percentage = (correct / answered * 100) if answered > 0 else 0
        
        # Get last answered question
        last_progress = StudentProgress.objects.filter(
            user=self.user, 
            question__lesson=self.lesson, 
            answered_at__isnull=False
        ).order_by('-answered_at').first()
        
        if last_progress:
            self.last_question = last_progress.question
        
        self.save()


class QuizAttempt(models.Model):
    """Track each quiz/exam attempt (completed exams only)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='quiz_attempts')
    
    score = models.FloatField(default=0)  # Percentage 0-100
    correct_count = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField()
    duration_seconds = models.IntegerField(default=0)  # Time to complete in seconds
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-completed_at']
        indexes = [
            models.Index(fields=['user', 'lesson'], name='api_qa_user_lesson_idx'),
            models.Index(fields=['lesson'], name='api_qa_lesson_idx'),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.lesson.name} ({self.score}%)"


class VideoWatch(models.Model):
    """Track video watches per user per lesson"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='video_watches')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='video_watches')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='watches', null=True, blank=True)
    
    watch_count = models.IntegerField(default=1)
    last_watched_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['user', 'lesson', 'video']]
        ordering = ['-last_watched_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.lesson.name} (x{self.watch_count})"


class VideoAccessLog(models.Model):
    """
    Audit trail: every time a user requests a Bunny signed URL.
    Used for watermark tracing, per-user revocation, and abuse detection.
    """
    RISK_OK = 'ok'
    RISK_WARN = 'warn'
    RISK_FLAG = 'flag'
    RISK_CHOICES = [(RISK_OK, 'OK'), (RISK_WARN, 'Warning'), (RISK_FLAG, 'Flagged')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='video_access_logs')
    video_id = models.CharField(max_length=200)          # Bunny video UUID
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=64, blank=True)  # frontend session fingerprint
    token_expires = models.BigIntegerField()             # unix timestamp the signed URL expires
    requested_at = models.DateTimeField(auto_now_add=True)
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES, default=RISK_OK)

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['user', 'video_id', 'requested_at']),
            models.Index(fields=['ip_address', 'requested_at']),
        ]

    def __str__(self):
        return f"{self.user.username} → {self.video_id} @ {self.ip_address}"


class IncorrectAnswer(models.Model):
    """Store questions the student answered incorrectly for later review."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incorrect_answers')
    question_id = models.CharField(max_length=100)  # Can be passage sub-q id
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='incorrect_answers', null=True, blank=True)
    lesson_name = models.CharField(max_length=200, blank=True)
    category_name = models.CharField(max_length=200, blank=True)
    subject_name = models.CharField(max_length=200, blank=True)

    question_snapshot = models.JSONField(default=dict)  # Full question data for display
    user_answer_id = models.CharField(max_length=10, blank=True)
    correct_answer_id = models.CharField(max_length=10, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'question_id']]  # One record per user per question
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.question_id}"


class StudentGroup(models.Model):
    """Group of students (can be nested: group inside group)."""
    name = models.CharField(max_length=200)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class StudentGroupMembership(models.Model):
    """Which students belong to which group (many-to-many)."""
    group = models.ForeignKey(
        StudentGroup,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='group_memberships'
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['group', 'user']]
        ordering = ['added_at']

    def __str__(self):
        return f"{self.group.name} - {self.user.username}"


class TigerTestSession(models.Model):
    """Full Tiger Test (محاكي اختبار النمر) attempt — 5 sections × 24 minutes."""
    STATUS_IN_SECTION = 'in_section'
    STATUS_BETWEEN_SECTIONS = 'between_sections'
    STATUS_COMPLETED = 'completed'
    STATUS_CHOICES = [
        (STATUS_IN_SECTION, 'In section'),
        (STATUS_BETWEEN_SECTIONS, 'Between sections'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tiger_test_sessions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_IN_SECTION)
    current_section = models.PositiveSmallIntegerField(default=1)
    current_question_index = models.PositiveSmallIntegerField(default=0)
    section_time_remaining = models.PositiveIntegerField(default=24 * 60)
    section_started_at = models.DateTimeField(null=True, blank=True)
    section_slots = models.JSONField(default=list)
    answers = models.JSONField(default=dict)
    bookmarked = models.JSONField(default=list)
    deferred = models.JSONField(default=list)
    seen = models.JSONField(default=list)
    pool_warnings = models.JSONField(default=list)
    results = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status'], name='api_tiger_user_status_idx'),
        ]

    def __str__(self):
        return f"TigerTest {self.id} — {self.user.username}"


class TigerTestUsedQuestion(models.Model):
    """Track question slots already served to a student (no repeats across tests)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tiger_used_questions')
    question_key = models.CharField(max_length=150)
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'question_key']]
        indexes = [
            models.Index(fields=['user'], name='api_tiger_used_user_idx'),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.question_key}"

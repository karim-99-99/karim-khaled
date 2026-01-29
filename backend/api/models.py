from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    """Custom User model with admin/student roles and permissions."""
    
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('student', 'Student'),
    ]
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active_account = models.BooleanField(default=False)  # Admin controls this
    
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
    def is_student(self):
        return self.role == 'student'


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
    """Questions with multiple choice answers"""
    id = models.CharField(max_length=100, primary_key=True)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    # Also store references for easy filtering
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    
    question = models.TextField()  # HTML content with math
    question_en = models.TextField(blank=True, null=True)
    question_image = models.ImageField(upload_to='questions/', blank=True, null=True)
    explanation = models.TextField(blank=True, null=True)  # Explanation for correct answer
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_questions')
    
    class Meta:
        ordering = ['-created_at']
    
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
    video_url = models.URLField(blank=True, null=True)  # For external video links (YouTube, Vimeo, etc.)
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
    
    def __str__(self):
        return self.title


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

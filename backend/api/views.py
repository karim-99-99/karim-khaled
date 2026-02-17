import uuid
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q, Count, Avg, Max, Sum
from django.http import HttpResponse
from django.utils import timezone

from .models import (
    User, Section, Subject, Category, Chapter, Lesson,
    Question, Answer, Video, File, StudentProgress, LessonProgress,
    QuizAttempt, VideoWatch, IncorrectAnswer
)
from .utils import get_client_ip
from .permissions import IsAuthenticatedDeviceAllowed
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, LoginSerializer,
    SectionSerializer, SubjectSerializer, CategorySerializer, ChapterSerializer, LessonSerializer,
    QuestionSerializer, QuestionCreateUpdateSerializer,
    VideoSerializer, FileSerializer,
    StudentProgressSerializer, LessonProgressSerializer,
    QuizAttemptSerializer, QuizAttemptCreateSerializer, VideoWatchSerializer
)

DISABLED_SECTION_IDS = ['قسم_تحصيلي']
PUBLIC_FOUNDATION_SUBJECT_IDS = ['مادة_اللفظي', 'مادة_الكمي']


class IsAdminUser(permissions.BasePermission):
    """Permission class to check if user is admin"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class RegisterView(APIView):
    """User registration endpoint"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            ip = get_client_ip(request)
            if ip and user.role == 'student':
                user.registered_ip = ip
                user.save(update_fields=['registered_ip'])
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """User login endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username_or_email = serializer.validated_data['username']
            password = request.data.get('password')
            
            # Try to authenticate with username first
            user = authenticate(username=username_or_email, password=password)
            
            # If failed, try with email
            if not user and '@' in username_or_email:
                try:
                    user_obj = User.objects.get(email=username_or_email)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    user = None
            
            if user:
                if not user.is_active_account and user.role == 'student':
                    return Response(
                        {'error': 'Account is not active. Please contact administrator.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                if user.role == 'student' and not getattr(user, 'allow_multi_device', False):
                    reg = getattr(user, 'registered_ip', None) or ''
                    if reg.strip():
                        ip = get_client_ip(request) or ''
                        if ip.strip() != reg.strip():
                            return Response(
                                {
                                    'error': 'Access allowed only from your registered device. Contact administrator for multi-device access.',
                                    'code': 'device_restricted',
                                },
                                status=status.HTTP_403_FORBIDDEN
                            )
                token, created = Token.objects.get_or_create(user=user)
                login(request, user)
                return Response({
                    'token': token.key,
                    'user': UserSerializer(user).data
                })
            else:
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """User logout endpoint"""
    
    def post(self, request):
        try:
            request.user.auth_token.delete()
        except:
            pass
        logout(request)
        return Response({'message': 'Logged out successfully'})


class PublicFoundationView(APIView):
    """
    Public (no-auth) endpoint for free foundation content.
    Returns public videos & files for verbal/quantitative subjects.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        subject_id = request.query_params.get('subject_id')
        kind = (request.query_params.get('kind') or '').strip().lower()  # "video" | "file" | ""

        allowed_subjects = set(PUBLIC_FOUNDATION_SUBJECT_IDS)
        if subject_id and subject_id not in allowed_subjects:
            return Response({'videos': [], 'files': []})

        vqs = Video.objects.filter(is_public=True).exclude(section_id__in=DISABLED_SECTION_IDS)
        fqs = File.objects.filter(is_public=True).exclude(section_id__in=DISABLED_SECTION_IDS)

        # Only allow the two abilities subjects for public تأسيس
        vqs = vqs.filter(subject_id__in=PUBLIC_FOUNDATION_SUBJECT_IDS)
        fqs = fqs.filter(subject_id__in=PUBLIC_FOUNDATION_SUBJECT_IDS)

        if subject_id:
            vqs = vqs.filter(subject_id=subject_id)
            fqs = fqs.filter(subject_id=subject_id)

        vqs = vqs.order_by('order', '-created_at')
        fqs = fqs.order_by('order', '-created_at')

        videos = VideoSerializer(vqs, many=True, context={'request': request}).data
        files = FileSerializer(fqs, many=True, context={'request': request}).data

        if kind == 'video':
            return Response({'videos': videos, 'files': []})
        if kind == 'file':
            return Response({'videos': [], 'files': files})
        return Response({'videos': videos, 'files': files})


class UserViewSet(viewsets.ModelViewSet):
    """User management (admin only for list/update, users can view themselves)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['list', 'create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticatedDeviceAllowed()]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def set_avatar(self, request):
        """Set current user's avatar choice (student onboarding)."""
        choice = (request.data.get('avatar_choice') or '').strip()
        allowed = {'male_gulf', 'female_gulf'}
        if choice not in allowed:
            return Response({'error': 'Invalid avatar_choice'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.avatar_choice = choice
        user.save(update_fields=['avatar_choice'])
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def update_permissions(self, request, pk=None):
        """Update student permissions (admin only)"""
        user = self.get_object()
        if user.role != 'student':
            return Response({'error': 'Can only update permissions for students'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SectionViewSet(viewsets.ReadOnlyModelViewSet):
    """Sections viewset (read-only). List/retrieve public for visitors; rest unchanged."""
    queryset = Section.objects.prefetch_related('subjects__categories__chapters__items').all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAuthenticatedDeviceAllowed()]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.exclude(id__in=DISABLED_SECTION_IDS)


class SubjectViewSet(viewsets.ModelViewSet):
    """Subjects CRUD (admin for write)"""
    queryset = Subject.objects.prefetch_related('categories__chapters__items').all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAuthenticatedDeviceAllowed()]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.exclude(section_id__in=DISABLED_SECTION_IDS)

    def perform_create(self, serializer):
        id_val = self.request.data.get('id') or f"subject_{uuid.uuid4().hex[:12]}"
        serializer.save(id=id_val)


class CategoryViewSet(viewsets.ModelViewSet):
    """Categories CRUD (admin for write)"""
    queryset = Category.objects.prefetch_related('chapters__items').all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get_queryset(self):
        qs = super().get_queryset()
        sid = self.request.query_params.get('subject_id')
        if sid:
            qs = qs.filter(subject_id=sid)
        return qs.exclude(subject__section_id__in=DISABLED_SECTION_IDS)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAuthenticatedDeviceAllowed()]

    def perform_create(self, serializer):
        sub = serializer.validated_data.get('subject')
        pre = (sub.id if sub else 'cat')
        id_val = self.request.data.get('id') or f"{pre}_{uuid.uuid4().hex[:8]}"
        serializer.save(id=id_val)


class ChapterViewSet(viewsets.ModelViewSet):
    """Chapters CRUD (admin for write)"""
    queryset = Chapter.objects.prefetch_related('items').all()
    serializer_class = ChapterSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]
    lookup_field = 'id'
    lookup_url_kwarg = 'pk'

    def get_queryset(self):
        qs = super().get_queryset()
        cid = self.request.query_params.get('category_id')
        if cid:
            qs = qs.filter(category_id=cid)
        return qs.exclude(category__subject__section_id__in=DISABLED_SECTION_IDS)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAuthenticatedDeviceAllowed()]

    def perform_create(self, serializer):
        cat = serializer.validated_data.get('category')
        if not cat:
            raise ValueError("Category is required")

        # Generate ID in Arabic format: {categoryId}_فصل_{number}
        id_val = self.request.data.get('id')
        if not id_val:
            # Find the highest chapter number in this category
            existing_chapters = Chapter.objects.filter(category=cat)
            max_num = 0
            prefix = f"{cat.id}_فصل_"
            for ch in existing_chapters:
                # Extract number from IDs like "categoryId_فصل_1", "categoryId_فصل_2", etc.
                if ch.id.startswith(prefix):
                    try:
                        num_str = ch.id[len(prefix):]
                        num = int(num_str)
                        if num > max_num:
                            max_num = num
                    except (ValueError, IndexError):
                        pass
            next_num = max_num + 1
            id_val = f"{prefix}{next_num}"
        
        serializer.save(id=id_val)


class LessonViewSet(viewsets.ModelViewSet):
    """Lessons/Items CRUD (admin for write)"""
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]
    lookup_field = 'id'
    lookup_url_kwarg = 'pk'

    def get_queryset(self):
        qs = super().get_queryset()
        cid = self.request.query_params.get('chapter_id')
        if cid:
            qs = qs.filter(chapter_id=cid)
        return qs.exclude(chapter__category__subject__section_id__in=DISABLED_SECTION_IDS)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticatedDeviceAllowed()]

    def perform_create(self, serializer):
        ch = serializer.validated_data.get('chapter')
        if not ch:
            raise ValueError("Chapter is required")
        
        # Generate ID in Arabic format: {chapterId}_درس_{number}
        id_val = self.request.data.get('id')
        if not id_val:
            # Find the highest lesson number in this chapter
            existing_lessons = Lesson.objects.filter(chapter=ch)
            max_num = 0
            prefix = f"{ch.id}_درس_"
            for lesson in existing_lessons:
                # Extract number from IDs like "chapterId_درس_1", "chapterId_درس_2", etc.
                if lesson.id.startswith(prefix):
                    try:
                        num_str = lesson.id[len(prefix):]
                        num = int(num_str)
                        if num > max_num:
                            max_num = num
                    except (ValueError, IndexError):
                        pass
            next_num = max_num + 1
            id_val = f"{prefix}{next_num}"
        
        serializer.save(id=id_val)


class QuestionViewSet(viewsets.ModelViewSet):
    """Questions management"""
    queryset = Question.objects.select_related('lesson', 'chapter', 'category', 'subject', 'section', 'created_by').prefetch_related('answers').all()
    permission_classes = [IsAuthenticatedDeviceAllowed]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return QuestionCreateUpdateSerializer
        return QuestionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset().exclude(section_id__in=DISABLED_SECTION_IDS)
        # Filter by level (lesson ID)
        lesson_id = self.request.query_params.get('lesson_id', None)
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        
        # Filter by chapter
        chapter_id = self.request.query_params.get('chapter_id', None)
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        
        # Filter by category
        category_id = self.request.query_params.get('category_id', None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by subject
        subject_id = self.request.query_params.get('subject_id', None)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticatedDeviceAllowed()]
    
    def perform_create(self, serializer):
        qid = self.request.data.get('id') or f"q_{int(timezone.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        validated_data = serializer.validated_data.copy()
        answers_data = validated_data.pop('answers', [])
        
        # Create question with id
        question = Question.objects.create(
            id=qid,
            created_by=self.request.user,
            **validated_data
        )
        
        # Set related fields if lesson exists
        if question.lesson:
            question.chapter = question.lesson.chapter
            question.category = question.lesson.chapter.category
            question.subject = question.lesson.chapter.category.subject
            question.section = question.lesson.chapter.category.subject.section
            question.save()
        
        # Create answers
        for answer_data in answers_data:
            Answer.objects.create(question=question, **answer_data)
        
        # Update serializer instance for response
        serializer.instance = question


class VideoViewSet(viewsets.ModelViewSet):
    """Videos management"""
    queryset = Video.objects.select_related('lesson', 'chapter', 'category', 'subject', 'section', 'created_by').all()
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]
    
    def get_queryset(self):
        queryset = super().get_queryset().exclude(section_id__in=DISABLED_SECTION_IDS)
        lesson_id = self.request.query_params.get('lesson_id', None)
        chapter_id = self.request.query_params.get('chapter_id', None)
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticatedDeviceAllowed()]
    
    def perform_create(self, serializer):
        vid = self.request.data.get('id') or f"v_{uuid.uuid4().hex[:12]}"
        validated_data = serializer.validated_data.copy()
        
        # Create video with id
        video = Video.objects.create(
            id=vid,
            created_by=self.request.user,
            **validated_data
        )
        
        # Set related fields if lesson exists
        if video.lesson:
            video.chapter = video.lesson.chapter
            video.category = video.lesson.chapter.category
            video.subject = video.lesson.chapter.category.subject
            video.section = video.lesson.chapter.category.subject.section
            video.save()
        
        # Update serializer instance for response
        serializer.instance = video


class FileViewSet(viewsets.ModelViewSet):
    """Files management"""
    queryset = File.objects.select_related('lesson', 'chapter', 'category', 'subject', 'section', 'created_by').all()
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]
    
    def get_queryset(self):
        queryset = super().get_queryset().exclude(section_id__in=DISABLED_SECTION_IDS)
        lesson_id = self.request.query_params.get('lesson_id', None)
        chapter_id = self.request.query_params.get('chapter_id', None)
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticatedDeviceAllowed()]
    
    def perform_create(self, serializer):
        fid = self.request.data.get('id') or f"f_{uuid.uuid4().hex[:12]}"
        validated_data = serializer.validated_data.copy()
        
        # Create file with id
        file_obj = File.objects.create(
            id=fid,
            created_by=self.request.user,
            **validated_data
        )
        
        # Set related fields if lesson exists
        if file_obj.lesson:
            file_obj.chapter = file_obj.lesson.chapter
            file_obj.category = file_obj.lesson.chapter.category
            file_obj.subject = file_obj.lesson.chapter.category.subject
            file_obj.section = file_obj.lesson.chapter.category.subject.section
            file_obj.save()
        
        # Update serializer instance for response
        serializer.instance = file_obj

    @action(detail=True, methods=['get'], url_path='content')
    def content(self, request, pk=None):
        """Stream file content for embedding (e.g. PDF viewer). Auth required. Proxies Cloudinary with signed URLs."""
        import urllib.request
        f = self.get_object()
        if not f.file:
            return Response(status=status.HTTP_404_NOT_FOUND)

        ct = 'application/octet-stream'
        if (f.file_type or '').lower() == 'application/pdf':
            ct = 'application/pdf'
        elif (f.title or '').lower().endswith('.pdf'):
            ct = 'application/pdf'
        elif (f.file_type or '').lower() in ('application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'):
            ct = (f.file_type or '').lower()

        file_url = None
        is_cloudinary = False
        raw_url = getattr(f.file, 'url', None) or ''
        if isinstance(raw_url, str) and ('cloudinary.com' in raw_url or raw_url.startswith('http')):
            is_cloudinary = 'cloudinary.com' in raw_url
            file_url = raw_url

        if file_url and is_cloudinary:
            try:
                from django.conf import settings
                import cloudinary.utils
                creds = getattr(settings, 'CLOUDINARY_STORAGE', {}) or {}
                api_secret = creds.get('API_SECRET')
                if api_secret:
                    public_id = getattr(f.file, 'name', None) or ''
                    if not public_id:
                        return Response({'detail': 'File path not found.'}, status=status.HTTP_404_NOT_FOUND)
                    resource_type = 'image' if '/image/' in raw_url else ('raw' if '/raw/' in raw_url else 'image')
                    signed_url, _ = cloudinary.utils.cloudinary_url(
                        public_id,
                        resource_type=resource_type,
                        sign_url=True,
                        api_secret=api_secret,
                        cloud_name=creds.get('CLOUD_NAME'),
                        api_key=creds.get('API_KEY'),
                    )
                    if signed_url:
                        file_url = signed_url
            except Exception:
                pass

        if file_url and (file_url.startswith('http://') or file_url.startswith('https://')):
            try:
                req = urllib.request.Request(file_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = r.read()
            except Exception:
                return Response(
                    {'detail': 'Failed to fetch file from storage. File may be private - ensure CLOUDINARY credentials are set.'},
                    status=status.HTTP_502_BAD_GATEWAY
                )
        else:
            try:
                f.file.open('rb')
                data = f.file.read()
            finally:
                f.file.close()

        resp = HttpResponse(data, content_type=ct)
        resp['Content-Disposition'] = 'inline; filename="%s"' % (f.title or 'file')
        return resp


class StudentProgressViewSet(viewsets.ModelViewSet):
    """Student progress tracking"""
    serializer_class = StudentProgressSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]
    
    def get_queryset(self):
        # Students can only see their own progress
        if self.request.user.role == 'student':
            return StudentProgress.objects.filter(user=self.request.user).select_related('question', 'lesson')
        # Admins can see all progress
        return StudentProgress.objects.all().select_related('user', 'question', 'lesson')
    
    def perform_create(self, serializer):
        # Track answer submission
        question = serializer.validated_data['question']
        selected_answer = serializer.validated_data.get('selected_answer')
        
        # Check if answer is correct
        correct_answer = question.answers.filter(is_correct=True).first()
        is_correct = correct_answer and correct_answer.answer_id == selected_answer
        
        progress = serializer.save(
            user=self.request.user,
            is_correct=is_correct,
            answered_at=timezone.now()
        )
        
        # Update lesson progress
        if progress.lesson:
            lesson_progress, created = LessonProgress.objects.get_or_create(
                user=self.request.user,
                lesson=progress.lesson
            )
            lesson_progress.update_progress()


class LessonProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """Lesson progress tracking (read-only)"""
    serializer_class = LessonProgressSerializer
    permission_classes = [IsAuthenticatedDeviceAllowed]
    
    def get_queryset(self):
        # Students can only see their own progress
        if self.request.user.role == 'student':
            return LessonProgress.objects.filter(user=self.request.user).select_related('lesson', 'last_question')
        # Admins can see all progress
        return LessonProgress.objects.all().select_related('user', 'lesson', 'last_question')
    
    @action(detail=False, methods=['get'])
    def my_progress(self, request):
        """Get current user's progress for all lessons"""
        progress = LessonProgress.objects.filter(user=request.user).select_related('lesson', 'last_question')
        serializer = self.get_serializer(progress, many=True)
        return Response(serializer.data)


# ——— Tracker (QuizAttempt, VideoWatch, summaries) ———

class QuizAttemptViewSet(viewsets.ModelViewSet):
    """Quiz attempt tracking - students create & list own; admin lists all."""
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get_serializer_class(self):
        if self.action == 'create':
            return QuizAttemptCreateSerializer
        return QuizAttemptSerializer

    def get_queryset(self):
        qs = QuizAttempt.objects.select_related('user', 'lesson').order_by('-completed_at')
        if self.request.user.role == 'student':
            return qs.filter(user=self.request.user)
        # Admin sees all
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        lesson_id = self.request.query_params.get('lesson_id')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs.exclude(lesson__chapter__category__subject__section_id__in=DISABLED_SECTION_IDS)

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticatedDeviceAllowed()]


class VideoWatchViewSet(viewsets.GenericViewSet):
    """Video watch tracking - record watch (create or increment)."""
    permission_classes = [IsAuthenticatedDeviceAllowed]
    serializer_class = VideoWatchSerializer

    def get_queryset(self):
        qs = VideoWatch.objects.select_related('user', 'lesson', 'video').order_by('-last_watched_at')
        if self.request.user.role == 'student':
            return qs.filter(user=self.request.user)
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs.exclude(lesson__chapter__category__subject__section_id__in=DISABLED_SECTION_IDS)

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Record a video watch - create or increment watch_count."""
        lesson_id = request.data.get('lesson_id')
        video_id = request.data.get('video_id')
        if not lesson_id:
            return Response({'error': 'lesson_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)
        video = None
        if video_id:
            try:
                video = Video.objects.get(id=video_id, lesson=lesson)
            except Video.DoesNotExist:
                pass
        # For lessons with one video, try to get it if not provided
        if not video and lesson:
            v = Video.objects.filter(lesson=lesson).first()
            if v:
                video = v
        obj, created = VideoWatch.objects.get_or_create(
            user=request.user,
            lesson=lesson,
            video=video,
            defaults={'watch_count': 1}
        )
        if not created:
            obj.watch_count += 1
            obj.save(update_fields=['watch_count', 'last_watched_at'])
        serializer = self.get_serializer(obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class TrackerStudentSummaryView(APIView):
    """Student's own progress summary: exams (completed/not started), video watches."""
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get(self, request):
        from django.db.models import Max
        user = request.user
        # All lessons that have tests (from non-disabled sections)
        lessons_with_tests = Lesson.objects.filter(
            has_test=True
        ).exclude(
            chapter__category__subject__section_id__in=DISABLED_SECTION_IDS
        ).select_related('chapter', 'chapter__category', 'chapter__category__subject')
        # Get attempt counts and last attempt per lesson
        attempts = QuizAttempt.objects.filter(user=user).values('lesson_id').annotate(
            attempt_count=Count('id'),
            last_score=Max('score'),
            avg_duration=Avg('duration_seconds')
        )
        attempt_map = {a['lesson_id']: a for a in attempts}
        vw_agg = VideoWatch.objects.filter(user=user).values('lesson_id').annotate(
            total=Sum('watch_count')
        )
        vw_map = {v['lesson_id']: v['total'] for v in vw_agg}
        result = {
            'exam_progress': [],
            'video_watches': vw_map,
            'stats': {'total_exams': 0, 'completed': 0, 'not_started': 0}
        }
        for les in lessons_with_tests:
            info = attempt_map.get(les.id, {})
            count = info.get('attempt_count', 0)
            status = 'completed' if count > 0 else 'not_started'
            result['exam_progress'].append({
                'lesson_id': les.id,
                'lesson_name': les.name,
                'chapter_name': les.chapter.name if les.chapter else '',
                'category_name': les.chapter.category.name if les.chapter and les.chapter.category else '',
                'subject_name': les.chapter.category.subject.name if les.chapter and les.chapter.category and les.chapter.category.subject else '',
                'attempt_count': count,
                'last_score': info.get('last_score'),
                'avg_duration_seconds': info.get('avg_duration'),
                'status': status,
            })
            result['stats']['total_exams'] += 1
            if status == 'completed':
                result['stats']['completed'] += 1
            else:
                result['stats']['not_started'] += 1

        # Chart data: average by subject and category
        from collections import defaultdict
        by_subject = defaultdict(list)
        by_category = defaultdict(list)
        all_scores = []
        for ex in result['exam_progress']:
            if ex.get('attempt_count', 0) > 0 and ex.get('last_score') is not None:
                s = ex['last_score']
                all_scores.append(s)
                if ex.get('subject_name'):
                    by_subject[ex['subject_name']].append(s)
                if ex.get('category_name'):
                    by_category[ex['category_name']].append(s)
        result['chart_data'] = {
            'by_subject': [{'name': k, 'avg': round(sum(v) / len(v), 1)} for k, v in by_subject.items() if v],
            'by_category': [{'name': k, 'avg': round(sum(v) / len(v), 1)} for k, v in by_category.items() if v],
            'overall_avg': round(sum(all_scores) / len(all_scores), 1) if all_scores else 0,
        }
        # For performance page: progress by subject -> chapter (vertical bars)
        from collections import defaultdict
        subj_chapters = defaultdict(dict)  # subject_name -> { chapter_name: { completed, total, avg } }
        for ex in result['exam_progress']:
            subj = ex.get('subject_name') or 'أخرى'
            ch = ex.get('chapter_name') or 'غير محدد'
            if ch not in subj_chapters[subj]:
                subj_chapters[subj][ch] = {'completed': 0, 'total': 0, 'scores': []}
            subj_chapters[subj][ch]['total'] += 1
            if ex.get('status') == 'completed':
                subj_chapters[subj][ch]['completed'] += 1
                if ex.get('last_score') is not None:
                    subj_chapters[subj][ch]['scores'].append(ex['last_score'])
        perf = []
        for subj_name, chapters in subj_chapters.items():
            items = []
            for ch_name, data in chapters.items():
                total = data['total']
                completed = data['completed']
                scores = data['scores']
                pct = round((completed / total * 100)) if total > 0 else 0
                avg = round(sum(scores) / len(scores), 1) if scores else 0
                items.append({'name': ch_name, 'progress': pct, 'avg': avg})
            perf.append({'subject': subj_name, 'items': items})
        result['performance_by_subject'] = perf
        return Response(result)


class TrackerAdminSummaryView(APIView):
    """Admin overview: per-student stats, averages, video watch counts, incorrect answers."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Count, Avg
        from collections import defaultdict
        students = User.objects.filter(role='student', is_active=True)
        result = []
        for s in students:
            attempts = QuizAttempt.objects.filter(user=s).aggregate(
                total_attempts=Count('id'),
                avg_score=Avg('score'),
                avg_duration=Avg('duration_seconds')
            )
            total_video_watches = VideoWatch.objects.filter(user=s).aggregate(
                t=Sum('watch_count')
            ).get('t') or 0
            incorrect_count = IncorrectAnswer.objects.filter(user=s).count()
            result.append({
                'user_id': s.id,
                'username': s.username,
                'first_name': s.first_name or s.username,
                'total_exam_attempts': attempts['total_attempts'] or 0,
                'avg_exam_score': round(attempts['avg_score'] or 0, 1),
                'avg_exam_duration_seconds': round(attempts['avg_duration'] or 0),
                'total_video_watches': total_video_watches,
                'incorrect_answers_count': incorrect_count,
            })
        return Response({
            'students': result,
            'total_incorrect_answers': sum(r['incorrect_answers_count'] for r in result),
        })


class TrackerAdminStudentDetailView(APIView):
    """Admin: detailed progress for a specific student - per lesson/bank."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            student = User.objects.get(id=user_id, role='student')
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        lessons = Lesson.objects.exclude(
            chapter__category__subject__section_id__in=DISABLED_SECTION_IDS
        ).select_related('chapter', 'chapter__category', 'chapter__category__subject')

        attempts = QuizAttempt.objects.filter(user=student).values('lesson_id').annotate(
            attempt_count=Count('id'),
            last_score=Max('score'),
            avg_duration=Avg('duration_seconds')
        )
        attempt_map = {a['lesson_id']: a for a in attempts}

        vw_agg = VideoWatch.objects.filter(user=student).values('lesson_id').annotate(
            total=Sum('watch_count')
        )
        vw_map = {v['lesson_id']: v['total'] for v in vw_agg}

        items = []
        for les in lessons:
            info = attempt_map.get(les.id, {})
            ch = les.chapter
            cat = ch.category if ch else None
            subj = cat.subject if cat else None
            cat_name = cat.name if cat else ''
            is_bank = 'تجميع' in (cat_name or '')
            items.append({
                'lesson_id': les.id,
                'lesson_name': les.name,
                'chapter_id': ch.id if ch else None,
                'chapter_name': ch.name if ch else '',
                'category_id': cat.id if cat else None,
                'category_name': cat_name,
                'subject_id': subj.id if subj else None,
                'subject_name': subj.name if subj else '',
                'is_bank': is_bank,
                'attempt_count': info.get('attempt_count', 0),
                'last_score': info.get('last_score'),
                'avg_duration_seconds': info.get('avg_duration'),
                'video_watch_count': vw_map.get(les.id, 0),
            })

        # Compute chart data: average by subject and by category
        from collections import defaultdict
        by_subject = defaultdict(list)
        by_category = defaultdict(list)
        all_scores = []
        for it in items:
            if it.get('attempt_count', 0) > 0 and it.get('last_score') is not None:
                s = it['last_score']
                all_scores.append(s)
                if it.get('subject_name'):
                    by_subject[it['subject_name']].append(s)
                if it.get('category_name'):
                    by_category[it['category_name']].append(s)

        chart_by_subject = [{'name': k, 'avg': round(sum(v) / len(v), 1)} for k, v in by_subject.items() if v]
        chart_by_category = [{'name': k, 'avg': round(sum(v) / len(v), 1)} for k, v in by_category.items() if v]
        overall_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0

        # performance_by_subject: progress per chapter for this student (لفظي/كمي)
        subj_chapters = defaultdict(lambda: defaultdict(lambda: {'completed': 0, 'total': 0, 'scores': []}))
        for it in items:
            subj = it.get('subject_name') or 'أخرى'
            ch = it.get('chapter_name') or 'غير محدد'
            subj_chapters[subj][ch]['total'] += 1
            if it.get('attempt_count', 0) > 0:
                subj_chapters[subj][ch]['completed'] += 1
                if it.get('last_score') is not None:
                    subj_chapters[subj][ch]['scores'].append(it['last_score'])
        perf = []
        for subj_name, chapters in subj_chapters.items():
            perf_items = []
            for ch_name, data in chapters.items():
                total = data['total']
                completed = data['completed']
                scores = data['scores']
                pct = round((completed / total * 100)) if total > 0 else 0
                avg = round(sum(scores) / len(scores), 1) if scores else 0
                perf_items.append({'name': ch_name, 'progress': pct, 'avg': avg})
            perf.append({'subject': subj_name, 'items': perf_items})

        return Response({
            'student': {
                'user_id': student.id,
                'username': student.username,
                'first_name': student.first_name or student.username,
            },
            'items': items,
            'chart_data': {
                'by_subject': chart_by_subject,
                'by_category': chart_by_category,
                'overall_avg': overall_avg,
            },
            'performance_by_subject': perf,
        })


class IncorrectAnswerListCreateView(APIView):
    """List or batch-add incorrect answers for current user."""
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get(self, request):
        items = IncorrectAnswer.objects.filter(user=request.user).select_related('lesson').order_by('-created_at')
        out = []
        for ia in items:
            out.append({
                'id': ia.id,
                'question_id': ia.question_id,
                'lesson_id': ia.lesson_id,
                'lesson_name': ia.lesson_name,
                'category_name': ia.category_name,
                'subject_name': ia.subject_name,
                'question_snapshot': ia.question_snapshot,
                'user_answer_id': ia.user_answer_id,
                'correct_answer_id': ia.correct_answer_id,
                'created_at': ia.created_at.isoformat() if ia.created_at else None,
            })
        return Response(out)

    def post(self, request):
        items = request.data if isinstance(request.data, list) else request.data.get('items', [])
        if not items:
            return Response({'detail': 'لا توجد عناصر'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        created = 0
        for item in items:
            qid = str(item.get('question_id', '')).strip()
            if not qid:
                continue
            lesson_id = item.get('lesson_id')
            lesson_name = item.get('lesson_name', '')[:200]
            category_name = item.get('category_name', '')[:200]
            subject_name = item.get('subject_name', '')[:200]
            if lesson_id and (not lesson_name or not category_name or not subject_name):
                try:
                    les = Lesson.objects.select_related('chapter', 'chapter__category', 'chapter__category__subject').get(pk=lesson_id)
                    if not lesson_name:
                        lesson_name = les.name or ''
                    if not category_name and les.chapter and les.chapter.category:
                        category_name = les.chapter.category.name or ''
                    if not subject_name and les.chapter and les.chapter.category and les.chapter.category.subject:
                        subject_name = les.chapter.category.subject.name or ''
                except Lesson.DoesNotExist:
                    pass
            IncorrectAnswer.objects.update_or_create(
                user=user,
                question_id=qid,
                defaults={
                    'lesson_id': lesson_id,
                    'lesson_name': lesson_name[:200],
                    'category_name': category_name[:200],
                    'subject_name': subject_name[:200],
                    'question_snapshot': item.get('question_snapshot', {}),
                    'user_answer_id': str(item.get('user_answer_id', ''))[:10],
                    'correct_answer_id': str(item.get('correct_answer_id', ''))[:10],
                }
            )
            created += 1
        return Response({'created': created})


class IncorrectAnswerDetailView(APIView):
    """Delete single incorrect answer (e.g. when answered correctly in review)."""
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def delete(self, request, question_id):
        deleted, _ = IncorrectAnswer.objects.filter(
            user=request.user, question_id=question_id
        ).delete()
        return Response({'deleted': deleted > 0}, status=status.HTTP_200_OK)


class AdminIncorrectAnswersView(APIView):
    """Admin: list incorrect answers for a student, optionally filtered by lesson_id."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        user_id = request.query_params.get('user_id')
        lesson_id = request.query_params.get('lesson_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        qs = IncorrectAnswer.objects.filter(user_id=user_id).select_related('lesson').order_by('-created_at')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        out = []
        for ia in qs:
            out.append({
                'id': ia.id,
                'question_id': ia.question_id,
                'lesson_id': ia.lesson_id,
                'lesson_name': ia.lesson_name,
                'category_name': ia.category_name,
                'subject_name': ia.subject_name,
                'question_snapshot': ia.question_snapshot,
                'user_answer_id': ia.user_answer_id,
                'correct_answer_id': ia.correct_answer_id,
                'created_at': ia.created_at.isoformat() if ia.created_at else None,
            })
        return Response(out)

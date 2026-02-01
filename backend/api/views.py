import uuid
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q, Count, Avg
from django.http import HttpResponse
from django.utils import timezone

from .models import (
    User, Section, Subject, Category, Chapter, Lesson,
    Question, Answer, Video, File, StudentProgress, LessonProgress
)
from .utils import get_client_ip
from .permissions import IsAuthenticatedDeviceAllowed
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, LoginSerializer,
    SectionSerializer, SubjectSerializer, CategorySerializer, ChapterSerializer, LessonSerializer,
    QuestionSerializer, QuestionCreateUpdateSerializer,
    VideoSerializer, FileSerializer,
    StudentProgressSerializer, LessonProgressSerializer
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
                import cloudinary
                import cloudinary.utils
                public_id = getattr(f.file, 'name', None) or ''
                if not public_id:
                    return Response({'detail': 'File path not found.'}, status=status.HTTP_404_NOT_FOUND)
                resource_type = 'image' if '/image/' in raw_url else ('raw' if '/raw/' in raw_url else 'image')
                signed_url, _ = cloudinary.utils.cloudinary_url(public_id, resource_type=resource_type, sign_url=True)
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

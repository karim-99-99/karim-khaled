from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q, Count, Avg
from django.utils import timezone

from .models import (
    User, Section, Subject, Category, Chapter, Lesson,
    Question, Answer, Video, File, StudentProgress, LessonProgress
)
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, LoginSerializer,
    SectionSerializer, SubjectSerializer, CategorySerializer, ChapterSerializer, LessonSerializer,
    QuestionSerializer, QuestionCreateUpdateSerializer,
    VideoSerializer, FileSerializer,
    StudentProgressSerializer, LessonProgressSerializer
)


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
            username = serializer.validated_data['username']
            password = request.data.get('password')
            user = authenticate(username=username, password=password)
            
            if user:
                if not user.is_active_account and user.role == 'student':
                    return Response(
                        {'error': 'Account is not active. Please contact administrator.'},
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


class UserViewSet(viewsets.ModelViewSet):
    """User management (admin only for list/update, users can view themselves)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
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
    """Sections viewset (read-only for all authenticated users)"""
    queryset = Section.objects.prefetch_related('subjects__categories__chapters__items').all()
    serializer_class = SectionSerializer
    permission_classes = [permissions.IsAuthenticated]


class QuestionViewSet(viewsets.ModelViewSet):
    """Questions management"""
    queryset = Question.objects.select_related('lesson', 'chapter', 'category', 'subject', 'section', 'created_by').prefetch_related('answers').all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return QuestionCreateUpdateSerializer
        return QuestionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
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
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        # Set references based on lesson
        instance = serializer.save(created_by=self.request.user)
        if instance.lesson:
            instance.chapter = instance.lesson.chapter
            instance.category = instance.lesson.chapter.category
            instance.subject = instance.lesson.chapter.category.subject
            instance.section = instance.lesson.chapter.category.subject.section
            instance.save()


class VideoViewSet(viewsets.ModelViewSet):
    """Videos management"""
    queryset = Video.objects.select_related('lesson', 'chapter', 'category', 'subject', 'section', 'created_by').all()
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        lesson_id = self.request.query_params.get('lesson_id', None)
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        if instance.lesson:
            instance.chapter = instance.lesson.chapter
            instance.category = instance.lesson.chapter.category
            instance.subject = instance.lesson.chapter.category.subject
            instance.section = instance.lesson.chapter.category.subject.section
            instance.save()


class FileViewSet(viewsets.ModelViewSet):
    """Files management"""
    queryset = File.objects.select_related('lesson', 'chapter', 'category', 'subject', 'section', 'created_by').all()
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        lesson_id = self.request.query_params.get('lesson_id', None)
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        if instance.lesson:
            instance.chapter = instance.lesson.chapter
            instance.category = instance.lesson.chapter.category
            instance.subject = instance.lesson.chapter.category.subject
            instance.section = instance.lesson.chapter.category.subject.section
            instance.save()


class StudentProgressViewSet(viewsets.ModelViewSet):
    """Student progress tracking"""
    serializer_class = StudentProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
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
    permission_classes = [permissions.IsAuthenticated]
    
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

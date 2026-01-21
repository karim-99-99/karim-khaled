from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'sections', views.SectionViewSet, basename='section')
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'chapters', views.ChapterViewSet, basename='chapter')
router.register(r'lessons', views.LessonViewSet, basename='lesson')
router.register(r'questions', views.QuestionViewSet, basename='question')
router.register(r'videos', views.VideoViewSet, basename='video')
router.register(r'files', views.FileViewSet, basename='file')
router.register(r'progress', views.StudentProgressViewSet, basename='progress')
router.register(r'lesson-progress', views.LessonProgressViewSet, basename='lesson-progress')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
]

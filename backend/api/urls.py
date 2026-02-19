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
router.register(r'tracker/quiz-attempts', views.QuizAttemptViewSet, basename='quiz-attempt')
router.register(r'tracker/video-watches', views.VideoWatchViewSet, basename='video-watch')
router.register(r'student-groups', views.StudentGroupViewSet, basename='student-group')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('public/foundation/', views.PublicFoundationView.as_view(), name='public-foundation'),
    path('tracker/student-summary/', views.TrackerStudentSummaryView.as_view(), name='tracker-student-summary'),
    path('tracker/admin-summary/', views.TrackerAdminSummaryView.as_view(), name='tracker-admin-summary'),
    path('tracker/admin-student-detail/', views.TrackerAdminStudentDetailView.as_view(), name='tracker-admin-student-detail'),
    path('tracker/incorrect-answers/', views.IncorrectAnswerListCreateView.as_view(), name='incorrect-answers-list'),
    path('tracker/incorrect-answers/<str:question_id>/', views.IncorrectAnswerDetailView.as_view(), name='incorrect-answers-detail'),
    path('tracker/admin-incorrect-answers/', views.AdminIncorrectAnswersView.as_view(), name='tracker-admin-incorrect-answers'),
    path('tracker/by-lesson/', views.TrackerByLessonView.as_view(), name='tracker-by-lesson'),
]

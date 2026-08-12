from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import tiger_test_views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'sections', views.SectionViewSet, basename='section')
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'chapters', views.ChapterViewSet, basename='chapter')
router.register(r'lessons', views.LessonViewSet, basename='lesson')
router.register(r'questions', views.QuestionViewSet, basename='question')
router.register(r'videos', views.VideoViewSet, basename='video')
router.register(r'bunny-libraries', views.BunnyStreamLibraryViewSet, basename='bunny-library')
router.register(r'files', views.FileViewSet, basename='file')
router.register(r'progress', views.StudentProgressViewSet, basename='progress')
router.register(r'lesson-progress', views.LessonProgressViewSet, basename='lesson-progress')
router.register(r'tracker/quiz-attempts', views.QuizAttemptViewSet, basename='quiz-attempt')
router.register(r'tracker/video-watches', views.VideoWatchViewSet, basename='video-watch')
router.register(r'student-groups', views.StudentGroupViewSet, basename='student-group')

urlpatterns = [
    # Must be before router.urls: otherwise videos/<pk>/ catches "bunny-signed-url" → 404
    path('videos/bunny-signed-url/', views.BunnySignedUrlView.as_view(), name='bunny-signed-url'),
    path('videos/abuse-detector/', views.VideoAbuseDetectorView.as_view(), name='video-abuse-detector'),
    # Password endpoints before router so they never 404 behind users/<pk>/
    path('users/change-password/', views.ChangePasswordView.as_view(), name='user-change-password'),
    path('users/<int:user_id>/reset-password/', views.AdminResetPasswordView.as_view(), name='user-reset-password'),
    path('', include(router.urls)),
    path('health/', views.HealthView.as_view(), name='health'),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/telegram/', views.TelegramAuthView.as_view(), name='auth-telegram'),
    path('auth/telegram/config/', views.TelegramConfigView.as_view(), name='auth-telegram-config'),
    path('export-db/', views.ExportDbView.as_view(), name='export-db'),
    path('public/foundation/', views.PublicFoundationView.as_view(), name='public-foundation'),
    path('tracker/student-summary/', views.TrackerStudentSummaryView.as_view(), name='tracker-student-summary'),
    path('tracker/record-lesson-answers/', views.RecordLessonQuizAnswersView.as_view(), name='tracker-record-lesson-answers'),
    path('tracker/student-results/', views.TrackerStudentResultsView.as_view(), name='tracker-student-results'),
    path('tracker/admin-summary/', views.TrackerAdminSummaryView.as_view(), name='tracker-admin-summary'),
    path('tracker/admin-student-detail/', views.TrackerAdminStudentDetailView.as_view(), name='tracker-admin-student-detail'),
    path('tracker/incorrect-answers/', views.IncorrectAnswerListCreateView.as_view(), name='incorrect-answers-list'),
    path('tracker/incorrect-answers/<str:question_id>/', views.IncorrectAnswerDetailView.as_view(), name='incorrect-answers-detail'),
    path('tracker/admin-incorrect-answers/', views.AdminIncorrectAnswersView.as_view(), name='tracker-admin-incorrect-answers'),
    path('tracker/by-lesson/', views.TrackerByLessonView.as_view(), name='tracker-by-lesson'),
    path('tiger-test/active/', tiger_test_views.TigerTestActiveView.as_view(), name='tiger-test-active'),
    path('tiger-test/start/', tiger_test_views.TigerTestStartView.as_view(), name='tiger-test-start'),
    path('tiger-test/abandon/', tiger_test_views.TigerTestAbandonView.as_view(), name='tiger-test-abandon'),
    path('tiger-test/<uuid:session_id>/', tiger_test_views.TigerTestSessionView.as_view(), name='tiger-test-session'),
    path('tiger-test/<uuid:session_id>/answer/', tiger_test_views.TigerTestAnswerView.as_view(), name='tiger-test-answer'),
    path('tiger-test/<uuid:session_id>/end-section/', tiger_test_views.TigerTestEndSectionView.as_view(), name='tiger-test-end-section'),
    path('tiger-test/<uuid:session_id>/next-section/', tiger_test_views.TigerTestNextSectionView.as_view(), name='tiger-test-next-section'),
    path('tiger-test/<uuid:session_id>/results/', tiger_test_views.TigerTestResultsView.as_view(), name='tiger-test-results'),
]

import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  initializeDefaultData,
  getCurrentUser,
  setCurrentUser,
} from "./services/storageService.js";
import * as backendApi from "./services/backendApi";
import { scheduleIdlePrefetch } from "./utils/routePrefetch.js";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import AvatarOnboarding from "./components/AvatarOnboarding.jsx";
import BottomNav from "./components/BottomNav.jsx";

// Eager load only critical pages
import SinglePage from "./pages/SinglePage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
// /courses is the main learning hub — eager load avoids chunk wait on first open
import Home from "./pages/Home.jsx";

// Lazy load other pages (prefetched via routePrefetch + link hover)
const Subjects = lazy(() => import("./pages/Subjects.jsx"));
const Categories = lazy(() => import("./pages/Categories.jsx"));
const Chapters = lazy(() => import("./pages/Chapters.jsx"));
const Levels = lazy(() => import("./pages/Levels.jsx"));
const Quiz = lazy(() => import("./pages/Quiz.jsx"));
const Result = lazy(() => import("./pages/Result.jsx"));
const Video = lazy(() => import("./pages/Video.jsx"));
const FileViewer = lazy(() => import("./pages/FileViewer.jsx"));
const TestMathType = lazy(() => import("./pages/TestMathType.jsx"));
const Foundation = lazy(() => import("./pages/Foundation.jsx"));

// Lazy load admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const Questions = lazy(() => import("./pages/admin/Questions.jsx"));
const Videos = lazy(() => import("./pages/admin/Videos.jsx"));
const ChaptersManagement = lazy(() =>
  import("./pages/admin/ChaptersManagement.jsx")
);
const LessonsManagement = lazy(() =>
  import("./pages/admin/LessonsManagement.jsx")
);
const ClassroomsManagement = lazy(() =>
  import("./pages/admin/ClassroomsManagement.jsx")
);
const FilesManagement = lazy(() => import("./pages/admin/FilesManagement.jsx"));
const StudentTracker = lazy(() => import("./pages/StudentTracker.jsx"));
const IncorrectAnswers = lazy(() => import("./pages/IncorrectAnswers.jsx"));
const AdminTracker = lazy(() => import("./pages/admin/AdminTracker.jsx"));
const AdminQuizReview = lazy(() =>
  import("./pages/admin/AdminQuizReview.jsx")
);

// Light Suspense fallback: thin bar + short text (chunks often already prefetched)
const LoadingFallback = () => (
  <>
    <div className="route-loading-bar-track" aria-hidden>
      <div className="route-loading-bar-fill" />
    </div>
    <div className="min-h-[40vh] flex items-start justify-center pt-24 px-4 bg-gray-50/90">
      <p className="text-sm text-gray-500" aria-live="polite">
        جاري التحميل…
      </p>
    </div>
  </>
);

function App() {
  useEffect(() => {
    initializeDefaultData();
    scheduleIdlePrefetch();
    // Wake backend early (Render cold start) so later navigations feel faster
    if (import.meta.env.VITE_API_URL) backendApi.pingHealth();
    // Defer getMe slightly so first paint / route chunks are not competing on the main thread
    const u = getCurrentUser();
    if (u?.token && import.meta.env.VITE_API_URL) {
      const runGetMe = () => {
        backendApi
          .getMe()
          .then((me) => {
            if (me) setCurrentUser({ ...me, token: u.token });
          })
          .catch(() => {});
      };
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => runGetMe(), { timeout: 4000 });
      } else {
        setTimeout(runGetMe, 200);
      }
    }
  }, []);

  return (
    <AppErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="App" dir="rtl">
          <AvatarOnboarding />
          <main className="min-h-screen">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<SinglePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected student routes */}
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />

                {/* Public browsing routes - accessible without login */}
                {/* Unified courses page - accessible without authentication */}
                <Route path="/courses" element={<Home />} />
                <Route path="/foundation" element={<Foundation />} />

                {/* Subjects page - shows materials (رياضيات, فيزياء, etc.) - public */}
                <Route
                  path="/section/:sectionId/subjects"
                  element={<Subjects />}
                />

                {/* Categories page - shows التأسيس and التجميعات - public */}
                <Route
                  path="/section/:sectionId/subject/:subjectId/categories"
                  element={<Categories />}
                />

                {/* Chapters page - shows فصول after selecting category - public */}
                <Route
                  path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapters"
                  element={<Chapters />}
                />

                {/* Levels/Items page - shows دروس after selecting chapter - public */}
                <Route
                  path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/items"
                  element={<Levels />}
                />

                {/* Video page - watch video for a lesson */}
                <Route
                  path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/item/:itemId/video"
                  element={
                    <ProtectedRoute>
                      <Video />
                    </ProtectedRoute>
                  }
                />

                {/* File viewer page - view file attachment for a lesson */}
                <Route
                  path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/item/:itemId/file"
                  element={
                    <ProtectedRoute>
                      <FileViewer />
                    </ProtectedRoute>
                  }
                />

                {/* Quiz page - take quiz for a lesson */}
                <Route
                  path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/item/:itemId/quiz"
                  element={
                    <ProtectedRoute>
                      <Quiz />
                    </ProtectedRoute>
                  }
                />

                {/* Result page - shows quiz result */}
                <Route
                  path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/item/:itemId/result"
                  element={
                    <ProtectedRoute>
                      <Result />
                    </ProtectedRoute>
                  }
                />

                {/* Legacy routes for backward compatibility */}
                <Route
                  path="/subject/:subjectId/categories"
                  element={
                    <ProtectedRoute>
                      <Categories />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/category/:categoryId/chapters"
                  element={
                    <ProtectedRoute>
                      <Chapters />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chapter/:chapterId/levels"
                  element={
                    <ProtectedRoute>
                      <Levels />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/level/:levelId/quiz"
                  element={
                    <ProtectedRoute>
                      <Quiz />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quiz/:quizId/result"
                  element={
                    <ProtectedRoute>
                      <Result />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/video/:videoId"
                  element={
                    <ProtectedRoute>
                      <Video />
                    </ProtectedRoute>
                  }
                />

                {/* Protected admin routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "content_admin"]}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin courses page - same as /courses */}
                <Route
                  path="/admin/courses"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "content_admin"]}>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/questions"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "content_admin"]}>
                      <Questions />
                    </ProtectedRoute>
                  }
                />
                <Route path="/test-mathtype" element={<TestMathType />} />
                <Route
                  path="/admin/videos"
                  element={
                    <ProtectedRoute
                      allowedRoles={["admin", "content_admin"]}
                      checkActive={false}
                    >
                      <Videos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/chapters"
                  element={
                    <ProtectedRoute
                      allowedRoles={["admin", "content_admin"]}
                      checkActive={false}
                    >
                      <ChaptersManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/lessons"
                  element={
                    <ProtectedRoute
                      allowedRoles={["admin", "content_admin"]}
                      checkActive={false}
                    >
                      <LessonsManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/classrooms"
                  element={
                    <ProtectedRoute requiredRole="admin" checkActive={false}>
                      <ClassroomsManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/files"
                  element={
                    <ProtectedRoute
                      allowedRoles={["admin", "content_admin"]}
                      checkActive={false}
                    >
                      <FilesManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRole="admin" checkActive={false}>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/tracker"
                  element={
                    <ProtectedRoute requiredRole="admin" checkActive={false}>
                      <AdminTracker />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/tracker/student/:userId/lesson/:lessonId/review"
                  element={
                    <ProtectedRoute requiredRole="admin" checkActive={false}>
                      <AdminQuizReview />
                    </ProtectedRoute>
                  }
                />

                {/* Student tracker - accessible when logged in */}
                <Route
                  path="/tracker"
                  element={
                    <ProtectedRoute>
                      <StudentTracker />
                    </ProtectedRoute>
                  }
                />
                {/* Incorrect answers review */}
                <Route
                  path="/incorrect-answers"
                  element={
                    <ProtectedRoute>
                      <IncorrectAnswers />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            {/* Spacer so content can scroll above fixed bottom nav; does not reduce content area */}
            <div className="xl:hidden h-16 flex-shrink-0" aria-hidden="true" />
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;

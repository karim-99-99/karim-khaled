import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  initializeDefaultData,
  getCurrentUser,
  setCurrentUser,
} from "./services/storageService.js";
import * as backendApi from "./services/backendApi";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import AvatarOnboarding from "./components/AvatarOnboarding.jsx";
import BottomNav from "./components/BottomNav.jsx";

// Eager load only critical pages
import SinglePage from "./pages/SinglePage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

// Lazy load all other pages for better performance
const Home = lazy(() => import("./pages/Home.jsx"));
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
const ChaptersManagement = lazy(
  () => import("./pages/admin/ChaptersManagement.jsx"),
);
const LessonsManagement = lazy(
  () => import("./pages/admin/LessonsManagement.jsx"),
);
const ClassroomsManagement = lazy(
  () => import("./pages/admin/ClassroomsManagement.jsx"),
);
const FilesManagement = lazy(() => import("./pages/admin/FilesManagement.jsx"));
const StudentTracker = lazy(() => import("./pages/StudentTracker.jsx"));
const AdminTracker = lazy(() => import("./pages/admin/AdminTracker.jsx"));

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p className="text-dark-600 font-medium">جاري التحميل...</p>
    </div>
  </div>
);

function App() {
  useEffect(() => {
    initializeDefaultData();
    // Refresh current user from API when using backend (so admin permission updates apply without re-login)
    const u = getCurrentUser();
    if (u?.token && import.meta.env.VITE_API_URL) {
      backendApi
        .getMe()
        .then((me) => {
          if (me) setCurrentUser({ ...me, token: u.token });
        })
        .catch(() => {});
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
          <main className="pb-20 lg:pb-0">
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
                    <ProtectedRoute requiredRole="admin">
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin courses page - same as /courses */}
                <Route
                  path="/admin/courses"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/questions"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Questions />
                    </ProtectedRoute>
                  }
                />
                <Route path="/test-mathtype" element={<TestMathType />} />
                <Route
                  path="/admin/videos"
                  element={
                    <ProtectedRoute requiredRole="admin" checkActive={false}>
                      <Videos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/chapters"
                  element={
                    <ProtectedRoute requiredRole="admin" checkActive={false}>
                      <ChaptersManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/lessons"
                  element={
                    <ProtectedRoute requiredRole="admin" checkActive={false}>
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
                    <ProtectedRoute requiredRole="admin" checkActive={false}>
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

                {/* Student tracker - accessible when logged in */}
                <Route
                  path="/tracker"
                  element={
                    <ProtectedRoute>
                      <StudentTracker />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;

import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { initializeDefaultData, getCurrentUser } from './services/storageService';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import CoursesPage from './pages/CoursesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

// Student Pages
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import Categories from './pages/Categories';
import Chapters from './pages/Chapters';
import Levels from './pages/Levels';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Video from './pages/Video';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminQuestions from './pages/admin/Questions';
import AdminVideos from './pages/admin/Videos';

function App() {
  useEffect(() => {
    // Initialize default data on app load
    initializeDefaultData();
  }, []);

  return (
    <div className="App" dir="rtl">
      <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Student Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/section/:sectionId/subjects"
            element={
              <ProtectedRoute>
                <Subjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/section/:sectionId/subject/:subjectId/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapters"
            element={
              <ProtectedRoute>
                <Chapters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/items"
            element={
              <ProtectedRoute>
                <Levels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/item/:itemId/quiz"
            element={
              <ProtectedRoute>
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/item/:itemId/result"
            element={
              <ProtectedRoute>
                <Result />
              </ProtectedRoute>
            }
          />
          <Route
            path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/item/:itemId/video"
            element={
              <ProtectedRoute>
                <Video />
              </ProtectedRoute>
            }
          />
          {/* Legacy routes for backward compatibility */}
          <Route
            path="/subject/:subjectId/chapters"
            element={
              <ProtectedRoute>
                <Chapters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject/:subjectId/chapter/:chapterId/levels"
            element={
              <ProtectedRoute>
                <Levels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject/:subjectId/chapter/:chapterId/level/:levelId/quiz"
            element={
              <ProtectedRoute>
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject/:subjectId/chapter/:chapterId/level/:levelId/result"
            element={
              <ProtectedRoute>
                <Result />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/videos"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminVideos />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </div>
  );
}

export default App;

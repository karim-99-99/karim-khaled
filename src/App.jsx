import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { initializeDefaultData, getCurrentUser } from './services/storageService';
import ProtectedRoute from './components/ProtectedRoute';

// Student Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Chapters from './pages/Chapters';
import Levels from './pages/Levels';
import Quiz from './pages/Quiz';
import Result from './pages/Result';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminQuestions from './pages/admin/Questions';
import AdminVideos from './pages/admin/Videos';

function RootRedirect() {
  const currentUser = getCurrentUser();
  
  if (currentUser) {
    return currentUser.role === 'admin' ? (
      <Navigate to="/admin/dashboard" replace />
    ) : (
      <Navigate to="/home" replace />
    );
  }
  
  return <Navigate to="/login" replace />;
}

function App() {
  useEffect(() => {
    // Initialize default data on app load
    initializeDefaultData();
  }, []);

  return (
    <div className="App" dir="rtl">
      <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

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

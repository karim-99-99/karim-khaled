import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeDefaultData } from './services/storageService';
import SinglePage from './pages/SinglePage';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Subjects from './pages/Subjects';
import Categories from './pages/Categories';
import Chapters from './pages/Chapters';
import Levels from './pages/Levels';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Video from './pages/Video';
import Questions from './pages/admin/Questions';
import Videos from './pages/admin/Videos';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  useEffect(() => {
    // Initialize default data on app load
    initializeDefaultData();
  }, []);

  return (
    <BrowserRouter>
      <div className="App" dir="rtl">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<SinglePage />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected student routes */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          
          {/* Unified courses page - accessible by both admin and student */}
          <Route 
            path="/courses" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          {/* Subjects page - shows materials (رياضيات, فيزياء, etc.) */}
          <Route 
            path="/section/:sectionId/subjects" 
            element={
              <ProtectedRoute>
                <Subjects />
              </ProtectedRoute>
            } 
          />
          
          {/* Categories page - shows التأسيس and التجميعات */}
          <Route 
            path="/section/:sectionId/subject/:subjectId/categories" 
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            } 
          />
          
          {/* Chapters page - shows فصول after selecting category */}
          <Route 
            path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapters" 
            element={
              <ProtectedRoute>
                <Chapters />
              </ProtectedRoute>
            } 
          />
          
          {/* Levels/Items page - shows دروس after selecting chapter */}
          <Route 
            path="/section/:sectionId/subject/:subjectId/category/:categoryId/chapter/:chapterId/items" 
            element={
              <ProtectedRoute>
                <Levels />
              </ProtectedRoute>
            } 
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
          <Route 
            path="/admin/videos" 
            element={
              <ProtectedRoute requiredRole="admin">
                <Videos />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

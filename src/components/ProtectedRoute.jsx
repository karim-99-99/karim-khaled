import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../services/storageService';

const ProtectedRoute = ({ children, requiredRole = null, checkActive = true }) => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check if account is active (except for admin routes)
  if (checkActive && currentUser.role === 'student' && currentUser.isActive !== true) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-dark-600 mb-4">الحساب غير مفعّل</h2>
          <p className="text-dark-600 mb-6">
            حسابك غير مفعّل حالياً. يرجى التواصل مع المدير لتفعيل حسابك.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;




















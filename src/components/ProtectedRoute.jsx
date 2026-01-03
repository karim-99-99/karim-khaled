import { Navigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../services/storageService';

// Helper function to check if user has access to a section
export const hasSectionAccess = (user, sectionId) => {
  if (!user || user.role === 'admin') return true; // Admins have full access
  
  if (!user.isActive) return false;
  
  const permissions = user.permissions || {
    hasAbilitiesAccess: false,
    hasCollectionAccess: false,
    abilitiesSubjects: {
      verbal: false,
      quantitative: false
    }
  };

  if (sectionId === 'section_tahseel') {
    return permissions.hasCollectionAccess;
  }
  
  if (sectionId === 'section_qudrat') {
    return permissions.hasAbilitiesAccess;
  }

  return false;
};

// Helper function to check if user has access to a subject
export const hasSubjectAccess = (user, subjectId) => {
  if (!user || user.role === 'admin') return true; // Admins have full access
  
  if (!user.isActive) return false;
  
  const permissions = user.permissions || {
    hasAbilitiesAccess: false,
    hasCollectionAccess: false,
    abilitiesSubjects: {
      verbal: false,
      quantitative: false
    }
  };

  // Check if subject is in abilities section
  if (subjectId === 'subject_verbal') {
    return permissions.hasAbilitiesAccess && permissions.abilitiesSubjects?.verbal;
  }
  
  if (subjectId === 'subject_quantitative') {
    return permissions.hasAbilitiesAccess && permissions.abilitiesSubjects?.quantitative;
  }

  // For collection section subjects, check if user has collection access
  if (['subject_math', 'subject_biology', 'subject_physics', 'subject_chemistry'].includes(subjectId)) {
    return permissions.hasCollectionAccess;
  }

  return false;
};

const ProtectedRoute = ({ children, requiredRole = null, checkActive = true }) => {
  const params = useParams();
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

  // Check section access if sectionId is in params
  if (params.sectionId && currentUser.role === 'student') {
    if (!hasSectionAccess(currentUser, params.sectionId)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-dark-600 mb-4">غير مصرح بالوصول</h2>
            <p className="text-dark-600 mb-6">
              ليس لديك صلاحية للوصول إلى هذا القسم. يرجى التواصل مع المدير.
            </p>
            <button
              onClick={() => window.location.href = '/courses'}
              className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      );
    }
  }

  // Check subject access if subjectId is in params
  if (params.subjectId && currentUser.role === 'student') {
    if (!hasSubjectAccess(currentUser, params.subjectId)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-dark-600 mb-4">غير مصرح بالوصول</h2>
            <p className="text-dark-600 mb-6">
              ليس لديك صلاحية للوصول إلى هذه المادة. يرجى التواصل مع المدير.
            </p>
            <button
              onClick={() => window.location.href = '/courses'}
              className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;




















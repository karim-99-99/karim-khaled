import { Navigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../services/storageService";

// Helper function to check if user has access to a section
export const hasSectionAccess = (user, sectionId) => {
  if (!user || user.role === "admin") return true; // Admins have full access

  if (!user.isActive) return false;

  const permissions = user.permissions || {
    hasAbilitiesAccess: false,
    hasCollectionAccess: false,
    abilitiesSubjects: {
      verbal: false,
      quantitative: false,
    },
  };

  // "تحصيلي" removed — only allow abilities section.
  if (sectionId === "قسم_قدرات") return permissions.hasAbilitiesAccess;

  return false;
};

// Helper function to check if user has access to a subject
export const hasSubjectAccess = (user, subjectId) => {
  if (!user || user.role === "admin") return true; // Admins have full access

  if (!user.isActive) return false;

  const permissions = user.permissions || {
    hasAbilitiesAccess: false,
    hasCollectionAccess: false,
    abilitiesSubjects: {
      verbal: false,
      quantitative: false,
    },
    abilitiesCategories: {
      foundation: false,
      collections: false,
    },
  };

  // Abilities subjects (Arabic IDs used across the app)
  if (subjectId === "مادة_اللفظي") {
    return (
      permissions.hasAbilitiesAccess && !!permissions.abilitiesSubjects?.verbal
    );
  }
  if (subjectId === "مادة_الكمي") {
    return (
      permissions.hasAbilitiesAccess &&
      !!permissions.abilitiesSubjects?.quantitative
    );
  }

  return false;
};

// Helper function to check if user has access to a category
export const hasCategoryAccess = (user, categoryName) => {
  if (!user || user.role === "admin") return true; // Admins have full access

  if (user.isActive === false || user.is_active_account === false) return false;

  // دعم المستخدم المخزن بالشكل الخام من API (قبل mapUserFromBackend)
  let permissions = user.permissions;
  if (
    !permissions &&
    (user.has_abilities_access !== undefined ||
      user.abilities_categories_foundation !== undefined)
  ) {
    permissions = {
      hasAbilitiesAccess: !!user.has_abilities_access,
      hasCollectionAccess: !!user.has_collection_access,
      abilitiesSubjects: {
        verbal: !!user.abilities_subjects_verbal,
        quantitative: !!user.abilities_subjects_quantitative,
      },
      abilitiesCategories: {
        foundation: !!user.abilities_categories_foundation,
        collections: !!user.abilities_categories_collections,
      },
    };
  }
  permissions = permissions || {
    hasAbilitiesAccess: false,
    hasCollectionAccess: false,
    abilitiesSubjects: { verbal: false, quantitative: false },
    abilitiesCategories: { foundation: false, collections: false },
  };

  if (categoryName === "التأسيس")
    return !!permissions.abilitiesCategories?.foundation;
  if (categoryName === "التجميعات")
    return !!permissions.abilitiesCategories?.collections;

  if (!permissions.hasAbilitiesAccess) return false;
  return false;
};

const ProtectedRoute = ({
  children,
  requiredRole = null,
  checkActive = true,
}) => {
  const params = useParams();
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check if account is explicitly inactive (لا نعتبر الحساب غير مفعل إلا إذا كانت القيمة false صراحة)
  if (
    checkActive &&
    currentUser.role === "student" &&
    (currentUser.isActive === false || currentUser.is_active_account === false)
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-dark-600 mb-4">
            الحساب غير مفعّل
          </h2>
          <p className="text-dark-600 mb-4">
            حسابك غير مفعّل حالياً. يرجى التواصل مع الإدارة لتفعيل الحساب.
          </p>
          <p className="text-dark-500 text-sm mb-5">
            تواصل معنا عبر واتساب لتفعيل حسابك.
          </p>
          <a
            href="https://wa.me/966502403757"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20BD5A] transition shadow-lg mb-4"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            تواصل عبر واتساب
          </a>
          <button
            onClick={() => (window.location.href = "/")}
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
  if (params.sectionId && currentUser.role === "student") {
    if (!hasSectionAccess(currentUser, params.sectionId)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-dark-600 mb-4">
              غير مصرح بالوصول
            </h2>
            <p className="text-dark-600 mb-6">
              ليس لديك صلاحية للوصول إلى هذا القسم. يرجى التواصل مع المدير.
            </p>
            <button
              onClick={() => (window.location.href = "/courses")}
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
  if (params.subjectId && currentUser.role === "student") {
    if (!hasSubjectAccess(currentUser, params.subjectId)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-dark-600 mb-4">
              غير مصرح بالوصول
            </h2>
            <p className="text-dark-600 mb-6">
              ليس لديك صلاحية للوصول إلى هذه المادة. يرجى التواصل مع المدير.
            </p>
            <button
              onClick={() => (window.location.href = "/courses")}
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

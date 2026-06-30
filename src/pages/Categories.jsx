import { useNavigate, useParams } from "react-router-dom";
import { getSubjectById, getCurrentUser } from "../services/storageService";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import CourseScatteredBackground from "../components/CourseScatteredBackground";
import CourseNavButton from "../components/CourseNavButton";
import { resolveCourseBackgroundVariant } from "../data/courseBackgroundWords";
import {
  isBackendOn,
  getSubjectById as getSubjectByIdApi,
} from "../services/backendApi";
import { isContentStaff } from "../utils/roles";

const Categories = () => {
  const { sectionId, subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pressedCardId, setPressedCardId] = useState(null);
  const currentUser = getCurrentUser();
  const isAdmin = isContentStaff(currentUser);

  const useBackend = !!import.meta.env.VITE_API_URL;

  // "تحصيلي" section removed — redirect any old links.
  useEffect(() => {
    if (sectionId === "قسم_تحصيلي") {
      navigate("/section/قسم_قدرات/subjects", { replace: true });
    }
  }, [sectionId, navigate]);

  useEffect(() => {
    let c = false;
    async function load() {
      try {
        if (useBackend) {
          const s = await getSubjectByIdApi(subjectId);
          if (!c) setSubject(s || null);
        } else {
          if (!c) setSubject(getSubjectById(subjectId) || null);
        }
      } finally {
        if (!c) setLoading(false);
      }
    }
    load();
    return () => {
      c = true;
    };
  }, [subjectId, useBackend]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">جاري التحميل...</p>
      </div>
    );
  }
  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">المادة غير موجودة</p>
      </div>
    );
  }

  const categories = (subject.categories || []).map((c) => ({
    ...c,
    hasTests: c.has_tests ?? c.hasTests,
  }));

  const handleCategoryClick = (categoryId) => {
    navigate(
      `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapters`
    );
  };

  const bgVariant = resolveCourseBackgroundVariant({ subjectId });

  return (
    <div className="min-h-screen bg-secondary-50 relative overflow-hidden">
      <CourseScatteredBackground variant={bgVariant} />
      <div className="relative z-10">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <button
                onClick={() => navigate(`/section/${sectionId}/subjects`)}
                className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium"
              >
                ← رجوع
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
              {subject.name}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">
              اختر التصنيف
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">لا توجد تصنيفات متاحة</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${pressedCardId ? 'course-nav-group course-nav-group--has-selection' : ''}`}>
              {categories.map((category) => {
                const isVerbal = subjectId === "مادة_اللفظي";
                const cardVariant = resolveCourseBackgroundVariant({
                  subjectId,
                  categoryName: category.name,
                });
                return (
                  <CourseNavButton
                    key={category.id}
                    cardId={category.id}
                    groupPressedId={pressedCardId}
                    onPressStart={setPressedCardId}
                    onPressEnd={() => setPressedCardId(null)}
                    variant={cardVariant}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`bg-accent-100 border-2 border-accent-300 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6 text-center ${
                      isVerbal ? "hover:border-primary-400" : "hover:border-accent-400"
                    }`}
                  >
                    {!category.hasTests && (
                      <div className="absolute top-4 left-4 z-10 bg-pink-200 text-dark-700 px-3 py-1 rounded-full text-sm font-semibold">
                        مجانا
                      </div>
                    )}
                    <div className="relative z-10">
                      <div className="text-5xl md:text-6xl mb-4">
                        {category.hasTests ? "📚" : "🎥"}
                      </div>
                      <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-900 mb-2">
                        {category.name}
                      </h2>

                      <div className="mt-4 text-sm md:text-base text-dark-600 font-medium">
                        {category.chapters?.length || 0}{" "}
                        {category.name === "التجميعات" ? "مستويات" : "أقسام"}
                      </div>
                      {!category.hasTests && (
                        <div className="mt-2 text-xs md:text-sm text-primary-600 font-medium">
                          فيديوهات فقط
                        </div>
                      )}
                    </div>
                  </CourseNavButton>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Categories;

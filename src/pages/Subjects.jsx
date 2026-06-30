import { useNavigate, useParams } from 'react-router-dom';
import { getSectionById, getCurrentUser } from '../services/storageService';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import CourseScatteredBackground from '../components/CourseScatteredBackground';
import CourseNavButton from '../components/CourseNavButton';
import { hasSubjectAccess } from '../components/ProtectedRoute';
import { isBackendOn, getSectionById as getSectionByIdApi } from '../services/backendApi';

const Subjects = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pressedCardId, setPressedCardId] = useState(null);
  const currentUser = getCurrentUser();

  const useBackend = !!import.meta.env.VITE_API_URL;

  // "تحصيلي" section removed — redirect any old links.
  useEffect(() => {
    if (sectionId === 'قسم_تحصيلي') {
      navigate('/section/قسم_قدرات/subjects', { replace: true });
    }
  }, [sectionId, navigate]);

  useEffect(() => {
    let c = false;
    async function load() {
      try {
        if (useBackend) {
          const s = await getSectionByIdApi(sectionId);
          if (!c) setSection(s || null);
        } else {
          if (!c) setSection(getSectionById(sectionId) || null);
        }
      } finally {
        if (!c) setLoading(false);
      }
    }
    load();
    return () => { c = true; };
  }, [sectionId, useBackend]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-xl text-gray-600">جاري التحميل...</p></div>;
  }
  if (!section) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">القسم غير موجود</p>
      </div>
    );
  }

  const handleSubjectClick = (subjectId) => {
    navigate(`/section/${sectionId}/subject/${subjectId}/categories`);
  };

  return (
    <div className="min-h-screen bg-secondary-50 relative overflow-hidden">
      <CourseScatteredBackground variant="quantitative" />
      <div className="relative z-10">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/courses')}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
          >
            ← رجوع
          </button>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
            {section.name}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">اختر المادة</p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${pressedCardId ? 'course-nav-group course-nav-group--has-selection' : ''}`}>
          {(section.subjects || [])
            .filter(subject => {
              // Filter subjects based on user permissions (if logged in as student)
              if (currentUser && currentUser.role === 'student') {
                return hasSubjectAccess(currentUser, subject.id);
              }
              // Show all subjects for non-logged in users or admins
              return true;
            })
            .map((subject) => {
            // Choose icon based on subject
            const icons = {
              'الرياضيات': '🔢',
              'الأحياء': '🔬',
              'الفيزياء': '⚛️',
              'الكيمياء': '🧪',
              'الكمي': '📊',
              'اللفظي': '📝',
            };
            const icon = icons[subject.name] || '📖';

            return (
              <CourseNavButton
                key={subject.id}
                cardId={subject.id}
                groupPressedId={pressedCardId}
                onPressStart={setPressedCardId}
                onPressEnd={() => setPressedCardId(null)}
                variant="quantitative"
                onClick={() => handleSubjectClick(subject.id)}
                className="bg-secondary-100 border-2 border-secondary-300 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6 text-center"
              >
                <div className="text-4xl md:text-5xl mb-4">{icon}</div>
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-900 mb-2">
                  {subject.name}
                </h2>
             
              </CourseNavButton>
            );
          })}
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Subjects;




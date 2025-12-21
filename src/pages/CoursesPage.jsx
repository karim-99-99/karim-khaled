import { useNavigate } from 'react-router-dom';
import { getSections, getCurrentUser } from '../services/storageService';
import { useEffect, useState } from 'react';
import Header from '../components/Header';

const CoursesPage = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const currentUser = getCurrentUser();

  useEffect(() => {
    const allSections = getSections();
    setSections(allSections);
  }, []);

  const handleSectionClick = (sectionId) => {
    if (currentUser && currentUser.role === 'student') {
      navigate(`/section/${sectionId}/subjects`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-dark-600 mb-3 md:mb-4 leading-tight">
            الدورات المتاحة / Available Courses
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">
            اختر المادة التي تريد البدء بها / Choose the subject you want to start with
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8 border-t-4 border-primary-500"
            >
              <div className="text-center">
                <div className="text-5xl md:text-6xl mb-4">
                  {section.id === 'section_tahseel' ? '📚' : '🧠'}
                </div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-2">
                  {section.name}
                </h2>
                <p className="text-lg md:text-xl text-dark-600 mb-4 font-medium">{section.nameEn}</p>
                <p className="text-base md:text-lg text-dark-600 mb-6 font-medium">
                  {section.subjects.length} مواد / {section.subjects.length} Subjects
                </p>
                <button
                  onClick={() => handleSectionClick(section.id)}
                  className="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors"
                >
                  {currentUser ? 'استكشف القسم / Explore Section' : 'تسجيل الدخول / Login'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;


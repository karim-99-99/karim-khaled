import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSections, getCurrentUser } from '../services/storageService';
import Header from '../components/Header';

const AllCoursesPage = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('tahseel'); // تحصيل or قدرات
  const currentUser = getCurrentUser();

  useEffect(() => {
    const allSections = getSections();
    setSections(allSections);
  }, []);

  const handleSectionClick = (sectionId) => {
    if (currentUser && currentUser.role === 'student') {
      navigate(`/section/${sectionId}/subjects`);
    } else if (currentUser && currentUser.role === 'admin') {
      navigate(`/section/${sectionId}/subjects`);
    } else {
      navigate('/login');
    }
  };

  // Get course cards data filtered by selected section
  const getCourseCards = () => {
    const cards = [];
    
    // Filter sections based on selected filter
    const filteredSections = sections.filter(section => {
      if (selectedFilter === 'tahseel') {
        return section.id === 'section_tahseel'; // تحصيل - رياضيات، أحياء، فيزياء، كيمياء
      } else if (selectedFilter === 'qudrat') {
        return section.id === 'section_qudrat'; // قدرات - كمي و لفظي
      }
      return false;
    });
    
    filteredSections.forEach(section => {
      section.subjects.forEach(subject => {
        subject.categories.forEach(category => {
          cards.push({
            id: `${section.id}-${subject.id}-${category.id}`,
            sectionId: section.id,
            sectionName: section.name,
            subjectName: subject.name,
            categoryName: category.name,
            hasTests: category.hasTests,
            chaptersCount: category.chapters.length,
            price: category.hasTests ? '99 ر.س' : 'مجانا',
            bgColor: section.id === 'section_tahseel' ? 'bg-secondary-100' : 'bg-accent-100',
            borderColor: section.id === 'section_tahseel' ? 'border-secondary-300' : 'border-accent-300',
          });
        });
      });
    });
    return cards;
  };

  const courseCards = getCourseCards();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dark-900 mb-4">
            الدروس و الكورسات
          </h1>
          {/* Decorative wavy line */}
          <div className="flex justify-center mb-8">
            <svg width="300" height="20" viewBox="0 0 300 20" className="text-primary-500">
              <path d="M0,10 Q75,0 150,10 T300,10" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>
          </div>
          {/* Decorative circles */}
          <div className="absolute left-8 top-8 w-4 h-4 border-2 border-primary-500 rounded-full opacity-30 hidden md:block"></div>
          <div className="absolute right-8 top-8 w-4 h-4 border-2 border-primary-500 rounded-full opacity-30 hidden md:block"></div>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-4 mb-8 md:mb-12 flex-wrap">
          <button
            onClick={() => setSelectedFilter('tahseel')}
            className={`px-6 py-3 rounded-full font-medium transition-colors ${
              selectedFilter === 'tahseel'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-dark-600 hover:bg-gray-300'
            }`}
          >
            تحصيل
          </button>
          <button
            onClick={() => setSelectedFilter('qudrat')}
            className={`px-6 py-3 rounded-full font-medium transition-colors ${
              selectedFilter === 'qudrat'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-dark-600 hover:bg-gray-300'
            }`}
          >
            قدرات
          </button>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courseCards.map((card, index) => (
            <div
              key={card.id}
              onClick={() => handleSectionClick(card.sectionId)}
              className={`${card.bgColor} rounded-xl border-2 ${card.borderColor} p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative`}
            >
              {/* Price Badge */}
              <div className="absolute top-4 left-4 bg-pink-200 text-dark-700 px-3 py-1 rounded-full text-sm font-semibold">
                {card.price}
              </div>

              {/* Icon/Illustration */}
              <div className="text-center mb-4 mt-8">
                <div className="text-5xl mb-4">
                  {card.sectionId === 'section_tahseel' ? '📚' : '🧠'}
                </div>
              </div>

              {/* Content */}
              <div className="text-center">
                <h3 className="text-lg md:text-xl font-bold text-dark-900 mb-2">
                  {card.subjectName}
                </h3>
                <p className="text-base text-dark-600 mb-2">
                  {card.categoryName}
                </p>
                {card.hasTests && (
                  <p className="text-sm text-dark-500">
                    محوسب
                  </p>
                )}
                <p className="text-sm text-dark-500 mt-2">
                  {card.chaptersCount} فصول
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllCoursesPage;


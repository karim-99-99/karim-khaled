import { useNavigate } from 'react-router-dom';
import { getSections } from '../services/storageService';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';

const Home = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);

  useEffect(() => {
    const allSections = getSections();
    setSections(allSections);
  }, []);

  const handleSectionClick = (sectionId) => {
    navigate(`/section/${sectionId}/subjects`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-3 md:mb-4 leading-tight">
            مرحباً! اختر القسم
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionClick(section.id)}
              className={`group relative ${
                section.id === 'section_tahseel' ? 'bg-secondary-100 border-secondary-300' : 'bg-accent-100 border-accent-300'
              } rounded-xl border-2 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2`}
            >
              <div className="text-center">
                <div className="text-5xl md:text-6xl mb-4">
                  {section.id === 'section_tahseel' ? '📚' : '🧠'}
                </div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-900 mb-2">
                  {section.name}
                </h2>
              
                <div className="mt-4 text-sm md:text-base text-dark-600 font-medium">
                  {section.subjects.length} مواد
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;



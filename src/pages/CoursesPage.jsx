import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getSections } from '../services/storageService';

const CoursesPage = () => {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState(null); // 'tahseel' or 'qudrat' or null
  
  const sections = getSections();
  const tahseelSection = sections.find(s => s.id === 'section_tahseel');
  const qudratSection = sections.find(s => s.id === 'section_qudrat');

  const handleSubjectClick = (sectionId, subjectId) => {
    navigate(`/section/${sectionId}/subject/${subjectId}/categories`);
  };

  const handleCategoryClick = (sectionId, subjectId, categoryId) => {
    navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapters`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12 relative">
          {/* Decorative circles */}
          <div className="absolute left-8 top-8 w-4 h-4 border-2 border-primary-500 rounded-full opacity-30 hidden md:block"></div>
          <div className="absolute right-8 top-8 w-4 h-4 border-2 border-primary-500 rounded-full opacity-30 hidden md:block"></div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dark-900 mb-4">
            الدروس و الكورسات
          </h1>
          
          {/* Decorative wavy lines */}
          <div className="flex justify-center mb-8">
            <svg width="300" height="20" viewBox="0 0 300 20" className="text-primary-500">
              <path d="M0,10 Q75,0 150,10 T300,10" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>
          </div>
        </div>

        {/* Main Selection Buttons */}
        {!selectedSection && (
          <div className="flex justify-center gap-6 mb-12 flex-wrap">
            <button
              onClick={() => setSelectedSection('tahseel')}
              className="group relative px-12 py-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-2xl text-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl text-white transform hover:scale-105 hover:-translate-y-2 overflow-hidden"
            >
              <span className="relative z-10">تحصيل</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
            <button
              onClick={() => setSelectedSection('qudrat')}
              className="group relative px-12 py-6 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 rounded-2xl text-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl text-white transform hover:scale-105 hover:-translate-y-2 overflow-hidden"
            >
              <span className="relative z-10">قدرات</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </div>
        )}

        {/* Back Button */}
        {selectedSection && (
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setSelectedSection(null)}
              className="group px-8 py-4 bg-gray-200 hover:bg-gray-300 rounded-xl text-lg font-semibold transition-all duration-300 text-dark-600 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
            >
              <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
              <span>رجوع</span>
            </button>
          </div>
        )}

        {/* تحصيل Subjects */}
        {selectedSection === 'tahseel' && tahseelSection && (
          <div className="flex justify-center gap-6 mb-12 flex-wrap">
            {tahseelSection.subjects.map((subject, index) => (
              <button
                key={subject.id}
                onClick={() => handleSubjectClick('section_tahseel', subject.id)}
                className="group relative px-10 py-6 bg-gradient-to-br from-secondary-100 to-secondary-200 border-2 border-secondary-300 hover:border-secondary-400 rounded-2xl text-xl font-bold transition-all duration-300 transform hover:-translate-y-3 hover:scale-105 text-dark-900 shadow-lg hover:shadow-2xl overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="relative z-10">{subject.name}</span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-secondary-300 rounded-full -mr-10 -mt-10 opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-secondary-300 rounded-full -ml-8 -mb-8 opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-700"></div>
              </button>
            ))}
          </div>
        )}

        {/* قدرات Subjects (كمي و لفظي) */}
        {selectedSection === 'qudrat' && qudratSection && (
          <div className="flex justify-center gap-6 mb-12 flex-wrap">
            {qudratSection.subjects.map((subject, index) => (
              <button
                key={subject.id}
                onClick={() => handleSubjectClick('section_qudrat', subject.id)}
                className="group relative px-10 py-6 bg-gradient-to-br from-accent-100 to-accent-200 border-2 border-accent-300 hover:border-accent-400 rounded-2xl text-xl font-bold transition-all duration-300 transform hover:-translate-y-3 hover:scale-105 text-dark-900 shadow-lg hover:shadow-2xl overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="relative z-10">{subject.name}</span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-accent-300 rounded-full -mr-10 -mt-10 opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-accent-300 rounded-full -ml-8 -mb-8 opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-700"></div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;

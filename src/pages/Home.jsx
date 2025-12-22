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
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <Header />
      
      {/* Decorative Background Elements - Using brand colors: E8CCAD, EC802B, EDC55B, 66BCB4 */}
      {/* Small orange circle - top left - visible on mobile */}
      <div className="absolute top-20 left-4 w-16 h-16 md:w-24 md:h-24 rounded-full opacity-15" style={{ zIndex: 0, background: '#EC802B' }}></div>
      
      {/* Small beige circle - bottom left - visible on mobile */}
      <div className="absolute bottom-20 left-8 w-12 h-12 md:w-20 md:h-20 rounded-full opacity-20" style={{ zIndex: 0, background: '#E8CCAD' }}></div>
      
      {/* Small turquoise circle - top right - visible on mobile */}
      <div className="absolute top-32 right-12 w-12 h-12 md:w-18 md:h-18 rounded-full opacity-20" style={{ zIndex: 0, background: '#66BCB4' }}></div>
      
      {/* Small golden yellow circle - mid right */}
      <div className="absolute top-1/2 right-8 w-14 h-14 md:w-20 md:h-20 rounded-full opacity-15 hidden md:block" style={{ zIndex: 0, background: '#EDC55B' }}></div>
      
      {/* Small dotted turquoise square - mid left */}
      <div className="absolute top-1/3 left-16 w-12 h-12 md:w-18 md:h-18 opacity-20 hidden md:block" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="dots-square-turquoise-home" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1" fill="#66BCB4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-square-turquoise-home)" />
        </svg>
      </div>
      
      {/* Small dotted golden yellow triangle - bottom center left */}
      <div className="absolute bottom-32 left-1/4 w-10 h-10 md:w-14 md:h-14 opacity-15 hidden md:block transform -translate-x-1/2" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%">
          <polygon points="50,10 90,90 10,90" stroke="#EDC55B" strokeWidth="1.5" fill="none" strokeDasharray="2,2" />
        </svg>
      </div>
      
      {/* Small orange circles - scattered */}
      <div className="absolute top-1/4 left-1/3 w-6 h-6 md:w-8 md:w-8 rounded-full opacity-25 hidden md:block" style={{ zIndex: 0, background: '#EC802B' }}></div>
      <div className="absolute bottom-1/3 right-1/4 w-7 h-7 md:w-10 md:h-10 rounded-full opacity-20 hidden md:block" style={{ zIndex: 0, background: '#EC802B' }}></div>
      
      {/* Small beige square with wavy pattern - top center */}
      <div className="absolute top-40 left-1/2 w-14 h-14 md:w-20 md:h-20 opacity-15 hidden md:block transform -translate-x-1/2" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <rect width="60" height="60" x="20" y="20" fill="#E8CCAD" opacity="0.3" />
          <path d="M 25,50 Q 30,35 40,50 T 55,50 T 75,50" stroke="#EC802B" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
      
      {/* Small golden yellow pie chart segment - bottom right */}
      <div className="absolute bottom-24 right-16 w-10 h-10 md:w-14 md:h-14 opacity-20 hidden md:block" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <path d="M 50,50 L 50,20 A 30,30 0 0,1 80,50 Z" fill="#EDC55B" opacity="0.5" />
        </svg>
      </div>
      
      {/* Small X shape - decorative */}
      <div className="absolute top-1/3 right-1/4 w-6 h-6 md:w-8 md:h-8 opacity-12 hidden md:block" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 24 24">
          <line x1="4" y1="4" x2="20" y2="20" stroke="#3D3D3D" strokeWidth="1.5" />
          <line x1="20" y1="4" x2="4" y2="20" stroke="#3D3D3D" strokeWidth="1.5" />
        </svg>
      </div>
      
      {/* Small turquoise circles - additional decorative elements */}
      <div className="absolute top-2/3 left-1/2 w-8 h-8 md:w-12 md:h-12 rounded-full opacity-15 hidden md:block transform -translate-x-1/2" style={{ zIndex: 0, background: '#66BCB4' }}></div>
      <div className="absolute bottom-1/4 right-1/3 w-9 h-9 md:w-12 md:h-12 rounded-full opacity-20 hidden md:block" style={{ zIndex: 0, background: '#66BCB4' }}></div>
      
      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12" style={{ zIndex: 1 }}>
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



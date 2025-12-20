import { useNavigate } from 'react-router-dom';
import { getSubjects } from '../services/storageService';
import { useEffect, useState } from 'react';
import Header from '../components/Header';

const Home = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const allSubjects = getSubjects();
    setSubjects(allSubjects);
  }, []);

  const handleSubjectClick = (subjectId) => {
    navigate(`/subject/${subjectId}/chapters`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-3 md:mb-4 leading-tight">
            مرحباً! اختر المادة
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">
            Welcome! Choose a Subject
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => handleSubjectClick(subject.id)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 p-8"
            >
              <div className="text-center">
                <div className="text-5xl md:text-6xl mb-4">
                  {subject.id === 'subj1' ? '🔢' : '🔬'}
                </div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-2">
                  {subject.name}
                </h2>
                <p className="text-lg md:text-xl text-dark-600 font-medium">{subject.nameEn}</p>
                <div className="mt-4 text-sm md:text-base text-dark-500 font-medium">
                  {subject.chapters.length} فصول / {subject.chapters.length} Chapters
                </div>
              </div>
              <div className="absolute inset-0 rounded-2xl border-4 border-transparent group-hover:border-primary-400 transition"></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;



import { useNavigate } from 'react-router-dom';
import { getSubjects } from '../services/storageService';
import { useEffect, useState } from 'react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            مرحباً! اختر المادة
          </h1>
          <p className="text-xl text-gray-600">
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
                <div className="text-6xl mb-4">
                  {subject.id === 'subj1' ? '🔢' : '🔬'}
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {subject.name}
                </h2>
                <p className="text-xl text-gray-600">{subject.nameEn}</p>
                <div className="mt-4 text-sm text-gray-500">
                  {subject.chapters.length} فصول / {subject.chapters.length} Chapters
                </div>
              </div>
              <div className="absolute inset-0 rounded-2xl border-4 border-transparent group-hover:border-blue-400 transition"></div>
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => {
              localStorage.removeItem('edu_current_user');
              navigate('/login');
            }}
            className="text-gray-600 hover:text-gray-800 underline"
          >
            تسجيل الخروج / Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;



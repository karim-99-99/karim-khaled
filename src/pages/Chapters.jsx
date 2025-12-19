import { useNavigate, useParams } from 'react-router-dom';
import { getSubjectById } from '../services/storageService';

const Chapters = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const subject = getSubjectById(subjectId);

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">المادة غير موجودة / Subject not found</p>
      </div>
    );
  }

  const handleChapterClick = (chapterId) => {
    navigate(`/subject/${subjectId}/chapter/${chapterId}/levels`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/home')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← رجوع / Back
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {subject.name} / {subject.nameEn}
          </h1>
          <p className="text-xl text-gray-600">اختر الفصل / Choose Chapter</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subject.chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              onClick={() => handleChapterClick(chapter.id)}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 p-6 text-right"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  {index + 1}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {chapter.name}
              </h2>
              <p className="text-lg text-gray-600">{chapter.nameEn}</p>
              <div className="mt-4 text-sm text-gray-500">
                10 مستويات / 10 Levels
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Chapters;



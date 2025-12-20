import { useNavigate, useParams } from 'react-router-dom';
import { getLevelsByChapter, getLevelProgress, getCurrentUser } from '../services/storageService';
import Header from '../components/Header';

const Levels = () => {
  const { subjectId, chapterId } = useParams();
  const navigate = useNavigate();
  const levels = getLevelsByChapter(chapterId);
  const currentUser = getCurrentUser();

  const handleLevelClick = (levelId) => {
    navigate(`/subject/${subjectId}/chapter/${chapterId}/level/${levelId}/quiz`);
  };

  const getLevelStatus = (levelId) => {
    if (!currentUser) return 'locked';
    const progress = getLevelProgress(currentUser.id, levelId);
    return progress ? 'completed' : 'available';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/subject/${subjectId}/chapters`)}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
          >
            ← رجوع / Back
          </button>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
            المستويات / Levels
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">اختر المستوى / Choose Level</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {levels.map((level) => {
            const status = getLevelStatus(level.id);
            const progress = currentUser ? getLevelProgress(currentUser.id, level.id) : null;
            
            return (
              <button
                key={level.id}
                onClick={() => handleLevelClick(level.id)}
                disabled={status === 'locked'}
                className={`
                  relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 p-6 text-center
                  ${status === 'locked' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {status === 'completed' && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white text-lg md:text-xl w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-md font-bold">✓</div>
                )}
                {progress && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    {progress.score}%
                  </div>
                )}
                <div className="text-3xl md:text-4xl mb-2">🎯</div>
                <h2 className="text-base md:text-lg lg:text-xl font-bold text-dark-600 mb-1">
                  {level.name}
                </h2>
                <p className="text-xs md:text-sm lg:text-base text-dark-500 font-medium">{level.nameEn}</p>
              </button>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Levels;



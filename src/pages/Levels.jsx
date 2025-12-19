import { useNavigate, useParams } from 'react-router-dom';
import { getLevelsByChapter, getLevelProgress, getCurrentUser } from '../services/storageService';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/subject/${subjectId}/chapters`)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← رجوع / Back
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            المستويات / Levels
          </h1>
          <p className="text-xl text-gray-600">اختر المستوى / Choose Level</p>
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
                  <div className="absolute top-2 right-2 text-green-500 text-2xl">✓</div>
                )}
                {progress && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    {progress.score}%
                  </div>
                )}
                <div className="text-4xl mb-2">🎯</div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  {level.name}
                </h2>
                <p className="text-sm text-gray-600">{level.nameEn}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Levels;



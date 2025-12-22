import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';

const Result = () => {
  // Support both new structure and legacy
  const { sectionId, subjectId, categoryId, chapterId, itemId, levelId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { score = 0, correctCount = 0, totalQuestions = 50 } = location.state || {};

  const getScoreColor = () => {
    if (score >= 80) return 'text-yellow-500';
    if (score >= 60) return 'text-yellow-600';
    return 'text-dark-600';
  };

  const getScoreMessage = () => {
    if (isArabicBrowser()) {
      if (score >= 90) return 'ممتاز!';
      if (score >= 80) return 'جيد جداً!';
      if (score >= 60) return 'جيد';
      if (score >= 50) return 'مقبول';
      return 'تحتاج للمزيد من الممارسة';
    } 
  };

  const getScoreEmoji = () => {
    if (score >= 80) return '🎉';
    if (score >= 60) return '👍';
    return '💪';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center border-t-4 border-primary-500">
          <div className="text-8xl mb-4">{getScoreEmoji()}</div>
          
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-4 leading-tight">
            {getScoreMessage()}
          </h1>

          <div className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 ${getScoreColor()}`}>
            {score}%
          </div>

          <div className="bg-gray-100 rounded-xl p-5 md:p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm md:text-base lg:text-lg text-dark-600 mb-2 font-medium">{isArabicBrowser() ? 'الإجابات الصحيحة' : ''}</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-yellow-500">{correctCount}</p>
              </div>
              <div>
                <p className="text-sm md:text-base lg:text-lg text-dark-600 mb-2 font-medium">{isArabicBrowser() ? 'إجمالي الأسئلة' : ''}</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600">{totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                if (sectionId && categoryId && itemId) {
                  navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`);
                } else {
                  navigate(`/subject/${subjectId}/chapter/${chapterId}/levels`);
                }
              }}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition text-lg"
            >
              {isArabicBrowser() ? 'العودة للدروس' : ''}
            </button>
            
            <button
              onClick={() => navigate('/home')}
              className="w-full bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-400 transition text-lg"
            >
              {isArabicBrowser() ? 'الصفحة الرئيسية' : ''}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Result;



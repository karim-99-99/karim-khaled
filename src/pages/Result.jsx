import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from '../components/Header';

const Result = () => {
  const { subjectId, chapterId, levelId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { score = 0, correctCount = 0, totalQuestions = 50 } = location.state || {};

  const getScoreColor = () => {
    if (score >= 80) return 'text-yellow-500';
    if (score >= 60) return 'text-yellow-600';
    return 'text-dark-600';
  };

  const getScoreMessage = () => {
    if (score >= 90) return 'ممتاز! / Excellent!';
    if (score >= 80) return 'جيد جداً! / Very Good!';
    if (score >= 60) return 'جيد / Good';
    if (score >= 50) return 'مقبول / Acceptable';
    return 'تحتاج للمزيد من الممارسة / Need More Practice';
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
                <p className="text-sm md:text-base lg:text-lg text-dark-600 mb-2 font-medium">الإجابات الصحيحة / Correct</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-yellow-500">{correctCount}</p>
              </div>
              <div>
                <p className="text-sm md:text-base lg:text-lg text-dark-600 mb-2 font-medium">إجمالي الأسئلة / Total</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600">{totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate(`/subject/${subjectId}/chapter/${chapterId}/levels`)}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition text-lg"
            >
              العودة للمستويات / Back to Levels
            </button>
            
            <button
              onClick={() => navigate('/home')}
              className="w-full bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-400 transition text-lg"
            >
              الصفحة الرئيسية / Home
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Result;



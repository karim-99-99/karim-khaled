import { useNavigate, useParams, useLocation } from 'react-router-dom';

const Result = () => {
  const { subjectId, chapterId, levelId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { score = 0, correctCount = 0, totalQuestions = 50 } = location.state || {};

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-8xl mb-4">{getScoreEmoji()}</div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            {getScoreMessage()}
          </h1>

          <div className={`text-6xl font-bold mb-4 ${getScoreColor()}`}>
            {score}%
          </div>

          <div className="bg-gray-100 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div>
                <p className="text-gray-600 mb-2">الإجابات الصحيحة / Correct</p>
                <p className="text-2xl font-bold text-green-600">{correctCount}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-2">إجمالي الأسئلة / Total</p>
                <p className="text-2xl font-bold text-gray-800">{totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate(`/subject/${subjectId}/chapter/${chapterId}/levels`)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-lg"
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
  );
};

export default Result;



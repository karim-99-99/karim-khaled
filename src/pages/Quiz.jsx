import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuestionsByLevel, getVideoByLevel, saveProgress, getCurrentUser, getLevelById } from '../services/storageService';
import VideoModal from '../components/VideoModal';
import ProgressBar from '../components/ProgressBar';

const Quiz = () => {
  const { subjectId, chapterId, levelId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showVideo, setShowVideo] = useState(false);
  const [video, setVideo] = useState(null);
  const currentUser = getCurrentUser();
  const level = getLevelById(levelId);

  useEffect(() => {
    const quizQuestions = getQuestionsByLevel(levelId);
    
    // If no questions, create sample questions
    if (quizQuestions.length === 0) {
      const sampleQuestions = [];
      for (let i = 1; i <= 50; i++) {
        sampleQuestions.push({
          id: `q_${levelId}_${i}`,
          levelId: levelId,
          question: `سؤال ${i}: ما هو 2 + 2؟`,
          questionEn: `Question ${i}: What is 2 + 2?`,
          answers: [
            { id: 'a', text: '3', textEn: '3', isCorrect: false },
            { id: 'b', text: '4', textEn: '4', isCorrect: true },
            { id: 'c', text: '5', textEn: '5', isCorrect: false },
            { id: 'd', text: '6', textEn: '6', isCorrect: false },
          ],
        });
      }
      setQuestions(sampleQuestions);
    } else {
      setQuestions(quizQuestions.slice(0, 50)); // Ensure max 50 questions
    }

    const levelVideo = getVideoByLevel(levelId);
    setVideo(levelVideo);
  }, [levelId]);

  const currentQuestion = questions[currentIndex];

  const handleAnswerSelect = (answerId) => {
    if (showResult) return;
    
    setSelectedAnswer(answerId);
    setShowResult(true);
    
    // Save answer
    setAnswers({
      ...answers,
      [currentQuestion.id]: answerId,
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(answers[questions[currentIndex + 1].id] || null);
      setShowResult(false);
    } else {
      // Quiz finished, calculate score
      calculateScore();
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    
    questions.forEach((question) => {
      const userAnswer = answers[question.id] || selectedAnswer;
      const correctAnswer = question.answers.find(a => a.isCorrect);
      
      if (userAnswer === correctAnswer?.id) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    
    // Save progress
    if (currentUser) {
      saveProgress({
        userId: currentUser.id,
        levelId: levelId,
        score: score,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        completedAt: new Date().toISOString(),
      });
    }

    navigate(`/subject/${subjectId}/chapter/${chapterId}/level/${levelId}/result`, {
      state: {
        score,
        correctCount,
        totalQuestions: questions.length,
      },
    });
  };

  const getAnswerStyle = (answer) => {
    if (!showResult) {
      return selectedAnswer === answer.id
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-800';
    }

    // After result is shown
    if (answer.isCorrect) {
      // Correct answer always green
      return 'bg-green-500 text-white';
    }
    
    // All wrong answers turn red (whether selected or not)
    return 'bg-red-500 text-white';
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">جاري التحميل... / Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/subject/${subjectId}/chapter/${chapterId}/levels`)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← رجوع / Back
          </button>
          
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">
                {level?.name || 'المستوى'} / {level?.nameEn || 'Level'}
              </h1>
              <button
                onClick={() => setShowVideo(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                🎥 مشاهدة الفيديو / Watch Video
              </button>
            </div>
            <ProgressBar
              current={currentIndex + 1}
              total={questions.length}
              label={`السؤال / Question`}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">
              السؤال {currentIndex + 1} من {questions.length} / Question {currentIndex + 1} of {questions.length}
            </p>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {currentQuestion?.question}
            </h2>
            {currentQuestion?.questionEn && (
              <p className="text-lg text-gray-600">{currentQuestion.questionEn}</p>
            )}
          </div>

          <div className="space-y-3">
            {currentQuestion?.answers.map((answer) => (
              <button
                key={answer.id}
                onClick={() => handleAnswerSelect(answer.id)}
                disabled={showResult}
                className={`
                  w-full text-right p-4 rounded-lg transition-all duration-200
                  ${getAnswerStyle(answer)}
                  ${showResult ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">{answer.text}</span>
                  {answer.textEn && (
                    <span className="text-sm opacity-75">{answer.textEn}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
                setSelectedAnswer(answers[questions[currentIndex - 1].id] || null);
                setShowResult(!!answers[questions[currentIndex - 1].id]);
              }
            }}
            disabled={currentIndex === 0}
            className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← السابق / Previous
          </button>

          {showResult && (
            <button
              onClick={handleNext}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              {currentIndex < questions.length - 1
                ? 'التالي / Next →'
                : 'إنهاء الاختبار / Finish Quiz'}
            </button>
          )}
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={showVideo}
        onClose={() => setShowVideo(false)}
        videoUrl={video?.url || ''}
        title={video?.title || 'فيديو تعليمي'}
      />
    </div>
  );
};

export default Quiz;


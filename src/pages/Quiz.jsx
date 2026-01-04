import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuestionsByLevel, getVideoByLevel, saveProgress, getCurrentUser, getLevelById } from '../services/storageService';
import { getVideoFile } from '../services/videoStorage';
import VideoModal from '../components/VideoModal';
import ProgressBar from '../components/ProgressBar';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';
import MathRenderer from '../components/MathRenderer';

const Quiz = () => {
  // Support both new structure (with sectionId, categoryId, itemId) and legacy (levelId)
  const { sectionId, subjectId, categoryId, chapterId, itemId, levelId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showVideo, setShowVideo] = useState(false);
  const [video, setVideo] = useState(null);
  const currentUser = getCurrentUser();
  // Use itemId if available (new structure), otherwise use levelId (legacy)
  const actualItemId = itemId || levelId;
  const level = getLevelById(actualItemId);

  useEffect(() => {
    const quizQuestions = getQuestionsByLevel(actualItemId);
    
    // If no questions, create sample questions
    if (quizQuestions.length === 0) {
      const sampleQuestions = [];
      for (let i = 1; i <= 50; i++) {
        sampleQuestions.push({
          id: `q_${actualItemId}_${i}`,
          itemId: actualItemId,
          levelId: actualItemId, // Keep for backward compatibility
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

    const loadVideo = async () => {
      const levelVideo = getVideoByLevel(actualItemId);
      if (levelVideo && levelVideo.isFileUpload && levelVideo.url.startsWith('indexeddb://')) {
        // Load video from IndexedDB
        try {
          const videoFile = await getVideoFile(actualItemId);
          if (videoFile) {
            setVideo({ ...levelVideo, url: videoFile.url });
          } else {
            setVideo(levelVideo);
          }
        } catch (error) {
          console.error('Error loading video file:', error);
          setVideo(levelVideo);
        }
      } else {
        setVideo(levelVideo);
      }
    };
    loadVideo();
  }, [actualItemId]);

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
        levelId: actualItemId,
        itemId: actualItemId,
        score: score,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        completedAt: new Date().toISOString(),
      });
    }

    // Navigate based on structure (new or legacy)
    if (sectionId && categoryId && itemId) {
      navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/result`, {
        state: {
          score,
          correctCount,
          totalQuestions: questions.length,
        },
      });
    } else {
      // Legacy route
      navigate(`/subject/${subjectId}/chapter/${chapterId}/level/${levelId}/result`, {
        state: {
          score,
          correctCount,
          totalQuestions: questions.length,
        },
      });
    }
  };

  const getAnswerStyle = (answer) => {
    if (!showResult) {
      return selectedAnswer === answer.id
        ? 'bg-primary-500 text-white'
        : 'bg-gray-100 hover:bg-gray-200 text-dark-600';
    }

    // After result is shown
    const userAnswer = answers[currentQuestion.id] || selectedAnswer;
    const correctAnswer = currentQuestion.answers.find(a => a.isCorrect);
    const isUserCorrect = userAnswer === correctAnswer?.id;

    if (answer.isCorrect) {
      // Correct answer always green
      return 'bg-green-500 text-white';
    }
    
    // If user answered correctly, all other answers turn red
    // If user answered incorrectly, all wrong answers turn red
    if (isUserCorrect) {
      // User answered correctly - all other answers turn red
      return 'bg-red-500 text-white';
    } else {
      // User answered incorrectly - all wrong answers turn red
      return 'bg-red-500 text-white';
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg md:text-xl lg:text-2xl text-dark-600 font-medium">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`)}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
          >
            ← رجوع
          </button>
          
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4 border-t-4 border-primary-500">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                {level?.name || 'المستوى'}
              </h1>
              <button
                onClick={() => setShowVideo(true)}
                className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition flex items-center gap-2"
              >
                🎥 {isArabicBrowser() ? 'مشاهدة الفيديو' : ' '}
              </button>
            </div>
            <ProgressBar
              current={currentIndex + 1}
              total={questions.length}
              label={isArabicBrowser() ? 'السؤال' : ''}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="mb-6">
            {/* Question Image */}
            {currentQuestion?.image && (
              <div className="mb-4 flex justify-center">
                <img
                  src={currentQuestion.image}
                  alt="Question"
                  className="w-full max-w-full h-auto max-h-[300px] sm:max-h-[400px] md:max-h-[500px] rounded-lg border shadow-md object-contain"
                />
              </div>
            )}
            <p className="text-xs md:text-sm text-dark-500 mb-2 font-medium">
              السؤال {currentIndex + 1} من {questions.length}
            </p>
            <div className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2 leading-relaxed">
              <MathRenderer html={currentQuestion?.question || ''} inline={false} />
            </div>
            {!isArabicBrowser() && currentQuestion?.questionEn && (
              <div className="text-base md:text-lg text-dark-600 font-medium">
                <MathRenderer html={currentQuestion.questionEn} inline={false} />
              </div>
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
                  <span className="font-semibold text-base md:text-lg">{answer.text}</span>
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
            ← {isArabicBrowser() ? 'السابق' : ''}
          </button>

          {showResult && (
          <button
            onClick={handleNext}
            className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition font-medium"
          >
              {currentIndex < questions.length - 1
                ? (isArabicBrowser() ? 'التالي →' : ' ')
                : (isArabicBrowser() ? 'إنهاء الاختبار' : ' ')}
            </button>
          )}
        </div>
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


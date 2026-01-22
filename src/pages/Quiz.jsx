import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuestionsByLevel, getVideoByLevel, getCurrentUser, getLevelById } from '../services/storageService';
import { getVideoFile } from '../services/videoStorage';
import VideoModal from '../components/VideoModal';
import ProgressBar from '../components/ProgressBar';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';
import MathRenderer from '../components/MathRenderer';
import { isBackendOn, getQuestionsByLevel as getQuestionsByLevelApi, getVideoByLevel as getVideoByLevelApi, getItemById as getItemByIdApi } from '../services/backendApi';

const Quiz = () => {
  const { sectionId, subjectId, categoryId, chapterId, itemId, levelId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showVideo, setShowVideo] = useState(false);
  const [video, setVideo] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [level, setLevel] = useState(null);
  const currentUser = getCurrentUser();
  const actualItemId = itemId || levelId;
  const progressKey = `quiz_progress_${actualItemId}_${currentUser?.id || 'guest'}`;
  
  useEffect(() => {
    const savedProgress = localStorage.getItem(progressKey);
    if (savedProgress) {
      try {
        const { savedAnswers, savedIndex, timestamp } = JSON.parse(savedProgress);
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          setAnswers(savedAnswers);
          setCurrentIndex(savedIndex);
          setIsPaused(true);
        }
      } catch (e) {
        console.error('Error loading saved progress:', e);
      }
    }
  }, [progressKey]);

  useEffect(() => {
    let c = false;
    const load = async () => {
      let quizQuestions = [];
      let levelVideo = null;
      if (isBackendOn()) {
        const [pq, lv, lev] = await Promise.all([
          getQuestionsByLevelApi(actualItemId),
          getVideoByLevelApi(actualItemId),
          getItemByIdApi(actualItemId)
        ]);
        quizQuestions = pq || [];
        levelVideo = lv || null;
        if (!c) setLevel(lev);
      } else {
        quizQuestions = getQuestionsByLevel(actualItemId);
        levelVideo = getVideoByLevel(actualItemId);
        setLevel(getLevelById(actualItemId));
      }
      if (c) return;
      if (quizQuestions.length === 0) {
        const sampleQuestions = [];
        for (let i = 1; i <= 50; i++) {
          sampleQuestions.push({
            id: `q_${actualItemId}_${i}`,
            itemId: actualItemId,
            levelId: actualItemId,
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
        setQuestions(quizQuestions.slice(0, 50));
      }
      if (levelVideo && !isBackendOn() && levelVideo.isFileUpload && levelVideo.url?.startsWith('indexeddb://')) {
        try {
          const videoFile = await getVideoFile(actualItemId);
          setVideo(videoFile ? { ...levelVideo, url: videoFile.url } : levelVideo);
        } catch (e) {
          setVideo(levelVideo);
        }
      } else {
        setVideo(levelVideo);
      }
    };
    load();
    return () => { c = true; };
  }, [actualItemId]);

  const currentQuestion = questions[currentIndex];

  const handleAnswerSelect = (answerId) => {
    if (showResult) return;
    
    setSelectedAnswer(answerId);
    setShowResult(true);
    
    // Save answer
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: answerId,
    };
    setAnswers(newAnswers);
    
    // Auto-save progress
    saveProgress(newAnswers, currentIndex);
  };
  
  // Check if user's answer is correct
  const isUserAnswerCorrect = () => {
    const userAnswer = answers[currentQuestion.id] || selectedAnswer;
    const correctAnswer = currentQuestion.answers.find(a => a.isCorrect);
    return userAnswer === correctAnswer?.id;
  };
  
  // Save progress to localStorage
  const saveProgress = (currentAnswers, index) => {
    localStorage.setItem(progressKey, JSON.stringify({
      savedAnswers: currentAnswers,
      savedIndex: index,
      timestamp: Date.now()
    }));
  };
  
  // Pause exam
  const handlePause = () => {
    saveProgress(answers, currentIndex);
    setIsPaused(true);
    alert(isArabicBrowser() 
      ? 'تم حفظ تقدمك. يمكنك العودة لاحقاً لإكمال الاختبار.' 
      : 'Your progress has been saved. You can return later to complete the exam.');
  };
  
  // Resume exam
  const handleResume = () => {
    setIsPaused(false);
  };
  
  // Navigate to specific question
  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setSelectedAnswer(answers[questions[index].id] || null);
      setShowResult(!!answers[questions[index].id]);
      saveProgress(answers, index);
    }
  };
  
  // Clear saved progress when exam is finished
  const clearSavedProgress = () => {
    localStorage.removeItem(progressKey);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedAnswer(answers[questions[nextIndex].id] || null);
      setShowResult(!!answers[questions[nextIndex].id]);
      saveProgress(answers, nextIndex);
    } else {
      // Quiz finished, calculate score
      calculateScore();
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    
    questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const correctAnswer = question.answers.find(a => a.isCorrect);
      
      if (userAnswer === correctAnswer?.id) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    
    // Clear saved progress
    clearSavedProgress();
    
    // Save final score
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
    const isUserAnswer = userAnswer === answer.id;
    const isCorrectAnswer = answer.isCorrect;

    // If user answered correctly
    if (isUserAnswer && isCorrectAnswer) {
      // User selected the correct answer - green background
      return 'bg-green-500 text-white';
    }
    
    // If user answered incorrectly
    if (isUserAnswer && !isCorrectAnswer) {
      // User selected wrong answer - red background
      return 'bg-red-500 text-white';
    }
    
    // If this is the correct answer but user didn't select it
    if (!isUserAnswer && isCorrectAnswer) {
      // Correct answer (user didn't select it) - green background
      return 'bg-green-500 text-white';
    }
    
    // All other answers - default gray
    return 'bg-gray-100 text-dark-600';
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
      
      {/* Paused Overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="text-6xl mb-4">⏸️</div>
            <h2 className="text-2xl font-bold mb-4 text-dark-600">
              {isArabicBrowser() ? 'الاختبار متوقف مؤقتاً' : 'Exam Paused'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isArabicBrowser() 
                ? `لقد أجبت على ${Object.keys(answers).length} من ${questions.length} سؤال` 
                : `You have answered ${Object.keys(answers).length} of ${questions.length} questions`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleResume}
                className="flex-1 bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition font-medium"
              >
                {isArabicBrowser() ? 'استئناف الاختبار' : 'Resume Exam'}
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition font-medium"
              >
                {isArabicBrowser() ? 'الخروج' : 'Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto flex gap-4">
          {/* Sidebar */}
          <div className={`${showSidebar ? 'w-64 opacity-100' : 'w-0 opacity-0'} transition-all duration-300 flex-shrink-0 overflow-hidden`}>
            <div className="bg-white rounded-xl shadow-lg p-4 sticky top-4 w-64">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{isArabicBrowser() ? 'الأسئلة' : 'Questions'}</h3>
              </div>
                
                {/* Progress Summary */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">
                    {isArabicBrowser() ? 'التقدم' : 'Progress'}
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.keys(answers).length} / {questions.length}
                  </div>
                </div>
                
                {/* Question Grid */}
                <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto">
                  {questions.map((question, index) => {
                    const isAnswered = !!answers[question.id];
                    const isCurrent = index === currentIndex;
                    
                    return (
                      <button
                        key={question.id}
                        onClick={() => goToQuestion(index)}
                        className={`
                          aspect-square rounded-lg font-bold text-sm transition-all
                          ${isCurrent ? 'ring-4 ring-primary-500' : ''}
                          ${isAnswered ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                        `}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                
                {/* Actions */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handlePause}
                    className="w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition font-medium flex items-center justify-center gap-2"
                  >
                    ⏸️ {isArabicBrowser() ? 'إيقاف مؤقت' : 'Pause'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(isArabicBrowser() ? 'هل أنت متأكد من إنهاء الاختبار؟' : 'Are you sure you want to finish the exam?')) {
                        calculateScore();
                      }
                    }}
                    className="w-full bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                  >
                    {isArabicBrowser() ? 'إنهاء الاختبار' : 'Finish Exam'}
                  </button>
                </div>
              </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Toggle Sidebar Button - Always Visible */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition flex items-center gap-2 shadow-lg"
              title={showSidebar ? 'إخفاء القائمة / Hide Sidebar' : 'إظهار القائمة / Show Sidebar'}
            >
              {showSidebar ? '◀' : '▶'} 
              <span className="hidden sm:inline">
                {showSidebar 
                  ? (isArabicBrowser() ? 'إخفاء القائمة' : 'Hide') 
                  : (isArabicBrowser() ? 'إظهار القائمة' : 'Show')}
              </span>
            </button>
            
            <button
              onClick={() => navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`)}
              className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium"
            >
              ← {isArabicBrowser() ? 'رجوع' : 'Back'}
            </button>
          </div>
          
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
          <div className="mb-8">
            {/* Question Image */}
            {currentQuestion?.image && (
              <div className={`mb-4 flex ${
                currentQuestion.imageAlign === 'left' ? 'justify-start' : 
                currentQuestion.imageAlign === 'right' ? 'justify-end' : 
                'justify-center'
              }`}>
                <img
                  src={currentQuestion.image}
                  alt="Question"
                  className="rounded-lg border shadow-md object-contain"
                  style={{
                    width: currentQuestion.imageScale ? `${currentQuestion.imageScale}%` : '100%',
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: '500px'
                  }}
                />
              </div>
            )}
            <p className="text-xs md:text-sm text-dark-500 mb-2 font-medium">
              السؤال {currentIndex + 1} من {questions.length}
            </p>
            <div className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 leading-relaxed mb-4">
              <MathRenderer html={currentQuestion?.question || ''} inline={false} />
            </div>
            {!isArabicBrowser() && currentQuestion?.questionEn && (
              <div className="text-base md:text-lg text-dark-600 font-medium mb-4">
                <MathRenderer html={currentQuestion.questionEn} inline={false} />
              </div>
            )}
          </div>

          {/* Separator between question and answers */}
          <div className="border-t-2 border-gray-200 my-4"></div>

          <div className="space-y-3 answers-container" style={{ position: 'relative', zIndex: 20, backgroundColor: 'white' }}>
            {currentQuestion?.answers.map((answer) => (
              <button
                key={answer.id}
                onClick={() => handleAnswerSelect(answer.id)}
                disabled={showResult}
                style={{ position: 'relative', zIndex: 21 }}
                className={`
                  w-full text-right p-4 rounded-lg transition-all duration-200
                  ${getAnswerStyle(answer)}
                  ${showResult ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base md:text-lg">
                    <MathRenderer html={answer.text || answer.textEn || ''} inline={true} />
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          {/* Explanation - shown when answer is wrong */}
          {showResult && !isUserAnswerCorrect() && currentQuestion?.explanation && (
            <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-300 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-3xl">💡</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">
                    {isArabicBrowser() ? 'شرح الإجابة الصحيحة:' : 'Explanation of Correct Answer:'}
                  </h3>
                  <div className="text-blue-800 leading-relaxed">
                    <MathRenderer html={currentQuestion.explanation} inline={false} />
                  </div>
                </div>
              </div>
            </div>
          )}
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


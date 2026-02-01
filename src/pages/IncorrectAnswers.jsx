import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MathRenderer from "../components/MathRenderer";
import {
  isBackendOn,
  getIncorrectAnswers,
  removeIncorrectAnswer,
} from "../services/backendApi";
import { isArabicBrowser } from "../utils/language";

const IncorrectAnswers = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [removeOnCorrect, setRemoveOnCorrect] = useState(true);

  useEffect(() => {
    if (!isBackendOn()) {
      setError("يجب تسجيل الدخول لرؤية الأجوبة الخاطئة");
      setLoading(false);
      return;
    }
    getIncorrectAnswers()
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setCurrentIndex(0);
      })
      .catch((e) => setError(e?.message || "حدث خطأ أثناء التحميل"))
      .finally(() => setLoading(false));
  }, []);

  const currentItem = items[currentIndex];
  const snapshot = currentItem?.question_snapshot || {};
  const answers = snapshot.answers || [];
  const correctId = currentItem?.correct_answer_id;

  const handleAnswerSelect = (answerId) => {
    if (showResult) return;
    setSelectedAnswer(answerId);
    setShowResult(true);
    if (removeOnCorrect && answerId === correctId) {
      removeIncorrectAnswer(currentItem.question_id)
        .then(() => {
          const next = items.filter(
            (i) => i.question_id !== currentItem.question_id
          );
          setItems(next);
          setCurrentIndex(Math.min(currentIndex, Math.max(0, next.length - 1)));
          setSelectedAnswer(null);
          setShowResult(false);
        })
        .catch(console.warn);
    }
  };

  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const getAnswerStyle = (answer) => {
    if (!showResult) {
      return selectedAnswer === answer.id
        ? "bg-primary-500 text-white"
        : "bg-gray-100 hover:bg-gray-200 text-dark-600";
    }
    const isUserAnswer = selectedAnswer === answer.id;
    const isCorrect = answer.id === correctId;
    if (isUserAnswer && isCorrect) return "bg-green-500 text-white";
    if (isUserAnswer && !isCorrect) return "bg-red-500 text-white";
    if (!isUserAnswer && isCorrect) return "bg-green-500 text-white";
    return "bg-gray-100 text-dark-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-xl text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/tracker")}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            العودة للتتبع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-200 text-dark-600"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-dark-600 flex-1">
            الأجوبة الخاطئة
          </h1>
          <span className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold">
            {items.length} سؤال خاطئ
          </span>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-xl text-gray-600 mb-4">
              لا توجد أجوبة خاطئة للمراجعة
            </p>
            <button
              onClick={() => navigate("/courses")}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              ابدأ التدريب
            </button>
          </div>
        ) : (
          <>
            {/* Review card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-dark-700 mb-1">
                    أجوبة خاطئة تحتاج مراجعة
                  </h2>
                  <p className="text-gray-600">
                    لديك {items.length} سؤال بحاجة إلى مراجعة وإعادة حل
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removeOnCorrect}
                      onChange={(e) => setRemoveOnCorrect(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">
                      حذف السؤال من الأجوبة الخاطئة عند الإجابة الصحيحة
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Question display */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 bg-gray-200 rounded text-sm">
                  التدريب
                </span>
                <span className="px-3 py-1 bg-gray-200 rounded text-sm">
                  السؤال {currentIndex + 1}
                </span>
              </div>
              <p className="text-gray-500 mb-4">
                السؤال {currentIndex + 1} من {items.length}
              </p>

              <div className="mb-6">
                <MathRenderer html={snapshot.question || ""} inline={false} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {answers.map((ans) => (
                  <button
                    key={ans.id}
                    onClick={() => handleAnswerSelect(ans.id)}
                    disabled={showResult}
                    className={`p-4 rounded-lg text-right transition ${getAnswerStyle(
                      ans
                    )}`}
                  >
                    <MathRenderer html={ans.text || ""} inline={true} />
                  </button>
                ))}
              </div>

              {showResult && snapshot.explanation && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-bold text-green-800 mb-2">الشرح</h3>
                  <MathRenderer html={snapshot.explanation} inline={false} />
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-lg bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex >= items.length - 1}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default IncorrectAnswers;

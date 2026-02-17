import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import MathRenderer from "../../components/MathRenderer";
import { isArabicBrowser } from "../../utils/language";
import {
  getQuestionsByLevel as getQuestionsByLevelApi,
  getAdminIncorrectAnswers,
  getItemById as getItemByIdApi,
  getQuizAttempts,
  isBackendOn,
} from "../../services/backendApi";

function flattenQuestionsForQuiz(raw) {
  const out = [];
  for (const q of raw || []) {
    if (q.type === "passage" || q.question_type === "passage") {
      let pqList = Array.isArray(q.questions)
        ? q.questions
        : q.passage_questions || [];
      if (!Array.isArray(pqList)) pqList = [];
      if (pqList.length === 0) continue;
      const passageText = (q.passageText || q.passage_text || "").trim();
      for (let idx = 0; idx < pqList.length; idx++) {
        const pq = pqList[idx];
        const sid = pq.id || `passage_${q.id}_${idx}`;
        const subHtml = (pq.question || "").trim();
        const combined = passageText
          ? `<div class="mb-4 text-dark-600 leading-relaxed">${passageText}</div><div class="font-semibold text-primary-600 mb-2">السؤال ${idx + 1}:</div><div>${subHtml}</div>`
          : subHtml;
        const answers = Array.isArray(pq.answers) ? pq.answers : [];
        out.push({
          id: sid,
          question: combined,
          questionEn: null,
          explanation: pq.explanation || null,
          image: null,
          answers,
          itemId: q.itemId,
          levelId: q.levelId,
        });
      }
    } else {
      out.push(q);
    }
  }
  return out;
}

/** Read-only quiz view: show student's answers (from incorrect_answers + assumed correct for rest). Admin can only navigate. */
const AdminQuizReview = () => {
  const { userId, lessonId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lessonName, setLessonName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    if (!lessonId || !userId || !isBackendOn()) {
      setLoading(false);
      setError("غير متاح بدون تشغيل الـ Backend");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [rawQuestions, incorrectList, lesson, attempts] = await Promise.all([
          getQuestionsByLevelApi(lessonId),
          getAdminIncorrectAnswers(userId, lessonId),
          getItemByIdApi(lessonId),
          getQuizAttempts({ user_id: userId, lesson_id: lessonId }),
        ]);
        if (!cancelled) setAttemptCount(attempts?.length || 0);
        if (cancelled) return;
        const flat = flattenQuestionsForQuiz(rawQuestions || []);
        setQuestions(flat);
        setLessonName(lesson?.name || "واجب");

        const incorrectMap = {};
        for (const ia of incorrectList || []) {
          incorrectMap[ia.question_id] = ia.user_answer_id;
        }
        const answers = {};
        for (const q of flat) {
          const wrongChoice = incorrectMap[q.id];
          if (wrongChoice != null && wrongChoice !== "") {
            answers[q.id] = wrongChoice;
          } else {
            const correct = (q.answers || []).find((a) => a.isCorrect);
            if (correct) answers[q.id] = correct.id;
          }
        }
        setStudentAnswers(answers);
      } catch (e) {
        if (!cancelled) setError(e?.message || "فشل التحميل");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lessonId, userId]);

  const currentQuestion = questions[currentIndex];
  const selectedAnswerId = currentQuestion ? studentAnswers[currentQuestion.id] : null;

  const getAnswerStyle = (answer) => {
    const isUserAnswer = selectedAnswerId === answer.id;
    const isCorrectAnswer = answer.isCorrect;
    if (isUserAnswer && isCorrectAnswer) return "bg-green-500 text-white";
    if (isUserAnswer && !isCorrectAnswer) return "bg-red-500 text-white";
    if (!isUserAnswer && isCorrectAnswer) return "bg-green-500 text-white";
    return "bg-gray-100 text-dark-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-xl text-gray-600">جاري تحميل إجابات الطالب...</p>
        </div>
      </div>
    );
  }
  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-xl text-red-600 mb-4">{error || "لا توجد أسئلة لهذا الواجب"}</p>
          <button
            onClick={() => navigate("/admin/tracker")}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            رجوع للتتبع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={() => navigate("/admin/tracker")}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← رجوع لتتبع الطلاب
            </button>
            <h1 className="text-lg md:text-xl font-bold text-dark-600">
              عرض إجابات الطالب — {lessonName}
            </h1>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            وضع عرض فقط — يمكنك التنقل بين الأسئلة دون تعديل
          </p>
          {attemptCount === 0 && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
              الطالب لم يختبر هذا الواجب بعد — عرض الأسئلة فقط
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <p className="text-sm text-dark-500 mb-4">
              السؤال {currentIndex + 1} من {questions.length}
            </p>
            <div className="text-lg md:text-xl font-bold text-dark-600 leading-relaxed mb-4">
              <MathRenderer html={currentQuestion?.question || ""} inline={false} />
            </div>
            {currentQuestion?.image && (
              <div className="my-4 flex justify-center">
                <img
                  src={currentQuestion.image}
                  alt=""
                  className="max-h-64 rounded-lg border object-contain"
                />
              </div>
            )}
            <div className="space-y-3 mt-4">
              {(currentQuestion?.answers || []).map((answer) => (
                <div
                  key={answer.id}
                  className={`w-full text-right p-4 rounded-lg ${getAnswerStyle(answer)}`}
                >
                  <MathRenderer html={answer.text || ""} inline={true} />
                  {answer.isCorrect && (
                    <span className="mr-2 text-green-800 font-bold">✓</span>
                  )}
                </div>
              ))}
            </div>
            {currentQuestion?.explanation && (
              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h3 className="text-base font-bold text-blue-900 mb-2">شرح الإجابة:</h3>
                <MathRenderer html={currentQuestion.explanation} inline={false} />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← السابق
            </button>
            <div className="flex gap-2 flex-wrap justify-center">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-10 h-10 rounded-lg font-medium transition ${
                    idx === currentIndex
                      ? "bg-primary-500 text-white"
                      : "bg-gray-200 text-dark-600 hover:bg-gray-300"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              disabled={currentIndex === questions.length - 1}
              className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuizReview;

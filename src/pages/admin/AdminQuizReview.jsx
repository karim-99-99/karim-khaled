import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import MathRenderer from "../../components/MathRenderer";
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
          explanation: pq.explanation || null,
          image: null,
          answers,
        });
      }
    } else {
      out.push(q);
    }
  }
  return out;
}

/** Build a display question from IncorrectAnswer row (live quiz q or snapshot). */
function questionFromIncorrect(ia, liveById) {
  const live = liveById.get(ia.question_id);
  const snap = ia.question_snapshot || {};
  return {
    id: ia.question_id,
    question: live?.question || snap.question || "",
    explanation: live?.explanation || snap.explanation || null,
    image: live?.image || snap.image || null,
    answers: Array.isArray(live?.answers)
      ? live.answers
      : Array.isArray(snap.answers)
        ? snap.answers
        : [],
    userAnswerId: ia.user_answer_id || "",
    correctAnswerId: ia.correct_answer_id || "",
  };
}

/**
 * Admin read-only review: show how many questions the student solved,
 * and only the wrong answers for that bank/lesson.
 */
const AdminQuizReview = () => {
  const { userId, lessonId } = useParams();
  const navigate = useNavigate();
  const [wrongQuestions, setWrongQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lessonName, setLessonName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSolved: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastScore: null,
    attemptCount: 0,
  });

  useEffect(() => {
    if (!lessonId || !userId || !isBackendOn()) {
      setLoading(false);
      setError("غير متاح بدون تشغيل الـ Backend");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [rawQuestions, incorrectList, lesson, attempts] =
          await Promise.all([
            getQuestionsByLevelApi(lessonId).catch(() => []),
            getAdminIncorrectAnswers(userId, lessonId),
            getItemByIdApi(lessonId).catch(() => null),
            getQuizAttempts({ user_id: userId, lesson_id: lessonId }),
          ]);
        if (cancelled) return;

        setLessonName(lesson?.name || "واجب");

        const attemptList = Array.isArray(attempts) ? attempts : [];
        const latest = attemptList[0] || null;
        const incorrectArr = Array.isArray(incorrectList) ? incorrectList : [];
        const incorrectCount = incorrectArr.length;
        const totalSolved = Number(latest?.total_questions) || 0;
        const correctCount =
          latest != null
            ? Number(latest.correct_count ?? 0)
            : Math.max(0, totalSolved - incorrectCount);

        setStats({
          totalSolved,
          correctCount,
          incorrectCount,
          lastScore: latest?.score ?? null,
          attemptCount: attemptList.length,
        });

        const flat = flattenQuestionsForQuiz(rawQuestions || []);
        const liveById = new Map(flat.map((q) => [q.id, q]));
        const wrong = incorrectArr.map((ia) =>
          questionFromIncorrect(ia, liveById)
        );
        setWrongQuestions(wrong);
        setCurrentIndex(0);
      } catch (e) {
        if (!cancelled) setError(e?.message || "فشل التحميل");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, userId]);

  const currentQuestion = wrongQuestions[currentIndex];
  const selectedAnswerId = currentQuestion?.userAnswerId;

  const getAnswerStyle = (answer) => {
    const isUserAnswer = selectedAnswerId === answer.id;
    const isCorrectAnswer =
      answer.isCorrect ||
      answer.id === currentQuestion?.correctAnswerId;
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-xl text-red-600 mb-4">{error}</p>
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
              مراجعة إجابات الطالب — {lessonName}
            </h1>
          </div>

          {/* Summary: how many questions the student solved in this bank/lesson */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 border-t-4 border-primary-500 shadow-sm">
              <div className="text-2xl font-bold text-primary-600">
                {stats.totalSolved}
              </div>
              <div className="text-sm text-gray-600">أسئلة حلّها الطالب</div>
            </div>
            <div className="bg-white rounded-xl p-4 border-t-4 border-green-500 shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {stats.correctCount}
              </div>
              <div className="text-sm text-gray-600">إجابات صحيحة</div>
            </div>
            <div className="bg-white rounded-xl p-4 border-t-4 border-red-500 shadow-sm">
              <div className="text-2xl font-bold text-red-600">
                {stats.incorrectCount}
              </div>
              <div className="text-sm text-gray-600">إجابات خاطئة</div>
            </div>
            <div className="bg-white rounded-xl p-4 border-t-4 border-amber-500 shadow-sm">
              <div className="text-2xl font-bold text-amber-600">
                {stats.lastScore != null ? `${Math.round(stats.lastScore)}%` : "—"}
              </div>
              <div className="text-sm text-gray-600">آخر درجة</div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            للمراجعة: تظهر فقط الأسئلة التي أخطأ فيها الطالب في هذا البنك/الواجب.
          </p>

          {wrongQuestions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-lg text-green-700 font-semibold mb-2">
                لا توجد إجابات خاطئة للمراجعة
              </p>
              <p className="text-gray-600">
                {stats.totalSolved > 0
                  ? `الطالب حلّ ${stats.totalSolved} سؤالاً دون أخطاء مسجّلة.`
                  : "لا توجد محاولات مسجّلة لهذا الواجب بعد."}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <p className="text-sm text-dark-500 mb-4">
                  خطأ {currentIndex + 1} من {wrongQuestions.length}
                </p>
                <div className="text-lg md:text-xl font-bold text-dark-600 leading-relaxed mb-4">
                  <MathRenderer
                    html={currentQuestion?.question || ""}
                    inline={false}
                  />
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
                      {(answer.isCorrect ||
                        answer.id === currentQuestion?.correctAnswerId) && (
                        <span className="mr-2 text-green-800 font-bold">✓ صحيحة</span>
                      )}
                      {selectedAnswerId === answer.id &&
                        !(
                          answer.isCorrect ||
                          answer.id === currentQuestion?.correctAnswerId
                        ) && (
                          <span className="mr-2 font-bold">✗ إجابة الطالب</span>
                        )}
                    </div>
                  ))}
                </div>
                {currentQuestion?.explanation && (
                  <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <h3 className="text-base font-bold text-blue-900 mb-2">
                      شرح الإجابة:
                    </h3>
                    <MathRenderer
                      html={currentQuestion.explanation}
                      inline={false}
                    />
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
                <div className="flex gap-2 flex-wrap justify-center max-w-md">
                  {wrongQuestions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-10 h-10 rounded-lg font-medium transition ${
                        idx === currentIndex
                          ? "bg-red-500 text-white"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentIndex((i) =>
                      Math.min(wrongQuestions.length - 1, i + 1)
                    )
                  }
                  disabled={currentIndex === wrongQuestions.length - 1}
                  className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminQuizReview;

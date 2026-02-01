import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { isArabicBrowser } from "../utils/language";
import {
  isBackendOn,
  getStudentTrackerSummary,
} from "../services/backendApi";

const StudentTracker = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isBackendOn()) {
      setError("يجب تسجيل الدخول لرؤية التتبع");
      setLoading(false);
      return;
    }
    getStudentTrackerSummary()
      .then(setData)
      .catch((e) => {
        setError(e?.message || "حدث خطأ أثناء تحميل التتبع");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-xl text-gray-600">جاري التحميل...</p>
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
            onClick={() => navigate("/courses")}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            العودة للدورات
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const examProgress = data?.exam_progress || [];
  const completed = examProgress.filter((e) => e.status === "completed");
  const notStarted = examProgress.filter((e) => e.status === "not_started");
  const totalVideoWatches = Object.values(data?.video_watches || {}).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-primary-600 hover:text-primary-700 font-medium mb-4"
          >
            ← رجوع
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-dark-600">
            {isArabicBrowser() ? "متابعة التقدم" : "Progress Tracker"}
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-green-500">
            <div className="text-3xl font-bold text-green-600">
              {stats.completed ?? 0}
            </div>
            <div className="text-sm text-gray-600">
              {isArabicBrowser() ? "واجبات مكتملة" : "Completed"}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-amber-500">
            <div className="text-3xl font-bold text-amber-600">
              {stats.not_started ?? 0}
            </div>
            <div className="text-sm text-gray-600">
              {isArabicBrowser() ? "لم تبدأ بعد" : "Not Started"}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-600">
              {stats.total_exams ?? 0}
            </div>
            <div className="text-sm text-gray-600">
              {isArabicBrowser() ? "إجمالي الواجبات" : "Total Exams"}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-600">
              {totalVideoWatches}
            </div>
            <div className="text-sm text-gray-600">
              {isArabicBrowser() ? "مرات مشاهدة الفيديو" : "Video Watches"}
            </div>
          </div>
        </div>

        {/* Progress Chart (simple bars) */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-dark-600 mb-4">
            {isArabicBrowser() ? "نسبة إكمال الواجبات" : "Exam Completion"}
          </h2>
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{
                width: `${
                  stats.total_exams
                    ? Math.round((stats.completed / stats.total_exams) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {stats.total_exams
              ? Math.round((stats.completed / stats.total_exams) * 100)
              : 0}
            % {isArabicBrowser() ? "مكتمل" : "complete"}
          </p>
        </div>

        {/* Exam list */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-dark-600 mb-4">
            {isArabicBrowser() ? "تفاصيل الواجبات" : "Exam Details"}
          </h2>
          {examProgress.length === 0 ? (
            <p className="text-gray-600">
              {isArabicBrowser()
                ? "لا توجد واجبات مسجلة بعد"
                : "No exams recorded yet"}
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {examProgress.map((ex) => (
                <div
                  key={ex.lesson_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-dark-700 truncate">
                      {ex.lesson_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ex.subject_name} / {ex.category_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ex.status === "completed" ? (
                      <>
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-sm font-bold">
                          {ex.last_score}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {ex.attempt_count}{" "}
                          {isArabicBrowser() ? "محاولة" : "attempts"}
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-sm">
                        {isArabicBrowser() ? "لم يبدأ" : "Not started"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentTracker;

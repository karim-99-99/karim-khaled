import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { isArabicBrowser } from "../utils/language";
import { isBackendOn, getStudentTrackerSummary } from "../services/backendApi";
import AverageChart from "../components/AverageChart";

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
  const totalVideoWatches = Object.values(data?.video_watches || {}).reduce(
    (a, b) => a + b,
    0
  );
  const performanceBySubject = data?.performance_by_subject || [];
  const chartData = data?.chart_data || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-primary-600 hover:text-primary-700 font-medium mb-4"
          >
            ← رجوع
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-dark-600 text-center mb-2">
            تابع أداءك في جميع فئات التدريب واكتشف نقاط القوة والضعف لتحسين
            مستواك
          </h1>
        </div>

        {/* Link to Incorrect Answers */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/incorrect-answers")}
            className="w-full md:w-auto px-6 py-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition font-medium flex items-center justify-center gap-2"
          >
            <span>الأجوبة الخاطئة</span>
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-sm">
              للمراجعة
            </span>
          </button>
        </div>

        {/* Performance by subject cards - like the first image */}
        <div className="space-y-6 mb-8">
          {(performanceBySubject.length > 0
            ? performanceBySubject
            : [
                { subject: "اللفظي", items: [] },
                { subject: "الكمي", items: [] },
              ]
          ).map((subj) => (
            <div
              key={subj.subject}
              className={`rounded-2xl shadow-lg overflow-hidden ${
                subj.subject?.includes("لفظ") ? "bg-blue-50" : "bg-green-50"
              }`}
            >
              <div
                className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                  subj.subject?.includes("لفظ") ? "bg-blue-100" : "bg-green-100"
                }`}
              >
                <h2 className="text-xl font-bold text-dark-700">
                  {subj.subject}
                </h2>
                <button
                  onClick={() => navigate("/courses")}
                  className={`px-6 py-2 rounded-xl font-medium transition ${
                    subj.subject?.includes("لفظ")
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  اكمل التدريب
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
                  {subj.items?.length > 0 ? (
                    subj.items.map((item) => (
                      <div
                        key={item.name}
                        className="flex flex-col items-center gap-2 min-w-[80px]"
                      >
                        <div className="w-12 h-32 bg-gray-200 rounded-lg overflow-hidden flex flex-col-reverse">
                          <div
                            className={`w-full transition-all ${
                              subj.subject?.includes("لفظ")
                                ? "bg-blue-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              height: `${Math.min(100, item.progress || 0)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-dark-600 text-center">
                          {item.name}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            subj.subject?.includes("لفظ")
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        >
                          {item.progress || 0}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 py-4">
                      ابدأ التدريب لرصد تقدمك في هذا القسم
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-green-500">
            <div className="text-3xl font-bold text-green-600">
              {stats.completed ?? 0}
            </div>
            <div className="text-sm text-gray-600">واجبات مكتملة</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-amber-500">
            <div className="text-3xl font-bold text-amber-600">
              {stats.not_started ?? 0}
            </div>
            <div className="text-sm text-gray-600">لم تبدأ بعد</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-600">
              {stats.total_exams ?? 0}
            </div>
            <div className="text-sm text-gray-600">إجمالي الواجبات</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-600">
              {totalVideoWatches}
            </div>
            <div className="text-sm text-gray-600">مرات مشاهدة الفيديو</div>
          </div>
        </div>

        {/* Average charts */}
        {(chartData?.overall_avg > 0 ||
          chartData?.by_subject?.length > 0 ||
          chartData?.by_category?.length > 0) && (
          <div className="space-y-4 mb-8">
            {chartData?.overall_avg > 0 && (
              <div className="bg-white rounded-xl shadow p-6 border-t-4 border-primary-500">
                <h2 className="text-lg font-bold text-dark-600 mb-2">
                  المتوسط الإجمالي
                </h2>
                <div className="text-4xl font-bold text-primary-600">
                  {chartData.overall_avg}%
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chartData?.by_subject?.length > 0 && (
                <AverageChart
                  data={chartData.by_subject}
                  title="متوسط الدرجات حسب المادة"
                />
              )}
              {chartData?.by_category?.length > 0 && (
                <AverageChart
                  data={chartData.by_category}
                  title="متوسط الدرجات حسب التصنيف"
                />
              )}
            </div>
          </div>
        )}

        {/* Exam list */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-dark-600 mb-4">
            تفاصيل الواجبات
          </h2>
          {examProgress.length === 0 ? (
            <p className="text-gray-600">لا توجد واجبات مسجلة بعد</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {examProgress.map((ex) => (
                <div
                  key={ex.lesson_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
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
                          {ex.attempt_count} محاولة
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-sm">
                        لم يبدأ
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

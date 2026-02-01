import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { isArabicBrowser } from "../../utils/language";
import { getAdminTrackerSummary } from "../../services/backendApi";

const formatDuration = (seconds) => {
  if (!seconds || seconds < 60) return `${Math.round(seconds || 0)} ث`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m} د ${s} ث` : `${m} د`;
};

const AdminTracker = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAdminTrackerSummary()
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
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-xl text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            العودة للوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  const students = data?.students || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="text-primary-600 hover:text-primary-700 font-medium mb-4"
          >
            ← رجوع للوحة التحكم
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-dark-600">
            {isArabicBrowser() ? "تتبع الطلاب" : "Student Tracker"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isArabicBrowser()
              ? "متابعة تقدم الطلاب ونتائجهم"
              : "Track student progress and exam performance"}
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-primary-500">
            <div className="text-3xl font-bold text-primary-600">
              {students.length}
            </div>
            <div className="text-sm text-gray-600">
              {isArabicBrowser() ? "عدد الطلاب" : "Students"}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-green-500">
            <div className="text-3xl font-bold text-green-600">
              {students.reduce((a, s) => a + (s.total_exam_attempts || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">
              {isArabicBrowser() ? "إجمالي محاولات الواجبات" : "Total Attempts"}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-600">
              {students.length
                ? Math.round(
                    students.reduce((a, s) => a + (s.avg_exam_score || 0), 0) /
                      students.length
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-gray-600">
              {isArabicBrowser() ? "متوسط الدرجات" : "Avg Score"}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-600">
              {students.reduce(
                (a, s) => a + (s.total_video_watches || 0),
                0
              )}
            </div>
            <div className="text-sm text-gray-600">
              {isArabicBrowser() ? "إجمالي مشاهدة الفيديو" : "Video Watches"}
            </div>
          </div>
        </div>

        {/* Students table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    {isArabicBrowser() ? "الطالب" : "Student"}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    {isArabicBrowser() ? "محاولات الواجبات" : "Exam Attempts"}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    {isArabicBrowser() ? "متوسط الدرجة" : "Avg Score"}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    {isArabicBrowser() ? "متوسط الوقت" : "Avg Time"}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    {isArabicBrowser() ? "مشاهدة الفيديو" : "Video Watches"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {isArabicBrowser()
                        ? "لا يوجد طلاب مسجلين"
                        : "No students registered"}
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr
                      key={s.user_id}
                      className="border-t border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-dark-700">
                          {s.first_name || s.username}
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.total_exam_attempts || 0}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${
                            (s.avg_exam_score || 0) >= 80
                              ? "text-green-600"
                              : (s.avg_exam_score || 0) >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {s.avg_exam_score ?? 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDuration(s.avg_exam_duration_seconds)}
                      </td>
                      <td className="px-4 py-3">{s.total_video_watches || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTracker;

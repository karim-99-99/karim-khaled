import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { isArabicBrowser } from "../../utils/language";
import {
  getAdminTrackerSummary,
  getAdminStudentDetail,
} from "../../services/backendApi";

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
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getAdminTrackerSummary()
      .then(setData)
      .catch((e) => {
        setError(e?.message || "حدث خطأ أثناء تحميل التتبع");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStudentClick = (s) => {
    setSelectedStudent(s);
    setDetailData(null);
    setDetailLoading(true);
    getAdminStudentDetail(s.user_id)
      .then(setDetailData)
      .catch(() => setDetailData(null))
      .finally(() => setDetailLoading(false));
  };

  const closeDetail = () => {
    setSelectedStudent(null);
    setDetailData(null);
  };

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
              {students.reduce((a, s) => a + (s.total_video_watches || 0), 0)}
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
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    {isArabicBrowser() ? "تفاصيل" : "Details"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
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
                      onClick={() => handleStudentClick(s)}
                      className="border-t border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-dark-700">
                          {s.first_name || s.username}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.total_exam_attempts || 0}
                      </td>
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
                      <td className="px-4 py-3">
                        {s.total_video_watches || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-primary-600 font-medium">
                          عرض التفاصيل ←
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student detail modal */}
        {selectedStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closeDetail}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold text-dark-600">
                  تفاصيل تتبع:{" "}
                  {selectedStudent.first_name || selectedStudent.username}
                </h2>
                <button
                  onClick={closeDetail}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {detailLoading ? (
                  <p className="text-center py-8 text-gray-600">
                    جاري التحميل...
                  </p>
                ) : !detailData ? (
                  <p className="text-center py-8 text-red-600">
                    حدث خطأ في تحميل التفاصيل
                  </p>
                ) : (
                  <StudentDetailContent
                    items={detailData.items || []}
                    formatDuration={formatDuration}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Groups items by subject -> category -> chapter and renders detail rows */
function StudentDetailContent({ items, formatDuration }) {
  const groups = {};
  for (const it of items) {
    const sk = it.subject_id || "s";
    const ck = it.category_id || "c";
    const chk = it.chapter_id || "ch";
    if (!groups[sk]) groups[sk] = {};
    if (!groups[sk][ck]) groups[sk][ck] = {};
    if (!groups[sk][ck][chk]) groups[sk][ck][chk] = [];
    groups[sk][ck][chk].push(it);
  }

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([_, cats]) =>
        Object.entries(cats).map(([__, chaps]) =>
          Object.entries(chaps).map(([___, less]) => {
            const first = less[0];
            const catName = first?.category_name || "";
            const subjName = first?.subject_name || "";
            const chapName = first?.chapter_name || "";
            const isBank = first?.is_bank ?? false;
            const itemLabel = isBank ? "بنك" : "درس";
            return (
              <div
                key={`${subjName}-${catName}-${chapName}`}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <div className="bg-gray-100 px-4 py-2 font-bold text-dark-700">
                  {subjName} / {catName} / {chapName}
                </div>
                <div className="divide-y divide-gray-100">
                  {less.map((it) => (
                    <div
                      key={it.lesson_id}
                      className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-dark-700">
                            {it.lesson_name}
                          </span>
                          <span className="text-xs text-gray-500 mr-2">
                            {" "}
                            ({itemLabel})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
                          <span>
                            <span className="text-gray-500">محاولات:</span>{" "}
                            <span className="font-bold">
                              {it.attempt_count}
                            </span>
                          </span>
                          {it.attempt_count > 0 && (
                            <>
                              <span>
                                <span className="text-gray-500">آخر درجة:</span>{" "}
                                <span
                                  className={`font-bold ${
                                    (it.last_score || 0) >= 80
                                      ? "text-green-600"
                                      : (it.last_score || 0) >= 60
                                      ? "text-amber-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {it.last_score ?? 0}%
                                </span>
                              </span>
                              <span className="text-gray-600">
                                متوسط الوقت:{" "}
                                {formatDuration(it.avg_duration_seconds)}
                              </span>
                            </>
                          )}
                          <span>
                            <span className="text-gray-500">
                              مشاهدة الفيديو:
                            </span>{" "}
                            <span className="font-bold text-purple-600">
                              {it.video_watch_count}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )
      )}
      {items.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          لا توجد بيانات لهذا الطالب
        </p>
      )}
    </div>
  );
}

export default AdminTracker;

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
  const totalIncorrectAnswers = data?.total_incorrect_answers ?? 0;

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
          <h1 className="text-xl md:text-2xl font-bold text-dark-600 text-center mb-2">
            تابع أداء الطلاب في جميع فئات التدريب واكتشف نقاط القوة والضعف
          </h1>
          <p className="text-gray-600 text-center">
            متابعة تقدم الطلاب ونتائجهم
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-primary-500">
            <div className="text-3xl font-bold text-primary-600">
              {students.length}
            </div>
            <div className="text-sm text-gray-600">عدد الطلاب</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-green-500">
            <div className="text-3xl font-bold text-green-600">
              {students.reduce((a, s) => a + (s.total_exam_attempts || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">إجمالي محاولات الواجبات</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-red-500">
            <div className="text-3xl font-bold text-red-600">
              {totalIncorrectAnswers}
            </div>
            <div className="text-sm text-gray-600">إجمالي الأجوبة الخاطئة</div>
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
            <div className="text-sm text-gray-600">متوسط الدرجات</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-t-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-600">
              {students.reduce((a, s) => a + (s.total_video_watches || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">إجمالي مشاهدة الفيديو</div>
          </div>
        </div>

        {/* Students table - مع عدد المحاولات و الأجوبة الخاطئة */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    الطالب
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    عدد المحاولات
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    الأجوبة الخاطئة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    متوسط الدرجة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    متوسط الوقت
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    مشاهدة الفيديو
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-dark-700">
                    تفاصيل
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      لا يوجد طلاب مسجلين
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
                        <span className="font-bold text-green-600">
                          {s.total_exam_attempts || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${
                            (s.incorrect_answers_count || 0) > 0
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {s.incorrect_answers_count ?? 0}
                        </span>
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
                    incorrectCount={
                      selectedStudent.incorrect_answers_count ?? 0
                    }
                    attemptCount={selectedStudent.total_exam_attempts ?? 0}
                    onOpenLessonReview={(lessonId) => {
                      closeDetail();
                      navigate(
                        `/admin/tracker/student/${selectedStudent.user_id}/lesson/${lessonId}/review`
                      );
                    }}
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

/** Two lists: (1) Passed exams with attempts + video watches, (2) Not attempted. Click lesson → open read-only quiz review. */
function StudentDetailContent({
  items,
  formatDuration,
  incorrectCount,
  attemptCount,
  onOpenLessonReview,
}) {
  const passed = (items || []).filter((it) => (it.attempt_count || 0) > 0);
  const notAttempted = (items || []).filter((it) => (it.attempt_count || 0) === 0);

  const renderLessonRow = (it, showAttemptsAndVideo = true) => (
    <div
      key={it.lesson_id}
      onClick={() => onOpenLessonReview(it.lesson_id)}
      className="px-4 py-3 hover:bg-primary-50 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex-1 min-w-0">
        <span className="font-medium text-dark-700">{it.lesson_name}</span>
        <span className="text-xs text-gray-500 mr-2">
          {" "}
          ({it.is_bank ? "بنك" : "درس"}) — {it.subject_name} / {it.category_name} / {it.chapter_name}
        </span>
      </div>
      {showAttemptsAndVideo && (
        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
          <span>
            <span className="text-gray-500">عدد المحاولات:</span>{" "}
            <span className="font-bold text-green-600">{it.attempt_count}</span>
          </span>
          <span>
            <span className="text-gray-500">مشاهدة الفيديو:</span>{" "}
            <span className="font-bold text-purple-600">{it.video_watch_count ?? 0}</span>
          </span>
          {it.last_score != null && (
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
                {it.last_score}%
              </span>
            </span>
          )}
        </div>
      )}
      <span className="text-primary-600 font-medium text-sm">عرض إجابات الطالب ←</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border-t-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">{attemptCount}</div>
          <div className="text-sm text-gray-600">عدد المحاولات الإجمالي</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border-t-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
          <div className="text-sm text-gray-600">الأجوبة الخاطئة</div>
        </div>
      </div>

      {/* قائمة الواجبات التي اجتازها الطالب */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-green-100 px-4 py-3 font-bold text-dark-700">
          الواجبات التي اجتازها (عدد المحاولات + مشاهدة الفيديو)
        </div>
        <div className="divide-y divide-gray-100">
          {passed.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500">
              لم يجتز أي واجب بعد
            </div>
          ) : (
            passed.map((it) => renderLessonRow(it, true))
          )}
        </div>
      </div>

      {/* قائمة الواجبات التي لم يختبرها من قبل */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-200 px-4 py-3 font-bold text-dark-700">
          الواجبات التي لم يختبرها من قبل
        </div>
        <div className="divide-y divide-gray-100">
          {notAttempted.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500">
              لا يوجد — الطالب بدأ كل الواجبات
            </div>
          ) : (
            notAttempted.map((it) => renderLessonRow(it, false))
          )}
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-center text-gray-500 py-8">لا توجد بيانات لهذا الطالب</p>
      )}
    </div>
  );
}

export default AdminTracker;

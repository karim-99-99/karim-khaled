import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { isArabicBrowser } from "../../utils/language";
import {
  getAdminTrackerSummary,
  getAdminStudentDetail,
  getStudentGroups,
  getSections,
  getTrackerByLesson,
  isBackendOn,
} from "../../services/backendApi";

const formatDuration = (seconds) => {
  if (!seconds || seconds < 60) return `${Math.round(seconds || 0)} ث`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m} د ${s} ث` : `${m} د`;
};

const flattenGroups = (list, out = []) => {
  (list || []).forEach((g) => {
    out.push(g);
    if (g.children?.length) flattenGroups(g.children, out);
  });
  return out;
};

const AdminTracker = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);
  const [byLessonGroupId, setByLessonGroupId] = useState("");
  const [byLessonSubjectId, setByLessonSubjectId] = useState("");
  const [byLessonCategoryId, setByLessonCategoryId] = useState("");
  const [byLessonChapterId, setByLessonChapterId] = useState("");
  const [byLessonLessonId, setByLessonLessonId] = useState("");
  const [byLessonData, setByLessonData] = useState(null);
  const [byLessonLoading, setByLessonLoading] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  const subjects = (sections || []).flatMap((s) => s.subjects || []);
  const selectedSubject = subjects.find((s) => s.id === byLessonSubjectId);
  const categories = selectedSubject?.categories || [];
  const selectedCategory = categories.find((c) => c.id === byLessonCategoryId);
  const chapters = selectedCategory?.chapters || [];
  const selectedChapter = chapters.find((ch) => ch.id === byLessonChapterId);
  const lessons = selectedChapter?.items || [];

  useEffect(() => {
    getAdminTrackerSummary()
      .then(setData)
      .catch((e) => {
        setError(e?.message || "حدث خطأ أثناء تحميل التتبع");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isBackendOn()) return;
    getStudentGroups().then((list) => setGroups(Array.isArray(list) ? list : []));
  }, []);

  useEffect(() => {
    if (!isBackendOn()) return;
    getSections().then((list) => setSections(Array.isArray(list) ? list : list?.results || []));
  }, []);

  const loadTrackerByLesson = async () => {
    if (!byLessonGroupId || !byLessonLessonId) return;
    setByLessonLoading(true);
    try {
      const res = await getTrackerByLesson(byLessonGroupId, byLessonLessonId);
      setByLessonData(res);
    } catch (e) {
      setByLessonData(null);
    } finally {
      setByLessonLoading(false);
    }
  };

  const toggleGroup = (id) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

        {/* Groups (backend only) */}
        {isBackendOn() && groups.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
            <h2 className="text-lg font-bold text-dark-700 p-4 border-b">المجموعات</h2>
            <div className="p-4">
              {groups.map((g) => {
                const expanded = expandedGroupIds.has(g.id);
                const members = g.members || [];
                const studentMap = (data?.students || []).reduce((acc, s) => { acc[s.user_id] = s; return acc; }, {});
                return (
                  <div key={g.id} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup(g.id)}
                      className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center text-right font-bold text-dark-700"
                    >
                      <span>{g.name}</span>
                      <span>{expanded ? "▼" : "◀"} ({members.length} طالب)</span>
                    </button>
                    {expanded && (
                      <div className="divide-y">
                        {members.map((m) => {
                          const uid = m.user_id || m.user;
                          const stats = studentMap[uid];
                          const row = stats ? { ...stats, user_id: uid } : { user_id: uid, first_name: m.first_name || m.username, username: m.username };
                          return (
                            <div
                              key={uid}
                              onClick={() => handleStudentClick(row)}
                              className="px-4 py-3 hover:bg-primary-50 cursor-pointer flex justify-between items-center"
                            >
                              <span className="font-medium">{m.first_name || m.username} — {m.email}</span>
                              <span className="text-primary-600 text-sm">عرض التفاصيل ←</span>
                            </div>
                          );
                        })}
                        {members.length === 0 && <p className="px-4 py-3 text-gray-500">لا يوجد طلاب في هذه المجموعة</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* تتبع حسب الدرس */}
        {isBackendOn() && (
          <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
            <h2 className="text-lg font-bold text-dark-700 p-4 border-b">تتبع حسب الدرس</h2>
            <div className="p-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">المجموعة</label>
                <select
                  value={byLessonGroupId}
                  onChange={(e) => setByLessonGroupId(e.target.value)}
                  className="px-3 py-2 border rounded-lg min-w-[160px]"
                >
                  <option value="">اختر المجموعة</option>
                  {flattenGroups(groups).map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">لفظي أو كمي</label>
                <select
                  value={byLessonSubjectId}
                  onChange={(e) => {
                    setByLessonSubjectId(e.target.value);
                    setByLessonCategoryId("");
                    setByLessonChapterId("");
                    setByLessonLessonId("");
                  }}
                  className="px-3 py-2 border rounded-lg min-w-[140px]"
                >
                  <option value="">اختر القسم</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">تأسيس أو تجميع</label>
                <select
                  value={byLessonCategoryId}
                  onChange={(e) => {
                    setByLessonCategoryId(e.target.value);
                    setByLessonChapterId("");
                    setByLessonLessonId("");
                  }}
                  className="px-3 py-2 border rounded-lg min-w-[140px]"
                  disabled={!byLessonSubjectId}
                >
                  <option value="">اختر التصنيف</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">أقسام أو مستويات</label>
                <select
                  value={byLessonChapterId}
                  onChange={(e) => {
                    setByLessonChapterId(e.target.value);
                    setByLessonLessonId("");
                  }}
                  className="px-3 py-2 border rounded-lg min-w-[140px]"
                  disabled={!byLessonCategoryId}
                >
                  <option value="">اختر الفصل</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">الواجبات أو البنوك</label>
                <select
                  value={byLessonLessonId}
                  onChange={(e) => setByLessonLessonId(e.target.value)}
                  className="px-3 py-2 border rounded-lg min-w-[160px]"
                  disabled={!byLessonChapterId}
                >
                  <option value="">اختر الدرس / الواجب</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={loadTrackerByLesson}
                disabled={!byLessonGroupId || !byLessonLessonId || byLessonLoading}
                className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {byLessonLoading ? "جاري التحميل..." : "عرض"}
              </button>
            </div>
            {byLessonData && (
              <div className="overflow-x-auto p-4 border-t">
                <h3 className="font-bold text-dark-700 mb-2">{byLessonData.lesson_name} — {byLessonData.group_name}</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-2 text-right font-bold">الاسم</th>
                      <th className="px-2 py-2 text-right font-bold">البريد</th>
                      <th className="px-2 py-2 text-right font-bold">الحالة</th>
                      <th className="px-2 py-2 text-right font-bold">بدأ</th>
                      <th className="px-2 py-2 text-right font-bold">تم</th>
                      <th className="px-2 py-2 text-right font-bold">الفترة</th>
                      <th className="px-2 py-2 text-right font-bold">الدرجة</th>
                      {(byLessonData.questions || []).map((q) => (
                        <th key={q.id} className="px-2 py-2 text-right font-bold">{q.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(byLessonData.rows || []).map((r) => (
                      <tr key={r.user_id} className="border-t">
                        <td className="px-2 py-2">{r.first_name} {r.last_name}</td>
                        <td className="px-2 py-2">{r.email}</td>
                        <td className="px-2 py-2">{r.status}</td>
                        <td className="px-2 py-2 text-xs">{r.started_at ? new Date(r.started_at).toLocaleString("ar-SA") : "—"}</td>
                        <td className="px-2 py-2 text-xs">{r.completed_at ? new Date(r.completed_at).toLocaleString("ar-SA") : "—"}</td>
                        <td className="px-2 py-2">{r.duration_seconds ? `${Math.floor(r.duration_seconds / 60)} د` : "—"}</td>
                        <td className="px-2 py-2 font-bold">{r.score_total != null ? `${r.score_total} / ${r.score_max}` : "—"}</td>
                        {(byLessonData.questions || []).map((q) => {
                          const cell = r.questions?.[q.id];
                          const score = cell?.score;
                          const correct = cell?.correct;
                          const pts = byLessonData.points_per_question ?? 0.5;
                          return (
                            <td key={q.id} className="px-2 py-2 text-center">
                              {score == null ? "—" : correct ? <span className="text-green-600 font-bold">✓ {(score ?? pts).toFixed(2)}</span> : <span className="text-red-600 font-bold">✗ {(score ?? 0).toFixed(2)}</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  {byLessonData.rows?.length > 0 && byLessonData.questions?.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2">
                      <tr>
                        <td colSpan={7} className="px-2 py-2 font-bold">المتوسط العام</td>
                        {(byLessonData.questions || []).map((q) => {
                          const total = (byLessonData.rows || []).reduce((s, r) => s + (r.questions?.[q.id]?.score ?? 0), 0);
                          const n = (byLessonData.rows || []).filter((r) => r.questions?.[q.id]?.score != null).length;
                          return (
                            <td key={q.id} className="px-2 py-2 text-center font-bold">
                              {n ? `(${n}) ${(total / n).toFixed(2)}` : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}

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

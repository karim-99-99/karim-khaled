import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import {
  createDailyTasks,
  deleteDailyTask,
  getDailyTaskAssignments,
  getDailyTaskReport,
  getLevelsByChapter,
  getDailyTaskGroups,
  getSections,
  isBackendOn,
} from "../../services/backendApi";

const flattenGroups = (list, out = []) => {
  (list || []).forEach((group) => {
    out.push(group);
    if (group.children?.length) flattenGroups(group.children, out);
  });
  return out;
};

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDay(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const DailyTasksAdmin = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(addDays(todayIso(), 6));
  const [subjectId, setSubjectId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [lessons, setLessons] = useState([]);
  const [picked, setPicked] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const subjects = useMemo(
    () => (sections || []).flatMap((section) => section.subjects || []),
    [sections]
  );
  const categories = subjects.find((subject) => subject.id === subjectId)?.categories || [];
  const chapters = categories.find((category) => category.id === categoryId)?.chapters || [];

  useEffect(() => {
    if (!isBackendOn()) return;
    getDailyTaskGroups()
      .then((list) => setGroups(Array.isArray(list) ? list : []))
      .catch(() => setGroups([]));
    getSections()
      .then((list) => setSections(Array.isArray(list) ? list : []))
      .catch(() => setSections([]));
  }, []);

  useEffect(() => {
    if (!chapterId || !isBackendOn()) {
      setLessons([]);
      return;
    }
    let cancelled = false;
    getLevelsByChapter(chapterId)
      .then((list) => {
        if (!cancelled) setLessons(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setLessons([]);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const loadBoard = async (nextGroup = groupId, from = startDate, to = endDate) => {
    if (!nextGroup || !from || !to) return;
    setBusy(true);
    setError("");
    try {
      const [assigned, results] = await Promise.all([
        getDailyTaskAssignments(nextGroup, from, to),
        getDailyTaskReport(nextGroup, from, to),
      ]);
      setAssignments(assigned?.tasks || []);
      setReport(results);
    } catch (err) {
      setError(err?.message || "تعذر تحميل المهام");
    } finally {
      setBusy(false);
    }
  };

  const addLesson = (lessonId) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson || picked.some((item) => item.id === lesson.id)) return;
    const categoryName = categories.find((category) => category.id === categoryId)?.name || "";
    setPicked((prev) => [
      ...prev,
      {
        id: lesson.id,
        name: lesson.name,
        isBank: categoryName.includes("تجميع"),
      },
    ]);
  };

  const saveTasks = async () => {
    setMessage("");
    setError("");
    if (!groupId || !picked.length) {
      setError("اختر المجموعة وواجباً أو بنكاً واحداً على الأقل");
      return;
    }
    setBusy(true);
    try {
      const result = await createDailyTasks({
        group_id: groupId,
        start_date: startDate,
        end_date: endDate,
        lesson_ids: picked.map((item) => item.id),
      });
      setMessage(
        `تم تعيين ${result?.created || 0} مهمة${
          result?.skipped ? `، وتخطي ${result.skipped} مكررة` : ""
        }.`
      );
      setPicked([]);
      await loadBoard();
    } catch (err) {
      setError(err?.message || "تعذر حفظ المهام");
    } finally {
      setBusy(false);
    }
  };

  const removeTask = async (taskId) => {
    setBusy(true);
    setError("");
    try {
      await deleteDailyTask(taskId);
      await loadBoard();
    } catch (err) {
      setError(err?.message || "تعذر حذف المهمة");
    } finally {
      setBusy(false);
    }
  };

  const groupedAssignments = assignments.reduce((acc, task) => {
    acc[task.date] = acc[task.date] || [];
    acc[task.date].push(task);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="text-primary-600 hover:text-primary-700 font-medium mb-4"
        >
          ← رجوع للوحة التحكم
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-dark-700 text-center mb-2">
          المهام اليومية
        </h1>
        <p className="text-center text-gray-600 mb-6">
          عيّن بنوك وواجبات كل مجموعة لأي مدة. الطالب يرى اليوم والأيام السابقة فقط.
        </p>

        <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block text-sm font-bold text-dark-700">
              المجموعة
              <select
                value={groupId}
                onChange={(event) => {
                  setGroupId(event.target.value);
                  setReport(null);
                  setAssignments([]);
                }}
                className="mt-1 w-full px-3 py-2 border rounded-lg font-medium"
              >
                <option value="">اختر المجموعة</option>
                {flattenGroups(groups).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-dark-700">
              من
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg"
              />
            </label>
            <label className="block text-sm font-bold text-dark-700">
              إلى
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setCategoryId("");
                setChapterId("");
              }}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">لفظي أو كمي</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setChapterId("");
              }}
              disabled={!subjectId}
              className="px-3 py-2 border rounded-lg disabled:opacity-50"
            >
              <option value="">تأسيس أو تجميع</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
              disabled={!categoryId}
              className="px-3 py-2 border rounded-lg disabled:opacity-50"
            >
              <option value="">القسم أو المستوى</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
            <select
              defaultValue=""
              onChange={(event) => {
                addLesson(event.target.value);
                event.target.value = "";
              }}
              disabled={!chapterId}
              className="px-3 py-2 border rounded-lg disabled:opacity-50"
            >
              <option value="">أضف واجباً أو بنكاً</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </option>
              ))}
            </select>
          </div>

          {picked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {picked.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPicked((prev) => prev.filter((row) => row.id !== item.id))}
                  className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-sm font-bold"
                >
                  {item.name} ({item.isBank ? "بنك" : "واجب"}) ×
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveTasks}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50"
            >
              تعيين لهذه المدة
            </button>
            <button
              type="button"
              onClick={() => loadBoard()}
              disabled={busy || !groupId}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white font-bold hover:bg-primary-600 disabled:opacity-50"
            >
              عرض المهام والنتائج
            </button>
          </div>
          {message && <p className="text-emerald-700 font-bold">{message}</p>}
          {error && <p className="text-red-600 font-bold">{error}</p>}
        </div>

        {Object.keys(groupedAssignments).length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-6">
            <h2 className="font-extrabold text-dark-700 mb-3">المهام المعيّنة</h2>
            <div className="space-y-4">
              {Object.keys(groupedAssignments)
                .sort()
                .map((date) => (
                  <div key={date}>
                    <h3 className="font-bold text-dark-600 mb-2">
                      {formatDay(date)}
                      {groupedAssignments[date][0]?.is_future ? " — قادم" : ""}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {groupedAssignments[date].map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => removeTask(task.id)}
                          className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-red-50 text-sm font-bold"
                        >
                          {task.lesson_name} ({task.is_bank ? "بنك" : "واجب"}) — حذف
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {report?.days?.length > 0 && (
          <div className="space-y-6">
            {report.days.map((day) => (
              <section key={day.date} className="bg-white rounded-2xl shadow overflow-hidden">
                <h2 className="px-4 py-3 bg-gray-100 font-extrabold text-dark-700">
                  {formatDay(day.date)}
                  {day.is_future ? " — لم يحن بعد" : day.is_today ? " — اليوم" : ""}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-right">الطالب</th>
                        {day.tasks.map((task) => (
                          <th key={task.id} className="px-3 py-2 text-right">
                            {task.lesson_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {day.students.length === 0 ? (
                        <tr>
                          <td colSpan={day.tasks.length + 1} className="px-3 py-4 text-center text-gray-500">
                            لا يوجد طلاب في هذه المجموعة
                          </td>
                        </tr>
                      ) : (
                        day.students.map((student) => (
                          <tr key={student.user_id} className="border-t">
                            <td className="px-3 py-2 font-bold">{student.name}</td>
                            {student.items.map((item) => (
                              <td key={item.task_id} className="px-3 py-2">
                                {!item.due ? (
                                  <span className="text-gray-500">قادمة</span>
                                ) : item.solved ? (
                                  <span className="text-emerald-700 font-bold">
                                    حلّها — {Math.round(item.latest_score || 0)}% — {item.attempt_count}{" "}
                                    {item.attempt_count === 1 ? "مرة" : "مرات"}
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-bold">لم يحل</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTasksAdmin;

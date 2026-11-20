import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/storageService";
import { dailyTaskQuizPath, getMyDailyTasks, isBackendOn } from "../services/backendApi";
import { isContentStaff } from "../utils/roles";
import {
  formatArabicTaskDate,
  isQuantitativeSubject,
  subjectBadgeLabel,
  taskSubtitle,
} from "../utils/dailyTaskGroups";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M5 10.5l3.2 3.2L15 6.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TaskRow({ task, index }) {
  const quizPath = dailyTaskQuizPath(task);
  const quant = isQuantitativeSubject(task);
  const badge = subjectBadgeLabel(task);
  const ringTone = task.solved
    ? "border-emerald-500 bg-emerald-500 text-white"
    : quant
      ? "border-accent-500 text-accent-700"
      : "border-primary-500 text-primary-700";
  const badgeTone = quant
    ? "bg-accent-50 text-accent-800 border-accent-200"
    : "bg-primary-50 text-primary-800 border-primary-200";
  const actionTone = task.solved
    ? "bg-emerald-100 text-emerald-700"
    : quant
      ? "bg-accent-500 text-white hover:bg-accent-600"
      : "bg-primary-500 text-white hover:bg-primary-600";

  return (
    <Link
      to={quizPath || "/daily-tasks"}
      className="flex items-center gap-3 border-b border-dashed border-gray-200 px-4 py-3.5 text-right transition last:border-b-0 hover:bg-secondary-50/60"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${ringTone}`}
      >
        {task.solved ? <CheckIcon /> : index}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-extrabold text-dark-800 md:text-lg">{task.lesson_name}</span>
          {badge ? (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold md:text-xs ${badgeTone}`}>
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs font-medium text-dark-400 md:text-sm">{taskSubtitle(task)}</span>
      </span>

      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full px-3.5 py-1.5 text-sm font-extrabold transition ${actionTone}`}
      >
        {task.solved ? "تم" : "ابدأ"}
      </span>
    </Link>
  );
}

const DailyTasksEntry = () => {
  const user = getCurrentUser();
  const staff = isContentStaff(user);
  const studentKey = !staff && user?.role === "student" ? user.id || user.username || "student" : "";
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayIso, setTodayIso] = useState("");
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!studentKey || !isBackendOn()) return;
    let cancelled = false;
    getMyDailyTasks()
      .then((data) => {
        if (cancelled) return;
        const today = data?.today_tasks || [];
        setTodayTasks(today);
        setTodayIso(data?.today || "");
        const previousDays = (data?.days || []).filter((day) => !day.is_today);
        setHasPrevious(previousDays.some((day) => (day.tasks || []).length > 0));
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setTodayTasks([]);
        setTodayIso("");
        setHasPrevious(false);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [studentKey]);

  const solvedCount = useMemo(
    () => todayTasks.filter((task) => task.solved).length,
    [todayTasks]
  );
  const totalCount = todayTasks.length;
  const progressPct = totalCount ? Math.round((solvedCount / totalCount) * 100) : 0;

  if (staff) {
    return (
      <Link
        to="/admin/daily-tasks"
        className="mx-auto mb-3 block w-full max-w-4xl overflow-hidden rounded-[22px] bg-gradient-to-l from-primary-500 to-primary-600 px-5 py-4 text-center text-white shadow-lg transition hover:-translate-y-0.5"
      >
        <span className="block text-xl font-black md:text-2xl">المهام اليومية</span>
        <span className="mt-1 block text-sm font-semibold text-primary-50 md:text-base">
          تعيين تأسيس وتجميعات كل مجموعة ليوم محدد
        </span>
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        to="/login?redirect=/daily-tasks"
        className="mx-auto mb-3 block w-full max-w-4xl overflow-hidden rounded-[22px] bg-gradient-to-l from-primary-500 to-primary-600 px-5 py-4 text-center text-white shadow-lg transition hover:-translate-y-0.5"
      >
        <span className="block text-xl font-black md:text-2xl">المهام اليومية</span>
        <span className="mt-1 block text-sm font-semibold text-primary-50 md:text-base">
          سجّل الدخول لترى واجب اليوم
        </span>
      </Link>
    );
  }

  return (
    <div className="mx-auto mb-3 w-full max-w-4xl overflow-hidden rounded-[22px] border border-primary-100 bg-white text-right shadow-[0_12px_30px_rgba(214,112,32,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-l from-primary-500 via-primary-500 to-primary-400 px-4 py-3.5 text-white md:px-5">
        <div className="min-w-0">
          <Link to="/daily-tasks" className="block text-xl font-black leading-tight hover:underline md:text-2xl">
            المهام اليومية
          </Link>
          <p className="mt-0.5 text-xs font-semibold text-white/90 md:text-sm">
            {formatArabicTaskDate(todayIso)}
          </p>
        </div>

        {totalCount > 0 ? (
          <div className="min-w-[9.5rem] flex-1 sm:max-w-[13rem] sm:flex-none">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-white/95">
              <span>التقدم</span>
              <span>
                {solvedCount}/{totalCount}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-primary-800/25">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-white">
        {!loaded ? (
          <p className="px-4 py-6 text-center text-sm font-semibold text-dark-500">جاري التحميل...</p>
        ) : todayTasks.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-lg font-extrabold text-dark-700">راجع واجباتك السابقة</p>
            <p className="mt-1 text-sm font-medium text-dark-500">
              لا يوجد واجب لهذا اليوم. شوف اللي خلصته واللي لسه فاتك وأكمله.
            </p>
            <Link
              to="/daily-tasks"
              className="mt-3 inline-flex rounded-full bg-primary-500 px-4 py-2 text-sm font-black text-white hover:bg-primary-600"
            >
              {hasPrevious ? "عرض كل الواجبات السابقة" : "فتح صفحة المهام السابقة"}
            </Link>
          </div>
        ) : (
          todayTasks.map((task, index) => (
            <TaskRow key={task.id} task={task} index={index + 1} />
          ))
        )}
      </div>

      {loaded && todayTasks.length > 0 ? (
        <div className="border-t border-gray-100 bg-secondary-50/50 px-4 py-2.5 text-center">
          <Link
            to="/daily-tasks"
            className="text-sm font-bold text-primary-700 underline-offset-2 hover:underline md:text-base"
          >
            الواجبات السابقة ←
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default DailyTasksEntry;

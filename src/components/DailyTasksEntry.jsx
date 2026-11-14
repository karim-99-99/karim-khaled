import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/storageService";
import { dailyTaskQuizPath, getMyDailyTasks, isBackendOn } from "../services/backendApi";
import { isContentStaff } from "../utils/roles";
import { splitTasksByKind } from "../utils/dailyTaskGroups";

const shellBase =
  "mx-auto mb-3 w-full max-w-md overflow-hidden rounded-3xl border shadow-lg transition";

function TaskChip({ task }) {
  const quizPath = dailyTaskQuizPath(task);
  const isBank = Boolean(task.is_bank) || (task.category_name || "").includes("تجميع");

  if (task.solved) {
    return (
      <Link
        key={task.id}
        to={quizPath || "/daily-tasks"}
        className="block rounded-2xl border border-emerald-200/80 bg-emerald-50/95 px-3 py-2.5 text-right shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100"
      >
        <span className="block text-base font-extrabold leading-snug text-emerald-900 md:text-lg">
          {task.lesson_name}
        </span>
        <span className="mt-0.5 block text-xs font-bold text-emerald-700 md:text-sm">تم الاجتياز</span>
      </Link>
    );
  }

  if (isBank) {
    return (
      <Link
        key={task.id}
        to={quizPath || "/daily-tasks"}
        className="block rounded-2xl border border-accent-300/80 bg-gradient-to-l from-accent-50 to-white px-3 py-2.5 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-accent-400 hover:shadow-md"
      >
        <span className="block text-base font-extrabold leading-snug text-accent-900 md:text-lg">
          {task.lesson_name}
        </span>
        <span className="mt-0.5 block text-xs font-bold text-accent-700 md:text-sm">تجميعات — ابدأ الآن</span>
      </Link>
    );
  }

  return (
    <Link
      key={task.id}
      to={quizPath || "/daily-tasks"}
      className="block rounded-2xl border border-primary-300/80 bg-gradient-to-l from-primary-50 to-white px-3 py-2.5 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md"
    >
      <span className="block text-base font-extrabold leading-snug text-primary-900 md:text-lg">
        {task.lesson_name}
      </span>
      <span className="mt-0.5 block text-xs font-bold text-primary-700 md:text-sm">تأسيس — ابدأ الآن</span>
    </Link>
  );
}

function KindBlock({ title, hint, tasks, tone }) {
  if (!tasks.length) return null;
  const header =
    tone === "accent"
      ? "bg-accent-500/15 text-accent-900 border-accent-200/70"
      : "bg-primary-500/15 text-primary-900 border-primary-200/70";
  return (
    <div className="rounded-2xl border border-white/40 bg-white/55 p-2.5 backdrop-blur-sm">
      <div className={`mb-2 flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 ${header}`}>
        <span className="text-sm font-black md:text-base">{title}</span>
        <span className="text-[11px] font-bold opacity-80 md:text-xs">{hint}</span>
      </div>
      <div className="flex flex-col gap-2">{tasks.map((task) => <TaskChip key={task.id} task={task} />)}</div>
    </div>
  );
}

const DailyTasksEntry = () => {
  const user = getCurrentUser();
  const staff = isContentStaff(user);
  const studentKey = !staff && user?.role === "student" ? user.id || user.username || "student" : "";
  const [todayTasks, setTodayTasks] = useState([]);
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
        const previousDays = (data?.days || []).filter((day) => !day.is_today);
        setHasPrevious(previousDays.some((day) => (day.tasks || []).length > 0));
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setTodayTasks([]);
        setHasPrevious(false);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [studentKey]);

  const { foundation, banks } = useMemo(() => splitTasksByKind(todayTasks), [todayTasks]);
  const allSolved = todayTasks.length > 0 && todayTasks.every((task) => task.solved);

  if (staff) {
    return (
      <Link
        to="/admin/daily-tasks"
        className={`${shellBase} border-primary-300 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 px-4 py-4 text-center text-white hover:-translate-y-0.5`}
      >
        <span className="block text-xl font-black leading-tight md:text-2xl">مهام يومية</span>
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
        className={`${shellBase} border-primary-300 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 px-4 py-4 text-center text-white hover:-translate-y-0.5`}
      >
        <span className="block text-xl font-black leading-tight md:text-2xl">مهام يومية</span>
        <span className="mt-1 block text-sm font-semibold text-primary-50 md:text-base">
          سجّل الدخول لترى واجب اليوم
        </span>
      </Link>
    );
  }

  const shellTone = allSolved
    ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-accent-50"
    : "border-secondary-300 bg-gradient-to-br from-secondary-50 via-white to-accent-50";

  return (
    <div className={`${shellBase} ${shellTone} px-3.5 py-3.5 text-center`}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary-500/90 via-primary-600 to-accent-600/90 px-3 py-3 text-white shadow-md">
        <div className="pointer-events-none absolute -left-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
        <div className="pointer-events-none absolute -bottom-10 -right-4 h-28 w-28 rounded-full bg-beige-300/30 blur-2xl" />
        <Link to="/daily-tasks" className="relative block text-xl font-black leading-tight tracking-tight hover:underline md:text-2xl">
          مهام يومية
        </Link>
        <p className="relative mt-1 text-xs font-semibold text-white/90 md:text-sm">
          واجب اليوم فقط — مقسّم لتأسيس وتجميعات
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {!loaded ? (
          <span className="text-sm font-semibold text-dark-500">جاري التحميل...</span>
        ) : todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary-300 bg-primary-50/70 px-3 py-3.5">
            <p className="text-base font-extrabold leading-snug text-dark-700 md:text-lg">راجع واجباتك السابقة</p>
            <p className="mt-1 text-sm font-medium text-dark-500">
              لا يوجد واجب لهذا اليوم. شوف اللي خلصته واللي لسه فاتك وأكمله.
            </p>
            <Link
              to="/daily-tasks"
              className="mt-2.5 inline-flex items-center justify-center rounded-xl bg-primary-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-primary-600 md:text-base"
            >
              {hasPrevious ? "عرض كل الواجبات السابقة" : "فتح صفحة المهام السابقة"}
            </Link>
          </div>
        ) : (
          <>
            <KindBlock
              title="التأسيس"
              hint="خطوة بخطوة"
              tasks={foundation}
              tone="primary"
            />
            <KindBlock
              title="التجميعات"
              hint="تدريب على الاختبار"
              tasks={banks}
              tone="accent"
            />
          </>
        )}
      </div>

      {loaded && todayTasks.length > 0 && (
        <Link
          to="/daily-tasks"
          className="mt-3 inline-block text-sm font-bold text-primary-700 underline-offset-2 hover:underline md:text-base"
        >
          الواجبات السابقة ←
        </Link>
      )}
    </div>
  );
};

export default DailyTasksEntry;

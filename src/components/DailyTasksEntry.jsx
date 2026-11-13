import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/storageService";
import { dailyTaskQuizPath, getMyDailyTasks, isBackendOn } from "../services/backendApi";
import { isContentStaff } from "../utils/roles";

const shellBase =
  "mx-auto mb-3 w-full max-w-md rounded-2xl border-2 px-4 py-3.5 text-center text-white shadow-lg transition";

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

  if (staff) {
    return (
      <Link
        to="/admin/daily-tasks"
        className={`${shellBase} border-amber-800 bg-gradient-to-b from-amber-500 to-amber-700 hover:-translate-y-0.5 hover:from-amber-600 hover:to-amber-800`}
      >
        <span className="block text-xl font-black leading-tight md:text-2xl">مهام يومية</span>
        <span className="mt-1 block text-sm font-semibold text-amber-50 md:text-base">
          تعيين واجب كل مجموعة ليوم محدد
        </span>
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        to="/login?redirect=/daily-tasks"
        className={`${shellBase} border-amber-800 bg-gradient-to-b from-amber-500 to-amber-700 hover:-translate-y-0.5 hover:from-amber-600 hover:to-amber-800`}
      >
        <span className="block text-xl font-black leading-tight md:text-2xl">مهام يومية</span>
        <span className="mt-1 block text-sm font-semibold text-amber-50 md:text-base">
          سجّل الدخول لترى واجب اليوم
        </span>
      </Link>
    );
  }

  const allSolved = todayTasks.length > 0 && todayTasks.every((task) => task.solved);
  const tone = allSolved
    ? "border-emerald-800 bg-gradient-to-b from-emerald-500 to-emerald-700"
    : "border-amber-800 bg-gradient-to-b from-amber-500 to-amber-700";

  return (
    <div className={`${shellBase} ${tone}`}>
      <Link
        to="/daily-tasks"
        className="block text-xl font-black leading-tight tracking-tight hover:underline md:text-2xl"
      >
        مهام يومية
      </Link>
      <p className="mt-1 text-xs font-semibold text-white/90 md:text-sm">واجب اليوم فقط — يختفي بنهاية اليوم</p>

      <div className="mt-2.5 flex flex-col gap-2">
        {!loaded ? (
          <span className="text-sm font-semibold text-white/85">جاري التحميل...</span>
        ) : todayTasks.length === 0 ? (
          <div className="rounded-xl bg-black/15 px-3 py-3">
            <p className="text-base font-extrabold leading-snug md:text-lg">راجع واجباتك السابقة</p>
            <p className="mt-1 text-sm font-medium text-white/90">
              لا يوجد واجب لهذا اليوم. شوف اللي خلصته واللي لسه فاتك وأكمله.
            </p>
            <Link
              to="/daily-tasks"
              className="mt-2.5 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-black text-amber-800 shadow-sm transition hover:bg-amber-50 md:text-base"
            >
              {hasPrevious ? "عرض كل الواجبات السابقة" : "فتح صفحة المهام السابقة"}
            </Link>
          </div>
        ) : (
          todayTasks.map((task) => {
            const quizPath = dailyTaskQuizPath(task);
            return (
              <Link
                key={task.id}
                to={quizPath || "/daily-tasks"}
                className={`rounded-xl px-3 py-2.5 text-base font-extrabold leading-snug shadow-sm transition md:text-lg ${
                  task.solved
                    ? "bg-emerald-800/80 text-white hover:bg-emerald-900"
                    : "bg-white text-amber-900 hover:bg-amber-50"
                }`}
              >
                {task.lesson_name}
                <span className="mt-0.5 block text-xs font-bold opacity-80 md:text-sm">
                  {task.solved ? "تم الاجتياز" : task.is_bank ? "بنك — ابدأ الآن" : "واجب — ابدأ الآن"}
                </span>
              </Link>
            );
          })
        )}
      </div>

      {loaded && todayTasks.length > 0 && (
        <Link
          to="/daily-tasks"
          className="mt-2.5 inline-block text-sm font-bold text-white/95 underline-offset-2 hover:underline md:text-base"
        >
          الواجبات السابقة ←
        </Link>
      )}
    </div>
  );
};

export default DailyTasksEntry;

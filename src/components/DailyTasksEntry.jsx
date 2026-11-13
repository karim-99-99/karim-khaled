import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/storageService";
import { dailyTaskQuizPath, getMyDailyTasks, isBackendOn } from "../services/backendApi";
import { isContentStaff } from "../utils/roles";

const DailyTasksEntry = () => {
  const user = getCurrentUser();
  const staff = isContentStaff(user);
  const studentKey = !staff && user?.role === "student" ? user.id || user.username || "student" : "";
  const [todayTasks, setTodayTasks] = useState([]);

  useEffect(() => {
    if (!studentKey || !isBackendOn()) return;
    let cancelled = false;
    getMyDailyTasks()
      .then((data) => {
        if (!cancelled) setTodayTasks(data?.today_tasks || []);
      })
      .catch(() => {
        if (!cancelled) setTodayTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [studentKey]);

  if (staff) {
    return (
      <Link
        to="/admin/daily-tasks"
        className="mx-auto mb-2 flex w-full max-w-[22rem] flex-col items-center rounded-lg border border-amber-700 bg-amber-600 px-4 py-2 text-center text-white shadow transition hover:-translate-y-0.5 hover:bg-amber-700"
      >
        <span className="text-lg font-extrabold leading-tight md:text-xl">مهام يومية</span>
        <span className="mt-0.5 text-sm font-semibold">(تعيين بنوك وواجبات كل مجموعة)</span>
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        to="/login?redirect=/daily-tasks"
        className="mx-auto mb-2 flex w-full max-w-[22rem] flex-col items-center rounded-lg border border-amber-700 bg-amber-600 px-4 py-2 text-center text-white shadow transition hover:-translate-y-0.5 hover:bg-amber-700"
      >
        <span className="text-lg font-extrabold leading-tight md:text-xl">مهام يومية</span>
        <span className="mt-0.5 text-sm font-semibold">(سجل الدخول لترى مهام اليوم)</span>
      </Link>
    );
  }

  const allSolved = todayTasks.length > 0 && todayTasks.every((task) => task.solved);

  return (
    <div
      className={`mx-auto mb-2 w-full max-w-[22rem] rounded-lg border px-3 py-2 text-center text-white shadow ${
        allSolved ? "border-emerald-700 bg-emerald-600" : "border-amber-700 bg-amber-600"
      }`}
    >
      <Link to="/daily-tasks" className="block text-lg font-extrabold leading-tight md:text-xl hover:underline">
        مهام يومية
      </Link>
      <div className="mt-1 flex flex-col gap-1">
        {todayTasks.length === 0 ? (
          <Link to="/daily-tasks" className="text-sm font-semibold">
            (لا توجد مهام اليوم)
          </Link>
        ) : (
          todayTasks.map((task) => {
            const quizPath = dailyTaskQuizPath(task);
            return (
              <Link
                key={task.id}
                to={quizPath || "/daily-tasks"}
                className={`rounded-md px-2 py-1 text-sm font-bold leading-snug ${
                  task.solved
                    ? "bg-emerald-600 text-white"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                ({task.lesson_name})
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DailyTasksEntry;

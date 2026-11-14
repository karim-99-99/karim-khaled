import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { dailyTaskQuizPath, getMyDailyTasks } from "../services/backendApi";
import { splitTasksByKind, taskKindLabel } from "../utils/dailyTaskGroups";

function formatDay(iso, isToday) {
  const label = new Date(`${iso}T12:00:00`).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return isToday ? `اليوم — ${label}` : label;
}

function TaskCard({ task, onOpen }) {
  const kind = taskKindLabel(task);
  const isBank = kind === "تجميعات";

  if (task.solved) {
    return (
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="w-full rounded-2xl border-2 border-emerald-500 bg-gradient-to-l from-emerald-500 to-emerald-600 px-4 py-4 text-right text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="mb-1 inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
              {kind}
            </span>
            <div className="text-base font-extrabold md:text-lg">{task.lesson_name}</div>
          </div>
          <span className="text-sm font-bold whitespace-nowrap md:text-base">تم الاجتياز</span>
        </div>
        <div className="mt-1.5 text-sm text-emerald-50">
          الدرجة {Math.round(task.latest_score || 0)}% — حُلّت {task.attempt_count}{" "}
          {task.attempt_count === 1 ? "مرة" : "مرات"}
        </div>
      </button>
    );
  }

  const pendingClasses = isBank
    ? "border-accent-300 bg-gradient-to-l from-accent-50 via-white to-white hover:border-accent-400 hover:shadow-md"
    : "border-primary-300 bg-gradient-to-l from-primary-50 via-white to-white hover:border-primary-400 hover:shadow-md";
  const badgeClasses = isBank
    ? "bg-accent-100 text-accent-800 border-accent-200"
    : "bg-primary-100 text-primary-800 border-primary-200";
  const actionClasses = isBank ? "text-accent-700" : "text-primary-700";

  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className={`w-full rounded-2xl border-2 px-4 py-4 text-right text-dark-800 shadow-sm transition ${pendingClasses}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className={`mb-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeClasses}`}>
            {kind}
          </span>
          <div className="text-base font-extrabold md:text-lg">{task.lesson_name}</div>
        </div>
        <span className={`text-sm font-bold whitespace-nowrap md:text-base ${actionClasses}`}>
          ابدأ / أكمل
        </span>
      </div>
      <div className="mt-1.5 text-sm text-gray-600">اضغط للدخول وإكمال الواجب</div>
    </button>
  );
}

function KindSection({ title, subtitle, tone, tasks, onOpen }) {
  if (!tasks.length) return null;
  const wrap =
    tone === "accent"
      ? "border-accent-200/80 bg-gradient-to-b from-accent-50/80 to-white"
      : "border-primary-200/80 bg-gradient-to-b from-primary-50/80 to-white";
  const heading =
    tone === "accent"
      ? "text-accent-900 border-accent-200"
      : "text-primary-900 border-primary-200";

  return (
    <div className={`rounded-2xl border p-3 md:p-4 ${wrap}`}>
      <div className={`mb-3 flex flex-wrap items-end justify-between gap-2 border-b pb-2 ${heading}`}>
        <div>
          <h3 className="text-base font-black md:text-lg">{title}</h3>
          <p className="text-xs font-medium opacity-80 md:text-sm">{subtitle}</p>
        </div>
        <span className="text-xs font-bold opacity-70">{tasks.length} مهمة</span>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function DayTaskGroups({ tasks, onOpen }) {
  const { foundation, banks } = splitTasksByKind(tasks);
  return (
    <div className="space-y-4">
      <KindSection
        title="التأسيس"
        subtitle="ابدأ من الصفر خطوة بخطوة"
        tone="primary"
        tasks={foundation}
        onOpen={onOpen}
      />
      <KindSection
        title="التجميعات"
        subtitle="تدريبات مطابقة للاختبار"
        tone="accent"
        tasks={banks}
        onOpen={onOpen}
      />
    </div>
  );
}

const DailyTasks = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyDailyTasks()
      .then(setData)
      .catch((err) => setError(err?.message || "تعذر تحميل المهام اليومية"))
      .finally(() => setLoading(false));
  }, []);

  const todayDay = useMemo(
    () => (data?.days || []).find((day) => day.is_today) || null,
    [data]
  );
  const previousDays = useMemo(
    () => (data?.days || []).filter((day) => !day.is_today),
    [data]
  );
  const previousStats = useMemo(() => {
    let done = 0;
    let pending = 0;
    previousDays.forEach((day) => {
      (day.tasks || []).forEach((task) => {
        if (task.solved) done += 1;
        else pending += 1;
      });
    });
    return { done, pending };
  }, [previousDays]);

  const openTask = (task) => {
    const path = dailyTaskQuizPath(task);
    if (!path) return;
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary-50 via-gray-50 to-accent-50/40">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate("/courses")}
          className="text-primary-600 hover:text-primary-700 font-medium mb-4"
        >
          ← رجوع للدورات
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-dark-700 text-center mb-2">
          مهام يومية
        </h1>
        <p className="text-center text-gray-600 mb-8">
          مهام اليوم مقسّمة لتأسيس وتجميعات، وتختفي بنهاية اليوم. السابقة تبقى متاحة للإكمال.
        </p>

        {loading ? (
          <p className="text-center text-gray-600">جاري التحميل...</p>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-3xl border border-secondary-200 bg-white/90 shadow-md">
              <h2 className="bg-gradient-to-l from-primary-500 to-accent-500 px-4 py-3.5 text-lg font-extrabold text-white">
                {todayDay ? formatDay(todayDay.date, true) : "واجب اليوم"}
              </h2>
              <div className="p-4">
                {(todayDay?.tasks || []).length > 0 ? (
                  <DayTaskGroups tasks={todayDay.tasks} onOpen={openTask} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-primary-300 bg-primary-50/70 px-4 py-6 text-center">
                    <p className="text-lg font-extrabold text-dark-700">راجع واجباتك السابقة</p>
                    <p className="mt-2 text-sm text-gray-600 md:text-base">
                      لا يوجد واجب لهذا اليوم. شوف اللي خلصته واللي لسه فاتك وأكمله من القسم التالي.
                    </p>
                    {previousDays.length > 0 && (
                      <a
                        href="#previous-tasks"
                        className="mt-4 inline-flex rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-black text-white hover:bg-primary-600 md:text-base"
                      >
                        الانتقال للواجبات السابقة
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section id="previous-tasks" className="scroll-mt-6">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-xl font-extrabold text-dark-700">الواجبات السابقة</h2>
                {previousDays.length > 0 && (
                  <p className="text-sm font-bold text-gray-600">
                    مكتمل: <span className="text-emerald-700">{previousStats.done}</span>
                    {" · "}
                    لم يُكتمل: <span className="text-red-600">{previousStats.pending}</span>
                  </p>
                )}
              </div>

              {previousDays.length === 0 ? (
                <div className="rounded-3xl bg-white p-8 text-center text-gray-600 shadow">
                  لا توجد واجبات سابقة بعد. المهام الجديدة تظهر في يومها.
                </div>
              ) : (
                <div className="space-y-5">
                  {previousDays.map((day) => (
                    <section
                      key={day.date}
                      className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow"
                    >
                      <h3 className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-3 font-extrabold text-dark-700">
                        <span>{formatDay(day.date, false)}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            day.all_solved
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {day.all_solved ? "اكتملت كلها" : "يوجد واجبات ناقصة"}
                        </span>
                      </h3>
                      <div className="p-4">
                        <DayTaskGroups tasks={day.tasks} onOpen={openTask} />
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTasks;

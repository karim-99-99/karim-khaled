import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { dailyTaskQuizPath, getMyDailyTasks } from "../services/backendApi";

function formatDay(iso, isToday) {
  const label = new Date(`${iso}T12:00:00`).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return isToday ? `اليوم — ${label}` : label;
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

  const renderTaskButton = (task) => (
    <button
      key={task.id}
      type="button"
      onClick={() => openTask(task)}
      className={`w-full text-right rounded-2xl border-2 px-4 py-4 transition ${
        task.solved
          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
          : "border-amber-300 bg-amber-50 text-dark-800 hover:bg-amber-100"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-extrabold md:text-lg">
          {task.lesson_name}
          <span className="font-semibold text-sm opacity-90">
            {" "}
            ({task.is_bank ? "بنك" : "واجب"})
          </span>
        </span>
        <span className="text-sm font-bold whitespace-nowrap md:text-base">
          {task.solved ? "تم الاجتياز" : "ابدأ / أكمل"}
        </span>
      </div>
      <div className={`mt-1.5 text-sm ${task.solved ? "text-emerald-50" : "text-gray-600"}`}>
        {task.solved
          ? `الدرجة ${Math.round(task.latest_score || 0)}% — حُلّت ${task.attempt_count} ${
              task.attempt_count === 1 ? "مرة" : "مرات"
            }`
          : "اضغط للدخول وإكمال الواجب"}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
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
          واجب اليوم يظهر هنا ويختفي بنهاية اليوم. الواجبات السابقة تبقى متاحة للإكمال.
        </p>

        {loading ? (
          <p className="text-center text-gray-600">جاري التحميل...</p>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : (
          <div className="space-y-8">
            <section className="bg-white rounded-2xl shadow-md overflow-hidden border border-amber-100">
              <h2 className="px-4 py-3.5 bg-amber-50 font-extrabold text-dark-700 text-lg">
                {todayDay ? formatDay(todayDay.date, true) : "واجب اليوم"}
              </h2>
              <div className="p-4 space-y-3">
                {(todayDay?.tasks || []).length > 0 ? (
                  todayDay.tasks.map(renderTaskButton)
                ) : (
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-4 py-6 text-center">
                    <p className="text-lg font-extrabold text-dark-700">راجع واجباتك السابقة</p>
                    <p className="mt-2 text-sm text-gray-600 md:text-base">
                      لا يوجد واجب لهذا اليوم. شوف اللي خلصته واللي لسه فاتك وأكمله من القسم التالي.
                    </p>
                    {previousDays.length > 0 && (
                      <a
                        href="#previous-tasks"
                        className="mt-4 inline-flex rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-700 md:text-base"
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
                <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-600">
                  لا توجد واجبات سابقة بعد. المهام الجديدة تظهر في يومها.
                </div>
              ) : (
                <div className="space-y-5">
                  {previousDays.map((day) => (
                    <section key={day.date} className="bg-white rounded-2xl shadow overflow-hidden">
                      <h3 className="px-4 py-3 bg-gray-100 font-extrabold text-dark-700 flex flex-wrap items-center justify-between gap-2">
                        <span>{formatDay(day.date, false)}</span>
                        <span
                          className={`text-xs font-bold rounded-full px-2.5 py-1 ${
                            day.all_solved
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {day.all_solved ? "اكتملت كلها" : "يوجد واجبات ناقصة"}
                        </span>
                      </h3>
                      <div className="p-4 space-y-3">{day.tasks.map(renderTaskButton)}</div>
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

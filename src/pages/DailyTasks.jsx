import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { dailyTaskQuizPath, getMyDailyTasks } from "../services/backendApi";
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

function TaskRow({ task, index, onOpen }) {
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
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="flex w-full items-center gap-3 border-b border-dashed border-gray-200 px-4 py-4 text-right transition last:border-b-0 hover:bg-secondary-50/70"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${ringTone}`}
      >
        {task.solved ? <CheckIcon /> : index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-extrabold text-dark-800 md:text-lg">{task.lesson_name}</span>
          {badge ? (
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold md:text-xs ${badgeTone}`}>
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs font-medium text-dark-400 md:text-sm">{taskSubtitle(task)}</span>
        {task.solved ? (
          <span className="mt-1 block text-xs font-semibold text-emerald-700">
            الدرجة {Math.round(task.latest_score || 0)}% — حُلّت {task.attempt_count}{" "}
            {task.attempt_count === 1 ? "مرة" : "مرات"}
          </span>
        ) : null}
      </span>
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm font-extrabold transition ${actionTone}`}
      >
        {task.solved ? "تم" : "ابدأ"}
      </span>
    </button>
  );
}

function DayCard({ day, onOpen, emphasize }) {
  const solved = (day.tasks || []).filter((task) => task.solved).length;
  const total = (day.tasks || []).length;
  const progressPct = total ? Math.round((solved / total) * 100) : 0;

  return (
    <section
      className={`overflow-hidden rounded-[22px] border bg-white shadow-[0_10px_28px_rgba(0,0,0,0.06)] ${
        emphasize ? "border-primary-100" : "border-gray-100"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-white md:px-5 ${
          emphasize
            ? "bg-gradient-to-l from-primary-500 via-primary-500 to-primary-400"
            : "bg-gradient-to-l from-dark-600 to-dark-500"
        }`}
      >
        <div>
          <h2 className="text-lg font-extrabold md:text-xl">
            {day.is_today ? "المهام اليومية" : formatArabicTaskDate(day.date)}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-white/90 md:text-sm">
            {day.is_today ? formatArabicTaskDate(day.date) : day.all_solved ? "اكتملت كلها" : "يوجد واجبات ناقصة"}
          </p>
        </div>
        {total > 0 ? (
          <div className="min-w-[9rem] flex-1 sm:max-w-[12rem] sm:flex-none">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-white/95">
              <span>التقدم</span>
              <span>
                {solved}/{total}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      <div>
        {(day.tasks || []).map((task, index) => (
          <TaskRow key={task.id} task={task} index={index + 1} onOpen={onOpen} />
        ))}
      </div>
    </section>
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

  useEffect(() => {
    if (loading || !data) return;
    if (window.location.hash !== "#previous-tasks") return;
    const node = document.getElementById("previous-tasks");
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, data]);

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
    <div className="min-h-screen bg-[#f7f3ec]">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <button
          type="button"
          onClick={() => navigate("/courses")}
          className="mb-4 font-medium text-primary-600 hover:text-primary-700"
        >
          ← رجوع للدورات
        </button>
        <h1 className="mb-2 text-center text-2xl font-extrabold text-dark-700 md:text-3xl">مهام يومية</h1>
        <p className="mb-8 text-center text-gray-600">
          واجب اليوم يظهر هنا ويختفي بنهاية اليوم. الواجبات السابقة تبقى متاحة للإكمال.
        </p>

        {loading ? (
          <p className="text-center text-gray-600">جاري التحميل...</p>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : (
          <div className="space-y-8">
            {todayDay?.tasks?.length ? (
              <DayCard day={todayDay} onOpen={openTask} emphasize />
            ) : (
              <section className="overflow-hidden rounded-[22px] border border-primary-100 bg-white shadow-md">
                <div className="bg-gradient-to-l from-primary-500 to-primary-400 px-4 py-3.5 text-white">
                  <h2 className="text-lg font-extrabold">المهام اليومية</h2>
                  <p className="text-sm font-semibold text-white/90">
                    {formatArabicTaskDate(data?.today)}
                  </p>
                </div>
                <div className="px-4 py-8 text-center">
                  <p className="text-lg font-extrabold text-dark-700 md:text-xl">
                    استكمال ما لم يتم خلال الأسبوع ومراجعة المهام السابقة
                  </p>
                  <p className="mt-2 text-sm text-gray-600 md:text-base">
                    لا يوجد واجب لهذا اليوم. من القسم التالي تشوف كل المهام السابقة، اللي خلصته واللي لسه، وتضغط تكمل الناقص.
                  </p>
                  {previousDays.length > 0 ? (
                    <a
                      href="#previous-tasks"
                      className="mt-4 inline-flex rounded-full bg-primary-500 px-4 py-2.5 text-sm font-black text-white hover:bg-primary-600"
                    >
                      مراجعة المهام السابقة وإكمالها
                    </a>
                  ) : null}
                </div>
              </section>
            )}

            <section id="previous-tasks" className="scroll-mt-6">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-xl font-extrabold text-dark-700">الواجبات السابقة</h2>
                {previousDays.length > 0 ? (
                  <p className="text-sm font-bold text-gray-600">
                    مكتمل: <span className="text-emerald-700">{previousStats.done}</span>
                    {" · "}
                    لم يُكتمل: <span className="text-red-600">{previousStats.pending}</span>
                  </p>
                ) : null}
              </div>

              {previousDays.length === 0 ? (
                <div className="rounded-[22px] bg-white p-8 text-center text-gray-600 shadow">
                  لا توجد واجبات سابقة بعد. المهام الجديدة تظهر في يومها.
                </div>
              ) : (
                <div className="space-y-5">
                  {previousDays.map((day) => (
                    <DayCard key={day.date} day={day} onOpen={openTask} />
                  ))}
                </div>
              )}
            </section>

            <div className="text-center">
              <Link to="/courses" className="font-bold text-primary-700 hover:underline">
                العودة للدورات
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTasks;

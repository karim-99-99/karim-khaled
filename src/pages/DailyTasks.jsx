import { useEffect, useState } from "react";
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

  const openTask = (task) => {
    const path = dailyTaskQuizPath(task);
    if (!path) return;
    navigate(path);
  };

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
          تظهر مهام اليوم والأيام السابقة فقط. المهمة الخضراء تم اجتيازها.
        </p>

        {loading ? (
          <p className="text-center text-gray-600">جاري التحميل...</p>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : !data?.days?.length ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-600">
            لا توجد مهام حتى اليوم. المهام القادمة تظهر في يومها.
          </div>
        ) : (
          <div className="space-y-6">
            {data.days.map((day) => (
              <section key={day.date} className="bg-white rounded-2xl shadow overflow-hidden">
                <h2 className="px-4 py-3 bg-gray-100 font-extrabold text-dark-700">
                  {formatDay(day.date, day.is_today)}
                </h2>
                <div className="p-4 space-y-3">
                  {day.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => openTask(task)}
                      className={`w-full text-right rounded-xl border px-4 py-3 transition ${
                        task.solved
                          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                          : "border-amber-300 bg-amber-50 text-dark-800 hover:bg-amber-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-extrabold">
                          {task.lesson_name}
                          <span className="font-semibold text-sm opacity-90">
                            {" "}
                            ({task.is_bank ? "بنك" : "واجب"})
                          </span>
                        </span>
                        <span className="text-sm font-bold whitespace-nowrap">
                          {task.solved ? "تم الاجتياز" : "ابدأ"}
                        </span>
                      </div>
                      <div className={`mt-1 text-sm ${task.solved ? "text-emerald-50" : "text-gray-600"}`}>
                        {task.solved
                          ? `الدرجة ${Math.round(task.latest_score || 0)}% — حُلّت ${task.attempt_count} ${
                              task.attempt_count === 1 ? "مرة" : "مرات"
                            }`
                          : "اضغط للدخول مباشرة"}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTasks;

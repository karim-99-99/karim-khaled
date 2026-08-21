import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { getPublicTryFree, isApiBaseConfigured } from "../services/backendApi";
import { getCurrentUser } from "../services/storageService";
import { isContentStaff } from "../utils/roles";

const TryFree = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState([]);
  const isAdmin = isContentStaff(getCurrentUser());

  useEffect(() => {
    let cancelled = false;
    if (!isApiBaseConfigured()) {
      setError("الخادم غير متصل حالياً. حاول لاحقاً.");
      setLoading(false);
      return;
    }
    getPublicTryFree()
      .then((data) => {
        if (cancelled) return;
        setLessons(Array.isArray(data?.lessons) ? data.lessons : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "تعذر تحميل الدروس التجريبية.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <p className="text-sm font-bold text-primary-600 mb-2">بدون تسجيل حساب</p>
          <h1 className="text-3xl md:text-4xl font-black text-dark-700 mb-3">
            جرب مجاناً
          </h1>
          <p className="text-dark-600 max-w-2xl mx-auto leading-relaxed">
            دروس مجانية مفتوحة لكل زائر: شاهد الفيديو، حل الأسئلة، وحمّل الملفات إن وُجدت.
            باقي الموقع يحتاج حساباً يفعّله المدير.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate("/admin/try-free")}
              className="mt-4 px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
            >
              إدارة دروس التجربة المجانية
            </button>
          )}
        </div>

        {loading && (
          <p className="text-center text-gray-500 py-16">جاري تحميل الدروس…</p>
        )}
        {error && !loading && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-center">
            {error}
          </div>
        )}
        {!loading && !error && lessons.length === 0 && (
          <p className="text-center text-gray-500 py-16">
            لا توجد دروس تجريبية بعد. {isAdmin ? "أضف درساً من لوحة الإدارة." : ""}
          </p>
        )}
        {!loading && lessons.length > 0 && (
          <div className="grid gap-4">
            {lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                to={`/try-free/${encodeURIComponent(lesson.id)}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition p-5 md:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">درس {index + 1}</p>
                    <h2 className="text-xl font-extrabold text-dark-700">
                      {lesson.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                      {lesson.has_video && (
                        <span className="px-2 py-1 rounded-full bg-red-50 text-red-600">
                          فيديو
                        </span>
                      )}
                      {(lesson.question_count || 0) > 0 && (
                        <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-600">
                          {lesson.question_count} سؤال
                        </span>
                      )}
                      {lesson.has_file && (
                        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                          ملفات
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-primary-500 font-bold shrink-0">افتح ←</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TryFree;

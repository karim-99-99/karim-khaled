import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  getPublicTryFree,
  addLesson,
  deleteLesson,
} from "../../services/backendApi";

const TryFreeManagement = () => {
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPublicTryFree();
      setMeta(data);
      setLessons(Array.isArray(data?.lessons) ? data.lessons : []);
    } catch (err) {
      setToast({ type: "error", message: err.message || "تعذر التحميل" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const adminLinks = (lesson) => {
    const q = new URLSearchParams({
      itemId: lesson.id,
      subjectId: meta?.subject_id || "",
      categoryId: meta?.category_id || "",
      chapterId: meta?.chapter_id || "",
      returnUrl: "/admin/try-free",
    });
    return {
      video: `/admin/videos?${q.toString()}`,
      questions: `/admin/questions?${q.toString()}`,
      files: `/admin/files?${q.toString()}`,
    };
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !meta?.chapter_id) return;
    setBusy(true);
    try {
      await addLesson(meta.chapter_id, name.trim(), true);
      setName("");
      setToast({ type: "success", message: "تمت إضافة الدرس" });
      await load();
    } catch (err) {
      setToast({ type: "error", message: err.message || "تعذر الإضافة" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (lesson) => {
    setConfirmDialog({
      title: "حذف الدرس",
      message: `حذف «${lesson.name}» مع فيديوهاته وأسئلته وملفاته؟`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteLesson(lesson.id);
          setToast({ type: "success", message: "تم الحذف" });
          await load();
        } catch (err) {
          setToast({ type: "error", message: err.message || "تعذر الحذف" });
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="text-primary-600 font-bold mb-4"
        >
          ← لوحة التحكم
        </button>
        <h1 className="text-2xl md:text-3xl font-black text-dark-700 mb-2">
          إدارة جرب مجاناً
        </h1>
        <p className="text-dark-600 mb-6">
          هذا الجزء ظاهر لأي زائر بدون تسجيل. ارفع الفيديو والأسئلة والملفات بنفس طريقة باقي الموقع.
        </p>

        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow p-4 md:p-5 mb-6 flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الدرس الجديد"
            className="flex-1 border rounded-xl px-4 py-3"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="px-5 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
          >
            إضافة درس
          </button>
        </form>

        {loading && <p className="text-center text-gray-500">جاري التحميل…</p>}
        {!loading && lessons.length === 0 && (
          <p className="text-center text-gray-500">لا توجد دروس بعد.</p>
        )}
        <div className="space-y-4">
          {lessons.map((lesson, index) => {
            const links = adminLinks(lesson);
            return (
              <div
                key={lesson.id}
                className="bg-white rounded-2xl border shadow-sm p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">درس {index + 1}</p>
                    <h2 className="text-xl font-extrabold">{lesson.name}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {lesson.has_video ? "فيديو موجود" : "بدون فيديو"} ·{" "}
                      {lesson.question_count || 0} سؤال ·{" "}
                      {lesson.has_file ? "ملفات موجودة" : "بدون ملفات"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(lesson)}
                    className="text-red-600 font-bold text-sm"
                  >
                    حذف
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(links.video)}
                    className="px-4 py-2 rounded-full bg-red-500 text-white font-bold"
                  >
                    فيديو
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(links.questions)}
                    className="px-4 py-2 rounded-full bg-orange-500 text-white font-bold"
                  >
                    أسئلة الاختبار
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(links.files)}
                    className="px-4 py-2 rounded-full bg-blue-500 text-white font-bold"
                  >
                    ملفات
                  </button>
                  <a
                    href={`/try-free/${encodeURIComponent(lesson.id)}`}
                    className="px-4 py-2 rounded-full bg-gray-100 font-bold"
                  >
                    معاينة كزائر
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TryFreeManagement;

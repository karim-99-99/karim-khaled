import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { getCurrentUser } from "../services/storageService";
import * as backendApi from "../services/backendApi";
import { isContentStaff } from "../utils/roles";

const SUBJECTS = [
  { id: "مادة_اللفظي", label: "اللفظي" },
  { id: "مادة_الكمي", label: "الكمي" },
];

const DESCRIPTION = {
  مادة_اللفظي: "تأسيس اللفظي: مواد مجانية تساعدك تبدأ من الصفر خطوة بخطوة.",
  مادة_الكمي: "تأسيس الكمي: مواد مجانية تساعدك تثبّت الأساسيات وتبدأ التدريب.",
};

const Foundation = () => {
  const useBackend = !!import.meta.env.VITE_API_URL;
  const [selectedSubjectId, setSelectedSubjectId] = useState(SUBJECTS[0].id);
  const [activeType, setActiveType] = useState("video"); // "video" | "file"
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ videos: [], files: [] });

  const currentUser = getCurrentUser();
  const isAdmin = isContentStaff(currentUser);
  const canUpload = isAdmin && backendApi.isBackendOn();

  const [showUpload, setShowUpload] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMethod, setUploadMethod] = useState("url"); // video only: "url" | "file"
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const refresh = async () => {
    if (!useBackend) {
      setData({ videos: [], files: [] });
      return;
    }
    setLoading(true);
    try {
      const res =
        await backendApi.getPublicFoundationResources(selectedSubjectId);
      setData({
        videos: Array.isArray(res?.videos) ? res.videos : [],
        files: Array.isArray(res?.files) ? res.files : [],
      });
    } catch (e) {
      setData({ videos: [], files: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!alive) return;
        await refresh();
      } catch (e) {
        // handled in refresh
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [selectedSubjectId, useBackend]);

  const items = useMemo(() => {
    return activeType === "video" ? data.videos || [] : data.files || [];
  }, [activeType, data]);

  const handleOpen = (item) => {
    const url =
      activeType === "video"
        ? item?.video_url || item?.video_file_url || item?.video_file || ""
        : item?.file_url || item?.file || "";
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const activeSubjectLabel =
    SUBJECTS.find((s) => s.id === selectedSubjectId)?.label || "";

  const resetUpload = () => {
    setShowUpload(false);
    setUploadBusy(false);
    setUploadMethod("url");
    setUploadTitle("");
    setUploadDescription("");
    setUploadUrl("");
    setUploadFile(null);
    setEditingItem(null);
  };

  const handleOpenUpload = () => {
    setShowUpload(true);
    setUploadTitle("");
    setUploadDescription("");
    setUploadUrl("");
    setUploadFile(null);
    setUploadMethod("url");
    setEditingItem(null);
  };

  const handleEditItem = (item) => {
    if (!canUpload) return;
    setEditingItem(item || null);
    setShowUpload(true);
    setUploadBusy(false);
    setUploadTitle(item?.title || "");
    setUploadDescription(item?.description || "");

    if (activeType === "video") {
      const hasUrl = !!(
        item?.video_url ||
        (typeof item?.video_file_url === "string" &&
          item.video_file_url.startsWith("http"))
      );
      setUploadMethod(hasUrl ? "url" : "file");
      setUploadUrl(
        item?.video_url || (hasUrl ? item?.video_file_url : "") || "",
      );
    } else {
      setUploadMethod("url");
      setUploadUrl("");
    }

    setUploadFile(null);
  };

  const handleDeleteItem = async (item) => {
    if (!canUpload || !item?.id) return;
    const ok = window.confirm("هل أنت متأكد من الحذف؟");
    if (!ok) return;

    setUploadBusy(true);
    try {
      if (activeType === "video") {
        await backendApi.deleteVideo(item.id);
      } else {
        await backendApi.deleteFile(item.id);
      }
      await refresh();
    } catch (err) {
      alert(err?.message || "حدث خطأ أثناء الحذف");
    } finally {
      setUploadBusy(false);
    }
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    if (!canUpload) return;

    if (activeType === "video") {
      if (!uploadTitle.trim()) {
        alert("اكتب عنوان للفيديو");
        return;
      }
      if (uploadMethod === "file") {
        // In edit mode, file is optional (keep existing)
        if (!uploadFile && !editingItem) {
          alert("اختر ملف فيديو");
          return;
        }
      } else {
        const u = uploadUrl.trim();
        if (!u) {
          alert("اكتب رابط الفيديو");
          return;
        }
      }
    } else {
      // file
      // In edit mode, file is optional (keep existing)
      if (!uploadFile && !editingItem) {
        alert("اختر ملف");
        return;
      }
    }

    setUploadBusy(true);
    try {
      if (activeType === "video") {
        if (editingItem?.id) {
          const updates = {
            title: uploadTitle.trim(),
            description: uploadDescription.trim() || "",
          };
          if (uploadMethod === "file") {
            if (uploadFile) updates.video_file = uploadFile;
          } else {
            updates.video_url = uploadUrl.trim();
          }
          await backendApi.updateVideo(editingItem.id, updates);
        } else {
          const payload = {
            title: uploadTitle.trim(),
            description: uploadDescription.trim() || "",
          };
          if (uploadMethod === "file") {
            payload.video_file = uploadFile;
          } else {
            payload.video_url = uploadUrl.trim();
          }
          await backendApi.addPublicFoundationVideo(selectedSubjectId, payload);
        }
      } else {
        if (editingItem?.id) {
          await backendApi.updateFile(editingItem.id, {
            title: (
              uploadTitle ||
              editingItem?.title ||
              uploadFile?.name ||
              "ملف مرفق"
            ).trim(),
            description: uploadDescription.trim() || "",
            ...(uploadFile ? { file: uploadFile } : {}),
          });
        } else {
          await backendApi.addPublicFoundationFile(
            selectedSubjectId,
            uploadFile,
            {
              title: uploadTitle?.trim() || uploadFile?.name || "ملف مرفق",
              description: uploadDescription.trim() || "",
            },
          );
        }
      }
      await refresh();
      resetUpload();
    } catch (err) {
      alert(err?.message || "حدث خطأ أثناء الرفع");
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-dark-900 mb-2">
              الدروس المجانية
            </h1>
            <p className="text-sm md:text-base text-dark-600 font-medium">
              ابدأ رحلتك في تعلم أساسيات اختبار القدرات
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6">
            {/* Subject toggle */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gray-100 rounded-2xl p-1 flex gap-1 w-full max-w-sm">
                {SUBJECTS.map((s) => {
                  const isActive = s.id === selectedSubjectId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`flex-1 py-2 rounded-xl font-bold transition ${
                        isActive
                          ? "bg-primary-500 text-white"
                          : "text-dark-700 hover:bg-gray-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type toggle */}
            <div className="flex items-center justify-center mb-3">
              <div className="bg-gray-100 rounded-2xl p-1 flex gap-2 w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => setActiveType("file")}
                  className={`flex-1 py-2 rounded-xl font-bold transition ${
                    activeType === "file"
                      ? "bg-primary-500 text-white"
                      : "text-dark-700 hover:bg-gray-50"
                  }`}
                >
                  ملفات
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType("video")}
                  className={`flex-1 py-2 rounded-xl font-bold transition ${
                    activeType === "video"
                      ? "bg-red-500 text-white"
                      : "text-dark-700 hover:bg-gray-50"
                  }`}
                >
                  فيديو
                </button>
              </div>
            </div>

            <p className="text-center text-sm md:text-base text-dark-600 mb-8">
              {DESCRIPTION[selectedSubjectId] || `تأسيس ${activeSubjectLabel}`}
            </p>

            {/* Admin upload controls */}
            {isAdmin && (
              <div className="flex items-center justify-center mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenUpload}
                    disabled={!canUpload}
                    className="px-5 py-2 rounded-xl font-bold bg-primary-500 text-white hover:bg-primary-600 transition disabled:opacity-60"
                  >
                    + رفع {activeType === "video" ? "فيديو" : "ملف"}
                  </button>
                  {!backendApi.isBackendOn() && (
                    <span className="text-xs text-dark-600">
                      لازم تكون مسجل دخول كأدمن والـ Backend شغال علشان الرفع
                      يشتغل.
                    </span>
                  )}
                </div>
              </div>
            )}

            {!useBackend && (
              <div className="text-center py-12 text-dark-600">
                لازم تضيف `VITE_API_URL` عشان صفحة التأسيس تجيب البيانات من الـ
                Backend.
              </div>
            )}

            {useBackend && loading ? (
              <div className="text-center py-12">
                <p className="text-dark-600 font-medium">جاري التحميل...</p>
              </div>
            ) : useBackend && items.length === 0 ? (
              <div className="text-center py-12 text-dark-600">
                لا توجد مواد مجانية حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {items.map((it, idx) => {
                  const title = it?.title || `محاضرة ${idx + 1}`;
                  return (
                    <div
                      key={it?.id || `${activeType}-${idx}`}
                      className="bg-white rounded-2xl shadow border border-gray-200 p-5 text-center hover:shadow-lg transition"
                    >
                      <div
                        className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background:
                            activeType === "video" ? "#ef4444" : "#3b82f6",
                        }}
                      >
                        <span className="text-white text-2xl font-black">
                          {activeType === "video" ? "▶" : "📄"}
                        </span>
                      </div>
                      <div className="text-lg font-extrabold text-dark-900 mb-3">
                        {title}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => handleEditItem(it)}
                            disabled={!canUpload || uploadBusy}
                            className="px-3 py-1 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition text-xs font-bold disabled:opacity-60"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(it)}
                            disabled={!canUpload || uploadBusy}
                            className="px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition text-xs font-bold disabled:opacity-60"
                          >
                            حذف
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpen(it)}
                        className={`px-5 py-2 rounded-xl font-bold transition ${
                          activeType === "video"
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        {activeType === "video" ? "شاهد" : "افتح"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload modal (admin) */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-extrabold text-dark-900">
                  {editingItem ? "تعديل" : "رفع"}{" "}
                  {activeType === "video" ? "فيديو" : "ملف"} -{" "}
                  {activeSubjectLabel}
                </h2>
                <button
                  type="button"
                  onClick={resetUpload}
                  className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitUpload} className="space-y-4">
                {activeType === "video" && (
                  <div>
                    <label className="block text-sm font-bold text-dark-700 mb-2">
                      طريقة الرفع
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMethod("url");
                          setUploadFile(null);
                        }}
                        className={`flex-1 py-2 rounded-xl font-bold transition ${
                          uploadMethod === "url"
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        رابط
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMethod("file");
                          setUploadUrl("");
                        }}
                        className={`flex-1 py-2 rounded-xl font-bold transition ${
                          uploadMethod === "file"
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        ملف فيديو
                      </button>
                    </div>
                  </div>
                )}

                {activeType === "video" && (
                  <div>
                    <label className="block text-sm font-bold text-dark-700 mb-2">
                      العنوان
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full px-4 py-2 border rounded-xl"
                      placeholder="مثال: محاضرة 1"
                    />
                  </div>
                )}

                {activeType === "file" && (
                  <div>
                    <label className="block text-sm font-bold text-dark-700 mb-2">
                      العنوان
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full px-4 py-2 border rounded-xl"
                      placeholder="اسم الملف (اختياري)"
                    />
                  </div>
                )}

                {(activeType === "video" || activeType === "file") && (
                  <div>
                    <label className="block text-sm font-bold text-dark-700 mb-2">
                      وصف (اختياري)
                    </label>
                    <input
                      type="text"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      className="w-full px-4 py-2 border rounded-xl"
                      placeholder="وصف قصير"
                    />
                  </div>
                )}

                {activeType === "video" && uploadMethod === "url" && (
                  <div>
                    <label className="block text-sm font-bold text-dark-700 mb-2">
                      رابط الفيديو
                    </label>
                    <input
                      type="url"
                      value={uploadUrl}
                      onChange={(e) => setUploadUrl(e.target.value)}
                      className="w-full px-4 py-2 border rounded-xl"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                )}

                {(activeType === "file" ||
                  (activeType === "video" && uploadMethod === "file")) && (
                  <div>
                    <label className="block text-sm font-bold text-dark-700 mb-2">
                      اختر {activeType === "video" ? "ملف فيديو" : "ملف"}
                    </label>
                    <input
                      type="file"
                      accept={
                        activeType === "video"
                          ? "video/*"
                          : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      }
                      onChange={(e) =>
                        setUploadFile(e.target.files?.[0] || null)
                      }
                      className="w-full px-4 py-2 border rounded-xl"
                    />
                    {uploadFile && (
                      <p className="text-xs text-dark-600 mt-2">
                        الملف: {uploadFile.name}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={uploadBusy || !canUpload}
                    className="flex-1 py-2 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-60"
                  >
                    {uploadBusy
                      ? editingItem
                        ? "جاري الحفظ..."
                        : "جاري الرفع..."
                      : editingItem
                        ? "حفظ التعديل"
                        : "رفع"}
                  </button>
                  <button
                    type="button"
                    onClick={resetUpload}
                    className="flex-1 py-2 rounded-xl font-bold bg-gray-400 text-white hover:bg-gray-500 transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Foundation;

import { useState, useEffect } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
  Link,
} from "react-router-dom";
import {
  getLevelProgress,
  getCurrentUser,
  getChapterById,
  updateItemName,
  getFileByLevel,
  getVideoByLevel,
  getQuestionsByLevel,
  addItemToChapter,
  deleteItemFromChapter,
} from "../services/storageService";
import Header from "../components/Header";
import { isArabicBrowser } from "../utils/language";
import { hasCategoryAccess } from "../components/ProtectedRoute";
import {
  isBackendOn,
  getChapterById as getChapterByIdApi,
  updateLesson,
  addLesson,
  deleteLesson,
  getVideos,
  getFiles,
  getQuestions,
} from "../services/backendApi";

const Levels = () => {
  const { sectionId, subjectId, categoryId, chapterId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const returnUrl = searchParams.get("returnUrl");
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [videos, setVideos] = useState([]);
  const [files, setFiles] = useState([]);
  const [questions, setQuestions] = useState([]);
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLessonName, setNewLessonName] = useState("");

  const useBackend = !!import.meta.env.VITE_API_URL;

  const items = (chapter?.items || []).map((i) => ({
    ...i,
    hasTest: i.has_test ?? i.hasTest,
  }));

  const categoryName = (categoryId || "").includes("تأسيس")
    ? "التأسيس"
    : "التجميعات";
  const canAccessMedia =
    isAdmin || (currentUser && hasCategoryAccess(currentUser, categoryName));

  useEffect(() => {
    let c = false;
    const user = getCurrentUser();
    async function load() {
      try {
        if (useBackend) {
          const ch = await getChapterByIdApi(chapterId);
          if (!c) setChapter(ch || null);
          if (user) {
            const [v, f, q] = await Promise.all([
              getVideos(),
              getFiles(),
              getQuestions({ chapter_id: chapterId }),
            ]);
            if (!c) {
              setVideos(Array.isArray(v) ? v : []);
              setFiles(Array.isArray(f) ? f : []);
              setQuestions(Array.isArray(q) ? q : []);
            }
          } else {
            if (!c) {
              setVideos([]);
              setFiles([]);
              setQuestions([]);
            }
          }
        } else {
          if (!c) setChapter(getChapterById(chapterId) || null);
        }
      } catch (e) {
        if (!c) setChapter(null);
      } finally {
        if (!c) setLoading(false);
      }
    }
    load();
    return () => {
      c = true;
    };
  }, [chapterId, useBackend]);

  const norm = (id) => (id == null ? "" : String(id));
  const getVideoForItem = (itemId) => {
    if (useBackend)
      return (
        (videos || []).find(
          (v) => norm(v.lesson || v.itemId || v.levelId) === norm(itemId),
        ) || null
      );
    return getVideoByLevel(itemId);
  };
  const getFileForItem = (itemId) => {
    if (useBackend)
      return (
        (files || []).find(
          (f) => norm(f.lesson || f.itemId || f.levelId) === norm(itemId),
        ) || null
      );
    return getFileByLevel(itemId);
  };
  const getQuestionsForItem = (itemId) => {
    if (useBackend)
      return (questions || []).filter(
        (q) => norm(q.lesson || q.levelId || q.itemId) === norm(itemId),
      );
    return getQuestionsByLevel(itemId);
  };

  const getItemStatus = (itemId) => {
    if (!currentUser) return "available"; // Allow viewing for non-authenticated users
    const progress = getLevelProgress(currentUser.id, itemId);
    return progress ? "completed" : "available";
  };

  const handleVideoClick = (itemId) => {
    if (!currentUser) {
      // Redirect to login with return path
      navigate(
        `/login?redirect=/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/video`,
      );
      return;
    }
    if (isAdmin) {
      // For admin: navigate to video upload page with itemId pre-selected and return URL
      const returnUrl = `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`;
      navigate(
        `/admin/videos?itemId=${itemId}&returnUrl=${encodeURIComponent(returnUrl)}`,
      );
      return;
    }
    navigate(
      `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/video`,
    );
  };

  const handleQuizClick = (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      if (!currentUser) {
        // Redirect to login with return path
        navigate(
          `/login?redirect=/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/quiz`,
        );
        return;
      }
      if (isAdmin) {
        const returnUrl = `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`;
        const params = new URLSearchParams({
          itemId,
          returnUrl,
          subjectId: subjectId || "",
          categoryId: categoryId || "",
          chapterId: chapterId || "",
        });
        navigate(`/admin/questions?${params.toString()}`);
        return;
      }
      navigate(
        `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/quiz`,
      );
    } catch (error) {
      console.error("Error navigating to quiz page:", error);
      alert(
        isArabicBrowser()
          ? "حدث خطأ أثناء فتح صفحة الاختبار. يرجى المحاولة مرة أخرى."
          : "An error occurred while opening the quiz page. Please try again.",
      );
    }
  };

  const handleFileClick = (itemId) => {
    if (!currentUser) {
      // Redirect to login with return path
      navigate(
        `/login?redirect=/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/file`,
      );
      return;
    }
    if (isAdmin) {
      // For admin: navigate to file management page with itemId and return URL
      const returnUrl = `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`;
      navigate(
        `/admin/files?itemId=${itemId}&returnUrl=${encodeURIComponent(returnUrl)}`,
      );
      return;
    }
    navigate(
      `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/file`,
    );
  };

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    setEditingItem(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = async (itemId, e) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    setBusy(true);
    try {
      if (useBackend) {
        await updateLesson(itemId, { name: editName.trim() });
        const ch = await getChapterByIdApi(chapterId);
        setChapter(ch || null);
      } else {
        updateItemName(itemId, editName.trim());
        setChapter(getChapterById(chapterId) || null);
      }
      setEditingItem(null);
      setEditName("");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingItem(null);
    setEditName("");
  };

  const handleAddLesson = async () => {
    const name = newLessonName.trim();
    if (!name) return;
    setBusy(true);
    try {
      if (useBackend) {
        await addLesson(chapterId, name, true);
        const ch = await getChapterByIdApi(chapterId);
        setChapter(ch || null);
      } else {
        addItemToChapter(chapterId, name, true);
        setChapter(getChapterById(chapterId) || null);
      }
      setShowAddForm(false);
      setNewLessonName("");
    } catch (err) {
      alert(err?.message || "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (itemId) => {
    if (!window.confirm("هل تريد حذف هذا الدرس؟")) return;
    setBusy(true);
    try {
      if (useBackend) {
        await deleteLesson(itemId);
        const ch = await getChapterByIdApi(chapterId);
        setChapter(ch || null);
      } else {
        deleteItemFromChapter(itemId);
        setChapter(getChapterById(chapterId) || null);
      }
    } catch (err) {
      alert(err?.message || "حدث خطأ أثناء الحذف");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">جاري التحميل...</p>
      </div>
    );
  }
  if (!chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">الفصل غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <button
                onClick={() => {
                  if (returnUrl) {
                    navigate(returnUrl);
                  } else {
                    navigate(
                      `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapters`,
                    );
                  }
                }}
                className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium"
              >
                ← رجوع
              </button>
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    + {isArabicBrowser() ? "إضافة درس" : "Add Lesson"}
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/admin/lessons?chapterId=${chapterId}`)
                    }
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    📖 {isArabicBrowser() ? "إدارة الدروس" : "Manage Lessons"}
                  </button>
                </div>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
              {chapter?.name || "الدروس"}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">
              اختر الدرس
            </p>
          </div>

          {isAdmin && showAddForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-300">
              <h3 className="text-lg font-bold text-dark-600 mb-3">
                {isArabicBrowser() ? "إضافة درس جديد" : "Add New Lesson"}
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  placeholder={isArabicBrowser() ? "اسم الدرس" : "Lesson name"}
                  className="flex-1 px-4 py-2 border rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLesson();
                  }}
                />
                <button
                  onClick={handleAddLesson}
                  disabled={busy}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 font-medium disabled:opacity-60"
                >
                  {isArabicBrowser() ? "حفظ" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewLessonName("");
                  }}
                  className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500"
                >
                  {isArabicBrowser() ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {!currentUser && !isAdmin && (
            <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-xl text-center">
              <p className="text-dark-700 font-medium mb-3">
                {isArabicBrowser()
                  ? "سجّل الدخول لمشاهدة الفيديوهات والملفات وحل الاختبارات"
                  : "Sign in to watch videos, read files, and take quizzes"}
              </p>
              <Link
                to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                className="inline-block px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
              >
                {isArabicBrowser() ? "تسجيل الدخول" : "Sign in"}
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const status = getItemStatus(item.id);
              const progress = currentUser
                ? getLevelProgress(currentUser.id, item.id)
                : null;

              return (
                <div
                  key={item.id}
                  className={`
                  relative bg-secondary-100 border-2 border-secondary-300 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6
                `}
                >
                  {isAdmin && (
                    <div className="absolute top-2 left-2 flex gap-2 z-10">
                      <button
                        onClick={(e) =>
                          editingItem === item.id
                            ? handleSaveEdit(item.id, e)
                            : handleEditClick(item, e)
                        }
                        disabled={busy}
                        className="bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-lg text-sm font-medium disabled:opacity-60"
                      >
                        {editingItem === item.id ? "💾" : "✏️"}
                      </button>
                      {editingItem !== item.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLesson(item.id);
                          }}
                          disabled={busy}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg text-sm font-medium disabled:opacity-60"
                        >
                          🗑️
                        </button>
                      )}
                      {editingItem === item.id && (
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg text-sm font-medium"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                  {status === "completed" && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-lg md:text-xl w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-md font-bold">
                      ✓
                    </div>
                  )}
                  {progress && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      {progress.score}%
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <div className="text-3xl md:text-4xl mb-2">📚</div>
                    {editingItem === item.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-base md:text-lg lg:text-xl font-bold text-dark-900 mb-1 border-2 border-primary-500 rounded px-2 py-1 bg-white"
                        autoFocus
                      />
                    ) : (
                      <h2 className="text-base md:text-lg lg:text-xl font-bold text-dark-900 mb-1">
                        {item.name}
                      </h2>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {isAdmin ? (
                      <>
                        <button
                          onClick={() => handleVideoClick(item.id)}
                          className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium flex items-center justify-center gap-2"
                        >
                          📤{" "}
                          {isArabicBrowser()
                            ? "رفع فيديو للدرس"
                            : "Upload Video"}
                        </button>

                        <button
                          onClick={() => handleFileClick(item.id)}
                          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition font-medium flex items-center justify-center gap-2"
                        >
                          📄{" "}
                          {isArabicBrowser() ? "رفع ملف مرفق" : "Upload File"}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleQuizClick(item.id, e)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium flex items-center justify-center gap-2"
                        >
                          📝{" "}
                          {isArabicBrowser() ? "إدارة الاختبار" : "Manage Quiz"}
                        </button>
                      </>
                    ) : (
                      <>
                        {(() => {
                          if (!currentUser) {
                            return (
                              <p className="text-dark-600 text-sm font-medium">
                                {isArabicBrowser()
                                  ? "سجّل الدخول لمشاهدة المحتوى وحل الاختبارات"
                                  : "Sign in to view content and take quizzes"}
                              </p>
                            );
                          }
                          const video = getVideoForItem(item.id);
                          const file = getFileForItem(item.id);
                          const qs = getQuestionsForItem(item.id);
                          const hasExam = qs && qs.length > 0;

                          const showVideo = video && canAccessMedia;
                          const showFile = file && canAccessMedia;

                          if (!showVideo && !showFile && !hasExam) {
                            return null;
                          }

                          return (
                            <>
                              {showVideo && (
                                <button
                                  onClick={() => handleVideoClick(item.id)}
                                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium flex items-center justify-center gap-2"
                                >
                                  🎥{" "}
                                  {isArabicBrowser()
                                    ? "مشاهدة الفيديو"
                                    : "Watch Video"}
                                </button>
                              )}

                              {showFile && (
                                <button
                                  onClick={() => handleFileClick(item.id)}
                                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition font-medium flex items-center justify-center gap-2"
                                >
                                  📄{" "}
                                  {isArabicBrowser()
                                    ? "قراءة الملف المرفق"
                                    : "Read File"}
                                </button>
                              )}

                              {hasExam && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuizClick(item.id, e)}
                                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium flex items-center justify-center gap-2"
                                >
                                  📝{" "}
                                  {isArabicBrowser()
                                    ? "حل الاختبار"
                                    : "Take Quiz"}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Levels;

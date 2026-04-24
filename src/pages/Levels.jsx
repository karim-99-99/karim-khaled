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
  reorderItemInChapter,
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
  getQuizAttempts,
  getLessonProgressList,
  reorderLessonsForChapter,
  pingHealth,
} from "../services/backendApi";
import { prefetchLessonMediaRoutes } from "../utils/routePrefetch";
import { isContentStaff } from "../utils/roles";

const CHAPTER_CACHE_PREFIX = "levels_chapter_cache_v1_";
const CHAPTER_CACHE_TTL_MS = 8 * 60 * 1000;

function readChapterCache(chapterId) {
  if (typeof window === "undefined" || !chapterId) return null;
  try {
    const raw = sessionStorage.getItem(`${CHAPTER_CACHE_PREFIX}${chapterId}`);
    if (!raw) return null;
    const { t, chapter } = JSON.parse(raw);
    if (!chapter || !t) return null;
    if (Date.now() - t > CHAPTER_CACHE_TTL_MS) return null;
    return chapter;
  } catch {
    return null;
  }
}

function writeChapterCache(chapterId, ch) {
  if (typeof window === "undefined" || !chapterId || !ch) return;
  try {
    sessionStorage.setItem(
      `${CHAPTER_CACHE_PREFIX}${chapterId}`,
      JSON.stringify({ t: Date.now(), chapter: ch })
    );
  } catch {
    // ignore quota / private mode
  }
}

const Levels = () => {
  const { sectionId, subjectId, categoryId, chapterId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const returnUrl = searchParams.get("returnUrl");
  // Prefer route state, then a fresh recent cache — avoids long waits on return from quiz/result.
  const navChapter = location.state?.chapter;
  const navMatches =
    navChapter && String(navChapter.id) === String(chapterId) ? navChapter : null;
  const cachedChapter = navMatches ? null : readChapterCache(chapterId);
  const initialChapter = navMatches || cachedChapter;
  const [chapter, setChapter] = useState(initialChapter);
  const [loading, setLoading] = useState(!initialChapter);
  const [busy, setBusy] = useState(false);
  const [videos, setVideos] = useState([]);
  const [files, setFiles] = useState([]);
  const currentUser = getCurrentUser();
  const isAdmin = isContentStaff(currentUser);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLessonName, setNewLessonName] = useState("");
  /** For students: lessonId -> 'completed' | 'started' | 'not_started' (backend only) */
  const [lessonStatusMap, setLessonStatusMap] = useState({});
  /** للزائر: عرض نافذة "يرجى تسجيل الدخول أو إنشاء حساب" عند الضغط على أي خيار */
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  /** للحساب غير المفعل: عرض نافذة التواصل مع الإدارة + واتساب */
  const [showActivationRequiredModal, setShowActivationRequiredModal] = useState(false);

  const useBackend = !!import.meta.env.VITE_API_URL;
  const isStudentNotActive =
    currentUser?.role === "student" &&
    (currentUser?.isActive === false || currentUser?.is_active_account === false);

  const items = (chapter?.items || []).map((i) => ({
    ...i,
    hasTest: i.has_test ?? i.hasTest,
    questionCount: Number(i.question_count ?? i.questionCount ?? 0) || 0,
  }));
  const sortedItems = [...items].sort(
    (a, b) => (a?.order ?? 0) - (b?.order ?? 0)
  );

  const categoryName = (categoryId || "").includes("تأسيس")
    ? "التأسيس"
    : "التجميعات";
  const isTajmiat = categoryName === "التجميعات";
  const lessonLabel = isTajmiat ? "البنك" : "الدرس";
  const manageLabel = isTajmiat ? "إدارة البنك" : "إدارة الواجب";
  const solveLabel = isTajmiat ? "حل البنك" : "حل الواجب";
  const canAccessMedia =
    isAdmin || (currentUser && hasCategoryAccess(currentUser, categoryName));

  // Wake cold backend; cheap no-op if already up.
  useEffect(() => {
    if (useBackend) pingHealth();
  }, [useBackend]);

  useEffect(() => {
    let c = false;
    const applySeedFromNavigation = () => {
      const nav = location.state?.chapter;
      if (nav && String(nav.id) === String(chapterId)) {
        setChapter((prev) => {
          if (Array.isArray(nav.items) && nav.items.length) return { ...nav };
          if (prev && String(prev.id) === String(chapterId) && (prev.items || []).length)
            return { ...nav, items: nav.items && nav.items.length ? nav.items : prev.items };
          return { ...nav };
        });
        setLoading(false);
        return;
      }
      const cached = readChapterCache(chapterId);
      if (cached) {
        setChapter(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
    };
    applySeedFromNavigation();

    async function load() {
      if (!useBackend) {
        if (!c) {
          setChapter(getChapterById(chapterId) || null);
          setLoading(false);
        }
        return;
      }
      try {
        // Critical path: chapter only — do not block UI on videos/files lists.
        const ch = await getChapterByIdApi(chapterId);
        if (!c && ch) {
          setChapter(ch);
          writeChapterCache(chapterId, ch);
          setLoading(false);
        } else if (!c && !ch) {
          setLoading(false);
        }
        if (c) return;
        Promise.all([
          getVideos({ chapter_id: chapterId }),
          getFiles({ chapter_id: chapterId }),
        ])
          .then(([v, f]) => {
            if (c) return;
            setVideos(Array.isArray(v) ? v : []);
            setFiles(Array.isArray(f) ? f : []);
          })
          .catch(() => {});
      } catch (e) {
        if (!c) setLoading(false);
      }
    }
    load();
    return () => {
      c = true;
    };
  }, [chapterId, useBackend, location.key, location.state?.chapter]);

  useEffect(() => {
    if (chapterId) prefetchLessonMediaRoutes();
  }, [chapterId]);

  const norm = (id) => (id == null ? "" : String(id));
  const getVideoForItem = (itemId) => {
    if (useBackend)
      return (
        (videos || []).find(
          (v) => norm(v.lesson || v.itemId || v.levelId) === norm(itemId)
        ) || null
      );
    return getVideoByLevel(itemId);
  };
  const getFileForItem = (itemId) => {
    if (useBackend)
      return (
        (files || []).find(
          (f) => norm(f.lesson || f.itemId || f.levelId) === norm(itemId)
        ) || null
      );
    return getFileByLevel(itemId);
  };
  const getQuestionsForItem = (itemId) => {
    if (useBackend) return [];
    return getQuestionsByLevel(itemId);
  };

  const getItemStatus = (itemId) => {
    if (!currentUser) return "not_started";
    if (useBackend && !isAdmin && lessonStatusMap[itemId])
      return lessonStatusMap[itemId];
    const progress = getLevelProgress(currentUser.id, itemId);
    if (progress) return "completed";
    if (!useBackend && currentUser) {
      try {
        const key = `quiz_progress_${itemId}_${currentUser.id || "guest"}`;
        const saved = localStorage.getItem(key);
        if (saved) return "started";
      } catch (_) {}
    }
    return "not_started";
  };

  /** Load student lesson status (completed / started / not_started) when using backend */
  useEffect(() => {
    if (!useBackend || !currentUser || isAdmin) return;
    let c = false;
    (async () => {
      try {
        const [attempts, progressList] = await Promise.all([
          getQuizAttempts({ chapter_id: chapterId }),
          getLessonProgressList({ chapter_id: chapterId }),
        ]);
        if (c) return;
        const lessonId = (x) => (x && typeof x === "object" ? x.id : x);
        const completedIds = new Set(
          (attempts || [])
            .map((a) => lessonId(a.lesson))
            .filter((id) => id != null)
        );
        const startedIds = new Set(
          (progressList || [])
            .map((p) => lessonId(p.lesson))
            .filter((id) => id != null)
        );
        const map = {};
        completedIds.forEach((id) => { map[id] = "completed"; });
        startedIds.forEach((id) => {
          if (!completedIds.has(id)) map[id] = "started";
        });
        setLessonStatusMap(map);
      } catch (e) {
        if (!c) setLessonStatusMap({});
      }
    })();
    return () => { c = true; };
  }, [useBackend, currentUser?.id, isAdmin, chapterId]);

  const handleVideoClick = (itemId) => {
    if (!currentUser) {
      setShowLoginRequiredModal(true);
      return;
    }
    if (isStudentNotActive) {
      setShowActivationRequiredModal(true);
      return;
    }
    if (isAdmin) {
      // For admin: navigate to video upload page with itemId pre-selected and return URL
      const returnUrl = `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`;
      navigate(
        `/admin/videos?itemId=${itemId}&returnUrl=${encodeURIComponent(
          returnUrl
        )}`
      );
      return;
    }
    navigate(
      `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/video`,
      { state: { chapter: chapter || { id: chapterId, items: [] } } }
    );
  };

  const handleQuizClick = (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      if (!currentUser) {
        setShowLoginRequiredModal(true);
        return;
      }
      if (isStudentNotActive) {
        setShowActivationRequiredModal(true);
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
        { state: { chapter: chapter || { id: chapterId, items: [] } } }
      );
    } catch (error) {
      console.error("Error navigating to quiz page:", error);
      alert(
        isArabicBrowser()
          ? "حدث خطأ أثناء فتح صفحة الواجب. يرجى المحاولة مرة أخرى."
          : "An error occurred while opening the quiz page. Please try again."
      );
    }
  };

  const handleFileClick = (itemId) => {
    if (!currentUser) {
      setShowLoginRequiredModal(true);
      return;
    }
    if (isStudentNotActive) {
      setShowActivationRequiredModal(true);
      return;
    }
    if (isAdmin) {
      // For admin: navigate to file management page with itemId and return URL
      const returnUrl = `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`;
      navigate(
        `/admin/files?itemId=${itemId}&returnUrl=${encodeURIComponent(
          returnUrl
        )}`
      );
      return;
    }
    navigate(
      `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${itemId}/file`,
      { state: { chapter: chapter || { id: chapterId, items: [] } } }
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
    if (
      !window.confirm(
        isTajmiat ? "هل تريد حذف هذا البنك؟" : "هل تريد حذف هذا الدرس؟"
      )
    )
      return;
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

  const handleMoveLessonInline = async (itemId, direction) => {
    if (!itemId || !chapterId) return;

    const idx = sortedItems.findIndex((x) => x?.id === itemId);
    if (idx === -1) return;

    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sortedItems.length) return;

    // Optimistic local swap + order normalization for instant UI
    const reordered = [...sortedItems];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const withOrder = reordered.map((l, i) => ({ ...l, order: i + 1 }));
    setChapter((prev) => (prev ? { ...prev, items: withOrder } : prev));

    setBusy(true);
    try {
      if (useBackend) {
        await reorderLessonsForChapter(
          chapterId,
          withOrder.map((l) => l.id)
        );
        // Background refresh — don't block UI
        getChapterByIdApi(chapterId)
          .then((ch) => ch && setChapter(ch))
          .catch(() => {});
      } else {
        reorderItemInChapter(chapterId, itemId, direction);
        setChapter(getChapterById(chapterId) || null);
      }
    } catch (err) {
      alert(err?.message || "حدث خطأ أثناء تغيير الترتيب");
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
                      `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapters`
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
                    +{" "}
                    {isArabicBrowser()
                      ? isTajmiat
                        ? "إضافة بنك"
                        : "إضافة درس"
                      : "Add Lesson"}
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/admin/lessons?chapterId=${chapterId}`)
                    }
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    📖{" "}
                    {isArabicBrowser()
                      ? isTajmiat
                        ? "إدارة البنوك"
                        : "إدارة الدروس"
                      : "Manage Lessons"}
                  </button>
                </div>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
              {chapter?.name || (isTajmiat ? "البنوك" : "الدروس")}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">
              اختر {lessonLabel}
            </p>
          </div>

          {isAdmin && showAddForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-300">
              <h3 className="text-lg font-bold text-dark-600 mb-3">
                {isArabicBrowser()
                  ? isTajmiat
                    ? "إضافة بنك جديد"
                    : "إضافة درس جديد"
                  : "Add New Lesson"}
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  placeholder={
                    isArabicBrowser()
                      ? isTajmiat
                        ? "اسم البنك"
                        : "اسم الدرس"
                      : "Lesson name"
                  }
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
                  ? "سجّل الدخول لمشاهدة الفيديوهات والملفات وحل الواجبات"
                  : "Sign in to watch videos, read files, and take quizzes"}
              </p>
              <Link
                to={`/login?redirect=${encodeURIComponent(
                  location.pathname + location.search
                )}`}
                className="inline-block px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
              >
                {isArabicBrowser() ? "تسجيل الدخول" : "Sign in"}
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedItems.map((item) => {
              const status = getItemStatus(item.id);
              const itemIndex = sortedItems.findIndex((x) => x?.id === item.id);
              const canMoveUp = itemIndex > 0;
              const canMoveDown =
                itemIndex !== -1 && itemIndex < sortedItems.length - 1;
              const progress = currentUser
                ? getLevelProgress(currentUser.id, item.id)
                : null;
              const isCompleted = status === "completed";
              const isStarted = status === "started";
              const cardBg = isAdmin
                ? "bg-secondary-100 border-secondary-300"
                : isCompleted
                ? "bg-green-100 border-green-400"
                : isStarted
                ? "bg-yellow-100 border-yellow-400"
                : "bg-secondary-100 border-secondary-300";
              const isVerbal = subjectId === "مادة_اللفظي";
              const isQuantitative = subjectId === "مادة_الكمي";
              const lessonBgLetters = "د ر و س أ ب ت ث ج ح";
              const lessonBgMath = [
                "١+٢=٣", "٤×٥", "٦−٧", "٨÷٢", "٠", "√٤=٢", "π", "٩", "∑", "٤٩",
              ];

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden border-2 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6 ${cardBg}`}
                >
                  {isVerbal && (
                    <div
                      className="absolute inset-0 flex flex-wrap content-center justify-center gap-2 sm:gap-3 p-4 opacity-[0.12] select-none pointer-events-none"
                      aria-hidden
                      style={{ fontFamily: "'Amiri', serif" }}
                    >
                      {lessonBgLetters.split(" ").map((char, i) => (
                        <span
                          key={`item-${item.id}-${i}`}
                          className="font-bold text-dark-800 text-5xl sm:text-6xl md:text-7xl"
                          style={{
                            transform: `rotate(${(i % 3) * 6 - 6}deg)`,
                          }}
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  )}
                  {isQuantitative && (
                    <div
                      className="absolute inset-0 flex flex-wrap content-center justify-center gap-2 sm:gap-3 p-4 opacity-[0.12] select-none pointer-events-none"
                      aria-hidden
                      style={{ fontFamily: "'Amiri', serif" }}
                    >
                      {lessonBgMath.map((num, i) => (
                        <span
                          key={`item-q-${item.id}-${i}`}
                          className="font-bold text-dark-800 text-5xl sm:text-6xl md:text-7xl"
                          style={{
                            transform: `rotate(${(i % 3) * 6 - 6}deg)`,
                          }}
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  )}
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
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveLessonInline(item.id, "up");
                            }}
                            disabled={busy || !canMoveUp}
                            className="bg-gray-400 hover:bg-gray-500 text-white p-2 rounded-lg text-sm font-medium disabled:opacity-60"
                            title="تحريك لأعلى"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveLessonInline(item.id, "down");
                            }}
                            disabled={busy || !canMoveDown}
                            className="bg-gray-400 hover:bg-gray-500 text-white p-2 rounded-lg text-sm font-medium disabled:opacity-60"
                            title="تحريك لأسفل"
                          >
                            ↓
                          </button>
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
                        </>
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
                    <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      {progress.score}%
                    </div>
                  )}

                  <div className="relative z-10">
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
                            ? isTajmiat
                              ? "رفع فيديو للبنك"
                              : "رفع فيديو للدرس"
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
                          📝 {isArabicBrowser() ? manageLabel : "Manage Quiz"}
                        </button>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const video = getVideoForItem(item.id);
                          const file = getFileForItem(item.id);
                          const qs = getQuestionsForItem(item.id);
                          const hasExam = useBackend
                            ? item.questionCount > 0
                            : qs && qs.length > 0;
                          const isGuest = !currentUser;
                          const showVideo = isGuest
                            ? true
                            : !!(video && canAccessMedia);
                          const showFile = isGuest
                            ? true
                            : !!(file && canAccessMedia);
                          const showQuiz = isGuest ? true : hasExam;

                          if (!showVideo && !showFile && !showQuiz) {
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

                              {showQuiz && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuizClick(item.id, e)}
                                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium flex items-center justify-center gap-2"
                                >
                                  📝{" "}
                                  {isArabicBrowser() ? solveLabel : "Take Quiz"}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* نافذة للزائر: يرجى تسجيل الدخول أو إنشاء حساب */}
      {showLoginRequiredModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowLoginRequiredModal(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center border-2 border-primary-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-dark-800 font-bold text-lg md:text-xl mb-4">
              {isArabicBrowser()
                ? "الرجاء تسجيل الدخول أو إنشاء حساب جديد"
                : "Please log in or create a new account"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`/login?redirect=${encodeURIComponent(
                  location.pathname + location.search
                )}`}
                className="px-5 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
              >
                {isArabicBrowser() ? "تسجيل الدخول" : "Log in"}
              </Link>
              <Link
                to={`/register?redirect=${encodeURIComponent(
                  location.pathname + location.search
                )}`}
                className="px-5 py-2.5 bg-secondary-500 text-white rounded-lg font-medium hover:bg-secondary-600 transition"
              >
                {isArabicBrowser() ? "إنشاء حساب" : "Create account"}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setShowLoginRequiredModal(false)}
              className="mt-4 text-dark-600 hover:text-dark-800 text-sm font-medium"
            >
              {isArabicBrowser() ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* نافذة للحساب غير المفعل: التواصل مع الإدارة عبر واتساب */}
      {showActivationRequiredModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowActivationRequiredModal(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center border-2 border-primary-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">🔒</div>
            <p className="text-dark-800 font-bold text-lg md:text-xl mb-2">
              {isArabicBrowser()
                ? "يرجى التواصل مع الإدارة لتفعيل الحساب"
                : "Please contact administration to activate your account"}
            </p>
            <p className="text-dark-600 text-sm mb-4">
              {isArabicBrowser()
                ? "حسابك قيد المراجعة. تواصل معنا عبر واتساب لتفعيله."
                : "Your account is under review. Contact us via WhatsApp to activate it."}
            </p>
            <a
              href="https://wa.me/966502403757"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20BD5A] transition shadow-lg"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {isArabicBrowser() ? "تواصل عبر واتساب" : "Contact via WhatsApp"}
            </a>
            <button
              type="button"
              onClick={() => setShowActivationRequiredModal(false)}
              className="mt-4 block w-full text-dark-600 hover:text-dark-800 text-sm font-medium"
            >
              {isArabicBrowser() ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Levels;

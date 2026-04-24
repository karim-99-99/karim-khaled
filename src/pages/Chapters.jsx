import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCategoryById,
  getCurrentUser,
  updateChapterName,
  addChapterToCategory,
  deleteChapterFromCategory,
  setChapterOrderByIds,
} from "../services/storageService";
import Header from "../components/Header";
import { isArabicBrowser } from "../utils/language";
import { isContentStaff } from "../utils/roles";
import {
  isBackendOn,
  getCategoryById as getCategoryByIdApi,
  addChapter,
  updateChapter,
  deleteChapter,
  reorderChaptersForCategory,
} from "../services/backendApi";

const Chapters = () => {
  const { sectionId, subjectId, categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const currentUser = getCurrentUser();
  const isAdmin = isContentStaff(currentUser);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");

  const useBackend = !!import.meta.env.VITE_API_URL;

  useEffect(() => {
    let c = false;
    async function load() {
      try {
        if (useBackend) {
          const cat = await getCategoryByIdApi(categoryId);
          if (!c) setCategory(cat || null);
        } else {
          if (!c) setCategory(getCategoryById(categoryId) || null);
        }
      } finally {
        if (!c) setLoading(false);
      }
    }
    load();
    return () => {
      c = true;
    };
  }, [categoryId, useBackend]);

  const handleChapterClick = (chapterId, e) => {
    if (e?.target?.closest(".edit-btn")) return;
    navigate(
      `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`
    );
  };

  const handleEditClick = (chapter, e) => {
    e.stopPropagation();
    setEditingChapter(chapter.id);
    setEditName(chapter.name);
  };

  const handleSaveEdit = async (chapterId, e) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    setBusy(true);
    try {
      if (useBackend) {
        await updateChapter(chapterId, { name: editName.trim() });
        const cat = await getCategoryByIdApi(categoryId);
        setCategory(cat || null);
      } else {
        updateChapterName(chapterId, editName.trim());
        setCategory(getCategoryById(categoryId) || null);
      }
      setEditingChapter(null);
      setEditName("");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingChapter(null);
    setEditName("");
  };

  const handleAddChapter = async () => {
    const name = newChapterName.trim();
    if (!name) return;
    setBusy(true);
    try {
      if (useBackend) {
        await addChapter(categoryId, name);
        const cat = await getCategoryByIdApi(categoryId);
        setCategory(cat || null);
      } else {
        addChapterToCategory(categoryId, name);
        setCategory(getCategoryById(categoryId) || null);
      }
      setShowAddForm(false);
      setNewChapterName("");
    } catch (err) {
      alert(err?.message || "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  const isTajmiat = category?.name === "التجميعات";
  const chapterLabel = isTajmiat ? "المستوى" : "القسم";
  const chapterLabelPlural = isTajmiat ? "المستويات" : "الأقسام";

  const handleDeleteChapter = async (chapterId) => {
    if (
      !window.confirm(
        isTajmiat ? "هل تريد حذف هذا المستوى؟" : "هل تريد حذف هذا القسم؟"
      )
    )
      return;
    setBusy(true);
    try {
      if (useBackend) {
        await deleteChapter(chapterId);
        const cat = await getCategoryByIdApi(categoryId);
        setCategory(cat || null);
      } else {
        deleteChapterFromCategory(chapterId);
        setCategory(getCategoryById(categoryId) || null);
      }
    } catch (err) {
      alert(err?.message || "حدث خطأ أثناء الحذف");
    } finally {
      setBusy(false);
    }
  };

  const getSortedChapters = () =>
    [...(category?.chapters || [])].sort(
      (a, b) => (a?.order ?? 0) - (b?.order ?? 0)
    );

  const applyFullChapterOrder = async (withOrder) => {
    if (!categoryId) return;
    setCategory((prev) => (prev ? { ...prev, chapters: withOrder } : null));
    setBusy(true);
    try {
      if (useBackend) {
        await reorderChaptersForCategory(
          categoryId,
          withOrder.map((c) => c.id)
        );
        const cat = await getCategoryByIdApi(categoryId);
        if (cat) setCategory(cat);
      } else {
        setChapterOrderByIds(
          categoryId,
          withOrder.map((c) => c.id)
        );
        setCategory(getCategoryById(categoryId) || null);
      }
    } catch (err) {
      alert(err?.message || "حدث خطأ أثناء تغيير الترتيب");
    } finally {
      setBusy(false);
    }
  };

  const handleMoveChapterInline = async (chId, direction) => {
    const sorted = getSortedChapters();
    if (!chId || sorted.length < 2) return;
    const idx = sorted.findIndex((c) => c.id === chId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const withOrder = reordered.map((c, i) => ({ ...c, order: i + 1 }));
    await applyFullChapterOrder(withOrder);
  };

  const handleMoveChapterToPosition = async (chId, newPosition1Based) => {
    const sorted = getSortedChapters();
    if (!chId || sorted.length < 2) return;
    const from = sorted.findIndex((c) => c.id === chId);
    if (from === -1) return;
    const to = Math.max(0, Math.min(newPosition1Based - 1, sorted.length - 1));
    if (from === to) return;
    const reordered = [...sorted];
    const [row] = reordered.splice(from, 1);
    reordered.splice(to, 0, row);
    const withOrder = reordered.map((c, i) => ({ ...c, order: i + 1 }));
    await applyFullChapterOrder(withOrder);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">جاري التحميل...</p>
      </div>
    );
  }
  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">التصنيف غير موجود</p>
      </div>
    );
  }

  const sortedChapterList = getSortedChapters();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <button
                onClick={() =>
                  navigate(
                    `/section/${sectionId}/subject/${subjectId}/categories`
                  )
                }
                className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium"
              >
                ← رجوع
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                >
                  +{" "}
                  {isArabicBrowser()
                    ? isTajmiat
                      ? "إضافة مستوى"
                      : "إضافة قسم"
                    : "Add Chapter"}
                </button>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
              {category.name}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">
              اختر {chapterLabel}
            </p>
            {isAdmin && sortedChapterList.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                لترتيب {chapterLabelPlural}: استخدم السهمين أو اختر رقم المركز من
                القائمة بجانب كل بطاقة.
              </p>
            )}
          </div>

          {/* Add Chapter Form for Admin */}
          {isAdmin && showAddForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-300">
              <h3 className="text-lg font-bold text-dark-600 mb-3">
                {isArabicBrowser()
                  ? isTajmiat
                    ? "إضافة مستوى جديد"
                    : "إضافة قسم جديد"
                  : "Add New Chapter"}
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder={
                    isArabicBrowser()
                      ? isTajmiat
                        ? "اسم المستوى"
                        : "اسم القسم"
                      : "Chapter name"
                  }
                  className="flex-1 px-4 py-2 border rounded-lg"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddChapter();
                    }
                  }}
                />
                <button
                  onClick={handleAddChapter}
                  disabled={busy}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition font-medium disabled:opacity-60"
                >
                  {isArabicBrowser() ? "حفظ" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewChapterName("");
                  }}
                  className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
                >
                  {isArabicBrowser() ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedChapterList.map((chapter, itemIndex) => {
              const canChUp = itemIndex > 0;
              const canChDown = itemIndex < sortedChapterList.length - 1;
              const isVerbal = subjectId === "مادة_اللفظي";
              const isQuantitative = subjectId === "مادة_الكمي";
              const chapterBgLetters = "ف ص و ل أ ب ت ث ج ح";
              const chapterBgMath = [
                "١+٢=٣", "٤×٥", "٦−٧", "٨÷٢", "٠", "√٤=٢", "π", "٩", "∑", "٤٩",
              ];
              return (
              <div
                key={chapter.id}
                onClick={(e) => handleChapterClick(chapter.id, e)}
                className="bg-secondary-100 border-2 border-secondary-300 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6 text-right cursor-pointer relative overflow-hidden"
              >
                {isVerbal && (
                  <div
                    className="absolute inset-0 flex flex-wrap content-center justify-center gap-2 sm:gap-3 p-4 opacity-[0.12] select-none pointer-events-none"
                    aria-hidden
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    {chapterBgLetters.split(" ").map((char, i) => (
                      <span
                        key={`ch-${chapter.id}-${i}`}
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
                    {chapterBgMath.map((item, i) => (
                      <span
                        key={`ch-q-${chapter.id}-${i}`}
                        className="font-bold text-dark-800 text-5xl sm:text-6xl md:text-7xl"
                        style={{
                          transform: `rotate(${(i % 3) * 6 - 6}deg)`,
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {isAdmin && (
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10 max-w-[min(100%,12rem)]">
                    <button
                      onClick={(e) =>
                        editingChapter === chapter.id
                          ? handleSaveEdit(chapter.id, e)
                          : handleEditClick(chapter, e)
                      }
                      className="edit-btn bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-lg text-sm font-medium"
                    >
                      {editingChapter === chapter.id ? "💾" : "✏️"}
                    </button>
                    {editingChapter !== chapter.id && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapterInline(chapter.id, "up");
                          }}
                          disabled={busy || !canChUp}
                          className="edit-btn bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg text-sm font-medium disabled:opacity-50"
                          title="أعلى"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapterInline(chapter.id, "down");
                          }}
                          disabled={busy || !canChDown}
                          className="edit-btn bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg text-sm font-medium disabled:opacity-50"
                          title="أسفل"
                        >
                          ↓
                        </button>
                        <label
                          className="flex items-center gap-0.5 bg-slate-700/90 text-white rounded-lg px-1.5 py-1"
                          title="المركز (1 = الأول)"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] opacity-90">#</span>
                          <select
                            value={itemIndex + 1}
                            disabled={busy || sortedChapterList.length < 2}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleMoveChapterToPosition(
                                chapter.id,
                                Number(e.target.value)
                              );
                            }}
                            className="text-xs rounded border-0 bg-white text-gray-900 max-w-[3.25rem] py-0.5 pr-1 cursor-pointer"
                          >
                            {sortedChapterList.map((_, i) => (
                              <option key={i} value={i + 1}>
                                {i + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(chapter.id);
                          }}
                          className="edit-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg text-sm font-medium"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                )}
                {isAdmin && editingChapter === chapter.id && (
                  <button
                    onClick={handleCancelEdit}
                    className="edit-btn absolute top-2 right-2 bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg text-sm font-medium z-10"
                  >
                    ✕
                  </button>
                )}
                <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                    {itemIndex + 1}
                  </div>
                </div>
                {editingChapter === chapter.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-lg md:text-xl lg:text-2xl font-bold text-dark-900 mb-2 border-2 border-primary-500 rounded px-2 py-1 bg-white"
                    autoFocus
                  />
                ) : (
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-900 mb-2">
                    {chapter.name}
                  </h2>
                )}

                <div className="mt-4 text-sm md:text-base text-dark-600 font-medium">
                  {chapter.lesson_count ?? chapter.items?.length ?? 0}{" "}
                  {isTajmiat ? "بنك" : "درس"}
                </div>
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

export default Chapters;

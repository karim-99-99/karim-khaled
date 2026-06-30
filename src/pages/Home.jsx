import { useLocation, useNavigate } from "react-router-dom";
import {
  addChapterToCategory,
  deleteChapterFromCategory,
  getCategoryById,
  getSections,
  getCurrentUser,
  updateChapterName,
  setChapterOrderByIds,
} from "../services/storageService";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import CourseScatteredBackground from "../components/CourseScatteredBackground";
import CourseNavButton from "../components/CourseNavButton";
import { resolveCourseBackgroundVariant } from "../data/courseBackgroundWords";
import {
  hasSectionAccess,
  hasSubjectAccess,
} from "../components/ProtectedRoute";
import {
  addChapter,
  deleteChapter,
  getCategoryById as getCategoryByIdApi,
  getSections as getSectionsApi,
  updateChapter,
  reorderChaptersForCategory,
  pingHealth,
} from "../services/backendApi";
import { isContentStaff } from "../utils/roles";

const COURSES_SS_SUBJECT = "courses:lastSubjectId";
const COURSES_SS_CATEGORY = "courses:lastCategoryId";
const SECTIONS_TREE_CACHE_KEY = "courses_sections_tree_v1";
const SECTIONS_CACHE_TTL_MS = 8 * 60 * 1000;

function readSectionsTreeCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SECTIONS_TREE_CACHE_KEY);
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    if (!data || !t) return null;
    if (Date.now() - t > SECTIONS_CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeSectionsTreeCache(data) {
  if (typeof window === "undefined" || !data) return;
  try {
    sessionStorage.setItem(
      SECTIONS_TREE_CACHE_KEY,
      JSON.stringify({ t: Date.now(), data })
    );
  } catch {
    // ignore
  }
}

const readCoursesSelection = (visibleSubjects, preferredSubjectId) => {
  const list = visibleSubjects || [];
  let nextSubject = preferredSubjectId;
  let nextCategory = "";
  try {
    const sp = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search || "" : ""
    );
    const urlSubject = sp.get("subjectId") || "";
    const urlCategory = sp.get("categoryId") || "";
    const catIdsFor = (sid) => {
      const sub = list.find((s) => s?.id === sid);
      return (sub?.categories || []).map((c) => c?.id).filter(Boolean);
    };
    if (urlSubject && list.some((s) => s?.id === urlSubject)) {
      nextSubject = urlSubject;
      const catIds = catIdsFor(urlSubject);
      if (urlCategory && catIds.includes(urlCategory)) nextCategory = urlCategory;
      else {
        const sc = sessionStorage.getItem(COURSES_SS_CATEGORY);
        if (sc && catIds.includes(sc)) nextCategory = sc;
      }
    } else {
      const ss = sessionStorage.getItem(COURSES_SS_SUBJECT);
      const sc = sessionStorage.getItem(COURSES_SS_CATEGORY);
      if (ss && list.some((s) => s?.id === ss)) {
        nextSubject = ss;
        const catIds = catIdsFor(ss);
        if (sc && catIds.includes(sc)) nextCategory = sc;
      }
    }
  } catch (_) {
    nextSubject = preferredSubjectId;
    nextCategory = "";
  }
  return { nextSubject, nextCategory };
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [section, setSection] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [chaptersState, setChaptersState] = useState([]);
  const [chaptersBusy, setChaptersBusy] = useState(false);
  const [showAddChapterForm, setShowAddChapterForm] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [editingChapterId, setEditingChapterId] = useState("");
  const [editingChapterName, setEditingChapterName] = useState("");
  const [pressedCardId, setPressedCardId] = useState(null);

  const useBackend = !!import.meta.env.VITE_API_URL;

  useEffect(() => {
    let cancelled = false;
    if (useBackend) pingHealth();

    const applyFromSectionsPayload = (allSections, cu) => {
      const abilitiesSection =
        (allSections || []).find((s) => s?.id === "قسم_قدرات") || null;
      setSection(abilitiesSection);

      const allSubjects = abilitiesSection?.subjects || [];
      const visibleSubjects =
        cu && cu.role === "student"
          ? allSubjects.filter((subj) => hasSubjectAccess(cu, subj?.id))
          : allSubjects;
      setSubjects(visibleSubjects);

      const preferred =
        visibleSubjects.find((s) => s?.id === "مادة_اللفظي")?.id ||
        visibleSubjects.find((s) => s?.id === "مادة_الكمي")?.id ||
        visibleSubjects[0]?.id ||
        "";
      const { nextSubject, nextCategory } = readCoursesSelection(
        visibleSubjects,
        preferred
      );
      setSelectedSubjectId((prev) => prev || nextSubject);
      setSelectedCategoryId(nextCategory);
    };

    async function load() {
      try {
        const cu = getCurrentUser();
        if (!cancelled) setCurrentUser(cu || null);
        if (useBackend) {
          const cached = readSectionsTreeCache();
          if (cached) {
            const allCached = Array.isArray(cached)
              ? cached
              : cached?.results || [];
            if (!cancelled) applyFromSectionsPayload(allCached, cu);
            if (!cancelled) setLoading(false);
          }
          const data = await getSectionsApi();
          if (cancelled) return;
          writeSectionsTreeCache(data);
          const allSections = Array.isArray(data) ? data : data?.results || [];
          applyFromSectionsPayload(allSections, cu);
        } else {
          const allSections = getSections() || [];
          if (cancelled) return;
          applyFromSectionsPayload(allSections, cu);
        }
      } catch (e) {
        if (!cancelled) {
          setSection(null);
          setSubjects([]);
          setSelectedSubjectId("");
          setSelectedCategoryId("");
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [useBackend]);

  const selectedSubject =
    subjects.find((s) => s?.id === selectedSubjectId) || null;
  const categories = (selectedSubject?.categories || []).map((c) => ({
    ...c,
    hasTests: c.has_tests ?? c.hasTests,
  }));

  const isAdmin = isContentStaff(currentUser);
  const isStudent = currentUser?.role === "student";
  const selectedCategory =
    categories.find((c) => c?.id === selectedCategoryId) || null;
  const chapters = Array.isArray(chaptersState) ? [...chaptersState] : [];
  chapters.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

  // Keep a stable chapters list for the selected category
  useEffect(() => {
    const next = Array.isArray(selectedCategory?.chapters)
      ? selectedCategory.chapters
      : [];
    setChaptersState(next);
    setShowAddChapterForm(false);
    setNewChapterName("");
    setEditingChapterId("");
    setEditingChapterName("");
  }, [selectedCategoryId, selectedSubjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshSelectedCategory = async () => {
    if (!selectedCategoryId || !selectedSubjectId) return;
    try {
      if (useBackend) {
        const updated = await getCategoryByIdApi(selectedCategoryId);
        if (!updated) return;
        // Patch subjects state with updated category (keep other subjects)
        setSubjects((prev) =>
          (prev || []).map((subj) => {
            if (!subj || subj.id !== selectedSubjectId) return subj;
            const nextCats = (subj.categories || []).map((c) =>
              c?.id === selectedCategoryId ? updated : c
            );
            return { ...subj, categories: nextCats };
          })
        );
        setChaptersState(updated.chapters || []);
      } else {
        const updated = getCategoryById(selectedCategoryId);
        if (!updated) return;
        setSubjects((prev) =>
          (prev || []).map((subj) => {
            if (!subj || subj.id !== selectedSubjectId) return subj;
            const nextCats = (subj.categories || []).map((c) =>
              c?.id === selectedCategoryId ? updated : c
            );
            return { ...subj, categories: nextCats };
          })
        );
        setChaptersState(updated.chapters || []);
      }
    } catch (e) {
      // fallback silent
    }
  };

  const buildCoursesReturnUrl = (
    subjectId = selectedSubjectId,
    categoryId = selectedCategoryId
  ) => {
    const params = new URLSearchParams();
    if (subjectId) params.set("subjectId", subjectId);
    if (categoryId) params.set("categoryId", categoryId);
    // Mark that chapters section should be visible when returning
    if (categoryId) params.set("open", "chapters");
    const qs = params.toString();
    return `/courses${qs ? `?${qs}` : ""}`;
  };

  // Restore selection when navigating to /courses?subjectId=... (and optional categoryId)
  useEffect(() => {
    const sp = new URLSearchParams(location.search || "");
    const subjectIdFromUrl = sp.get("subjectId") || "";
    const categoryIdFromUrl = sp.get("categoryId") || "";
    if (subjectIdFromUrl && subjects.some((s) => s?.id === subjectIdFromUrl)) {
      setSelectedSubjectId(subjectIdFromUrl);
      const subj = subjects.find((s) => s?.id === subjectIdFromUrl);
      const cats = (subj?.categories || []).map((c) => c?.id);
      if (categoryIdFromUrl && cats.includes(categoryIdFromUrl)) {
        setSelectedCategoryId(categoryIdFromUrl);
      } else {
        try {
          const sc = sessionStorage.getItem(COURSES_SS_CATEGORY);
          if (sc && cats.includes(sc)) setSelectedCategoryId(sc);
        } catch (_) {}
      }
    }
  }, [location.search, subjects]);

  // Remember مادة / تصنيف so returning to /courses (e.g. from header) keeps the same place
  useEffect(() => {
    try {
      if (selectedSubjectId)
        sessionStorage.setItem(COURSES_SS_SUBJECT, selectedSubjectId);
      if (selectedCategoryId)
        sessionStorage.setItem(COURSES_SS_CATEGORY, selectedCategoryId);
    } catch (_) {}
  }, [selectedSubjectId, selectedCategoryId]);

  const handleCategoryClick = (categoryId) => {
    if (!selectedSubjectId) return;
    setSelectedCategoryId(categoryId);
  };

  const handleChapterClick = (chapterId) => {
    if (!selectedSubjectId || !selectedCategoryId) return;
    const returnUrl = buildCoursesReturnUrl(
      selectedSubjectId,
      selectedCategoryId
    );
    // Pass the chapter shell via route state so <Levels /> can render instantly
    // (chapter title + count) while the full lessons payload is fetching.
    const initialChapter =
      (chaptersState || []).find((c) => c?.id === chapterId) || null;
    navigate(
      `/section/قسم_قدرات/subject/${selectedSubjectId}/category/${selectedCategoryId}/chapter/${chapterId}/items?returnUrl=${encodeURIComponent(
        returnUrl
      )}`,
      { state: { chapter: initialChapter } }
    );
  };

  // Admin inline chapter management (inside /courses)
  const handleAddChapterInline = async () => {
    const name = (newChapterName || "").trim();
    if (!selectedCategoryId || !name) return;
    setChaptersBusy(true);
    try {
      if (useBackend) {
        await addChapter(selectedCategoryId, name);
      } else {
        addChapterToCategory(selectedCategoryId, name);
      }
      await refreshSelectedCategory();
      setShowAddChapterForm(false);
      setNewChapterName("");
    } catch (e) {
      alert(
        e?.message ||
          (selectedCategory?.name === "التجميعات"
            ? "حدث خطأ أثناء إضافة المستوى"
            : "حدث خطأ أثناء إضافة القسم")
      );
    } finally {
      setChaptersBusy(false);
    }
  };

  const handleStartEditChapter = (ch) => {
    setEditingChapterId(ch?.id || "");
    setEditingChapterName(ch?.name || "");
  };

  const handleCancelEditChapter = () => {
    setEditingChapterId("");
    setEditingChapterName("");
  };

  const handleSaveEditChapter = async (chapterId) => {
    const name = (editingChapterName || "").trim();
    if (!chapterId || !name) return;
    setChaptersBusy(true);
    try {
      if (useBackend) {
        await updateChapter(chapterId, { name });
      } else {
        updateChapterName(chapterId, name);
      }
      await refreshSelectedCategory();
      handleCancelEditChapter();
    } catch (e) {
      alert(
        e?.message ||
          (selectedCategory?.name === "التجميعات"
            ? "حدث خطأ أثناء تعديل اسم المستوى"
            : "حدث خطأ أثناء تعديل اسم القسم")
      );
    } finally {
      setChaptersBusy(false);
    }
  };

  const handleDeleteChapterInline = async (chapterId) => {
    if (!chapterId) return;
    if (
      !window.confirm(
        selectedCategory?.name === "التجميعات"
          ? "هل تريد حذف هذا المستوى؟"
          : "هل تريد حذف هذا القسم؟"
      )
    )
      return;
    setChaptersBusy(true);
    try {
      if (useBackend) {
        await deleteChapter(chapterId);
      } else {
        deleteChapterFromCategory(chapterId);
      }
      await refreshSelectedCategory();
    } catch (e) {
      alert(
        e?.message ||
          (selectedCategory?.name === "التجميعات"
            ? "حدث خطأ أثناء حذف المستوى"
            : "حدث خطأ أثناء حذف القسم")
      );
    } finally {
      setChaptersBusy(false);
    }
  };

  const applyChapterReorder = async (withOrder, snapshotList) => {
    if (!selectedCategoryId) return;
    setChaptersState(withOrder);
    setChaptersBusy(true);
    try {
      if (useBackend) {
        await reorderChaptersForCategory(
          selectedCategoryId,
          withOrder.map((c) => c.id)
        );
      } else {
        setChapterOrderByIds(
          selectedCategoryId,
          withOrder.map((c) => c.id)
        );
      }
      await refreshSelectedCategory();
    } catch (e) {
      setChaptersState(snapshotList);
      alert(e?.message || "حدث خطأ أثناء تغيير الترتيب");
    } finally {
      setChaptersBusy(false);
    }
  };

  const handleMoveChapterInline = async (chapterId, direction) => {
    if (!chapterId || !selectedCategoryId) return;

    const list = Array.isArray(chaptersState) ? [...chaptersState] : [];
    list.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
    const idx = list.findIndex((x) => x?.id === chapterId);
    if (idx === -1) return;

    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= list.length) return;

    const reordered = [...list];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const withOrder = reordered.map((ch, i) => ({ ...ch, order: i + 1 }));
    await applyChapterReorder(withOrder, list);
  };

  /** ترتيب مباشر: 1 = أول بطاقة في القائمة */
  const handleMoveChapterToPosition = async (chapterId, newPosition1Based) => {
    if (!chapterId || !selectedCategoryId) return;
    const list = Array.isArray(chaptersState) ? [...chaptersState] : [];
    list.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
    const n = list.length;
    if (n < 2) return;
    const from = list.findIndex((x) => x?.id === chapterId);
    if (from === -1) return;
    const to = Math.max(0, Math.min(newPosition1Based - 1, n - 1));
    if (from === to) return;
    const reordered = [...list];
    const [row] = reordered.splice(from, 1);
    reordered.splice(to, 0, row);
    const withOrder = reordered.map((ch, i) => ({ ...ch, order: i + 1 }));
    await applyChapterReorder(withOrder, list);
  };

  return (
    <div className="min-h-screen bg-secondary-50 relative overflow-hidden">
      <CourseScatteredBackground
        variant={resolveCourseBackgroundVariant({
          subjectId: selectedSubjectId,
          categoryName: selectedCategory?.name,
        })}
      />
      <div className="relative z-10">
      <Header />

      <div
        className="relative max-w-6xl mx-auto px-4 py-8 md:py-12"
      >
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
            الدورات
          </h1>
          <p className="text-sm md:text-base text-dark-500 font-medium">
            اختر القسم ثم التصنيف (التأسيس / التجميعات)
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">جاري التحميل...</p>
            </div>
          ) : !section ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">لا توجد بيانات متاحة</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">لا توجد مواد متاحة</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6">
              {/* Tabs مثل الصورة */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gray-100 rounded-full p-1 flex gap-1 w-full max-w-md">
                  {subjects.map((subj) => {
                    const isActive = subj.id === selectedSubjectId;
                    const label =
                      subj.name === "اللفظي"
                        ? "القسم اللفظي"
                        : subj.name === "الكمي"
                        ? "القسم الكمي"
                        : subj.name;
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(subj.id);
                          setSelectedCategoryId(""); // reset category when switching subject
                        }}
                        className={`flex-1 py-2 px-4 rounded-full font-bold text-sm md:text-base transition ${
                          isActive
                            ? "bg-primary-500 text-white shadow"
                            : "bg-transparent text-dark-600 hover:bg-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* اختيار التأسيس / التجميعات */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${selectedCategoryId || pressedCardId ? 'course-nav-group course-nav-group--has-selection' : ''}`}>
                {categories.map((category) => {
                  const isTasis = category.name === "التأسيس";
                  const isSelected = selectedCategoryId === category.id;
                  const cardVariant = resolveCourseBackgroundVariant({
                    subjectId: selectedSubjectId,
                    categoryName: category.name,
                  });
                  return (
                    <CourseNavButton
                      key={category.id}
                      type="button"
                      cardId={category.id}
                      groupPressedId={pressedCardId}
                      onPressStart={setPressedCardId}
                      onPressEnd={() => setPressedCardId(null)}
                      selected={isSelected}
                      dimmed={!!selectedCategoryId && !isSelected}
                      variant={cardVariant}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`border-2 rounded-2xl p-5 hover:shadow-xl transition-all duration-300 text-right ${
                        isSelected ? "" : "bg-secondary-50 border-secondary-200"
                      }`}
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-4xl">
                            {isTasis ? "🧩" : "🧠"}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm px-3 py-1 rounded-full bg-accent-50 text-accent-800 border border-accent-200 font-semibold">
                              {category.chapters?.length || 0}{" "}
                              {category.name === "التجميعات" ? "مستويات" : "أقسام"}
                            </span>
                          </div>
                        </div>
                        <div className="text-xl md:text-2xl font-extrabold text-dark-900 mb-1">
                          {category.name}
                        </div>
                        <div className="text-sm md:text-base text-dark-600 font-medium">
                          {isTasis
                            ? "ابدأ من الصفر خطوة بخطوة"
                            : "تدريبات وتجميعات مطابقة للاختبار"}
                        </div>
                      </div>
                    </CourseNavButton>
                  );
                })}
              </div>

              {/* زر الدروس المجانية */}
              <div className="hidden mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/foundation")}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-extrabold text-base md:text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  الدروس المجانية
                </button>
              </div>

              {/* الأقسام / المستويات تظهر داخل نفس الصفحة (طالب + أدمن) */}
              {selectedCategoryId && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg md:text-xl font-extrabold text-dark-900">
                      {selectedCategory?.name === "التجميعات"
                        ? "المستويات"
                        : "الأقسام"}{" "}
                      - {selectedCategory?.name || ""}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm px-3 py-1 rounded-full bg-accent-50 text-accent-800 border border-accent-200 font-semibold">
                        {chapters.length}{" "}
                        {selectedCategory?.name === "التجميعات"
                          ? "مستويات"
                          : "أقسام"}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowAddChapterForm(true)}
                          className="text-xs md:text-sm px-3 py-1 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition font-bold disabled:opacity-60"
                          disabled={chaptersBusy}
                        >
                          + إضافة{" "}
                          {selectedCategory?.name === "التجميعات"
                            ? "مستوى"
                            : "قسم"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isAdmin && showAddChapterForm && (
                    <div className="bg-secondary-50 border-2 border-secondary-200 rounded-2xl p-4 mb-4">
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                        <input
                          type="text"
                          value={newChapterName}
                          onChange={(e) => setNewChapterName(e.target.value)}
                          placeholder={
                            selectedCategory?.name === "التجميعات"
                              ? "اسم المستوى"
                              : "اسم القسم"
                          }
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddChapterInline();
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleAddChapterInline}
                            className="px-5 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition font-bold disabled:opacity-60"
                            disabled={chaptersBusy || !newChapterName.trim()}
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddChapterForm(false);
                              setNewChapterName("");
                            }}
                            className="px-5 py-2 rounded-lg bg-gray-400 text-white hover:bg-gray-500 transition font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {chapters.length === 0 ? (
                    <div className="text-center py-10 text-dark-600">
                      {selectedCategory?.name === "التجميعات"
                        ? "لا توجد مستويات متاحة"
                        : "لا توجد أقسام متاحة"}
                    </div>
                  ) : (
                    <>
                      {isAdmin && (
                        <p className="text-sm text-dark-600 mb-3 text-right">
                          ترتيب الأقسام/المستويات: استخدم السهمين أو اختر رقم
                          المركز من القائمة (#) بجانب كل بطاقة.
                        </p>
                      )}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${pressedCardId ? 'course-nav-group course-nav-group--has-selection' : ''}`}>
                      {chapters.map((ch) => {
                        const chapterIndex = chapters.findIndex(
                          (x) => x?.id === ch.id
                        );
                        const canMoveUp = chapterIndex > 0;
                        const canMoveDown =
                          chapterIndex !== -1 && chapterIndex < chapters.length - 1;
                        const chapterVariant = resolveCourseBackgroundVariant({
                          subjectId: selectedSubjectId,
                          categoryName: selectedCategory?.name,
                        });
                        return (
                          <CourseNavButton
                            key={ch.id}
                            as="div"
                            cardId={ch.id}
                            groupPressedId={pressedCardId}
                            onPressStart={setPressedCardId}
                            onPressEnd={() => setPressedCardId(null)}
                            variant={chapterVariant}
                            className="bg-white border-2 border-gray-200 rounded-2xl p-4 text-right hover:shadow-lg hover:border-primary-300 transition"
                          >
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-2xl">📘</div>
                                <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-full">
                                  <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 text-dark-700 border border-secondary-200 font-semibold">
                                    {ch.lesson_count ??
                                      (ch.items || ch.lessons || []).length}{" "}
                                    {selectedCategory?.name === "التجميعات"
                                      ? "بنك"
                                      : "درس"}
                                  </span>
                                  {isAdmin && (
                                    <>
                                      {editingChapterId === ch.id ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSaveEditChapter(ch.id)
                                            }
                                            className="text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition font-bold disabled:opacity-60"
                                            disabled={
                                              chaptersBusy ||
                                              !editingChapterName.trim()
                                            }
                                            title="حفظ"
                                          >
                                            حفظ
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleCancelEditChapter}
                                            className="text-xs px-2 py-1 rounded bg-gray-400 text-white hover:bg-gray-500 transition font-bold"
                                            title="إلغاء"
                                          >
                                            إلغاء
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleMoveChapterInline(
                                                ch.id,
                                                "up"
                                              )
                                            }
                                            disabled={
                                              chaptersBusy || !canMoveUp
                                            }
                                            className="text-xs px-2 py-1 rounded bg-gray-400 text-white hover:bg-gray-500 transition font-bold disabled:opacity-60"
                                            title="تحريك لأعلى"
                                          >
                                            ↑
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleMoveChapterInline(
                                                ch.id,
                                                "down"
                                              )
                                            }
                                            disabled={
                                              chaptersBusy || !canMoveDown
                                            }
                                            className="text-xs px-2 py-1 rounded bg-gray-400 text-white hover:bg-gray-500 transition font-bold disabled:opacity-60"
                                            title="تحريك لأسفل"
                                          >
                                            ↓
                                          </button>
                                          <label
                                            className="inline-flex items-center gap-0.5 bg-slate-600 text-white rounded px-1 py-0.5"
                                            title="المركز (1 = الأول)"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <span className="text-[10px] font-bold">#</span>
                                            <select
                                              value={chapterIndex + 1}
                                              disabled={
                                                chaptersBusy || chapters.length < 2
                                              }
                                              onClick={(e) => e.stopPropagation()}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                handleMoveChapterToPosition(
                                                  ch.id,
                                                  Number(e.target.value)
                                                );
                                              }}
                                              className="text-xs rounded border-0 bg-white text-gray-900 max-w-[3.25rem] py-0.5 pr-1 cursor-pointer"
                                            >
                                              {chapters.map((_, i) => (
                                                <option key={i} value={i + 1}>
                                                  {i + 1}
                                                </option>
                                              ))}
                                            </select>
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleStartEditChapter(ch)
                                            }
                                            className="text-xs px-2 py-1 rounded bg-primary-500 text-white hover:bg-primary-600 transition font-bold"
                                            title="تعديل الاسم"
                                          >
                                            تعديل
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteChapterInline(ch.id)
                                            }
                                            className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition font-bold disabled:opacity-60"
                                            disabled={chaptersBusy}
                                            title="حذف"
                                          >
                                            حذف
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              {isAdmin && editingChapterId === ch.id ? (
                                <input
                                  type="text"
                                  value={editingChapterName}
                                  onChange={(e) =>
                                    setEditingChapterName(e.target.value)
                                  }
                                  className="w-full font-extrabold text-dark-900 border-2 border-primary-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleChapterClick(ch.id)}
                                  className="w-full text-right"
                                  title="فتح الدروس"
                                >
                                  <div className="font-extrabold text-dark-900">
                                    {ch.name}
                                  </div>
                                  <div className="text-sm text-dark-600 font-medium mt-1">
                                    اضغط لعرض الدروس
                                  </div>
                                </button>
                              )}
                            </div>
                          </CourseNavButton>
                        );
                      })}
                    </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Home;

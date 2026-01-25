import { useLocation, useNavigate } from 'react-router-dom';
import { addChapterToCategory, deleteChapterFromCategory, getCategoryById, getSections, getCurrentUser, updateChapterName } from '../services/storageService';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { hasSectionAccess, hasSubjectAccess } from '../components/ProtectedRoute';
import { addChapter, deleteChapter, getCategoryById as getCategoryByIdApi, getSections as getSectionsApi, updateChapter } from '../services/backendApi';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [section, setSection] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [chaptersState, setChaptersState] = useState([]);
  const [chaptersBusy, setChaptersBusy] = useState(false);
  const [showAddChapterForm, setShowAddChapterForm] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [editingChapterId, setEditingChapterId] = useState('');
  const [editingChapterName, setEditingChapterName] = useState('');

  const useBackend = !!import.meta.env.VITE_API_URL;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cu = getCurrentUser();
        setCurrentUser(cu || null);
        let allSections = [];
        if (useBackend) {
          const data = await getSectionsApi();
          allSections = Array.isArray(data) ? data : (data?.results || []);
        } else {
          allSections = getSections() || [];
        }
        if (cancelled) return;
        const abilitiesSection = (allSections || []).find((s) => s?.id === 'قسم_قدرات') || null;
        setSection(abilitiesSection);

        const allSubjects = abilitiesSection?.subjects || [];
        const visibleSubjects = (cu && cu.role === 'student')
          ? allSubjects.filter((subj) => hasSubjectAccess(cu, subj?.id))
          : allSubjects;
        setSubjects(visibleSubjects);

        // Default selected tab: اللفظي then الكمي then first available
        const preferred =
          visibleSubjects.find((s) => s?.id === 'مادة_اللفظي')?.id
          || visibleSubjects.find((s) => s?.id === 'مادة_الكمي')?.id
          || visibleSubjects[0]?.id
          || '';
        setSelectedSubjectId((prev) => prev || preferred);
        setSelectedCategoryId(''); // reset category selection on reload
      } catch (e) {
        if (!cancelled) {
          setSection(null);
          setSubjects([]);
          setSelectedSubjectId('');
          setSelectedCategoryId('');
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [useBackend]);

  const selectedSubject = subjects.find((s) => s?.id === selectedSubjectId) || null;
  const categories = (selectedSubject?.categories || []).map((c) => ({ ...c, hasTests: c.has_tests ?? c.hasTests }));
  const isAdmin = currentUser?.role === 'admin';
  const isStudent = currentUser?.role === 'student';
  const selectedCategory = categories.find((c) => c?.id === selectedCategoryId) || null;
  const chapters = Array.isArray(chaptersState) ? [...chaptersState] : [];
  chapters.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

  // Keep a stable chapters list for the selected category
  useEffect(() => {
    const next = Array.isArray(selectedCategory?.chapters) ? selectedCategory.chapters : [];
    setChaptersState(next);
    setShowAddChapterForm(false);
    setNewChapterName('');
    setEditingChapterId('');
    setEditingChapterName('');
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
            const nextCats = (subj.categories || []).map((c) => (c?.id === selectedCategoryId ? updated : c));
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
            const nextCats = (subj.categories || []).map((c) => (c?.id === selectedCategoryId ? updated : c));
            return { ...subj, categories: nextCats };
          })
        );
        setChaptersState(updated.chapters || []);
      }
    } catch (e) {
      // fallback silent
    }
  };

  const buildCoursesReturnUrl = (subjectId = selectedSubjectId, categoryId = selectedCategoryId) => {
    const params = new URLSearchParams();
    if (subjectId) params.set('subjectId', subjectId);
    if (categoryId) params.set('categoryId', categoryId);
    // Mark that chapters section should be visible when returning
    if (categoryId) params.set('open', 'chapters');
    const qs = params.toString();
    return `/courses${qs ? `?${qs}` : ''}`;
  };

  // Restore selection when navigating back to /courses?subjectId=...&categoryId=...
  useEffect(() => {
    const sp = new URLSearchParams(location.search || '');
    const subjectIdFromUrl = sp.get('subjectId') || '';
    const categoryIdFromUrl = sp.get('categoryId') || '';
    if (subjectIdFromUrl && subjects.some((s) => s?.id === subjectIdFromUrl)) {
      setSelectedSubjectId(subjectIdFromUrl);
      // category must exist under selected subject
      const subj = subjects.find((s) => s?.id === subjectIdFromUrl);
      const cats = (subj?.categories || []).map((c) => c?.id);
      if (categoryIdFromUrl && cats.includes(categoryIdFromUrl)) {
        setSelectedCategoryId(categoryIdFromUrl);
      }
    }
  }, [location.search, subjects]);

  const handleCategoryClick = (categoryId) => {
    if (!selectedSubjectId) return;
    setSelectedCategoryId(categoryId);
  };

  const handleChapterClick = (chapterId) => {
    if (!selectedSubjectId || !selectedCategoryId) return;
    const returnUrl = buildCoursesReturnUrl(selectedSubjectId, selectedCategoryId);
    navigate(
      `/section/قسم_قدرات/subject/${selectedSubjectId}/category/${selectedCategoryId}/chapter/${chapterId}/items?returnUrl=${encodeURIComponent(returnUrl)}`
    );
  };

  // Admin inline chapter management (inside /courses)
  const handleAddChapterInline = async () => {
    const name = (newChapterName || '').trim();
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
      setNewChapterName('');
    } catch (e) {
      alert(e?.message || 'حدث خطأ أثناء إضافة الفصل');
    } finally {
      setChaptersBusy(false);
    }
  };

  const handleStartEditChapter = (ch) => {
    setEditingChapterId(ch?.id || '');
    setEditingChapterName(ch?.name || '');
  };

  const handleCancelEditChapter = () => {
    setEditingChapterId('');
    setEditingChapterName('');
  };

  const handleSaveEditChapter = async (chapterId) => {
    const name = (editingChapterName || '').trim();
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
      alert(e?.message || 'حدث خطأ أثناء تعديل اسم الفصل');
    } finally {
      setChaptersBusy(false);
    }
  };

  const handleDeleteChapterInline = async (chapterId) => {
    if (!chapterId) return;
    if (!window.confirm('هل تريد حذف هذا الفصل؟')) return;
    setChaptersBusy(true);
    try {
      if (useBackend) {
        await deleteChapter(chapterId);
      } else {
        deleteChapterFromCategory(chapterId);
      }
      await refreshSelectedCategory();
    } catch (e) {
      alert(e?.message || 'حدث خطأ أثناء حذف الفصل');
    } finally {
      setChaptersBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <Header />
      
      {/* Decorative Background Elements - Using brand colors: E8CCAD, EC802B, EDC55B, 66BCB4 */}
      {/* Small orange circle - top left - visible on mobile */}
      <div className="absolute top-20 left-4 w-16 h-16 md:w-24 md:h-24 rounded-full opacity-15" style={{ zIndex: 0, background: '#EC802B' }}></div>
      
      {/* Small beige circle - bottom left - visible on mobile */}
      <div className="absolute bottom-20 left-8 w-12 h-12 md:w-20 md:h-20 rounded-full opacity-20" style={{ zIndex: 0, background: '#E8CCAD' }}></div>
      
      {/* Small turquoise circle - top right - visible on mobile */}
      <div className="absolute top-32 right-12 w-12 h-12 md:w-18 md:h-18 rounded-full opacity-20" style={{ zIndex: 0, background: '#66BCB4' }}></div>
      
      {/* Small golden yellow circle - mid right */}
      <div className="absolute top-1/2 right-8 w-14 h-14 md:w-20 md:h-20 rounded-full opacity-15 hidden md:block" style={{ zIndex: 0, background: '#EDC55B' }}></div>
      
      {/* Small dotted turquoise square - mid left */}
      <div className="absolute top-1/3 left-16 w-12 h-12 md:w-18 md:h-18 opacity-20 hidden md:block" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="dots-square-turquoise-home" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1" fill="#66BCB4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-square-turquoise-home)" />
        </svg>
      </div>
      
      {/* Small dotted golden yellow triangle - bottom center left */}
      <div className="absolute bottom-32 left-1/4 w-10 h-10 md:w-14 md:h-14 opacity-15 hidden md:block transform -translate-x-1/2" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%">
          <polygon points="50,10 90,90 10,90" stroke="#EDC55B" strokeWidth="1.5" fill="none" strokeDasharray="2,2" />
        </svg>
      </div>
      
      {/* Small orange circles - scattered */}
      <div className="absolute top-1/4 left-1/3 w-6 h-6 md:w-8 md:h-8 rounded-full opacity-25 hidden md:block" style={{ zIndex: 0, background: '#EC802B' }}></div>
      <div className="absolute bottom-1/3 right-1/4 w-7 h-7 md:w-10 md:h-10 rounded-full opacity-20 hidden md:block" style={{ zIndex: 0, background: '#EC802B' }}></div>
      
      {/* Small beige square with wavy pattern - top center */}
      <div className="absolute top-40 left-1/2 w-14 h-14 md:w-20 md:h-20 opacity-15 hidden md:block transform -translate-x-1/2" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <rect width="60" height="60" x="20" y="20" fill="#E8CCAD" opacity="0.3" />
          <path d="M 25,50 Q 30,35 40,50 T 55,50 T 75,50" stroke="#EC802B" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
      
      {/* Small golden yellow pie chart segment - bottom right */}
      <div className="absolute bottom-24 right-16 w-10 h-10 md:w-14 md:h-14 opacity-20 hidden md:block" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <path d="M 50,50 L 50,20 A 30,30 0 0,1 80,50 Z" fill="#EDC55B" opacity="0.5" />
        </svg>
      </div>
      
      {/* Small X shape - decorative */}
      <div className="absolute top-1/3 right-1/4 w-6 h-6 md:w-8 md:h-8 opacity-12 hidden md:block" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 24 24">
          <line x1="4" y1="4" x2="20" y2="20" stroke="#3D3D3D" strokeWidth="1.5" />
          <line x1="20" y1="4" x2="4" y2="20" stroke="#3D3D3D" strokeWidth="1.5" />
        </svg>
      </div>
      
      {/* Small turquoise circles - additional decorative elements */}
      <div className="absolute top-2/3 left-1/2 w-8 h-8 md:w-12 md:h-12 rounded-full opacity-15 hidden md:block transform -translate-x-1/2" style={{ zIndex: 0, background: '#66BCB4' }}></div>
      <div className="absolute bottom-1/4 right-1/3 w-9 h-9 md:w-12 md:h-12 rounded-full opacity-20 hidden md:block" style={{ zIndex: 0, background: '#66BCB4' }}></div>
      
      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12" style={{ zIndex: 1 }}>
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
            <div className="text-center py-12"><p className="text-xl text-gray-600">جاري التحميل...</p></div>
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
                    const label = subj.name === 'اللفظي' ? 'القسم اللفظي' : subj.name === 'الكمي' ? 'القسم الكمي' : subj.name;
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(subj.id);
                          setSelectedCategoryId(''); // reset category when switching subject
                        }}
                        className={`flex-1 py-2 px-4 rounded-full font-bold text-sm md:text-base transition ${
                          isActive
                            ? 'bg-primary-500 text-white shadow'
                            : 'bg-transparent text-dark-600 hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* اختيار التأسيس / التجميعات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryClick(category.id)}
                    className={`border-2 rounded-2xl p-5 hover:shadow-xl transition-all duration-300 text-right ${
                      selectedCategoryId === category.id
                        ? 'bg-primary-50 border-primary-300'
                        : 'bg-secondary-50 border-secondary-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-4xl">
                        {category.name === 'التأسيس' ? '🧩' : '🧠'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm px-3 py-1 rounded-full bg-accent-50 text-accent-800 border border-accent-200 font-semibold">
                          {category.chapters?.length || 0} فصول
                        </span>
                      </div>
                    </div>
                    <div className="text-xl md:text-2xl font-extrabold text-dark-900 mb-1">
                      {category.name}
                    </div>
                    <div className="text-sm md:text-base text-dark-600 font-medium">
                      {category.name === 'التأسيس'
                        ? 'ابدأ من الصفر خطوة بخطوة'
                        : 'تدريبات وتجميعات مطابقة للاختبار'}
                    </div>
                  </button>
                ))}
              </div>

              {/* الفصول تظهر داخل نفس الصفحة (طالب + أدمن) */}
              {selectedCategoryId && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg md:text-xl font-extrabold text-dark-900">
                      الفصول - {selectedCategory?.name || ''}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm px-3 py-1 rounded-full bg-accent-50 text-accent-800 border border-accent-200 font-semibold">
                        {chapters.length} فصل
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowAddChapterForm(true)}
                          className="text-xs md:text-sm px-3 py-1 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition font-bold disabled:opacity-60"
                          disabled={chaptersBusy}
                        >
                          + إضافة فصل
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
                          placeholder="اسم الفصل"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddChapterInline();
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
                              setNewChapterName('');
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
                      لا توجد فصول متاحة
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {chapters.map((ch) => (
                        <div
                          key={ch.id}
                          className="bg-white border-2 border-gray-200 rounded-2xl p-4 text-right hover:shadow-lg hover:border-primary-300 transition"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-2xl">📘</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 text-dark-700 border border-secondary-200 font-semibold">
                                {(ch.items || ch.lessons || []).length} درس
                              </span>
                              {isAdmin && (
                                <>
                                  {editingChapterId === ch.id ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditChapter(ch.id)}
                                        className="text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition font-bold disabled:opacity-60"
                                        disabled={chaptersBusy || !editingChapterName.trim()}
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
                                        onClick={() => handleStartEditChapter(ch)}
                                        className="text-xs px-2 py-1 rounded bg-primary-500 text-white hover:bg-primary-600 transition font-bold"
                                        title="تعديل الاسم"
                                      >
                                        تعديل
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteChapterInline(ch.id)}
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
                              onChange={(e) => setEditingChapterName(e.target.value)}
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
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;



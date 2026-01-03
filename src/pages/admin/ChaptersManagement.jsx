import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSubjects, getCategoriesBySubject, getChaptersByCategory, addChapterToCategory, deleteChapterFromCategory, getCategoryById } from '../../services/storageService';
import Header from '../../components/Header';
import { isArabicBrowser } from '../../utils/language';

const ChaptersManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get('categoryId');
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [chapters, setChapters] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');

  useEffect(() => {
    setSubjects(getSubjects());
    
    // If categoryId is in URL, auto-select the appropriate dropdowns
    if (categoryIdFromUrl) {
      const category = getCategoryById(categoryIdFromUrl);
      if (category) {
        // Find the subject that contains this category
        const allSubjects = getSubjects();
        for (const subject of allSubjects) {
          const cat = (subject.categories || []).find(c => c.id === categoryIdFromUrl);
          if (cat) {
            setSelectedSubject(subject.id);
            setSelectedCategory(categoryIdFromUrl);
            break;
          }
        }
      }
    }
  }, [categoryIdFromUrl]);

  useEffect(() => {
    if (selectedCategory) {
      setChapters(getChaptersByCategory(selectedCategory));
    } else {
      setChapters([]);
    }
  }, [selectedCategory]);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedCategory('');
    setChapters([]);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleAddChapter = () => {
    if (!selectedCategory) {
      alert(isArabicBrowser() ? 'يرجى اختيار التصنيف أولاً' : 'Please select a category first');
      return;
    }
    if (!newChapterName.trim()) {
      alert(isArabicBrowser() ? 'يرجى إدخال اسم الفصل' : 'Please enter chapter name');
      return;
    }
    
    const success = addChapterToCategory(selectedCategory, newChapterName.trim());
    if (success) {
      setChapters(getChaptersByCategory(selectedCategory));
      setNewChapterName('');
      setShowAddForm(false);
    } else {
      alert(isArabicBrowser() ? 'حدث خطأ أثناء إضافة الفصل' : 'Error adding chapter');
    }
  };

  const handleDeleteChapter = (chapterId) => {
    if (window.confirm(isArabicBrowser() ? 'هل أنت متأكد من حذف هذا الفصل؟ سيتم حذف جميع الدروس التابعة له أيضاً.' : 'Are you sure? This will also delete all lessons in this chapter.')) {
      const success = deleteChapterFromCategory(chapterId);
      if (success) {
        setChapters(getChaptersByCategory(selectedCategory));
      } else {
        alert(isArabicBrowser() ? 'حدث خطأ أثناء حذف الفصل' : 'Error deleting chapter');
      }
    }
  };

  const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-dark-600">
              {isArabicBrowser() ? 'إدارة الفصول' : 'Manage Chapters'}
            </h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
            >
              ← {isArabicBrowser() ? 'رجوع' : 'Back'}
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  المادة / Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">{isArabicBrowser() ? 'اختر المادة' : 'Select Subject'}</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  التصنيف / Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={!selectedSubject}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">{isArabicBrowser() ? 'اختر التصنيف' : 'Select Category'}</option>
                  {selectedSubjectObj?.categories?.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Chapters List */}
          {selectedCategory && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                  {isArabicBrowser() ? 'الفصول' : 'Chapters'} ({chapters.length})
                </h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                >
                  + {isArabicBrowser() ? 'إضافة فصل جديد' : 'Add Chapter'}
                </button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-primary-300">
                  <h3 className="text-lg font-bold text-dark-600 mb-3">
                    {isArabicBrowser() ? 'إضافة فصل جديد' : 'Add New Chapter'}
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newChapterName}
                      onChange={(e) => setNewChapterName(e.target.value)}
                      placeholder={isArabicBrowser() ? 'اسم الفصل' : 'Chapter name'}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddChapter();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddChapter}
                      className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                    >
                      {isArabicBrowser() ? 'حفظ' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewChapterName('');
                      }}
                      className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
                    >
                      {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-dark-600 mb-1">
                          {chapter.name}
                        </h3>
                        <p className="text-sm text-dark-500">
                          {isArabicBrowser() ? `${chapter.items?.length || 0} درس` : `${chapter.items?.length || 0} lessons`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteChapter(chapter.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm font-medium ml-2"
                      >
                        {isArabicBrowser() ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
                {chapters.length === 0 && !showAddForm && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    {isArabicBrowser() ? 'لا توجد فصول في هذا التصنيف' : 'No chapters in this category'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChaptersManagement;


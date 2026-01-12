import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSubjects, getCategoriesBySubject, getChaptersByCategory, getLevelsByChapter, addItemToChapter, deleteItemFromChapter, getChapterById } from '../../services/storageService';
import Header from '../../components/Header';
import { isArabicBrowser } from '../../utils/language';

const LessonsManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [lessons, setLessons] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [newLessonHasTest, setNewLessonHasTest] = useState(true);

  useEffect(() => {
    setSubjects(getSubjects());
    
    // If chapterId is in URL, auto-select the appropriate dropdowns
    if (chapterIdFromUrl) {
      const chapter = getChapterById(chapterIdFromUrl);
      if (chapter) {
        // Find the category and subject that contains this chapter
        const allSubjects = getSubjects();
        for (const subject of allSubjects) {
          for (const category of (subject.categories || [])) {
            const ch = (category.chapters || []).find(c => c.id === chapterIdFromUrl);
            if (ch) {
              setSelectedSubject(subject.id);
              setSelectedCategory(category.id);
              setSelectedChapter(chapterIdFromUrl);
              break;
            }
          }
        }
      }
    }
  }, [chapterIdFromUrl]);

  useEffect(() => {
    if (selectedChapter) {
      setLessons(getLevelsByChapter(selectedChapter));
    } else {
      setLessons([]);
    }
  }, [selectedChapter]);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedCategory('');
    setSelectedChapter('');
    setLessons([]);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedChapter('');
    setLessons([]);
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapter(chapterId);
  };

  const handleAddLesson = () => {
    if (!selectedChapter) {
      alert(isArabicBrowser() ? 'يرجى اختيار الفصل أولاً' : 'Please select a chapter first');
      return;
    }
    if (!newLessonName.trim()) {
      alert(isArabicBrowser() ? 'يرجى إدخال اسم الدرس' : 'Please enter lesson name');
      return;
    }
    
    const success = addItemToChapter(selectedChapter, newLessonName.trim(), newLessonHasTest);
    if (success) {
      setLessons(getLevelsByChapter(selectedChapter));
      setNewLessonName('');
      setNewLessonHasTest(true);
      setShowAddForm(false);
    } else {
      alert(isArabicBrowser() ? 'حدث خطأ أثناء إضافة الدرس' : 'Error adding lesson');
    }
  };

  const handleDeleteLesson = (lessonId) => {
    if (window.confirm(isArabicBrowser() ? 'هل أنت متأكد من حذف هذا الدرس؟' : 'Are you sure you want to delete this lesson?')) {
      const success = deleteItemFromChapter(lessonId);
      if (success) {
        setLessons(getLevelsByChapter(selectedChapter));
      } else {
        alert(isArabicBrowser() ? 'حدث خطأ أثناء حذف الدرس' : 'Error deleting lesson');
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
              {isArabicBrowser() ? 'إدارة الدروس' : 'Manage Lessons'}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  الفصل / Chapter
                </label>
                <select
                  value={selectedChapter}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">{isArabicBrowser() ? 'اختر الفصل' : 'Select Chapter'}</option>
                  {getChaptersByCategory(selectedCategory).map(chapter => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lessons List */}
          {selectedChapter && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                  {isArabicBrowser() ? 'الدروس' : 'Lessons'} ({lessons.length})
                </h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                >
                  + {isArabicBrowser() ? 'إضافة درس جديد' : 'Add Lesson'}
                </button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-primary-300">
                  <h3 className="text-lg font-bold text-dark-600 mb-3">
                    {isArabicBrowser() ? 'إضافة درس جديد' : 'Add New Lesson'}
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newLessonName}
                      onChange={(e) => setNewLessonName(e.target.value)}
                      placeholder={isArabicBrowser() ? 'اسم الدرس' : 'Lesson name'}
                      className="w-full px-4 py-2 border rounded-lg"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddLesson();
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasTest"
                        checked={newLessonHasTest}
                        onChange={(e) => setNewLessonHasTest(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="hasTest" className="text-dark-600">
                        {isArabicBrowser() ? 'يحتوي على اختبار' : 'Has test/quiz'}
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddLesson}
                        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                      >
                        {isArabicBrowser() ? 'حفظ' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewLessonName('');
                          setNewLessonHasTest(true);
                        }}
                        className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
                      >
                        {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-dark-600 mb-1">
                          {lesson.name}
                        </h3>
                        {lesson.hasTest && (
                          <p className="text-xs text-green-600 font-medium">
                            {isArabicBrowser() ? '✓ يحتوي على اختبار' : '✓ Has test'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm font-medium ml-2"
                      >
                        {isArabicBrowser() ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
                {lessons.length === 0 && !showAddForm && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    {isArabicBrowser() ? 'لا توجد دروس في هذا الفصل' : 'No lessons in this chapter'}
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

export default LessonsManagement;









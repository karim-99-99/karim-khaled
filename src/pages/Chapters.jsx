import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategoryById, getCurrentUser, updateChapterName, addChapterToCategory, deleteChapterFromCategory } from '../services/storageService';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';

const Chapters = () => {
  const { sectionId, subjectId, categoryId } = useParams();
  const navigate = useNavigate();
  const category = getCategoryById(categoryId);
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [editingChapter, setEditingChapter] = useState(null);
  const [editName, setEditName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">التصنيف غير موجود</p>
      </div>
    );
  }

  const handleChapterClick = (chapterId, e) => {
    // Prevent navigation if clicking edit button
    if (e?.target?.closest('.edit-btn')) {
      return;
    }
    navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`);
  };

  const handleEditClick = (chapter, e) => {
    e.stopPropagation();
    setEditingChapter(chapter.id);
    setEditName(chapter.name);
  };

  const handleSaveEdit = (chapterId, e) => {
    e.stopPropagation();
    if (editName.trim()) {
      updateChapterName(chapterId, editName.trim());
      setEditingChapter(null);
      setEditName('');
      window.location.reload(); // Reload to show changes
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingChapter(null);
    setEditName('');
  };

  const handleAddChapter = () => {
    if (!newChapterName.trim()) {
      alert(isArabicBrowser() ? 'يرجى إدخال اسم الفصل' : 'Please enter chapter name');
      return;
    }
    const success = addChapterToCategory(categoryId, newChapterName.trim());
    if (success) {
      setNewChapterName('');
      setShowAddForm(false);
      window.location.reload();
    } else {
      alert(isArabicBrowser() ? 'حدث خطأ أثناء إضافة الفصل' : 'Error adding chapter');
    }
  };

  const handleDeleteChapter = (chapterId) => {
    if (window.confirm(isArabicBrowser() ? 'هل أنت متأكد من حذف هذا الفصل؟ سيتم حذف جميع الدروس التابعة له أيضاً.' : 'Are you sure? This will also delete all lessons in this chapter.')) {
      const success = deleteChapterFromCategory(chapterId);
      if (success) {
        window.location.reload();
      } else {
        alert(isArabicBrowser() ? 'حدث خطأ أثناء حذف الفصل' : 'Error deleting chapter');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={() => navigate(`/section/${sectionId}/subject/${subjectId}/categories`)}
              className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium"
            >
              ← رجوع
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
              >
                + {isArabicBrowser() ? 'إضافة فصل' : 'Add Chapter'}
              </button>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
            {category.name}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">اختر الفصل</p>
        </div>

        {/* Add Chapter Form for Admin */}
        {isAdmin && showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-300">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {category.chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              onClick={(e) => handleChapterClick(chapter.id, e)}
              className="bg-secondary-100 border-2 border-secondary-300 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6 text-right cursor-pointer relative"
            >
              {isAdmin && (
                <div className="absolute top-2 left-2 flex gap-2 z-10">
                  <button
                    onClick={(e) => editingChapter === chapter.id ? handleSaveEdit(chapter.id, e) : handleEditClick(chapter, e)}
                    className="edit-btn bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-lg text-sm font-medium"
                  >
                    {editingChapter === chapter.id ? '💾' : '✏️'}
                  </button>
                  {editingChapter !== chapter.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chapter.id);
                      }}
                      className="edit-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg text-sm font-medium"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
              {isAdmin && editingChapter === chapter.id && (
                <button
                  onClick={handleCancelEdit}
                  className="edit-btn absolute top-2 left-20 bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg text-sm font-medium z-10"
                >
                  ✕
                </button>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  {index + 1}
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
                {chapter.items?.length || 0} درس
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Chapters;



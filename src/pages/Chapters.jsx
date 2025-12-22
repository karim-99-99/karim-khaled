import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategoryById, getCurrentUser, updateChapterName } from '../services/storageService';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/section/${sectionId}/subject/${subjectId}/categories`)}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
          >
            ← رجوع
          </button>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
            {category.name}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">اختر الفصل</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {category.chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              onClick={(e) => handleChapterClick(chapter.id, e)}
              className="bg-secondary-100 border-2 border-secondary-300 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6 text-right cursor-pointer relative"
            >
              {isAdmin && (
                <button
                  onClick={(e) => editingChapter === chapter.id ? handleSaveEdit(chapter.id, e) : handleEditClick(chapter, e)}
                  className="edit-btn absolute top-2 left-2 bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-lg text-sm font-medium z-10"
                >
                  {editingChapter === chapter.id ? '💾' : '✏️'}
                </button>
              )}
              {isAdmin && editingChapter === chapter.id && (
                <button
                  onClick={handleCancelEdit}
                  className="edit-btn absolute top-2 left-12 bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg text-sm font-medium z-10"
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
                {chapter.items.length} درس
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



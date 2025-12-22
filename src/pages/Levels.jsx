import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItemsByChapter, getLevelProgress, getCurrentUser, getChapterById, updateItemName } from '../services/storageService';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';

const Levels = () => {
  const { sectionId, subjectId, categoryId, chapterId } = useParams();
  const navigate = useNavigate();
  const chapter = getChapterById(chapterId);
  const items = chapter ? chapter.items : [];
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');


  const getItemStatus = (itemId) => {
    if (!currentUser) return 'locked';
    const progress = getLevelProgress(currentUser.id, itemId);
    return progress ? 'completed' : 'available';
  };

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    setEditingItem(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = (itemId, e) => {
    e.stopPropagation();
    if (editName.trim()) {
      updateItemName(itemId, editName.trim());
      setEditingItem(null);
      setEditName('');
      window.location.reload(); // Reload to show changes
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingItem(null);
    setEditName('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapters`)}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
          >
            ← رجوع
          </button>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
            {chapter?.name || 'الدروس'}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">اختر الدرس</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const status = getItemStatus(item.id);
            const progress = currentUser ? getLevelProgress(currentUser.id, item.id) : null;
            
            return (
              <div
                key={item.id}
                className={`
                  relative bg-secondary-100 border-2 border-secondary-300 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6
                  ${status === 'locked' ? 'opacity-50' : ''}
                `}
              >
                {isAdmin && (
                  <button
                    onClick={(e) => editingItem === item.id ? handleSaveEdit(item.id, e) : handleEditClick(item, e)}
                    className="absolute top-2 left-2 bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-lg text-sm font-medium z-10"
                  >
                    {editingItem === item.id ? '💾' : '✏️'}
                  </button>
                )}
                {isAdmin && editingItem === item.id && (
                  <button
                    onClick={handleCancelEdit}
                    className="absolute top-2 left-12 bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg text-sm font-medium z-10"
                  >
                    ✕
                  </button>
                )}
                {status === 'completed' && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white text-lg md:text-xl w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-md font-bold">✓</div>
                )}
                {progress && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    {progress.score}%
                  </div>
                )}
                
                <div className="text-center mb-4">
                  <div className="text-3xl md:text-4xl mb-2">
                    📚
                  </div>
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
                  <button
                    onClick={() => navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${item.id}/video`)}
                    disabled={status === 'locked'}
                    className={`
                      bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium flex items-center justify-center gap-2
                      ${status === 'locked' ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    🎥 {isArabicBrowser() ? 'مشاهدة الفيديو' : ''}
                  </button>
                  
                  {item.hasTest && (
                    <button
                      onClick={() => navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/item/${item.id}/quiz`)}
                      disabled={status === 'locked'}
                      className={`
                        bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium flex items-center justify-center gap-2
                        ${status === 'locked' ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      📝 {isArabicBrowser() ? 'حل الاختبار' : ''}
                    </button>
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



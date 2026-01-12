import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSubjects, getCategoriesBySubject, getChaptersByCategory, getLevelsByChapter, getFileByLevel, addFile, updateFile, deleteFile as deleteFileMetadata, getSections } from '../../services/storageService';
import { saveFileAttachment, getFileAttachment, deleteFileAttachment } from '../../services/fileStorage';
import Header from '../../components/Header';
import { isArabicBrowser } from '../../utils/language';

const FilesManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemIdFromUrl = searchParams.get('itemId');
  const returnUrl = searchParams.get('returnUrl');
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [fileMetadata, setFileMetadata] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');

  // Helper function to find item's parent information
  const findItemParents = (itemId) => {
    const sections = getSections();
    for (const section of sections) {
      for (const subject of section.subjects) {
        for (const category of (subject.categories || [])) {
          for (const chapter of (category.chapters || [])) {
            const item = (chapter.items || []).find(i => i.id === itemId);
            if (item) {
              return { subject, category, chapter };
            }
          }
        }
      }
    }
    return null;
  };

  useEffect(() => {
    setSubjects(getSubjects());
    
    // If itemId is in URL, auto-select the appropriate dropdowns
    if (itemIdFromUrl) {
      const parents = findItemParents(itemIdFromUrl);
      if (parents) {
        setSelectedSubject(parents.subject.id);
        setSelectedCategory(parents.category.id);
        setSelectedChapter(parents.chapter.id);
        setSelectedLevel(itemIdFromUrl);
      }
    }
  }, [itemIdFromUrl]);

  useEffect(() => {
    const loadFile = async () => {
      if (selectedLevel) {
        const file = getFileByLevel(selectedLevel);
        setFileMetadata(file);
      } else {
        setFileMetadata(null);
      }
    };
    loadFile();
  }, [selectedLevel]);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedCategory('');
    setSelectedChapter('');
    setSelectedLevel('');
    setFileMetadata(null);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedChapter('');
    setSelectedLevel('');
    setFileMetadata(null);
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapter(chapterId);
    setSelectedLevel('');
    setFileMetadata(null);
  };

  const handleLevelChange = (levelId) => {
    setSelectedLevel(levelId);
  };

  const handleAddNew = () => {
    setEditingFile(null);
    setUploadedFile(null);
    setUploadProgress('');
    setShowForm(true);
  };

  const handleEdit = (file) => {
    setEditingFile(file);
    setUploadedFile(null);
    setUploadProgress(isArabicBrowser() ? 'ملف مرفوع مسبقاً / Previously uploaded file' : 'Previously uploaded file');
    setShowForm(true);
  };

  const handleDelete = async (fileId) => {
    if (window.confirm(isArabicBrowser() ? 'هل أنت متأكد من حذف هذا الملف؟' : 'Are you sure?')) {
      // Check if it's a file upload and delete from IndexedDB
      const file = getFileByLevel(selectedLevel);
      if (file && file.isFileUpload && file.url?.startsWith('indexeddb://')) {
        try {
          await deleteFileAttachment(selectedLevel);
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
      
      deleteFileMetadata(fileId);
      const updatedFile = getFileByLevel(selectedLevel);
      setFileMetadata(updatedFile);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type (PDF or Word)
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template'
    ];
    
    if (!validTypes.includes(file.type)) {
      alert(isArabicBrowser() ? 'الرجاء اختيار ملف PDF أو Word' : 'Please select a PDF or Word file');
      return;
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert(isArabicBrowser() ? 'حجم الملف كبير جداً. الحد الأقصى 50 ميجابايت' : 'File size too large. Maximum size is 50MB');
      return;
    }

    setUploadProgress(isArabicBrowser() ? 'تم اختيار الملف بنجاح! / File selected successfully!' : 'File selected successfully!');
    setUploadedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLevel) {
      alert(isArabicBrowser() ? 'يرجى اختيار المستوى أولاً' : 'Please select a level first');
      return;
    }

    if (!uploadedFile && !editingFile) {
      alert(isArabicBrowser() ? 'يرجى رفع ملف' : 'Please upload a file');
      return;
    }

    setUploadProgress(isArabicBrowser() ? 'جاري حفظ الملف...' : 'Saving file...');
    try {
      if (!window.indexedDB) {
        throw new Error('IndexedDB is not supported in this browser');
      }

      if (uploadedFile) {
        await saveFileAttachment(selectedLevel, uploadedFile, {});
      }

      // Save metadata to localStorage
      const fileData = {
        url: uploadedFile ? `indexeddb://${selectedLevel}` : editingFile?.url || `indexeddb://${selectedLevel}`,
        levelId: selectedLevel,
        isFileUpload: true,
        fileName: uploadedFile?.name || editingFile?.fileName || '',
        fileType: uploadedFile?.type || editingFile?.fileType || ''
      };

      if (editingFile) {
        updateFile(editingFile.id, fileData);
      } else {
        addFile(fileData);
      }

      setUploadProgress(isArabicBrowser() ? 'تم حفظ الملف بنجاح! / File saved successfully!' : 'File saved successfully!');
    } catch (error) {
      const errorMessage = error.message || 'Unknown error occurred';
      setUploadProgress(isArabicBrowser() ? `حدث خطأ أثناء حفظ الملف / Error saving file: ${errorMessage}` : `Error saving file: ${errorMessage}`);
      console.error('Error saving file:', error);
      alert(isArabicBrowser() ? `حدث خطأ أثناء حفظ الملف / Error saving file\n${errorMessage}` : `Error saving file\n${errorMessage}`);
      return;
    }

    const file = getFileByLevel(selectedLevel);
    setFileMetadata(file);
    
    setTimeout(() => {
      setShowForm(false);
      setUploadedFile(null);
      setUploadProgress('');
      
      if (returnUrl) {
        navigate(returnUrl);
      }
    }, 1000);
  };

  const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
  const levels = selectedChapter ? getLevelsByChapter(selectedChapter) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-dark-600">{isArabicBrowser() ? 'إدارة الملفات المرفقة' : 'Manage File Attachments'}</h1>
          <button
            onClick={() => {
              if (returnUrl) {
                navigate(returnUrl);
              } else {
                navigate('/admin/dashboard');
              }
            }}
            className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
          >
            ← {isArabicBrowser() ? 'رجوع' : 'Back'}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                المستوى / Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => handleLevelChange(e.target.value)}
                disabled={!selectedChapter}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">{isArabicBrowser() ? 'اختر المستوى' : 'Select Level'}</option>
                {levels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* File List */}
        {selectedLevel && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                {isArabicBrowser() ? 'الملف المرفق' : 'File Attachment'}
              </h2>
              {!fileMetadata ? (
                <button
                  onClick={handleAddNew}
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                >
                  + {isArabicBrowser() ? 'إضافة ملف' : 'Add File'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(fileMetadata)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
                  >
                    {isArabicBrowser() ? 'تعديل' : 'Edit'}
                  </button>
                  <button
                    onClick={() => handleDelete(fileMetadata.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    {isArabicBrowser() ? 'حذف' : 'Delete'}
                  </button>
                </div>
              )}
            </div>

            {fileMetadata && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">
                    📄
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark-600">
                      {fileMetadata.fileName || (isArabicBrowser() ? 'ملف مرفق' : 'Attached file')}
                    </h3>
                    <p className="text-sm text-dark-500">
                      {fileMetadata.fileType || ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingFile ? (isArabicBrowser() ? 'تعديل ملف مرفق' : 'Edit File Attachment') : (isArabicBrowser() ? 'إضافة ملف مرفق جديد' : 'Add File Attachment')}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      {isArabicBrowser() ? 'رفع ملف (PDF أو Word)' : 'Upload File (PDF or Word)'}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileUpload}
                      className="w-full px-4 py-2 border rounded-lg cursor-pointer"
                    />
                    {uploadProgress && (
                      <p className={`text-xs md:text-sm mt-2 ${uploadProgress.includes('نجاح') || uploadProgress.includes('successfully') ? 'text-green-600' : 'text-dark-600'}`}>
                        {uploadProgress}
                      </p>
                    )}
                    {uploadedFile && (
                      <p className="text-xs md:text-sm text-dark-500 mt-2">
                        {isArabicBrowser() ? 'الملف المرفوع / Uploaded file' : 'Uploaded file'}: {uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                    <p className="text-xs md:text-sm text-dark-500 mt-1">
                      {isArabicBrowser() ? 'الحد الأقصى لحجم الملف: 50 ميجابايت / Maximum file size: 50MB' : 'Maximum file size: 50MB'}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                    >
                      {isArabicBrowser() ? 'حفظ' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                    >
                      {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default FilesManagement;









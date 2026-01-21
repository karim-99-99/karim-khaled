import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFileByLevel, getItemById } from '../services/storageService';
import { getFileAttachment } from '../services/fileStorage';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';
import { isBackendOn, getFileByLevel as getFileByLevelApi } from '../services/backendApi';

const FileViewer = () => {
  const { sectionId, subjectId, categoryId, chapterId, itemId, levelId } = useParams();
  const navigate = useNavigate();
  const [fileMetadata, setFileMetadata] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const actualItemId = itemId || levelId;
  const [item, setItem] = useState(null);

  useEffect(() => {
    let currentFileUrl = null;
    const loadFile = async () => {
      setLoading(true);
      let file = null;
      if (isBackendOn()) {
        file = await getFileByLevelApi(actualItemId);
      } else {
        file = getFileByLevel(actualItemId);
        setItem(getItemById(actualItemId));
      }
      if (!file) {
        setLoading(false);
        return;
      }
      setFileMetadata(file);
      if (isBackendOn() && file.url) {
        currentFileUrl = file.url;
        setFileUrl(file.url);
      } else if (!isBackendOn() && file.isFileUpload && file.url?.startsWith('indexeddb://')) {
        try {
          const fileData = await getFileAttachment(actualItemId);
          if (fileData?.url) {
            currentFileUrl = fileData.url;
            setFileUrl(fileData.url);
          }
        } catch (e) {
          console.error('Error loading file:', e);
        }
      } else if (file.url) {
        currentFileUrl = file.url;
        setFileUrl(file.url);
      }
      setLoading(false);
    };
    loadFile();
    return () => {
      if (currentFileUrl && typeof currentFileUrl === 'string' && currentFileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentFileUrl);
      }
    };
  }, [actualItemId]);

  const handleBack = () => {
    if (sectionId && categoryId && itemId) {
      navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`);
    } else {
      navigate(`/subject/${subjectId}/chapter/${chapterId}/levels`);
    }
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileMetadata?.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg md:text-xl lg:text-2xl text-dark-600 font-medium">
          {isArabicBrowser() ? 'جاري التحميل...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (!fileMetadata || !fileUrl) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleBack}
              className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
            >
              ← {isArabicBrowser() ? 'رجوع' : 'Back'}
            </button>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-xl text-gray-600">
                {isArabicBrowser() ? 'لا يوجد ملف مرفق متاح' : 'No file attachment available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPDF = fileMetadata.fileType === 'application/pdf' || fileMetadata.fileName?.endsWith('.pdf');
  const isWord = fileMetadata.fileType?.includes('word') || fileMetadata.fileName?.match(/\.(doc|docx)$/i);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 flex justify-between items-center">
            <button
              onClick={handleBack}
              className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium"
            >
              ← {isArabicBrowser() ? 'رجوع' : 'Back'}
            </button>
            <button
              onClick={handleDownload}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium flex items-center gap-2"
            >
              ⬇️ {isArabicBrowser() ? 'تحميل' : 'Download'}
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-dark-600 mb-4 text-center">
              {isArabicBrowser() 
                ? (item?.name || 'الملف المرفق')
                : (item?.nameEn || item?.name || 'File Attachment')}
            </h1>
            
            {fileMetadata.fileName && (
              <p className="text-center text-dark-500 mb-4">
                {fileMetadata.fileName}
              </p>
            )}
            
            <div className="w-full" style={{ minHeight: '600px' }}>
              {isPDF ? (
                <iframe
                  src={fileUrl}
                  title={fileMetadata.fileName || 'PDF Viewer'}
                  className="w-full border rounded-lg"
                  style={{ height: '80vh', minHeight: '600px' }}
                />
              ) : isWord ? (
                <div className="border rounded-lg p-8 bg-gray-50 text-center">
                  <div className="mb-4">
                    <div className="text-6xl mb-4">📄</div>
                    <h2 className="text-2xl font-bold text-dark-600 mb-2">
                      {fileMetadata.fileName || (isArabicBrowser() ? 'ملف Word' : 'Word File')}
                    </h2>
                    <p className="text-dark-500 mb-6">
                      {isArabicBrowser() 
                        ? 'لا يمكن عرض ملفات Word مباشرة في المتصفح. يرجى تحميل الملف لعرضه.'
                        : 'Word files cannot be displayed directly in the browser. Please download the file to view it.'}
                    </p>
                    <button
                      onClick={handleDownload}
                      className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition font-medium"
                    >
                      ⬇️ {isArabicBrowser() ? 'تحميل الملف' : 'Download File'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-8 bg-gray-50 text-center">
                  <div className="mb-4">
                    <div className="text-6xl mb-4">📄</div>
                    <h2 className="text-2xl font-bold text-dark-600 mb-2">
                      {fileMetadata.fileName || (isArabicBrowser() ? 'ملف مرفق' : 'Attached File')}
                    </h2>
                    <p className="text-dark-500 mb-6">
                      {isArabicBrowser() 
                        ? 'يرجى تحميل الملف لعرضه.'
                        : 'Please download the file to view it.'}
                    </p>
                    <button
                      onClick={handleDownload}
                      className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition font-medium"
                    >
                      ⬇️ {isArabicBrowser() ? 'تحميل الملف' : 'Download File'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileViewer;


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getVideos, getVideoByLevel, addVideo, updateVideo, deleteVideo, getLevelsByChapter, getCategoriesBySubject, getChaptersByCategory } from '../../services/storageService';
import { saveVideoFile, getVideoFile, deleteVideoFile } from '../../services/videoStorage';
import Header from '../../components/Header';

const Videos = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [videos, setVideos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    titleEn: '',
  });
  const [uploadMethod, setUploadMethod] = useState('url'); // 'url' or 'file'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    setSubjects(getSubjects());
  }, []);

  useEffect(() => {
    const loadVideos = async () => {
      if (selectedLevel) {
        const video = getVideoByLevel(selectedLevel);
        if (video && video.isFileUpload && video.url.startsWith('indexeddb://')) {
          // Load video from IndexedDB
          try {
            const videoFile = await getVideoFile(selectedLevel);
            if (videoFile) {
              setVideos([{ ...video, url: videoFile.url, fileName: videoFile.fileName }]);
            } else {
              setVideos(video ? [video] : []);
            }
          } catch (error) {
            console.error('Error loading video file:', error);
            setVideos(video ? [video] : []);
          }
        } else {
          setVideos(video ? [video] : []);
        }
      } else {
        setVideos([]);
      }
    };
    loadVideos();
  }, [selectedLevel]);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedCategory('');
    setSelectedChapter('');
    setSelectedLevel('');
    setVideos([]);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedChapter('');
    setSelectedLevel('');
    setVideos([]);
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapter(chapterId);
    setSelectedLevel('');
    setVideos([]);
  };

  const handleLevelChange = (levelId) => {
    setSelectedLevel(levelId);
  };

  const handleAddNew = () => {
    setEditingVideo(null);
    setFormData({
      url: '',
      title: '',
      titleEn: '',
    });
    setUploadedFile(null);
    setUploadProgress('');
    setUploadMethod('url');
    setShowForm(true);
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setFormData({
      url: video.url || '',
      title: video.title || '',
      titleEn: video.titleEn || '',
    });
    setUploadMethod(video.isFileUpload ? 'file' : 'url');
    setUploadedFile(null);
    setUploadProgress(video.isFileUpload ? 'فيديو مرفوع مسبقاً / Previously uploaded video' : '');
    setShowForm(true);
  };

  const handleDelete = async (videoId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو؟ / Are you sure?')) {
      // Check if it's a file upload and delete from IndexedDB
      const video = getVideoByLevel(selectedLevel);
      if (video && video.isFileUpload && video.url.startsWith('indexeddb://')) {
        try {
          await deleteVideoFile(selectedLevel);
        } catch (error) {
          console.error('Error deleting video file:', error);
        }
      }
      
      deleteVideo(videoId);
      const updatedVideo = getVideoByLevel(selectedLevel);
      setVideos(updatedVideo ? [updatedVideo] : []);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (limit to 2GB for IndexedDB - can be adjusted)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      alert('حجم الفيديو كبير جداً. الحد الأقصى 2 جيجابايت / Video file too large. Maximum size is 2GB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      alert('الرجاء اختيار ملف فيديو / Please select a video file');
      return;
    }

    setUploadProgress('جاري معالجة الفيديو... / Processing video...');
    setUploadedFile(file);

    try {
      // Store file reference for later upload to IndexedDB
      // We'll use a special URL format to indicate it's a file upload
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFormData({ ...formData, url: `file_upload_${Date.now()}` });
      setUploadProgress(`تم اختيار الفيديو بنجاح! (${fileSizeMB} MB) / Video selected successfully! (${fileSizeMB} MB)`);
    } catch (error) {
      setUploadProgress('حدث خطأ أثناء رفع الفيديو / Error uploading video');
      console.error('Error uploading video:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLevel) {
      alert('يرجى اختيار المستوى أولاً / Please select a level first');
      return;
    }

    if (uploadMethod === 'file') {
      if (!uploadedFile) {
        alert('يرجى رفع ملف فيديو / Please upload a video file');
        return;
      }

      // Upload file to IndexedDB
      setUploadProgress('جاري حفظ الفيديو... / Saving video...');
      try {
        // Check if IndexedDB is available
        if (!window.indexedDB) {
          throw new Error('IndexedDB is not supported in this browser');
        }

        await saveVideoFile(selectedLevel, uploadedFile, {
          title: formData.title,
          titleEn: formData.titleEn,
        });

        // Save metadata to localStorage
        const videoData = {
          url: `indexeddb://${selectedLevel}`, // Special URL format for IndexedDB videos
          title: formData.title,
          titleEn: formData.titleEn,
          levelId: selectedLevel,
          isFileUpload: true,
        };

        if (editingVideo) {
          updateVideo(editingVideo.id, videoData);
        } else {
          addVideo(videoData);
        }

        setUploadProgress('تم حفظ الفيديو بنجاح! / Video saved successfully!');
      } catch (error) {
        const errorMessage = error.message || 'Unknown error occurred';
        setUploadProgress(`حدث خطأ أثناء حفظ الفيديو / Error saving video: ${errorMessage}`);
        console.error('Error saving video:', error);
        alert(`حدث خطأ أثناء حفظ الفيديو / Error saving video\n${errorMessage}`);
        return;
      }
    } else {
      // URL method
      let videoUrl = formData.url.trim();

      // Convert YouTube URLs to embed format
      if (videoUrl.includes('youtube.com/watch?v=')) {
        const videoId = videoUrl.split('v=')[1].split('&')[0];
        videoUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (videoUrl.includes('youtu.be/')) {
        const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        videoUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (videoUrl.includes('youtube.com/embed/')) {
        // Already in embed format
      } else if (!videoUrl.startsWith('http')) {
        alert('يرجى إدخال رابط صحيح / Please enter a valid URL');
        return;
      }

      const videoData = {
        ...formData,
        url: videoUrl,
        levelId: selectedLevel,
        isFileUpload: false,
      };

      if (editingVideo) {
        updateVideo(editingVideo.id, videoData);
        // If editing and switching from file to URL, delete the old file
        if (editingVideo.isFileUpload) {
          try {
            await deleteVideoFile(selectedLevel);
          } catch (error) {
            console.error('Error deleting old video file:', error);
          }
        }
      } else {
        addVideo(videoData);
      }
    }

    const video = getVideoByLevel(selectedLevel);
    setVideos(video ? [video] : []);
    
    // Delay closing to show success message
    setTimeout(() => {
      setShowForm(false);
      setFormData({
        url: '',
        title: '',
        titleEn: '',
      });
      setUploadedFile(null);
      setUploadProgress('');
      setUploadMethod('url');
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
          <h1 className="text-2xl md:text-3xl font-bold text-dark-600">إدارة الفيديوهات / Manage Videos</h1>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
          >
            ← رجوع / Back
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
                <option value="">اختر المادة / Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} / {subject.nameEn}
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
                <option value="">اختر التصنيف / Select Category</option>
                {selectedSubjectObj?.categories?.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} / {category.nameEn}
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
                <option value="">اختر الفصل / Select Chapter</option>
                {getChaptersByCategory(selectedCategory).map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name} / {chapter.nameEn}
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
                <option value="">اختر المستوى / Select Level</option>
                {levels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name} / {level.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Videos List */}
        {selectedLevel && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                الفيديو / Video
              </h2>
              {videos.length === 0 ? (
                <button
                  onClick={handleAddNew}
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                >
                  + إضافة فيديو / Add Video
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(videos[0])}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
                  >
                    تعديل / Edit
                  </button>
                  <button
                    onClick={() => handleDelete(videos[0].id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    حذف / Delete
                  </button>
                </div>
              )}
            </div>

            {videos.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="text-base md:text-lg lg:text-xl font-bold text-dark-600 mb-2">
                  {videos[0].title}
                </h3>
                {videos[0].titleEn && (
                  <p className="text-sm md:text-base text-dark-500 mb-4">{videos[0].titleEn}</p>
                )}
                <div className="aspect-video w-full max-w-2xl">
                  {(videos[0].url.includes('youtube.com') || videos[0].url.includes('youtu.be')) ? (
                    <iframe
                      src={videos[0].url}
                      className="w-full h-full rounded"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={videos[0].url}
                      controls
                      className="w-full h-full rounded"
                    >
                      متصفحك لا يدعم تشغيل الفيديو
                    </video>
                  )}
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
                  {editingVideo ? 'تعديل فيديو / Edit Video' : 'إضافة فيديو جديد / Add Video'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Upload Method Selection */}
                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      طريقة الإضافة / Upload Method
                    </label>
                    <div className="flex gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMethod('url');
                          setFormData({ ...formData, url: '' });
                          setUploadedFile(null);
                          setUploadProgress('');
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          uploadMethod === 'url'
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-200 text-dark-600 hover:bg-gray-300'
                        }`}
                      >
                        رابط / URL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMethod('file');
                          setFormData({ ...formData, url: '' });
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          uploadMethod === 'file'
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-200 text-dark-600 hover:bg-gray-300'
                        }`}
                      >
                        رفع ملف / Upload File
                      </button>
                    </div>
                  </div>

                  {/* URL Input */}
                  {uploadMethod === 'url' && (
                    <div>
                      <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                        رابط الفيديو / Video URL (YouTube, Vimeo, or direct link)
                      </label>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        required={uploadMethod === 'url'}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                      <p className="text-xs md:text-sm text-dark-500 mt-1">
                        يمكنك إدخال رابط YouTube أو رابط مباشر للفيديو / You can enter a YouTube link or direct video URL
                      </p>
                    </div>
                  )}

                  {/* File Upload */}
                  {uploadMethod === 'file' && (
                    <div>
                      <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                        رفع ملف فيديو / Upload Video File
                      </label>
                      <input
                        type="file"
                        accept="video/*"
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
                          الملف المرفوع / Uploaded file: {uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      )}
                      <p className="text-xs md:text-sm text-dark-500 mt-1">
                        الحد الأقصى لحجم الملف: 2 جيجابايت / Maximum file size: 2GB
                      </p>
                      <p className="text-xs md:text-sm text-dark-500">
                        يدعم جميع صيغ الفيديو (MP4, WebM, OGG, etc.) / Supports all video formats (MP4, WebM, OGG, etc.)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      العنوان (عربي) / Title (Arabic)
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      العنوان (إنجليزي) / Title (English) - Optional
                    </label>
                    <input
                      type="text"
                      value={formData.titleEn}
                      onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                    >
                      حفظ / Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                    >
                      إلغاء / Cancel
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

export default Videos;



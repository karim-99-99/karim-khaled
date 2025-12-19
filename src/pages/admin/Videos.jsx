import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getVideos, getVideoByLevel, addVideo, updateVideo, deleteVideo, getLevelsByChapter } from '../../services/storageService';

const Videos = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
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

  useEffect(() => {
    setSubjects(getSubjects());
  }, []);

  useEffect(() => {
    if (selectedLevel) {
      const video = getVideoByLevel(selectedLevel);
      setVideos(video ? [video] : []);
    } else {
      setVideos([]);
    }
  }, [selectedLevel]);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
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
    setShowForm(true);
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setFormData({
      url: video.url,
      title: video.title,
      titleEn: video.titleEn || '',
    });
    setShowForm(true);
  };

  const handleDelete = (videoId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو؟ / Are you sure?')) {
      deleteVideo(videoId);
      const video = getVideoByLevel(selectedLevel);
      setVideos(video ? [video] : []);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedLevel) {
      alert('يرجى اختيار المستوى أولاً / Please select a level first');
      return;
    }

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
    };

    if (editingVideo) {
      updateVideo(editingVideo.id, videoData);
    } else {
      addVideo(videoData);
    }

    const video = getVideoByLevel(selectedLevel);
    setVideos(video ? [video] : []);
    setShowForm(false);
    setFormData({
      url: '',
      title: '',
      titleEn: '',
    });
  };

  const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
  const selectedChapterObj = selectedSubjectObj?.chapters.find(c => c.id === selectedChapter);
  const levels = selectedChapter ? getLevelsByChapter(selectedChapter) : [];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">إدارة الفيديوهات / Manage Videos</h1>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            ← رجوع / Back
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الفصل / Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => handleChapterChange(e.target.value)}
                disabled={!selectedSubject}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر الفصل / Select Chapter</option>
                {selectedSubjectObj?.chapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name} / {chapter.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <h2 className="text-xl font-bold text-gray-800">
                الفيديو / Video
              </h2>
              {videos.length === 0 ? (
                <button
                  onClick={handleAddNew}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
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
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {videos[0].title}
                </h3>
                {videos[0].titleEn && (
                  <p className="text-gray-600 mb-4">{videos[0].titleEn}</p>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رابط الفيديو / Video URL (YouTube, Vimeo, or direct link)
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      يمكنك إدخال رابط YouTube أو رابط مباشر للفيديو / You can enter a YouTube link or direct video URL
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
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
  );
};

export default Videos;



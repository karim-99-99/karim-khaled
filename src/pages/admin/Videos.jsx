import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSubjects, getVideoByLevel, addVideo, updateVideo, deleteVideo, getLevelsByChapter, getChaptersByCategory, getSections } from '../../services/storageService';
import { saveVideoFile, getVideoFile, deleteVideoFile } from '../../services/videoStorage';
import * as backendApi from '../../services/backendApi';
import Header from '../../components/Header';
import {
  normalizeVideoUrl,
  isEmbedVideoUrl,
  getEmbedVideoSrc,
  isBunnyVideoId,
  needsBunnySignedUrl,
  extractBunnyVideoId,
  extractBunnyLibraryId,
  formatBunnyLoadError,
} from '../../utils/videoUrl';

const Videos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemIdFromUrl = searchParams.get('itemId');
  const returnUrl = searchParams.get('returnUrl');
  const useBackend = backendApi.isBackendOn();
  
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
    bunnyVideoId: '',
    bunnyLibraryId: '',
    title: '',
    titleEn: '',
  });
  const [uploadMethod, setUploadMethod] = useState('url');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [chaptersForCategory, setChaptersForCategory] = useState([]);
  const [levelsForChapter, setLevelsForChapter] = useState([]);
  const [bunnyLibraries, setBunnyLibraries] = useState([]);
  const [showLibraryForm, setShowLibraryForm] = useState(false);
  const [librarySaving, setLibrarySaving] = useState(false);
  const [registerNewLibrary, setRegisterNewLibrary] = useState(false);
  const [libraryForm, setLibraryForm] = useState({
    library_id: '',
    label: '',
    security_key: '',
    stream_api_key: '',
  });
  const [adminPreviewUrl, setAdminPreviewUrl] = useState(null);
  const [adminPreviewLoading, setAdminPreviewLoading] = useState(false);
  const [adminPreviewError, setAdminPreviewError] = useState(null);

  const findItemParents = (itemId) => {
    const sections = getSections();
    for (const section of sections) {
      for (const subject of section.subjects || []) {
        for (const category of (subject.categories || [])) {
          for (const chapter of (category.chapters || [])) {
            const item = (chapter.items || []).find(i => i.id === itemId);
            if (item) return { subject, category, chapter };
          }
        }
      }
    }
    return null;
  };

  useEffect(() => {
    if (useBackend) {
      backendApi.getSubjects().then((all) => {
        if (all && all.length) {
          setSubjects(all);
          // After subjects are loaded, find and set the lesson if itemIdFromUrl exists
          if (itemIdFromUrl) {
            // Get lesson directly to find its parents
            backendApi.getItemById(itemIdFromUrl).then((lesson) => {
              if (lesson && lesson.chapter) {
                // Get chapter to find category
                backendApi.getChapterById(lesson.chapter).then((chapter) => {
                  if (chapter && chapter.category) {
                    // Get category to find subject
                    backendApi.getCategoryById(chapter.category).then((category) => {
                      if (category && category.subject) {
                        // Set all fields
                        setSelectedSubject(category.subject);
                        setSelectedCategory(category.id);
                        setSelectedChapter(chapter.id);
                        setSelectedLevel(itemIdFromUrl);
                        // Check if video exists, if not show form
                        backendApi.getVideoByLevel(itemIdFromUrl).then((v) => { 
                          if (!v) setShowForm(true); 
                        });
                      }
                    }).catch(() => {});
                  }
                }).catch(() => {});
              }
            }).catch(() => {});
          }
        }
      }).catch(() => setSubjects([]));
    } else {
      setSubjects(getSubjects());
      if (itemIdFromUrl) {
        const parents = findItemParents(itemIdFromUrl);
        if (parents) {
          setSelectedSubject(parents.subject.id);
          setSelectedCategory(parents.category.id);
          setSelectedChapter(parents.chapter.id);
          setSelectedLevel(itemIdFromUrl);
          setTimeout(() => { if (!getVideoByLevel(itemIdFromUrl)) setShowForm(true); }, 100);
        }
      }
    }
  }, [itemIdFromUrl, useBackend]);

  useEffect(() => {
    if (!selectedLevel) {
      setVideos([]);
      return;
    }
    if (useBackend) {
      backendApi.getVideoByLevel(selectedLevel).then((v) => setVideos(v ? [v] : [])).catch(() => setVideos([]));
      return;
    }
    (async () => {
      const video = getVideoByLevel(selectedLevel);
      if (video && video.isFileUpload && video.url?.startsWith('indexeddb://')) {
        try {
          const vf = await getVideoFile(selectedLevel);
          setVideos(vf ? [{ ...video, url: vf.url, fileName: vf.fileName }] : (video ? [video] : []));
        } catch {
          setVideos(video ? [video] : []);
        }
      } else {
        setVideos(video ? [video] : []);
      }
    })();
  }, [selectedLevel, useBackend]);

  useEffect(() => {
    if (!selectedCategory) { setChaptersForCategory([]); return; }
    if (useBackend) backendApi.getChaptersByCategory(selectedCategory).then(setChaptersForCategory).catch(() => setChaptersForCategory([]));
    else setChaptersForCategory(getChaptersByCategory(selectedCategory) || []);
  }, [selectedCategory, useBackend]);

  useEffect(() => {
    if (!selectedChapter) { setLevelsForChapter([]); return; }
    if (useBackend) backendApi.getLevelsByChapter(selectedChapter).then(setLevelsForChapter).catch(() => setLevelsForChapter([]));
    else setLevelsForChapter(getLevelsByChapter(selectedChapter) || []);
  }, [selectedChapter, useBackend]);

  useEffect(() => {
    const video = videos[0];
    if (!video || !useBackend || !needsBunnySignedUrl(video.url)) {
      setAdminPreviewUrl(null);
      setAdminPreviewError(null);
      setAdminPreviewLoading(false);
      return undefined;
    }

    let cancelled = false;
    const loadPreview = async () => {
      setAdminPreviewLoading(true);
      setAdminPreviewError(null);
      setAdminPreviewUrl(null);

      const bunnyId = extractBunnyVideoId(video.url);
      if (!bunnyId) {
        if (!cancelled) {
          setAdminPreviewError('معرّف الفيديو (Bunny) غير صالح.');
          setAdminPreviewLoading(false);
        }
        return;
      }

      try {
        const lessonId = selectedLevel || video.levelId || video.itemId || null;
        const signedUrl = await backendApi.getBunnySignedUrl(
          bunnyId,
          lessonId,
          video.bunnyLibraryId || null
        );
        if (!cancelled) setAdminPreviewUrl(signedUrl);
      } catch (err) {
        if (!cancelled) setAdminPreviewError(formatBunnyLoadError(err));
      } finally {
        if (!cancelled) setAdminPreviewLoading(false);
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [videos, selectedLevel, useBackend]);

  const loadBunnyLibraries = async () => {
    if (!useBackend) return;
    try {
      const libs = await backendApi.getBunnyLibraries();
      setBunnyLibraries(
        libs.filter((lib) => lib.is_active !== false)
      );
    } catch {
      setBunnyLibraries([]);
    }
  };

  useEffect(() => {
    if (useBackend) loadBunnyLibraries();
  }, [useBackend]);

  const emptyLibraryForm = () => ({
    library_id: '',
    label: '',
    security_key: '',
    stream_api_key: '',
  });

  const validateBunnyLibraryForm = (data) => {
    const lib = (data.library_id || '').trim();
    if (!lib) return 'يرجى إدخال Bunny Library ID';
    if (!/^\d+$/.test(lib)) return 'Library ID يجب أن يكون رقماً';
    if (!(data.security_key || '').trim()) {
      return 'يرجى إدخال Token Authentication Key من Bunny → Security';
    }
    if (!(data.stream_api_key || '').trim()) {
      return 'يرجى إدخال API Key من Bunny → API';
    }
    return null;
  };

  const handleSaveLibrary = async (e) => {
    e.preventDefault();
    const err = validateBunnyLibraryForm(libraryForm);
    if (err) {
      alert(err);
      return;
    }
    setLibrarySaving(true);
    try {
      await backendApi.addBunnyLibrary({
        library_id: libraryForm.library_id.trim(),
        label: libraryForm.label.trim(),
        security_key: libraryForm.security_key.trim(),
        stream_api_key: libraryForm.stream_api_key.trim(),
      });
      await loadBunnyLibraries();
      setLibraryForm(emptyLibraryForm());
      setShowLibraryForm(false);
      setFormData((prev) => ({
        ...prev,
        bunnyLibraryId: libraryForm.library_id.trim(),
      }));
      alert('تم تسجيل المكتبة بنجاح / Library registered');
    } catch (saveErr) {
      alert(saveErr.message || 'فشل تسجيل المكتبة');
    } finally {
      setLibrarySaving(false);
    }
  };

  const handleDeleteLibrary = async (libraryId) => {
    if (!window.confirm(`حذف مكتبة ${libraryId}؟ / Delete library ${libraryId}?`)) return;
    try {
      await backendApi.deleteBunnyLibrary(libraryId);
      await loadBunnyLibraries();
      if (formData.bunnyLibraryId === libraryId) {
        setFormData((prev) => ({ ...prev, bunnyLibraryId: '' }));
      }
    } catch (err) {
      alert(err.message || 'فشل الحذف');
    }
  };

  const ensureLibraryForVideo = async () => {
    if (registerNewLibrary) {
      const err = validateBunnyLibraryForm(libraryForm);
      if (err) throw new Error(err);
      const libId = libraryForm.library_id.trim();
      await backendApi.addBunnyLibrary({
        library_id: libId,
        label: libraryForm.label.trim(),
        security_key: libraryForm.security_key.trim(),
        stream_api_key: libraryForm.stream_api_key.trim(),
      });
      await loadBunnyLibraries();
      setRegisterNewLibrary(false);
      setLibraryForm(emptyLibraryForm());
      return libId;
    }

    const libId = (formData.bunnyLibraryId || '').trim();
    if (!libId) {
      throw new Error('اختر مكتبة Bunny أو سجّل مكتبة جديدة / Select or register a Bunny library');
    }
    const exists = bunnyLibraries.some((lib) => String(lib.library_id) === libId);
    if (!exists) {
      throw new Error(
        'هذه المكتبة غير مسجّلة. سجّلها أولاً من قسم «مكتبات Bunny» أو اختر «مكتبة جديدة».'
      );
    }
    return libId;
  };

  const renderBunnyLibraryPicker = (helpText) => (
    <div>
      <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
        Bunny Library *
      </label>
      {!registerNewLibrary ? (
        <>
          <select
            value={formData.bunnyLibraryId || ''}
            onChange={(e) =>
              setFormData({ ...formData, bunnyLibraryId: e.target.value })
            }
            required
            className="w-full px-4 py-2 border rounded-lg bg-white"
          >
            <option value="">— اختر المكتبة —</option>
            {bunnyLibraries.map((lib) => (
              <option key={lib.library_id} value={lib.library_id}>
                {lib.label
                  ? `${lib.label} (${lib.library_id})`
                  : lib.library_id}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setRegisterNewLibrary(true);
              setLibraryForm({
                ...emptyLibraryForm(),
                library_id: formData.bunnyLibraryId || '',
              });
            }}
            className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + تسجيل مكتبة Bunny جديدة
          </button>
        </>
      ) : (
        <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium text-dark-600">
            تسجيل مكتبة جديدة (مرة واحدة فقط لكل مكتبة)
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Library ID"
            value={libraryForm.library_id}
            onChange={(e) =>
              setLibraryForm({ ...libraryForm, library_id: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="اسم اختياري / Optional label"
            value={libraryForm.label}
            onChange={(e) =>
              setLibraryForm({ ...libraryForm, label: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
          <input
            type="password"
            autoComplete="off"
            placeholder="Token Authentication Key (Bunny → Security)"
            value={libraryForm.security_key}
            onChange={(e) =>
              setLibraryForm({ ...libraryForm, security_key: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
          <input
            type="password"
            autoComplete="off"
            placeholder="API Key (Bunny → API)"
            value={libraryForm.stream_api_key}
            onChange={(e) =>
              setLibraryForm({ ...libraryForm, stream_api_key: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
          <button
            type="button"
            onClick={() => {
              setRegisterNewLibrary(false);
              setLibraryForm(emptyLibraryForm());
            }}
            className="text-sm text-dark-500 hover:text-dark-700"
          >
            إلغاء — اختر مكتبة مسجّلة
          </button>
        </div>
      )}
      <p className="text-xs md:text-sm text-dark-500 mt-1">{helpText}</p>
    </div>
  );

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

  const emptyFormData = () => ({
    url: '',
    bunnyVideoId: '',
    bunnyLibraryId: '',
    title: '',
    titleEn: '',
  });

  const resolveBunnyVideoId = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return null;
    return extractBunnyVideoId(trimmed) || (isBunnyVideoId(trimmed) ? trimmed : null);
  };

  const validateBunnyVideoIdField = (videoId) => {
    const vid = (videoId || '').trim();
    if (!vid) {
      return 'يرجى إدخال Bunny Video ID / Please enter Bunny Video ID';
    }
    if (!resolveBunnyVideoId(vid)) {
      return 'يرجى إدخال Bunny Video ID صالح (UUID أو رقم) / Enter a valid Bunny Video ID';
    }
    return null;
  };

  const handleAddNew = () => {
    setEditingVideo(null);
    setFormData(emptyFormData());
    setUploadedFile(null);
    setUploadProgress('');
    setUploadMethod('url');
    setRegisterNewLibrary(false);
    setLibraryForm(emptyLibraryForm());
    setShowForm(true);
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setFormData({
      url: video.url || '',
      bunnyVideoId: extractBunnyVideoId(video.url || '') || '',
      bunnyLibraryId: video.bunnyLibraryId || extractBunnyLibraryId(video.url || '') || '',
      title: video.title || '',
      titleEn: video.titleEn || '',
    });
    setUploadMethod(video.isFileUpload ? 'file' : 'url');
    setUploadedFile(null);
    setUploadProgress(video.isFileUpload ? 'فيديو مرفوع مسبقاً / Previously uploaded video' : '');
    setShowForm(true);
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفيديو؟ / Are you sure?')) return;
    if (useBackend) {
      try {
        await backendApi.deleteVideo(videoId);
        const v = await backendApi.getVideoByLevel(selectedLevel);
        setVideos(v ? [v] : []);
      } catch (e) {
        alert(e.message || 'خطأ في الحذف');
      }
      return;
    }
    const video = getVideoByLevel(selectedLevel);
    if (video && video.isFileUpload && video.url?.startsWith('indexeddb://')) {
      try {
        await deleteVideoFile(selectedLevel);
      } catch {
        // Best-effort cleanup for local IndexedDB uploads.
      }
    }
    deleteVideo(videoId);
    setVideos(getVideoByLevel(selectedLevel) ? [getVideoByLevel(selectedLevel)] : []);
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

    if (useBackend && uploadMethod === 'file') {
      if (!uploadedFile && !editingVideo) {
        alert('يرجى رفع ملف فيديو / Please upload a video file');
        return;
      }
      setUploadProgress('جاري الحفظ... / Saving...');
      try {
        const bunnyLibraryId = await ensureLibraryForVideo();
        if (editingVideo) {
          await backendApi.updateVideo(editingVideo.id, {
            title: formData.title,
            description: formData.titleEn || '',
            bunny_library_id: bunnyLibraryId,
            ...(uploadedFile && { video_file: uploadedFile }),
          });
        } else {
          await backendApi.addVideo(selectedLevel, {
            title: formData.title,
            description: formData.titleEn || '',
            bunny_library_id: bunnyLibraryId,
            video_file: uploadedFile,
          });
        }
        const v = await backendApi.getVideoByLevel(selectedLevel);
        setVideos(v ? [v] : []);
        setUploadProgress('تم الحفظ! / Saved!');
      } catch (err) {
        setUploadProgress('');
        alert(err.message || 'حدث خطأ');
        return;
      }
      setShowForm(false);
      setFormData(emptyFormData());
      setUploadedFile(null);
      setUploadProgress('');
      setUploadMethod('url');
      return;
    }

    if (uploadMethod === 'file') {
      if (!uploadedFile) {
        alert('يرجى رفع ملف فيديو / Please upload a video file');
        return;
      }

      setUploadProgress('جاري حفظ الفيديو... / Saving video...');
      try {
        if (!window.indexedDB) throw new Error('IndexedDB is not supported in this browser');
        await saveVideoFile(selectedLevel, uploadedFile, { title: formData.title, titleEn: formData.titleEn });
        const videoData = { url: `indexeddb://${selectedLevel}`, title: formData.title, titleEn: formData.titleEn, levelId: selectedLevel, isFileUpload: true };
        if (editingVideo) updateVideo(editingVideo.id, videoData);
        else addVideo(videoData);
        setUploadProgress('تم حفظ الفيديو بنجاح! / Video saved successfully!');
      } catch (error) {
        setUploadProgress(`حدث خطأ / Error: ${error.message || ''}`);
        alert(`حدث خطأ أثناء حفظ الفيديو / Error saving video\n${error.message || ''}`);
        return;
      }
    } else {
      if (useBackend) {
        const videoError = validateBunnyVideoIdField(formData.bunnyVideoId);
        if (videoError) {
          alert(videoError);
          return;
        }
        setUploadProgress('جاري الحفظ... / Saving...');
        try {
          const bunnyLibraryId = await ensureLibraryForVideo();
          const videoUrl = resolveBunnyVideoId(formData.bunnyVideoId);
          if (editingVideo) {
            await backendApi.updateVideo(editingVideo.id, {
              title: formData.title,
              description: formData.titleEn || '',
              video_url: videoUrl,
              bunny_library_id: bunnyLibraryId,
            });
          } else {
            await backendApi.addVideo(selectedLevel, {
              title: formData.title,
              description: formData.titleEn || '',
              video_url: videoUrl,
              bunny_library_id: bunnyLibraryId,
            });
          }
          const v = await backendApi.getVideoByLevel(selectedLevel);
          setVideos(v ? [v] : []);
          setUploadProgress('تم الحفظ! / Saved!');
        } catch (err) {
          setUploadProgress('');
          alert(err.message || 'حدث خطأ');
          return;
        }
        setShowForm(false);
        setFormData(emptyFormData());
        setUploadProgress('');
        return;
      }

      // Local-only URL method: link (YouTube, Google Drive, cloud, or direct)
      let videoUrl = formData.url.trim();

      if (!videoUrl) {
        alert('يرجى إدخال رابط الفيديو / Please enter a video URL');
        return;
      }

      if (!videoUrl.startsWith('http') && !videoUrl.startsWith('https')) {
        videoUrl = 'https://' + videoUrl;
      }
      videoUrl = normalizeVideoUrl(videoUrl);
      if (!videoUrl.startsWith('http')) {
        alert('يرجى إدخال رابط صحيح (YouTube، Drive، أو رابط مباشر) / Please enter a valid URL');
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
      setFormData(emptyFormData());
      setUploadedFile(null);
      setUploadProgress('');
      setUploadMethod('url');
    }, 1000);
  };

  const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
  const levels = levelsForChapter;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-dark-600">إدارة الفيديوهات / Manage Videos</h1>
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
            ← رجوع / Back
          </button>
        </div>

        {useBackend ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-dark-600">
                  مكتبات Bunny / Bunny Libraries
                </h2>
                <p className="text-xs md:text-sm text-dark-500 mt-1">
                  سجّل كل مكتبة مرة واحدة هنا. بعدها أضف الفيديوهات باختيار المكتبة + Video ID فقط.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLibraryForm((v) => !v)}
                className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
              >
                {showLibraryForm ? 'إغلاق' : '+ إضافة مكتبة'}
              </button>
            </div>

            {bunnyLibraries.length > 0 ? (
              <ul className="divide-y border rounded-lg mb-4">
                {bunnyLibraries.map((lib) => (
                  <li
                    key={lib.library_id}
                    className="flex flex-wrap justify-between items-center gap-2 px-4 py-3"
                  >
                    <div>
                      <span className="font-mono font-semibold text-dark-700">
                        {lib.library_id}
                      </span>
                      {lib.label && (
                        <span className="text-dark-500 text-sm mr-2"> — {lib.label}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteLibrary(lib.library_id)}
                      className="text-red-600 text-sm hover:text-red-700"
                    >
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-dark-500 mb-4">
                لا توجد مكتبات مسجّلة بعد. أضف مكتبتك الأولى (685337، 687985، 687043، أو أي مكتبة أخرى).
              </p>
            )}

            {showLibraryForm && (
              <form onSubmit={handleSaveLibrary} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Library ID (من Bunny)"
                    value={libraryForm.library_id}
                    onChange={(e) =>
                      setLibraryForm({ ...libraryForm, library_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="اسم اختياري (مثال: رياضيات)"
                    value={libraryForm.label}
                    onChange={(e) =>
                      setLibraryForm({ ...libraryForm, label: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  required
                  placeholder="Token Authentication Key — Bunny → Security"
                  value={libraryForm.security_key}
                  onChange={(e) =>
                    setLibraryForm({ ...libraryForm, security_key: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="password"
                  autoComplete="off"
                  required
                  placeholder="API Key — Bunny → API"
                  value={libraryForm.stream_api_key}
                  onChange={(e) =>
                    setLibraryForm({ ...libraryForm, stream_api_key: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <button
                  type="submit"
                  disabled={librarySaving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
                >
                  {librarySaving ? 'جاري الحفظ...' : 'حفظ المكتبة'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
            <p className="font-semibold mb-1">قسم مكتبات Bunny غير متاح حالياً</p>
            <p>
              يجب تسجيل الدخول وربط الموقع بالخادم (VITE_API_URL على Vercel). بعد ذلك سيظهر قسم
              «مكتبات Bunny» في أعلى هذه الصفحة.
            </p>
          </div>
        )}

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
                <option value="">اختر التصنيف / Select Category</option>
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
                <option value="">اختر الفصل / Select Chapter</option>
                {chaptersForCategory.map(chapter => (
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
                <option value="">اختر المستوى / Select Level</option>
                {levels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name}
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
                {useBackend && needsBunnySignedUrl(videos[0].url) && (
                  <div className="text-xs md:text-sm text-dark-500 mb-4 font-mono bg-gray-50 rounded p-3 space-y-1">
                    <p>
                      <span className="font-semibold">Bunny Library ID:</span>{' '}
                      {videos[0].bunnyLibraryId || '—'}
                    </p>
                    <p>
                      <span className="font-semibold">Bunny Video ID:</span>{' '}
                      {extractBunnyVideoId(videos[0].url) || videos[0].url}
                    </p>
                  </div>
                )}
                <div className="aspect-video w-full max-w-2xl">
                  {needsBunnySignedUrl(videos[0].url) ? (
                    adminPreviewLoading ? (
                      <div className="w-full h-full rounded bg-slate-900 text-white flex items-center justify-center text-center p-4">
                        <p className="font-medium">جاري تحميل الفيديو...</p>
                      </div>
                    ) : adminPreviewError ? (
                      <div className="w-full h-full rounded bg-slate-900 text-red-300 flex items-center justify-center text-center p-4">
                        <p className="font-medium">{adminPreviewError}</p>
                      </div>
                    ) : adminPreviewUrl ? (
                      <iframe
                        src={getEmbedVideoSrc(adminPreviewUrl) || adminPreviewUrl}
                        title={videos[0].title || 'فيديو تعليمي'}
                        className="w-full h-full rounded"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full rounded bg-slate-900 text-white flex items-center justify-center text-center p-4">
                        <p className="font-medium">تعذّر تحميل معاينة الفيديو.</p>
                      </div>
                    )
                  ) : isEmbedVideoUrl(videos[0].url) ? (
                    <iframe
                      src={getEmbedVideoSrc(videos[0].url) || videos[0].url}
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
                          setFormData({ ...formData, url: '', bunnyVideoId: '' });
                          setUploadedFile(null);
                          setUploadProgress('');
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          uploadMethod === 'url'
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-200 text-dark-600 hover:bg-gray-300'
                        }`}
                      >
                        Bunny Video ID
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
                        رفع ملف فيديو / Upload File
                      </button>
                    </div>
                  </div>

                  {/* Bunny manual entry (backend) or generic URL (local) */}
                  {uploadMethod === 'url' && useBackend && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderBunnyLibraryPicker(
                        'سجّل المكتبة مرة واحدة، ثم لكل فيديو أدخل Video ID فقط. لا حاجة لتعديل Render.'
                      )}
                      <div>
                        <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                          Bunny Video ID *
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          value={formData.bunnyVideoId || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, bunnyVideoId: e.target.value })
                          }
                          required
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                        <p className="text-xs md:text-sm text-dark-500 mt-1">
                          الصق <strong>Video ID</strong> فقط من نفس المكتبة — لا تلصق رابط iframe.
                        </p>
                      </div>
                    </div>
                  )}

                  {uploadMethod === 'url' && !useBackend && (
                    <div>
                      <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                        رابط الفيديو / Video URL
                      </label>
                      <input
                        type="text"
                        inputMode="url"
                        autoComplete="off"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        required={uploadMethod === 'url'}
                        placeholder="YouTube, Google Drive, or direct link"
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  )}

                  {/* File Upload */}
                  {uploadMethod === 'file' && (
                    <div>
                      {useBackend && (
                        <div className="mb-4">
                          {renderBunnyLibraryPicker(
                            'اختر المكتبة المسجّلة التي سيتم رفع الفيديو إليها.'
                          )}
                        </div>
                      )}
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
                      {useBackend && (
                        <p className="text-xs md:text-sm text-primary-600 mt-2 font-medium">
                          يُرفع الفيديو إلى المكتبة المسجّلة في الموقع (قسم مكتبات Bunny).
                        </p>
                      )}
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



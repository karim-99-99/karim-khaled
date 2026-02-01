import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVideoByLevel, getItemById, getCurrentUser } from '../services/storageService';
import { getVideoFile } from '../services/videoStorage';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';
import { hasCategoryAccess } from '../components/ProtectedRoute';
import { isBackendOn, getVideoByLevel as getVideoByLevelApi, getItemById as getItemByIdApi, recordVideoWatch } from '../services/backendApi';

const Video = () => {
  const { sectionId, subjectId, categoryId, chapterId, itemId, levelId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [actualVideoUrl, setActualVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const videoRef = useRef(null);
  
  const actualItemId = itemId || levelId;
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const categoryName = (categoryId || '').includes('تأسيس') ? 'التأسيس' : 'التجميعات';
  const canAccessMedia = isAdmin || (currentUser && hasCategoryAccess(currentUser, categoryName));

  useEffect(() => {
    let c = false;
    const loadVideo = async () => {
      setLoading(true);
      let itemVideo = null;
      if (isBackendOn()) {
        itemVideo = await getVideoByLevelApi(actualItemId);
        const i = await getItemByIdApi(actualItemId);
        if (!c) setItem(i);
      } else {
        itemVideo = getVideoByLevel(actualItemId);
        if (!c) setItem(getItemById(actualItemId));
      }
      
      if (!c && !itemVideo) {
        setLoading(false);
        return;
      }
      if (c) return;
      
      if (!isBackendOn() && itemVideo.isFileUpload && itemVideo.url?.startsWith('indexeddb://')) {
        try {
          const videoFile = await getVideoFile(actualItemId);
          if (videoFile?.url) {
            setActualVideoUrl(videoFile.url);
            setVideo({ ...itemVideo, url: videoFile.url });
          } else {
            setVideo(itemVideo);
            setActualVideoUrl(itemVideo.url);
          }
        } catch (e) {
          setVideo(itemVideo);
          setActualVideoUrl(itemVideo.url);
        }
      } else {
        setActualVideoUrl(itemVideo.url);
        setVideo(itemVideo);
      }
      setLoading(false);
    };
    
    loadVideo();
    return () => { c = true; };
  }, [actualItemId]);

  const handleBack = () => {
    if (sectionId && categoryId && itemId) {
      navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`);
    } else {
      navigate(`/subject/${subjectId}/chapter/${chapterId}/levels`);
    }
  };

  const skipVideo = (seconds) => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const newTime = Math.max(0, Math.min(currentTime + seconds, videoRef.current.duration || 0));
      videoRef.current.currentTime = newTime;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg md:text-xl lg:text-2xl text-dark-600 font-medium">جاري التحميل...</p>
      </div>
    );
  }

  if (!canAccessMedia) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleBack}
              className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
            >
              ← رجوع
            </button>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-xl text-gray-600">
                ليست لديك صلاحية لمشاهدة الفيديوهات في هذا التصنيف. تواصل مع المدير.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleBack}
              className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
            >
              ← رجوع
            </button>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-xl text-gray-600">{isArabicBrowser() ? 'لا يوجد فيديو متاح' : 'No video available'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
          >
            ← رجوع / Back
          </button>
          
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-dark-600 mb-4 text-center">
              {isArabicBrowser() 
                ? (video.title || item?.name || 'فيديو تعليمي')
                : (video.titleEn || item?.nameEn || 'Educational Video')}
            </h1>
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white font-medium">{isArabicBrowser() ? 'جاري تحميل الفيديو...' : 'Loading video...'}</p>
                </div>
              ) : actualVideoUrl && (actualVideoUrl.includes('youtube.com') || actualVideoUrl.includes('youtu.be')) ? (
                <iframe
                  src={actualVideoUrl.includes('embed') ? actualVideoUrl : `https://www.youtube.com/embed/${actualVideoUrl.split('/').pop().split('?')[0]}`}
                  title={video.title || 'فيديو تعليمي'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : actualVideoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={actualVideoUrl}
                    controls
                    className="w-full h-full"
                    autoPlay={false}
                    onEnded={recordWatch}
                  >
                    {isArabicBrowser() ? 'متصفحك لا يدعم تشغيل الفيديو' : 'Your browser does not support video playback'}
                  </video>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    <button
                      onClick={() => skipVideo(-10)}
                      className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition"
                      title={isArabicBrowser() ? 'رجوع 10 ثواني' : 'Rewind 10 seconds'}
                    >
                      ⏪ {isArabicBrowser() ? '10 ث' : '10s'}
                    </button>
                    <button
                      onClick={() => skipVideo(10)}
                      className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition"
                      title={isArabicBrowser() ? 'تقديم 10 ثواني' : 'Forward 10 seconds'}
                    >
                      ⏩ {isArabicBrowser() ? '10 ث' : '10s'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white font-medium">{isArabicBrowser() ? 'لا يوجد فيديو متاح' : 'No video available'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;


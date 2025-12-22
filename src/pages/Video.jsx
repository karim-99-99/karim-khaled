import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVideoByLevel, getItemById } from '../services/storageService';
import { getVideoFile } from '../services/videoStorage';
import Header from '../components/Header';
import { isArabicBrowser } from '../utils/language';

const Video = () => {
  const { sectionId, subjectId, categoryId, chapterId, itemId, levelId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [actualVideoUrl, setActualVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use itemId if available (new structure), otherwise use levelId (legacy)
  const actualItemId = itemId || levelId;
  const item = getItemById(actualItemId);

  useEffect(() => {
    const loadVideo = async () => {
      setLoading(true);
      const itemVideo = getVideoByLevel(actualItemId);
      
      if (!itemVideo) {
        setLoading(false);
        return;
      }
      
      if (itemVideo.isFileUpload && itemVideo.url.startsWith('indexeddb://')) {
        // Load video from IndexedDB
        try {
          const videoFile = await getVideoFile(actualItemId);
          if (videoFile && videoFile.url) {
            setActualVideoUrl(videoFile.url);
            setVideo({ ...itemVideo, url: videoFile.url });
          } else {
            setVideo(itemVideo);
          }
        } catch (error) {
          console.error('Error loading video file:', error);
          setVideo(itemVideo);
        }
      } else {
        setActualVideoUrl(itemVideo.url);
        setVideo(itemVideo);
      }
      setLoading(false);
    };
    
    loadVideo();
    
    // Cleanup blob URLs on unmount
    return () => {
      if (actualVideoUrl && actualVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(actualVideoUrl);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg md:text-xl lg:text-2xl text-dark-600 font-medium">جاري التحميل...</p>
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
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
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
                <video
                  src={actualVideoUrl}
                  controls
                  className="w-full h-full"
                  autoPlay={false}
                >
                  {isArabicBrowser() ? 'متصفحك لا يدعم تشغيل الفيديو' : 'Your browser does not support video playback'}
                </video>
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


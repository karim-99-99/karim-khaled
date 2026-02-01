import { useState, useEffect, useRef } from 'react';
import { getVideoFile } from '../services/videoStorage';
import { isArabicBrowser } from '../utils/language';
import { isBackendOn, recordVideoWatch } from '../services/backendApi';

const VideoModal = ({ isOpen, onClose, videoUrl, title = 'فيديو تعليمي', lessonId, videoId }) => {
  const [actualVideoUrl, setActualVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasRecordedRef = useRef(false);

  const recordWatch = () => {
    if (hasRecordedRef.current || !lessonId || !isBackendOn()) return;
    hasRecordedRef.current = true;
    recordVideoWatch(lessonId, videoId || null).catch(() => {});
  };

  useEffect(() => {
    if (isOpen) hasRecordedRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    const loadVideo = async () => {
      if (!videoUrl) {
        setActualVideoUrl(null);
        return;
      }

      // Check if it's an IndexedDB video
      if (videoUrl.startsWith('indexeddb://')) {
        setLoading(true);
        try {
          const levelId = videoUrl.replace('indexeddb://', '');
          const videoFile = await getVideoFile(levelId);
          if (videoFile && videoFile.url) {
            setActualVideoUrl(videoFile.url);
          } else {
            setActualVideoUrl(null);
          }
        } catch (error) {
          console.error('Error loading video from IndexedDB:', error);
          setActualVideoUrl(null);
        } finally {
          setLoading(false);
        }
      } else {
        setActualVideoUrl(videoUrl);
      }
    };

    if (isOpen) {
      loadVideo();
    } else {
      // Clean up blob URL when modal closes
      if (actualVideoUrl && actualVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(actualVideoUrl);
      }
      setActualVideoUrl(null);
    }

    // Cleanup on unmount
    return () => {
      if (actualVideoUrl && actualVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(actualVideoUrl);
      }
    };
  }, [videoUrl, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-lg shadow-xl border-t-4 border-primary-500">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-dark-600">{title}</h3>
          <button
            onClick={() => {
              if (!hasRecordedRef.current && lessonId) recordWatch();
              onClose();
            }}
            className="p-2 text-dark-600 hover:text-primary-500 hover:bg-gray-100 rounded-full transition text-2xl"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="aspect-video w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-dark-600 font-medium">{isArabicBrowser() ? 'جاري تحميل الفيديو...' : 'Loading video...'}</p>
              </div>
            ) : actualVideoUrl && (actualVideoUrl.includes('youtube.com') || actualVideoUrl.includes('youtu.be')) ? (
              <iframe
                src={actualVideoUrl.includes('embed') ? actualVideoUrl : `https://www.youtube.com/embed/${actualVideoUrl.split('/').pop().split('?')[0]}`}
                className="w-full h-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : actualVideoUrl ? (
              <video
                src={actualVideoUrl}
                controls
                className="w-full h-full rounded"
                autoPlay={false}
                onEnded={recordWatch}
              >
                {isArabicBrowser() ? 'متصفحك لا يدعم تشغيل الفيديو' : 'Your browser does not support video playback'}
              </video>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-dark-600 font-medium">{isArabicBrowser() ? 'لا يوجد فيديو متاح' : 'No video available'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;


import { useState, useEffect, useCallback } from "react";
import { getVideoFile } from "../services/videoStorage";
import { isArabicBrowser } from "../utils/language";
import {
  isEmbedVideoUrl,
  getEmbedVideoSrc,
  needsBunnySignedUrl,
  extractBunnyVideoId,
} from "../utils/videoUrl";
import {
  isBackendOn,
  recordVideoWatch,
  getBunnySignedUrl,
} from "../services/backendApi";
import { getCurrentUser } from "../services/storageService";
import VideoWatermark from "./VideoWatermark";

const VideoModal = ({
  isOpen,
  onClose,
  videoUrl,
  title = "فيديو تعليمي",
  lessonId,
  videoId,
}) => {
  const [actualVideoUrl, setActualVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bunnyError, setBunnyError] = useState(null);
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (isOpen && lessonId && isBackendOn()) {
      recordVideoWatch(lessonId, videoId || null).catch(() => {});
    }
  }, [isOpen, lessonId, videoId]);

  const fetchBunnyUrl = useCallback(async (rawUrl) => {
    setBunnyError(null);
    setLoading(true);
    try {
      const bunnyId = extractBunnyVideoId(rawUrl);
      const signed = await getBunnySignedUrl(bunnyId);
      setActualVideoUrl(signed);
    } catch {
      setBunnyError("تعذّر تحميل الفيديو. حاول مجدداً.");
      setActualVideoUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadVideo = async () => {
      if (!videoUrl) {
        setActualVideoUrl(null);
        return;
      }

      if (videoUrl.startsWith("indexeddb://")) {
        setLoading(true);
        try {
          const levelId = videoUrl.replace("indexeddb://", "");
          const videoFile = await getVideoFile(levelId);
          setActualVideoUrl(videoFile?.url || null);
        } catch {
          setActualVideoUrl(null);
        } finally {
          setLoading(false);
        }
      } else if (isBackendOn() && needsBunnySignedUrl(videoUrl)) {
        await fetchBunnyUrl(videoUrl);
      } else {
        setActualVideoUrl(videoUrl);
      }
    };

    if (isOpen) {
      loadVideo();
    } else {
      if (actualVideoUrl && actualVideoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(actualVideoUrl);
      }
      setActualVideoUrl(null);
      setBunnyError(null);
    }

    return () => {
      if (actualVideoUrl && actualVideoUrl.startsWith("blob:")) {
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
            onClick={onClose}
            className="p-2 text-dark-600 hover:text-primary-500 hover:bg-gray-100 rounded-full transition text-2xl"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="aspect-video w-full bg-black rounded" style={{ position: "relative" }}>
            {currentUser && !isAdmin && (
              <VideoWatermark
                name={`${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.username}
                email={currentUser.email}
              />
            )}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-white font-medium text-sm">
                  جاري تحضير الفيديو...
                </p>
              </div>
            ) : bunnyError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                <p className="text-red-400 font-medium text-center">{bunnyError}</p>
                <button
                  onClick={() => fetchBunnyUrl(videoUrl)}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : actualVideoUrl && isEmbedVideoUrl(actualVideoUrl) ? (
              <iframe
                src={getEmbedVideoSrc(actualVideoUrl) || actualVideoUrl}
                className="w-full h-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : actualVideoUrl ? (
              <video
                src={actualVideoUrl}
                controls
                className="w-full h-full rounded"
                autoPlay={false}
              >
                {isArabicBrowser()
                  ? "متصفحك لا يدعم تشغيل الفيديو"
                  : "Your browser does not support video playback"}
              </video>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-white font-medium">
                  {isArabicBrowser()
                    ? "لا يوجد فيديو متاح"
                    : "No video available"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getVideoByLevel,
  getItemById,
  getCurrentUser,
} from "../services/storageService";
import { getVideoFile } from "../services/videoStorage";
import Header from "../components/Header";
import { isArabicBrowser } from "../utils/language";
import {
  isEmbedVideoUrl,
  getEmbedVideoSrc,
  needsBunnySignedUrl,
  extractBunnyVideoId,
  formatBunnyLoadError,
  isBunnyEmbedUrl,
} from "../utils/videoUrl";
import { hasCategoryAccess } from "../components/ProtectedRoute";
import { isContentStaff } from "../utils/roles";
import VideoWatermark from "../components/VideoWatermark";
import {
  isBackendOn,
  isApiBaseConfigured,
  getStoredAuthToken,
  getVideoByLevel as getVideoByLevelApi,
  getItemById as getItemByIdApi,
  recordVideoWatch,
  getBunnySignedUrl,
  getBunnyHealth,
} from "../services/backendApi";

const Video = () => {
  const { sectionId, subjectId, categoryId, chapterId, itemId, levelId } =
    useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [actualVideoUrl, setActualVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bunnyLoading, setBunnyLoading] = useState(false);
  const [bunnyError, setBunnyError] = useState(null);
  const [bunnyNotConfigured, setBunnyNotConfigured] = useState(false);
  const [item, setItem] = useState(null);
  const videoRef = useRef(null);

  const actualItemId = itemId || levelId;
  const currentUser = getCurrentUser();
  const isAdmin = isContentStaff(currentUser);
  const categoryName = (categoryId || "").includes("تأسيس")
    ? "التأسيس"
    : "التجميعات";
  const canAccessMedia =
    isAdmin || (currentUser && hasCategoryAccess(currentUser, categoryName));

  useEffect(() => {
    let c = false;
    const loadVideo = async () => {
      setLoading(true);
      let itemVideo = null;
      if (isBackendOn()) {
        const [v, i] = await Promise.all([
          getVideoByLevelApi(actualItemId),
          getItemByIdApi(actualItemId),
        ]);
        itemVideo = v;
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

      if (
        !isBackendOn() &&
        itemVideo.isFileUpload &&
        itemVideo.url?.startsWith("indexeddb://")
      ) {
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
      } else if (needsBunnySignedUrl(itemVideo.url)) {
        // Bunny: يحتاج توقيعاً من الخادم — لا تمرّر UUID كـ <video src>
        setVideo(itemVideo);
        setBunnyError(null);
        setBunnyNotConfigured(false);

        if (!isApiBaseConfigured()) {
          if (!c) {
            setBunnyError(
              "فيديو Bunny يحتاج ربط الموقع بالخادم: أضف VITE_API_URL في Vercel (رابط Render بدون /api) ثم أعد نشر الموقع."
            );
          }
        } else {
          const health = await getBunnyHealth();
          if (health && !health.embed_ready) {
            if (!c) {
              setBunnyNotConfigured(true);
              setLoading(false);
            }
            return;
          }

          const bunnyId = extractBunnyVideoId(itemVideo.url);
          if (!bunnyId) {
            if (!c) setBunnyError("معرّف الفيديو (Bunny) غير صالح.");
          } else if (!getStoredAuthToken()) {
            if (!c) {
              setBunnyError(
                "يرجى تسجيل الدخول لتشغيل فيديوهات Bunny (الرابط الموقّع يصدر من الخادم فقط)."
              );
            }
          } else {
            setBunnyLoading(true);
            try {
              const signedUrl = await getBunnySignedUrl(bunnyId);
              if (!c) setActualVideoUrl(signedUrl);
            } catch (err) {
              if (!c) setBunnyError(formatBunnyLoadError(err));
            } finally {
              if (!c) setBunnyLoading(false);
            }
          }
        }
      } else {
        setActualVideoUrl(itemVideo.url);
        setVideo(itemVideo);
      }
      if (!c && actualItemId && isBackendOn() && canAccessMedia) {
        recordVideoWatch(actualItemId, itemVideo?.id).catch(() => {});
      }
      setLoading(false);
    };

    loadVideo();
    return () => {
      c = true;
    };
  }, [actualItemId]);

  const handleBack = () => {
    if (sectionId && categoryId && itemId) {
      navigate(
        `/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapter/${chapterId}/items`
      );
    } else {
      navigate(`/subject/${subjectId}/chapter/${chapterId}/levels`);
    }
  };

  const skipVideo = (seconds) => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const newTime = Math.max(
        0,
        Math.min(currentTime + seconds, videoRef.current.duration || 0)
      );
      videoRef.current.currentTime = newTime;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg md:text-xl lg:text-2xl text-dark-600 font-medium">
          جاري التحميل...
        </p>
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
                ليست لديك صلاحية لمشاهدة الفيديوهات في هذا التصنيف. تواصل مع
                المدير.
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
              <p className="text-xl text-gray-600">
                {isArabicBrowser()
                  ? "لا يوجد فيديو متاح"
                  : "No video available"}
              </p>
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
                ? video.title || item?.name || "فيديو تعليمي"
                : video.titleEn || item?.nameEn || "Educational Video"}
            </h1>

            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative" style={{ position: "relative" }}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white font-medium">
                    {isArabicBrowser()
                      ? "جاري تحميل الفيديو..."
                      : "Loading video..."}
                  </p>
                </div>
              ) : bunnyLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  <p className="text-white font-medium text-sm">
                    جاري تحضير الفيديو...
                  </p>
                </div>
              ) : bunnyNotConfigured ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <div className="text-5xl">🎬</div>
                  <p className="text-red-400 font-bold text-lg">
                    Bunny Stream غير مُضبوط على الخادم
                  </p>
                  <div className="bg-gray-800 rounded-lg p-4 text-right text-sm text-gray-300 max-w-md leading-7 space-y-1">
                    <p className="font-semibold text-white mb-2">لإصلاح الخطأ:</p>
                    <p>١. افتح <span className="font-mono text-yellow-300">backend/.env</span></p>
                    <p>٢. أضف القيم من لوحة <span className="text-yellow-300">Bunny Stream</span></p>
                    <p className="font-mono text-xs text-green-300 bg-gray-900 p-2 rounded mt-2 leading-6 whitespace-pre-wrap">{`BUNNY_LIBRARY_ID=رقم المكتبة\nBUNNY_SECURITY_KEY=مفتاح Token Auth`}</p>
                    <p className="text-gray-400 text-xs mt-2">
                      المفتاح من: Bunny Stream → المكتبة → Security → Token Authentication
                    </p>
                  </div>
                </div>
              ) : bunnyError ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                  <p className="text-red-400 font-medium text-center">{bunnyError}</p>
                  <button
                    onClick={() => {
                      setBunnyError(null);
                      setBunnyLoading(true);
                      const bunnyId = extractBunnyVideoId(video?.url);
                      getBunnySignedUrl(bunnyId)
                        .then((url) => {
                          setActualVideoUrl(url);
                          setBunnyLoading(false);
                        })
                        .catch((err) => {
                          setBunnyError(formatBunnyLoadError(err));
                          setBunnyLoading(false);
                        });
                    }}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : actualVideoUrl && isEmbedVideoUrl(actualVideoUrl) ? (
                <iframe
                  src={getEmbedVideoSrc(actualVideoUrl) || actualVideoUrl}
                  title={video.title || "فيديو تعليمي"}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="origin"
                />
              ) : actualVideoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={actualVideoUrl}
                    controls
                    className="w-full h-full"
                    autoPlay={false}
                  >
                    {isArabicBrowser()
                      ? "متصفحك لا يدعم تشغيل الفيديو"
                      : "Your browser does not support video playback"}
                  </video>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    <button
                      onClick={() => skipVideo(-10)}
                      className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition"
                      title={
                        isArabicBrowser()
                          ? "رجوع 10 ثواني"
                          : "Rewind 10 seconds"
                      }
                    >
                      ⏪ {isArabicBrowser() ? "10 ث" : "10s"}
                    </button>
                    <button
                      onClick={() => skipVideo(10)}
                      className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition"
                      title={
                        isArabicBrowser()
                          ? "تقديم 10 ثواني"
                          : "Forward 10 seconds"
                      }
                    >
                      ⏩ {isArabicBrowser() ? "10 ث" : "10s"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white font-medium">
                    {isArabicBrowser()
                      ? "لا يوجد فيديو متاح"
                      : "No video available"}
                  </p>
                </div>
              )}
              {/* Watermark: visible in screenshots/recordings — identifies the viewer */}
              {currentUser && !isAdmin && (
                <VideoWatermark
                  name={`${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.username}
                  email={currentUser.email}
                />
              )}
            </div>
            {actualVideoUrl && isBunnyEmbedUrl(actualVideoUrl) && (
              <p className="text-center text-sm text-gray-600 mt-2 px-2">
                <a
                  href={getEmbedVideoSrc(actualVideoUrl) || actualVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline font-medium"
                >
                  لا يعمل الفيديو أو يظهر 403؟ افتحه في نافذة جديدة
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;

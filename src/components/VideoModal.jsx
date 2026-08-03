import { useState, useEffect, useCallback, useRef } from "react";
import { getVideoFile } from "../services/videoStorage";
import { isArabicBrowser } from "../utils/language";
import {
  isEmbedVideoUrl,
  getEmbedVideoSrc,
  needsBunnySignedUrl,
  extractBunnyVideoId,
  formatBunnyLoadError,
  isBunnyEmbedUrl,
} from "../utils/videoUrl";
import {
  isBackendOn,
  isApiBaseConfigured,
  getStoredAuthToken,
  recordVideoWatch,
  getBunnySignedUrl,
} from "../services/backendApi";
import { getCurrentUser } from "../services/storageService";
import { isContentStaff } from "../utils/roles";
import VideoWatermark from "./VideoWatermark";

const PLAYERJS_SRC =
  "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";

function loadPlayerJs() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.playerjs?.Player) {
      resolve(window.playerjs);
      return;
    }
    const existing = document.querySelector(`script[src="${PLAYERJS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.playerjs));
      existing.addEventListener("error", () =>
        reject(new Error("Player.js load failed"))
      );
      return;
    }
    const s = document.createElement("script");
    s.src = PLAYERJS_SRC;
    s.async = true;
    s.onload = () => resolve(window.playerjs);
    s.onerror = () => reject(new Error("Player.js load failed"));
    document.body.appendChild(s);
  });
}

/** Append Bunny start-time query param without breaking existing query/token. */
function withBunnyStartTime(url, startSeconds) {
  if (!url || startSeconds == null || Number.isNaN(Number(startSeconds))) {
    return url;
  }
  const t = Math.max(0, Math.floor(Number(startSeconds)));
  try {
    const u = new URL(url);
    u.searchParams.set("t", `${t}s`);
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}t=${t}s`;
  }
}

const VideoModal = ({
  isOpen,
  onClose,
  videoUrl,
  title = "فيديو تعليمي",
  lessonId,
  videoId,
  bunnyLibraryId = null,
  startSeconds = null,
  endSeconds = null,
}) => {
  const [actualVideoUrl, setActualVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bunnyError, setBunnyError] = useState(null);
  const iframeRef = useRef(null);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const currentUser = getCurrentUser();
  const isAdmin = isContentStaff(currentUser);

  const start =
    startSeconds != null && startSeconds !== ""
      ? Math.max(0, Math.floor(Number(startSeconds)))
      : null;
  const end =
    endSeconds != null && endSeconds !== ""
      ? Math.max(0, Math.floor(Number(endSeconds)))
      : null;

  useEffect(() => {
    if (isOpen && lessonId && isBackendOn()) {
      recordVideoWatch(lessonId, videoId || null).catch(() => {});
    }
  }, [isOpen, lessonId, videoId]);

  const fetchBunnyUrl = useCallback(
    async (rawUrl) => {
      setBunnyError(null);
      setLoading(true);
      try {
        const bunnyId = extractBunnyVideoId(rawUrl);
        if (!bunnyId) {
          setBunnyError("معرّف الفيديو (Bunny) غير صالح.");
          setActualVideoUrl(null);
          return;
        }
        if (!getStoredAuthToken()) {
          setBunnyError(
            "يرجى تسجيل الدخول لتشغيل فيديوهات Bunny (الرابط الموقّع يصدر من الخادم فقط)."
          );
          setActualVideoUrl(null);
          return;
        }
        const signed = await getBunnySignedUrl(
          bunnyId,
          lessonId || null,
          bunnyLibraryId || null
        );
        setActualVideoUrl(withBunnyStartTime(signed, start));
      } catch (err) {
        setBunnyError(formatBunnyLoadError(err));
        setActualVideoUrl(null);
      } finally {
        setLoading(false);
      }
    },
    [lessonId, bunnyLibraryId, start]
  );

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
      } else if (needsBunnySignedUrl(videoUrl)) {
        if (!isApiBaseConfigured()) {
          setBunnyError(
            "فيديو Bunny يحتاج VITE_API_URL في Vercel ثم إعادة نشر الموقع."
          );
          setActualVideoUrl(null);
          setLoading(false);
        } else {
          await fetchBunnyUrl(videoUrl);
        }
      } else if (isBunnyEmbedUrl(videoUrl) || isEmbedVideoUrl(videoUrl)) {
        setActualVideoUrl(withBunnyStartTime(videoUrl, start));
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
      playerRef.current = null;
    }

    return () => {
      if (actualVideoUrl && actualVideoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(actualVideoUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on open/url/segment
  }, [videoUrl, isOpen, start, fetchBunnyUrl]);

  // Bunny iframe: Player.js seek + pause at end
  useEffect(() => {
    if (!isOpen || !actualVideoUrl || !isEmbedVideoUrl(actualVideoUrl)) return;
    let cancelled = false;
    let unsub = null;

    (async () => {
      try {
        const playerjs = await loadPlayerJs();
        if (cancelled || !iframeRef.current || !playerjs?.Player) return;
        const player = new playerjs.Player(iframeRef.current);
        playerRef.current = player;
        player.on("ready", () => {
          if (cancelled) return;
          if (start != null) {
            try {
              player.setCurrentTime(start);
            } catch {
              /* ignore */
            }
            try {
              player.play();
            } catch {
              /* ignore */
            }
          }
          if (end != null && end > (start ?? 0)) {
            const onTime = () => {
              player.getCurrentTime((t) => {
                if (typeof t === "number" && t >= end) {
                  try {
                    player.pause();
                  } catch {
                    /* ignore */
                  }
                }
              });
            };
            player.on("timeupdate", onTime);
            unsub = () => {
              try {
                player.off("timeupdate", onTime);
              } catch {
                /* ignore */
              }
            };
          }
        });
      } catch {
        /* Player.js optional — URL t= still applies */
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
      playerRef.current = null;
    };
  }, [isOpen, actualVideoUrl, start, end]);

  // Native <video>: seek + pause at end
  useEffect(() => {
    const el = videoRef.current;
    if (!isOpen || !el || !actualVideoUrl || isEmbedVideoUrl(actualVideoUrl)) {
      return;
    }
    const onMeta = () => {
      if (start != null) {
        try {
          el.currentTime = start;
        } catch {
          /* ignore */
        }
      }
    };
    const onTime = () => {
      if (end != null && el.currentTime >= end) {
        el.pause();
      }
    };
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    if (el.readyState >= 1) onMeta();
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
    };
  }, [isOpen, actualVideoUrl, start, end]);

  if (!isOpen) return null;

  const embedSrc = actualVideoUrl
    ? withBunnyStartTime(
        getEmbedVideoSrc(actualVideoUrl) || actualVideoUrl,
        start
      )
    : null;

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
          {start != null && (
            <p className="text-sm text-gray-600 mb-2 text-center">
              {isArabicBrowser()
                ? `شرح السؤال من الثانية ${start}${
                    end != null ? ` إلى ${end}` : ""
                  }`
                : `Explanation from ${start}s${
                    end != null ? ` to ${end}s` : ""
                  }`}
            </p>
          )}
          <div
            className="aspect-video w-full bg-black rounded"
            style={{ position: "relative" }}
          >
            {currentUser && !isAdmin && (
              <VideoWatermark
                name={`${currentUser.firstName || ""} ${
                  currentUser.lastName || ""
                }`.trim() || currentUser.username}
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
                <p className="text-red-400 font-medium text-center">
                  {bunnyError}
                </p>
                <button
                  onClick={() => fetchBunnyUrl(videoUrl)}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : actualVideoUrl && isEmbedVideoUrl(actualVideoUrl) ? (
              <iframe
                key={`bunny-${start ?? "full"}-${end ?? "x"}`}
                ref={iframeRef}
                src={embedSrc || actualVideoUrl}
                className="w-full h-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="origin"
              />
            ) : actualVideoUrl ? (
              <video
                key={`html5-${start ?? "full"}-${end ?? "x"}`}
                ref={videoRef}
                src={actualVideoUrl}
                controls
                className="w-full h-full rounded"
                autoPlay={start != null}
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
          {actualVideoUrl && isBunnyEmbedUrl(actualVideoUrl) && (
            <p className="text-center text-sm text-gray-600 mt-2">
              <a
                href={embedSrc || actualVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline font-medium"
              >
                لا يعمل الفيديو؟ افتحه في نافذة جديدة
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoModal;

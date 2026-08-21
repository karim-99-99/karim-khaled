import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MathRenderer from "../components/MathRenderer";
import {
  getPublicTryFreeLesson,
  getPublicTryFreeBunnySignedUrl,
} from "../services/backendApi";
import {
  extractBunnyVideoId,
  getEmbedVideoSrc,
  isEmbedVideoUrl,
  needsBunnySignedUrl,
} from "../utils/videoUrl";

const CHOICE_AR = { a: "أ", b: "ب", c: "ج", d: "د" };

function flattenQuestions(raw) {
  const out = [];
  for (const q of raw || []) {
    const type = q.type || q.question_type;
    if (type === "passage") {
      const pqList = Array.isArray(q.questions)
        ? q.questions
        : q.passage_questions || [];
      const passageText = (q.passageText || q.passage_text || "").trim();
      pqList.forEach((pq, idx) => {
        if (!pq || typeof pq !== "object") return;
        const subHtml = (pq.question || "").trim();
        const combined = passageText
          ? `<div class="mb-4">${passageText}</div><div class="font-semibold mb-2">السؤال ${idx + 1}:</div><div>${subHtml}</div>`
          : subHtml;
        out.push({
          id: pq.id || `passage_${q.id}_${idx}`,
          question: combined,
          image: null,
          answers: Array.isArray(pq.answers) ? pq.answers : [],
          explanation: pq.explanation || null,
        });
      });
      continue;
    }
    out.push({
      id: q.id,
      question: q.question,
      image: q.question_image_url || q.image || null,
      answers: Array.isArray(q.answers) ? q.answers : [],
      explanation: q.explanation || null,
    });
  }
  return out;
}

function answerId(ans) {
  return String(ans?.answer_id || ans?.id || "").toLowerCase();
}

const TryFreeLesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lesson, setLesson] = useState(null);
  const [videos, setVideos] = useState([]);
  const [files, setFiles] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [tab, setTab] = useState("video");
  const [playUrl, setPlayUrl] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState({});
  const [showScore, setShowScore] = useState(false);

  const quiz = useMemo(() => flattenQuestions(questions), [questions]);
  const current = quiz[qIndex] || null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getPublicTryFreeLesson(lessonId)
      .then((data) => {
        if (cancelled) return;
        setLesson(data?.lesson || null);
        setVideos(Array.isArray(data?.videos) ? data.videos : []);
        setFiles(Array.isArray(data?.files) ? data.files : []);
        setQuestions(Array.isArray(data?.questions) ? data.questions : []);
        const firstVideo = (data?.videos || [])[0];
        if (firstVideo) setTab("video");
        else if ((data?.questions || []).length) setTab("quiz");
        else if ((data?.files || []).length) setTab("files");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "تعذر فتح الدرس.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const video = videos[0] || null;

  useEffect(() => {
    let cancelled = false;
    const raw =
      video?.video_url || video?.video_file_url || video?.video_file || "";
    if (!raw) {
      setPlayUrl("");
      return;
    }
    if (!needsBunnySignedUrl(raw)) {
      setPlayUrl(raw);
      return;
    }
    const bunnyId = extractBunnyVideoId(raw);
    if (!bunnyId) {
      setPlayUrl(raw);
      return;
    }
    setVideoBusy(true);
    setVideoError("");
    getPublicTryFreeBunnySignedUrl(
      bunnyId,
      lessonId,
      video?.bunny_library_id || null
    )
      .then((url) => {
        if (!cancelled) setPlayUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setVideoError(err.message || "تعذر تشغيل الفيديو.");
      })
      .finally(() => {
        if (!cancelled) setVideoBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [video, lessonId]);

  const correctCount = quiz.filter((q) => {
    const selected = picked[q.id];
    const right = (q.answers || []).find((a) => a.is_correct || a.isCorrect);
    return selected && right && answerId(right) === String(selected).toLowerCase();
  }).length;

  const selectAnswer = (id) => {
    if (!current || showScore) return;
    setPicked((prev) => ({ ...prev, [current.id]: id }));
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <button
          type="button"
          onClick={() => navigate("/try-free")}
          className="text-primary-600 font-bold mb-4"
        >
          ← رجوع للدروس المجانية
        </button>

        {loading && <p className="text-center text-gray-500 py-16">جاري التحميل…</p>}
        {error && !loading && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-center">
            {error}
          </div>
        )}

        {!loading && lesson && (
          <>
            <h1 className="text-2xl md:text-3xl font-black text-dark-700 mb-6 text-center">
              {lesson.name}
            </h1>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {video && (
                <button
                  type="button"
                  onClick={() => setTab("video")}
                  className={`px-4 py-2 rounded-full font-bold ${
                    tab === "video"
                      ? "bg-red-500 text-white"
                      : "bg-white border text-dark-600"
                  }`}
                >
                  الفيديو
                </button>
              )}
              {quiz.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab("quiz")}
                  className={`px-4 py-2 rounded-full font-bold ${
                    tab === "quiz"
                      ? "bg-orange-500 text-white"
                      : "bg-white border text-dark-600"
                  }`}
                >
                  الاختبار
                </button>
              )}
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab("files")}
                  className={`px-4 py-2 rounded-full font-bold ${
                    tab === "files"
                      ? "bg-blue-500 text-white"
                      : "bg-white border text-dark-600"
                  }`}
                >
                  الملفات
                </button>
              )}
            </div>

            {tab === "video" && (
              <div className="bg-white rounded-2xl shadow p-4 md:p-6">
                {!video && (
                  <p className="text-center text-gray-500 py-10">لا يوجد فيديو بعد.</p>
                )}
                {video && (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
                    {videoBusy ? (
                      <div className="flex items-center justify-center h-full text-white">
                        جاري تحضير الفيديو…
                      </div>
                    ) : videoError ? (
                      <div className="flex items-center justify-center h-full text-red-300 px-4 text-center">
                        {videoError}
                      </div>
                    ) : playUrl && isEmbedVideoUrl(playUrl) ? (
                      <iframe
                        src={getEmbedVideoSrc(playUrl) || playUrl}
                        title={video.title || lesson.name}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : playUrl ? (
                      <video src={playUrl} controls className="w-full h-full" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-white">
                        لا يمكن تشغيل هذا الفيديو.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === "quiz" && (
              <div className="bg-white rounded-2xl shadow p-5 md:p-8">
                {quiz.length === 0 && (
                  <p className="text-center text-gray-500">لا توجد أسئلة بعد.</p>
                )}
                {quiz.length > 0 && showScore && (
                  <div className="text-center space-y-4">
                    <p className="text-3xl font-black text-primary-600">
                      {correctCount} / {quiz.length}
                    </p>
                    <p className="text-dark-600">نتيجتك في هذا الدرس التجريبي</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        className="px-5 py-2 rounded-full bg-gray-100 font-bold"
                        onClick={() => {
                          setShowScore(false);
                          setQIndex(0);
                          setPicked({});
                        }}
                      >
                        إعادة المحاولة
                      </button>
                      <Link
                        to="/register"
                        className="px-5 py-2 rounded-full bg-primary-500 text-white font-bold"
                      >
                        سجّل حسابك لباقي الدروس
                      </Link>
                    </div>
                  </div>
                )}
                {quiz.length > 0 && !showScore && current && (
                  <>
                    <p className="text-sm text-gray-500 mb-3">
                      سؤال {qIndex + 1} من {quiz.length}
                    </p>
                    <div className="prose max-w-none mb-4 text-right">
                      <MathRenderer content={current.question || ""} />
                    </div>
                    {current.image && (
                      <img
                        src={current.image}
                        alt=""
                        className="max-h-64 mx-auto mb-4 rounded-lg"
                      />
                    )}
                    <div className="space-y-2">
                      {(current.answers || []).map((ans) => {
                        const id = answerId(ans);
                        const selected = String(picked[current.id] || "") === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => selectAnswer(id)}
                            className={`w-full text-right rounded-xl border px-4 py-3 ${
                              selected
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <span className="font-black text-primary-600 ml-2">
                              {CHOICE_AR[id] || id}
                            </span>
                            <MathRenderer content={ans.text || ""} />
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-6">
                      <button
                        type="button"
                        disabled={qIndex === 0}
                        onClick={() => setQIndex((i) => Math.max(0, i - 1))}
                        className="px-4 py-2 rounded-full bg-gray-100 font-bold disabled:opacity-40"
                      >
                        السابق
                      </button>
                      {qIndex < quiz.length - 1 ? (
                        <button
                          type="button"
                          disabled={!picked[current.id]}
                          onClick={() => setQIndex((i) => i + 1)}
                          className="px-4 py-2 rounded-full bg-primary-500 text-white font-bold disabled:opacity-40"
                        >
                          التالي
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!picked[current.id]}
                          onClick={() => setShowScore(true)}
                          className="px-4 py-2 rounded-full bg-green-600 text-white font-bold disabled:opacity-40"
                        >
                          إنهاء الاختبار
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "files" && (
              <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                {files.length === 0 && (
                  <p className="text-center text-gray-500">لا توجد ملفات.</p>
                )}
                {files.map((file) => {
                  const url = file.file_url || file.file || "";
                  return (
                    <a
                      key={file.id}
                      href={url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border px-4 py-3 hover:bg-gray-50 font-bold text-dark-700"
                    >
                      {file.title || "ملف مرفق"}
                    </a>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TryFreeLesson;

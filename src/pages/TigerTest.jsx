import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/storageService";
import * as backendApi from "../services/backendApi";
import MathRenderer from "../components/MathRenderer";
import VideoModal from "../components/VideoModal";
import QuestionVideoLink from "../components/QuestionVideoLink";
import logoimage from "../assets/karim.png";
import "./TigerTest.css";

const CHOICE_AR = { a: "أ", b: "ب", c: "ج", d: "د" };
const SECTION_NAMES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"];

function reviewItemStatus(item) {
  if (item?.is_correct) return "correct";
  if (item?.skipped) return "skipped";
  return "wrong";
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function formatAttemptDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function scoreNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function nextSectionPrompt(currentSection, sectionCount) {
  if (currentSection >= sectionCount) return null;
  const name = SECTION_NAMES[currentSection] || `${currentSection + 1}`;
  return `هل مستعد للدخول في القسم ${name}؟`;
}

/** Strip leading أ/ب/ج/د or 1. 2. from answer HTML — keep the answer text only. */
function stripAnswerChoicePrefix(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(
    /^((?:\s|<[^>]+>|&nbsp;)*)[(]?[أاببججددA-Da-d1-4١٢٣٤][)\]]?(?:[\s]*[.)\-–:：،,])+[\s]*/,
    "$1"
  );
}

/** Merge a light API patch without dropping loaded questions. */
function applySessionPatch(prev, patch) {
  if (!patch) return prev;
  if (!prev) return patch;
  const next = { ...prev, ...patch };
  if (!patch.current_section_questions) {
    next.current_section_questions = prev.current_section_questions;
  }
  if (!patch.sections) {
    next.sections = prev.sections;
  }
  if (!patch.pool_warnings) {
    next.pool_warnings = prev.pool_warnings;
  }
  if (!patch.results && prev.results) {
    next.results = prev.results;
  }
  if (!patch.review && prev.review) {
    next.review = prev.review;
  }
  if (prev.status === "in_section" && (patch.status || prev.status) === "in_section") {
    next.section_time_remaining = prev.section_time_remaining;
  }
  return next;
}

function sectionQuestionsOf(session) {
  if (!session) return [];
  if (Array.isArray(session.current_section_questions)) {
    return session.current_section_questions;
  }
  const idx = Math.max(0, (session.current_section || 1) - 1);
  return session.sections?.[idx] || [];
}

const QuestionGrid = memo(function QuestionGrid({
  questions,
  currentQIndex,
  answers,
  seen,
  reviewIds,
  farthestIndex,
  onSelect,
}) {
  const reviewSet = new Set(reviewIds || []);
  return (
    <div className="tiger-test-grid" aria-label="أرقام الأسئلة">
      {questions.map((q, i) => {
        const answered = Boolean(answers[q.id]);
        const inReview = reviewSet.has(q.id);
        const isFarthest = i === farthestIndex;
        const leftUnanswered =
          !answered && i !== currentQIndex && seen.includes(q.id);
        let cls = "tiger-test-grid-cell";
        if (i === currentQIndex) cls += " current";
        else if (answered) cls += " answered";
        else if (inReview) cls += " review";
        else if (leftUnanswered) cls += " unanswered";
        const clickable =
          answered || i === currentQIndex || inReview || isFarthest;
        if (!clickable) cls += " locked";
        return (
          <button
            key={q.id}
            type="button"
            className={cls}
            disabled={!clickable}
            onClick={() => {
              if (clickable) onSelect(i);
            }}
            title={
              i === currentQIndex
                ? `السؤال الحالي ${i + 1}`
                : answered
                  ? `السؤال ${i + 1}`
                  : inReview
                    ? `سؤال للمراجعة ${i + 1}`
                    : isFarthest
                      ? `السؤال الذي كنت عليه ${i + 1}`
                      : `لا يمكن الانتقال إلى السؤال ${i + 1} قبل الإجابة`
            }
          >
            {inReview ? (
              <span className="tiger-test-grid-star" aria-hidden="true">
                ★
              </span>
            ) : null}
            {i + 1}
          </button>
        );
      })}
    </div>
  );
});

function SectionTimer({ sessionId, initialSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const remainingRef = useRef(initialSeconds);
  const expireRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.max(0, remainingRef.current - 1);
      remainingRef.current = next;
      setRemaining(next);
      if (next === 0 && !expireRef.current) {
        expireRef.current = true;
        onExpireRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      backendApi
        .syncTigerTestSession(sessionId, {
          section_time_remaining: remainingRef.current,
        })
        .catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, [sessionId]);

  return (
    <div className="tiger-test-timer-box">
      <div className="tiger-test-timer-label">الوقت المتبقي</div>
      <div className="tiger-test-timer-digits">{formatTime(remaining)}</div>
    </div>
  );
}

const TigerTest = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [menuScreen, setMenuScreen] = useState("hub");
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [hasActive, setHasActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openingAttempt, setOpeningAttempt] = useState(false);
  const [fontSize, setFontSize] = useState("md");
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);
  const [showPoolWarnings, setShowPoolWarnings] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [navHint, setNavHint] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("wrong");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [videoPlayer, setVideoPlayer] = useState(null);
  const endingRef = useRef(false);
  const seenRef = useRef([]);
  const seenFlushRef = useRef(null);
  const farthestRef = useRef(0);
  const [farthestIndex, setFarthestIndex] = useState(0);
  const activeSessionRef = useRef(null);

  const sectionCount = session?.section_count || 5;
  const sectionIndex = Math.max(
    0,
    Math.min((session?.current_section || 1) - 1, Math.max(0, sectionCount - 1))
  );

  const sectionQuestions = useMemo(
    () => sectionQuestionsOf(session),
    [session]
  );

  const currentQIndex = Math.min(
    session?.current_question_index ?? 0,
    Math.max(0, sectionQuestions.length - 1)
  );
  const currentQuestion = sectionQuestions[currentQIndex] || null;

  const answers = session?.answers || {};
  const bookmarked = session?.bookmarked || [];
  const deferred = session?.deferred || [];
  const seen = session?.seen || [];

  const answeredInSection = useMemo(
    () => sectionQuestions.filter((q) => answers[q.id]).length,
    [sectionQuestions, answers]
  );

  const flushSeen = useCallback((sessionId, seenList) => {
    if (!sessionId || !seenList?.length) return;
    backendApi
      .syncTigerTestSession(sessionId, { seen: seenList })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.token) {
      navigate("/login", { replace: true });
      return;
    }
    if (!backendApi.isApiBaseConfigured()) {
      setError("الخادم غير متصل. تأكد من إعداد VITE_API_URL.");
      setLoading(false);
      return;
    }
    backendApi
      .getTigerTestActive()
      .then((active) => {
        if (active) {
          activeSessionRef.current = active;
          setHasActive(true);
          setSession(active);
          seenRef.current = Array.isArray(active.seen) ? active.seen : [];
          const qs = sectionQuestionsOf(active);
          const idx = active.current_question_index ?? 0;
          const q = qs[idx];
          setSelectedAnswer(q ? active.answers?.[q.id] || null : null);
        }
        setMenuScreen("hub");
        setShowReadyModal(false);
      })
      .catch((err) => setError(err.message || "فشل تحميل الاختبار"))
      .finally(() => setLoading(false));
  }, [user?.token, navigate]);

  useEffect(() => {
    if (session?.status !== "completed" || !session?.id) return;
    if (Array.isArray(session.review)) return;
    let cancelled = false;
    setReviewLoading(true);
    backendApi
      .getTigerTestResults(session.id)
      .then((data) => {
        if (cancelled) return;
        const next = data?.session;
        if (next) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  ...next,
                  results: next.results || prev.results,
                  review: next.review || [],
                }
              : next
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.status, session?.review]);

  useEffect(() => {
    if (!currentQuestion || !session?.id || session.status !== "in_section") {
      return;
    }
    setSelectedAnswer(answers[currentQuestion.id] || null);
    if (!seenRef.current.includes(currentQuestion.id)) {
      seenRef.current = [...seenRef.current, currentQuestion.id];
      setSession((prev) =>
        prev ? { ...prev, seen: seenRef.current } : prev
      );
      if (seenFlushRef.current) clearTimeout(seenFlushRef.current);
      seenFlushRef.current = setTimeout(() => {
        flushSeen(session.id, seenRef.current);
      }, 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, session?.id, session?.status]);

  useEffect(() => {
    farthestRef.current = session?.current_question_index ?? 0;
    setFarthestIndex(farthestRef.current);
  }, [session?.id, session?.current_section]);

  useEffect(() => {
    if (currentQIndex > farthestRef.current) {
      farthestRef.current = currentQIndex;
      setFarthestIndex(currentQIndex);
    }
  }, [currentQIndex]);

  useEffect(() => {
    return () => {
      if (seenFlushRef.current) clearTimeout(seenFlushRef.current);
      if (session?.id) flushSeen(session.id, seenRef.current);
    };
  }, [session?.id, flushSeen]);

  const applyEndedSession = (s) => {
    if (!s) return;
    setSession(s);
    if (s.status === "between_sections" || s.status === "completed") {
      setShowPoolWarnings(false);
    }
    if (s.status === "completed") {
      activeSessionRef.current = null;
      setHasActive(false);
      setMenuScreen(null);
    }
  };

  const finishCurrentSection = async () => {
    if (!session?.id || endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    setError("");
    const prev = session;
    const isLast = (session.current_section || 1) >= sectionCount;
    if (!isLast) {
      setSession({
        ...session,
        status: "between_sections",
        current_section_questions: [],
      });
    }
    try {
      const s = await backendApi.endTigerTestSection(session.id);
      if (s) applyEndedSession(s);
      else if (isLast) setError("لم يتم إنهاء القسم. حاول مرة أخرى.");
    } catch (err) {
      setSession(prev);
      setError(err.message || "فشل إنهاء القسم");
    } finally {
      endingRef.current = false;
      setEnding(false);
    }
  };

  const handleExpireSection = useCallback(async () => {
    await finishCurrentSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, sectionCount]);

  const applyStartedSession = (s) => {
    activeSessionRef.current = s;
    setSession(s);
    seenRef.current = Array.isArray(s.seen) ? s.seen : [];
    setHasActive(true);
    setMenuScreen(null);
    setShowReadyModal(false);
    setShowReview(false);
    setReviewIndex(0);
    setSelectedAnswer(null);
    if (Array.isArray(s.pool_warnings) && s.pool_warnings.length > 0) {
      setShowPoolWarnings(true);
    }
  };

  const goToHub = () => {
    setShowReview(false);
    setShowReadyModal(false);
    setShowPoolWarnings(false);
    setError("");
    setMenuScreen("hub");
    const active = activeSessionRef.current;
    if (active && active.status !== "completed") {
      setSession(active);
      setHasActive(true);
    } else {
      activeSessionRef.current = null;
      setHasActive(false);
      setSession(null);
    }
  };

  const openStartFromHub = () => {
    setError("");
    const active = activeSessionRef.current;
    if (active && active.status !== "completed") {
      setSession(active);
      setHasActive(true);
    }
    setShowReadyModal(true);
  };

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    setError("");
    backendApi
      .getTigerTestHistory()
      .then((attempts) => setHistory(attempts))
      .catch((err) => setError(err.message || "فشل تحميل الاختبارات السابقة"))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (menuScreen !== "history") return;
    loadHistory();
  }, [menuScreen, loadHistory]);

  const openPastAttempt = async (attemptId) => {
    if (!attemptId || openingAttempt) return;
    setOpeningAttempt(true);
    setError("");
    try {
      const s = await backendApi.getTigerTestSession(attemptId);
      if (!s || s.status !== "completed") {
        setError("تعذر فتح هذا الاختبار.");
        return;
      }
      setSession(s);
      setShowReview(false);
      setReviewIndex(0);
      setShowReadyModal(false);
      setMenuScreen(null);
    } catch (err) {
      setError(err.message || "تعذر فتح الاختبار السابق");
    } finally {
      setOpeningAttempt(false);
    }
  };

  const handleResume = () => {
    if (!session) return;
    setMenuScreen(null);
    setShowReadyModal(false);
  };

  const handleStart = async (force = false) => {
    setStarting(true);
    setError("");
    try {
      backendApi.pingHealth();
      const s = await backendApi.startTigerTest({ force });
      if (s) applyStartedSession(s);
    } catch (err) {
      setError(err.message || "فشل بدء الاختبار");
      setShowReadyModal(true);
    } finally {
      setStarting(false);
    }
  };

  const formatPoolWarning = (w) => {
    if (w.demo_added > 0 || w.subject === "demo") {
      return `تم إكمال الاختبار بأسئلة تجريبية (${w.demo_added || 0} سؤالاً) ليصبح 5 أقسام × 24 سؤالاً (13 لفظي + 11 كمي).`;
    }
    const label =
      w.subject_label || (w.subject === "verbal" ? "اللفظي" : "الكمي");
    const required = w.required ?? 0;
    const actual = w.actual ?? 0;
    if (w.borrowed_from_other > 0) {
      return `قسم ${label} لا يحتوي على العدد الكامل من الأسئلة المطلوبة (${required}). تم استخدام ${actual} سؤالاً، منها ${w.borrowed_from_other} سؤالاً عشوائياً من ملف آخر في البنوك.`;
    }
    return `قسم ${label} لا يحتوي على العدد الكامل من الأسئلة المطلوبة (${required}). تم استخدام ${actual} سؤالاً فقط.`;
  };

  const isInReview = (questionId) => {
    if (!questionId) return false;
    return bookmarked.includes(questionId) || deferred.includes(questionId);
  };

  const canLeaveCurrent = () => {
    if (!currentQuestion) return false;
    const id = currentQuestion.id;
    const hasAnswer = Boolean(selectedAnswer || answers[id]);
    return hasAnswer || isInReview(id);
  };

  const handleSelectAnswer = async (answerId) => {
    if (!session || !currentQuestion) return;
    setNavHint("");
    setSelectedAnswer(answerId);
    setSession((prev) =>
      prev
        ? {
            ...prev,
            answers: { ...prev.answers, [currentQuestion.id]: answerId },
          }
        : prev
    );
    try {
      const s = await backendApi.saveTigerTestAnswer(session.id, {
        slot_id: currentQuestion.id,
        answer_id: answerId,
      });
      if (s) setSession((prev) => applySessionPatch(prev, s));
    } catch {
      /* keep local selection */
    }
  };

  const handleBookmark = async (checked) => {
    if (!session || !currentQuestion) return;
    setNavHint("");
    const id = currentQuestion.id;
    setSession((prev) => {
      if (!prev) return prev;
      const bm = new Set(prev.bookmarked || []);
      const df = new Set(prev.deferred || []);
      if (checked) {
        bm.add(id);
        df.add(id);
      } else {
        bm.delete(id);
        df.delete(id);
      }
      return { ...prev, bookmarked: [...bm], deferred: [...df] };
    });
    try {
      const s = await backendApi.saveTigerTestAnswer(session.id, {
        slot_id: id,
        answer_id: selectedAnswer || answers[id] || undefined,
        bookmarked: checked,
        deferred: checked,
      });
      if (s) setSession((prev) => applySessionPatch(prev, s));
    } catch {
      /* ignore */
    }
  };

  const goToQuestion = useCallback(
    (index, options = {}) => {
      if (!session) return;
      const safe = Math.max(0, Math.min(index, sectionQuestions.length - 1));
      const q = sectionQuestions[safe];
      if (!q) return;
      const allowUnanswered = Boolean(options.allowUnanswered);
      const inReview =
        (session.bookmarked || []).includes(q.id) ||
        (session.deferred || []).includes(q.id);
      const reachable =
        allowUnanswered ||
        safe === currentQIndex ||
        Boolean(answers[q.id]) ||
        inReview ||
        safe === farthestRef.current;
      if (safe !== currentQIndex && !reachable) {
        return;
      }
      setNavHint("");
      setSession((prev) =>
        prev ? { ...prev, current_question_index: safe } : prev
      );
      setSelectedAnswer(q ? answers[q.id] || null : null);
      backendApi
        .syncTigerTestSession(session.id, { current_question_index: safe })
        .catch(() => {});
    },
    [session, sectionQuestions, answers, currentQIndex]
  );

  const handlePrev = () => {
    if (currentQIndex <= 0) return;
    for (let i = currentQIndex - 1; i >= 0; i -= 1) {
      const q = sectionQuestions[i];
      if (!q) continue;
      if (answers[q.id] || isInReview(q.id) || i === farthestRef.current) {
        goToQuestion(i);
        return;
      }
    }
  };

  const handleSaveNext = async () => {
    if (!session || !currentQuestion || ending) return;
    if (!canLeaveCurrent()) {
      setNavHint(
        "أجب عن السؤال أو أضفه للمراجعة ثم اضغط حفظ والتالي للانتقال"
      );
      return;
    }
    if (currentQIndex < sectionQuestions.length - 1) {
      goToQuestion(currentQIndex + 1, { allowUnanswered: true });
      return;
    }
    setNavHint(
      "هذا آخر سؤال في القسم. يمكنك مراجعة الأسئلة، ثم إنهاء القسم من الزر الجانبي أو انتظار انتهاء الوقت."
    );
  };

  const handleEndSection = () => {
    if (!session || ending) return;
    setShowEndConfirm(true);
  };

  const handleNextSection = async () => {
    if (!session || ending) return;
    setEnding(true);
    setError("");
    try {
      const s = await backendApi.nextTigerTestSection(session.id);
      if (s) {
        setSession(s);
        seenRef.current = Array.isArray(s.seen) ? s.seen : seenRef.current;
        setSelectedAnswer(null);
      }
    } catch (err) {
      setError(err.message || "فشل بدء القسم التالي");
    } finally {
      setEnding(false);
    }
  };

  const fontClass =
    fontSize === "sm" ? "font-sm" : fontSize === "lg" ? "font-lg" : "";

  if (loading) {
    return (
      <div className="tiger-test-root" dir="rtl">
        <div className="tiger-test-loading">جاري التحميل…</div>
      </div>
    );
  }

  if (menuScreen === "hub" || menuScreen === "history") {
    return (
      <div className="tiger-test-root" dir="rtl">
        <div className="tiger-test-header">
          <span>اختبار النمر</span>
          <span>محاكي اختبار النمر (بدايتي)</span>
        </div>
        {error && (
          <div className="tiger-test-error-banner" role="alert">
            {error}
          </div>
        )}
        {menuScreen === "hub" ? (
          <div className="tiger-test-hub">
            <h2>اختر ما تريد</h2>
            <p className="tiger-test-hub-lead">
              ابدأ اختبار النمر الآن، أو راجع نتائج اختباراتك السابقة.
            </p>
            {hasActive && (
              <p className="tiger-test-hub-note">
                لديك اختبار قيد التنفيذ. يمكنك متابعته من «ابدأ اختبار النمر».
              </p>
            )}
            <div className="tiger-test-hub-cards">
              <button
                type="button"
                className="tiger-test-hub-card"
                onClick={openStartFromHub}
              >
                <span className="tiger-test-hub-card-title">
                  ابدأ اختبار النمر
                </span>
                <span className="tiger-test-hub-card-text">
                  5 أقسام × 24 سؤالاً، ومدة كل قسم 24 دقيقة.
                </span>
              </button>
              <button
                type="button"
                className="tiger-test-hub-card"
                onClick={() => setMenuScreen("history")}
              >
                <span className="tiger-test-hub-card-title">
                  مراجعة اختباراتك السابقة
                </span>
                <span className="tiger-test-hub-card-text">
                  شاهد درجاتك اللفظية والكمية والنتيجة النهائية.
                </span>
              </button>
            </div>
            <button
              type="button"
              className="tiger-test-modal-btn secondary"
              onClick={() => navigate("/courses")}
            >
              العودة للدورات
            </button>
          </div>
        ) : (
          <div className="tiger-test-history">
            <div className="tiger-test-history-head">
              <h2>اختباراتك السابقة</h2>
              <button
                type="button"
                className="tiger-test-modal-btn secondary"
                onClick={goToHub}
              >
                رجوع
              </button>
            </div>
            {historyLoading ? (
              <div className="tiger-test-loading">جاري تحميل النتائج…</div>
            ) : history.length === 0 ? (
              <p className="tiger-test-history-empty">
                لا توجد اختبارات مكتملة بعد. ابدأ اختبار النمر أولاً.
              </p>
            ) : (
              <div className="tiger-test-history-list">
                {history.map((attempt, index) => (
                  <button
                    key={attempt.id}
                    type="button"
                    className="tiger-test-history-item"
                    disabled={openingAttempt}
                    onClick={() => openPastAttempt(attempt.id)}
                  >
                    <div className="tiger-test-history-item-top">
                      <strong>اختبار {history.length - index}</strong>
                      <span>
                        {formatAttemptDate(
                          attempt.completed_at || attempt.created_at
                        )}
                      </span>
                    </div>
                    <div className="tiger-test-history-scores">
                      <span>
                        لفظي{" "}
                        <b>{scoreNumber(attempt.verbal_percentage)}</b>
                      </span>
                      <span>
                        كمي{" "}
                        <b>{scoreNumber(attempt.quant_percentage)}</b>
                      </span>
                      <span className="tiger-test-history-final">
                        النهائي{" "}
                        <b>{scoreNumber(attempt.final_percentage)}</b>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {openingAttempt && (
              <p className="tiger-test-history-opening">جاري فتح الاختبار…</p>
            )}
          </div>
        )}

        {showReadyModal && (
          <div className="tiger-test-overlay">
            <div className="tiger-test-modal">
              <h2>اختبار النمر</h2>
              {hasActive && session && session.status !== "completed" ? (
                <>
                  <p>لديك اختبار قيد التنفيذ. هل تريد المتابعة أم البدء من جديد؟</p>
                  <p style={{ fontSize: 13, color: "#888" }}>
                    القسم الحالي: {session.current_section} من{" "}
                    {session.section_count || sectionCount} — أسئلة هذا الاختبار:{" "}
                    {session.total_questions || 0}
                  </p>
                </>
              ) : (
                <>
                  <p>هل أنت مستعد لبدء اختبار النمر؟</p>
                  <p style={{ fontSize: 13, color: "#888" }}>
                    يتكون الاختبار من 5 أقسام، في كل قسم 24 سؤالاً (13 لفظي + 11
                    كمي)، ومدة كل قسم 24 دقيقة. لا تُعاد الأسئلة نفسها للطالب.
                    إذا نقص بنك الأسئلة يُكمل عشوائياً من ملف آخر في البنوك.
                  </p>
                </>
              )}
              {error && (
                <p style={{ color: "#c00", marginBottom: 16 }}>{error}</p>
              )}
              <div className="tiger-test-modal-btns">
                <button
                  type="button"
                  className="tiger-test-modal-btn secondary"
                  onClick={() => setShowReadyModal(false)}
                >
                  إلغاء
                </button>
                {hasActive && session && session.status !== "completed" ? (
                  <>
                    <button
                      type="button"
                      className="tiger-test-modal-btn secondary"
                      disabled={starting}
                      onClick={() => handleStart(true)}
                    >
                      {starting ? "جاري البدء…" : "بدء جديد"}
                    </button>
                    <button
                      type="button"
                      className="tiger-test-modal-btn primary"
                      onClick={handleResume}
                    >
                      متابعة
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="tiger-test-modal-btn primary"
                    disabled={starting}
                    onClick={() => handleStart(false)}
                  >
                    {starting ? "جاري البدء…" : "نعم، ابدأ"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="tiger-test-footer-bar">محاكي اختبار النمر ( بدايتي )</div>
      </div>
    );
  }

  if (session?.status === "completed") {
    const r = session.results || {};
    const review = Array.isArray(session.review) ? session.review : [];
    const correctCount = review.filter((q) => q.is_correct).length;
    const wrongCount = review.filter((q) => !q.is_correct && !q.skipped).length;
    const skippedCount = review.filter((q) => q.skipped).length;
    const filteredReview = review.filter((q) => {
      if (reviewFilter === "wrong") return !q.is_correct && !q.skipped;
      if (reviewFilter === "correct") return q.is_correct;
      if (reviewFilter === "skipped") return q.skipped;
      return true;
    });
    const activeReview = filteredReview;
    const safeReviewIndex = Math.min(
      reviewIndex,
      Math.max(0, activeReview.length - 1)
    );
    const reviewQuestion = activeReview[safeReviewIndex] || null;

    return (
      <div className="tiger-test-root" dir="rtl">
        <div className="tiger-test-header">
          <span>{showReview ? "مراجعة الإجابات" : "نتيجة اختبار النمر"}</span>
          <span>محاكي اختبار النمر (بدايتي)</span>
        </div>
        {!showReview ? (
          <div className="tiger-test-results">
            <h2>نتيجة الاختبار</h2>
            <div className="tiger-test-result-cards">
              <div className="tiger-test-result-card">
                <h3>القسم الكمي</h3>
                <div className="pct">{r.quant_percentage}</div>
                <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
                  {r.quant_correct} من {r.quant_total} سؤال
                </p>
              </div>
              <div className="tiger-test-result-card">
                <h3>القسم اللفظي</h3>
                <div className="pct">{r.verbal_percentage}</div>
                <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
                  {r.verbal_correct} من {r.verbal_total} سؤال
                </p>
              </div>
              <div className="tiger-test-result-card tiger-test-result-final">
                <h3>النتيجة النهائية</h3>
                <div className="pct">
                  {Math.round(Number(r.final_percentage) || 0)}
                </div>
                <p style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
                  متوسط القسمين (لفظي + كمي) ÷ 2
                </p>
              </div>
            </div>
            <div className="tiger-test-review-summary">
              <span className="tiger-test-review-pill correct">
                صحيح {correctCount || r.verbal_correct + r.quant_correct}
              </span>
              <span className="tiger-test-review-pill wrong">
                خطأ {wrongCount}
              </span>
              <span className="tiger-test-review-pill skipped">
                بدون إجابة {skippedCount}
              </span>
            </div>
            <div className="tiger-test-modal-btns" style={{ marginTop: 28 }}>
              <button
                type="button"
                className="tiger-test-modal-btn secondary"
                onClick={goToHub}
              >
                العودة للقائمة
              </button>
              <button
                type="button"
                className="tiger-test-modal-btn secondary"
                onClick={() => navigate("/courses")}
              >
                العودة للدورات
              </button>
              <button
                type="button"
                className="tiger-test-modal-btn primary"
                disabled={reviewLoading || (review.length === 0 && !reviewLoading)}
                onClick={() => {
                  setReviewFilter(wrongCount > 0 ? "wrong" : "all");
                  setReviewIndex(0);
                  setShowReview(true);
                }}
              >
                {reviewLoading ? "جاري تجهيز المراجعة…" : "مراجعة الأخطاء والصح"}
              </button>
              <button
                type="button"
                className="tiger-test-modal-btn secondary"
                disabled={starting}
                onClick={() => handleStart(true)}
              >
                اختبار جديد
              </button>
            </div>
            {review.some((q) => !q.is_correct && (q.video?.url || q.video?.id)) && (
              <div className="tiger-test-wrong-videos">
                <h3>فيديوهات الأسئلة الخاطئة</h3>
                <ul>
                  {review
                    .filter((q) => !q.is_correct && (q.video?.url || q.video?.id))
                    .map((q) => (
                      <li key={q.id}>
                        <span>
                          {q.subject === "verbal" ? "لفظي" : "كمي"}
                          {q.lesson_name ? ` · ${q.lesson_name}` : ""}
                        </span>
                        <QuestionVideoLink
                          video={q.video}
                          siteQuestionNumber={q.site_question_number}
                          className="tiger-test-video-link"
                          onOpen={() =>
                            setVideoPlayer({
                              video: q.video,
                              startSeconds: q.video_start_seconds,
                              endSeconds: q.video_end_seconds,
                              siteQuestionNumber: q.site_question_number,
                            })
                          }
                        />
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="tiger-test-review">
            <div className="tiger-test-review-toolbar">
              <div className="tiger-test-review-filters">
                {[
                  { id: "wrong", label: `الأخطاء (${wrongCount})` },
                  { id: "correct", label: `الصح (${correctCount})` },
                  { id: "skipped", label: `بدون إجابة (${skippedCount})` },
                  { id: "all", label: `الكل (${review.length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`tiger-test-review-filter ${
                      reviewFilter === f.id ? "active" : ""
                    }`}
                    onClick={() => {
                      setReviewFilter(f.id);
                      setReviewIndex(0);
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="tiger-test-modal-btn secondary"
                onClick={() => setShowReview(false)}
              >
                العودة للنتيجة
              </button>
            </div>

            {activeReview.length === 0 ? (
              <div className="tiger-test-review-empty">
                لا توجد أسئلة في هذا التصنيف.
              </div>
            ) : (
              <div className="tiger-test-review-body">
                <aside className="tiger-test-review-grid-wrap">
                  <p className="tiger-test-review-grid-title">
                    السؤال {safeReviewIndex + 1} من {activeReview.length}
                    {reviewQuestion
                      ? ` — القسم ${reviewQuestion.section_number}`
                      : ""}
                  </p>
                  <div className="tiger-test-grid tiger-test-review-grid">
                    {activeReview.map((q, i) => {
                      const st = reviewItemStatus(q);
                      let cls = `tiger-test-grid-cell ${st}`;
                      if (i === safeReviewIndex) cls += " review-current";
                      return (
                        <button
                          key={q.id || i}
                          type="button"
                          className={cls}
                          onClick={() => setReviewIndex(i)}
                          title={`السؤال ${q.number}`}
                        >
                          {q.number}
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <div className="tiger-test-review-main">
                  {reviewQuestion && (
                    <>
                      <div
                        className={`tiger-test-review-status-banner ${reviewItemStatus(
                          reviewQuestion
                        )}`}
                      >
                        {reviewQuestion.is_correct
                          ? "إجابتك صحيحة"
                          : reviewQuestion.skipped
                            ? "لم تجب عن هذا السؤال"
                            : "إجابتك خاطئة"}
                        {reviewQuestion.subject === "verbal"
                          ? " · لفظي"
                          : " · كمي"}
                      </div>

                      {reviewQuestion.passage_text ? (
                        <div className="tiger-test-passage">
                          <MathRenderer html={reviewQuestion.passage_text} />
                        </div>
                      ) : null}

                      <div className="tiger-test-question-text">
                        {(reviewQuestion.is_passage ||
                          reviewQuestion.passage_index != null) && (
                          <div className="tiger-test-passage-q-label">
                            السؤال {(reviewQuestion.passage_index ?? 0) + 1}:
                          </div>
                        )}
                        <MathRenderer html={reviewQuestion.question || ""} />
                      </div>

                      {reviewQuestion.image ? (
                        <img
                          src={reviewQuestion.image}
                          alt=""
                          className="tiger-test-review-image"
                        />
                      ) : null}

                      <div className="tiger-test-options">
                        {(reviewQuestion.answers || []).map((a, ai) => {
                          const aid = String(
                            a.answer_id || a.id || "abcd"[ai] || "a"
                          )
                            .toLowerCase()
                            .slice(0, 1);
                          const isCorrectChoice = Boolean(
                            a.is_correct ||
                              aid === reviewQuestion.correct_answer_id
                          );
                          const isUserChoice =
                            aid === reviewQuestion.user_answer_id;
                          let cls = "tiger-test-option tiger-test-review-option";
                          if (isCorrectChoice) cls += " review-correct";
                          else if (isUserChoice) cls += " review-wrong";
                          return (
                            <div
                              key={`${reviewQuestion.id}-${aid}-${ai}`}
                              className={cls}
                            >
                              <span className="tiger-test-review-letter">
                                {CHOICE_AR[aid] || aid}
                              </span>
                              <span className="tiger-test-option-text">
                                <MathRenderer
                                  html={stripAnswerChoicePrefix(a.text || "")}
                                />
                              </span>
                              <span className="tiger-test-review-tag">
                                {isCorrectChoice ? "الإجابة الصحيحة" : ""}
                                {isUserChoice && !isCorrectChoice
                                  ? "إجابتك"
                                  : ""}
                                {isUserChoice && isCorrectChoice
                                  ? " · إجابتك"
                                  : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {reviewQuestion.explanation ? (
                        <div className="tiger-test-review-explain">
                          <h3>شرح الإجابة</h3>
                          <MathRenderer html={reviewQuestion.explanation} />
                        </div>
                      ) : null}

                      {!reviewQuestion.is_correct &&
                        (reviewQuestion.video?.url || reviewQuestion.video?.id) && (
                          <QuestionVideoLink
                            video={reviewQuestion.video}
                            siteQuestionNumber={
                              reviewQuestion.site_question_number
                            }
                            className="tiger-test-video-link"
                            onOpen={() =>
                              setVideoPlayer({
                                video: reviewQuestion.video,
                                startSeconds:
                                  reviewQuestion.video_start_seconds,
                                endSeconds: reviewQuestion.video_end_seconds,
                                siteQuestionNumber:
                                  reviewQuestion.site_question_number,
                              })
                            }
                          />
                        )}

                      <div className="tiger-test-review-nav">
                        <button
                          type="button"
                          className="tiger-test-nav-btn prev"
                          disabled={safeReviewIndex === 0}
                          onClick={() =>
                            setReviewIndex(Math.max(0, safeReviewIndex - 1))
                          }
                        >
                          السابق
                        </button>
                        <button
                          type="button"
                          className="tiger-test-nav-btn next primary"
                          disabled={
                            safeReviewIndex >= activeReview.length - 1
                          }
                          onClick={() =>
                            setReviewIndex(
                              Math.min(
                                activeReview.length - 1,
                                safeReviewIndex + 1
                              )
                            )
                          }
                        >
                          التالي
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="tiger-test-footer-bar">محاكي اختبار النمر ( بدايتي )</div>
        {videoPlayer?.video && (
          <VideoModal
            isOpen
            onClose={() => setVideoPlayer(null)}
            videoUrl={videoPlayer.video.url || ""}
            title={
              videoPlayer.siteQuestionNumber
                ? `شاهد السؤال رقم ${videoPlayer.siteQuestionNumber}`
                : videoPlayer.video.title || "شرح السؤال"
            }
            lessonId={videoPlayer.video.lesson_id || null}
            videoId={videoPlayer.video.id}
            bunnyLibraryId={videoPlayer.video.bunny_library_id || null}
            startSeconds={videoPlayer.startSeconds}
            endSeconds={videoPlayer.endSeconds}
          />
        )}
      </div>
    );
  }

  const betweenSections = session?.status === "between_sections";
  const sectionTitle =
    session?.section_titles?.[sectionIndex] ||
    `${session?.current_section || 1} - القسم ${SECTION_NAMES[sectionIndex] || ""}`;

  return (
    <div className={`tiger-test-root ${fontClass}`.trim()} dir="rtl">
      {error && !showReadyModal && (
        <div className="tiger-test-error-banner" role="alert">
          {error}
        </div>
      )}
      {showReadyModal && (
        <div className="tiger-test-overlay">
          <div className="tiger-test-modal">
            <h2>اختبار النمر</h2>
            {hasActive && session && session.status !== "completed" ? (
              <>
                <p>لديك اختبار قيد التنفيذ. هل تريد المتابعة أم البدء من جديد؟</p>
                <p style={{ fontSize: 13, color: "#888" }}>
                  القسم الحالي: {session.current_section} من{" "}
                  {session.section_count || sectionCount} — أسئلة هذا الاختبار:{" "}
                  {session.total_questions || 0}
                </p>
              </>
            ) : (
              <>
                <p>هل أنت مستعد لبدء اختبار النمر؟</p>
                <p style={{ fontSize: 13, color: "#888" }}>
                  يتكون الاختبار من 5 أقسام، في كل قسم 24 سؤالاً (13 لفظي + 11
                  كمي)، ومدة كل قسم 24 دقيقة. لا تُعاد الأسئلة نفسها للطالب.
                  إذا نقص بنك الأسئلة يُكمل عشوائياً من ملف آخر في البنوك.
                </p>
              </>
            )}
            {error && (
              <p style={{ color: "#c00", marginBottom: 16 }}>{error}</p>
            )}
            <div className="tiger-test-modal-btns">
              <button
                type="button"
                className="tiger-test-modal-btn secondary"
                onClick={goToHub}
              >
                إلغاء
              </button>
              {hasActive && session && session.status !== "completed" ? (
                <>
                  <button
                    type="button"
                    className="tiger-test-modal-btn secondary"
                    disabled={starting}
                    onClick={() => handleStart(true)}
                  >
                    {starting ? "جاري البدء…" : "بدء جديد"}
                  </button>
                  <button
                    type="button"
                    className="tiger-test-modal-btn primary"
                    onClick={handleResume}
                  >
                    متابعة
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="tiger-test-modal-btn primary"
                  disabled={starting}
                  onClick={() => handleStart(false)}
                >
                  {starting ? "جاري البدء…" : "نعم، ابدأ"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPoolWarnings && session?.pool_warnings?.length > 0 && (
        <div className="tiger-test-overlay">
          <div className="tiger-test-modal">
            <h2>تنبيه قبل البدء</h2>
            <p style={{ textAlign: "right", marginBottom: 16 }}>
              بعض الأقسام لا تحتوي على العدد الكامل من الأسئلة في البنك. سيتم
              بدء الاختبار بـ 5 أقسام × 24 سؤالاً (13 لفظي + 11 كمي)، مع الإكمال
              من ملفات البنوك الأخرى عند الحاجة:
            </p>
            <ul
              style={{
                textAlign: "right",
                marginBottom: 20,
                paddingRight: 20,
                fontSize: 14,
                color: "#444",
                lineHeight: 1.8,
              }}
            >
              {session.pool_warnings.map((w, i) => (
                <li key={i}>{formatPoolWarning(w)}</li>
              ))}
            </ul>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
              إجمالي أسئلة هذا الاختبار: {session.total_questions} سؤال (
              {session.verbal_count ?? "—"} لفظي، {session.quant_count ?? "—"}{" "}
              كمي) — عدد الأقسام: {session.section_count || sectionCount}
            </p>
            <button
              type="button"
              className="tiger-test-modal-btn primary"
              onClick={() => setShowPoolWarnings(false)}
            >
              متابعة الاختبار
            </button>
          </div>
        </div>
      )}

      {showEndConfirm && session && (
        <div className="tiger-test-overlay">
          <div className="tiger-test-modal">
            <h2>
              {session.current_section >= sectionCount
                ? "إنهاء الاختبار"
                : "إنهاء القسم"}
            </h2>
            <p>
              {session.current_section >= sectionCount
                ? "هل أنت متأكد من إنهاء الاختبار؟ ستظهر النتيجة النهائية."
                : "هل أنت متأكد من إنهاء القسم الحالي؟ سيتوقف الوقت ولن تتمكن من العودة لهذا القسم."}
            </p>
            <div className="tiger-test-modal-btns">
              <button
                type="button"
                className="tiger-test-modal-btn secondary"
                onClick={() => setShowEndConfirm(false)}
                disabled={ending}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="tiger-test-modal-btn primary"
                disabled={ending}
                onClick={async () => {
                  setShowEndConfirm(false);
                  await finishCurrentSection();
                }}
              >
                {ending ? "جاري الإنهاء…" : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
      {betweenSections && session && !showReadyModal && (
        <div className="tiger-test-overlay">
          <div className="tiger-test-modal">
            <h2>انتهى القسم {session.current_section}</h2>
            <p>
              {nextSectionPrompt(session.current_section, sectionCount) ||
                "تم إكمال جميع الأقسام."}
            </p>
            <div className="tiger-test-modal-btns">
              {session.current_section < sectionCount ? (
                <button
                  type="button"
                  className="tiger-test-modal-btn primary"
                  disabled={ending}
                  onClick={handleNextSection}
                >
                  {ending ? "جاري التحميل…" : "نعم، مستعد"}
                </button>
              ) : (
                <button
                  type="button"
                  className="tiger-test-modal-btn primary"
                  disabled={ending}
                  onClick={handleNextSection}
                >
                  {ending ? "جاري التحميل…" : "عرض النتيجة"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showInstructions && (
        <div
          className="tiger-test-overlay"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="tiger-test-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>شرح الاختبار</h2>
            <p style={{ textAlign: "right" }}>
              محاكي اختبار النمر من 5 أقسام. كل قسم 24 سؤالاً (13 لفظي + 11 كمي)
              ومدة 24 دقيقة. لا تنتقل للسؤال التالي إلا بعد الإجابة ثم «حفظ و
              التالي»، أو إضافة السؤال للمراجعة ثم «حفظ و التالي». الأسئلة
              المجاب عليها تظهر بالأخضر الداكن ويمكن الرجوع إليها من اللوحة.
            </p>
            <button
              type="button"
              className="tiger-test-modal-btn primary"
              onClick={() => setShowInstructions(false)}
            >
              حسناً
            </button>
          </div>
        </div>
      )}

      {showDeferred && (
        <div
          className="tiger-test-overlay"
          onClick={() => setShowDeferred(false)}
        >
          <div
            className="tiger-test-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>الأسئلة المؤجلة</h2>
            {deferred.length === 0 && bookmarked.length === 0 ? (
              <p>لا توجد أسئلة مؤجلة.</p>
            ) : (
              <div style={{ textAlign: "right", maxHeight: 240, overflowY: "auto" }}>
                {(deferred.length ? deferred : bookmarked).map((id) => {
                  const foundIndex = sectionQuestions.findIndex((q) => q.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className="tiger-test-sidebar-btn blue"
                      style={{
                        display: "block",
                        width: "100%",
                        marginBottom: 8,
                      }}
                      onClick={() => {
                        if (foundIndex >= 0)
                          goToQuestion(foundIndex, { allowUnanswered: true });
                        setShowDeferred(false);
                      }}
                      disabled={foundIndex < 0}
                    >
                      {foundIndex >= 0
                        ? `السؤال ${foundIndex + 1}`
                        : `سؤال من قسم آخر`}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              className="tiger-test-modal-btn primary"
              style={{ marginTop: 12 }}
              onClick={() => setShowDeferred(false)}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {session &&
        session.status === "in_section" &&
        !showReadyModal &&
        !showPoolWarnings && (
          <>
            <div className="tiger-test-header">
              <span>الأسئلة المرحلة : {answeredInSection}</span>
              <span>عنوان الاختبار : {sectionTitle}</span>
              <span>
                مجموع الأسئلة في القسم : {sectionQuestions.length}
              </span>
            </div>

            <div className="tiger-test-body">
              <aside className="tiger-test-sidebar">
                <SectionTimer
                  key={`${session.id}-${session.current_section}`}
                  sessionId={session.id}
                  initialSeconds={session.section_time_remaining ?? 24 * 60}
                  onExpire={handleExpireSection}
                />

                <div className="tiger-test-user-box">
                  <div className="tiger-test-user-icon">👤</div>
                  <p style={{ fontWeight: 700 }}>طالب</p>
                  <p>{user?.email || user?.username || "—"}</p>
                  <p>الرقم: {user?.id || "—"}</p>
                </div>

                <div>
                  <p className="tiger-test-sidebar-count">
                    مجموع الأسئلة : {sectionQuestions.length}
                  </p>
                  <div className="tiger-test-stats-row">
                    <span className="tiger-test-stat-badge tiger-test-stat-blue">
                      إجابة مؤجلة :{" "}
                      {deferred.length || bookmarked.length}
                    </span>
                    <span className="tiger-test-stat-badge tiger-test-stat-green">
                      تم الإجابة : {answeredInSection}
                    </span>
                  </div>
                </div>

                <QuestionGrid
                  questions={sectionQuestions}
                  currentQIndex={currentQIndex}
                  answers={answers}
                  seen={seen}
                  reviewIds={[...bookmarked, ...deferred]}
                  farthestIndex={farthestIndex}
                  onSelect={goToQuestion}
                />

                <div className="tiger-test-sidebar-btns">
                  <button
                    type="button"
                    className="tiger-test-sidebar-btn blue"
                    onClick={() => setShowInstructions(true)}
                  >
                    شرح الاختبار
                  </button>
                  <button
                    type="button"
                    className="tiger-test-sidebar-btn blue"
                    onClick={() => setShowDeferred(true)}
                  >
                    الأسئلة المؤجلة
                  </button>
                  <button
                    type="button"
                    className="tiger-test-sidebar-btn grey"
                    onClick={handleEndSection}
                    disabled={ending}
                  >
                    {ending
                      ? "جاري الإنهاء…"
                      : session.current_section >= sectionCount
                      ? "إنهاء الاختبار"
                      : "إنهاء القسم"}
                  </button>
                  <button
                    type="button"
                    className="tiger-test-sidebar-btn blue"
                    onClick={() =>
                      window.open("/courses", "_blank", "noopener,noreferrer")
                    }
                  >
                    المعادلات
                  </button>
                </div>
              </aside>

              <div className="tiger-test-main">
                <div className="tiger-test-top-bar">
                  مجموع الأسئلة في الإختبار {session.total_questions || 0} —
                  القسم {session.current_section} من {sectionCount} — كل قسم 24
                  سؤالاً (13 لفظي + 11 كمي) / 24 دقيقة
                </div>

                <div className="tiger-test-watermark">
                  <img src={logoimage} alt="" />
                </div>

                <div className="tiger-test-main-inner">
                  <div className="tiger-test-font-controls">
                    <button
                      type="button"
                      className={`tiger-test-font-btn ${
                        fontSize === "md" ? "active" : ""
                      }`}
                      onClick={() => setFontSize("md")}
                      title="حجم الخط الافتراضي"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      className={`tiger-test-font-btn ${
                        fontSize === "sm" ? "active" : ""
                      }`}
                      onClick={() => setFontSize("sm")}
                      title="تصغير الخط"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      className={`tiger-test-font-btn ${
                        fontSize === "lg" ? "active" : ""
                      }`}
                      onClick={() => setFontSize("lg")}
                      title="تكبير الخط"
                    >
                      A+
                    </button>
                  </div>

                  {currentQuestion ? (
                    <>
                      <div className="tiger-test-question-badge">
                        السؤال {currentQIndex + 1}
                        {currentQuestion.is_demo ? " · تجريبي" : ""}
                      </div>

                      <div className="tiger-test-instruction-box">
                        {currentQuestion.is_passage || currentQuestion.passage_text
                          ? "اقرأ القطعة ثم أجب عن السؤال الظاهر فقط. بعد الحفظ يظهر السؤال التالي من القطعة أو القسم."
                          : "فيما يلي سؤال يتبعه ٤ إختيارات، المطلوب هو : اختيار الإجابة الصحيحة"}
                      </div>

                      {(currentQuestion.passage_text) && (
                        <div className="tiger-test-passage">
                          <MathRenderer html={currentQuestion.passage_text} />
                        </div>
                      )}

                      <div className="tiger-test-question-text">
                        {(currentQuestion.is_passage ||
                          currentQuestion.passage_index != null) && (
                          <div className="tiger-test-passage-q-label">
                            السؤال {(currentQuestion.passage_index ?? 0) + 1}:
                          </div>
                        )}
                        <MathRenderer html={currentQuestion.question || ""} />
                      </div>

                      {currentQuestion.image && (
                        <img
                          src={currentQuestion.image}
                          alt=""
                          style={{
                            maxWidth: "100%",
                            marginBottom: 16,
                            borderRadius: 4,
                          }}
                        />
                      )}

                      <div className="tiger-test-options">
                        {(currentQuestion.answers || []).map((a, ai) => {
                          const aid = String(
                            a.answer_id || a.id || "abcd"[ai] || "a"
                          )
                            .toLowerCase()
                            .slice(0, 1);
                          return (
                            <label
                              key={`${currentQuestion.id}-${aid}-${ai}`}
                              className={`tiger-test-option ${
                                selectedAnswer === aid ? "selected" : ""
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${currentQuestion.id}`}
                                className="tiger-test-option-radio"
                                checked={selectedAnswer === aid}
                                onChange={() => handleSelectAnswer(aid)}
                              />
                              <span className="tiger-test-option-text">
                                <MathRenderer
                                  html={stripAnswerChoicePrefix(a.text || "")}
                                />
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>
                      لا توجد أسئلة في هذا القسم…
                    </p>
                  )}
                </div>

                <div className="tiger-test-nav-footer">
                  <label className="tiger-test-bookmark">
                    <input
                      type="checkbox"
                      checked={
                        currentQuestion
                          ? bookmarked.includes(currentQuestion.id) ||
                            deferred.includes(currentQuestion.id)
                          : false
                      }
                      onChange={(e) => handleBookmark(e.target.checked)}
                      disabled={!currentQuestion}
                    />
                    أضف السؤال للمراجعة
                  </label>
                  <div className="tiger-test-nav-end">
                    {navHint ? (
                      <p className="tiger-test-nav-hint" role="alert">
                        {navHint}
                      </p>
                    ) : null}
                    <div className="tiger-test-nav-btns">
                      <button
                        type="button"
                        className="tiger-test-nav-btn prev"
                        disabled={
                          currentQIndex === 0 ||
                          !currentQuestion ||
                          !sectionQuestions
                            .slice(0, currentQIndex)
                            .some(
                              (q, i) =>
                                answers[q.id] ||
                                isInReview(q.id) ||
                                i === farthestIndex
                            )
                        }
                        onClick={handlePrev}
                      >
                        السؤال السابق
                      </button>
                      <button
                        type="button"
                        className="tiger-test-nav-btn next primary"
                        disabled={!currentQuestion || ending}
                        onClick={handleSaveNext}
                      >
                        {ending
                          ? "جاري الإنهاء…"
                          : currentQIndex >= sectionQuestions.length - 1
                          ? "حفظ"
                          : "حفظ و التالي"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="tiger-test-footer-bar">
              محاكي اختبار النمر ( بدايتي )
            </div>
          </>
        )}
    </div>
  );
};

export default TigerTest;

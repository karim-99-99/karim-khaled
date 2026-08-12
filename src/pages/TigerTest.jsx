import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/storageService";
import * as backendApi from "../services/backendApi";
import logoimage from "../assets/karim.png";
import "./TigerTest.css";

const SECTION_NAMES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"];

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function nextSectionPrompt(currentSection, sectionCount) {
  if (currentSection >= sectionCount) return null;
  const name = SECTION_NAMES[currentSection] || `${currentSection + 1}`;
  return `هل مستعد للدخول في القسم ${name}؟`;
}

function answerLabel(aid) {
  const map = { a: "أ", b: "ب", c: "ج", d: "د" };
  return map[aid] || String(aid || "").toUpperCase();
}

const TigerTest = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [showReadyModal, setShowReadyModal] = useState(true);
  const [hasActive, setHasActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [fontSize, setFontSize] = useState("md");
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);
  const [showPoolWarnings, setShowPoolWarnings] = useState(false);
  const timerRef = useRef(null);
  const syncRef = useRef(null);
  const endingRef = useRef(false);

  const sectionCount = session?.section_count || session?.sections?.length || 5;
  const sectionIndex = Math.max(
    0,
    Math.min((session?.current_section || 1) - 1, Math.max(0, sectionCount - 1))
  );

  const sectionQuestions = useMemo(() => {
    if (!session?.sections?.[sectionIndex]) return [];
    return session.sections[sectionIndex];
  }, [session, sectionIndex]);

  const currentQIndex = Math.min(
    session?.current_question_index ?? 0,
    Math.max(0, sectionQuestions.length - 1)
  );
  const currentQuestion = sectionQuestions[currentQIndex] || null;

  const answers = session?.answers || {};
  const bookmarked = session?.bookmarked || [];
  const deferred = session?.deferred || [];
  const seen = session?.seen || [];

  const answeredInSection = sectionQuestions.filter((q) => answers[q.id]).length;

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
          setHasActive(true);
          setSession(active);
          // Keep ready modal so user can resume OR restart
          setShowReadyModal(true);
          const idx = active.current_question_index ?? 0;
          const secQs =
            active.sections?.[Math.max(0, (active.current_section || 1) - 1)] ||
            [];
          const q = secQs[idx];
          setSelectedAnswer(q ? active.answers?.[q.id] || null : null);
          if (Array.isArray(active.pool_warnings) && active.pool_warnings.length) {
            // warnings already shown at first start; don't force again on resume
          }
        }
      })
      .catch((err) => setError(err.message || "فشل تحميل الاختبار"))
      .finally(() => setLoading(false));
  }, [user?.token, navigate]);

  useEffect(() => {
    if (!currentQuestion || !session?.id || session.status !== "in_section") return;
    setSelectedAnswer(answers[currentQuestion.id] || null);
    if (!seen.includes(currentQuestion.id)) {
      const newSeen = [...seen, currentQuestion.id];
      backendApi
        .syncTigerTestSession(session.id, { seen: newSeen })
        .then((s) => s && setSession(s))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, session?.id, session?.status]);

  // Auto-skip empty sections (safety net)
  useEffect(() => {
    if (!session || session.status !== "in_section") return;
    if (sectionQuestions.length > 0) return;
    if (endingRef.current) return;
    endingRef.current = true;
    backendApi
      .endTigerTestSection(session.id)
      .then((s) => {
        if (s) setSession(s);
      })
      .finally(() => {
        endingRef.current = false;
      });
  }, [session, sectionQuestions.length]);

  useEffect(() => {
    if (
      !session ||
      session.status !== "in_section" ||
      session.section_time_remaining == null ||
      sectionQuestions.length === 0
    ) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.status !== "in_section") return prev;
        const next = Math.max(0, (prev.section_time_remaining || 0) - 1);
        if (next === 0 && !endingRef.current) {
          endingRef.current = true;
          clearInterval(timerRef.current);
          backendApi
            .endTigerTestSection(prev.id)
            .then((s) => {
              if (s) setSession(s);
            })
            .finally(() => {
              endingRef.current = false;
            });
        }
        return { ...prev, section_time_remaining: next };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.id, session?.status, session?.current_section, sectionQuestions.length]);

  useEffect(() => {
    if (!session?.id || session.status !== "in_section") return;
    if (syncRef.current) clearTimeout(syncRef.current);
    syncRef.current = setTimeout(() => {
      backendApi
        .syncTigerTestSession(session.id, {
          section_time_remaining: session.section_time_remaining,
          current_question_index: session.current_question_index,
        })
        .catch(() => {});
    }, 5000);
    return () => clearTimeout(syncRef.current);
  }, [
    session?.section_time_remaining,
    session?.current_question_index,
    session?.id,
    session?.status,
  ]);

  const applyStartedSession = (s) => {
    setSession(s);
    setHasActive(true);
    setShowReadyModal(false);
    setSelectedAnswer(null);
    if (Array.isArray(s.pool_warnings) && s.pool_warnings.length > 0) {
      setShowPoolWarnings(true);
    }
  };

  const handleResume = () => {
    if (!session) return;
    setShowReadyModal(false);
    if (
      Array.isArray(session.pool_warnings) &&
      session.pool_warnings.length > 0 &&
      (session.total_questions || 0) < 120
    ) {
      // optional: don't re-show
    }
  };

  const handleStart = async (force = false) => {
    setStarting(true);
    setError("");
    try {
      const s = await backendApi.startTigerTest({ force });
      if (s) applyStartedSession(s);
    } catch (err) {
      setError(err.message || "فشل بدء الاختبار");
    } finally {
      setStarting(false);
    }
  };

  const formatPoolWarning = (w) => {
    const label =
      w.subject_label || (w.subject === "verbal" ? "اللفظي" : "الكمي");
    const required = w.required ?? 0;
    const actual = w.actual ?? 0;
    if (w.borrowed_from_other > 0) {
      return `قسم ${label} لا يحتوي على العدد الكامل من الأسئلة المطلوبة (${required}). تم استخدام ${actual} سؤالاً، منها ${w.borrowed_from_other} سؤالاً عشوائياً من قسم آخر.`;
    }
    return `قسم ${label} لا يحتوي على العدد الكامل من الأسئلة المطلوبة (${required}). تم استخدام ${actual} سؤالاً فقط.`;
  };

  const handleSelectAnswer = async (answerId) => {
    if (!session || !currentQuestion) return;
    setSelectedAnswer(answerId);
    try {
      const s = await backendApi.saveTigerTestAnswer(session.id, {
        slot_id: currentQuestion.id,
        answer_id: answerId,
      });
      if (s) setSession(s);
    } catch {
      /* keep local selection */
    }
  };

  const handleBookmark = async (checked) => {
    if (!session || !currentQuestion) return;
    try {
      const s = await backendApi.saveTigerTestAnswer(session.id, {
        slot_id: currentQuestion.id,
        answer_id: selectedAnswer || answers[currentQuestion.id] || undefined,
        bookmarked: checked,
        deferred: checked,
      });
      if (s) setSession(s);
    } catch {
      /* ignore */
    }
  };

  const goToQuestion = async (index) => {
    if (!session) return;
    const safe = Math.max(0, Math.min(index, sectionQuestions.length - 1));
    setSession((prev) => ({ ...prev, current_question_index: safe }));
    const q = sectionQuestions[safe];
    setSelectedAnswer(q ? answers[q.id] || null : null);
    try {
      await backendApi.syncTigerTestSession(session.id, {
        current_question_index: safe,
      });
    } catch {
      /* ignore */
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) goToQuestion(currentQIndex - 1);
  };

  const handleSaveNext = async () => {
    if (!session || !currentQuestion) return;
    if (selectedAnswer) {
      try {
        const s = await backendApi.saveTigerTestAnswer(session.id, {
          slot_id: currentQuestion.id,
          answer_id: selectedAnswer,
        });
        if (s) setSession(s);
      } catch {
        /* continue */
      }
    }
    if (currentQIndex < sectionQuestions.length - 1) {
      goToQuestion(currentQIndex + 1);
    } else {
      try {
        endingRef.current = true;
        const s = await backendApi.endTigerTestSection(session.id);
        if (s) setSession(s);
      } catch {
        /* ignore */
      } finally {
        endingRef.current = false;
      }
    }
  };

  const handleEndSection = async () => {
    if (!session) return;
    const isLast = session.current_section >= sectionCount;
    const msg = isLast
      ? "هل أنت متأكد من إنهاء الاختبار؟ ستظهر النتيجة النهائية."
      : "هل أنت متأكد من إنهاء القسم الحالي؟ سيتوقف الوقت ولن تتمكن من العودة لهذا القسم.";
    if (!window.confirm(msg)) return;
    try {
      endingRef.current = true;
      const s = await backendApi.endTigerTestSection(session.id);
      if (s) setSession(s);
    } catch (err) {
      setError(err.message || "فشل إنهاء القسم");
    } finally {
      endingRef.current = false;
    }
  };

  const handleNextSection = async () => {
    if (!session) return;
    try {
      const s = await backendApi.nextTigerTestSection(session.id);
      if (s) {
        setSession(s);
        setSelectedAnswer(null);
      }
    } catch (err) {
      setError(err.message || "فشل بدء القسم التالي");
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

  if (session?.status === "completed" && session?.results) {
    const r = session.results;
    return (
      <div className="tiger-test-root" dir="rtl">
        <div className="tiger-test-header">
          <span>نتيجة اختبار النمر</span>
          <span>محاكي اختبار النمر (هدفك)</span>
        </div>
        <div className="tiger-test-results">
          <h2>نتيجة الاختبار</h2>
          <div className="tiger-test-result-cards">
            <div className="tiger-test-result-card">
              <h3>القسم الكمي</h3>
              <div className="pct">{r.quant_percentage}%</div>
              <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
                {r.quant_correct} من {r.quant_total} سؤال
              </p>
            </div>
            <div className="tiger-test-result-card">
              <h3>القسم اللفظي</h3>
              <div className="pct">{r.verbal_percentage}%</div>
              <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
                {r.verbal_correct} من {r.verbal_total} سؤال
              </p>
            </div>
            <div className="tiger-test-result-card tiger-test-result-final">
              <h3>النتيجة النهائية</h3>
              <div className="pct">{r.final_percentage}%</div>
              <p style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
                متوسط القسمين (لفظي + كمي) ÷ 2
              </p>
            </div>
          </div>
          <div className="tiger-test-modal-btns" style={{ marginTop: 32 }}>
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
              disabled={starting}
              onClick={() => handleStart(true)}
            >
              اختبار جديد
            </button>
          </div>
        </div>
        <div className="tiger-test-footer-bar">محاكي اختبار النمر ( هدفك )</div>
      </div>
    );
  }

  const betweenSections = session?.status === "between_sections";
  const sectionTitle =
    session?.section_titles?.[sectionIndex] ||
    `${session?.current_section || 1} - القسم ${SECTION_NAMES[sectionIndex] || ""}`;

  return (
    <div className="tiger-test-root" dir="rtl">
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
                  يتكون الاختبار من حتى 5 أقسام، مدة كل قسم 25 دقيقة. الهدف: 65
                  سؤال لفظي و 55 سؤال كمي (تُؤخذ عشوائياً من بنك الأسئلة).
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
                onClick={() => navigate("/courses")}
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
              بعض الأقسام لا تحتوي على العدد الكامل من الأسئلة المطلوبة. سيتم
              بدء الاختبار بالأسئلة المتاحة مع إضافة أسئلة عشوائية من أقسام
              أخرى عند الحاجة:
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
                  onClick={handleNextSection}
                >
                  نعم، مستعد
                </button>
              ) : (
                <button
                  type="button"
                  className="tiger-test-modal-btn primary"
                  onClick={handleNextSection}
                >
                  عرض النتيجة
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
              محاكي اختبار النمر يحاكي الاختبار الحقيقي. مدة كل قسم 25 دقيقة.
              اختر الإجابة الصحيحة ثم اضغط «حفظ و التالي». يمكنك وضع علامة
              مرجعية على أي سؤال للمراجعة.
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
                  let foundIndex = -1;
                  sectionQuestions.forEach((q, i) => {
                    if (q.id === id) foundIndex = i;
                  });
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
                        if (foundIndex >= 0) goToQuestion(foundIndex);
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
                <div className="tiger-test-timer-box">
                  <div className="tiger-test-timer-label">الوقت المتبقي</div>
                  <div className="tiger-test-timer-digits">
                    {formatTime(session.section_time_remaining ?? 0)}
                  </div>
                </div>

                <div className="tiger-test-user-box">
                  <div className="tiger-test-user-icon">👤</div>
                  <p style={{ fontWeight: 700 }}>طالب</p>
                  <p>{user?.email || user?.username || "—"}</p>
                  <p>الرقم: {user?.id || "—"}</p>
                </div>

                <div>
                  <p style={{ fontSize: 13, marginBottom: 8 }}>
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

                <div className="tiger-test-grid">
                  {sectionQuestions.map((q, i) => {
                    let cls = "tiger-test-grid-cell";
                    if (i === currentQIndex) cls += " current";
                    else if (answers[q.id]) cls += " answered";
                    else if (seen.includes(q.id)) cls += " seen";
                    return (
                      <button
                        key={q.id}
                        type="button"
                        className={cls}
                        onClick={() => goToQuestion(i)}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

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
                  >
                    {session.current_section >= sectionCount
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
                  القسم {session.current_section} من {sectionCount}
                </div>

                <div className="tiger-test-watermark">
                  <img src={logoimage} alt="" />
                </div>

                <div className="tiger-test-main-inner">
                  <div className="tiger-test-font-controls">
                    <button
                      type="button"
                      className="tiger-test-font-btn"
                      onClick={() => setFontSize("lg")}
                    >
                      +A
                    </button>
                    <button
                      type="button"
                      className="tiger-test-font-btn"
                      onClick={() => setFontSize("md")}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      className="tiger-test-font-btn"
                      onClick={() => setFontSize("sm")}
                    >
                      -A
                    </button>
                  </div>

                  {currentQuestion ? (
                    <>
                      <div className="tiger-test-question-badge">
                        السؤال {currentQIndex + 1}
                      </div>

                      <div className="tiger-test-instruction-box">
                        فيما يلي سؤال يتبعه ٤ إختيارات، المطلوب هو : اختيار
                        الإجابة الصحيحة
                      </div>

                      <div
                        className={`tiger-test-question-text ${fontClass}`}
                        dangerouslySetInnerHTML={{
                          __html: currentQuestion.question || "",
                        }}
                      />

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
                              <span
                                className="tiger-test-option-text"
                                dangerouslySetInnerHTML={{
                                  __html: a.text || "",
                                }}
                              />
                              <input
                                type="radio"
                                name={`q-${currentQuestion.id}`}
                                className="tiger-test-option-radio"
                                checked={selectedAnswer === aid}
                                onChange={() => handleSelectAnswer(aid)}
                              />
                              <span
                                style={{ marginRight: 8, fontWeight: 700 }}
                              >
                                {answerLabel(aid)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>
                      لا توجد أسئلة في هذا القسم… جاري الانتقال…
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
                  <div className="tiger-test-nav-btns">
                    <button
                      type="button"
                      className="tiger-test-nav-btn prev"
                      disabled={currentQIndex === 0 || !currentQuestion}
                      onClick={handlePrev}
                    >
                      السؤال السابق
                    </button>
                    <button
                      type="button"
                      className="tiger-test-nav-btn next primary"
                      disabled={!currentQuestion}
                      onClick={handleSaveNext}
                    >
                      {currentQIndex >= sectionQuestions.length - 1
                        ? session.current_section >= sectionCount
                          ? "إنهاء الاختبار"
                          : "إنهاء القسم"
                        : "حفظ و التالي"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="tiger-test-footer-bar">
              محاكي اختبار النمر ( هدفك )
            </div>
          </>
        )}
    </div>
  );
};

export default TigerTest;

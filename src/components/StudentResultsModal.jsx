import { useEffect, useState } from "react";
import {
  isApiBaseConfigured,
  getStoredAuthToken,
  getStudentResultsStats,
} from "../services/backendApi";

const defaultSubjectStats = (label = "") => ({
  subject_label: label,
  total_lessons_count: 0,
  passed_lessons_count: 0,
  remaining_lessons_count: 0,
  correct_answers: 0,
  incorrect_answers: 0,
  answered_questions_total: 0,
});

function useAnimatedInt(target, active, duration = 1200) {
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!active) {
      setV(0);
      return;
    }
    const goal = Math.max(0, Math.floor(Number(target) || 0));
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setV(Math.round(goal * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return active ? v : 0;
}

const StatBubble = ({
  label,
  sublabel,
  value,
  active,
  gradient,
  glow,
  icon,
}) => {
  const n = useAnimatedInt(value, active);
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5 md:p-6 text-white shadow-xl motion-safe:hover:scale-[1.02] transition-transform duration-300"
      style={{
        background: gradient,
        boxShadow: glow,
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/20 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-black/10 blur-xl"
        aria-hidden
      />
      <div className="relative flex flex-col items-center text-center gap-2">
        <span className="text-3xl md:text-4xl drop-shadow-md" aria-hidden>
          {icon}
        </span>
        <p className="text-sm md:text-base font-bold opacity-95 leading-snug">
          {label}
        </p>
        {sublabel && (
          <p className="text-xs opacity-80 -mt-1 leading-tight">{sublabel}</p>
        )}
        <span
          className="mt-1 tabular-nums text-4xl md:text-5xl font-black tracking-tight drop-shadow-lg motion-safe:animate-[results-pop_0.5s_ease-out_1]"
          style={{ animationDelay: "0.05s" }}
        >
          {n.toLocaleString("ar-EG")}
        </span>
      </div>
    </div>
  );
};

/**
 * نافذة «نتائج» للطالب: إحصائيات للدروس التي بدأها أو أنهى منها نشاطاً فقط.
 */
export default function StudentResultsModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [stats, setStats] = useState({
    lessons_engaged_count: 0,
    assignments_engaged_count: 0,
    correct_answers: 0,
    incorrect_answers: 0,
    answered_questions_total: 0,
    by_subject: {
      verbal: defaultSubjectStats("لفظي"),
      quantitative: defaultSubjectStats("كمي"),
    },
  });

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (!isApiBaseConfigured() || !getStoredAuthToken()) {
      setStats({
        lessons_engaged_count: 0,
        assignments_engaged_count: 0,
        correct_answers: 0,
        incorrect_answers: 0,
        answered_questions_total: 0,
        by_subject: {
          verbal: defaultSubjectStats("لفظي"),
          quantitative: defaultSubjectStats("كمي"),
        },
      });
      setErr("سجّل الدخول مع ربط الموقع بالخادم لمشاهدة نتائجك.");
      return;
    }
    let c = false;
    setLoading(true);
    getStudentResultsStats()
      .then((data) => {
        if (c || !data) return;
        const verbal = data?.by_subject?.verbal || defaultSubjectStats("لفظي");
        const quantitative =
          data?.by_subject?.quantitative || defaultSubjectStats("كمي");
        setStats({
          lessons_engaged_count: data.lessons_engaged_count ?? 0,
          assignments_engaged_count: data.assignments_engaged_count ?? 0,
          correct_answers: data.correct_answers ?? 0,
          incorrect_answers: data.incorrect_answers ?? 0,
          answered_questions_total:
            data.answered_questions_total ??
            ((data.correct_answers ?? 0) + (data.incorrect_answers ?? 0)),
          by_subject: {
            verbal: {
              ...defaultSubjectStats("لفظي"),
              ...verbal,
              subject_label: verbal.subject_label || "لفظي",
            },
            quantitative: {
              ...defaultSubjectStats("كمي"),
              ...quantitative,
              subject_label: quantitative.subject_label || "كمي",
            },
          },
        });
      })
      .catch((e) => {
        if (!c)
          setErr(
            typeof e?.message === "string" && e.message.includes("للطلاب")
              ? "هذه البطاقة للطلاب فقط."
              : "تعذر تحميل النتائج. حاول لاحقاً."
          );
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-results-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/10 shadow-2xl motion-safe:animate-[results-sheet_0.35s_ease-out_1]">
        <style>{`
          @keyframes results-sheet {
            from { opacity: 0; transform: translateY(12px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes results-pop {
            from { transform: scale(0.85); opacity: 0.5; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-md">
          <div>
            <h2
              id="student-results-title"
              className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-l from-amber-300 via-orange-400 to-teal-300"
            >
              نتائجي
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              أرقامك في الدروس التي بدأتها أو أنهيت منها نشاطاً
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
            aria-label="إغلاق"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 md:p-8 space-y-5">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-12 w-12 rounded-full border-4 border-teal-400/30 border-t-teal-400 motion-safe:animate-spin" />
            </div>
          )}

          {err && !loading && (
            <div className="rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-100 text-sm px-4 py-3 text-center">
              {err}
            </div>
          )}

          {!loading && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
                <h3 className="text-sm md:text-base font-extrabold text-slate-100 mb-3 text-center">
                  {stats.by_subject?.verbal?.subject_label || "لفظي"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatBubble
                    active={open && !loading}
                    label="الدروس المجتازة"
                    sublabel="من إجمالي دروس اللفظي"
                    value={stats.by_subject?.verbal?.passed_lessons_count}
                    gradient="linear-gradient(145deg, #0f766e 0%, #14b8a6 55%, #67e8f9 100%)"
                    glow="0 12px 36px rgba(20, 184, 166, 0.4)"
                    icon="🏁"
                  />
                  <StatBubble
                    active={open && !loading}
                    label="الدروس المتبقية"
                    sublabel="لم تُجتز بعد"
                    value={stats.by_subject?.verbal?.remaining_lessons_count}
                    gradient="linear-gradient(145deg, #4338ca 0%, #6366f1 50%, #a78bfa 100%)"
                    glow="0 12px 36px rgba(99, 102, 241, 0.42)"
                    icon="📚"
                  />
                  <StatBubble
                    active={open && !loading}
                    label="إجابات صحيحة"
                    sublabel="في اللفظي"
                    value={stats.by_subject?.verbal?.correct_answers}
                    gradient="linear-gradient(145deg, #15803d 0%, #22c55e 55%, #86efac 100%)"
                    glow="0 12px 36px rgba(34, 197, 94, 0.38)"
                    icon="✅"
                  />
                  <StatBubble
                    active={open && !loading}
                    label="إجابات خاطئة"
                    sublabel="في اللفظي"
                    value={stats.by_subject?.verbal?.incorrect_answers}
                    gradient="linear-gradient(145deg, #b45309 0%, #f97316 50%, #fb923c 100%)"
                    glow="0 12px 36px rgba(249, 115, 22, 0.36)"
                    icon="❌"
                  />
                  <StatBubble
                    active={open && !loading}
                    label="إجمالي الأسئلة المجاب عنها"
                    sublabel="صحيح + خطأ"
                    value={stats.by_subject?.verbal?.answered_questions_total}
                    gradient="linear-gradient(145deg, #7c2d12 0%, #ea580c 45%, #f59e0b 100%)"
                    glow="0 12px 36px rgba(234, 88, 12, 0.34)"
                    icon="🧮"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
                <h3 className="text-sm md:text-base font-extrabold text-slate-100 mb-3 text-center">
                  {stats.by_subject?.quantitative?.subject_label || "كمي"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatBubble
                    active={open && !loading}
                    label="الدروس المجتازة"
                    sublabel="من إجمالي دروس الكمي"
                    value={stats.by_subject?.quantitative?.passed_lessons_count}
                    gradient="linear-gradient(145deg, #0f766e 0%, #14b8a6 55%, #67e8f9 100%)"
                    glow="0 12px 36px rgba(20, 184, 166, 0.4)"
                    icon="🏁"
                  />
                  <StatBubble
                    active={open && !loading}
                    label="الدروس المتبقية"
                    sublabel="لم تُجتز بعد"
                    value={stats.by_subject?.quantitative?.remaining_lessons_count}
                    gradient="linear-gradient(145deg, #4338ca 0%, #6366f1 50%, #a78bfa 100%)"
                    glow="0 12px 36px rgba(99, 102, 241, 0.42)"
                    icon="📚"
                  />
                  <StatBubble
                    active={open && !loading}
                    label="إجابات صحيحة"
                    sublabel="في الكمي"
                    value={stats.by_subject?.quantitative?.correct_answers}
                    gradient="linear-gradient(145deg, #15803d 0%, #22c55e 55%, #86efac 100%)"
                    glow="0 12px 36px rgba(34, 197, 94, 0.38)"
                    icon="✅"
                  />
                  <StatBubble
                    active={open && !loading}
                    label="إجابات خاطئة"
                    sublabel="في الكمي"
                    value={stats.by_subject?.quantitative?.incorrect_answers}
                    gradient="linear-gradient(145deg, #b45309 0%, #f97316 50%, #fb923c 100%)"
                    glow="0 12px 36px rgba(249, 115, 22, 0.36)"
                    icon="❌"
                  />
                  <StatBubble
                    active={open && !loading}
                    label="إجمالي الأسئلة المجاب عنها"
                    sublabel="صحيح + خطأ"
                    value={stats.by_subject?.quantitative?.answered_questions_total}
                    gradient="linear-gradient(145deg, #7c2d12 0%, #ea580c 45%, #f59e0b 100%)"
                    glow="0 12px 36px rgba(234, 88, 12, 0.34)"
                    icon="🧮"
                  />
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-[11px] md:text-xs text-slate-500 leading-relaxed px-2">
            الإحصائيات مقسمة إلى لفظي وكمي وتشمل المجتاز والمتبقي والصحيح والخطأ وإجمالي الإجابات.
          </p>
        </div>
      </div>
    </div>
  );
}

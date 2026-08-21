/**
 * Link to the source bank/homework video at the same question number as the site.
 */
export default function QuestionVideoLink({
  video,
  siteQuestionNumber,
  className = "",
  onOpen,
}) {
  if (!video?.url && !video?.id) return null;
  const n = Number(siteQuestionNumber);
  const hasNumber = Number.isFinite(n) && n > 0;
  const label = hasNumber ? `شاهد السؤال رقم ${n}` : "شاهد الفيديو";
  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpen?.({ video, siteQuestionNumber: hasNumber ? n : null })}
    >
      🎥 {label}
    </button>
  );
}

/**
 * VideoWatermark — transparent overlay placed OVER a video iframe.
 * - pointer-events: none  → video controls stay fully clickable
 * - Diagonal repeating text with the user's identity
 * - Low opacity so it doesn't obscure content, but clearly visible in screenshots/recordings
 */

const VideoWatermark = ({ name, email }) => {
  if (!name && !email) return null;

  // Show full name + masked email: "Ahmed · a***@gmail.com"
  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, "$1***$2")
    : "";
  const label = [name, maskedEmail].filter(Boolean).join("  ·  ");

  // Generate a grid of watermark stamps across the overlay
  const stamps = [];
  const cols = 3;
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top = `${(r / rows) * 100 + 5}%`;
      const left = `${(c / cols) * 100 + 5}%`;
      stamps.push(
        <span
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            top,
            left,
            transform: "rotate(-25deg)",
            fontSize: "clamp(9px, 1.2vw, 13px)",
            fontFamily: "monospace",
            fontWeight: 600,
            color: "rgba(255,255,255,0.18)",
            whiteSpace: "nowrap",
            userSelect: "none",
            letterSpacing: "0.05em",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          {label}
        </span>
      );
    }
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {stamps}
    </div>
  );
};

export default VideoWatermark;

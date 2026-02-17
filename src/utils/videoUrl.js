/**
 * Normalize video URL for storage: YouTube → embed, Google Drive view → preview.
 * @param {string} url - Raw URL from user (YouTube, Drive, or direct)
 * @returns {string} URL suitable for embedding/playback
 */
export function normalizeVideoUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const u = url.trim();

  // YouTube
  if (u.includes('youtube.com/watch?v=')) {
    const videoId = u.split('v=')[1].split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (u.includes('youtu.be/')) {
    const videoId = u.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (u.includes('youtube.com/embed/')) return u;

  // Google Drive: /file/d/FILE_ID/view or /open?id=FILE_ID → /file/d/FILE_ID/preview
  const driveMatch = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  const driveOpenMatch = u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
  }

  return u;
}

/**
 * Whether this URL should be shown in an iframe (YouTube, Drive, Vimeo, etc.)
 */
export function isEmbedVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('drive.google.com') ||
    url.includes('vimeo.com')
  );
}

/**
 * Get iframe src for a stored video URL (already normalized or raw).
 */
export function getEmbedVideoSrc(url) {
  if (!url) return null;
  const normalized = normalizeVideoUrl(url);
  if (normalized.includes('youtube.com/embed/')) return normalized;
  if (normalized.includes('youtu.be/')) {
    const id = normalized.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (normalized.includes('drive.google.com/file/d/')) return normalized;
  const vimeoMatch = normalized.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

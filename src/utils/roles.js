/** مدير كامل: كل لوحة التحكم بما فيها المستخدمين والتتبع. */
export const isFullAdmin = (user) => user?.role === "admin";

/** مدير محتوى: رفع فيديوهات، أسئلة، فصول… بدون إدارة المستخدمين. */
export const isContentStaff = (user) =>
  user?.role === "admin" || user?.role === "content_admin";

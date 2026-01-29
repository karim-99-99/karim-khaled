/**
 * Backend API client for Django REST API.
 * When VITE_API_URL is set and user has token, the frontend uses these methods
 * to sync chapters, lessons, questions, videos, and files with the backend.
 */

const getBase = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url || typeof url !== "string") return "";
  return url.replace(/\/$/, "") + "/api";
};

const getToken = () => {
  try {
    const u = localStorage.getItem("currentUser");
    const user = u ? JSON.parse(u) : null;
    return user?.token || null;
  } catch {
    return null;
  }
};

const request = async (path, options = {}) => {
  const base = getBase();
  if (!base) throw new Error("VITE_API_URL is not set");
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : "/" + path}`;
  const headers = { ...(options.headers || {}) };

  // Don't add token for auth endpoints (login/register)
  const isAuthEndpoint =
    path.includes("/auth/login/") || path.includes("/auth/register/");
  if (!isAuthEndpoint) {
    const token = getToken();
    if (token) headers["Authorization"] = `Token ${token}`;
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  } else if (
    options.body != null &&
    options.body !== "" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (fetchError) {
    // Network error (CORS, connection failed, etc.)
    if (
      fetchError.name === "TypeError" &&
      fetchError.message.includes("fetch")
    ) {
      // Check if it's a CORS error or connection error
      const isCorsError =
        fetchError.message.includes("CORS") ||
        fetchError.message.includes("cors");
      const errorMsg = isCorsError
        ? "فشل الاتصال بالخادم بسبب CORS. تحقق من إعدادات CORS_ALLOWED_ORIGINS في Render."
        : "فشل الاتصال بالخادم. قد يكون Backend نائماً (في الخطة المجانية). انتظر 30-60 ثانية ثم جرّب مرة أخرى.";
      throw new Error(errorMsg);
    }
    throw fetchError;
  }

  if (res.status === 401) {
    // Only clear token for non-auth endpoints (auth endpoints can return 401 for invalid credentials)
    if (!isAuthEndpoint) {
      try {
        localStorage.removeItem("currentUser");
      } catch (_) {}
      throw new Error("انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.");
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err.detail ||
      err.error ||
      (Array.isArray(err.detail) ? err.detail[0] : null) ||
      err.password?.[0] ||
      (typeof err === "object" && Object.keys(err || {}).length
        ? JSON.stringify(err)
        : null) ||
      `خطأ ${res.status}`;
    const e = new Error(msg);
    if (
      res.status === 403 &&
      (err.code === "device_restricted" ||
        (typeof msg === "string" && msg.includes("registered device")))
    )
      e.code = "device_restricted";
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
};

export const isBackendOn = () => !!(import.meta.env.VITE_API_URL && getToken());

/**
 * Fetch file from our API (e.g. /media/...) with auth and return a blob URL
 * for use in iframe. Use when file URL is on API host; iframe does not send
 * Authorization so direct src would fail when auth is required.
 * Returns null if URL is external or fetch fails; caller should use original URL.
 */
export const fetchFileAsBlobUrlForViewer = async (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== "string") return null;
  const base = getBase();
  if (!base) return null;
  const apiOrigin = base.replace(/\/api\/?$/, "");
  if (!apiOrigin || !fileUrl.startsWith(apiOrigin)) return null;
  try {
    const token = getToken();
    const res = await fetch(fileUrl, {
      headers: token ? { Authorization: `Token ${token}` } : {},
      mode: "cors",
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};

// ——— Auth ———
export const login = async (username, password) => {
  const data = await request("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return data;
};

export const register = async (payload) => {
  const data = await request("/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
};

export const logout = async () => {
  try {
    await request("/auth/logout/", { method: "POST" });
  } catch (_) {}
};

// ——— Users ———
export const mapUserFromBackend = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  name: u.first_name || u.username,
  first_name: u.first_name,
  last_name: u.last_name,
  phone: u.phone,
  role: u.role,
  isActive: u.is_active_account,
  avatarChoice: u.avatar_choice || null,
  createdAt: u.date_joined,
  permissions: {
    hasAbilitiesAccess: u.has_abilities_access || false,
    hasCollectionAccess: u.has_collection_access || false,
    abilitiesSubjects: {
      verbal: u.abilities_subjects_verbal || false,
      quantitative: u.abilities_subjects_quantitative || false,
    },
    abilitiesCategories: {
      foundation: u.abilities_categories_foundation || false,
      collections: u.abilities_categories_collections || false,
    },
  },
  allowMultiDevice: !!u.allow_multi_device,
});

export const getUsers = async () => {
  const list = await request("/users/");
  const arr = Array.isArray(list) ? list : list?.results || [];
  return arr.map(mapUserFromBackend);
};

export const getUserById = async (userId) => {
  try {
    const data = await request(`/users/${encodeURIComponent(userId)}/`);
    return mapUserFromBackend(data);
  } catch {
    return null;
  }
};

export const updateUser = async (userId, updates) => {
  // Map Frontend format to Backend format
  const backendUpdates = {};
  if (updates.isActive !== undefined)
    backendUpdates.is_active_account = updates.isActive;
  if (updates.first_name !== undefined)
    backendUpdates.first_name = updates.first_name;
  if (updates.last_name !== undefined)
    backendUpdates.last_name = updates.last_name;
  if (updates.email !== undefined) backendUpdates.email = updates.email;
  if (updates.phone !== undefined) backendUpdates.phone = updates.phone;
  if (updates.username !== undefined)
    backendUpdates.username = updates.username;

  // Handle permissions
  if (updates.permissions) {
    const p = updates.permissions;
    if (p.hasAbilitiesAccess !== undefined)
      backendUpdates.has_abilities_access = p.hasAbilitiesAccess;
    if (p.hasCollectionAccess !== undefined)
      backendUpdates.has_collection_access = p.hasCollectionAccess;
    if (p.abilitiesSubjects) {
      if (p.abilitiesSubjects.verbal !== undefined)
        backendUpdates.abilities_subjects_verbal = p.abilitiesSubjects.verbal;
      if (p.abilitiesSubjects.quantitative !== undefined)
        backendUpdates.abilities_subjects_quantitative =
          p.abilitiesSubjects.quantitative;
    }
    if (p.abilitiesCategories) {
      if (p.abilitiesCategories.foundation !== undefined)
        backendUpdates.abilities_categories_foundation =
          p.abilitiesCategories.foundation;
      if (p.abilitiesCategories.collections !== undefined)
        backendUpdates.abilities_categories_collections =
          p.abilitiesCategories.collections;
    }
  }
  if (updates.allowMultiDevice !== undefined)
    backendUpdates.allow_multi_device = !!updates.allowMultiDevice;

  const data = await request(`/users/${encodeURIComponent(userId)}/`, {
    method: "PATCH",
    body: JSON.stringify(backendUpdates),
  });
  return mapUserFromBackend(data);
};

export const deleteUser = async (userId) => {
  await request(`/users/${encodeURIComponent(userId)}/`, { method: "DELETE" });
};

/** Fetch current user profile from API (for refreshing permissions after admin updates). */
export const getMe = async () => {
  try {
    const data = await request("/users/me/");
    return data ? mapUserFromBackend(data) : null;
  } catch {
    return null;
  }
};

export const setMyAvatarChoice = async (avatarChoice) => {
  const data = await request("/users/set_avatar/", {
    method: "POST",
    body: JSON.stringify({ avatar_choice: avatarChoice }),
  });
  return mapUserFromBackend(data);
};

// ——— Sections & structure (read) ———
export const getSections = async () => request("/sections/");

export const getSubjects = async () => {
  const list = await request("/subjects/");
  return Array.isArray(list) ? list : list?.results || [];
};

export const getCategoriesBySubject = async (subjectId) => {
  const list = await request(
    `/categories/?subject_id=${encodeURIComponent(subjectId)}`,
  );
  return Array.isArray(list) ? list : list?.results || [];
};

export const getSubjectById = async (subjectId) => {
  try {
    return await request(`/subjects/${encodeURIComponent(subjectId)}/`);
  } catch {
    return null;
  }
};

export const getSectionById = async (sectionId) => {
  try {
    return await request(`/sections/${encodeURIComponent(sectionId)}/`);
  } catch {
    return null;
  }
};

export const getChaptersByCategory = async (categoryId) => {
  const list = await request(
    `/chapters/?category_id=${encodeURIComponent(categoryId)}`,
  );
  const arr = Array.isArray(list) ? list : list?.results || [];
  return arr.map((ch) => ({
    ...ch,
    has_test: ch.has_test,
    hasTest: ch.items?.some?.((i) => i.has_test),
  }));
};

export const getLevelsByChapter = async (chapterId) => {
  const list = await request(
    `/lessons/?chapter_id=${encodeURIComponent(chapterId)}`,
  );
  const arr = Array.isArray(list) ? list : list?.results || [];
  return arr.map((l) => ({
    ...l,
    hasTest: !!l.has_test,
    id: l.id,
    name: l.name,
  }));
};

// ——— Chapters ———
export const addChapter = async (categoryId, name) => {
  const data = await request("/chapters/", {
    method: "POST",
    body: JSON.stringify({ category: categoryId, name, order: 0 }),
  });
  return data;
};

export const updateChapter = async (chapterId, { name }) => {
  const data = await request(`/chapters/${encodeURIComponent(chapterId)}/`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return data;
};

export const deleteChapter = async (chapterId) => {
  await request(`/chapters/${encodeURIComponent(chapterId)}/`, {
    method: "DELETE",
  });
};

// ——— Lessons ———
export const addLesson = async (chapterId, name, hasTest = true) => {
  const data = await request("/lessons/", {
    method: "POST",
    body: JSON.stringify({
      chapter: chapterId,
      name,
      has_test: hasTest,
      order: 0,
    }),
  });
  return data;
};

export const updateLesson = async (lessonId, { name, has_test }) => {
  const body = {};
  if (name != null) body.name = name;
  if (has_test != null) body.has_test = has_test;
  const data = await request(`/lessons/${encodeURIComponent(lessonId)}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return { ...data, hasTest: !!data.has_test, id: data.id, name: data.name };
};

export const deleteLesson = async (lessonId) => {
  await request(`/lessons/${encodeURIComponent(lessonId)}/`, {
    method: "DELETE",
  });
};

// ——— Helpers for getCategoryById, getChapterById, getItemById (from lists or direct) ———
export const getCategoryById = async (categoryId) => {
  try {
    const data = await request(
      `/categories/${encodeURIComponent(categoryId)}/`,
    );
    return data;
  } catch {
    return null;
  }
};

export const getChapterById = async (chapterId) => {
  try {
    const data = await request(`/chapters/${encodeURIComponent(chapterId)}/`);
    return { ...data, items: data.items || [], hasTest: true };
  } catch {
    return null;
  }
};

export const getItemById = async (itemId) => {
  try {
    const data = await request(`/lessons/${encodeURIComponent(itemId)}/`);
    return { ...data, hasTest: !!data.has_test, id: data.id, name: data.name };
  } catch {
    return null;
  }
};

// ——— Questions ———
const mapQuestionFromBackend = (q) => {
  if (!q || !q.id) {
    // Return default structure if question is invalid
    return {
      id: "",
      question: "",
      questionEn: "",
      explanation: "",
      image: null,
      imageScale: 100,
      imageAlign: "center",
      itemId: null,
      levelId: null,
      answers: [],
    };
  }

  // Load image settings from localStorage if available
  let imageScale = 100;
  let imageAlign = "center";
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(`question_image_settings_${q.id}`);
      if (saved) {
        const settings = JSON.parse(saved);
        imageScale = settings.scale || 100;
        imageAlign = settings.align || "center";
      }
    }
  } catch (e) {
    // Ignore errors, use defaults
    console.warn("Error loading image settings for question:", q.id, e);
  }

  const lessonId =
    q.lesson != null && typeof q.lesson === "object"
      ? q.lesson.id || q.lesson.pk || null
      : q.lesson || null;

  try {
    if (
      q.question_type === "passage" ||
      q.type === "passage" ||
      q.passage_text
    ) {
      return {
        id: q.id || "",
        type: "passage",
        passageText: q.passage_text || q.passageText || "",
        questions: (q.passage_questions || q.questions || []).map((pq) => ({
          id:
            pq.id ||
            `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          question: pq.question || "",
          answers: (pq.answers || []).map((a) => ({
            id: a.answer_id || "a",
            text: a.text || "",
            isCorrect: !!a.is_correct,
          })),
        })),
        itemId: lessonId,
        levelId: lessonId,
      };
    }

    return {
      id: q.id || "",
      question: q.question || "",
      questionEn: q.question_en || "",
      explanation: q.explanation || "",
      image: q.question_image_url || q.question_image || null,
      imageScale: imageScale,
      imageAlign: imageAlign,
      itemId: lessonId,
      levelId: lessonId,
      answers: (q.answers || []).map((a) => ({
        id: a.answer_id || "a",
        key: a.answer_id || "a",
        text: a.text || "",
        isCorrect: !!a.is_correct,
      })),
    };
  } catch (e) {
    console.error("Error mapping question from backend:", e, q);
    // Return safe default structure
    return {
      id: q.id || "",
      question: q.question || "",
      questionEn: q.question_en || "",
      explanation: q.explanation || "",
      image: null,
      imageScale: 100,
      imageAlign: "center",
      itemId: lessonId,
      levelId: lessonId,
      answers: [],
    };
  }
};

export const getQuestions = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.lesson_id) params.set("lesson_id", filters.lesson_id);
    if (filters.chapter_id) params.set("chapter_id", filters.chapter_id);
    if (filters.category_id) params.set("category_id", filters.category_id);
    if (filters.subject_id) params.set("subject_id", filters.subject_id);
    const path = params.toString() ? `/questions/?${params}` : "/questions/";
    const list = await request(path);
    const arr = Array.isArray(list) ? list : list?.results || [];

    // Map questions with error handling for each question
    const mappedQuestions = [];
    for (const q of arr) {
      try {
        const mapped = mapQuestionFromBackend(q);
        if (mapped && mapped.id) {
          mappedQuestions.push(mapped);
        }
      } catch (err) {
        console.error("Error mapping question:", err, q);
        // Skip this question but continue processing others
      }
    }
    return mappedQuestions;
  } catch (err) {
    console.error("Error in getQuestions:", err);
    return [];
  }
};

export const getQuestionsByLevel = async (levelId) => {
  try {
    if (!levelId) {
      console.warn("getQuestionsByLevel called without levelId");
      return [];
    }
    const arr = await getQuestions({ lesson_id: levelId });
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.error("Error in getQuestionsByLevel:", err);
    return [];
  }
};

export const addQuestion = async (
  lessonId,
  { question, questionEn, explanation, answers },
  questionImageFile = null,
) => {
  const body = {
    lesson: lessonId,
    question: question || "",
    question_en: questionEn || "",
    explanation: explanation?.trim() || null, // Optional field - send null if empty
    answers: (answers || []).map((a) => ({
      answer_id: (a.id || a.key || "a").toString().toLowerCase().slice(0, 1),
      text: a.text || "",
      is_correct: !!a.isCorrect,
    })),
  };
  const data = await request("/questions/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const out = mapQuestionFromBackend(data);
  if (questionImageFile) {
    const fd = new FormData();
    fd.append("question_image", questionImageFile);
    await request(`/questions/${encodeURIComponent(data.id)}/`, {
      method: "PATCH",
      body: fd,
    });
  }
  return out;
};

export const updateQuestion = async (
  questionId,
  { question, questionEn, explanation, answers },
  questionImageFile = null,
) => {
  const body = {
    question: question ?? "",
    question_en: questionEn ?? "",
    explanation: explanation?.trim() || null, // Optional field - send null if empty
    answers: (answers || []).map((a) => ({
      answer_id: (a.id || a.key || "a").toString().toLowerCase().slice(0, 1),
      text: a.text || "",
      is_correct: !!a.isCorrect,
    })),
  };
  await request(`/questions/${encodeURIComponent(questionId)}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (questionImageFile) {
    const fd = new FormData();
    fd.append("question_image", questionImageFile);
    await request(`/questions/${encodeURIComponent(questionId)}/`, {
      method: "PATCH",
      body: fd,
    });
  }
  return mapQuestionFromBackend(
    await request(`/questions/${encodeURIComponent(questionId)}/`),
  );
};

export const deleteQuestion = async (questionId) => {
  await request(`/questions/${encodeURIComponent(questionId)}/`, {
    method: "DELETE",
  });
};

// Add passage (special type of question with passage_text and nested questions)
export const addPassage = async (lessonId, { passageText, questions }) => {
  const body = {
    lesson: lessonId,
    question_type: "passage",
    passage_text: passageText || "",
    passage_questions: (questions || []).map((q) => ({
      question: q.question || "",
      answers: (q.answers || []).map((a) => ({
        answer_id: (a.id || "a").toString().toLowerCase().slice(0, 1),
        text: a.text || "",
        is_correct: !!a.isCorrect,
      })),
    })),
  };
  const data = await request("/questions/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapQuestionFromBackend(data);
};

// Update passage
export const updatePassage = async (passageId, { passageText, questions }) => {
  const body = {
    question_type: "passage",
    passage_text: passageText || "",
    passage_questions: (questions || []).map((q) => ({
      question: q.question || "",
      answers: (q.answers || []).map((a) => ({
        answer_id: (a.id || "a").toString().toLowerCase().slice(0, 1),
        text: a.text || "",
        is_correct: !!a.isCorrect,
      })),
    })),
  };
  await request(`/questions/${encodeURIComponent(passageId)}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return mapQuestionFromBackend(
    await request(`/questions/${encodeURIComponent(passageId)}/`),
  );
};

// ——— Videos (file upload and URL-based videos) ———
const videoLessonId = (v) =>
  v.lesson != null && typeof v.lesson === "object"
    ? (v.lesson?.id ?? v.lesson?.pk ?? null)
    : v.lesson;

const mapVideoFromBackend = (v) => {
  const lid = videoLessonId(v);
  return {
    id: v.id,
    title: v.title,
    titleEn: v.description,
    url: v.video_url || v.video_file_url || v.video_file,
    levelId: lid,
    itemId: lid,
    isFileUpload: !!v.video_file,
  };
};

export const getVideos = async (opts = null) => {
  const lessonId = typeof opts === "string" ? opts : (opts?.lesson_id ?? null);
  const chapterId =
    typeof opts === "object" && opts != null ? opts.chapter_id : null;
  const params = new URLSearchParams();
  if (lessonId) params.set("lesson_id", lessonId);
  if (chapterId) params.set("chapter_id", chapterId);
  const qs = params.toString();
  const path = qs ? `/videos/?${qs}` : "/videos/";
  const list = await request(path);
  const arr = Array.isArray(list) ? list : list?.results || [];
  return arr.map(mapVideoFromBackend);
};

export const getVideoByLevel = async (levelId) => {
  const arr = await getVideos(levelId);
  return arr[0] || null;
};

export const addVideo = async (lessonId, formData) => {
  const fd = new FormData();
  fd.append("lesson", lessonId);
  fd.append("title", formData.title || "");
  if (formData.description) fd.append("description", formData.description);
  if (formData.video_file) {
    fd.append("video_file", formData.video_file);
  } else if (formData.video_url) {
    fd.append("video_url", formData.video_url);
  }
  const data = await request("/videos/", { method: "POST", body: fd });
  return mapVideoFromBackend(data);
};

export const updateVideo = async (videoId, formData) => {
  const fd = new FormData();
  if (formData.title != null) fd.append("title", formData.title);
  if (formData.description != null)
    fd.append("description", formData.description);
  if (formData.video_file) {
    fd.append("video_file", formData.video_file);
    // Clear video_url if uploading a file
    fd.append("video_url", "");
  } else if (formData.video_url !== undefined) {
    fd.append("video_url", formData.video_url || "");
    // Clear video_file if setting URL
    if (formData.video_url) {
      fd.append("video_file", "");
    }
  }
  const data = await request(`/videos/${encodeURIComponent(videoId)}/`, {
    method: "PATCH",
    body: fd,
  });
  return mapVideoFromBackend(data);
};

export const deleteVideo = async (videoId) => {
  await request(`/videos/${encodeURIComponent(videoId)}/`, {
    method: "DELETE",
  });
};

// ——— Files ———
const lessonIdFrom = (f) =>
  f.lesson != null && typeof f.lesson === "object"
    ? (f.lesson?.id ?? f.lesson?.pk ?? null)
    : f.lesson;

const mapFileFromBackend = (f) => {
  const lid = lessonIdFrom(f);
  return {
    id: f.id,
    title: f.title,
    fileName: f.title,
    fileType: f.file_type,
    url: f.file_url || f.file,
    levelId: lid,
    itemId: lid,
    isFileUpload: true,
  };
};

export const getFiles = async (opts = null) => {
  const lessonId = typeof opts === "string" ? opts : (opts?.lesson_id ?? null);
  const chapterId =
    typeof opts === "object" && opts != null ? opts.chapter_id : null;
  const params = new URLSearchParams();
  if (lessonId) params.set("lesson_id", lessonId);
  if (chapterId) params.set("chapter_id", chapterId);
  const qs = params.toString();
  const path = qs ? `/files/?${qs}` : "/files/";
  const list = await request(path);
  const arr = Array.isArray(list) ? list : list?.results || [];
  return arr.map(mapFileFromBackend);
};

export const getFileByLevel = async (levelId) => {
  const arr = await getFiles(levelId);
  return arr[0] || null;
};

// ——— Public (no-auth) Foundation content ———
export const getPublicFoundationResources = async (subjectId) => {
  const params = new URLSearchParams();
  if (subjectId) params.set("subject_id", subjectId);
  const qs = params.toString();
  return request(`/public/foundation/${qs ? `?${qs}` : ""}`, { method: "GET" });
};

// Admin-only helpers to upload public foundation content
export const addPublicFoundationVideo = async (subjectId, payload = {}) => {
  const fd = new FormData();
  if (subjectId) fd.append("subject", subjectId);
  fd.append("is_public", "true");
  fd.append("title", payload.title || "");
  if (payload.description) fd.append("description", payload.description);
  if (payload.video_file) {
    fd.append("video_file", payload.video_file);
    fd.append("video_url", "");
  } else if (payload.video_url) {
    fd.append("video_url", payload.video_url);
  }
  return request("/videos/", { method: "POST", body: fd });
};

export const addPublicFoundationFile = async (subjectId, file, meta = {}) => {
  const fd = new FormData();
  if (subjectId) fd.append("subject", subjectId);
  fd.append("is_public", "true");
  fd.append("title", meta.title || file?.name || "ملف مرفق");
  if (meta.description) fd.append("description", meta.description);
  if (meta.file_type) fd.append("file_type", meta.file_type);
  fd.append("file", file);
  return request("/files/", { method: "POST", body: fd });
};

export const addFile = async (lessonId, file, meta = {}) => {
  const fd = new FormData();
  fd.append("lesson", lessonId);
  fd.append("title", meta.title || file?.name || "ملف مرفق");
  if (meta.description) fd.append("description", meta.description);
  fd.append("file", file);
  if (meta.file_type) fd.append("file_type", meta.file_type);
  const data = await request("/files/", { method: "POST", body: fd });
  return mapFileFromBackend(data);
};

export const updateFile = async (fileId, formData) => {
  const fd = new FormData();
  if (formData.title != null) fd.append("title", formData.title);
  if (formData.file) fd.append("file", formData.file);
  if (formData.description != null)
    fd.append("description", formData.description);
  const data = await request(`/files/${encodeURIComponent(fileId)}/`, {
    method: "PATCH",
    body: fd,
  });
  return mapFileFromBackend(data);
};

export const deleteFile = async (fileId) => {
  await request(`/files/${encodeURIComponent(fileId)}/`, { method: "DELETE" });
};

// ——— getSections for flat getSubjects (from sections) ———
export const getSubjectsFromSections = async () => {
  const sections = await getSections();
  const list = [];
  for (const s of sections || []) {
    for (const sub of s.subjects || []) {
      list.push(sub);
    }
  }
  return list;
};

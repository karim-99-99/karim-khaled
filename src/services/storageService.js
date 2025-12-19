// Data storage service using localStorage
// Handles all CRUD operations for subjects, chapters, levels, questions, videos, users, and progress

const STORAGE_KEYS = {
  USERS: 'edu_users',
  SUBJECTS: 'edu_subjects',
  QUESTIONS: 'edu_questions',
  VIDEOS: 'edu_videos',
  PROGRESS: 'edu_progress',
  CURRENT_USER: 'edu_current_user',
};

// Initialize default data if not exists
export const initializeDefaultData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    // Default admin user
    const adminUser = {
      id: 'admin',
      email: 'admin@teacher.com',
      password: 'admin123',
      role: 'admin',
      name: 'المدير',
    };
    
    // Default student user (you can add more)
    const studentUser = {
      id: 'student1',
      email: 'student@test.com',
      password: 'student123',
      role: 'student',
      name: 'طالب تجريبي',
    };
    
    saveUsers([adminUser, studentUser]);
  }

  if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
    const defaultSubjects = [
      {
        id: 'subj1',
        name: 'الرياضيات',
        nameEn: 'Mathematics',
        chapters: [
          { id: 'ch1', name: 'الفصل الأول', nameEn: 'Chapter 1', subjectId: 'subj1' },
          { id: 'ch2', name: 'الفصل الثاني', nameEn: 'Chapter 2', subjectId: 'subj1' },
          { id: 'ch3', name: 'الفصل الثالث', nameEn: 'Chapter 3', subjectId: 'subj1' },
          { id: 'ch4', name: 'الفصل الرابع', nameEn: 'Chapter 4', subjectId: 'subj1' },
          { id: 'ch5', name: 'الفصل الخامس', nameEn: 'Chapter 5', subjectId: 'subj1' },
        ],
      },
      {
        id: 'subj2',
        name: 'العلوم',
        nameEn: 'Science',
        chapters: [
          { id: 'ch6', name: 'الفصل الأول', nameEn: 'Chapter 1', subjectId: 'subj2' },
          { id: 'ch7', name: 'الفصل الثاني', nameEn: 'Chapter 2', subjectId: 'subj2' },
          { id: 'ch8', name: 'الفصل الثالث', nameEn: 'Chapter 3', subjectId: 'subj2' },
          { id: 'ch9', name: 'الفصل الرابع', nameEn: 'Chapter 4', subjectId: 'subj2' },
          { id: 'ch10', name: 'الفصل الخامس', nameEn: 'Chapter 5', subjectId: 'subj2' },
        ],
      },
    ];
    
    saveSubjects(defaultSubjects);
    
    // Initialize levels for each chapter
    const allLevels = [];
    defaultSubjects.forEach(subject => {
      subject.chapters.forEach(chapter => {
        for (let i = 1; i <= 10; i++) {
          allLevels.push({
            id: `level_${chapter.id}_${i}`,
            chapterId: chapter.id,
            number: i,
            name: `المستوى ${i}`,
            nameEn: `Level ${i}`,
          });
        }
      });
    });
    
    // Initialize questions for first level as sample
    const sampleQuestions = [];
    for (let i = 1; i <= 50; i++) {
      sampleQuestions.push({
        id: `q_${allLevels[0].id}_${i}`,
        levelId: allLevels[0].id,
        question: `سؤال تجريبي ${i}: ما هو 2 + 2؟`,
        questionEn: `Sample Question ${i}: What is 2 + 2?`,
        answers: [
          { id: 'a', text: '3', textEn: '3', isCorrect: false },
          { id: 'b', text: '4', textEn: '4', isCorrect: true },
          { id: 'c', text: '5', textEn: '5', isCorrect: false },
          { id: 'd', text: '6', textEn: '6', isCorrect: false },
        ],
      });
    }
    
    saveQuestions(sampleQuestions);
    
    // Initialize sample video for first level
    const sampleVideo = {
      id: `video_${allLevels[0].id}`,
      levelId: allLevels[0].id,
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Sample YouTube video
      title: 'فيديو تعليمي',
      titleEn: 'Educational Video',
    };
    
    saveVideos([sampleVideo]);
  }
};

// Users Management
export const saveUsers = (users) => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const getUsers = () => {
  const users = localStorage.getItem(STORAGE_KEYS.USERS);
  return users ? JSON.parse(users) : [];
};

export const getUserByEmail = (email) => {
  const users = getUsers();
  return users.find(u => u.email === email);
};

export const addUser = (user) => {
  const users = getUsers();
  users.push({ ...user, id: `user_${Date.now()}` });
  saveUsers(users);
};

// Authentication
export const setCurrentUser = (user) => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
};

export const getCurrentUser = () => {
  const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return user ? JSON.parse(user) : null;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// Subjects Management
export const saveSubjects = (subjects) => {
  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
};

export const getSubjects = () => {
  const subjects = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
  return subjects ? JSON.parse(subjects) : [];
};

export const getSubjectById = (id) => {
  const subjects = getSubjects();
  return subjects.find(s => s.id === id);
};

export const updateSubject = (subject) => {
  const subjects = getSubjects();
  const index = subjects.findIndex(s => s.id === subject.id);
  if (index !== -1) {
    subjects[index] = subject;
    saveSubjects(subjects);
  }
};

// Chapters Management
export const getChaptersBySubject = (subjectId) => {
  const subject = getSubjectById(subjectId);
  return subject ? subject.chapters : [];
};

export const getChapterById = (subjectId, chapterId) => {
  const chapters = getChaptersBySubject(subjectId);
  return chapters.find(c => c.id === chapterId);
};

// Levels Management
export const getLevelsByChapter = (chapterId) => {
  const subjects = getSubjects();
  for (const subject of subjects) {
    for (const chapter of subject.chapters) {
      if (chapter.id === chapterId) {
        const levels = [];
        for (let i = 1; i <= 10; i++) {
          levels.push({
            id: `level_${chapterId}_${i}`,
            chapterId: chapterId,
            number: i,
            name: `المستوى ${i}`,
            nameEn: `Level ${i}`,
          });
        }
        return levels;
      }
    }
  }
  return [];
};

export const getLevelById = (levelId) => {
  const parts = levelId.split('_');
  if (parts.length >= 3) {
    const chapterId = parts.slice(1, -1).join('_');
    const levelNumber = parseInt(parts[parts.length - 1]);
    const levels = getLevelsByChapter(chapterId);
    return levels.find(l => l.number === levelNumber);
  }
  return null;
};

// Questions Management
export const saveQuestions = (questions) => {
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
};

export const getQuestions = () => {
  const questions = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
  return questions ? JSON.parse(questions) : [];
};

export const getQuestionsByLevel = (levelId) => {
  const questions = getQuestions();
  return questions.filter(q => q.levelId === levelId);
};

export const addQuestion = (question) => {
  const questions = getQuestions();
  questions.push({ ...question, id: `q_${Date.now()}` });
  saveQuestions(questions);
};

export const updateQuestion = (questionId, updates) => {
  const questions = getQuestions();
  const index = questions.findIndex(q => q.id === questionId);
  if (index !== -1) {
    questions[index] = { ...questions[index], ...updates };
    saveQuestions(questions);
  }
};

export const deleteQuestion = (questionId) => {
  const questions = getQuestions();
  const filtered = questions.filter(q => q.id !== questionId);
  saveQuestions(filtered);
};

// Videos Management
export const saveVideos = (videos) => {
  localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
};

export const getVideos = () => {
  const videos = localStorage.getItem(STORAGE_KEYS.VIDEOS);
  return videos ? JSON.parse(videos) : [];
};

export const getVideoByLevel = (levelId) => {
  const videos = getVideos();
  return videos.find(v => v.levelId === levelId);
};

export const addVideo = (video) => {
  const videos = getVideos();
  videos.push({ ...video, id: `video_${Date.now()}` });
  saveVideos(videos);
};

export const updateVideo = (videoId, updates) => {
  const videos = getVideos();
  const index = videos.findIndex(v => v.id === videoId);
  if (index !== -1) {
    videos[index] = { ...videos[index], ...updates };
    saveVideos(videos);
  }
};

export const deleteVideo = (videoId) => {
  const videos = getVideos();
  const filtered = videos.filter(v => v.id !== videoId);
  saveVideos(filtered);
};

// Progress Management
export const saveProgress = (progress) => {
  const allProgress = getProgress();
  const existingIndex = allProgress.findIndex(
    p => p.userId === progress.userId && p.levelId === progress.levelId
  );
  
  if (existingIndex !== -1) {
    allProgress[existingIndex] = progress;
  } else {
    allProgress.push(progress);
  }
  
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress));
};

export const getProgress = () => {
  const progress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
  return progress ? JSON.parse(progress) : [];
};

export const getUserProgress = (userId) => {
  const allProgress = getProgress();
  return allProgress.filter(p => p.userId === userId);
};

export const getLevelProgress = (userId, levelId) => {
  const allProgress = getProgress();
  return allProgress.find(p => p.userId === userId && p.levelId === levelId);
};



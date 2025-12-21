// Data storage service using localStorage
// Handles all CRUD operations for subjects, chapters, levels, questions, videos, users, and progress

const STORAGE_KEYS = {
  USERS: 'edu_users',
  SECTIONS: 'edu_sections', // تحصيل, قدرات
  SUBJECTS: 'edu_subjects',
  QUESTIONS: 'edu_questions',
  VIDEOS: 'edu_videos',
  PROGRESS: 'edu_progress',
  CURRENT_USER: 'edu_current_user',
};

// Helper function to create default sections (extracted for reuse)
const createDefaultSections = () => {
  // Helper function to generate chapters with items
  function generateChapters(categoryId, chapterCount, itemsPerChapter, includeTests = true) {
    const chapters = [];
    for (let ch = 1; ch <= chapterCount; ch++) {
      const chapterId = `${categoryId}_ch${ch}`;
      const items = [];
      const itemCount = itemsPerChapter;
      
      for (let item = 1; item <= itemCount; item++) {
        const itemId = `${chapterId}_item${item}`;
        items.push({
          id: itemId,
          chapterId: chapterId,
          number: item,
          name: includeTests ? `الدرس ${item}` : `فيديو ${item}`,
          nameEn: includeTests ? `Lesson ${item}` : `Video ${item}`,
          hasTest: includeTests,
        });
      }
      
      chapters.push({
        id: chapterId,
        name: `الفصل ${ch}`,
        nameEn: `Chapter ${ch}`,
        categoryId: categoryId,
        items: items,
      });
    }
    return chapters;
  }
  
  // قسم تحصيل
  const tahseelSection = {
    id: 'section_tahseel',
    name: 'تحصيل',
    nameEn: 'Achievement',
    subjects: [
      {
        id: 'tahseel_math',
        name: 'الرياضيات',
        nameEn: 'Mathematics',
        sectionId: 'section_tahseel',
        categories: [
          {
            id: 'tahseel_math_taasis',
            name: 'التأسيس',
            nameEn: 'Foundation',
            subjectId: 'tahseel_math',
            hasTests: true,
            chapters: generateChapters('tahseel_math_taasis', 10, 20), // 10 chapters, 20 items each
          },
          {
            id: 'tahseel_math_tajmiaat',
            name: 'التجميعات',
            nameEn: 'Collections',
            subjectId: 'tahseel_math',
            hasTests: true,
            chapters: generateChapters('tahseel_math_tajmiaat', 10, 20),
          },
        ],
      },
      {
        id: 'tahseel_bio',
        name: 'الأحياء',
        nameEn: 'Biology',
        sectionId: 'section_tahseel',
        categories: [
          {
            id: 'tahseel_bio_taasis',
            name: 'التأسيس',
            nameEn: 'Foundation',
            subjectId: 'tahseel_bio',
            hasTests: true,
            chapters: generateChapters('tahseel_bio_taasis', 10, 20),
          },
          {
            id: 'tahseel_bio_tajmiaat',
            name: 'التجميعات',
            nameEn: 'Collections',
            subjectId: 'tahseel_bio',
            hasTests: true,
            chapters: generateChapters('tahseel_bio_tajmiaat', 10, 20),
          },
        ],
      },
      {
        id: 'tahseel_physics',
        name: 'الفيزياء',
        nameEn: 'Physics',
        sectionId: 'section_tahseel',
        categories: [
          {
            id: 'tahseel_physics_taasis',
            name: 'التأسيس',
            nameEn: 'Foundation',
            subjectId: 'tahseel_physics',
            hasTests: true,
            chapters: generateChapters('tahseel_physics_taasis', 10, 20),
          },
          {
            id: 'tahseel_physics_tajmiaat',
            name: 'التجميعات',
            nameEn: 'Collections',
            subjectId: 'tahseel_physics',
            hasTests: true,
            chapters: generateChapters('tahseel_physics_tajmiaat', 10, 20),
          },
        ],
      },
      {
        id: 'tahseel_chem',
        name: 'الكيمياء',
        nameEn: 'Chemistry',
        sectionId: 'section_tahseel',
        categories: [
          {
            id: 'tahseel_chem_taasis',
            name: 'التأسيس',
            nameEn: 'Foundation',
            subjectId: 'tahseel_chem',
            hasTests: true,
            chapters: generateChapters('tahseel_chem_taasis', 10, 20),
          },
          {
            id: 'tahseel_chem_tajmiaat',
            name: 'التجميعات',
            nameEn: 'Collections',
            subjectId: 'tahseel_chem',
            hasTests: true,
            chapters: generateChapters('tahseel_chem_tajmiaat', 10, 20),
          },
        ],
      },
    ],
  };

  // قسم قدرات
  const qudratSection = {
    id: 'section_qudrat',
    name: 'قدرات',
    nameEn: 'Aptitude',
    subjects: [
      {
        id: 'qudrat_quanti',
        name: 'الكمي',
        nameEn: 'Quantitative',
        sectionId: 'section_qudrat',
        categories: [
          {
            id: 'qudrat_quanti_taasis',
            name: 'التأسيس',
            nameEn: 'Foundation',
            subjectId: 'qudrat_quanti',
            hasTests: true,
            chapters: generateChapters('qudrat_quanti_taasis', 10, 1), // 10 chapters, 1 item each (video + test)
          },
          {
            id: 'qudrat_quanti_tajmiaat',
            name: 'التجميعات',
            nameEn: 'Collections',
            subjectId: 'qudrat_quanti',
            hasTests: true,
            chapters: generateChapters('qudrat_quanti_tajmiaat', 10, 1),
          },
        ],
      },
      {
        id: 'qudrat_lafzi',
        name: 'اللفظي',
        nameEn: 'Verbal',
        sectionId: 'section_qudrat',
        categories: [
          {
            id: 'qudrat_lafzi_taasis',
            name: 'التأسيس',
            nameEn: 'Foundation',
            subjectId: 'qudrat_lafzi',
            hasTests: true,
            chapters: generateChapters('qudrat_lafzi_taasis', 10, 1), // 10 chapters, 1 item each (video + test)
          },
          {
            id: 'qudrat_lafzi_tajmiaat',
            name: 'التجميعات',
            nameEn: 'Collections',
            subjectId: 'qudrat_lafzi',
            hasTests: true,
            chapters: generateChapters('qudrat_lafzi_tajmiaat', 10, 1),
          },
        ],
      },
    ],
  };

  return [tahseelSection, qudratSection];
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

  if (!localStorage.getItem(STORAGE_KEYS.SECTIONS)) {
    // البنية الجديدة: الأقسام → المواد → التصنيفات → الفصول → الدروس
    const defaultSections = createDefaultSections();
    saveSections(defaultSections);

    // Initialize sample questions and videos for first item of first chapter
    const allItems = [];
    defaultSections.forEach(section => {
      section.subjects.forEach(subject => {
        subject.categories.forEach(category => {
          category.chapters.forEach(chapter => {
            chapter.items.forEach(item => {
              if (item.hasTest) {
                allItems.push(item);
              }
            });
          });
        });
      });
    });

    // Create sample questions for first item with test
    const firstItemWithTest = allItems.find(item => item.hasTest);
    if (firstItemWithTest) {
      const sampleQuestions = [];
      for (let i = 1; i <= 50; i++) {
        sampleQuestions.push({
          id: `q_${firstItemWithTest.id}_${i}`,
          itemId: firstItemWithTest.id,
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
      
      // Initialize sample video for first item
      const sampleVideo = {
        id: `video_${firstItemWithTest.id}`,
        itemId: firstItemWithTest.id,
        url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        title: 'فيديو تعليمي',
        titleEn: 'Educational Video',
      };
      saveVideos([sampleVideo]);
    }
  }

};

// Reset and reinitialize all data (keeps users)
export const resetAndInitializeData = () => {
  // Save current users to restore them later
  const currentUsers = getUsers();
  const currentUser = getCurrentUser();
  
  // Clear all data except users and current user
  localStorage.removeItem(STORAGE_KEYS.SECTIONS);
  localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
  localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
  localStorage.removeItem(STORAGE_KEYS.VIDEOS);
  localStorage.removeItem(STORAGE_KEYS.PROGRESS);
  
  // Create and save default sections
  const defaultSections = createDefaultSections();
  saveSections(defaultSections);
  
  // Initialize sample questions and videos for first item with test
  const allItems = [];
  defaultSections.forEach(section => {
    section.subjects.forEach(subject => {
      subject.categories.forEach(category => {
        category.chapters.forEach(chapter => {
          chapter.items.forEach(item => {
            if (item.hasTest) {
              allItems.push(item);
            }
          });
        });
      });
    });
  });

  // Create sample questions for first item with test
  const firstItemWithTest = allItems.find(item => item.hasTest);
  if (firstItemWithTest) {
    const sampleQuestions = [];
    for (let i = 1; i <= 50; i++) {
      sampleQuestions.push({
        id: `q_${firstItemWithTest.id}_${i}`,
        itemId: firstItemWithTest.id,
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
    
    // Initialize sample video for first item
    const sampleVideo = {
      id: `video_${firstItemWithTest.id}`,
      itemId: firstItemWithTest.id,
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      title: 'فيديو تعليمي',
      titleEn: 'Educational Video',
    };
    saveVideos([sampleVideo]);
  }
  
  // Restore users (after clearing, ensure users exist)
  if (currentUsers.length === 0) {
    // If no users, create default users
    const adminUser = {
      id: 'admin',
      email: 'admin@teacher.com',
      password: 'admin123',
      role: 'admin',
      name: 'المدير',
    };
    
    const studentUser = {
      id: 'student1',
      email: 'student@test.com',
      password: 'student123',
      role: 'student',
      name: 'طالب تجريبي',
    };
    
    saveUsers([adminUser, studentUser]);
  } else {
    saveUsers(currentUsers);
  }
  
  if (currentUser) {
    setCurrentUser(currentUser);
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

// Sections Management
export const saveSections = (sections) => {
  localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
};

export const getSections = () => {
  const sections = localStorage.getItem(STORAGE_KEYS.SECTIONS);
  return sections ? JSON.parse(sections) : [];
};

export const getSectionById = (sectionId) => {
  const sections = getSections();
  return sections.find(s => s.id === sectionId);
};

// Subjects Management (updated to work with new structure)
export const getSubjects = () => {
  // Flatten subjects from all sections
  const sections = getSections();
  const allSubjects = [];
  sections.forEach(section => {
    section.subjects.forEach(subject => {
      allSubjects.push({
        ...subject,
        sectionName: section.name,
        sectionNameEn: section.nameEn,
      });
    });
  });
  return allSubjects;
};

export const getSubjectById = (subjectId) => {
  const sections = getSections();
  for (const section of sections) {
    const subject = section.subjects.find(s => s.id === subjectId);
    if (subject) {
      return { ...subject, sectionName: section.name, sectionNameEn: section.nameEn };
    }
  }
  return null;
};

export const getSubjectsBySection = (sectionId) => {
  const section = getSectionById(sectionId);
  return section ? section.subjects : [];
};

// Categories Management
export const getCategoriesBySubject = (subjectId) => {
  const subject = getSubjectById(subjectId);
  return subject ? subject.categories : [];
};

export const getCategoryById = (categoryId) => {
  const sections = getSections();
  for (const section of sections) {
    for (const subject of section.subjects) {
      const category = subject.categories.find(c => c.id === categoryId);
      if (category) {
        return category;
      }
    }
  }
  return null;
};

// Chapters Management (updated to work with categories)
export const getChaptersByCategory = (categoryId) => {
  const category = getCategoryById(categoryId);
  return category ? category.chapters : [];
};

export const getChapterById = (chapterId) => {
  const sections = getSections();
  for (const section of sections) {
    for (const subject of section.subjects) {
      for (const category of subject.categories) {
        const chapter = category.chapters.find(c => c.id === chapterId);
        if (chapter) {
          return chapter;
        }
      }
    }
  }
  return null;
};

// Legacy support: getChaptersBySubject (for backward compatibility)
export const getChaptersBySubject = (subjectId) => {
  // Return all chapters from all categories in this subject
  const subject = getSubjectById(subjectId);
  if (!subject) return [];
  const allChapters = [];
  subject.categories.forEach(category => {
    allChapters.push(...category.chapters);
  });
  return allChapters;
};

// Items Management (updated from Levels - items are within chapters)
export const getItemsByChapter = (chapterId) => {
  const chapter = getChapterById(chapterId);
  return chapter ? chapter.items : [];
};

export const getItemById = (itemId) => {
  const sections = getSections();
  for (const section of sections) {
    for (const subject of section.subjects) {
      for (const category of subject.categories) {
        for (const chapter of category.chapters) {
          const item = chapter.items.find(i => i.id === itemId);
          if (item) {
            return item;
          }
        }
      }
    }
  }
  return null;
};

// Legacy support: Levels (mapped to items for backward compatibility)
export const getLevelsByChapter = (chapterId) => {
  // Map items to levels format for backward compatibility
  const items = getItemsByChapter(chapterId);
  return items.map(item => ({
    id: item.id,
    chapterId: item.chapterId,
    number: item.number,
    name: item.name,
    nameEn: item.nameEn,
    hasTest: item.hasTest,
  }));
};

export const getLevelById = (levelId) => {
  // For backward compatibility, treat levelId as itemId
  return getItemById(levelId);
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
  // Support both levelId (legacy) and itemId (new)
  const questions = getQuestions();
  return questions.filter(q => q.levelId === levelId || q.itemId === levelId);
};

export const getQuestionsByItem = (itemId) => {
  const questions = getQuestions();
  return questions.filter(q => q.itemId === itemId);
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
  // Support both levelId (legacy) and itemId (new)
  const videos = getVideos();
  return videos.find(v => v.levelId === levelId || v.itemId === levelId);
};

export const getVideoByItem = (itemId) => {
  const videos = getVideos();
  return videos.find(v => v.itemId === itemId);
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








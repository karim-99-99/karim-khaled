// Storage keys
const STORAGE_KEYS = {
  USERS: 'users',
  CURRENT_USER: 'currentUser',
  SECTIONS: 'sections',
  QUESTIONS: 'questions',
  VIDEOS: 'videos',
  PROGRESS: 'progress',
};

// Get current logged in user
export const getCurrentUser = () => {
  try {
    const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Set current logged in user
export const setCurrentUser = (user) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting current user:', error);
  }
};

// Logout - remove current user
export const logout = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  } catch (error) {
    console.error('Error logging out:', error);
  }
};

// Get user by email
export const getUserByEmail = (email) => {
  try {
    const usersJson = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!usersJson) return null;
    
    const users = JSON.parse(usersJson);
    // Case-insensitive email comparison
    const normalizedEmail = email.toLowerCase().trim();
    return users.find(user => user.email.toLowerCase().trim() === normalizedEmail) || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

// Get all users
export const getUsers = () => {
  try {
    const usersJson = localStorage.getItem(STORAGE_KEYS.USERS);
    return usersJson ? JSON.parse(usersJson) : [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

// Reset all data (helper function for debugging)
export const resetAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.SECTIONS);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
  localStorage.removeItem(STORAGE_KEYS.VIDEOS);
  localStorage.removeItem(STORAGE_KEYS.PROGRESS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  console.log('All data cleared. Reloading...');
  window.location.reload();
};

// Make resetAllData available globally for debugging
if (typeof window !== 'undefined') {
  window.resetAllData = resetAllData;
  window.getStorageData = () => {
    return {
      sections: JSON.parse(localStorage.getItem(STORAGE_KEYS.SECTIONS) || '[]'),
      users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
      currentUser: JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'),
    };
  };
}

// Initialize default data (users, sections, etc.)
export const initializeDefaultData = () => {
  try {
    // Initialize default users if they don't exist
    const existingUsers = getUsers();
    if (existingUsers.length === 0) {
      const defaultUsers = [
        {
          id: '1',
          name: 'طالب تجريبي',
          email: 'student@test.com',
          password: 'student123',
          role: 'student'
        },
        {
          id: '2',
          name: 'مدير',
          email: 'admin@teacher.com',
          password: 'admin123',
          role: 'admin'
        }
      ];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    }

    // Initialize sections if they don't exist or if structure is invalid
    const existingSections = localStorage.getItem(STORAGE_KEYS.SECTIONS);
    let shouldInitialize = !existingSections;
    
    // Check if existing sections have the correct structure (with categories, 10 chapters, 20 lessons each)
    if (existingSections && !shouldInitialize) {
      try {
        const sections = JSON.parse(existingSections);
        // Check if any section has subjects with empty or missing categories
        const needsUpdate = sections.some(section => 
          section.subjects.some(subject => 
            !subject.categories || subject.categories.length === 0 ||
            subject.categories.some(category => 
              !category.chapters || category.chapters.length !== 10 ||
              category.chapters.some(chapter => 
                !chapter.items || chapter.items.length !== 20
              )
            )
          )
        );
        shouldInitialize = needsUpdate;
      } catch (e) {
        shouldInitialize = true;
      }
    }
    
    if (shouldInitialize) {
      // Helper function to create category with 10 chapters, each with 20 lessons
      const createSampleCategory = (id, name, hasTests = true) => {
        const chapters = [];
        // Create 10 chapters
        for (let ch = 1; ch <= 10; ch++) {
          const items = [];
          // Create 20 lessons for each chapter
          for (let lesson = 1; lesson <= 20; lesson++) {
            items.push({
              id: `${id}_chapter_${ch}_item_${lesson}`,
              name: `الدرس ${lesson}`,
              hasTest: hasTests
            });
          }
          chapters.push({
            id: `${id}_chapter_${ch}`,
            name: `الفصل ${ch}`,
            items: items
          });
        }
        return {
          id,
          name,
          hasTests,
          chapters: chapters
        };
      };

      const defaultSections = [
        {
          id: 'section_tahseel',
          name: 'تحصيل',
          subjects: [
            {
              id: 'subject_math',
              name: 'الرياضيات',
              categories: [
                createSampleCategory('subject_math_tasees', 'التأسيس', true),
                createSampleCategory('subject_math_tajmeat', 'التجميعات', true)
              ]
            },
            {
              id: 'subject_biology',
              name: 'الأحياء',
              categories: [
                createSampleCategory('subject_biology_tasees', 'التأسيس', true),
                createSampleCategory('subject_biology_tajmeat', 'التجميعات', true)
              ]
            },
            {
              id: 'subject_physics',
              name: 'الفيزياء',
              categories: [
                createSampleCategory('subject_physics_tasees', 'التأسيس', true),
                createSampleCategory('subject_physics_tajmeat', 'التجميعات', true)
              ]
            },
            {
              id: 'subject_chemistry',
              name: 'الكيمياء',
              categories: [
                createSampleCategory('subject_chemistry_tasees', 'التأسيس', true),
                createSampleCategory('subject_chemistry_tajmeat', 'التجميعات', true)
              ]
            }
          ]
        },
        {
          id: 'section_qudrat',
          name: 'قدرات',
          subjects: [
            {
              id: 'subject_quantitative',
              name: 'الكمي',
              categories: [
                createSampleCategory('subject_quantitative_tasees', 'التأسيس', true),
                createSampleCategory('subject_quantitative_tajmeat', 'التجميعات', true)
              ]
            },
            {
              id: 'subject_verbal',
              name: 'اللفظي',
              categories: [
                createSampleCategory('subject_verbal_tasees', 'التأسيس', true),
                createSampleCategory('subject_verbal_tajmeat', 'التجميعات', true)
              ]
            }
          ]
        }
      ];
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(defaultSections));
    }

    // Initialize other data if needed
    if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.VIDEOS)) {
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
};

// Placeholder exports for other functions - these need to be implemented
export const getSections = () => {
  try {
    const sectionsJson = localStorage.getItem(STORAGE_KEYS.SECTIONS);
    return sectionsJson ? JSON.parse(sectionsJson) : [];
  } catch (error) {
    console.error('Error getting sections:', error);
    return [];
  }
};

export const getSectionById = (sectionId) => {
  try {
    const sections = getSections();
    return sections.find(section => section.id === sectionId) || null;
  } catch (error) {
    console.error('Error getting section by id:', error);
    return null;
  }
};

export const getSubjectById = (subjectId) => {
  try {
    const sections = getSections();
    for (const section of sections) {
      const subject = section.subjects.find(s => s.id === subjectId);
      if (subject) return subject;
    }
    return null;
  } catch (error) {
    console.error('Error getting subject by id:', error);
    return null;
  }
};
// Get categories by subject ID
export const getCategoriesBySubject = (subjectId) => {
  try {
    const subject = getSubjectById(subjectId);
    return subject ? (subject.categories || []) : [];
  } catch (error) {
    console.error('Error getting categories by subject:', error);
    return [];
  }
};

// Get category by ID
export const getCategoryById = (categoryId) => {
  try {
    const sections = getSections();
    for (const section of sections) {
      for (const subject of section.subjects) {
        const category = (subject.categories || []).find(c => c.id === categoryId);
        if (category) return category;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting category by id:', error);
    return null;
  }
};

// Get chapters by category ID
export const getChaptersByCategory = (categoryId) => {
  try {
    const category = getCategoryById(categoryId);
    return category ? (category.chapters || []) : [];
  } catch (error) {
    console.error('Error getting chapters by category:', error);
    return [];
  }
};

// Get items by chapter ID
export const getItemsByChapter = (chapterId) => {
  try {
    const chapter = getChapterById(chapterId);
    return chapter ? (chapter.items || []) : [];
  } catch (error) {
    console.error('Error getting items by chapter:', error);
    return [];
  }
};

// Get chapter by ID
export const getChapterById = (chapterId) => {
  try {
    const sections = getSections();
    for (const section of sections) {
      for (const subject of section.subjects) {
        for (const category of (subject.categories || [])) {
          const chapter = (category.chapters || []).find(ch => ch.id === chapterId);
          if (chapter) return chapter;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting chapter by id:', error);
    return null;
  }
};

// Get item by ID (item = lesson/level)
export const getItemById = (itemId) => {
  try {
    const sections = getSections();
    for (const section of sections) {
      for (const subject of section.subjects) {
        for (const category of (subject.categories || [])) {
          for (const chapter of (category.chapters || [])) {
            const item = (chapter.items || []).find(i => i.id === itemId);
            if (item) return item;
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting item by id:', error);
    return null;
  }
};

// Get level by ID (alias for getItemById)
export const getLevelById = (levelId) => {
  return getItemById(levelId);
};

// Get questions by level/item ID
export const getQuestionsByLevel = (levelId) => {
  try {
    const questionsJson = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!questionsJson) return [];
    const allQuestions = JSON.parse(questionsJson);
    return allQuestions.filter(q => q.itemId === levelId || q.levelId === levelId);
  } catch (error) {
    console.error('Error getting questions by level:', error);
    return [];
  }
};

// Get video by level/item ID
export const getVideoByLevel = (levelId) => {
  try {
    const videosJson = localStorage.getItem(STORAGE_KEYS.VIDEOS);
    if (!videosJson) return null;
    const allVideos = JSON.parse(videosJson);
    return allVideos.find(v => v.itemId === levelId || v.levelId === levelId) || null;
  } catch (error) {
    console.error('Error getting video by level:', error);
    return null;
  }
};

// Save progress
export const saveProgress = (progressData) => {
  try {
    const progressJson = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    const allProgress = progressJson ? JSON.parse(progressJson) : [];
    
    // Remove existing progress for this user and item
    const filtered = allProgress.filter(
      p => !(p.userId === progressData.userId && (p.itemId === progressData.itemId || p.levelId === progressData.levelId))
    );
    
    // Add new progress
    filtered.push(progressData);
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error saving progress:', error);
  }
};

// Get level progress for a user
export const getLevelProgress = (userId, itemId) => {
  try {
    const progressJson = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (!progressJson) return null;
    const allProgress = JSON.parse(progressJson);
    return allProgress.find(
      p => p.userId === userId && (p.itemId === itemId || p.levelId === itemId)
    ) || null;
  } catch (error) {
    console.error('Error getting level progress:', error);
    return null;
  }
};

// Update chapter name (admin function)
export const updateChapterName = (chapterId, newName) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        for (const category of (subject.categories || [])) {
          const chapterIndex = (category.chapters || []).findIndex(ch => ch.id === chapterId);
          if (chapterIndex !== -1) {
            category.chapters[chapterIndex].name = newName;
            updated = true;
            break;
          }
        }
        if (updated) break;
      }
      if (updated) break;
    }
    
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
    }
  } catch (error) {
    console.error('Error updating chapter name:', error);
  }
};

// Update item name (admin function)
export const updateItemName = (itemId, newName) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        for (const category of (subject.categories || [])) {
          for (const chapter of (category.chapters || [])) {
            const itemIndex = (chapter.items || []).findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
              chapter.items[itemIndex].name = newName;
              updated = true;
              break;
            }
          }
          if (updated) break;
        }
        if (updated) break;
      }
      if (updated) break;
    }
    
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
    }
  } catch (error) {
    console.error('Error updating item name:', error);
  }
};
// Get all subjects from all sections
export const getSubjects = () => {
  try {
    const sections = getSections();
    const allSubjects = [];
    sections.forEach(section => {
      section.subjects.forEach(subject => {
        allSubjects.push(subject);
      });
    });
    return allSubjects;
  } catch (error) {
    console.error('Error getting subjects:', error);
    return [];
  }
};

// Get levels/items by chapter ID
export const getLevelsByChapter = (chapterId) => {
  try {
    const chapter = getChapterById(chapterId);
    return chapter ? (chapter.items || []) : [];
  } catch (error) {
    console.error('Error getting levels by chapter:', error);
    return [];
  }
};

// Get all questions
export const getQuestions = () => {
  try {
    const questionsJson = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    return questionsJson ? JSON.parse(questionsJson) : [];
  } catch (error) {
    console.error('Error getting questions:', error);
    return [];
  }
};

// Add question
export const addQuestion = (questionData) => {
  try {
    const questions = getQuestions();
    const newQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...questionData,
      itemId: questionData.levelId || questionData.itemId,
      createdAt: new Date().toISOString(),
    };
    questions.push(newQuestion);
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  } catch (error) {
    console.error('Error adding question:', error);
  }
};

// Update question
export const updateQuestion = (questionId, questionData) => {
  try {
    const questions = getQuestions();
    const index = questions.findIndex(q => q.id === questionId);
    if (index !== -1) {
      questions[index] = {
        ...questions[index],
        ...questionData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    }
  } catch (error) {
    console.error('Error updating question:', error);
  }
};

// Delete question
export const deleteQuestion = (questionId) => {
  try {
    const questions = getQuestions();
    const filtered = questions.filter(q => q.id !== questionId);
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting question:', error);
  }
};
// Get all videos
export const getVideos = () => {
  try {
    const videosJson = localStorage.getItem(STORAGE_KEYS.VIDEOS);
    return videosJson ? JSON.parse(videosJson) : [];
  } catch (error) {
    console.error('Error getting videos:', error);
    return [];
  }
};

// Add video
export const addVideo = (videoData) => {
  try {
    const videos = getVideos();
    const newVideo = {
      id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...videoData,
      itemId: videoData.levelId || videoData.itemId,
      createdAt: new Date().toISOString(),
    };
    videos.push(newVideo);
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
  } catch (error) {
    console.error('Error adding video:', error);
  }
};

// Update video
export const updateVideo = (videoId, videoData) => {
  try {
    const videos = getVideos();
    const index = videos.findIndex(v => v.id === videoId);
    if (index !== -1) {
      videos[index] = {
        ...videos[index],
        ...videoData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
    }
  } catch (error) {
    console.error('Error updating video:', error);
  }
};

// Delete video
export const deleteVideo = (videoId) => {
  try {
    const videos = getVideos();
    const filtered = videos.filter(v => v.id !== videoId);
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting video:', error);
  }
};

// Storage keys
const STORAGE_KEYS = {
  USERS: 'users',
  CURRENT_USER: 'currentUser',
  SECTIONS: 'sections',
  QUESTIONS: 'questions',
  VIDEOS: 'videos',
  FILES: 'files',
  PROGRESS: 'progress',
};

// Simple memory cache to reduce localStorage reads
const memoryCache = {
  data: {},
  get(key) {
    return this.data[key];
  },
  set(key, value) {
    this.data[key] = value;
  },
  invalidate(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
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

// Set avatar choice for current user (local mode)
export const setCurrentUserAvatarChoice = (avatarChoice) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;
    const updated = { ...currentUser, avatarChoice };
    setCurrentUser(updated);

    // If user exists in USERS list (local auth), update it too
    try {
      const users = getUsers();
      const idx = users.findIndex((u) => u.id === updated.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], avatarChoice };
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    } catch (_) {}

    return updated;
  } catch (e) {
    console.error('Error setting avatar choice:', e);
    return null;
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

// Get user by username
export const getUserByUsername = (username) => {
  try {
    const usersJson = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!usersJson) return null;
    
    const users = JSON.parse(usersJson);
    const normalizedUsername = username.toLowerCase().trim();
    return users.find(user => user.username && user.username.toLowerCase().trim() === normalizedUsername) || null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
};

// Get user by ID
export const getUserById = (userId) => {
  try {
    const usersJson = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!usersJson) return null;
    
    const users = JSON.parse(usersJson);
    return users.find(user => user.id === userId) || null;
  } catch (error) {
    console.error('Error getting user by id:', error);
    return null;
  }
};

// Add new user (registration)
export const addUser = (userData) => {
  try {
    const users = getUsers();
    // Check if email already exists
    if (getUserByEmail(userData.email)) {
      throw new Error('البريد الإلكتروني مستخدم بالفعل');
    }
    // Check if username already exists
    if (userData.username && getUserByUsername(userData.username)) {
      throw new Error('اسم المستخدم مستخدم بالفعل');
    }
    
    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...userData,
      role: userData.role || 'student',
      isActive: false, // New users are inactive by default
      // Access permissions
      permissions: userData.permissions || {
        hasAbilitiesAccess: false,
        hasCollectionAccess: false,
        abilitiesSubjects: {
          verbal: false,
          quantitative: false
        }
      },
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};

// Update user (for admin to activate/deactivate or update info)
export const updateUser = (userId, updates) => {
  try {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      throw new Error('المستخدم غير موجود');
    }
    
    // If updating email, check if it's not used by another user
    if (updates.email && updates.email !== users[index].email) {
      const existingUser = getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('البريد الإلكتروني مستخدم بالفعل');
      }
    }
    
    // If updating username, check if it's not used by another user
    if (updates.username && updates.username !== users[index].username) {
      const existingUser = getUserByUsername(updates.username);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('اسم المستخدم مستخدم بالفعل');
      }
    }
    
    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // If updating current user, update it in localStorage as well
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(users[index]);
    }
    
    return users[index];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user
export const deleteUser = (userId) => {
  try {
    const users = getUsers();
    const filtered = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
    
    // If deleting current user, logout
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      logout();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Reset all data (helper function for debugging)
export const resetAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.SECTIONS);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
  localStorage.removeItem(STORAGE_KEYS.VIDEOS);
  localStorage.removeItem(STORAGE_KEYS.FILES);
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
          username: 'student',
          email: 'student@test.com',
          password: 'student123',
          phone: '',
          role: 'student',
          isActive: true,
          permissions: {
            hasAbilitiesAccess: true,
            // "تحصيلي" section removed — keep field for backward compatibility.
            hasCollectionAccess: false,
            abilitiesSubjects: {
              verbal: true,
              quantitative: true
            }
          }
        },
        {
          id: '2',
          name: 'مدير',
          username: 'admin',
          email: 'admin@teacher.com',
          password: 'admin123',
          phone: '',
          role: 'admin',
          isActive: true
        }
      ];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    } else {
      // Update existing users to have isActive field if missing
      let needsUpdate = false;
      const updatedUsers = existingUsers.map(user => {
        let updated = false;
        const userUpdate = { ...user };
        
        if (user.isActive === undefined) {
          updated = true;
          userUpdate.username = user.username || user.email.split('@')[0];
          userUpdate.isActive = user.role === 'admin' ? true : false;
        }
        if (!user.username && user.email) {
          updated = true;
          userUpdate.username = user.email.split('@')[0];
        }
        // Add permissions if missing
        if (!user.permissions) {
          updated = true;
          userUpdate.permissions = {
            hasAbilitiesAccess: false,
            hasCollectionAccess: false,
            abilitiesSubjects: {
              verbal: false,
              quantitative: false
            }
          };
        }
        
        if (updated) {
          needsUpdate = true;
        }
        return userUpdate;
      });
      if (needsUpdate) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      }
    }

    // Initialize sections if they don't exist or if structure is invalid
    const existingSections = localStorage.getItem(STORAGE_KEYS.SECTIONS);
    let shouldInitialize = !existingSections;
    
    // Check if existing sections have the correct structure (with categories, 10 chapters, 20 lessons each)
    if (existingSections && !shouldInitialize) {
      try {
        // Remove "تحصيلي" section entirely (migration for existing users).
        const parsed = JSON.parse(existingSections);
        const sections = Array.isArray(parsed)
          ? parsed.filter((s) => s && s.id !== 'قسم_تحصيلي')
          : [];
        if (Array.isArray(parsed) && sections.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
        }

        // If after removal we don't have "قدرات", re-initialize.
        if (!sections.some((s) => s?.id === 'قسم_قدرات')) {
          shouldInitialize = true;
        }

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
              id: `${id}_فصل_${ch}_درس_${lesson}`,
              name: `الدرس ${lesson}`,
              hasTest: hasTests
            });
          }
          chapters.push({
            id: `${id}_فصل_${ch}`,
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

      // Only "قدرات" section remains (تحصيلي removed).
      const defaultSections = [
        {
          id: 'قسم_قدرات',
          name: 'قدرات',
          subjects: [
            {
              id: 'مادة_الكمي',
              name: 'الكمي',
              categories: [
                createSampleCategory('مادة_الكمي_تأسيس', 'التأسيس', true),
                createSampleCategory('مادة_الكمي_تجميعات', 'التجميعات', true)
              ]
            },
            {
              id: 'مادة_اللفظي',
              name: 'اللفظي',
              categories: [
                createSampleCategory('مادة_اللفظي_تأسيس', 'التأسيس', true),
                createSampleCategory('مادة_اللفظي_تجميعات', 'التجميعات', true)
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
    if (!localStorage.getItem(STORAGE_KEYS.FILES)) {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify([]));
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
    // Check cache first
    const cached = memoryCache.get(STORAGE_KEYS.SECTIONS);
    if (cached) return (cached || []).filter((s) => s && s.id !== 'قسم_تحصيلي');
    
    // Load from localStorage
    const sectionsJson = localStorage.getItem(STORAGE_KEYS.SECTIONS);
    const parsed = sectionsJson ? JSON.parse(sectionsJson) : [];
    const sections = Array.isArray(parsed) ? parsed.filter((s) => s && s.id !== 'قسم_تحصيلي') : [];
    
    // Cache the result
    memoryCache.set(STORAGE_KEYS.SECTIONS, sections);
    return sections;
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
    if (!sections || sections.length === 0) {
      return [];
    }
    const allSubjects = [];
    sections.forEach(section => {
      if (section && section.subjects && Array.isArray(section.subjects)) {
        section.subjects.forEach(subject => {
          if (subject) {
            allSubjects.push(subject);
          }
        });
      }
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
    // Check cache first
    const cached = memoryCache.get(STORAGE_KEYS.QUESTIONS);
    if (cached) return cached;
    
    // Load from localStorage
    const questionsJson = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    const questions = questionsJson ? JSON.parse(questionsJson) : [];
    
    // Cache the result
    memoryCache.set(STORAGE_KEYS.QUESTIONS, questions);
    return questions;
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
    // Invalidate cache
    memoryCache.invalidate(STORAGE_KEYS.QUESTIONS);
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
        itemId: questionData.levelId || questionData.itemId || questions[index].itemId,
        levelId: questionData.levelId || questions[index].levelId,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
      // Invalidate cache
      memoryCache.invalidate(STORAGE_KEYS.QUESTIONS);
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
    // Invalidate cache
    memoryCache.invalidate(STORAGE_KEYS.QUESTIONS);
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

// Add chapter to category
export const addChapterToCategory = (categoryId, chapterName) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        const category = (subject.categories || []).find(c => c.id === categoryId);
        if (category) {
          const newChapter = {
            id: `${categoryId}_chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: chapterName,
            items: []
          };
          if (!category.chapters) {
            category.chapters = [];
          }
          category.chapters.push(newChapter);
          updated = true;
          break;
        }
      }
      if (updated) break;
    }
    
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding chapter:', error);
    return false;
  }
};

// Delete chapter from category
export const deleteChapterFromCategory = (chapterId) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        for (const category of (subject.categories || [])) {
          const chapterIndex = (category.chapters || []).findIndex(ch => ch.id === chapterId);
          if (chapterIndex !== -1) {
            category.chapters.splice(chapterIndex, 1);
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
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return false;
  }
};

// Add item/lesson to chapter
export const addItemToChapter = (chapterId, itemName, hasTest = true) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        for (const category of (subject.categories || [])) {
          const chapter = (category.chapters || []).find(ch => ch.id === chapterId);
          if (chapter) {
            const newItem = {
              id: `${chapterId}_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: itemName,
              hasTest: hasTest
            };
            if (!chapter.items) {
              chapter.items = [];
            }
            chapter.items.push(newItem);
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
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding item:', error);
    return false;
  }
};

// Delete item/lesson from chapter
export const deleteItemFromChapter = (itemId) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        for (const category of (subject.categories || [])) {
          for (const chapter of (category.chapters || [])) {
            const itemIndex = (chapter.items || []).findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
              chapter.items.splice(itemIndex, 1);
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
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting item:', error);
    return false;
  }
};

// Get file attachment by level/item ID
export const getFileByLevel = (levelId) => {
  try {
    const filesJson = localStorage.getItem(STORAGE_KEYS.FILES);
    if (!filesJson) return null;
    const allFiles = JSON.parse(filesJson);
    return allFiles.find(f => f.itemId === levelId || f.levelId === levelId) || null;
  } catch (error) {
    console.error('Error getting file by level:', error);
    return null;
  }
};

// Get all files
export const getFiles = () => {
  try {
    const filesJson = localStorage.getItem(STORAGE_KEYS.FILES);
    return filesJson ? JSON.parse(filesJson) : [];
  } catch (error) {
    console.error('Error getting files:', error);
    return [];
  }
};

// Add file attachment metadata
export const addFile = (fileData) => {
  try {
    const files = getFiles();
    const newFile = {
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...fileData,
      itemId: fileData.levelId || fileData.itemId,
      createdAt: new Date().toISOString(),
    };
    files.push(newFile);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
  } catch (error) {
    console.error('Error adding file:', error);
  }
};

// Update file attachment metadata
export const updateFile = (fileId, fileData) => {
  try {
    const files = getFiles();
    const index = files.findIndex(f => f.id === fileId);
    if (index !== -1) {
      files[index] = {
        ...files[index],
        ...fileData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
    }
  } catch (error) {
    console.error('Error updating file:', error);
  }
};

// Delete file attachment metadata
export const deleteFile = (fileId) => {
  try {
    const files = getFiles();
    const filtered = files.filter(f => f.id !== fileId);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Get classrooms by subject ID
export const getClassroomsBySubject = (subjectId) => {
  try {
    const subject = getSubjectById(subjectId);
    return subject ? (subject.classrooms || []) : [];
  } catch (error) {
    console.error('Error getting classrooms by subject:', error);
    return [];
  }
};

// Add classroom to subject
export const addClassroomToSubject = (subjectId, classroomName) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      const subject = section.subjects.find(s => s.id === subjectId);
      if (subject) {
        const newClassroom = {
          id: `${subjectId}_classroom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: classroomName,
          lessons: []
        };
        if (!subject.classrooms) {
          subject.classrooms = [];
        }
        subject.classrooms.push(newClassroom);
        updated = true;
        break;
      }
    }
    
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding classroom:', error);
    return false;
  }
};

// Delete classroom from subject
export const deleteClassroomFromSubject = (classroomId) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        if (subject.classrooms) {
          const classroomIndex = subject.classrooms.findIndex(c => c.id === classroomId);
          if (classroomIndex !== -1) {
            subject.classrooms.splice(classroomIndex, 1);
            updated = true;
            break;
          }
        }
      }
      if (updated) break;
    }
    
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting classroom:', error);
    return false;
  }
};

// Get classroom by ID
export const getClassroomById = (classroomId) => {
  try {
    const sections = getSections();
    for (const section of sections) {
      for (const subject of section.subjects) {
        if (subject.classrooms) {
          const classroom = subject.classrooms.find(c => c.id === classroomId);
          if (classroom) return classroom;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting classroom by id:', error);
    return null;
  }
};

// Add lesson to classroom
export const addLessonToClassroom = (classroomId, lessonName, hasTest = true) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        if (subject.classrooms) {
          const classroom = subject.classrooms.find(c => c.id === classroomId);
          if (classroom) {
            const newLesson = {
              id: `${classroomId}_lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: lessonName,
              hasTest: hasTest
            };
            if (!classroom.lessons) {
              classroom.lessons = [];
            }
            classroom.lessons.push(newLesson);
            updated = true;
            break;
          }
        }
      }
      if (updated) break;
    }
    
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding lesson to classroom:', error);
    return false;
  }
};

// Delete lesson from classroom
export const deleteLessonFromClassroom = (lessonId) => {
  try {
    const sections = getSections();
    let updated = false;
    
    for (const section of sections) {
      for (const subject of section.subjects) {
        if (subject.classrooms) {
          for (const classroom of subject.classrooms) {
            if (classroom.lessons) {
              const lessonIndex = classroom.lessons.findIndex(l => l.id === lessonId);
              if (lessonIndex !== -1) {
                classroom.lessons.splice(lessonIndex, 1);
                updated = true;
                break;
              }
            }
          }
          if (updated) break;
        }
      }
      if (updated) break;
    }
    
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting lesson from classroom:', error);
    return false;
  }
};

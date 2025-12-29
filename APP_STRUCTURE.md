# Application Structure Guide

## 📁 Core Application Files

### Main Entry Point
- **`src/App.jsx`** - Main app component, renders `SinglePage`
- **`src/main.jsx`** - React entry point
- **`src/pages/SinglePage.jsx`** - Main single-page component (all sections in one page)

---

## 🔐 Login & Authentication

### Login Page
- **Location:** `src/pages/Login.jsx`
- **Function:** User authentication form (email/password)
- **Features:**
  - Email and password input
  - Validates user credentials
  - Redirects to admin dashboard or home page based on user role
  - Default accounts:
    - Student: `student@test.com` / `student123`
    - Admin: `admin@teacher.com` / `admin123`

### Authentication Service
- **Location:** `src/services/storageService.js`
- **Functions:**
  - `getCurrentUser()` - Get logged in user
  - `setCurrentUser(user)` - Save current user
  - `logout()` - Logout user
  - `getUserByEmail(email)` - Get user by email

---

## 📚 Courses Content Structure

### Main Course Pages (in SinglePage.jsx)

The app is now a **single-page application** with sections:

1. **Landing Page** (`id="landing"`)
   - Hero section with "نظام تعليمي متكامل"
   - Features section
   - Located in: `src/pages/SinglePage.jsx` (lines 44-101)

2. **Courses Page** (`id="courses"`)
   - Displays "تحصيل" and "قدرات" cards
   - Each card has "اكتشف دوراتنا" button
   - Shows subjects and categories when selected
   - Located in: `src/pages/SinglePage.jsx` (lines 103-220)

3. **About Page** (`id="about"`)
   - Located in: `src/pages/SinglePage.jsx` (lines 305-325)

4. **Contact Page** (`id="contact"`)
   - Located in: `src/pages/SinglePage.jsx` (lines 327-348)

### Course Navigation Flow

```
SinglePage (Courses Section)
  ├── Select "تحصيل" or "قدرات"
  ├── Select Subject (e.g., "الرياضيات", "الكمي")
  ├── Select Category (e.g., "تأسيس", "تجميعات")
  └── Select Chapter → Select Lesson (Item)
       ├── Watch Video (Video.jsx)
       └── Take Quiz (Quiz.jsx)
```

### Individual Course Pages (Not currently used in SinglePage, but exist)

- **`src/pages/CoursesPage.jsx`** - Alternative courses listing page
- **`src/pages/AllCoursesPage.jsx`** - All courses grid view
- **`src/pages/Subjects.jsx`** - Lists subjects in a section
- **`src/pages/Categories.jsx`** - Lists categories in a subject
- **`src/pages/Chapters.jsx`** - Lists chapters in a category
- **`src/pages/Levels.jsx`** - Lists lessons/items in a chapter

---

## 🎥 Videos

### Video Display
- **Location:** `src/pages/Video.jsx`
- **Function:** Displays video for a specific lesson/item
- **Usage:** When user clicks "مشاهدة الفيديو" button

### Video Modal Component
- **Location:** `src/components/VideoModal.jsx`
- **Function:** Modal component to play videos
- **Usage:** Used in Video.jsx and Quiz.jsx

### Video Storage
- **Location:** `src/services/videoStorage.js`
- **Function:** Manages video files in IndexedDB
- **Functions:**
  - `saveVideoFile(videoId, file)` - Save video file
  - `getVideoFile(videoId)` - Get video file
  - `deleteVideoFile(videoId)` - Delete video file

### Admin Video Management
- **Location:** `src/pages/admin/Videos.jsx`
- **Function:** Admin page to upload/manage videos
- **Features:**
  - Upload videos (stores in IndexedDB)
  - List all videos
  - Edit/delete videos
  - Link videos to lessons/items

---

## 📝 Exams & Questions

### Quiz/Exam Page
- **Location:** `src/pages/Quiz.jsx`
- **Function:** Displays quiz questions and handles user answers
- **Features:**
  - Shows questions one by one
  - Multiple choice answers (A, B, C, D)
  - Progress bar
  - Option to watch video during quiz
  - Saves progress and answers
  - Shows results at the end

### Result Page
- **Location:** `src/pages/Result.jsx`
- **Function:** Displays quiz results after completion
- **Features:**
  - Shows score (correct/total)
  - Percentage
  - Back button to lessons

### Admin Question Management
- **Location:** `src/pages/admin/Questions.jsx`
- **Function:** Admin page to manage questions
- **Features:**
  - Add new questions
  - Edit existing questions
  - Delete questions
  - Rich text editor for questions (ReactQuill)
  - Image upload for questions
  - Set correct answers
  - Link questions to lessons/items

---

## 💾 Data Storage

### Storage Service
- **Location:** `src/services/storageService.js`
- **Function:** Main data management service
- **Storage Type:** localStorage (for metadata) + IndexedDB (for large files)

### Data Structure
```
Sections (أقسام)
  └── Subjects (مواد)
      └── Categories (تصنيفات: تأسيس/تجميعات)
          └── Chapters (فصول)
              └── Items/Lessons (دروس)
                  ├── Video
                  └── Questions (50 questions per lesson)
```

### Key Functions in storageService.js:
- `initializeDefaultData()` - Initialize default data structure
- `getSections()` - Get all sections
- `getSectionById(id)` - Get section by ID
- `getSubjectsBySection(sectionId)` - Get subjects in section
- `getCategoriesBySubject(subjectId)` - Get categories in subject
- `getChaptersByCategory(categoryId)` - Get chapters in category
- `getItemsByChapter(chapterId)` - Get lessons/items in chapter
- `getQuestionsByLevel(itemId)` - Get questions for a lesson
- `getVideoByLevel(itemId)` - Get video for a lesson
- `saveProgress(userId, itemId, progress)` - Save user progress

---

## 🎨 Components

### Header Components
- **`src/components/Header.jsx`** - Main header with navigation (uses React Router)
- **`src/components/HeaderNoRouter.jsx`** - Header for single-page app (no routing)

### Other Components
- **`src/components/VideoModal.jsx`** - Video player modal
- **`src/components/ProgressBar.jsx`** - Progress bar for quizzes
- **`src/components/ProtectedRoute.jsx`** - Route protection wrapper

---

## 👨‍💼 Admin Pages

### Admin Dashboard
- **Location:** `src/pages/admin/Dashboard.jsx`
- **Function:** Admin main dashboard (shows sections like student view)

### Admin Questions
- **Location:** `src/pages/admin/Questions.jsx`
- **Function:** Manage questions (CRUD operations)

### Admin Videos
- **Location:** `src/pages/admin/Videos.jsx`
- **Function:** Manage videos (upload, edit, delete)

---

## 🔄 Current State

**IMPORTANT:** The app is currently set up as a **single-page application**:
- Main component: `src/pages/SinglePage.jsx`
- All sections are in one page (landing, courses, about, contact)
- Uses smooth scrolling between sections
- Router is disabled in `src/main.jsx`

If you want to use the old routing-based structure, you would need to:
1. Re-enable `BrowserRouter` in `src/main.jsx`
2. Use `src/App.jsx` with Routes
3. Use individual page components instead of SinglePage

---

## 📋 Summary Table

| Component | File Location | Purpose |
|-----------|--------------|---------|
| **Login** | `src/pages/Login.jsx` | User authentication |
| **Main Page** | `src/pages/SinglePage.jsx` | All sections in one page |
| **Courses** | `src/pages/SinglePage.jsx` (courses section) | Display courses |
| **Videos** | `src/pages/Video.jsx` | Play videos |
| **Quiz/Exam** | `src/pages/Quiz.jsx` | Take quizzes |
| **Results** | `src/pages/Result.jsx` | Show quiz results |
| **Admin Questions** | `src/pages/admin/Questions.jsx` | Manage questions |
| **Admin Videos** | `src/pages/admin/Videos.jsx` | Manage videos |
| **Data Storage** | `src/services/storageService.js` | Data management |
| **Video Storage** | `src/services/videoStorage.js` | Video file storage |










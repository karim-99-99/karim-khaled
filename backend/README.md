# Backend API - Django REST Framework

This is the backend API for the educational platform, built with Django and Django REST Framework.

## Setup Instructions

1. **Create a virtual environment** (recommended):
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Create .env file** (copy from .env.example and update SECRET_KEY):
```bash
# On Windows PowerShell:
Copy-Item .env.example .env
# On Mac/Linux:
cp .env.example .env
```

4. **Run migrations**:
```bash
python manage.py migrate
```

5. **Create a superuser**:
```bash
python manage.py createsuperuser
```

6. **Run the development server**:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## Features

- ✅ User authentication and authorization (Admin & Student roles)
- ✅ Permission management (admin grants permissions to students)
- ✅ Question management with multiple choice answers
- ✅ Video upload and management
- ✅ Student progress tracking (which question stopped at, percentage per question)
- ✅ File management
- ✅ Sections, Subjects, Categories, Chapters, and Lessons management
- ✅ RESTful API with Token authentication

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register a new user
- `POST /api/auth/login/` - Login and get token
- `POST /api/auth/logout/` - Logout

### Users
- `GET /api/users/` - List all users (Admin only)
- `GET /api/users/me/` - Get current user profile
- `GET /api/users/{id}/` - Get user details
- `PUT /api/users/{id}/` - Update user (Admin only)
- `POST /api/users/{id}/update_permissions/` - Update student permissions (Admin only)

### Sections, Subjects, Categories, Chapters, Lessons
- `GET /api/sections/` - Get all sections with nested structure

### Questions
- `GET /api/questions/` - List questions (filter by lesson_id, chapter_id, category_id, subject_id)
- `POST /api/questions/` - Create question (Admin only)
- `GET /api/questions/{id}/` - Get question details
- `PUT /api/questions/{id}/` - Update question (Admin only)
- `DELETE /api/questions/{id}/` - Delete question (Admin only)

### Videos
- `GET /api/videos/` - List videos (filter by lesson_id)
- `POST /api/videos/` - Upload video (Admin only)
- `GET /api/videos/{id}/` - Get video details
- `PUT /api/videos/{id}/` - Update video (Admin only)
- `DELETE /api/videos/{id}/` - Delete video (Admin only)

### Files
- `GET /api/files/` - List files (filter by lesson_id)
- `POST /api/files/` - Upload file (Admin only)
- `GET /api/files/{id}/` - Get file details
- `PUT /api/files/{id}/` - Update file (Admin only)
- `DELETE /api/files/{id}/` - Delete file (Admin only)

### Progress Tracking
- `GET /api/progress/` - Get student progress (students see only their own)
- `POST /api/progress/` - Submit answer and track progress
- `GET /api/lesson-progress/` - Get lesson progress
- `GET /api/lesson-progress/my_progress/` - Get current user's progress for all lessons

## Authentication

Use Token Authentication. Include the token in the Authorization header:
```
Authorization: Token your-token-here
```

## Models Overview

- **User**: Custom user with admin/student roles and permissions
- **Section**: Main sections (قدرات, تحصيل)
- **Subject**: Subjects within sections
- **Category**: Categories within subjects (e.g., التأسيس, التجميعات)
- **Chapter**: Chapters within categories
- **Lesson**: Lessons/Items within chapters
- **Question**: Questions with HTML/math content
- **Answer**: Multiple choice answers (a, b, c, d)
- **Video**: Educational videos
- **File**: Files (PDFs, documents)
- **StudentProgress**: Track individual question answers
- **LessonProgress**: Track overall progress per lesson with percentages and last question stopped at

## Admin Panel

Access Django admin at: `http://localhost:8000/admin/`

Use the superuser credentials created during setup.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getQuestions, getVideos, getUsers, getProgress, getCurrentUser, logout } from '../../services/storageService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    subjects: 0,
    questions: 0,
    videos: 0,
    students: 0,
    completedLevels: 0,
  });

  useEffect(() => {
    const subjects = getSubjects();
    const questions = getQuestions();
    const videos = getVideos();
    const users = getUsers().filter(u => u.role === 'student');
    const progress = getProgress();

    setStats({
      subjects: subjects.length,
      questions: questions.length,
      videos: videos.length,
      students: users.length,
      completedLevels: progress.length,
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم / Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            تسجيل الخروج / Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.subjects}</div>
            <div className="text-gray-600 mt-2">المواد / Subjects</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{stats.questions}</div>
            <div className="text-gray-600 mt-2">الأسئلة / Questions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">{stats.videos}</div>
            <div className="text-gray-600 mt-2">الفيديوهات / Videos</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-yellow-600">{stats.students}</div>
            <div className="text-gray-600 mt-2">الطلاب / Students</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">{stats.completedLevels}</div>
            <div className="text-gray-600 mt-2">المستويات المكتملة / Completed</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/admin/questions')}
            className="bg-blue-600 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition text-left"
          >
            <div className="text-4xl mb-4">❓</div>
            <h2 className="text-2xl font-bold mb-2">إدارة الأسئلة</h2>
            <p className="text-blue-100">Manage Questions</p>
          </button>

          <button
            onClick={() => navigate('/admin/videos')}
            className="bg-purple-600 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition text-left"
          >
            <div className="text-4xl mb-4">🎥</div>
            <h2 className="text-2xl font-bold mb-2">إدارة الفيديوهات</h2>
            <p className="text-purple-100">Manage Videos</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;



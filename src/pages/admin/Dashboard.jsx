import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getQuestions, getVideos, getUsers, getProgress, getCurrentUser, logout, resetAndInitializeData } from '../../services/storageService';
import Header from '../../components/Header';

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

  const handleResetData = () => {
    const confirmReset = window.confirm(
      '⚠️ تحذير: سيتم حذف جميع البيانات (الأقسام، الفصول، الدروس، الأسئلة، الفيديوهات، التقدم) وإعادة تهيئتها بالبيانات الافتراضية.\n\nسيتم الاحتفاظ بحسابات المستخدمين فقط.\n\nهل أنت متأكد؟\n\n⚠️ Warning: All data (sections, chapters, lessons, questions, videos, progress) will be deleted and reset to default.\n\nOnly user accounts will be preserved.\n\nAre you sure?'
    );
    
    if (confirmReset) {
      resetAndInitializeData();
      // Refresh stats
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
      
      alert('✅ تم مسح البيانات وإعادة تهيئتها بنجاح!\n\n✅ Data has been reset and reinitialized successfully!');
      window.location.reload(); // Reload page to reflect changes
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-primary-500">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-500">{stats.subjects}</div>
            <div className="text-base md:text-lg text-dark-600 mt-2 font-medium">المواد / Subjects</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-green-500">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-500">{stats.questions}</div>
            <div className="text-base md:text-lg text-dark-600 mt-2 font-medium">الأسئلة / Questions</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-purple-500">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-500">{stats.videos}</div>
            <div className="text-base md:text-lg text-dark-600 mt-2 font-medium">الفيديوهات / Videos</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-yellow-500">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-500">{stats.students}</div>
            <div className="text-base md:text-lg text-dark-600 mt-2 font-medium">الطلاب / Students</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-500">{stats.completedLevels}</div>
            <div className="text-base md:text-lg text-dark-600 mt-2 font-medium">المستويات المكتملة / Completed</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <button
            onClick={() => navigate('/admin/questions')}
            className="bg-primary-500 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 text-right border-l-4 border-white border-opacity-30"
          >
            <div className="text-4xl md:text-5xl mb-4">❓</div>
            <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">إدارة الأسئلة</h2>
            <p className="text-yellow-200 text-base md:text-lg">Manage Questions</p>
          </button>

          <button
            onClick={() => navigate('/admin/videos')}
            className="bg-dark-600 text-white p-6 md:p-8 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 text-right border-l-4 border-primary-500 border-opacity-50"
          >
            <div className="text-4xl md:text-5xl mb-4">🎥</div>
            <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">إدارة الفيديوهات</h2>
            <p className="text-yellow-200 text-base md:text-lg">Manage Videos</p>
          </button>
        </div>

        {/* Reset Data Button */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-right">
              <h3 className="text-lg md:text-xl font-bold text-red-700 mb-2">إعادة تهيئة البيانات / Reset Data</h3>
              <p className="text-sm md:text-base text-red-600">
                سيتم حذف جميع البيانات وإعادة تهيئتها بالبيانات الافتراضية (سيتم الاحتفاظ بحسابات المستخدمين فقط)
                <br />
                All data will be deleted and reset to default (only user accounts will be preserved)
              </p>
            </div>
            <button
              onClick={handleResetData}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-base md:text-lg transition shadow-lg hover:shadow-xl"
            >
              🔄 إعادة التهيئة / Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;



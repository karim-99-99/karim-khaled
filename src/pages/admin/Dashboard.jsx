import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { isArabicBrowser } from "../../utils/language";
import { getCurrentUser } from "../../services/storageService";
import { isFullAdmin } from "../../utils/roles";

const Dashboard = () => {
  const navigate = useNavigate();
  const showFullAdminTiles = isFullAdmin(getCurrentUser());

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-3 md:mb-4 leading-tight">
            مرحباً كريم
          </h1>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {showFullAdminTiles && (
            <button
              onClick={() => navigate("/admin/users")}
              className="bg-amber-500 hover:bg-amber-600 text-white p-6 md:p-7 rounded-2xl font-extrabold transition shadow-lg hover:shadow-2xl flex items-center justify-center gap-3 text-lg md:text-xl"
            >
              <span className="text-2xl">👥</span>
              <span>
                {isArabicBrowser() ? "إدارة المستخدمين" : "User Management"}
              </span>
            </button>
          )}

          <button
            onClick={() => navigate("/admin/questions")}
            className="bg-orange-500 hover:bg-orange-600 text-white p-6 md:p-7 rounded-2xl font-extrabold transition shadow-lg hover:shadow-2xl flex items-center justify-center gap-3 text-lg md:text-xl"
          >
            <span className="text-2xl">📝</span>
            <span>
              {isArabicBrowser() ? "إدارة الواجب" : "Test Management"}
            </span>
          </button>

          <button
            onClick={() => navigate("/admin/chapters")}
            className="bg-blue-500 hover:bg-blue-600 text-white p-6 md:p-7 rounded-2xl font-extrabold transition shadow-lg hover:shadow-2xl flex items-center justify-center gap-3 text-lg md:text-xl"
          >
            <span className="text-2xl">📚</span>
            <span>
              {isArabicBrowser() ? "إدارة الفصول" : "Manage Chapters"}
            </span>
          </button>

          <button
            onClick={() => navigate("/admin/lessons")}
            className="bg-green-500 hover:bg-green-600 text-white p-6 md:p-7 rounded-2xl font-extrabold transition shadow-lg hover:shadow-2xl flex items-center justify-center gap-3 text-lg md:text-xl"
          >
            <span className="text-2xl">📖</span>
            <span>{isArabicBrowser() ? "إدارة الدروس" : "Manage Lessons"}</span>
          </button>

          {showFullAdminTiles && (
            <button
              onClick={() => navigate("/admin/classrooms")}
              className="bg-purple-500 hover:bg-purple-600 text-white p-6 md:p-7 rounded-2xl font-extrabold transition shadow-lg hover:shadow-2xl flex items-center justify-center gap-3 text-lg md:text-xl"
            >
              <span className="text-2xl">🏫</span>
              <span>
                {isArabicBrowser()
                  ? "إدارة الفصول الدراسية"
                  : "Manage Classrooms"}
              </span>
            </button>
          )}

          <button
            onClick={() => navigate("/foundation")}
            className="bg-primary-500 hover:bg-primary-600 text-white p-6 md:p-7 rounded-2xl font-extrabold transition shadow-lg hover:shadow-2xl flex items-center justify-center gap-3 text-lg md:text-xl"
          >
            <span className="text-2xl">🎓</span>
            <span>إدارة الدروس المجانية</span>
          </button>

          {showFullAdminTiles && (
            <button
              onClick={() => navigate("/admin/tracker")}
              className="bg-teal-500 hover:bg-teal-600 text-white p-6 md:p-7 rounded-2xl font-extrabold transition shadow-lg hover:shadow-2xl flex items-center justify-center gap-3 text-lg md:text-xl"
            >
              <span className="text-2xl">📊</span>
              <span>{isArabicBrowser() ? "تتبع الطلاب" : "Student Tracker"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

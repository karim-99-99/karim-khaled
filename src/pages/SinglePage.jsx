import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  initializeDefaultData,
  getUserByEmail,
  setCurrentUser,
  getCurrentUser,
} from "../services/storageService";
import HeaderNoRouter from "../components/HeaderNoRouter";
import StudentResultsModal from "../components/StudentResultsModal";
import backgroundImage from "../assets/kareem.jpg";
import boyImage from "../assets/boy.png";

const SinglePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentUser, setCurrentUserState] = useState(getCurrentUser());
  const [showStudentResults, setShowStudentResults] = useState(false);

  useEffect(() => {
    initializeDefaultData();
    setCurrentUserState(getCurrentUser());
  }, []);

  // عند فتح الصفحة بـ #about أو #contact نمرّر مباشرة للقسم المطلوب
  useEffect(() => {
    const hash = (location.hash || "").slice(1);
    if (hash && ["about", "contact"].includes(hash)) {
      const t = setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  // Features for landing page (قسم «ليش أ. إيمان معوض؟»)
  const features = [
    {
      icon: "📚💡",
      title: "تأسيس سهل و بسيط ",
      description: "اكثر من 80 ساعة للتأسيس بأسهل و ابسط الطرق مهما كان مستواك",
    },
    {
      icon: "🎓",
      title: "   10 سنوات من الخبرة",
      description: "خبره اكثر من 10 سنوات في تدريب اختبار القدرات العامة",
    },
    // { icon: "📱", title: "دروس تفاعلية تضمن", description: "لك الفهم" },
    {
      icon: "❓📝",
      title: "متابعة دورية لمستواك",
      description: " جدول للتدريبات و الواجبات و الحصص و التجميعات نتابع مستواك أول بأول",
      
    },
    {
      icon: "🏆⭐",
      title: "تجميعات شاملة للاختبار",
      description: " أكثر من 10 الاف سؤال مرتبين بنظام المستويات حسب احدث التجميعات و التسريبات",
    },
  ];

  const scrollToSection = (sectionId) => {
    if (sectionId === "login") {
      setShowLogin(true);
      setTimeout(() => {
        const element = document.getElementById("login-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return;
    }
    if (sectionId === "courses") {
      navigate("/courses");
      return;
    }
    if (sectionId === "foundation" || sectionId === "free-courses") {
      navigate("/foundation");
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError("");

    const user = getUserByEmail(loginEmail);

    if (!user) {
      setLoginError("البريد الإلكتروني غير صحيح");
      return;
    }

    if (user.password !== loginPassword) {
      setLoginError("كلمة المرور غير صحيحة");
      return;
    }

    setCurrentUser(user);
    setCurrentUserState(user);
    setShowLogin(false);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");

    // Navigate based on role
    if (user.role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/courses");
    }
  };

  const handleDiscoverCourses = () => {
    navigate("/courses");
  };

  const handleDiscoverFreeCourses = () => {
    navigate("/foundation");
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <HeaderNoRouter
        onNavigate={scrollToSection}
        currentUser={currentUser}
        onUserChange={setCurrentUserState}
      />

      {/* الرئيسية Section */}
      <section
        id="landing"
        className="min-h-screen bg-white relative overflow-hidden"
      >
        {/* Decorative Background Elements - Using brand colors: E8CCAD, EC802B, EDC55B, 66BCB4 */}
        {/* Small orange circle - bottom left - visible on mobile */}
        <div
          className="absolute bottom-0 left-0 w-20 h-20 md:w-32 md:h-32 rounded-full opacity-15"
          style={{ zIndex: 0, background: "#EC802B" }}
        ></div>

        {/* Small beige circle - top left - visible on mobile */}
        <div
          className="absolute top-20 left-8 w-12 h-12 md:w-18 md:h-18 rounded-full opacity-20"
          style={{ zIndex: 0, background: "#E8CCAD" }}
        ></div>

        {/* Small turquoise circle - mid left - visible on mobile */}
        <div
          className="absolute top-1/3 left-4 w-16 h-16 md:w-24 md:h-24 rounded-full opacity-15"
          style={{ zIndex: 0, background: "#66BCB4" }}
        ></div>

        {/* Small dotted turquoise square - mid left */}
        <div
          className="absolute top-40 left-16 w-12 h-12 md:w-18 md:h-18 opacity-20 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="dots-square-turquoise"
                x="0"
                y="0"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="3" cy="3" r="1" fill="#66BCB4" />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#dots-square-turquoise)"
            />
          </svg>
        </div>

        {/* Small dotted golden yellow triangle - below dotted square */}
        <div
          className="absolute top-56 left-20 w-10 h-10 md:w-14 md:h-14 opacity-20 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%">
            <polygon
              points="50,10 90,90 10,90"
              stroke="#EDC55B"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="2,2"
            />
          </svg>
        </div>

        {/* Additional small triangle - mid left */}
        <div
          className="absolute top-2/3 left-12 w-8 h-8 md:w-12 md:h-12 opacity-15 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%">
            <polygon
              points="50,5 95,95 5,95"
              stroke="#E8CCAD"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="3,3"
            />
          </svg>
        </div>

        {/* Small orange circles - top right - visible on mobile */}
        <div
          className="absolute top-12 right-12 w-6 h-6 md:w-8 md:h-8 rounded-full opacity-25"
          style={{ zIndex: 0, background: "#EC802B" }}
        ></div>
        <div
          className="absolute top-24 right-24 w-5 h-5 md:w-7 md:h-7 rounded-full opacity-20 hidden md:block"
          style={{ zIndex: 0, background: "#EC802B" }}
        ></div>

        {/* Small golden yellow pie chart segment - top right */}
        <div
          className="absolute top-8 right-24 w-10 h-10 md:w-14 md:h-14 opacity-25 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <path
              d="M 50,50 L 50,20 A 30,30 0 0,1 80,50 Z"
              fill="#EDC55B"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Additional small pie segment - mid right */}
        <div
          className="absolute top-1/2 right-20 w-8 h-8 md:w-12 md:h-12 opacity-15 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <path
              d="M 50,50 L 50,25 A 25,25 0 0,1 75,50 Z"
              fill="#EDC55B"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Small turquoise circles - mid right */}
        <div
          className="absolute top-1/3 right-16 w-7 h-7 md:w-10 md:h-10 rounded-full opacity-20 hidden md:block"
          style={{ zIndex: 0, background: "#66BCB4" }}
        ></div>
        <div
          className="absolute top-2/3 right-12 w-6 h-6 md:w-8 md:h-8 rounded-full opacity-25 hidden md:block"
          style={{ zIndex: 0, background: "#66BCB4" }}
        ></div>

        {/* Small turquoise circle - bottom right */}
        <div
          className="absolute bottom-16 right-8 w-14 h-14 md:w-24 md:h-24 rounded-full opacity-12 hidden md:block"
          style={{ zIndex: 0, background: "#66BCB4" }}
        ></div>

        {/* Small beige square with wavy pattern - bottom right */}
        <div
          className="absolute bottom-20 right-12 w-12 h-12 md:w-18 md:h-18 opacity-20 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <rect
              width="60"
              height="60"
              x="20"
              y="20"
              fill="#E8CCAD"
              opacity="0.3"
            />
            <path
              d="M 25,50 Q 30,35 40,50 T 55,50 T 75,50"
              stroke="#EC802B"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>

        {/* Small wavy square - top center */}
        <div
          className="absolute top-40 left-1/2 w-10 h-10 md:w-16 md:h-16 opacity-15 hidden md:block transform -translate-x-1/2"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <rect
              width="60"
              height="60"
              x="20"
              y="20"
              fill="#E8CCAD"
              opacity="0.3"
            />
            <path
              d="M 25,50 Q 35,35 45,50 T 65,50 T 85,50"
              stroke="#66BCB4"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>

        {/* Small X shapes - decorative */}
        <div
          className="absolute bottom-32 left-12 w-6 h-6 md:w-8 md:h-8 opacity-15 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 24 24">
            <line
              x1="4"
              y1="4"
              x2="20"
              y2="20"
              stroke="#3D3D3D"
              strokeWidth="1.5"
            />
            <line
              x1="20"
              y1="4"
              x2="4"
              y2="20"
              stroke="#3D3D3D"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <div
          className="absolute top-1/4 right-1/4 w-5 h-5 md:w-7 md:h-7 opacity-12 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 24 24">
            <line
              x1="4"
              y1="4"
              x2="20"
              y2="20"
              stroke="#EC802B"
              strokeWidth="1.5"
            />
            <line
              x1="20"
              y1="4"
              x2="4"
              y2="20"
              stroke="#EC802B"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Small golden yellow circles - mid left */}
        <div
          className="absolute top-1/2 left-20 w-9 h-9 md:w-14 md:h-14 rounded-full opacity-15 hidden md:block"
          style={{ zIndex: 0, background: "#EDC55B" }}
        ></div>
        <div
          className="absolute top-3/4 left-16 w-7 h-7 md:w-10 md:h-10 rounded-full opacity-20 hidden md:block"
          style={{ zIndex: 0, background: "#EDC55B" }}
        ></div>

        {/* Small orange circles - bottom center and scattered */}
        <div
          className="absolute bottom-40 left-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full opacity-20 hidden md:block transform -translate-x-1/2"
          style={{ zIndex: 0, background: "#EC802B" }}
        ></div>
        <div
          className="absolute bottom-60 left-1/4 w-5 h-5 md:w-7 md:h-7 rounded-full opacity-25 hidden md:block"
          style={{ zIndex: 0, background: "#EC802B" }}
        ></div>
        <div
          className="absolute bottom-80 right-1/4 w-5 h-5 md:w-8 md:h-8 rounded-full opacity-20 hidden md:block"
          style={{ zIndex: 0, background: "#EC802B" }}
        ></div>

        {/* Small turquoise circles - top center and scattered */}
        <div
          className="absolute top-32 left-1/2 w-8 h-8 md:w-12 md:h-12 rounded-full opacity-15 hidden md:block transform -translate-x-1/2"
          style={{ zIndex: 0, background: "#66BCB4" }}
        ></div>
        <div
          className="absolute top-48 right-1/3 w-7 h-7 md:w-10 md:h-10 rounded-full opacity-20 hidden md:block"
          style={{ zIndex: 0, background: "#66BCB4" }}
        ></div>
        <div
          className="absolute top-64 left-1/3 w-6 h-6 md:w-8 md:h-8 rounded-full opacity-25 hidden md:block"
          style={{ zIndex: 0, background: "#66BCB4" }}
        ></div>

        {/* Small hexagon shape - decorative */}
        <div
          className="absolute top-1/3 left-1/4 w-8 h-8 md:w-12 md:h-12 opacity-15 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <polygon
              points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
              stroke="#EDC55B"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="2,2"
            />
          </svg>
        </div>

        {/* Small star shape - decorative */}
        <div
          className="absolute bottom-1/4 right-1/3 w-7 h-7 md:w-10 md:h-10 opacity-15 hidden md:block"
          style={{ zIndex: 0 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <polygon
              points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
              stroke="#EC802B"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>

        <div className="relative py-16 md:py-24" style={{ zIndex: 1 }}>
          <div className="relative max-w-7xl mx-auto px-4 z-10">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-dark-900 leading-tight">
              بدايتي في القدرات أ. إيمان معوض
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl mb-4 md:mb-6 text-dark-600 font-medium max-w-4xl mx-auto">
           مدربة القدرات العامة للقسمين اللفظي و الكمي  بمدارس رياض الصالحين الاهلية بتبوك 
              </p>
              <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-dark-600 font-medium max-w-4xl mx-auto">
               
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                <button
                  onClick={handleDiscoverCourses}
                  className="group px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-2xl text-lg md:text-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl text-white transform hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    <span>ابـــدئـــي من هنا</span>
                   
                  </span>
                </button>
                {/* <button
                  onClick={handleDiscoverFreeCourses}
                  className="group px-8 py-4 bg-white border-2 border-primary-500 text-primary-600 hover:bg-primary-50 rounded-2xl text-lg md:text-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    <span>الدورات المجانية</span>
                    
                  </span>
                </button> */}
              </div>
            </div>

            {/* Boy Image - Centered below text */}
            <div className="flex justify-center mt-8 md:mt-12 mb-8">
              <div
                className="relative"
                style={{ width: "50%", maxWidth: "600px" }}
              >
                <img
                  src={boyImage}
                  alt="طالب يدرس"
                  className="w-full h-auto object-contain opacity-80"
                  style={{ mixBlendMode: "multiply" }}
                />
              </div>
            </div>
          </div>
        </div>

        <section className="relative py-12 md:py-16 lg:py-20 bg-gray-50">
          <div className="relative max-w-7xl mx-auto px-4 z-10">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dark-900 mb-4">
                ليش أ. إيمان معوض؟
              </h2>
              <p className="text-lg md:text-xl text-dark-600 font-medium max-w-3xl mx-auto mb-2">
                محتوى علمي ذكي، وخبرة أكثر من 10 سنوات في التدريب.
              </p>
              <div className="flex justify-center mb-8">
                <svg
                  width="200"
                  height="20"
                  viewBox="0 0 200 20"
                  className="text-primary-500"
                >
                  <path
                    d="M0,10 Q50,0 100,10 T200,10"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-3xl md:text-4xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-base md:text-lg text-dark-600 font-medium">
                    {feature.description}
                  </p>
                  {feature.subDescription && (
                    <p className="text-sm md:text-base text-dark-500 mt-1">
                      {feature.subDescription}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      {/* الدورات Section */}
      {/* <section id="courses" className="min-h-screen bg-white py-12"> */}
        {/* <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12 relative">
            <div className="absolute left-8 top-8 w-4 h-4 border-2 border-primary-500 rounded-full opacity-30 hidden md:block"></div>
            <div className="absolute right-8 top-8 w-4 h-4 border-2 border-primary-500 rounded-full opacity-30 hidden md:block"></div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dark-900 mb-4">
              الدروس و الكورسات
            </h1>

            <div className="flex justify-center mb-8">
              <svg
                width="300"
                height="20"
                viewBox="0 0 300 20"
                className="text-primary-500"
              >
                <path
                  d="M0,10 Q75,0 150,10 T300,10"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
            </div>
          </div> */}

          {/* Single Discover Courses Button */}
          {/* <div className="flex justify-center">
            <button
              onClick={handleDiscoverCourses}
              className="group relative px-12 py-6 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-2xl text-2xl md:text-3xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl text-white transform hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span>اكتشف قدراتنا</span>
                <span className="transform group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </span>
            </button>
          </div> */}

          {/* الدورات المجانية — أسفل اكتشف قدراتنا */}
          {/* <div className="mt-12 md:mt-16 flex flex-col items-center gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-dark-800">
              الدورات المجانية
            </h2>
            <button
              onClick={handleDiscoverFreeCourses}
              className="group px-8 py-4 bg-white border-2 border-primary-500 text-primary-600 hover:bg-primary-50 rounded-2xl text-lg md:text-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <span>اكتشف دوراتنا المجانية</span>
                <span className="transform group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </span>
            </button>
          </div>
        </div> */}
      {/* </section> */}

      {/* الاسئلة المتكررة Section */}
      <section id="about" className="min-h-screen bg-gray-50 py-12 relative">
        {/* Background decorative elements */}
        <div className="absolute top-20 right-8 w-12 h-12 bg-purple-200 rounded-full opacity-30 hidden lg:block"></div>
        <div className="absolute top-40 left-8 w-8 h-8 border-2 border-purple-300 rounded-full opacity-20 hidden lg:block"></div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dark-900 mb-4">
              الاسئلة المتكررة
            </h1>
            <div className="flex justify-center mb-8">
              <svg
                width="200"
                height="20"
                viewBox="0 0 200 20"
                className="text-primary-500"
              >
                <path
                  d="M0,10 Q50,0 100,10 T200,10"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8">
            <div className="space-y-6">
              {/* Question 1 */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary-600 font-bold text-lg">
                      +
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-dark-900 mb-3">
                      ما هو بدايتي ؟
                    </h3>
                  </div>
                </div>
              </div>

              {/* Question 2 with answer */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary-600 font-bold text-lg">
                      +
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-dark-900 mb-3">
                      ما هي الخدمات المقدمة
                    </h3>
                    <p className="text-base md:text-lg text-dark-600 leading-relaxed">
                      الآن تقدر تطور مهاراتك بتأسيس طرق علمية بسيطة في نظام عقلك
                      الذكي، ومتابعة مستواك بشكل يومي عن طريق اختبارات عرض
                      المستوى على التطبيق
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 3 */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary-600 font-bold text-lg">
                      +
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-dark-900 mb-3">
                      كيف أستفيد أقصى استفادة من خدمات التطبيق
                    </h3>
                  </div>
                </div>
              </div>

              {/* Question 4 */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary-600 font-bold text-lg">
                      +
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-dark-900 mb-3">
                      ما النتائج المتوقعة بعد تدريبي على المنصة
                    </h3>
                  </div>
                </div>
              </div>

              {/* Question 5 */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary-600 font-bold text-lg">
                      +
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-dark-900 mb-3">
                      ما هي مصادر المحتوى الموجود على المنصة
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Login Section */}
      {showLogin && (
        <section id="login-section" className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-md mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-primary-500">
              <div className="text-center mb-8">
                <img
                  src={backgroundImage}
                  alt="Logo"
                  className="h-28 w-32 mx-auto mb-4 object-contain rounded-3xl"
                />
                <h1 className="text-2xl md:text-3xl font-bold text-dark-600 mb-2">
                  نظام التعليم
                </h1>
                <p className="text-base md:text-lg text-dark-600 font-medium">
                  تسجيل الدخول
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder="••••••••"
                  />
                </div>

                {loginError && (
                  <div className="bg-yellow-50 border border-yellow-300 text-dark-600 px-4 py-3 rounded-lg font-medium">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition shadow-lg hover:shadow-xl"
                >
                  تسجيل الدخول
                </button>
              </form>

              <div className="mt-6 text-center text-xs md:text-sm text-dark-600">
                <p className="font-medium">حساب تجريبي للطالب:</p>
                <p className="mt-2 font-mono text-xs md:text-sm text-dark-500">
                  student@test.com / student123
                </p>
                <p className="mt-2 font-medium">حساب المدير:</p>
                <p className="font-mono text-xs md:text-sm text-dark-500">
                  admin@teacher.com / admin123
                </p>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setShowLogin(false);
                    setLoginEmail("");
                    setLoginPassword("");
                    setLoginError("");
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* تواصل معنا Section */}
      <section
        id="contact"
        className="min-h-screen bg-stone-50 py-12 md:py-20 relative overflow-hidden"
      >
        {/* خلفية خفيفة جداً */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ zIndex: 0 }}
          aria-hidden
        >
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary-500/[0.06] blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-stone-300/30 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 relative z-[1]">
          <div className="relative rounded-3xl overflow-hidden border border-stone-200/90 bg-white shadow-md min-h-[500px]">
            <div className="relative p-8 md:p-12 lg:p-16 text-center">
              {/* Main Heading */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-stone-800 mb-6">
                تواصل معنا
              </h1>

              {/* خط فاصل بسيط */}
              <div className="flex justify-center mb-8">
                <div
                  className="h-1 w-24 rounded-full bg-primary-500/35"
                  aria-hidden
                />
              </div>

              {/* Descriptive Text */}
              <div className="mb-12 md:mb-16 space-y-4">
                <p className="text-2xl md:text-3xl lg:text-4xl text-stone-800 font-semibold leading-relaxed">
                  أ/ إيمان معوض
                </p>
                <p className="text-lg md:text-xl lg:text-2xl text-stone-600 font-medium leading-relaxed">
                  معلمة القدرات العامة بمدارس رياض الصالحين بتبوك
                </p>
              </div>

              {/* Social Media Buttons */}
              <div className="flex justify-center items-center gap-4 md:gap-6 flex-wrap">
                {currentUser?.role === "student" && (
                  <button
                    type="button"
                    onClick={() => setShowStudentResults(true)}
                    className="flex items-center gap-3 px-6 py-4 border-2 border-primary-400/70 rounded-2xl bg-primary-50 hover:bg-primary-100/80 transition-all duration-300 text-primary-700 font-semibold text-base md:text-lg shadow-sm motion-safe:hover:scale-[1.02]"
                    aria-label="عرض نتائجي"
                  >
                    <span className="text-2xl" aria-hidden>
                      ✨
                    </span>
                    <span>نتائجي</span>
                  </button>
                )}
                {/* WhatsApp Button - مربوط برقم +966502403757 */}
                <a
                  href="https://wa.me/966502403757"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-6 py-4 border-2 border-[#25D366] rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/15 transition-all duration-300 text-[#128C7E] font-semibold text-base md:text-lg group"
                  aria-label="تواصل معنا عبر واتساب"
                >
                  <svg
                    className="w-6 h-6 md:w-7 md:h-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span className="group-hover:scale-105 transition-transform">
                    واتس اب
                  </span>
                </a>

                {/* Instagram Button */}
                {/* <button className="flex items-center gap-3 px-6 py-4 border-2 border-white rounded-2xl bg-transparent hover:bg-white/10 transition-all duration-300 text-white font-semibold text-base md:text-lg group">
                  <svg
                    className="w-6 h-6 md:w-7 md:h-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span className="group-hover:scale-105 transition-transform">
                    انستا
                  </span>
                </button> */}

                {/* Twitter Button */}
                {/* <button className="flex items-center gap-3 px-6 py-4 border-2 border-white rounded-2xl bg-transparent hover:bg-white/10 transition-all duration-300 text-white font-semibold text-base md:text-lg group">
                  <svg
                    className="w-6 h-6 md:w-7 md:h-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                  <span className="group-hover:scale-105 transition-transform">
                    تويتر
                  </span>
                </button> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {currentUser?.role === "student" && (
        <StudentResultsModal
          open={showStudentResults}
          onClose={() => setShowStudentResults(false)}
        />
      )}
    </div>
  );
};

export default SinglePage;

import { Link } from 'react-router-dom';
import Header from '../components/Header';
import backgroundImage from '../assets/hanka.jpg';

const LandingPage = () => {
  const features = [
    {
      emoji: '📚',
      title: 'دورات متنوعة',
      titleEn: 'Diverse Courses',
      description: 'دورات في مختلف المجالات التعليمية',
      descriptionEn: 'Diverse Courses in Various Educational Fields'
    },
    {
      emoji: '🎯',
      title: 'تقييم المستوى',
      titleEn: 'Level Assessment',
      description: 'اختبر معرفتك وتابع تقدمك',
      descriptionEn: 'Test Your Knowledge and Track Your Progress'
    },
    {
      emoji: '🎥',
      title: 'فيديوهات تعليمية',
      titleEn: 'Educational Videos',
      description: 'محتوى مرئي لتعزيز التعلم',
      descriptionEn: 'Visual Content to Enhance Learning'
    }
  ];

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24">
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-dark-600 bg-opacity-0"></div>
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 z-10">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-dark-900 leading-tight">
              نظام تعليمي متكامل
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 text-dark-600 font-medium">
              طور مهاراتك من خلال دوراتنا التعليمية المميزة
            </p>
            <p className="text-base md:text-lg lg:text-xl mb-8 text-dark-500">
              Comprehensive Educational System - Enhance Your Skills Through Our Exceptional Courses
            </p>
            <Link
              to="/courses"
              className="inline-block px-8 py-4 bg-primary-500 hover:bg-primary-600 rounded-lg text-lg font-semibold transition-colors shadow-lg"
            >
              استكشف الدورات / Explore Courses
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-12 md:py-16 lg:py-20">
        <div className="relative max-w-7xl mx-auto px-4 z-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-8 md:mb-12 text-dark-600">
            مميزات النظام / System Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 bg-white bg-opacity-90 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-300">
                <div 
                  className="text-4xl md:text-5xl mb-4 cursor-pointer inline-block"
                  style={{
                    animation: `float-rotate ${3 + index}s ease-in-out infinite`,
                    animationDelay: `${index * 0.3}s`
                  }}
                >
                  {feature.emoji}
                </div>
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold mb-2 text-dark-600">
                  {feature.title}
                </h3>
                <p className="text-base md:text-lg text-dark-600 font-medium">
                  {feature.description}
                </p>
                <p className="text-sm md:text-base text-dark-500 mt-2">
                  {feature.descriptionEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-12 md:py-16 lg:py-20">
        <div className="relative max-w-4xl mx-auto px-4 text-center z-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-dark-900">ابدأ رحلتك التعليمية اليوم</h2>
          <p className="text-lg md:text-xl lg:text-2xl mb-8 text-dark-600 font-medium">Start Your Educational Journey Today</p>
          <Link
            to="/login"
            className="inline-block px-8 py-4 bg-primary-500 hover:bg-primary-600 rounded-lg text-lg font-semibold transition-colors shadow-lg"
          >
            تسجيل الدخول / Login
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;


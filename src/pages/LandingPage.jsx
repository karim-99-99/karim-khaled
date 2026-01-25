import { Link } from 'react-router-dom';
import Header from '../components/Header';

const LandingPage = () => {
  const features = [
    {
      icon: '📚💡',
      title: 'محتوى علمي ذكي',
      description: 'شامل ومختصر',
    },
    {
      icon: '📱',
      title: 'دروس تفاعلية تضمن',
      description: 'لك الفهم',
    },
    {
      icon: '❓📝',
      title: 'تدريبات مطابقة',
      description: 'للاختبارات الفعلية',
      subDescription: '(تجميعات)',
    },
    {
      icon: '🏆⭐',
      title: 'فعليا ما تحتاج مصادر',
      description: 'ثانية .. بدايتي وبس',
    }
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <Header />

      {/* Decorative Icons at the Top - Similar to reference design */}
      <div className="absolute top-20 right-8 w-12 h-12 bg-secondary-200 rounded-full opacity-40 hidden lg:block"></div>
      <div className="absolute top-32 left-8 w-8 h-8 border-2 border-accent-400 rounded-full opacity-30 hidden lg:block"></div>
      <div className="absolute top-40 left-1/4 w-3 h-3 bg-primary-500 rounded-full opacity-50 hidden lg:block"></div>
      <div className="absolute top-28 right-1/4 w-4 h-4 border-2 border-secondary-300 rounded-full opacity-40 hidden lg:block"></div>
      <div className="absolute top-36 left-1/3 w-2 h-2 bg-accent-400 rounded-full opacity-60 hidden lg:block"></div>
      <div className="absolute top-24 right-1/3 w-5 h-5 bg-secondary-300 rounded-full opacity-30 hidden lg:block"></div>
      {/* Additional decorative shapes */}
      <div className="absolute top-44 right-1/3 w-6 h-6 bg-accent-300 opacity-30 rounded-lg rotate-45 hidden lg:block"></div>
      <div className="absolute top-32 left-1/3 w-4 h-4 border-2 border-primary-400 opacity-40 rounded-sm rotate-12 hidden lg:block"></div>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24">
        <div className="relative max-w-7xl mx-auto px-4 z-10">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-dark-900 leading-tight">
              نظام تعليمي متكامل
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-4 md:mb-6 text-dark-600 font-medium max-w-4xl mx-auto">
              طور مهاراتك من خلال دوراتنا التعليمية المميزة
            </p>
            <p className="text-base md:text-lg lg:text-xl mb-8 md:mb-12 text-dark-600 font-medium max-w-4xl mx-auto">
              بدايتي هي منصة تعليمية متخصصة في تحضير الطلاب والطالبات لاختبار القدرات
            </p>
          </div>
        </div>
      </section>

      {/* Why Excel Section */}
      <section className="relative py-12 md:py-16 lg:py-20 bg-gray-50">
        <div className="relative max-w-7xl mx-auto px-4 z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dark-900 mb-4">
              ليش بدايتي؟
            </h2>
            {/* Decorative wavy line */}
            <div className="flex justify-center mb-8">
              <svg width="200" height="20" viewBox="0 0 200 20" className="text-primary-500">
                <path d="M0,10 Q50,0 100,10 T200,10" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            </div>
            {/* Decorative circles */}
            <div className="absolute left-8 top-8 w-4 h-4 border-2 border-primary-500 rounded-full opacity-30 hidden md:block"></div>
            <div className="absolute right-8 top-8 w-4 h-4 border-2 border-primary-500 rounded-full opacity-30 hidden md:block"></div>
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

      {/* CTA Section */}
      <section className="relative py-12 md:py-16 lg:py-20">
        <div className="relative max-w-4xl mx-auto px-4 text-center z-10">
          <Link
            to="/courses"
            className="inline-block px-8 py-4 bg-primary-500 hover:bg-primary-600 rounded-lg text-lg font-semibold transition-colors shadow-lg text-white"
          >
            استكشف الدورات
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

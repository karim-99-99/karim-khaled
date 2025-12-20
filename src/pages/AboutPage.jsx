import Header from '../components/Header';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-6 md:mb-8 text-center leading-tight">
            من نحن / Who Are We
          </h1>

          <div className="space-y-6 md:space-y-8 text-dark-600">
            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-3 md:mb-4">رؤيتنا / Our Vision</h2>
              <p className="text-base md:text-lg lg:text-xl leading-relaxed mb-2 font-medium">
                نسعى لتوفير نظام تعليمي شامل ومتكامل يساعد الطلاب على تطوير مهاراتهم وتقييم مستواهم بشكل فعال.
              </p>
              <p className="text-sm md:text-base lg:text-lg text-dark-500">
                We aim to provide a comprehensive and integrated educational system that helps students develop their skills and assess their level effectively.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-3 md:mb-4">مهمتنا / Our Mission</h2>
              <p className="text-base md:text-lg lg:text-xl leading-relaxed mb-2 font-medium">
                تقديم تجربة تعليمية ممتعة وتفاعلية تشمل دورات متنوعة، اختبارات تقييمية، وفيديوهات تعليمية عالية الجودة.
              </p>
              <p className="text-sm md:text-base lg:text-lg text-dark-500">
                To deliver an enjoyable and interactive educational experience that includes diverse courses, assessment tests, and high-quality educational videos.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-3 md:mb-4">ما نقدمه / What We Offer</h2>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg lg:text-xl">
                <li className="font-medium">دورات تعليمية في مختلف المواد / Educational courses in various subjects</li>
                <li className="font-medium">اختبارات تقييمية شاملة / Comprehensive assessment tests</li>
                <li className="font-medium">فيديوهات تعليمية تفاعلية / Interactive educational videos</li>
                <li className="font-medium">تتبع التقدم والأداء / Progress and performance tracking</li>
                <li className="font-medium">لوحة تحكم للمدرسين / Teacher dashboard</li>
              </ul>
            </div>

            <div className="mt-6 md:mt-8 p-5 md:p-6 bg-primary-50 rounded-lg border-r-4 border-primary-500">
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                انضم إلينا اليوم / Join Us Today
              </h3>
              <p className="text-base md:text-lg text-dark-600 font-medium">
                ابدأ رحلتك التعليمية معنا واكتشف إمكانياتك الكامنة / Start your educational journey with us and discover your potential
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;


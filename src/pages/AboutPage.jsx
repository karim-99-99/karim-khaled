import Header from '../components/Header';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-6 md:mb-8 text-center leading-tight">
            من نحن 
          </h1>

          <div className="space-y-6 md:space-y-8 text-dark-600">
            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-3 md:mb-4">رؤيتنا </h2>
              <p className="text-base md:text-lg lg:text-xl leading-relaxed mb-2 font-medium">
                نسعى لتوفير نظام تعليمي شامل ومتكامل يساعد الطلاب على تطوير مهاراتهم وتقييم مستواهم بشكل فعال.
              </p>
            
            </div>

            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-3 md:mb-4">مهمتنا </h2>
              <p className="text-base md:text-lg lg:text-xl leading-relaxed mb-2 font-medium">
                تقديم تجربة تعليمية ممتعة وتفاعلية تشمل دورات متنوعة، اختبارات تقييمية، وفيديوهات تعليمية عالية الجودة.
              </p>
             
            </div>

            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-3 md:mb-4">ما نقدمه </h2>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg lg:text-xl">
                <li className="font-medium">دورات تعليمية في مختلف المواد </li>
                <li className="font-medium">اختبارات تقييمية شاملة </li>
                <li className="font-medium">فيديوهات تعليمية تفاعلية </li>
                <li className="font-medium">تتبع التقدم والأداء </li>
                <li className="font-medium">لوحة تحكم للمدرسين </li>
              </ul>
            </div>

            <div className="mt-6 md:mt-8 p-5 md:p-6 bg-primary-50 rounded-lg border-r-4 border-primary-500">
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                انضم إلينا اليوم 
              </h3>
              <p className="text-base md:text-lg text-dark-600 font-medium">
                ابدأ رحلتك التعليمية معنا واكتشف إمكانياتك الكامنة 
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;


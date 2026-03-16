import { useState } from 'react';
import Header from '../components/Header';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('شكراً لك! سيتم الرد عليك قريباً ');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-3 md:mb-4 leading-tight">
            تواصل معنا 
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">
            نحن هنا لمساعدتك 
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-4 md:mb-6">
              أرسل لنا رسالة 
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
            <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
              الاسم 
            </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
            <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
              البريد الإلكتروني 
            </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
            <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
              الرسالة 
            </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows="5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors"
              >
                إرسال 
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📧</div>
                <div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                    البريد الإلكتروني 
                  </h3>
                  <p className="text-base md:text-lg text-dark-600 font-medium">info@educationsystem.com</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="text-2xl md:text-3xl">📱</div>
                <div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                    الهاتف 
                  </h3>
                  <p className="text-base md:text-lg text-dark-600 font-medium">+966 50 240 3757</p>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/966502403757"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-lg shadow-lg p-5 md:p-6 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-[#25D366]"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                    واتساب
                  </h3>
                  <p className="text-base md:text-lg text-dark-600 font-medium">+966 50 240 3757</p>
                  <p className="text-sm text-primary-600 font-semibold mt-1">اضغط للتواصل عبر واتساب ←</p>
                </div>
              </div>
            </a>

            <div className="bg-white rounded-lg shadow-lg p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="text-2xl md:text-3xl">📍</div>
                <div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                    العنوان 
                  </h3>
                  <p className="text-base md:text-lg text-dark-600 font-medium">
                    المملكة العربية السعودية 
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;


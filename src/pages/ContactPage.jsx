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
    alert('شكراً لك! سيتم الرد عليك قريباً / Thank you! We will get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-3 md:mb-4 leading-tight">
            تواصل معنا / Contact Us
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">
            نحن هنا لمساعدتك / We are here to help you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-4 md:mb-6">
              أرسل لنا رسالة / Send Us a Message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
            <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
              الاسم / Name
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
              البريد الإلكتروني / Email
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
              الرسالة / Message
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
                إرسال / Send
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
                    البريد الإلكتروني / Email
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
                    الهاتف / Phone
                  </h3>
                  <p className="text-base md:text-lg text-dark-600 font-medium">+966 50 123 4567</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="text-2xl md:text-3xl">📍</div>
                <div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                    العنوان / Address
                  </h3>
                  <p className="text-base md:text-lg text-dark-600 font-medium">
                    المملكة العربية السعودية / Kingdom of Saudi Arabia
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary-50 rounded-lg p-5 md:p-6 border-r-4 border-primary-500">
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                ساعات العمل / Working Hours
              </h3>
              <p className="text-base md:text-lg text-dark-600 font-medium">
                الأحد - الخميس: 9 ص - 5 م<br />
                Sunday - Thursday: 9 AM - 5 PM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;


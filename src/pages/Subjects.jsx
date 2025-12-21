import { useNavigate, useParams } from 'react-router-dom';
import { getSectionById } from '../services/storageService';
import Header from '../components/Header';

const Subjects = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const section = getSectionById(sectionId);

  if (!section) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">القسم غير موجود / Section not found</p>
      </div>
    );
  }

  const handleSubjectClick = (subjectId) => {
    navigate(`/section/${sectionId}/subject/${subjectId}/categories`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/home')}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
          >
            ← رجوع / Back
          </button>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
            {section.name} / {section.nameEn}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">اختر المادة / Choose Subject</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {section.subjects.map((subject) => {
            // Choose icon based on subject
            const icons = {
              'الرياضيات': '🔢',
              'الأحياء': '🔬',
              'الفيزياء': '⚛️',
              'الكيمياء': '🧪',
              'الكمي': '📊',
              'اللفظي': '📝',
            };
            const icon = icons[subject.name] || '📖';

            return (
              <button
                key={subject.id}
                onClick={() => handleSubjectClick(subject.id)}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 p-6 text-center"
              >
                <div className="text-4xl md:text-5xl mb-4">{icon}</div>
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600 mb-2">
                  {subject.name}
                </h2>
                <p className="text-base md:text-lg text-dark-600 font-medium">{subject.nameEn}</p>
              </button>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Subjects;




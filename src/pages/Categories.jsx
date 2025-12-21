import { useNavigate, useParams } from 'react-router-dom';
import { getSubjectById } from '../services/storageService';
import Header from '../components/Header';

const Categories = () => {
  const { sectionId, subjectId } = useParams();
  const navigate = useNavigate();
  const subject = getSubjectById(subjectId);

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">المادة غير موجودة / Subject not found</p>
      </div>
    );
  }

  const handleCategoryClick = (categoryId) => {
    navigate(`/section/${sectionId}/subject/${subjectId}/category/${categoryId}/chapters`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/section/${sectionId}/subjects`)}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 font-medium"
          >
            ← رجوع / Back
          </button>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-600 mb-2 leading-tight">
            {subject.name} / {subject.nameEn}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-600 font-medium">اختر التصنيف / Choose Category</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {subject.categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 p-8 text-center"
            >
              <div className="text-5xl md:text-6xl mb-4">
                {category.hasTests ? '📚' : '🎥'}
              </div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-600 mb-2">
                {category.name}
              </h2>
              <p className="text-lg md:text-xl text-dark-600 font-medium">{category.nameEn}</p>
              <div className="mt-4 text-sm md:text-base text-dark-500 font-medium">
                {category.chapters.length} فصول / {category.chapters.length} Chapters
              </div>
              {!category.hasTests && (
                <div className="mt-2 text-xs md:text-sm text-orange-600 font-medium">
                  فيديوهات فقط / Videos Only
                </div>
              )}
            </button>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;




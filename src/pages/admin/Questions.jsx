import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getQuestions, getQuestionsByLevel, addQuestion, updateQuestion, deleteQuestion, getLevelsByChapter, getCategoriesBySubject, getChaptersByCategory } from '../../services/storageService';
import ReactQuill from 'react-quill';
import Header from '../../components/Header';

const Questions = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionImage, setQuestionImage] = useState(null);
  const [questionImagePreview, setQuestionImagePreview] = useState(null);
  const [imageScale, setImageScale] = useState(100); // Image scale percentage
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState(null);
  const imageInputRef = useRef(null);
  const [formData, setFormData] = useState({
    question: '',
    questionEn: '',
    image: null, // base64 encoded image
    answers: [
      { id: 'a', text: '', textEn: '', isCorrect: false },
      { id: 'b', text: '', textEn: '', isCorrect: false },
      { id: 'c', text: '', textEn: '', isCorrect: false },
      { id: 'd', text: '', textEn: '', isCorrect: false },
    ],
  });

  // Configure Quill editor toolbar
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  useEffect(() => {
    setSubjects(getSubjects());
  }, []);

  useEffect(() => {
    if (selectedLevel) {
      setQuestions(getQuestionsByLevel(selectedLevel));
    }
  }, [selectedLevel]);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedCategory('');
    setSelectedChapter('');
    setSelectedLevel('');
    setQuestions([]);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedChapter('');
    setSelectedLevel('');
    setQuestions([]);
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapter(chapterId);
    setSelectedLevel('');
    setQuestions([]);
  };

  const handleLevelChange = (levelId) => {
    setSelectedLevel(levelId);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت / Image size too large. Maximum 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setQuestionImage(file);
        setQuestionImagePreview(base64String);
        setImageScale(100); // Reset scale when new image is uploaded
        setFormData({ ...formData, image: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageZoom = (delta) => {
    setImageScale(prev => Math.max(25, Math.min(300, prev + delta)));
  };

  const handleImageReset = () => {
    setImageScale(100);
  };

  const handleImageMaximize = (imageSrc) => {
    setModalImageSrc(imageSrc);
    setShowImageModal(true);
  };

  const handleRemoveImage = () => {
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setFormData({ ...formData, image: null });
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleAddNew = () => {
    setEditingQuestion(null);
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setImageScale(100);
    setFormData({
      question: '',
      questionEn: '',
      image: null,
      answers: [
        { id: 'a', text: '', textEn: '', isCorrect: false },
        { id: 'b', text: '', textEn: '', isCorrect: false },
        { id: 'c', text: '', textEn: '', isCorrect: false },
        { id: 'd', text: '', textEn: '', isCorrect: false },
      ],
    });
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    setShowForm(true);
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question || '',
      questionEn: question.questionEn || '',
      image: question.image || null,
      answers: question.answers || [
        { id: 'a', text: '', textEn: '', isCorrect: false },
        { id: 'b', text: '', textEn: '', isCorrect: false },
        { id: 'c', text: '', textEn: '', isCorrect: false },
        { id: 'd', text: '', textEn: '', isCorrect: false },
      ],
    });
    if (question.image) {
      setQuestionImagePreview(question.image);
    } else {
      setQuestionImagePreview(null);
    }
    setQuestionImage(null);
    setImageScale(100);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    setShowForm(true);
  };

  const handleDelete = (questionId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السؤال؟ / Are you sure?')) {
      deleteQuestion(questionId);
      setQuestions(getQuestionsByLevel(selectedLevel));
    }
  };

  const handleAnswerChange = (index, field, value) => {
    const newAnswers = [...formData.answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setFormData({ ...formData, answers: newAnswers });
  };

  const handleCorrectAnswerChange = (index) => {
    const newAnswers = formData.answers.map((ans, i) => ({
      ...ans,
      isCorrect: i === index,
    }));
    setFormData({ ...formData, answers: newAnswers });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedLevel) {
      alert('يرجى اختيار المستوى أولاً / Please select a level first');
      return;
    }

    const questionData = {
      ...formData,
      levelId: selectedLevel,
    };

    if (editingQuestion) {
      updateQuestion(editingQuestion.id, questionData);
    } else {
      addQuestion(questionData);
    }

    setQuestions(getQuestionsByLevel(selectedLevel));
    setShowForm(false);
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setFormData({
      question: '',
      questionEn: '',
      image: null,
      answers: [
        { id: 'a', text: '', textEn: '', isCorrect: false },
        { id: 'b', text: '', textEn: '', isCorrect: false },
        { id: 'c', text: '', textEn: '', isCorrect: false },
        { id: 'd', text: '', textEn: '', isCorrect: false },
      ],
    });
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
  const levels = selectedChapter ? getLevelsByChapter(selectedChapter) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-dark-600">إدارة الأسئلة / Manage Questions</h1>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
          >
            ← رجوع / Back
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                المادة / Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر المادة / Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} / {subject.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                التصنيف / Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={!selectedSubject}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر التصنيف / Select Category</option>
                {selectedSubjectObj?.categories?.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} / {category.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                الفصل / Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => handleChapterChange(e.target.value)}
                disabled={!selectedCategory}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر الفصل / Select Chapter</option>
                {getChaptersByCategory(selectedCategory).map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name} / {chapter.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                المستوى / Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => handleLevelChange(e.target.value)}
                disabled={!selectedChapter}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر المستوى / Select Level</option>
                {levels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name} / {level.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {selectedLevel && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                الأسئلة ({questions.length}) / Questions ({questions.length})
              </h2>
              <button
                onClick={handleAddNew}
                className="bg-primary-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-primary-600 transition font-medium text-sm sm:text-base w-full sm:w-auto"
              >
                + إضافة سؤال جديد / Add Question
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
                    <div className="flex-1 w-full sm:w-auto">
                      <div className="font-semibold text-sm sm:text-base md:text-lg text-dark-600 mb-2 break-words">
                        <span>{index + 1}. </span>
                        <span dangerouslySetInnerHTML={{ __html: question.question || '' }} />
                      </div>
                      {question.questionEn && (
                        <div className="text-xs sm:text-sm md:text-base text-dark-500 mb-2 break-words" dangerouslySetInnerHTML={{ __html: question.questionEn }} />
                      )}
                      {question.image && (
                        <div className="mt-2">
                          <img
                            src={question.image}
                            alt="Question"
                            className="w-full max-w-md h-auto max-h-48 sm:max-h-64 rounded-lg border object-contain cursor-pointer hover:opacity-90 transition"
                            onClick={() => handleImageMaximize(question.image)}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleEdit(question)}
                        className="flex-1 sm:flex-none bg-yellow-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-yellow-600 text-sm sm:text-base transition"
                      >
                        تعديل / Edit
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="flex-1 sm:flex-none bg-red-500 text-white px-3 py-1.5 sm:py-1 rounded hover:bg-red-600 text-sm sm:text-base transition"
                      >
                        حذف / Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                    {question.answers.map((answer) => (
                      <div
                        key={answer.id}
                        className={`p-2 rounded ${
                          answer.isCorrect ? 'bg-yellow-100 border-2 border-yellow-500' : 'bg-gray-100 border border-gray-300'
                        }`}
                      >
                        <span className="font-semibold text-dark-600">{answer.id.toUpperCase()})</span> <span className="text-dark-600">{answer.text}</span>
                        {answer.isCorrect && <span className="text-yellow-500 ml-1 font-bold">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Maximize Modal */}
        {showImageModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative max-w-[95vw] max-h-[95vh] bg-white rounded-lg p-4">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 text-xl font-bold z-10"
              >
                ×
              </button>
              <img
                src={modalImageSrc}
                alt="Full size preview"
                className="max-w-full max-h-[90vh] rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl lg:max-w-4xl w-full max-h-[95vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingQuestion ? 'تعديل سؤال / Edit Question' : 'إضافة سؤال جديد / Add Question'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      السؤال (عربي) / Question (Arabic)
                    </label>
                    <div className="bg-white">
                      <ReactQuill
                        theme="snow"
                        value={formData.question}
                        onChange={(value) => setFormData({ ...formData, question: value })}
                        modules={quillModules}
                        placeholder="اكتب السؤال هنا... / Write question here..."
                        className="bg-white"
                        style={{ height: '200px', marginBottom: '50px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      السؤال (إنجليزي) / Question (English) - Optional
                    </label>
                    <div className="bg-white">
                      <ReactQuill
                        theme="snow"
                        value={formData.questionEn}
                        onChange={(value) => setFormData({ ...formData, questionEn: value })}
                        modules={quillModules}
                        placeholder="Write question in English..."
                        className="bg-white"
                        style={{ height: '200px', marginBottom: '50px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                      صورة السؤال / Question Image (Optional)
                    </label>
                    <div className="space-y-2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full px-3 py-2 text-sm md:text-base border rounded-lg"
                      />
                      {questionImagePreview && (
                        <div className="relative inline-block w-full max-w-md">
                          <div className="relative bg-gray-100 rounded-lg p-2 border-2 border-gray-300">
                            <div className="overflow-auto max-h-96 flex justify-center">
                              <img
                                src={questionImagePreview}
                                alt="Question preview"
                                className="rounded-lg transition-transform duration-200"
                                style={{ 
                                  width: `${imageScale}%`,
                                  maxWidth: '100%',
                                  height: 'auto'
                                }}
                              />
                            </div>
                            {/* Image Controls */}
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 bg-white rounded-lg p-2">
                              <button
                                type="button"
                                onClick={() => handleImageZoom(-10)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm md:text-base font-medium transition"
                                title="تصغير / Zoom Out"
                              >
                                ➖
                              </button>
                              <span className="text-xs md:text-sm text-gray-600 font-medium min-w-[60px] text-center">
                                {imageScale}%
                              </span>
                              <button
                                type="button"
                                onClick={() => handleImageZoom(10)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm md:text-base font-medium transition"
                                title="تكبير / Zoom In"
                              >
                                ➕
                              </button>
                              <button
                                type="button"
                                onClick={handleImageReset}
                                className="bg-blue-200 hover:bg-blue-300 text-blue-700 px-3 py-1 rounded text-sm md:text-base font-medium transition"
                                title="إعادة تعيين / Reset"
                              >
                                🔄
                              </button>
                              <button
                                type="button"
                                onClick={() => handleImageMaximize(questionImagePreview)}
                                className="bg-green-200 hover:bg-green-300 text-green-700 px-3 py-1 rounded text-sm md:text-base font-medium transition"
                                title="تكبير كامل / Maximize"
                              >
                                🔍
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="bg-red-200 hover:bg-red-300 text-red-700 px-3 py-1 rounded text-sm md:text-base font-medium transition"
                                title="حذف / Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="text-xs md:text-sm text-gray-500">الحد الأقصى: 5 ميجابايت / Maximum: 5MB</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm md:text-base font-medium text-dark-600 mb-3">
                      الإجابات / Answers (اختر الإجابة الصحيحة / Select Correct Answer)
                    </label>
                    {formData.answers.map((answer, index) => (
                      <div key={answer.id} className="mb-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={answer.isCorrect}
                            onChange={() => handleCorrectAnswerChange(index)}
                            className="w-4 h-4"
                          />
                          <span className="font-bold w-8">{answer.id.toUpperCase()})</span>
                          <input
                            type="text"
                            value={answer.text}
                            onChange={(e) => handleAnswerChange(index, 'text', e.target.value)}
                            placeholder="الإجابة (عربي) / Answer (Arabic)"
                            required
                            className="flex-1 px-3 py-2 border rounded"
                          />
                          <input
                            type="text"
                            value={answer.textEn}
                            onChange={(e) => handleAnswerChange(index, 'textEn', e.target.value)}
                            placeholder="Answer (English)"
                            className="flex-1 px-3 py-2 border rounded"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                      >
                        حفظ / Save
                      </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                    >
                      إلغاء / Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Questions;



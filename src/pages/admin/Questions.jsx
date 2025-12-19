import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getQuestions, getQuestionsByLevel, addQuestion, updateQuestion, deleteQuestion, getLevelsByChapter } from '../../services/storageService';

const Questions = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    questionEn: '',
    answers: [
      { id: 'a', text: '', textEn: '', isCorrect: false },
      { id: 'b', text: '', textEn: '', isCorrect: false },
      { id: 'c', text: '', textEn: '', isCorrect: false },
      { id: 'd', text: '', textEn: '', isCorrect: false },
    ],
  });

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

  const handleAddNew = () => {
    setEditingQuestion(null);
    setFormData({
      question: '',
      questionEn: '',
      answers: [
        { id: 'a', text: '', textEn: '', isCorrect: false },
        { id: 'b', text: '', textEn: '', isCorrect: false },
        { id: 'c', text: '', textEn: '', isCorrect: false },
        { id: 'd', text: '', textEn: '', isCorrect: false },
      ],
    });
    setShowForm(true);
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      questionEn: question.questionEn || '',
      answers: question.answers,
    });
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
    setFormData({
      question: '',
      questionEn: '',
      answers: [
        { id: 'a', text: '', textEn: '', isCorrect: false },
        { id: 'b', text: '', textEn: '', isCorrect: false },
        { id: 'c', text: '', textEn: '', isCorrect: false },
        { id: 'd', text: '', textEn: '', isCorrect: false },
      ],
    });
  };

  const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
  const selectedChapterObj = selectedSubjectObj?.chapters.find(c => c.id === selectedChapter);
  const levels = selectedChapter ? getLevelsByChapter(selectedChapter) : [];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">إدارة الأسئلة / Manage Questions</h1>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            ← رجوع / Back
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الفصل / Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => handleChapterChange(e.target.value)}
                disabled={!selectedSubject}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">اختر الفصل / Select Chapter</option>
                {selectedSubjectObj?.chapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name} / {chapter.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                الأسئلة ({questions.length}) / Questions ({questions.length})
              </h2>
              <button
                onClick={handleAddNew}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                + إضافة سؤال جديد / Add Question
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {index + 1}. {question.question}
                      </p>
                      {question.questionEn && (
                        <p className="text-sm text-gray-600">{question.questionEn}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(question)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      >
                        تعديل / Edit
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        حذف / Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {question.answers.map((answer) => (
                      <div
                        key={answer.id}
                        className={`p-2 rounded ${
                          answer.isCorrect ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100'
                        }`}
                      >
                        <span className="font-semibold">{answer.id.toUpperCase()})</span> {answer.text}
                        {answer.isCorrect && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingQuestion ? 'تعديل سؤال / Edit Question' : 'إضافة سؤال جديد / Add Question'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      السؤال (عربي) / Question (Arabic)
                    </label>
                    <textarea
                      value={formData.question}
                      onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      السؤال (إنجليزي) / Question (English) - Optional
                    </label>
                    <textarea
                      value={formData.questionEn}
                      onChange={(e) => setFormData({ ...formData, questionEn: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
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
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
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
  );
};

export default Questions;



import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSubjects, getSubjectById, getClassroomsBySubject, addClassroomToSubject, deleteClassroomFromSubject, addLessonToClassroom, deleteLessonFromClassroom, getClassroomById } from '../../services/storageService';
import Header from '../../components/Header';
import { isArabicBrowser } from '../../utils/language';

const ClassroomsManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subjectIdFromUrl = searchParams.get('subjectId');
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [lessons, setLessons] = useState([]);
  const [showAddClassroomForm, setShowAddClassroomForm] = useState(false);
  const [showAddLessonForm, setShowAddLessonForm] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newLessonName, setNewLessonName] = useState('');
  const [newLessonHasTest, setNewLessonHasTest] = useState(true);

  useEffect(() => {
    setSubjects(getSubjects());
    
    // If subjectId is in URL, auto-select it
    if (subjectIdFromUrl) {
      const subject = getSubjectById(subjectIdFromUrl);
      if (subject) {
        setSelectedSubject(subjectIdFromUrl);
      }
    }
  }, [subjectIdFromUrl]);

  useEffect(() => {
    if (selectedSubject) {
      setClassrooms(getClassroomsBySubject(selectedSubject));
      setSelectedClassroom('');
      setLessons([]);
    } else {
      setClassrooms([]);
      setLessons([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedClassroom) {
      const classroom = getClassroomById(selectedClassroom);
      setLessons(classroom ? (classroom.lessons || []) : []);
    } else {
      setLessons([]);
    }
  }, [selectedClassroom]);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedClassroom('');
    setLessons([]);
    setShowAddClassroomForm(false);
    setShowAddLessonForm(false);
  };

  const handleClassroomChange = (classroomId) => {
    setSelectedClassroom(classroomId);
    setShowAddLessonForm(false);
  };

  const handleAddClassroom = () => {
    if (!selectedSubject) {
      alert(isArabicBrowser() ? 'يرجى اختيار المادة أولاً' : 'Please select a subject first');
      return;
    }
    if (!newClassroomName.trim()) {
      alert(isArabicBrowser() ? 'يرجى إدخال اسم الفصل' : 'Please enter classroom name');
      return;
    }
    
    const success = addClassroomToSubject(selectedSubject, newClassroomName.trim());
    if (success) {
      setClassrooms(getClassroomsBySubject(selectedSubject));
      setNewClassroomName('');
      setShowAddClassroomForm(false);
    } else {
      alert(isArabicBrowser() ? 'حدث خطأ أثناء إضافة الفصل' : 'Error adding classroom');
    }
  };

  const handleDeleteClassroom = (classroomId) => {
    if (window.confirm(isArabicBrowser() ? 'هل أنت متأكد من حذف هذا الفصل؟ سيتم حذف جميع الدروس التابعة له أيضاً.' : 'Are you sure? This will also delete all lessons in this classroom.')) {
      const success = deleteClassroomFromSubject(classroomId);
      if (success) {
        setClassrooms(getClassroomsBySubject(selectedSubject));
        setSelectedClassroom('');
        setLessons([]);
      } else {
        alert(isArabicBrowser() ? 'حدث خطأ أثناء حذف الفصل' : 'Error deleting classroom');
      }
    }
  };

  const handleAddLesson = () => {
    if (!selectedClassroom) {
      alert(isArabicBrowser() ? 'يرجى اختيار الفصل أولاً' : 'Please select a classroom first');
      return;
    }
    if (!newLessonName.trim()) {
      alert(isArabicBrowser() ? 'يرجى إدخال اسم الدرس' : 'Please enter lesson name');
      return;
    }
    
    const success = addLessonToClassroom(selectedClassroom, newLessonName.trim(), newLessonHasTest);
    if (success) {
      const classroom = getClassroomById(selectedClassroom);
      setLessons(classroom ? (classroom.lessons || []) : []);
      setNewLessonName('');
      setNewLessonHasTest(true);
      setShowAddLessonForm(false);
    } else {
      alert(isArabicBrowser() ? 'حدث خطأ أثناء إضافة الدرس' : 'Error adding lesson');
    }
  };

  const handleDeleteLesson = (lessonId) => {
    if (window.confirm(isArabicBrowser() ? 'هل أنت متأكد من حذف هذا الدرس؟' : 'Are you sure you want to delete this lesson?')) {
      const success = deleteLessonFromClassroom(lessonId);
      if (success) {
        const classroom = getClassroomById(selectedClassroom);
        setLessons(classroom ? (classroom.lessons || []) : []);
      } else {
        alert(isArabicBrowser() ? 'حدث خطأ أثناء حذف الدرس' : 'Error deleting lesson');
      }
    }
  };

  const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-dark-600">
              {isArabicBrowser() ? 'إدارة الفصول الدراسية' : 'Manage Classrooms'}
            </h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
            >
              ← {isArabicBrowser() ? 'رجوع' : 'Back'}
            </button>
          </div>

          {/* Subject Filter */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm md:text-base font-medium text-dark-600 mb-2">
                  المادة / Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">{isArabicBrowser() ? 'اختر المادة' : 'Select Subject'}</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedSubject && (
            <>
              {/* Classrooms List */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                    {isArabicBrowser() ? 'الفصول الدراسية' : 'Classrooms'} ({classrooms.length})
                  </h2>
                  <button
                    onClick={() => setShowAddClassroomForm(true)}
                    className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                  >
                    + {isArabicBrowser() ? 'إضافة فصل دراسي جديد' : 'Add Classroom'}
                  </button>
                </div>

                {/* Add Classroom Form */}
                {showAddClassroomForm && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-primary-300">
                    <h3 className="text-lg font-bold text-dark-600 mb-3">
                      {isArabicBrowser() ? 'إضافة فصل دراسي جديد' : 'Add New Classroom'}
                    </h3>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newClassroomName}
                        onChange={(e) => setNewClassroomName(e.target.value)}
                        placeholder={isArabicBrowser() ? 'اسم الفصل الدراسي' : 'Classroom name'}
                        className="flex-1 px-4 py-2 border rounded-lg"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddClassroom();
                          }
                        }}
                      />
                      <button
                        onClick={handleAddClassroom}
                        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                      >
                        {isArabicBrowser() ? 'حفظ' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddClassroomForm(false);
                          setNewClassroomName('');
                        }}
                        className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
                      >
                        {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classrooms.map((classroom) => (
                    <div
                      key={classroom.id}
                      className={`border rounded-lg p-4 transition cursor-pointer ${
                        selectedClassroom === classroom.id
                          ? 'bg-primary-50 border-primary-500 border-2'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => handleClassroomChange(classroom.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-dark-600 mb-1">
                            {classroom.name}
                          </h3>
                          <p className="text-sm text-dark-500">
                            {isArabicBrowser() 
                              ? `${classroom.lessons?.length || 0} درس` 
                              : `${classroom.lessons?.length || 0} lessons`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClassroom(classroom.id);
                          }}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm font-medium ml-2"
                        >
                          {isArabicBrowser() ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {classrooms.length === 0 && !showAddClassroomForm && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      {isArabicBrowser() ? 'لا توجد فصول دراسية في هذه المادة' : 'No classrooms in this subject'}
                    </div>
                  )}
                </div>
              </div>

              {/* Lessons List for Selected Classroom */}
              {selectedClassroom && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-600">
                      {isArabicBrowser() ? 'دروس الفصل' : 'Classroom Lessons'} ({lessons.length})
                    </h2>
                    <button
                      onClick={() => setShowAddLessonForm(true)}
                      className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition font-medium"
                    >
                      + {isArabicBrowser() ? 'إضافة درس جديد' : 'Add Lesson'}
                    </button>
                  </div>

                  {/* Add Lesson Form */}
                  {showAddLessonForm && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-primary-300">
                      <h3 className="text-lg font-bold text-dark-600 mb-3">
                        {isArabicBrowser() ? 'إضافة درس جديد' : 'Add New Lesson'}
                      </h3>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newLessonName}
                          onChange={(e) => setNewLessonName(e.target.value)}
                          placeholder={isArabicBrowser() ? 'اسم الدرس' : 'Lesson name'}
                          className="w-full px-4 py-2 border rounded-lg"
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddLesson();
                            }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="hasTest"
                            checked={newLessonHasTest}
                            onChange={(e) => setNewLessonHasTest(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="hasTest" className="text-dark-600">
                            {isArabicBrowser() ? 'يحتوي على اختبار' : 'Has test/quiz'}
                          </label>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleAddLesson}
                            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                          >
                            {isArabicBrowser() ? 'حفظ' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddLessonForm(false);
                              setNewLessonName('');
                              setNewLessonHasTest(true);
                            }}
                            className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
                          >
                            {isArabicBrowser() ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-dark-600 mb-1">
                              {lesson.name}
                            </h3>
                            {lesson.hasTest && (
                              <p className="text-xs text-green-600 font-medium">
                                {isArabicBrowser() ? '✓ يحتوي على اختبار' : '✓ Has test'}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm font-medium ml-2"
                          >
                            {isArabicBrowser() ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {lessons.length === 0 && !showAddLessonForm && (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        {isArabicBrowser() ? 'لا توجد دروس في هذا الفصل' : 'No lessons in this classroom'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassroomsManagement;









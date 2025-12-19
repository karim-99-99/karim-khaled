const VideoModal = ({ isOpen, onClose, videoUrl, title = 'فيديو تعليمي' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition text-2xl"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="aspect-video w-full">
            {videoUrl && videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
              <iframe
                src={videoUrl.includes('embed') ? videoUrl : `https://www.youtube.com/embed/${videoUrl.split('/').pop().split('?')[0]}`}
                className="w-full h-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={videoUrl}
                controls
                className="w-full h-full rounded"
              >
                متصفحك لا يدعم تشغيل الفيديو
              </video>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;


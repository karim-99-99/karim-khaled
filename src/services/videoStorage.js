// IndexedDB storage for large video files

const DB_NAME = 'EducationalSystemDB';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(new Error(`Failed to open database: ${event.target.error?.message || 'Unknown error'}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE, { keyPath: 'levelId' });
      }
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked. Please close other tabs with this site open.');
      reject(new Error('Database upgrade blocked. Please close other tabs.'));
    };
  });
};

// Save video file to IndexedDB
export const saveVideoFile = async (levelId, videoFile, metadata) => {
  try {
    const db = await initDB();
    
    // Convert file to ArrayBuffer for storage
    let arrayBuffer;
    try {
      arrayBuffer = await videoFile.arrayBuffer();
    } catch (error) {
      console.error('Error converting file to ArrayBuffer:', error);
      throw new Error('Failed to read video file. Please try again.');
    }

    const videoData = {
      levelId,
      fileData: arrayBuffer,
      fileName: videoFile.name,
      fileType: videoFile.type,
      fileSize: videoFile.size,
      metadata: {
        title: metadata.title,
        titleEn: metadata.titleEn,
        uploadedAt: new Date().toISOString(),
      },
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE);
      
      transaction.onerror = (event) => {
        console.error('Transaction error:', event.target.error);
        reject(new Error('Failed to save video. Database transaction error.'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      const request = store.put(videoData);
      request.onerror = (event) => {
        console.error('Store request error:', event.target.error);
        reject(new Error(`Failed to save video: ${event.target.error?.message || 'Unknown error'}`));
      };
    });
  } catch (error) {
    console.error('Error saving video file:', error);
    throw error;
  }
};

// Get video file from IndexedDB
export const getVideoFile = async (levelId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([VIDEO_STORE], 'readonly');
    const store = transaction.objectStore(VIDEO_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(levelId);
      request.onsuccess = () => {
        if (request.result) {
          // Convert ArrayBuffer back to Blob
          const blob = new Blob([request.result.fileData], { type: request.result.fileType });
          const url = URL.createObjectURL(blob);
          resolve({
            url,
            fileName: request.result.fileName,
            fileType: request.result.fileType,
            fileSize: request.result.fileSize,
            metadata: request.result.metadata,
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting video file:', error);
    throw error;
  }
};

// Delete video file from IndexedDB
export const deleteVideoFile = async (levelId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([VIDEO_STORE], 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(levelId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting video file:', error);
    throw error;
  }
};

// Get video file size for a level
export const getVideoFileSize = async (levelId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([VIDEO_STORE], 'readonly');
    const store = transaction.objectStore(VIDEO_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(levelId);
      request.onsuccess = () => {
        resolve(request.result ? request.result.fileSize : 0);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting video file size:', error);
    return 0;
  }
};


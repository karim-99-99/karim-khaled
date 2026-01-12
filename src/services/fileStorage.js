// IndexedDB storage for PDF/Word file attachments

const DB_NAME = 'EducationalSystemDB';
const DB_VERSION = 2; // Incremented to add file store
const FILE_STORE = 'files';

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
      // Create file store if it doesn't exist
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE, { keyPath: 'itemId' });
      }
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked. Please close other tabs with this site open.');
      reject(new Error('Database upgrade blocked. Please close other tabs.'));
    };
  });
};

// Save file attachment to IndexedDB
export const saveFileAttachment = async (itemId, file, metadata) => {
  try {
    const db = await initDB();
    
    // Convert file to ArrayBuffer for storage
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (error) {
      console.error('Error converting file to ArrayBuffer:', error);
      throw new Error('Failed to read file. Please try again.');
    }

    const fileData = {
      itemId,
      fileData: arrayBuffer,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      metadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata
      },
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILE_STORE], 'readwrite');
      const store = transaction.objectStore(FILE_STORE);
      
      transaction.onerror = (event) => {
        console.error('Transaction error:', event.target.error);
        reject(new Error('Failed to save file. Database transaction error.'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      const request = store.put(fileData);
      request.onerror = (event) => {
        console.error('Store request error:', event.target.error);
        reject(new Error(`Failed to save file: ${event.target.error?.message || 'Unknown error'}`));
      };
    });
  } catch (error) {
    console.error('Error saving file attachment:', error);
    throw error;
  }
};

// Get file attachment from IndexedDB
export const getFileAttachment = async (itemId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([FILE_STORE], 'readonly');
    const store = transaction.objectStore(FILE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(itemId);
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
    console.error('Error getting file attachment:', error);
    throw error;
  }
};

// Delete file attachment from IndexedDB
export const deleteFileAttachment = async (itemId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([FILE_STORE], 'readwrite');
    const store = transaction.objectStore(FILE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting file attachment:', error);
    throw error;
  }
};

// Get file attachment size for an item
export const getFileAttachmentSize = async (itemId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([FILE_STORE], 'readonly');
    const store = transaction.objectStore(FILE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(itemId);
      request.onsuccess = () => {
        resolve(request.result ? request.result.fileSize : 0);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting file attachment size:', error);
    return 0;
  }
};









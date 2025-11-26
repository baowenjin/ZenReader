import { BookData } from './types';

const DB_NAME = 'ZenReaderDB';
const DB_VERSION = 5; // Bumped to 5 to fix missing object stores
const STORE_NAME = 'books';
const HANDLE_STORE_NAME = 'handles';

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("DB Open Error:", (event.target as IDBOpenDBRequest).error);
      reject('Error opening database');
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Ensure 'books' store exists
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      
      // Ensure 'handles' store exists
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      // Close the init connection so it doesn't block future versions or other ops
      const db = request.result;
      db.close();
      resolve();
    };
  });
};

export const saveBook = (book: BookData): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(book);
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject('Error saving book transaction');
        };
      } catch (err) {
        db.close();
        reject('Error creating transaction: ' + err);
      }
    };
    request.onerror = () => reject('Error opening DB for save');
  });
};

export const getAllBooks = (): Promise<BookData[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const books = getAllRequest.result as BookData[];
          // Sort by last read (descending)
          books.sort((a, b) => b.lastReadAt - a.lastReadAt);
          db.close();
          resolve(books);
        };
        getAllRequest.onerror = () => {
          db.close();
          reject('Error fetching books');
        };
      } catch (err) {
        db.close();
        reject('Error creating transaction for get: ' + err);
      }
    };
    request.onerror = () => reject('Error opening DB for get');
  });
};

export const updateBookProgress = (id: string, pageIndex: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const data = getRequest.result as BookData;
          if (data) {
            data.currentPageIndex = pageIndex;
            data.lastReadAt = Date.now();
            store.put(data);
          }
          // Do not resolve here, wait for transaction complete
        };

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = (e) => {
           db.close();
           reject(e);
        };
      } catch (err) {
        db.close();
        reject(err);
      }
    };
    request.onerror = () => reject('Error opening DB for update');
  });
};

export const deleteBook = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = (e) => {
           db.close();
           reject(e);
        };
      } catch (err) {
        db.close();
        reject(err);
      }
    };
    request.onerror = () => reject('Error opening DB for delete');
  });
};

// --- Directory Handle Persistence ---

export const saveDirectoryHandle = (handle: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
       const db = request.result;
       try {
         const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
         tx.objectStore(HANDLE_STORE_NAME).put(handle, 'syncDir');
         tx.oncomplete = () => {
           db.close();
           resolve();
         };
         tx.onerror = () => {
           db.close();
           reject('Failed to save handle');
         };
       } catch (err) {
         db.close();
         reject('Error creating handle transaction: ' + err);
       }
    };
    request.onerror = () => reject('Error opening DB to save handle');
  });
};

export const getDirectoryHandle = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
       const db = request.result;
       try {
         const tx = db.transaction(HANDLE_STORE_NAME, 'readonly');
         const getReq = tx.objectStore(HANDLE_STORE_NAME).get('syncDir');
         getReq.onsuccess = () => {
           db.close();
           resolve(getReq.result);
         };
         getReq.onerror = () => {
           db.close();
           resolve(null);
         };
       } catch (err) {
         db.close();
         resolve(null); // Fail gracefully
       }
    };
    request.onerror = () => resolve(null);
  });
};
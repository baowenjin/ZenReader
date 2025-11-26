
import { BookData } from './types';

const DB_NAME = 'ZenReaderDB';
const DB_VERSION = 2; // Bumped version to force onupgradeneeded
const STORE_NAME = 'books';

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("DB Open Error:", (event.target as IDBOpenDBRequest).error);
      reject('Error opening database');
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve();
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
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject('Error saving book transaction');
      } catch (err) {
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
          resolve(books);
        };
        getAllRequest.onerror = () => reject('Error fetching books');
      } catch (err) {
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
          resolve();
        };
      } catch (err) {
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
        transaction.oncomplete = () => resolve();
      } catch (err) {
        reject(err);
      }
    };
    request.onerror = () => reject('Error opening DB for delete');
  });
};

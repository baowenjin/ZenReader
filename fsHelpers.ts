
import { ReaderSettings } from './types';

export const SYNC_FILENAME = 'zenreader_sync.json';

// Type definitions for File System Access API
// These are standard in modern browsers but TS might not have them by default without types
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(descriptor?: any): Promise<PermissionState>;
  requestPermission(descriptor?: any): Promise<PermissionState>;
}

export interface SyncState {
  updatedAt: number;
  settings?: ReaderSettings;
  progress: Record<string, { pageIndex: number; lastReadAt: number }>;
}

/**
 * Helper to verify read/write permission for a handle.
 * If not granted, requests it.
 */
export const verifyPermission = async (
  fileHandle: FileSystemHandle,
  readWrite: boolean = false
): Promise<boolean> => {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  
  // Check if permission was already granted
  // @ts-ignore
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  
  // Request permission
  // @ts-ignore
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  
  return false;
};

/**
 * Reads the sync JSON file from the directory.
 * Returns null if file doesn't exist or can't be read.
 */
export const readSyncFile = async (dirHandle: any): Promise<SyncState | null> => {
  try {
    const fileHandle = await dirHandle.getFileHandle(SYNC_FILENAME, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as SyncState;
  } catch (error) {
    // File likely doesn't exist, which is fine
    return null;
  }
};

/**
 * Writes the sync JSON file to the directory.
 */
export const writeSyncFile = async (dirHandle: any, data: SyncState): Promise<void> => {
  try {
    const fileHandle = await dirHandle.getFileHandle(SYNC_FILENAME, { create: true });
    // Create a writable stream
    const writable = await fileHandle.createWritable();
    // Write the data
    await writable.write(JSON.stringify(data, null, 2));
    // Close the file
    await writable.close();
  } catch (error) {
    console.error("Failed to write sync file:", error);
    throw error;
  }
};

/**
 * Retrieves the stored directory handle from IndexedDB (if supported)
 * Note: We usually store this in a separate IDB store.
 */
export const getStoredDirectoryHandle = async (): Promise<any | null> => {
   // Logic for this is moved to db.ts to keep IDB logic centralized, 
   // but this helper file focuses on the FileSystem interactions.
   return null; 
};

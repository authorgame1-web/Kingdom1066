export interface LocalSaveSlot {
  id: string;
  label: string;
  year: number;
  ruler: string;
  savedAt: number;
  payload: string;
}

const DB_NAME = 'kerajaan1066_localdb';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

export async function putLocalSaveSlot(slot: LocalSaveSlot): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore IndexedDB failures when storage is restricted
  }
}

export async function listLocalSaveSlots(): Promise<LocalSaveSlot[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<LocalSaveSlot[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as LocalSaveSlot[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function getLocalSaveSlot(id: string): Promise<LocalSaveSlot | null> {
  try {
    const db = await openDb();
    const row = await new Promise<LocalSaveSlot | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result as LocalSaveSlot | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return row || null;
  } catch {
    return null;
  }
}

export async function deleteLocalSaveSlot(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export function downloadJsonFile(filename: string, jsonText: string): boolean {
  try {
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch {
    return false;
  }
}

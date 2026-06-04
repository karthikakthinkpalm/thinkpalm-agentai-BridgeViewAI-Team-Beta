import { openDB } from 'idb';

const DB_NAME = 'bridgeview-ai';
const STORE_NAME = 'history';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export interface HistoryEntry {
  id: string;
  prd: string;
  schema: object;
  widgets: string[];
  savedAt: string;
}

export async function saveRun(
  prd: string,
  schema: object,
  widgets: string[]
): Promise<void> {
  const db = await getDB();
  const entry: HistoryEntry = {
    id: Date.now().toString(),
    prd,
    schema,
    widgets,
    savedAt: new Date().toLocaleString(),
  };
  await db.put(STORE_NAME, entry);
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.reverse(); // newest first
}

export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
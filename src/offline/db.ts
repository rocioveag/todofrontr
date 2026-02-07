import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface TodoSchema extends DBSchema {
  tasks: {
    key: string;
    value: any;
  };
  outbox: {
    key: number;
    value: any;
  };
  meta: {
    key: string;
    value: string;
  };
}

let dbPromise: Promise<IDBPDatabase<TodoSchema>> | undefined;

export function getDB(): Promise<IDBPDatabase<TodoSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<TodoSchema>("todo-pwa", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("tasks")) {
          db.createObjectStore("tasks", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbPromise;
}


export async function getOutbox() {
  const db = await getDB();
  return db.getAll('outbox');
}

export async function clearOutbox() {
  const db = await getDB();
  return db.clear('outbox');
}

export async function setMapping(key: string, value: string) {
  const db = await getDB();
  return db.put('meta', value, key);
}

export async function getMapping(key: string) {
  const db = await getDB();
  return db.get('meta', key);
}

export async function removeTaskLocal(id: string) {
  const db = await getDB();
  return db.delete('tasks', id);
}

export async function promoteLocalToServer(localId: string, serverData: any) {
  const db = await getDB();
  const tx = db.transaction(['tasks', 'meta'], 'readwrite');
  await tx.objectStore('tasks').put(serverData);
  await tx.objectStore('meta').put(serverData.id, localId);
  await tx.done;
}
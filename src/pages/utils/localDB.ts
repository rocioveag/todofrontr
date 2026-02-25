import {openDB} from 'idb';

const DB_NAME = 'taskDB';
const STORE_NAME = 'tasks';

export const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db){
        if(!db.objectStoreNames.contains(STORE_NAME)){
            db.createObjectStore(STORE_NAME, {keyPath: 'id', autoIncrement: true});
        }
    },
});

export async function saveTask(task: any) {
    const db = await dbPromise;
    return db.put(STORE_NAME, task);
}

export async function getTasks() {
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
}

export async function deleteTask(id: any) {
    const db = await dbPromise;
    return db.delete(STORE_NAME, id);
}
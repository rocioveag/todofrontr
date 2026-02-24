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

//guardar una tarea en la base de datos local
export async function saveTask(task){
    const db = await dbPromise;
    return db.put(STORE_NAME, task);
}

//Obtener todas las tareas de la base de datos local
export async function getTasks(){
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
}

//Eliminar una tarea de la base de datos local
export async function deleteTask(id){
    const db = await dbPromise;
    // continúa fuera de pantalla...
    return db.delete(STORE_NAME, id);
}

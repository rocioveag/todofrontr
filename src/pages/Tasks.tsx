import { getDB } from "../offline/db";
export async function cacheTasks(list: any[]) {
  const db = await getDB();
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");
  
  await store.clear(); 
  for (const task of list) {
    await store.put(task);
  }
  await tx.done;
}

export async function putTaskLocal(task: any) {
  const db = await getDB();
  await db.put("tasks", task);
}

export async function getAllTasksLocal() {
  const db = await getDB();
  const tasks = await db.getAll("tasks");
  return tasks || [];
}

export async function removeTaskLocal(id: string) {
  const db = await getDB();
  await db.delete("tasks", id);
}

export async function promoteLocalToServer(clientId: string, serverId: string) {
  const db = await getDB();
  const task = await db.get("tasks", clientId);
  
  if (task) {
    await db.delete("tasks", clientId);
    task.id = serverId;
    task.pending = false;
    await db.put("tasks", task);
  }
}
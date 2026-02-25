import { db } from "../offline/db";
export async function cacheTasks(list: any[]) {
  const d = await db();
  const tx = d.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");
  await store.clear();
  for (const task of list) {
    await store.put(task);
  }
  await tx.done;
}

export async function putTaskLocal(task: any) {
  const d = await db();
  await d.put("tasks", task);
}

export async function getAllTasksLocal() {
  const d = await db();
  return (await d.getAll("tasks")) || [];
}

export async function removeTaskLocal(id: string) {
  const d = await db();
  await d.delete("tasks", id);
}

export async function promoteLocalToServer(clientId: string, serverId: string) {
  const d = await db();
  const task = await d.get("tasks", clientId);
  if (task) {
    await d.delete("tasks", clientId);
    task.id = serverId;
    task.pending = false;
    await d.put("tasks", task);
  }
}
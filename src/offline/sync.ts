import { api } from "../api";
import {
  getOutbox, clearOutbox, setMapping, getMapping,
  removeTaskLocal, promoteLocalToServer
} from "./db";

export async function syncNow() {
  if (!navigator.onLine) return;

  const ops = (await getOutbox() as any[]).sort((a,b)=>a.ts-b.ts);
  if (!ops.length) return;

  let syncFailed = false;

  const toSync: any[] = [];
  for (const op of ops) {
    if (op.op === "create") {
      toSync.push({
        clienteId: op.clienteId,
        title: op.data.title,
        description: op.data.description ?? "",
        status: op.data.status ?? "Pendiente",
      });
    } else if (op.op === "update") {
      const cid = op.clienteId;
      if (cid) {
        toSync.push({
          clienteId: cid,
          title: op.data.title,
          description: op.data.description,
          status: op.data.status,
        });
      } else if (op.serverId) {
        try { await api.put(`/tasks/${op.serverId}`, op.data); } catch {}
      }
    }
  }

  if (toSync.length) {
    try {
      const { data } = await api.post("/tasks/bulksync", { tasks: toSync });
      for (const map of data?.mapping || []) {
        await setMapping(map.clienteId, map.serverId);
        await promoteLocalToServer(map.clienteId, map.serverId);
      }
    } catch {
      syncFailed = true;
    }
  }

  for (const op of ops) {
    if (op.op !== "delete") continue;
    const serverId = op.serverId ?? (op.clienteId ? await getMapping(op.clienteId) : undefined);
    if (!serverId) continue;
    try { await api.delete(`/tasks/${serverId}`); await removeTaskLocal(op.clienteId || serverId); } catch {}
  }

  if (!syncFailed) await clearOutbox();
} // 👈 aquí cierra syncNow

// 👇 setupOnlineSync FUERA de syncNow
export function setupOnlineSync() {
  const handler = () => { void syncNow(); };
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
import { api } from '../api';
import { 
  getOutbox,
  clearOutbox,
  setMapping,
  getMapping,
  removeTaskLocal,
  promoteLocalToServer,
} from './db';

let syncing = false;
let _lastSyncAt = 0;

export function getLastSyncAt() {
  return _lastSyncAt;
}

export async function syncNow() {
  if (syncing) return;
  syncing = true;

  try {
    const ops = await getOutbox();
    if (!ops.length) return;

    const toSync: any[] = [];
    for (const op of ops) {
      if (op.op === "create") {
        toSync.push({
          clientId: op.clientId,
          title: op.data.title,
          description: op.data.description ?? "",
        });
      }
    }

    if (toSync.length > 0) {
      const response = await api.post('/tasks/batch', { tasks: toSync });
      const createdTasks = response.data;

      for (const task of createdTasks) {
        await promoteLocalToServer(task.clientId, task.id);
        await setMapping(task.clientId, task.id);
      }
    }

    for (const op of ops) {
      if (op.op === "update") {
        let serverId = op.id;
        if (op.clientId) {
          serverId = await getMapping(op.clientId) || op.id;
        }
        
        await api.put(`/tasks/${serverId}`, op.data);
      } else if (op.op === "delete") {
        let serverId = op.id;
        if (op.clientId) {
          serverId = await getMapping(op.clientId) || op.id;
        }
        
        await api.delete(`/tasks/${serverId}`);
        await removeTaskLocal(op.clientId || op.id);
      }
    }

    await clearOutbox();
    _lastSyncAt = Date.now();

  } catch (error) {
    console.error('Error en sincronización:', error);
  } finally {
    syncing = false;
  }
}
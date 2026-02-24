import axios from 'axios';
import { getTasks, saveTask } from '../utils/localDB';

export const syncTasksWithServer = async () => {
if (!navigator.onLine) return;
    const token = localStorage.getItem('token');
    const tasks = await getTasks();
    const unsyncedTasks = tasks.filter((task) => !task.synced);

    for (const task of unsyncedTasks) {
        try {
            const response = await axios.post(
                'http://localhost:5000/api/tasks',
                task,
                {
                    headers: {
                        Authorization: token,
                    },
                }
            );

            task.synced = true;
            await saveTask(task);
        } catch (error: any) {
            console.error('Error al sincronizar tarea:', error);
        }
    }
};
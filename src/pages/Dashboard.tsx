import React, { useState, useEffect } from 'react';
import { 
    Container, Box, Typography, TextField, Button, List, 
    ListItem, ListItemText, ListItemSecondaryAction, IconButton, 
    Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select 
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { saveTask, getTasks, deleteTask } from '../utils/localDB';
import { checkConnection, listenForReconnection } from '../utils/connectionStatus';

interface Task {
    id: number;
    title: string;
    description?: string;
    status: string;
    pendingSync?: boolean;
}

const Dashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [open, setOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

    // Obtener tareas (Online y Offline)
    const fetchTasks = async () => {
        const offlineTasks = await getTasks();

        if (checkConnection()) {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('http://localhost:5000/api/tasks', {
                    headers: { Authorization: token },
                });

                const syncedTaskIds = new Set(response.data.map((task: Task) => task.id));
                const filteredOfflineTasks = offlineTasks.filter(task => !syncedTaskIds.has(task.id));

                setTasks([...response.data, ...filteredOfflineTasks]);
            } catch (error) {
                setErrorMessage('Error al obtener las tareas.');
            }
        } else {
            setTasks(offlineTasks);
        }
    };

    // Agregar una tarea (Online y Offline)
    const handleAddTask = async () => {
        const newTask: Task = {
            id: Date.now(),
            title: taskTitle,
            description: taskDescription,
            status: 'Pendiente',
            pendingSync: !checkConnection(),
        };

        if (checkConnection()) {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.post(
                    'http://localhost:5000/api/tasks',
                    { title: taskTitle, description: taskDescription, status: 'Pendiente' },
                    { headers: { Authorization: token } }
                );

                setTasks(prev => [...prev, response.data]);
                fetchTasks();
            } catch (error) {
                setErrorMessage('Error al agregar tarea.');
            }
        } else {
            await saveTask(newTask);
            setTasks(prev => [...prev, newTask]);
        }

        setTaskTitle('');
        setTaskDescription('');
    };

    // Sincronizar tareas pendientes cuando hay conexión
    const syncTasksWithServer = async () => {
        const offlineTasks = await getTasks();
        if (offlineTasks.length === 0) return;

        const token = localStorage.getItem('token');

        for (const task of offlineTasks) {
            if (task.pendingSync) {
                try {
                    const response = await axios.post(
                        'http://localhost:5000/api/tasks',
                        { title: task.title, description: task.description, status: task.status },
                        { headers: { Authorization: token } }
                    );

                    setTasks(prev => prev.map(t => (t.id === task.id ? response.data : t)));
                    await deleteTask(task.id);
                } catch (error) {
                    console.error('Error sincronizando tarea:', error);
                }
            } else {
                // Si la tarea fue editada sin conexión, actualizar en el servidor
                try {
                    const response = await axios.put(
                        `http://localhost:5000/api/tasks/${task.id}`,
                        { title: task.title, description: task.description, status: task.status },
                        { headers: { Authorization: token } }
                    );

                    setTasks(prev => prev.map(t => (t.id === task.id ? response.data : t)));
                    await deleteTask(task.id);
                } catch (error) {
                    console.error('Error sincronizando tarea editada:', error);
                }
            }
        }

        fetchTasks();
    };

    // Abrir diálogo de edición con la tarea seleccionada
    const handleEditClick = (task: Task) => {
        setEditTask(task);
        setOpen(true);
    };

    // Editar una tarea (Online y Offline)
    const handleUpdateTask = async () => {
        if (!editTask) return;

        if (checkConnection()) {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.put(
                    `http://localhost:5000/api/tasks/${editTask.id}`,
                    { title: editTask.title, description: editTask.description, status: editTask.status },
                    { headers: { Authorization: token } }
                );

                setTasks(tasks.map(task => (task.id === editTask.id ? response.data : task)));
            } catch (error) {
                setErrorMessage('Error al actualizar tarea.');
            }
        } else {
            // Guardar cambios en IndexedDB si no hay conexión
            await saveTask({ ...editTask, pendingSync: true });
            setTasks(prev => prev.map(task => (task.id === editTask.id ? { ...editTask, pendingSync: true } : task)));
        }

        setOpen(false);
    };
    
    // Eliminar una tarea (Online y Offline)
    const handleDeleteTask = (task: Task) => {
        setTaskToDelete(task);
        setDeleteDialogOpen(true);
    };
    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;

        if (checkConnection()) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5000/api/tasks/${taskToDelete.id}`, {
                    headers: { Authorization: token },
                });

                setTasks(prev => prev.filter(task => task.id !== taskToDelete.id));
            } catch (error) {
                setErrorMessage('Error al eliminar tarea.');
            }
        } else {
            await deleteTask(taskToDelete.id);
            setTasks(prev => prev.filter(task => task.id !== taskToDelete.id));
        }

        setDeleteDialogOpen(false);
    };

    useEffect(() => {
        fetchTasks();
        listenForReconnection(syncTasksWithServer);
    }, []);

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 8, textAlign: 'center' }}>
                <Typography variant="h4">Mis Tareas</Typography>

                {/* Inputs para crear nueva tarea */}
                <TextField fullWidth label="Nueva Tarea" variant="outlined" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                <TextField fullWidth label="Descripción" variant="outlined" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} sx={{ mt: 2 }} />
                <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleAddTask} fullWidth>Agregar Tarea</Button>

                <List sx={{ mt: 4 }}>
                    {tasks.map(task => (
                        <ListItem key={task.id} divider>
                            <ListItemText
                                primary={`${task.title} ${task.pendingSync ? '(Pendiente de sincronización)' : ''}`}
                                secondary={`Estado: ${task.status} | Descripción: ${task.description || 'No especificada'}`}
                            />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" onClick={() => handleEditClick(task)}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton edge="end" onClick={() => handleDeleteTask(task)}>
                                    <DeleteIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            </Box>
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>¿Estás seguro de que deseas eliminar esta tarea?</DialogTitle>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                    <Button variant="contained" color="error" onClick={confirmDeleteTask}>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL DE EDICIÓN */}
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Editar Tarea</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Título" value={editTask?.title || ''} onChange={(e) => setEditTask(prev => prev ? { ...prev, title: e.target.value } : null)} />
                    <TextField fullWidth label="Descripción" value={editTask?.description || ''} onChange={(e) => setEditTask(prev => prev ? { ...prev, description: e.target.value } : null)} sx={{ mt: 2 }} />
                    <Select fullWidth value={editTask?.status || 'Pendiente'} onChange={(e) => setEditTask(prev => prev ? { ...prev, status: e.target.value } : null)} sx={{ mt: 2 }}>
                        <MenuItem value="Pendiente">Pendiente</MenuItem>
                        <MenuItem value="En Progreso">En Progreso</MenuItem>
                        <MenuItem value="Completado">Completado</MenuItem>
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleUpdateTask}>Guardar Cambios</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Dashboard;

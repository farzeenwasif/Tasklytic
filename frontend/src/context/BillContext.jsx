import { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { UserContext } from './UserContext';
import * as taskApi from '../services/taskService';

export const TaskContext = createContext();

// Backend uses _id and ISO dates; the UI uses id and YYYY-MM-DD (for <input type="date">)
const normalizeTask = (t) => ({
  ...t,
  id: t._id,
  dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : '',
});

// Strip UI-only/readonly fields before sending to the API
const toPayload = (t) => {
  // eslint-disable-next-line no-unused-vars
  const { id, _id, userId, createdAt, updatedAt, __v, ...rest } = t;
  return rest;
};

export function TaskProvider({ children }) {
  const { user } = useContext(UserContext);

  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await taskApi.getTasks();
      setTasks(data.map(normalizeTask));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load this user's tasks whenever the logged-in user changes; clear on logout
  useEffect(() => {
    setSelectedTasks([]);
    if (user?.id) {
      refreshTasks();
    } else {
      setTasks([]);
    }
  }, [user?.id, refreshTasks]);

  const addTask = useCallback(async (taskData) => {
    const created = normalizeTask(await taskApi.createTask(toPayload(taskData)));
    setTasks(prev => [created, ...prev]);
    return created;
  }, []);

  const updateTask = useCallback(async (id, taskData) => {
    const updated = normalizeTask(await taskApi.updateTask(id, toPayload(taskData)));
    setTasks(prev => prev.map(task => (task.id === id ? updated : task)));
    return updated;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await taskApi.deleteTask(id);
    setTasks(prev => prev.filter(task => task.id !== id));
    setSelectedTasks(prev => prev.filter(taskId => taskId !== id));
  }, []);

  const bulkDeleteTasks = useCallback(async (ids) => {
    await taskApi.bulkDeleteTasks(ids);
    setTasks(prev => prev.filter(task => !ids.includes(task.id)));
    setSelectedTasks([]);
  }, []);

  const toggleTaskSelection = useCallback((id) => {
    setSelectedTasks(prev =>
      prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]
    );
  }, []);

  const selectAllTasks = useCallback(() => {
    setSelectedTasks(prev => (prev.length === tasks.length ? [] : tasks.map(task => task.id)));
  }, [tasks]);

  const clearSelection = useCallback(() => {
    setSelectedTasks([]);
  }, []);

  const getTaskStats = useCallback(() => ({
    readyToAssign: tasks.filter(t => t.status === 'Ready to Assign').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    scheduled: tasks.filter(t => t.category === 'Meeting').length,
    totalHoursLogged: tasks.reduce((sum, t) => sum + (Number(t.hoursLogged) || 0), 0),
  }), [tasks]);

  const value = {
    tasks,
    selectedTasks,
    loading,
    error,
    refreshTasks,
    addTask,
    updateTask,
    deleteTask,
    bulkDeleteTasks,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    getTaskStats,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

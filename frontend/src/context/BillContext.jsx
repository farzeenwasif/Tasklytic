import { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { UserContext } from './UserContext';
import * as taskApi from '../services/taskService';
import { daysUntilDue, isDone, localToday } from '../utils/taskUtils';

export const TaskContext = createContext();

// Backend uses _id and ISO dates; the UI uses id and YYYY-MM-DD (for <input type="date">)
const normalizeTask = (t) => ({
  ...t,
  id: t._id,
  dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : '',
  dueTime: t.dueTime || '',
  subtasks: (t.subtasks || []).map((s) => ({ title: s.title, done: Boolean(s.done) })),
  repeat: t.repeat || 'none',
  clientId: t.clientId || '',
  billId: t.billId || '',
});

// Strip UI-only/readonly fields before sending to the API
const toPayload = (t) => {
  // eslint-disable-next-line no-unused-vars
  const { id, _id, userId, createdAt, updatedAt, __v, next, timerStartedAt, completedAt, assignee, billId, paymentId, nextCreated, legacyStatus, ...rest } = t;
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

  // Merge tasks returned by the API into the list (replace by id, add new ones on top)
  const mergeTasks = useCallback((changed) => {
    const list = changed.filter(Boolean).map(normalizeTask);
    setTasks(prev => {
      const known = new Set(prev.map(t => t.id));
      const byId = new Map(list.map(t => [t.id, t]));
      return [...list.filter(t => !known.has(t.id)), ...prev.map(t => byId.get(t.id) || t)];
    });
    return list;
  }, []);

  // Send only `changes` (not the whole task) so a running timer is never overwritten.
  // Completing a repeating task also returns the next occurrence as `next`.
  const updateTask = useCallback(async (id, changes) => {
    const { next, ...updated } = await taskApi.updateTask(id, { ...toPayload(changes), today: localToday() });
    mergeTasks([updated, next]);
    return normalizeTask(updated);
  }, [mergeTasks]);

  const addTasks = useCallback(async (list) => mergeTasks(await taskApi.bulkCreateTasks(list.map(toPayload))), [mergeTasks]);

  const rescheduleTasks = useCallback(
    async (ids, dueDate) => mergeTasks(await taskApi.rescheduleTasks(ids, dueDate)),
    [mergeTasks]
  );

  // Tick the task off (or bring it back)
  const toggleDone = useCallback(
    (task) => updateTask(task.id, { status: isDone(task) ? 'To do' : 'Done' }),
    [updateTask]
  );

  const toggleSubtask = useCallback(
    (task, index) =>
      updateTask(task.id, {
        subtasks: task.subtasks.map((s, i) => (i === index ? { ...s, done: !s.done } : s)),
      }),
    [updateTask]
  );

  // Focus timer: only one task is timed at once
  const startTimer = useCallback(async (id) => mergeTasks(await taskApi.startTimer(id)), [mergeTasks]);
  const stopTimer = useCallback(async (id) => mergeTasks([await taskApi.stopTimer(id)]), [mergeTasks]);

  const removeLocal = useCallback((ids) => {
    setTasks(prev => prev.filter(task => !ids.includes(task.id)));
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

  const getTaskStats = useCallback(() => {
    const open = tasks.filter(t => !isDone(t));
    return {
      open: open.length,
      doing: open.filter(t => t.status === 'Doing').length,
      completed: tasks.length - open.length,
      dueToday: open.filter(t => daysUntilDue(t) === 0).length,
      overdue: open.filter(t => (daysUntilDue(t) ?? 0) < 0).length,
      // hours, rounded for display
      totalHoursLogged: Math.round(tasks.reduce((sum, t) => sum + (Number(t.hoursLogged) || 0), 0) * 10) / 10,
    };
  }, [tasks]);

  const value = {
    tasks,
    selectedTasks,
    loading,
    error,
    refreshTasks,
    addTask,
    updateTask,
    addTasks,
    rescheduleTasks,
    mergeTasks,
    removeLocal,
    toggleDone,
    toggleSubtask,
    startTimer,
    stopTimer,
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

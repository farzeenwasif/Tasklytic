import api from "../utils/apiClient";

// All functions return the backend's ApiResponse.data payload

export const getTasks = async () => {
  const response = await api.get("/api/tasks");
  return response.data.data;
};

export const createTask = async (taskData) => {
  const response = await api.post("/api/tasks", taskData);
  return response.data.data;
};

export const updateTask = async (id, taskData) => {
  const response = await api.patch(`/api/tasks/${id}`, taskData);
  return response.data.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/api/tasks/${id}`);
  return response.data.data;
};

export const bulkDeleteTasks = async (ids) => {
  const response = await api.post("/api/tasks/bulk-delete", { ids });
  return response.data.data;
};

// Focus timer. Start returns every task that changed (starting one stops any other).
export const startTimer = async (id) => (await api.post(`/api/tasks/${id}/timer/start`)).data.data;

export const stopTimer = async (id) => (await api.post(`/api/tasks/${id}/timer/stop`)).data.data;

// Daily briefing for every plan (built without AI): { text, counts }
export const getBriefing = async (today, hour) =>
  (await api.get("/api/tasks/briefing", { params: { today, hour } })).data.data;

// Several tasks at once (AI capture review)
export const bulkCreateTasks = async (tasks) => (await api.post("/api/tasks/bulk", { tasks })).data.data;

// Move tasks to another day (YYYY-MM-DD); returns the moved tasks
export const rescheduleTasks = async (ids, dueDate) =>
  (await api.post("/api/tasks/reschedule", { ids, dueDate })).data.data;

// The saved "Plan my day" for a date, or null
export const getDayPlan = async (date) => (await api.get("/api/tasks/plan", { params: { date } })).data.data;

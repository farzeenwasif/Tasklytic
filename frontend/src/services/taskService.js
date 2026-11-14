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

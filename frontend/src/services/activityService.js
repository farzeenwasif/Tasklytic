import api from "../utils/apiClient";

export const getActivities = async (limit = 20) => {
  const response = await api.get("/api/activities", { params: { limit } });
  return response.data.data;
};

export const clearActivities = async () => {
  const response = await api.delete("/api/activities");
  return response.data.data;
};

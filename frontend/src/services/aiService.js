import api from "../utils/apiClient";

// The browser's local date, so "today" on the server matches the user's timezone
export const localToday = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const data = (res) => res.data.data;

export const draftTaskFromText = async (text) =>
  data(await api.post("/api/ai/parse-task", { text, today: localToday() }));

export const suggestSubtasks = async ({ title, description, category }) =>
  data(await api.post("/api/ai/subtasks", { title, description, category }));

export const writeDescription = async ({ title, description, category }) =>
  data(await api.post("/api/ai/describe", { title, description, category }));

export const getInsights = async () =>
  data(await api.get("/api/ai/insights", { params: { today: localToday() } }));

export const getDailyBriefing = async () =>
  data(await api.get("/api/ai/briefing", { params: { today: localToday() } }));

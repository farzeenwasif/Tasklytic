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

// AI capture: many tasks from a brain dump or a photo. Returns { tasks: [...] } to review.
export const brainDump = async (text) => data(await api.post("/api/ai/brain-dump", { text, today: localToday() }));

export const imageToTasks = async (form) => {
  form.append("today", localToday());
  return data(await api.post("/api/ai/image-tasks", form, { headers: { "Content-Type": "multipart/form-data" } }));
};

// Plan my day: { start, end, note } in local HH:MM. Returns the saved plan.
export const planDay = async ({ start, end, note }) =>
  data(await api.post("/api/ai/plan-day", { start, end, note, today: localToday() }));

// Receipt photo -> { type, amount, note, date, category, currency }
export const scanReceipt = async (form) => {
  form.append("today", localToday());
  return data(await api.post("/api/ai/receipt", form, { headers: { "Content-Type": "multipart/form-data" } }));
};

export const getFinanceInsights = async (month) => data(await api.get("/api/ai/finance-insights", { params: { month } }));

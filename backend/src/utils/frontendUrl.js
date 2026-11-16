// Where emailed links point: FRONTEND_URL, or the first allowed CORS origin
export const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")[0])
    .trim()
    .replace(/\/+$/, "");

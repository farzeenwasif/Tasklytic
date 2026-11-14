import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/apiError.js";

const app = express();

// Allow one or more comma-separated origins; strip trailing slashes so
// "http://localhost:5173/" in .env still matches the browser's Origin header.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
// Stripe webhook needs the raw body to verify its signature, so it goes before express.json()
import { handleStripeWebhook } from "./controllers/billing.controller.js";
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import indexRouter from "./routes/index.routes.js";
import authRouter from "./routes/auth.routes.js";
import taskRouter from "./routes/task.routes.js";
import activityRouter from "./routes/activity.routes.js";
import billingRouter from "./routes/billing.routes.js";
import aiRouter from "./routes/ai.routes.js";

app.use("/api", indexRouter);
app.use("/api/billing", billingRouter);
app.use("/api/ai", aiRouter);
app.use("/api/users", authRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/activities", activityRouter);

// 404 for unknown API routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// Central error handler — always respond with JSON so the frontend can show messages
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors = err.errors || [];

  if (err.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(", ");
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    errors = [];
  } else if (err.name === "MulterError") {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image is too large (max 2 MB)" : err.message;
    errors = [];
  } else if (err.code === 11000) {
    statusCode = 409;
    message = `${Object.keys(err.keyValue || {}).join(", ") || "Field"} already exists`;
    errors = [];
  }

  if (statusCode >= 500) console.error(err);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: Array.isArray(errors) ? errors : [],
    data: null,
  });
});

export default app;

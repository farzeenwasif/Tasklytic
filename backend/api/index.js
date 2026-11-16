// Vercel entry point: every request to the backend lands here as a serverless function.
// (Locally and in Docker the server still starts from src/index.js.)
import mongoose from "mongoose";
import app from "../src/app.js";
import { runMigrations } from "../src/utils/migrations.js";

// One connection per warm function instance, reused across requests
let ready = null;
const connect = () => {
  if (!ready) {
    ready = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then(() => runMigrations())
      .catch((err) => {
        ready = null; // try again on the next request
        throw err;
      });
  }
  return ready;
};

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

export default async function handler(req, res) {
  // CORS preflight never needs the database
  if (req.method === "OPTIONS") return app(req, res);
  try {
    await connect();
  } catch (err) {
    console.error("Database connection failed:", err.message);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    // so the browser shows this message instead of a bare "Network Error"
    if (allowedOrigins.includes(req.headers.origin)) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.end(JSON.stringify({ success: false, statusCode: 503, message: "The server could not reach the database. Try again in a moment." }));
    return;
  }
  return app(req, res);
}

import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requirePremium, aiRateLimit } from "../middlewares/premium.middleware.js";
import {
  parseTask,
  suggestSubtasks,
  writeDescription,
  getInsights,
  getDailyBriefing,
} from "../controllers/ai.controller.js";

const router = express.Router();

// Every AI route: logged in + Premium + rate limited
router.use(verifyJWT, requirePremium, aiRateLimit);

router.post("/parse-task", parseTask);
router.post("/subtasks", suggestSubtasks);
router.post("/describe", writeDescription);
router.get("/insights", getInsights);
router.get("/briefing", getDailyBriefing);

export default router;

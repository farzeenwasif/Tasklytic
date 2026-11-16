import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requirePremium, aiRateLimit } from "../middlewares/premium.middleware.js";
import {
  parseTask,
  suggestSubtasks,
  writeDescription,
  getInsights,
  getDailyBriefing,
  brainDump,
  imageToTasks,
  planDay,
  scanReceipt,
  financeInsights,
} from "../controllers/ai.controller.js";
import { aiImageUpload } from "../middlewares/multer.middleware.js";

const router = express.Router();

// Every AI route: logged in + Premium + rate limited
router.use(verifyJWT, requirePremium, aiRateLimit);

router.post("/parse-task", parseTask);
router.post("/subtasks", suggestSubtasks);
router.post("/describe", writeDescription);
router.get("/insights", getInsights);
router.get("/briefing", getDailyBriefing);
router.post("/brain-dump", brainDump);
router.post("/image-tasks", aiImageUpload.single("image"), imageToTasks);
router.post("/plan-day", planDay);
router.post("/receipt", aiImageUpload.single("image"), scanReceipt);
router.get("/finance-insights", financeInsights);

export default router;

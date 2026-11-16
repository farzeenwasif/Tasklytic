import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createTask,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
  bulkDeleteTasks,
  startTimer,
  stopTaskTimer,
  getBriefing,
  bulkCreateTasks,
  rescheduleTasks,
  getDayPlan,
} from "../controllers/task.controller.js";

const router = express.Router();

// Every task route requires a logged-in user
router.use(verifyJWT);

router.route("/").get(getMyTasks).post(createTask);
router.post("/bulk-delete", bulkDeleteTasks);
router.get("/briefing", getBriefing);
router.post("/bulk", bulkCreateTasks);
router.post("/reschedule", rescheduleTasks);
router.get("/plan", getDayPlan);
router.post("/:id/timer/start", startTimer);
router.post("/:id/timer/stop", stopTaskTimer);
router.route("/:id").get(getTaskById).patch(updateTask).delete(deleteTask);

export default router;

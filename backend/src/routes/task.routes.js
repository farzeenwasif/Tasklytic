import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createTask,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
  bulkDeleteTasks,
} from "../controllers/task.controller.js";

const router = express.Router();

// Every task route requires a logged-in user
router.use(verifyJWT);

router.route("/").get(getMyTasks).post(createTask);
router.post("/bulk-delete", bulkDeleteTasks);
router.route("/:id").get(getTaskById).patch(updateTask).delete(deleteTask);

export default router;

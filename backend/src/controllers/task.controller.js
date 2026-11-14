import mongoose from "mongoose";
import Tasks from "../models/tasksSchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../utils/logActivity.js";

// Only these fields can be set by the client. userId always comes from the token.
const EDITABLE_FIELDS = [
  "title",
  "description",
  "assignee",
  "status",
  "priority",
  "hoursLogged",
  "estimatedHours",
  "category",
  "dueDate",
];

const pickEditable = (body = {}) =>
  Object.fromEntries(
    EDITABLE_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]])
  );

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid task id");
};

// Create task
export const createTask = asyncHandler(async (req, res) => {
  const data = pickEditable(req.body);

  if (
    !data.title?.trim() ||
    data.estimatedHours === undefined ||
    data.estimatedHours === "" ||
    !data.dueDate
  ) {
    throw new ApiError(400, "Title, estimated hours and due date are required");
  }

  const task = await Tasks.create({ ...data, userId: req.user._id });

  await logActivity(req.user._id, "task_created", `Created task "${task.title}"`, {
    taskId: task._id,
    title: task.title,
  });

  return res.status(201).json(new ApiResponse(201, task, "Task created successfully"));
});

// Get all tasks of the logged-in user
export const getMyTasks = asyncHandler(async (req, res) => {
  const tasks = await Tasks.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

// Get a single task
export const getTaskById = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const task = await Tasks.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) throw new ApiError(404, "Task not found");
  return res.status(200).json(new ApiResponse(200, task, "Task fetched successfully"));
});

// Update task
export const updateTask = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);

  const task = await Tasks.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) throw new ApiError(404, "Task not found or unauthorized");

  const before = { status: task.status, hoursLogged: task.hoursLogged };

  Object.assign(task, pickEditable(req.body));
  await task.save();

  // Pick the most meaningful description of what changed
  const meta = { taskId: task._id, title: task.title };
  if (task.status !== before.status && task.status === "Completed") {
    await logActivity(req.user._id, "task_completed", `Completed task "${task.title}"`, meta);
  } else if (task.hoursLogged !== before.hoursLogged) {
    const diff = Math.round((task.hoursLogged - before.hoursLogged) * 100) / 100;
    const text =
      diff > 0
        ? `Logged ${diff}h on "${task.title}"`
        : `Changed logged hours on "${task.title}" to ${task.hoursLogged}h`;
    await logActivity(req.user._id, "hours_logged", text, { ...meta, hours: diff });
  } else if (task.status !== before.status) {
    await logActivity(
      req.user._id,
      "task_updated",
      `Moved "${task.title}" to ${task.status}`,
      { ...meta, status: task.status }
    );
  } else {
    await logActivity(req.user._id, "task_updated", `Updated task "${task.title}"`, meta);
  }

  return res.status(200).json(new ApiResponse(200, task, "Task updated successfully"));
});

// Delete task
export const deleteTask = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);

  const task = await Tasks.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!task) throw new ApiError(404, "Task not found or unauthorized");

  await logActivity(req.user._id, "task_deleted", `Deleted task "${task.title}"`, {
    title: task.title,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { _id: task._id }, "Task deleted successfully"));
});

// Bulk delete. Body: { ids: [...] }
export const bulkDeleteTasks = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, "ids must be a non-empty array");
  }
  const validIds = ids.filter((id) => mongoose.isValidObjectId(id));

  const result = await Tasks.deleteMany({ _id: { $in: validIds }, userId: req.user._id });

  if (result.deletedCount > 0) {
    await logActivity(
      req.user._id,
      "tasks_bulk_deleted",
      `Deleted ${result.deletedCount} task${result.deletedCount === 1 ? "" : "s"}`,
      { count: result.deletedCount }
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { deletedCount: result.deletedCount }, "Tasks deleted successfully")
    );
});

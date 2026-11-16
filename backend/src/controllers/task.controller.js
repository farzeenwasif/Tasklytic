import mongoose from "mongoose";
import Tasks from "../models/tasksSchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../utils/logActivity.js";
import { Bill, Client } from "../models/financeSchemas.js";
import DayPlan from "../models/dayPlanSchema.js";
import {
  afterCompleted,
  afterReopened,
  formatDuration,
  isDay,
  recordManualTime,
  stopTimer,
} from "../utils/taskLifecycle.js";

// Only these fields can be set by the client. userId always comes from the token.
const EDITABLE_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "hoursLogged",
  "estimatedHours",
  "category",
  "dueDate",
  "dueTime",
  "subtasks",
  "repeat",
  "clientId",
];

const pickEditable = (body = {}) => {
  const data = Object.fromEntries(
    EDITABLE_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]])
  );
  // "" from an empty form field means "no value"
  if (data.dueDate === "") data.dueDate = null;
  if (data.estimatedHours === "" || data.estimatedHours === null) data.estimatedHours = 0;
  if (!data.dueDate && data.dueDate !== undefined) data.dueTime = "";
  if (data.subtasks !== undefined) {
    data.subtasks = (Array.isArray(data.subtasks) ? data.subtasks : [])
      .map((s) => ({ title: String(s?.title ?? "").trim().slice(0, 200), done: Boolean(s?.done) }))
      .filter((s) => s.title)
      .slice(0, 50);
  }
  if (data.clientId === "") data.clientId = null;
  return data;
};

// A client can only be set to one of the user's own clients
const assertOwnClient = async (data, userId) => {
  if (!data.clientId) return;
  if (!mongoose.isValidObjectId(data.clientId) || !(await Client.exists({ _id: data.clientId, userId }))) {
    throw new ApiError(400, "Unknown client");
  }
};

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid task id");
};

const findOwnTask = async (req) => {
  assertValidId(req.params.id);
  const task = await Tasks.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) throw new ApiError(404, "Task not found");
  return task;
};

// Create task. Only a title is needed; everything else is optional.
export const createTask = asyncHandler(async (req, res) => {
  const data = pickEditable(req.body);
  if (!data.title?.trim()) throw new ApiError(400, "Give the task a title");
  await assertOwnClient(data, req.user._id);
  if (data.status === "Done") data.completedAt = new Date();

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
  const task = await findOwnTask(req);
  return res.status(200).json(new ApiResponse(200, task, "Task fetched successfully"));
});

// Update task. Response: the task, plus `next` when completing a repeating task created the next one.
export const updateTask = asyncHandler(async (req, res) => {
  const task = await findOwnTask(req);
  const before = { status: task.status, hoursLogged: task.hoursLogged };
  const changes = pickEditable(req.body);
  await assertOwnClient(changes, req.user._id);
  Object.assign(task, changes);

  const justCompleted = task.status === "Done" && before.status !== "Done";
  const justReopened = before.status === "Done" && task.status !== "Done";
  let focused = 0;
  if (changes.hoursLogged !== undefined && task.hoursLogged !== before.hoursLogged) {
    await recordManualTime(task, task.hoursLogged - before.hoursLogged);
  }
  if (justCompleted) {
    focused = await stopTimer(task);
    task.completedAt = new Date();
  } else if (task.status !== "Done") {
    task.completedAt = null;
  }
  await task.save();

  const next = justCompleted ? await afterCompleted(task, req.body.today) : null;
  if (justReopened) await afterReopened(task);

  // Pick the most meaningful description of what changed
  const meta = { taskId: task._id, title: task.title };
  if (justCompleted) {
    await logActivity(req.user._id, "task_completed", `Completed task "${task.title}"`, meta);
  } else if (task.hoursLogged !== before.hoursLogged && !focused) {
    await logActivity(
      req.user._id,
      "hours_logged",
      `Set time spent on "${task.title}" to ${formatDuration(task.hoursLogged)}`,
      meta
    );
  } else if (task.status !== before.status) {
    await logActivity(req.user._id, "task_updated", `Moved "${task.title}" to ${task.status}`, {
      ...meta,
      status: task.status,
    });
  } else {
    await logActivity(req.user._id, "task_updated", `Updated task "${task.title}"`, meta);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { ...task.toObject(), next }, "Task updated successfully"));
});

// Start the focus timer. Only one task is timed at once: any other running timer is stopped.
// Response: every task that changed.
export const startTimer = asyncHandler(async (req, res) => {
  const task = await findOwnTask(req);
  if (task.status === "Done") throw new ApiError(400, "This task is already done");

  const changed = [];
  const running = await Tasks.find({
    userId: req.user._id,
    timerStartedAt: { $ne: null },
    _id: { $ne: task._id },
  });
  for (const other of running) {
    await stopTimer(other);
    await other.save();
    changed.push(other);
  }

  if (!task.timerStartedAt) task.timerStartedAt = new Date();
  if (task.status === "To do") task.status = "Doing";
  await task.save();
  changed.push(task);

  return res.status(200).json(new ApiResponse(200, changed, "Timer started"));
});

// Stop the focus timer and add the elapsed time to the task
export const stopTaskTimer = asyncHandler(async (req, res) => {
  const task = await findOwnTask(req);
  const added = await stopTimer(task);
  await task.save();

  // Sessions under a minute are not worth a log line
  if (added >= 1 / 60) {
    await logActivity(req.user._id, "hours_logged", `Focused ${formatDuration(added)} on "${task.title}"`, {
      taskId: task._id,
      title: task.title,
      hours: Math.round(added * 100) / 100,
    });
  }
  return res.status(200).json(new ApiResponse(200, task, "Timer stopped"));
});

// Daily briefing for every plan: built from a template, no AI involved.
// (Premium gets the AI-written version from /api/ai/briefing.)
const listTitles = (tasks, max = 3) => {
  const names = tasks.slice(0, max).map((t) => t.title);
  const more = tasks.length - names.length;
  if (more > 0) return `${names.join(", ")} and ${more} more`;
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] || "";
};

export const getBriefing = asyncHandler(async (req, res) => {
  const today = isDay(req.query.today) ? req.query.today : new Date().toISOString().slice(0, 10);
  const hour = Number(req.query.hour);
  const greeting = hour >= 17 ? "Good evening" : hour >= 12 ? "Good afternoon" : "Good morning";
  const firstName = (req.user.name || "").split(" ")[0];

  const open = await Tasks.find({ userId: req.user._id, status: { $ne: "Done" } }).lean();
  const rank = { High: 0, Medium: 1, Low: 2 };
  const byPriority = (a, b) => (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
  const dayOf = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const dueToday = open.filter((t) => dayOf(t.dueDate) === today).sort(byPriority);
  const overdue = open.filter((t) => dayOf(t.dueDate) && dayOf(t.dueDate) < today).sort(byPriority);

  const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const parts = [`${greeting}${firstName ? `, ${firstName}` : ""}.`];
  if (!dueToday.length && !overdue.length) {
    parts.push(
      open.length
        ? `Nothing is due today. You have ${count(open.length, "open task")}, so it is a good day to get ahead.`
        : "You have no open tasks. Add what is on your mind and I will keep track of it."
    );
  } else {
    if (dueToday.length) parts.push(`You have ${count(dueToday.length, "task")} due today: ${listTitles(dueToday)}.`);
    else parts.push("Nothing is due today.");
    if (overdue.length) {
      parts.push(`${count(overdue.length, "task")} ${overdue.length === 1 ? "is" : "are"} overdue: ${listTitles(overdue)}.`);
    }
    const first = [...overdue, ...dueToday].sort(byPriority)[0];
    parts.push(`Start with ${first.title}${first.priority === "High" ? ", it is high priority" : ""}.`);
  }

  return res.status(200).json(
    new ApiResponse(200, {
      text: parts.join(" "),
      counts: { dueToday: dueToday.length, overdue: overdue.length },
    })
  );
});

// Add several tasks at once (AI capture review, imports). Body: { tasks: [...] }, at most 30.
export const bulkCreateTasks = asyncHandler(async (req, res) => {
  const list = Array.isArray(req.body.tasks) ? req.body.tasks.slice(0, 30) : [];
  const docs = list.map((t) => ({ ...pickEditable(t), userId: req.user._id })).filter((t) => t.title?.trim());
  if (!docs.length) throw new ApiError(400, "No tasks to add");
  for (const d of docs) {
    await assertOwnClient(d, req.user._id);
    delete d.status; // captured tasks always start as "To do"
    delete d.hoursLogged;
  }
  const created = await Tasks.insertMany(docs);
  await logActivity(
    req.user._id,
    "tasks_captured",
    `Added ${created.length} task${created.length === 1 ? "" : "s"} at once`,
    { count: created.length }
  );
  return res.status(201).json(new ApiResponse(201, created, "Tasks created"));
});

// Move tasks to another day (rolling over overdue work, "move to tomorrow"). Body: { ids, dueDate }
export const rescheduleTasks = asyncHandler(async (req, res) => {
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter((id) => mongoose.isValidObjectId(id)).slice(0, 200);
  if (!ids.length) throw new ApiError(400, "No tasks to move");
  if (!isDay(req.body.dueDate)) throw new ApiError(400, "Pick a date");
  // Bill tasks keep their due date: it is the bill's
  const filter = { _id: { $in: ids }, userId: req.user._id, status: { $ne: "Done" }, billId: null };
  await Tasks.updateMany(filter, { $set: { dueDate: new Date(req.body.dueDate) } });
  const tasks = await Tasks.find({ _id: { $in: ids }, userId: req.user._id });
  return res.status(200).json(new ApiResponse(200, tasks, "Tasks moved"));
});

// The saved "Plan my day" for a date (made by /api/ai/plan-day)
export const getDayPlan = asyncHandler(async (req, res) => {
  if (!isDay(req.query.date)) throw new ApiError(400, "Pick a date");
  const plan = await DayPlan.findOne({ userId: req.user._id, date: req.query.date });
  return res.status(200).json(new ApiResponse(200, plan, "Plan loaded"));
});

// Delete task
export const deleteTask = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);

  const task = await Tasks.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!task) throw new ApiError(404, "Task not found or unauthorized");
  // A bill whose open task was deleted gets a new one from the Finance page
  await Bill.updateMany({ userId: req.user._id, taskId: task._id }, { $set: { taskId: null } });

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
  await Bill.updateMany({ userId: req.user._id, taskId: { $in: validIds } }, { $set: { taskId: null } });

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

import { Type } from "@google/genai";
import Tasks, { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from "../models/tasksSchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateJSON, generateText } from "../utils/ai.js";

const MAX_INPUT = 1000;

// The browser sends its own local date (YYYY-MM-DD) so "today" matches the user's timezone
const getToday = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : new Date().toISOString().slice(0, 10);

const dayOf = (date) => (date ? new Date(date).toISOString().slice(0, 10) : "");
const clip = (value, max = MAX_INPUT) => String(value ?? "").trim().slice(0, max);

const describeTask = (t) =>
  `- "${t.title}" | ${t.status} | ${t.priority} priority | ${t.category} | ` +
  `${t.hoursLogged}/${t.estimatedHours}h | due ${dayOf(t.dueDate)}`;

// 1. Natural language -> task fields for the Add Task form
export const parseTask = asyncHandler(async (req, res) => {
  const text = clip(req.body.text);
  if (!text) throw new ApiError(400, "Describe the task first");
  const today = getToday(req.body.today);

  const result = await generateJSON(
    `Today is ${today}. Turn this request into a single task.\n` +
      `Request: """${text}"""\n` +
      `Rules: dueDate is YYYY-MM-DD (resolve words like "Friday" or "next week" from today; ` +
      `if no date is given use today). estimatedHours is a realistic number of hours (0.5 steps). ` +
      `Pick the closest category. Keep the title short (under 80 characters); put extra detail in description.`,
    {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        category: { type: Type.STRING, enum: TASK_CATEGORIES },
        priority: { type: Type.STRING, enum: TASK_PRIORITIES },
        status: { type: Type.STRING, enum: TASK_STATUSES },
        estimatedHours: { type: Type.NUMBER },
        dueDate: { type: Type.STRING },
      },
      required: ["title", "category", "priority", "status", "estimatedHours", "dueDate"],
    }
  );

  // Never trust the model blindly: fall back to safe values
  const task = {
    title: clip(result.title, 120),
    description: clip(result.description),
    category: TASK_CATEGORIES.includes(result.category) ? result.category : "Other",
    priority: TASK_PRIORITIES.includes(result.priority) ? result.priority : "Medium",
    status: TASK_STATUSES.includes(result.status) ? result.status : "Ready to Assign",
    estimatedHours: Math.max(0.5, Math.round((Number(result.estimatedHours) || 1) * 2) / 2),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(result.dueDate || "") ? result.dueDate : today,
  };
  return res.status(200).json(new ApiResponse(200, task, "Task drafted"));
});

// 2. Break a task into steps with hour estimates
export const suggestSubtasks = asyncHandler(async (req, res) => {
  const title = clip(req.body.title, 200);
  if (!title) throw new ApiError(400, "Add a title first");

  const result = await generateJSON(
    `Break this task into 3 to 7 concrete, ordered steps with an hour estimate for each.\n` +
      `Title: ${title}\nCategory: ${clip(req.body.category, 40) || "unknown"}\n` +
      `Details: ${clip(req.body.description) || "none"}`,
    {
      type: Type.OBJECT,
      properties: {
        subtasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { title: { type: Type.STRING }, hours: { type: Type.NUMBER } },
            required: ["title", "hours"],
          },
        },
      },
      required: ["subtasks"],
    }
  );

  const subtasks = (result.subtasks || [])
    .slice(0, 7)
    .map((s) => ({ title: clip(s.title, 150), hours: Math.max(0.5, Math.round((Number(s.hours) || 0.5) * 2) / 2) }))
    .filter((s) => s.title);
  return res.status(200).json(new ApiResponse(200, { subtasks }, "Subtasks suggested"));
});

// 3. Write or improve a task description
export const writeDescription = asyncHandler(async (req, res) => {
  const title = clip(req.body.title, 200);
  if (!title) throw new ApiError(400, "Add a title first");
  const current = clip(req.body.description);

  const description = await generateText(
    (current
      ? `Improve this task description. Keep the meaning, make it clear and actionable.\nCurrent: """${current}"""\n`
      : `Write a short task description (2-4 sentences, or a few bullet points) that explains what "done" looks like.\n`) +
      `Task title: ${title}\nCategory: ${clip(req.body.category, 40) || "unknown"}\n` +
      `Reply with the description text only, no heading, under 600 characters.`
  );
  return res.status(200).json(new ApiResponse(200, { description: clip(description) }, "Description written"));
});

// 4. Insights about the user's tasks for the dashboard
export const getInsights = asyncHandler(async (req, res) => {
  const today = getToday(req.query.today);
  const tasks = await Tasks.find({ userId: req.user._id }).sort({ dueDate: 1 }).limit(150).lean();

  if (tasks.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, {
        summary: "No tasks yet. Add a few and your weekly insights will show up here.",
        highlights: [],
        focus: [],
      })
    );
  }

  const result = await generateJSON(
    `Today is ${today}. Here are the user's tasks:\n${tasks.map(describeTask).join("\n")}\n\n` +
      `Write: a 1-2 sentence summary of how this week is going; up to 3 short highlights ` +
      `(wins, overdue work, tasks over their hour estimate); and up to 3 concrete things to focus on next, ` +
      `naming the actual tasks. Speak to the user as "you".`,
    {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
        focus: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["summary", "highlights", "focus"],
    }
  );

  return res.status(200).json(
    new ApiResponse(200, {
      summary: clip(result.summary, 500),
      highlights: (result.highlights || []).slice(0, 3).map((s) => clip(s, 200)),
      focus: (result.focus || []).slice(0, 3).map((s) => clip(s, 200)),
    })
  );
});

// 5. Short spoken briefing of today's tasks (read aloud by the browser after login)
export const getDailyBriefing = asyncHandler(async (req, res) => {
  const today = getToday(req.query.today);
  const tasks = await Tasks.find({ userId: req.user._id, status: { $ne: "Completed" } }).lean();

  const dueToday = tasks.filter((t) => dayOf(t.dueDate) === today);
  const overdue = tasks.filter((t) => dayOf(t.dueDate) && dayOf(t.dueDate) < today);
  const inProgress = tasks.filter((t) => t.status === "In Progress" && dayOf(t.dueDate) > today);
  const firstName = (req.user.name || "").split(" ")[0];

  if (!dueToday.length && !overdue.length && !inProgress.length) {
    const text = `Hi ${firstName}! You have nothing due today. A good moment to plan your next tasks.`;
    return res.status(200).json(new ApiResponse(200, { text, counts: { dueToday: 0, overdue: 0 } }));
  }

  const text = await generateText(
    `Today is ${today}. Write a spoken daily briefing for ${firstName}. It will be read aloud by text-to-speech, ` +
      `so use plain sentences only: no lists, symbols, markdown or emojis. Under 90 words. ` +
      `Greet them, say what is due today (most important first), mention overdue tasks briefly, ` +
      `and end with one encouraging line.\n\n` +
      `Due today:\n${dueToday.map(describeTask).join("\n") || "none"}\n` +
      `Overdue:\n${overdue.map(describeTask).join("\n") || "none"}\n` +
      `In progress (due later):\n${inProgress.slice(0, 5).map(describeTask).join("\n") || "none"}`
  );

  return res.status(200).json(
    new ApiResponse(200, {
      text: clip(text.replace(/[*#_`]/g, ""), 800),
      counts: { dueToday: dueToday.length, overdue: overdue.length },
    })
  );
});

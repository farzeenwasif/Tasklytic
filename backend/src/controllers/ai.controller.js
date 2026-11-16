import { Type } from "@google/genai";
import Tasks, { TASK_CATEGORIES, TASK_PRIORITIES } from "../models/tasksSchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateJSON, generateText, withImage } from "../utils/ai.js";
import DayPlan from "../models/dayPlanSchema.js";
import { Bill, EXPENSE_CATEGORIES, FinanceSettings, Transaction } from "../models/financeSchemas.js";
import { logActivity } from "../utils/logActivity.js";

const MAX_INPUT = 1000;

// The browser sends its own local date (YYYY-MM-DD) so "today" matches the user's timezone
const getToday = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : new Date().toISOString().slice(0, 10);

const dayOf = (date) => (date ? new Date(date).toISOString().slice(0, 10) : "");
const clip = (value, max = MAX_INPUT) => String(value ?? "").trim().slice(0, max);

const hoursText = (t) => {
  const spent = Math.round((t.hoursLogged || 0) * 10) / 10;
  return t.estimatedHours ? `${spent}h spent of ${t.estimatedHours}h estimated` : `${spent}h spent`;
};

const describeTask = (t) =>
  `- "${t.title}" | ${t.status} | ${t.priority} priority | ${t.category} | ${hoursText(t)} | ` +
  (t.dueDate ? `due ${dayOf(t.dueDate)}${t.dueTime ? ` ${t.dueTime}` : ""}` : "no due date") +
  (t.subtasks?.length ? ` | ${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length} steps done` : "");

// 1. Natural language -> task fields for the Add Task form
export const parseTask = asyncHandler(async (req, res) => {
  const text = clip(req.body.text);
  if (!text) throw new ApiError(400, "Describe the task first");
  const today = getToday(req.body.today);

  const result = await generateJSON(
    `Today is ${today}. Turn this request into a single task.\n` +
      `Request: """${text}"""\n` +
      `Rules: dueDate is YYYY-MM-DD (resolve words like "Friday" or "next week" from today; ` +
      `empty string if no date is mentioned). dueTime is HH:MM in 24h time, empty string if no time is mentioned. ` +
      `estimatedHours is a realistic number of hours (0.5 steps). ` +
      `Pick the closest category. Keep the title short (under 80 characters); put extra detail in description.`,
    {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        category: { type: Type.STRING, enum: TASK_CATEGORIES },
        priority: { type: Type.STRING, enum: TASK_PRIORITIES },
        estimatedHours: { type: Type.NUMBER },
        dueDate: { type: Type.STRING },
        dueTime: { type: Type.STRING },
      },
      required: ["title", "category", "priority", "estimatedHours", "dueDate", "dueTime"],
    }
  );

  // Never trust the model blindly: fall back to safe values
  const task = {
    title: clip(result.title, 120),
    description: clip(result.description),
    category: TASK_CATEGORIES.includes(result.category) ? result.category : "Other",
    priority: TASK_PRIORITIES.includes(result.priority) ? result.priority : "Medium",
    estimatedHours: Math.max(0.5, Math.round((Number(result.estimatedHours) || 1) * 2) / 2),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(result.dueDate || "") ? result.dueDate : "",
  };
  task.dueTime = task.dueDate && /^([01]\d|2[0-3]):[0-5]\d$/.test(result.dueTime || "") ? result.dueTime : "";
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
      `(wins, overdue work, tasks that took longer than estimated); and up to 3 concrete things to focus on next, ` +
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
  const tasks = await Tasks.find({ userId: req.user._id, status: { $ne: "Done" } }).lean();

  const dueToday = tasks.filter((t) => dayOf(t.dueDate) === today);
  const overdue = tasks.filter((t) => dayOf(t.dueDate) && dayOf(t.dueDate) < today);
  const inProgress = tasks.filter((t) => t.status === "Doing" && !(dayOf(t.dueDate) <= today && dayOf(t.dueDate)));
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

// ---------------------------------------------------------------------------
// AI capture: many tasks at once, from a brain dump (typed or spoken) or a photo
// ---------------------------------------------------------------------------

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const DRAFT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING, enum: TASK_CATEGORIES },
          priority: { type: Type.STRING, enum: TASK_PRIORITIES },
          estimatedHours: { type: Type.NUMBER },
          dueDate: { type: Type.STRING },
          dueTime: { type: Type.STRING },
          subtasks: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "category", "priority", "dueDate", "dueTime"],
      },
    },
  },
  required: ["tasks"],
};

const DRAFT_RULES =
  `Rules: one entry per separate thing to do; never invent tasks that are not there. ` +
  `Keep each title short (under 80 characters) and in the same language the user wrote in. ` +
  `dueDate is YYYY-MM-DD resolved from today ("kal" means tomorrow, "parson" the day after), empty string if no date. ` +
  `dueTime is HH:MM 24h, empty string if no time. estimatedHours: a realistic estimate, 0 if unclear. ` +
  `subtasks: only when the item clearly has several steps, otherwise an empty list.`;

// The next 8 days spelled out, so the model never has to do date arithmetic
const calendarFrom = (today) => {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const lines = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    const label = i === 0 ? "today" : i === 1 ? "tomorrow (kal)" : i === 2 ? "day after tomorrow (parson)" : "";
    lines.push(`${d.toISOString().slice(0, 10)} ${names[d.getUTCDay()]}${label ? ` = ${label}` : ""}`);
  }
  return `Calendar:\n${lines.join("\n")}\n`;
};

// Never trust the model blindly
const cleanDrafts = (result) =>
  (result.tasks || [])
    .slice(0, 25)
    .map((t) => {
      const dueDate = DAY_RE.test(t.dueDate || "") ? t.dueDate : "";
      return {
        title: clip(t.title, 200),
        description: clip(t.description, 600),
        category: TASK_CATEGORIES.includes(t.category) ? t.category : "Personal",
        priority: TASK_PRIORITIES.includes(t.priority) ? t.priority : "Medium",
        estimatedHours: Math.max(0, Math.round((Number(t.estimatedHours) || 0) * 4) / 4),
        dueDate,
        dueTime: dueDate && TIME_RE.test(t.dueTime || "") ? t.dueTime : "",
        subtasks: (t.subtasks || [])
          .map((s) => clip(s, 200))
          .filter(Boolean)
          .slice(0, 10)
          .map((title) => ({ title, done: false })),
      };
    })
    .filter((t) => t.title);

// 6. Brain dump: everything on your mind -> a list of tasks to review
export const brainDump = asyncHandler(async (req, res) => {
  const text = clip(req.body.text, 4000);
  if (!text) throw new ApiError(400, "Write or say what is on your mind first");
  const today = getToday(req.body.today);
  const result = await generateJSON(
    `Today is ${today}.\n${calendarFrom(today)}The user dumped everything on their mind (it may be typed or dictated, ` +
      `messy, mixed English and Roman Urdu). Split it into separate tasks.\n` +
      `Brain dump: """${text}"""\n${DRAFT_RULES}`,
    DRAFT_SCHEMA
  );
  return res.status(200).json(new ApiResponse(200, { tasks: cleanDrafts(result) }, "Tasks found"));
});

const imageFrom = (req) => {
  if (!req.file) throw new ApiError(400, "Add a photo or screenshot first");
  return { mimeType: req.file.mimetype, data: req.file.buffer.toString("base64") };
};

// 7. Photo / screenshot (a handwritten list, a whiteboard, a chat, an email) -> tasks
export const imageToTasks = asyncHandler(async (req, res) => {
  const image = imageFrom(req);
  const today = getToday(req.body.today);
  const hint = clip(req.body.hint, 300);
  const result = await generateJSON(
    withImage(
      `Today is ${today}.\n${calendarFrom(today)}Read this image (it may be a handwritten to-do list, a whiteboard, a screenshot ` +
        `of a chat or email, a timetable or a notice) and list the things the user needs to do.` +
        (hint ? ` The user added: "${hint}".` : "") +
        ` If there is nothing to do in it, return an empty list.\n${DRAFT_RULES}`,
      image
    ),
    DRAFT_SCHEMA
  );
  return res.status(200).json(new ApiResponse(200, { tasks: cleanDrafts(result) }, "Tasks found"));
});

// ---------------------------------------------------------------------------
// Plan my day: the AI time-blocks today's work
// ---------------------------------------------------------------------------

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMinutes = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export const planDay = asyncHandler(async (req, res) => {
  const today = getToday(req.body.today);
  const start = TIME_RE.test(req.body.start || "") ? req.body.start : "09:00";
  const end = TIME_RE.test(req.body.end || "") ? req.body.end : "18:00";
  if (toMinutes(end) - toMinutes(start) < 30) {
    throw new ApiError(400, "Leave at least 30 minutes between the start and the end of your day");
  }
  const note = clip(req.body.note, 300);

  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const open = await Tasks.find({ userId: req.user._id, status: { $ne: "Done" } }).lean();
  // Candidates: due by tomorrow, already started, high priority, or not scheduled at all
  const rank = { High: 0, Medium: 1, Low: 2 };
  const candidates = open
    .filter((t) => !t.dueDate || t.dueDate <= tomorrow || t.status === "Doing" || t.priority === "High")
    .sort((a, b) => (a.dueDate || 9e15) - (b.dueDate || 9e15) || (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1))
    .slice(0, 30);
  if (!candidates.length) throw new ApiError(400, "There is nothing to plan: no open tasks for today. Add some first.");

  const result = await generateJSON(
    `Today is ${today}. Plan the user's day between ${start} and ${end} as time blocks.\n` +
      (note ? `The user says: "${note}"\n` : "") +
      `Open tasks (number | details):\n` +
      candidates.map((t, i) => `${i + 1} ${describeTask(t)}`).join("\n") +
      `\n\nRules: use the task numbers. Overdue and due-today work first, high priority before low. ` +
      `A task with a due time today must be placed at that time. Use the estimate when there is one, ` +
      `otherwise guess (30 minutes for small things). Put short 10-15 minute breaks after long focus blocks ` +
      `(task 0 with a title like "Break"). Do not overfill the day: anything that does not fit goes in "later". ` +
      `Times are HH:MM, blocks must not overlap. note: one short tip for that block (optional). ` +
      `summary: 1-2 encouraging sentences about the day, speaking to the user as "you".`,
    {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        blocks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: { type: Type.INTEGER },
              title: { type: Type.STRING },
              start: { type: Type.STRING },
              end: { type: Type.STRING },
              note: { type: Type.STRING },
            },
            required: ["task", "start", "end"],
          },
        },
        later: { type: Type.ARRAY, items: { type: Type.INTEGER } },
      },
      required: ["summary", "blocks", "later"],
    }
  );

  // Keep only valid, non-overlapping blocks inside the day
  const dayEnd = toMinutes(end);
  const used = new Set();
  let lastEnd = toMinutes(start);
  const blocks = [];
  for (const b of [...(result.blocks || [])].sort((x, y) => String(x.start).localeCompare(String(y.start)))) {
    if (!TIME_RE.test(b.start || "") || !TIME_RE.test(b.end || "")) continue;
    const s = Math.max(toMinutes(b.start), lastEnd);
    const e = Math.min(toMinutes(b.end), dayEnd);
    if (e - s < 5) continue;
    const task = Number.isInteger(b.task) && b.task >= 1 ? candidates[b.task - 1] : null;
    if (task && used.has(String(task._id))) continue;
    if (!task && !clip(b.title, 60)) continue;
    if (task) used.add(String(task._id));
    blocks.push({
      taskId: task?._id || null,
      title: task ? "" : clip(b.title, 60),
      start: fromMinutes(s),
      end: fromMinutes(e),
      note: clip(b.note, 160),
    });
    lastEnd = e;
  }
  const later = [...new Set((result.later || []).filter((n) => Number.isInteger(n) && candidates[n - 1]))]
    .map((n) => candidates[n - 1]._id)
    .filter((id) => !used.has(String(id)));

  const plan = await DayPlan.findOneAndUpdate(
    { userId: req.user._id, date: today },
    { $set: { blocks, later, summary: clip(result.summary, 400) } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await logActivity(req.user._id, "day_planned", `Planned the day: ${blocks.filter((b) => b.taskId).length} tasks`, {
    date: today,
  });
  return res.status(200).json(new ApiResponse(200, plan, "Day planned"));
});

// ---------------------------------------------------------------------------
// Money: receipt scanning and monthly insights
// ---------------------------------------------------------------------------

// 8. Photo of a receipt or bill -> an expense to review
export const scanReceipt = asyncHandler(async (req, res) => {
  const image = imageFrom(req);
  const today = getToday(req.body.today);
  const result = await generateJSON(
    withImage(
      `Today is ${today}. This is a photo of a receipt, bill or invoice. Extract the expense: ` +
        `amount = the final total paid (a number, no currency sign); merchant = the shop or company; ` +
        `date = YYYY-MM-DD (today if not shown); category from the list; currency = the 3-letter code if shown, else empty. ` +
        `If this is not a receipt, set amount to 0.`,
      image
    ),
    {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER },
        merchant: { type: Type.STRING },
        date: { type: Type.STRING },
        category: { type: Type.STRING, enum: EXPENSE_CATEGORIES },
        currency: { type: Type.STRING },
      },
      required: ["amount", "merchant", "date", "category"],
    }
  );
  const amount = Math.round((Number(result.amount) || 0) * 100) / 100;
  if (!(amount > 0)) throw new ApiError(422, "Could not find a total on that image. Try a clearer photo.");
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        type: "expense",
        amount,
        note: clip(result.merchant, 200),
        date: DAY_RE.test(result.date || "") ? result.date : today,
        category: EXPENSE_CATEGORIES.includes(result.category) ? result.category : "Other",
        currency: clip(result.currency, 3).toUpperCase(),
      },
      "Receipt read"
    )
  );
});

// 9. What happened with your money this month, and what to do about it
export const financeInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const m = /^(\d{4})-(\d{2})$/.exec(req.query.month || "");
  const now = new Date();
  const year = m ? +m[1] : now.getUTCFullYear();
  const month = m ? +m[2] - 1 : now.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 1));
  const prevFrom = new Date(Date.UTC(year, month - 1, 1));

  const [current, previous, settings, bills] = await Promise.all([
    Transaction.find({ userId, date: { $gte: from, $lt: to } }).lean(),
    Transaction.find({ userId, date: { $gte: prevFrom, $lt: from } }).lean(),
    FinanceSettings.findOne({ userId }).lean(),
    Bill.find({ userId, active: true }).lean(),
  ]);
  if (!current.length && !previous.length) {
    return res.status(200).json(
      new ApiResponse(200, {
        summary: "Add a few expenses and income and your money insights will show up here.",
        tips: [],
      })
    );
  }
  const totals = (list) => {
    const out = { income: 0, expense: 0, byCategory: {} };
    for (const t of list) {
      out[t.type] += t.amount;
      if (t.type === "expense") out.byCategory[t.category] = (out.byCategory[t.category] || 0) + t.amount;
    }
    return out;
  };
  const cur = totals(current);
  const prev = totals(previous);
  const currency = settings?.currency || "USD";
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth();
  const dayOfMonth = isCurrentMonth ? now.getUTCDate() : daysInMonth;

  const result = await generateJSON(
    `You are a friendly money coach. Currency: ${currency}. Month: ${from.toISOString().slice(0, 7)} ` +
      `(day ${dayOfMonth} of ${daysInMonth}).\n` +
      `This month: income ${cur.income.toFixed(2)}, expenses ${cur.expense.toFixed(2)}. ` +
      `Expenses by category: ${JSON.stringify(cur.byCategory)}.\n` +
      `Last month: income ${prev.income.toFixed(2)}, expenses ${prev.expense.toFixed(2)}, ` +
      `by category ${JSON.stringify(prev.byCategory)}.\n` +
      `Monthly budgets: ${JSON.stringify(settings?.budgets || [])}.\n` +
      `Recurring bills: ${bills.map((b) => `${b.name} ${b.amount} ${b.frequency}`).join("; ") || "none"}.\n` +
      `Write a 1-2 sentence summary of how the month is going (mention the pace if the month is not over), ` +
      `and up to 3 short, concrete tips using the real numbers and categories. Speak to the user as "you".`,
    {
      type: Type.OBJECT,
      properties: { summary: { type: Type.STRING }, tips: { type: Type.ARRAY, items: { type: Type.STRING } } },
      required: ["summary", "tips"],
    }
  );
  return res.status(200).json(
    new ApiResponse(200, {
      summary: clip(result.summary, 500),
      tips: (result.tips || []).slice(0, 3).map((t) => clip(t, 220)),
    })
  );
});

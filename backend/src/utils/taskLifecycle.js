// What happens around a task's life: focus time, completion, reopening.
// Shared by the task routes and the finance routes (paying a bill completes its task).
import Tasks from "../models/tasksSchema.js";
import { Bill, TimeEntry, Transaction } from "../models/financeSchemas.js";
import { logActivity } from "./logActivity.js";

// A forgotten timer never adds more than this to a task
export const MAX_SESSION_HOURS = 8;

const round = (n) => Math.round(n * 10000) / 10000;

export const isDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
export const todayOr = (value) => (isDay(value) ? value : new Date().toISOString().slice(0, 10));

export const formatDuration = (hours) => {
  const minutes = Math.round(Math.abs(hours) * 60);
  if (minutes < 1) return "under a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ");
};

// Stop the focus timer (if running): add the time to the task and keep a time entry
// (the entry is what freelance earnings and invoices are built from). Caller saves the task.
export const stopTimer = async (task) => {
  if (!task.timerStartedAt) return 0;
  const startedAt = task.timerStartedAt;
  const endedAt = new Date();
  const elapsed = Math.max(0, (endedAt - startedAt) / 3600000);
  const added = Math.min(elapsed, MAX_SESSION_HOURS);
  task.hoursLogged = round((task.hoursLogged || 0) + added);
  task.timerStartedAt = null;
  if (added > 0) {
    await TimeEntry.create({
      userId: task.userId,
      taskId: task._id,
      taskTitle: task.title,
      clientId: task.clientId || null,
      startedAt,
      endedAt: added < elapsed ? new Date(startedAt.getTime() + added * 3600000) : endedAt,
      hours: round(added),
      source: "timer",
    });
  }
  return added;
};

// The time spent was corrected by hand: keep the difference as an entry so totals still add up
export const recordManualTime = async (task, diff) => {
  if (!diff) return;
  const now = new Date();
  await TimeEntry.create({
    userId: task.userId,
    taskId: task._id,
    taskTitle: task.title,
    clientId: task.clientId || null,
    startedAt: now,
    endedAt: now,
    hours: round(diff),
    source: "manual",
  });
};

// ---- dates (stored as UTC-midnight calendar days) ----

export const addInterval = (date, unit) => {
  const d = new Date(date);
  if (unit === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (unit === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (unit === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else if (unit === "yearly") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else if (unit === "weekdays") {
    do d.setUTCDate(d.getUTCDate() + 1);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  }
  return d;
};

// ---- bills ----

// The "Pay ..." task for a bill's next due date
export const createBillTask = async (bill) => {
  const task = await Tasks.create({
    title: `Pay ${bill.name}`,
    category: "Finance",
    priority: "Medium",
    dueDate: bill.nextDueDate,
    billId: bill._id,
    userId: bill.userId,
  });
  bill.taskId = task._id;
  return task;
};

// ---- completing / reopening ----

// Run after a task was saved as Done. Returns the follow-up task, if one was created.
export const afterCompleted = async (task, today) => {
  let next = null;

  if (task.billId) {
    const bill = await Bill.findOne({ _id: task.billId, userId: task.userId });
    if (bill) {
      // Record the payment once per tick (reopening removes it again)
      if (!task.paymentId) {
        const payment = await Transaction.create({
          userId: task.userId,
          type: "expense",
          amount: bill.amount,
          category: bill.category,
          note: bill.name,
          date: new Date(),
          billId: bill._id,
        });
        task.paymentId = payment._id;
        await logActivity(task.userId, "bill_paid", `Paid ${bill.name}`, { billId: bill._id, amount: bill.amount });
      }
      if (!task.nextCreated && bill.active) {
        bill.nextDueDate = addInterval(task.dueDate || bill.nextDueDate, bill.frequency);
        next = await createBillTask(bill);
        await bill.save();
        task.nextCreated = true;
      }
      await task.save();
    }
    return next;
  }

  if (task.repeat && task.repeat !== "none" && !task.nextCreated) {
    const todayDate = new Date(todayOr(today));
    // Next date after the due date; an overdue (or undated) task repeats from today instead
    let due = task.dueDate ? addInterval(task.dueDate, task.repeat) : null;
    if (!due || due <= todayDate) due = addInterval(todayDate, task.repeat);
    next = await Tasks.create({
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      estimatedHours: task.estimatedHours,
      dueDate: due,
      dueTime: task.dueTime,
      repeat: task.repeat,
      clientId: task.clientId,
      subtasks: task.subtasks.map((s) => ({ title: s.title, done: false })),
      userId: task.userId,
    });
    task.nextCreated = true;
    await task.save();
  }
  return next;
};

// Run after a Done task was reopened: undo the bill payment it recorded
export const afterReopened = async (task) => {
  if (!task.paymentId) return;
  await Transaction.deleteOne({ _id: task.paymentId, userId: task.userId });
  task.paymentId = null;
  await task.save();
};

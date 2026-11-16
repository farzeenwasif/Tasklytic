import mongoose from "mongoose";

export const TASK_STATUSES = ["To do", "Doing", "Done"];
// Statuses used before the 2026 redesign -> their new name (see utils/migrations.js)
export const LEGACY_STATUS_MAP = {
  "Ready to Assign": "To do",
  Scheduled: "To do",
  "In Progress": "Doing",
  Completed: "Done",
};
export const TASK_REPEATS = ["none", "daily", "weekdays", "weekly", "monthly"];
export const TASK_PRIORITIES = ["Low", "Medium", "High"];
// General-purpose categories first; the technical ones stay for software work
export const TASK_CATEGORIES = [
  "Work",
  "Personal",
  "Study",
  "Meeting",
  "Health",
  "Finance",
  "Home",
  "Shopping",
  "Travel",
  "Development",
  "Design",
  "Testing",
  "Maintenance",
  "Other",
];

const tasksSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    // Legacy field from the team-style form; no longer shown in the app
    assignee: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "To do",
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "Medium",
    },
    // Time actually spent, in hours. Filled by the focus timer (start/stop), can be corrected by hand.
    hoursLogged: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Set while the focus timer is running on this task
    timerStartedAt: {
      type: Date,
      default: null,
    },
    // Optional estimate; 0 = no estimate
    estimatedHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Checklist inside the task
    subtasks: [
      {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        done: { type: Boolean, default: false },
      },
    ],
    // When a repeating task is completed, the next occurrence is created automatically
    repeat: {
      type: String,
      enum: TASK_REPEATS,
      default: "none",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // A repeating or bill task creates its follow-up only once, even if it is reopened and ticked again
    nextCreated: {
      type: Boolean,
      default: false,
    },
    // Freelance client (Premium): focus time on this task is billable
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    // Set on the "Pay ..." task of a recurring bill (Premium finance)
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },
    // The expense recorded when this bill task was ticked off
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    category: {
      type: String,
      enum: TASK_CATEGORIES,
      default: "Work",
    },
    // Optional. Stored as the calendar day (UTC midnight); the time of day is separate.
    dueDate: {
      type: Date,
      default: null,
    },
    // Optional "HH:MM" (24h, the user's local time)
    dueTime: {
      type: String,
      default: "",
      match: /^$|^([01]\d|2[0-3]):[0-5]\d$/,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Tasks = mongoose.model("Tasks", tasksSchema);
export default Tasks;

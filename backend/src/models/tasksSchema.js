import mongoose from "mongoose";

export const TASK_STATUSES = ["Ready to Assign", "In Progress", "Completed", "Scheduled"];
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
    // Who does the task. Optional: the frontend fills in the user's own name.
    assignee: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "Ready to Assign",
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "Medium",
    },
    hoursLogged: {
      type: Number,
      min: 0,
      default: 0,
    },
    estimatedHours: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: TASK_CATEGORIES,
      default: "Work",
    },
    dueDate: {
      type: Date,
      required: true,
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

import mongoose from "mongoose";

export const ACTIVITY_ACTIONS = [
  "account_created",
  "login",
  "profile_updated",
  "password_changed",
  "task_created",
  "task_updated",
  "task_completed",
  "hours_logged",
  "task_deleted",
  "tasks_bulk_deleted",
];

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true,
    },
    // Human-readable line shown in the activity log
    message: {
      type: String,
      required: true,
      maxlength: 300,
    },
    // Optional extra details (task id, title, counts...)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Fast "latest activity for this user" queries
activitySchema.index({ userId: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);
export default Activity;

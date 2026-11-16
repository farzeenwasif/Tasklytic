import mongoose from "mongoose";

// "Plan my day": the AI's time blocks for one calendar day (the latest plan wins)
const dayPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    blocks: [
      {
        _id: false,
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Tasks", default: null },
        title: { type: String, default: "" }, // breaks and other non-task blocks
        start: { type: String, required: true },
        end: { type: String, required: true },
        note: { type: String, default: "" },
      },
    ],
    // Tasks the AI suggests moving to another day
    later: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tasks" }],
    summary: { type: String, default: "" },
  },
  { timestamps: true }
);
dayPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

const DayPlan = mongoose.model("DayPlan", dayPlanSchema);
export default DayPlan;

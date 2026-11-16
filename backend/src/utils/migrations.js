import Tasks, { LEGACY_STATUS_MAP } from "../models/tasksSchema.js";

// Runs once at startup, after the DB connects. Safe to run every time: each step
// only touches documents that are still in the old shape.
export const runMigrations = async () => {
  // 2026 redesign: "Ready to Assign / In Progress / Completed / Scheduled" -> "To do / Doing / Done"
  let renamed = 0;
  for (const [oldStatus, newStatus] of Object.entries(LEGACY_STATUS_MAP)) {
    // legacyStatus keeps the old value so the rename can be undone if ever needed
    const update = { $set: { status: newStatus, legacyStatus: oldStatus } };
    const result = await Tasks.collection.updateMany({ status: oldStatus }, update);
    renamed += result.modifiedCount;
  }
  // Give already-finished tasks a completion date (best guess: when they were last edited)
  await Tasks.collection.updateMany({ status: "Done", completedAt: { $in: [null, undefined] } }, [
    { $set: { completedAt: "$updatedAt" } },
  ]);
  if (renamed) console.log(`Migrated ${renamed} task(s) to the new statuses`);
};

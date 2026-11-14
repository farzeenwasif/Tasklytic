import Activity from "../models/activitySchema.js";

/**
 * Save one activity entry for a user.
 * Never throws: a logging failure must not break the real request.
 */
export const logActivity = async (userId, action, message, meta = {}) => {
  try {
    await Activity.create({ userId, action, message, meta });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};

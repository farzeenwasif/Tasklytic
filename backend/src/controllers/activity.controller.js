import Activity from "../models/activitySchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Latest activity of the logged-in user. Query: ?limit=20 (max 100)
export const getMyActivities = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const activities = await Activity.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  return res.status(200).json(new ApiResponse(200, activities, "Activity fetched successfully"));
});

// Clear the logged-in user's activity history
export const clearMyActivities = asyncHandler(async (req, res) => {
  const result = await Activity.deleteMany({ userId: req.user._id });
  return res
    .status(200)
    .json(new ApiResponse(200, { deletedCount: result.deletedCount }, "Activity cleared"));
});

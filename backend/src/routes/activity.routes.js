import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getMyActivities, clearMyActivities } from "../controllers/activity.controller.js";

const router = express.Router();

router.use(verifyJWT);

router.route("/").get(getMyActivities).delete(clearMyActivities);

export default router;

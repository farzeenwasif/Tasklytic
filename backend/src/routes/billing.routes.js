import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getCheckoutConfig,
  syncSubscription,
  cancelSubscription,
  resumeSubscription,
  getPaymentMethod,
  createCardUpdate,
} from "../controllers/billing.controller.js";

// The Paddle webhook is mounted separately in app.js (it needs the raw body)
const router = express.Router();

router.use(verifyJWT);
router.get("/config", getCheckoutConfig);
router.post("/sync", syncSubscription);
router.post("/cancel", cancelSubscription);
router.post("/resume", resumeSubscription);
router.get("/card", getPaymentMethod);
router.post("/card/update", createCardUpdate);

export default router;

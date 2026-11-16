import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createCheckoutSession,
  syncSubscription,
  cancelSubscription,
  resumeSubscription,
  getPaymentMethod,
  createCardSetup,
  saveCard,
} from "../controllers/billing.controller.js";

// The Stripe webhook is mounted separately in app.js (it needs the raw body)
const router = express.Router();

router.use(verifyJWT);
router.post("/checkout", createCheckoutSession);
router.post("/sync", syncSubscription);
router.post("/cancel", cancelSubscription);
router.post("/resume", resumeSubscription);
router.get("/card", getPaymentMethod);
router.post("/card/setup", createCardSetup);
router.post("/card", saveCard);

export default router;

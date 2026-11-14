import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createCheckoutSession,
  createPortalSession,
  syncSubscription,
} from "../controllers/billing.controller.js";

// The Stripe webhook is mounted separately in app.js (it needs the raw body)
const router = express.Router();

router.use(verifyJWT);
router.post("/checkout", createCheckoutSession);
router.post("/portal", createPortalSession);
router.post("/sync", syncSubscription);

export default router;

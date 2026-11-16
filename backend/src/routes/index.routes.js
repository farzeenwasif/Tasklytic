import { Router } from "express";
import indexRoute from "../controllers/index.controller.js";
import { sendContactMessage } from "../controllers/contact.controller.js";

const router = Router();
router.get("/", indexRoute);
// Help form (landing page and in-app Help page); no login needed
router.post("/contact", sendContactMessage);
export default router;

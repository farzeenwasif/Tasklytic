import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  checkResetToken,
  resetPassword,
  updateAvatar,
  removeAvatar,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Password reset by email (the only way to change a password)
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", checkResetToken);
router.post("/reset-password/:token", resetPassword);

// Protected: every request works on the logged-in user only
router.get("/me", verifyJWT, getCurrentUser);
router.patch("/me", verifyJWT, updateProfile);
router.post("/me/avatar", verifyJWT, upload.single("avatar"), updateAvatar);
router.delete("/me/avatar", verifyJWT, removeAvatar);

export default router;

import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/userSchema.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../utils/logActivity.js";
import { uploadAvatar, deleteAvatar } from "../utils/cloudinary.js";
import { validatePassword } from "../utils/password.js";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "../utils/email.js";

const RESET_TOKEN_MINUTES = 15;
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Where the reset link points: FRONTEND_URL, or the first allowed CORS origin
const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")[0])
    .trim()
    .replace(/\/+$/, "");

const generateAccessToken = (userId) => {
  return jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
  });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Register
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, gender } = req.body;

  if (!name?.trim() || !email?.trim() || !password || !gender) {
    throw new ApiError(400, "All fields are required");
  }
  if (!EMAIL_RE.test(email.trim())) {
    throw new ApiError(400, "Invalid email address");
  }
  const passwordError = validatePassword(password);
  if (passwordError) throw new ApiError(400, passwordError);

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    gender,
  });

  const token = generateAccessToken(user._id);
  await logActivity(user._id, "account_created", "Created your account");

  return res
    .status(201)
    .json(new ApiResponse(201, { user, token }, "User registered successfully"));
});

// Login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateAccessToken(user._id);
  await logActivity(user._id, "login", "Logged in");

  return res.status(200).json(new ApiResponse(200, { user, token }, "Login successful"));
});

// Get the logged-in user's profile
export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched"));
});

// Update profile (name, email, gender, bio). The avatar has its own upload endpoint.
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, gender, bio } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  if (name !== undefined) {
    if (!String(name).trim()) throw new ApiError(400, "Name cannot be empty");
    user.name = String(name).trim();
  }
  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) throw new ApiError(400, "Invalid email address");
    if (normalizedEmail !== user.email) {
      const taken = await User.findOne({ email: normalizedEmail });
      if (taken) throw new ApiError(409, "Email is already in use");
      user.email = normalizedEmail;
    }
  }
  if (gender !== undefined) user.gender = gender;
  if (bio !== undefined) user.bio = String(bio);

  await user.save();
  await logActivity(user._id, "profile_updated", "Updated profile details");

  return res.status(200).json(new ApiResponse(200, user, "Profile updated successfully"));
});

// Upload / replace profile photo (multipart field: "avatar")
export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Please choose an image");

  let result;
  try {
    result = await uploadAvatar(req.user._id, req.file.buffer);
  } catch (error) {
    console.error("Avatar upload failed:", error.message);
    throw new ApiError(502, "Could not upload the image. Please try again.");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: result.secure_url },
    { new: true }
  );
  await logActivity(req.user._id, "profile_updated", "Changed profile photo");

  return res.status(200).json(new ApiResponse(200, user, "Profile photo updated"));
});

// Remove profile photo (back to the default avatar)
export const removeAvatar = asyncHandler(async (req, res) => {
  await deleteAvatar(req.user._id);
  const user = await User.findByIdAndUpdate(req.user._id, { avatar: "" }, { new: true });
  await logActivity(req.user._id, "profile_updated", "Removed profile photo");

  return res.status(200).json(new ApiResponse(200, user, "Profile photo removed"));
});

// Step 1: ask for a reset link. Body: { email }
// Always answers the same way, so nobody can test which emails have accounts.
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ApiError(400, "Please enter a valid email address");

  const generic = new ApiResponse(
    200,
    null,
    "If an account exists for that email, a password reset link has been sent."
  );

  const user = await User.findOne({ email }).select("+passwordResetRequestedAt");
  if (!user) return res.status(200).json(generic);

  // One email per minute per account
  const last = user.passwordResetRequestedAt?.getTime() || 0;
  if (Date.now() - last < RESET_REQUEST_COOLDOWN_MS) return res.status(200).json(generic);

  const token = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
  user.passwordResetRequestedAt = new Date();
  await user.save();

  const resetUrl = `${getFrontendUrl()}/reset-password/${token}`;
  // Not awaited: the response time must not reveal whether the account exists
  sendPasswordResetEmail(user, resetUrl, RESET_TOKEN_MINUTES).catch((error) =>
    console.error("Failed to send reset email:", error.message)
  );

  return res.status(200).json(generic);
});

const findUserByResetToken = (token) =>
  User.findOne({
    passwordResetToken: hashToken(String(token || "")),
    passwordResetExpires: { $gt: new Date() },
  });

// Lets the reset page check the link before showing the form
export const checkResetToken = asyncHandler(async (req, res) => {
  const user = await findUserByResetToken(req.params.token);
  if (!user) throw new ApiError(400, "This reset link is invalid or has expired");
  return res.status(200).json(new ApiResponse(200, null, "Reset link is valid"));
});

// Step 2: set the new password. Body: { password }
export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  const passwordError = validatePassword(password);
  if (passwordError) throw new ApiError(400, passwordError);

  const user = await findUserByResetToken(req.params.token);
  if (!user) throw new ApiError(400, "This reset link is invalid or has expired");

  user.password = password;
  user.passwordChangedAt = new Date(); // logs out every existing session
  user.passwordResetToken = undefined; // single use
  user.passwordResetExpires = undefined;
  await user.save();

  await logActivity(user._id, "password_changed", "Changed password");
  sendPasswordChangedEmail(user).catch((error) =>
    console.error("Failed to send password-changed email:", error.message)
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password updated. Please log in with your new password."));
});

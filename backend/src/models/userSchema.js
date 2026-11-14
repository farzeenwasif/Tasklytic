import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { isPremiumUser, isComplimentary } from "../utils/premium.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    // Password reset: only a SHA-256 hash of the emailed token is stored
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetRequestedAt: { type: Date, select: false },
    // Tokens issued before this moment are rejected (logs out all devices)
    passwordChangedAt: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 300,
    },
    // Billing: "premium" unlocks the AI features. Kept in sync by the Stripe webhook.
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    subscription: {
      stripeCustomerId: { type: String, index: true },
      stripeSubscriptionId: { type: String },
      status: { type: String, default: "" }, // Stripe status: active, past_due, canceled...
      currentPeriodEnd: { type: Date },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Hash password whenever it changes
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Never leak the password hash in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.passwordResetRequestedAt;
  delete obj.passwordChangedAt;
  delete obj.__v;
  // Stripe ids stay on the server
  if (obj.subscription) {
    delete obj.subscription.stripeCustomerId;
    delete obj.subscription.stripeSubscriptionId;
  }
  obj.isPremium = isPremiumUser(obj);
  // Premium without a paid subscription (PREMIUM_EMAILS allowlist)
  obj.complimentary = obj.plan !== "premium" && isComplimentary(obj);
  return obj;
};

const User = mongoose.model("User", userSchema);
export default User;

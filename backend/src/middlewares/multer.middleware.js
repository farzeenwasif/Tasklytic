import multer from "multer";
import { ApiError } from "../utils/apiError.js";

// Keep the file in memory and stream it straight to Cloudinary:
// no temp folder needed, which also works on hosts with read-only disks.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, "Only JPG, PNG, WEBP or GIF images are allowed"));
  },
});

// Photos and screenshots for the AI (task capture, receipts). Kept in memory, never stored.
export const aiImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB (the browser shrinks photos before sending)
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, "Use a JPG, PNG or WEBP image"));
  },
});

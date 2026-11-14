import { v2 as cloudinary } from "cloudinary";

// Configure on first use so the env vars are definitely loaded
let configured = false;
const ensureConfig = () => {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
  });
  configured = true;
};

const avatarPublicId = (userId) => `tasklytic/avatars/user_${userId}`;

// Upload (or replace) a user's avatar from an in-memory buffer.
// Cropped to a 400x400 square, centred on the face when one is detected.
export const uploadAvatar = (userId, buffer) => {
  ensureConfig();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: avatarPublicId(userId),
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
};

// Remove a user's avatar. Never throws: a missing image is fine.
export const deleteAvatar = async (userId) => {
  ensureConfig();
  try {
    await cloudinary.uploader.destroy(avatarPublicId(userId), { invalidate: true });
  } catch (error) {
    console.error("Failed to delete avatar:", error.message);
  }
};

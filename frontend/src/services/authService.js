import api from "../utils/apiClient";

// All functions return the backend's ApiResponse.data payload

export const loginUser = async (data) => {
  const response = await api.post("/api/users/login", data);
  return response.data.data; // { user, token }
};

export const registerUser = async (data) => {
  const response = await api.post("/api/users/register", data);
  return response.data.data; // { user, token }
};

export const getCurrentUser = async () => {
  const response = await api.get("/api/users/me");
  return response.data.data; // user
};

export const updateProfile = async (data) => {
  const response = await api.patch("/api/users/me", data);
  return response.data.data; // user
};

// Passwords are only changed through an emailed reset link
export const forgotPassword = async (email) => {
  const response = await api.post("/api/users/forgot-password", { email });
  return response.data;
};

export const checkResetToken = async (token) => {
  const response = await api.get(`/api/users/reset-password/${encodeURIComponent(token)}`);
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post(`/api/users/reset-password/${encodeURIComponent(token)}`, { password });
  return response.data;
};

// Upload a new profile photo (multipart form field "avatar")
export const uploadAvatar = async (file) => {
  const form = new FormData();
  form.append("avatar", file);
  const response = await api.post("/api/users/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data; // user
};

export const removeAvatar = async () => {
  const response = await api.delete("/api/users/me/avatar");
  return response.data.data; // user
};

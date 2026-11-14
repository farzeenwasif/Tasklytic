// One password policy for sign-up and password reset.
// Returns an error message, or null when the password is acceptable.
export const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  // bcrypt only uses the first 72 bytes, so longer passwords would be silently cut
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password must be at most 72 characters";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number";
  }
  return null;
};

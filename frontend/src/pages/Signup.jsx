import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell, { authButtonClass, authInputClass } from "../components/auth/AuthShell";
import PasswordField from "../components/auth/PasswordField";
import { UserContext } from "../context/UserContext";
import { getErrorMessage } from "../utils/apiClient";
import { isPasswordValid } from "../utils/password";

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useContext(UserContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "male",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const mismatch =
    formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid(formData.password)) {
      setError("Password does not meet the requirements");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { confirmPassword, ...payload } = formData;
      await register(payload); // logs the user in automatically
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create Account"
      subtitle="Your own private dashboard"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-[#34D399] hover:underline">Log in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <input
          name="name"
          placeholder="Name"
          autoComplete="name"
          required
          value={formData.name}
          onChange={handleChange}
          className={authInputClass}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          className={authInputClass}
        />

        <PasswordField value={formData.password} onChange={handleChange} showRules />

        <div>
          <PasswordField
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
          />
          {mismatch && <p className="text-red-400 text-xs mt-1.5">Passwords do not match</p>}
        </div>

        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className={authInputClass}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </form>
    </AuthShell>
  );
}

import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell, { authButtonClass, authInputClass } from "../components/auth/AuthShell";
import PasswordField from "../components/auth/PasswordField";
import { UserContext } from "../context/UserContext";
import { getErrorMessage } from "../utils/apiClient";
import { BRIEFING_FLAG } from "../components/AIAssistant";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(UserContext);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // e.g. "Password updated" after a reset
  const notice = location.state?.notice;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(formData);
      // The dashboard loads today's briefing once after login (read aloud only if unmuted)
      try { sessionStorage.setItem(BRIEFING_FLAG, "1"); } catch { /* private mode */ }
      // Go back to the page the user originally wanted, or the dashboard
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your dashboard"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="text-[#34D399] hover:underline">Sign up</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {notice && !error && (
          <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">{notice}</p>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}

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

        <div>
          <PasswordField
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
          <div className="text-right mt-2">
            <Link to="/forgot-password" className="text-xs text-gray-400 hover:text-[#34D399]">
              Forgot password?
            </Link>
          </div>
        </div>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthShell>
  );
}

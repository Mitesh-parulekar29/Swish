import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../features/auth/authApi";
import { useAuth } from "../features/auth/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import { useToast } from "../features/toast/ToastContext";
import "./Home.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await loginUser({ email, password });
      login(result.data.token);
      toast.success("Welcome back!");
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page fade-in">
      <ThemeToggle className="auth-theme-toggle" />
      <div className="auth-box">
        <div className="auth-brand">swish</div>

        <h1>Welcome back.</h1>
        <p className="auth-subtitle">Sign in to continue.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading} className={loading ? "loading" : ""}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
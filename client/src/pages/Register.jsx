import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../features/auth/authApi";
import "./Home.css";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function updateField(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await registerUser(form);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page fade-in">
      <div className="auth-box">
        <div className="auth-brand">swish</div>

        <h1>Create your account.</h1>
        <p className="auth-subtitle">Join your private community.</p>

        <form onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={updateField}
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={updateField}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={updateField}
            required
          />

          <select name="role" value={form.role} onChange={updateField}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading} className={loading ? "loading" : ""}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
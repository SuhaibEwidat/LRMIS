import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API_URL = "http://127.0.0.1:8000";

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(`${API_URL}/auth/login`, formData);

      const accountType = response.data.account_type;
      const profile = response.data.profile || {};

      const role = profile.role || profile.staff_role;

      const user = {
        account_type: accountType,

        // common
        email: response.data.email || formData.email,

        // ids
        _id: profile._id,
        id: profile.id,
        staff_id: profile.staff_id,
        applicant_id: profile.applicant_id,

        // staff fields
        staff_code: profile.staff_code,
        role: role,
        name: profile.name,

        // applicant fields
        full_name: profile.full_name,
        applicant_type: profile.applicant_type,
      };

      localStorage.setItem("lrmis_user", JSON.stringify(user));
      localStorage.setItem("lrmis_token", response.data.access_token || "");

      if (accountType === "applicant") {
        navigate("/applicant-dashboard");
        return;
      }

      if (accountType === "staff") {
        if (role === "surveyor") {
          navigate("/surveyor");
          return;
        }

        if (role === "registrar") {
          navigate("/registrar");
          return;
        }

        setMessage("Staff role is missing or not supported.");
        return;
      }

      navigate("/login");
    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        {/* ── Left info panel ── */}
        <div className="auth-info-panel">
          <svg className="topo-bg" viewBox="0 0 320 560" aria-hidden="true">
            <path d="M0 180 Q50 140 110 160 Q170 180 220 140 Q270 100 320 130" />
            <path d="M0 210 Q60 165 120 190 Q180 215 230 168 Q275 125 320 158" />
            <path d="M0 240 Q70 190 130 220 Q185 245 235 196 Q278 152 320 182" />
            <path d="M0 270 Q80 215 140 248 Q192 275 240 222 Q281 178 320 208" />
            <path d="M0 300 Q90 240 150 276 Q198 305 246 250 Q285 205 320 234" />
            <path d="M40 80 Q90 50 150 70 Q200 88 250 55 Q290 28 320 45" />
            <path d="M20 110 Q75 76 138 98 Q190 116 244 82 Q284 55 320 72" />
            <path d="M0 420 Q60 380 130 400 Q195 418 255 375 Q288 350 320 370" />
            <circle cx="155" cy="220" r="4" />
            <circle cx="155" cy="220" r="9" />
            <circle cx="155" cy="220" r="14" />
          </svg>

          <div className="brand-badge">
            <span className="brand-dot" />
            LRMIS
          </div>

          <div className="panel-body">
            <h1>
              Land Registration
              <br />
              <em>Management</em>
            </h1>

            <p>
              Secure platform for land applications, survey tasks, registrar
              review, certificates, and status tracking.
            </p>
          </div>

          <div className="auth-features">
            <span>Applicant Portal</span>
            <span>Surveyor Tasks</span>
            <span>Registrar Review</span>
          </div>
        </div>

        {/* ── Right form card ── */}
        <div className="auth-card">
          <p className="auth-kicker">SECURE ACCESS</p>

          <h2>Welcome back</h2>

          <p className="auth-subtitle">
            Sign in to continue to your LRMIS account
          </p>

          {message && (
            <div className="auth-message error">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>

              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Email address
              </label>

              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Password
              </label>

              <div className="input-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="forgot-row">
                <a href="/forgot-password" className="forgot-link">
                  Forgot password?
                </a>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            or
            <span />
          </div>

          <p className="auth-footer">
            Don&apos;t have an account?{" "}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
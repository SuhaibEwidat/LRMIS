import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API_URL = "http://127.0.0.1:8000";

function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    account_type: "applicant",

    // applicant
    full_name: "",
    applicant_type: "citizen",
    national_id: "",
    registration_number: "",
    phone: "",
    city: "",
    neighborhood: "",
    street: "",
    zone_id: "",
    preferred_language: "ar",
    notify_email: true,
    notify_sms: false,
    show_contact_to_staff: true,

    // staff
    staff_code: "",
    staff_name: "",
    staff_role: "surveyor",
    department: "",
    skills: "",
    zone_ids: "",
    max_tasks: 10,
    staff_phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function buildRequestBody() {
    const base = {
      email: formData.email,
      password: formData.password,
      account_type: formData.account_type,
    };

    if (formData.account_type === "applicant") {
      return {
        ...base,
        full_name: formData.full_name,
        applicant_type: formData.applicant_type,
        identity: {
          national_id: formData.national_id,
          registration_number: formData.registration_number || null,
        },
        contacts: { phone: formData.phone },
        address: {
          city: formData.city,
          neighborhood: formData.neighborhood,
          street: formData.street,
          zone_id: formData.zone_id,
        },
        preferences: {
          language: formData.preferred_language,
          preferred_contact: formData.notify_email ? "email" : "sms",
          notifications: {
            email: formData.notify_email,
            sms: formData.notify_sms,
            on_status_change: true,
            on_missing_documents: true,
            on_certificate_ready: true,
          },
        },
        privacy_settings: { show_contact_to_staff: formData.show_contact_to_staff },
      };
    }

    return {
      ...base,
      staff_code: formData.staff_code,
      name: formData.staff_name,
      role: formData.staff_role,
      department: formData.department,
      skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
      coverage: {
        zone_ids: formData.zone_ids.split(",").map((s) => s.trim()).filter(Boolean),
      },
      workload: { active_tasks: 0, max_tasks: Number(formData.max_tasks) },
      contacts: { phone: formData.staff_phone },
      active: true,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await axios.post(`${API_URL}/auth/register`, buildRequestBody());
      setMessage({ text: "Account created successfully — redirecting…", type: "success" });
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setMessage({
        text: error.response?.data?.detail || "Registration failed. Please check your data.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  const isApplicant = formData.account_type === "applicant";

  return (
    <div className="auth-page reg-page">
      <div className="reg-layout">

        {/* ── Sidebar ── */}
        <div className="auth-info-panel reg-panel">
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
              Create your<br />
              <em>Account</em>
            </h1>
            <p>
              Register as an applicant to submit land requests, or as a staff
              member to manage surveys and reviews.
            </p>
          </div>

          <div className="reg-steps">
            <div className="reg-step">
              <div className="reg-step-num">1</div>
              <div>
                <strong>Login credentials</strong>
                <span>Email &amp; password</span>
              </div>
            </div>
            <div className="reg-step">
              <div className="reg-step-num">2</div>
              <div>
                <strong>Profile details</strong>
                <span>Identity &amp; contact</span>
              </div>
            </div>
            <div className="reg-step">
              <div className="reg-step-num">3</div>
              <div>
                <strong>Preferences</strong>
                <span>Notifications &amp; privacy</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="reg-form-side">
          <p className="auth-kicker">NEW ACCOUNT</p>
          <h2 className="reg-title">
            {isApplicant ? "Applicant registration" : "Staff registration"}
          </h2>
          <p className="auth-subtitle">Fill in all required fields to create your account</p>

          {message.text && (
            <div className={`auth-message ${message.type}`}>
              {message.type === "error" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form reg-form">

            {/* ── Section 1: Login info ── */}
            <div className="reg-section-label">
              <span className="reg-section-num">1</span>
              Login information
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email" type="email" name="email"
                  placeholder="you@example.com"
                  value={formData.email} onChange={handleChange} required
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <input
                    id="password" type={showPassword ? "text" : "password"} name="password"
                    placeholder="Create a strong password"
                    value={formData.password} onChange={handleChange} required
                  />
                  <button type="button" className="toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="input-group span-full">
                <label>Account type</label>
                <div className="account-type-toggle">
                  <button
                    type="button"
                    className={`type-btn ${isApplicant ? "active" : ""}`}
                    onClick={() => setFormData((p) => ({ ...p, account_type: "applicant" }))}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    Applicant
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${!isApplicant ? "active" : ""}`}
                    onClick={() => setFormData((p) => ({ ...p, account_type: "staff" }))}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                    </svg>
                    Staff member
                  </button>
                </div>
              </div>
            </div>

            {/* ── Section 2a: Applicant profile ── */}
            {isApplicant && (
              <>
                <div className="reg-section-label">
                  <span className="reg-section-num">2</span>
                  Applicant profile
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="full_name">Full name</label>
                    <input id="full_name" type="text" name="full_name"
                      placeholder="Enter full name"
                      value={formData.full_name} onChange={handleChange} required />
                  </div>

                  <div className="input-group">
                    <label htmlFor="applicant_type">Applicant type</label>
                    <select id="applicant_type" name="applicant_type"
                      value={formData.applicant_type} onChange={handleChange}>
                      <option value="citizen">Citizen</option>
                      <option value="lawyer">Lawyer</option>
                      <option value="company">Company</option>
                      <option value="surveyor">Surveyor</option>
                      <option value="authorized_representative">Authorized Representative</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="national_id">National ID</label>
                    <input id="national_id" type="text" name="national_id"
                      placeholder="National ID number"
                      value={formData.national_id} onChange={handleChange} />
                  </div>

                  <div className="input-group">
                    <label htmlFor="registration_number">
                      Registration number
                      <span className="field-hint">Company / lawyer</span>
                    </label>
                    <input id="registration_number" type="text" name="registration_number"
                      placeholder="If applicable"
                      value={formData.registration_number} onChange={handleChange} />
                  </div>

                  <div className="input-group">
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" type="text" name="phone"
                      placeholder="+970 5X XXX XXXX"
                      value={formData.phone} onChange={handleChange} required />
                  </div>

                  <div className="input-group">
                    <label htmlFor="preferred_language">Preferred language</label>
                    <select id="preferred_language" name="preferred_language"
                      value={formData.preferred_language} onChange={handleChange}>
                      <option value="ar">Arabic</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="city">City</label>
                    <input id="city" type="text" name="city"
                      placeholder="Ramallah"
                      value={formData.city} onChange={handleChange} />
                  </div>

                  <div className="input-group">
                    <label htmlFor="neighborhood">Neighborhood</label>
                    <input id="neighborhood" type="text" name="neighborhood"
                      placeholder="Al Tireh"
                      value={formData.neighborhood} onChange={handleChange} />
                  </div>

                  <div className="input-group">
                    <label htmlFor="street">Street</label>
                    <input id="street" type="text" name="street"
                      placeholder="Street name"
                      value={formData.street} onChange={handleChange} />
                  </div>

                  <div className="input-group">
                    <label htmlFor="zone_id">Zone ID</label>
                    <input id="zone_id" type="text" name="zone_id"
                      placeholder="ZONE-RM-01"
                      value={formData.zone_id} onChange={handleChange} />
                  </div>
                </div>

                <div className="reg-section-label">
                  <span className="reg-section-num">3</span>
                  Notifications &amp; privacy
                </div>

                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="notify_email"
                      checked={formData.notify_email} onChange={handleChange} />
                    <span className="checkbox-custom" />
                    <span>
                      Email notifications
                      <em>Receive updates to your inbox</em>
                    </span>
                  </label>

                  <label className="checkbox-label">
                    <input type="checkbox" name="notify_sms"
                      checked={formData.notify_sms} onChange={handleChange} />
                    <span className="checkbox-custom" />
                    <span>
                      SMS notifications
                      <em>Receive text message alerts</em>
                    </span>
                  </label>

                  <label className="checkbox-label">
                    <input type="checkbox" name="show_contact_to_staff"
                      checked={formData.show_contact_to_staff} onChange={handleChange} />
                    <span className="checkbox-custom" />
                    <span>
                      Show contact to staff
                      <em>Staff can view your phone number</em>
                    </span>
                  </label>
                </div>
              </>
            )}

            {/* ── Section 2b: Staff profile ── */}
            {!isApplicant && (
              <>
                <div className="reg-section-label">
                  <span className="reg-section-num">2</span>
                  Staff member profile
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="staff_name">Full name</label>
                    <input id="staff_name" type="text" name="staff_name"
                      placeholder="Survey Team A"
                      value={formData.staff_name} onChange={handleChange} required />
                  </div>

                  <div className="input-group">
                    <label htmlFor="staff_code">Staff code</label>
                    <input id="staff_code" type="text" name="staff_code"
                      placeholder="SURV-RM-01"
                      value={formData.staff_code} onChange={handleChange} required />
                  </div>

                  <div className="input-group">
                    <label htmlFor="staff_role">Role</label>
                    <select id="staff_role" name="staff_role"
                      value={formData.staff_role} onChange={handleChange}>
                      <option value="surveyor">Surveyor</option>
                      <option value="registrar">Registrar</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="department">Department</label>
                    <input id="department" type="text" name="department"
                      placeholder="Cadastral Survey"
                      value={formData.department} onChange={handleChange} />
                  </div>

                  <div className="input-group">
                    <label htmlFor="staff_phone">Phone</label>
                    <input id="staff_phone" type="text" name="staff_phone"
                      placeholder="+970 5X XXX XXXX"
                      value={formData.staff_phone} onChange={handleChange} />
                  </div>

                  <div className="input-group">
                    <label htmlFor="max_tasks">Max concurrent tasks</label>
                    <input id="max_tasks" type="number" name="max_tasks"
                      value={formData.max_tasks} onChange={handleChange} min="1" />
                  </div>

                  <div className="input-group span-full">
                    <label htmlFor="skills">
                      Skills
                      <span className="field-hint">Comma-separated</span>
                    </label>
                    <input id="skills" type="text" name="skills"
                      placeholder="boundary_survey, gps_mapping, cadastral_analysis"
                      value={formData.skills} onChange={handleChange} />
                  </div>

                  <div className="input-group span-full">
                    <label htmlFor="zone_ids">
                      Coverage zones
                      <span className="field-hint">Comma-separated IDs</span>
                    </label>
                    <input id="zone_ids" type="text" name="zone_ids"
                      placeholder="ZONE-RM-01, ZONE-RM-02"
                      value={formData.zone_ids} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span />or<span />
          </div>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;

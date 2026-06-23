import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function splitCommaValues(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account_type: "applicant",

    email: "",
    password: "",

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
  });

  const [staffForm, setStaffForm] = useState({
  staff_code: "",
  name: "",
  role: "registrar",
  department: "",
  skills: "",
  zone_ids: "",
  phone: "",
  max_tasks: "",
});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleStaffChange(e) {
    const { name, value } = e.target;

    setStaffForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleAccountTypeChange(accountType) {
    setFormData((prev) => ({
      ...prev,
      account_type: accountType,
    }));

    setMessage({ text: "", type: "" });
  }

  function validateApplicantForm() {
    if (!formData.full_name.trim()) {
      return "Full name is required.";
    }

    if (!formData.phone.trim()) {
      return "Phone number is required.";
    }

    if (!formData.city.trim()) {
      return "City is required.";
    }

    if (!formData.zone_id.trim()) {
      return "Zone ID is required.";
    }

    const needsNationalId = [
      "citizen",
      "surveyor",
      "authorized_representative",
    ].includes(formData.applicant_type);

    const needsRegistrationNumber = ["company", "lawyer"].includes(
      formData.applicant_type
    );

    if (needsNationalId && !formData.national_id.trim()) {
      return "National ID is required for this applicant type.";
    }

    if (needsRegistrationNumber && !formData.registration_number.trim()) {
      return "Registration number is required for this applicant type.";
    }

    return "";
  }

  function validateStaffForm() {
    if (!staffForm.staff_code.trim()) {
      return "Staff code is required.";
    }

    if (!staffForm.name.trim()) {
      return "Staff name is required.";
    }

    if (!staffForm.role.trim()) {
      return "Staff role is required.";
    }

    if (!staffForm.department.trim()) {
      return "Department is required.";
    }

    if (!staffForm.phone.trim()) {
      return "Staff phone is required.";
    }

    if (!staffForm.zone_ids.trim()) {
      return "At least one zone ID is required.";
    }

    if (!staffForm.max_tasks || Number(staffForm.max_tasks) <= 0) {
      return "Max tasks must be greater than 0.";
    }

    return "";
  }

  function validateForm() {
    if (!formData.email.trim()) {
      return "Email is required.";
    }

    if (!formData.password.trim()) {
      return "Password is required.";
    }

    if (formData.account_type === "staff") {
      return validateStaffForm();
    }

    return validateApplicantForm();
  }

  function buildApplicantRequestBody() {
    return {
      email: formData.email.trim(),
      password: formData.password,
      account_type: "applicant",

      full_name: formData.full_name.trim(),
      applicant_type: formData.applicant_type,

      identity: {
        national_id: formData.national_id.trim() || null,
        registration_number: formData.registration_number.trim() || null,
      },

      contacts: {
        phone: formData.phone.trim(),
      },

      address: {
        city: formData.city.trim(),
        neighborhood: formData.neighborhood.trim(),
        street: formData.street.trim(),
        zone_id: formData.zone_id.trim(),
      },

      preferences: {
        language: formData.preferred_language,
        preferred_contact: "email",
        notifications: {
          email: true,
          sms: false,
          on_status_change: true,
          on_missing_documents: true,
          on_certificate_ready: true,
        },
      },

      privacy_settings: {
        show_contact_to_staff: true,
      },
    };
  }

  function buildStaffRequestBody() {
    return {
      email: formData.email.trim(),
      password: formData.password,
      account_type: "staff",

      staff_code: staffForm.staff_code.trim(),
      name: staffForm.name.trim(),
      role: staffForm.role,
      department: staffForm.department.trim(),

      skills: splitCommaValues(staffForm.skills),

      coverage: {
        zone_ids: splitCommaValues(staffForm.zone_ids),
      },

      workload: {
        active_tasks: 0,
        max_tasks: Number(staffForm.max_tasks),
      },

      contacts: {
        phone: staffForm.phone.trim(),
      },

      active: true,
    };
  }

  function buildRequestBody() {
    if (formData.account_type === "staff") {
      return buildStaffRequestBody();
    }

    return buildApplicantRequestBody();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setMessage({ text: validationMessage, type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await axios.post(`${API_URL}/auth/register`, buildRequestBody());

      setMessage({
        text:
          formData.account_type === "staff"
            ? "Staff account created successfully — redirecting to login…"
            : "Applicant account created successfully — redirecting to login…",
        type: "success",
      });

      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setMessage({
        text:
          error.response?.data?.detail ||
          "Registration failed. Please check your data.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  const isCompanyOrLawyer = ["company", "lawyer"].includes(
    formData.applicant_type
  );

  return (
    <div className="auth-page reg-page">
      <div className="reg-layout">
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
              Account
              <br />
              <em>Registration</em>
            </h1>

            <p>
              Create an applicant or staff account to access LRMIS services,
              manage land registration requests, and track application workflow.
            </p>
          </div>

          <div className="reg-steps">
            <div className="reg-step">
              <div className="reg-step-num">1</div>
              <div>
                <strong>Choose account</strong>
                <span>Applicant or staff member</span>
              </div>
            </div>

            <div className="reg-step">
              <div className="reg-step-num">2</div>
              <div>
                <strong>Login credentials</strong>
                <span>Email &amp; password</span>
              </div>
            </div>

            <div className="reg-step">
              <div className="reg-step-num">3</div>
              <div>
                <strong>Profile details</strong>
                <span>Identity, role &amp; contact info</span>
              </div>
            </div>
          </div>
        </div>

        <div className="reg-form-side">
          <p className="auth-kicker">NEW LRMIS ACCOUNT</p>

          <h2 className="reg-title">
            {formData.account_type === "staff"
              ? "Staff registration"
              : "Applicant registration"}
          </h2>

          <p className="auth-subtitle">
            Choose the account type and fill in the required information
          </p>

          <div className="account-type-switch">
            <button
              type="button"
              className={
                formData.account_type === "applicant" ? "active" : ""
              }
              onClick={() => handleAccountTypeChange("applicant")}
            >
              Applicant
            </button>

            <button
              type="button"
              className={formData.account_type === "staff" ? "active" : ""}
              onClick={() => handleAccountTypeChange("staff")}
            >
              Staff member
            </button>
          </div>

          {message.text && (
            <div className={`auth-message ${message.type}`}>
              {message.type === "error" ? (
                <svg
                  width="15"
                  height="15"
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
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}

              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form reg-form">
            <div className="reg-section-label">
              <span className="reg-section-num">1</span>
              Login information
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>

                <div className="input-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />

                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            {formData.account_type === "applicant" && (
              <>
                <div className="reg-section-label">
                  <span className="reg-section-num">2</span>
                  Applicant profile
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="full_name">Full name</label>
                    <input
                      id="full_name"
                      type="text"
                      name="full_name"
                      placeholder="Enter full name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="applicant_type">Applicant type</label>
                    <select
                      id="applicant_type"
                      name="applicant_type"
                      value={formData.applicant_type}
                      onChange={handleChange}
                    >
                      <option value="citizen">Citizen</option>
                      <option value="lawyer">Lawyer</option>
                      <option value="company">Company</option>
                      <option value="surveyor">Surveyor</option>
                      <option value="authorized_representative">
                        Authorized Representative
                      </option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="national_id">
                      National ID
                      {!isCompanyOrLawyer && (
                        <span className="field-hint">Required</span>
                      )}
                    </label>

                    <input
                      id="national_id"
                      type="text"
                      name="national_id"
                      placeholder="National ID number"
                      value={formData.national_id}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="registration_number">
                      Registration number
                      {isCompanyOrLawyer && (
                        <span className="field-hint">Required</span>
                      )}
                    </label>

                    <input
                      id="registration_number"
                      type="text"
                      name="registration_number"
                      placeholder="Company / lawyer registration number"
                      value={formData.registration_number}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      id="phone"
                      type="text"
                      name="phone"
                      placeholder="+970 5X XXX XXXX"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="preferred_language">
                      Preferred language
                    </label>
                    <select
                      id="preferred_language"
                      name="preferred_language"
                      value={formData.preferred_language}
                      onChange={handleChange}
                    >
                      <option value="ar">Arabic</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="city">City</label>
                    <input
                      id="city"
                      type="text"
                      name="city"
                      placeholder="Ramallah"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="neighborhood">Neighborhood</label>
                    <input
                      id="neighborhood"
                      type="text"
                      name="neighborhood"
                      placeholder="Al Tireh"
                      value={formData.neighborhood}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="street">Street</label>
                    <input
                      id="street"
                      type="text"
                      name="street"
                      placeholder="Street name"
                      value={formData.street}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="zone_id">Zone ID</label>
                    <input
                      id="zone_id"
                      type="text"
                      name="zone_id"
                      placeholder="ZONE-RM-01"
                      value={formData.zone_id}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {formData.account_type === "staff" && (
              <>
                <div className="reg-section-label">
                  <span className="reg-section-num">2</span>
                  Staff profile
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="staff_code">Staff Code</label>
                    <input
                      id="staff_code"
                      type="text"
                      name="staff_code"
                      placeholder="REG-RM-02"
                      value={staffForm.staff_code}
                      onChange={handleStaffChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="name">Name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      placeholder="Registrar Officer 2"
                      value={staffForm.name}
                      onChange={handleStaffChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="role">Role</label>
                    <select
                      id="role"
                      name="role"
                      value={staffForm.role}
                      onChange={handleStaffChange}
                    >
                      <option value="registrar">Registrar</option>
                      <option value="surveyor">Surveyor</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="department">Department</label>
                   <input
  id="department"
  type="text"
  name="department"
  placeholder="Land Registration Department"
  value={staffForm.department}
  onChange={handleStaffChange}
  required
/>
                  </div>

                  <div className="input-group">
                    <label htmlFor="skills">Skills</label>
                    <input
  id="skills"
  type="text"
  name="skills"
  placeholder="legal_review, document_verification"
  value={staffForm.skills}
  onChange={handleStaffChange}
/>
                  </div>

                  <div className="input-group">
                    <label htmlFor="zone_ids">Zone IDs</label>
                   <input
  id="zone_ids"
  type="text"
  name="zone_ids"
  placeholder="ZONE-RM-01, ZONE-RM-02"
  value={staffForm.zone_ids}
  onChange={handleStaffChange}
  required
/>
                  </div>

                  <div className="input-group">
                    <label htmlFor="staff_phone">Phone</label>
                  <input
  id="staff_phone"
  type="text"
  name="phone"
  placeholder="+970599222222"
  value={staffForm.phone}
  onChange={handleStaffChange}
  required
/>
                  </div>

                  <div className="input-group">
                    <label htmlFor="max_tasks">Max Tasks</label>
                    <input
  id="max_tasks"
  type="number"
  name="max_tasks"
  min="1"
  placeholder="10"
  value={staffForm.max_tasks}
  onChange={handleStaffChange}
  required
/>
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
              ) : formData.account_type === "staff" ? (
                "Create staff account"
              ) : (
                "Create applicant account"
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            or
            <span />
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
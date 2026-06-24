import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Header.css";

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function Header({ title = "LRMIS Portal", subtitle = "" }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = getUserFromStorage();

  const accountType = user.account_type;
  const role = user.role || user.staff_role;

  const displayName =
    user.full_name ||
    user.name ||
    user.staff_code ||
    user.email ||
    "User";

  function getRoleLabel() {
    if (accountType === "applicant") return "Applicant";
    if (accountType === "staff" && role === "surveyor") return "Surveyor";
    if (accountType === "staff" && role === "registrar") return "Registrar";
    return "User";
  }

  function handleHomeClick() {
    if (accountType === "applicant") {
      navigate("/applicant-dashboard");
      return;
    }

    if (accountType === "staff" && role === "surveyor") {
      navigate("/surveyor/tasks");
      return;
    }

    if (accountType === "staff" && role === "registrar") {
      navigate("/registrar");
      return;
    }

    navigate("/login");
  }

  function logout() {
    localStorage.removeItem("lrmis_user");
    localStorage.removeItem("lrmis_token");
    navigate("/login");
  }

  return (
    <header className="main-header">
      <svg
        className="header-topo"
        viewBox="0 0 900 90"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 20 Q150 0 300 25 Q450 50 600 18 Q750 -5 900 22" />
        <path d="M0 55 Q150 35 300 60 Q450 85 600 50 Q750 25 900 55" />
        <path d="M0 80 Q150 65 300 85 Q450 100 600 78 Q750 55 900 80" />
      </svg>

      <div className="header-left">
        <button className="brand-box" type="button" onClick={handleHomeClick}>
          <div className="brand-icon">L</div>

          <div className="brand-text">
            <h2>LRMIS</h2>
            <span>Land Registration System</span>
          </div>
        </button>

        <div className="page-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle navigation menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
        {accountType === "applicant" && (
          <NavLink
            to="/applicant-dashboard"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            Applicant Dashboard
          </NavLink>
        )}

        {accountType === "staff" && role === "surveyor" && (
          <NavLink
            to="/surveyor/tasks"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Surveyor Panel
          </NavLink>
        )}

        {accountType === "staff" && role === "registrar" && (
          <NavLink
            to="/registrar"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
            </svg>
            Registrar Review
          </NavLink>
        )}

        <div className="header-divider" />

        <div className="user-chip">
          <div className="user-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="user-info">
            <strong>{displayName}</strong>
            <span>{getRoleLabel()}</span>
          </div>
        </div>

        <button
          className="logout-header-btn"
          type="button"
          onClick={logout}
          aria-label="Logout"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </nav>
    </header>
  );
}

export default Header;
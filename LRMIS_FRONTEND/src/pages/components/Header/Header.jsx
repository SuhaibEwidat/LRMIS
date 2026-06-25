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
      <div className="header-left">
        <button className="brand-box" type="button" onClick={handleHomeClick}>
          <div className="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </div>
          <div className="brand-text">
            <h2>LRMIS</h2>
          </div>
        </button>

        <div className="page-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export default Header;
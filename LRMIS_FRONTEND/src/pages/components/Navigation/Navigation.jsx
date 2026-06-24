import { NavLink } from "react-router-dom";
import "./Navigation.css";

function Navigation({ user, onLogout }) {
  const navItems = [
    { label: "My Survey Tasks", to: "/surveyor/tasks" },
    { label: "Task Execution", to: "/surveyor/execution" },
    { label: "Live Map", to: "/surveyor/map" },
    { label: "Analytics", to: "/surveyor/analytics" },
  ];

  const displayName =
    user?.name ||
    user?.full_name ||
    user?.staff_code ||
    user?.email ||
    "Surveyor";

  return (
    <aside className="navigation">
      <div>
        <div className="navigation-brand">
          <div className="navigation-logo">L</div>

          <div>
            <h2>LRMIS</h2>
            <p>Surveyor Panel</p>
          </div>
        </div>

        <nav className="navigation-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "navigation-link active" : "navigation-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="navigation-user">
        <div className="navigation-avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>

        <strong>{displayName}</strong>
        <span>{user?.staff_code || "Staff Member"}</span>

        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Navigation;
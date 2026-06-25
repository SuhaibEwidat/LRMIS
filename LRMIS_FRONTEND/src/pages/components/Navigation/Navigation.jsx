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
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Navigation;
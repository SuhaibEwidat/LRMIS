import "./Navigation.css";

function Navigation({ user, onLogout }) {
  const navItems = [
    { label: "Overview", href: "#overview" },
    { label: "My Tasks", href: "#tasks" },
    { label: "Task Details", href: "#task-details" },
    { label: "Schedule Visit", href: "#schedule" },
    { label: "Milestones", href: "#milestones" },
    { label: "Field Notes", href: "#notes" },
    { label: "Upload Report", href: "#report" },
    { label: "Timeline", href: "#timeline" },
  ];

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
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="navigation-user">
        <div className="navigation-avatar">
          {(user?.name || user?.staff_code || "S").charAt(0).toUpperCase()}
        </div>

        <strong>{user?.name || "Surveyor"}</strong>
        <span>{user?.staff_code || "Staff Member"}</span>

        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Navigation;
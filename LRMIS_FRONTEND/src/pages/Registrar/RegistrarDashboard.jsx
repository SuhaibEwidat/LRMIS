import { useEffect, useState } from "react";
import { getAllApplications } from "../../api/registrarStaffApi";
import "./RegistrarDashboard.css";

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function getApplicationStatus(application) {
  return (
    application?.workflow?.current_state ||
    application?.status ||
    "submitted"
  );
}

function hasMissingDocuments(application) {
  return application?.required_documents?.some(
    (document) => document.status === "missing"
  );
}

function extractApplications(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.applications)) {
    return responseData.applications;
  }

  return [];
}

function calculateDashboardStats(applicationsList) {
  const pendingStatuses = [
    "submitted",
    "pending",
    "pre_checked",
    "missing_documents",
  ];

  return {
    pending: applicationsList.filter((application) =>
      pendingStatuses.includes(getApplicationStatus(application))
    ).length,

    missingDocuments: applicationsList.filter((application) =>
      hasMissingDocuments(application)
    ).length,

    underObjection: applicationsList.filter((application) => {
      const status = getApplicationStatus(application);

      return (
        status === "under_objection" ||
        application?.objection?.has_objection === true
      );
    }).length,

    legalReview: applicationsList.filter(
      (application) => getApplicationStatus(application) === "legal_review"
    ).length,
  };
}

function RegistrarDashboard() {
  const [user, setUser] = useState({});
  const [activeSection, setActiveSection] = useState("overview");

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    missingDocuments: 0,
    underObjection: 0,
    legalReview: 0,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = getUserFromStorage();
    setUser(storedUser);

    async function loadDashboardData() {
      try {
        setLoading(true);
        setMessage("");

        const response = await getAllApplications();
        const applicationsList = extractApplications(response.data);

        setApplications(applicationsList);
        setStats(calculateDashboardStats(applicationsList));
      } catch (error) {
        console.log("Failed to load registrar dashboard:", error);
        setMessage("Failed to load registrar dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  function logout() {
    localStorage.removeItem("lrmis_user");
    localStorage.removeItem("lrmis_token");
    window.location.href = "/login";
  }

  const staffName =
    user.name ||
    user.full_name ||
    user.email ||
    "Registrar Officer";

  return (
    <div className="registrar-page">
      <aside className="registrar-sidebar">
        <div className="registrar-brand">
          <h2>LRMIS</h2>
          <p>Registrar Console</p>
        </div>

        <nav className="registrar-nav">
          <button
            type="button"
            className={activeSection === "overview" ? "active" : ""}
            onClick={() => setActiveSection("overview")}
          >
            Overview
          </button>

          <button
            type="button"
            className={activeSection === "applications" ? "active" : ""}
            onClick={() => setActiveSection("applications")}
          >
            Applications
          </button>

          <button
            type="button"
            className={activeSection === "review" ? "active" : ""}
            onClick={() => setActiveSection("review")}
          >
            Registrar Review
          </button>

          <button
            type="button"
            className={activeSection === "certificates" ? "active" : ""}
            onClick={() => setActiveSection("certificates")}
          >
            Certificates
          </button>
        </nav>

        <button type="button" className="registrar-logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="registrar-main">
        {message && <div className="registrar-message">{message}</div>}

        {activeSection === "overview" && (
          <>
            <section className="registrar-header">
              <p className="label">Registrar Workspace</p>
              <h1>Welcome, {staffName}</h1>
              <span>
                Review land registration applications, documents, objections,
                workflow status, and certificate issuance.
              </span>
            </section>

            <section className="registrar-stats-grid">
              <div className="registrar-stat-card">
                <span>Total Pending Applications</span>
                <strong>{loading ? "..." : stats.pending}</strong>
              </div>

              <div className="registrar-stat-card">
                <span>Missing Documents</span>
                <strong>{loading ? "..." : stats.missingDocuments}</strong>
              </div>

              <div className="registrar-stat-card">
                <span>Under Objection</span>
                <strong>{loading ? "..." : stats.underObjection}</strong>
              </div>

              <div className="registrar-stat-card">
                <span>Legal Review</span>
                <strong>{loading ? "..." : stats.legalReview}</strong>
              </div>
            </section>
          </>
        )}

        {activeSection === "applications" && (
          <section className="registrar-panel">
            <h2>Application Management</h2>
            <p>
              Search, filter, and open land registration applications for review.
            </p>

            {loading ? (
              <div className="placeholder-box">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="placeholder-box">
                No applications found.
              </div>
            ) : (
              <div className="registrar-applications-list">
                {applications.map((application) => (
                  <div
                    className="registrar-application-row"
                    key={application._id || application.application_id}
                  >
                    <div>
                      <strong>{application.application_id || "Application"}</strong>
                      <span>
                        {application.application_type?.replaceAll("_", " ") ||
                          application.tags?.[0]?.replaceAll("_", " ") ||
                          "-"}
                      </span>
                    </div>

                    <span className="registrar-status-pill">
                      {getApplicationStatus(application).replaceAll("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === "review" && (
          <section className="registrar-panel">
            <h2>Registrar Review</h2>
            <p>
              Review legal documents, accept or reject documents, add decisions,
              and move applications through the workflow.
            </p>

            <div className="placeholder-box">
              Registrar review screen will be built here.
            </div>
          </section>
        )}

        {activeSection === "certificates" && (
          <section className="registrar-panel">
            <h2>Certificate Issuance</h2>
            <p>
              View approved applications and generate certificate metadata.
            </p>

            <div className="placeholder-box">
              Certificate issuance screen will be built here.
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default RegistrarDashboard;
import { useEffect, useState } from "react";
import { getAllApplications } from "../../api/registrarStaffApi";
import "./RegistrarDashboard.css";

const APPLICATION_STATUSES = [
  "submitted",
  "pending",
  "pre_checked",
  "survey_required",
  "surveyed",
  "legal_review",
  "under_objection",
  "missing_documents",
  "approved",
  "certificate_issued",
  "closed",
  "rejected",
  "on_hold",
];

const STATUS_LABELS = {
  submitted: "Submitted",
  pending: "Pending",
  pre_checked: "Pre Checked",
  survey_required: "Survey Required",
  surveyed: "Surveyed",
  legal_review: "Legal Review",
  under_objection: "Under Objection",
  missing_documents: "Missing Docs",
  approved: "Approved",
  certificate_issued: "Certificate Issued",
  closed: "Closed",
  rejected: "Rejected",
  on_hold: "On Hold",
};

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function formatStatus(status) {
  if (!status) return "-";

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatusLabel(status) {
  return STATUS_LABELS[status] || formatStatus(status);
}

function getApplicationStatus(application) {
  return (
    application?.workflow?.current_state ||
    application?.status ||
    "submitted"
  );
}

function getSubmittedDate(application) {
  return (
    application?.timestamps?.submitted_at ||
    application?.submitted_at ||
    application?.created_at ||
    ""
  );
}

function getApplicantId(application) {
  return application?.applicant_ref?.applicant_id || "";
}

function getParcelNumber(application) {
  return application?.parcel_ref?.parcel_number || "";
}

function getZoneId(application) {
  return application?.parcel_ref?.zone_id || "";
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
  const finalStatuses = ["closed", "rejected", "certificate_issued"];

  return {
    activeApplications: applicationsList.filter((application) => {
      const status = getApplicationStatus(application);
      return !finalStatuses.includes(status);
    }).length,

    missingDocuments: applicationsList.filter((application) =>
      hasMissingDocuments(application)
    ).length,

    withObjections: applicationsList.filter((application) => {
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

function calculateApplicationsByStatus(applicationsList) {
  const result = {};

  applicationsList.forEach((application) => {
    const status = getApplicationStatus(application);
    result[status] = (result[status] || 0) + 1;
  });

  return result;
}

function RegistrarDashboard() {
  const [user, setUser] = useState({});
  const [activeSection, setActiveSection] = useState("overview");

  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    zone: "",
    date: "",
    applicant: "",
    parcel: "",
  });

  const [stats, setStats] = useState({
    activeApplications: 0,
    missingDocuments: 0,
    withObjections: 0,
    legalReview: 0,
  });

  const [statusStats, setStatusStats] = useState({});
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
        setStatusStats(calculateApplicationsByStatus(applicationsList));
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

  function handleFilterChange(e) {
    const { name, value } = e.target;

    setFilters((previousFilters) => ({
      ...previousFilters,
      [name]: value,
    }));
  }

  function clearFilters() {
    setFilters({
      search: "",
      status: "all",
      type: "all",
      zone: "",
      date: "",
      applicant: "",
      parcel: "",
    });
  }

  function openApplicationDetails(application) {
    setSelectedApplication(application);
  }

  const staffName =
    user.name || user.full_name || user.email || "Registrar Officer";

  const visibleStatusStats = APPLICATION_STATUSES.map((status) => ({
    status,
    label: formatStatusLabel(status),
    count: statusStats[status] || 0,
  })).filter((item) => item.count > 0);

  const applicationStatuses = Array.from(
    new Set(applications.map((application) => getApplicationStatus(application)))
  ).filter(Boolean);

  const applicationTypes = Array.from(
    new Set(applications.map((application) => application.application_type))
  ).filter(Boolean);

  const filteredApplications = applications.filter((application) => {
    const status = getApplicationStatus(application);
    const type = application.application_type || "";
    const zone = getZoneId(application);
    const applicantId = getApplicantId(application);
    const parcelNumber = getParcelNumber(application);
    const submittedDate = getSubmittedDate(application);
    const submittedDateOnly = submittedDate ? submittedDate.slice(0, 10) : "";

    const searchText = filters.search.toLowerCase().trim();

    const matchesSearch =
      !searchText ||
      application.application_id?.toLowerCase().includes(searchText) ||
      applicantId.toLowerCase().includes(searchText) ||
      parcelNumber.toLowerCase().includes(searchText) ||
      zone.toLowerCase().includes(searchText);

    const matchesStatus =
      filters.status === "all" || status === filters.status;

    const matchesType = filters.type === "all" || type === filters.type;

    const matchesZone =
      !filters.zone ||
      zone.toLowerCase().includes(filters.zone.toLowerCase().trim());

    const matchesApplicant =
      !filters.applicant ||
      applicantId
        .toLowerCase()
        .includes(filters.applicant.toLowerCase().trim());

    const matchesParcel =
      !filters.parcel ||
      parcelNumber.toLowerCase().includes(filters.parcel.toLowerCase().trim());

    const matchesDate = !filters.date || submittedDateOnly === filters.date;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesType &&
      matchesZone &&
      matchesApplicant &&
      matchesParcel &&
      matchesDate
    );
  });

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
                <span>Active Applications</span>
                <strong>{loading ? "..." : stats.activeApplications}</strong>
              </div>

              <div className="registrar-stat-card">
                <span>With Missing Documents</span>
                <strong>{loading ? "..." : stats.missingDocuments}</strong>
              </div>

              <div className="registrar-stat-card">
                <span>With Objections</span>
                <strong>{loading ? "..." : stats.withObjections}</strong>
              </div>

              <div className="registrar-stat-card">
                <span>Legal Review</span>
                <strong>{loading ? "..." : stats.legalReview}</strong>
              </div>
            </section>

            <section className="registrar-panel registrar-status-panel">
              <div className="registrar-panel-header">
                <div>
                  <h2>Applications by Status</h2>
                  <p>Only statuses that currently have applications are shown.</p>
                </div>
              </div>

              {loading ? (
                <div className="placeholder-box compact-placeholder">
                  Loading status summary...
                </div>
              ) : visibleStatusStats.length === 0 ? (
                <div className="placeholder-box compact-placeholder">
                  No status data available.
                </div>
              ) : (
                <div className="registrar-status-compact-list">
                  {visibleStatusStats.map((item) => (
                    <div
                      className="registrar-status-compact-row"
                      key={item.status}
                    >
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeSection === "applications" && (
          <section className="registrar-panel">
            <div className="section-header-row">
              <div>
                <h2>Application Management</h2>
                <p>
                  Search, filter, and open land registration applications for
                  review.
                </p>
              </div>

              <strong className="results-count">
                {filteredApplications.length} results
              </strong>
            </div>

            <div className="applications-filters">
              <input
                type="text"
                name="search"
                placeholder="Search by application ID, parcel, or zone"
                value={filters.search}
                onChange={handleFilterChange}
              />

              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">All statuses</option>
                {applicationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>

              <select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
              >
                <option value="all">All types</option>
                {applicationTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatStatus(type)}
                  </option>
                ))}
              </select>

              <input
                type="text"
                name="zone"
                placeholder="Filter by zone"
                value={filters.zone}
                onChange={handleFilterChange}
              />

              <input
                type="date"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
              />

            

              <input
                type="text"
                name="parcel"
                placeholder="Filter by parcel number"
                value={filters.parcel}
                onChange={handleFilterChange}
              />

              <button type="button" onClick={clearFilters}>
                Clear
              </button>
            </div>

            <div className="applications-table-wrapper">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Zone</th>
                    <th>Parcel</th>
                    <th>Applicant</th>
                    <th>Priority</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="empty-table-message">
                        Loading applications...
                      </td>
                    </tr>
                  ) : filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="empty-table-message">
                        No applications match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((application) => (
                      <tr key={application._id || application.application_id}>
                        <td>
                          <strong>{application.application_id || "-"}</strong>
                        </td>

                        <td>{formatStatus(application.application_type)}</td>

                        <td>
                          <span
                            className={`status-pill status-${getApplicationStatus(
                              application
                            )}`}
                          >
                            {formatStatus(getApplicationStatus(application))}
                          </span>
                        </td>

                        <td>{getZoneId(application) || "-"}</td>

                        <td>{getParcelNumber(application) || "-"}</td>

                        <td>{getApplicantId(application) || "-"}</td>

                        <td>{formatStatus(application.priority || "normal")}</td>

                        <td>{formatDate(getSubmittedDate(application))}</td>

                        <td>
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => openApplicationDetails(application)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {selectedApplication && (
              <div className="application-preview-card">
                <div className="section-header-row">
                  <div>
                    <h3>{selectedApplication.application_id}</h3>
                    <p>
                      Quick application details. Full details screen will be
                      expanded next.
                    </p>
                  </div>

                  <span
                    className={`status-pill status-${getApplicationStatus(
                      selectedApplication
                    )}`}
                  >
                    {formatStatus(getApplicationStatus(selectedApplication))}
                  </span>
                </div>

                <div className="preview-grid">
                  <div>
                    <span>Application Type</span>
                    <strong>
                      {formatStatus(selectedApplication.application_type)}
                    </strong>
                  </div>

                  <div>
                    <span>Applicant ID</span>
                    <strong>{getApplicantId(selectedApplication) || "-"}</strong>
                  </div>

                  <div>
                    <span>Zone</span>
                    <strong>{getZoneId(selectedApplication) || "-"}</strong>
                  </div>

                  <div>
                    <span>Parcel Number</span>
                    <strong>
                      {getParcelNumber(selectedApplication) || "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Block Number</span>
                    <strong>
                      {selectedApplication.parcel_ref?.block_number || "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Basin Number</span>
                    <strong>
                      {selectedApplication.parcel_ref?.basin_number || "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Priority</span>
                    <strong>
                      {formatStatus(selectedApplication.priority || "normal")}
                    </strong>
                  </div>

                  <div>
                    <span>Submitted Date</span>
                    <strong>
                      {formatDate(getSubmittedDate(selectedApplication))}
                    </strong>
                  </div>
                </div>
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
            <p>View approved applications and generate certificate metadata.</p>

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
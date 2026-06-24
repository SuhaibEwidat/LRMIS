// ==============================
// RegistrarDashboard.jsx
// ==============================

import { useEffect, useState } from "react";
import {
  getAllApplications,
  getApplicationDetails,
  getApplicantProfile,
  getApplicationDocuments,
  addInternalNote,
  transitionApplication,
  rejectApplication,
  verifyAttachment,
  issueCertificate,
} from "../../api/registrarStaffApi";
import "./RegistrarDashboard.css";

const API_URL = "http://127.0.0.1:8000";

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

function getStaffId(user) {
  return (
    user.staff_id ||
    user.profile_id ||
    user.staff_member_id ||
    user._id ||
    user.id ||
    ""
  );
}

function getAllowedNextStates(currentState) {
  const transitions = {
    submitted: ["pre_checked", "missing_documents", "on_hold", "rejected"],
    pending: ["pre_checked", "missing_documents", "on_hold", "rejected"],
    pre_checked: [
      "survey_required",
      "missing_documents",
      "on_hold",
      "rejected",
    ],
    survey_required: ["surveyed", "on_hold", "rejected"],
    surveyed: ["legal_review", "on_hold", "rejected"],
    legal_review: ["approved", "missing_documents", "on_hold", "rejected"],
    approved: ["certificate_issued"],
    certificate_issued: ["closed"],
    missing_documents: ["pre_checked", "on_hold", "rejected"],
    under_objection: ["pre_checked", "on_hold", "rejected"],
    on_hold: ["pre_checked", "rejected"],
    rejected: [],
    closed: [],
  };

  return transitions[currentState] || [];
}

function formatStatus(status) {
  if (!status) return "-";

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatusLabel(status) {
  return STATUS_LABELS[status] || formatStatus(status);
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

function getDateOnly(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getApplicationStatus(application) {
  return application?.workflow?.current_state || application?.status || "submitted";
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
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.applications)) return responseData.applications;
  return [];
}

function extractDocuments(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.documents)) return responseData.documents;
  return [];
}

function formatDocumentType(type) {
  if (!type) return "-";

  return String(type)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDocumentStatus(document) {
  return document?.verification_status || document?.status || "pending_review";
}

function getApplicationGeometry(application) {
  return (
    application?.parcel_geometry ||
    application?.geometry ||
    application?.parcel_ref?.parcel_geometry ||
    null
  );
}

function hasValidGeometry(application) {
  const geometry = getApplicationGeometry(application);

  return (
    geometry &&
    typeof geometry === "object" &&
    geometry.type &&
    Array.isArray(geometry.coordinates)
  );
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

    withObjections: applicationsList.filter(
      (application) => getApplicationStatus(application) === "under_objection"
    ).length,

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
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);

  const [selectedReviewApplication, setSelectedReviewApplication] =
    useState(null);
  const [reviewDocuments, setReviewDocuments] = useState([]);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  const [certificateMessage, setCertificateMessage] = useState("");
  const [certificateLoadingId, setCertificateLoadingId] = useState("");

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

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState("");

  const [noteForm, setNoteForm] = useState({
    note: "",
    visibility: "staff_only",
  });

  const [noteMessage, setNoteMessage] = useState("");
  const [selectedNextState, setSelectedNextState] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [missingDocsNote, setMissingDocsNote] = useState(
    "Please upload the missing required documents."
  );
  const [rejectReason, setRejectReason] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");

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

  useEffect(() => {
    const storedUser = getUserFromStorage();
    setUser(storedUser);
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

  function clearActionMessages() {
    setDetailsMessage("");
    setNoteMessage("");
    setStatusMessage("");
    setDecisionMessage("");
    setCertificateMessage("");
  }

  function resetActionForms() {
    setRejectReason("");
    setSelectedNextState("");
    setNoteForm({
      note: "",
      visibility: "staff_only",
    });
    setMissingDocsNote("Please upload the missing required documents.");
  }

  function handleBackToApplications() {
    setActiveSection("applications");
    setSelectedApplication(null);
    setSelectedApplicant(null);
    setSelectedDocuments([]);
    clearActionMessages();
    resetActionForms();
  }

  function autoClearDecisionMessage() {
    setTimeout(() => {
      setDecisionMessage("");
    }, 3000);
  }

  function autoClearNoteMessage() {
    setTimeout(() => {
      setNoteMessage("");
    }, 3000);
  }

  function autoClearStatusMessage() {
    setTimeout(() => {
      setStatusMessage("");
    }, 3000);
  }

  function autoClearVerificationMessage() {
    setTimeout(() => {
      setVerificationMessage("");
    }, 3000);
  }

  function autoClearCertificateMessage() {
    setTimeout(() => {
      setCertificateMessage("");
    }, 3000);
  }

  async function openApplicationDetails(application, options = {}) {
    const applicationId = application?.application_id;

    if (!applicationId) {
      setDetailsMessage("Application ID not found.");
      setActiveSection("applicationDetails");
      return;
    }

    const shouldPreserveMessages =
      options.preserveNoteMessage ||
      options.preserveStatusMessage ||
      options.preserveDecisionMessage;

    if (!shouldPreserveMessages) {
      clearActionMessages();
      resetActionForms();
    }

    try {
      setActiveSection("applicationDetails");
      setDetailsLoading(true);

      if (!options.preserveNoteMessage) {
        setNoteMessage("");
      }

      if (!options.preserveStatusMessage) {
        setStatusMessage("");
      }

      if (!options.preserveDecisionMessage) {
        setDecisionMessage("");
      }

      setSelectedNextState("");
      setSelectedApplication(null);
      setSelectedApplicant(null);
      setSelectedDocuments([]);

      const applicationResponse = await getApplicationDetails(applicationId);

      const fullApplication =
        applicationResponse.data?.data ||
        applicationResponse.data?.application ||
        applicationResponse.data;

      const applicantId =
        fullApplication?.applicant_ref?.applicant_id ||
        application?.applicant_ref?.applicant_id;

      const [applicantResponse, documentsResponse] = await Promise.all([
        applicantId ? getApplicantProfile(applicantId) : Promise.resolve({ data: null }),
        getApplicationDocuments(applicationId),
      ]);

      const applicant =
        applicantResponse.data?.data ||
        applicantResponse.data?.applicant ||
        applicantResponse.data;

      setSelectedApplication(fullApplication);
      setSelectedApplicant(applicant);
      setSelectedDocuments(extractDocuments(documentsResponse.data));
    } catch (error) {
      console.log("Open application details error:", error.response?.data || error);

      setDetailsMessage(
        error.response?.data?.detail || "Failed to load application details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openRegistrarReview(application, options = {}) {
    const applicationId = application?.application_id;

    if (!applicationId) {
      setReviewMessage("Application ID not found.");
      return;
    }

    try {
      setReviewLoading(true);
      setReviewMessage("");

      if (!options.preserveVerificationMessage) {
        setVerificationMessage("");
      }

      setSelectedReviewApplication(null);
      setReviewDocuments([]);

      const applicationResponse = await getApplicationDetails(applicationId);

      const fullApplication =
        applicationResponse.data?.data ||
        applicationResponse.data?.application ||
        applicationResponse.data;

      const documentsResponse = await getApplicationDocuments(applicationId);

      const documentsList =
        documentsResponse.data?.data ||
        documentsResponse.data?.documents ||
        documentsResponse.data ||
        [];

      setSelectedReviewApplication(fullApplication);
      setReviewDocuments(Array.isArray(documentsList) ? documentsList : []);
    } catch (error) {
      console.log("Open registrar review error:", error.response?.data || error);

      setReviewMessage(
        error.response?.data?.detail || "Failed to load registrar review details."
      );
    } finally {
      setReviewLoading(false);
    }
  }

  const staffName = user.name || user.full_name || user.email || "Registrar Officer";

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
    const submittedDateOnly = getDateOnly(getSubmittedDate(application));

    const searchText = filters.search.toLowerCase().trim();
    const applicationIdText = String(application.application_id || "").toLowerCase();
    const applicantText = String(applicantId || "").toLowerCase();
    const parcelText = String(parcelNumber || "").toLowerCase();
    const zoneText = String(zone || "").toLowerCase();

    const matchesSearch =
      !searchText ||
      applicationIdText.includes(searchText) ||
      applicantText.includes(searchText) ||
      parcelText.includes(searchText) ||
      zoneText.includes(searchText);

    const matchesStatus = filters.status === "all" || status === filters.status;
    const matchesType = filters.type === "all" || type === filters.type;

    const matchesZone =
      !filters.zone || zoneText.includes(filters.zone.toLowerCase().trim());

    const matchesApplicant =
      !filters.applicant ||
      applicantText.includes(filters.applicant.toLowerCase().trim());

    const matchesParcel =
      !filters.parcel ||
      parcelText.includes(filters.parcel.toLowerCase().trim());

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

  const legalReviewApplications = applications.filter(
    (application) => getApplicationStatus(application) === "legal_review"
  );

  const certificateApplications = applications.filter((application) =>
    ["approved", "certificate_issued"].includes(getApplicationStatus(application))
  );

  const selectedGeometry = getApplicationGeometry(selectedApplication);

  function handleNoteChange(e) {
    const { name, value } = e.target;

    setNoteForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  async function handleAddInternalNote(e) {
    e.preventDefault();

    if (!selectedApplication?.application_id) {
      setNoteMessage("No application selected.");
      return;
    }

    if (!noteForm.note.trim()) {
      setNoteMessage("Note text is required.");
      return;
    }

    const authorId = getStaffId(user);

    if (!authorId) {
      setNoteMessage("Staff ID not found. Please login again.");
      return;
    }

    const payload = {
      note: noteForm.note.trim(),
      author_id: authorId,
      author_role: user.role || "registrar",
      visibility: noteForm.visibility,
    };

    try {
      setDetailsLoading(true);
      setNoteMessage("");

      await addInternalNote(selectedApplication.application_id, payload);

      setNoteMessage("Internal note added successfully.");
      setNoteForm({
        note: "",
        visibility: "staff_only",
      });

      autoClearNoteMessage();

      await openApplicationDetails(selectedApplication, {
        preserveNoteMessage: true,
      });
    } catch (error) {
      console.log("Add internal note error:", error.response?.data || error);

      setNoteMessage(error.response?.data?.detail || "Failed to add internal note.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function refreshSelectedApplication() {
    if (!selectedApplication?.application_id) {
      return;
    }

    await loadDashboardData();

    await openApplicationDetails(
      {
        application_id: selectedApplication.application_id,
        applicant_ref: selectedApplication.applicant_ref,
      },
      {
        preserveDecisionMessage: true,
      }
    );
  }

  async function handleRequestMissingDocuments() {
    if (!selectedApplication?.application_id) {
      setDecisionMessage("No application selected.");
      return;
    }

    if (!missingDocsNote.trim()) {
      setDecisionMessage("Missing documents note is required.");
      return;
    }

    const authorId = getStaffId(user);

    if (!authorId) {
      setDecisionMessage("Staff ID not found. Please login again.");
      return;
    }

    try {
      setDetailsLoading(true);
      setDecisionMessage("");

      await transitionApplication(
        selectedApplication.application_id,
        "missing_documents"
      );

      await addInternalNote(selectedApplication.application_id, {
        note: missingDocsNote.trim(),
        author_id: authorId,
        author_role: user.role || "registrar",
        visibility: "applicant",
      });

      setDecisionMessage("Missing documents request sent to applicant successfully.");
      setMissingDocsNote("Please upload the missing required documents.");

      autoClearDecisionMessage();

      await refreshSelectedApplication();
    } catch (error) {
      console.log("Request missing documents error:", error.response?.data || error);

      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        setDecisionMessage(detail.join(" | "));
      } else {
        setDecisionMessage(detail || "Failed to request missing documents.");
      }
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleRejectApplication() {
    if (!selectedApplication?.application_id) {
      setDecisionMessage("No application selected.");
      return;
    }

    if (!rejectReason.trim()) {
      setDecisionMessage("Rejection reason is required.");
      return;
    }

    const authorId = getStaffId(user);

    if (!authorId) {
      setDecisionMessage("Staff ID not found. Please login again.");
      return;
    }

    try {
      setDetailsLoading(true);
      setDecisionMessage("");

      await rejectApplication(selectedApplication.application_id, rejectReason.trim());

      await addInternalNote(selectedApplication.application_id, {
        note: `Application rejected. Reason: ${rejectReason.trim()}`,
        author_id: authorId,
        author_role: user.role || "registrar",
        visibility: "applicant",
      });

      setDecisionMessage("Application rejected and applicant was notified.");
      setRejectReason("");

      autoClearDecisionMessage();

      await refreshSelectedApplication();
    } catch (error) {
      console.log("Reject application error:", error.response?.data || error);

      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        setDecisionMessage(detail.join(" | "));
      } else {
        setDecisionMessage(detail || "Failed to reject application.");
      }
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleApproveApplication() {
    if (!selectedApplication?.application_id) {
      setDecisionMessage("No application selected.");
      return;
    }

    try {
      setDetailsLoading(true);
      setDecisionMessage("");

      await transitionApplication(selectedApplication.application_id, "approved");

      setDecisionMessage("Application approved successfully.");

      autoClearDecisionMessage();

      await refreshSelectedApplication();
    } catch (error) {
      console.log("Approve application error:", error.response?.data || error);

      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        setDecisionMessage(detail.join(" | "));
      } else {
        setDecisionMessage(detail || "Failed to approve application.");
      }
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleChangeApplicationStatus(e) {
    e.preventDefault();

    if (!selectedApplication?.application_id) {
      setStatusMessage("No application selected.");
      return;
    }

    if (!selectedNextState) {
      setStatusMessage("Please select the next status.");
      return;
    }

    try {
      setDetailsLoading(true);
      setStatusMessage("");

      await transitionApplication(selectedApplication.application_id, selectedNextState);

      setStatusMessage("Application status updated successfully.");
      setSelectedNextState("");

      autoClearStatusMessage();

      await loadDashboardData();

      await openApplicationDetails(
        {
          application_id: selectedApplication.application_id,
          applicant_ref: selectedApplication.applicant_ref,
        },
        {
          preserveStatusMessage: true,
        }
      );
    } catch (error) {
      console.log("Change status error:", error.response?.data || error);

      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        setStatusMessage(detail.join(" | "));
      } else {
        setStatusMessage(detail || "Failed to update application status.");
      }
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleVerifyDocument(documentType, verificationStatus) {
    if (!selectedReviewApplication?.application_id) {
      setVerificationMessage("No application selected for review.");
      return;
    }

    if (!documentType) {
      setVerificationMessage("Document type not found.");
      return;
    }

    const staffId = getStaffId(user);

    if (!staffId) {
      setVerificationMessage("Staff ID not found. Please login again.");
      return;
    }

    try {
      setReviewLoading(true);
      setVerificationMessage("");

      await verifyAttachment(
        selectedReviewApplication.application_id,
        documentType,
        {
          verification_status: verificationStatus,
          verified_by: staffId,
        }
      );

      setVerificationMessage(
        verificationStatus === "verified"
          ? "Document accepted successfully."
          : "Document rejected successfully."
      );

      autoClearVerificationMessage();

      await openRegistrarReview(
        {
          application_id: selectedReviewApplication.application_id,
        },
        {
          preserveVerificationMessage: true,
        }
      );

      await loadDashboardData();
    } catch (error) {
      console.log("Verify document error:", error.response?.data || error);

      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        setVerificationMessage(detail.join(" | "));
      } else {
        setVerificationMessage(
          detail || "Failed to update document verification status."
        );
      }
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleIssueCertificate(application) {
    const applicationId = application?.application_id;
    const registrarId = getStaffId(user);

    if (!applicationId) {
      setCertificateMessage("Application ID not found.");
      return;
    }

    if (!registrarId) {
      setCertificateMessage("Registrar ID not found. Please login again.");
      return;
    }

    if (getApplicationStatus(application) !== "approved") {
      setCertificateMessage(
        "Certificate can be issued only for approved applications."
      );
      return;
    }

    try {
      setCertificateLoadingId(applicationId);
      setCertificateMessage("");

      await issueCertificate(applicationId, registrarId);

      setCertificateMessage("Certificate issued successfully.");
      autoClearCertificateMessage();

      await loadDashboardData();
    } catch (error) {
      console.log("Issue certificate error:", error.response?.data || error);

      const detail = error.response?.data?.detail;
      const message = error.response?.data?.message;
      const errorText = error.response?.data?.error;
      const errorPayload = error.response?.data;

      if (Array.isArray(detail)) {
        setCertificateMessage(detail.join(" | "));
      } else {
        setCertificateMessage(
          detail || message || errorText || (typeof errorPayload === "string" ? errorPayload : "Failed to issue certificate.")
        );
      }
    } finally {
      setCertificateLoadingId("");
    }
  }

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
            className={
              activeSection === "applications" ||
              activeSection === "applicationDetails"
                ? "active"
                : ""
            }
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
                <span>Under Objection</span>
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
                placeholder="Search by application ID, applicant, parcel, or zone"
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
                name="applicant"
                placeholder="Filter by applicant ID"
                value={filters.applicant}
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
          </section>
        )}

        {activeSection === "applicationDetails" && (
          <section className="details-page-panel">
            <div className="details-page-header">
              <button
                type="button"
                className="back-btn"
                onClick={handleBackToApplications}
              >
                ← Back to Applications
              </button>

              <div>
                <p className="label">Application Review</p>
                <h2>Application Details</h2>
                <span>
                  Review application information, applicant profile, parcel
                  details, required documents, uploaded files, and map
                  availability.
                </span>
              </div>
            </div>

            {detailsLoading && (
              <div className="application-details-card">
                Loading application details...
              </div>
            )}

            {detailsMessage && (
              <div className="application-details-card error-message">
                {detailsMessage}
              </div>
            )}

            {!detailsLoading && !selectedApplication && !detailsMessage && (
              <div className="application-details-card">
                No application selected.
              </div>
            )}

            {selectedApplication && !detailsLoading && (
              <div className="application-details-card">
                <div className="section-header-row">
                  <div>
                    <h3>{selectedApplication.application_id}</h3>
                    <p>
                      Full review view for this land registration application.
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

                <div className="details-section">
                  <h4>Application Summary</h4>

                  <div className="details-grid">
                    <div>
                      <span>Application ID</span>
                      <strong>{selectedApplication.application_id || "-"}</strong>
                    </div>

                    <div>
                      <span>Type</span>
                      <strong>{formatStatus(selectedApplication.application_type)}</strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {formatStatus(getApplicationStatus(selectedApplication))}
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
                      <strong>{formatDate(getSubmittedDate(selectedApplication))}</strong>
                    </div>

                    <div>
                      <span>Description</span>
                      <strong>{selectedApplication.description || "-"}</strong>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Applicant Details</h4>

                  {!selectedApplicant ? (
                    <p className="details-empty">
                      Applicant profile was not found.
                    </p>
                  ) : (
                    <div className="details-grid">
                      <div>
                        <span>Full Name</span>
                        <strong>
                          {selectedApplicant.full_name ||
                            selectedApplicant.name ||
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Applicant Type</span>
                        <strong>
                          {formatStatus(selectedApplicant.applicant_type)}
                        </strong>
                      </div>

                      <div>
                        <span>Verification State</span>
                        <strong>
                          {formatStatus(selectedApplicant.verification_state)}
                        </strong>
                      </div>

                      <div>
                        <span>National ID</span>
                        <strong>
                          {selectedApplicant.identity?.national_id || "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Registration Number</span>
                        <strong>
                          {selectedApplicant.identity?.registration_number || "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Email</span>
                        <strong>{selectedApplicant.contacts?.email || "-"}</strong>
                      </div>

                      <div>
                        <span>Phone</span>
                        <strong>{selectedApplicant.contacts?.phone || "-"}</strong>
                      </div>

                      <div>
                        <span>Address</span>
                        <strong>
                          {[
                            selectedApplicant.address?.city,
                            selectedApplicant.address?.neighborhood,
                            selectedApplicant.address?.street,
                          ]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="details-section">
                  <h4>Parcel Details</h4>

                  <div className="details-grid">
                    <div>
                      <span>Parcel ID</span>
                      <strong>
                        {selectedApplication.parcel_ref?.parcel_id || "-"}
                      </strong>
                    </div>

                    <div>
                      <span>Parcel Number</span>
                      <strong>
                        {selectedApplication.parcel_ref?.parcel_number || "-"}
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
                      <span>Zone ID</span>
                      <strong>{selectedApplication.parcel_ref?.zone_id || "-"}</strong>
                    </div>

                    <div>
                      <span>Owner Refs</span>
                      <strong>
                        {selectedApplication.parcel_ref?.owner_refs?.length > 0
                          ? selectedApplication.parcel_ref.owner_refs.join(", ")
                          : "-"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Required Documents</h4>

                  {selectedApplication.required_documents?.length > 0 ? (
                    <div className="staff-documents-list">
                      {selectedApplication.required_documents.map(
                        (document, index) => (
                          <div
                            className="staff-document-row"
                            key={`${document.document_type}-${index}`}
                          >
                            <div>
                              <strong>
                                {formatDocumentType(document.document_type)}
                              </strong>
                              <span>Required document</span>
                            </div>

                            <span className={`status-pill status-${document.status}`}>
                              {formatStatus(document.status)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="details-empty">
                      No required document list defined for this application.
                    </p>
                  )}
                </div>

                <div className="details-section">
                  <h4>Uploaded Documents</h4>

                  {selectedDocuments.length === 0 ? (
                    <p className="details-empty">No uploaded documents found.</p>
                  ) : (
                    <div className="staff-documents-list">
                      {selectedDocuments.map((document, index) => (
                        <div
                          className="staff-document-row"
                          key={
                            document.document_id ||
                            document.file_url ||
                            `${document.document_type}-${index}`
                          }
                        >
                          <div>
                            <strong>
                              {formatDocumentType(document.document_type)}
                            </strong>
                            <span>{document.file_name || "-"}</span>
                          </div>

                          <span
                            className={`status-pill status-${getDocumentStatus(
                              document
                            )}`}
                          >
                            {formatStatus(getDocumentStatus(document))}
                          </span>

                          {document.file_url && (
                            <a
                              href={`${API_URL}${document.file_url}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View File
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="details-section">
                  <h4>Map</h4>

                  <div className="map-preview-card">
                    {hasValidGeometry(selectedApplication) ? (
                      <>
                        <strong>Parcel geometry available</strong>
                        <span>Geometry type: {selectedGeometry?.type}</span>
                        <small>
                          Map visualization will be connected later using GeoJSON /
                          Leaflet.
                        </small>
                      </>
                    ) : (
                      <>
                        <strong>No parcel geometry available</strong>
                        <span>
                          This application does not have valid GeoJSON yet.
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="details-section">
                  <h4>Change Status</h4>

                  <form className="workflow-form" onSubmit={handleChangeApplicationStatus}>
                    <div className="workflow-grid">
                      <div>
                        <label>Current Status</label>
                        <div className="readonly-status-box">
                          {formatStatus(getApplicationStatus(selectedApplication))}
                        </div>
                      </div>

                      <div>
                        <label>Next Status</label>
                        <select
                          value={selectedNextState}
                          onChange={(e) => setSelectedNextState(e.target.value)}
                        >
                          <option value="">Select next status</option>

                          {getAllowedNextStates(
                            getApplicationStatus(selectedApplication)
                          ).map((state) => (
                            <option key={state} value={state}>
                              {formatStatus(state)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="table-action-btn">
                      Change Status
                    </button>

                    {statusMessage && (
                      <div className="note-message">{statusMessage}</div>
                    )}
                  </form>
                </div>

                <div className="details-section">
                  <h4>Application Decisions</h4>

                  <div className="decision-actions-grid">
                    <div className="decision-action-card">
                      <h5>Request Missing Documents</h5>

                      <textarea
                        value={missingDocsNote}
                        onChange={(e) => setMissingDocsNote(e.target.value)}
                        placeholder="Write a message for the applicant..."
                      />

                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={handleRequestMissingDocuments}
                        disabled={
                          !getAllowedNextStates(
                            getApplicationStatus(selectedApplication)
                          ).includes("missing_documents")
                        }
                      >
                        Request Missing Documents
                      </button>
                    </div>

                    <div className="decision-action-card danger">
                      <h5>Reject Application</h5>

                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Write rejection reason..."
                      />

                      <button
                        type="button"
                        className="danger-action-btn"
                        onClick={handleRejectApplication}
                        disabled={
                          getApplicationStatus(selectedApplication) === "rejected" ||
                          getApplicationStatus(selectedApplication) === "closed"
                        }
                      >
                        Reject Application
                      </button>
                    </div>

                    <div className="decision-action-card success">
                      <h5>Approve Application</h5>

                      <button
                        type="button"
                        className="success-action-btn"
                        onClick={handleApproveApplication}
                        disabled={
                          getApplicationStatus(selectedApplication) !== "legal_review"
                        }
                      >
                        Approve Application
                      </button>

                      {getApplicationStatus(selectedApplication) !==
                        "legal_review" && (
                        <small>
                          Approval is available only when the application status is
                          Legal Review.
                        </small>
                      )}
                    </div>
                  </div>

                  {decisionMessage && (
                    <div className="note-message">{decisionMessage}</div>
                  )}
                </div>

                <div className="details-section">
                  <h4>Add Internal Note</h4>

                  <form className="internal-note-form" onSubmit={handleAddInternalNote}>
                    <div className="note-form-grid">
                      <div>
                        <label>Visibility</label>

                        <select
                          name="visibility"
                          value={noteForm.visibility}
                          onChange={handleNoteChange}
                        >
                          <option value="staff_only">Staff Only</option>
                          <option value="applicant">Visible to Applicant</option>
                        </select>
                      </div>

                      <div className="note-textarea-wrapper">
                        <label>Note</label>

                        <textarea
                          name="note"
                          placeholder="Write an internal note about this application..."
                          value={noteForm.note}
                          onChange={handleNoteChange}
                        />
                      </div>
                    </div>

                    <button type="submit" className="table-action-btn">
                      Add Note
                    </button>

                    {noteMessage && (
                      <div className="note-message">{noteMessage}</div>
                    )}
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "review" && (
          <section className="registrar-panel">
            <div className="section-header-row">
              <div>
                <h2>Registrar Review</h2>
                <p>
                  Review legal documents for applications that reached the legal
                  review stage.
                </p>
              </div>

              <strong className="results-count">
                {legalReviewApplications.length} legal review
              </strong>
            </div>

            <div className="applications-table-wrapper">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Type</th>
                    <th>Applicant</th>
                    <th>Parcel</th>
                    <th>Zone</th>
                    <th>Priority</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {legalReviewApplications.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-table-message">
                        No applications are currently in legal review.
                      </td>
                    </tr>
                  ) : (
                    legalReviewApplications.map((application) => (
                      <tr key={application.application_id}>
                        <td>
                          <strong>{application.application_id}</strong>
                        </td>

                        <td>{formatStatus(application.application_type)}</td>
                        <td>{getApplicantId(application) || "-"}</td>
                        <td>{getParcelNumber(application) || "-"}</td>
                        <td>{getZoneId(application) || "-"}</td>
                        <td>{formatStatus(application.priority || "normal")}</td>
                        <td>{formatDate(getSubmittedDate(application))}</td>

                        <td>
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => openRegistrarReview(application)}
                          >
                            Open Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {reviewLoading && (
              <div className="application-details-card">
                Loading registrar review details...
              </div>
            )}

            {reviewMessage && (
              <div className="application-details-card error-message">
                {reviewMessage}
              </div>
            )}

            {selectedReviewApplication && !reviewLoading && (
              <div className="application-details-card">
                <div className="section-header-row">
                  <div>
                    <h3>Legal Document Review</h3>
                    <p>
                      Review uploaded legal documents for{" "}
                      <strong>{selectedReviewApplication.application_id}</strong>.
                    </p>
                  </div>

                  <span className="status-pill status-legal_review">
                    Legal Review
                  </span>
                </div>

                <div className="details-section">
                  <h4>Application Summary</h4>

                  <div className="details-grid">
                    <div>
                      <span>Application ID</span>
                      <strong>
                        {selectedReviewApplication.application_id || "-"}
                      </strong>
                    </div>

                    <div>
                      <span>Type</span>
                      <strong>
                        {formatStatus(selectedReviewApplication.application_type)}
                      </strong>
                    </div>

                    <div>
                      <span>Applicant ID</span>
                      <strong>
                        {selectedReviewApplication.applicant_ref?.applicant_id ||
                          "-"}
                      </strong>
                    </div>

                    <div>
                      <span>Parcel Number</span>
                      <strong>
                        {selectedReviewApplication.parcel_ref?.parcel_number ||
                          "-"}
                      </strong>
                    </div>

                    <div>
                      <span>Zone</span>
                      <strong>
                        {selectedReviewApplication.parcel_ref?.zone_id || "-"}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {formatStatus(
                          getApplicationStatus(selectedReviewApplication)
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Required Legal Documents</h4>

                  {selectedReviewApplication.required_documents?.length > 0 ? (
                    <div className="staff-documents-list">
                      {selectedReviewApplication.required_documents.map(
                        (document, index) => (
                          <div
                            className="staff-document-row"
                            key={`${document.document_type}-${index}`}
                          >
                            <div>
                              <strong>
                                {formatDocumentType(document.document_type)}
                              </strong>
                              <span>Required legal document</span>
                            </div>

                            <span className={`status-pill status-${document.status}`}>
                              {formatStatus(document.status)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="details-empty">
                      No required document list defined for this application.
                    </p>
                  )}
                </div>

                <div className="details-section">
                  <h4>Uploaded Legal Documents</h4>

                  {reviewDocuments.length === 0 ? (
                    <p className="details-empty">
                      No uploaded documents found for this application.
                    </p>
                  ) : (
                    <>
                      <div className="review-documents-table-wrapper">
                        <table className="applications-table review-documents-table">
                          <thead>
                            <tr>
                              <th>Document Type</th>
                              <th>File Name</th>
                              <th>Status</th>
                              <th>Review Note</th>
                              <th>File</th>
                              <th>Action</th>
                            </tr>
                          </thead>

                          <tbody>
                            {reviewDocuments.map((document, index) => {
                              const documentStatus = getDocumentStatus(document);

                              return (
                                <tr
                                  key={
                                    document.document_id ||
                                    document.file_url ||
                                    `${document.document_type}-${index}`
                                  }
                                >
                                  <td>
                                    <strong>
                                      {formatDocumentType(document.document_type)}
                                    </strong>
                                  </td>

                                  <td>{document.file_name || "-"}</td>

                                  <td>
                                    <span
                                      className={`status-pill status-${documentStatus}`}
                                    >
                                      {formatStatus(documentStatus)}
                                    </span>
                                  </td>

                                  <td>{document.review_note || "-"}</td>

                                  <td>
                                    {document.file_url ? (
                                      <a
                                        href={`${API_URL}${document.file_url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        View File
                                      </a>
                                    ) : (
                                      "-"
                                    )}
                                  </td>

                                  <td>
                                    <div className="document-review-actions">
                                      <button
                                        type="button"
                                        className="success-mini-btn"
                                        onClick={() =>
                                          handleVerifyDocument(
                                            document.document_type,
                                            "verified"
                                          )
                                        }
                                        disabled={documentStatus === "verified"}
                                      >
                                        Accept
                                      </button>

                                      <button
                                        type="button"
                                        className="danger-mini-btn"
                                        onClick={() =>
                                          handleVerifyDocument(
                                            document.document_type,
                                            "rejected"
                                          )
                                        }
                                        disabled={documentStatus === "rejected"}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {verificationMessage && (
                        <div className="note-message">{verificationMessage}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "certificates" && (
          <section className="registrar-panel">
            <div className="section-header-row">
              <div>
                <h2>Certificate Issuance</h2>
                <p>
                  View approved applications, issue certificates, and track
                  already issued certificates.
                </p>
              </div>

              <strong className="results-count">
                {certificateApplications.length} certificate records
              </strong>
            </div>

            {certificateMessage && (
              <div className="note-message">{certificateMessage}</div>
            )}

            <div className="applications-table-wrapper">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Type</th>
                    <th>Applicant</th>
                    <th>Parcel</th>
                    <th>Zone</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="empty-table-message">
                        Loading certificate applications...
                      </td>
                    </tr>
                  ) : certificateApplications.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-table-message">
                        No approved or certificate-issued applications found.
                      </td>
                    </tr>
                  ) : (
                    certificateApplications.map((application) => {
                      const status = getApplicationStatus(application);
                      const applicationId = application.application_id;
                      const isIssuing = certificateLoadingId === applicationId;

                      return (
                        <tr key={application._id || applicationId}>
                          <td>
                            <strong>{applicationId || "-"}</strong>
                          </td>

                          <td>{formatStatus(application.application_type)}</td>
                          <td>{getApplicantId(application) || "-"}</td>
                          <td>{getParcelNumber(application) || "-"}</td>
                          <td>{getZoneId(application) || "-"}</td>

                          <td>
                            <span className={`status-pill status-${status}`}>
                              {formatStatus(status)}
                            </span>
                          </td>

                          <td>{formatDate(getSubmittedDate(application))}</td>

                          <td>
                            {status === "approved" ? (
                              <button
                                type="button"
                                className="success-mini-btn"
                                onClick={() => handleIssueCertificate(application)}
                                disabled={Boolean(certificateLoadingId)}
                              >
                                {isIssuing ? "Issuing..." : "Issue Certificate"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="table-action-btn"
                                onClick={() => openApplicationDetails(application)}
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default RegistrarDashboard;
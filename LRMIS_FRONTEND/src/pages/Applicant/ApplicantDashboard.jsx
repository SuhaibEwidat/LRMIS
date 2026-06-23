import { useEffect, useState } from "react";
import "./ApplicantDashboard.css";

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function ApplicantDashboard() {
  const [user, setUser] = useState({});

  useEffect(() => {
    const storedUser = getUserFromStorage();
    setUser(storedUser);
  }, []);

  function logout() {
    localStorage.removeItem("lrmis_user");
    localStorage.removeItem("lrmis_token");
    window.location.href = "/login";
  }

  const applicantName =
    user.full_name || user.name || user.email || "Applicant";

  return (
    <div className="applicant-page">
      <aside className="applicant-sidebar">
        <h2>LRMIS</h2>
        <p>Applicant Portal</p>

        <a href="#overview">Overview</a>
        <a href="#submit">Submit Application</a>
        <a href="#track">Track Application</a>
        <a href="#documents">Upload Documents</a>
        <a href="#objection">Submit Objection</a>
        <a href="#applications">My Applications</a>

        <button type="button" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="applicant-main">
        <section id="overview" className="applicant-header">
          <div>
            <p className="label">Applicant Workspace</p>
            <h1>Welcome, {applicantName}</h1>
            <span>
              Submit land registration applications, track status, upload
              required documents, and manage objections.
            </span>
          </div>
        </section>

        <section className="applicant-stats-grid">
          <div className="applicant-stat-card">
            <span>Total Applications</span>
            <strong>0</strong>
          </div>

          <div className="applicant-stat-card">
            <span>Pending</span>
            <strong>0</strong>
          </div>

          <div className="applicant-stat-card">
            <span>Approved</span>
            <strong>0</strong>
          </div>
        </section>

        <section id="submit" className="applicant-panel">
          <h2>Submit Land Application</h2>
          <p>
            This section will allow the applicant to select application type,
            enter parcel details, choose location, upload documents, and submit
            the application.
          </p>

          <div className="placeholder-box">
            Submit application form will be built here.
          </div>
        </section>

        <section id="track" className="applicant-panel">
          <h2>Track Application</h2>
          <p>
            Search by application ID and view status timeline, missing
            documents, registrar notes, and survey status.
          </p>

          <div className="track-box">
            <input
              type="text"
              placeholder="Enter application ID, e.g. LRMIS-2026-0001"
            />
            <button type="button">Search</button>
          </div>
        </section>

        <section id="documents" className="applicant-panel">
          <h2>Upload Additional Documents</h2>
          <p>
            Applicants can upload missing or supporting documents for an
            existing application.
          </p>

          <div className="placeholder-box">
            Document upload form will be connected later.
          </div>
        </section>

        <section id="objection" className="applicant-panel">
          <h2>Submit Objection</h2>
          <p>
            Applicants or related parties can submit an objection with reason
            and supporting documents.
          </p>

          <div className="placeholder-box">
            Objection form will be built here.
          </div>
        </section>

        <section id="applications" className="applicant-panel">
          <h2>My Applications</h2>
          <p>
            This section will show all applications submitted by the current
            applicant.
          </p>

          <div className="placeholder-box">
            No applications loaded yet.
          </div>
        </section>
      </main>
    </div>
  );
}

export default ApplicantDashboard;
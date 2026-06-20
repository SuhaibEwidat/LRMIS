import { useEffect, useMemo, useState } from "react";
import {
  getSurveyorTasks,
  scheduleVisit,
  updateSurveyMilestone,
  addFieldNote,
  uploadSurveyReport,
} from "../../api/model3Api";

import Header from "../components/Header/Header.jsx";
import Navigation from "../components/Navigation/Navigation.jsx";
import "./SurveyorPage.css";

const MILESTONE_ORDER = [
  "assigned",
  "visit_scheduled",
  "arrived_on_site",
  "survey_started",
  "survey_completed",
  "report_uploaded",
  "registrar_reviewed",
];

const NEXT_MILESTONE = {
  visit_scheduled: "arrived_on_site",
  arrived_on_site: "survey_started",
  survey_started: "survey_completed",
};

function formatStatus(status) {
  if (!status) return "-";
  return status.replaceAll("_", " ");
}

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function RefreshIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function SurveyorPage() {
  const [user, setUser] = useState({});
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const [visitDate, setVisitDate] = useState("");
  const [fieldNote, setFieldNote] = useState("");

  const [reportForm, setReportForm] = useState({
    report_title: "",
    summary: "",
    file_name: "",
    file_url: "",
  });

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState({
    text: "",
    type: "",
  });

  useEffect(() => {
    const storedUser = getUserFromStorage();
    setUser(storedUser);

    const role = storedUser.role || storedUser.staff_role;

    if (storedUser.account_type !== "staff" || role !== "surveyor") {
      setMessage({
        text: "Access denied. This page is only for surveyors.",
        type: "error",
      });
      return;
    }

    loadTasks(storedUser);
  }, []);

  async function loadTasks(currentUser = user) {
    const surveyorId =
      currentUser._id ||
      currentUser.id ||
      currentUser.staff_id ||
      currentUser.staff_code;

    if (!surveyorId) {
      setMessage({
        text: "Surveyor ID not found. Please login again.",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: "", type: "" });

      const response = await getSurveyorTasks(surveyorId);
      const loadedTasks = response.data.tasks || [];

      setTasks(loadedTasks);

      if (selectedTask) {
        const updatedSelected = loadedTasks.find(
          (task) =>
            task._id === selectedTask._id ||
            task.task_id === selectedTask.task_id
        );

        setSelectedTask(updatedSelected || null);
      }
    } catch (error) {
      setMessage({
        text:
          error.response?.data?.detail ||
          "Failed to load survey tasks.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTask(task) {
    setSelectedTask(task);
    setVisitDate(task.scheduled_visit_date || "");
    setFieldNote("");

    setReportForm({
      report_title: "",
      summary: "",
      file_name: "",
      file_url: "",
    });

    setMessage({ text: "", type: "" });
  }

  async function handleScheduleVisit() {
    if (!selectedTask) return;

    if (!visitDate) {
      setMessage({
        text: "Please select a visit date.",
        type: "error",
      });
      return;
    }

    try {
      setActionLoading(true);
      setMessage({ text: "", type: "" });

      await scheduleVisit(selectedTask.application_id, {
        scheduled_visit_date: visitDate,
        by: user.staff_code || user._id || user.staff_id,
      });

      setMessage({
        text: "Visit scheduled successfully.",
        type: "success",
      });

      await loadTasks();
    } catch (error) {
      setMessage({
        text:
          error.response?.data?.detail ||
          "Failed to schedule visit.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMoveToNextMilestone(task) {
    const next = NEXT_MILESTONE[task.status];

    if (!next) {
      setMessage({
        text: "No next milestone available for this task.",
        type: "error",
      });
      return;
    }

    try {
      setActionLoading(true);
      setMessage({ text: "", type: "" });

      await updateSurveyMilestone(task.application_id, {
        milestone_type: next,
        by: user.staff_code || user._id || user.staff_id,
        meta: {
          updated_from: "surveyor_page",
        },
      });

      setMessage({
        text: `Task moved to ${formatStatus(next)}.`,
        type: "success",
      });

      await loadTasks();
    } catch (error) {
      setMessage({
        text:
          error.response?.data?.detail ||
          "Failed to update survey milestone.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddFieldNote() {
    if (!selectedTask) return;

    if (!fieldNote.trim()) {
      setMessage({
        text: "Please write a field note.",
        type: "error",
      });
      return;
    }

    try {
      setActionLoading(true);
      setMessage({ text: "", type: "" });

      await addFieldNote(selectedTask.application_id, {
        note: fieldNote,
      });

      setMessage({
        text: "Field note added successfully.",
        type: "success",
      });

      setFieldNote("");
      await loadTasks();
    } catch (error) {
      setMessage({
        text:
          error.response?.data?.detail ||
          "Failed to add field note.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUploadReport() {
    if (!selectedTask) return;

    if (!reportForm.report_title.trim() || !reportForm.summary.trim()) {
      setMessage({
        text: "Report title and summary are required.",
        type: "error",
      });
      return;
    }

    const attachments =
      reportForm.file_name.trim() && reportForm.file_url.trim()
        ? [
            {
              file_name: reportForm.file_name.trim(),
              file_url: reportForm.file_url.trim(),
            },
          ]
        : [];

    try {
      setActionLoading(true);
      setMessage({ text: "", type: "" });

      await uploadSurveyReport(selectedTask.application_id, {
        report_title: reportForm.report_title,
        summary: reportForm.summary,
        attachments,
        created_by: user.staff_code || user._id || user.staff_id,
      });

      setMessage({
        text: "Survey report uploaded successfully.",
        type: "success",
      });

      setReportForm({
        report_title: "",
        summary: "",
        file_name: "",
        file_url: "",
      });

      await loadTasks();
    } catch (error) {
      setMessage({
        text:
          error.response?.data?.detail ||
          "Failed to upload survey report.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("lrmis_user");
    localStorage.removeItem("lrmis_token");
    window.location.href = "/login";
  }

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      scheduled: tasks.filter((task) => task.status === "visit_scheduled")
        .length,
      completed: tasks.filter(
        (task) =>
          task.status === "survey_completed" ||
          task.status === "report_uploaded" ||
          task.status === "registrar_reviewed"
      ).length,
    };
  }, [tasks]);

  const selectedProgress = selectedTask
    ? ((MILESTONE_ORDER.indexOf(selectedTask.status) + 1) /
        MILESTONE_ORDER.length) *
      100
    : 0;

  const role = user.role || user.staff_role;

  if (user.account_type === "staff" && role !== "surveyor") {
    return (
      <div className="surveyor-page">
        <div className="access-card">
          <h1>Access denied</h1>
          <p>This page is only for surveyors.</p>
          <button onClick={logout}>Back to login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="surveyor-shell">
      <Navigation user={user} onLogout={logout} />

      <main className="surveyor-content-area">
        <div className="surveyor-page">
          <section id="overview">
            <Header
              title="Surveyor Workspace"
              subtitle="Manage assigned field survey tasks, milestones, notes, and reports."
            />
          </section>

          {message.text && (
            <div className={`message-box ${message.type}`}>
              {message.text}
            </div>
          )}

          <section className="stats-grid">
            <div className="stat-card">
              <span>Total tasks</span>
              <strong>{stats.total}</strong>
            </div>

            <div className="stat-card">
              <span>Scheduled visits</span>
              <strong>{stats.scheduled}</strong>
            </div>

            <div className="stat-card">
              <span>Completed surveys</span>
              <strong>{stats.completed}</strong>
            </div>
          </section>

          <main className="surveyor-layout">
            <section id="tasks" className="tasks-panel">
              <div className="panel-title">
                <div>
                  <h2>My survey tasks</h2>
                  <p>Tasks assigned to your surveyor account.</p>
                </div>

                <button
                  className="panel-refresh-btn"
                  onClick={() => loadTasks()}
                  disabled={loading}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <RefreshIcon />
                    Refresh
                  </span>
                </button>
              </div>

              {loading ? (
                <div className="empty-box">Loading tasks…</div>
              ) : tasks.length === 0 ? (
                <div className="empty-box">No survey tasks assigned yet.</div>
              ) : (
                <div className="task-list">
                  {tasks.map((task) => (
                    <article
                      key={task._id || task.task_id}
                      className={`task-card ${
                        selectedTask?._id === task._id ||
                        selectedTask?.task_id === task.task_id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => handleSelectTask(task)}
                    >
                      <div className="task-card-top">
                        <div>
                          <h3>{task.task_id}</h3>
                          <p>{task.application_id}</p>
                        </div>

                        <span className={`status-badge ${task.status}`}>
                          {formatStatus(task.status)}
                        </span>
                      </div>

                      <div className="task-info">
                        <span>Zone: {task.zone_id || "-"}</span>
                        <span>Priority: {task.priority || "normal"}</span>
                        <span>
                          Visit: {task.scheduled_visit_date || "Not scheduled"}
                        </span>
                      </div>

                      <div className="progress">
                        <div
                          style={{
                            width: `${
                              ((MILESTONE_ORDER.indexOf(task.status) + 1) /
                                MILESTONE_ORDER.length) *
                              100
                            }%`,
                          }}
                        />
                      </div>

                      {NEXT_MILESTONE[task.status] && (
                        <button
                          className="task-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToNextMilestone(task);
                          }}
                          disabled={actionLoading}
                        >
                          Move to {formatStatus(NEXT_MILESTONE[task.status])}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section id="task-details" className="details-panel">
              {!selectedTask ? (
                <div className="empty-details">
                  <h2>Select a task</h2>
                  <p>Choose a survey task from the left side to manage it.</p>
                </div>
              ) : (
                <>
                  <div className="panel-title">
                    <div>
                      <h2>Task details</h2>
                      <p>{selectedTask.task_id}</p>
                    </div>

                    <span className={`status-badge ${selectedTask.status}`}>
                      {formatStatus(selectedTask.status)}
                    </span>
                  </div>

                  <div className="details-grid">
                    <div>
                      <span>Application ID</span>
                      <strong>{selectedTask.application_id}</strong>
                    </div>

                    <div>
                      <span>Parcel ID</span>
                      <strong>{selectedTask.parcel_id || "-"}</strong>
                    </div>

                    <div>
                      <span>Zone</span>
                      <strong>{selectedTask.zone_id || "-"}</strong>
                    </div>

                    <div>
                      <span>Priority</span>
                      <strong>{selectedTask.priority || "normal"}</strong>
                    </div>
                  </div>

                  <div className="full-progress">
                    <div style={{ width: `${selectedProgress}%` }} />
                  </div>

                  <div id="schedule" className="action-section">
                    <h3>Schedule visit</h3>
                    <p>This action is allowed only when task status is assigned.</p>

                    <div className="inline-form">
                      <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        disabled={selectedTask.status !== "assigned"}
                      />

                      <button
                        onClick={handleScheduleVisit}
                        disabled={
                          actionLoading || selectedTask.status !== "assigned"
                        }
                      >
                        Schedule
                      </button>
                    </div>
                  </div>

                  <div id="milestones" className="action-section">
                    <h3>Update milestone</h3>
                    <p>
                      Current status:{" "}
                      <strong>{formatStatus(selectedTask.status)}</strong>
                    </p>

                    {NEXT_MILESTONE[selectedTask.status] ? (
                      <button
                        className="wide-btn"
                        onClick={() => handleMoveToNextMilestone(selectedTask)}
                        disabled={actionLoading}
                      >
                        Move to{" "}
                        {formatStatus(NEXT_MILESTONE[selectedTask.status])}
                      </button>
                    ) : (
                      <div className="locked-box">
                        No milestone update available for this status.
                      </div>
                    )}
                  </div>

                  <div id="notes" className="action-section">
                    <h3>Field notes</h3>

                    <textarea
                      rows="4"
                      placeholder="Write field note…"
                      value={fieldNote}
                      onChange={(e) => setFieldNote(e.target.value)}
                    />

                    <button
                      className="wide-btn"
                      onClick={handleAddFieldNote}
                      disabled={actionLoading}
                    >
                      Add field note
                    </button>

                    {selectedTask.field_notes?.length > 0 && (
                      <div className="notes-list">
                        {selectedTask.field_notes.map((note, index) => (
                          <p key={index}>{note}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div id="report" className="action-section">
                    <h3>Upload survey report</h3>
                    <p>This action is allowed only after survey_completed.</p>

                    <input
                      type="text"
                      placeholder="Report title"
                      value={reportForm.report_title}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          report_title: e.target.value,
                        }))
                      }
                      disabled={selectedTask.status !== "survey_completed"}
                    />

                    <textarea
                      rows="4"
                      placeholder="Report summary"
                      value={reportForm.summary}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
                      }
                      disabled={selectedTask.status !== "survey_completed"}
                    />

                    <input
                      type="text"
                      placeholder="Attachment file name, example: survey_report.pdf"
                      value={reportForm.file_name}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          file_name: e.target.value,
                        }))
                      }
                      disabled={selectedTask.status !== "survey_completed"}
                    />

                    <input
                      type="text"
                      placeholder="Attachment URL, example: /uploads/survey_report.pdf"
                      value={reportForm.file_url}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          file_url: e.target.value,
                        }))
                      }
                      disabled={selectedTask.status !== "survey_completed"}
                    />

                    <button
                      className="wide-btn"
                      onClick={handleUploadReport}
                      disabled={
                        actionLoading ||
                        selectedTask.status !== "survey_completed"
                      }
                    >
                      Upload report
                    </button>
                  </div>

                  <div id="timeline" className="action-section">
                    <h3>Milestones timeline</h3>

                    {selectedTask.milestones?.length > 0 ? (
                      <div className="timeline">
                        {selectedTask.milestones.map((item, index) => (
                          <div className="timeline-item" key={index}>
                            <span className="timeline-dot" />
                            <div>
                              <strong>{formatStatus(item.type)}</strong>
                              <p>By: {item.by || "-"}</p>
                              <small>
                                {item.at
                                  ? new Date(item.at).toLocaleString()
                                  : ""}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="locked-box">No milestones yet.</div>
                    )}
                  </div>
                </>
              )}
            </section>
          </main>
        </div>
      </main>
    </div>
  );
}

export default SurveyorPage;
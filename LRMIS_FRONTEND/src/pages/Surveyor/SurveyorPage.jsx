import { useEffect, useState } from "react";
import {
  getStaffProfile,
  updateSurveyMilestone,
  uploadSurveyReport,
} from "../../api/model3Api";

import "./SurveyorPage.css";

const MILESTONES = [
  "assigned",
  "visit_scheduled",
  "arrived_on_site",
  "survey_started",
  "survey_completed",
  "report_uploaded",
  "registrar_reviewed",
];

const NEXT_MILESTONE = {
  assigned: "visit_scheduled",
  visit_scheduled: "arrived_on_site",
  arrived_on_site: "survey_started",
  survey_started: "survey_completed",
};

function formatStatus(status) {
  if (!status) return "-";
  return status.replaceAll("_", " ");
}

function getNextMilestoneLabel(status) {
  const next = NEXT_MILESTONE[status];

  if (next === "visit_scheduled") return "Schedule Visit";
  if (next === "arrived_on_site") return "Mark Arrived On Site";
  if (next === "survey_started") return "Start Survey";
  if (next === "survey_completed") return "Complete Survey";

  return null;
}

function getProgressIndex(status) {
  const index = MILESTONES.indexOf(status);
  return index === -1 ? 0 : index;
}

function canUploadReport(task) {
  return task?.status === "survey_completed";
}

function getTaskKey(task) {
  return task?._id || task?.task_id || task?.application_id || "";
}

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function getErrorMessage(error, fallbackMessage) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join(", ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (detail) {
    return JSON.stringify(detail);
  }

  return fallbackMessage;
}

function SurveyorPage() {
  const [user, setUser] = useState({});
  const [staffProfile, setStaffProfile] = useState(null);
  const [tasks, setTasks] = useState([]);

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskKey, setSelectedTaskKey] = useState("");

  const [scheduledDate, setScheduledDate] = useState("");
  const [fieldNote, setFieldNote] = useState("");
  const [localNotes, setLocalNotes] = useState([]);

  const [reportData, setReportData] = useState({
    report_title: "",
    summary: "",
  });

  const [reportFile, setReportFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = getUserFromStorage();
    setUser(storedUser);
    loadSurveyorData(storedUser);
  }, []);

  useEffect(() => {
    if (!selectedTaskKey) {
      return;
    }

    const updatedSelectedTask = tasks.find(
      (task) => getTaskKey(task) === selectedTaskKey
    );

    if (updatedSelectedTask) {
      setSelectedTask(updatedSelectedTask);
    }
  }, [tasks, selectedTaskKey]);

  useEffect(() => {
    if (selectedTask) {
      setScheduledDate(selectedTask.scheduled_visit_date || "");
      setLocalNotes(selectedTask.field_notes || []);
      setFieldNote("");
      setReportFile(null);

      setReportData({
        report_title: "",
        summary: "",
      });
    }
  }, [selectedTask]);

  async function loadSurveyorData(currentUser) {
    const staffId =
      currentUser?._id ||
      currentUser?.id ||
      currentUser?.staff_id ||
      currentUser?.staff_code;

    if (!staffId) {
      setMessage("Surveyor ID not found. Please login again.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await getStaffProfile(staffId);
      const assignedTasks = response.data.assigned_tasks || [];

      setStaffProfile(response.data);
      setTasks(assignedTasks);

      if (selectedTaskKey) {
        const updatedSelectedTask = assignedTasks.find(
          (task) => getTaskKey(task) === selectedTaskKey
        );

        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        }
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to load surveyor data."));
    } finally {
      setLoading(false);
    }
  }

  function updateTaskLocally(updatedTask) {
    if (!updatedTask) return;

    const updatedKey = getTaskKey(updatedTask);

    setSelectedTask(updatedTask);
    setSelectedTaskKey(updatedKey);

    setTasks((previousTasks) =>
      previousTasks.map((task) => {
        if (getTaskKey(task) === updatedKey) {
          return updatedTask;
        }

        return task;
      })
    );
  }

  function handleSelectTask(task) {
    setSelectedTask(task);
    setSelectedTaskKey(getTaskKey(task));

    setScheduledDate(task.scheduled_visit_date || "");
    setLocalNotes(task.field_notes || []);
    setFieldNote("");
    setReportFile(null);

    setReportData({
      report_title: "",
      summary: "",
    });

    setMessage("");
  }

  async function handleNextMilestone() {
    if (loading) return;

    if (!selectedTask) {
      setMessage("Please select a task first.");
      return;
    }

    const latestSelectedTask =
      tasks.find((task) => getTaskKey(task) === selectedTaskKey) ||
      selectedTask;

    const currentStatus = String(latestSelectedTask.status || "").trim();

    if (currentStatus === "report_uploaded") {
      setMessage("Survey report already uploaded. Waiting for registrar review.");
      return;
    }

    if (currentStatus === "registrar_reviewed") {
      setMessage("This survey task has already been reviewed by the registrar.");
      return;
    }

    const nextMilestone = NEXT_MILESTONE[currentStatus];

    console.log("Button clicked");
    console.log("Current status:", currentStatus);
    console.log("Next milestone:", nextMilestone);
    console.log("Selected task:", latestSelectedTask);

    if (!nextMilestone) {
      setMessage(
        `No next milestone available from status: ${formatStatus(currentStatus)}`
      );
      return;
    }

    if (nextMilestone === "visit_scheduled" && !scheduledDate) {
      setMessage("Please select scheduled visit date first.");
      return;
    }

    const payload = {
      milestone_type: nextMilestone,
      by: user?._id || user?.staff_id || staffProfile?._id || "surveyor",
      meta: {},
    };

    if (nextMilestone === "visit_scheduled") {
      payload.meta.scheduled_visit_date = scheduledDate;
    }

    console.log("Payload sent to backend:", payload);

    try {
      setLoading(true);
      setMessage("");

      const response = await updateSurveyMilestone(
        latestSelectedTask.application_id,
        payload
      );

      console.log("Backend response:", response.data);

      const updatedTaskFromBackend =
        response.data?.survey_task ||
        response.data?.task ||
        response.data?.data ||
        null;

      const updatedTask =
        updatedTaskFromBackend || {
          ...latestSelectedTask,
          status: nextMilestone,
          scheduled_visit_date:
            nextMilestone === "visit_scheduled"
              ? scheduledDate
              : latestSelectedTask.scheduled_visit_date,
          milestones: [
            ...(latestSelectedTask.milestones || []),
            {
              type: nextMilestone,
              at: new Date().toISOString(),
              by: payload.by,
              meta: payload.meta,
            },
          ],
        };

      updateTaskLocally(updatedTask);

      setMessage("Survey milestone updated successfully.");

      await loadSurveyorData(user);
    } catch (error) {
      console.log("Milestone error:", error.response?.data || error);

      setMessage(getErrorMessage(error, "Failed to update survey milestone."));
    } finally {
      setLoading(false);
    }
  }

  function handleAddLocalNote() {
    if (!fieldNote.trim()) {
      setMessage("Please write a field note first.");
      return;
    }

    setLocalNotes((previousNotes) => [...previousNotes, fieldNote.trim()]);
    setFieldNote("");

    setMessage(
      "Field note added locally. It will be sent with the survey report."
    );
  }

  function handleReportChange(e) {
    const { name, value } = e.target;

    setReportData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  function handleReportFileChange(e) {
    const file = e.target.files?.[0];

    if (!file) {
      setReportFile(null);
      return;
    }

    setReportFile(file);
  }

  async function handleUploadReport() {
    if (loading) return;

    if (!selectedTask) {
      setMessage("Please select a survey task first.");
      return;
    }

    if (!selectedTask._id) {
      setMessage("Survey task Mongo ID is missing.");
      return;
    }

    if (!selectedTask.task_id) {
      setMessage("Survey task ID is missing.");
      return;
    }

    if (!selectedTask.application_id) {
      setMessage("Application ID is missing.");
      return;
    }

    if (selectedTask.status !== "survey_completed") {
      setMessage("Survey report can be uploaded only after survey is completed.");
      return;
    }

    if (!reportData.report_title.trim()) {
      setMessage("Report title is required.");
      return;
    }

    if (!reportData.summary.trim()) {
      setMessage("Report summary is required.");
      return;
    }

    if (!reportFile) {
      setMessage("Please choose a report file.");
      return;
    }

    const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];
    const fileExtension = reportFile.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      setMessage("Only PDF, Word, JPG, JPEG, and PNG files are allowed.");
      return;
    }

    const uploadedBy =
      user?._id || user?.staff_id || staffProfile?._id || "surveyor";

    if (!uploadedBy) {
      setMessage("Uploaded by field is missing.");
      return;
    }

    const formData = new FormData();

    formData.append("task_id", selectedTask.task_id);
    formData.append("survey_task_ref", selectedTask._id);
    formData.append("report_title", reportData.report_title.trim());
    formData.append("summary", reportData.summary.trim());
    formData.append("uploaded_by", uploadedBy);
    formData.append("field_notes", JSON.stringify(localNotes));
    formData.append("file", reportFile);

    try {
      setLoading(true);
      setMessage("");

      const response = await uploadSurveyReport(
        selectedTask.application_id,
        formData
      );

      const updatedTask =
        response.data?.survey_task || response.data?.task || null;

      if (updatedTask && updatedTask.status) {
        updateTaskLocally(updatedTask);
      } else {
        const localUpdatedTask = {
          ...selectedTask,
          status: "report_uploaded",
          report_uploaded: true,
        };

        updateTaskLocally(localUpdatedTask);
      }

      setMessage(
        "Survey report uploaded successfully. Workflow moved to report_uploaded."
      );

      setReportData({
        report_title: "",
        summary: "",
      });

      setReportFile(null);
      setFieldNote("");
      setLocalNotes([]);

      await loadSurveyorData(user);
    } catch (error) {
      console.log("Upload report error:", error.response?.data || error);

      setMessage(getErrorMessage(error, "Failed to upload survey report."));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("lrmis_user");
    localStorage.removeItem("lrmis_token");
    window.location.href = "/login";
  }

  return (
    <div className="surveyor-page">
      <aside className="surveyor-sidebar">
        <h2>LRMIS</h2>
        <p>Surveyor Panel</p>

        <a href="#overview">Overview</a>
        <a href="#tasks">My Survey Tasks</a>

        {selectedTask && <a href="#execution">Task Execution</a>}

        <a href="#map">Live Map</a>
        <a href="#analytics">Analytics</a>

        {canUploadReport(selectedTask) && <a href="#report">Survey Report</a>}

        <button type="button" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="surveyor-main">
        <section id="overview" className="page-header">
          <div>
            <p className="label">Surveyor Workspace</p>
            <h1>Field Survey Management</h1>
            <span>
              Manage assigned survey tasks, milestones, field notes, and reports.
            </span>
          </div>
        </section>

        {message && <div className="message-box">{message}</div>}

        <section className="stats-grid">
          <div className="stat-card">
            <span>Total Tasks</span>
            <strong>{tasks.length}</strong>
          </div>

          <div className="stat-card">
            <span>Active Tasks</span>
            <strong>{staffProfile?.workload?.active_tasks || 0}</strong>
          </div>

          <div className="stat-card">
            <span>Max Tasks</span>
            <strong>{staffProfile?.workload?.max_tasks || 0}</strong>
          </div>
        </section>

        <section id="tasks" className="panel">
          <h2>My Survey Tasks</h2>
          <p>
            This section shows assigned tasks with parcel number, zone, priority,
            scheduled visit date, and current milestone. Click a task to manage
            its field workflow.
          </p>

          {loading && tasks.length === 0 ? (
            <div className="empty-box">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-box">No assigned survey tasks found.</div>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <div
                  className={`task-card ${
                    getTaskKey(task) === selectedTaskKey ? "selected-task" : ""
                  }`}
                  key={getTaskKey(task)}
                  onClick={() => handleSelectTask(task)}
                >
                  <div className="task-card-header">
                    <div>
                      <h3>{task.task_id || "Survey Task"}</h3>
                      <span className="status-badge">
                        {formatStatus(task.status)}
                      </span>
                    </div>

                    <p>Application: {task.application_id}</p>
                  </div>

                  <div className="task-info">
                    <span>
                      Parcel: {task.parcel_number || task.parcel_id || "-"}
                    </span>
                    <span>Zone: {task.zone_id || "-"}</span>
                    <span>Priority: {task.priority || "normal"}</span>
                    <span>
                      Visit: {task.scheduled_visit_date || "Not scheduled"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedTask && (
          <section id="execution" className="panel">
            <h2>Survey Task Execution</h2>

            <div className="execution-box">
              <div className="execution-header">
                <div>
                  <h3>{selectedTask.task_id}</h3>
                  <p>Application: {selectedTask.application_id}</p>
                </div>

                <span className="status-badge">
                  {formatStatus(selectedTask.status)}
                </span>
              </div>

              <div className="task-info">
                <span>Parcel: {selectedTask.parcel_number || "-"}</span>
                <span>Zone: {selectedTask.zone_id || "-"}</span>
                <span>Priority: {selectedTask.priority || "normal"}</span>
                <span>
                  Visit: {selectedTask.scheduled_visit_date || "Not scheduled"}
                </span>
              </div>

              <div className="milestone-progress">
                {MILESTONES.map((milestone, index) => (
                  <div
                    key={milestone}
                    className={
                      index <= getProgressIndex(selectedTask.status)
                        ? "milestone-step active"
                        : "milestone-step"
                    }
                  >
                    <span>{index + 1}</span>
                    <p>{formatStatus(milestone)}</p>
                  </div>
                ))}
              </div>

              {selectedTask.status === "assigned" && (
                <div className="form-row">
                  <label>Scheduled Visit Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              )}

              {getNextMilestoneLabel(selectedTask.status) ? (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleNextMilestone}
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : getNextMilestoneLabel(selectedTask.status)}
                </button>
              ) : selectedTask.status === "survey_completed" ? (
                <div className="empty-box success-box">
                  Survey is completed. The report upload form is now available
                  below.
                </div>
              ) : selectedTask.status === "report_uploaded" ? (
                <div className="empty-box success-box">
                  Survey report uploaded successfully. Waiting for registrar
                  review.
                </div>
              ) : selectedTask.status === "registrar_reviewed" ? (
                <div className="empty-box success-box">
                  This survey task has been reviewed by the registrar.
                </div>
              ) : (
                <div className="empty-box">
                  No action available for this status.
                </div>
              )}
            </div>
          </section>
        )}

        <section id="map" className="panel">
          <h2>Live Parcel Map</h2>
          <div className="map-placeholder">
            Map will be connected later using OpenStreetMap + Leaflet.
          </div>
        </section>

        <section id="analytics" className="panel">
          <h2>Analytics Dashboard</h2>
          <div className="analytics-grid">
            <div>Applications over time</div>
            <div>Pending applications by zone</div>
            <div>Average processing time</div>
            <div>Surveyor workload</div>
          </div>
        </section>

        {canUploadReport(selectedTask) && (
          <section id="report" className="panel">
            <h2>Survey Report</h2>

            <div className="report-box">
              <h3>{selectedTask.task_id}</h3>

              <div className="task-info">
                <span>Task ID: {selectedTask.task_id || "-"}</span>
                <span>Task Mongo ID: {selectedTask._id || "-"}</span>
                <span>Application: {selectedTask.application_id || "-"}</span>
                <span>Status: {formatStatus(selectedTask.status)}</span>
              </div>

              <div className="form-row full">
                <label>Field Note</label>
                <textarea
                  value={fieldNote}
                  onChange={(e) => setFieldNote(e.target.value)}
                  placeholder="Write field notes from the survey visit..."
                />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleAddLocalNote}
                >
                  Add Field Note
                </button>
              </div>

              {localNotes.length > 0 && (
                <div className="notes-box">
                  <h4>Field Notes</h4>
                  {localNotes.map((note, index) => (
                    <p key={index}>• {note}</p>
                  ))}
                </div>
              )}

              <div className="report-form">
                <div className="form-row">
                  <label>Report Title</label>
                  <input
                    type="text"
                    name="report_title"
                    value={reportData.report_title}
                    onChange={handleReportChange}
                    placeholder="Boundary Survey Report"
                  />
                </div>

                <div className="form-row">
                  <label>Choose Report File</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleReportFileChange}
                  />

                  {reportFile && (
                    <p className="hint-text">
                      Selected file: {reportFile.name}
                    </p>
                  )}
                </div>

                <div className="form-row full">
                  <label>Report Summary</label>
                  <textarea
                    name="summary"
                    value={reportData.summary}
                    onChange={handleReportChange}
                    placeholder="Write a short summary about the survey result..."
                  />
                </div>
              </div>

              <button
                type="button"
                className="primary-btn"
                onClick={handleUploadReport}
                disabled={loading}
              >
                {loading ? "Uploading..." : "Upload Survey Report"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default SurveyorPage;
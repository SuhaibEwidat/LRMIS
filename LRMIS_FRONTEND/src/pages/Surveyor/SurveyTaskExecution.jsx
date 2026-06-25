import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  updateSurveyMilestone,
  uploadSurveyReport,
} from "../../api/model3Api";
import "./SurveyorLayout.css";

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

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function getSavedTask() {
  try {
    return JSON.parse(localStorage.getItem("selected_survey_task") || "null");
  } catch {
    return null;
  }
}

function saveTask(task) {
  localStorage.setItem("selected_survey_task", JSON.stringify(task));
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

function formatStatus(status) {
  if (!status) return "-";
  return String(status).replaceAll("_", " ");
}

function getProgressIndex(status) {
  const index = MILESTONES.indexOf(status);
  return index === -1 ? 0 : index;
}

function getApplicationId(task) {
  if (!task?.application_id) return "";

  if (typeof task.application_id === "object") {
    return task.application_id.$oid || task.application_id.id || "";
  }

  return task.application_id;
}

function getParcelNumber(task) {
  return (
    task?.parcel_number ||
    task?.parcel_ref?.parcel_number ||
    task?.parcel_id ||
    "-"
  );
}

function getZone(task) {
  return task?.zone_id || task?.parcel_ref?.zone_id || task?.zone || "-";
}

function getPriority(task) {
  return task?.priority || task?.application_priority || "normal";
}

function getScheduledDate(task) {
  return (
    task?.scheduled_visit_date ||
    task?.visit_date ||
    task?.milestones?.find((m) => m.type === "visit_scheduled")?.meta
      ?.scheduled_visit_date ||
    ""
  );
}

function getNextButtonLabel(status) {
  const next = NEXT_MILESTONE[status];

  if (next === "visit_scheduled") return "Schedule Visit";
  if (next === "arrived_on_site") return "Mark Arrived On Site";
  if (next === "survey_started") return "Start Survey";
  if (next === "survey_completed") return "Complete Survey";

  return null;
}

function SurveyTaskExecution() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);

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

    const taskFromNavigation = location.state?.task;
    const taskFromStorage = getSavedTask();

    const task = taskFromNavigation || taskFromStorage;

    if (task) {
      setSelectedTask(task);
      setScheduledDate(getScheduledDate(task));
      setLocalNotes(task.field_notes || []);
    }
  }, [location.state]);

  function updateTaskLocally(updatedTask) {
    setSelectedTask(updatedTask);
    saveTask(updatedTask);
  }

  async function handleNextMilestone() {
    if (!selectedTask) {
      setMessage("Please select a survey task first.");
      return;
    }

    const currentStatus = String(selectedTask.status || "").trim();
    const nextMilestone = NEXT_MILESTONE[currentStatus];

    if (!nextMilestone) {
      setMessage(
        `No next milestone available from status: ${formatStatus(
          currentStatus
        )}`
      );
      return;
    }

    if (nextMilestone === "visit_scheduled" && !scheduledDate) {
      setMessage("Please select scheduled visit date first.");
      return;
    }

    const applicationId = getApplicationId(selectedTask);

    if (!applicationId) {
      setMessage("Application ID is missing.");
      return;
    }

    const payload = {
      milestone_type: nextMilestone,
      by: user?._id || user?.staff_id || user?.staff_code || "surveyor",
      meta: {},
    };

    if (nextMilestone === "visit_scheduled") {
      payload.meta.scheduled_visit_date = scheduledDate;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await updateSurveyMilestone(applicationId, payload);

      const updatedTaskFromBackend =
        response.data?.survey_task ||
        response.data?.task ||
        response.data?.data ||
        null;

      const updatedTask =
        updatedTaskFromBackend || {
          ...selectedTask,
          status: nextMilestone,
          scheduled_visit_date:
            nextMilestone === "visit_scheduled"
              ? scheduledDate
              : selectedTask.scheduled_visit_date,
          milestones: [
            ...(selectedTask.milestones || []),
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
    } catch (error) {
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
    setMessage("Field note added locally. It will be sent with the report.");
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
    if (!selectedTask) {
      setMessage("Please select a survey task first.");
      return;
    }

    if (selectedTask.status !== "survey_completed") {
      setMessage("Survey report can be uploaded only after survey is completed.");
      return;
    }

    if (!selectedTask.task_id) {
      setMessage("Survey task ID is missing.");
      return;
    }

    if (!selectedTask._id) {
      setMessage("Survey task Mongo ID is missing.");
      return;
    }

    const applicationId = getApplicationId(selectedTask);

    if (!applicationId) {
      setMessage("Application ID is missing.");
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
      user?._id || user?.staff_id || user?.staff_code || "surveyor";

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

      const response = await uploadSurveyReport(applicationId, formData);

      const updatedTaskFromBackend =
        response.data?.survey_task ||
        response.data?.task ||
        response.data?.data ||
        null;

      const updatedTask =
        updatedTaskFromBackend || {
          ...selectedTask,
          status: "report_uploaded",
          report_uploaded: true,
          field_notes: localNotes,
        };

      updateTaskLocally(updatedTask);

      setReportData({
        report_title: "",
        summary: "",
      });

      setReportFile(null);
      setFieldNote("");
      setLocalNotes([]);

      setMessage("Survey report uploaded successfully.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to upload survey report."));
    } finally {
      setLoading(false);
    }
  }

  if (!selectedTask) {
    return (
      <>
        <section className="surveyor-page-header">
          <div>
            <p className="surveyor-label">Team 16</p>
            <h1>Task Execution</h1>
          </div>
        </section>

        <section className="panel">
          <div className="empty-box">
            No task selected. Please go back to My Survey Tasks and open a task.
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate("/surveyor/tasks")}
          >
            Go to My Survey Tasks
          </button>
        </section>
      </>
    );
  }

  const nextButtonLabel = getNextButtonLabel(selectedTask.status);

  return (
    <>
      <section className="surveyor-page-header">
        <div>
          <p className="surveyor-label">Team 16</p>
          <h1>Survey Task Execution</h1>
        </div>
      </section>

      {message && <div className="message-box">{message}</div>}

      <section className="panel">
        <div className="execution-header">
          <div>
            <h2>{selectedTask.task_id || "Survey Task"}</h2>
            <p>Application: {getApplicationId(selectedTask) || "-"}</p>
          </div>

          <span className="status-badge">
            {formatStatus(selectedTask.status)}
          </span>
        </div>

        <div className="task-info task-info-wide">
          <span>Parcel: {getParcelNumber(selectedTask)}</span>
          <span>Zone: {getZone(selectedTask)}</span>
          <span>Priority: {getPriority(selectedTask)}</span>
          <span>
            Visit: {scheduledDate || getScheduledDate(selectedTask) || "Not scheduled"}
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

        {nextButtonLabel ? (
          <button
            type="button"
            className="primary-btn"
            onClick={handleNextMilestone}
            disabled={loading}
          >
            {loading ? "Saving..." : nextButtonLabel}
          </button>
        ) : selectedTask.status === "survey_completed" ? (
          <div className="empty-box success-box">
            Survey is completed. You can upload the survey report below.
          </div>
        ) : selectedTask.status === "report_uploaded" ? (
          <div className="empty-box success-box">
            Survey report has been uploaded. Waiting for registrar review.
          </div>
        ) : selectedTask.status === "registrar_reviewed" ? (
          <div className="empty-box success-box">
            This survey task has been reviewed by the registrar.
          </div>
        ) : (
          <div className="empty-box">No action available for this status.</div>
        )}
      </section>

      <section className="panel">
        <h2>Field Notes</h2>
        <p>Add notes from the field visit. These notes will be sent with the report.</p>

        <div className="form-row full">
          <label>Field Note</label>
          <textarea
            value={fieldNote}
            onChange={(e) => setFieldNote(e.target.value)}
            placeholder="Write notes about the parcel boundary, access, observations..."
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
            <h4>Saved Field Notes</h4>

            {localNotes.map((note, index) => (
              <p key={index}>• {note}</p>
            ))}
          </div>
        )}
      </section>

      {selectedTask.status === "survey_completed" && (
        <section className="panel">
          <h2>Upload Survey Report</h2>
          <p>
            Upload the final survey report file and provide a short report
            summary.
          </p>

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
              <label>Report File</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleReportFileChange}
              />

              {reportFile && (
                <p className="hint-text">Selected file: {reportFile.name}</p>
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
        </section>
      )}
    </>
  );
}

export default SurveyTaskExecution;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStaffProfile } from "../../api/model3Api";
import "./SurveyorLayout.css";

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

function formatStatus(status) {
  if (!status) return "-";
  return String(status).replaceAll("_", " ");
}

function getTaskKey(task, index) {
  return (
    task?._id ||
    task?.task_id ||
    task?.application_id ||
    task?.application_ref ||
    `task-${index}`
  );
}

function getApplicationId(task) {
  if (!task?.application_id) return "-";

  if (typeof task.application_id === "object") {
    return task.application_id.$oid || task.application_id.id || "-";
  }

  return task.application_id;
}

function getParcelNumber(task) {
  return (
    task?.parcel_number ||
    task?.parcel_ref?.parcel_number ||
    task?.parcel_ref?.parcel_id ||
    task?.parcel_id ||
    "-"
  );
}

function getZone(task) {
  return (
    task?.zone_id ||
    task?.parcel_ref?.zone_id ||
    task?.zone ||
    "-"
  );
}

function getPriority(task) {
  return (
    task?.priority ||
    task?.application_priority ||
    task?.application?.priority ||
    "normal"
  );
}

function getVisitDate(task) {
  return (
    task?.scheduled_visit_date ||
    task?.visit_date ||
    task?.milestones?.find((m) => m.type === "visit_scheduled")?.meta
      ?.scheduled_visit_date ||
    "Not scheduled"
  );
}

function getAssignedTasksFromResponse(data) {
  return (
    data?.assigned_tasks ||
    data?.tasks ||
    data?.survey_tasks ||
    data?.data?.assigned_tasks ||
    data?.data?.tasks ||
    []
  );
}

function MySurveyTasks() {
  const navigate = useNavigate();

  const [staffProfile, setStaffProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSurveyorTasks();
  }, []);

  async function loadSurveyorTasks() {
    const user = getUserFromStorage();

    const staffId =
      user?._id ||
      user?.id ||
      user?.staff_id ||
      user?.staff_code;

    if (!staffId) {
      setMessage("Surveyor ID not found. Please login again.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await getStaffProfile(staffId);

      const profile = response.data?.data || response.data;
      const assignedTasks = getAssignedTasksFromResponse(response.data);

      setStaffProfile(profile);
      setTasks(assignedTasks);
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to load survey tasks."));
    } finally {
      setLoading(false);
    }
  }

  function openTaskExecution(task) {
    localStorage.setItem("selected_survey_task", JSON.stringify(task));

    navigate("/surveyor/execution", {
      state: { task },
    });
  }

  return (
    <>
      <section className="surveyor-page-header">
        <div>
          <p className="surveyor-label">Team 16</p>
          <h1>My Survey Tasks</h1>
        </div>
      </section>

      {message && <div className="message-box">{message}</div>}

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total Assigned Tasks</span>
          <strong>{tasks.length}</strong>
        </div>

        <div className="stat-card">
          <span>Active Tasks</span>
          <strong>{staffProfile?.workload?.active_tasks || tasks.length}</strong>
        </div>

        <div className="stat-card">
          <span>Max Tasks</span>
          <strong>{staffProfile?.workload?.max_tasks || 0}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Assigned Tasks List</h2>
            <p>
              This section shows the tasks assigned to the logged-in surveyor.
            </p>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={loadSurveyorTasks}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading && tasks.length === 0 ? (
          <div className="empty-box">Loading survey tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-box">No assigned survey tasks found.</div>
        ) : (
          <div className="task-list">
            {tasks.map((task, index) => (
              <div
                key={getTaskKey(task, index)}
                className="task-card"
                onClick={() => openTaskExecution(task)}
              >
                <div className="task-card-header">
                  <div>
                    <h3>{task.task_id || "Survey Task"}</h3>

                    <span className="status-badge">
                      {formatStatus(task.status)}
                    </span>
                  </div>

                  <p>Application: {getApplicationId(task)}</p>
                </div>

                <div className="task-info">
                  <span>Parcel: {getParcelNumber(task)}</span>
                  <span>Zone: {getZone(task)}</span>
                  <span>Priority: {getPriority(task)}</span>
                  <span>Visit: {getVisitDate(task)}</span>
                  <span>Current Milestone: {formatStatus(task.status)}</span>
                </div>

                <button
                  type="button"
                  className="primary-btn small-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openTaskExecution(task);
                  }}
                >
                  Open Task
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default MySurveyTasks;
import { useEffect, useMemo, useState } from "react";
import {
  getAnalyticsKpis,
  getApplicationsByStatus,
  getApplicationsByZone,
  getProcessingTime,
  getSurveyorAnalytics,
  getRegistrarAnalytics,
} from "../../api/model3Api";
import "./SurveyorLayout.css";

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

function unwrapData(response) {
  return response?.data?.data || response?.data || {};
}

function normalizeArray(data, possibleKeys = []) {
  if (Array.isArray(data)) return data;

  for (const key of possibleKeys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function getValue(item, keys, fallback = 0) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) {
      return item[key];
    }
  }

  return fallback;
}

function formatLabel(value) {
  if (!value) return "-";
  return String(value).replaceAll("_", " ");
}

function getMaxValue(items, valueKeys) {
  const values = items.map((item) => Number(getValue(item, valueKeys, 0)));
  return Math.max(...values, 1);
}

function SimpleBarList({ items, labelKeys, valueKeys, emptyText }) {
  const maxValue = useMemo(() => {
    return getMaxValue(items, valueKeys);
  }, [items, valueKeys]);

  if (!items || items.length === 0) {
    return <div className="empty-box">{emptyText}</div>;
  }

  return (
    <div className="simple-chart-list">
      {items.map((item, index) => {
        const label = getValue(item, labelKeys, "Unknown");
        const value = Number(getValue(item, valueKeys, 0));
        const width = Math.max((value / maxValue) * 100, 5);

        return (
          <div className="chart-row" key={`${label}-${index}`}>
            <div className="chart-row-header">
              <span>{formatLabel(label)}</span>
              <strong>{value}</strong>
            </div>

            <div className="chart-track">
              <div className="chart-fill" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#64748b",
];

function DonutChart({ items, labelKeys, valueKeys }) {
  if (!items || items.length === 0) {
    return <div className="empty-box">No status data available.</div>;
  }

  const data = items.map((item) => ({
    label: formatLabel(getValue(item, labelKeys, "Unknown")),
    value: Number(getValue(item, valueKeys, 0)),
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <div className="empty-box">No status data available.</div>;
  }

  const size = 180;
  const stroke = 32;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const rotation = (offset / total) * 360 - 90;
    offset += d.value;
    return { ...d, dash, gap, rotation, color: STATUS_COLORS[i % STATUS_COLORS.length] };
  });

  return (
    <div className="donut-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            transform={`rotate(${seg.rotation} ${center} ${center})`}
          />
        ))}
        <text x={center} y={center - 6} textAnchor="middle" className="donut-total">{total}</text>
        <text x={center} y={center + 12} textAnchor="middle" className="donut-total-label">Total</text>
      </svg>

      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-dot" style={{ background: seg.color }} />
            <span className="donut-label">{seg.label}</span>
            <strong>{seg.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatMapGrid({ items, labelKeys, valueKeys }) {
  if (!items || items.length === 0) {
    return <div className="empty-box">No zone data available.</div>;
  }

  const data = items.map((item) => ({
    label: formatLabel(getValue(item, labelKeys, "Unknown")),
    value: Number(getValue(item, valueKeys, 0)),
  }));

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  function getHeatColor(value) {
    const intensity = value / maxVal;
    if (intensity > 0.75) return { bg: "#dc2626", color: "#fff" };
    if (intensity > 0.5) return { bg: "#f97316", color: "#fff" };
    if (intensity > 0.25) return { bg: "#facc15", color: "#111" };
    return { bg: "#bbf7d0", color: "#111" };
  }

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-grid">
        {data.map((d, i) => {
          const heat = getHeatColor(d.value);
          return (
            <div
              key={i}
              className="heatmap-cell"
              style={{ background: heat.bg, color: heat.color }}
            >
              <strong>{d.value}</strong>
              <span>{d.label}</span>
            </div>
          );
        })}
      </div>

      <div className="heatmap-legend">
        <span>Low</span>
        <div className="heatmap-scale">
          <div style={{ background: "#bbf7d0" }} />
          <div style={{ background: "#facc15" }} />
          <div style={{ background: "#f97316" }} />
          <div style={{ background: "#dc2626" }} />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}

function AnalyticsDashboard() {
  const [kpis, setKpis] = useState({});
  const [applicationsByStatus, setApplicationsByStatus] = useState([]);
  const [applicationsByZone, setApplicationsByZone] = useState([]);
  const [processingTime, setProcessingTime] = useState([]);
  const [surveyorAnalytics, setSurveyorAnalytics] = useState([]);
  const [registrarAnalytics, setRegistrarAnalytics] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setMessage("");

      const results = await Promise.allSettled([
        getAnalyticsKpis(),
        getApplicationsByStatus(),
        getApplicationsByZone(),
        getProcessingTime(),
        getSurveyorAnalytics(),
        getRegistrarAnalytics(),
      ]);

      const [
        kpisResult,
        statusResult,
        zoneResult,
        processingResult,
        surveyorResult,
        registrarResult,
      ] = results;

      if (kpisResult.status === "fulfilled") {
        setKpis(unwrapData(kpisResult.value));
      }

      if (statusResult.status === "fulfilled") {
        const data = unwrapData(statusResult.value);
        setApplicationsByStatus(
          normalizeArray(data, [
            "applications_by_status",
            "by_status",
            "statuses",
          ])
        );
      }

      if (zoneResult.status === "fulfilled") {
        const data = unwrapData(zoneResult.value);
        setApplicationsByZone(
          normalizeArray(data, [
            "applications_by_zone",
            "by_zone",
            "zones",
          ])
        );
      }

      if (processingResult.status === "fulfilled") {
        const data = unwrapData(processingResult.value);
        setProcessingTime(
          normalizeArray(data, [
            "processing_time",
            "average_processing_time",
            "items",
          ])
        );
      }

      if (surveyorResult.status === "fulfilled") {
        const data = unwrapData(surveyorResult.value);
        setSurveyorAnalytics(
          normalizeArray(data, [
            "surveyors",
            "surveyor_workload",
            "workload",
          ])
        );
      }

      if (registrarResult.status === "fulfilled") {
        const data = unwrapData(registrarResult.value);
        setRegistrarAnalytics(
          normalizeArray(data, [
            "registrars",
            "registrar_workload",
            "workload",
          ])
        );
      }

      const failed = results.filter((result) => result.status === "rejected");

      if (failed.length > 0) {
        setMessage(
          `Some analytics sections could not be loaded. Loaded ${
            results.length - failed.length
          } of ${results.length} sections.`
        );
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to load analytics dashboard."));
    } finally {
      setLoading(false);
    }
  }

  const totalApplications =
    kpis.total_applications ||
    kpis.applications_total ||
    kpis.total ||
    0;

  const pendingApplications =
    kpis.pending_applications ||
    kpis.pending ||
    kpis.total_pending ||
    0;

  const approvedApplications =
    kpis.approved_applications ||
    kpis.approved ||
    kpis.total_approved ||
    0;

  const rejectedApplications =
    kpis.rejected_applications ||
    kpis.rejected ||
    kpis.total_rejected ||
    0;

  const underObjection =
    kpis.applications_under_objection ||
    kpis.under_objection ||
    kpis.objections ||
    0;

  const certificatesIssued =
    kpis.certificates_issued ||
    kpis.issued_certificates ||
    kpis.certificates ||
    0;

  return (
    <>
      <section className="surveyor-page-header">
        <div>
          <p className="surveyor-label">Team 16</p>
          <h1>Analytics Dashboard</h1>
        </div>
      </section>

      {message && <div className="message-box">{message}</div>}

      <section className="analytics-stats-grid stats-grid">
        <div className="stat-card">
          <span>Total Applications</span>
          <strong>{totalApplications}</strong>
        </div>

        <div className="stat-card">
          <span>Pending Applications</span>
          <strong>{pendingApplications}</strong>
        </div>

        <div className="stat-card">
          <span>Approved Applications</span>
          <strong>{approvedApplications}</strong>
        </div>

        <div className="stat-card">
          <span>Rejected Applications</span>
          <strong>{rejectedApplications}</strong>
        </div>

        <div className="stat-card">
          <span>Under Objection</span>
          <strong>{underObjection}</strong>
        </div>

        <div className="stat-card">
          <span>Certificates Issued</span>
          <strong>{certificatesIssued}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Analytics Overview</h2>
            <p>
              Dashboard data is loaded from Module 4 analytics endpoints.
            </p>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={loadAnalytics}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Analytics"}
          </button>
        </div>

        {loading && (
          <div className="empty-box">Loading analytics data...</div>
        )}
      </section>

      <section className="analytics-panel-grid">
        <div className="panel">
          <h2>Applications by Status</h2>
          <p>Number of applications grouped by workflow status.</p>

          <SimpleBarList
            items={applicationsByStatus}
            labelKeys={["status", "_id", "name"]}
            valueKeys={["count", "total", "value"]}
            emptyText="No status analytics found."
          />
        </div>

        <div className="panel">
          <h2>Applications by Zone</h2>
          <p>Number of applications grouped by land zone.</p>

          <SimpleBarList
            items={applicationsByZone}
            labelKeys={["zone_id", "zone", "_id", "name"]}
            valueKeys={["count", "total", "value"]}
            emptyText="No zone analytics found."
          />
        </div>

        <div className="panel">
          <h2>Average Processing Time</h2>
          <p>Average processing time by application type.</p>

          <SimpleBarList
            items={processingTime}
            labelKeys={["application_type", "type", "_id", "name"]}
            valueKeys={[
              "average_days",
              "avg_processing_days",
              "processing_days",
              "avg",
              "value",
            ]}
            emptyText="No processing time analytics found."
          />
        </div>

        <div className="panel">
          <h2>Surveyor Workload</h2>
          <p>Current surveyor productivity and active task workload.</p>

          <SimpleBarList
            items={surveyorAnalytics}
            labelKeys={[
              "name",
              "staff_code",
              "surveyor_name",
              "_id",
            ]}
            valueKeys={[
              "active_tasks",
              "task_count",
              "assigned_tasks",
              "total_tasks",
              "count",
            ]}
            emptyText="No surveyor workload analytics found."
          />
        </div>

        <div className="panel">
          <h2>Registrar Workload</h2>
          <p>Registrar review workload and legal review distribution.</p>

          <SimpleBarList
            items={registrarAnalytics}
            labelKeys={[
              "name",
              "staff_code",
              "registrar_name",
              "_id",
            ]}
            valueKeys={[
              "review_count",
              "active_reviews",
              "legal_reviews",
              "total_reviews",
              "count",
            ]}
            emptyText="No registrar workload analytics found."
          />
        </div>

        <div className="panel">
          <h2>Status Distribution</h2>
          <p>Application status breakdown.</p>

          <DonutChart
            items={applicationsByStatus}
            labelKeys={["status", "_id", "name"]}
            valueKeys={["count", "total", "value"]}
          />
        </div>

        <div className="panel">
          <h2>Zone Heat Map</h2>
          <p>Application volume by zone.</p>

          <HeatMapGrid
            items={applicationsByZone}
            labelKeys={["zone_id", "zone", "_id", "name"]}
            valueKeys={["count", "total", "value"]}
          />
        </div>
      </section>
    </>
  );
}

export default AnalyticsDashboard;
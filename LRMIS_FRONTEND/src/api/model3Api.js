import API from "./axios";

// ===============================
// Staff / Surveyor Profile
// ===============================

// Get staff profile with assigned tasks
export function getStaffProfile(staffId) {
  return API.get(`/staff/${staffId}`);
}

// ===============================
// Survey Assignment
// ===============================

// Auto assign surveyor to application
export function autoAssignSurveyor(applicationId) {
  return API.post(`/applications/${applicationId}/auto-assign-surveyor`);
}

// ===============================
// Survey Milestones
// ===============================

// Add survey milestone
export function updateSurveyMilestone(applicationId, data) {
  return API.patch(`/applications/${applicationId}/survey-milestone`, data);
}

// ===============================
// Survey Report
// ===============================

// Upload real survey report file using FormData
export function uploadSurveyReport(applicationId, formData) {
  return API.post(
    `/applications/${applicationId}/survey-report`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
}

// ===============================
// Registrar Review
// ===============================

// Registrar review decision
export function registrarReview(applicationId, data) {
  return API.patch(`/applications/${applicationId}/registrar-review`, data);
}

// ===============================
// Map / Geo Feeds
// ===============================

// Get parcel GeoJSON feed
export function getParcelGeoFeed() {
  return API.get("/analytics/geofeeds/parcels");
}

// Get pending applications heatmap GeoJSON
export function getPendingHeatmap() {
  return API.get("/analytics/geofeeds/pending-heatmap");
}

// ===============================
// Analytics
// ===============================

export function getAnalyticsKpis() {
  return API.get("/analytics/kpis");
}

export function getApplicationsByStatus() {
  return API.get("/analytics/applications-by-status");
}

export function getApplicationsByZone() {
  return API.get("/analytics/applications-by-zone");
}

export function getProcessingTime() {
  return API.get("/analytics/processing-time");
}

export function getSurveyorAnalytics() {
  return API.get("/analytics/surveyors");
}

export function getRegistrarAnalytics() {
  return API.get("/analytics/registrars");
}
import API from "./axios";

// Get staff profile with assigned tasks
export function getStaffProfile(staffId) {
  return API.get(`/staff/${staffId}`);
}

// Auto assign surveyor to application
export function autoAssignSurveyor(applicationId) {
  return API.post(`/applications/${applicationId}/auto-assign-surveyor`);
}

// Add survey milestone
export function updateSurveyMilestone(applicationId, data) {
  return API.patch(`/applications/${applicationId}/survey-milestone`, data);
}

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
// Registrar review decision
export function registrarReview(applicationId, data) {
  return API.patch(`/applications/${applicationId}/registrar-review`, data);
}
import API from "./axios";

export function getSurveyorTasks(surveyorId) {
  return API.get(`/surveyor/${surveyorId}/tasks`);
}

export function scheduleVisit(applicationId, data) {
  return API.post(`/applications/${applicationId}/schedule-visit`, data);
}

export function updateSurveyMilestone(applicationId, data) {
  return API.patch(`/applications/${applicationId}/survey-milestone`, data);
}

export function addFieldNote(applicationId, data) {
  return API.post(`/applications/${applicationId}/field-note`, data);
}

export function uploadSurveyReport(applicationId, data) {
  return API.post(`/applications/${applicationId}/survey-report`, data);
}

export function registrarReview(applicationId, data) {
  return API.patch(`/applications/${applicationId}/registrar-review`, data);
}
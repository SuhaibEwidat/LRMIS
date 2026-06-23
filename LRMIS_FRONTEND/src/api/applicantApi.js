// We link the Applicant Dashboard to the backend.
import API from "./axios";

// Get applicant profile
export function getApplicantProfile(applicantId) {
  return API.get(`/applicants/${applicantId}`);
}

// Get all applications submitted by applicant
export function getApplicantApplications(applicantId) {
  return API.get(`/applicants/${applicantId}/applications`);
}

// Track one application by application_id
export function getApplicationDetails(applicationId) {
  return API.get(`/applications/${applicationId}`);
}

// Get application timeline
export function getApplicationTimeline(applicationId) {
  return API.get(`/applications/${applicationId}/timeline`);
}

// Upload additional document metadata/file later
export function addApplicationDocument(applicationId, formData) {
  return API.post(`/applications/${applicationId}/documents`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

// Submit objection
export function submitApplicationObjection(applicationId, formData) {
  return API.post(`/applications/${applicationId}/objections`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

// Create new land registration application
export function createApplication(data, idempotencyKey) {
  return API.post("/applications/", data, {
    params: {
      idempotency_key: idempotencyKey,
    },
  });
}

export function getApplicationDocuments(applicationId) {
  return API.get(`/applications/${applicationId}/documents`);
}
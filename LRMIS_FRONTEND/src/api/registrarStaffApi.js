import API from "./axios";

export function getAllApplications() {
  return API.get("/applications/");
}

export function getApplicationDetails(applicationId) {
  return API.get(`/applications/${applicationId}`);
}

export function getApplicantProfile(applicantId) {
  return API.get(`/applicants/${applicantId}`);
}

export function getApplicationDocuments(applicationId) {
  return API.get(`/applications/${applicationId}/documents`);
}

export function addInternalNote(applicationId, noteData) {
  return API.post(`/applications/${applicationId}/notes`, noteData);
}

export function transitionApplication(applicationId, newState) {
  return API.patch(`/applications/${applicationId}/transition`, null, {
    params: {
      new_state: newState,
    },
  });
}



export function rejectApplication(applicationId, reason) {
  return API.post(`/applications/${applicationId}/reject`, null, {
    params: {
      reason,
    },
  });
}

export function verifyAttachment(applicationId, documentType, verificationData) {
  return API.patch(
    `/applications/${applicationId}/attachments/${documentType}/verification`,
    verificationData
  );
}

export function issueCertificate(applicationId, registrarId) {
  return API.post(`/applications/${applicationId}/certificate`, null, {
    params: {
      registrar_id: registrarId,
    },
  });
}
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  getApplicantProfile,
  getApplicantApplications,
  createApplication,
  addApplicationDocument,
  getApplicationDocuments,
  getApplicationDetails,
  getApplicationTimeline,
  submitApplicationObjection
} from "../../api/applicantApi";
import "./ApplicantDashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const APPROVED_STATES = ["approved", "certificate_issued", "closed"];

const PENDING_STATES = [
  "submitted",
  "pre_checked",
  "survey_required",
  "surveyed",
  "legal_review",
  "missing_documents",
  "on_hold",
  "under_objection",
];

const MAP_DEFAULT_CENTER = [31.9021, 35.2001];
const PARCEL_POLYGON_DELTA = 0.00045;

const APPLICATION_TYPES = [
  { value: "first_registration", label: "First Registration" },
  { value: "ownership_transfer", label: "Ownership Transfer" },
  { value: "parcel_subdivision", label: "Parcel Subdivision" },
  { value: "parcel_merge", label: "Parcel Merge" },
  { value: "boundary_correction", label: "Boundary Correction" },
  { value: "certificate_request", label: "Certificate Request" },
];

const REQUIRED_DOCUMENTS_BY_APPLICATION_TYPE = {
  first_registration: [
    { document_type: "id_copy", label: "ID Copy" },
    { document_type: "ownership_deed", label: "Ownership Deed" },
    { document_type: "parcel_map", label: "Parcel Map" },
  ],
  ownership_transfer: [
    { document_type: "id_copy", label: "ID Copy" },
    { document_type: "ownership_deed", label: "Ownership Deed" },
    { document_type: "sale_contract", label: "Sale Contract" },
  ],
  parcel_subdivision: [
    { document_type: "id_copy", label: "ID Copy" },
    { document_type: "ownership_deed", label: "Ownership Deed" },
    { document_type: "parcel_map", label: "Parcel Map" },
  ],
  parcel_merge: [
    { document_type: "id_copy", label: "ID Copy" },
    { document_type: "ownership_deed", label: "Ownership Deed" },
    { document_type: "parcel_map", label: "Parcel Map" },
  ],
  boundary_correction: [
    { document_type: "id_copy", label: "ID Copy" },
    { document_type: "ownership_deed", label: "Ownership Deed" },
    { document_type: "parcel_map", label: "Parcel Map" },
  ],
  certificate_request: [
    { document_type: "id_copy", label: "ID Copy" },
    { document_type: "ownership_deed", label: "Ownership Deed" },
  ],
};

const DOCUMENT_OPTIONS = [
  { value: "id_copy", label: "ID Copy" },
  { value: "ownership_deed", label: "Ownership Deed" },
  { value: "sale_contract", label: "Sale Contract" },
  { value: "parcel_map", label: "Parcel Map" },
  { value: "survey_report", label: "Survey Report" },
  { value: "court_decision", label: "Court Decision" },
  { value: "other", label: "Other" },
];

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function getApplicantId(user) {
  return user?._id || user?.applicant_id || user?.id || user?.profile_id || "";
}

function getApplicationStatus(application) {
  return (
    application?.workflow?.current_state ||
    application?.status ||
    "unknown"
  );
}

function formatStatus(status) {
  if (!status) return "-";
  return String(status).replaceAll("_", " ");
}

function getRequiredNextStep(status) {
  const steps = {
    submitted: "Wait for staff pre-check.",
    pre_checked: "Waiting for survey requirement decision.",
    survey_required: "Waiting for surveyor assignment and field survey.",
    surveyed: "Waiting for legal review.",
    legal_review: "Registrar is reviewing the application.",
    missing_documents: "Upload the required missing documents.",
    on_hold: "Review the hold reason and wait for staff update.",
    under_objection: "Objection is being processed.",
    approved: "Wait for certificate issuance.",
    certificate_issued: "Certificate is ready.",
    closed: "Application completed.",
    rejected: "Review the rejection reason.",
  };

  return steps[status] || "Wait for the next workflow update.";
}

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function extractApplications(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.applications)) {
    return responseData.applications;
  }

  return [];
}

function extractDocuments(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
}

function extractTimeline(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.timeline)) {
    return responseData.timeline;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
}

function formatDocumentType(type) {
  if (!type) return "-";
  return String(type).replaceAll("_", " ");
}

function formatTimelineType(type) {
  if (!type) return "-";
  return String(type).replaceAll("_", " ");
}

function getVisibleApplicantNotes(application) {
  const notes = application?.internal?.notes || application?.notes || [];

  return notes.filter(
    (note) => note.visibility === "applicant" || note.visibility === "public"
  );
}

function getVisibleTimelineEvents(timeline) {
  return timeline.filter((event) => {
    if (event.type === "internal_note_added") {
      return (
        event.meta?.visibility === "applicant" ||
        event.meta?.visibility === "public"
      );
    }

    return true;
  });
}

function getSurveyStatus(application) {
  const status = getApplicationStatus(application);

  if (application?.survey_report) {
    return "Survey report uploaded.";
  }

  const surveyStatusByWorkflow = {
    submitted: "Survey not started.",
    pre_checked: "Waiting for survey decision.",
    survey_required: "Survey required / waiting for surveyor assignment.",
    surveyed: "Survey completed.",
    legal_review: "Survey completed and under legal review.",
    approved: "Survey process completed.",
    certificate_issued: "Survey process completed.",
    closed: "Application completed.",
    rejected: "Survey process stopped because application was rejected.",
  };

  return surveyStatusByWorkflow[status] || "Survey status is not available yet.";
}

function getApplicationTypeLabel(type) {
  return (
    APPLICATION_TYPES.find((item) => item.value === type)?.label ||
    formatDocumentType(type)
  );
}

function getRequiredDocumentsForApplicationType(applicationType) {
  return REQUIRED_DOCUMENTS_BY_APPLICATION_TYPE[applicationType] || [];
}

function buildParcelPolygon(latValue, lngValue) {
  const lat = Number(latValue);
  const lng = Number(lngValue);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const delta = PARCEL_POLYGON_DELTA;

  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - delta, lat - delta],
        [lng + delta, lat - delta],
        [lng + delta, lat + delta],
        [lng - delta, lat + delta],
        [lng - delta, lat - delta],
      ],
    ],
  };
}

function getCoordinatesFromGeometry(geometry) {
  const coordinates = geometry?.coordinates?.[0]?.[0];

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const [lng, lat] = coordinates;

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }

  return { lat: Number(lat), lng: Number(lng) };
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        lat: event.latlng.lat.toFixed(6),
        lng: event.latlng.lng.toFixed(6),
      });
    },
  });

  return null;
}

function ParcelLocationPicker({ lat, lng, onSelect }) {
  const selectedLocation =
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;

  const center = selectedLocation
    ? [selectedLocation.lat, selectedLocation.lng]
    : MAP_DEFAULT_CENTER;

  return (
    <div className="parcel-map-section">
      <div className="section-heading-row">
        <div>
          <h3>Choose Parcel Location on Map</h3>
          <p>Click on the map to generate a small GeoJSON polygon for this parcel.</p>
        </div>

        <span className="map-status-pill">
          {selectedLocation ? "Location selected" : "Location required"}
        </span>
      </div>

      <div className="parcel-map-picker">
        <MapContainer center={center} zoom={16} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onSelect={onSelect} />

          {selectedLocation && (
            <CircleMarker
              center={[selectedLocation.lat, selectedLocation.lng]}
              radius={10}
              pathOptions={{ weight: 3 }}
            >
              <Popup>Selected parcel location</Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      <div className="location-grid">
        <div>
          <span>Latitude</span>
          <strong>{lat || "Click map"}</strong>
        </div>

        <div>
          <span>Longitude</span>
          <strong>{lng || "Click map"}</strong>
        </div>
      </div>
    </div>
  );
}

function MiniParcelMap({ application }) {
  const fromGeometry = getCoordinatesFromGeometry(application?.parcel_geometry);
  const lat = application?.location_lat || fromGeometry?.lat;
  const lng = application?.location_lng || fromGeometry?.lng;

  if (!lat || !lng) {
    return (
      <div className="map-placeholder-small">
        Parcel location is not available for this application.
      </div>
    );
  }

  return (
    <div className="mini-map-wrapper">
      <MapContainer
        center={[Number(lat), Number(lng)]}
        zoom={16}
        scrollWheelZoom={false}
        className="leaflet-map mini"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CircleMarker
          center={[Number(lat), Number(lng)]}
          radius={9}
          pathOptions={{ weight: 3 }}
        >
          <Popup>Parcel location</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

function ApplicantInfoSummary({ profile, user }) {
  const identity = profile?.identity || user?.identity || {};
  const contacts = profile?.contacts || user?.contacts || {};
  const address = profile?.address || user?.address || {};

  const items = [
    ["Full Name", profile?.full_name || user?.full_name || user?.name || "-"],
    ["Applicant Type", formatStatus(profile?.applicant_type || user?.applicant_type || "citizen")],
    ["National ID", identity.national_id || "-"],
    ["Registration No.", identity.registration_number || "-"],
    ["Email", contacts.email || user?.email || "-"],
    ["Phone", contacts.phone || user?.phone || "-"],
    ["City", address.city || "-"],
    ["Address Zone", address.zone_id || "-"],
  ];

  return (
    <div className="form-section-card">
      <div className="section-heading-row">
        <div>
          <h3>Applicant Information</h3>
          <p>These values are taken from the applicant profile used at login.</p>
        </div>
      </div>

      <div className="readonly-info-grid">
        {items.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequiredDocumentsPicker({ applicationType, files, onFileChange }) {
  const requiredDocuments = getRequiredDocumentsForApplicationType(applicationType);

  return (
    <div className="form-section-card">
      <div className="section-heading-row">
        <div>
          <h3>Upload Required Documents</h3>
          <p>Optional now, but uploading them here reduces missing-document requests later.</p>
        </div>

        <span className="map-status-pill">
          {requiredDocuments.length} required
        </span>
      </div>

      <div className="required-upload-grid">
        {requiredDocuments.map((document) => (
          <label className="required-upload-card" key={document.document_type}>
            <span>{document.label}</span>
            <small>Allowed: PDF, Word, JPG, PNG</small>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(event) =>
                onFileChange(document.document_type, event.target.files?.[0] || null)
              }
            />
            <strong>{files[document.document_type]?.name || "No file selected"}</strong>
          </label>
        ))}
      </div>
    </div>
  );
}

function DocumentsStatusPanel({ applications, documentsByApplication, onUploadClick }) {
  if (!applications.length) {
    return (
      <div className="document-review-panel">
        <h3>Document Review Status</h3>
        <p className="track-empty">No applications yet.</p>
      </div>
    );
  }

  return (
    <div className="document-review-panel">
      <h3>Document Review Status</h3>

      <div className="document-review-list">
        {applications.map((application) => {
          const applicationId = application.application_id;
          const documents = documentsByApplication[applicationId] || [];

          return (
            <div className="document-review-card" key={applicationId || application._id}>
              <div className="document-review-header">
                <div>
                  <strong>{applicationId || "Application"}</strong>
                  <span>{getApplicationTypeLabel(application.application_type)}</span>
                </div>

                <button
                  type="button"
                  className="secondary-action-btn compact"
                  onClick={() => onUploadClick(applicationId)}
                >
                  Upload to this
                </button>
              </div>

              {documents.length === 0 ? (
                <p className="track-empty">No uploaded documents yet.</p>
              ) : (
                <div className="documents-list">
                  {documents.map((document) => (
                    <div className="document-row" key={document.document_id || document.file_url}>
                      <div>
                        <strong>{formatDocumentType(document.document_type)}</strong>
                        <span>{document.file_name}</span>
                      </div>

                      <span className="document-status">
                        {formatStatus(document.status || "pending_review")}
                      </span>

                      {document.file_url && (
                        <a href={`${API_URL}${document.file_url}`} target="_blank" rel="noreferrer">
                          View File
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApplicantDashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  const [user, setUser] = useState({});
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [documentsByApplication, setDocumentsByApplication] = useState({});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [submitMessage, setSubmitMessage] = useState({ text: "", type: "" });
  const [documentMessage, setDocumentMessage] = useState("");

  const [lastSubmittedApplication, setLastSubmittedApplication] =
    useState(null);

  const [trackId, setTrackId] = useState("");
  const [trackedApplication, setTrackedApplication] = useState(null);
  const [trackedTimeline, setTrackedTimeline] = useState([]);
  const [trackedDocuments, setTrackedDocuments] = useState([]);
  const [trackMessage, setTrackMessage] = useState("");
const [objectionMessage, setObjectionMessage] = useState("");
const [objectionResult, setObjectionResult] = useState(null);

const [objectionForm, setObjectionForm] = useState({
  application_id: "",
  reason: "",
  description: "",
  file: null,
});

  const [documentForm, setDocumentForm] = useState({
    application_id: "",
    document_type: "id_copy",
    notes: "",
    file: null,
  });

  const [applicationForm, setApplicationForm] = useState({
    application_type: "ownership_transfer",
    priority: "normal",
    parcel_number: "",
    block_number: "",
    basin_number: "",
    zone_id: "",
    location_lat: "",
    location_lng: "",
    description: "",
  });

  const [applicationDocumentFiles, setApplicationDocumentFiles] = useState({});

  useEffect(() => {
    const storedUser = getUserFromStorage();
    setUser(storedUser);
    loadApplicantData(storedUser);
  }, []);

  async function loadApplicantData(currentUser) {
    const applicantId = getApplicantId(currentUser);

    if (!applicantId) {
      setMessage("Applicant ID not found. Please login again.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const [profileResponse, applicationsResponse] = await Promise.all([
        getApplicantProfile(applicantId),
        getApplicantApplications(applicantId),
      ]);

      const applicationsList = extractApplications(applicationsResponse.data);

      setProfile(profileResponse.data);
      setApplications(applicationsList);

      const documentsResults = await Promise.all(
        applicationsList.map(async (application) => {
          const applicationId = application.application_id;

          if (!applicationId) {
            return [applicationId, []];
          }

          try {
            const documentsResponse = await getApplicationDocuments(
              applicationId
            );

            return [applicationId, extractDocuments(documentsResponse.data)];
          } catch (error) {
            console.log(
              "Documents load error:",
              applicationId,
              error.response?.data || error
            );

            return [applicationId, []];
          }
        })
      );

      setDocumentsByApplication(
        Object.fromEntries(
          documentsResults.filter(([applicationId]) => Boolean(applicationId))
        )
      );
    } catch (error) {
      console.log("Applicant dashboard error:", error.response?.data || error);

      setMessage(
        error.response?.data?.detail ||
          "Failed to load applicant dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleApplicationChange(e) {
    const { name, value } = e.target;

    setApplicationForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    if (name === "application_type") {
      setApplicationDocumentFiles({});
    }
  }

  function handleLocationSelect(location) {
    setApplicationForm((previousForm) => ({
      ...previousForm,
      location_lat: location.lat,
      location_lng: location.lng,
    }));
  }

  function handleRequiredDocumentFileChange(documentType, file) {
    setApplicationDocumentFiles((previousFiles) => ({
      ...previousFiles,
      [documentType]: file,
    }));
  }

  async function uploadSelectedRequiredDocuments(applicationId, applicantId) {
    const requiredDocuments = getRequiredDocumentsForApplicationType(
      applicationForm.application_type
    );

    const selectedDocuments = requiredDocuments.filter(
      (document) => applicationDocumentFiles[document.document_type]
    );

    for (const document of selectedDocuments) {
      const formData = new FormData();

      formData.append("document_type", document.document_type);
      formData.append("uploaded_by", applicantId);
      formData.append("notes", "Uploaded during application submission");
      formData.append("file", applicationDocumentFiles[document.document_type]);

      await addApplicationDocument(applicationId, formData);
    }

    return selectedDocuments.length;
  }

  function prepareDocumentUpload(applicationId) {
    setDocumentForm((previousForm) => ({
      ...previousForm,
      application_id: applicationId || "",
    }));
    setActiveSection("documents");
  }

  async function handleCreateApplication(e) {
  e.preventDefault();
  setSubmitMessage({ text: "", type: "" });

  const applicantId = getApplicantId(user);

  if (!applicantId) {
    setSubmitMessage({
      text: "Applicant ID not found. Please login again.",
      type: "error",
    });
    return;
  }

  if (!applicationForm.parcel_number.trim()) {
    setSubmitMessage({ text: "Parcel number is required.", type: "error" });
    return;
  }

  if (!applicationForm.block_number.trim()) {
    setSubmitMessage({ text: "Block number is required.", type: "error" });
    return;
  }

  if (!applicationForm.basin_number.trim()) {
    setSubmitMessage({ text: "Basin number is required.", type: "error" });
    return;
  }

    if (!applicationForm.zone_id.trim()) {
      setSubmitMessage({ text: "Zone ID is required.", type: "error" });
      return;
    }

    if (!applicationForm.location_lat || !applicationForm.location_lng) {
      setSubmitMessage({
        text: "Please choose the parcel location on the map.",
        type: "error",
      });
      return;
    }

    const parcelGeometry = buildParcelPolygon(
      applicationForm.location_lat,
      applicationForm.location_lng
    );

    if (!parcelGeometry) {
      setSubmitMessage({ text: "Invalid parcel map location.", type: "error" });
      return;
    }

  const payload = {
    application_type: applicationForm.application_type,
    priority: applicationForm.priority,

    applicant_ref: {
      applicant_id: applicantId,
      applicant_type:
        profile?.applicant_type || user?.applicant_type || "citizen",
      submitted_by_representative: false,
    },

    parcel_ref: {
      parcel_id: generatedParcelId,
      parcel_number: parcelNumber,
      block_number: blockNumber,
      basin_number: basinNumber,
      zone_id: zoneId,
      owner_refs: [applicantId],
    },

      parcel_geometry: parcelGeometry,

    description:
      applicationForm.description.trim() ||
      `${applicationForm.application_type} application for parcel ${parcelNumber}.`,

    tags: [applicationForm.application_type],
  };

  const idempotencyKey = `${applicantId}-${Date.now()}`;

  try {
    setLoading(true);
    setMessage("");

    const response = await createApplication(payload, idempotencyKey);

    const createdApplication =
      response.data?.data ||
      response.data?.application ||
      response.data ||
      {};

      const createdApplicationId =
        createdApplication.application_id ||
        createdApplication?.data?.application_id ||
        createdApplication?._id ||
        createdApplication?.id;

      let uploadedDocumentsCount = 0;
      let documentUploadWarning = "";

      if (createdApplicationId) {
        try {
          uploadedDocumentsCount = await uploadSelectedRequiredDocuments(
            createdApplicationId,
            applicantId
          );
        } catch (documentError) {
          console.log(
            "Required document upload error:",
            documentError.response?.data || documentError
          );
          documentUploadWarning =
            " Application was created, but one or more documents were not uploaded.";
        }
      }

      const confirmationApplication = {
        ...payload,
        ...createdApplication,
        status:
          getApplicationStatus(createdApplication) !== "unknown"
            ? getApplicationStatus(createdApplication)
            : "submitted",
        submitted_at:
          createdApplication?.timestamps?.submitted_at ||
          createdApplication?.submitted_at ||
          createdApplication?.created_at ||
          new Date().toISOString(),
        location_lat: applicationForm.location_lat,
        location_lng: applicationForm.location_lng,
        uploaded_documents_count: uploadedDocumentsCount,
      };

      setApplicationForm({
        application_type: "ownership_transfer",
        priority: "normal",
        parcel_number: "",
        block_number: "",
        basin_number: "",
        zone_id: "",
        location_lat: "",
        location_lng: "",
        description: "",
      });
      setApplicationDocumentFiles({});

    await loadApplicantData(user);

    setLastSubmittedApplication(confirmationApplication);
    setActiveSection("confirmation");

      setSubmitMessage({
        text: `Application submitted successfully.${
          uploadedDocumentsCount
            ? ` ${uploadedDocumentsCount} document(s) uploaded.`
            : ""
        }${documentUploadWarning}`,
        type: documentUploadWarning ? "error" : "success",
      });
    } catch (error) {
      console.log("Create application error:", error.response?.data || error);

    setSubmitMessage({
      text:
        error.response?.data?.detail ||
        "Failed to submit application. Please check your data.",
      type: "error",
    });
  } finally {
    setLoading(false);
  }
}

  function handleDocumentChange(e) {
    const { name, value } = e.target;

    setDocumentForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  function handleDocumentFileChange(e) {
    const selectedFile = e.target.files?.[0] || null;

    setDocumentForm((previousForm) => ({
      ...previousForm,
      file: selectedFile,
    }));
  }

  async function handleUploadDocument(e) {
    e.preventDefault();

    const applicantId = getApplicantId(user);

    if (!applicantId) {
      setMessage("Applicant ID not found. Please login again.");
      return;
    }

    if (!documentForm.application_id.trim()) {
      setMessage("Application ID is required.");
      return;
    }

    if (!documentForm.file) {
      setMessage("Please choose a document file.");
      return;
    }

    const formData = new FormData();

    formData.append("document_type", documentForm.document_type);
    formData.append("uploaded_by", applicantId);
    formData.append("notes", documentForm.notes || "Uploaded by applicant");
    formData.append("file", documentForm.file);

    try {
      setLoading(true);
      setMessage("");
      setDocumentMessage("");

      await addApplicationDocument(documentForm.application_id.trim(), formData);

      setDocumentForm({
        application_id: "",
        document_type: "id_copy",
        notes: "",
        file: null,
      });

      setDocumentMessage("Document uploaded successfully. Review status is now visible below.");
      await loadApplicantData(user);

      if (trackedApplication?.application_id === documentForm.application_id.trim()) {
        const documentsResponse = await getApplicationDocuments(
          documentForm.application_id.trim()
        );
        setTrackedDocuments(extractDocuments(documentsResponse.data));
      }
    } catch (error) {
      console.log("Upload document error:", error.response?.data || error);

      setDocumentMessage("");

      setMessage(
        error.response?.data?.detail ||
          "Failed to upload document. Please check your data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTrackApplication(e) {
    e.preventDefault();

    const applicationId = trackId.trim();

    if (!applicationId) {
      setTrackMessage("");
      setMessage("Application ID is required.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setTrackMessage("");
      setTrackedApplication(null);
      setTrackedTimeline([]);
      setTrackedDocuments([]);

      const [applicationResponse, timelineResponse, documentsResponse] =
        await Promise.all([
          getApplicationDetails(applicationId),
          getApplicationTimeline(applicationId),
          getApplicationDocuments(applicationId),
        ]);

      const application =
        applicationResponse.data?.data ||
        applicationResponse.data?.application ||
        applicationResponse.data;

      setTrackedApplication(application);
      setTrackedTimeline(extractTimeline(timelineResponse.data));
      setTrackedDocuments(extractDocuments(documentsResponse.data));

      setTrackMessage("Application loaded successfully.");
    } catch (error) {
      console.log("Track application error:", error.response?.data || error);

      setTrackedApplication(null);
      setTrackedTimeline([]);
      setTrackedDocuments([]);
      setTrackMessage("");

      setMessage(
        error.response?.data?.detail ||
          "Application not found or failed to load."
      );
    } finally {
      setLoading(false);
    }
  }
  function handleObjectionChange(e) {
  const { name, value } = e.target;

  setObjectionForm((previousForm) => ({
    ...previousForm,
    [name]: value,
  }));
}

function handleObjectionFileChange(e) {
  const selectedFile = e.target.files?.[0] || null;

  setObjectionForm((previousForm) => ({
    ...previousForm,
    file: selectedFile,
  }));
}

async function handleSubmitObjection(e) {
  e.preventDefault();

  const applicantId = getApplicantId(user);

  if (!applicantId) {
    setMessage("Applicant ID not found. Please login again.");
    return;
  }

  if (!objectionForm.application_id.trim()) {
    setMessage("Application ID is required.");
    return;
  }

  if (!objectionForm.reason.trim()) {
    setMessage("Objection reason is required.");
    return;
  }

  const formData = new FormData();

  formData.append("submitted_by", applicantId);
  formData.append("reason", objectionForm.reason.trim());
  formData.append("description", objectionForm.description.trim());

  if (objectionForm.file) {
    formData.append("file", objectionForm.file);
  }

  try {
    setLoading(true);
    setMessage("");
    setObjectionMessage("");
    setObjectionResult(null);

    const response = await submitApplicationObjection(
      objectionForm.application_id.trim(),
      formData
    );

    setObjectionResult(response.data);
    setObjectionMessage("Objection submitted successfully.");

    setObjectionForm({
      application_id: "",
      reason: "",
      description: "",
      file: null,
    });

    await loadApplicantData(user);
  } catch (error) {
    console.log("Submit objection error:", error.response?.data || error);

    setObjectionMessage("");
    setObjectionResult(null);

    setMessage(
      error.response?.data?.detail ||
        "Failed to submit objection. Please check your data."
    );
  } finally {
    setLoading(false);
  }
}
  function logout() {
    localStorage.removeItem("lrmis_user");
    localStorage.removeItem("lrmis_token");
    window.location.href = "/login";
  }

  const applicantName =
    profile?.full_name ||
    user.full_name ||
    user.name ||
    user.email ||
    "Applicant";

  const totalApplications = applications.length;

  const pendingApplications = applications.filter((application) =>
    PENDING_STATES.includes(getApplicationStatus(application))
  ).length;

  const approvedApplications = applications.filter((application) =>
    APPROVED_STATES.includes(getApplicationStatus(application))
  ).length;

  return (
    <div className="applicant-page">
      <aside className="applicant-sidebar">
        <h2>LRMIS</h2>
        <p>Applicant Portal</p>

        <button
          type="button"
          className={`sidebar-nav-item ${
            activeSection === "overview" ? "active" : ""
          }`}
          onClick={() => setActiveSection("overview")}
        >
          Overview
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${
            activeSection === "submit" ? "active" : ""
          }`}
          onClick={() => setActiveSection("submit")}
        >
          Submit Application
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${
            activeSection === "track" ? "active" : ""
          }`}
          onClick={() => setActiveSection("track")}
        >
          Track Application
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${
            activeSection === "documents" ? "active" : ""
          }`}
          onClick={() => setActiveSection("documents")}
        >
          Upload Documents
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${
            activeSection === "objection" ? "active" : ""
          }`}
          onClick={() => setActiveSection("objection")}
        >
          Submit Objection
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${
            activeSection === "applications" ? "active" : ""
          }`}
          onClick={() => setActiveSection("applications")}
        >
          My Applications
        </button>

        <button type="button" className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="applicant-main">
        <div className="applicant-content">
          {activeSection === "overview" && (
            <>
              <section id="overview" className="applicant-header">
                <div>
                  <p className="label">Applicant Workspace</p>
                  <h1>Welcome, {applicantName}</h1>
                  <span>
                    Submit land registration applications, track status, upload
                    required documents, and manage objections.
                  </span>
                </div>
              </section>

              <section className="applicant-stats-grid">
                <div className="applicant-stat-card">
                  <span>Total Applications</span>
                  <strong>{totalApplications}</strong>
                </div>

                <div className="applicant-stat-card">
                  <span>Pending</span>
                  <strong>{pendingApplications}</strong>
                </div>

                <div className="applicant-stat-card">
                  <span>Approved</span>
                  <strong>{approvedApplications}</strong>
                </div>
              </section>

              <section className="portal-flow-grid">
                <button type="button" onClick={() => setActiveSection("submit")}>
                  <span>01</span>
                  <strong>Submit Application</strong>
                  <small>Type, applicant data, parcel, map, and documents.</small>
                </button>

                <button type="button" onClick={() => setActiveSection("track")}>
                  <span>02</span>
                  <strong>Track Status</strong>
                  <small>Timeline, missing documents, notes, and survey state.</small>
                </button>

                <button type="button" onClick={() => setActiveSection("documents")}>
                  <span>03</span>
                  <strong>Upload Documents</strong>
                  <small>Add files and check document review status.</small>
                </button>

                <button type="button" onClick={() => setActiveSection("objection")}>
                  <span>04</span>
                  <strong>Submit Objection</strong>
                  <small>Reason, supporting file, and objection status.</small>
                </button>
              </section>
            </>
          )}

          {message && <div className="applicant-message">{message}</div>}

          {activeSection === "confirmation" && (
            <section id="confirmation" className="applicant-panel">
              <h2>Application Confirmation</h2>
              <p>
                Your land registration application has been submitted
                successfully.
              </p>

              {!lastSubmittedApplication ? (
                <div className="placeholder-box">
                  No recently submitted application found.
                </div>
              ) : (
                <div className="confirmation-card">
                  <div className="confirmation-header">
                    <div>
                      <span>Application ID</span>
                      <strong>
                        {lastSubmittedApplication.application_id ||
                          lastSubmittedApplication._id ||
                          lastSubmittedApplication.id ||
                          "-"}
                      </strong>
                    </div>

                    <span className="application-status">
                      {formatStatus(
                        getApplicationStatus(lastSubmittedApplication)
                      )}
                    </span>
                  </div>

                  <div className="confirmation-grid">
                    <div>
                      <span>Current Status</span>
                      <strong>
                        {formatStatus(
                          getApplicationStatus(lastSubmittedApplication)
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Submitted Date</span>
                      <strong>
                        {formatDate(
                          lastSubmittedApplication.timestamps?.submitted_at ||
                            lastSubmittedApplication.submitted_at ||
                            lastSubmittedApplication.created_at ||
                            lastSubmittedApplication.createdAt
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Required Next Step</span>
                      <strong>
                        {getRequiredNextStep(
                          getApplicationStatus(lastSubmittedApplication)
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Application Type</span>
                      <strong>
                        {getApplicationTypeLabel(
                          lastSubmittedApplication.application_type ||
                            lastSubmittedApplication.tags?.[0]
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Uploaded Documents</span>
                      <strong>
                        {lastSubmittedApplication.uploaded_documents_count || 0}
                      </strong>
                    </div>
                  </div>

                  <div className="confirmation-parcel">
                    <h3>Parcel Information</h3>

                    <div className="confirmation-grid">
                      <div>
                        <span>Parcel Number</span>
                        <strong>
                          {lastSubmittedApplication.parcel_ref?.parcel_number ||
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Block Number</span>
                        <strong>
                          {lastSubmittedApplication.parcel_ref?.block_number ||
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Basin Number</span>
                        <strong>
                          {lastSubmittedApplication.parcel_ref?.basin_number ||
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Zone ID</span>
                        <strong>
                          {lastSubmittedApplication.parcel_ref?.zone_id || "-"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="confirmation-map">
                    <h3>Parcel Location on Map</h3>

                    <MiniParcelMap application={lastSubmittedApplication} />
                  </div>

                  <div className="confirmation-actions">
                    <button
                      type="button"
                      className="primary-action-btn"
                      onClick={() => setActiveSection("documents")}
                    >
                      Upload Required Documents
                    </button>

                    <button
                      type="button"
                      className="secondary-action-btn"
                      onClick={() => setActiveSection("applications")}
                    >
                      View My Applications
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeSection === "submit" && (
            <section id="submit" className="applicant-panel">
              <h2>Submit Land Application</h2>

              <p>
                Complete the required Student 1 flow: application type, applicant
                information, parcel fields, map location, required documents, and
                final submission.
              </p>

              <form
                className="application-form"
                onSubmit={handleCreateApplication}
              >
                <ApplicantInfoSummary profile={profile} user={user} />

                <div className="form-section-card">
                  <div className="section-heading-row">
                    <div>
                      <h3>Application and Parcel Information</h3>
                      <p>Enter the land application type and parcel reference data.</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-row">
                      <label>Application Type</label>
                      <select
                        name="application_type"
                        value={applicationForm.application_type}
                        onChange={handleApplicationChange}
                      >
                        {APPLICATION_TYPES.map((type) => (
                          <option value={type.value} key={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row">
                      <label>Priority</label>
                      <select
                        name="priority"
                        value={applicationForm.priority}
                        onChange={handleApplicationChange}
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <label>Parcel Number</label>
                      <input
                        type="text"
                        name="parcel_number"
                        placeholder="145"
                        value={applicationForm.parcel_number}
                        onChange={handleApplicationChange}
                      />
                    </div>

                    <div className="form-row">
                      <label>Block Number</label>
                      <input
                        type="text"
                        name="block_number"
                        placeholder="12"
                        value={applicationForm.block_number}
                        onChange={handleApplicationChange}
                      />
                    </div>

                    <div className="form-row">
                      <label>Basin Number</label>
                      <input
                        type="text"
                        name="basin_number"
                        placeholder="3"
                        value={applicationForm.basin_number}
                        onChange={handleApplicationChange}
                      />
                    </div>

                    <div className="form-row">
                      <label>Zone ID</label>
                      <input
                        type="text"
                        name="zone_id"
                        placeholder="ZONE-RM-01"
                        value={applicationForm.zone_id}
                        onChange={handleApplicationChange}
                      />
                    </div>

                    <div className="form-row full">
                      <label>Description</label>
                      <textarea
                        name="description"
                        placeholder="Write a short description about this application..."
                        value={applicationForm.description}
                        onChange={handleApplicationChange}
                      />
                    </div>
                  </div>
                </div>

                <ParcelLocationPicker
                  lat={applicationForm.location_lat}
                  lng={applicationForm.location_lng}
                  onSelect={handleLocationSelect}
                />

                <RequiredDocumentsPicker
                  applicationType={applicationForm.application_type}
                  files={applicationDocumentFiles}
                  onFileChange={handleRequiredDocumentFileChange}
                />

                <button
                  type="submit"
                  className="primary-action-btn"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>

                {submitMessage.text && (
                  <div
                    className={
                      submitMessage.type === "success"
                        ? "submit-success-message"
                        : "submit-error-message"
                    }
                    role="status"
                  >
                    {submitMessage.text}
                  </div>
                )}
              </form>
            </section>
          )}

          {activeSection === "track" && (
            <section id="track" className="applicant-panel">
              <h2>Track Application</h2>

              <p>
                Search by application ID to view status timeline, documents,
                registrar notes, and survey status.
              </p>

              <form className="track-box" onSubmit={handleTrackApplication}>
                <input
                  type="text"
                  placeholder="Enter application ID, e.g. LRMIS-2026-0013"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                />

                <button type="submit" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </form>

              {trackMessage && (
                <div className="submit-success-message">{trackMessage}</div>
              )}

              {trackedApplication && (
                <div className="track-results">
                  <div className="track-card">
                    <div className="track-card-header">
                      <div>
                        <span>Application ID</span>
                        <h3>{trackedApplication.application_id || "-"}</h3>
                      </div>

                      <span className="application-status">
                        {formatStatus(getApplicationStatus(trackedApplication))}
                      </span>
                    </div>

                    <div className="track-grid">
                      <div>
                        <span>Current Status</span>
                        <strong>
                          {formatStatus(
                            getApplicationStatus(trackedApplication)
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Submitted Date</span>
                        <strong>
                          {formatDate(
                            trackedApplication.timestamps?.submitted_at ||
                              trackedApplication.submitted_at ||
                              trackedApplication.created_at ||
                              trackedApplication.createdAt
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Required Next Step</span>
                        <strong>
                          {getRequiredNextStep(
                            getApplicationStatus(trackedApplication)
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Application Type</span>
                        <strong>
                          {getApplicationTypeLabel(
                            trackedApplication.application_type ||
                              trackedApplication.tags?.[0]
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="track-card">
                    <h3>Parcel Details</h3>

                    <div className="track-grid">
                      <div>
                        <span>Parcel Number</span>
                        <strong>
                          {trackedApplication.parcel_ref?.parcel_number || "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Block Number</span>
                        <strong>
                          {trackedApplication.parcel_ref?.block_number || "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Basin Number</span>
                        <strong>
                          {trackedApplication.parcel_ref?.basin_number || "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Zone ID</span>
                        <strong>
                          {trackedApplication.parcel_ref?.zone_id || "-"}
                        </strong>
                      </div>
                    </div>

                    <h4 className="track-subtitle">Parcel Location</h4>
                    <MiniParcelMap application={trackedApplication} />
                  </div>

                  <div className="track-card">
                    <h3>Status Timeline</h3>

                    {getVisibleTimelineEvents(trackedTimeline).length === 0 ? (
                      <p className="track-empty">
                        No timeline events available yet.
                      </p>
                    ) : (
                      <div className="timeline-list">
                        {getVisibleTimelineEvents(trackedTimeline).map(
                          (event, index) => (
                            <div
                              className="timeline-item"
                              key={`${event.type}-${event.at}-${index}`}
                            >
                              <div className="timeline-dot" />

                              <div>
                                <strong>{formatTimelineType(event.type)}</strong>
                                <span>{formatDate(event.at)}</span>

                                {event.by?.actor_type && (
                                  <p>By: {event.by.actor_type}</p>
                                )}

                                {event.meta?.note && (
                                  <p>Note: {event.meta.note}</p>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <div className="track-card">
                    <h3>Documents</h3>

                    {trackedApplication.required_documents?.length > 0 ? (
                      <div className="required-documents-list">
                        {trackedApplication.required_documents.map(
                          (doc, index) => (
                            <div
                              className="document-row"
                              key={`${doc.document_type}-${index}`}
                            >
                              <div>
                                <strong>
                                  {formatDocumentType(doc.document_type)}
                                </strong>
                                <span>Required document</span>
                              </div>

                              <span className="document-status">
                                {formatStatus(doc.status || "missing")}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="track-empty">
                        No required document list defined for this application.
                      </p>
                    )}

                    <h4 className="track-subtitle">Uploaded Documents</h4>

                    {trackedDocuments.length === 0 ? (
                      <p className="track-empty">No documents uploaded yet.</p>
                    ) : (
                      <div className="documents-list">
                        {trackedDocuments.map((document) => (
                          <div
                            className="document-row"
                            key={document.document_id || document.file_url}
                          >
                            <div>
                              <strong>
                                {formatDocumentType(document.document_type)}
                              </strong>
                              <span>{document.file_name}</span>
                            </div>

                            <span className="document-status">
                              {formatStatus(document.status)}
                            </span>

                            {document.file_url && (
                              <a
                                href={`${API_URL}${document.file_url}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View File
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="track-card">
                    <h3>Registrar Notes</h3>

                    {getVisibleApplicantNotes(trackedApplication).length ===
                    0 ? (
                      <p className="track-empty">
                        No registrar notes visible to applicant.
                      </p>
                    ) : (
                      <div className="notes-list">
                        {getVisibleApplicantNotes(trackedApplication).map(
                          (note, index) => (
                            <div
                              className="note-item"
                              key={`${note.created_at}-${index}`}
                            >
                              <strong>{note.text}</strong>
                              <span>
                                By {note.author_role || "registrar"} •{" "}
                                {formatDate(note.created_at)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <div className="track-card">
                    <h3>Survey Status</h3>
                    <p className="survey-status-text">
                      {getSurveyStatus(trackedApplication)}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeSection === "documents" && (
            <section id="documents" className="applicant-panel">
              <h2>Upload Additional Documents</h2>

              <p>
                Upload required or supporting documents for an existing
                application.
              </p>

              <form
                className="application-form"
                onSubmit={handleUploadDocument}
              >
                <div className="form-grid">
                  <div className="form-row">
                    <label>Application ID</label>
                    <input
                      type="text"
                      name="application_id"
                      placeholder="LRMIS-2026-0001"
                      value={documentForm.application_id}
                      onChange={handleDocumentChange}
                    />
                  </div>

                  <div className="form-row">
                    <label>Document Type</label>
                    <select
                      name="document_type"
                      value={documentForm.document_type}
                      onChange={handleDocumentChange}
                    >
                      {DOCUMENT_OPTIONS.map((document) => (
                        <option value={document.value} key={document.value}>
                          {document.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row full">
                    <label>Choose File</label>
                    <input
                      type="file"
                      name="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleDocumentFileChange}
                    />
                  </div>

                  <div className="form-row full">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      placeholder="Write optional notes about this document..."
                      value={documentForm.notes}
                      onChange={handleDocumentChange}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-action-btn"
                  disabled={loading}
                >
                  {loading ? "Uploading..." : "Upload Document"}
                </button>

                {documentMessage && (
                  <div className="submit-success-message">
                    {documentMessage}
                  </div>
                )}
              </form>

              <DocumentsStatusPanel
                applications={applications}
                documentsByApplication={documentsByApplication}
                onUploadClick={prepareDocumentUpload}
              />
            </section>
          )}

          {activeSection === "objection" && (
  <section id="objection" className="applicant-panel">
    <h2>Submit Objection</h2>
    <p>
      Submit an objection for an existing application and attach supporting
      documents if needed.
    </p>

    <form className="application-form" onSubmit={handleSubmitObjection}>
      <div className="form-grid">
        <div className="form-row">
          <label>Application ID</label>
          <input
            type="text"
            name="application_id"
            placeholder="LRMIS-2026-0015"
            value={objectionForm.application_id}
            onChange={handleObjectionChange}
          />
        </div>

        <div className="form-row">
          <label>Supporting Document</label>
          <input
            type="file"
            name="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleObjectionFileChange}
          />
        </div>

        <div className="form-row full">
          <label>Objection Reason</label>
          <input
            type="text"
            name="reason"
            placeholder="Ownership documents are incorrect"
            value={objectionForm.reason}
            onChange={handleObjectionChange}
          />
        </div>

        <div className="form-row full">
          <label>Description</label>
          <textarea
            name="description"
            placeholder="Explain the objection details..."
            value={objectionForm.description}
            onChange={handleObjectionChange}
          />
        </div>
      </div>

      <button type="submit" className="primary-action-btn" disabled={loading}>
        {loading ? "Submitting..." : "Submit Objection"}
      </button>

      {objectionMessage && (
        <div className="submit-success-message">
          {objectionMessage}
        </div>
      )}
    </form>

    {objectionResult && (
      <div className="objection-result-card">
        <h3>Objection Status</h3>

        <div className="objection-result-grid">
          <div>
            <span>Objection ID</span>
            <strong>{objectionResult.objection_id || "-"}</strong>
          </div>

          <div>
            <span>Application ID</span>
            <strong>{objectionResult.application_id || "-"}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{formatStatus(objectionResult.status)}</strong>
          </div>

          <div>
            <span>Supporting Documents</span>
            <strong>
              {objectionResult.supporting_documents?.length || 0}
            </strong>
          </div>
        </div>

        {objectionResult.supporting_documents?.length > 0 && (
          <div className="objection-files-list">
            {objectionResult.supporting_documents.map((document, index) => (
              <div className="document-row" key={`${document.file_url}-${index}`}>
                <div>
                  <strong>{document.file_name}</strong>
                  <span>Supporting document</span>
                </div>

                {document.file_url && (
                  <a
                    href={`${API_URL}${document.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View File
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </section>
)}

          {activeSection === "applications" && (
            <section id="applications" className="applicant-panel">
              <h2>My Applications</h2>

              <p>
                This section shows all applications submitted by the current
                applicant.
              </p>

              {loading ? (
                <div className="placeholder-box">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="placeholder-box">
                  No applications found for this applicant yet.
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map((application) => {
                    const applicationId = application.application_id;
                    const documents =
                      documentsByApplication[applicationId] || [];

                    return (
                      <div
                        className="application-card"
                        key={application._id || applicationId}
                      >
                        <div>
                          <h3>{applicationId || "Application"}</h3>
                          <p>
                            Type:{" "}
                            {getApplicationTypeLabel(
                              application.application_type || application.tags?.[0]
                            )}
                          </p>
                        </div>

                        <span className="application-status">
                          {formatStatus(getApplicationStatus(application))}
                        </span>

                        <div className="application-info">
                          <span>
                            Zone: {application.parcel_ref?.zone_id || "-"}
                          </span>
                          <span>
                            Parcel:{" "}
                            {application.parcel_ref?.parcel_number ||
                              application.parcel_number ||
                              "-"}
                          </span>
                          <span>
                            Priority: {application.priority || "normal"}
                          </span>
                        </div>

                        <div className="application-actions-row">
                          <button
                            type="button"
                            className="secondary-action-btn compact"
                            onClick={() => {
                              setTrackId(applicationId || "");
                              setActiveSection("track");
                            }}
                          >
                            Track
                          </button>

                          <button
                            type="button"
                            className="secondary-action-btn compact"
                            onClick={() => prepareDocumentUpload(applicationId)}
                          >
                            Upload Document
                          </button>

                          <button
                            type="button"
                            className="secondary-action-btn compact"
                            onClick={() => {
                              setObjectionForm((previousForm) => ({
                                ...previousForm,
                                application_id: applicationId || "",
                              }));
                              setActiveSection("objection");
                            }}
                          >
                            Object
                          </button>
                        </div>

                        <div className="application-documents">
                          <h4>Uploaded Documents</h4>

                          {documents.length === 0 ? (
                            <p className="no-documents">
                              No documents uploaded yet.
                            </p>
                          ) : (
                            <div className="documents-list">
                              {documents.map((document) => (
                                <div
                                  className="document-row"
                                  key={document.document_id || document.file_url}
                                >
                                  <div>
                                    <strong>
                                      {formatDocumentType(
                                        document.document_type
                                      )}
                                    </strong>
                                    <span>{document.file_name}</span>
                                  </div>

                                  <span className="document-status">
                                    {formatStatus(document.status)}
                                  </span>

                                  {document.file_url && (
                                    <a
                                      href={`${API_URL}${document.file_url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      View File
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default ApplicantDashboard;
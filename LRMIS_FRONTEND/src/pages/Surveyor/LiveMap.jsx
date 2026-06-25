import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import {
  getParcelGeoFeed,
  getPendingHeatmap,
} from "../../api/model3Api";

import "./SurveyorLayout.css";

const DEFAULT_CENTER = [31.9021, 35.2001];

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

function isValidGeometry(geometry) {
  if (!geometry) return false;
  if (!geometry.type) return false;
  if (!geometry.coordinates) return false;
  if (!Array.isArray(geometry.coordinates)) return false;

  const allowedTypes = ["Point", "Polygon", "MultiPolygon", "LineString"];

  return allowedTypes.includes(geometry.type);
}

function extractGeometryFromBrokenObject(geometry) {
  if (!geometry || typeof geometry !== "object") {
    return null;
  }

  if (isValidGeometry(geometry)) {
    return geometry;
  }

  const keys = Object.keys(geometry);

  for (const key of keys) {
    if (!key.includes("parcel_geometry")) {
      continue;
    }

    try {
      const startIndex = key.indexOf("{");
      const endIndex = key.lastIndexOf("}");

      if (startIndex === -1 || endIndex === -1) {
        continue;
      }

      const jsonText = key.slice(startIndex, endIndex + 1);
      const parsed = JSON.parse(jsonText);

      if (parsed.parcel_geometry && isValidGeometry(parsed.parcel_geometry)) {
        return parsed.parcel_geometry;
      }

      if (isValidGeometry(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function toFeature(item) {
  if (!item) return null;

  if (item.type === "Feature") {
    const fixedGeometry = extractGeometryFromBrokenObject(item.geometry);

    if (!fixedGeometry) return null;

    return {
      type: "Feature",
      geometry: fixedGeometry,
      properties: item.properties || {},
    };
  }

  const fixedGeometry = extractGeometryFromBrokenObject(item.geometry);

  if (fixedGeometry) {
    const { geometry, ...rest } = item;

    return {
      type: "Feature",
      geometry: fixedGeometry,
      properties: rest,
    };
  }

  return null;
}

function normalizeGeoJson(data) {
  let payload = data;

  if (data?.data) {
    payload = data.data;
  }

  if (data?.geojson) {
    payload = data.geojson;
  }

  if (payload?.type === "FeatureCollection") {
    return {
      type: "FeatureCollection",
      features: (payload.features || []).map(toFeature).filter(Boolean),
    };
  }

  if (Array.isArray(payload)) {
    return {
      type: "FeatureCollection",
      features: payload.map(toFeature).filter(Boolean),
    };
  }

  if (payload?.features && Array.isArray(payload.features)) {
    return {
      type: "FeatureCollection",
      features: payload.features.map(toFeature).filter(Boolean),
    };
  }

  return {
    type: "FeatureCollection",
    features: [],
  };
}

function getProps(feature) {
  return feature?.properties || {};
}

function getValue(props, keys, fallback = "-") {
  for (const key of keys) {
    if (
      props?.[key] !== undefined &&
      props?.[key] !== null &&
      props?.[key] !== ""
    ) {
      return props[key];
    }
  }

  return fallback;
}

function getUniqueValues(features, keys) {
  const values = features
    .map((feature) => getValue(getProps(feature), keys, ""))
    .filter(Boolean);

  return [...new Set(values)];
}

function getFeatureCenter(feature) {
  const geometry = feature?.geometry;

  if (!isValidGeometry(geometry)) return null;

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates || [];

    if (lat !== undefined && lng !== undefined) {
      return [lat, lng];
    }
  }

  if (geometry.type === "Polygon") {
    const firstPoint = geometry.coordinates?.[0]?.[0];

    if (!firstPoint) return null;

    const [lng, lat] = firstPoint;

    if (lat !== undefined && lng !== undefined) {
      return [lat, lng];
    }
  }

  if (geometry.type === "MultiPolygon") {
    const firstPoint = geometry.coordinates?.[0]?.[0]?.[0];

    if (!firstPoint) return null;

    const [lng, lat] = firstPoint;

    if (lat !== undefined && lng !== undefined) {
      return [lat, lng];
    }
  }

  return null;
}

function getParcelStyle(feature) {
  const props = getProps(feature);

  const disputeState = getValue(props, ["dispute_state"], "none");
  const status = getValue(
    props,
    ["status", "registration_status", "application_status"],
    ""
  );

  if (disputeState !== "none") {
    return {
      color: "#D4537E",
      weight: 2,
      fillColor: "#D4537E",
      fillOpacity: 0.18,
    };
  }

  if (status === "pending" || status === "survey_required") {
    return {
      color: "#D85A30",
      weight: 2,
      fillColor: "#D85A30",
      fillOpacity: 0.16,
    };
  }

  return {
    color: "#2A7F6F",
    weight: 2,
    fillColor: "#2A7F6F",
    fillOpacity: 0.14,
  };
}

function LiveMap() {
  const [parcelsGeoJson, setParcelsGeoJson] = useState({
    type: "FeatureCollection",
    features: [],
  });

  const [heatmapGeoJson, setHeatmapGeoJson] = useState({
    type: "FeatureCollection",
    features: [],
  });

  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMapData();
  }, []);

  async function loadMapData() {
    try {
      setLoading(true);
      setMessage("");

      const [parcelsResponse, heatmapResponse] = await Promise.all([
        getParcelGeoFeed(),
        getPendingHeatmap(),
      ]);

      setParcelsGeoJson(normalizeGeoJson(parcelsResponse.data));
      setHeatmapGeoJson(normalizeGeoJson(heatmapResponse.data));
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to load map data."));
    } finally {
      setLoading(false);
    }
  }

  const allFeatures = useMemo(() => {
    return [
      ...(parcelsGeoJson.features || []),
      ...(heatmapGeoJson.features || []),
    ];
  }, [parcelsGeoJson, heatmapGeoJson]);

  const zones = useMemo(() => {
    return getUniqueValues(allFeatures, ["zone_id", "zone"]);
  }, [allFeatures]);

  const statuses = useMemo(() => {
    return getUniqueValues(allFeatures, [
      "status",
      "registration_status",
      "application_status",
    ]);
  }, [allFeatures]);

  const applicationTypes = useMemo(() => {
    return getUniqueValues(allFeatures, ["application_type", "type"]);
  }, [allFeatures]);

  const filteredParcels = useMemo(() => {
    const features = parcelsGeoJson.features || [];

    return {
      type: "FeatureCollection",
      features: features.filter((feature) => {
        if (!isValidGeometry(feature.geometry)) {
          return false;
        }

        const props = getProps(feature);

        const zone = getValue(props, ["zone_id", "zone"], "");
        const status = getValue(
          props,
          ["status", "registration_status", "application_status"],
          ""
        );
        const type = getValue(props, ["application_type", "type"], "");

        const zoneOk = selectedZone === "all" || zone === selectedZone;
        const statusOk = selectedStatus === "all" || status === selectedStatus;
        const typeOk = selectedType === "all" || type === selectedType;

        return zoneOk && statusOk && typeOk;
      }),
    };
  }, [parcelsGeoJson, selectedZone, selectedStatus, selectedType]);

  const filteredHeatmap = useMemo(() => {
    const features = heatmapGeoJson.features || [];

    return features.filter((feature) => {
      if (!isValidGeometry(feature.geometry)) {
        return false;
      }

      const props = getProps(feature);

      const zone = getValue(props, ["zone_id", "zone"], "");
      const status = getValue(
        props,
        ["status", "registration_status", "application_status"],
        ""
      );
      const type = getValue(props, ["application_type", "type"], "");

      const zoneOk = selectedZone === "all" || zone === selectedZone;
      const statusOk = selectedStatus === "all" || status === selectedStatus;
      const typeOk = selectedType === "all" || type === selectedType;

      return zoneOk && statusOk && typeOk;
    });
  }, [heatmapGeoJson, selectedZone, selectedStatus, selectedType]);

  function onEachParcel(feature, layer) {
    const props = getProps(feature);

    const parcelNumber = getValue(props, ["parcel_number", "parcel_code"]);
    const zone = getValue(props, ["zone_id", "zone"]);
    const status = getValue(props, ["status", "registration_status"]);
    const disputeState = getValue(props, ["dispute_state"], "none");
    const area = getValue(props, ["area_sqm"], "-");

    layer.bindPopup(`
      <strong>Parcel:</strong> ${parcelNumber}<br/>
      <strong>Zone:</strong> ${zone}<br/>
      <strong>Status:</strong> ${status}<br/>
      <strong>Dispute:</strong> ${disputeState}<br/>
      <strong>Area:</strong> ${area} sqm
    `);
  }

  return (
    <>
      <section className="surveyor-page-header">
        <div>
          <p className="surveyor-label">Team 16</p>
          <h1>Live Parcel Map</h1>
        </div>
      </section>

      {message && <div className="message-box">{message}</div>}

      <section className="stats-grid">
        <div className="stat-card">
          <span>Parcel Features</span>
          <strong>{filteredParcels.features.length}</strong>
        </div>

        <div className="stat-card">
          <span>Pending Points</span>
          <strong>{filteredHeatmap.length}</strong>
        </div>

        <div className="stat-card">
          <span>Zones</span>
          <strong>{zones.length}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Map Filters</h2>
            <p>
              Filter parcel and application layers by zone, status, and
              application type.
            </p>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={loadMapData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Map"}
          </button>
        </div>

        <div className="map-filters">
          <div className="form-row">
            <label>Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              <option value="all">All zones</option>

              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All statuses</option>

              {statuses.map((status) => (
                <option key={status} value={status}>
                  {String(status).replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Application Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All types</option>

              {applicationTypes.map((type) => (
                <option key={type} value={type}>
                  {String(type).replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Parcel GeoJSON Layer</h2>
            <p>
              Green areas are normal parcels, orange areas need processing, and
              red areas indicate disputes.
            </p>
          </div>

          <div className="map-legend">
            <span>
              <i className="legend-dot green"></i> Parcel
            </span>

            <span>
              <i className="legend-dot orange"></i> Pending
            </span>

            <span>
              <i className="legend-dot red"></i> Disputed
            </span>
          </div>
        </div>

        <div className="map-shell">
          {loading && <div className="map-loading">Loading map data...</div>}

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={14}
            className="leaflet-map"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredParcels?.type === "FeatureCollection" &&
              filteredParcels.features.length > 0 && (
                <GeoJSON
                  key={`${selectedZone}-${selectedStatus}-${selectedType}-${filteredParcels.features.length}`}
                  data={filteredParcels}
                  style={getParcelStyle}
                  onEachFeature={onEachParcel}
                />
              )}

            {filteredHeatmap.map((feature, index) => {
              const center = getFeatureCenter(feature);
              const props = getProps(feature);

              if (!center) return null;

              return (
                <CircleMarker
                  key={`pending-${index}`}
                  center={center}
                  radius={10}
                  pathOptions={{
                    color: "#D85A30",
                    fillColor: "#D85A30",
                    fillOpacity: 0.45,
                  }}
                >
                  <Popup>
                    <strong>Pending Application</strong>
                    <br />
                    Application: {getValue(props, ["application_id"], "-")}
                    <br />
                    Zone: {getValue(props, ["zone_id", "zone"], "-")}
                    <br />
                    Status:{" "}
                    {getValue(
                      props,
                      ["status", "application_status"],
                      "pending"
                    )}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {filteredParcels.features.length === 0 &&
          filteredHeatmap.length === 0 &&
          !loading && (
            <div className="empty-box map-empty">
              No GeoJSON data found for the selected filters.
            </div>
          )}
      </section>
    </>
  );
}

export default LiveMap;
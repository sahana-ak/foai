import { MapContainer, Marker, Popup, Polyline, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import { Fragment, useEffect, useMemo, useRef } from "react";

const icon = (color) => L.divIcon({
  className: "ambulance-marker-wrap",
  html: `
    <div class="ambulance-marker" style="--marker-color:${color};">
      <svg viewBox="0 0 64 64" aria-label="ambulance marker" role="img">
        <rect x="7" y="18" width="44" height="20" rx="7" fill="#ffffff" stroke="#0d2a3a" stroke-width="2"/>
        <path d="M8 29h42v8H8z" fill="${color}"/>
        <rect x="18" y="9" width="20" height="14" rx="4" fill="#c8e7f1" stroke="#0d2a3a" stroke-width="2"/>
        <path d="M20 11h7v10h-7zM29 11h7v10h-7z" fill="#8fc8d8" opacity="0.75"/>
        <rect x="25" y="4" width="10" height="5" rx="2" fill="#123b4b"/>
        <rect x="11" y="22" width="36" height="7" rx="2" fill="#f6fbfd"/>
        <rect x="24" y="22" width="5" height="13" rx="1" fill="#e63946"/>
        <rect x="20" y="26" width="13" height="5" rx="1" fill="#e63946"/>
        <path d="M15 18v20M48 18v20" stroke="#0d2a3a" stroke-width="1.5" opacity="0.2"/>
        <circle cx="18" cy="41" r="6" fill="#1f303d"/>
        <circle cx="43" cy="41" r="6" fill="#1f303d"/>
        <circle cx="18" cy="41" r="2.8" fill="#edf7fb"/>
        <circle cx="43" cy="41" r="2.8" fill="#edf7fb"/>
        <rect x="29" y="15" width="8" height="3" rx="1.5" fill="#d9eef6"/>
        <rect x="14" y="14" width="6" height="6" rx="2" fill="#f7fbff"/>
      </svg>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -18],
});

const endpointIcon = (color, symbol) => L.divIcon({
  className: "route-endpoint-wrap",
  html: `<span class="route-endpoint" style="--endpoint-color:${color}">${symbol}</span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const locationCoords = {
  Chennai: [13.0827, 80.2707],
  Coimbatore: [11.0168, 76.9558],
  Madurai: [9.9252, 78.1198],
  Trichy: [10.7905, 78.7047],
  Salem: [11.6643, 78.146],
  "CityCare Emergency Center": [13.0827, 80.2707],
  "Government Medical Center": [13.0674, 80.2376],
  "Apollo Response Center": [13.0485, 80.2118],
  "MetroCare Plus": [13.084, 80.2602],
  "LifeLine Hospital": [13.0567, 80.2598],
};

function MapFit({ points }) {
  const map = useMap();
  const hasFit = useRef(false);
  useEffect(() => {
    if (points.length && !hasFit.current) {
      map.fitBounds(points, { padding: [35, 35], maxZoom: 13 });
      hasFit.current = true;
    }
  }, [map, points]);
  return null;
}

export default function MapPanel({ emergencies = [], ambulances = [], hospitals = [], filter = "All" }) {
  const filteredEmergencies = emergencies.filter((item) => {
    const status = String(item.status || "NEW").toUpperCase();
    if (filter === "All") return true;
    if (filter === "Critical") return String(item.severity || "").toUpperCase() === "CRITICAL";
    if (filter === "En Route") return status === "EN ROUTE" || status === "EN_ROUTE";
    if (filter === "Available") return status === "AVAILABLE" || status === "NEW";
    return false;
  });

  const points = useMemo(() => [
    ...filteredEmergencies.map((e) => locationCoords[e.location] || [13.0827, 80.2707]),
    ...ambulances.map((a) => [a.latitude, a.longitude]),
    ...hospitals.map((h) => [h.latitude, h.longitude]),
  ], [filteredEmergencies, ambulances, hospitals]);

  const routeLines = useMemo(() => ambulances
    .filter((a) => a.latitude && a.longitude && a.destination)
    .map((a) => {
      const origin = locationCoords[a.location] || [a.latitude, a.longitude];
      const current = [a.latitude, a.longitude];
      const destination = locationCoords[a.destination] || [a.latitude + 0.02, a.longitude + 0.02];
      return { id: a.id, origin, current, destination };
    }), [ambulances]);

  return <div className="map-wrap">
    <MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom doubleClickZoom dragging zoomControl={false} className="map">
      <ZoomControl position="topright" />
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {routeLines.map((line) => <Fragment key={`route-${line.id}`}>
        <Polyline positions={[line.origin, line.current, line.destination]} pathOptions={{ color: "#ffffff", weight: 5, opacity: 0.75, dashArray: "7 9" }} />
        <Polyline positions={[line.origin, line.current]} pathOptions={{ color: "#23b5a5", weight: 5, opacity: 0.95 }} />
        <Polyline positions={[line.current, line.destination]} pathOptions={{ color: "#f2b84b", weight: 4, opacity: 0.9, dashArray: "8 8" }} />
        <Marker position={line.origin} icon={endpointIcon("#23b5a5", "A")}><Popup>Ambulance starting point</Popup></Marker>
        <Marker position={line.destination} icon={endpointIcon("#3878d9", "H")}><Popup>Hospital destination</Popup></Marker>
      </Fragment>)}
      {filteredEmergencies.map((e) => <Marker key={`e-${e.id}`} position={locationCoords[e.location] || [13.0827, 80.2707]} icon={icon("#ef5350")}><Popup><strong>{e.emergency_type}</strong><br />{e.patient_name} · {e.severity}<br />Score {e.score}</Popup></Marker>)}
      {ambulances.map((a) => {
        const status = String(a.status || "AVAILABLE").toUpperCase();
        const color = status === "AVAILABLE" ? "#23b5a5" : status === "EN ROUTE" || status === "EN_ROUTE" ? "#f2b84b" : status === "AT SCENE" ? "#ef5350" : "#5d9cec";
        return <Marker key={`a-${a.id}`} position={[a.latitude, a.longitude]} icon={icon(color)}><Popup><strong>{a.ambulance_id}</strong><br />{a.status}<br />{a.location} → {a.destination || "Standby"}<br />ETA {a.eta_minutes ? `${a.eta_minutes} min` : "Ready"}</Popup></Marker>;
      })}
      {hospitals.map((h) => <Marker key={`h-${h.id}`} position={[h.latitude, h.longitude]} icon={endpointIcon("#3878d9", "H")}><Popup><strong>{h.hospital_name}</strong><br />ICU {h.icu_beds} · Occupancy {h.occupancy}%</Popup></Marker>)}
    </MapContainer>
  </div>;
}
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { busIcon, pickupIcon } from "../constants";

/* ──────────────────────────────────────────────────
   RouteLine  –  always-visible styled polyline
   Draws a curved line between bus and student.
   No external API dependency — instant & reliable.
   ────────────────────────────────────────────────── */
const ROUTE_STYLE = { color: "#2563eb", weight: 5, opacity: 0.75, dashArray: "10, 6" };

function buildCurvedPath(from, to) {
  if (!from || !to) return [];
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  // Offset the midpoint perpendicular to the line for a subtle curve
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  const offset = Math.sqrt(dLat * dLat + dLng * dLng) * 0.15;
  return [
    [from.lat, from.lng],
    [midLat + dLng * 0.1, midLng - dLat * 0.1 + offset * 0.01],
    [to.lat, to.lng],
  ];
}

/* ──────────────────────────────────────────────────
   MapUpdater  –  pan / fit bounds
   ────────────────────────────────────────────────── */
function MapUpdater({ busLocation, pickupLocation }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!busLocation && !pickupLocation) return;

    const points = [];
    if (busLocation) points.push([busLocation.lat, busLocation.lng]);
    if (pickupLocation) points.push([pickupLocation.lat, pickupLocation.lng]);

    if (points.length === 2 && !hasFitted.current) {
      // First render with both points: fit bounds once
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 0.8 });
      hasFitted.current = true;
    } else if (points.length === 1) {
      map.panTo(points[0], { animate: true, duration: 0.8 });
    }
    // After initial fitBounds, don't keep re-fitting on every GPS tick
    // to avoid janky map jumps while the driver is driving.
  }, [map, busLocation, pickupLocation]);

  // Reset the flag when the student destination changes
  useEffect(() => {
    hasFitted.current = false;
  }, [pickupLocation?.lat, pickupLocation?.lng]);

  return null;
}

/* ──────────────────────────────────────────────────
   DriverMapPanel  –  the main exported component
   ────────────────────────────────────────────────── */
function DriverMapPanel({ busLocation, pickupLocation }) {
  const center = pickupLocation
    ? [pickupLocation.lat, pickupLocation.lng]
    : busLocation
      ? [busLocation.lat, busLocation.lng]
      : [33.595, -7.618];

  const routePath = buildCurvedPath(busLocation, pickupLocation);

  return (
    <section className="driver-map-panel overflow-hidden rounded-[26px] border border-line bg-white shadow-[var(--shadow-panel)]">
      <div className="h-[48vh] min-h-[360px] w-full">
        <MapContainer
          center={center}
          zoom={14}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          <MapUpdater busLocation={busLocation} pickupLocation={pickupLocation} />
          {routePath.length > 0 && <Polyline positions={routePath} pathOptions={ROUTE_STYLE} />}
          {busLocation ? <Marker position={[busLocation.lat, busLocation.lng]} icon={busIcon} /> : null}
          {pickupLocation ? <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon} /> : null}
        </MapContainer>
      </div>
    </section>
  );
}

export default DriverMapPanel;

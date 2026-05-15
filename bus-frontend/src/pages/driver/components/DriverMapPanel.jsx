import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { busIcon, pickupIcon } from "../constants";

/* ──────────────────────────────────────────────────
   OSRM road routing via direct fetch
   ────────────────────────────────────────────────── */
const ROUTE_STYLE = { color: "#2563eb", weight: 5, opacity: 0.85 };
const FALLBACK_STYLE = { color: "#2563eb", weight: 4, opacity: 0.5, dashArray: "10, 6" };
const MIN_MOVE_METERS = 30;
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Decode Google-style encoded polyline (OSRM default)
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/* Hook: fetch OSRM route, returns { path, isRoad } */
function useOsrmRoute(from, to) {
  const [path, setPath] = useState([]);
  const [isRoad, setIsRoad] = useState(false);
  const lastFrom = useRef(null);
  const lastTo = useRef(null);
  const abortRef = useRef(null);

  const fetchRoute = useCallback(async (a, b) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Show straight line immediately while OSRM loads
    setPath([[a.lat, a.lng], [b.lat, b.lng]]);
    setIsRoad(false);

    try {
      const url = `${OSRM_URL}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=polyline`;
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.[0]?.geometry) {
        const decoded = decodePolyline(data.routes[0].geometry);
        setPath(decoded);
        setIsRoad(true);
      }
    } catch {
      // OSRM failed — keep the straight-line fallback
    }
  }, []);

  useEffect(() => {
    if (!from || !to) {
      setPath([]);
      setIsRoad(false);
      lastFrom.current = null;
      lastTo.current = null;
      return;
    }

    const destChanged =
      !lastTo.current ||
      lastTo.current.lat !== to.lat ||
      lastTo.current.lng !== to.lng;
    const driverMoved =
      !lastFrom.current ||
      haversineMeters(lastFrom.current.lat, lastFrom.current.lng, from.lat, from.lng) >= MIN_MOVE_METERS;

    if (destChanged || driverMoved) {
      lastFrom.current = { ...from };
      lastTo.current = { ...to };
      fetchRoute(from, to);
    }
  }, [from?.lat, from?.lng, to?.lat, to?.lng, fetchRoute]);

  // Cleanup abort on unmount
  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  return { path, isRoad };
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
function DriverMapPanelInner({ busLocation, pickupLocation }) {
  const { path, isRoad } = useOsrmRoute(busLocation, pickupLocation);

  return (
    <>
      <MapUpdater busLocation={busLocation} pickupLocation={pickupLocation} />
      {path.length > 1 && (
        <Polyline positions={path} pathOptions={isRoad ? ROUTE_STYLE : FALLBACK_STYLE} />
      )}
      {busLocation ? <Marker position={[busLocation.lat, busLocation.lng]} icon={busIcon} /> : null}
      {pickupLocation ? <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon} /> : null}
    </>
  );
}

function DriverMapPanel({ busLocation, pickupLocation }) {
  const center = pickupLocation
    ? [pickupLocation.lat, pickupLocation.lng]
    : busLocation
      ? [busLocation.lat, busLocation.lng]
      : [33.595, -7.618];

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
          <DriverMapPanelInner busLocation={busLocation} pickupLocation={pickupLocation} />
        </MapContainer>
      </div>
    </section>
  );
}

export default DriverMapPanel;

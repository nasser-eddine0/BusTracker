import { useEffect, useRef } from "react";
import { HiTruck } from "react-icons/hi";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import busMarker from "../../../assets/bus-marker.svg";

const DEFAULT_CENTER = [33.5731, -7.5898];

const busIcon = L.icon({
  iconUrl: busMarker,
  iconSize: [54, 54],
  iconAnchor: [27, 50],
  popupAnchor: [0, -42],
  className: "bus-map-pin",
});

const homeIcon = L.divIcon({
  className: "parent-home-pin",
  html: '<div style="display:grid;place-items:center;width:18px;height:18px;border-radius:9999px;background:#0f172a;border:3px solid #ffffff;box-shadow:0 6px 16px rgba(15,23,42,0.22)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapViewportUpdater({ targetCenter }) {
  const map = useMap();
  const previousCenterRef = useRef(null);

  useEffect(() => {
    if (!targetCenter) return;

    const previousCenter = previousCenterRef.current;
    const hasMoved =
      !previousCenter ||
      Math.abs(previousCenter[0] - targetCenter[0]) > 0.00005 ||
      Math.abs(previousCenter[1] - targetCenter[1]) > 0.00005;

    if (hasMoved) {
      map.flyTo(targetCenter, 14, {
        animate: true,
        duration: 0.8,
      });
      previousCenterRef.current = targetCenter;
    }
  }, [map, targetCenter]);

  return null;
}

function MapTab({ t, busWithLiveLocation, student, distanceToBus, etaMinutes, proximityAlert }) {
  const busPosition = busWithLiveLocation?.location
    ? [busWithLiveLocation.location.lat, busWithLiveLocation.location.lng]
    : null;

  const homePosition = student?.homeLocation
    ? [student.homeLocation.lat, student.homeLocation.lng]
    : null;

  const targetCenter = busPosition || homePosition || DEFAULT_CENTER;

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-main">{t("liveTracking")}</h3>
            <p className="mt-0.5 text-xs text-muted">{t("busPosition")}</p>
          </div>
          <div className={`app-pill ${busPosition ? "!bg-emerald-50 !text-emerald-600" : ""}`}>
            {busPosition ? t("online") : t("offline")}
          </div>
        </div>
        {proximityAlert ? (
          <div className="rounded-[16px] border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm font-semibold text-sky-800">
            {proximityAlert}
          </div>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-[26px] border border-line bg-white shadow-[var(--shadow-panel)]">
        <div className="h-[420px] w-full">
          <MapContainer center={targetCenter} zoom={14} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapViewportUpdater targetCenter={targetCenter} />

            {busPosition ? (
              <Marker position={busPosition} icon={busIcon}>
                <Popup>
                  <div className="map-popup">
                    <strong>{busWithLiveLocation?.name || t("bus")}</strong>
                    <p>{busWithLiveLocation?.routeName || t("routeUndefined")}</p>
                  </div>
                </Popup>
              </Marker>
            ) : null}

            {homePosition ? (
              <Marker position={homePosition} icon={homeIcon}>
                <Popup>
                  <div className="map-popup">
                    <strong>{student?.name || t("student")}</strong>
                    <p>{student?.address || t("addressNotDefined")}</p>
                  </div>
                </Popup>
              </Marker>
            ) : null}
          </MapContainer>
        </div>
      </section>

      {busWithLiveLocation ? (
        <div className="rounded-[20px] border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <HiTruck className="text-lg" />
              </div>
              <div>
                <p className="text-sm font-bold text-main">{busWithLiveLocation.name}</p>
                <p className="text-xs text-muted">{busWithLiveLocation.routeName}</p>
              </div>
            </div>
            {distanceToBus !== null ? (
              <div className="text-right">
                <p className="text-lg font-extrabold text-main">{distanceToBus.toFixed(2)} {t("kmUnit")}</p>
                <p className="text-xs text-muted">~{etaMinutes} {t("minUnit")}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MapTab;

import { useEffect, useMemo, useRef } from "react";
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
      map.flyTo(targetCenter, map.getZoom(), {
        animate: true,
        duration: 0.8,
      });
      previousCenterRef.current = targetCenter;
    }
  }, [map, targetCenter]);

  return null;
}

function AdminGlobalMap({ buses, t, height = 360 }) {
  const liveBuses = useMemo(() => buses.filter((bus) => bus?.location), [buses]);

  const targetCenter = useMemo(() => {
    if (liveBuses.length === 0) return DEFAULT_CENTER;

    const totals = liveBuses.reduce(
      (accumulator, bus) => ({
        lat: accumulator.lat + Number(bus.location.lat),
        lng: accumulator.lng + Number(bus.location.lng),
      }),
      { lat: 0, lng: 0 }
    );

    return [totals.lat / liveBuses.length, totals.lng / liveBuses.length];
  }, [liveBuses]);

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-line bg-card-soft" style={{ height }}>
      <div className="absolute inset-0 app-grid-lines opacity-20" />
      <div className="relative z-10 h-full">
        <MapContainer center={targetCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapViewportUpdater targetCenter={targetCenter} />

          {liveBuses.map((bus) => (
            <Marker
              key={bus.id}
              position={[bus.location.lat, bus.location.lng]}
              icon={busIcon}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{bus.name}</strong>
                  <p>{bus.routeName || t("routeUndefined")}</p>
                  <p>{t("driverLabel")}: {bus.driverName || t("notAssigned")}</p>
                  <p>
                    {t("speed")}: {bus.location?.speed != null ? `${Math.round(bus.location.speed)} km/h` : t("notAvailable")}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default AdminGlobalMap;

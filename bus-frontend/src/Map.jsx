import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { onValue, ref } from "firebase/database";
import { db } from "./firebase";
import busMarker from "./assets/bus-marker.svg";

const DEFAULT_CENTER = [33.5731, -7.5898];
const MOCK_LOCATION_OFFSETS = [
  { lat: 0, lng: 0 },
  { lat: 0.0105, lng: -0.009 },
  { lat: -0.008, lng: 0.012 },
  { lat: 0.014, lng: 0.008 },
  { lat: -0.012, lng: -0.01 },
];

const busIcon = L.icon({
  iconUrl: busMarker,
  iconSize: [54, 54],
  iconAnchor: [27, 50],
  popupAnchor: [0, -42],
  className: "bus-map-pin",
});

function getDistanceInMeters(firstPoint, secondPoint) {
  if (!firstPoint || !secondPoint) return Number.POSITIVE_INFINITY;

  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(secondPoint[0] - firstPoint[0]);
  const longitudeDelta = toRadians(secondPoint[1] - firstPoint[1]);
  const firstLatitude = toRadians(firstPoint[0]);
  const secondLatitude = toRadians(secondPoint[0]);

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function MapViewportUpdater({ targetCenter, zoom = 13 }) {
  const map = useMap();
  const previousCenterRef = useRef(null);

  useEffect(() => {
    if (!targetCenter) return;

    const previousCenter = previousCenterRef.current;
    const distance = getDistanceInMeters(previousCenter, targetCenter);

    if (!previousCenter || distance > 10) {
      map.flyTo(targetCenter, zoom, {
        animate: true,
        duration: 0.8,
      });
      previousCenterRef.current = targetCenter;
    }
  }, [map, targetCenter, zoom]);

  return null;
}

function buildMockLocation(index) {
  const offset = MOCK_LOCATION_OFFSETS[index % MOCK_LOCATION_OFFSETS.length];
  const cycle = Math.floor(index / MOCK_LOCATION_OFFSETS.length);
  const spread = cycle * 0.004;

  return {
    lat: DEFAULT_CENTER[0] + offset.lat + spread,
    lng: DEFAULT_CENTER[1] + offset.lng - spread,
    isMock: true,
  };
}

function MapView({
  buses: busesProp,
  students = {},
  selectedBusId = "",
  height = "100%",
  onlySelectedBus = false,
}) {
  const [liveBuses, setLiveBuses] = useState({});

  useEffect(() => {
    if (busesProp && Object.keys(busesProp).length > 0) {
      return undefined;
    }

    const busesRef = ref(db, "buses");
    const unsubscribe = onValue(busesRef, (snapshot) => {
      setLiveBuses(snapshot.val() || {});
    });

    return () => unsubscribe();
  }, [busesProp]);

  const buses =
    busesProp && Object.keys(busesProp).length > 0 ? busesProp : liveBuses;

  const busEntries = useMemo(() => {
    const entries = Object.entries(buses).map(([busId, bus], index) => [
      busId,
      {
        ...bus,
        location: bus?.location || buildMockLocation(index),
      },
    ]);

    if (!onlySelectedBus || !selectedBusId) {
      return entries;
    }

    return entries.filter(([busId]) => busId === selectedBusId);
  }, [buses, onlySelectedBus, selectedBusId]);

  const targetCenter = useMemo(() => {
    if (selectedBusId && buses[selectedBusId]?.location) {
      return [buses[selectedBusId].location.lat, buses[selectedBusId].location.lng];
    }

    if (busEntries.length > 0) {
      return [busEntries[0][1].location.lat, busEntries[0][1].location.lng];
    }

    return DEFAULT_CENTER;
  }, [busEntries, buses, selectedBusId]);

  const getStudentCount = (busId) => {
    return Object.values(students).filter((student) => student.busId === busId)
      .length;
  };

  return (
    <MapContainer center={targetCenter} zoom={13} style={{ height, width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapViewportUpdater targetCenter={targetCenter} />

      {busEntries.map(([busId, bus]) => (
        <Marker
          key={busId}
          position={[bus.location.lat, bus.location.lng]}
          icon={busIcon}
        >
          <Popup>
            <div className="map-popup">
              <strong>{bus.name || busId.toUpperCase()}</strong>
              <p>{bus.routeName || "Trajet scolaire"}</p>
              <p>Chauffeur : {bus.driverName || "Chauffeur affecte"}</p>
              <p>Eleves : {getStudentCount(busId)}</p>
              {bus.location?.isMock ? <p>Position : mode apercu local</p> : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default MapView;

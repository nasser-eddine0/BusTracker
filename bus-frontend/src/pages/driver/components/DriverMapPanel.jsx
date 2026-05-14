import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import { busIcon, pickupIcon } from "../constants";

function DriverMapPanel({ busLocation, pickupLocation, routeLine }) {
  const center = pickupLocation
    ? [pickupLocation.lat, pickupLocation.lng]
    : busLocation
      ? [busLocation.lat, busLocation.lng]
      : [33.595, -7.618];

  return (
    <section className="overflow-hidden rounded-[26px] border border-line bg-white shadow-[var(--shadow-panel)]">
      <div className="h-[48vh] min-h-[360px] w-full">
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {routeLine.length > 1 ? <Polyline positions={routeLine} pathOptions={{ color: "#2781f6", weight: 5 }} /> : null}
          {busLocation ? <Marker position={[busLocation.lat, busLocation.lng]} icon={busIcon} /> : null}
          {pickupLocation ? <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon} /> : null}
        </MapContainer>
      </div>
    </section>
  );
}

export default DriverMapPanel;

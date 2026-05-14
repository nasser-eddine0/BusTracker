import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { HiLocationMarker, HiMap } from "react-icons/hi";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { confirmStudentLocation } from "../../../api/parent";

// Custom marker icon for the draggable pin
const pinIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

// Default center (Casablanca)
const DEFAULT_CENTER = [33.5731, -7.5898];

/**
 * DraggableMarker component for react-leaflet v5
 */
function DraggableMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onPositionChange([latlng.lat, latlng.lng]);
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={pinIcon}
    />
  );
}

/**
 * ClickToPlace component — user clicks map to reposition the marker
 */
function ClickToPlace({ onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

/**
 * LocationValidationModal
 *
 * Forced modal that opens when student.locationConformee === false.
 * Cannot be closed until a location is confirmed.
 *
 * UI State 1 — Ask if parent is at the registered address
 * UI State 2 — Map picker with draggable marker
 */
export default function LocationValidationModal({ student, onLocationConfirmed }) {
  const [step, setStep] = useState("question"); // "question" | "geolocating" | "map"
  const [isSaving, setIsSaving] = useState(false);
  const [mapPosition, setMapPosition] = useState(DEFAULT_CENTER);

  // When geolocating succeeds, save directly
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setStep("geolocating");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setIsSaving(true);
        try {
          const response = await confirmStudentLocation(student.id, latitude, longitude);
          toast.success("Location confirmed successfully!");
          if (onLocationConfirmed) onLocationConfirmed(response.data.student);
        } catch (error) {
          toast.error(error?.response?.data?.message || "Failed to save location.");
          setStep("question");
        } finally {
          setIsSaving(false);
        }
      },
      (err) => {
        toast.error("Could not get your location. Please pick from the map instead.");
        setStep("map");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [student.id, onLocationConfirmed]);

  // Save from map picker
  const handleConfirmFromMap = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await confirmStudentLocation(student.id, mapPosition[0], mapPosition[1]);
      toast.success("Location confirmed successfully!");
      if (onLocationConfirmed) onLocationConfirmed(response.data.student);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save location.");
    } finally {
      setIsSaving(false);
    }
  }, [student.id, mapPosition, onLocationConfirmed]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#71d9cd]/20">
            <HiLocationMarker className="text-3xl text-[#71d9cd]" />
          </div>
          <h2 className="text-xl font-bold text-white">Confirm Your Location</h2>
          <p className="mt-1 text-sm text-gray-400">
            We need your GPS coordinates to calculate bus proximity alerts.
          </p>
        </div>

        {/* Registered address display */}
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Registered Address
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {student.address || "No address on file"}
          </p>
        </div>

        {/* ── STEP: Question ── */}
        {step === "question" && (
          <div className="space-y-3">
            <p className="text-center text-sm text-gray-300">
              Are you currently at this location?
            </p>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#71d9cd] px-4 py-3 text-sm font-bold text-[#0b1220] transition hover:bg-[#5ec4b8]"
            >
              <HiLocationMarker className="text-lg" />
              Yes, get my current GPS location
            </button>
            <button
              type="button"
              onClick={() => setStep("map")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:border-[#71d9cd]/50 hover:bg-white/10"
            >
              <HiMap className="text-lg" />
              No, let me pick from a map
            </button>
          </div>
        )}

        {/* ── STEP: Geolocating ── */}
        {step === "geolocating" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#71d9cd]/30 border-t-[#71d9cd]" />
            <p className="text-sm text-gray-300">
              {isSaving ? "Saving your location..." : "Acquiring GPS signal..."}
            </p>
          </div>
        )}

        {/* ── STEP: Map picker ── */}
        {step === "map" && (
          <div className="space-y-3">
            <p className="text-center text-xs text-gray-400">
              Tap on the map or drag the pin to your exact location.
            </p>
            <div className="overflow-hidden rounded-xl border border-white/10" style={{ height: 280 }}>
              <MapContainer
                center={mapPosition}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <DraggableMarker
                  position={mapPosition}
                  onPositionChange={setMapPosition}
                />
                <ClickToPlace onPositionChange={setMapPosition} />
              </MapContainer>
            </div>
            <p className="text-center text-xs text-gray-500">
              📍 {mapPosition[0].toFixed(5)}, {mapPosition[1].toFixed(5)}
            </p>
            <button
              type="button"
              onClick={handleConfirmFromMap}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#71d9cd] px-4 py-3 text-sm font-bold text-[#0b1220] transition hover:bg-[#5ec4b8] disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Confirm GPS Location"}
            </button>
            <button
              type="button"
              onClick={() => setStep("question")}
              className="w-full text-center text-xs text-gray-500 hover:text-white transition"
            >
              ← Go back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

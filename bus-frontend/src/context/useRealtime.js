import { useContext, useMemo } from "react";
import { RealtimeContext } from "./RealtimeContextObject";

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error("useRealtime must be used inside RealtimeProvider");
  }

  return context;
}

export function useTripForBus(busId) {
  const { activeTrips } = useRealtime();

  return useMemo(() => {
    if (!busId) return null;

    const match = Object.entries(activeTrips).find(
      ([, trip]) => String(trip?.bus_id) === String(busId) && trip?.status === "in_progress"
    );

    return match ? String(match[0]) : null;
  }, [activeTrips, busId]);
}

export function useActiveTripById(tripId) {
  const { activeTrips } = useRealtime();

  return useMemo(() => {
    if (!tripId) return null;

    return activeTrips[String(tripId)] || null;
  }, [activeTrips, tripId]);
}

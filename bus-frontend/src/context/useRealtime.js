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
  const { activeBuses } = useRealtime();

  return useMemo(() => {
    if (!busId) return null;

    const activeBus = activeBuses?.[String(busId)];

    return activeBus?.trip_id ? String(activeBus.trip_id) : null;
  }, [activeBuses, busId]);
}

export function useActiveTripById(tripId) {
  const { activeTrips } = useRealtime();

  return useMemo(() => {
    if (!tripId) return null;

    return activeTrips[String(tripId)] || null;
  }, [activeTrips, tripId]);
}

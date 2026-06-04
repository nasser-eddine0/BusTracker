import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";

/**
 * Listens to Firebase active_trips and returns the trip ID for a given bus.
 * This lets the parent detect in real-time when a driver starts/ends a trip
 * without needing to refresh the page.
 */
export default function useFirebaseTripForBus(busId) {
  const [tripId, setTripId] = useState(null);
  const effectiveBusId = busId ? String(busId) : null;

  useEffect(() => {
    if (!effectiveBusId) {
      return undefined;
    }

    const unsubscribe = onValue(ref(db, "active_trips"), (snapshot) => {
      const activeTrips = snapshot.val() || {};
      const matchingEntry = Object.entries(activeTrips).find(
        ([, trip]) => String(trip?.bus_id) === effectiveBusId && trip?.status === "in_progress"
      );
      setTripId(matchingEntry ? String(matchingEntry[0]) : null);
    });

    return () => unsubscribe();
  }, [effectiveBusId]);

  return effectiveBusId ? tripId : null;
}

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContextObject";

/**
 * Listens to Firebase active_buses and returns the trip ID for a given bus.
 * This lets the parent detect in real-time when a driver starts/ends a trip
 * without needing to refresh the page.
 */
export default function useFirebaseTripForBus(busId) {
  const { schoolId } = useAuth();
  const [tripId, setTripId] = useState(null);
  const effectiveBusId = busId ? String(busId) : null;

  useEffect(() => {
    if (!schoolId || !effectiveBusId) {
      return undefined;
    }

    const unsubscribe = onValue(ref(db, `active_buses/${schoolId}/${effectiveBusId}`), (snapshot) => {
      const activeBus = snapshot.val() || null;
      setTripId(activeBus?.trip_id ? String(activeBus.trip_id) : null);
    });

    return () => unsubscribe();
  }, [effectiveBusId, schoolId]);

  return schoolId && effectiveBusId ? tripId : null;
}

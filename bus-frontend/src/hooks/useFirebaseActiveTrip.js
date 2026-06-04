import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";

export default function useFirebaseActiveTrip(tripId) {
  const [activeTrip, setActiveTrip] = useState(null);
  const effectiveTripId = tripId || null;

  useEffect(() => {
    if (!effectiveTripId) {
      return undefined;
    }

    const unsubscribe = onValue(ref(db, `active_trips/${effectiveTripId}`), (snapshot) => {
      setActiveTrip(snapshot.val() || null);
    });

    return () => unsubscribe();
  }, [effectiveTripId]);

  return effectiveTripId ? activeTrip : null;
}

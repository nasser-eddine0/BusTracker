import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContextObject";

export default function useFirebaseActiveTrip(tripId) {
  const { schoolId } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const effectiveTripId = tripId || null;

  useEffect(() => {
    if (!schoolId || !effectiveTripId) {
      return undefined;
    }

    const unsubscribe = onValue(ref(db, `active_trips/${schoolId}/${effectiveTripId}`), (snapshot) => {
      setActiveTrip(snapshot.val() || null);
    });

    return () => unsubscribe();
  }, [effectiveTripId, schoolId]);

  return schoolId && effectiveTripId ? activeTrip : null;
}

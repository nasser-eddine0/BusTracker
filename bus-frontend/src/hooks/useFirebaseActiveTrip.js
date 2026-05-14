import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";

export default function useFirebaseActiveTrip(tripId) {
  const [activeTrip, setActiveTrip] = useState(null);

  useEffect(() => {
    if (!tripId) {
      setActiveTrip(null);
      return undefined;
    }

    const unsubscribe = onValue(ref(db, `active_trips/${tripId}`), (snapshot) => {
      setActiveTrip(snapshot.val() || null);
    });

    return () => unsubscribe();
  }, [tripId]);

  return activeTrip;
}

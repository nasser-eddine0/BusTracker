import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContextObject";

export default function useFirebaseActiveTrips() {
  const { schoolId } = useAuth();
  const [activeTrips, setActiveTrips] = useState({});

  useEffect(() => {
    if (!schoolId) {
      setActiveTrips({});
      return undefined;
    }

    const unsubscribe = onValue(ref(db, `active_trips/${schoolId}`), (snapshot) => {
      setActiveTrips(snapshot.val() || {});
    });

    return () => unsubscribe();
  }, [schoolId]);

  return activeTrips;
}

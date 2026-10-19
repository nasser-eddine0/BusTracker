import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContextObject";

export default function useFirebaseBusLocations() {
  const { schoolId } = useAuth();
  const [snapshot, setSnapshot] = useState({ schoolId: null, value: {} });

  useEffect(() => {
    if (!schoolId) {
      return undefined;
    }

    const unsubscribe = onValue(ref(db, `active_trips/${schoolId}`), (snapshot) => {
      const activeTrips = snapshot.val() || {};
      const nextLocations = Object.values(activeTrips).reduce((accumulator, trip) => {
        if (trip?.bus_id && trip?.live_location) {
          accumulator[String(trip.bus_id)] = trip.live_location;
        }
        return accumulator;
      }, {});

      setSnapshot({ schoolId, value: nextLocations });
    });

    return () => unsubscribe();
  }, [schoolId]);

  return snapshot.schoolId === schoolId ? snapshot.value : {};
}

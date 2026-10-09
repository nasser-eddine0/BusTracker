import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContextObject";

export default function useFirebaseBusLocations() {
  const { schoolId } = useAuth();
  const [locations, setLocations] = useState({});

  useEffect(() => {
    if (!schoolId) {
      setLocations({});
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

      setLocations(nextLocations);
    });

    return () => unsubscribe();
  }, [schoolId]);

  return locations;
}

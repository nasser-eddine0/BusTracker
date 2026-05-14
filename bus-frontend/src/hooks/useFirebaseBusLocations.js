import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";

export default function useFirebaseBusLocations() {
  const [locations, setLocations] = useState({});

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "active_trips"), (snapshot) => {
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
  }, []);

  return locations;
}

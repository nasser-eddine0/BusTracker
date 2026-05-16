import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { RealtimeContext } from "./RealtimeContextObject";

export function RealtimeProvider({ children, enabled = true }) {
  const [activeTrips, setActiveTrips] = useState({});

  useEffect(() => {
    if (!enabled) return undefined;

    const unsubscribe = onValue(
      ref(db, "active_trips"),
      (snapshot) => {
        setActiveTrips(snapshot.val() || {});
      },
      () => {
        setActiveTrips({});
      }
    );

    return unsubscribe;
  }, [enabled]);

  const value = useMemo(() => {
    const busLocations = Object.values(activeTrips).reduce((accumulator, trip) => {
      if (trip?.bus_id && trip?.live_location) {
        accumulator[String(trip.bus_id)] = trip.live_location;
      }

      return accumulator;
    }, {});

    return {
      activeTrips,
      busLocations,
    };
  }, [activeTrips]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

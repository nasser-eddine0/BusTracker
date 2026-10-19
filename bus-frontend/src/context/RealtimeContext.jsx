import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { auth, db, onAuthStateChanged } from "../firebase";
import { useAuth } from "./AuthContextObject";
import { RealtimeContext } from "./RealtimeContextObject";
import { subscribeRealtime } from "./subscribeRealtime";

function RealtimeSession({ children, schoolId, userId, enabled }) {
  const [state, setState] = useState({ activeTrips: {}, activeBuses: {}, error: null });

  useEffect(() => {
    let stopData = () => {};
    const stopAuth = onAuthStateChanged(auth, (firebaseUser) => {
      stopData();
      setState({ activeTrips: {}, activeBuses: {}, error: null });
      if (!enabled || !schoolId || String(firebaseUser?.uid) !== String(userId)) return;
      stopData = subscribeRealtime({
        schoolId,
        userId,
        listen: (path, onData, onError) =>
          onValue(ref(db, path), (snapshot) => onData(snapshot.val()), onError),
        onChange: setState,
      });
    });
    return () => {
      stopAuth();
      stopData();
    };
  }, [enabled, schoolId, userId]);

  const value = useMemo(() => ({
    ...state,
    busLocations: Object.values(state.activeTrips).reduce((locations, trip) => {
      if (trip?.bus_id && trip?.live_location) {
        locations[String(trip.bus_id)] = trip.live_location;
      }
      return locations;
    }, {}),
  }), [state]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function RealtimeProvider({ children, enabled = true }) {
  const { schoolId, user } = useAuth();
  return (
    <RealtimeSession
      userId={user?.id}
      schoolId={schoolId}
      enabled={enabled}
    >
      {children}
    </RealtimeSession>
  );
}

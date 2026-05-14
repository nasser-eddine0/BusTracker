import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";

export default function useFirebaseActiveTrips() {
  const [activeTrips, setActiveTrips] = useState({});

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "active_trips"), (snapshot) => {
      setActiveTrips(snapshot.val() || {});
    });

    return () => unsubscribe();
  }, []);

  return activeTrips;
}

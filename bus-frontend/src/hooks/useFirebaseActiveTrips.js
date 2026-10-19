import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContextObject";

export default function useFirebaseActiveTrips() {
  const { schoolId } = useAuth();
  const [snapshot, setSnapshot] = useState({ schoolId: null, value: {} });

  useEffect(() => {
    if (!schoolId) {
      return undefined;
    }

    const unsubscribe = onValue(ref(db, `active_trips/${schoolId}`), (snapshot) => {
      setSnapshot({ schoolId, value: snapshot.val() || {} });
    });

    return () => unsubscribe();
  }, [schoolId]);

  return snapshot.schoolId === schoolId ? snapshot.value : {};
}

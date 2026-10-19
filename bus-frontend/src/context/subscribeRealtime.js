// Non-admins must read individual permitted nodes: RTDB rules are not filters.
export function subscribeRealtime({ schoolId, userId, listen, onChange }) {
  let stopped = false;
  let generation = 0;
  let stops = [];
  let activeTrips = {};
  let activeBuses = {};
  let error = null;
  const publish = () => {
    if (!stopped) onChange({ activeTrips: { ...activeTrips }, activeBuses: { ...activeBuses }, error });
  };
  const reset = () => {
    generation++;
    stops.forEach((stop) => stop());
    stops = [];
    activeTrips = {};
    activeBuses = {};
    error = null;
  };
  const stopMembership = listen(`school_users/${schoolId}/${userId}`, (member) => {
    reset();
    publish();
    if (stopped || member?.active !== true) return;
    const current = generation;
    const valid = () => !stopped && current === generation;
    const fail = (cause) => { error = cause?.code || 'realtime-unavailable'; };

    if (member.role === 'admin') {
      stops.push(listen(`active_trips/${schoolId}`, (data) => {
        if (!valid()) return;
        activeTrips = data || {};
        publish();
      }, (cause) => {
        if (!valid()) return;
        activeTrips = {};
        fail(cause);
        publish();
      }));
      stops.push(listen(`active_buses/${schoolId}`, (data) => {
        if (!valid()) return;
        activeBuses = data || {};
        publish();
      }, (cause) => {
        if (!valid()) return;
        activeBuses = {};
        fail(cause);
        publish();
      }));
      return;
    }
    if (!['driver', 'parent'].includes(member.role)) return;

    for (const [busId, allowed] of Object.entries(member.allowedBusIds || {})) {
      if (allowed !== true) continue;
      let tripId = null;
      let stopTrip = () => {};
      const clearTrip = () => {
        stopTrip();
        stopTrip = () => {};
        if (tripId) delete activeTrips[tripId];
        tripId = null;
      };
      stops.push(() => stopTrip());
      stops.push(listen(`active_buses/${schoolId}/${busId}`, (bus) => {
        if (!valid()) return;
        const nextTripId = bus?.trip_id ? String(bus.trip_id) : null;
        if (tripId !== nextTripId) clearTrip();
        if (bus) activeBuses[busId] = bus;
        else delete activeBuses[busId];
        if (nextTripId && tripId !== nextTripId) {
          tripId = nextTripId;
          stopTrip = listen(`active_trips/${schoolId}/${nextTripId}`, (trip) => {
            if (!valid() || tripId !== nextTripId) return;
            if (trip && String(trip.bus_id) === busId) activeTrips[nextTripId] = trip;
            else delete activeTrips[nextTripId];
            publish();
          }, (cause) => {
            if (!valid() || tripId !== nextTripId) return;
            delete activeTrips[nextTripId];
            fail(cause);
            publish();
          });
        }
        publish();
      }, (cause) => {
        if (!valid()) return;
        clearTrip();
        delete activeBuses[busId];
        fail(cause);
        publish();
      }));
    }
  }, (cause) => {
    reset();
    error = cause?.code || 'realtime-unavailable';
    publish();
  });

  return () => {
    stopped = true;
    stopMembership();
    reset();
  };
}

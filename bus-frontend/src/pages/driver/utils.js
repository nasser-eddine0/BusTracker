export function normalizeStudentStatus(status) {
  if (status === "mounted" || status === "entered" || status === "on-board") return "mounted";
  if (status === "dropped" || status === "dropped-off") return "dropped";
  if (status === "absent") return "absent";
  return "waiting";
}

export function buildStudentRoute(bus, pickup) {
  if (!bus || !pickup) return [];

  return [
    [bus.lat, bus.lng],
    [(bus.lat + pickup.lat) / 2 + 0.0012, (bus.lng + pickup.lng) / 2 - 0.0011],
    [pickup.lat, pickup.lng],
  ];
}

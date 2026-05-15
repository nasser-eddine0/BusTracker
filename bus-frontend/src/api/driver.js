import api from "./axios";

export async function fetchDriverDashboard() {
  const response = await api.get("/driver/dashboard");
  return response.data;
}

export async function fetchDriverNotifications() {
  const response = await api.get("/driver/notifications");
  return response.data.notifications || [];
}

export async function startDriverTrip(busId, payload = {}) {
  const response = await api.post("/driver/trip/start", {
    busId: Number(busId),
    type: payload.type || "pickup",
  });

  return response.data;
}

export async function finalizeDriverTrip(tripId, payload) {
  const response = await api.post(`/trips/${tripId}/finalize`, payload);
  return response.data;
}

export async function updateDriverStudentStatus(studentId, payload) {
  const response = await api.post(`/driver/students/${studentId}/status`, {
    busId: Number(payload.busId),
    status: payload.status,
  });

  return response.data;
}

export async function pingDriverLocation(tripId, latitude, longitude, currentTargetId) {
  const response = await api.post("/driver/trip/ping-location", {
    tripId: Number(tripId),
    latitude,
    longitude,
    currentTargetId: currentTargetId ? Number(currentTargetId) : null,
  });

  return response.data;
}

export async function nudgeParent(tripId, studentId) {
  const response = await api.post("/driver/trip/nudge-parent", {
    tripId: Number(tripId),
    studentId: Number(studentId),
  });

  return response.data;
}

export async function markDriverNotificationsRead() {
  const response = await api.post("/driver/notifications/mark-read");
  return response.data;
}

import api from "./axios";

export async function fetchDriverDashboard() {
  const response = await api.get("/driver/dashboard");
  return response.data;
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

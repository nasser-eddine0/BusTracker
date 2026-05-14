import api from "./axios";

export async function fetchParentDashboard() {
  const response = await api.get("/parent/dashboard");
  return response.data;
}

export async function declareParentAbsence(studentId) {
  return api.post("/parent/absence", { studentId: Number(studentId) });
}

export async function fetchParentNotifications() {
  const response = await api.get("/parent/notifications");
  return response.data.notifications || [];
}

export async function linkParentChild(regCode) {
  return api.post("/parent/link-child", { reg_code: regCode });
}

export async function confirmStudentLocation(studentId, latitude, longitude) {
  return api.post("/parent/confirm-location", {
    student_id: Number(studentId),
    latitude,
    longitude,
  });
}

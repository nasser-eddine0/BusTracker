import api from "./axios";

export async function fetchAdminBootstrap() {
  const response = await api.get("/admin/bootstrap");
  return response.data;
}

export async function createAdminUser(payload) {
  return api.post("/admin/users", payload);
}

export async function updateAdminUser(userId, payload) {
  return api.put(`/admin/users/${userId}`, payload);
}

export async function disableAdminUser(userId) {
  return api.post(`/admin/users/${userId}/disable`);
}

export async function deleteAdminUser(userId) {
  return api.delete(`/admin/users/${userId}`);
}

export async function createAdminStudent(payload) {
  return api.post("/admin/students", payload);
}

export async function updateAdminStudent(studentId, payload) {
  return api.put(`/admin/students/${studentId}`, payload);
}

export async function importPreviewStudents(rows) {
  return api.post("/admin/students/import-preview", { rows });
}

export async function createAdminBus(payload) {
  return api.post("/admin/buses", payload);
}

export async function updateAdminBus(busId, payload) {
  return api.put(`/admin/buses/${busId}`, payload);
}

export async function updateAssignments(studentIds, busId) {
  return api.post("/admin/assignments", {
    studentIds: studentIds.map((id) => Number(id)),
    busId: busId ? Number(busId) : null,
  });
}

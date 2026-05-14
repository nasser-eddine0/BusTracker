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

export async function deleteAdminStudent(studentId) {
  return api.delete(`/admin/students/${studentId}`);
}

export async function bulkDeleteAdminStudents(studentIds) {
  return api.post("/admin/students/bulk-delete", { studentIds });
}

export async function importPreviewStudents(rows) {
  return api.post("/admin/students/import-preview", { rows });
}

export async function parseImportHeaders(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/admin/students/parse-import-headers", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function finalizeImport(temporaryFilePath, mapping) {
  return api.post("/admin/students/finalize-import", {
    temporary_file_path: temporaryFilePath,
    mapping,
  });
}

export async function createAdminBus(payload) {
  return api.post("/admin/buses", payload);
}

export async function updateAdminBus(busId, payload) {
  return api.put(`/admin/buses/${busId}`, payload);
}

export async function deleteAdminBus(busId) {
  return api.delete(`/admin/buses/${busId}`);
}

export async function bulkDeleteAdminUsers(userIds) {
  return api.post("/admin/users/bulk-delete", { userIds: userIds.map((id) => Number(id)) });
}

export async function bulkDeleteAdminBuses(busIds) {
  return api.post("/admin/buses/bulk-delete", { busIds: busIds.map((id) => Number(id)) });
}

export async function updateAssignments(studentIds, busId) {
  return api.post("/admin/assignments", {
    studentIds: studentIds.map((id) => Number(id)),
    busId: busId ? Number(busId) : null,
  });
}

import api from "./axios";

export async function sendChatMessage(payload) {
  const response = await api.post("/chat", payload);
  return response.data;
}

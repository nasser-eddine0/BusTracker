import { useEffect } from "react";

function getSocketUrl() {
  const configuredUrl = import.meta.env.VITE_NOTIFICATIONS_WS_URL?.trim();
  return configuredUrl || null;
}

export default function useNotificationSocket({ enabled = true, onNotification }) {
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socketUrl = getSocketUrl();
    if (!enabled || !token || typeof onNotification !== "function" || !socketUrl) return undefined;

    const socket = new WebSocket(socketUrl);
    let isCancelled = false;

    socket.addEventListener("open", () => {
      if (isCancelled) {
        socket.close();
        return;
      }

      socket.send(
        JSON.stringify({
          type: "auth",
          token,
        })
      );
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "notification" && message.notification) {
          onNotification(message.notification);
        }
      } catch {
        // ignore malformed frames
      }
    });

    socket.addEventListener("error", () => {
      // Silence transport-level noise here; the app can continue without live notifications.
    });

    return () => {
      isCancelled = true;

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [enabled, onNotification]);
}

import { useEffect } from "react";

function getSocketUrl() {
  return import.meta.env.VITE_NOTIFICATIONS_WS_URL || `ws://${window.location.hostname}:8081`;
}

export default function useNotificationSocket({ enabled = true, onNotification }) {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!enabled || !token || typeof onNotification !== "function") return undefined;

    const socket = new WebSocket(getSocketUrl());
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

      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [enabled, onNotification]);
}

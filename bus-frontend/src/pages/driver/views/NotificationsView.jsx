import { useEffect } from "react";
import NotificationItem from "../../../components/ui/NotificationItem";

function NotificationsView({ t, driverEvents, onMarkRead }) {
  // Mark all as read when this view opens
  useEffect(() => {
    if (onMarkRead && driverEvents.some((e) => e.read === false)) {
      onMarkRead();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = driverEvents.filter((e) => e.read === false).length;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-main">{t("notifications")}</h2>
          <div className="app-pill">
            {unreadCount > 0 ? `${unreadCount} ${t("newOnes") || t("unread")}` : t("upToDate")}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {driverEvents.length
          ? driverEvents.map((event) => (
              <NotificationItem
                key={event.id}
                title={event.title}
                helper={event.helper}
                tone={event.read === false ? "success" : "info"}
                read={event.read}
                createdAt={event.createdAt}
              />
            ))
          : <div className="rounded-[20px] border border-line bg-white p-5 text-center text-sm text-muted">{t("noNotifications")}</div>}
      </div>
    </div>
  );
}

export default NotificationsView;

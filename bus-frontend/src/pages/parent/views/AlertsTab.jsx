import { useEffect } from "react";
import NotificationItem from "../../../components/ui/NotificationItem";

function AlertsTab({ t, unreadCount, notificationFeed, onMarkRead }) {
  // Mark all as read when this tab opens
  useEffect(() => {
    if (onMarkRead && unreadCount > 0) {
      onMarkRead();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-line bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-main">{t("notificationCenter")}</h3>
            <p className="mt-0.5 text-xs text-muted">{t("remindersUpdates")}</p>
          </div>
          <div className="app-pill">
            {unreadCount > 0 ? `${unreadCount} ${t("newOnes")}` : t("upToDate")}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {notificationFeed.map((item) => (
          <NotificationItem key={item.id} {...item} />
        ))}
      </div>
    </div>
  );
}

export default AlertsTab;

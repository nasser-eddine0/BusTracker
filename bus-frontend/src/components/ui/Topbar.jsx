import { HiBell, HiOutlineSearch, HiUserCircle } from "react-icons/hi";
import { HiArrowRightOnRectangle, HiCog6Tooth } from "react-icons/hi2";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage, LangSwitcher } from "../../i18n";
import NotificationItem from "./NotificationItem";

function Topbar({ title, notifications = [] }) {
  const { signOut, user } = useAuth();
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((item) => item.read === false).length;

  const notificationFeed = useMemo(() => {
    return notifications.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title || item.message || t("notificationDefault"),
      helper: item.message || item.studentName || item.busName || t("realtimeUpdate"),
      tone: item.type === "absence_declared" ? "danger" : item.type === "trip_started" ? "success" : "info",
    }));
  }, [notifications, t]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(t("logout"));
      window.location.replace("/signin");
    } catch {
      toast.error(t("saveError"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] border border-line bg-white shadow-[var(--shadow-soft)] sm:flex">
            <img src="/logo.png" alt="BusTracker logo" className="h-10 w-10 object-contain" />
          </div>
          <div>
            {title ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted">{title}</p> : null}
            <h1 className="text-2xl font-extrabold tracking-tight text-main">{t("opsDashboard")}</h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-14 w-full items-center gap-3 rounded-full border border-line bg-card-soft px-5 text-muted sm:w-[330px]">
          <HiOutlineSearch className="text-lg" />
          <input className="w-full bg-transparent text-sm outline-none" placeholder={t("searchPlaceholder")} />
        </label>

          <div className="flex items-center gap-2 text-main">
            <div className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-main">
              <HiUserCircle className="text-xl text-muted" />
              <span>{user?.name || t("signIn")}</span>
            </div>
            <LangSwitcher />
            <button
              type="button"
              aria-label={t("settings")}
              className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-muted transition hover:bg-accent-soft hover:text-main"
            >
              <HiCog6Tooth className="text-lg" />
            </button>
            <button
              type="button"
              aria-label={t("notifications")}
              onClick={() => setShowNotifications((current) => !current)}
              className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-muted transition hover:bg-accent-soft hover:text-main"
            >
              <div className="relative">
                <HiBell className="text-lg" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                    {Math.min(unreadCount, 9)}
                  </span>
                ) : null}
              </div>
            </button>
            <button
              type="button"
              aria-label={t("logout")}
              onClick={handleLogout}
              className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-muted transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <HiArrowRightOnRectangle className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {showNotifications ? (
        <div className="rounded-[24px] border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-main">{t("notifications")}</p>
              <p className="text-sm text-muted">{t("liveStream")}</p>
            </div>
            <div className="app-pill">{unreadCount > 0 ? `${unreadCount} ${t("unread")}` : t("upToDate")}</div>
          </div>
          <div className="space-y-3">
            {notificationFeed.length ? (
              notificationFeed.map((item) => <NotificationItem key={item.id} {...item} />)
            ) : (
              <div className="rounded-[20px] border border-line bg-card-soft px-4 py-4 text-sm text-muted">
                {t("noNotifications")}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Topbar;

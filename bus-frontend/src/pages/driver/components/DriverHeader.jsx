import { HiBell } from "react-icons/hi";
import { HiArrowRightOnRectangle } from "react-icons/hi2";

function DriverHeader({ driverName, busName, onLogout, notifCount, onNotifClick }) {
  return (
    <header className="flex items-center justify-between rounded-[24px] border border-line bg-white px-5 py-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)]">
          <img src="/logo.png" alt="BusTracker logo" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-main">{driverName}</p>
          <p className="text-xs font-semibold text-muted">{busName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNotifClick}
          className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:bg-accent-soft hover:text-main"
        >
          <HiBell className="text-lg" />
          {notifCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
              {Math.min(notifCount, 9)}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <HiArrowRightOnRectangle className="text-lg" />
        </button>
      </div>
    </header>
  );
}

export default DriverHeader;

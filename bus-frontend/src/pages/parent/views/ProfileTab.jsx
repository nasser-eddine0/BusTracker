import { HiArrowRightOnRectangle } from "react-icons/hi2";

function ProfileTab({ t, user, student, busWithLiveLocation, statusConfig, handleLogout }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-amber-400 text-2xl font-extrabold text-slate-900 shadow-lg">
            {user?.name?.charAt(0)?.toUpperCase() || "P"}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-main">{user?.name || t("parent")}</h2>
            <p className="text-sm text-muted">{user?.email || ""}</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t("activeAccount")}
            </div>
          </div>
        </div>
      </div>

      {student ? (
        <div className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted">{t("linkedChild")}</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-[16px] bg-card-soft px-4 py-3">
              <span className="text-sm text-muted">{t("name")}</span>
              <span className="text-sm font-bold text-main">{student.name}</span>
            </div>
            <div className="flex items-center justify-between rounded-[16px] bg-card-soft px-4 py-3">
              <span className="text-sm text-muted">{t("grade")}</span>
              <span className="text-sm font-bold text-main">{student.grade || t("noValue")}</span>
            </div>
            <div className="flex items-center justify-between rounded-[16px] bg-card-soft px-4 py-3">
              <span className="text-sm text-muted">{t("tripStatusLabel")}</span>
              <span className="text-sm font-bold text-main">{statusConfig.text}</span>
            </div>
            <div className="flex items-center justify-between rounded-[16px] bg-card-soft px-4 py-3">
              <span className="text-sm text-muted">{t("bus")}</span>
              <span className="text-sm font-bold text-main">{busWithLiveLocation?.name || t("notAssigned")}</span>
            </div>
            <div className="flex items-center justify-between rounded-[16px] bg-card-soft px-4 py-3">
              <span className="text-sm text-muted">{t("route")}</span>
              <span className="text-sm font-bold text-main">{busWithLiveLocation?.routeName || t("noValue")}</span>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-600 transition active:scale-[0.97]"
      >
        <HiArrowRightOnRectangle className="text-lg" />
        {t("signOutBtn")}
      </button>
    </div>
  );
}

export default ProfileTab;

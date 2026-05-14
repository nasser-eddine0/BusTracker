function ProfileView({ t, user, busLive, routeStudents, tripStarted, tripCompleted, mountedCount, absentCount }) {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-amber-400 text-2xl font-extrabold text-slate-900 shadow-lg">
            {user?.name?.charAt(0)?.toUpperCase() || "D"}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-main">{user?.name || t("driver")}</h2>
            <p className="text-sm text-muted">{user?.email || ""}</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t("active")}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">{t("info")}</h3>
        {[
          [t("assignedBus"), busLive?.name || t("notAssigned")],
          [t("route"), busLive?.routeName || t("noValue")],
          [t("assignedStudents"), routeStudents.length],
          [t("tripStatusLabel"), tripStarted ? t("inProgress") : tripCompleted ? t("completed") : t("notStarted")],
          [t("mounted"), mountedCount],
          [t("absentLabel"), absentCount],
        ].map(([label, value]) => (
          <div key={label} className="mb-2 flex items-center justify-between rounded-[16px] bg-card-soft px-4 py-3 last:mb-0">
            <span className="text-sm text-muted">{label}</span>
            <span className="text-sm font-bold text-main">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileView;

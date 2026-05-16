import { Cell, Pie, PieChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PanelCard from "../../../components/ui/PanelCard";
import { useLanguage } from "../../../i18n";

function AnalyticsView({ durationSeries, attendanceRate, alertsLog }) {
  const { t } = useLanguage();
  const totalAttendance = attendanceRate.reduce((sum, entry) => sum + entry.value, 0);

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (!percent || percent < 0.05) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    return (
      <text x={x} y={y} fill="#0f172a" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={800}>
        {`${Math.round(percent * 100)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <PanelCard className="space-y-4">
          <h3 className="text-lg font-extrabold text-main">{t("averageTripDurations")}</h3>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationSeries} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8dee8" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} unit=" min" />
                <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
                <Legend />
                <Bar dataKey="aller" name="Aller" radius={[10, 10, 0, 0]} fill="#0ea5e9" />
                <Bar dataKey="retour" name="Retour" radius={[10, 10, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard className="space-y-4">
          <h3 className="text-lg font-extrabold text-main">{t("dailyAttendanceRate")}</h3>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceRate}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={108}
                    paddingAngle={3}
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {attendanceRate.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, t("countLabel")]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{t("totalLabel")}</p>
                  <p className="mt-1 text-3xl font-extrabold text-main">{totalAttendance}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {attendanceRate.map((entry) => {
                const percent = totalAttendance ? Math.round((entry.value / totalAttendance) * 100) : 0;
                return (
                  <div key={entry.name} className="rounded-[18px] bg-card-soft p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <p className="text-sm font-bold text-main">{entry.name}</p>
                      </div>
                      <p className="text-sm font-extrabold text-main">{percent}%</p>
                    </div>
                    <p className="mt-2 text-xs text-muted">{entry.value} {t("studentsLabel")}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard className="space-y-4">
        <h3 className="text-lg font-extrabold text-main">{t("alertsLog")}</h3>
        <div className="overflow-hidden rounded-[22px] border border-line">
          <div className="grid grid-cols-[1fr_1fr_0.7fr_1fr] gap-4 bg-card-soft px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">
            <span>Parent</span>
            <span>Élève</span>
            <span>Nb. Nudge</span>
            <span>Dernier signal</span>
          </div>
          <div className="divide-y divide-line bg-white">
            {alertsLog.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_1fr_0.7fr_1fr] gap-4 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-main">{entry.parentName}</p>
                  <p className="mt-1 text-xs text-muted">{entry.channel}</p>
                </div>
                <div>
                  <p className="text-sm text-main">{entry.childName}</p>
                </div>
                <div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    {entry.totalNudges}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.latestAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PanelCard>
    </div>
  );
}

export default AnalyticsView;

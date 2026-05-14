import PanelCard from "./PanelCard";
import MapView from "../../Map";
import { useLanguage } from "../../i18n";

function MapCard({
  title,
  description,
  buses = {},
  students = {},
  selectedBusId = "",
  onlySelectedBus = false,
  height = 320,
  footer,
}) {
  const hasLiveBuses = Object.values(buses).some((bus) => bus?.location);
  const hasBusData = Object.keys(buses).length > 0;
  const { t } = useLanguage();

  return (
    <PanelCard className="space-y-5">
      {(title || description) && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            {title && <h3 className="text-2xl font-extrabold tracking-tight text-main">{title}</h3>}
            {description && <p className="text-sm leading-6 text-muted">{description}</p>}
          </div>
          <div className="app-pill">{hasLiveBuses ? t("liveLabel") : t("preview")}</div>
        </div>
      )}

      <div
        className="relative overflow-hidden rounded-[26px] border border-line bg-card-soft"
        style={{ height }}
      >
        <div className="absolute inset-0 app-grid-lines opacity-20" />
        {hasLiveBuses || hasBusData ? (
          <div className="relative z-10 h-full">
            <MapView
              buses={buses}
              students={students}
              selectedBusId={selectedBusId}
              onlySelectedBus={onlySelectedBus}
              height="100%"
            />
          </div>
        ) : (
          <div className="relative z-10 flex h-full flex-col items-start justify-between p-5">
            <div className="h-3 w-3 rounded-full bg-accent shadow-[0_0_0_10px_rgba(244,197,66,0.18)]" />
            <div className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-slate-950 shadow-[var(--shadow-accent)]">
              {t("busSampleStatus")}
            </div>
            <div className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-main">
              {t("mapFleetView")}
            </div>
          </div>
        )}
      </div>

      {footer && <div>{footer}</div>}
    </PanelCard>
  );
}

export default MapCard;

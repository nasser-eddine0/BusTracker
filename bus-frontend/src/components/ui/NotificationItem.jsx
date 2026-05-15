import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXCircle,
} from "react-icons/hi2";

const toneMap = {
  success: {
    icon: HiCheckCircle,
    card: "bg-accent-soft text-main",
    iconBg: "bg-accent-light text-accent",
  },
  warning: {
    icon: HiExclamationTriangle,
    card: "bg-accent-soft text-main",
    iconBg: "bg-accent-light text-accent",
  },
  danger: {
    icon: HiXCircle,
    card: "bg-rose-50 text-main",
    iconBg: "bg-rose-100 text-rose-500",
  },
  info: {
    icon: HiInformationCircle,
    card: "bg-card-soft text-main",
    iconBg: "bg-accent-soft text-accent",
  },
};

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "الآن";
    if (diffMin < 60) return `${diffMin} د`;
    if (diffHour < 24) return `${diffHour} س`;
    if (diffDay < 7) return `${diffDay} ي`;

    return date.toLocaleDateString("ar-MA", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function NotificationItem({ title, helper, tone = "info", createdAt, read }) {
  const { icon: Icon, card, iconBg } = toneMap[tone] || toneMap.info;
  const timeLabel = formatTimeAgo(createdAt);
  const isUnread = read === false;

  return (
    <div className={`relative flex items-start gap-4 rounded-[22px] border border-line p-4 ${card}`}>
      {isUnread ? (
        <div className="absolute left-2.5 top-2.5 h-2 w-2 rounded-full bg-sky-500" />
      ) : null}
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${iconBg}`}>
        <Icon className="text-lg" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold text-main ${isUnread ? "font-extrabold" : ""}`}>{title}</p>
          {timeLabel ? (
            <span className="shrink-0 text-[11px] text-muted">{timeLabel}</span>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-muted">{helper}</p>
      </div>
    </div>
  );
}

export default NotificationItem;

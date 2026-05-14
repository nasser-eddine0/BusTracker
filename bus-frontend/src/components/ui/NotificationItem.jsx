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

function NotificationItem({ title, helper, tone = "info" }) {
  const { icon: Icon, card, iconBg } = toneMap[tone] || toneMap.info;

  return (
    <div className={`flex items-start gap-4 rounded-[22px] border border-line p-4 ${card}`}>
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${iconBg}`}>
        <Icon className="text-lg" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-main">{title}</p>
        <p className="text-sm leading-6 text-muted">{helper}</p>
      </div>
    </div>
  );
}

export default NotificationItem;

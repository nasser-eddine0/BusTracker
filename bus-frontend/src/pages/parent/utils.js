import { HiCheckCircle, HiTruck, HiXCircle } from "react-icons/hi";
import { HiSignal } from "react-icons/hi2";

export function getDistanceInKilometers(firstPoint, secondPoint) {
  if (!firstPoint || !secondPoint) return null;

  const earthRadius = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(secondPoint.lat - firstPoint.lat);
  const longitudeDelta = toRadians(secondPoint.lng - firstPoint.lng);
  const firstLatitude = toRadians(firstPoint.lat);
  const secondLatitude = toRadians(secondPoint.lat);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

export function getStatusConfig(studentStatus, t, hasActiveTrip = false) {
  if (studentStatus === "entered" || studentStatus === "mounted") {
    return { text: t("inBus"), color: "bg-emerald-500", textColor: "text-white", icon: HiTruck, pulse: true };
  }
  if (studentStatus === "dropped") {
    return { text: t("arrivedSchool"), color: "bg-accent", textColor: "text-slate-900", icon: HiCheckCircle, pulse: false };
  }
  if (studentStatus === "absent") {
    return { text: t("absentToday"), color: "bg-rose-500", textColor: "text-white", icon: HiXCircle, pulse: false };
  }
  if (studentStatus === "waiting") {
    if (hasActiveTrip) {
      return { text: t("busApproaching"), color: "bg-sky-500", textColor: "text-white", icon: HiSignal, pulse: true };
    }
    return { text: t("waitingForBus") || t("waiting"), color: "bg-slate-400", textColor: "text-white", icon: HiSignal, pulse: false };
  }

  // null/undefined = page is still loading, show neutral placeholder
  if (!studentStatus) {
    return { text: "...", color: "bg-slate-300", textColor: "text-white", icon: HiSignal, pulse: false };
  }

  return { text: t("busApproaching"), color: "bg-sky-500", textColor: "text-white", icon: HiSignal, pulse: true };
}

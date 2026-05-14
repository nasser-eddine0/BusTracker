import L from "leaflet";
import { HiBell, HiHome, HiLocationMarker } from "react-icons/hi";
import { HiUserCircle } from "react-icons/hi2";

export const busIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:22px;height:22px;border-radius:6px;background:#F4C542;border:2px solid #111827;box-shadow:0 8px 18px rgba(15,23,42,.24)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export const pickupIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:18px;height:18px;border-radius:999px;background:#22c55e;border:2px solid #ffffff;box-shadow:0 8px 18px rgba(15,23,42,.24)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function buildDriverNavigation(t) {
  return [{
    label: t("driver"),
    items: [
      { to: "/driver/trip", label: t("pickup"), helper: t("pickupRunning"), icon: HiHome },
      { to: "/driver/profile", label: t("profile"), helper: t("info"), icon: HiUserCircle },
      { to: "/driver/map", label: t("map"), helper: t("bus"), icon: HiLocationMarker },
      { to: "/driver/notifications", label: t("notifications"), helper: t("alertsTab"), icon: HiBell },
    ],
  }];
}

export function buildAdminNavigation(t, icons) {
  const { HiHome, HiUsers, HiDatabase, HiTruck, HiUserGroup, HiClipboardDocumentList, HiSparkles } = icons;

  return [{
    label: t("administration"),
    items: [
      { to: "/admin/dashboard", label: t("dashboard"), helper: t("realtime"), icon: HiHome },
      { to: "/admin/users", label: t("userManagement"), helper: t("adminsAccounts"), icon: HiUsers },
      { to: "/admin/import", label: t("dataCenter"), helper: t("importStudents"), icon: HiDatabase },
      { to: "/admin/fleet", label: t("fleetBuses"), helper: t("busAndDrivers"), icon: HiTruck },
      { to: "/admin/assignments", label: t("students"), helper: t("chooseBus"), icon: HiUserGroup },
      { to: "/admin/reports", label: t("reports"), helper: t("attendance"), icon: HiClipboardDocumentList },
    ],
  }];
}

export function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesSmartSearch(query, fields) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchValue(fields.filter(Boolean).join(" "));
  return normalizedQuery.split(/\s+/).every((token) => haystack.includes(token));
}

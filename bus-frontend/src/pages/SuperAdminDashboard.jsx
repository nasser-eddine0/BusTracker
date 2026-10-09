import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiActivity,
  FiCreditCard,
  FiEdit2,
  FiFileText,
  FiGrid,
  FiLock,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import ActionButton from "../components/ui/ActionButton";
import PanelCard from "../components/ui/PanelCard";
import SectionHeader from "../components/ui/SectionHeader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContextObject";

const emptySchoolForm = {
  name: "",
  subdomain: "",
  max_buses: 10,
  primary_color: "#facc15",
};

const emptyAdminForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

const emptyAuditFilters = {
  action: "",
  school_id: "",
  user_id: "",
  date_from: "",
  date_to: "",
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: FiGrid },
  { id: "schools", label: "Schools", icon: FiActivity },
  { id: "billing", label: "Billing", icon: FiCreditCard },
  { id: "audit", label: "Audit Logs", icon: FiFileText },
  { id: "users", label: "Users", icon: FiUsers },
  { id: "security", label: "Security", icon: FiShield },
  { id: "settings", label: "Settings", icon: FiSettings },
];

function normalizeSchool(school) {
  return {
    ...school,
    max_buses: Number(school.max_buses ?? 0),
    admin_count: Number(school.admin_count ?? 0),
    is_active: Boolean(school.is_active),
    subscription_status: school.subscription_status || "inactive",
  };
}

function severityClass(severity) {
  if (severity === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusClass(status) {
  if (status === "active" || status === "trialing") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "past_due" || status === "unpaid") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function StatCard({ label, value, helper }) {
  return (
    <div className="app-panel-soft p-5">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-main">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-muted">{helper}</p> : null}
    </div>
  );
}

function SuperAdminDashboard() {
  const { signOut, user } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [schoolForm, setSchoolForm] = useState(emptySchoolForm);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminSchool, setAdminSchool] = useState(null);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminProfileModalOpen, setAdminProfileModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminProfileForm, setAdminProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    school_id: "",
    role: "admin",
    status: "active",
  });
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditMeta, setAuditMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 20 });
  const [auditFilters, setAuditFilters] = useState(emptyAuditFilters);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchSchools = async () => {
    setLoadingSchools(true);
    try {
      const response = await api.get("/super-admin/schools");
      setSchools((response.data.schools || []).map(normalizeSchool));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load schools.");
    } finally {
      setLoadingSchools(false);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    setLoadingAudit(true);
    try {
      const params = {
        page,
        limit: auditMeta.per_page || 20,
        ...Object.fromEntries(Object.entries(auditFilters).filter(([, value]) => value)),
      };
      const response = await api.get("/super-admin/audit-logs", { params });
      setAuditLogs(response.data.data || []);
      setAuditMeta({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        total: response.data.total || 0,
        per_page: response.data.per_page || 20,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load audit logs.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const response = await api.get("/super-admin/admins");
      setAdmins(response.data.admins || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load admin accounts.");
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (activeView === "audit") {
      fetchAuditLogs(1);
    }

    if (activeView === "users") {
      fetchAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const filteredSchools = useMemo(() => {
    const term = schoolQuery.trim().toLowerCase();
    if (!term) return schools;
    return schools.filter((school) => {
      return (
        school.name.toLowerCase().includes(term) ||
        school.subdomain.toLowerCase().includes(term) ||
        school.subscription_status.toLowerCase().includes(term)
      );
    });
  }, [schoolQuery, schools]);

  const dashboardStats = useMemo(() => {
    const activeSchools = schools.filter((school) => school.is_active).length;
    const suspendedSchools = schools.length - activeSchools;
    const activeSubscriptions = schools.filter((school) => ["active", "trialing"].includes(school.subscription_status)).length;
    const failedPayments = schools.filter((school) => ["past_due", "unpaid"].includes(school.subscription_status)).length;
    return {
      activeSchools,
      suspendedSchools,
      activeSubscriptions,
      failedPayments,
      admins: schools.reduce((total, school) => total + school.admin_count, 0),
      busCapacity: schools.reduce((total, school) => total + school.max_buses, 0),
    };
  }, [schools]);

  const openCreateSchool = () => {
    setEditingSchool(null);
    setSchoolForm(emptySchoolForm);
    setSchoolModalOpen(true);
  };

  const openEditSchool = (school) => {
    setEditingSchool(school);
    setSchoolForm({
      name: school.name,
      subdomain: school.subdomain,
      max_buses: school.max_buses,
      primary_color: school.primary_color || "#facc15",
    });
    setSchoolModalOpen(true);
  };

  const closeSchoolModal = () => {
    if (savingSchool) return;
    setSchoolModalOpen(false);
    setEditingSchool(null);
    setSchoolForm(emptySchoolForm);
  };

  const openAdminModal = (school) => {
    setAdminSchool(school);
    setAdminForm(emptyAdminForm);
    setAdminModalOpen(true);
  };

  const closeAdminModal = () => {
    if (savingAdmin) return;
    setAdminModalOpen(false);
    setAdminSchool(null);
    setAdminForm(emptyAdminForm);
  };

  const openEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setAdminProfileForm({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      password: "",
      school_id: admin.school_id ? String(admin.school_id) : "",
      role: admin.role || "admin",
      status: admin.status || "active",
    });
    setAdminProfileModalOpen(true);
  };

  const closeAdminProfileModal = () => {
    if (savingAdminProfile) return;
    setAdminProfileModalOpen(false);
    setEditingAdmin(null);
    setAdminProfileForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      school_id: "",
      role: "admin",
      status: "active",
    });
  };

  const handleSchoolSubmit = async (event) => {
    event.preventDefault();
    setSavingSchool(true);

    const payload = {
      name: schoolForm.name.trim(),
      subdomain: schoolForm.subdomain.trim().toLowerCase(),
      max_buses: Number(schoolForm.max_buses),
      primary_color: schoolForm.primary_color,
    };

    try {
      const response = editingSchool
        ? await api.put(`/super-admin/schools/${editingSchool.id}`, payload)
        : await api.post("/super-admin/schools", payload);

      const nextSchool = normalizeSchool(response.data.school);
      setSchools((current) => {
        if (!editingSchool) return [nextSchool, ...current];
        return current.map((school) => (school.id === nextSchool.id ? nextSchool : school));
      });

      toast.success(response.data.message || "School saved successfully.");
      closeSchoolModal();
    } catch (error) {
      const firstError = error?.response?.data?.errors ? Object.values(error.response.data.errors).flat()[0] : null;
      toast.error(firstError || error?.response?.data?.message || "Unable to save school.");
    } finally {
      setSavingSchool(false);
    }
  };

  const toggleStatus = async (school) => {
    const nextStatus = !school.is_active;
    setSchools((current) => current.map((item) => (item.id === school.id ? { ...item, is_active: nextStatus } : item)));

    try {
      const response = await api.patch(`/super-admin/schools/${school.id}/toggle-status`, { is_active: nextStatus });
      const nextSchool = normalizeSchool(response.data.school);
      setSchools((current) => current.map((item) => (item.id === nextSchool.id ? nextSchool : item)));
      toast.success(response.data.message || "School status updated.");
    } catch (error) {
      setSchools((current) => current.map((item) => (item.id === school.id ? { ...item, is_active: school.is_active } : item)));
      toast.error(error?.response?.data?.message || "Unable to update school status.");
    }
  };

  const handleAdminSubmit = async (event) => {
    event.preventDefault();
    if (!adminSchool) return;
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password.trim()) {
      toast.error("Name, email, and password are required.");
      return;
    }

    setSavingAdmin(true);
    try {
      const response = await api.post(`/super-admin/schools/${adminSchool.id}/admins`, {
        school_id: adminSchool.id,
        name: adminForm.name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        phone: adminForm.phone.trim() || null,
        password: adminForm.password,
      });

      const nextSchool = normalizeSchool(response.data.school);
      setSchools((current) => current.map((school) => (school.id === nextSchool.id ? nextSchool : school)));
      await fetchAdmins();
      toast.success(response.data.message || "School admin account created successfully.");
      closeAdminModal();
    } catch (error) {
      const firstError = error?.response?.data?.errors ? Object.values(error.response.data.errors).flat()[0] : null;
      toast.error(firstError || error?.response?.data?.message || "Unable to create school admin.");
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleAdminProfileSubmit = async (event) => {
    event.preventDefault();
    if (!editingAdmin) return;
    if (!adminProfileForm.name.trim() || !adminProfileForm.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }

    setSavingAdminProfile(true);
    try {
      const payload = {
        name: adminProfileForm.name.trim(),
        email: adminProfileForm.email.trim().toLowerCase(),
        phone: adminProfileForm.phone.trim() || null,
        password: adminProfileForm.password.trim() || undefined,
        school_id: adminProfileForm.school_id ? Number(adminProfileForm.school_id) : null,
        role: adminProfileForm.role,
        status: adminProfileForm.status,
      };

      const response = await api.put(`/super-admin/admins/${editingAdmin.id}`, payload);
      setAdmins((current) => current.map((admin) => (admin.id === response.data.admin.id ? {
        ...admin,
        ...response.data.admin,
        school_id: response.data.admin.school_id,
        role: response.data.admin.role,
        status: response.data.admin.status,
        school: response.data.admin.school,
      } : admin)));

      const nextSchool = schools.find((school) => String(school.id) === String(response.data.admin.school_id));
      if (nextSchool) {
        setSchools((current) => current.map((school) => (String(school.id) === String(nextSchool.id) ? { ...school, admin_count: Math.max(0, school.admin_count) } : school)));
      }

      toast.success(response.data.message || "Admin updated successfully.");
      closeAdminProfileModal();
    } catch (error) {
      const firstError = error?.response?.data?.errors ? Object.values(error.response.data.errors).flat()[0] : null;
      toast.error(firstError || error?.response?.data?.message || "Unable to update admin.");
    } finally {
      setSavingAdminProfile(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Schools" value={schools.length} helper="All tenants" />
        <StatCard label="Active Schools" value={dashboardStats.activeSchools} helper={`${dashboardStats.suspendedSchools} suspended`} />
        <StatCard label="Active Subscriptions" value={dashboardStats.activeSubscriptions} helper={`${dashboardStats.failedPayments} failed payments`} />
        <StatCard label="Bus Capacity" value={dashboardStats.busCapacity} helper={`${dashboardStats.admins} school admins`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <PanelCard className="overflow-hidden p-0">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-lg font-extrabold text-main">Recent Schools</h2>
          </div>
          <div className="divide-y divide-line">
            {schools.slice(0, 5).map((school) => (
              <div key={school.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-bold text-main">{school.name}</p>
                  <p className="text-sm text-muted">{school.subdomain}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(school.subscription_status)}`}>
                  {school.subscription_status}
                </span>
              </div>
            ))}
            {!loadingSchools && schools.length === 0 ? <p className="px-5 py-8 text-sm text-muted">No schools yet.</p> : null}
          </div>
        </PanelCard>

        <PanelCard>
          <h2 className="text-lg font-extrabold text-main">Operational Focus</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-[22px] bg-card-soft px-4 py-3">
              <span className="font-semibold text-muted">Failed payments</span>
              <span className="font-bold text-rose-600">{dashboardStats.failedPayments}</span>
            </div>
            <div className="flex items-center justify-between rounded-[22px] bg-card-soft px-4 py-3">
              <span className="font-semibold text-muted">Suspended schools</span>
              <span className="font-bold text-amber-600">{dashboardStats.suspendedSchools}</span>
            </div>
            <div className="flex items-center justify-between rounded-[22px] bg-card-soft px-4 py-3">
              <span className="font-semibold text-muted">Admin accounts</span>
              <span className="font-bold text-main">{dashboardStats.admins}</span>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  );

  const renderSchools = () => (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={schoolQuery}
            onChange={(event) => setSchoolQuery(event.target.value)}
            placeholder="Search schools"
            className="app-input pl-10 sm:w-80"
          />
        </label>
        <div className="flex gap-3">
          <ActionButton type="button" variant="secondary" onClick={fetchSchools}>
            <FiRefreshCw /> Refresh
          </ActionButton>
          <ActionButton type="button" onClick={openCreateSchool}>
            <FiPlus /> Add School
          </ActionButton>
        </div>
      </div>

      <PanelCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-card-soft text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-bold">School</th>
                <th className="px-5 py-3 font-bold">Subdomain</th>
                <th className="px-5 py-3 font-bold">Plan Status</th>
                <th className="px-5 py-3 font-bold">Max Buses</th>
                <th className="px-5 py-3 font-bold">Admins</th>
                <th className="px-5 py-3 font-bold">Active</th>
                <th className="px-5 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loadingSchools ? (
                <tr><td colSpan="7" className="px-5 py-12 text-center text-muted">Loading schools...</td></tr>
              ) : filteredSchools.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-12 text-center text-muted">No schools found.</td></tr>
              ) : (
                filteredSchools.map((school) => (
                  <tr key={school.id} className="hover:bg-card-soft">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: school.primary_color || "#94a3b8" }} />
                        <span className="font-bold text-main">{school.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted">{school.subdomain}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(school.subscription_status)}`}>
                        {school.subscription_status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted">{school.max_buses}</td>
                    <td className="px-5 py-4 text-muted">{school.admin_count}</td>
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => toggleStatus(school)} className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition ${school.is_active ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <span className={`h-5 w-5 rounded-full bg-white transition ${school.is_active ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openAdminModal(school)} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-semibold text-main hover:bg-accent-soft">
                          <FiUserPlus /> Admin
                        </button>
                        <button type="button" onClick={() => openEditSchool(school)} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-semibold text-main hover:bg-accent-soft">
                          <FiEdit2 /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </section>
  );

  const renderBilling = () => (
    <PanelCard className="overflow-hidden p-0">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-extrabold text-main">Billing Overview</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-card-soft text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-5 py-3 font-bold">School</th>
              <th className="px-5 py-3 font-bold">Subscription</th>
              <th className="px-5 py-3 font-bold">Bus Limit</th>
              <th className="px-5 py-3 font-bold">Stripe Customer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {schools.map((school) => (
              <tr key={school.id} className="hover:bg-card-soft">
                <td className="px-5 py-4 font-bold text-main">{school.name}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(school.subscription_status)}`}>
                    {school.subscription_status}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted">{school.max_buses}</td>
                <td className="px-5 py-4 text-muted">{school.stripe_customer_id || "Not created"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );

  const renderAudit = () => (
    <section className="space-y-4">
      <PanelCard>
        <div className="grid gap-3 md:grid-cols-5">
          <input className="app-input" placeholder="Action" value={auditFilters.action} onChange={(event) => setAuditFilters((current) => ({ ...current, action: event.target.value }))} />
          <input className="app-input" placeholder="School ID" value={auditFilters.school_id} onChange={(event) => setAuditFilters((current) => ({ ...current, school_id: event.target.value }))} />
          <input className="app-input" placeholder="User ID" value={auditFilters.user_id} onChange={(event) => setAuditFilters((current) => ({ ...current, user_id: event.target.value }))} />
          <input className="app-input" type="date" value={auditFilters.date_from} onChange={(event) => setAuditFilters((current) => ({ ...current, date_from: event.target.value }))} />
          <input className="app-input" type="date" value={auditFilters.date_to} onChange={(event) => setAuditFilters((current) => ({ ...current, date_to: event.target.value }))} />
        </div>
        <div className="mt-3 flex gap-2">
          <ActionButton type="button" onClick={() => fetchAuditLogs(1)}>Apply filters</ActionButton>
          <ActionButton type="button" variant="secondary" onClick={() => { setAuditFilters(emptyAuditFilters); setTimeout(() => fetchAuditLogs(1), 0); }}>Reset</ActionButton>
        </div>
      </PanelCard>

      <PanelCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-card-soft text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-bold">Time</th>
                <th className="px-5 py-3 font-bold">Severity</th>
                <th className="px-5 py-3 font-bold">Action</th>
                <th className="px-5 py-3 font-bold">Description</th>
                <th className="px-5 py-3 font-bold">Actor</th>
                <th className="px-5 py-3 font-bold">School</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loadingAudit ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-muted">Loading audit logs...</td></tr>
              ) : auditLogs.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-muted">No audit logs found.</td></tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-card-soft">
                    <td className="px-5 py-4 text-muted">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${severityClass(log.severity)}`}>{log.severity}</span></td>
                    <td className="px-5 py-4 font-mono text-xs text-main">{log.action}</td>
                    <td className="max-w-xl px-5 py-4 text-main">{log.description}</td>
                    <td className="px-5 py-4 text-muted">{log.user?.email || "System"}</td>
                    <td className="px-5 py-4 text-muted">{log.school?.name || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-muted">
          <span>Page {auditMeta.current_page} of {auditMeta.last_page} · {auditMeta.total} logs</span>
          <div className="flex gap-2">
            <button disabled={auditMeta.current_page <= 1} onClick={() => fetchAuditLogs(auditMeta.current_page - 1)} className="rounded-full border border-line bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
            <button disabled={auditMeta.current_page >= auditMeta.last_page} onClick={() => fetchAuditLogs(auditMeta.current_page + 1)} className="rounded-full border border-line bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
          </div>
        </div>
      </PanelCard>
    </section>
  );

  const renderUsers = () => (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader eyebrow="Access" title="Admin accounts" description="View and update every school admin account, including access status and credentials." />
        <ActionButton type="button" variant="secondary" onClick={fetchAdmins}>
          <FiRefreshCw /> Refresh
        </ActionButton>
      </div>

      <PanelCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-card-soft text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-bold">Name</th>
                <th className="px-5 py-3 font-bold">Email</th>
                <th className="px-5 py-3 font-bold">Phone</th>
                <th className="px-5 py-3 font-bold">School</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loadingAdmins ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-muted">Loading admins...</td></tr>
              ) : admins.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-muted">No admin accounts found.</td></tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-card-soft">
                    <td className="px-5 py-4 font-bold text-main">{admin.name}</td>
                    <td className="px-5 py-4 text-muted">{admin.email}</td>
                    <td className="px-5 py-4 text-muted">{admin.phone || "-"}</td>
                    <td className="px-5 py-4 text-muted">{admin.school?.name || "-"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${admin.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => openEditAdmin(admin)} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-semibold text-main hover:bg-accent-soft">
                        <FiEdit2 /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </section>
  );

  const renderPlaceholder = (title, body) => (
    <PanelCard>
      <SectionHeader eyebrow="Coming next" title={title} description={body} />
    </PanelCard>
  );

  const viewTitle = navItems.find((item) => item.id === activeView)?.label || "Dashboard";

  return (
    <main className="min-h-screen bg-page text-main lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-r border-line bg-sidebar/95">
        <div className="border-b border-line px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)]">
              <img src="/logo.png" alt="BusTracker logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted">BusTracker SaaS</p>
              <h1 className="text-2xl font-extrabold leading-tight text-main">Super Admin</h1>
            </div>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 py-4 lg:block lg:space-y-2 lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`flex w-full min-w-max items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-bold transition ${
                  active ? "bg-accent-soft text-main shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]" : "text-muted hover:bg-card-soft hover:text-main"
                }`}
              >
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-accent text-slate-950" : "bg-accent-soft text-accent"}`}>
                  <Icon />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-line bg-card/80 backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Platform Console</p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-main">{viewTitle}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-line bg-card-soft px-4 py-2 text-sm font-bold text-main">
                {user?.name || "Super Admin"}
              </span>
              <button type="button" onClick={signOut} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-muted hover:bg-rose-50 hover:text-rose-600">
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="px-4 py-6 sm:px-6 lg:px-8">
          {activeView === "dashboard" ? renderDashboard() : null}
          {activeView === "schools" ? renderSchools() : null}
          {activeView === "billing" ? renderBilling() : null}
          {activeView === "audit" ? renderAudit() : null}
          {activeView === "users" ? renderUsers() : null}
          {activeView === "security" ? renderPlaceholder("Security Center", "Next step: show login events, failed logins, suspicious audit entries, and later enforce 2FA for Super Admin accounts.") : null}
          {activeView === "settings" ? renderPlaceholder("Settings", "Keep this limited for MVP: system name, logo, support email, and safe non-secret configuration.") : null}
        </section>
      </div>

      {schoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <form onSubmit={handleSchoolSubmit} className="app-panel w-full max-w-lg p-6">
            <ModalHeader title={editingSchool ? "Edit School" : "Add New School"} subtitle="Manage school tenancy and limits." onClose={closeSchoolModal} />
            <div className="space-y-4">
              <TextInput label="Name" value={schoolForm.name} onChange={(value) => setSchoolForm((current) => ({ ...current, name: value }))} required />
              <TextInput label="Subdomain" value={schoolForm.subdomain} onChange={(value) => setSchoolForm((current) => ({ ...current, subdomain: value.toLowerCase() }))} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <TextInput label="Max Buses" type="number" min="0" value={schoolForm.max_buses} onChange={(value) => setSchoolForm((current) => ({ ...current, max_buses: value }))} required />
                <label className="block">
                  <span className="text-sm font-semibold text-muted">Primary Color</span>
                  <input type="color" value={schoolForm.primary_color} onChange={(event) => setSchoolForm((current) => ({ ...current, primary_color: event.target.value }))} className="mt-1 h-12 w-24 rounded-2xl border border-line bg-white p-1" />
                </label>
              </div>
            </div>
            <ModalActions onCancel={closeSchoolModal} saving={savingSchool} label="Save School" savingLabel="Saving..." />
          </form>
        </div>
      )}

      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <form onSubmit={handleAdminSubmit} className="app-panel w-full max-w-lg p-6">
            <ModalHeader title="Create School Admin" subtitle={adminSchool ? `Create an admin account for ${adminSchool.name}.` : "Create an admin account."} onClose={closeAdminModal} />
            <div className="grid gap-4">
              <TextInput label="Name" value={adminForm.name} onChange={(value) => setAdminForm((current) => ({ ...current, name: value }))} required />
              <TextInput label="Email" type="email" value={adminForm.email} onChange={(value) => setAdminForm((current) => ({ ...current, email: value }))} required />
              <TextInput label="Phone" value={adminForm.phone} onChange={(value) => setAdminForm((current) => ({ ...current, phone: value }))} />
              <TextInput label="Password" type="password" minLength={8} value={adminForm.password} onChange={(value) => setAdminForm((current) => ({ ...current, password: value }))} required />
            </div>
            <ModalActions onCancel={closeAdminModal} saving={savingAdmin} label="Create Admin" savingLabel="Creating..." />
          </form>
        </div>
      )}

      {adminProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <form onSubmit={handleAdminProfileSubmit} className="app-panel w-full max-w-xl p-6">
            <ModalHeader title="Edit Admin Access" subtitle={editingAdmin ? `Manage ${editingAdmin.name}'s login and school access.` : "Manage admin access."} onClose={closeAdminProfileModal} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Name" value={adminProfileForm.name} onChange={(value) => setAdminProfileForm((current) => ({ ...current, name: value }))} required />
              <TextInput label="Email" type="email" value={adminProfileForm.email} onChange={(value) => setAdminProfileForm((current) => ({ ...current, email: value }))} required />
              <TextInput label="Phone" value={adminProfileForm.phone} onChange={(value) => setAdminProfileForm((current) => ({ ...current, phone: value }))} />
              <label className="block">
                <span className="text-sm font-semibold text-muted">Status</span>
                <select value={adminProfileForm.status} onChange={(event) => setAdminProfileForm((current) => ({ ...current, status: event.target.value }))} className="app-input mt-1">
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-muted">Permission</span>
                <select value={adminProfileForm.role} onChange={(event) => setAdminProfileForm((current) => ({ ...current, role: event.target.value }))} className="app-input mt-1">
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-muted">School</span>
                <select value={adminProfileForm.school_id} onChange={(event) => setAdminProfileForm((current) => ({ ...current, school_id: event.target.value }))} className="app-input mt-1">
                  <option value="">Unassigned</option>
                  {schools.map((school) => (
                    <option key={school.id} value={String(school.id)}>{school.name}</option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-muted">New Password</span>
                <input type="password" minLength={8} value={adminProfileForm.password} onChange={(event) => setAdminProfileForm((current) => ({ ...current, password: event.target.value }))} className="app-input mt-1" placeholder="Leave blank to keep current password" />
              </label>
            </div>
            <ModalActions onCancel={closeAdminProfileModal} saving={savingAdminProfile} label="Save Admin" savingLabel="Saving..." />
          </form>
        </div>
      )}
    </main>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold text-main">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-muted hover:bg-accent-soft hover:text-main">
        <FiX />
      </button>
    </div>
  );
}

function TextInput({ label, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-input mt-1"
        {...props}
      />
    </label>
  );
}

function ModalActions({ onCancel, saving, label, savingLabel }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="h-11 rounded-full border border-line bg-white px-5 text-sm font-semibold text-muted hover:bg-accent-soft hover:text-main">
        Cancel
      </button>
      <button type="submit" disabled={saving} className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-slate-950 shadow-[var(--shadow-accent)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? savingLabel : label}
      </button>
    </div>
  );
}

export default SuperAdminDashboard;

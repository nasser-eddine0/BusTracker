import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { HiChartBar, HiTruck, HiUserGroup } from "react-icons/hi";
import ActionButton from "../components/ui/ActionButton";
import { useAuth } from "../context/AuthContext";
import { useLanguage, LangSwitcher } from "../i18n";

function SignIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const initialRole = searchParams.get("role") || "admin";

  const roleOptions = useMemo(() => ({
    admin: { label: t("admin"), icon: HiChartBar, redirect: "/admin/dashboard" },
    driver: { label: t("driver"), icon: HiTruck, redirect: "/driver/trip" },
    parent: { label: t("parent"), icon: HiUserGroup, redirect: "/parent" },
  }), [t]);

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: roleOptions[initialRole] ? initialRole : "admin",
  });
  const [submitting, setSubmitting] = useState(false);

  const currentRole = useMemo(() => roleOptions[form.role], [form.role, roleOptions]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password.trim()) { toast.error(t("fillLogin")); return; }
    setSubmitting(true);
    try {
      const user = await signIn({ email: form.email.trim(), password: form.password, role: form.role });
      const redirect = roleOptions[user.role]?.redirect || currentRole.redirect;
      toast.success(t("loginSuccess"));
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally { setSubmitting(false); }
  };

  const CurrentIcon = currentRole.icon;

  return (
    <div className="min-h-screen bg-page px-4 py-6 text-main lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[36px] border border-line bg-card shadow-[var(--shadow-panel)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden bg-[linear-gradient(145deg,#fffbeb_0%,#ffffff_70%,#fffaf0_100%)] p-10 lg:block">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-full bg-accent/12 px-4 py-2 text-sm font-semibold text-accent">{t("signIn")}</div>
              <LangSwitcher />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-main">{t("loginTitle")}</h1>
            <p className="text-base leading-8 text-muted">{t("loginDesc")}</p>
            <div className="rounded-[28px] border border-line bg-white p-6">
              <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-accent text-2xl text-slate-950 shadow-[var(--shadow-accent)]"><CurrentIcon /></div>
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-muted">{t("profileChosen")}</p>
              <h2 className="mt-3 text-3xl font-extrabold">{currentRole.label}</h2>
            </div>
          </div>
        </div>

        <div className="flex items-center p-6 lg:p-12">
          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">{t("welcome")}</p>
                <LangSwitcher className="lg:hidden" />
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-main">{t("signIn")}</h2>
              <p className="text-sm leading-7 text-muted">{t("chooseProfile")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {Object.entries(roleOptions).map(([key, option]) => {
                const Icon = option.icon;
                const active = form.role === key;
                return (
                  <button key={key} type="button" onClick={() => setForm((c) => ({ ...c, role: key }))}
                    className={`rounded-[22px] border p-4 text-left transition ${active ? "border-accent/35 bg-accent-soft text-main" : "border-line bg-card-soft text-muted hover:bg-card-muted"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-accent text-slate-950" : "bg-white text-accent"}`}><Icon /></div>
                      <span className="font-semibold">{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <input className="app-input h-14" type="email" placeholder={t("emailPlaceholder")} value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
              <input className="app-input h-14" type="password" placeholder={t("password")} value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <ActionButton type="submit" size="lg" disabled={submitting}>{submitting ? t("signingIn") : t("loginBtn")}</ActionButton>
              <Link to="/signup" className="text-sm font-semibold text-accent">{t("createAccount")}</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignIn;

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { HiChartBar, HiTruck, HiUserGroup } from "react-icons/hi";
import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import ActionButton from "../components/ui/ActionButton";
import { useAuth } from "../context/AuthContextObject";
import { useLanguage, LangSwitcher } from "../i18n";

function SignIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const initialRole = searchParams.get("role") || "admin";

  const roleOptions = useMemo(
    () => ({
      admin: { label: t("admin"), icon: HiChartBar, redirect: "/admin/dashboard" },
      driver: { label: t("driver"), icon: HiTruck, redirect: "/driver/trip" },
      parent: { label: t("parent"), icon: HiUserGroup, redirect: "/parent" },
    }),
    [t]
  );

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: roleOptions[initialRole] ? initialRole : "admin",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentRole = useMemo(() => roleOptions[form.role], [form.role, roleOptions]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error(t("fillLogin"));
      return;
    }
    setSubmitting(true);
    try {
      const user = await signIn({
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      const redirect = roleOptions[user.role]?.redirect || currentRole.redirect;
      toast.success(t("loginSuccess"));
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page px-4 py-6 text-main lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[36px] border border-line bg-card shadow-[var(--shadow-panel)] lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Panel */}
        <div className="hidden bg-[#d9f2ff] lg:block">
          <img
            src="/login-image-left.png"
            alt="BusTracker illustration"
            className="h-full w-full object-cover object-left"
          />
        </div>

        {/* Right Panel */}
        <div className="flex items-center p-6 lg:p-12">
          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-line bg-white lg:hidden">
                    <img src="/logo.png" alt="BusTracker logo" className="h-6 w-6 object-contain" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">
                    {t("welcome")}
                  </p>
                </div>
                <LangSwitcher className="lg:hidden" />
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-main">{t("signIn")}</h2>
              <p className="text-sm leading-7 text-muted">{t("chooseProfile")}</p>
            </div>

            {/* Profile Selection */}
            <div className="grid gap-4 sm:grid-cols-3">
              {Object.entries(roleOptions).map(([key, option]) => {
                const Icon = option.icon;
                const active = form.role === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((c) => ({ ...c, role: key }))}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-accent/35 bg-accent-soft text-main"
                        : "border-line bg-card-soft text-muted hover:bg-card-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-11 w-11 place-items-center rounded-2xl ${
                          active ? "bg-accent text-slate-950" : "bg-white text-accent"
                        }`}
                      >
                        <Icon />
                      </div>
                      <span className="font-semibold">{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Credentials Fields */}
            <div className="space-y-4">
              <div className="group relative flex items-center">
                <FiMail className="pointer-events-none absolute left-4 text-base text-muted transition-colors group-focus-within:text-accent" />
                <input
                  className="app-input h-14 w-full pl-11"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={form.email}
                  onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                />
              </div>

              <div className="group relative flex items-center">
                <FiLock className="pointer-events-none absolute left-4 text-base text-muted transition-colors group-focus-within:text-accent" />
                <input
                  className="app-input h-14 w-full pl-11 pr-12"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("password")}
                  value={form.password}
                  onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((c) => !c)}
                  className="absolute right-4 text-muted transition-colors hover:text-main"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <FiEyeOff className="text-base" /> : <FiEye className="text-base" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs lg:text-sm">
              <label className="group flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 cursor-pointer rounded border-line text-accent transition-colors focus:ring-accent bg-card-soft"
                />
                <span className="font-medium text-muted group-hover:text-main">
                  Se souvenir de moi
                </span>
              </label>
              <a href="#" className="font-semibold text-accent transition hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <ActionButton type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? t("signingIn") : t("loginBtn")}
              </ActionButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignIn;

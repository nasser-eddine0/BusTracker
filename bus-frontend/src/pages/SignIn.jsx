import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { LangSwitcher, useLanguage } from "../i18n";

const AdminIcon = (props) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const DriverIcon = (props) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="9" />
    <line x1="12" y1="15" x2="12" y2="22" />
    <line x1="2" y1="12" x2="9" y2="12" />
    <line x1="15" y1="12" x2="22" y2="12" />
  </svg>
);

const ParentIcon = (props) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

function SignIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const initialRole = searchParams.get("role") || "admin";

  const roleOptions = useMemo(
    () => ({
      admin: { label: t("admin"), icon: AdminIcon, redirect: "/admin/dashboard" },
      driver: { label: t("driver"), icon: DriverIcon, redirect: "/driver/trip" },
      parent: { label: t("parent"), icon: ParentIcon, redirect: "/parent" },
    }),
    [t],
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
    <div className="flex min-h-[80vh] items-center justify-center bg-slate-50 p-4 md:p-6 lg:p-8 selection:bg-accent selection:text-slate-900">
      <div className="flex w-full max-w-[1000px] overflow-hidden rounded-[40px] border border-slate-100/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.06)] lg:max-h-[600px] lg:aspect-[16/9]">
        <div className="hidden w-1/2 bg-[#d9f2ff] lg:block">
          <img
            src="/login-image-left.png"
            alt="BusTracker illustration"
            className="h-full w-full object-cover object-left"
          />
        </div>

        <div className="flex w-full items-center justify-center overflow-y-auto bg-white p-8 sm:p-10 lg:w-1/2">
          <div className="my-auto flex w-full max-w-[410px] flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50 shadow-sm">
                  <img src="/logo.png" alt="BusTracker logo" className="h-6 w-6 object-contain" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-600">Bon retour !</span>
              </div>
              <LangSwitcher className="h-8 border border-slate-200/80 py-1 shadow-sm" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Se connecter</h2>
              <p className="text-sm leading-relaxed text-slate-500">
                Choisissez votre profil puis connectez-vous avec votre compte réel.
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(roleOptions).map(([key, option]) => {
                  const active = form.role === key;
                  const IconComponent = option.icon;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, role: key }))}
                      className={`flex h-[58px] w-full items-center justify-center gap-1.5 rounded-2xl border px-2 text-[10px] font-extrabold transition-all duration-300 lg:text-[11px] ${
                        active
                          ? "border-[#f4c542] bg-[#fffbeb] text-slate-950 shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {active ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#f4c542] text-slate-950 shadow-[0_2px_6px_rgba(244,197,66,0.2)]">
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <IconComponent className="h-3.5 w-3.5" />
                      )}
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-4">
                <div className="group relative flex items-center">
                  <FiMail className="pointer-events-none absolute left-4 text-base text-slate-400 transition-colors group-focus-within:text-[#f4c542]" />
                  <input
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white/50 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#f4c542] focus:bg-white focus:ring-4 focus:ring-[#f4c542]/10"
                    type="email"
                    placeholder="nom@bustracker.app"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>

                <div className="group relative flex items-center">
                  <FiLock className="pointer-events-none absolute left-4 text-base text-slate-400 transition-colors group-focus-within:text-[#f4c542]" />
                  <input
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white/50 pl-11 pr-12 text-sm text-slate-800 outline-none transition focus:border-[#f4c542] focus:bg-white focus:ring-4 focus:ring-[#f4c542]/10"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <FiEyeOff className="text-base" /> : <FiEye className="text-base" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs lg:text-sm">
                <label className="group flex cursor-pointer items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-[#f4c542] transition-colors focus:ring-[#f4c542]"
                  />
                  <span className="font-medium text-slate-500 group-hover:text-slate-700">Se souvenir de moi</span>
                </label>
                <a href="#" className="font-semibold text-blue-600 transition hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="relative flex h-14 w-full items-center justify-center rounded-2xl bg-[#f4c542] font-bold text-slate-950 shadow-[0_8px_20px_rgba(244,197,66,0.15)] transition-all hover:bg-[#e0b233] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
              >
                <span className="text-sm font-extrabold">{submitting ? t("signingIn") : "Entrer"}</span>
                {!submitting && <FiArrowRight className="absolute right-6 text-lg" />}
              </button>
            </form>

            <div className="border-t border-slate-100/80 pt-5 text-center">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Besoin d&apos;aide ?
              </span>
              <p className="text-[11px] text-slate-500">
                Contactez votre{" "}
                <a href="#" className="font-semibold text-blue-600 hover:underline">
                  administrateur système
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignIn;

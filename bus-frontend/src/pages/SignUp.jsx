import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ActionButton from "../components/ui/ActionButton";
import { useAuth } from "../context/AuthContextObject";
import { useLanguage, LangSwitcher } from "../i18n";

function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", role: "parent" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) { toast.error(t("fillFields")); return; }
    setSubmitting(true);
    try {
      const user = await signUp({ name: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, role: form.role });
      toast.success(t("accountCreated"));
      navigate(user.role === "admin" ? "/admin/dashboard" : user.role === "driver" ? "/driver/trip" : "/parent", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-page px-4 py-6 text-main lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[36px] border border-line bg-card shadow-[var(--shadow-panel)] lg:grid-cols-[1.02fr_0.98fr]">
        <div className="bg-[linear-gradient(145deg,#fffbeb_0%,#ffffff_70%,#fffaf0_100%)] p-8 lg:p-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-full bg-accent/12 px-4 py-2 text-sm font-semibold text-accent">{t("createAccount")}</div>
              <LangSwitcher />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-main">{t("signupTitle")}</h1>
            <p className="text-base leading-8 text-muted">{t("signupDesc")}</p>
          </div>
        </div>

        <div className="flex items-center p-6 lg:p-12">
          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">{t("newAccount")}</p>
              <h2 className="text-4xl font-extrabold tracking-tight text-main">{t("signUp")}</h2>
            </div>

            <input className="app-input h-14" placeholder={t("fullName")} value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} />
            <input className="app-input h-14" type="email" placeholder={t("email")} value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
            <input className="app-input h-14" type="tel" placeholder={t("phone")} value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
            <select className="app-input h-14" value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}>
              <option value="parent">{t("parent")}</option>
              <option value="driver">{t("driver")}</option>
              <option value="admin">{t("admin")}</option>
            </select>
            <input className="app-input h-14" type="password" placeholder={t("password")} value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />

            <ActionButton type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? t("creating") : t("createBtn")}</ActionButton>

            <p className="text-sm text-muted">
              {t("alreadyHaveAccount")}{" "}
              <Link to="/signin" className="font-semibold text-accent">{t("signIn")}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignUp;

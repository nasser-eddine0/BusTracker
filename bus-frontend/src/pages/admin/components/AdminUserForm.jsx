import { useState } from "react";
import { HiEye, HiEyeOff } from "react-icons/hi";
import ActionButton from "../../../components/ui/ActionButton";
import { useLanguage } from "../../../i18n";

function AdminUserForm({ role, form, setForm, onSubmit, submitLabel, isSaving, busOptions = [], defaultPassword }) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const roleLabel = role === "driver" ? t("driver") : role === "admin" ? t("admin") : t("parent");

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <input
        className="app-input"
        placeholder={`${t("name")} ${roleLabel}`}
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="app-input"
          type="email"
          placeholder={t("email")}
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <input
          className="app-input"
          placeholder={t("phone")}
          value={form.phone}
          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
        />
      </div>
      {role === "driver" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="app-input"
            placeholder={t("cin")}
            value={form.cin}
            onChange={(event) => setForm((current) => ({ ...current, cin: event.target.value }))}
          />
          <select
            className="app-input"
            value={form.busId}
            onChange={(event) => setForm((current) => ({ ...current, busId: event.target.value }))}
          >
            <option value="">{t("noBus")}</option>
            {busOptions.map((bus) => (
              <option key={bus.id} value={bus.id}>
                {bus.name} - {bus.routeName}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {defaultPassword && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <span className="text-sm font-medium text-muted">{t("currentPassword")}:</span>
          <span className="font-mono text-sm font-bold text-main">
            {showPassword ? defaultPassword : "••••••••"}
          </span>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-white hover:text-main"
          >
            {showPassword ? <HiEyeOff className="text-lg" /> : <HiEye className="text-lg" />}
          </button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="app-input"
          type="password"
          placeholder={defaultPassword ? t("newPassword") : t("password")}
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />
        <select
          className="app-input"
          value={form.status}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
        >
          <option value="active">{t("active")}</option>
          <option value="disabled">{t("disabled")}</option>
        </select>
      </div>
      <div className="flex justify-end gap-3">
        <ActionButton type="submit" disabled={isSaving}>
          {submitLabel}
        </ActionButton>
      </div>
    </form>
  );
}

export default AdminUserForm;

import ActionButton from "../../../components/ui/ActionButton";
import { useLanguage } from "../../../i18n";

function AdminUserForm({ role, form, setForm, onSubmit, submitLabel, isSaving, busOptions = [] }) {
  const { t } = useLanguage();
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
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="app-input"
          type="password"
          placeholder={t("password")}
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

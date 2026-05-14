import ActionButton from "../../../components/ui/ActionButton";
import { useLanguage } from "../../../i18n";

function BusForm({ form, setForm, onSubmit, isSaving, drivers }) {
  const { t } = useLanguage();

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="app-input"
          placeholder={t("busName")}
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          className="app-input"
          placeholder={t("route")}
          value={form.routeName}
          onChange={(event) => setForm((current) => ({ ...current, routeName: event.target.value }))}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="app-input"
          placeholder={t("plateNumber")}
          value={form.plateNumber}
          onChange={(event) => setForm((current) => ({ ...current, plateNumber: event.target.value }))}
        />
        <input
          className="app-input"
          type="number"
          min="1"
          placeholder={t("capacityLabel")}
          value={form.capacity}
          onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
        />
      </div>
      <select
        className="app-input"
        value={form.driverId}
        onChange={(event) => setForm((current) => ({ ...current, driverId: event.target.value }))}
      >
        <option value="">{t("noDriver")}</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-3">
        <ActionButton type="submit" disabled={isSaving}>
          {isSaving ? t("loading") : t("saveBus")}
        </ActionButton>
      </div>
    </form>
  );
}

export default BusForm;

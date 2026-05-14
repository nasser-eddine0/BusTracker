import ActionButton from "../../../components/ui/ActionButton";
import { useLanguage } from "../../../i18n";

function StudentForm({ form, setForm, onSubmit, isSaving, parents, buses }) {
  const { t } = useLanguage();

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="app-input"
          placeholder={t("studentName")}
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          className="app-input"
          placeholder={t("grade")}
          value={form.grade}
          onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}
        />
      </div>
      <input
        className="app-input"
        placeholder={t("address")}
        value={form.address}
        onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="app-input"
          placeholder={t("regCode")}
          value={form.regCode}
          onChange={(event) => setForm((current) => ({ ...current, regCode: event.target.value }))}
        />
        <select
          className="app-input"
          value={form.parentId}
          onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
        >
          <option value="">{t("noParent")}</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="app-input"
          placeholder={t("pickupLat")}
          value={form.pickupLat}
          onChange={(event) => setForm((current) => ({ ...current, pickupLat: event.target.value }))}
        />
        <input
          className="app-input"
          placeholder={t("pickupLng")}
          value={form.pickupLng}
          onChange={(event) => setForm((current) => ({ ...current, pickupLng: event.target.value }))}
        />
      </div>
      <select
        className="app-input"
        value={form.busId}
        onChange={(event) => setForm((current) => ({ ...current, busId: event.target.value }))}
      >
        <option value="">{t("withoutBus")}</option>
        {buses.map((bus) => (
          <option key={bus.id} value={bus.id}>
            {bus.name} - {bus.routeName}
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-3">
        <ActionButton type="submit" disabled={isSaving}>
          {isSaving ? t("loading") : t("saveStudent")}
        </ActionButton>
      </div>
    </form>
  );
}

export default StudentForm;

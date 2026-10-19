import { useEffect, useRef, useState } from "react";
import { FiLock, FiRefreshCw, FiSave, FiTrash2 } from "react-icons/fi";
import api from "../api/axios";
import ActionButton from "../components/ui/ActionButton";

const errorMessage = (error) => Object.values(error?.response?.data?.errors || {}).flat()[0]
  || error?.response?.data?.message || "Request failed. Please retry.";
const dateLabel = (value) => value ? new Date(value).toLocaleString() : "Not recorded";

export default function SuperAdminAccount({ security = false, onSaved }) {
  const [account, setAccount] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [credentials, setCredentials] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get(security ? "/super-admin/account/sessions" : "/super-admin/account", { signal: controller.signal })
      .then(({ data }) => {
        if (security) setSessions(data.sessions);
        else setAccount(data.account);
        setError("");
      })
      .catch((failure) => { if (!controller.signal.aborted) setError(errorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [security, reload]);

  const mutate = async (operation, success) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await operation();
      success?.(data);
      setMessage(data.message);
      setCredentials({ current_password: "", password: "", password_confirmation: "" });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const save = (event) => {
    event.preventDefault();
    if (security) {
      mutate(() => api.put("/super-admin/account/password", credentials), () => setReload((value) => value + 1));
    } else {
      mutate(() => api.put("/super-admin/account", { ...account, current_password: credentials.current_password }), (data) => {
        setAccount(data.account);
        onSaved?.(data.account);
      });
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{security ? "Password and API sessions" : "Account settings"}</h2>
        <ActionButton disabled={busy || loading} variant="secondary" onClick={() => { setLoading(true); setReload((value) => value + 1); }}><FiRefreshCw /> Refresh</ActionButton>
      </div>
      {error && <p role="alert" className="break-words border-l-4 border-rose-600 bg-rose-50 p-3 text-rose-800">{error}</p>}
      {message && <p role="status" className="border-l-4 border-emerald-600 bg-emerald-50 p-3 text-emerald-800">{message}</p>}
      {loading ? <p role="status">Loading account...</p> : (security || account) && (
        <form onSubmit={save} className="max-w-xl space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            {!security && ["name", "email", "phone"].map((field) => (
              <label key={field} className="block text-sm font-semibold">
                <span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>
                <input className="app-input mt-1" type={field === "email" ? "email" : "text"} required={field !== "phone"}
                  maxLength={field === "phone" ? 40 : 255} value={account[field] || ""}
                  onChange={(event) => setAccount((value) => ({ ...value, [field]: event.target.value }))} />
              </label>
            ))}
            <label className="block text-sm font-semibold">Current password
              <input className="app-input mt-1" type="password" autoComplete="current-password" required value={credentials.current_password}
                onChange={(event) => setCredentials((value) => ({ ...value, current_password: event.target.value }))} />
            </label>
            {security && [["password", "New password"], ["password_confirmation", "Confirm new password"]].map(([field, label]) => (
              <label key={field} className="block text-sm font-semibold">{label}
                <input className="app-input mt-1" type="password" autoComplete="new-password" required minLength={8} value={credentials[field]}
                  onChange={(event) => setCredentials((value) => ({ ...value, [field]: event.target.value }))} />
              </label>
            ))}
            <ActionButton type="submit" disabled={busy}>{security ? <FiLock /> : <FiSave />}{busy ? "Saving..." : security ? "Change password" : "Save account"}</ActionButton>
          </fieldset>
        </form>
      )}
      {security && !loading && (
        <div className="overflow-x-auto border-t border-line pt-5">
          <h3 className="mb-3 font-bold">Issued API sessions</h3>
          <table className="w-full text-left text-sm">
            <thead><tr>{["Session", "Created", "Last used", "Expires", ""].map((title) => <th className="px-3 py-2" key={title}>{title}</th>)}</tr></thead>
            <tbody>{sessions.map((session) => (
              <tr key={session.id} className="border-t border-line">
                <td className="px-3 py-3">{session.name}{session.current ? " (current)" : ""}</td>
                <td className="px-3 py-3">{dateLabel(session.created_at)}</td>
                <td className="px-3 py-3">{dateLabel(session.last_used_at)}</td>
                <td className="px-3 py-3">{session.expires_at ? dateLabel(session.expires_at) : "No token-specific expiry"}</td>
                <td className="px-3 py-3">{!session.current && <button disabled={busy} title="Revoke API session" aria-label={`Revoke session ${session.id}`} className="p-2 text-rose-700 disabled:opacity-40"
                  onClick={() => {
                    if (window.confirm("Revoke this API session? That device must sign in again.")) {
                      mutate(() => api.delete(`/super-admin/account/sessions/${session.id}`), () => setSessions((values) => values.filter((item) => item.id !== session.id)));
                    }
                  }}><FiTrash2 /></button>}</td>
              </tr>
            ))}</tbody>
          </table>
          {!sessions.length && !error && <p className="py-4 text-muted">No issued API sessions.</p>}
        </div>
      )}
    </section>
  );
}

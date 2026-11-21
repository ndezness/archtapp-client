import { useEffect, useState } from "react";
import { api, useApi } from "../api";

const FIELDS = [
  ["BusinessName", "Business name"],
  ["BusinessPhone", "Telephone"],
  ["BusinessEmail", "Email"],
  ["BusinessAddress", "Address"],
  ["ReferencePrefix", "Reference prefix (the BDL in BDL-2026-001)"],
  ["ConsultationFee", "Default consultation fee"],
];

export default function Settings() {
  const { data, error, loading } = useApi("/api/settings");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setMessage(null);
  };

  async function save(e) {
    e.preventDefault();
    setSaveError(null);
    setMessage(null);
    setSaving(true);
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(form) });
      setMessage("Settings saved.");
    } catch (err) {
      setSaveError(err.message);
    }
    setSaving(false);
  }

  if (loading || !form) return <p className="muted">Loading settings...</p>;
  if (error) return <p className="error">Could not load settings: {error}</p>;

  return (
    <div>
      <h1>Settings</h1>
      <p className="muted">
        The business details appear on every receipt. The default fee is pre-filled when a lead is
        converted, and can still be changed for a single client.
      </p>

      <form className="form" onSubmit={save}>
        {FIELDS.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={form[key] ?? ""}
              onChange={set(key)}
              {...(key === "ConsultationFee" ? { type: "number", min: "0", step: "0.01" } : {})}
            />
          </label>
        ))}

        <p className="muted hint">
          A new reference prefix only applies to projects created from now on. Existing references
          don't change.
        </p>

        {saveError && <p className="error">{saveError}</p>}
        {message && <p className="success">{message}</p>}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
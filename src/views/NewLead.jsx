import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function NewLead() {
  const go = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    siteAddress: "",
    projectInterest: "",
    notes: "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.siteAddress.trim()) {
      setError("Name and site address are required.");
      return;
    }

    setSaving(true);
    try {
      const lead = await api("/api/leads", { method: "POST", body: JSON.stringify(form) });
      go(`/leads/${lead.leadId}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>New Lead</h1>
      <form className="form" onSubmit={submit}>
        <label>
          Name *
          <input value={form.name} onChange={set("name")} />
        </label>
        <label>
          Telephone
          <input value={form.phone} onChange={set("phone")} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set("email")} />
        </label>
        <label>
          Site address *
          <input value={form.siteAddress} onChange={set("siteAddress")} />
        </label>
        <label>
          Project interest
          <input
            placeholder="e.g. Rear extension, second storey, carport"
            value={form.projectInterest}
            onChange={set("projectInterest")}
          />
        </label>
        <label>
          Notes
          <textarea rows="3" value={form.notes} onChange={set("notes")} />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : "Save lead"}
          </button>
          <button type="button" className="secondary" onClick={() => go("/leads")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
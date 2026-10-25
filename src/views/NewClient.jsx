import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function NewClient() {
  const go = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", propertyAddress: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.propertyAddress.trim()) {
      setError("Name and property address are required.");
      return;
    }

    setSaving(true);
    try {
      await api("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          propertyAddress: form.propertyAddress.trim(),
        }),
      });
      go("/clients");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>New Client</h1>
      <form className="form" onSubmit={submit}>
        <label>
          Name *
          <input value={form.name} onChange={set("name")} />
        </label>
        <label>
          Property address *
          <input value={form.propertyAddress} onChange={set("propertyAddress")} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={set("phone")} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set("email")} />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : "Save client"}
          </button>
          <button type="button" className="secondary" onClick={() => go("/clients")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
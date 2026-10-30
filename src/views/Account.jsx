import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Account() {
  const { session } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (form.next.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (form.next !== form.confirm) {
      setError("The new passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      await api("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      setForm({ current: "", next: "", confirm: "" });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <h1>Account</h1>
      <p className="muted">
        Signed in as <strong>{session.username}</strong> ({session.role})
      </p>

      <form className="form" onSubmit={submit}>
        <h2>Change password</h2>
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={set("current")}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={set("next")}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set("confirm")}
          />
        </label>

        {error && <p className="error">{error}</p>}
        {done && <p className="success">Password changed.</p>}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : "Change password"}
          </button>
        </div>
      </form>
    </div>
  );
}
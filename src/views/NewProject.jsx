import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, useApi } from "../api";

export default function NewProject() {
  const go = useNavigate();
  const { data: clients, error: loadError, loading } = useApi("/api/clients");

  const [form, setForm] = useState({
    clientId: "",
    projectName: "",
    totalQuotedCost: "",
    startDate: "",
    targetCompletionDate: "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (!form.clientId || !form.projectName.trim()) {
      setError("Choose a client and enter a project name.");
      return;
    }

    setSaving(true);
    try {
      await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          clientId: Number(form.clientId),
          projectName: form.projectName.trim(),
          status: "active",
          totalQuotedCost: form.totalQuotedCost ? Number(form.totalQuotedCost) : null,
          startDate: form.startDate || null,
          targetCompletionDate: form.targetCompletionDate || null,
        }),
      });
      go("/projects");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (loadError) return <p className="error">Could not load clients: {loadError}</p>;

  if (clients.length === 0) {
    return (
      <div>
        <h1>New Project</h1>
        <p className="muted">
          A project needs a client first. <Link to="/clients/new">Add a client</Link>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>New Project</h1>
      <form className="form" onSubmit={submit}>
        <label>
          Client *
          <select value={form.clientId} onChange={set("clientId")}>
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.clientId} value={c.clientId}>
                {c.name} — {c.propertyAddress}
              </option>
            ))}
          </select>
        </label>
        <label>
          Project name *
          <input
            placeholder="e.g. Rear Extension - Brown Residence"
            value={form.projectName}
            onChange={set("projectName")}
          />
        </label>
        <label>
          Quoted cost
          <input type="number" min="0" step="0.01" value={form.totalQuotedCost} onChange={set("totalQuotedCost")} />
        </label>
        <label>
          Start date
          <input type="date" value={form.startDate} onChange={set("startDate")} />
        </label>
        <label>
          Target completion date
          <input type="date" value={form.targetCompletionDate} onChange={set("targetCompletionDate")} />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : "Save project"}
          </button>
          <button type="button" className="secondary" onClick={() => go("/projects")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
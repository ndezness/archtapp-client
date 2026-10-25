import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

const CONFIG = {
  task: { heading: "New Task", dateLabel: "Due date", back: "/tasks", save: "Save task" },
  site_visit: {
    heading: "Schedule Site Visit",
    dateLabel: "Visit date",
    back: "/site-visits",
    save: "Save site visit",
  },
};

export default function NewWorkItem({ type }) {
  const cfg = CONFIG[type];
  const go = useNavigate();
  const { data: projects, error: loadError, loading } = useApi("/api/projects");

  const [form, setForm] = useState({ projectId: "", title: "", dueDate: "", notes: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (!form.projectId || !form.title.trim()) {
      setError("Choose a project and enter a title.");
      return;
    }

    setSaving(true);
    try {
      await api("/api/workitems", {
        method: "POST",
        body: JSON.stringify({
          projectId: Number(form.projectId),
          type,
          title: form.title.trim(),
          dueDate: form.dueDate || null,
          notes: form.notes.trim() || null,
        }),
      });
      go(cfg.back);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (loadError) return <p className="error">Could not load projects: {loadError}</p>;

  if (projects.length === 0) {
    return (
      <div>
        <h1>{cfg.heading}</h1>
        <p className="muted">
          This needs a project first. <Link to="/projects/new">Add a project</Link>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>{cfg.heading}</h1>
      <form className="form" onSubmit={submit}>
        <label>
          Project *
          <select value={form.projectId} onChange={set("projectId")}>
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {projectNumber(p.projectId)} {p.projectName} ({p.client?.name})
              </option>
            ))}
          </select>
        </label>
        <label>
          Title *
          <input value={form.title} onChange={set("title")} />
        </label>
        <label>
          {cfg.dateLabel}
          <input type="date" value={form.dueDate} onChange={set("dueDate")} />
        </label>
        <label>
          Notes
          <textarea rows="3" value={form.notes} onChange={set("notes")} />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : cfg.save}
          </button>
          <button type="button" className="secondary" onClick={() => go(cfg.back)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
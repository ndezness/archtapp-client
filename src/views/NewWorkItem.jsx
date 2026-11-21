import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

const CONFIG = {
  task: { heading: "New Task", back: "/tasks", save: "Save task" },
  site_visit: { heading: "Schedule Site Visit", back: "/site-visits", save: "Schedule site visit" },
};

const DURATIONS = [30, 60, 90, 120, 180, 240];

export default function NewWorkItem({ type }) {
  const cfg = CONFIG[type];
  const isVisit = type === "site_visit";
  const go = useNavigate();
  const [params] = useSearchParams();
  const { data: projects, error: loadError, loading } = useApi("/api/projects");

  const [form, setForm] = useState({
    projectId: params.get("projectId") ?? "",
    title: "",
    when: "",
    duration: "60",
    address: "",
    notes: "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Used to tell the user which visit number this will be
  const { data: visits } = useApi(
    `/api/workitems?type=site_visit&status=all&projectId=${form.projectId || 0}`
  );
  const nextVisit = (visits ?? []).reduce((m, v) => Math.max(m, v.visitNumber ?? 0), 0) + 1;

  const openProjects = (projects ?? []).filter((p) => p.status === "active");
  const chosen = openProjects.find((p) => String(p.projectId) === String(form.projectId));
  const defaultAddress = (p) => p?.siteAddress || p?.client?.propertyAddress || "";

  // A project passed in the link fills in the address once the projects have loaded
  useEffect(() => {
    if (isVisit && chosen && !form.address) {
      setForm((f) => ({ ...f, address: defaultAddress(chosen) }));
    }
  }, [chosen]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function pickProject(e) {
    const p = openProjects.find((x) => String(x.projectId) === e.target.value);
    setForm({
      ...form,
      projectId: e.target.value,
      address: isVisit ? defaultAddress(p) : form.address,
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (!form.projectId) {
      setError("Choose a project.");
      return;
    }
    if (isVisit && !form.when) {
      setError("Choose the visit date and time.");
      return;
    }
    if (!isVisit && !form.title.trim()) {
      setError("Enter a title.");
      return;
    }

    const body = isVisit
      ? {
          projectId: Number(form.projectId),
          type,
          dueDate: `${form.when}:00`,
          durationMinutes: Number(form.duration),
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        }
      : {
          projectId: Number(form.projectId),
          type,
          title: form.title.trim(),
          dueDate: form.when || null,
          notes: form.notes.trim() || null,
        };

    setSaving(true);
    try {
      await api("/api/workitems", { method: "POST", body: JSON.stringify(body) });
      go(cfg.back);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (loadError) return <p className="error">Could not load projects: {loadError}</p>;

  if (openProjects.length === 0) {
    return (
      <div>
        <h1>{cfg.heading}</h1>
        <p className="muted">
          This needs an active project first. <Link to="/leads">Convert a lead</Link> to start one.
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
          <select value={form.projectId} onChange={pickProject}>
            <option value="">Select a project...</option>
            {openProjects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.reference ?? projectNumber(p.projectId)} {p.projectName} ({p.client?.name})
              </option>
            ))}
          </select>
        </label>

        {isVisit ? (
          <>
            {chosen && (
              <p className="muted">This will be <strong>Visit {nextVisit}</strong> for this project.</p>
            )}
            <label>
              Date and time *
              <input type="datetime-local" value={form.when} onChange={set("when")} />
            </label>
            <label>
              Duration
              <select value={form.duration} onChange={set("duration")}>
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </label>
            <label>
              Site address
              <input value={form.address} onChange={set("address")} />
            </label>
          </>
        ) : (
          <>
            <label>
              Title *
              <input value={form.title} onChange={set("title")} />
            </label>
            <label>
              Due date
              <input type="date" value={form.when} onChange={set("when")} />
            </label>
          </>
        )}

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
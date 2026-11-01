import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_LABELS = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ClientDetail() {
  const { id } = useParams();
  const go = useNavigate();
  const { data: client, error, loading, reload } = useApi(`/api/clients/${id}`);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function startEdit() {
    setForm({
      name: client.name,
      propertyAddress: client.propertyAddress,
      phone: client.phone ?? "",
      email: client.email ?? "",
    });
    setActionError(null);
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    setActionError(null);

    if (!form.name.trim() || !form.propertyAddress.trim()) {
      setActionError("Name and property address are required.");
      return;
    }

    setSaving(true);
    try {
      await api(`/api/clients/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name.trim(),
          propertyAddress: form.propertyAddress.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
        }),
      });
      setEditing(false);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm(`Delete ${client.name}? This can't be undone.`)) return;
    try {
      await api(`/api/clients/${id}`, { method: "DELETE" });
      go("/clients");
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) return <p className="muted">Loading client...</p>;
  if (error) {
    return (
      <div>
        <Link className="back" to="/clients">← Clients</Link>
        <p className="error">Could not load client: {error}</p>
      </div>
    );
  }

  const projects = [...client.projects].sort((a, b) => b.projectId - a.projectId);

  return (
    <div>
      <Link className="back" to="/clients">← Clients</Link>
      <h1>{client.name}</h1>

      {actionError && <p className="error">{actionError}</p>}

      <section className="panel">
        <div className="panel-head">
          <h2>Contact details</h2>
          {!editing && (
            <button className="secondary" onClick={startEdit}>Edit</button>
          )}
        </div>

        {!editing ? (
          <div>
            <div>{client.propertyAddress}</div>
            <div className="muted">{client.phone || "No phone"}</div>
            <div className="muted">{client.email || "No email"}</div>
          </div>
        ) : (
          <form className="form" onSubmit={save}>
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
            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button type="button" className="secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <h2>Projects</h2>
        {projects.length === 0 && (
          <p className="muted">
            No projects for this client yet. <Link to="/projects/new">Start one</Link>.
          </p>
        )}
        {projects.map((p) => (
          <div className="row" key={p.projectId}>
            <div className="row-main">
              <Link className="row-link" to={`/projects/${p.projectId}`}>
                <span className="number">{projectNumber(p.projectId)}</span>
                {p.projectName}
              </Link>
              <span className={`chip ${p.status}`}>{STATUS_LABELS[p.status] ?? p.status}</span>
            </div>
            <span className="muted">
              {p.totalQuotedCost != null ? `Quoted ${money(p.totalQuotedCost)}` : ""}
            </span>
          </div>
        ))}
      </section>

      {projects.length === 0 && (
        <button className="link-button" onClick={remove}>Delete this client</button>
      )}
    </div>
  );
}
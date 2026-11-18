import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, useApi } from "../api";

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Value for a datetime-local input: right now, in the user's own time
const nowLocal = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// The API's date parser wants seconds, and datetime-local inputs leave them out
const withSeconds = (v) => (v && v.length === 16 ? `${v}:00` : v || null);

const send = (method, path, body) =>
  api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export default function LeadDetail() {
  const { id } = useParams();
  const go = useNavigate();
  const { data: lead, error, loading, reload } = useApi(`/api/leads/${id}`);
  const { data: settings } = useApi("/api/settings");
  const { data: clients } = useApi("/api/clients");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [converting, setConverting] = useState(false);
  const [conv, setConv] = useState({
    projectName: "",
    consultationStart: "",
    fee: "",
    paidAt: nowLocal(),
    existingClientId: "",
  });
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Pre-fill the fee from Settings once it has loaded (left empty if no fee is set)
  useEffect(() => {
    if (!settings) return;
    const fee = settings.ConsultationFee ?? settings.consultationFee;
    if (fee && Number(fee) > 0) {
      setConv((c) => (c.fee === "" ? { ...c, fee } : c));
    }
  }, [settings]);

  const setF = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setC = (field) => (e) => setConv({ ...conv, [field]: e.target.value });

  function startEdit() {
    setForm({
      name: lead.name,
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      siteAddress: lead.siteAddress,
      projectInterest: lead.projectInterest ?? "",
      notes: lead.notes ?? "",
    });
    setActionError(null);
    setEditing(true);
  }

  async function run(fn) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (err) {
      setActionError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.siteAddress.trim()) {
      setActionError("Name and site address are required.");
      return;
    }
    const ok = await run(() => send("PUT", `/api/leads/${id}`, form));
    if (ok) {
      setEditing(false);
      reload();
    }
  }

  async function setStatus(status) {
    const ok = await run(() => send("PUT", `/api/leads/${id}/status`, { status }));
    if (ok) reload();
  }

  async function remove() {
    if (!window.confirm(`Delete the lead for ${lead.name}? This can't be undone.`)) return;
    const ok = await run(() => send("DELETE", `/api/leads/${id}`));
    if (ok) go("/leads");
  }

  async function convert(e) {
    e.preventDefault();
    setActionError(null);

    if (!conv.consultationStart) {
      setActionError("Choose the consultation date and time.");
      return;
    }
    const fee = Number(conv.fee);
    if (!(fee > 0)) {
      setActionError("The consultation fee must be paid before a client can be created.");
      return;
    }
    if (!window.confirm(`Record a consultation fee payment of ${money(fee)} and create the client?`)) {
      return;
    }

    setBusy(true);
    try {
      const res = await send("POST", `/api/leads/${id}/convert`, {
        consultationStart: withSeconds(conv.consultationStart),
        fee,
        paidAt: withSeconds(conv.paidAt),
        projectName: conv.projectName.trim() || null,
        existingClientId: conv.existingClientId ? Number(conv.existingClientId) : null,
      });
      go(`/projects/${res.projectId}`);
    } catch (err) {
      setActionError(err.message);
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading lead...</p>;
  if (error) {
    return (
      <div>
        <Link className="back" to="/leads">← Leads</Link>
        <p className="error">Could not load lead: {error}</p>
      </div>
    );
  }

  const isOpen = lead.status === "open";
  const isLost = lead.status === "lost";
  const isConverted = lead.status === "converted";

  return (
    <div>
      <Link className="back" to="/leads">← Leads</Link>
      <h1>
        {lead.name}{" "}
        {!isOpen && (
          <span className={`chip ${isLost ? "cancelled" : "completed"}`}>{lead.status}</span>
        )}
      </h1>

      {actionError && <p className="error">{actionError}</p>}

      <section className="panel">
        <div className="panel-head">
          <h2>Details</h2>
          {!editing && !isConverted && (
            <button className="secondary" onClick={startEdit}>Edit</button>
          )}
        </div>

        {!editing ? (
          <div>
            <div>{lead.siteAddress}</div>
            <div className="muted">{lead.phone || "No telephone"}</div>
            <div className="muted">{lead.email || "No email"}</div>
            {lead.projectInterest && <div className="chips"><span className="chip">{lead.projectInterest}</span></div>}
            {lead.notes && <p>{lead.notes}</p>}
          </div>
        ) : (
          <form className="form" onSubmit={save}>
            <label>Name *<input value={form.name} onChange={setF("name")} /></label>
            <label>Telephone<input value={form.phone} onChange={setF("phone")} /></label>
            <label>Email<input type="email" value={form.email} onChange={setF("email")} /></label>
            <label>Site address *<input value={form.siteAddress} onChange={setF("siteAddress")} /></label>
            <label>Project interest<input value={form.projectInterest} onChange={setF("projectInterest")} /></label>
            <label>Notes<textarea rows="3" value={form.notes} onChange={setF("notes")} /></label>
            <div className="form-actions">
              <button type="submit" className="primary" disabled={busy}>Save changes</button>
              <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      {isConverted && (
        <section className="panel">
          <h2>Converted</h2>
          <p>
            This lead became a client.{" "}
            {lead.convertedProjectId && (
              <Link to={`/projects/${lead.convertedProjectId}`}>Open the project</Link>
            )}
          </p>
        </section>
      )}

      {isOpen && !converting && (
        <div className="header-actions">
          <button className="primary" onClick={() => setConverting(true)}>Convert to client</button>
          <button className="secondary" onClick={() => setStatus("lost")} disabled={busy}>
            Mark as lost
          </button>
        </div>
      )}

      {isLost && (
        <div className="header-actions">
          <button className="secondary" onClick={() => setStatus("open")} disabled={busy}>
            Reopen lead
          </button>
        </div>
      )}

      {isOpen && converting && (
        <section className="panel">
          <h2>Convert to client</h2>
          <p className="muted">
            A client is created only once the consultation fee has been paid. Consultations last
            one hour, and there are no appointments on Sundays.
          </p>
          <form className="form" onSubmit={convert}>
            <label>
              Consultation date and time *
              <input
                type="datetime-local"
                value={conv.consultationStart}
                onChange={setC("consultationStart")}
              />
            </label>
            <label>
              Consultation fee paid *
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter the amount (set a default under Settings)"
                value={conv.fee}
                onChange={setC("fee")}
              />
            </label>
            <label>
              Paid on
              <input type="datetime-local" value={conv.paidAt} onChange={setC("paidAt")} />
            </label>
            <label>
              Project name
              <input
                placeholder={`${lead.projectInterest || "New project"} - ${lead.name}`}
                value={conv.projectName}
                onChange={setC("projectName")}
              />
            </label>
            <label>
              Returning client?
              <select value={conv.existingClientId} onChange={setC("existingClientId")}>
                <option value="">No, create a new client from this lead</option>
                {clients?.map((c) => (
                  <option key={c.clientId} value={c.clientId}>
                    {c.name} — {c.propertyAddress}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="primary" disabled={busy}>
                {busy ? "Working..." : "Convert to client"}
              </button>
              <button type="button" className="secondary" onClick={() => setConverting(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {!isConverted && (
        <button className="link-button" onClick={remove}>Delete this lead</button>
      )}
    </div>
  );
}
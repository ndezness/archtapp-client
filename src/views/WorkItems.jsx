import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

// Appointment times are wall-clock times in Jamaica, stored without a time zone,
// so they are displayed exactly as entered (hence timeZone: "UTC" below)
const toDate = (iso) => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso + "Z");
const fmtDay = (iso) =>
  toDate(iso).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" });
const fmtTime = (date) =>
  date.toLocaleTimeString([], { timeStyle: "short", timeZone: "UTC" });

const today = () => new Date().toLocaleDateString("en-CA");
const isOverdue = (item) => !item.isDone && item.dueDate && item.dueDate.slice(0, 10) < today();
const isAppointment = (item) => item.type === "consultation" || item.type === "site_visit";
const DURATIONS = [30, 60, 90, 120, 180, 240];

function timeRange(item) {
  const start = toDate(item.dueDate);
  const end = new Date(start.getTime() + (item.durationMinutes ?? 60) * 60000);
  return `${fmtTime(start)} - ${fmtTime(end)}`;
}

export default function WorkItems({ type, title, newPath, newLabel, empty }) {
  const [status, setStatus] = useState("open");
  const { data: items, error, loading, reload } = useApi(
    `/api/workitems?type=${type}&status=${status}`
  );
  const [actionError, setActionError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);

  const setF = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function run(fn) {
    setActionError(null);
    try {
      await fn();
      reload();
      return true;
    } catch (e) {
      setActionError(e.message);
      return false;
    }
  }

  const toggle = (item) =>
    run(() =>
      api(`/api/workitems/${item.workItemId}/done`, {
        method: "PUT",
        body: JSON.stringify({ isDone: !item.isDone }),
      })
    );

  const remove = (item) => {
    if (window.confirm(`Remove "${item.title}"?`)) {
      run(() => api(`/api/workitems/${item.workItemId}`, { method: "DELETE" }));
    }
  };

  function startEdit(item) {
    setForm({
      start: item.dueDate.slice(0, 16),
      duration: String(item.durationMinutes ?? 60),
      address: item.address ?? "",
      notes: item.notes ?? "",
    });
    setEditId(item.workItemId);
    setActionError(null);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!form.start) {
      setActionError("Choose a date and time.");
      return;
    }
    const ok = await run(() =>
      api(`/api/workitems/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          dueDate: `${form.start}:00`,
          durationMinutes: Number(form.duration),
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })
    );
    if (ok) setEditId(null);
  }

  return (
    <div>
      <div className="page-head">
        <h1>{title}</h1>
        <Link className="button-link" to={newPath}>{newLabel}</Link>
      </div>

      <div className="tabs">
        {["open", "done", "all"].map((s) => (
          <button
            key={s}
            className={status === s ? "tab active" : "tab"}
            onClick={() => setStatus(s)}
          >
            {s === "open" ? "Open" : s === "done" ? "Completed" : "All"}
          </button>
        ))}
      </div>

      {actionError && <p className="error">{actionError}</p>}
      {loading && !items && <p className="muted">Loading...</p>}
      {error && <p className="error">Could not load {title.toLowerCase()}: {error}</p>}
      {items && items.length === 0 && <p className="muted">{empty}</p>}

      <div className="list">
        {items?.map((item) => {
          const appt = isAppointment(item);
          const editing = editId === item.workItemId;
          return (
            <div className={`card work-item ${item.isDone ? "old" : ""}`} key={item.workItemId}>
              <input
                type="checkbox"
                checked={item.isDone}
                onChange={() => toggle(item)}
                aria-label={`Mark "${item.title}" ${item.isDone ? "not done" : "done"}`}
              />

              <div className="work-body">
                <div className="card-title">
                  {item.type === "site_visit" ? (
                    <Link className="row-link" to={`/site-visits/${item.workItemId}`}>{item.title}</Link>
                  ) : (
                    item.title
                  )}
                  {item.type === "consultation" && <span className="chip chip-gap">Consultation</span>}
                  {item.type === "site_visit" && item.visitNumber && (
                    <span className="chip chip-gap">Visit {item.visitNumber}</span>
                  )}
                </div>

                <div className="muted">
                  <Link className="row-link" to={`/projects/${item.projectId}`}>
                    {item.reference ?? projectNumber(item.projectId)} {item.projectName}
                  </Link>
                  {" · "}
                  {item.clientName}
                </div>

                {editing ? (
                  <form className="form" onSubmit={saveEdit}>
                    <label>
                      Date and time
                      <input type="datetime-local" value={form.start} onChange={setF("start")} />
                    </label>
                    <label>
                      Duration
                      <select value={form.duration} onChange={setF("duration")}>
                        {DURATIONS.map((m) => (
                          <option key={m} value={m}>{m} minutes</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Address
                      <input value={form.address} onChange={setF("address")} />
                    </label>
                    <label>
                      Notes
                      <textarea rows="2" value={form.notes} onChange={setF("notes")} />
                    </label>
                    <div className="form-actions">
                      <button type="submit" className="primary">Save</button>
                      <button type="button" className="secondary" onClick={() => setEditId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {appt && item.dueDate && (
                      <div className="work-when">
                        {fmtDay(item.dueDate)} · {timeRange(item)}
                      </div>
                    )}
                    {appt && item.address && <div className="muted">{item.address}</div>}
                    {item.notes && <div className="muted">{item.notes}</div>}
                  </>
                )}
              </div>

              <div className="work-side">
                {!appt && item.dueDate && (
                  <span className={isOverdue(item) ? "balance-due" : "muted"}>
                    {isOverdue(item) ? "Overdue · " : ""}
                    {fmtDay(item.dueDate)}
                  </span>
                )}
                {appt && isOverdue(item) && <span className="balance-due">Past due</span>}
                {appt && !item.isDone && !editing && (
                  <button className="link-button neutral" onClick={() => startEdit(item)}>
                    Reschedule
                  </button>
                )}
                <button className="link-button" onClick={() => remove(item)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
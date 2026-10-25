import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

const toDate = (iso) => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso + "Z");
const fmtDay = (iso) =>
  toDate(iso).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" });

// Today's date as YYYY-MM-DD in the user's own time zone
const today = () => new Date().toLocaleDateString("en-CA");
const isOverdue = (item) => !item.isDone && item.dueDate && item.dueDate.slice(0, 10) < today();

export default function WorkItems({ type, title, newPath, newLabel, empty }) {
  const [status, setStatus] = useState("open");
  const { data: items, error, loading, reload } = useApi(
    `/api/workitems?type=${type}&status=${status}`
  );
  const [actionError, setActionError] = useState(null);

  async function run(fn) {
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError(e.message);
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
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error">Could not load {title.toLowerCase()}: {error}</p>}
      {items && items.length === 0 && <p className="muted">{empty}</p>}

      <div className="list">
        {items?.map((item) => (
          <div className={`card work-item ${item.isDone ? "old" : ""}`} key={item.workItemId}>
            <input
              type="checkbox"
              checked={item.isDone}
              onChange={() => toggle(item)}
              aria-label={`Mark "${item.title}" ${item.isDone ? "not done" : "done"}`}
            />
            <div className="work-body">
              <div className="card-title">{item.title}</div>
              <div className="muted">
                <Link className="row-link" to={`/projects/${item.projectId}`}>
                  {projectNumber(item.projectId)} {item.projectName}
                </Link>
                {" · "}
                {item.clientName}
              </div>
              {item.notes && <div className="muted">{item.notes}</div>}
            </div>
            <div className="work-side">
              {item.dueDate && (
                <span className={isOverdue(item) ? "balance-due" : "muted"}>
                  {isOverdue(item) ? "Overdue · " : ""}
                  {fmtDay(item.dueDate)}
                </span>
              )}
              <button className="link-button" onClick={() => remove(item)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
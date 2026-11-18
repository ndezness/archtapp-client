import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";

const TABS = [
  ["open", "Open"],
  ["converted", "Converted"],
  ["lost", "Lost"],
  ["all", "All"],
];

const toDate = (iso) => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso + "Z");

export default function Leads() {
  const [status, setStatus] = useState("open");
  const { data: leads, error, loading } = useApi(`/api/leads?status=${status}`);

  return (
    <div>
      <div className="page-head">
        <h1>Leads</h1>
        <Link className="button-link" to="/leads/new">+ New lead</Link>
      </div>

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={status === key ? "tab active" : "tab"}
            onClick={() => setStatus(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !leads && <p className="muted">Loading leads...</p>}
      {error && <p className="error">Could not load leads: {error}</p>}
      {leads && leads.length === 0 && <p className="muted">No leads in this view.</p>}

      <div className="list">
        {leads?.map((l) => (
          <Link className="card card-link" to={`/leads/${l.leadId}`} key={l.leadId}>
            <div className="card-title">{l.name}</div>
            <div className="muted">{l.siteAddress}</div>
            <div className="muted">{[l.phone, l.email].filter(Boolean).join(" · ")}</div>
            <div className="chips">
              {l.projectInterest && <span className="chip">{l.projectInterest}</span>}
              {l.status !== "open" && (
                <span className={`chip ${l.status === "lost" ? "cancelled" : "completed"}`}>
                  {l.status}
                </span>
              )}
              <span className="muted">
                Added {toDate(l.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
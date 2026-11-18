import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";

// A client is "past" once they have projects and none are still open
const isPast = (c) => c.projectCount > 0 && c.openProjects === 0;

export default function Clients() {
  const { data: clients, error, loading } = useApi("/api/clients");
  const [view, setView] = useState("current");

  if (loading) return <p className="muted">Loading clients...</p>;
  if (error) return <p className="error">Could not load clients: {error}</p>;

  const shown = clients.filter((c) =>
    view === "all" ? true : view === "past" ? isPast(c) : !isPast(c)
  );

  return (
    <div>
      <div className="page-head">
        <h1>Clients</h1>
        <Link className="button-link" to="/leads/new">+ New lead</Link>
      </div>

      <div className="tabs">
        {[
          ["current", "Current"],
          ["past", "Past"],
          ["all", "All"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={view === key ? "tab active" : "tab"}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="muted">No clients in this view.</p>}

      <div className="list">
        {shown.map((c) => (
          <Link className="card card-link" to={`/clients/${c.clientId}`} key={c.clientId}>
            <div className="card-title">{c.name}</div>
            <div className="muted">{c.propertyAddress}</div>
            <div className="muted">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
            <div className="chips">
              <span className="chip">
                {c.openProjects} open · {c.projectCount} total
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
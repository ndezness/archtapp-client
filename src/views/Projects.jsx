import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

const STATUS_LABELS = { on_hold: "On hold", completed: "Completed", cancelled: "Cancelled" };
const isClosed = (p) => p.status === "completed" || p.status === "cancelled";

export default function Projects() {
  const { data: projects, error, loading } = useApi("/api/projects");
  const [view, setView] = useState("open");

  if (loading) return <p className="muted">Loading projects...</p>;
  if (error) return <p className="error">Could not load projects: {error}</p>;

  const shown = projects.filter((p) =>
    view === "all" ? true : view === "closed" ? isClosed(p) : !isClosed(p)
  );

  return (
    <div>
      <div className="page-head">
        <h1>Projects</h1>
        <Link className="button-link" to="/projects/new">+ New project</Link>
      </div>

      <div className="tabs">
        {[
          ["open", "Open"],
          ["closed", "Closed"],
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

      {shown.length === 0 && <p className="muted">No projects in this view.</p>}

      <div className="list">
        {shown.map((p) => (
          <Link className="card card-link" to={`/projects/${p.projectId}`} key={p.projectId}>
            <div className="card-title">
              <span className="number">{p.reference ?? projectNumber(p.projectId)}</span>
              {p.projectName}
            </div>
            <div className="muted">{p.client?.name}</div>
            <div className="chips">
              {p.status !== "active" && (
                <span className={`chip ${p.status}`}>{STATUS_LABELS[p.status] ?? p.status}</span>
              )}
              {p.tracks.map((t) => (
                <span className={`chip ${t.status}`} key={t.projectTrackId}>
                  {t.trackName}: {t.currentStage?.name}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
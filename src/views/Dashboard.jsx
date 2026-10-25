import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toDate = (iso) => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso + "Z");

function timeAgo(iso) {
  if (!iso) return "No activity";
  const days = Math.floor((Date.now() - toDate(iso)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function Stat({ label, value, alert }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${alert ? "balance-due" : ""}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data, error, loading } = useApi("/api/dashboard");
  const [showClosed, setShowClosed] = useState(false);

  if (loading) return <p className="muted">Loading dashboard...</p>;
  if (error) return <p className="error">Could not load dashboard: {error}</p>;

  const { summary, projects } = data;
  const rows = showClosed ? projects : projects.filter((p) => p.status === "active");

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="stats four">
        <Stat label="Active projects" value={summary.activeProjects} />
        <Stat
          label="Blocked tracks"
          value={summary.blockedTracks}
          alert={summary.blockedTracks > 0}
        />
        <Stat label="Outstanding balance" value={money(summary.outstandingBalance)} />
        <Stat
          label={`No activity in ${summary.staleAfterDays} days`}
          value={summary.staleProjects}
          alert={summary.staleProjects > 0}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Projects</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
            />
            Show closed projects
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="muted">No projects to show.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Tracks</th>
                  <th>Balance due</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.projectId}>
                    <td>
                      <Link className="row-link" to={`/projects/${p.projectId}`}>
                        <span className="number">{projectNumber(p.projectId)}</span>
                        {p.projectName}
                      </Link>
                      <div className="muted">
                        {p.clientName}
                        {p.status !== "active" && ` · ${p.status}`}
                      </div>
                    </td>
                    <td>
                      <div className="chips tight">
                        {p.tracks.length === 0 && <span className="muted">No tracks</span>}
                        {p.tracks.map((t) => (
                          <span className={`chip ${t.status}`} key={t.id}>
                            {t.name}: {t.stage}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={p.balanceDue > 0 ? "balance-due" : ""}>
                      {money(p.balanceDue)}
                    </td>
                    <td className={p.isStale ? "balance-due" : ""}>
                      {timeAgo(p.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
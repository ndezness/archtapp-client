import { Link } from "react-router-dom";
import { useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

export default function Projects() {
  const { data: projects, error, loading } = useApi("/api/projects");

  if (loading) return <p className="muted">Loading projects...</p>;
  if (error) return <p className="error">Could not load projects: {error}</p>;

  return (
    <div>
      <h1>Projects</h1>
      {projects.length === 0 && <p className="muted">No projects yet.</p>}
      <div className="list">
        {projects.map((p) => (
          <Link
            className="card card-link"
            to={`/projects/${p.projectId}`}
            key={p.projectId}
          >
            <div className="card-title">
              <span className="number">{projectNumber(p.projectId)}</span>
              {p.projectName}
            </div>
            <div className="muted">{p.client?.name}</div>
            <div className="chips">
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
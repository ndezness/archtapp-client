import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

const toDate = (iso) => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso + "Z");

const FILTERS = [
  { key: "all", label: "All" },
  { key: "progress", label: "Progress" },
  { key: "payments", label: "Payments" },
  { key: "documents", label: "Documents" },
  { key: "work", label: "Tasks & visits" },
  { key: "notes", label: "Notes" },
];

const CATEGORY_OF = {
  track_created: "progress",
  stage_change: "progress",
  status_change: "progress",
  payment_received: "payments",
  payment_removed: "payments",
  document_uploaded: "documents",
  document_removed: "documents",
  site_visit_scheduled: "work",
  task_created: "work",
  work_item_completed: "work",
  work_item_reopened: "work",
  work_item_removed: "work",
  note: "notes",
};

const categoryOf = (type) => CATEGORY_OF[type] ?? "other";
const labelOf = (key) => FILTERS.find((f) => f.key === key)?.label ?? "Other";

function dayLabel(key) {
  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(key + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "full" });
}

export default function Actions() {
  const { data: items, error, loading } = useApi("/api/activitylogs/feed?limit=200");
  const [category, setCategory] = useState("all");
  const [projectId, setProjectId] = useState("");

  if (loading) return <p className="muted">Loading activity...</p>;
  if (error) return <p className="error">Could not load activity: {error}</p>;

  // Projects that appear in the feed, for the dropdown
  const projects = [];
  items.forEach((i) => {
    if (!projects.some((p) => p.projectId === i.projectId)) {
      projects.push({ projectId: i.projectId, projectName: i.projectName });
    }
  });
  projects.sort((a, b) => a.projectId - b.projectId);

  const visible = items.filter(
    (i) =>
      (category === "all" || categoryOf(i.eventType) === category) &&
      (!projectId || i.projectId === Number(projectId))
  );

  // Group consecutive entries by local calendar day (the feed is already newest first)
  const groups = [];
  visible.forEach((item) => {
    const key = toDate(item.createdAt).toLocaleDateString("en-CA");
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  });

  return (
    <div>
      <h1>Actions</h1>
      <p className="muted">Everything that has happened across your projects, newest first.</p>

      <div className="feed-filters">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={category === f.key ? "tab active" : "tab"}
              onClick={() => setCategory(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {projectNumber(p.projectId)} {p.projectName}
            </option>
          ))}
        </select>
      </div>

      {groups.length === 0 && <p className="muted">Nothing to show for this filter.</p>}

      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="feed-day">{dayLabel(g.key)}</h3>
          <div className="panel feed-group">
            {g.items.map((i) => (
              <div className="feed-item" key={i.activityLogId}>
                <div className="feed-time">
                  {toDate(i.createdAt).toLocaleTimeString([], { timeStyle: "short" })}
                </div>
                <div className="feed-body">
                  <div>{i.description}</div>
                  <div className="muted">
                    <Link className="row-link" to={`/projects/${i.projectId}`}>
                      {projectNumber(i.projectId)} {i.projectName}
                    </Link>
                    {" · "}
                    {i.clientName}
                  </div>
                </div>
                <span className="chip">{labelOf(categoryOf(i.eventType))}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
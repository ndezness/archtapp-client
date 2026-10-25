import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, useApi } from "../api";

const projectNumber = (id) => `#${String(id).padStart(3, "0")}`;

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// The API returns timestamps without a "Z", so treat them as UTC explicitly
const toDate = (iso) => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso + "Z");
const fmtDay = (iso) =>
  toDate(iso).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" });
const fmtDateTime = (iso) =>
  toDate(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });
const put = (path, body) => api(path, { method: "PUT", body: JSON.stringify(body) });

export default function ProjectDetail() {
  const { id } = useParams();
  const { data: project, error, loading, reload } = useApi(`/api/projects/${id}`);
  const { data: stages } = useApi("/api/stages");
  const [actionError, setActionError] = useState(null);

  // Runs an API change, refreshes the page, and reports whether it worked
  async function act(fn) {
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

  if (loading) return <p className="muted">Loading project...</p>;
  if (error) {
    return (
      <div>
        <Link className="back" to="/projects">← Projects</Link>
        <p className="error">Could not load project: {error}</p>
      </div>
    );
  }

  const paid = project.payments.reduce((sum, p) => sum + p.amount, 0);
  const quoted = project.totalQuotedCost ?? 0;
  const balance = quoted - paid;

  return (
    <div>
      <Link className="back" to="/projects">← Projects</Link>

      <h1>
        <span className="number">{projectNumber(project.projectId)}</span>
        {project.projectName}
      </h1>
      <p className="muted">
        {project.client?.name} — {project.client?.propertyAddress}
        {" · "}
        <span className={`chip ${project.status === "active" ? "" : "blocked"}`}>
          {project.status}
        </span>
        {project.targetCompletionDate && (
          <> · Target: {fmtDay(project.targetCompletionDate)}</>
        )}
      </p>

      {actionError && <p className="error">{actionError}</p>}

      <TracksPanel project={project} stages={stages ?? []} act={act} />
      <PaymentsPanel
        project={project}
        quoted={quoted}
        paid={paid}
        balance={balance}
        act={act}
      />
      <DocumentsPanel project={project} act={act} />
      <ActivityPanel project={project} act={act} />
    </div>
  );
}

function TracksPanel({ project, stages, act }) {
  const [name, setName] = useState("");
  const [stageId, setStageId] = useState("");

  async function add(e) {
    e.preventDefault();
    if (!name.trim() || stages.length === 0) return;
    const ok = await act(() =>
      post("/api/projecttracks", {
        projectId: project.projectId,
        trackName: name.trim(),
        stageId: Number(stageId || stages[0].stageId),
      })
    );
    if (ok) setName("");
  }

  return (
    <section className="panel">
      <h2>Tracks</h2>
      {project.tracks.length === 0 && (
        <p className="muted">No tracks yet. Add one below, e.g. "Main Design" or "Permitting".</p>
      )}

      {project.tracks.map((t) => (
        <div className="row" key={t.projectTrackId}>
          <div className="row-main">
            <strong>{t.trackName}</strong>
            <span className={`chip ${t.status}`}>{t.status}</span>
          </div>
          <div className="row-controls">
            <select
              value={t.currentStageId}
              onChange={(e) =>
                act(() =>
                  put(`/api/projecttracks/${t.projectTrackId}/stage`, {
                    stageId: Number(e.target.value),
                  })
                )
              }
            >
              {stages.map((s) => (
                <option key={s.stageId} value={s.stageId}>{s.name}</option>
              ))}
            </select>
            <select
              value={t.status}
              onChange={(e) =>
                act(() =>
                  put(`/api/projecttracks/${t.projectTrackId}/status`, {
                    status: e.target.value,
                  })
                )
              }
            >
              <option value="active">active</option>
              <option value="blocked">blocked</option>
              <option value="completed">completed</option>
            </select>
          </div>
        </div>
      ))}

      <form className="inline-form" onSubmit={add}>
        <input
          className="grow"
          placeholder="New track name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
          {stages.map((s) => (
            <option key={s.stageId} value={s.stageId}>Start at: {s.name}</option>
          ))}
        </select>
        <button type="submit" className="primary">Add track</button>
      </form>
    </section>
  );
}

function PaymentsPanel({ project, quoted, paid, balance, act }) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("deposit");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  async function add(e) {
    e.preventDefault();
    if (!(Number(amount) > 0)) return;
    const ok = await act(() =>
      post("/api/payments", {
        projectId: project.projectId,
        amount: Number(amount),
        paymentType: type,
        paymentDate: date || null,
        note: note.trim() || null,
      })
    );
    if (ok) {
      setAmount("");
      setDate("");
      setNote("");
    }
  }

  const payments = [...project.payments].sort(
    (a, b) => toDate(b.paymentDate) - toDate(a.paymentDate)
  );

  return (
    <section className="panel">
      <h2>Payments</h2>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Quoted</div>
          <div className="stat-value">{money(quoted)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Paid</div>
          <div className="stat-value">{money(paid)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Balance due</div>
          <div className={`stat-value ${balance > 0 ? "balance-due" : ""}`}>
            {money(balance)}
          </div>
        </div>
      </div>

      {payments.length === 0 && <p className="muted">No payments recorded yet.</p>}
      {payments.map((p) => (
        <div className="row" key={p.paymentId}>
          <div className="row-main">
            <strong>{money(p.amount)}</strong>
            <span className="chip">{p.paymentType}</span>
            {p.note && <span className="muted">{p.note}</span>}
          </div>
          <span className="muted">{fmtDay(p.paymentDate)}</span>
        </div>
      ))}

      <form className="inline-form" onSubmit={add}>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="deposit">deposit</option>
          <option value="milestone">milestone</option>
          <option value="final">final</option>
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          className="grow"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="submit" className="primary">Record payment</button>
      </form>
      <p className="muted hint">Leave the date empty to use today.</p>
    </section>
  );
}

function DocumentsPanel({ project, act }) {
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState("");

  async function add(e) {
    e.preventDefault();
    if (!fileName.trim()) return;
    const ok = await act(() =>
      post("/api/documents", {
        projectId: project.projectId,
        fileName: fileName.trim(),
        filePath: filePath.trim() || null,
      })
    );
    if (ok) {
      setFileName("");
      setFilePath("");
    }
  }

  const latest = {};
  project.documents.forEach((d) => {
    const key = d.fileName.toLowerCase();
    if (!latest[key] || d.versionNumber > latest[key]) latest[key] = d.versionNumber;
  });

  const docs = [...project.documents].sort(
    (a, b) => a.fileName.localeCompare(b.fileName) || b.versionNumber - a.versionNumber
  );

  return (
    <section className="panel">
      <h2>Documents</h2>
      {docs.length === 0 && <p className="muted">No documents recorded yet.</p>}

      {docs.map((d) => {
        const isCurrent = d.versionNumber === latest[d.fileName.toLowerCase()];
        return (
          <div className={`row ${isCurrent ? "" : "old"}`} key={d.documentId}>
            <div className="row-main">
              <strong>{d.fileName}</strong>
              <span className="chip">v{d.versionNumber}</span>
              {isCurrent && <span className="chip completed">current</span>}
              {d.filePath && <span className="muted">{d.filePath}</span>}
            </div>
            <span className="muted">{fmtDateTime(d.uploadedAt)}</span>
          </div>
        );
      })}

      <form className="inline-form" onSubmit={add}>
        <input
          className="grow"
          placeholder="File name, e.g. Floor Plan.dwg"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
        <input
          className="grow"
          placeholder="Location (optional)"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
        />
        <button type="submit" className="primary">Add document</button>
      </form>
      <p className="muted hint">
        Adding a file name that already exists records it as the next version.
      </p>
    </section>
  );
}

function ActivityPanel({ project, act }) {
  const [text, setText] = useState("");

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const ok = await act(() =>
      post("/api/activitylogs/note", {
        projectId: project.projectId,
        description: text.trim(),
      })
    );
    if (ok) setText("");
  }

  const logs = [...project.activityLogs].sort(
    (a, b) => toDate(b.createdAt) - toDate(a.createdAt)
  );

  return (
    <section className="panel">
      <h2>Activity</h2>

      <form className="inline-form" onSubmit={add}>
        <input
          className="grow"
          placeholder="Add a note, e.g. Site visit scheduled for Friday"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="primary">Add note</button>
      </form>

      <ul className="timeline">
        {logs.map((l) => (
          <li key={l.activityLogId}>
            {l.description}
            <time>
              {fmtDateTime(l.createdAt)} · {l.eventType.replace("_", " ")}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
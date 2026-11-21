import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiBlob, useApi } from "../api";

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

      <ProjectHeader project={project} balance={balance} act={act} />

      {actionError && <p className="error">{actionError}</p>}

      <TracksPanel project={project} stages={stages ?? []} act={act} reload={reload} />
      <AppointmentsPanel project={project} />
      <MilestonesPanel project={project} />
      <PaymentsPanel
        project={project}
        quoted={quoted}
        paid={paid}
        balance={balance}
        act={act}
      />
      <DocumentsPanel project={project} reload={reload} />
      <ActivityPanel project={project} act={act} />
    </div>
  );
}

const STAGE = { PRELIMINARY_DESIGN: 3, APPROVAL: 5, BUILDING_PLANS: 6, PMC: 7, SUBMISSION: 8, COLLECTION: 9, COMPLETION: 10 };
const DATE_LABELS = { 3: "Start date", 5: "Approved on", 8: "Submitted on", 9: "Collected on", 10: "Completed on" };

function StageMoveDialog({ track, stageId, stages, onCancel, onSubmit }) {
  const from = stages.find((s) => s.stageId === track.currentStageId);
  const to = stages.find((s) => s.stageId === stageId);

  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [note, setNote] = useState("");
  const [days, setDays] = useState("");
  const [amount, setAmount] = useState("");
  const [complete, setComplete] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const showDate = DATE_LABELS[stageId] !== undefined;
  const canPay = stageId === STAGE.APPROVAL || stageId === STAGE.COMPLETION;

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (stageId === STAGE.PRELIMINARY_DESIGN && !(Number(days) >= 1)) {
      setError("Enter the number of working days.");
      return;
    }
    if (amount !== "" && !(Number(amount) > 0)) {
      setError("The payment must be more than zero.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        stageId,
        date: showDate && date ? date : null,
        note: note.trim() || null,
        workingDays: stageId === STAGE.PRELIMINARY_DESIGN ? Number(days) : null,
        paymentAmount: canPay && amount !== "" ? Number(amount) : null,
        completeProject: stageId === STAGE.COMPLETION ? complete : null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="dialog form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Move to {to?.name}</h2>
        <p className="muted">
          Track "{track.trackName}": {from?.name} → {to?.name}
        </p>

        {from?.stageId === STAGE.PMC && stageId === STAGE.BUILDING_PLANS && (
          <p className="muted">This records that the PMC review found corrections are needed.</p>
        )}
        {from?.stageId === STAGE.PMC && stageId === STAGE.SUBMISSION && (
          <p className="muted">This records that the PMC accepted the plans.</p>
        )}

        {stageId === STAGE.PRELIMINARY_DESIGN && (
          <label>
            Working days for the preliminary design (Monday to Friday) *
            <input type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
        )}

        {showDate && (
          <label>
            {DATE_LABELS[stageId]}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        )}

        {canPay && (
          <label>
            {stageId === STAGE.APPROVAL
              ? "Fee required to continue, if paid now"
              : "Final payment, if paid now"}
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave empty to record it later under Payments"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        )}

        {stageId === STAGE.COMPLETION && (
          <label className="check">
            <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} />
            Also mark the project completed
          </label>
        )}

        <label>
          Note
          <textarea
            rows="2"
            placeholder={stageId === STAGE.APPROVAL || stageId === 4 ? "Requested changes, approval details..." : ""}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : "Move"}
          </button>
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function TracksPanel({ project, stages, act, reload }) {
  const [name, setName] = useState("");
  const [stageId, setStageId] = useState("");
  const [pending, setPending] = useState(null); // { track, stageId } while the dialog is open

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

  async function moveStage(payload) {
    await put(`/api/projecttracks/${pending.track.projectTrackId}/stage`, payload);
    setPending(null);
    reload();
  }

  return (
    <section className="panel">
      <h2>Tracks</h2>
      {project.tracks.length === 0 && (
        <p className="muted">No tracks yet. Add one below, e.g. "Change Order #1".</p>
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
              onChange={(e) => setPending({ track: t, stageId: Number(e.target.value) })}
            >
              {stages.map((s) => (
                <option key={s.stageId} value={s.stageId}>{s.name}</option>
              ))}
            </select>
            <select
              value={t.status}
              onChange={(e) =>
                act(() =>
                  put(`/api/projecttracks/${t.projectTrackId}/status`, { status: e.target.value })
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
          placeholder="New track name (for work running alongside the main one)"
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

      {pending && (
        <StageMoveDialog
          track={pending.track}
          stageId={pending.stageId}
          stages={stages}
          onCancel={() => setPending(null)}
          onSubmit={moveStage}
        />
      )}
    </section>
  );
}

const PAYMENT_TYPES = [
  ["design_approval", "Design approval fee"],
  ["milestone", "Milestone payment"],
  ["final", "Final payment"],
  ["consultation", "Consultation fee"],
];
const paymentLabel = (t) => PAYMENT_TYPES.find(([v]) => v === t)?.[1] ?? t;

function PaymentsPanel({ project, quoted, paid, balance, act }) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("design_approval");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const hasQuote = quoted > 0;

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
          <div className="stat-value">{hasQuote ? money(quoted) : "Not quoted yet"}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Paid</div>
          <div className="stat-value">{money(paid)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Balance due</div>
          <div className={`stat-value ${hasQuote && balance > 0 ? "balance-due" : ""}`}>
            {hasQuote ? money(balance) : "—"}
          </div>
        </div>
      </div>
      {!hasQuote && (
        <p className="muted hint">Enter the quoted cost under Edit details to see the balance due.</p>
      )}

      {payments.length === 0 && <p className="muted">No payments recorded yet.</p>}
      {payments.map((p) => (
        <div className="row" key={p.paymentId}>
          <div className="row-main">
            <strong>{money(p.amount)}</strong>
            <span className="chip">{paymentLabel(p.paymentType)}</span>
            {p.receiptNumber && <span className="muted">{p.receiptNumber}</span>}
            {p.note && <span className="muted">{p.note}</span>}
          </div>
          <div className="row-controls">
            <span className="muted">{fmtDay(p.paymentDate)}</span>
            <Link className="link-button neutral" to={`/receipts/${p.paymentId}`}>Receipt</Link>
          </div>
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
          {PAYMENT_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
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
      <p className="muted hint">Leave the date empty to use today. A receipt number is created automatically.</p>
    </section>
  );
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const ACCEPT =
  ".dwg,.dxf,.skp,.rvt,.ifc,.pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

const kindOf = (d) =>
  d.contentType === "application/pdf"
    ? "pdf"
    : d.contentType?.startsWith("image/")
    ? "image"
    : "other";

const fmtSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function DocumentsPanel({ project, reload }) {
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [preview, setPreview] = useState(null);

  // Frees the temporary in-browser copy of a previewed file when it changes or closes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  // Escape closes the preview
  useEffect(() => {
    if (!preview) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  async function run(fn) {
    setLocalError(null);
    try {
      await fn();
      reload();
      return true;
    } catch (err) {
      setLocalError(err.message);
      return false;
    }
  }

  function pick(e) {
    const chosen = e.target.files?.[0] ?? null;
    setLocalError(null);
    if (chosen && chosen.size > MAX_UPLOAD_BYTES) {
      setLocalError("That file is over the 100 MB limit.");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(chosen);
  }

  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);

    const body = new FormData();
    body.append("projectId", String(project.projectId));
    body.append("file", file);

    const ok = await run(() => api("/api/documents/upload", { method: "POST", body }));
    setUploading(false);
    if (ok) {
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function openPreview(d) {
    setBusyId(d.documentId);
    setLocalError(null);
    try {
      const blob = await apiBlob(`/api/documents/${d.documentId}/file`);
      setPreview({
        url: URL.createObjectURL(blob),
        title: `${d.fileName} (v${d.versionNumber})`,
        fileName: d.fileName,
        kind: kindOf(d),
      });
    } catch (err) {
      setLocalError(err.message);
    }
    setBusyId(null);
  }

  async function download(d) {
    setBusyId(d.documentId);
    setLocalError(null);
    try {
      const blob = await apiBlob(`/api/documents/${d.documentId}/file`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setLocalError(err.message);
    }
    setBusyId(null);
  }

  function remove(d) {
    if (
      window.confirm(`Remove "${d.fileName}" version ${d.versionNumber}? The stored file is deleted too.`)
    ) {
      run(() => api(`/api/documents/${d.documentId}`, { method: "DELETE" }));
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
      {docs.length === 0 && (
        <p className="muted">No documents yet. Upload drawings, renders or PDFs below.</p>
      )}

      {docs.map((d) => {
        const isCurrent = d.versionNumber === latest[d.fileName.toLowerCase()];
        const kind = kindOf(d);
        const busy = busyId === d.documentId;
        return (
          <div className={`row ${isCurrent ? "" : "old"}`} key={d.documentId}>
            <div className="row-main">
              <strong>{d.fileName}</strong>
              <span className="chip">v{d.versionNumber}</span>
              {isCurrent && <span className="chip completed">current</span>}
              {d.sizeBytes != null && <span className="muted">{fmtSize(d.sizeBytes)}</span>}
              {!d.hasFile && (
                <span className="muted">{d.filePath ? d.filePath : "No file stored"}</span>
              )}
            </div>
            <div className="row-controls">
              <span className="muted">{fmtDateTime(d.uploadedAt)}</span>
              {d.hasFile && kind !== "other" && (
                <button
                  className="link-button neutral"
                  disabled={busy}
                  onClick={() => openPreview(d)}
                >
                  Preview
                </button>
              )}
              {d.hasFile && (
                <button className="link-button neutral" disabled={busy} onClick={() => download(d)}>
                  {busy ? "Working..." : "Download"}
                </button>
              )}
              <button className="link-button" onClick={() => remove(d)}>Remove</button>
            </div>
          </div>
        );
      })}

      <form className="inline-form" onSubmit={upload}>
        <input
          ref={fileInput}
          className="grow file-input"
          type="file"
          accept={ACCEPT}
          onChange={pick}
        />
        <button type="submit" className="primary" disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      <p className="muted hint">
        Uploading a file with the same name as an existing one saves it as the next version. Up to
        100 MB. Drawings (.dwg) are stored and can be downloaded; images and PDFs can also be
        previewed here.
      </p>
      {localError && <p className="error">{localError}</p>}

      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>{preview.title}</strong>
              <div className="row-controls">
                <a className="button-link" href={preview.url} download={preview.fileName}>
                  Download
                </a>
                <button className="secondary" onClick={() => setPreview(null)}>Close</button>
              </div>
            </div>
            <div className="modal-body">
              {preview.kind === "image" ? (
                <img src={preview.url} alt={preview.title} />
              ) : (
                <iframe src={preview.url} title={preview.title} />
              )}
            </div>
          </div>
        </div>
      )}
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
const STATUS_LABELS = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const dateValue = (iso) => (iso ? iso.slice(0, 10) : "");

function ProjectHeader({ project, balance, act }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function startEdit() {
    setForm({
      projectName: project.projectName,
      totalQuotedCost: project.totalQuotedCost ?? "",
      startDate: dateValue(project.startDate),
      targetCompletionDate: dateValue(project.targetCompletionDate),
    });
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.projectName.trim()) return;
    const ok = await act(() =>
      put(`/api/projects/${project.projectId}`, {
        projectName: form.projectName.trim(),
        totalQuotedCost: form.totalQuotedCost === "" ? null : Number(form.totalQuotedCost),
        startDate: form.startDate || null,
        targetCompletionDate: form.targetCompletionDate || null,
      })
    );
    if (ok) setEditing(false);
  }

  function changeStatus(next) {
    if (next === "completed") {
      const warnings = [];
      const openTracks = project.tracks.filter((t) => t.status !== "completed").length;
      if (balance > 0) warnings.push(`There is still a balance of ${money(balance)} outstanding.`);
      if (openTracks > 0) warnings.push(`${openTracks} track(s) are not marked completed.`);
      if (warnings.length > 0 && !window.confirm(`${warnings.join("\n")}\n\nMark the project completed anyway?`)) {
        return;
      }
    } else if (next === "cancelled") {
      if (!window.confirm("Cancel this project? It leaves the open lists, but all its records are kept.")) {
        return;
      }
    }
    act(() => put(`/api/projects/${project.projectId}/status`, { status: next }));
  }

  return (
    <div>
        <h1>
          <span className="number">{project.reference ?? projectNumber(project.projectId)}</span>
          {project.projectName}
        </h1>
      <p className="muted">
        <Link className="row-link" to={`/clients/${project.clientId}`}>
          {project.client?.name}
        </Link>
        {" — "}
        {project.client?.propertyAddress}
        {project.startDate && <> · Started: {fmtDay(project.startDate)}</>}
        {project.targetCompletionDate && <> · Target: {fmtDay(project.targetCompletionDate)}</>}
      </p>

      {!editing && (
        <div className="header-actions">
          <span className={`chip ${project.status}`}>
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
          <select
            value={project.status}
            onChange={(e) => changeStatus(e.target.value)}
            aria-label="Project status"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button className="secondary" onClick={startEdit}>Edit details</button>
        </div>
      )}

      {editing && (
        <form className="panel form" onSubmit={save}>
          <h2>Edit project details</h2>
          <label>
            Project name *
            <input value={form.projectName} onChange={set("projectName")} />
          </label>
          <label>
            Quoted cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.totalQuotedCost}
              onChange={set("totalQuotedCost")}
            />
          </label>
          <label>
            Start date
            <input type="date" value={form.startDate} onChange={set("startDate")} />
          </label>
          <label>
            Target completion date
            <input
              type="date"
              value={form.targetCompletionDate}
              onChange={set("targetCompletionDate")}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="primary">Save changes</button>
            <button type="button" className="secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


function AppointmentsPanel({ project }) {
  const { data: items } = useApi(
    `/api/workitems?type=consultation,site_visit&status=all&projectId=${project.projectId}`
  );

  // Appointment times are wall-clock times in Jamaica, so they are shown exactly as entered
  const when = (iso) =>
    toDate(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

  const sorted = [...(items ?? [])].sort((a, b) => toDate(a.dueDate) - toDate(b.dueDate));
  const visitCount = sorted.filter((i) => i.type === "site_visit").length;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Appointments</h2>
        <Link className="button-link" to={`/site-visits/new?projectId=${project.projectId}`}>
          + Schedule site visit
        </Link>
      </div>

      {sorted.length === 0 && <p className="muted">No appointments yet.</p>}
      {sorted.length > 0 && (
        <p className="muted">
          {visitCount} site {visitCount === 1 ? "visit" : "visits"} so far
        </p>
      )}

      {sorted.map((i) => (
        <div className={`row ${i.isDone ? "old" : ""}`} key={i.workItemId}>
          <div className="row-main">
            <strong>{i.type === "consultation" ? "Consultation" : `Visit ${i.visitNumber}`}</strong>
            {i.isDone && <span className="chip completed">done</span>}
            {i.address && <span className="muted">{i.address}</span>}
          </div>
          <span className="muted">{i.dueDate ? when(i.dueDate) : ""}</span>
        </div>
      ))}
    </section>
  );
}
function MilestonesPanel({ project }) {
  const outcome =
    project.pmcOutcome === "accepted"
      ? "Accepted"
      : project.pmcOutcome === "corrections_required"
      ? "Corrections required"
      : null;

  const rows = [
    [
      "Preliminary design",
      project.designWorkingDays
        ? `${project.designWorkingDays} working days (Mon-Fri)${
            project.designDueDate ? `, due ${fmtDay(project.designDueDate)}` : ""
          }`
        : null,
    ],
    ["Design approved", project.designApprovedOn ? fmtDay(project.designApprovedOn) : null],
    ["PMC review", outcome],
    ["Permit submitted", project.permitSubmittedOn ? fmtDay(project.permitSubmittedOn) : null],
    ["Permit collected", project.permitCollectedOn ? fmtDay(project.permitCollectedOn) : null],
  ];

  return (
    <section className="panel">
      <h2>Milestones</h2>
      {rows.map(([label, value]) => (
        <div className="row" key={label}>
          <span>{label}</span>
          <span className={value ? "" : "muted"}>{value ?? "—"}</span>
        </div>
      ))}
    </section>
  );
}
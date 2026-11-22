import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiBlob, useApi } from "../api";

const MAX_SIDE = 2000;

// Appointment times are wall-clock times in Jamaica, so they are shown exactly as entered
const toDate = (iso) => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso + "Z");
const fmtWhen = (iso) =>
  toDate(iso).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short", timeZone: "UTC" });

// Shrinks large phone photos before upload. If the browser can't read the image,
// the original is uploaded unchanged.
async function shrink(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function Photo({ doc, onOpen, onRemove }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const isImage = doc.contentType?.startsWith("image/");

  // Photos need the login token, so each one is fetched and shown from a temporary copy
  useEffect(() => {
    if (!isImage) return;
    let gone = false;
    let objectUrl = null;
    apiBlob(`/api/documents/${doc.documentId}/file`)
      .then((blob) => {
        if (gone) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.documentId, isImage]);

  return (
    <div className="photo">
      {url ? (
        <img src={url} alt={doc.fileName} onClick={() => onOpen(url, doc.fileName)} />
      ) : (
        <div className="photo-placeholder">
          {failed ? "Could not load" : isImage ? "Loading..." : doc.fileName}
        </div>
      )}
      <button className="photo-remove" onClick={() => onRemove(doc)} aria-label="Remove photo">
        Remove
      </button>
    </div>
  );
}

export default function SiteVisit() {
  const { id } = useParams();
  const { data: visit, error, loading, reload } = useApi(`/api/workitems/${id}/detail`);
  const { data: photos, reload: reloadPhotos } = useApi(`/api/documents?workItemId=${id}`);

  const [notes, setNotes] = useState(null);
  const [notesMessage, setNotesMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [viewer, setViewer] = useState(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    if (visit && notes === null) setNotes(visit.notes ?? "");
  }, [visit, notes]);

  // Escape closes the large photo
  useEffect(() => {
    if (!viewer) return;
    const onKey = (e) => {
      if (e.key === "Escape") setViewer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  async function saveNotes() {
    setActionError(null);
    setNotesMessage(null);
    try {
      await api(`/api/workitems/${id}/notes`, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      });
      setNotesMessage("Notes saved.");
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function toggleDone() {
    setActionError(null);
    try {
      await api(`/api/workitems/${id}/done`, {
        method: "PUT",
        body: JSON.stringify({ isDone: !visit.isDone }),
      });
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function addFiles(files) {
    if (files.length === 0) return;
    setUploadError(null);
    const failures = [];

    for (let i = 0; i < files.length; i++) {
      setProgress(`Uploading ${i + 1} of ${files.length}...`);
      try {
        const small = await shrink(files[i]);
        const body = new FormData();
        body.append("projectId", String(visit.projectId));
        body.append("workItemId", String(visit.workItemId));
        body.append("file", small);
        await api("/api/documents/upload", { method: "POST", body });
      } catch (err) {
        failures.push(`${files[i].name}: ${err.message}`);
      }
    }

    setProgress(null);
    if (failures.length > 0) setUploadError(failures.join("\n"));
    reloadPhotos();
  }

  function picked(e) {
    // Copy the list first: clearing the input also empties the live FileList
    const files = [...e.target.files];
    e.target.value = "";
    addFiles(files);
  }

  async function removePhoto(doc) {
    if (!window.confirm(`Remove "${doc.fileName}"?`)) return;
    try {
      await api(`/api/documents/${doc.documentId}`, { method: "DELETE" });
      reloadPhotos();
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) return <p className="muted">Loading site visit...</p>;
  if (error) {
    return (
      <div>
        <Link className="back" to="/site-visits">← Appointments</Link>
        <p className="error">Could not load the site visit: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <Link className="back" to="/site-visits">← Appointments</Link>

      <h1>
        Visit {visit.visitNumber}{" "}
        <span className={`chip ${visit.isDone ? "completed" : ""}`}>
          {visit.isDone ? "completed" : "scheduled"}
        </span>
      </h1>
      <p className="muted">
        <Link className="row-link" to={`/projects/${visit.projectId}`}>
          {visit.reference ?? `#${String(visit.projectId).padStart(3, "0")}`} {visit.projectName}
        </Link>
        {" · "}
        {visit.clientName}
      </p>
      <p>
        <strong>{visit.dueDate ? fmtWhen(visit.dueDate) : "No date set"}</strong>
        {visit.durationMinutes ? ` · ${visit.durationMinutes} minutes` : ""}
        {visit.address && <><br />{visit.address}</>}
      </p>

      <div className="header-actions">
        <button className="secondary" onClick={toggleDone}>
          {visit.isDone ? "Reopen visit" : "Mark as completed"}
        </button>
        {!visit.isDone && (
          <Link className="button-link" to="/site-visits">Reschedule from the list</Link>
        )}
      </div>

      {actionError && <p className="error">{actionError}</p>}

      <section className="panel">
        <h2>Site notes</h2>
        <textarea
          className="notes-box"
          rows="6"
          placeholder="Measurements, conditions, what the client asked for..."
          value={notes ?? ""}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesMessage(null);
          }}
        />
        <div className="form-actions">
          <button className="primary" onClick={saveNotes}>Save notes</button>
          {notesMessage && <span className="success">{notesMessage}</span>}
        </div>
      </section>

      <section className="panel">
        <h2>Photos {photos && photos.length > 0 ? `(${photos.length})` : ""}</h2>

        <div className="upload-buttons">
          <button className="primary" onClick={() => cameraRef.current?.click()} disabled={!!progress}>
            Take photo
          </button>
          <button className="secondary" onClick={() => galleryRef.current?.click()} disabled={!!progress}>
            Add photos
          </button>
          {progress && <span className="muted">{progress}</span>}
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={picked} />
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={picked} />

        <p className="muted hint">
          Photos stay with this visit. Large photos are shrunk before upload to save space.
        </p>
        {uploadError && <p className="error" style={{ whiteSpace: "pre-line" }}>{uploadError}</p>}

        {photos && photos.length === 0 && <p className="muted">No photos yet.</p>}
        <div className="photo-grid">
          {photos?.map((d) => (
            <Photo
              key={d.documentId}
              doc={d}
              onOpen={(url, name) => setViewer({ url, name })}
              onRemove={removePhoto}
            />
          ))}
        </div>
      </section>

      {viewer && (
        <div className="modal-backdrop" onClick={() => setViewer(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>{viewer.name}</strong>
              <button className="secondary" onClick={() => setViewer(null)}>Close</button>
            </div>
            <div className="modal-body">
              <img src={viewer.url} alt={viewer.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
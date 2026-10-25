import { useApi } from "../api";

export default function Clients() {
  const { data: clients, error, loading } = useApi("/api/clients");

  if (loading) return <p className="muted">Loading clients...</p>;
  if (error) return <p className="error">Could not load clients: {error}</p>;

  return (
    <div>
      <h1>Clients</h1>
      {clients.length === 0 && <p className="muted">No clients yet.</p>}
      <div className="list">
        {clients.map((c) => (
          <div className="card" key={c.clientId}>
            <div className="card-title">{c.name}</div>
            <div className="muted">{c.propertyAddress}</div>
            <div className="muted">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
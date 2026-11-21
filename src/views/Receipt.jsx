import { Link, useParams } from "react-router-dom";
import { useApi } from "../api";

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toDate = (iso) => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso + "Z");
const fmtDate = (iso) =>
  toDate(iso).toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" });

const TYPE_LABELS = {
  consultation: "Consultation fee",
  design_approval: "Design approval fee",
  milestone: "Milestone payment",
  final: "Final payment",
  deposit: "Deposit",
};

export default function Receipt() {
  const { id } = useParams();
  const { data: r, error, loading } = useApi(`/api/payments/${id}/receipt`);

  if (loading) return <p className="muted">Loading receipt...</p>;
  if (error) return <p className="error">Could not load receipt: {error}</p>;

  const { business } = r;
  const label = TYPE_LABELS[r.paymentType] ?? r.paymentType;

  const mailto = r.client.email
    ? `mailto:${r.client.email}?subject=${encodeURIComponent(
        `Receipt ${r.receiptNumber ?? ""} from ${business.name}`
      )}&body=${encodeURIComponent(
        `Dear ${r.client.name},\n\nThank you for your payment of ${money(r.amount)}. Your receipt is attached.\n\n${business.name}\n${business.phone}`
      )}`
    : null;

  return (
    <div className="receipt-wrap">
      <div className="no-print receipt-actions">
        <Link className="back" to={`/projects/${r.projectId}`}>← Back to project</Link>
        <div className="header-actions">
          <button className="primary" onClick={() => window.print()}>Print / save as PDF</button>
          {mailto && <a className="button-link" href={mailto}>Email receipt</a>}
        </div>
        <p className="muted hint">
          To email it: choose "Save as PDF" in the print window, then attach the file to the email.
        </p>
      </div>

      <article className="receipt">
        <header className="receipt-head">
          <img className="receipt-logo" src="/logo-full.png" alt="" />
          <div className="receipt-business">
            <strong>{business.name}</strong>
            {business.address && <div>{business.address}</div>}
            {business.phone && <div>{business.phone}</div>}
            {business.email && <div>{business.email}</div>}
          </div>
        </header>

        <h1>Receipt</h1>

        <dl className="receipt-meta">
          <div><dt>Receipt no.</dt><dd>{r.receiptNumber ?? "—"}</dd></div>
          <div><dt>Date</dt><dd>{fmtDate(r.paymentDate)}</dd></div>
          <div><dt>Project</dt><dd>{r.reference ?? `#${String(r.projectId).padStart(3, "0")}`}</dd></div>
        </dl>

        <div className="receipt-to">
          <div className="muted">Received from</div>
          <strong>{r.client.name}</strong>
          {r.siteAddress && <div>{r.siteAddress}</div>}
        </div>

        <table className="receipt-table">
          <thead>
            <tr><th>Description</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {label} — {r.projectName}
                {r.note && <div className="muted">{r.note}</div>}
              </td>
              <td className="num">{money(r.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="receipt-totals">
          <div><span>Amount paid</span><strong>{money(r.amount)}</strong></div>
          {r.outstanding != null && (
            <>
              <div><span>Total paid to date</span><span>{money(r.totalPaid)}</span></div>
              <div>
                <span>Outstanding balance</span>
                <strong>{r.outstanding > 0 ? money(r.outstanding) : "Paid in full"}</strong>
              </div>
            </>
          )}
        </div>

        <footer className="receipt-foot">Thank you for your payment.</footer>
      </article>
    </div>
  );
}
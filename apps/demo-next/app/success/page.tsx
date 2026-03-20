import Link from "next/link";
import { cookies } from "next/headers";

export default async function SuccessPage() {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get("datafast_visitor_id")?.value ?? "Missing";
  const sessionId = cookieStore.get("datafast_session_id")?.value ?? "Missing";

  return (
    <main className="success-shell">
      <section className="panel success-panel">
        <div className="eyebrow">Payment Returned</div>
        <h1>Checkout completed. Webhook attribution should be the next hop.</h1>
        <p>
          If your Creem webhook is pointed at this app, the debug feed on the landing page will show
          the exact DataFast payload forwarded by the package.
        </p>
        <div className="metric-grid">
          <div className="metric-card metric-card-good">
            <span>Visitor ID</span>
            <strong>{visitorId}</strong>
          </div>
          <div className="metric-card metric-card-good">
            <span>Session ID</span>
            <strong>{sessionId}</strong>
          </div>
        </div>
        <Link className="primary-button" href="/">
          Back To Demo
        </Link>
      </section>
    </main>
  );
}

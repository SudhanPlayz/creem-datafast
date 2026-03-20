import { DemoDashboard } from "@/components/demo-dashboard";
import { getDirectPaymentLink } from "@/lib/direct-payment-link";

export default async function HomePage() {
  const directPaymentLink = await getDirectPaymentLink();

  return (
    <main className="page-shell">
      <div className="page-grid">
        <aside className="sidebar-copy">
          <div className="eyebrow">Demo App</div>
          <h2>Landing page, checkout, webhook, attribution payload.</h2>
          <p>
            The server checkout button uses the package wrapper directly. The direct-link button uses
            the browser helper to append DataFast metadata onto a hosted Creem payment link.
          </p>
          <ul className="feature-list">
            <li>Reads `datafast_visitor_id` and `datafast_session_id` from browser cookies</li>
            <li>Injects tracking into checkout metadata without extra merchant glue</li>
            <li>Shows the exact DataFast payment payload after webhook processing</li>
          </ul>
        </aside>
        <DemoDashboard directPaymentLink={directPaymentLink} />
      </div>
    </main>
  );
}

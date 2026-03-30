import Link from "next/link";
import { cookies } from "next/headers";

import { listDebugEvents } from "@/lib/debug-store";

type SuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const visitorId =
    getFirst(params.datafast_visitor_id) ??
    cookieStore.get("datafast_visitor_id")?.value ??
    "Missing";
  const forwarded = listDebugEvents().some((event) => event.kind === "forward");

  return (
    <main className="success-shell">
      <section className="success-panel">
        <span className="section-kicker">Checkout complete</span>
        <h1>Payment Successful</h1>

        <div className="success-list">
          <p>
            <strong>Visitor ID:</strong> {visitorId}
          </p>
          <p>
            <strong>Revenue sent to DataFast:</strong> {forwarded ? "Yes ✔" : "Waiting for webhook"}
          </p>
        </div>

        <div className="success-actions">
          <Link className="page-button page-button-primary" href="/#demo">
            Back to Demo
          </Link>
          <Link className="page-button page-button-secondary" href="/#frameworks">
            View Examples
          </Link>
        </div>
      </section>
    </main>
  );
}

function getFirst(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

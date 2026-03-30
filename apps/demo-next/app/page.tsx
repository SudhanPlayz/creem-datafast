import { DemoDashboard } from "@/components/demo-dashboard";
import { FrameworkTabs } from "@/components/framework-tabs";
import { getDemoOffer } from "@/lib/demo-offer";

const frameworkExamples = [
  {
    label: "Next.js",
    code: `export async function POST(request: Request) {
  const checkout = await creemDataFast.createCheckout(
    { productId: process.env.CREEM_PRODUCT_ID! },
    { request },
  );

  return Response.redirect(checkout.checkoutUrl!, 303);
}`,
  },
  {
    label: "Express",
    code: `app.post(
  "/webhooks/creem",
  express.raw({ type: "application/json" }),
  createExpressWebhookHandler(creemDataFast),
);`,
  },
];

const underTheHood = [
  "`createCheckout(...)` resolves DataFast tracking from the request.",
  "Tracking is merged into CREEM metadata without losing your own metadata.",
  "`createNextWebhookHandler(...)` and `createExpressWebhookHandler(...)` are built in.",
  "The same package also ships `/client` and `/react` helpers for browser flows.",
];

const whyExists = [
  "Attribution usually breaks between payments and analytics.",
  "Revenue events should not require manual glue code.",
  "This keeps checkout and attribution in one clean layer.",
];

export default async function HomePage() {
  const offer = await getDemoOffer();

  return (
    <main className="landing-page">
      <DemoDashboard offer={offer} />

      <section className="page-section clean-section" id="under-the-hood">
        <div className="section-heading-block">
          <span className="section-kicker">What's happening under the hood</span>
          <h2>A small package surface, not a pile of glue code.</h2>
        </div>

        <div className="clean-grid">
          <article className="clean-panel">
            <ul className="bullet-list">
              {underTheHood.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="clean-panel">
            <pre>{`import { createNextWebhookHandler } from "@itzsudhan/creem-datafast/next";

export const POST = createNextWebhookHandler(creemDataFast);`}</pre>
          </article>
        </div>
      </section>

      <section className="page-section clean-section" id="frameworks">
        <div className="section-heading-block">
          <span className="section-kicker">Framework examples</span>
          <h2>Small enough to scan in one pass.</h2>
        </div>

        <FrameworkTabs examples={frameworkExamples} />
      </section>

      <section className="page-section clean-section" id="install">
        <div className="section-heading-block">
          <span className="section-kicker">Install</span>
          <h2>Install it and start fast.</h2>
        </div>

        <div className="clean-grid">
          <article className="clean-panel">
            <pre>{`pnpm add @itzsudhan/creem-datafast`}</pre>
          </article>
          <article className="clean-panel">
            <pre>{`import { createCreemDataFast } from "@itzsudhan/creem-datafast"`}</pre>
          </article>
        </div>
      </section>

      <section className="page-section clean-section clean-section-last" id="why">
        <div className="section-heading-block">
          <span className="section-kicker">Why this exists</span>
          <h2>Payments are not analytics. This closes the gap.</h2>
        </div>

        <article className="clean-panel">
          <ul className="bullet-list">
            {whyExists.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}

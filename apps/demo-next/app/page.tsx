import { DemoDashboard } from "@/components/demo-dashboard";
import { getDirectPaymentLink } from "@/lib/direct-payment-link";

const agentPrompt =
  "Read https://creem-datafast.itzsudhan.com/SKILL.md and integrate @itzsudhan/creem-datafast into this app.";
const skillCommand = "npx @itzsudhan/creem-datafast skill --write ./SKILL.md";
const packageCommand = "pnpm add @itzsudhan/creem-datafast";
const frameworkCookbookUrl =
  "https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/frameworks/README.md";

const runtimeBelt = [
  "Next.js",
  "Express",
  "Fastify",
  "Hono",
  "Bun",
  "Elysia",
  "Nitro",
  "NestJS",
];

const qualityFacts = [
  { label: "Tests", value: "80 passing" },
  { label: "Coverage", value: "99.84%" },
  { label: "React Layer", value: "/react shipped" },
  { label: "CI", value: "Node 18 / 20 / 22 + Bun" },
];

const coreProofs = [
  {
    label: "Official Core SDK",
    value: "Built on top of the real `creem` package, not a wrapper around a wrapper.",
  },
  {
    label: "Metadata Injection",
    value: "Resolves DataFast visitor/session IDs and merges them into CREEM checkout metadata.",
  },
  {
    label: "React Surface",
    value: "Ships a provider, hooks, checkout button, payment-link button, status badge, and tracking inspector under `@itzsudhan/creem-datafast/react`.",
  },
  {
    label: "Same-Origin Browser Events",
    value: "The demo proxies DataFast browser events through Next.js to make attribution more reliable.",
  },
];

const frameworkRecipes = [
  {
    name: "Next.js",
    runtime: "Official helper",
    snippet: "export const POST = createNextWebhookHandler(client);",
  },
  {
    name: "Express",
    runtime: "Raw body",
    snippet: "await client.handleWebhook({ rawBody: req.body.toString('utf8'), headers: req.headers });",
  },
  {
    name: "Bun",
    runtime: "Fetch Request",
    snippet: "const result = await client.handleWebhookRequest(request);",
  },
  {
    name: "Hono",
    runtime: "Fetch Request",
    snippet: "const result = await client.handleWebhookRequest(c.req.raw);",
  },
  {
    name: "Fastify",
    runtime: "Raw body",
    snippet: "await client.handleWebhook({ rawBody: request.body as string, headers: request.headers });",
  },
  {
    name: "NestJS",
    runtime: "Raw body",
    snippet: "await client.handleWebhook({ rawBody: req.body.toString('utf8'), headers });",
  },
];

const capabilityCards = [
  {
    title: "Zero-Glue Checkout Creation",
    body: "The package resolves tracking from browser context or explicit input, then injects the final DataFast IDs before the checkout ever leaves your app.",
    tone: "peach",
  },
  {
    title: "Hosted CREEM Link Support",
    body: "If you use direct CREEM payment links instead of server-created checkouts, the browser helper still appends the attribution metadata for you.",
    tone: "mint",
  },
  {
    title: "Production Runtime Guards",
    body: "Webhook signatures, event dedupe, retry with backoff, currency-aware amount conversion, and optional transaction hydration are part of the default path.",
    tone: "violet",
  },
  {
    title: "Visible Proof Loop",
    body: "The demo does not hide behind promises. It shows browser tracking, checkout metadata resolution, webhook processing, and the exact payment payload forwarded to DataFast.",
    tone: "ink",
  },
];

const workflow = [
  "The DataFast SDK creates a real visitor and session, then flushes the first pageview through the demo's same-origin proxy.",
  "Checkout creation injects the resolved DataFast IDs into CREEM metadata, whether the flow starts from your API route or a hosted payment link.",
  "When CREEM sends the webhook, the package verifies the signature, normalizes the payment payload, and forwards the revenue event to DataFast.",
];

export default async function HomePage() {
  const directPaymentLink = await getDirectPaymentLink();

  return (
    <main className="landing-shell">
      <header className="top-strip">
        <a className="brand-lockup" href="/">
          <span className="brand-mark">CREEM × DATAFAST</span>
          <span className="brand-subtitle">@itzsudhan/creem-datafast</span>
        </a>
        <nav className="top-nav">
          <a className="top-link" href="#frameworks">
            Frameworks
          </a>
          <a className="top-link" href="/SKILL.md">
            AI Skill
          </a>
          <a className="top-link" href="#live-demo">
            Live Demo
          </a>
          <a className="top-link" href="https://github.com/SudhanPlayz/creem-datafast">
            GitHub
          </a>
        </nav>
      </header>

      <section className="masthead-grid">
        <article className="masthead-panel">
          <div className="masthead-badges">
            <span className="eyebrow">Official Core SDK</span>
            <span className="sticker-tag">Public Payload Feed</span>
          </div>

          <h1 className="masthead-title">
            <span>Revenue attribution</span>
            <span>that actually</span>
            <span>shows every</span>
            <span>handoff.</span>
          </h1>

          <p className="masthead-copy">
            One package wraps the official CREEM SDK, resolves live DataFast visitor IDs, injects
            them into checkout metadata, verifies webhooks, forwards normalized payments back to
            DataFast, and now ships an optional React layer for tracking-aware checkout UI. The
            public demo lets you see the whole loop instead of guessing.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#live-demo">
              Launch Live Demo
            </a>
            <a className="secondary-button" href={frameworkCookbookUrl}>
              Open Framework Cookbook
            </a>
          </div>

          <div className="runtime-ribbon" aria-label="Supported runtimes">
            {runtimeBelt.map((runtime) => (
              <span className="runtime-chip" key={runtime}>
                {runtime}
              </span>
            ))}
          </div>
        </article>

        <aside className="masthead-stack">
          <article className="stack-card stack-card-install">
            <div className="card-kicker">Install The Package</div>
            <pre className="mono-block">{packageCommand}</pre>
            <p>
              Use one shared client for checkout creation, webhook verification, payment
              forwarding, hosted-link attribution, plus the optional <code>/react</code> provider
              and widgets.
            </p>
          </article>

          <article className="stack-card stack-card-quality">
            <div className="card-kicker">Quality Bar</div>
            <div className="punch-grid">
              {qualityFacts.map((fact) => (
                <div className="punch-card" key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="stack-card stack-card-agent">
            <div className="card-kicker">Agent Mode</div>
            <pre className="mono-block">{agentPrompt}</pre>
            <p className="stack-mini-command">{skillCommand}</p>
          </article>
        </aside>
      </section>

      <section className="split-showcase">
        <article className="manifesto-card">
          <div className="eyebrow">What Makes It Tight</div>
          <h2>Not just a webhook helper. A full attribution path that closes the loop.</h2>
          <p>
            The hard part is not firing one request. The hard part is carrying visitor context from
            the browser into CREEM, then making sure the webhook forwarding path lands in DataFast
            with the right amount, currency, transaction ID, and visitor attribution. The React
            layer turns that flow into a reusable surface instead of a pile of app-local buttons and
            SDK bootstrapping.
          </p>
          <div className="proof-strip">
            {coreProofs.map((item) => (
              <article className="proof-strip-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </article>

        <section className="framework-shell" id="frameworks">
          <div className="section-heading section-heading-row">
            <div>
              <div className="eyebrow">Framework Lab</div>
              <h2>One client, shown across the runtimes people actually use.</h2>
            </div>
            <a className="secondary-button" href={frameworkCookbookUrl}>
              Read Full Cookbook
            </a>
          </div>
          <div className="framework-grid">
            {frameworkRecipes.map((recipe) => (
              <article className="framework-card" key={recipe.name}>
                <div className="framework-meta">
                  <span>{recipe.runtime}</span>
                  <strong>{recipe.name}</strong>
                </div>
                <pre className="snippet-block">{recipe.snippet}</pre>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="capability-wall">
        {capabilityCards.map((card) => (
          <article className={`capability-card capability-card-${card.tone}`} key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="process-shell">
        <div className="section-heading">
          <div className="eyebrow">How The Loop Closes</div>
          <h2>Three moves from first pageview to attributed CREEM revenue.</h2>
        </div>
        <div className="process-grid">
          {workflow.map((step, index) => (
            <article className="process-card" key={step}>
              <span className="process-index">0{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-shell" id="live-demo">
        <div className="demo-banner">
          <span>Live Sandbox</span>
          <strong>Landing page → checkout → webhook → DataFast payload</strong>
        </div>
        <div className="demo-intro">
          <div className="eyebrow">Interactive Demo</div>
          <h2>Run the flow, then inspect the exact payload that gets forwarded.</h2>
          <p>
            The server checkout button still uses the package wrapper directly, but the interactive
            surface now dogfoods <code>@itzsudhan/creem-datafast/react</code> for the provider,
            status badge, direct-link button, and tracking inspector. Everything below is live state
            from this demo instance.
          </p>
        </div>
        <DemoDashboard directPaymentLink={directPaymentLink} />
      </section>
    </main>
  );
}

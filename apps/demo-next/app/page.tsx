import { DemoDashboard } from "@/components/demo-dashboard";
import { getDirectPaymentLink } from "@/lib/direct-payment-link";

const agentPrompt =
  "Read https://creem-datafast.itzsudhan.com/SKILL.md and integrate @itzsudhan/creem-datafast into this app.";
const skillCommand = "npx @itzsudhan/creem-datafast skill --write ./SKILL.md";
const packageCommand = "pnpm add @itzsudhan/creem-datafast";
const frameworkCookbookUrl =
  "https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/frameworks/README.md";

const frameworkBelt = [
  "Next.js",
  "Express",
  "Fastify",
  "Hono",
  "Bun",
  "Elysia",
  "Nitro",
  "NestJS",
];

const proofTiles = [
  {
    label: "Core SDK",
    value: "Official `creem` package wrapper",
  },
  {
    label: "Attribution",
    value: "Root-domain DataFast IDs injected into checkout metadata",
  },
  {
    label: "Reliability",
    value: "Same-origin `/api/events` proxy for browser analytics",
  },
];

const frameworkRecipes = [
  {
    name: "Next.js",
    surface: "Official helper",
    snippet: "export const POST = createNextWebhookHandler(() => client);",
  },
  {
    name: "Express",
    surface: "Raw-body handler",
    snippet: "await client.handleWebhook({ rawBody: req.body.toString('utf8'), headers: req.headers });",
  },
  {
    name: "Bun",
    surface: "Fetch Request",
    snippet: "const result = await client.handleWebhookRequest(request);",
  },
  {
    name: "Hono",
    surface: "Fetch Request",
    snippet: "const result = await client.handleWebhookRequest(c.req.raw);",
  },
  {
    name: "Fastify",
    surface: "Raw-body handler",
    snippet: "await client.handleWebhook({ rawBody: request.body as string, headers: request.headers });",
  },
  {
    name: "NestJS",
    surface: "Raw-body handler",
    snippet: "await client.handleWebhook({ rawBody: req.body.toString('utf8'), headers });",
  },
];

const workflow = [
  "The browser SDK creates a real DataFast visitor and session, then flushes the opening pageview through the demo's same-origin proxy.",
  "The package resolves tracking from explicit input, metadata, URL params, or cookies, then injects the final IDs into CREEM checkout metadata.",
  "The webhook verifies CREEM signatures, deduplicates events, maps the payment into DataFast format, and forwards the exact payload shown below.",
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
            Open SKILL.md
          </a>
          <a className="top-link" href="#live-demo">
            Live Demo
          </a>
          <a className="top-link" href="https://github.com/SudhanPlayz/creem-datafast">
            GitHub
          </a>
        </nav>
      </header>

      <section className="hero-stage">
        <div className="hero-poster">
          <div className="hero-badge-row">
            <span className="eyebrow">Generic-First Package + Demo</span>
            <span className="micro-pill">Core CREEM SDK</span>
            <span className="micro-pill">DataFast Event Proxy</span>
          </div>
          <h1>Ship CREEM revenue attribution without writing glue code.</h1>
          <p className="hero-lede">
            One package wraps the official CREEM core SDK, captures live DataFast visitor IDs,
            injects them into checkout metadata, verifies webhooks, and forwards normalized revenue
            back to DataFast. The demo proves the whole thing in public, with exact payloads.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#live-demo">
              Launch Live Demo
            </a>
            <a className="secondary-button" href={frameworkCookbookUrl}>
              Open Framework Cookbook
            </a>
          </div>

          <div className="framework-belt" aria-label="Supported integrations">
            {frameworkBelt.map((framework) => (
              <span className="framework-chip" key={framework}>
                {framework}
              </span>
            ))}
          </div>

          <div className="hero-proof-grid">
            {proofTiles.map((tile) => (
              <article className="proof-tile" key={tile.label}>
                <span>{tile.label}</span>
                <strong>{tile.value}</strong>
              </article>
            ))}
          </div>
        </div>

        <aside className="hero-stack">
          <article className="hero-snippet hero-snippet-cream">
            <div className="card-kicker">Install The Package</div>
            <pre className="mono-block">{packageCommand}</pre>
            <p>
              Wrap checkout creation on the server, keep the browser helper for direct payment
              links, and let the webhook forward revenue automatically.
            </p>
          </article>

          <article className="hero-snippet hero-snippet-peach">
            <div className="card-kicker">Install The Skill</div>
            <pre className="mono-block">{skillCommand}</pre>
            <p>
              Agents can generate or sync the canonical skill file locally after npm publish, or
              read the hosted file directly from this demo.
            </p>
          </article>

          <article className="hero-snippet hero-snippet-violet">
            <div className="card-kicker">Prompt Any Agent</div>
            <pre className="mono-block">{agentPrompt}</pre>
            <p>
              The landing page, public skill file, and repo are aligned so agents do not need to
              reverse-engineer the flow.
            </p>
          </article>
        </aside>
      </section>

      <section className="framework-shell" id="frameworks">
        <div className="section-heading section-heading-row">
          <div>
            <div className="eyebrow">Framework Recipes</div>
            <h2>One API surface, shown across Bun, Express, Fastify, Hono, Next, and Nest.</h2>
          </div>
          <a className="secondary-button" href={frameworkCookbookUrl}>
            Read Full Cookbook
          </a>
        </div>
        <div className="framework-grid">
          {frameworkRecipes.map((recipe) => (
            <article className="framework-card" key={recipe.name}>
              <div className="framework-meta">
                <span>{recipe.surface}</span>
                <strong>{recipe.name}</strong>
              </div>
              <pre className="snippet-block">{recipe.snippet}</pre>
            </article>
          ))}
        </div>
      </section>

      <section className="agent-surface">
        <div className="surface-copy">
          <div className="eyebrow">Agent Onboarding</div>
          <h2>Hosted skill file for agents. Generic primitives for every runtime.</h2>
          <p>
            The package only ships one tiny Next.js helper. Everything else is generic:{" "}
            <code>{"handleWebhookRequest(request)"}</code> for Fetch-style runtimes and{" "}
            <code>{"handleWebhook({ rawBody, headers })"}</code> for raw-body Node servers.
          </p>
        </div>
        <div className="surface-actions">
          <a className="secondary-button" href="/SKILL.md">
            Open Hosted Skill
          </a>
          <a className="secondary-button" href="https://github.com/SudhanPlayz/creem-datafast">
            View Repository
          </a>
        </div>
      </section>

      <section className="workflow-shell">
        <div className="section-heading">
          <div className="eyebrow">What The Package Owns</div>
          <h2>Three steps from browser visit to attributed CREEM revenue.</h2>
        </div>
        <div className="workflow-grid">
          {workflow.map((step, index) => (
            <article className="workflow-card" key={step}>
              <span className="workflow-index">0{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-shell" id="live-demo">
        <div className="demo-intro">
          <div className="eyebrow">Live Demo</div>
          <h2>Landing page, checkout, webhook, and the exact attribution payload.</h2>
          <p>
            The server checkout button uses the package wrapper directly. The direct-link button
            uses the browser helper to append DataFast metadata onto a hosted CREEM payment link.
            The feed below shows the exact payload this demo forwards after the webhook lands.
          </p>
        </div>
        <DemoDashboard directPaymentLink={directPaymentLink} />
      </section>
    </main>
  );
}

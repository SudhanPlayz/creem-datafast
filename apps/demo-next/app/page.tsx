import { DemoDashboard } from "@/components/demo-dashboard";
import { getDirectPaymentLink } from "@/lib/direct-payment-link";

const agentPrompt =
  "Read https://creem-datafast.itzsudhan.com/SKILL.md and integrate @itzsudhan/creem-datafast into this app.";
const skillCommand = "npx @itzsudhan/creem-datafast skill --write ./SKILL.md";
const packageCommand = "pnpm add @itzsudhan/creem-datafast";

const proofPoints = [
  {
    title: "Official Creem Core SDK",
    body: "Wraps the real `creem` TypeScript SDK, not the unofficial creem_io wrapper.",
  },
  {
    title: "Generic Webhook Surface",
    body: "One core API for Express, Bun, Hono, Fastify, Nitro, NestJS, Elysia, Next.js, or raw Fetch runtimes.",
  },
  {
    title: "AI-Agent Ready",
    body: "Public `/SKILL.md` plus an `npx` installer path so coding agents can onboard themselves fast.",
  },
  {
    title: "Visible Attribution Feed",
    body: "The demo shows the exact Creem-to-DataFast payload so judges can verify the handoff without guessing.",
  },
];

const workflow = [
  "DataFast SDK resolves live visitor and session IDs in the browser.",
  "Checkout creation injects those IDs into Creem metadata through the package wrapper.",
  "The webhook handler verifies Creem signatures and forwards the normalized payment payload to DataFast.",
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

      <section className="hero-band">
        <div className="hero-copy">
          <div className="eyebrow">Creem-Branded Neobrutal Demo</div>
          <h1>One prompt. One wrapper. Every CREEM payment attributed back to DataFast.</h1>
          <p className="hero-lede">
            This ships the package, the hosted skill file, the generic webhook surface, and the
            live attribution proof in one place. Merchants get zero glue code. Judges and AI agents
            get exact payloads instead of promises.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#live-demo">
              Launch The Demo
            </a>
            <a className="secondary-button" href="/SKILL.md">
              Read /SKILL.md
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span>SDK</span>
              <strong>Generic-first TypeScript API</strong>
            </div>
            <div className="stat-card">
              <span>Skill</span>
              <strong>Hosted SKILL.md + `npx` installer</strong>
            </div>
            <div className="stat-card">
              <span>Proof</span>
              <strong>Live checkout → webhook → DataFast payload</strong>
            </div>
          </div>
        </div>

        <div className="hero-rail">
          <article className="code-card">
            <div className="card-kicker">Prompt Your Agent</div>
            <pre className="mono-block">{agentPrompt}</pre>
            <p>
              Works the same way Creem exposes its own AI-agent onboarding flow. The hosted skill
              file is public so any coding assistant can read it directly.
            </p>
          </article>

          <article className="code-card code-card-highlight">
            <div className="card-kicker">Install The Skill Locally</div>
            <pre className="mono-block">{skillCommand}</pre>
            <p>
              The package now ships a tiny CLI. It prints or writes the canonical skill file, so
              teams that want a local `SKILL.md` can generate it without copy-pasting.
            </p>
          </article>

          <article className="code-card">
            <div className="card-kicker">Package Install</div>
            <pre className="mono-block">{packageCommand}</pre>
            <p>
              Use the wrapper for checkout creation and webhook forwarding, then let the browser
              helper or DataFast SDK handle visitor/session propagation.
            </p>
          </article>
        </div>
      </section>

      <section className="feature-deck">
        {proofPoints.map((item) => (
          <article className="feature-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="agent-surface">
        <div className="surface-copy">
          <div className="eyebrow">Agent Onboarding</div>
          <h2>The same AI-agent pattern Creem uses, remixed for CREEM × DataFast attribution.</h2>
          <p>
            Your agent should not have to reverse-engineer checkout metadata, raw webhook handling,
            or DataFast payment payloads. The hosted skill file gives it a clean, opinionated
            integration contract.
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
          <div className="eyebrow">How It Lands</div>
          <h2>Three steps from browser pageview to attributed revenue.</h2>
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
          <h2>Try the hosted checkout flow and inspect the exact payload that lands in DataFast.</h2>
          <p>
            The server checkout button uses the package wrapper directly. The direct-link button uses
            the browser helper to append DataFast metadata onto the hosted Creem product URL. The
            feed below shows the exact payload this demo forwards after the webhook lands.
          </p>
        </div>
        <DemoDashboard directPaymentLink={directPaymentLink} />
      </section>
    </main>
  );
}

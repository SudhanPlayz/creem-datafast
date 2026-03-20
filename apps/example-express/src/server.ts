import express from "express";

import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const app = express();
const port = Number(process.env.PORT ?? 4_000);
const appBaseUrl = process.env.APP_BASE_URL ?? `http://localhost:${port}`;
const paymentLink =
  process.env.CREEM_PAYMENT_LINK ??
  (process.env.CREEM_PRODUCT_ID ? `https://creem.io/payment/${process.env.CREEM_PRODUCT_ID}` : "");

const events: Array<{ timestamp: string; title: string; payload?: unknown }> = [];

const client = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET ?? "",
  datafastApiKey: process.env.DATAFAST_API_KEY ?? "",
  testMode: true,
  fetch: async (input, init) => {
    const response = await fetch(input, init);
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("/api/v1/payments")) {
      events.unshift({
        timestamp: new Date().toISOString(),
        title: `DataFast responded with ${response.status}`,
        payload: await response.clone().text(),
      });
      events.splice(10);
    }
    return response;
  },
  logger: {
    info(message, payload) {
      events.unshift({
        timestamp: new Date().toISOString(),
        title: message,
        payload,
      });
      events.splice(10);
    },
  },
});

app.use(express.urlencoded({ extended: false }));

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Express Example</title>
    ${
      process.env.DATAFAST_WEBSITE_ID
        ? `<script defer data-website-id="${process.env.DATAFAST_WEBSITE_ID}" data-domain="localhost" data-disable-payments="true" src="https://datafa.st/js/script.js"></script>`
        : ""
    }
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 16px; line-height: 1.5; color: #1f2937; }
      .card { border: 1px solid #d1d5db; border-radius: 18px; padding: 20px; margin-bottom: 16px; }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
      button, a { border-radius: 999px; padding: 12px 16px; border: 1px solid #111827; background: #111827; color: white; text-decoration: none; font-weight: 600; }
      a.secondary { background: white; color: #111827; }
      pre { background: #111827; color: #f9fafb; border-radius: 14px; padding: 12px; overflow-x: auto; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Express Generic Handler Example</h1>
      <p>This example uses the generic raw-body webhook API from <code>@itzsudhan/creem-datafast</code>. The full direct-link attribution demo lives in the Next.js app.</p>
      <div class="actions">
        <form action="/checkout" method="post"><button type="submit">Launch Server Checkout</button></form>
        <a class="secondary" href="${paymentLink || "#"}">Product Payment Link</a>
      </div>
    </div>
    <div class="card">
      <h2>Recent Events</h2>
      <pre>${escapeHtml(JSON.stringify(events, null, 2))}</pre>
    </div>
  </body>
</html>`);
});

app.post("/checkout", async (req, res, next) => {
  try {
    const checkout = await client.createCheckout(
      {
        productId: process.env.CREEM_PRODUCT_ID ?? "",
        successUrl: `${appBaseUrl}/`,
      },
      {
        request: {
          headers: req.headers,
          url: `${appBaseUrl}${req.originalUrl}`,
        },
      },
    );

    events.unshift({
      timestamp: new Date().toISOString(),
      title: "Created checkout",
      payload: {
        checkoutUrl: checkout.checkoutUrl,
        resolvedTracking: checkout.resolvedTracking,
      },
    });
    events.splice(10);

    res.redirect(303, checkout.checkoutUrl ?? "/");
  } catch (error) {
    next(error);
  }
});

app.post("/webhooks/creem", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    const result = await client.handleWebhook({
      rawBody: req.body.toString("utf8"),
      headers: req.headers,
    });

    events.unshift({
      timestamp: new Date().toISOString(),
      title: "Processed webhook",
      payload: result,
    });
    events.splice(10);

    res.status(200).send(result.ignored ? "Ignored" : "OK");
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`Express example listening on ${appBaseUrl}`);
});

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

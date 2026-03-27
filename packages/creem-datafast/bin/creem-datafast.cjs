#!/usr/bin/env node

const { createHmac } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);
const command = args[0];
const skillUrl = "https://creem-datafast.itzsudhan.com/SKILL.md";
const skillPath = path.join(__dirname, "..", "SKILL.md");
const smokeFixturePath = path.join(
  __dirname,
  "..",
  "fixtures",
  "smoke-webhook.checkout.completed.json",
);

function printUsage() {
  process.stdout.write(
    [
      "creem-datafast",
      "",
      "Usage:",
      "  npx @itzsudhan/creem-datafast skill",
      "  npx @itzsudhan/creem-datafast skill --write ./SKILL.md",
      "  npx @itzsudhan/creem-datafast skill-url",
      "  npx @itzsudhan/creem-datafast smoke-webhook --url http://localhost:3000/api/webhooks/creem --secret whsec_xxx",
      "",
      "Commands:",
      "  skill      Print the canonical SKILL.md content.",
      "  skill-url  Print the public hosted SKILL.md URL.",
      "  smoke-webhook  Replay a signed webhook fixture against a local endpoint.",
      "",
    ].join("\n"),
  );
}

function readSkill() {
  return fs.readFileSync(skillPath, "utf8");
}

function parseWritePath(values) {
  const flagIndex = values.findIndex((value) => value === "--write");
  if (flagIndex === -1) {
    return null;
  }

  return values[flagIndex + 1] ?? null;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseFlag(values, name) {
  const index = values.findIndex((value) => value === name);
  if (index === -1) {
    return null;
  }

  return values[index + 1] ?? null;
}

function signPayload(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function run() {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  if (command === "skill-url") {
    process.stdout.write(`${skillUrl}\n`);
    process.exit(0);
  }

  if (command === "skill") {
    const outputPath = parseWritePath(args.slice(1));
    const skill = readSkill();

    if (!outputPath) {
      process.stdout.write(skill);
      process.exit(0);
    }

    const resolvedPath = path.resolve(process.cwd(), outputPath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, skill, "utf8");
    process.stdout.write(`Wrote skill to ${resolvedPath}\n`);
    process.exit(0);
  }

  if (command === "smoke-webhook") {
    const values = args.slice(1);
    const url = parseFlag(values, "--url") ?? process.env.WEBHOOK_URL ?? null;
    const secret = parseFlag(values, "--secret") ?? process.env.CREEM_WEBHOOK_SECRET ?? null;
    const bodyFile = parseFlag(values, "--body-file") ?? process.env.SMOKE_WEBHOOK_BODY_FILE ?? smokeFixturePath;
    const printOnly = values.includes("--print-only");

    if (!secret) {
      process.stderr.write("Missing webhook secret. Pass --secret or set CREEM_WEBHOOK_SECRET.\n");
      process.exit(1);
    }

    if (!url && !printOnly) {
      process.stderr.write("Missing webhook URL. Pass --url or set WEBHOOK_URL.\n");
      process.exit(1);
    }

    const resolvedBodyFile = path.resolve(process.cwd(), bodyFile);
    const payload = readText(resolvedBodyFile).trim();
    const signature = signPayload(payload, secret);

    if (printOnly) {
      process.stdout.write(
        JSON.stringify(
          {
            fixture: resolvedBodyFile,
            signature,
            payload: JSON.parse(payload),
          },
          null,
          2,
        ),
      );
      process.stdout.write("\n");
      process.exit(0);
    }

    if (typeof fetch !== "function") {
      process.stderr.write("Fetch API is not available in this runtime.\n");
      process.exit(1);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "creem-signature": signature,
      },
      body: payload,
    });

    const responseBody = await response.text();
    process.stdout.write(`POST ${url}\n`);
    process.stdout.write(`Fixture: ${resolvedBodyFile}\n`);
    process.stdout.write(`Signature: ${signature}\n`);
    process.stdout.write(`Status: ${response.status}\n`);
    if (responseBody.length > 0) {
      process.stdout.write(`${responseBody}\n`);
    }
    process.exit(response.ok ? 0 : 1);
  }

  process.stderr.write(`Unknown command: ${command}\n\n`);
  printUsage();
  process.exit(1);
}

void run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

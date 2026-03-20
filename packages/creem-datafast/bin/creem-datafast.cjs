#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);
const command = args[0];
const skillUrl = "https://creem-datafast.itzsudhan.com/SKILL.md";
const skillPath = path.join(__dirname, "..", "SKILL.md");

function printUsage() {
  process.stdout.write(
    [
      "creem-datafast",
      "",
      "Usage:",
      "  npx @itzsudhan/creem-datafast skill",
      "  npx @itzsudhan/creem-datafast skill --write ./SKILL.md",
      "  npx @itzsudhan/creem-datafast skill-url",
      "",
      "Commands:",
      "  skill      Print the canonical SKILL.md content.",
      "  skill-url  Print the public hosted SKILL.md URL.",
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

process.stderr.write(`Unknown command: ${command}\n\n`);
printUsage();
process.exit(1);

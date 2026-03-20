const fs = require("node:fs");
const path = require("node:path");

const directive = '"use client";\n';
const files = [
  path.join(__dirname, "..", "dist", "react", "index.js"),
  path.join(__dirname, "..", "dist", "react", "index.cjs"),
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const source = fs.readFileSync(file, "utf8");
  if (source.startsWith(directive)) {
    continue;
  }

  fs.writeFileSync(file, `${directive}${source}`);
}

#!/usr/bin/env node
/** Copy order.json from Downloads or project root into public/flyers/ — optional helper */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "..", "public", "flyers", "order.json");
const source = process.argv[2];

if (!source) {
  console.log("Usage: npm run apply-order -- path/to/order.json");
  process.exit(1);
}

const resolved = path.resolve(source);
fs.copyFileSync(resolved, target);
console.log("Copied →", target);
console.log("Run: npm run scan-flyers");

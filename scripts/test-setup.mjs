#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

loadEnv();

const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log("✓", name);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log("✗", name, "—", e.message);
  }
}

await test("BLOB_READ_WRITE_TOKEN set", async () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("not set");
});

await test("Load manifest from Blob", async () => {
  const { loadManifest } = await import("../lib/manifest.mjs");
  const m = await loadManifest();
  console.log("  ", m.count, "flyer(s) in Blob");
});

await test("Auth password", async () => {
  const { getAdminPassword, createSessionToken } = await import("../lib/auth.mjs");
  if (getAdminPassword() !== "9550") throw new Error("password mismatch");
  createSessionToken();
});

const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);

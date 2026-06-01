#!/usr/bin/env node
/**
 * Sync data/manifest.json with all images under flyers/ in Vercel Blob.
 * Run: npm run sync-blob
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { reconcileManifestWithBlob } from "../lib/sync-blob.mjs";
import { loadManifestFromStore } from "../lib/manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Set BLOB_READ_WRITE_TOKEN in .env.local");
  process.exit(1);
}

const stored = await loadManifestFromStore();
const result = await reconcileManifestWithBlob(stored, { save: true });

console.log(`Blob flyers: ${result.totalInBlob}`);
console.log(`Gallery: ${result.manifest.count} items`);
console.log(`Added: ${result.added}, removed stale: ${result.removed}`);

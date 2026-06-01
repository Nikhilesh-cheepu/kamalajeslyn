#!/usr/bin/env node
/**
 * Scans public/flyers/ — every image goes to 4∶5 or 9∶16 (whichever is closer).
 * Maintains order.json (prunes missing files).
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FLYERS_DIR = path.join(ROOT, "public", "flyers");
const MANIFEST_PATH = path.join(FLYERS_DIR, "manifest.json");
const ORDER_PATH = path.join(FLYERS_DIR, "order.json");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const SKIP_FILES = new Set([
  "manifest.json",
  "order.json",
  "README.md",
  "DROP_YOUR_FLYERS_HERE.txt",
]);

const RATIO_45 = { ratioW: 4, ratioH: 5, ratioKey: "4x5", ratioLabel: "4∶5" };
const RATIO_916 = { ratioW: 9, ratioH: 16, ratioKey: "9x16", ratioLabel: "9∶16" };

function getImageSize(filePath) {
  try {
    const out = execSync(
      `sips -g pixelWidth -g pixelHeight ${JSON.stringify(filePath)}`,
      { encoding: "utf8" }
    );
    const w = out.match(/pixelWidth:\s*(\d+)/)?.[1];
    const h = out.match(/pixelHeight:\s*(\d+)/)?.[1];
    if (w && h) return { width: Number(w), height: Number(h) };
  } catch {
    /* fall through */
  }
  return null;
}

/** Snap to 4∶5 or 9∶16 only — whichever aspect ratio is closer. */
function snapToFixedRatio(width, height) {
  const actual = width / height;
  const r45 = 4 / 5;
  const r916 = 9 / 16;
  const diff45 = Math.abs(actual - r45);
  const diff916 = Math.abs(actual - r916);
  return diff45 <= diff916 ? RATIO_45 : RATIO_916;
}

function loadOrder() {
  const empty = { "4x5": [], "9x16": [] };
  if (!fs.existsSync(ORDER_PATH)) return empty;
  try {
    const data = JSON.parse(fs.readFileSync(ORDER_PATH, "utf8"));
    return {
      "4x5": Array.isArray(data["4x5"]) ? data["4x5"] : [],
      "9x16": Array.isArray(data["9x16"]) ? data["9x16"] : [],
    };
  } catch {
    return empty;
  }
}

function pruneAndMergeOrder(order, scannedByRatio) {
  const onDisk = new Set([
    ...scannedByRatio["4x5"].map((i) => i.file),
    ...scannedByRatio["9x16"].map((i) => i.file),
  ]);

  const next = { "4x5": [], "9x16": [] };

  for (const key of ["4x5", "9x16"]) {
    const seen = new Set();
    for (const file of order[key]) {
      if (onDisk.has(file) && scannedByRatio[key].some((i) => i.file === file)) {
        next[key].push(file);
        seen.add(file);
      }
    }
    for (const item of scannedByRatio[key]) {
      if (!seen.has(item.file)) {
        next[key].push(item.file);
        seen.add(item.file);
      }
    }
  }

  return next;
}

function scan() {
  if (!fs.existsSync(FLYERS_DIR)) {
    fs.mkdirSync(FLYERS_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(FLYERS_DIR)
    .filter((f) => {
      if (f.startsWith(".") || SKIP_FILES.has(f)) return false;
      return IMAGE_EXT.has(path.extname(f).toLowerCase());
    });

  const scannedByRatio = { "4x5": [], "9x16": [] };

  for (const file of files) {
    const fullPath = path.join(FLYERS_DIR, file);
    const size = getImageSize(fullPath);
    if (!size) {
      console.warn(`Skip (could not read size): ${file}`);
      continue;
    }

    const ratio = snapToFixedRatio(size.width, size.height);
    scannedByRatio[ratio.ratioKey].push({
      file,
      src: `public/flyers/${file}`,
      width: size.width,
      height: size.height,
      ...ratio,
    });
  }

  const order = pruneAndMergeOrder(loadOrder(), scannedByRatio);
  fs.writeFileSync(ORDER_PATH, JSON.stringify(order, null, 2) + "\n");

  const items = [];
  for (const key of ["4x5", "9x16"]) {
    const byFile = Object.fromEntries(scannedByRatio[key].map((i) => [i.file, i]));
    for (const file of order[key]) {
      if (byFile[file]) items.push(byFile[file]);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    order,
    items,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Scanned ${items.length} flyer(s) → ${MANIFEST_PATH}`);
  console.log(`Order saved → ${ORDER_PATH}`);
  console.log(`  4∶5  → ${order["4x5"].length}`);
  console.log(`  9∶16 → ${order["9x16"].length}`);
}

scan();

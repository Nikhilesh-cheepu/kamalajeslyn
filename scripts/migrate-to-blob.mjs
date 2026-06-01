#!/usr/bin/env node
/**
 * One-time: upload local public/flyers images to Vercel Blob.
 * Requires BLOB_READ_WRITE_TOKEN in .env or environment.
 *
 * Run: npm run migrate-blob
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";
import imageSize from "image-size";
import crypto from "crypto";
import { snapToFixedRatio } from "../lib/ratio.mjs";
import { saveManifest, emptyManifest, createItemFromUpload } from "../lib/manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLYERS_DIR = path.join(__dirname, "..", "public", "flyers");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Set BLOB_READ_WRITE_TOKEN first.");
    process.exit(1);
  }

  const files = fs.readdirSync(FLYERS_DIR).filter((f) => {
    return IMAGE_EXT.has(path.extname(f).toLowerCase());
  });

  const manifest = emptyManifest();

  for (const file of files) {
    const fullPath = path.join(FLYERS_DIR, file);
    const buffer = fs.readFileSync(fullPath);
    const dimensions = imageSize(buffer);
    if (!dimensions?.width) continue;

    const id = crypto.randomUUID();
    const ext = path.extname(file).toLowerCase();
    const blob = await put(`flyers/${id}${ext}`, buffer, {
      access: "public",
      contentType: `image/${ext.replace(".", "")}`,
    });

    const item = createItemFromUpload({
      id,
      file,
      url: blob.url,
      width: dimensions.width,
      height: dimensions.height,
    });

    manifest.items.push(item);
    manifest.order[item.ratioKey].push(id);
    console.log("Uploaded:", file, "→", item.ratioLabel);
  }

  await saveManifest(manifest);
  console.log(`Done. ${manifest.items.length} flyers in Blob.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

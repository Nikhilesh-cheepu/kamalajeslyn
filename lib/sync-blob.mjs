import { list, get, head } from "@vercel/blob";
import imageSize from "image-size";
import {
  loadManifestFromStore,
  saveManifest,
  normalizeManifest,
  createItemFromUpload,
  emptyManifest,
} from "./manifest.mjs";

const BLOB_ACCESS = "private";
const IMAGE_PATH = /\.(jpe?g|png|gif|webp|heic|heif|avif)$/i;

function isFlyerImage(pathname) {
  return pathname?.startsWith("flyers/") && IMAGE_PATH.test(pathname);
}

function idFromPathname(pathname) {
  const base = pathname.split("/").pop() || "";
  return base.replace(/\.[^.]+$/, "");
}

function fileFromPathname(pathname) {
  return pathname.split("/").pop() || pathname;
}

async function getImageDimensions(pathname) {
  const result = await get(pathname, { access: BLOB_ACCESS });
  if (!result?.stream) return null;
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  const dimensions = imageSize(buffer);
  if (!dimensions?.width || !dimensions?.height) return null;
  return dimensions;
}

async function mapWithConcurrency(items, fn, concurrency = 4) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Align manifest with everything under flyers/ in Blob.
 * - Adds gallery entries for images in Blob missing from manifest
 * - Removes manifest entries whose blob was deleted
 */
export async function reconcileManifestWithBlob(manifest, { save = true } = {}) {
  const base = manifest || emptyManifest();
  const listed = await list({ prefix: "flyers/", limit: 1000 });
  const blobImages = listed.blobs.filter((b) => isFlyerImage(b.pathname));

  const blobByPath = new Map(blobImages.map((b) => [b.pathname, b]));

  const kept = [];
  let removedCount = 0;
  for (const item of base.items) {
    if (item.pathname && blobByPath.has(item.pathname)) {
      const blob = blobByPath.get(item.pathname);
      kept.push({
        ...item,
        url: blob.url,
        pathname: blob.pathname,
      });
    } else {
      removedCount++;
    }
  }

  const keptPaths = new Set(kept.map((i) => i.pathname));
  const orphans = blobImages.filter((b) => !keptPaths.has(b.pathname));
  const added = [];

  if (orphans.length) {
    const newItems = await mapWithConcurrency(orphans, async (blob) => {
      let width = 1080;
      let height = 1350;
      try {
        const dims = await getImageDimensions(blob.pathname);
        if (dims) {
          width = dims.width;
          height = dims.height;
        }
      } catch {
        /* use defaults */
      }

      const id = idFromPathname(blob.pathname);
      return createItemFromUpload({
        id,
        file: fileFromPathname(blob.pathname),
        url: blob.url,
        pathname: blob.pathname,
        width,
        height,
      });
    });

    for (const item of newItems) {
      kept.push(item);
      added.push(item);
    }
  }

  const normalized = normalizeManifest({
    ...base,
    items: kept,
    order: base.order,
  });

  if (save && (added.length > 0 || kept.length !== base.items.length)) {
    await saveManifest(normalized);
  }

  return {
    manifest: normalized,
    added: added.length,
    removed: removedCount,
    totalInBlob: blobImages.length,
    synced: added.length > 0 || removedCount > 0,
  };
}

/** Ensure manifest.json exists in Blob */
export async function ensureManifestExists() {
  try {
    const meta = await head("data/manifest.json");
    if (meta?.url) return;
  } catch {
    /* create */
  }
  await saveManifest(emptyManifest());
}

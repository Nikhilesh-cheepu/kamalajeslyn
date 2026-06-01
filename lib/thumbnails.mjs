import sharp from "sharp";
import { get, put, head, del } from "@vercel/blob";
import { saveManifest, normalizeManifest } from "./manifest.mjs";

const BLOB_ACCESS = "private";
const THUMB_WIDTH = 420;
const THUMB_QUALITY = 78;

export function thumbPathnameForId(id) {
  return `flyers/thumbs/${id}.webp`;
}

export async function thumbnailExists(pathname) {
  try {
    const meta = await head(pathname);
    return !!meta;
  } catch {
    return false;
  }
}

export async function deleteThumbnail(id) {
  const pathname = thumbPathnameForId(id);
  try {
    await del(pathname);
  } catch {
    /* already gone */
  }
}

export async function generateThumbnailForItem(item) {
  const pathname = item.pathname;
  if (!pathname) throw new Error("missing pathname");

  const thumbPathname = thumbPathnameForId(item.id);
  if (await thumbnailExists(thumbPathname)) return thumbPathname;

  const result = await get(pathname, { access: BLOB_ACCESS });
  if (!result?.stream) throw new Error("source not found");

  const input = Buffer.from(await new Response(result.stream).arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();

  await put(thumbPathname, output, {
    access: BLOB_ACCESS,
    contentType: "image/webp",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return thumbPathname;
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

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

/** Create missing WebP thumbs and persist thumbPathname on manifest items. */
export async function ensureThumbnailsForManifest(manifest, { save = false } = {}) {
  let changed = false;

  await mapWithConcurrency(
    manifest.items,
    async (item) => {
      const expected = thumbPathnameForId(item.id);
      if (item.thumbPathname === expected && (await thumbnailExists(expected))) {
        return;
      }
      try {
        const thumbPathname = await generateThumbnailForItem(item);
        if (item.thumbPathname !== thumbPathname) {
          item.thumbPathname = thumbPathname;
          changed = true;
        }
      } catch (err) {
        console.error("thumbnail", item.id, err.message);
      }
    },
    4
  );

  if (save && changed) {
    return saveManifest(normalizeManifest(manifest));
  }
  return manifest;
}

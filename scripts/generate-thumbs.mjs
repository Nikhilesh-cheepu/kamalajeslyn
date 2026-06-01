/**
 * Generate WebP thumbnails for all manifest flyers (run once locally).
 * Usage: npm run generate-thumbs
 */
import { loadManifestFromStore } from "../lib/manifest.mjs";
import { ensureThumbnailsForManifest } from "../lib/thumbnails.mjs";

const manifest = await loadManifestFromStore();
const updated = await ensureThumbnailsForManifest(manifest, { save: true });
console.log(`Done. ${updated.items.length} flyer(s), thumbs under flyers/thumbs/`);

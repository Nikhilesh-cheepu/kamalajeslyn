import { requireAuth } from "../../lib/auth.mjs";
import {
  loadManifestFromStore,
  saveManifest,
} from "../../lib/manifest.mjs";
import { slotToManifestItem } from "../../lib/blob-upload.mjs";
import { generateThumbnailForItem } from "../../lib/thumbnails.mjs";
import { parseJsonBody } from "../../lib/parse-json-body.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  try {
    const body = parseJsonBody(req);
    const slots = body.slots || [];

    if (!slots.length) {
      res.status(400).json({ error: "No upload slots to finalize" });
      return;
    }

    const manifest = await loadManifestFromStore();
    const uploaded = [];
    const skipped = [];

    for (const slot of slots) {
      try {
        const item = await slotToManifestItem(slot);
        try {
          item.thumbPathname = await generateThumbnailForItem(item);
        } catch (err) {
          console.error("thumbnail on upload", item.id, err.message);
        }
        manifest.items.push(item);
        manifest.order[item.ratioKey].push(item.id);
        uploaded.push(item);
      } catch (err) {
        skipped.push({ file: slot.file, reason: err.message });
      }
    }

    if (!uploaded.length) {
      res.status(400).json({
        error: "No images were saved to Blob",
        skipped,
      });
      return;
    }

    await saveManifest(manifest);

    const summary = { "4x5": 0, "9x16": 0 };
    for (const item of uploaded) {
      summary[item.ratioKey] = (summary[item.ratioKey] || 0) + 1;
    }

    res.status(200).json({
      ok: true,
      uploaded,
      skipped,
      summary,
      count: uploaded.length,
    });
  } catch (err) {
    console.error("POST /api/admin/upload-complete", err);
    res.status(500).json({ error: err.message || "Could not finalize upload" });
  }
}

import { requireAuth } from "../../lib/auth.mjs";
import { loadManifestFromStore, withResolvedUrls } from "../../lib/manifest.mjs";
import { ensureThumbnailsForManifest } from "../../lib/thumbnails.mjs";

/** Build WebP thumbnails for faster public gallery loading. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  try {
    const stored = await loadManifestFromStore();
    const manifest = await ensureThumbnailsForManifest(stored, { save: true });
    const payload = await withResolvedUrls(manifest);

    res.status(200).json({
      ok: true,
      count: payload.items.length,
      message: "Thumbnails ready for fast gallery loading.",
      ...payload,
    });
  } catch (err) {
    console.error("POST /api/admin/generate-thumbs", err);
    res.status(500).json({ error: err.message || "Thumbnail generation failed" });
  }
}

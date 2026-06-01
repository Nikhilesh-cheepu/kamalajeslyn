import { requireAuth } from "../../lib/auth.mjs";
import { loadManifestFromStore, withResolvedUrls } from "../../lib/manifest.mjs";
import { reconcileManifestWithBlob } from "../../lib/sync-blob.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  try {
    const stored = await loadManifestFromStore();
    const result = await reconcileManifestWithBlob(stored, { save: true });
    const payload = await withResolvedUrls(result.manifest);

    res.status(200).json({
      ok: true,
      synced: result.synced,
      added: result.added,
      removed: result.removed,
      totalInBlob: result.totalInBlob,
      count: payload.count,
      ...payload,
    });
  } catch (err) {
    console.error("POST /api/admin/sync", err);
    res.status(500).json({ error: err.message || "Sync failed" });
  }
}

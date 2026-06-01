import { requireAuth } from "../../lib/auth.mjs";
import { loadManifestFromStore, withResolvedUrls } from "../../lib/manifest.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  try {
    const manifest = await loadManifestFromStore();
    res.status(200).json(await withResolvedUrls(manifest));
  } catch (err) {
    console.error("admin manifest", err);
    res.status(500).json({ error: "Could not load manifest" });
  }
}

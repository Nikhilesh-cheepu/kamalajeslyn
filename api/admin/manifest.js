import { requireAuth } from "../../lib/auth.mjs";
import { loadManifest } from "../../lib/manifest.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  try {
    const manifest = await loadManifest();
    res.status(200).json(manifest);
  } catch (err) {
    console.error("admin manifest", err);
    res.status(500).json({ error: "Could not load manifest" });
  }
}

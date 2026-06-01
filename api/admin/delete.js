import { requireAuth } from "../../lib/auth.mjs";
import {
  loadManifest,
  saveManifest,
  deleteBlobUrl,
} from "../../lib/manifest.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const id = body?.id || req.query?.id;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  try {
    const manifest = await loadManifest();
    const item = manifest.items.find((i) => i.id === id);
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await deleteBlobUrl(item.url);
    manifest.items = manifest.items.filter((i) => i.id !== id);
    for (const key of ["4x5", "9x16"]) {
      manifest.order[key] = manifest.order[key].filter((x) => x !== id);
    }

    await saveManifest(manifest);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("DELETE flyer", err);
    res.status(500).json({ error: "Delete failed" });
  }
}

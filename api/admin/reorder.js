import { requireAuth } from "../../lib/auth.mjs";
import { loadManifestFromStore, saveManifest } from "../../lib/manifest.mjs";

export default async function handler(req, res) {
  if (req.method !== "PUT" && req.method !== "POST") {
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

  const order = body?.order;
  if (!order || !Array.isArray(order["4x5"]) || !Array.isArray(order["9x16"])) {
    res.status(400).json({ error: "Invalid order" });
    return;
  }

  try {
    const manifest = await loadManifestFromStore();
    const ids = new Set(manifest.items.map((i) => i.id));

    manifest.order = {
      "4x5": order["4x5"].filter((id) => ids.has(id)),
      "9x16": order["9x16"].filter((id) => ids.has(id)),
    };

    await saveManifest(manifest);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("reorder", err);
    res.status(500).json({ error: "Reorder failed" });
  }
}

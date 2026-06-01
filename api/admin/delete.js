import { requireAuth } from "../../lib/auth.mjs";
import {
  loadManifest,
  saveManifest,
  deleteBlobUrl,
} from "../../lib/manifest.mjs";
import { parseJsonBody } from "../../lib/parse-json-body.mjs";

function collectIds(body, query) {
  if (Array.isArray(body?.ids) && body.ids.length) {
    return [...new Set(body.ids.filter(Boolean))];
  }
  const single = body?.id || query?.id;
  return single ? [single] : [];
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  const body = parseJsonBody(req);
  const ids = collectIds(body, req.query);

  if (!ids.length) {
    res.status(400).json({ error: "Missing id or ids" });
    return;
  }

  try {
    const manifest = await loadManifest();
    const idSet = new Set(ids);
    const toDelete = manifest.items.filter((i) => idSet.has(i.id));

    if (!toDelete.length) {
      res.status(404).json({ error: "No matching flyers found" });
      return;
    }

    await Promise.all(
      toDelete.map(async (item) => {
        try {
          await deleteBlobUrl(item.url);
        } catch {
          if (item.pathname) await deleteBlobUrl(item.pathname);
        }
      })
    );

    const deletedIds = new Set(toDelete.map((i) => i.id));
    manifest.items = manifest.items.filter((i) => !deletedIds.has(i.id));
    for (const key of ["4x5", "9x16"]) {
      manifest.order[key] = manifest.order[key].filter((x) => !deletedIds.has(x));
    }

    await saveManifest(manifest);
    res.status(200).json({ ok: true, deleted: toDelete.length, ids: [...deletedIds] });
  } catch (err) {
    console.error("DELETE flyer(s)", err);
    res.status(500).json({ error: "Delete failed" });
  }
}

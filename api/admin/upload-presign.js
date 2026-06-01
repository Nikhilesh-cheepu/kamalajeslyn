import { requireAuth } from "../../lib/auth.mjs";
import { createUploadSlot, sortFilesMeta } from "../../lib/blob-upload.mjs";
import { parseJsonBody } from "../../lib/parse-json-body.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  try {
    const body = parseJsonBody(req);
    const files = sortFilesMeta(body.files || []);

    if (!files.length) {
      res.status(400).json({ error: "No files specified" });
      return;
    }

    if (files.length > 50) {
      res.status(400).json({ error: "Maximum 50 files per batch" });
      return;
    }

    for (const f of files) {
      if (!f.filename || !f.width || !f.height) {
        res.status(400).json({ error: "Each file needs filename, width, and height" });
        return;
      }
    }

    const slots = await Promise.all(files.map((f) => createUploadSlot(f)));
    res.status(200).json({ ok: true, slots });
  } catch (err) {
    console.error("POST /api/admin/upload-presign", err);
    res.status(500).json({ error: err.message || "Could not prepare upload" });
  }
}

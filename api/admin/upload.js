import { put } from "@vercel/blob";
import imageSize from "image-size";
import crypto from "crypto";
import { requireAuth } from "../../lib/auth.mjs";
import {
  loadManifest,
  saveManifest,
  createItemFromUpload,
} from "../../lib/manifest.mjs";

export const config = {
  api: { bodyParser: false },
};

function parseMultipart(buffer, boundary) {
  const parts = [];
  const sep = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(sep) + sep.length + 2;

  while (start < buffer.length) {
    const next = buffer.indexOf(sep, start);
    const chunk = buffer.subarray(start, next > -1 ? next - 2 : buffer.length);
    const headerEnd = chunk.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;

    const headerText = chunk.subarray(0, headerEnd).toString("utf8");
    const body = chunk.subarray(headerEnd + 4);
    const nameMatch = headerText.match(/name="([^"]+)"/);
    const fileMatch = headerText.match(/filename="([^"]+)"/);
    const typeMatch = headerText.match(/Content-Type:\s*(\S+)/i);

    parts.push({
      name: nameMatch?.[1],
      filename: fileMatch?.[1],
      contentType: typeMatch?.[1] || "application/octet-stream",
      data: body,
    });

    if (next === -1) break;
    start = next + sep.length + 2;
  }

  return parts;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAuth(req, res)) return;

  try {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      res.status(400).json({ error: "Expected multipart form data" });
      return;
    }

    const raw = await readBody(req);
    const parts = parseMultipart(raw, boundaryMatch[1]);
    const files = parts.filter((p) => p.filename && p.data?.length);

    if (!files.length) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const manifest = await loadManifest();
    const uploaded = [];

    for (const file of files) {
      const dimensions = imageSize(file.data);
      if (!dimensions?.width || !dimensions?.height) continue;

      const id = crypto.randomUUID();
      const ext = (file.filename.match(/\.[^.]+$/) || [".jpg"])[0].toLowerCase();
      const pathname = `flyers/${id}${ext}`;

      const blob = await put(pathname, file.data, {
        access: "public",
        contentType: file.contentType,
        addRandomSuffix: false,
      });

      const item = createItemFromUpload({
        id,
        file: file.filename,
        url: blob.url,
        width: dimensions.width,
        height: dimensions.height,
      });

      manifest.items.push(item);
      manifest.order[item.ratioKey].push(id);
      uploaded.push(item);
    }

    await saveManifest(manifest);
    res.status(200).json({ ok: true, uploaded });
  } catch (err) {
    console.error("POST /api/admin/upload", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
}

import crypto from "crypto";
import { issueSignedToken, presignUrl, head } from "@vercel/blob";
import { snapToFixedRatio } from "./ratio.mjs";

const BLOB_ACCESS = "private";
const PRESIGN_TTL_MS = 60 * 60 * 1000;

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
};

export function contentTypeForFilename(filename) {
  const ext = (filename.match(/\.[^.]+$/) || [""])[0].toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export function sortFilesMeta(files) {
  return [...files].sort((a, b) =>
    (a.filename || "").localeCompare(b.filename || "", undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

/** Server-side slot: presigned PUT URL + manifest fields (before url is known). */
export async function createUploadSlot({ filename, width, height }) {
  const id = crypto.randomUUID();
  const ext = (filename.match(/\.[^.]+$/) || [".jpg"])[0].toLowerCase();
  const pathname = `flyers/${id}${ext}`;
  const contentType = contentTypeForFilename(filename);
  const validUntil = Date.now() + PRESIGN_TTL_MS;

  const token = await issueSignedToken({
    pathname,
    validUntil,
    operations: ["put"],
    allowedContentTypes: [contentType],
    maximumSizeInBytes: 25 * 1024 * 1024,
  });

  const { presignedUrl } = await presignUrl(token, {
    operation: "put",
    pathname,
    access: BLOB_ACCESS,
    validUntil,
    allowOverwrite: false,
    addRandomSuffix: false,
  });

  const ratio = snapToFixedRatio(width, height);

  return {
    id,
    file: filename,
    pathname,
    putUrl: presignedUrl,
    contentType,
    width,
    height,
    ...ratio,
  };
}

/** Resolve canonical blob URL after client PUT completes. */
export async function slotToManifestItem(slot) {
  const meta = await head(slot.pathname);
  if (!meta?.url) throw new Error(`Blob not found: ${slot.file}`);

  return {
    id: slot.id,
    file: slot.file,
    url: meta.url,
    pathname: slot.pathname,
    width: slot.width,
    height: slot.height,
    ratioW: slot.ratioW,
    ratioH: slot.ratioH,
    ratioKey: slot.ratioKey,
    ratioLabel: slot.ratioLabel,
    src: meta.url,
  };
}

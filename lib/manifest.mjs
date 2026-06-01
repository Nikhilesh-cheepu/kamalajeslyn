import { put, del, head, get, issueSignedToken, presignUrl } from "@vercel/blob";
import { snapToFixedRatio } from "./ratio.mjs";

export const MANIFEST_PATH = "data/manifest.json";
const BLOB_ACCESS = "private";
const PRESIGN_TTL_MS = 60 * 60 * 1000;

let cachedReadToken = null;
let cachedReadTokenUntil = 0;

function pathnameFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

async function getReadToken() {
  const now = Date.now();
  if (cachedReadToken && cachedReadTokenUntil > now + 60_000) {
    return cachedReadToken;
  }
  const validUntil = now + PRESIGN_TTL_MS;
  cachedReadToken = await issueSignedToken({
    pathname: "*",
    validUntil,
    operations: ["get"],
  });
  cachedReadTokenUntil = validUntil;
  return cachedReadToken;
}

export function emptyManifest() {
  return {
    generatedAt: new Date().toISOString(),
    count: 0,
    order: { "4x5": [], "9x16": [] },
    items: [],
  };
}

export function emptyOrder() {
  return { "4x5": [], "9x16": [] };
}

async function readManifestJson() {
  const result = await get(MANIFEST_PATH, { access: BLOB_ACCESS });
  if (!result?.stream) throw new Error("manifest not found");
  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

export async function loadManifest() {
  try {
    const meta = await head(MANIFEST_PATH);
    if (!meta?.url) return emptyManifest();
    const data = await readManifestJson();
    return normalizeManifest(data);
  } catch {
    return emptyManifest();
  }
}

export async function saveManifest(data) {
  const normalized = normalizeManifest(data);
  normalized.generatedAt = new Date().toISOString();
  normalized.count = normalized.items.length;

  await put(MANIFEST_PATH, JSON.stringify(normalized, null, 2), {
    access: BLOB_ACCESS,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return normalized;
}

export function normalizeManifest(data) {
  const order = {
    "4x5": Array.isArray(data?.order?.["4x5"]) ? [...data.order["4x5"]] : [],
    "9x16": Array.isArray(data?.order?.["9x16"]) ? [...data.order["9x16"]] : [],
  };

  const items = (data?.items || []).map((item) => {
    const id = item.id || item.file;
    const url = item.url || item.src;
    return {
      ...item,
      id,
      file: item.file || id,
      url,
      pathname: item.pathname,
      src: url,
    };
  });

  const ids = new Set(items.map((i) => i.id));

  for (const key of ["4x5", "9x16"]) {
    order[key] = order[key].filter((id) => ids.has(id));
    for (const item of items.filter((i) => i.ratioKey === key)) {
      if (!order[key].includes(item.id)) order[key].push(item.id);
    }
  }

  return { order, items, count: items.length, generatedAt: data?.generatedAt };
}

async function resolveItemUrl(item) {
  const pathname = item.pathname || pathnameFromUrl(item.url);
  if (!pathname) return item.url;
  try {
    const token = await getReadToken();
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname,
      access: BLOB_ACCESS,
      validUntil: cachedReadTokenUntil,
    });
    return presignedUrl;
  } catch {
    return item.url;
  }
}

export async function buildPublicPayload(manifest) {
  const { order, items } = manifest;
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const sorted = [];

  for (const key of ["4x5", "9x16"]) {
    for (const id of order[key] || []) {
      if (byId[id]) sorted.push({ ...byId[id] });
    }
  }

  for (const item of sorted) {
    const src = await resolveItemUrl(item);
    item.url = src;
    item.src = src;
  }

  return {
    generatedAt: manifest.generatedAt,
    count: sorted.length,
    order,
    items: sorted,
  };
}

export function createItemFromUpload({ id, file, url, pathname, width, height }) {
  const ratio = snapToFixedRatio(width, height);
  return {
    id,
    file,
    url,
    pathname,
    src: url,
    width,
    height,
    ...ratio,
  };
}

export async function deleteBlobUrl(url) {
  if (!url) return;
  try {
    await del(url);
  } catch {
    /* may already be deleted */
  }
}

/** Admin UI needs viewable image URLs for private blobs */
export async function withResolvedUrls(manifest) {
  const items = await Promise.all(
    manifest.items.map(async (item) => {
      const src = await resolveItemUrl(item);
      return { ...item, url: src, src };
    })
  );
  return { ...manifest, items };
}

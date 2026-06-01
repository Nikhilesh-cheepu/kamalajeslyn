import { put, del, head } from "@vercel/blob";
import { snapToFixedRatio } from "./ratio.mjs";

export const MANIFEST_PATH = "data/manifest.json";

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

export async function loadManifest() {
  try {
    const meta = await head(MANIFEST_PATH);
    if (!meta?.url) return emptyManifest();
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return emptyManifest();
    const data = await res.json();
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
    access: "public",
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

export function buildPublicPayload(manifest) {
  const { order, items } = manifest;
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const sorted = [];

  for (const key of ["4x5", "9x16"]) {
    for (const id of order[key] || []) {
      if (byId[id]) sorted.push(byId[id]);
    }
  }

  return {
    generatedAt: manifest.generatedAt,
    count: sorted.length,
    order,
    items: sorted,
  };
}

export function createItemFromUpload({ id, file, url, width, height }) {
  const ratio = snapToFixedRatio(width, height);
  return {
    id,
    file,
    url,
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

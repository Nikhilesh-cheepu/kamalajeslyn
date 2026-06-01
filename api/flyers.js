import { loadManifestFromStore, buildPublicPayload } from "../lib/manifest.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const manifest = await loadManifestFromStore();
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600"
    );
    res.status(200).json(await buildPublicPayload(manifest));
  } catch (err) {
    console.error("GET /api/flyers", err);
    res.status(500).json({ error: "Could not load portfolio" });
  }
}

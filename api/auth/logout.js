import { clearSessionCookie } from "../../lib/auth.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}

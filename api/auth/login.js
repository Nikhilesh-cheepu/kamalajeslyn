import { getAdminPassword, setSessionCookie } from "../../lib/auth.mjs";
import { parseJsonBody } from "../../lib/parse-json-body.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const configured = getAdminPassword();
  if (!configured) {
    res.status(503).json({ error: "Admin login is not configured on the server" });
    return;
  }

  const body = parseJsonBody(req);
  const password = String(body?.password ?? "").trim();

  if (!password) {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  if (password !== configured) {
    res.status(401).json({ error: "Wrong password" });
    return;
  }

  try {
    setSessionCookie(res);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/login", err);
    res.status(500).json({ error: err.message || "Login failed" });
  }
}

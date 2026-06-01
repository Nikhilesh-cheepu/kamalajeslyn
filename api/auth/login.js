import { getAdminPassword, setSessionCookie } from "../../lib/auth.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const password = body?.password ?? "";
  if (password !== getAdminPassword()) {
    res.status(401).json({ error: "Wrong password" });
    return;
  }

  setSessionCookie(res);
  res.status(200).json({ ok: true });
}

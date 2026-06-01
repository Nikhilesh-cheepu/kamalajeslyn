import crypto from "crypto";

export const COOKIE_NAME = "admin_session";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "9550";
}

export function createSessionToken() {
  return crypto
    .createHmac("sha256", getAdminPassword())
    .update("kamala-portfolio-admin-v1")
    .digest("hex");
}

export function getCookie(req, name) {
  const header = req.headers.cookie || req.headers.Cookie || "";
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1];
}

export function isAuthenticated(req) {
  const token = getCookie(req, COOKIE_NAME);
  return token === createSessionToken();
}

export function setSessionCookie(res) {
  const token = createSessionToken();
  const secure = process.env.VERCEL === "1" ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
}

export function clearSessionCookie(res) {
  const secure = process.env.VERCEL === "1" ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`
  );
}

export function requireAuth(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

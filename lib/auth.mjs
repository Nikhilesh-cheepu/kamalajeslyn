import crypto from "crypto";

export const COOKIE_NAME = "admin_session_v2";
const SESSION_SALT = "kamala-portfolio-admin-v2";

export function getAdminPassword() {
  const pwd = process.env.ADMIN_PASSWORD;
  if (process.env.VERCEL === "1") {
    if (!pwd || !String(pwd).trim()) return null;
    return String(pwd).trim();
  }
  return pwd?.trim() || "9550";
}

export function createSessionToken() {
  const password = getAdminPassword();
  if (!password) return null;
  return crypto
    .createHmac("sha256", password)
    .update(SESSION_SALT)
    .digest("hex");
}

export function getCookie(req, name) {
  const header = req.headers.cookie || req.headers.Cookie || "";
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function isAuthenticated(req) {
  const expected = createSessionToken();
  if (!expected) return false;

  const token = getCookie(req, COOKIE_NAME);
  if (!token || token.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function setSessionCookie(res) {
  const token = createSessionToken();
  if (!token) {
    throw new Error("Admin password is not configured");
  }
  const secure = process.env.VERCEL === "1" ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${60 * 60 * 8}`
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

import type { D1Database } from "@cloudflare/workers-types";

export type AppRole = "admin" | "manager" | "redacteur_chef" | "redacteur" | "auteur" | "guide" | "prestataire";
export type AccountStatus = "pending_validation" | "active" | "rejected" | "suspended";
export type AuthUser = { id: string; email: string; fullName: string | null; status: AccountStatus; roles: AppRole[] };

type UserRow = { id: string; email: string; full_name: string | null; status: AccountStatus };
type SessionRow = { id: string; user_id: string; expires_at: number; revoked_at: number | null };

const SESSION_COOKIE = "jeitinho_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PBKDF2_ITERATIONS = 210_000;
const subtle = crypto.subtle;

function randomBytes(length: number) {
  const data = new Uint8Array(length);
  crypto.getRandomValues(data);
  return data;
}
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function fromBase64url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===";
  const binary = atob(padded.slice(0, Math.ceil(padded.length / 4) * 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function sha256Hex(value: string) {
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationText, saltText, hashText] = stored.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationText || !saltText || !hashText) return false;
  const iterations = Number(iterationText);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  const key = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64url(saltText), iterations }, key, 256);
  const actual = new Uint8Array(bits);
  const expected = fromBase64url(hashText);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function getSessionToken(request: Request) {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function createSession(db: D1Database, userId: string) {
  const rawToken = base64url(randomBytes(48));
  const tokenHash = await sha256Hex(rawToken);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SECONDS;
  await db.prepare("INSERT INTO auth_sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt, now, now).run();
  return rawToken;
}

export async function revokeSession(db: D1Database, rawToken: string) {
  const tokenHash = await sha256Hex(rawToken);
  await db.prepare("UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .bind(Math.floor(Date.now() / 1000), tokenHash).run();
}

export async function getCurrentUser(db: D1Database, request: Request): Promise<AuthUser | null> {
  const rawToken = getSessionToken(request);
  if (!rawToken) return null;
  const tokenHash = await sha256Hex(rawToken);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    "SELECT s.id,s.user_id,s.expires_at,s.revoked_at,u.email,u.full_name,u.status FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? LIMIT 1"
  ).bind(tokenHash).first<SessionRow & UserRow>();
  if (!row || row.revoked_at !== null || row.expires_at <= now || row.status !== "active") return null;
  await db.prepare("UPDATE auth_sessions SET last_seen_at=? WHERE id=?").bind(now, row.id).run();
  const roles = await db.prepare("SELECT role FROM user_roles WHERE user_id=? AND is_active=1").bind(row.user_id).all<{ role: AppRole }>();
  return { id: row.user_id, email: row.email, fullName: row.full_name, status: row.status, roles: (roles.results ?? []).map((r) => r.role) };
}

export function sessionCookie(token: string, secure = true) {
  return [`${SESSION_COOKIE}=${token}`, `Max-Age=${SESSION_TTL_SECONDS}`, "Path=/", "HttpOnly", "SameSite=Lax", ...(secure ? ["Secure"] : [])].join("; ");
}
export function clearSessionCookie() { return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`; }

export function canAccessModule(module: string, roles: AppRole[]) {
  const matrix: Record<string, AppRole[]> = {
    dashboard: ["admin","manager","redacteur_chef","redacteur","auteur","guide","prestataire"],
    crm: ["admin","manager"], clients: ["admin","manager"], voyages: ["admin","manager","guide"], devis: ["admin","manager"],
    experiences: ["admin","manager","redacteur_chef","redacteur"], contenus: ["admin","manager","redacteur_chef","redacteur","auteur"],
    blog: ["admin","manager","redacteur_chef","redacteur","auteur"], mediatheque: ["admin","manager","redacteur_chef","redacteur"],
    partenaires: ["admin","manager","prestataire"], services: ["admin","manager"], billetterie: ["admin","manager"],
    calendrier: ["admin","manager","redacteur_chef","redacteur","auteur","guide"], analytics: ["admin","manager"], parametres: ["admin","manager"],
  };
  return (matrix[module] ?? []).some((role) => roles.includes(role));
}

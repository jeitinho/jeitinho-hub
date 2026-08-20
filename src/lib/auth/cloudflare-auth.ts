import type { D1Database } from "@cloudflare/workers-types";

export type AppRole =
  | "admin"
  | "manager"
  | "redacteur_chef"
  | "redacteur"
  | "auteur"
  | "guide"
  | "prestataire";

export type AccountStatus = "pending_validation" | "active" | "rejected" | "suspended";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  status: AccountStatus;
  roles: AppRole[];
};

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: number;
  revoked_at: number | null;
};

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: AccountStatus;
};

const SESSION_COOKIE = "jeitinho_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function randomId(bytes = 32): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return btoa(String.fromCharCode(...data)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomId(16);
  const encoded = new TextEncoder().encode(password);
  const saltBytes = new TextEncoder().encode(salt);
  let state = new Uint8Array(encoded.length + saltBytes.length);
  state.set(encoded);
  state.set(saltBytes, encoded.length);
  for (let i = 0; i < 120_000; i++) {
    const digest = await crypto.subtle.digest("SHA-256", state);
    state = new Uint8Array(digest);
  }
  return `${salt}.${btoa(String.fromCharCode(...state)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, encoded] = stored.split(".");
  if (!salt || !encoded) return false;
  const input = new TextEncoder().encode(password);
  const saltBytes = new TextEncoder().encode(salt);
  let state = new Uint8Array(input.length + saltBytes.length);
  state.set(input);
  state.set(saltBytes, input.length);
  for (let i = 0; i < 120_000; i++) {
    const digest = await crypto.subtle.digest("SHA-256", state);
    state = new Uint8Array(digest);
  }
  const actual = btoa(String.fromCharCode(...state)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return actual === encoded;
}

export function getSessionToken(request: Request): string | null {
  const header = request.headers.get("Cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const rawToken = randomId(48);
  const tokenHash = await sha256Hex(rawToken);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SECONDS;
  await db.prepare(
    "INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(randomId(16), userId, tokenHash, expiresAt, now, now).run();
  return rawToken;
}

export async function revokeSession(db: D1Database, rawToken: string): Promise<void> {
  const tokenHash = await sha256Hex(rawToken);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").bind(now, tokenHash).run();
}

export async function getCurrentUser(db: D1Database, request: Request): Promise<AuthUser | null> {
  const rawToken = getSessionToken(request);
  if (!rawToken) return null;
  const tokenHash = await sha256Hex(rawToken);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    "SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.email, u.full_name, u.status FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? LIMIT 1"
  ).bind(tokenHash).first<SessionRow & UserRow>();
  if (!row || row.revoked_at || row.expires_at <= now || row.status !== "active") return null;
  await db.prepare("UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?").bind(now, row.id).run();
  const roles = await db.prepare("SELECT role FROM user_roles WHERE user_id = ? AND is_active = 1").bind(row.user_id).all<{ role: AppRole }>();
  return { id: row.user_id, email: row.email, fullName: row.full_name, status: row.status, roles: roles.results.map((r) => r.role) };
}

export function sessionCookie(token: string, secure = true): string {
  const attrs = [
    `${SESSION_COOKIE}=${token}`,
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export function canAccessModule(module: string, roles: AppRole[]): boolean {
  const matrix: Record<string, AppRole[]> = {
    dashboard: ["admin", "manager", "redacteur_chef", "redacteur", "auteur", "guide", "prestataire"],
    crm: ["admin", "manager"],
    clients: ["admin", "manager"],
    voyages: ["admin", "manager", "guide"],
    devis: ["admin", "manager"],
    experiences: ["admin", "manager", "redacteur_chef", "redacteur"],
    contenus: ["admin", "manager", "redacteur_chef", "redacteur", "auteur"],
    blog: ["admin", "manager", "redacteur_chef", "redacteur", "auteur"],
    mediatheque: ["admin", "manager", "redacteur_chef", "redacteur"],
    partenaires: ["admin", "manager", "prestataire"],
    services: ["admin", "manager"],
    billetterie: ["admin", "manager"],
    calendrier: ["admin", "manager", "redacteur_chef", "redacteur", "auteur", "guide"],
    analytics: ["admin", "manager"],
    parametres: ["admin", "manager"],
  };
  return (matrix[module] ?? []).some((role) => roles.includes(role));
}

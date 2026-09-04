import type { AuthUser, AppRole, AccountStatus } from "@/hooks/use-auth";

const SUPABASE_URL = "https://sxzdabtarlgozixcbzus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lCRfloaagzEBNlbvdspIcA_VCQfL6Cn";
const SESSION_COOKIE = "jeitinho_supabase_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type SessionPayload = { access_token: string; refresh_token: string; expires_at?: number };
type SupabaseUser = { id: string; email?: string | null };
type HubProfile = { id: string; email: string; full_name: string | null; status: AccountStatus; is_active: boolean };

function headers(accessToken?: string) {
  return { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken ?? SUPABASE_PUBLISHABLE_KEY}`, "Content-Type": "application/json" };
}
function encodeSession(session: SessionPayload) { return btoa(JSON.stringify(session)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function decodeSession(value: string): SessionPayload | null {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as SessionPayload;
  } catch { return null; }
}
export function getSession(request: Request): SessionPayload | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeSession(match[1]) : null;
}
export function sessionCookie(session: SessionPayload) { return `${SESSION_COOKIE}=${encodeSession(session)}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax; Secure`; }
export function clearSessionCookie() { return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`; }

export async function signIn(email: string, password: string): Promise<SessionPayload> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(), body: JSON.stringify({ email: email.toLowerCase(), password }) });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.access_token || !body?.refresh_token) throw new Error("Email ou mot de passe incorrect.");
  return body as SessionPayload;
}
export async function refreshSession(refreshToken: string): Promise<SessionPayload | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: headers(), body: JSON.stringify({ refresh_token: refreshToken }) });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null);
  return body?.access_token && body?.refresh_token ? body as SessionPayload : null;
}
async function getSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(accessToken) });
  return response.ok ? await response.json().catch(() => null) as SupabaseUser | null : null;
}
async function getHubProfile(accessToken: string, userId: string): Promise<{ profile: HubProfile | null; roles: AppRole[] }> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_hub_user_by_auth_uid`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ _user_id: userId }),
  });
  if (!response.ok) throw new Error(`Profil Hub indisponible (${response.status}).`);
  const body = await response.json().catch(() => null) as { profile?: HubProfile | null; roles?: AppRole[] } | null;
  return { profile: body?.profile ?? null, roles: body?.roles ?? [] };
}
async function resolveUser(startSession: SessionPayload): Promise<{ user: AuthUser; session: SessionPayload } | null> {
  let session = startSession;
  let authUser = await getSupabaseUser(session.access_token);
  if (!authUser && session.refresh_token) { const refreshed = await refreshSession(session.refresh_token); if (refreshed) { session = refreshed; authUser = await getSupabaseUser(session.access_token); } }
  if (!authUser?.id || !authUser.email) return null;
  const { profile, roles } = await getHubProfile(session.access_token, authUser.id);
  if (!profile || !profile.is_active || profile.status !== "active") return null;
  return { session, user: { id: profile.id, email: profile.email || authUser.email, fullName: profile.full_name, status: profile.status, roles } };
}
export async function getCurrentUser(request: Request): Promise<{ user: AuthUser; session: SessionPayload } | null> {
  const session = getSession(request);
  if (!session) return null;
  return resolveUser(session);
}
// Resolve a user directly from a freshly-issued session (e.g. right after signIn()).
// Do NOT reuse getCurrentUser(new Request(..., { headers: { Cookie } })) for this: Cloudflare
// Workers (workerd) silently drops the "Cookie" header on synthetic Request construction
// (it's on the Fetch spec's forbidden-header list, enforced even outside real fetch() calls),
// which made getSession() always return null and broke login right after a successful signIn().
export async function resolveSession(session: SessionPayload): Promise<{ user: AuthUser; session: SessionPayload } | null> {
  return resolveUser(session);
}
export async function signUp(email: string, password: string, fullName: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: headers(), body: JSON.stringify({ email: email.toLowerCase(), password, data: { full_name: fullName } }) });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (body?.msg?.toLowerCase?.().includes("already registered")) throw new Error("Un compte existe déjà avec cet email.");
    throw new Error(body?.msg ?? body?.message ?? body?.error_description ?? `Création impossible (Supabase ${response.status}).`);
  }
  return body as { user?: SupabaseUser; access_token?: string; refresh_token?: string };
}
export async function createPendingProfile(accessToken: string, user: SupabaseUser, fullName: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, { method: "POST", headers: { ...headers(accessToken), Prefer: "return=representation,resolution=ignore-duplicates" }, body: JSON.stringify({ id: user.id, email: user.email, full_name: fullName, status: "pending_validation", is_active: true }) });
  if (!response.ok) throw new Error("Impossible de créer le profil utilisateur.");
}
export async function requestPasswordReset(email: string, redirectTo: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, { method: "POST", headers: headers(), body: JSON.stringify({ email: email.toLowerCase(), redirect_to: redirectTo }) });
  if (!response.ok) throw new Error("Impossible de traiter la demande.");
}
export async function updatePassword(accessToken: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: headers(accessToken), body: JSON.stringify({ password }) });
  if (!response.ok) throw new Error("Lien de réinitialisation invalide ou expiré.");
}
export async function signOut(accessToken: string | null) {
  if (!accessToken) return;
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: headers(accessToken) }).catch(() => undefined);
}

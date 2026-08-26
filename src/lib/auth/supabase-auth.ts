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
  try { const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "==="; return JSON.parse(atob(padded.slice(0, Math.ceil(padded.length / 4) * 4))) as SessionPayload; } catch { return null; }
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
export async function getCurrentUser(request: Request): Promise<{ user: AuthUser; session: SessionPayload } | null> {
  let session = getSession(request);
  if (!session) return null;
  let authUser = await getSupabaseUser(session.access_token);
  if (!authUser && session.refresh_token) { const refreshed = await refreshSession(session.refresh_token); if (refreshed) { session = refreshed; authUser = await getSupabaseUser(session.access_token); } }
  if (!authUser?.id || !authUser.email) return null;
  const { profile, roles } = await getHubProfile(session.access_token, authUser.id);
  if (!profile || !profile.is_active || profile.status !== "active") return null;
  return { session, user: { id: profile.id, email: profile.email || authUser.email, fullName: profile.full_name, status: profile.status, roles } };
}
// TEMP DEBUG — remove after diagnosing the "Profil Hub introuvable" bug.
export async function getCurrentUserDebug(request: Request): Promise<{ trace: string[] }> {
  const trace: string[] = [];
  let session = getSession(request);
  if (!session) { trace.push("no session cookie"); return { trace }; }
  trace.push("session cookie decoded ok");
  let authUser: SupabaseUser | null = null;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(session.access_token) });
    const bodyText = await response.text().catch(() => "");
    trace.push(`GET /auth/v1/user -> ${response.status} :: ${bodyText.slice(0, 200)}`);
    authUser = response.ok ? (JSON.parse(bodyText || "null") as SupabaseUser) : null;
  } catch (e) {
    trace.push(`GET /auth/v1/user threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!authUser && session.refresh_token) {
    trace.push("attempting refresh");
    const refreshed = await refreshSession(session.refresh_token);
    if (refreshed) {
      session = refreshed;
      trace.push("refresh ok");
      try {
        const response2 = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(session.access_token) });
        const bodyText2 = await response2.text().catch(() => "");
        trace.push(`GET /auth/v1/user (retry) -> ${response2.status} :: ${bodyText2.slice(0, 200)}`);
        authUser = response2.ok ? (JSON.parse(bodyText2 || "null") as SupabaseUser) : null;
      } catch (e) {
        trace.push(`retry threw: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      trace.push("refresh failed");
    }
  }
  if (!authUser?.id || !authUser.email) { trace.push(`authUser invalid: ${JSON.stringify(authUser)}`); return { trace }; }
  trace.push(`authUser ok: id=${authUser.id} email=${authUser.email}`);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_hub_user_by_auth_uid`, {
      method: "POST",
      headers: headers(session.access_token),
      body: JSON.stringify({ _user_id: authUser.id }),
    });
    const bodyText = await response.text().catch(() => "");
    trace.push(`POST rpc get_hub_user_by_auth_uid -> ${response.status} :: ${bodyText.slice(0, 300)}`);
    const body = JSON.parse(bodyText || "null") as { profile?: HubProfile | null; roles?: AppRole[] } | null;
    const profile = body?.profile ?? null;
    if (!profile || !profile.is_active || profile.status !== "active") {
      trace.push(`profile check failed: ${JSON.stringify(profile)}`);
    } else {
      trace.push("profile check passed — should have logged in");
    }
  } catch (e) {
    trace.push(`rpc threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { trace };
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

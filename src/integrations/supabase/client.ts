// Compatibility adapter for legacy imports.
// The Hub no longer uses the Supabase SDK directly: all browser database
// operations go through the authenticated Cloudflare D1 API client.
export { db as supabase } from "@/lib/db-client";

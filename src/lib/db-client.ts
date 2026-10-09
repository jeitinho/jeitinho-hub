/*
 * Client de stockage des avatars (routes /api/storage/*). L'ancien client de requêtes
 * Cloudflare D1 (/api/db/query, /api/db/rpc) a été retiré : les données passent par Supabase.
 */
class DbStorage {
  from(bucket: string) {
    return {
      upload: async (
        path: string,
        file: File,
        options?: { upsert?: boolean; contentType?: string },
      ) => {
        const form = new FormData();
        form.set("bucket", bucket);
        form.set("path", path);
        form.set("upsert", String(options?.upsert ?? false));
        form.set("file", file);
        const response = await fetch("/api/storage/upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const body = await response.json().catch(() => null);
        return {
          data: body?.data ?? null,
          error: response.ok ? null : { message: body?.error ?? "Upload failed" },
        };
      },
      createSignedUrl: async (path: string, expiresIn: number) => {
        const params = new URLSearchParams({ bucket, path, expiresIn: String(expiresIn) });
        const response = await fetch(`/api/storage/signed-url?${params.toString()}`, {
          credentials: "include",
        });
        const body = await response.json().catch(() => null);
        return {
          data: body?.data ? { signedUrl: body.data.url } : null,
          error: response.ok ? null : { message: body?.error ?? "Signed URL failed" },
        };
      },
    };
  }
}

class DatabaseClient {
  readonly storage = new DbStorage();
}
export const db = new DatabaseClient();

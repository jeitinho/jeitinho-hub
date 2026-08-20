type Filter = { column: string; operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in"; value: unknown };
type Order = { column: string; ascending: boolean; nullsFirst?: boolean };
type QueryPayload = { operation: "select" | "insert" | "update" | "delete" | "upsert"; table: string; columns?: string; filters: Filter[]; orders: Order[]; limit?: number; offset?: number; values?: unknown; onConflict?: string };
export type DbError = { message: string; code?: string };
export type DbResult<T = unknown> = { data: T | null; error: DbError | null; count?: number | null };

class QueryBuilder<T = Record<string, unknown>> implements PromiseLike<DbResult<T | T[]>> {
  private payload: QueryPayload;
  private returning = false;
  private singleMode: "single" | "maybeSingle" | null = null;
  constructor(table: string) { this.payload = { operation: "select", table, columns: "*", filters: [], orders: [] }; }
  select(columns = "*", _options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) { if (this.payload.operation === "select") this.payload.columns = columns; else { this.returning = true; this.payload.columns = columns; } return this; }
  insert(values: unknown) { this.payload.operation = "insert"; this.payload.values = values; return this; }
  update(values: Record<string, unknown>) { this.payload.operation = "update"; this.payload.values = values; return this; }
  delete() { this.payload.operation = "delete"; return this; }
  upsert(values: unknown, options?: { onConflict?: string }) { this.payload.operation = "upsert"; this.payload.values = values; this.payload.onConflict = options?.onConflict; return this; }
  eq(c: string, v: unknown) { return this.filter("eq", c, v); } neq(c: string, v: unknown) { return this.filter("neq", c, v); }
  gt(c: string, v: unknown) { return this.filter("gt", c, v); } gte(c: string, v: unknown) { return this.filter("gte", c, v); }
  lt(c: string, v: unknown) { return this.filter("lt", c, v); } lte(c: string, v: unknown) { return this.filter("lte", c, v); }
  like(c: string, v: unknown) { return this.filter("like", c, v); } ilike(c: string, v: unknown) { return this.filter("ilike", c, v); }
  is(c: string, v: unknown) { return this.filter("is", c, v); } in(c: string, v: unknown[]) { return this.filter("in", c, v); }
  or(expression: string) { for (const part of expression.split(",")) { const match = part.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.*)$/); if (match) this.payload.filters.push({ column: match[1], operator: match[2] as Filter["operator"], value: decodeURIComponent(match[3]) }); } return this; }
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) { this.payload.orders.push({ column, ascending: options?.ascending !== false, nullsFirst: options?.nullsFirst }); return this; }
  limit(value: number) { this.payload.limit = value; return this; } range(from: number, to: number) { this.payload.offset = from; this.payload.limit = Math.max(0, to - from + 1); return this; }
  single() { this.singleMode = "single"; return this; } maybeSingle() { this.singleMode = "maybeSingle"; return this; }
  private filter(operator: Filter["operator"], column: string, value: unknown) { this.payload.filters.push({ column, operator, value }); return this; }
  private async execute(): Promise<DbResult<T | T[]>> {
    try {
      const response = await fetch("/api/db/query", { method: "POST", credentials: "include", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ ...this.payload, returning: this.returning, singleMode: this.singleMode }) });
      const body = (await response.json().catch(() => null)) as DbResult<T | T[]> | null;
      if (!response.ok) return { data: null, error: body?.error ?? { message: `Database request failed (${response.status})` } };
      return body ?? { data: null, error: { message: "Empty database response" } };
    } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "Database request failed" } }; }
  }
  then<TResult1 = DbResult<T | T[]>, TResult2 = never>(onfulfilled?: ((value: DbResult<T | T[]>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> { return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined); }
}

class DbStorage {
  from(bucket: string) {
    return {
      upload: async (path: string, file: File, options?: { upsert?: boolean; contentType?: string }) => {
        const form = new FormData(); form.set("bucket", bucket); form.set("path", path); form.set("upsert", String(options?.upsert ?? false)); form.set("file", file);
        const response = await fetch("/api/storage/upload", { method: "POST", credentials: "include", body: form }); const body = await response.json().catch(() => null);
        return { data: body?.data ?? null, error: response.ok ? null : { message: body?.error ?? "Upload failed" } };
      },
      createSignedUrl: async (path: string, expiresIn: number) => {
        const params = new URLSearchParams({ bucket, path, expiresIn: String(expiresIn) }); const response = await fetch(`/api/storage/signed-url?${params.toString()}`, { credentials: "include" }); const body = await response.json().catch(() => null);
        return { data: body?.data ? { signedUrl: body.data.url } : null, error: response.ok ? null : { message: body?.error ?? "Signed URL failed" } };
      },
    };
  }
}

class DatabaseClient {
  readonly storage = new DbStorage();
  from<T = Record<string, unknown>>(table: string) { return new QueryBuilder<T>(table); }
  async rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<DbResult<T>> {
    try { const response = await fetch("/api/db/rpc", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ fn, args }) }); const body = (await response.json().catch(() => null)) as DbResult<T> | null; if (!response.ok) return { data: null, error: body?.error ?? { message: `RPC failed (${response.status})` } }; return body ?? { data: null, error: { message: "Empty RPC response" } }; }
    catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "RPC failed" } }; }
  }
}
export const db = new DatabaseClient();

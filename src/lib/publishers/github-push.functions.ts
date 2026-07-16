import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/github";

const InputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  message: z.string().min(1),
  allowUpdate: z.boolean().optional().default(false),
});

function b64(str: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(str, "utf-8").toString("base64");
  // Fallback (Worker)
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).btoa(bin);
}

async function gh(path: string, init: RequestInit = {}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const ghKey = process.env.GITHUB_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY manquant");
  if (!ghKey) throw new Error("GITHUB_API_KEY manquant — connectez GitHub");
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${lovableKey}`);
  headers.set("X-Connection-Api-Key", ghKey);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${GATEWAY_URL}${path}`, { ...init, headers });
}

export const pushArticleToGithub = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { owner, repo, branch, path, content, message, allowUpdate } = data;

    // 1) Check if file already exists on that branch
    const check = await gh(
      `/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`,
      { method: "GET" },
    );

    let existingSha: string | undefined;
    if (check.status === 200) {
      const body = (await check.json()) as { sha?: string };
      existingSha = body.sha;
      if (!allowUpdate) {
        return {
          ok: false as const,
          conflict: true as const,
          error: `Le fichier existe déjà sur ${branch}: ${path}. Changez le slug ou activez la mise à jour.`,
        };
      }
    } else if (check.status !== 404) {
      const text = await check.text();
      return { ok: false as const, error: `GitHub lookup ${check.status}: ${text}` };
    }

    // 2) PUT contents
    const put = await gh(`/repos/${owner}/${repo}/contents/${encodeURI(path)}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: b64(content),
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!put.ok) {
      const text = await put.text();
      return { ok: false as const, error: `GitHub push ${put.status}: ${text}` };
    }

    const body = (await put.json()) as {
      content?: { html_url?: string; sha?: string; path?: string };
      commit?: { sha?: string; html_url?: string };
    };

    return {
      ok: true as const,
      updated: !!existingSha,
      commitUrl: body.commit?.html_url ?? null,
      commitSha: body.commit?.sha ?? null,
      fileUrl: body.content?.html_url ?? null,
      path: body.content?.path ?? path,
    };
  });
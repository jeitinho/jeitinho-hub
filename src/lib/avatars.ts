import { db } from "@/lib/db-client";

const BUCKET = "avatars";

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function getAvatarSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

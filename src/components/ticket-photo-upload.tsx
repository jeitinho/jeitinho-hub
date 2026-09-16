import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export const PHOTO_RATIOS = [
  { value: "16/9", label: "16:9 (large, carte événement)" },
  { value: "4/3", label: "4:3 (standard)" },
  { value: "1/1", label: "1:1 (carré)" },
] as const;

// Uploads directly to the "catalog-photos" public Storage bucket via the
// browser Supabase client (now session-bridged, so this runs as the real
// manager/admin user — RLS on storage.objects restricts writes to
// can_manage()). Stores only the resulting public URL on the ticket row;
// the file itself never touches the Cloudflare Worker.
export function TicketPhotoUpload({
  photoUrl,
  photoRatio,
  onPhotoUrlChange,
  onPhotoRatioChange,
}: {
  photoUrl: string;
  photoRatio: string;
  onPhotoUrlChange: (url: string) => void;
  onPhotoRatioChange: (ratio: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) return toast.error("Format non supporté — JPEG, PNG ou WebP uniquement.");
    if (file.size > MAX_BYTES) return toast.error("Image trop lourde — 5 Mo maximum.");
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `tickets/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("catalog-photos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("catalog-photos").getPublicUrl(path);
      onPhotoUrlChange(data.publicUrl);
      toast.success("Photo importée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import de la photo impossible.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Label>Photo</Label>
      <div
        className="relative overflow-hidden rounded-md border border-border/60 bg-muted/30"
        style={{ aspectRatio: photoRatio.replace("/", " / ") }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImagePlus className="h-8 w-8 opacity-40" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <Button type="button" variant="outline" size="sm" onClick={pickFile} disabled={uploading}>
          <ImagePlus className="mr-2 h-3.5 w-3.5" />
          {photoUrl ? "Remplacer la photo" : "Importer une photo"}
        </Button>
        {photoUrl && (
          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onPhotoUrlChange("")} disabled={uploading}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Retirer
          </Button>
        )}
      </div>
      <div className="max-w-xs">
        <Label className="mb-1.5 block text-xs">Format d'affichage</Label>
        <Select value={photoRatio} onValueChange={onPhotoRatioChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PHOTO_RATIOS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">Contrôle le cadrage sur la fiche billet et sur jeitinho.fr.</p>
      </div>
    </div>
  );
}

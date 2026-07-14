import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Image as ImageIcon } from "lucide-react";

export type MediaItem = {
  id: string;
  url: string;
  alt: string | null;
  caption: string | null;
  file_name: string;
  kind: string;
};

export function MediaPicker({
  open,
  onClose,
  onPick,
  multiple = false,
  filterKind,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (items: MediaItem[]) => void;
  multiple?: boolean;
  filterKind?: "image" | "video";
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, MediaItem>>({});
  const [loading, setLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected({});
    setLoading(true);
    (async () => {
      let query = supabase.from("media").select("id,url,alt,caption,file_name,kind").order("created_at", { ascending: false }).limit(120);
      if (filterKind) query = query.eq("kind", filterKind);
      const { data } = await query;
      setItems((data ?? []) as MediaItem[]);
      setLoading(false);
    })();
  }, [open, filterKind]);

  const filtered = q ? items.filter((m) => (m.file_name + " " + (m.alt ?? "") + " " + (m.caption ?? "")).toLowerCase().includes(q.toLowerCase())) : items;

  const toggle = (m: MediaItem) => {
    if (multiple) {
      setSelected((p) => {
        const next = { ...p };
        if (next[m.id]) delete next[m.id]; else next[m.id] = m;
        return next;
      });
    } else {
      onPick([m]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Médiathèque JEITINHO</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Input placeholder="Ou coller une URL" value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} />
          <Button
            variant="outline"
            disabled={!manualUrl.trim()}
            onClick={() => {
              onPick([{ id: `url:${manualUrl}`, url: manualUrl.trim(), alt: null, caption: null, file_name: manualUrl, kind: "image" }]);
              setManualUrl("");
              onClose();
            }}
          >Utiliser</Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : !filtered.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <ImageIcon className="mx-auto mb-2 h-8 w-8" />
              Aucun média dans la bibliothèque pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filtered.map((m) => {
                const isSel = !!selected[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m)}
                    className={`relative aspect-square overflow-hidden rounded-md border ${isSel ? "border-primary ring-2 ring-primary" : "border-border/60"}`}
                  >
                    <img src={m.url} alt={m.alt ?? ""} className="h-full w-full object-cover" />
                    {isSel && (
                      <div className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {multiple && (
          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <span className="text-xs text-muted-foreground">{Object.keys(selected).length} sélectionné(s)</span>
            <Button className="btn-primary" disabled={!Object.keys(selected).length} onClick={() => { onPick(Object.values(selected)); onClose(); }}>
              Insérer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
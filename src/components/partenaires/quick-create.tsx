import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KIND_LABEL, PARTNER_KINDS, createPartner, type PartnerKind } from "@/lib/ops/partenaires";
import { PARTNERS_KEY } from "./use-partner-update";

const EMPTY = {
  name: "",
  kind: "prestataire" as PartnerKind,
  phone: "",
  instagram: "",
  location: "",
};

/** Création rapide : statut « à contacter », source « manuel ». */
export function QuickCreate({
  neighborhoods,
  onCreated,
  onCancel,
}: {
  neighborhoods: string[];
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Nom obligatoire");
    setBusy(true);
    try {
      const phone = f.phone.trim() || null;
      const created = await createPartner({
        name: f.name.trim(),
        kind: f.kind,
        phone,
        whatsapp: phone,
        instagram: f.instagram.trim() || null,
        location: f.location.trim() || null,
      });
      toast.success(`${created.name} ajouté (à contacter)`);
      await qc.invalidateQueries({ queryKey: PARTNERS_KEY });
      setF(EMPTY);
      onCreated(created.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-5 p-4">
      <form
        onSubmit={submit}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
      >
        <Input
          autoFocus
          placeholder="Nom *"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v as PartnerKind })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTNER_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="tel"
          placeholder="Téléphone / WhatsApp"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
        <Input
          placeholder="@instagram"
          value={f.instagram}
          onChange={(e) => setF({ ...f, instagram: e.target.value })}
        />
        <Input
          list="quick-create-neighborhoods"
          placeholder="Quartier"
          value={f.location}
          onChange={(e) => setF({ ...f, location: e.target.value })}
        />
        <datalist id="quick-create-neighborhoods">
          {neighborhoods.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" disabled={busy}>
            Ajouter
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
}

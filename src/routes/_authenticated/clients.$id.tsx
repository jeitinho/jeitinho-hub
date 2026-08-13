import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileDown, Trash2 } from "lucide-react";
import { formatMoney, quoteStatusLabel } from "@/lib/quotes/status";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  component: ClientDetail,
  head: () => ({ meta: [{ title: "Client — JEITINHO" }] }),
});

function ClientDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: quotes } = useQuery({
    queryKey: ["client-quotes", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quotes")
        .select("id,number,reference,title,status,total_amount,currency,updated_at")
        .eq("client_id", id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFullName(data.full_name ?? "");
    setEmail(data.email ?? "");
    setPhone(data.phone ?? "");
    setNotes(data.notes ?? "");
  }, [data]);

  if (isLoading || !data) return <PageShell title="Chargement…">{null}</PageShell>;

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("clients")
      .update({ full_name: fullName.trim(), email: email.trim() || null, phone: phone.trim() || null, notes: notes.trim() || null })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Enregistré");
    refetch();
    qc.invalidateQueries({ queryKey: ["clients"] });
  };

  return (
    <PageShell
      eyebrow="Client"
      title={data.full_name}
      actions={
        <>
          <Link to="/devis/new" search={{ clientId: id }}>
            <Button className="btn-primary"><FileDown className="mr-2 h-4 w-4" />Créer un devis</Button>
          </Link>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              if (!confirm("Supprimer cette fiche client ?")) return;
              const { error } = await (supabase as any).from("clients").delete().eq("id", id);
              if (error) return toast.error(error.message);
              toast.success("Client supprimé");
              navigate({ to: "/clients" });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />Supprimer
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nom complet</Label>
                <Input className="mt-1.5" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1.5 min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg" style={{ fontFamily: "Fraunces, serif" }}>Devis</h2>
            {!quotes?.length ? (
              <p className="text-sm text-muted-foreground">Aucun devis pour ce client.</p>
            ) : (
              <div className="space-y-2">
                {quotes.map((q: any) => (
                  <Link key={q.id} to="/devis/$id" params={{ id: q.id }} className="flex items-center justify-between gap-4 rounded-md border border-border/60 p-3 hover:bg-muted/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="tracked text-[10px] text-muted-foreground">{q.number ?? q.reference}</span>
                        <span className="pill">{quoteStatusLabel(q.status)}</span>
                      </div>
                      <p className="truncate text-sm">{q.title}</p>
                    </div>
                    <span className="shrink-0 text-sm">{formatMoney(Number(q.total_amount ?? 0), q.currency)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

import { useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QUOTE_STATUSES, formatMoney, quoteStatusLabel } from "@/lib/quotes/status";

export const Route = createFileRoute("/_authenticated/devis")({ component: Layout, head: () => ({ meta: [{ title: "Devis — JEITINHO" }, { name: "description", content: "Créez, suivez et exportez les devis JEITINHO." }] }) });
function Layout() { const path = useRouterState({ select: (r) => r.location.pathname }); if (path.replace(/\/$/, "") !== "/devis") return <Outlet />; return <QuotesList />; }

function QuotesList() {
  const [filter, setFilter] = useState<string>("all");
  const { data, isLoading, error } = useQuery({ queryKey: ["quotes"], queryFn: async () => { const { data, error } = await supabase.from("quotes").select("id,number,reference,title,status,total_amount,currency,period_start,period_end,party_size,updated_at,clients(full_name),trips(id,reference,status)").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const rows = (data ?? []).filter((q) => filter === "all" || q.status === filter);

  return <PageShell eyebrow="Facturation" title="Devis" description="Rédigez, exportez et suivez vos devis. Un devis accepté devient le point de départ d'un voyage opérationnel." actions={<Link to="/devis/new"><Button className="btn-primary"><Plus className="mr-2 h-3.5 w-3.5" />Nouveau devis</Button></Link>}>
    <div className="mb-5 flex flex-wrap gap-2">{[{ value: "all", label: "Tous" }, ...QUOTE_STATUSES].map((s) => <button key={s.value} onClick={() => setFilter(s.value)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${filter === s.value ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}>{s.label}</button>)}</div>
    {isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : error ? <Card className="border-destructive/40 p-8"><h2 className="font-semibold">Impossible de charger les devis</h2><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p></Card> : !rows.length ? <Card className="border-dashed p-16 text-center"><FileText className="mx-auto mb-4 h-8 w-8 text-primary" /><h2 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucun devis</h2><p className="mt-2 text-sm text-muted-foreground">Créez votre premier devis pour un client.</p><Link to="/devis/new" className="mt-6 inline-block"><Button className="btn-primary">Créer un devis</Button></Link></Card> : <div className="space-y-2">{rows.map((q) => <Card key={q.id} className="flex flex-wrap items-center justify-between gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-soft)]"><Link to="/devis/$id" params={{ id: q.id }} className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="tracked text-[10px] text-muted-foreground">{q.number ?? q.reference}</span><span className="pill">{quoteStatusLabel(q.status)}</span>{q.trips?.[0] && <span className="inline-flex items-center gap-1 text-[10px] text-primary"><CheckCircle2 className="h-3 w-3" /> Voyage créé</span>}</div><h3 className="truncate text-base" style={{ fontFamily: "Fraunces, serif" }}>{q.title}</h3><p className="mt-1 text-xs text-muted-foreground">{q.clients?.full_name ?? "Client non renseigné"}{q.party_size ? ` · ${q.party_size} pers.` : ""}{q.period_start ? ` · ${q.period_start}${q.period_end ? ` → ${q.period_end}` : ""}` : ""}</p></Link><div className="flex items-center gap-3"><span className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>{formatMoney(Number(q.total_amount ?? 0), q.currency)}</span>{q.status === "accepted" && !q.trips?.[0] && <ConvertInlineButton quoteId={q.id} />}{q.trips?.[0] && <Link to="/voyages/$id" params={{ id: q.trips[0].id }}><Button size="sm" variant="outline">Ouvrir <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>}</div></Card>)}</div>}
  </PageShell>;
}

function ConvertInlineButton({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const convert = async () => { setBusy(true); try { const { data, error } = await supabase.rpc("convert_accepted_quote_to_trip", { p_quote_id: quoteId }); if (error) throw error; if (!data) throw new Error("La conversion n'a pas retourné de voyage."); toast.success("Voyage créé à partir du devis."); await qc.invalidateQueries({ queryKey: ["quotes"] }); navigate({ to: "/voyages/$id", params: { id: data } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de créer le voyage."); } finally { setBusy(false); } };
  return <Button size="sm" className="btn-primary" onClick={convert} disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="mr-1 h-3.5 w-3.5" />}Créer le voyage</Button>;
}

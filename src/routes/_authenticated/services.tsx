import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/_authenticated/services")({ component: ServicesFactory, head: () => ({ meta: [{ title: "Services Factory — JEITINHO" }] }) });

function ServicesFactory() {
  const { data, isLoading, error } = useQuery({ queryKey: ["services"], queryFn: async () => { const { data, error } = await (supabase as any).from("services").select("*").order("group_slug", { ascending: true }).order("title", { ascending: true }); if (error) throw error; return data ?? []; } });
  return <PageShell eyebrow="Catalogue commercial" title="Services Factory" description="Services de conciergerie lus directement depuis le Supabase JEITINHO OS.">
    {isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : error ? <Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger les services</h3><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p></Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((service: any) => <Card key={service.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{service.title}</h3><p className="mt-2 text-sm text-muted-foreground">{service.description ?? ""}</p></div><Wrench className="h-4 w-4 shrink-0 text-primary" /></div><div className="mt-4 flex flex-wrap gap-2">{service.group_slug && <Badge variant="outline">{service.group_slug}</Badge>}<Badge>{service.price_label ?? (service.price_from != null ? `${service.price_from} ${service.currency}` : "Sur demande")}</Badge></div></Card>)}</div>}
  </PageShell>;
}

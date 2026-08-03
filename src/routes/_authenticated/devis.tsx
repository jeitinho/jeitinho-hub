import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { QUOTE_STATUSES, formatMoney, quoteStatusLabel } from "@/lib/quotes/status";

export const Route = createFileRoute("/_authenticated/devis")({
  component: Layout,
  head: () => ({
    meta: [
      { title: "Devis — JEITINHO" },
      { name: "description", content: "Créez, suivez et exportez les devis JEITINHO." },
    ],
  }),
});

function Layout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path !== "/devis") return <Outlet />;
  return <QuotesList />;
}

function QuotesList() {
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id,number,reference,title,status,total_amount,currency,period_start,period_end,party_size,updated_at,clients(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = (data ?? []).filter((q) => filter === "all" || q.status === filter);

  return (
    <PageShell
      eyebrow="Facturation"
      title="Devis"
      description="Rédigez, exportez et suivez vos devis."
      actions={
        <Link to="/devis/new">
          <Button className="btn-primary"><Plus className="mr-2 h-3.5 w-3.5" />Nouveau devis</Button>
        </Link>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {[{ value: "all", label: "Tous" }, ...QUOTE_STATUSES].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              filter === s.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 text-muted-foreground hover:border-primary/40"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : !rows.length ? (
        <Card className="border-dashed p-16 text-center">
          <FileText className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucun devis</h2>
          <p className="mt-2 text-sm text-muted-foreground">Créez votre premier devis pour un client.</p>
          <Link to="/devis/new" className="mt-6 inline-block">
            <Button className="btn-primary">Créer un devis</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((q) => (
            <Link key={q.id} to="/devis/$id" params={{ id: q.id }} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-soft)]">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="tracked text-[10px] text-muted-foreground">{q.number ?? q.reference}</span>
                    <span className="pill">{quoteStatusLabel(q.status)}</span>
                  </div>
                  <h3 className="truncate text-base" style={{ fontFamily: "Fraunces, serif" }}>{q.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.clients?.full_name ?? "Client non renseigné"}
                    {q.party_size ? ` · ${q.party_size} pers.` : ""}
                    {q.period_start ? ` · ${q.period_start}${q.period_end ? ` → ${q.period_end}` : ""}` : ""}
                  </p>
                </div>
                <span className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
                  {formatMoney(Number(q.total_amount ?? 0), q.currency)}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
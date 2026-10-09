import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  FileText,
  Handshake,
  Inbox,
  Receipt,
  Palmtree,
  PartyPopper,
  Plane,
  Search,
  UserRound,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type SearchResult = { hits: Hit[]; failed: string[] };

type Hit = {
  key: string;
  group: string;
  label: string;
  sub?: string;
  go: () => void;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * Recherche globale (⌘K / Ctrl+K) : clients, demandes, devis, factures, partenaires,
 * expériences, voyages, soirées, réservations GYG. Le filtrage est fait côté base :
 * la liste ne re-filtre pas (shouldFilter={false}), sinon un e-mail ou un téléphone
 * trouvé en base disparaîtrait de l'affichage.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", term],
    enabled: open && term.length >= 2,
    queryFn: async (): Promise<SearchResult> => {
      const like = `%${term.replace(/[%,()]/g, " ")}%`;
      const go =
        (to: string, params?: Record<string, string>, search?: Record<string, string>) => () => {
          setOpen(false);
          void navigate({ to, params, search } as never);
        };
      const sources = {
        Clients: db
          .from("clients")
          .select("id,full_name,email,phone")
          .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
          .limit(6),
        Demandes: db
          .from("prospects")
          .select("id,name,email,phone,status,client_id")
          .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
          .limit(5),
        "Demandes du site": db
          .from("leads")
          .select("id,name,email,phone,status,source")
          .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
          .limit(5),
        Devis: db
          .from("quotes")
          .select("id,number,reference,title,status")
          .or(`number.ilike.${like},reference.ilike.${like},title.ilike.${like}`)
          .limit(6),
        Factures: db
          .from("invoices")
          .select("id,number,title,billing_name,status")
          .or(`number.ilike.${like},title.ilike.${like},billing_name.ilike.${like}`)
          .limit(5),
        Partenaires: db
          .from("partners")
          .select("id,name,kind,location")
          .or(`name.ilike.${like},instagram.ilike.${like},email.ilike.${like}`)
          .limit(6),
        Expériences: db
          .from("experiences")
          .select("id,title,category")
          .ilike("title", like)
          .limit(6),
        Voyages: db.from("trips").select("id,title").ilike("title", like).limit(4),
        Soirées: db.from("events").select("id,name,starts_at").ilike("name", like).limit(4),
        "Réservations GetYourGuide": db
          .from("ota_bookings")
          .select("id,booking_ref,lead_name,activity_title,client_id")
          .or(`booking_ref.ilike.${like},lead_name.ilike.${like}`)
          .limit(4),
      } as const;
      const names = Object.keys(sources) as (keyof typeof sources)[];
      const settled = await Promise.allSettled(names.map((n) => sources[n]));
      const failed: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowsOf = (name: keyof typeof sources): any[] => {
        const r = settled[names.indexOf(name)];
        if (r.status === "rejected" || r.value?.error) {
          failed.push(name);
          return [];
        }
        return r.value.data ?? [];
      };
      const clients = { data: rowsOf("Clients") };
      const prospects = rowsOf("Demandes");
      const leads = rowsOf("Demandes du site");
      const quotes = { data: rowsOf("Devis") };
      const invoices = rowsOf("Factures");
      const partners = { data: rowsOf("Partenaires") };
      const experiences = { data: rowsOf("Expériences") };
      const trips = { data: rowsOf("Voyages") };
      const events = { data: rowsOf("Soirées") };
      const bookings = { data: rowsOf("Réservations GetYourGuide") };
      const out: Hit[] = [];
      for (const c of clients.data ?? [])
        out.push({
          key: `c${c.id}`,
          group: "Clients",
          label: c.full_name,
          sub: c.email ?? c.phone ?? "",
          icon: UserRound,
          go: go("/clients/$id", { id: c.id }),
        });
      for (const p of prospects)
        out.push({
          key: `pr${p.id}`,
          group: "Demandes",
          label: p.name ?? p.email ?? p.phone ?? "Demande",
          sub: [p.email, p.phone].filter(Boolean).join(" · "),
          icon: Inbox,
          go: p.client_id ? go("/clients/$id", { id: p.client_id }) : go("/crm"),
        });
      for (const l of leads)
        out.push({
          key: `l${l.id}`,
          group: "Demandes",
          label: l.name ?? l.email ?? l.phone ?? "Demande du site",
          sub: [l.email, l.phone].filter(Boolean).join(" · "),
          icon: Inbox,
          go: go("/crm"),
        });
      for (const d of quotes.data ?? [])
        out.push({
          key: `q${d.id}`,
          group: "Devis",
          label: `${d.number ?? d.reference ?? ""} ${d.title ?? ""}`.trim(),
          sub: d.status,
          icon: FileText,
          go: go("/devis/$id", { id: d.id }),
        });
      for (const f of invoices)
        out.push({
          key: `f${f.id}`,
          group: "Factures",
          label: `${f.number ?? ""} ${f.title ?? ""}`.trim(),
          sub: f.billing_name ?? "",
          icon: Receipt,
          go: go("/devis/factures/$id", { id: f.id }),
        });
      for (const p of partners.data ?? [])
        out.push({
          key: `p${p.id}`,
          group: "Partenaires",
          label: p.name,
          sub: [p.kind, p.location].filter(Boolean).join(" · "),
          icon: Handshake,
          go: go("/partenaires", undefined, { id: p.id }),
        });
      for (const x of experiences.data ?? [])
        out.push({
          key: `x${x.id}`,
          group: "Expériences",
          label: x.title,
          sub: x.category ?? "",
          icon: Palmtree,
          go: go("/experiences/$id", { id: x.id }),
        });
      for (const t of trips.data ?? [])
        out.push({
          key: `t${t.id}`,
          group: "Voyages",
          label: t.title,
          icon: Plane,
          go: go("/voyages/$id", { id: t.id }),
        });
      for (const e of events.data ?? [])
        out.push({
          key: `e${e.id}`,
          group: "Soirées",
          label: e.name,
          sub: new Date(e.starts_at).toLocaleDateString("fr-FR"),
          icon: PartyPopper,
          go: go("/evenements", undefined, { id: e.id }),
        });
      for (const b of bookings.data ?? [])
        out.push({
          key: `b${b.id}`,
          group: "Réservations GetYourGuide",
          label: `${b.booking_ref} · ${b.lead_name ?? ""}`,
          sub: b.activity_title ?? "",
          icon: CalendarClock,
          go: b.client_id ? go("/clients/$id", { id: b.client_id }) : go("/distribution"),
        });
      return { hits: out, failed };
    },
  });

  const hits = data?.hits ?? [];
  const failed = data?.failed ?? [];
  const groups = [...new Set(hits.map((h) => h.group))];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-2 rounded-md border border-border/60 px-2.5 text-xs text-muted-foreground hover:bg-muted/40 sm:w-64"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Rechercher partout…</span>
        <kbd className="ml-auto hidden rounded border border-border/60 px-1 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Nom, e-mail, téléphone, devis, facture, réf. GYG…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {failed.length > 0 && (
            <p className="px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Recherche incomplète : {failed.join(", ")} indisponible
              {failed.length > 1 ? "s" : ""} pour le moment.
            </p>
          )}
          <CommandEmpty>
            {term.length < 2
              ? "Tape au moins 2 lettres."
              : isFetching
                ? "Recherche…"
                : "Aucun résultat."}
          </CommandEmpty>
          {groups.map((g) => (
            <CommandGroup key={g} heading={g}>
              {hits
                .filter((h) => h.group === g)
                .map((h) => (
                  <CommandItem key={h.key} value={h.key} onSelect={h.go}>
                    <h.icon className="mr-2 h-4 w-4" />
                    <span className="truncate">{h.label}</span>
                    {h.sub && (
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {h.sub}
                      </span>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

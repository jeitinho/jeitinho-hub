import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  FileText,
  Handshake,
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

type Hit = {
  key: string;
  group: string;
  label: string;
  sub?: string;
  go: () => void;
  icon: React.ComponentType<{ className?: string }>;
};

/** Recherche globale (⌘K / Ctrl+K) : clients, devis, partenaires, expériences, voyages, événements, réservations GYG. */
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

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["global-search", term],
    enabled: open && term.length >= 2,
    queryFn: async (): Promise<Hit[]> => {
      const like = `%${term.replace(/[%,()]/g, " ")}%`;
      const go =
        (to: string, params?: Record<string, string>, search?: Record<string, string>) => () => {
          setOpen(false);
          void navigate({ to, params, search } as never);
        };
      const [clients, quotes, partners, experiences, trips, events, bookings] = await Promise.all([
        db
          .from("clients")
          .select("id,full_name,email,phone")
          .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
          .limit(6),
        db
          .from("quotes")
          .select("id,number,reference,title,status")
          .or(`number.ilike.${like},reference.ilike.${like},title.ilike.${like}`)
          .limit(6),
        db
          .from("partners")
          .select("id,name,kind,location")
          .or(`name.ilike.${like},instagram.ilike.${like},email.ilike.${like}`)
          .limit(6),
        db.from("experiences").select("id,title,category").ilike("title", like).limit(6),
        db.from("trips").select("id,title").ilike("title", like).limit(4),
        db.from("events").select("id,name,starts_at").ilike("name", like).limit(4),
        db
          .from("ota_bookings")
          .select("id,booking_ref,lead_name,activity_title,client_id")
          .or(`booking_ref.ilike.${like},lead_name.ilike.${like}`)
          .limit(4),
      ]);
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
      for (const d of quotes.data ?? [])
        out.push({
          key: `q${d.id}`,
          group: "Devis",
          label: `${d.number ?? d.reference ?? ""} ${d.title ?? ""}`.trim(),
          sub: d.status,
          icon: FileText,
          go: go("/devis/$id", { id: d.id }),
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
          group: "Événements",
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
      return out;
    },
  });

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
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Client, devis, partenaire, expérience, réf. GYG…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
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
                  <CommandItem key={h.key} value={h.key + h.label} onSelect={h.go}>
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

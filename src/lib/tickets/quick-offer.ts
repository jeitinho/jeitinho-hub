// Quick creation of the two ticket kinds JEITINHO sells most: a football
// match (Maracanã, São Januário…) and one Sambódromo night. One offer per
// day/match, prices per sector (ticket_offer_variants).

export type QuickKind = "foot" | "sambodromo";

export const STADIUMS = ["Maracanã", "São Januário"] as const;

/** Sambódromo sectors as sold: Setor 1 to 13, then frisas and camarotes. */
export const SAMBODROMO_SECTORS: string[] = [
  ...Array.from({ length: 13 }, (_, i) => `Setor ${i + 1}`),
  "Frisas",
  "Camarotes",
];

export type SectorDraft = {
  label: string;
  price: number | null;
  capacity: number | null;
  /** Coût d'achat d'un billet de ce secteur. */
  supplier_cost?: number | null;
};

export function emptySectors(labels: string[]): SectorDraft[] {
  return labels.map((label) => ({ label, price: null, capacity: null }));
}

export function slugify(text: string, suffix: string = Date.now().toString(36)): string {
  const base = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return suffix ? `${base}-${suffix}` : base;
}

export function matchTitle(home: string, away: string): string {
  const h = home.trim();
  const a = away.trim();
  return h && a ? `${h} × ${a}` : h || a;
}

const FR_DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function frenchDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  return FR_DATE.format(new Date(`${isoDate}T12:00:00Z`));
}

export function sambodromoTitle(night: string, isoDate: string): string {
  const label = night.trim() || frenchDate(isoDate);
  return label ? `Sambódromo — ${label}` : "Sambódromo";
}

export function matchDescription(home: string, away: string, stadium: string, competition: string): string {
  const title = matchTitle(home, away);
  const comp = competition.trim();
  return `Billet pour ${title}${stadium.trim() ? ` au ${stadium.trim()}` : ""}${comp ? ` (${comp})` : ""}. Choisissez votre secteur : les billets sont envoyés après le paiement.`;
}

export function sambodromoDescription(night: string): string {
  return `Billet pour le défilé des écoles de samba au Sambódromo${night.trim() ? ` (${night.trim()})` : ""}. Prix par secteur, frisas et camarotes : les billets sont envoyés après le paiement.`;
}

/** Sectors worth creating: a label, and drop exact duplicates. */
export function cleanSectors(rows: SectorDraft[]): SectorDraft[] {
  const seen = new Set<string>();
  return rows
    .map((r) => ({ ...r, label: r.label.trim() }))
    .filter((r) => {
      if (!r.label || seen.has(r.label.toLowerCase())) return false;
      seen.add(r.label.toLowerCase());
      return true;
    });
}

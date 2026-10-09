import { supabase } from "@/integrations/supabase/client";

/**
 * « Mon travail » : ce que voit une personne qui n'est pas au pilotage.
 * Les données sont déjà filtrées par la base (RLS) : un rédacteur ne reçoit
 * que les contenus dont il est responsable, un guide que ses propres sorties.
 */

const TZ = "America/Sao_Paulo";
const DAY = 86_400_000;

export type MyItem = {
  id: string;
  title: string;
  kind: string | null;
  channel: string | null;
  status: string;
  planned_at: string | null;
  deadline: string | null;
  notes: string | null;
  source_url: string | null;
};

export type MyPlan = {
  /** Prévu les jours précédents, pas encore publié ni abandonné. */
  late: MyItem[];
  today: MyItem[];
  toProduce: MyItem[];
  toSchedule: MyItem[];
  blog: MyItem[];
};

export const rioDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("fr-CA", { timeZone: TZ });

export function channelLabel(item: Pick<MyItem, "channel" | "kind">) {
  if (item.channel === "ig_media") return "Instagram + TikTok · @jeitinho.fr";
  if (item.channel === "ig_conciergerie") return "Instagram · @jeitinho.conciergerie";
  if (item.channel === "ig_afrolove") return "Instagram · @afrolove.brasil";
  if (item.channel === "whatsapp") return "Groupe WhatsApp";
  if (item.channel === "blog" || item.kind === "article") return "Blog";
  if (item.channel?.startsWith("ig_")) return "Instagram";
  return item.channel ?? "";
}

/** Classe les contenus de la personne en 5 piles (retards d'abord). Pure, testable. */
export function buildPlan(items: MyItem[], now = new Date()): MyPlan {
  const today = rioDay(now);
  const lateFrom = rioDay(new Date(now.getTime() - 7 * DAY));
  const plan: MyPlan = { late: [], today: [], toProduce: [], toSchedule: [], blog: [] };
  for (const it of items) {
    if (it.status === "publie" || it.status === "abandonne") continue;
    const isBlog = it.channel === "blog" || it.kind === "article";
    const day = it.planned_at ? rioDay(it.planned_at) : null;
    if (day && day < today) {
      // Au-delà de 7 jours : hors de l'accueil (à trier dans le planning).
      if (day >= lateFrom) plan.late.push(it);
    } else if (isBlog) plan.blog.push(it);
    else if (day === today) plan.today.push(it);
    else if (it.status === "en_production" || it.status === "idee") plan.toProduce.push(it);
    else plan.toSchedule.push(it);
  }
  const byDeadline = (a: MyItem, b: MyItem) =>
    (a.deadline ?? a.planned_at ?? "9").localeCompare(b.deadline ?? b.planned_at ?? "9");
  plan.late.sort((a, b) => (a.planned_at ?? "").localeCompare(b.planned_at ?? ""));
  plan.toProduce.sort(byDeadline);
  plan.blog.sort(byDeadline);
  return plan;
}

/**
 * Contenus de la personne : 7 jours en arrière (retards) → 21 jours devant.
 * `owner` = prénom d'usage de la personne connectée (ex. « Lili ») : elle ne
 * voit que ce qui lui est attribué.
 */
export async function fetchMyPlan(owner?: string | null): Promise<MyPlan> {
  const from = new Date(Date.now() - 7 * DAY).toISOString();
  const to = new Date(Date.now() + 21 * DAY).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("editorial_items")
    .select("id,title,kind,channel,status,planned_at,deadline,notes,source_url")
    .in("status", ["idee", "en_production", "a_relire", "planifie"])
    .gte("planned_at", from)
    .lte("planned_at", to);
  if (owner?.trim()) q = q.eq("owner", owner.trim());
  const { data, error } = await q.order("planned_at");
  if (error) throw new Error(error.message);
  return buildPlan((data ?? []) as MyItem[]);
}

/** Étape suivante d'un contenu côté production. */
export function nextStep(status: string): { to: string; label: string } | null {
  if (status === "idee" || status === "en_production" || status === "a_relire")
    return { to: "planifie", label: "C'est produit" };
  if (status === "planifie") return { to: "publie", label: "C'est publié" };
  return null;
}

export async function setItemStatus(id: string, status: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("editorial_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Rien n'a été modifié (contenu introuvable ou droits).");
}

export type MyTrip = {
  id: string;
  reference: string | null;
  title: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  party_size: number | null;
  client_first_name: string | null;
  notes: string | null;
};

export async function fetchMyTrips(): Promise<MyTrip[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("my_guide_trips");
  if (error) throw new Error(error.message);
  return (data ?? []) as MyTrip[];
}

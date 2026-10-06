import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CheckSquare,
  Compass,
  FileText,
  MessageCircle,
  PartyPopper,
  PenLine,
  Plane,
  Tags,
} from "lucide-react";
import type { CalendarSource } from "@/lib/ops/calendrier";

export type SourceMeta = {
  label: string;
  icon: LucideIcon;
  /** Pastille pleine. */
  dot: string;
  /** Puce / barre : fond léger, texte contrasté, bordure. */
  chip: string;
  /** Case à cocher du filtre. */
  check: string;
};

// Classes écrites en entier pour que Tailwind les détecte.
export const SOURCE_META: Record<CalendarSource, SourceMeta> = {
  manual: {
    label: "Rendez-vous",
    icon: CalendarClock,
    dot: "bg-blue-500",
    chip: "border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100",
    check:
      "border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white data-[state=checked]:border-blue-500",
  },
  ota: {
    label: "Réservations GYG",
    icon: Compass,
    dot: "bg-orange-500",
    chip: "border-orange-500/40 bg-orange-500/10 text-orange-900 dark:text-orange-100",
    check:
      "border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white data-[state=checked]:border-orange-500",
  },
  trip: {
    label: "Voyages",
    icon: Plane,
    dot: "bg-indigo-500",
    chip: "border-indigo-500/40 bg-indigo-500/15 text-indigo-900 dark:text-indigo-100",
    check:
      "border-indigo-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:text-white data-[state=checked]:border-indigo-500",
  },
  quote: {
    label: "Devis",
    icon: FileText,
    dot: "bg-amber-500",
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
    check:
      "border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white data-[state=checked]:border-amber-500",
  },
  event: {
    label: "Événements",
    icon: PartyPopper,
    dot: "bg-fuchsia-500",
    chip: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-900 dark:text-fuchsia-100",
    check:
      "border-fuchsia-500 data-[state=checked]:bg-fuchsia-500 data-[state=checked]:text-white data-[state=checked]:border-fuchsia-500",
  },
  lot: {
    label: "Billetterie",
    icon: Tags,
    dot: "bg-pink-400",
    chip: "border-pink-400/50 bg-pink-400/5 text-pink-900 dark:text-pink-100",
    check:
      "border-pink-400 data-[state=checked]:bg-pink-400 data-[state=checked]:text-white data-[state=checked]:border-pink-400",
  },
  editorial: {
    label: "Éditorial",
    icon: PenLine,
    dot: "bg-cyan-500",
    chip: "border-cyan-500/40 bg-cyan-500/10 text-cyan-900 dark:text-cyan-100",
    check:
      "border-cyan-500 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-white data-[state=checked]:border-cyan-500",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    dot: "bg-green-500",
    chip: "border-green-500/40 bg-green-500/10 text-green-900 dark:text-green-100",
    check:
      "border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white data-[state=checked]:border-green-500",
  },
  task: {
    label: "Tâches",
    icon: CheckSquare,
    dot: "bg-violet-500",
    chip: "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100",
    check:
      "border-violet-500 data-[state=checked]:bg-violet-500 data-[state=checked]:text-white data-[state=checked]:border-violet-500",
  },
};

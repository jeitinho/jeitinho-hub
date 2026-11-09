import { Check, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import type { ReadinessCheck, ReadinessTab } from "@/lib/trips/readiness";

/** Carte « Préparation du voyage » : ce qui reste avant le départ, cliquable vers le bon onglet. */
export function ReadinessCard({
  checks,
  done,
  total,
  onOpen,
}: {
  checks: ReadinessCheck[];
  done: number;
  total: number;
  onOpen: (tab: ReadinessTab) => void;
}) {
  const pct = Math.round((done / Math.max(total, 1)) * 100);
  const todo = checks.filter((c) => !c.done);
  return (
    <Card className="mt-4 p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[10rem]">
          <p className="text-[13px] font-semibold">{t("Préparation du voyage")}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {done === total ? t("Tout est prêt pour le départ.") : `${done}/${total} · ${todo.length} ${t("à faire")}`}
          </p>
        </div>
        <div className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${done === total ? "bg-emerald-600" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {checks.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c.tab)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors ${
                c.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-border bg-card font-medium text-foreground hover:border-foreground/30"
              }`}
            >
              {c.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-primary" />}
              {t(c.label)}
              {c.detail && <span className={c.done ? "opacity-70" : "text-muted-foreground"}>· {c.detail}</span>}
              {!c.done && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, CalendarRange, Columns3, Plus } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EDITORIAL_OWNERS, mondayKey, todayKey, type EditorialItem } from "@/lib/ops/media";
import { useEditorialItems } from "@/components/media/use-media";
import { EditorialSheet } from "@/components/media/editorial-sheet";
import { EditorialWeek } from "@/components/media/editorial-week";
import { EditorialKanban } from "@/components/media/editorial-kanban";
import { EditorialThisWeek } from "@/components/media/editorial-this-week";
import { EditorialFilters } from "@/components/media/editorial-filters";
import {
  EMPTY_FILTERS,
  applyFilters,
  type EditorialFilterState,
} from "@/components/media/editorial-filters-state";

export const Route = createFileRoute("/_authenticated/contenus")({
  component: PlanningPage,
  head: () => ({ meta: [{ title: "Planning éditorial — JEITINHO" }] }),
});

const uniq = (xs: (string | null)[]) =>
  Array.from(new Set(xs.filter((x): x is string => !!x))).sort((a, b) => a.localeCompare(b, "fr"));

function PlanningPage() {
  const { data: items = [], isLoading, error, refetch } = useEditorialItems();
  const [view, setView] = useState("semaine");
  const [filters, setFilters] = useState<EditorialFilterState>(EMPTY_FILTERS);
  const [weekStart, setWeekStart] = useState(() => mondayKey(todayKey()));
  const [sheet, setSheet] = useState<{
    open: boolean;
    item: EditorialItem | null;
    defaults?: Partial<EditorialItem>;
  }>({ open: false, item: null });

  const options = useMemo(
    () => ({
      owners: uniq([...EDITORIAL_OWNERS, ...items.map((i) => i.owner)]),
      kinds: uniq(items.map((i) => i.kind)),
      collections: uniq(items.map((i) => i.collection)),
      channels: uniq(items.map((i) => i.channel)),
    }),
    [items],
  );
  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);

  const open = (item: EditorialItem) => setSheet({ open: true, item });
  // 12:00 UTC = 9 h à Rio.
  const create = (day?: string) =>
    setSheet({
      open: true,
      item: null,
      defaults: day ? { planned_at: `${day}T12:00:00.000Z`, status: "planifie" } : undefined,
    });

  return (
    <PageShell
      eyebrow="Média · blog.jeitinho.fr"
      title="Planning éditorial"
      description="Articles, reportages, newsletters et prospection partenaires : qui fait quoi, pour quand."
      actions={
        <>
          <Link to="/blog">
            <Button variant="outline">
              <BookOpen className="mr-2 h-3.5 w-3.5" />
              Articles en ligne
            </Button>
          </Link>
          <Button className="btn-primary" onClick={() => create()}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Nouveau contenu
          </Button>
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : error ? (
        <Card className="border-destructive/40 p-4 text-sm">
          {(error as Error).message}{" "}
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            Réessayer
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">Le planning est vide.</p>
          <Button className="btn-primary mt-4" onClick={() => create()}>
            Planifier un premier contenu
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <EditorialThisWeek
            items={items}
            onOpen={open}
            onShowLate={() => {
              setFilters({ ...EMPTY_FILTERS, lateOnly: true });
              setView("kanban");
            }}
          />

          <Tabs value={view} onValueChange={setView} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="self-start">
                <TabsTrigger value="semaine">
                  <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
                  Semaine
                </TabsTrigger>
                <TabsTrigger value="kanban">
                  <Columns3 className="mr-1.5 h-3.5 w-3.5" />
                  Kanban
                </TabsTrigger>
              </TabsList>
              <EditorialFilters
                value={filters}
                onChange={setFilters}
                owners={options.owners}
                kinds={options.kinds}
                collections={options.collections}
              />
            </div>
            {filtered.length === 0 && (
              <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
                Aucun contenu ne correspond aux filtres.
              </Card>
            )}
            <TabsContent value="semaine" className="mt-0">
              <EditorialWeek
                items={filtered}
                weekStart={weekStart}
                onWeekChange={setWeekStart}
                onOpen={open}
                onCreate={create}
              />
            </TabsContent>
            <TabsContent value="kanban" className="mt-0">
              <EditorialKanban items={filtered} onOpen={open} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <EditorialSheet
        open={sheet.open}
        onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))}
        item={sheet.item}
        defaults={sheet.defaults}
        collections={options.collections}
        channels={options.channels}
      />
    </PageShell>
  );
}

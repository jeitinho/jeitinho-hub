// Turns one day's planning lines into the fixed five-slot grid of the client
// planning PDF (DA Ketur / Asim): matin, midi, après-midi, soirée, nuit.
// A line spanning several slots (slot_span) becomes one taller row; a line
// with no slot is placed from its displayed time.

export const GRID_SLOTS = ["matin", "midi", "apres_midi", "soir", "nuit"] as const;
export type GridSlot = (typeof GRID_SLOTS)[number];

/** Hours shown under each slot label, as on the Asim planning. */
export const SLOT_HOURS: Record<GridSlot, string> = {
  matin: "< 11H00",
  midi: "11H / 14H",
  apres_midi: "14H / 19H",
  soir: "19H / 23H",
  nuit: "> 23H",
};

export type GridLine = {
  slot: string | null;
  slotSpan?: number | null;
  title: string;
  displayTime: string | null;
  category: string | null;
  isOffered: boolean;
  kind: string;
};

export type GridRow<L extends GridLine = GridLine> = { slots: GridSlot[]; lines: L[] };

/** "15h", "17h00", "09:30", "3h30" → slot by hour; null when no hour is readable. */
export function slotFromTime(time: string | null | undefined): GridSlot | null {
  const m = (time ?? "").match(/(\d{1,2})\s*[h:H]/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23) return null;
  // A 03h30 start on a given day is that day's early morning (sunrise hike);
  // after-midnight outings are planned on the previous evening's « nuit ».
  if (h < 11) return "matin";
  if (h < 14) return "midi";
  if (h < 19) return "apres_midi";
  if (h < 23) return "soir";
  return "nuit";
}

function slotIndex(line: GridLine): number {
  const direct = GRID_SLOTS.indexOf(line.slot as GridSlot);
  if (direct >= 0) return direct;
  const fromTime = slotFromTime(line.displayTime);
  return fromTime ? GRID_SLOTS.indexOf(fromTime) : 0;
}

export function buildDayGrid<L extends GridLine>(lines: L[]): GridRow<L>[] {
  const rows: GridRow<L>[] = [];
  const rowOf: (GridRow<L> | undefined)[] = new Array(GRID_SLOTS.length);
  const placed = lines
    .map((line, order) => ({ line, order, start: slotIndex(line) }))
    .sort((a, b) => a.start - b.start || (b.line.slotSpan ?? 1) - (a.line.slotSpan ?? 1) || a.order - b.order);

  for (const { line, start } of placed) {
    const existing = rowOf[start];
    if (existing) {
      existing.lines.push(line);
      continue;
    }
    const span = Math.max(1, Math.min(line.slotSpan ?? 1, GRID_SLOTS.length - start));
    // A long activity (Ilha Grande) owns its slots; lines starting inside
    // them join its row. The span stops before a slot already taken.
    let end = start + span;
    for (let i = start + 1; i < end; i++) {
      if (rowOf[i]) {
        end = i;
        break;
      }
    }
    const row: GridRow<L> = { slots: [...GRID_SLOTS.slice(start, end)], lines: [line] };
    for (let i = start; i < end; i++) rowOf[i] = row;
    rows.push(row);
  }

  // Empty slots get their own row so the day always reads matin → nuit.
  GRID_SLOTS.forEach((slot, i) => {
    if (!rowOf[i]) {
      const row: GridRow<L> = { slots: [slot], lines: [] };
      rowOf[i] = row;
      rows.push(row);
    }
  });
  return rows.sort((a, b) => GRID_SLOTS.indexOf(a.slots[0]) - GRID_SLOTS.indexOf(b.slots[0]));
}

/** Evening look (terracotta) for soirée lines and anything planned at night. */
export function isEveningRow(row: GridRow): boolean {
  return row.lines.some((l) => l.kind !== "free" && (l.category === "soiree" || row.slots[0] === "soir" || row.slots[0] === "nuit"));
}

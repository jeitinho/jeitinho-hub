import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, nextStep, type MyItem } from "./my-work";

const base = {
  kind: "carrousel",
  channel: "ig_media",
  notes: null,
  source_url: null,
  deadline: null,
} as const;
const it = (o: Partial<MyItem>): MyItem =>
  ({ id: "x", title: "t", status: "planifie", planned_at: null, ...base, ...o }) as MyItem;
const now = new Date("2026-10-08T13:00:00Z"); // 10h à Rio

test("répartit aujourd'hui / à produire / à programmer / blog", () => {
  const p = buildPlan(
    [
      it({ id: "a", planned_at: "2026-10-08T15:00:00Z" }),
      it({
        id: "b",
        planned_at: "2026-10-10T15:00:00Z",
        status: "en_production",
        deadline: "2026-10-08",
      }),
      it({ id: "c", planned_at: "2026-10-11T15:00:00Z" }),
      it({
        id: "d",
        planned_at: "2026-10-17T12:00:00Z",
        kind: "article",
        channel: "blog",
        status: "idee",
      }),
      it({ id: "e", planned_at: "2026-10-09T15:00:00Z", status: "publie" }),
    ],
    now,
  );
  assert.deepEqual(
    p.today.map((x) => x.id),
    ["a"],
  );
  assert.deepEqual(
    p.toProduce.map((x) => x.id),
    ["b"],
  );
  assert.deepEqual(
    p.toSchedule.map((x) => x.id),
    ["c"],
  );
  assert.deepEqual(
    p.blog.map((x) => x.id),
    ["d"],
  );
});

test("un post de 23h à Rio reste le jour même (fuseau)", () => {
  const p = buildPlan([it({ id: "late", planned_at: "2026-10-09T02:00:00Z" })], now);
  assert.deepEqual(
    p.today.map((x) => x.id),
    ["late"],
  );
});

test("retards : prévu les 7 derniers jours, pas publié → pile « En retard » en premier", () => {
  const p = buildPlan(
    [
      it({ id: "hier", planned_at: "2026-10-07T15:00:00Z", status: "planifie" }),
      it({ id: "avant", planned_at: "2026-10-05T15:00:00Z", status: "en_production" }),
      it({ id: "vieux", planned_at: "2026-09-20T15:00:00Z", status: "planifie" }),
      it({ id: "fait", planned_at: "2026-10-07T15:00:00Z", status: "publie" }),
      it({ id: "laisse", planned_at: "2026-10-07T15:00:00Z", status: "abandonne" }),
      it({ id: "ce-matin", planned_at: "2026-10-08T11:00:00Z" }),
    ],
    now,
  );
  assert.deepEqual(
    p.late.map((x) => x.id),
    ["avant", "hier"],
  );
  assert.deepEqual(
    p.today.map((x) => x.id),
    ["ce-matin"],
  );
});

test("étapes : produit puis publié", () => {
  assert.equal(nextStep("en_production")?.to, "planifie");
  assert.equal(nextStep("planifie")?.to, "publie");
  assert.equal(nextStep("idee")?.to, "planifie");
  assert.equal(nextStep("a_relire")?.to, "planifie");
  assert.equal(nextStep("publie"), null);
});

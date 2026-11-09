import { test } from "node:test";
import assert from "node:assert/strict";
import { filterActions, normalize } from "./command-actions";

test("normalize enlève accents et ponctuation", () => {
  assert.equal(normalize("  Nouvelle Expérience ! "), "nouvelle experience");
});

test("préfixes de mots : « nou dev » → Nouveau devis en premier", () => {
  const r = filterActions("nou dev", ["admin"]);
  assert.equal(r[0].id, "new-quote");
});

test("mots-clés portugais : « orcamento » trouve le devis", () => {
  const ids = filterActions("orcamento", ["admin"]).map((a) => a.id);
  assert.ok(ids.includes("new-quote"));
});

test("un guide ne voit pas les actions de modules interdits", () => {
  const ids = filterActions("", ["guide"]).map((a) => a.id);
  assert.ok(!ids.includes("new-quote"));
  assert.ok(ids.includes("open-manifest"));
});

test("sans saisie : créations d'abord", () => {
  const r = filterActions("", ["admin"]);
  assert.equal(r[0].kind, "create");
});

test("rien ne correspond → liste vide", () => {
  assert.deepEqual(filterActions("zzzz", ["admin"]), []);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCaption, isOverdue, nextStatus, statusMeta } from "./media";
import { nextStep } from "./my-work";

test("flux unique : idée → en production → prêt à poster → publié", () => {
  assert.equal(nextStatus("idee"), "en_production");
  assert.equal(nextStatus("en_production"), "planifie");
  assert.equal(nextStatus("a_relire"), "planifie");
  assert.equal(nextStatus("planifie"), "publie");
  assert.equal(nextStatus("publie"), null);
  assert.equal(nextStatus("abandonne"), null);
  assert.equal(statusMeta("planifie").label, "Prêt à poster");
  assert.equal(statusMeta("a_relire").value, "en_production");
});

test("nextStatus et nextStep (accueil média) vont dans le même sens", () => {
  for (const s of ["en_production", "planifie"]) assert.equal(nextStatus(s), nextStep(s)?.to);
});

test("retard : deadline dépassée OU publication prévue passée, sauf publié/abandonné", () => {
  const today = "2026-10-08";
  const now = new Date("2026-10-08T13:00:00Z"); // 10h à Rio
  const base = { deadline: null, planned_at: null, status: "planifie" };
  assert.equal(isOverdue({ ...base, deadline: "2026-10-07" }, today, now), true);
  assert.equal(isOverdue({ ...base, planned_at: "2026-10-08T12:00:00Z" }, today, now), true);
  assert.equal(isOverdue({ ...base, planned_at: "2026-10-08T15:00:00Z" }, today, now), false);
  assert.equal(
    isOverdue({ ...base, planned_at: "2026-10-01T12:00:00Z", status: "publie" }, today, now),
    false,
  );
  assert.equal(
    isOverdue({ ...base, deadline: "2026-10-01", status: "abandonne" }, today, now),
    false,
  );
  assert.equal(isOverdue(base, today, now), false);
});

test("légende : extraite entre « LÉGENDE : » et le repère suivant", () => {
  const notes = [
    "FORMAT : POST",
    "LÉGENDE :",
    "Fim do Nº01. 🖤",
    "EN : That's a wrap.",
    "#afrolove #lapa",
    "Collab : artistes · Localisation : Leviano",
  ].join("\n");
  assert.equal(extractCaption(notes), "Fim do Nº01. 🖤\nEN : That's a wrap.\n#afrolove #lapa");
  const carrousel =
    "CARROUSEL\nSlide 1 : « x »\n\nLÉGENDE :\nRio vue d'en haut.\n#rio\n\nPROMPT IMAGE : photo";
  assert.equal(extractCaption(carrousel), "Rio vue d'en haut.\n#rio");
  assert.equal(extractCaption("FORMAT : STORY\nTexte : bientôt"), null);
  assert.equal(extractCaption(null), null);
});

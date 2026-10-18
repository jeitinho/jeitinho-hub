import { test } from "node:test";
import assert from "node:assert/strict";
import { engagement, mediaKind, parseTags, safeFileName, summarizeSales } from "./cm";
import { canAccessModule, profileKind } from "../../hooks/use-auth";

test("profil cm, sans prendre le pas sur le pilotage", () => {
  assert.equal(profileKind(["community_manager"]), "cm");
  assert.equal(profileKind(["community_manager", "manager"]), "pilotage");
});
test("accès limités", () => {
  const r = ["community_manager"] as const;
  for (const m of ["dashboard", "contenus", "mediatheque", "demandes"])
    assert.equal(canAccessModule(m, [...r]), true);
  for (const m of ["finances", "evenements", "crm", "devis", "agents", "whatsapp", "blog"])
    assert.equal(canAccessModule(m, [...r]), false);
});
test("résumé des ventes sans montant", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const s = summarizeSales(
    [
      { event_id: "e", channel: "shotgun", day: "2026-10-01", tickets: 3 },
      { event_id: "e", channel: "shotgun", day: "2026-10-18", tickets: 2 },
      { event_id: "e", channel: "sympla", day: "2026-10-19", tickets: 1 },
    ],
    now,
  );
  assert.deepEqual(s, { total: 6, week: 3, byChannel: { shotgun: 5, sympla: 1 } });
});
test("noms de fichiers et tags", () => {
  assert.equal(safeFileName("Soirée Été #1 (final).MP4"), "soiree-ete-1-final.mp4");
  assert.equal(safeFileName("..."), "fichier");
  assert.deepEqual(parseTags("AfroLove, #soirée,  story,afrolove"), [
    "afrolove",
    "soirée",
    "story",
  ]);
  assert.equal(mediaKind("video/mp4"), "video");
  assert.equal(mediaKind("image/jpeg"), "photo");
  assert.equal(mediaKind(null), "document");
  assert.equal(engagement({ like_count: 4, comments_count: null }), 4);
});

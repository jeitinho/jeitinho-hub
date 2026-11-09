import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  SAMBODROMO_SECTORS,
  cleanSectors,
  matchTitle,
  sambodromoTitle,
  slugify,
} from "./quick-offer";

describe("Création rapide de billets", () => {
  test("Sambódromo : secteurs 1 à 13, frisas, camarotes", () => {
    assert.equal(SAMBODROMO_SECTORS.length, 15);
    assert.equal(SAMBODROMO_SECTORS[0], "Setor 1");
    assert.equal(SAMBODROMO_SECTORS[12], "Setor 13");
    assert.deepEqual(SAMBODROMO_SECTORS.slice(13), ["Frisas", "Camarotes"]);
  });

  test("titres", () => {
    assert.equal(matchTitle(" Flamengo ", "Vasco"), "Flamengo × Vasco");
    assert.equal(sambodromoTitle("", "2027-02-07"), "Sambódromo — dimanche 7 février");
    assert.equal(sambodromoTitle("Grupo Especial, 1re nuit", "2027-02-07"), "Sambódromo — Grupo Especial, 1re nuit");
  });

  test("slug sans accents", () => {
    assert.equal(slugify("Sambódromo — dimanche 7 février", "x"), "sambodromo-dimanche-7-fevrier-x");
    assert.equal(slugify("Flamengo × São Paulo", ""), "flamengo-sao-paulo");
  });

  test("secteurs vides ou en double ignorés", () => {
    const out = cleanSectors([
      { label: "Norte", price: 100, capacity: null },
      { label: " ", price: 50, capacity: null },
      { label: "norte", price: 90, capacity: null },
      { label: "Sul", price: null, capacity: 20 },
    ]);
    assert.deepEqual(out.map((s) => s.label), ["Norte", "Sul"]);
  });
});

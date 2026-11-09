import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { saleBlocker, type SaleOffer } from "./online-sale";

const offer: SaleOffer = {
  is_published: true,
  is_active: true,
  pricing_model: "markup",
  currency: "EUR",
  public_price: 80,
  event_date: "2027-02-13",
};

describe("Achat en ligne sur jeitinho.fr", () => {
  test("achetable quand tout est renseigné", () => {
    assert.equal(saleBlocker(offer, [], "2026-11-09"), null);
  });
  test("indique ce qui bloque", () => {
    assert.equal(saleBlocker({ ...offer, pricing_model: "quote_only" }, [], "2026-11-09"), "on_request");
    assert.equal(saleBlocker({ ...offer, is_published: false }, [], "2026-11-09"), "unpublished");
    assert.equal(saleBlocker({ ...offer, currency: "BRL" }, [], "2026-11-09"), "currency");
    assert.equal(saleBlocker(offer, [], "2027-03-01"), "past");
    assert.equal(saleBlocker({ ...offer, public_price: null }, [], "2026-11-09"), "no_price");
  });
  test("les secteurs remplacent le prix de l'offre", () => {
    assert.equal(saleBlocker({ ...offer, public_price: null }, [{ public_price: 120 }], "2026-11-09"), null);
    assert.equal(saleBlocker(offer, [{ public_price: null }], "2026-11-09"), "no_price");
    assert.equal(saleBlocker(offer, [{ public_price: 50, is_active: false }], "2026-11-09"), null);
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { appLinkFor, detectPlatform, parseInstagramHandle } from "../open-links";
import { gmailComposeUrl, instagramDmUrl } from "./send";

const gmail = gmailComposeUrl({
  account: "yesbrazilconciergerie@gmail.com",
  to: "ana@example.com",
  subject: "Ton voyage à Rio",
  body: "Olá Ana,\nvoici le devis.",
});

test("plateformes", () => {
  assert.equal(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "ios");
  assert.equal(detectPlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9)"), "android");
  assert.equal(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), "desktop");
});

test("ordinateur : liens laissés tels quels", () => {
  assert.equal(appLinkFor(gmail, "desktop"), null);
  assert.equal(appLinkFor("https://www.instagram.com/afrolove.brasil/", "desktop"), null);
});

test("Gmail sur iPhone : appli Gmail avec brouillon, secours appli Mail", () => {
  const l = appLinkFor(gmail, "ios")!;
  assert.ok(l.app.startsWith("googlegmail://co?to=ana%40example.com&subject="));
  assert.ok(l.app.includes(encodeURIComponent("Olá Ana,\nvoici le devis.")));
  assert.ok(l.fallback!.startsWith("mailto:ana@example.com?subject="));
});

test("Gmail sur Android : mailto prérempli", () => {
  const l = appLinkFor(gmail, "android")!;
  assert.ok(l.app.startsWith("mailto:ana@example.com?subject="));
  assert.ok(l.app.includes("body="));
});

test("Instagram : profil dans l'appli", () => {
  assert.equal(instagramDmUrl("afrolove.brasil"), "https://www.instagram.com/afrolove.brasil/");
  assert.equal(parseInstagramHandle("https://ig.me/m/jeitinho.fr"), "jeitinho.fr");
  assert.equal(parseInstagramHandle("https://www.instagram.com/p/abc/"), null);
  const ios = appLinkFor("https://www.instagram.com/afrolove.brasil/", "ios")!;
  assert.equal(ios.app, "instagram://user?username=afrolove.brasil");
  assert.equal(ios.fallback, "https://www.instagram.com/afrolove.brasil/");
  const and = appLinkFor("https://instagram.com/afrolove.brasil", "android")!;
  assert.ok(
    and.app.startsWith(
      "intent://instagram.com/_u/afrolove.brasil/#Intent;package=com.instagram.android",
    ),
  );
});

test("autres liens (WhatsApp, sites) : inchangés", () => {
  assert.equal(appLinkFor("https://wa.me/5521999999999?text=oi", "ios"), null);
  assert.equal(appLinkFor("https://blog.jeitinho.fr/", "android"), null);
});

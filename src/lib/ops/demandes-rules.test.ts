// Tests des règles du pipeline Demandes (aucune dépendance) :
//   node --experimental-strip-types --test src/lib/ops/demandes-rules.test.ts
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ageLabel,
  buildDemandes,
  compareDemandes,
  contactDrafts,
  deriveStage,
  fmtTravelRange,
  gmailComposeUrl,
  isToHandleToday,
  matchCatalogActivities,
  normalizeText,
  pipelineCounters,
  scoreDemande,
  sourceGroup,
  stageOptions,
  stagePatch,
  whatsappDigits,
  type DemandeLead,
  type DemandeProspect,
  type DemandeQuote,
  type DemandeTask,
  type TemperatureInput,
} from "./demandes-rules.ts";

const NOW = new Date("2026-10-07T15:00:00Z"); // 12:00 à Rio
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY).toISOString().slice(0, 10);

function temp(over: Partial<TemperatureInput>) {
  return scoreDemande(
    {
      stage: "nouvelle",
      travelStart: null,
      travelEnd: null,
      partySize: null,
      quotes: [],
      lastActivityAt: daysAgo(1),
      ...over,
    },
    NOW,
  );
}

function prospect(over: Partial<DemandeProspect> = {}): DemandeProspect {
  return {
    id: "p1",
    status: "new",
    source: "jeitinho.fr/mon-voyage",
    name: "Catherine Martin",
    email: "catherine@example.com",
    phone: "0640922137",
    travel_start: null,
    travel_end: null,
    party_size: null,
    activities: [],
    message: null,
    notes: null,
    client_id: null,
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
    last_contact_at: null,
    ...over,
  };
}

function lead(over: Partial<DemandeLead> = {}): DemandeLead {
  return {
    id: "l1",
    source: "jeitinho.fr/mon-voyage",
    status: "new",
    name: "Catherine",
    email: "catherine@example.com",
    phone: null,
    travel_start: null,
    travel_end: null,
    party_size: null,
    activities: [],
    message: null,
    prospect_id: null,
    received_at: daysAgo(10),
    processed_at: null,
    updated_at: null,
    last_contact_at: null,
    request_type: null,
    campaign: null,
    ...over,
  };
}

function quote(over: Partial<DemandeQuote> = {}): DemandeQuote {
  return {
    id: "q1",
    number: "2026-005",
    reference: "2026-005",
    title: "Séjour sur mesure à Rio",
    status: "sent",
    total_amount: 4500,
    currency: "EUR",
    client_id: null,
    prospect_id: "p1",
    sent_at: daysAgo(2),
    accepted_at: null,
    paid_at: null,
    created_at: daysAgo(3),
    ...over,
  };
}

function task(over: Partial<DemandeTask> = {}): DemandeTask {
  return {
    id: "t1",
    kind: "nouveau_lead",
    status: "a_valider",
    title: "Nouveau lead — Catherine",
    lead_id: null,
    prospect_id: null,
    quote_id: null,
    due_at: daysAgo(9),
    handled_at: null,
    created_at: daysAgo(10),
    ...over,
  };
}

describe("scoreDemande (chaud / tiède / froid)", () => {
  test("CHAUD : départ dans les 90 jours et nombre de personnes connu", () => {
    const r = temp({ travelStart: inDays(30), travelEnd: inDays(35), partySize: 2 });
    assert.equal(r.temperature, "chaud");
    assert.ok(r.reasons.includes("Voyage dans 30 j"));
  });

  test("dates proches mais nombre de personnes inconnu → TIÈDE", () => {
    assert.equal(temp({ travelStart: inDays(30), partySize: null }).temperature, "tiede");
    assert.equal(temp({ travelStart: inDays(30), partySize: 0 }).temperature, "tiede");
  });

  test("borne des 90 jours : 90 → chaud, 91 → tiède", () => {
    assert.equal(temp({ travelStart: inDays(90), partySize: 2 }).temperature, "chaud");
    assert.equal(temp({ travelStart: inDays(91), partySize: 2 }).temperature, "tiede");
  });

  test("voyage en cours → chaud ; voyage passé → pas chaud", () => {
    assert.equal(
      temp({ travelStart: inDays(-2), travelEnd: inDays(3), partySize: 2 }).temperature,
      "chaud",
    );
    assert.equal(
      temp({ travelStart: inDays(-10), travelEnd: inDays(-5), partySize: 2 }).temperature,
      "tiede",
    );
  });

  test("jour calendaire de Rio (et non UTC)", () => {
    // 01:30 UTC le 7 = 22:30 le 6 à Rio : une arrivée le 6 est « aujourd'hui ».
    const late = new Date("2026-10-07T01:30:00Z");
    const r = scoreDemande(
      {
        stage: "nouvelle",
        travelStart: "2026-10-06",
        travelEnd: null,
        partySize: 2,
        quotes: [],
        lastActivityAt: late.toISOString(),
      },
      late,
    );
    assert.equal(r.temperature, "chaud");
    assert.equal(r.reasons[0], "Arrivée aujourd'hui");
  });

  test("CHAUD : devis envoyé il y a moins de 7 jours", () => {
    const r = temp({ quotes: [{ status: "sent", sent_at: daysAgo(3) }] });
    assert.equal(r.temperature, "chaud");
    assert.equal(r.reasons[0], "Devis envoyé il y a 3 j");
  });

  test("devis envoyé il y a 8 jours ou déjà accepté → ne rend pas chaud", () => {
    assert.equal(temp({ quotes: [{ status: "sent", sent_at: daysAgo(8) }] }).temperature, "tiede");
    assert.equal(
      temp({ quotes: [{ status: "accepted", sent_at: daysAgo(2) }] }).temperature,
      "tiede",
    );
  });

  test("FROID : aucune activité depuis plus de 21 jours (21 pile = tiède)", () => {
    assert.equal(temp({ lastActivityAt: daysAgo(22) }).temperature, "froid");
    assert.equal(temp({ lastActivityAt: daysAgo(21) }).temperature, "tiede");
  });

  test("un voyage imminent reste chaud même sans activité récente", () => {
    const r = temp({ travelStart: inDays(10), partySize: 4, lastActivityAt: daysAgo(40) });
    assert.equal(r.temperature, "chaud");
  });

  test("FROID : étape Perdue, quels que soient les autres critères", () => {
    const r = temp({
      stage: "perdue",
      travelStart: inDays(5),
      partySize: 2,
      quotes: [{ status: "sent", sent_at: daysAgo(1) }],
    });
    assert.deepEqual(r, { temperature: "froid", reasons: ["Demande perdue"] });
  });
});

describe("deriveStage", () => {
  const p = { status: "new" as const, last_contact_at: null };

  test("prospect new sans signal → Nouvelle", () => {
    assert.equal(deriveStage({ prospect: p, leads: [], quotes: [] }).stage, "nouvelle");
  });

  test("lead contacté ou qualifié → Contactée", () => {
    for (const status of ["contacted", "qualified"] as const) {
      const r = deriveStage({
        prospect: p,
        leads: [{ status, last_contact_at: null }],
        quotes: [],
      });
      assert.equal(r.stage, "contactee");
    }
  });

  test("devis 'sent' → Devis envoyé même si le prospect est resté 'new'", () => {
    const r = deriveStage({
      prospect: p,
      leads: [],
      quotes: [{ status: "sent", sent_at: daysAgo(1) }],
    });
    assert.equal(r.stage, "devis");
    assert.equal(r.floor, "devis");
  });

  test("statut plus avancé que les faits : Négociation reste Négociation", () => {
    const r = deriveStage({
      prospect: { ...p, status: "negotiating" },
      leads: [],
      quotes: [{ status: "sent", sent_at: daysAgo(1) }],
    });
    assert.equal(r.stage, "negociation");
  });

  test("devis accepté ou payé → Gagnée", () => {
    for (const status of ["accepted", "paid"]) {
      const r = deriveStage({ prospect: p, leads: [], quotes: [{ status, sent_at: null }] });
      assert.equal(r.stage, "gagnee");
    }
  });

  test("prospect lost → Perdue, même avec un devis envoyé", () => {
    const r = deriveStage({
      prospect: { ...p, status: "lost" },
      leads: [],
      quotes: [{ status: "sent", sent_at: daysAgo(1) }],
    });
    assert.equal(r.stage, "perdue");
    assert.equal(r.floor, "devis");
  });

  test("lead orphelin : son statut seul", () => {
    const one = (status: DemandeLead["status"]) =>
      deriveStage({ prospect: null, leads: [{ status, last_contact_at: null }], quotes: [] }).stage;
    assert.equal(one("new"), "nouvelle");
    assert.equal(one("qualified"), "contactee");
    assert.equal(one("converted"), "gagnee");
    assert.equal(one("spam"), "perdue");
    assert.equal(one("lost"), "perdue");
  });
});

describe("buildDemandes", () => {
  const data = {
    prospects: [
      prospect({ id: "p1", travel_start: inDays(20), party_size: 3, activities: ["City Tour"] }),
    ],
    leads: [
      lead({ id: "l1", prospect_id: "p1", activities: ["Christ Rédempteur"], message: "Bonjour" }),
      lead({
        id: "l2",
        prospect_id: "p1",
        received_at: daysAgo(4),
        activities: ["city tour", "Plages"],
        source: "Partenaire",
      }),
      lead({ id: "l3", name: "Orphelin", email: null, status: "new", received_at: daysAgo(30) }),
    ],
    quotes: [quote({ client_id: "c9", sent_at: daysAgo(12), created_at: daysAgo(12) })],
    tasks: [
      task({ id: "t1", lead_id: "l1" }),
      task({ id: "t2", prospect_id: "p1", status: "envoye", handled_at: daysAgo(1) }),
      task({ id: "t3", lead_id: "l3" }),
    ],
  };
  const [merged, orphan] = buildDemandes(data, NOW);

  test("un prospect + ses leads = une seule demande ; le lead orphelin est à part", () => {
    assert.equal(merged.key, "p:p1");
    assert.deepEqual(
      merged.leads.map((l) => l.id),
      ["l1", "l2"],
    );
    assert.equal(orphan.key, "l:l3");
    assert.equal(orphan.kind, "lead");
  });

  test("activités fusionnées sans doublon (insensible à la casse) et sources", () => {
    assert.deepEqual(merged.activities, ["City Tour", "Plages", "Christ Rédempteur"]);
    assert.deepEqual(merged.sources, ["jeitinho.fr/mon-voyage", "Partenaire"]);
    assert.equal(merged.message, "Bonjour");
  });

  test("étape, client issu du devis, tâches à valider, dernière activité", () => {
    assert.equal(merged.stage, "devis");
    assert.equal(merged.clientId, "c9");
    assert.equal(merged.tasksToValidate, 1);
    assert.equal(merged.lastActivityAt, daysAgo(1));
    assert.equal(merged.temperature, "chaud"); // départ dans 20 j, 3 pers.
    assert.equal(orphan.temperature, "froid"); // reçu il y a 30 j, rien depuis
    assert.equal(orphan.tasksToValidate, 1);
  });

  test("un lead dont le prospect n'existe plus devient orphelin", () => {
    const [d] = buildDemandes(
      { prospects: [], leads: [lead({ prospect_id: "disparu" })], quotes: [], tasks: [] },
      NOW,
    );
    assert.equal(d.kind, "lead");
  });
});

describe("tri et compteurs", () => {
  const mk = (id: string, travel: string | null, created: number, party = 2) =>
    prospect({ id, travel_start: travel, party_size: party, created_at: daysAgo(created) });
  const list = buildDemandes(
    {
      prospects: [
        mk("tiede-recent", null, 2),
        mk("tiede-ancien", null, 9),
        mk("chaud", inDays(15), 1),
      ],
      leads: [],
      quotes: [],
      tasks: [],
    },
    NOW,
  );

  test("chaud d'abord, puis la plus ancienne non traitée", () => {
    assert.deepEqual(
      [...list].sort(compareDemandes).map((d) => d.id),
      ["chaud", "tiede-ancien", "tiede-recent"],
    );
  });

  test("à traiter aujourd'hui = chaudes + nouvelles de plus de 24 h", () => {
    const fresh = buildDemandes(
      { prospects: [mk("frais", null, 0.5)], leads: [], quotes: [], tasks: [] },
      NOW,
    )[0];
    assert.equal(isToHandleToday(fresh, NOW), false);
    assert.equal(list.filter((d) => isToHandleToday(d, NOW)).length, 3);
  });

  test("compteurs : devis sans réponse (tous) et gagnées ce mois", () => {
    const won = buildDemandes(
      {
        prospects: [prospect({ id: "w" })],
        leads: [],
        quotes: [quote({ prospect_id: "w", status: "accepted", accepted_at: daysAgo(3) })],
        tasks: [],
      },
      NOW,
    );
    const c = pipelineCounters(
      won,
      [{ status: "sent" }, { status: "sent" }, { status: "draft" }],
      NOW,
    );
    assert.equal(c.pendingQuotes, 2);
    assert.equal(c.wonThisMonth, 1);
    assert.equal(c.toHandle, 0);
  });
});

describe("menu « Passer à… »", () => {
  test("prospect avec devis envoyé : impossible de revenir avant Devis envoyé, Perdue possible", () => {
    const opts = stageOptions({
      kind: "prospect",
      stage: "devis",
      floor: "devis",
      floorReason: "Un devis envoyé attend une réponse",
      lead: null,
    });
    const by = Object.fromEntries(opts.map((o) => [o.target, o]));
    assert.equal(by.nouvelle.disabled, true);
    assert.equal(by.contactee.hint, "Un devis envoyé attend une réponse");
    assert.equal(by.devis.current, true);
    assert.equal(by.negociation.disabled, false);
    assert.equal(by.perdue.disabled, false);
  });

  test("lead orphelin : Devis / Négociation demandent de qualifier, Spam disponible", () => {
    const opts = stageOptions({
      kind: "lead",
      stage: "nouvelle",
      floor: "nouvelle",
      floorReason: null,
      lead: lead(),
    });
    const by = Object.fromEntries(opts.map((o) => [o.target, o]));
    assert.equal(by.devis.disabled, true);
    assert.equal(by.devis.hint, "Qualifier d'abord la demande");
    assert.equal(by.contactee.disabled, false);
    assert.equal(by.spam.disabled, false);
  });

  test("stagePatch écrit le bon statut et garde l'ancien pour annuler", () => {
    const now = NOW.toISOString();
    const p = stagePatch(
      { kind: "prospect", stage: "nouvelle", prospect: prospect(), lead: null },
      "contactee",
      now,
    );
    assert.deepEqual(p?.patch, { status: "contacted", last_contact_at: now });
    assert.equal(p?.previous.status, "new");
    const l = stagePatch(
      { kind: "lead", stage: "nouvelle", prospect: null, lead: lead() },
      "spam",
      now,
    );
    assert.deepEqual(l?.patch, { status: "spam", processed_at: now });
    assert.equal(
      stagePatch({ kind: "lead", stage: "nouvelle", prospect: null, lead: lead() }, "devis", now),
      null,
    );
    assert.equal(
      stagePatch(
        { kind: "prospect", stage: "devis", prospect: prospect(), lead: null },
        "perdue",
        now,
      )?.patch.status,
      "lost",
    );
  });
});

describe("contact 1 clic", () => {
  test("numéros WhatsApp", () => {
    assert.equal(whatsappDigits("0640922137"), "33640922137");
    assert.equal(whatsappDigits("+33782029061"), "33782029061");
    assert.equal(whatsappDigits("+55 83 98140-3824"), "5583981403824");
    assert.equal(whatsappDigits("+32472212460"), "32472212460");
    assert.equal(whatsappDigits("21987654321"), "5521987654321");
    assert.equal(whatsappDigits("0033612345678"), "33612345678");
    assert.equal(whatsappDigits("33612345678"), "33612345678");
    assert.equal(whatsappDigits("123"), null);
    assert.equal(whatsappDigits(null), null);
  });

  test("lien de rédaction Gmail sur la boîte contact@", () => {
    const url = gmailComposeUrl({
      to: "a@b.fr",
      subject: "Séjour à Rio",
      body: "Ligne 1\nLigne 2",
    });
    assert.ok(
      url.startsWith(
        "https://mail.google.com/mail/?authuser=yesbrazilconciergerie%40gmail.com&view=cm&fs=1",
      ),
    );
    assert.ok(url.includes("&to=a%40b.fr"));
    assert.ok(url.includes("&su=S%C3%A9jour%20%C3%A0%20Rio"));
    assert.ok(url.includes("&body=Ligne%201%0ALigne%202"));
  });

  test("brouillons : relance du devis quand un devis attend une réponse", () => {
    const d = contactDrafts({
      name: "Axel Nogbou",
      travelStart: null,
      travelEnd: null,
      pendingQuote: quote(),
    });
    assert.ok(d.whatsapp.startsWith("Bonjour Axel,"));
    assert.ok(d.whatsapp.includes("réf. 2026-005"));
  });
});

describe("catalogue et formats", () => {
  const options = [
    { value: "experience:1", label: "City Tour" },
    { value: "experience:2", label: "Christ Rédempteur" },
    { value: "ticket:3", label: "Sambodrome — Défilés des écoles" },
    { value: "ticket:4", label: "Maracanã — Billet match" },
    { value: "experience:5", label: "Funk" },
    { value: "service:6", label: "Baile Funk" },
  ];

  test("correspondance insensible aux accents, titre contenu, sans doublon", () => {
    const picked = matchCatalogActivities(
      [
        "christ redempteur",
        "Vérifier disponibilités — Sambodrome — Défilés des écoles",
        "MARACANA - billet match",
        "City Tour",
        "city-tour",
        "Plages",
        "Baile Funk",
      ],
      options,
    );
    assert.deepEqual(
      picked.map((o) => o.value),
      ["experience:2", "ticket:3", "ticket:4", "experience:1", "service:6"],
    );
  });

  test("normalizeText", () => {
    assert.equal(normalizeText("  Maracanã — Billet  Match "), "maracana billet match");
  });

  test("sources groupées", () => {
    assert.equal(sourceGroup("jeitinho.fr/trouver-jeitinho"), "Site jeitinho.fr");
    assert.equal(sourceGroup("GetYourGuide"), "GetYourGuide");
    assert.equal(sourceGroup("contact@jeitinho.fr"), "E-mail contact@");
    assert.equal(sourceGroup("manual"), "Saisie manuelle");
  });

  test("dates et âge", () => {
    assert.equal(fmtTravelRange("2026-12-01", "2026-12-04"), "01/12 → 04/12/2026");
    assert.equal(fmtTravelRange("2026-12-28", "2027-01-03"), "28/12/2026 → 03/01/2027");
    assert.equal(fmtTravelRange("2027-02-09", null), "09/02/2027");
    assert.equal(fmtTravelRange(null, null), null);
    assert.equal(ageLabel(daysAgo(3), NOW), "il y a 3 j");
    assert.equal(
      ageLabel(new Date(NOW.getTime() - 5 * 3_600_000).toISOString(), NOW),
      "il y a 5 h",
    );
  });
});

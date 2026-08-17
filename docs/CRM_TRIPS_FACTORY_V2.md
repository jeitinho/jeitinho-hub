# JEITINHO OS — CRM / Voyages / Experience Factory v2

## CRM
- Lead → Prospect → Client remains the commercial funnel.
- A quote is itemized through `quote_line_items`.
- Acceptance is a commercial state, not a payment state.
- An accepted quote can be explicitly converted to a Trip; conversion is idempotent.
- Tracking fields remain attached through lead/prospect/client.

## Trip
- A client can have multiple trips.
- A trip has a primary client and many travelers.
- Traveler v1 fields: name, role, phone, notes.
- Trip is the operational cockpit.
- Activities are concrete instances of catalog Experiences.
- Each activity can select a Partner, date/time, sold price, partner cost and operational status.
- Replacements preserve history.
- Payments are separate: deposit / balance / other.

## Experience Factory
- Experience is the canonical product.
- Catalog price/cost are not overwritten by negotiated trip values.
- Content outputs remain attached to the Experience Factory.
- Partner selection occurs on the trip activity, unless a preferred partner is explicitly configured later.
- Missing operational fields remain missing; the system must not invent availability, cost or partner data.

## Required UX

1. Quote detail: show itemized lines and an action `Créer le voyage` when status is accepted.
2. Trip detail: show client, travelers, activities, partner selector, sold price, cost, margin, status and payments.
3. Experience detail: show canonical product fields and Factory outputs.
4. CRM dashboard: show commercial actions and a link to the resulting trip when one exists.

## Future automation

Accepted quote → optional user-confirmed trip creation → copy quote lines → operational follow-up tasks.
Payment events → update payment state only; never infer payment from quote acceptance.
Trip activity confirmation → optional partner notification later, behind human approval in Saison 1.

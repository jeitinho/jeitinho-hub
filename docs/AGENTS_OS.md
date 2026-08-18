# JEITINHO AGENTS OS

## Purpose

The Agent layer is a controlled intelligence layer inside JEITINHO Hub. The Hub remains the source of truth for business data; agents never maintain a parallel business database.

## Core agents

1. Revenue Agent — revenue, gross margin, product economics, channel economics, ROI recommendations.
2. Sales Agent — lead qualification, quote follow-up, pipeline prioritisation, sales preparation.
3. Concierge Agent — combines experiences and services into client-ready itineraries and offers.
4. Content Research Agent — monitors editorial, destination, event, competitor and SEO opportunities.
5. Content Agent — turns approved ideas into briefs, articles, social assets and repurposing plans.
6. Partner Agent — evaluates suppliers, margins, reliability, availability and partner opportunities.
7. CEO Agent — synthesises company state into priorities, risks, opportunities and daily briefing.
8. Acquisition Agent — analyses sources, campaigns, landing pages and conversion paths.
9. Retention Agent — identifies post-trip follow-up, repeat purchase and referral opportunities.
10. Operations Agent — monitors upcoming trips, missing operational steps, service assignments and exceptions.
11. Finance Agent — reconciles revenue, costs, commissions, payments and outstanding amounts.
12. Product/Offer Agent — analyses catalogue performance and proposes packs, upsells, pricing experiments and new offers.

## Autonomy levels

N0 observe only.
N1 recommend actions.
N2 prepare actions for approval.
N3 execute authorised low-risk actions.

Default is N1/N2. N3 requires explicit per-tool permission and is never assumed.

## Tool boundaries

Agents interact through typed tools such as:
- crm.get_leads
- crm.get_clients
- sales.get_open_quotes
- sales.prepare_followup
- quotes.create_draft
- catalogue.get_experiences
- catalogue.get_services
- trips.get_upcoming
- trips.get_missing_operations
- revenue.get_sales
- revenue.get_costs
- revenue.get_product_performance
- revenue.calculate_roi
- content.get_pipeline
- content.create_brief
- research.create_opportunity
- partners.get_performance
- finance.get_outstanding

No agent should perform arbitrary SQL from the UI layer. Server-side tool implementations remain responsible for authorisation and validation.

## Auditability

Every agent run and action must be logged with:
- agent id
- task type
- autonomy level
- status
- inputs / output summary
- confidence
- approval requirement
- approving user when relevant
- target entity and id
- timestamp

## Shared operating principle

One customer, one experience, one service, one quote, one trip. The agent layer enriches and acts on the same records already used by Hub modules.

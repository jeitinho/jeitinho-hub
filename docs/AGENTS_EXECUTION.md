# JEITINHO Agent Execution

The Hub now connects its Agent Operating System to the OpenAI Responses API.

## Runtime

- Provider: OpenAI Responses API
- Default model: `gpt-5.6-luna`
- Server-only secret: `OPENAI_API_KEY`
- Optional override: `OPENAI_AGENT_MODEL`

GPT-5.6 Luna supports function calling through `v1/responses` and is intended for cost-sensitive, high-volume workloads.

## Flow

`/agents` → authenticated server function → agent registry → OpenAI Responses API → governed Hub tools → Supabase → `agent_runs` / `agent_actions` audit.

The browser never receives `OPENAI_API_KEY`.

## Autonomy

- N0: observe
- N1: recommend
- N2: prepare / propose
- N3: execute explicitly authorized actions

Current agents default to N1/N2. Sensitive tools such as follow-up preparation, brief creation and quote drafts are recorded as proposals and do not send messages or create external communications.

## Database

Apply `supabase/migrations/20260818032000_agent_execution.sql` before using `/agents` in an environment whose database does not already contain `agent_runs` and `agent_actions`.

## Production secret

Set `OPENAI_API_KEY` in the server/runtime environment used by the Cloudflare deployment. Never prefix it with `VITE_` and never commit the value.

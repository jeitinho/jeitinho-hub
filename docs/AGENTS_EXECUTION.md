# JEITINHO Agent Execution

The Hub connects its Agent Operating System to OpenRouter using an OpenAI-compatible chat-completions interface with governed JEITINHO tools.

## Runtime

- Provider: OpenRouter
- Default model: `openrouter/free`
- Server-only secret: `OPENROUTER_API_KEY`
- Optional override: `OPENROUTER_MODEL`
- Optional metadata: `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`

`openrouter/free` lets OpenRouter select an eligible free model. A specific compatible free model can be selected later without changing the agents or tools.

## Flow

`/agents` → authenticated server function → agent registry → OpenRouter → governed Hub tools → Supabase → `agent_runs` / `agent_actions` audit.

The browser never receives `OPENROUTER_API_KEY`.

## Autonomy

- N0: observe
- N1: recommend
- N2: prepare / propose
- N3: execute explicitly authorized actions

Current agents default to N1/N2. Sensitive tools are recorded as proposals and do not send messages or create external communications unless an explicit approved execution path exists.

## Database

Apply `supabase/migrations/20260818032000_agent_execution.sql` before using `/agents` in an environment whose database does not already contain `agent_runs` and `agent_actions`.

## Production secret

Set `OPENROUTER_API_KEY` in the server/runtime environment used by the Cloudflare deployment. Never prefix it with `VITE_` and never commit the value.

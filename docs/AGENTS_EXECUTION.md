# JEITINHO Agent Execution

The Hub connects its Agent Operating System to the Google Gemini Developer API.

## Runtime

- Provider: Google Gemini API
- Default model: `gemini-2.5-flash-lite`
- Server-only secret: `GEMINI_API_KEY`
- Optional override: `GEMINI_AGENT_MODEL`
- Transport: Gemini `generateContent` REST API with native function calling

Gemini 2.5 Flash-Lite supports function calling and is the most cost-efficient Gemini model for high-frequency lightweight tasks. Google currently lists a free tier for Gemini API usage, subject to rate limits.

## Flow

`/agents` → authenticated server function → agent registry → Gemini API → governed Hub tools → Supabase → `agent_runs` / `agent_actions` audit.

The browser never receives `GEMINI_API_KEY`.

## Autonomy

- N0: observe
- N1: recommend
- N2: prepare / propose
- N3: execute explicitly authorized actions

Current agents default to N1/N2. Sensitive tools such as follow-up preparation, brief creation and quote drafts are recorded as proposals and do not send messages or create external communications.

## Database

Apply `supabase/migrations/20260818032000_agent_execution.sql` before using `/agents` in an environment whose database does not already contain `agent_runs` and `agent_actions`.

## Gemini setup

1. Open Google AI Studio and create an API key for the project.
2. Add `GEMINI_API_KEY` to the server/runtime environment.
3. Optionally set `GEMINI_AGENT_MODEL` to another Gemini model available to the project.
4. Never prefix the key with `VITE_` and never commit the value.

For the current free-tier setup, keep `GEMINI_AGENT_MODEL=gemini-2.5-flash-lite`. If you need stronger reasoning later, `gemini-2.5-flash` is also a function-calling model and can be selected without changing the agent code.

## Production

Set `GEMINI_API_KEY` in the server/runtime environment used by the Cloudflare deployment. The agent runtime calls Gemini only from the server.

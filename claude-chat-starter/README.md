# Claude chat starter: quiz + AI coach with a server-side key and a monthly cap

Live demo (demo mode, canned replies): https://alibek88alarko.github.io/demos/claude-chat-starter/

What the production version does:
- `api/chat.js`: Vercel function that holds `ANTHROPIC_API_KEY`. Calls Claude through the official
  `@anthropic-ai/sdk`, limits message length and turns per session, adds up the cost of every reply from the
  returned token usage, and answers with a friendly "back soon" message once `MONTHLY_CAP_USD` is reached.
  Typed error handling returns retryable errors so the page can show "tap Send again" instead of a blank screen.
  Server-side refusal fallback is on (`fallbacks: "default"`).
- `api/subscribe.js`: sends name, email and the attachment-style tag to Kit (API v4: upsert subscriber, then tag).
- `lib/budget.js`: price table, cost from usage, monthly key, Upstash Redis REST store (in-memory for tests).

Env: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-opus-5-5`), `MONTHLY_CAP_USD`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `KIT_API_KEY`, `KIT_TAG_SECURE`, `KIT_TAG_ANXIOUS`,
`KIT_TAG_AVOIDANT`, `KIT_TAG_FEARFUL`.

Custom subdomain with the domain staying at GoDaddy: add the domain in Vercel, then in GoDaddy DNS create a
CNAME record for the subdomain pointing to the target Vercel shows. Also set a spend limit in the Anthropic
Console as a hard backstop.

Tests: `node lib/budget.test.mjs`

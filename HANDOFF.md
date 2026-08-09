# afterscroll — Handoff

## Goal
Production-ready SaaS that turns a user's saved posts (X bookmarks, YouTube likes,
LinkedIn saves, arbitrary pasted links) into to-dos, Google Calendar events, and a
searchable memory ("Ask") with plain-words explanations — all powered by Claude
Opus 5, per-user, behind a $5/mo Stripe paywall with a 7-day trial. Started as a
hackathon build ("Marked"), pivoted to a real product ("afterscroll").

## Where it lives
- **Repo:** https://github.com/TLXyloph/afterscroll (branch `main`), local at
  `/Users/samvrithbandi/Desktop/hackathons/betaSnow/reelBot/afterscroll`
- **Live:** https://afterscroll.afterscroll.workers.dev (Cloudflare Workers; the
  account subdomain is literally "afterscroll", hence the doubled host)
- **Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 → Cloudflare Workers
  via OpenNext (`@opennextjs/cloudflare` 1.20.2). Data: Cloudflare D1 (SQLite) in
  prod, better-sqlite3 locally. LLM: Claude Opus 5 via `@anthropic-ai/foundry-sdk`
  (Azure/Microsoft Foundry).

## Architecture quick map
- `src/lib/db.ts` — single `q(sql, params)` interface; resolves D1 binding via
  `getCloudflareContext().env.DB` on Workers, else better-sqlite3 at `.data/dev.db`.
  All SQL is one parameterized surface (uppercase columns). Schema: `src/lib/schema.sql`.
- `src/lib/session.ts` — cookie `as_uid` → SESSIONS row → ACCOUNT_ID. `bindIdentity`
  ROTATES the sid on every OAuth (session-fixation fix). 30-day TTL. `getAccountId()`
  is the auth primitive used by every route.
- Identity: an account anchors to an X id and/or Google id (`IDENTITIES` table);
  connecting the 2nd provider in the same session links it. All data scoped by ACCOUNT_ID.
- `src/lib/x.ts` / `google.ts` — OAuth (X PKCE+state, Google state), token refresh,
  bookmark/liked-video fetch, calendar insert. Tokens in `TOKENS` table (plaintext — see risks).
- `src/lib/llm.ts` — `llmComplete(callType, prompt, accountId)`; web_fetch tool on
  extraction so Claude opens links for dates; logs cost to SPEND_LOG (internal only).
- `src/lib/guardrails.ts` — injection sanitize/delimit, per-account $2/day + global
  $100/day spend caps, per-route rate limits (DB-backed REQUEST_LOG), `clientIp` prefers
  CF-Connecting-IP.
- `src/lib/ingest.ts` — shared single-bookmark pipeline (import + extension capture).
- `src/lib/billing.ts` — Stripe: entitlement (trialing/active/past_due), gated behind
  `BILLING_ENFORCED` flag; checkout/portal/webhook/promo routes under `src/app/api/billing`
  and `src/app/api/admin/promo`.
- Routes (`src/app/api/*`): connect/{x,google}[/callback], connections, sync, import,
  todos[/id], events[/id]/add, insights, ask, explain, extension/{token,capture},
  billing/{checkout,portal,status,webhook}, admin/promo, logout.
- UI: Rikin's design (Sidebar tabs Home/Saved/Ask/Settings; Scout mascot; light mode
  default). `src/components/*`. `YourMemory.tsx` has the click-to-open "intelligence
  window" (open source post + "explain it simply"). Settings has BillingCard +
  ExtensionTokenCard.
- `extension/` — MV3 Chrome extension auto-capturing LinkedIn saves → `/api/extension/capture`
  with a device token (minted in Settings). Not deployed; user loads unpacked.

## Current progress (all shipped, committed, pushed)
1. **Snowflake removed** → Cloudflare D1 / better-sqlite3.
2. **Real accounts** (X/Google identity, per-account scoping) — replaced cookie-only identity.
3. **Stripe paywall** — $5/mo, 7-day trial, promo codes (admin endpoint), webhooks,
   entitlement gate on all AI routes (dormant behind `BILLING_ENFORCED=false`).
4. **EverOS removed** — an empirical eval proved it silently lost 29/30 memories under
   our call pattern (Ask 2/12 with it vs 12/12 reading own INSIGHTS in-prompt, also
   faster). Ask now selects from INSIGHTS and cites only referenced notes.
5. **LLM + abuse guardrails** — injection hardening (probe defeated), spend caps, rate
   limits, cookie hardening.
6. **Security audit + fixes** — 1 CRITICAL (session fixation → takeover) FIXED via sid
   rotation; + logout/TTL, CSP/HSTS/frame headers, timing-safe admin key + rate limit,
   trusted client IP, generic error bodies, safe-href guard, extension sender check,
   global spend breaker. IDOR/SQLi/SSRF/OAuth/webhook/XSS verified clean. Git history
   scanned — no secrets ever committed.
7. **Cloudflare deploy** — DONE & verified live. D1 `afterscroll` (id
   `8a043143-ec28-448b-bf24-a1360ab20db5`), schema loaded (12 tables). Live smoke test:
   homepage 200, D1 endpoints return real data, edge security headers present, webhook
   400s unsigned.

## What worked
- OpenNext adapter port kept Next.js intact; the `db.ts` D1/sqlite seam meant zero route
  changes for the DB swap. `better-sqlite3` (native) was cleanly excluded from the Worker
  bundle because it sits behind a lazy `require` only reached on the sqlite path.
- Delegating the guardrails, Stripe, extension, EverOS-eval, and security-audit to
  parallel subagents; coordinating integration passes to avoid file clobber.
- Empirically testing EverOS instead of assuming — the data made the removal obvious.
- sid rotation on bind fully closes the confirmed account-takeover PoC.

## What didn't work / dead ends (don't repeat)
- **EverOS** — do not reintroduce as the Ask backend at this scale; it loses memories
  silently and has no audit API. In-prompt from INSIGHTS is better until ~500–1000
  insights/user (then prefer prompt caching / embeddings over the SQL table).
- **LinkedIn "automatic" via API** — no public API exposes saved posts; the Chrome
  extension is the only honest automatic path. Don't attempt credential scraping.
- **Snowflake token-ledger cost analytics** — removed per user; SPEND_LOG is internal
  (caps only), no user-facing cost UI. Don't re-add cost chips.
- First deploy attempt failed on Cloudflare **email-verification** (code 10034) and an
  unregistered **workers.dev subdomain** — both are account/dashboard actions, now done.

## Next steps
### To make login work on the live site (USER actions)
1. **Push secrets to CF** (from `afterscroll/`, values not printed):
   ```bash
   for k in X_CLIENT_ID X_CLIENT_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET AZURE_ANTHROPIC_API_KEY AZURE_ANTHROPIC_RESOURCE; do
     grep -m1 "^$k=" .env | sed "s/^$k=//" | tr -d '\r' | npx wrangler secret put "$k"
   done
   ```
   (Setting a secret auto-deploys a new version.)
2. **Register production OAuth callbacks:**
   - X portal → app → add `https://afterscroll.afterscroll.workers.dev/api/connect/x/callback`
   - Google Cloud → Credentials → add `.../api/connect/google/callback`

### Optional / when ready
3. **Enable billing:** set CF secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `ADMIN_KEY` (>=24 chars); add a Stripe webhook endpoint at
   `https://afterscroll.afterscroll.workers.dev/api/billing/webhook` for
   `customer.subscription.*` + `checkout.session.completed`; flip `BILLING_ENFORCED` to
   `"true"` in `wrangler.jsonc` [vars]; redeploy. **Run a Stripe TEST-mode round-trip
   before trusting it** (checkout → `stripe listen` webhook → promo mint → enforced
   402→trial→pass) — NOT yet done because keys weren't present.
4. **Security hardening deferred:** encrypt `TOKENS`/`EXT_TOKENS` at rest (AES-256-GCM,
   key as a wrangler secret) before scaling. Documented in `DEPLOY.md`.
5. **Extension:** load `extension/` unpacked; set App URL + a device token (Settings →
   Generate token); host_permissions already include the live origin.
6. Rotate hackathon-era credentials (X, Google, Azure) as precaution (none were committed,
   but they were live during the event).

## Deploy / dev commands
- Local dev: `npm run dev` (better-sqlite3 at `.data/dev.db`; `SEED_MODE=true` uses
  `seed/bookmarks.json`). Seed a session for curl tests: insert ACCOUNTS + SESSIONS rows
  via `tsx -e "import('./src/lib/db')..."`.
- Deploy: `npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`
- D1: `npx wrangler d1 execute afterscroll --remote --file=./src/lib/schema.sql`
- Wrangler auth: already logged in as samvrith@gmail.com (account `ad6ef77ad2d6634493c71422dce105fe`).

## Notes
- CLAUDE.md rule: never read/print `.env` contents — secret transfer is done by the USER
  running the loop above.
- Old Vercel deploy (Social-MeDoa era) is superseded; ignore/decommission.
- Two subagents (LinkedIn extension, security audit) and the EverOS eval are complete;
  their full reports are in this session's history if deeper detail is needed.

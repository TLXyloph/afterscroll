# afterscroll — Cloudflare Workers deploy

Runs on Cloudflare Workers via the OpenNext adapter, with D1 (SQLite) as the
database. Local dev is unchanged (`npm run dev` uses better-sqlite3 at
`.data/dev.db`); only production uses D1.

## One-time setup

1. **Cloudflare account** — sign up at https://dash.cloudflare.com. Free tier
   works to start; the Workers Paid plan ($5/mo) lifts request/CPU limits when
   you're ready.

2. **Log in** (run this in the session so auth lands where the tooling can use it):
   ```
   npx wrangler login
   ```

3. **Create the D1 database** and paste the returned `database_id` into
   `wrangler.toml` (replacing `REPLACE_WITH_D1_DATABASE_ID`):
   ```
   npx wrangler d1 create afterscroll
   ```

4. **Create the schema** in D1 (schema.sql is plain SQLite, runs as-is):
   ```
   npx wrangler d1 execute afterscroll --remote --file=./src/lib/schema.sql
   ```

5. **Set secrets** (each prompts for the value — never commit these):
   ```
   npx wrangler secret put X_CLIENT_ID
   npx wrangler secret put X_CLIENT_SECRET
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put AZURE_ANTHROPIC_API_KEY
   npx wrangler secret put AZURE_ANTHROPIC_RESOURCE
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put ADMIN_KEY
   ```

6. **Set `APP_URL`** in `wrangler.toml` `[vars]` to your actual Worker URL
   (`https://afterscroll.afterscroll.workers.dev`) once you know the
   subdomain (visible after the first deploy).

## Deploy

```
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

The Worker URL prints on success.

## After the first deploy

- **OAuth callbacks** — add these to the X and Google developer consoles
  (alongside the localhost ones), using your real Worker URL:
  - X: `https://afterscroll.afterscroll.workers.dev/api/connect/x/callback`
  - Google: `https://afterscroll.afterscroll.workers.dev/api/connect/google/callback`
- **Stripe webhook** — in the Stripe dashboard add an endpoint at
  `https://afterscroll.afterscroll.workers.dev/api/billing/webhook` for events
  `customer.subscription.created|updated|deleted` and
  `checkout.session.completed`; put its signing secret in the
  `STRIPE_WEBHOOK_SECRET` wrangler secret and redeploy.
- **Enforce billing** — flip `BILLING_ENFORCED = "true"` in `wrangler.toml`
  `[vars]` and redeploy when you're ready to require a trial/subscription.
- **Extension** — update `extension/manifest.json` `host_permissions` to include
  your Worker origin (`https://afterscroll.afterscroll.workers.dev/*`) and set that as
  the App URL in the extension options.

## Security follow-ups before real users (from the audit)

- Confirm `ADMIN_KEY` is long/high-entropy (the endpoint rejects keys < 24 chars).
- Encrypt OAuth/device tokens at rest: the audit flagged plaintext token columns
  — before scaling, wrap TOKENS/EXT_TOKENS values with AES-256-GCM using a key
  stored as a wrangler secret. (Deferred; low risk until D1 backups exist.)
- Rotate any credential that was live during the hackathon (X, Google, Stripe,
  Azure/Anthropic) as a precaution, even though none were committed to git.

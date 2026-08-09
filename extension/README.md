# afterscroll for LinkedIn — Chrome Extension

Captures a LinkedIn post the moment you **save** it (overflow menu → "Save",
or the bookmark ribbon) and ships it to your afterscroll app at
`POST {App URL}/api/extension/capture`.

Plain JS / HTML / CSS, Manifest V3, no build step.

## Install (Load unpacked)

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (toggle, top right).
3. Click **Load unpacked** and select this `extension/` directory.
4. The "afterscroll for LinkedIn" card appears. Pin it if you like.

## Get a device token

1. Open the afterscroll app (default `https://afterscroll.vercel.app`, or
   `http://localhost:3000` in dev).
2. Go to **Settings → Extension token** and copy the token.

## Configure

1. On `chrome://extensions`, click **Details** on the extension card, then
   **Extension options** (or right-click the toolbar icon → Options).
2. Set **App URL** (default `https://afterscroll.vercel.app`; use
   `http://localhost:3000` against a local app).
3. Paste the **Device Token** and click **Save**.

## Test

1. On the options page, click **Send test capture**. It POSTs a dummy payload
   with your token — you should see "Test capture accepted — your token
   works." A 401 means the token is wrong or stale; re-copy it from the app.
2. Go to `https://www.linkedin.com/feed/`, open any post's overflow menu
   (the `…` in its top-right corner) and click **Save**.
3. A small toast appears bottom-right: **"Saved to afterscroll ✓"**. On
   failure you'll see "afterscroll: check your extension token" (or a rate
   limit / generic error variant).
4. Debugging: open DevTools on the LinkedIn tab and filter the console for
   `[afterscroll]` — every detection, extraction fallback, and POST result is
   logged there. The service worker's own logs are under
   `chrome://extensions` → the card's **service worker** link.

Notes:

- Saving the **same post again within 5 minutes** is deduped (no POST, no
  toast — a console line explains why).
- Clicking **Unsave** never triggers a capture.

## Maintenance: LinkedIn DOM drift

LinkedIn changes its markup frequently. **All selectors live in the single
`SELECTORS` const block at the top of `content.js`** — post container
candidates, post text candidates, author candidates, URN attributes, and the
save-trigger matching pattern. When capture stops working:

1. Open DevTools on LinkedIn, filter console for `[afterscroll]`.
2. If "Save control clicked" never logs, the save-trigger matching needs
   updating (`saveTextPattern` / `saveControlHints` / `maxClickAncestors`).
3. If it logs "no post container found", inspect a post and add its container
   selector to `SELECTORS.postContainers`.
4. If text/author come back empty, add new candidates to
   `SELECTORS.postText` / `SELECTORS.author`. Fallbacks are tried in order,
   so put the most specific selector first.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest: storage permission, LinkedIn + app host permissions |
| `content.js` | Save-click detection, post extraction, toast feedback (selectors at top) |
| `background.js` | Service worker: dedupe + authenticated POST to the app |
| `options.html` / `options.js` | App URL + Device Token settings, test capture button |
| `icons/` | Placeholder icons (generated, solid color with an "a") |

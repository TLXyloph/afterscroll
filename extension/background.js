// afterscroll service worker — receives captures from the content script
// (and test captures from the options page) and POSTs them to the app.
//
// Contract: POST {baseUrl}/api/extension/capture
//   Headers: Authorization: Bearer <device token>, Content-Type: application/json
//   Body: { text, author, url, source: "linkedin" }
//   200 {ok:true,...} | 401 invalid token | 429 rate limited | 4xx/5xx {error}

'use strict';

const DEFAULT_BASE_URL = 'https://afterscroll.vercel.app';
const CAPTURE_PATH = '/api/extension/capture';
const DEDUPE_WINDOW_MS = 5 * 60 * 1000; // same permalink within 5 min = duplicate
const DEDUPE_KEY = 'recentCaptures';
const FETCH_TIMEOUT_MS = 15000;
const MAX_TEXT_LENGTH = 5000;
const LOG_PREFIX = '[afterscroll:worker]';

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_BASE_URL, deviceToken: '' }, (items) => {
      resolve({
        appUrl: normalizeBaseUrl(items.appUrl),
        deviceToken: (items.deviceToken || '').trim(),
      });
    });
  });
}

function normalizeBaseUrl(url) {
  let base = (url || '').trim();
  if (!base) base = DEFAULT_BASE_URL;
  return base.replace(/\/+$/, '');
}

// ---------------------------------------------------------------------
// Dedupe — chrome.storage.session survives worker restarts within a
// browser session, so a killed worker doesn't forget recent permalinks.
// ---------------------------------------------------------------------

async function isDuplicate(url) {
  if (!url) return false;
  const now = Date.now();
  const store = chrome.storage.session || chrome.storage.local;
  const items = await store.get({ [DEDUPE_KEY]: {} });
  const recent = items[DEDUPE_KEY] || {};

  // Prune expired entries while we're here.
  let pruned = false;
  for (const [key, ts] of Object.entries(recent)) {
    if (now - ts > DEDUPE_WINDOW_MS) {
      delete recent[key];
      pruned = true;
    }
  }

  const duplicate = recent[url] !== undefined && now - recent[url] <= DEDUPE_WINDOW_MS;
  if (!duplicate) recent[url] = now;
  if (!duplicate || pruned) await store.set({ [DEDUPE_KEY]: recent });
  return duplicate;
}

// ---------------------------------------------------------------------
// Capture POST
// ---------------------------------------------------------------------

function sanitizePayload(payload) {
  const p = payload || {};
  return {
    text: String(p.text || '').slice(0, MAX_TEXT_LENGTH),
    author: String(p.author || '').slice(0, 300),
    url: String(p.url || ''),
    source: 'linkedin',
  };
}

async function postCapture(payload, { skipDedupe = false } = {}) {
  const { appUrl, deviceToken } = await getSettings();

  if (!deviceToken) {
    console.warn(LOG_PREFIX, 'No device token configured. Open the extension options page and paste your token.');
    return { ok: false, error: 'no-token', status: 0 };
  }

  const body = sanitizePayload(payload);

  if (!skipDedupe) {
    try {
      if (await isDuplicate(body.url)) {
        console.log(LOG_PREFIX, 'Duplicate skipped:', body.url);
        return { ok: false, deduped: true, status: 0 };
      }
    } catch (e) {
      // Dedupe bookkeeping must never block a capture.
      console.warn(LOG_PREFIX, 'Dedupe check failed, sending anyway:', e && e.message);
    }
  }

  const endpoint = `${appUrl}${CAPTURE_PATH}`;
  console.log(LOG_PREFIX, 'POST', endpoint, { author: body.author, url: body.url, chars: body.text.length });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deviceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch (e) {
      // Non-JSON error page; status code is still meaningful.
    }

    if (response.ok) {
      console.log(LOG_PREFIX, 'Capture stored:', responseBody);
      return { ok: true, status: response.status, body: responseBody };
    }

    console.warn(LOG_PREFIX, `Capture rejected (HTTP ${response.status}):`, responseBody);
    return {
      ok: false,
      status: response.status,
      error: (responseBody && responseBody.error) || `http-${response.status}`,
      body: responseBody,
    };
  } catch (e) {
    const message = e && e.name === 'AbortError'
      ? `timed out after ${FETCH_TIMEOUT_MS / 1000}s`
      : (e && e.message) || 'network error';
    console.warn(LOG_PREFIX, 'Capture POST failed:', message,
      '(is the App URL correct and listed in host_permissions?)');
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------
// Message routing
// ---------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return; // only our own content script
  if (!message || typeof message.type !== 'string') return false;

  if (message.type === 'afterscroll-capture') {
    postCapture(message.payload)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, status: 0, error: (e && e.message) || 'worker error' }));
    return true; // async response
  }

  if (message.type === 'afterscroll-test') {
    // Options-page test button: dummy payload, dedupe skipped so it can be
    // clicked repeatedly while debugging a token.
    postCapture({
      text: 'Test capture from the afterscroll extension options page.',
      author: 'afterscroll extension',
      url: 'https://www.linkedin.com/feed/update/urn:li:activity:0000000000000000000/',
      source: 'linkedin',
    }, { skipDedupe: true })
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, status: 0, error: (e && e.message) || 'worker error' }));
    return true; // async response
  }

  return false;
});

console.log(LOG_PREFIX, 'Service worker ready.');

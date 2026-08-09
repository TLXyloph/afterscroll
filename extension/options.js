// afterscroll options page — stores App URL + Device Token in
// chrome.storage.sync and lets the user fire a test capture.

'use strict';

const DEFAULT_BASE_URL = 'https://afterscroll.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const tokenInput = document.getElementById('deviceToken');
const saveButton = document.getElementById('save');
const testButton = document.getElementById('test');
const statusEl = document.getElementById('status');

function setStatus(message, ok) {
  statusEl.textContent = message;
  statusEl.className = ok === undefined ? '' : (ok ? 'ok' : 'err');
}

function loadSettings() {
  chrome.storage.sync.get({ appUrl: DEFAULT_BASE_URL, deviceToken: '' }, (items) => {
    appUrlInput.value = items.appUrl || DEFAULT_BASE_URL;
    tokenInput.value = items.deviceToken || '';
  });
}

function saveSettings() {
  const appUrl = (appUrlInput.value || '').trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
  const deviceToken = (tokenInput.value || '').trim();

  if (!/^https?:\/\//i.test(appUrl)) {
    setStatus('App URL must start with http:// or https://', false);
    return;
  }

  chrome.storage.sync.set({ appUrl, deviceToken }, () => {
    if (chrome.runtime.lastError) {
      setStatus(`Could not save settings: ${chrome.runtime.lastError.message}`, false);
      return;
    }
    appUrlInput.value = appUrl;
    setStatus(deviceToken
      ? 'Settings saved.'
      : 'Settings saved — but no device token yet. Paste one from the app (Settings → Extension token).',
      Boolean(deviceToken));
  });
}

function sendTestCapture() {
  testButton.disabled = true;
  setStatus('Sending test capture…');

  chrome.runtime.sendMessage({ type: 'afterscroll-test' }, (response) => {
    testButton.disabled = false;

    if (chrome.runtime.lastError) {
      setStatus(`Could not reach service worker: ${chrome.runtime.lastError.message}`, false);
      return;
    }
    if (!response) {
      setStatus('No response from service worker.', false);
      return;
    }
    if (response.ok) {
      setStatus('Test capture accepted — your token works. Now save any post on LinkedIn.', true);
      return;
    }
    if (response.error === 'no-token') {
      setStatus('No device token saved. Paste your token above and click Save first.', false);
    } else if (response.status === 401) {
      setStatus('Token rejected (401). Copy a fresh token from the app: Settings → Extension token.', false);
    } else if (response.status === 429) {
      setStatus('Rate limited (429). Wait a moment and try again.', false);
    } else {
      setStatus(`Test failed: ${response.error || `HTTP ${response.status}`}. ` +
        'Check the App URL and that the app is reachable.', false);
    }
  });
}

saveButton.addEventListener('click', saveSettings);
testButton.addEventListener('click', () => {
  // Persist any freshly pasted token before testing so the worker sees it.
  const appUrl = (appUrlInput.value || '').trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
  const deviceToken = (tokenInput.value || '').trim();
  chrome.storage.sync.set({ appUrl, deviceToken }, sendTestCapture);
});

loadSettings();

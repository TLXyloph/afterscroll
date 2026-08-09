// afterscroll content script — detects "Save" clicks on LinkedIn posts and
// ships the post to the afterscroll app via the extension service worker.
//
// LinkedIn's DOM churns constantly. ALL selectors live in the SELECTORS block
// below — patch there first when capture stops working. Debug by filtering
// the DevTools console for "[afterscroll]".

(() => {
  'use strict';

  // ---------------------------------------------------------------------
  // SELECTORS — the single place to patch when LinkedIn changes its DOM.
  // ---------------------------------------------------------------------
  const SELECTORS = {
    // Post container candidates, tried in order via Element.closest().
    postContainers: [
      '[data-urn^="urn:li:activity"]',
      '.feed-shared-update-v2',
      'div[data-id^="urn:li:activity"]',
    ],
    // Post body text candidates, tried in order inside the container.
    postText: [
      '.update-components-text',
      '.feed-shared-inline-show-more-text',
      '.feed-shared-update-v2__description',
      '[dir="ltr"]',
    ],
    // Author name candidates, tried in order inside the container.
    author: [
      '.update-components-actor__title',
      '.update-components-actor__name',
      '.feed-shared-actor__name',
      '.update-components-actor__container strong',
      '.update-components-actor__container span',
    ],
    // Attributes that may hold the activity URN, on the container or an ancestor.
    urnAttributes: ['data-urn', 'data-id'],
    // Class fragments that suggest a save control (menu item or bookmark ribbon).
    saveControlHints: [
      'save',           // generic
      'ribbon',         // bookmark ribbon variants
    ],
    // "Save" trigger text/aria matching. "Unsave" must NOT match.
    saveTextPattern: /^save(\s+post)?$/i,
    // How many ancestors of the click target to inspect for save semantics.
    maxClickAncestors: 4,
  };

  const LOG_PREFIX = '[afterscroll]';
  const MAX_TEXT_LENGTH = 5000;
  const TOAST_MS = 2500;

  const log = (...args) => console.log(LOG_PREFIX, ...args);
  const warn = (...args) => console.warn(LOG_PREFIX, ...args);

  // -------------------------------------------------------------------
  // Save-click detection
  // -------------------------------------------------------------------

  function normalizeText(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  // True if this single element looks like a "Save" control.
  function isSaveElement(el) {
    if (!el || el.nodeType !== 1) return false;

    const aria = normalizeText(el.getAttribute && el.getAttribute('aria-label'));
    if (aria) {
      if (SELECTORS.saveTextPattern.test(aria)) return true;
      // e.g. "Save post by Jane Doe" / "Save this post" — but never "Unsave..."
      if (/^save\b/i.test(aria) && !/^unsave\b/i.test(aria)) return true;
    }

    // Menu-item semantics: role=menuitem/button whose *primary* text is "Save".
    // LinkedIn overflow menu items pair a headline ("Save") with a sub-line
    // ("Save for later"), so match on the first text-ish chunk, kept short to
    // avoid matching whole posts that merely contain the word "save".
    const text = normalizeText(el.textContent);
    if (text && text.length <= 60) {
      const firstChunk = normalizeText(text.split('\n')[0]);
      if (SELECTORS.saveTextPattern.test(text) || SELECTORS.saveTextPattern.test(firstChunk)) {
        return true;
      }
      // "Save Save for later" style concatenations from headline + subtext.
      if (/^save\b/i.test(text) && /save/i.test(text) && !/^unsave\b/i.test(text)) {
        const role = el.getAttribute && el.getAttribute('role');
        const cls = (el.className && String(el.className)) || '';
        const hinted = SELECTORS.saveControlHints.some((h) => cls.toLowerCase().includes(h));
        if (role === 'menuitem' || role === 'button' || hinted || el.tagName === 'BUTTON') {
          return true;
        }
      }
    }
    return false;
  }

  // Walk from the click target up ~4 levels looking for save semantics.
  function findSaveTrigger(target) {
    let el = target;
    for (let depth = 0; el && depth <= SELECTORS.maxClickAncestors; depth += 1) {
      try {
        if (isSaveElement(el)) return el;
      } catch (e) {
        // Never let detection break the page.
      }
      el = el.parentElement;
    }
    return null;
  }

  // -------------------------------------------------------------------
  // Post extraction
  // -------------------------------------------------------------------

  function findPostContainer(fromEl) {
    for (const sel of SELECTORS.postContainers) {
      try {
        const container = fromEl.closest(sel);
        if (container) return container;
      } catch (e) {
        // Bad selector on this Chrome version — try the next one.
      }
    }
    return null;
  }

  function extractPostText(container) {
    for (const sel of SELECTORS.postText) {
      try {
        const el = container.querySelector(sel);
        const text = el && normalizeText(el.innerText || el.textContent);
        if (text) return text.slice(0, MAX_TEXT_LENGTH);
      } catch (e) {
        // keep trying fallbacks
      }
    }
    return '';
  }

  function extractAuthor(container) {
    for (const sel of SELECTORS.author) {
      try {
        const el = container.querySelector(sel);
        if (!el) continue;
        // LinkedIn frequently duplicates the name in a visually-hidden span;
        // prefer the aria-hidden copy, else de-dupe "Jane Doe Jane Doe".
        const visible = el.querySelector('span[aria-hidden="true"]');
        let name = normalizeText((visible || el).innerText || (visible || el).textContent);
        if (!name) continue;
        const half = name.slice(0, Math.floor(name.length / 2)).trim();
        if (half && name === `${half} ${half}`) name = half;
        return name.slice(0, 300);
      } catch (e) {
        // keep trying fallbacks
      }
    }
    return '';
  }

  function extractPermalink(container) {
    // Look for an activity URN on the container itself or any ancestor.
    let el = container;
    while (el && el.nodeType === 1) {
      for (const attr of SELECTORS.urnAttributes) {
        const value = el.getAttribute && el.getAttribute(attr);
        const match = value && value.match(/urn:li:activity:(\d+)/);
        if (match) {
          return `https://www.linkedin.com/feed/update/urn:li:activity:${match[1]}/`;
        }
      }
      el = el.parentElement;
    }
    // Fallback: single-post pages carry the URN in the address bar.
    const urlMatch = window.location.href.match(/urn:li:activity:(\d+)/);
    if (urlMatch) {
      return `https://www.linkedin.com/feed/update/urn:li:activity:${urlMatch[1]}/`;
    }
    return '';
  }

  // -------------------------------------------------------------------
  // Toast feedback
  // -------------------------------------------------------------------

  function showToast(message, isError) {
    try {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.setAttribute('role', 'status');
      toast.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'right:24px',
        'z-index:2147483647',
        'max-width:320px',
        'padding:10px 16px',
        'border-radius:8px',
        'font:600 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        'color:#fff',
        `background:${isError ? '#b3261e' : '#1f6f43'}`,
        'box-shadow:0 4px 12px rgba(0,0,0,.25)',
        'opacity:0',
        'transition:opacity .2s ease',
        'pointer-events:none',
      ].join(';');
      document.documentElement.appendChild(toast);
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
      }, TOAST_MS);
    } catch (e) {
      // Toast is best-effort only.
    }
  }

  // -------------------------------------------------------------------
  // Capture pipeline
  // -------------------------------------------------------------------

  function capturePost(saveTrigger) {
    const container = findPostContainer(saveTrigger);
    if (!container) {
      warn('Save click detected, but no post container found. ' +
        'LinkedIn DOM may have changed — check SELECTORS.postContainers in content.js.');
      return;
    }

    const payload = {
      text: extractPostText(container),
      author: extractAuthor(container),
      url: extractPermalink(container),
      source: 'linkedin',
    };

    if (!payload.url) {
      warn('Could not derive a permalink (no urn:li:activity found on container, ' +
        'ancestors, or page URL). Falling back to the current page URL — dedupe may be unreliable.');
      payload.url = window.location.href;
    }
    if (!payload.text) {
      warn('No post text extracted — check SELECTORS.postText in content.js. Sending anyway.');
    }

    log('Capturing saved post:', { author: payload.author, url: payload.url, chars: payload.text.length });

    let responded = false;
    try {
      chrome.runtime.sendMessage({ type: 'afterscroll-capture', payload }, (response) => {
        responded = true;
        if (chrome.runtime.lastError) {
          warn('Could not reach service worker:', chrome.runtime.lastError.message,
            '(the extension may have been reloaded — refresh this tab)');
          return;
        }
        handleCaptureResponse(response);
      });
    } catch (e) {
      warn('sendMessage failed (extension context likely invalidated — refresh this tab):', e && e.message);
      return;
    }

    // If the worker never answers (killed mid-flight), say so in the console.
    setTimeout(() => {
      if (!responded) warn('No response from service worker after 30s.');
    }, 30000);
  }

  function handleCaptureResponse(response) {
    if (!response) {
      warn('Empty response from service worker.');
      return;
    }
    if (response.deduped) {
      log('Duplicate capture skipped (same permalink within 5 minutes).');
      return;
    }
    if (response.ok) {
      log('Capture stored.', response.body || '');
      showToast('Saved to afterscroll ✓', false);
      return;
    }
    warn('Capture failed:', response.status || '', response.error || '', response.body || '');
    if (response.status === 401 || response.error === 'no-token') {
      showToast('afterscroll: check your extension token', true);
    } else if (response.status === 429) {
      showToast('afterscroll: rate limited, try again shortly', true);
    } else {
      showToast('afterscroll: capture failed (see console)', true);
    }
  }

  // -------------------------------------------------------------------
  // Wire-up: document-level click listener, capture phase, never throws.
  // -------------------------------------------------------------------

  document.addEventListener('click', (event) => {
    try {
      const trigger = findSaveTrigger(event.target);
      if (!trigger) return;
      log('Save control clicked:', trigger.tagName,
        normalizeText(trigger.getAttribute('aria-label') || trigger.textContent).slice(0, 60));
      capturePost(trigger);
    } catch (e) {
      warn('Unexpected error in click handler:', e && e.message);
    }
  }, true);

  log('Content script active. Save any post to capture it.');
})();

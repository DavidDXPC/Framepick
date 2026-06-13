// FramePick — FramePick Studio bridge content script.
//
// Injected only on candidate studio origins (workers.dev / localhost); it
// activates only when the page declares <meta name="framepick-studio">.
// Two delivery paths:
//   - live:   background → 'nframe-deliver' → window.postMessage into the app
//   - queued: handoffs sent while no studio tab was open are pulled from the
//             background once the app announces it is ready.

(() => {
  if (window !== window.top) return;
  if (!document.querySelector('meta[name="framepick-studio"]')) return;

  function deliver(payload) {
    window.postMessage({ source: 'framepick', type: 'handoff', payload }, window.location.origin);
  }

  function pullPending() {
    try {
      chrome.runtime.sendMessage({ type: 'nframe-pull' }, (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) return;
        (res.items || []).forEach(deliver);
      });
    } catch { /* extension context gone */ }
  }

  // Live deliveries from the background while this tab is open.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'nframe-deliver') {
      deliver(msg.payload);
      sendResponse({ ok: true });
    } else if (msg.type === 'nframe-ping') {
      sendResponse({ ok: true, studio: true });
    }
  });

  // The app posts 'studio-ready' once its listener is installed (and replies
  // to our hello if it mounted first) — only then is pulling safe.
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (d && d.source === 'framepick-studio' && d.type === 'ready') pullPending();
  });
  window.postMessage({ source: 'framepick-bridge', type: 'hello' }, window.location.origin);
})();

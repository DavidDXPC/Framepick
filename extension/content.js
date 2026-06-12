// FramePick — content script
// Picker mode: hover-highlight images/videos/GIFs, click to capture, anchored
// result panel with the generated prompt. All UI lives in a shadow root.

(() => {
  if (window.__framepickLoaded) return;
  window.__framepickLoaded = true;

  const ACCENT = '#2f6bff';
  let pickerOn = false;
  let host = null;        // shadow host <div>
  let root = null;        // shadow root
  let hoverBox = null;    // hover outline overlay
  let hoverTag = null;    // hover label
  let dimEl = null;       // page dim backdrop
  let panel = null;       // result panel
  let toastEl = null;
  let toastTimer = 0;
  let lastCapture = null; // payload of the last pick, for Regenerate / Force STILL
  let motionResult = null;// last rendered motion {frames, duration, data} — for "back to MOTION"
  let derivedStill = null;// when a STILL was forced from a motion frame {frameIndex, dataUrl}
  let panelSize = { w: 0, h: 0 }; // user-resized panel size, remembered per session
  let busy = false;

  // ---------- shadow UI scaffold ----------

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .fp-hover {
      position: fixed; pointer-events: none; z-index: 2147483646;
      border: 2.5px solid ${ACCENT}; border-radius: 8px; display: none;
      box-shadow: 0 0 0 4px rgba(10,132,255,.20), 0 8px 32px rgba(0,0,0,.25);
    }
    .fp-tag {
      position: fixed; pointer-events: none; z-index: 2147483647; display: none;
      background: rgba(28,28,30,.92);
      -webkit-backdrop-filter: blur(20px) saturate(1.8); backdrop-filter: blur(20px) saturate(1.8);
      color: #f5f5f7; font: 600 11px/20px -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      padding: 1px 10px; border-radius: 999px; white-space: nowrap;
      border: 0.5px solid rgba(255,255,255,.16);
      box-shadow: 0 4px 16px rgba(0,0,0,.4);
    }
    .fp-tag b { color: #64b5ff; font-weight: 700; }
    .fp-dim {
      position: fixed; inset: 0; z-index: 2147483645;
      background: rgba(0,0,0,.42); display: none;
    }
    .fp-toast {
      position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
      pointer-events: none; z-index: 2147483647;
      background: rgba(28,28,30,.92);
      -webkit-backdrop-filter: blur(20px) saturate(1.8); backdrop-filter: blur(20px) saturate(1.8);
      color: #f5f5f7; font: 500 12.5px/1.4 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      padding: 9px 18px; border-radius: 999px; border: 0.5px solid rgba(255,255,255,.16);
      box-shadow: 0 12px 32px rgba(0,0,0,.45); display: none;
      max-width: 90vw; text-align: center;
    }
    .fp-panel {
      position: fixed; z-index: 2147483647;
      width: 780px; height: 620px;
      min-width: 340px; min-height: 320px;
      max-width: 96vw; max-height: 94vh;
      background: rgba(28,28,30,.94); color: #f5f5f7;
      -webkit-backdrop-filter: blur(50px) saturate(1.9); backdrop-filter: blur(50px) saturate(1.9);
      border: 0.5px solid rgba(255,255,255,.16);
      border-radius: 16px;
      box-shadow: 0 32px 90px rgba(0,0,0,.55), inset 0 0.5px 0 rgba(255,255,255,.14);
      font: 13px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      overflow: hidden; display: flex; flex-direction: column;
    }
    .fp-resize {
      position: absolute; right: 0; bottom: 0; width: 18px; height: 18px;
      cursor: nwse-resize; z-index: 3; touch-action: none;
      background:
        linear-gradient(135deg, transparent 0 48%, rgba(255,255,255,.35) 48% 56%, transparent 56% 70%, rgba(255,255,255,.35) 70% 78%, transparent 78%);
      border-bottom-right-radius: 16px;
    }
    .fp-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 14px; border-bottom: 0.5px solid rgba(255,255,255,.1); flex: 0 0 auto;
      font-weight: 600; font-size: 13.5px; letter-spacing: -0.01em;
      cursor: move; user-select: none; -webkit-user-select: none; touch-action: none;
    }
    .fp-head .fp-x { cursor: pointer; }
    .fp-x {
      cursor: pointer; border: 0; width: 24px; height: 24px; border-radius: 50%;
      background: rgba(255,255,255,.08); color: rgba(235,235,245,.7);
      font: 12px/1 -apple-system, system-ui, sans-serif; padding: 0;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .fp-x:hover { background: rgba(255,255,255,.16); color: #fff; }
    .fp-body { padding: 14px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
    .fp-body::-webkit-scrollbar { width: 9px; }
    .fp-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 999px; border: 2.5px solid transparent; background-clip: content-box; }
    .fp-back {
      cursor: pointer; border: 0.5px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); color: #f5f5f7;
      font: 600 12px/1 -apple-system, system-ui, sans-serif; padding: 6px 12px; border-radius: 999px;
      display: inline-flex; align-items: center; gap: 5px; margin-bottom: 10px;
    }
    .fp-back:hover { background: rgba(255,255,255,.14); }
    .fp-chip {
      display: inline-block; font: 600 10px/17px -apple-system, system-ui, sans-serif; letter-spacing: .07em;
      padding: 1px 9px; border-radius: 999px; vertical-align: middle;
    }
    .fp-chip.still  { background: rgba(255,255,255,.16); color: #f5f5f7; }
    .fp-chip.motion { background: ${ACCENT}; color: #fff; }
    .fp-meta { color: rgba(235,235,245,.55); font-size: 11.5px; margin-left: 8px; font-variant-numeric: tabular-nums; }
    .fp-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .fp-thumb {
      width: 92px; height: 60px; object-fit: cover; border-radius: 8px;
      border: 0.5px solid rgba(255,255,255,.12); background: #101013; flex: 0 0 auto;
    }
    .fp-herowrap { position: relative; margin-bottom: 8px; }
    .fp-herowrap::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 46px;
      background: linear-gradient(to top, rgba(0,0,0,.55), transparent);
      border-radius: 0 0 12px 12px; pointer-events: none;
    }
    .fp-hero {
      width: 100%; border-radius: 12px; border: 0.5px solid rgba(255,255,255,.12);
      background: #101013; display: block;
      max-height: 300px; object-fit: contain;
      box-shadow: 0 6px 24px rgba(0,0,0,.3);
    }
    .fp-herowrap .fp-hero { margin-bottom: 0; }
    img.fp-hero { margin-bottom: 6px; }
    .fp-time {
      position: absolute; top: 10px; right: 10px; z-index: 2;
      background: rgba(28,28,30,.78); border: 0.5px solid rgba(255,255,255,.14);
      border-radius: 999px; padding: 2px 9px;
      font: 600 10px/16px -apple-system, system-ui, sans-serif;
      color: #f5f5f7; font-variant-numeric: tabular-nums;
    }
    .fp-tl { position: absolute; left: 16px; right: 16px; bottom: 10px; height: 20px; z-index: 2; }
    .fp-tl .track {
      position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);
      height: 3px; border-radius: 2px; background: rgba(255,255,255,.35);
      box-shadow: 0 1px 5px rgba(0,0,0,.5);
    }
    .fp-tl .dot {
      position: absolute; top: 50%; transform: translate(-50%,-50%);
      width: 10px; height: 10px; border-radius: 50%; cursor: pointer;
      background: rgba(255,255,255,.85); box-shadow: 0 1px 4px rgba(0,0,0,.45);
      transition: transform .12s ease;
    }
    .fp-tl .dot:hover { transform: translate(-50%,-50%) scale(1.25); }
    .fp-tl .dot.on {
      width: 14px; height: 14px; background: ${ACCENT};
      box-shadow: 0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,.45);
    }
    .fp-strip { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
    .fp-strip .fr { position: relative; cursor: pointer; flex: 0 0 auto; }
    .fp-strip img {
      width: 52px; height: 34px; object-fit: cover; display: block;
      border-radius: 6px; border: 0.5px solid rgba(255,255,255,.12);
    }
    .fp-strip .fr.sel img { outline: 2px solid ${ACCENT}; outline-offset: 1.5px; }
    .fp-strip .fr span {
      display: block; font-size: 9px; color: rgba(235,235,245,.5); text-align: center; margin-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .fp-strip .fr .ph {
      width: 52px; height: 34px; border: 1px dashed rgba(255,255,255,.22); border-radius: 6px;
    }
    .fp-strip .fr .dl {
      position: absolute; top: 2px; right: 2px; display: none;
      cursor: pointer; border: 0; border-radius: 5px; padding: 0 3px;
      background: rgba(10,10,14,.75); color: #fff; font: 12px/18px -apple-system, system-ui, sans-serif;
    }
    .fp-strip .fr:hover .dl { display: block; }
    .fp-strip .fr .dl:hover { background: ${ACCENT}; }
    .fp-pop {
      position: fixed; z-index: 2147483647;
      background: rgba(40,40,44,.96);
      -webkit-backdrop-filter: blur(30px) saturate(1.8); backdrop-filter: blur(30px) saturate(1.8);
      border: 0.5px solid rgba(255,255,255,.14); border-radius: 12px; padding: 4px;
      box-shadow: 0 16px 48px rgba(0,0,0,.5); min-width: 172px;
    }
    .fp-pop button {
      display: block; width: 100%; text-align: left; cursor: pointer;
      border: 0; background: none; color: #f5f5f7; border-radius: 8px;
      font: 500 12px/1.2 -apple-system, system-ui, sans-serif; padding: 7px 10px; white-space: nowrap;
    }
    .fp-pop button:hover { background: ${ACCENT}; color: #fff; }
    .fp-pop hr { border: 0; border-top: 0.5px solid rgba(255,255,255,.12); margin: 4px 2px; }
    .fp-dd {
      margin-left: auto; cursor: pointer;
      border: 0.5px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); color: #f5f5f7;
      font: 600 12px/1 -apple-system, system-ui, sans-serif; padding: 6px 12px; border-radius: 999px;
      display: inline-flex; align-items: center; gap: 7px; font-variant-numeric: tabular-nums;
      transition: background .12s ease;
    }
    .fp-dd:hover { background: rgba(255,255,255,.14); }
    .fp-dd .chev { font-size: 9px; color: rgba(235,235,245,.6); }
    .fp-pop button { min-width: 120px; }
    .fp-step { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; font-size: 11px; color: rgba(235,235,245,.55); }
    .fp-step .st {
      cursor: pointer; border: 0.5px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); color: #f5f5f7;
      font: 600 11px/1 -apple-system, system-ui, sans-serif; width: 21px; height: 21px; border-radius: 999px; padding: 0;
    }
    .fp-step .st:hover { background: rgba(255,255,255,.16); }
    .fp-step .st:disabled { opacity: .35; cursor: default; }
    .fp-step b { color: #f5f5f7; font-size: 13px; min-width: 14px; text-align: center; font-variant-numeric: tabular-nums; }
    .fp-updating { opacity: .45; pointer-events: none; }
    .fp-spin {
      display: inline-block; width: 13px; height: 13px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.18); border-top-color: ${ACCENT};
      animation: fpspin .8s linear infinite; vertical-align: -2px; margin-right: 7px;
    }
    @keyframes fpspin { to { transform: rotate(360deg); } }
    .fp-wait { color: rgba(235,235,245,.7); font-size: 12.5px; padding: 6px 0; }
    .fp-mono {
      background: rgba(0,0,0,.32); border: 0.5px solid rgba(255,255,255,.1); border-radius: 12px;
      padding: 11px 13px; font: 12px/1.55 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      color: rgba(235,235,245,.85); white-space: pre-wrap; word-break: break-word;
      user-select: text; -webkit-user-select: text; cursor: text; max-height: 220px; overflow-y: auto;
    }
    .fp-token {
      display: inline-block; background: rgba(10,132,255,.22); color: #64b5ff;
      border: 0.5px solid rgba(10,132,255,.45); border-radius: 5px;
      font-weight: 700; padding: 0 4px; margin: 0 1px;
    }
    .fp-sec {
      margin: 4px 0 10px; padding: 2px 12px;
      background: rgba(255,255,255,.045); border: 0.5px solid rgba(255,255,255,.08);
      border-radius: 12px;
    }
    .fp-sec .sr {
      display: grid; grid-template-columns: 118px 1fr 22px; gap: 8px;
      align-items: start; padding: 7px 0; border-bottom: 0.5px solid rgba(255,255,255,.07);
      font-size: 11.5px;
    }
    .fp-sec .sr:last-child { border-bottom: 0; }
    .fp-sec .k { font-weight: 600; letter-spacing: .05em; font-size: 10px; color: rgba(235,235,245,.55); padding-top: 1px; }
    .fp-sec .v { color: rgba(235,235,245,.88); user-select: text; -webkit-user-select: text; }
    .fp-sec .c {
      cursor: pointer; border: 0; background: none; color: rgba(235,235,245,.4);
      font-size: 12px; padding: 0 2px; border-radius: 5px;
    }
    .fp-sec .c:hover { color: #fff; background: rgba(255,255,255,.12); }
    .fp-label {
      font: 600 10px/1 -apple-system, system-ui, sans-serif; letter-spacing: .07em;
      text-transform: uppercase; color: rgba(235,235,245,.55); margin: 12px 0 6px;
    }
    .fp-label-row { display: flex; align-items: center; justify-content: space-between; margin: 12px 0 6px; }
    .fp-label-row .fp-label { margin: 0; }
    .fp-seg {
      display: inline-flex; gap: 2px; padding: 2px;
      background: rgba(120,120,128,.22); border: 0.5px solid rgba(255,255,255,.06);
      border-radius: 999px;
    }
    .fp-seg .sg {
      cursor: pointer; border: 0; background: transparent; color: rgba(235,235,245,.65);
      font: 600 11px/1 -apple-system, system-ui, sans-serif; padding: 4px 11px; border-radius: 999px;
      transition: background .12s ease, color .12s ease;
    }
    .fp-seg .sg.on {
      background: #5a5a5e; color: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.3), inset 0 0.5px 0 rgba(255,255,255,.18);
    }
    .fp-actions { display: flex; gap: 8px; margin-top: 12px; align-items: center; flex-wrap: wrap; }
    .fp-btn {
      cursor: pointer; border: 0.5px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); color: #f5f5f7;
      font: 600 12.5px/1 -apple-system, system-ui, sans-serif; padding: 8px 15px; border-radius: 999px;
      transition: background .12s ease, filter .12s ease;
    }
    .fp-btn:hover { background: rgba(255,255,255,.14); }
    .fp-btn.primary {
      background: ${ACCENT}; border-color: transparent; color: #fff;
      box-shadow: 0 2px 10px rgba(10,132,255,.35);
    }
    .fp-btn.primary:hover { filter: brightness(1.1); background: ${ACCENT}; }
    .fp-btn:disabled { opacity: .5; cursor: default; }
    .fp-err { color: #ff6961; font-size: 12px; padding: 4px 0; user-select: text; -webkit-user-select: text; }
    .fp-link { color: #64b5ff; cursor: pointer; text-decoration: underline; }
  `;

  function ensureUI() {
    if (host) return;
    host = document.createElement('div');
    host.id = '__framepick-host';
    root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    hoverBox = el('div', 'fp-hover');
    hoverTag = el('div', 'fp-tag');
    dimEl = el('div', 'fp-dim');
    toastEl = el('div', 'fp-toast');
    dimEl.addEventListener('click', closePanel);
    root.append(dimEl, hoverBox, hoverTag, toastEl);
    document.documentElement.appendChild(host);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- picker arm / disarm ----------

  function setPicker(on) {
    if (on === pickerOn) return;
    pickerOn = on;
    ensureUI();
    if (on) {
      document.documentElement.style.setProperty('cursor', 'crosshair', 'important');
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('pointerdown', swallow, true);
      document.addEventListener('mousedown', swallow, true);
      document.addEventListener('mouseup', swallow, true);
      if (window === window.top) {
        toast('Picker on — click any image / video / GIF · Esc exits');
      }
    } else {
      document.documentElement.style.removeProperty('cursor');
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerdown', swallow, true);
      document.removeEventListener('mousedown', swallow, true);
      document.removeEventListener('mouseup', swallow, true);
      hideHover();
      if (window === window.top) toast('Picker off', 1200);
    }
    chrome.runtime.sendMessage({ type: 'set-badge', on }).catch(() => {});
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (panel) { closePanel(); e.stopPropagation(); }
    else if (pickerOn) { setPicker(false); e.stopPropagation(); }
  }, true);

  function toast(text, ms = 2600) {
    ensureUI();
    toastEl.textContent = text;
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, ms);
  }

  // ---------- hover ----------

  let raf = 0;
  function onMove(e) {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const t = mediaAt(e.clientX, e.clientY);
      if (t) showHover(t);
      else hideHover();
    });
  }

  function mediaAt(x, y) {
    for (const n of document.elementsFromPoint(x, y)) {
      if (n === host) return null; // our own UI (panel/dim) is on top here
      if (n instanceof HTMLVideoElement) return n;
      if (n instanceof HTMLImageElement && n.naturalWidth > 0) {
        const r = n.getBoundingClientRect();
        if (r.width >= 40 && r.height >= 40) return n;
      }
    }
    return null;
  }

  function isGif(img) {
    const src = img.currentSrc || img.src || '';
    return /\.gif($|\?|#)/i.test(src) || src.startsWith('data:image/gif');
  }

  // src → true/false once sniffed; 'pending' while in flight. URL extensions
  // lie (CDNs serve GIFs without .gif), so the background sniffs real bytes.
  const animCache = new Map();

  function sniffInBackground(img) {
    const src = img.currentSrc || img.src || '';
    if (!/^https?:/i.test(src) || animCache.has(src)) return;
    animCache.set(src, 'pending');
    sendBg({ type: 'sniff-media', url: src }).then((r) => {
      animCache.set(src, r.ok ? !!r.animated : false);
    });
  }

  function isAnimatedImg(img) {
    if (isGif(img)) return true;
    return animCache.get(img.currentSrc || img.src || '') === true;
  }

  function modeOf(elm) {
    if (elm instanceof HTMLVideoElement) return 'MOTION';
    return isAnimatedImg(elm) ? 'MOTION' : 'STILL';
  }

  function fmtTime(s) {
    if (!isFinite(s)) return 'live';
    const m = Math.floor(s / 60), r = Math.round(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function showHover(t) {
    const r = t.getBoundingClientRect();
    Object.assign(hoverBox.style, {
      display: 'block', left: `${r.left - 3}px`, top: `${r.top - 3}px`,
      width: `${r.width + 6}px`, height: `${r.height + 6}px`,
    });
    const mode = modeOf(t);
    let desc;
    if (t instanceof HTMLVideoElement) desc = `video · ${fmtTime(t.duration)}`;
    else if (isGif(t)) desc = 'GIF';
    else if (isAnimatedImg(t)) desc = 'animated img';
    else { sniffInBackground(t); desc = `img · ${t.naturalWidth} × ${t.naturalHeight}`; }
    hoverTag.innerHTML = '';
    hoverTag.append(desc + ' → ');
    const b = document.createElement('b');
    b.textContent = mode;
    hoverTag.appendChild(b);
    Object.assign(hoverTag.style, {
      display: 'block',
      left: `${Math.max(4, r.left + 4)}px`,
      top: `${Math.max(4, r.top - 22)}px`,
    });
  }

  function hideHover() {
    hoverBox.style.display = 'none';
    hoverTag.style.display = 'none';
  }

  function swallow(e) {
    if (mediaAt(e.clientX, e.clientY)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }

  // ---------- click → capture → generate ----------

  function onClick(e) {
    const t = mediaAt(e.clientX, e.clientY);
    if (!t) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (busy) return;
    pick(t).catch((err) => showError(err.message || String(err), t.getBoundingClientRect()));
  }

  async function pick(target) {
    busy = true;
    hideHover();
    const rect = target.getBoundingClientRect();
    try {
      let mode = modeOf(target);
      // Authoritative check before treating an image as STILL — CDNs serve
      // GIFs/animated WebP from URLs without an extension, so sniff the bytes.
      if (mode === 'STILL' && target instanceof HTMLImageElement) {
        const src = target.currentSrc || target.src || '';
        if (/^https?:/i.test(src) && animCache.get(src) !== false) {
          const r = await sendBg({ type: 'sniff-media', url: src });
          animCache.set(src, r.ok ? !!r.animated : false);
          if (animCache.get(src) === true) mode = 'MOTION';
        }
      }
      if (mode === 'STILL') await pickStill(target, rect);
      else await pickMotion(target, rect);
    } finally {
      busy = false;
    }
  }

  function sendBg(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
        else resolve(res || { ok: false, error: 'No response' });
      });
    });
  }

  // ----- STILL -----

  async function pickStill(img, rect) {
    openPanel(rect, 'STILL');
    derivedStill = null;
    motionResult = null;
    setWait('capturing image…');
    const dataUrl = await captureImage(img, rect);
    lastCapture = { kind: 'still', dataUrl, rect };
    setWait('generating…', thumbHtml(dataUrl));
    const res = await sendBg({ type: 'generate-still', dataUrl });
    if (!res.ok) return showApiError(res.error);
    renderStill(dataUrl, res.prompt, res.heroPrompt);
    addHistory('STILL', dataUrl, res.prompt);
  }

  async function captureImage(img, rect) {
    const src = img.currentSrc || img.src;
    // 1. data: URLs — process directly
    if (src.startsWith('data:')) {
      const r = await sendBg({ type: 'process-dataurl', dataUrl: src });
      if (r.ok) return r.dataUrl;
    }
    // 2. http(s) — background fetch bypasses page CORS
    if (/^https?:/i.test(src)) {
      const r = await sendBg({ type: 'fetch-image', url: src });
      if (r.ok) return r.dataUrl;
    }
    // 3. canvas draw (works for same-origin / blob:)
    try {
      const cv = document.createElement('canvas');
      const k = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight));
      cv.width = Math.max(1, Math.round(img.naturalWidth * k));
      cv.height = Math.max(1, Math.round(img.naturalHeight * k));
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.85); // throws if tainted
    } catch { /* tainted — fall through */ }
    // 4. last resort: visible-tab capture cropped to the element
    return captureElementFromTab(rect);
  }

  // ----- MOTION -----

  const clampFrames = (n) => Math.min(10, Math.max(1, n));
  const FRAME_CHOICES = [1, 2, 4, 6, 8, 10];

  async function pickMotion(target, rect) {
    const settings = (await sendBg({ type: 'get-settings' })).settings || {};
    const n = clampFrames(settings.frameCount || 8);
    openPanel(rect, 'MOTION');
    await runMotion(target, rect, n);
  }

  // Sample n frames, generate, render. Shared by first pick and the in-panel
  // frame-count stepper.
  async function runMotion(target, rect, n) {
    derivedStill = null;
    const { frames, duration, usedLiveCapture } = await sampleMotion(target, rect, n);
    const selected = Math.floor(frames.length / 2);
    lastCapture = { kind: 'motion', target, frames, duration, rect, selected };
    setWait(usedLiveCapture ? 'frames captured from the live tab — generating…' : 'generating…', stripHtml(frames, n));
    const res = await sendBg({ type: 'generate-motion', frames, duration });
    if (!res.ok) return showApiError(res.error);
    motionResult = { frames, duration, data: res.data };
    renderMotion(frames, duration, res.data);
    addHistory('MOTION', frames[selected].dataUrl, res.data.video_prompt, res.data, frames.length);
  }

  async function sampleMotion(target, rect, n) {
    let frames = null;
    let duration = 0;
    let usedLiveCapture = false;

    if (target instanceof HTMLVideoElement) {
      duration = isFinite(target.duration) ? target.duration : 0;
      setWait(`sampling frame 1 / ${n}…`);
      frames = await sampleVideoByClone(target, n, (i, fr) => {
        setWait(`sampling frame ${i} / ${n}…`, stripHtml(fr, n));
      }).catch(() => null);
    } else {
      // GIF / animated image: decode the actual file frames — deterministic,
      // always starts at frame 0 of the loop, and near-instant.
      setWait('decoding animation…');
      const decoded = await sampleAnimatedByDecode(target, n, (i, fr) => {
        setWait(`decoding frame ${i} / ${n}…`, stripHtml(fr, n));
      }).catch(() => null);
      if (decoded) { frames = decoded.frames; duration = decoded.duration; }
    }
    if (!frames) {
      // CORS-tainted video, MSE/streaming video, or an undecodable animation:
      // capture the visible tab while it plays, cropped to the element.
      usedLiveCapture = true;
      if (window !== window.top) throw new Error('This media sits inside a frame FramePick can’t capture — open it in its own tab and try again.');
      setWait(`capturing frame 1 / ${n}…`);
      frames = await liveCaptureFrames(target, n, rect);
      if (target instanceof HTMLVideoElement && isFinite(target.duration)) duration = target.duration;
      else duration = frames.length ? frames[frames.length - 1].t : 0;
    }
    if (!frames || !frames.length) throw new Error('Could not sample any frames from this media.');
    return { frames, duration, usedLiveCapture };
  }

  // Decode an animated image (GIF / APNG / animated WebP) with ImageDecoder
  // and sample n frames evenly across the loop, starting at frame 0.
  async function sampleAnimatedByDecode(img, n, onProgress) {
    if (typeof ImageDecoder === 'undefined') throw new Error('no ImageDecoder');
    const src = img.currentSrc || img.src || '';
    let dataUrl, mediaType;
    if (src.startsWith('data:')) {
      dataUrl = src;
      mediaType = (src.match(/^data:([^;,]+)/) || [])[1] || 'image/gif';
    } else if (/^https?:/i.test(src)) {
      const r = await sendBg({ type: 'fetch-bytes', url: src });
      if (!r.ok) throw new Error(r.error);
      dataUrl = r.dataUrl;
      mediaType = r.mediaType;
    } else {
      throw new Error('unsupported source');
    }
    if (!(await ImageDecoder.isTypeSupported(mediaType))) throw new Error('type unsupported');
    const buf = await (await fetch(dataUrl)).arrayBuffer();
    const dec = new ImageDecoder({ data: buf, type: mediaType });
    try {
      await dec.tracks.ready;
      const count = dec.tracks.selectedTrack?.frameCount || 0;
      if (count < 2) throw new Error('not animated');
      // clip duration from the final frame's end time
      const last = await dec.decode({ frameIndex: count - 1, completeFramesOnly: true });
      const duration = ((last.image.timestamp || 0) + (last.image.duration || 0)) / 1e6;
      last.image.close();
      const frames = [];
      let cv = null, ctx = null;
      for (let i = 0; i < n; i++) {
        const idx = Math.min(count - 1, Math.floor((i * count) / n));
        const { image } = await dec.decode({ frameIndex: idx, completeFramesOnly: true });
        if (!cv) {
          const k = Math.min(1, 768 / Math.max(image.displayWidth, image.displayHeight));
          cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(image.displayWidth * k));
          cv.height = Math.max(1, Math.round(image.displayHeight * k));
          ctx = cv.getContext('2d');
        }
        ctx.drawImage(image, 0, 0, cv.width, cv.height);
        const t = (image.timestamp || 0) / 1e6;
        image.close();
        frames.push({ t, dataUrl: cv.toDataURL('image/jpeg', 0.82) });
        onProgress?.(i + 1, frames);
      }
      return { frames, duration: duration || (frames.length ? frames[frames.length - 1].t : 0) };
    } finally {
      try { dec.close(); } catch {}
    }
  }

  // Live-capture fallback for animated images: restart the loop from frame 0
  // by swapping in a fresh blob of the same file. Returns a restore function.
  async function restartAnimatedImg(img) {
    const src = img.currentSrc || img.src || '';
    const oldSrc = img.getAttribute('src');
    const oldSrcset = img.getAttribute('srcset');
    try {
      let blobUrl = null;
      if (/^https?:/i.test(src)) {
        const r = await sendBg({ type: 'fetch-bytes', url: src });
        if (r.ok) blobUrl = URL.createObjectURL(await (await fetch(r.dataUrl)).blob());
      }
      if (oldSrcset != null) img.removeAttribute('srcset');
      img.src = blobUrl || src; // a fresh resource restarts the animation at 0
      await new Promise((resolve) => {
        const done = () => { img.removeEventListener('load', done); resolve(); };
        img.addEventListener('load', done);
        setTimeout(done, 3000);
      });
      return () => {
        if (oldSrcset != null) img.setAttribute('srcset', oldSrcset);
        if (oldSrc != null) img.setAttribute('src', oldSrc);
        else img.removeAttribute('src');
        if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      };
    } catch {
      return () => {};
    }
  }

  // In-panel stepper: resample the same element with a new frame count.
  async function resampleMotion(n) {
    if (!lastCapture || lastCapture.kind !== 'motion' || busy) return;
    const target = lastCapture.target;
    if (!target || !target.isConnected) {
      toast('The original media is no longer on the page — pick it again', 3200);
      return;
    }
    busy = true;
    try {
      chrome.storage.local.set({ frameCount: n }); // remember as the new default
      const rect = target.getBoundingClientRect();
      await runMotion(target, rect, n);
    } catch (e) {
      showError(e.message || String(e), lastCapture.rect);
    } finally {
      busy = false;
    }
  }

  function once(target, event, timeoutMs) {
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => { cleanup(); reject(new Error(`Timed out waiting for ${event}`)); }, timeoutMs);
      const okFn = () => { cleanup(); resolve(); };
      const errFn = () => { cleanup(); reject(new Error('Media failed to load')); };
      const cleanup = () => {
        clearTimeout(to);
        target.removeEventListener(event, okFn);
        target.removeEventListener('error', errFn);
      };
      target.addEventListener(event, okFn);
      target.addEventListener('error', errFn);
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Clone the video element and seek through it offscreen. Rejects when the
  // source can't be cloned (MSE blob:) or the canvas is CORS-tainted.
  async function sampleVideoByClone(video, n, onProgress) {
    const src = video.currentSrc || video.src;
    if (!src || src.startsWith('blob:')) throw new Error('MSE source');
    const tryWith = async (cors) => {
      const v = document.createElement('video');
      if (cors) v.crossOrigin = 'anonymous';
      v.muted = true;
      v.preload = 'auto';
      v.src = src;
      await once(v, 'loadedmetadata', 8000);
      const duration = v.duration;
      if (!isFinite(duration) || duration <= 0) throw new Error('No duration');
      const k = Math.min(1, 768 / Math.max(v.videoWidth, v.videoHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(v.videoWidth * k));
      cv.height = Math.max(1, Math.round(v.videoHeight * k));
      const ctx = cv.getContext('2d');
      const frames = [];
      for (let i = 0; i < n; i++) {
        const t = Math.min(duration * i / n, Math.max(0, duration - 0.05));
        v.currentTime = t;
        await once(v, 'seeked', 6000);
        ctx.drawImage(v, 0, 0, cv.width, cv.height);
        const dataUrl = cv.toDataURL('image/jpeg', 0.82); // throws on taint
        frames.push({ t, dataUrl });
        onProgress(i + 1, frames);
      }
      v.removeAttribute('src');
      v.load();
      return frames;
    };
    try {
      return await tryWith(true); // CORS-clean if the server allows it
    } catch {
      return await tryWith(false); // same-origin sources work without CORS
    }
  }

  const nextPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // Keep the panel visible during tab capture: hide only the page dim and
  // transient overlays (they'd contaminate the shot), and move the panel
  // beside the media if it overlaps. Hiding it is the absolute last resort.
  function prepareForCapture(getRect) {
    const dimWas = dimEl.style.display;
    dimEl.style.display = 'none';
    hideHover();
    toastEl.style.display = 'none';
    let saved = null;
    if (panel) {
      const overlaps = () => {
        const pr = panel.getBoundingClientRect();
        const mr = getRect();
        return !(pr.right < mr.left || pr.left > mr.right || pr.bottom < mr.top || pr.top > mr.bottom);
      };
      if (overlaps()) {
        saved = { left: panel.style.left, top: panel.style.top, vis: panel.style.visibility };
        positionPanel(getRect()); // try to sit beside the media
        if (overlaps()) panel.style.visibility = 'hidden'; // truly no room
      }
    }
    return () => {
      dimEl.style.display = dimWas || 'block';
      if (panel && saved) {
        panel.style.left = saved.left;
        panel.style.top = saved.top;
        panel.style.visibility = saved.vis || '';
      }
    };
  }

  // Fallback tab-capture sampling, cropped to the element's rect.
  // Seekable videos: pause → seek to each exact timestamp → capture, so the
  // first frame is truly t = 0.0s and every label is exact (capture latency
  // can't skew anything — the video is parked while the shot is taken).
  // GIFs / live streams: restart from the top, then capture on a clock.
  async function liveCaptureFrames(target, n, rect) {
    const isVideo = target instanceof HTMLVideoElement;
    const seekable = isVideo && isFinite(target.duration) && target.duration > 0 &&
      target.seekable && target.seekable.length > 0;
    const MIN_GAP = 520; // captureVisibleTab quota ≈ 2/sec
    const frames = [];
    let restore = null;
    let restoreImg = null;

    const unhide = prepareForCapture(() => target.getBoundingClientRect());
    try {
      if (seekable) {
        restore = { t: target.currentTime, paused: target.paused, muted: target.muted };
        target.muted = true;
        target.pause();
        let lastShot = 0;
        for (let i = 0; i < n; i++) {
          const t = Math.min(target.duration * i / n, Math.max(0, target.duration - 0.05));
          try {
            target.currentTime = t;
            await once(target, 'seeked', 5000);
          } catch { /* capture whatever is showing */ }
          await nextPaint();
          const wait = lastShot + MIN_GAP - performance.now();
          if (wait > 0) await sleep(wait);
          lastShot = performance.now();
          const r = await sendBg({ type: 'capture-visible' });
          if (r.ok) {
            const cropped = await cropCapture(r.dataUrl, target.getBoundingClientRect());
            if (cropped) frames.push({ t, dataUrl: cropped });
          }
          setWait(`capturing frame ${i + 1} / ${n}…`, stripHtml(frames, n));
        }
      } else {
        // GIF, or a live/unseekable stream: capture on a clock while it plays
        if (isVideo) {
          restore = { t: target.currentTime, paused: target.paused, muted: target.muted };
          target.muted = true;
          try { target.currentTime = 0; } catch {}
          await target.play().catch(() => {});
        } else if (target instanceof HTMLImageElement) {
          // restart the GIF loop so captures begin at the start, not mid-loop
          restoreImg = await restartAnimatedImg(target);
        }
        const dur = isVideo && isFinite(target.duration) ? target.duration : n * 0.55;
        const interval = Math.max(MIN_GAP, (dur / n) * 1000);
        const t0 = performance.now();
        for (let i = 0; i < n; i++) {
          const r = await sendBg({ type: 'capture-visible' });
          if (r.ok) {
            const cropped = await cropCapture(r.dataUrl, target.getBoundingClientRect());
            if (cropped) frames.push({ t: (performance.now() - t0) / 1000, dataUrl: cropped });
          }
          setWait(`capturing frame ${i + 1} / ${n}…`, stripHtml(frames, n));
          if (i < n - 1) await sleep(interval);
        }
      }
    } finally {
      unhide();
      if (isVideo && restore) {
        try { target.currentTime = restore.t; } catch {}
        if (restore.paused) target.pause();
        else target.play().catch(() => {});
        target.muted = restore.muted;
      }
      restoreImg?.();
    }
    return frames;
  }

  async function cropCapture(captureDataUrl, rect) {
    const img = new Image();
    img.src = captureDataUrl;
    await img.decode();
    const scale = img.naturalWidth / window.innerWidth;
    // clamp to the visible viewport
    const x = Math.max(0, rect.left), y = Math.max(0, rect.top);
    const w = Math.min(rect.right, window.innerWidth) - x;
    const h = Math.min(rect.bottom, window.innerHeight) - y;
    if (w < 10 || h < 10) return null;
    const k = Math.min(1, 768 / Math.max(w * scale, h * scale));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * scale * k));
    cv.height = Math.max(1, Math.round(h * scale * k));
    cv.getContext('2d').drawImage(img, x * scale, y * scale, w * scale, h * scale, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.82);
  }

  async function captureElementFromTab(rect) {
    if (window !== window.top) throw new Error('This image sits inside a frame FramePick can’t capture — open it in its own tab and try again.');
    const unhide = prepareForCapture(() => rect);
    try {
      await nextPaint();
      const r = await sendBg({ type: 'capture-visible' });
      if (!r.ok) throw new Error(r.error || 'Tab capture failed');
      const cropped = await cropCapture(r.dataUrl, rect);
      if (!cropped) throw new Error('Element is not visible enough to capture');
      return cropped;
    } finally {
      unhide();
    }
  }

  // ---------- panel ----------

  function openPanel(rect, mode) {
    closePanel();
    ensureUI();
    dimEl.style.display = 'block';
    panel = el('div', 'fp-panel');
    const head = el('div', 'fp-head');
    const title = el('span', null, 'FramePick');
    const x = el('button', 'fp-x', '✕');
    x.addEventListener('click', closePanel);
    head.append(title, x);
    const body = el('div', 'fp-body');
    body.dataset.mode = mode;
    const resize = el('div', 'fp-resize');
    panel.append(head, body, resize);
    root.appendChild(panel);
    // restore the user's last panel size
    if (panelSize.w) { panel.style.width = `${panelSize.w}px`; panel.style.height = `${panelSize.h}px`; }
    positionPanel(rect);

    // resize from the bottom-right corner
    resize.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      resize.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY;
      const w0 = panel.offsetWidth, h0 = panel.offsetHeight;
      const move = (ev) => {
        if (!panel) return;
        const w = Math.max(320, Math.min(window.innerWidth * 0.96, w0 + ev.clientX - sx));
        const h = Math.max(320, Math.min(window.innerHeight * 0.94, h0 + ev.clientY - sy));
        panel.style.width = `${w}px`;
        panel.style.height = `${h}px`;
        panelSize = { w, h };
      };
      const up = (ev) => {
        try { resize.releasePointerCapture(ev.pointerId); } catch {}
        resize.removeEventListener('pointermove', move);
        resize.removeEventListener('pointerup', up);
        resize.removeEventListener('pointercancel', up);
      };
      resize.addEventListener('pointermove', move);
      resize.addEventListener('pointerup', up);
      resize.addEventListener('pointercancel', up);
    });

    // drag the panel by its header
    head.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.fp-x')) return;
      e.preventDefault();
      head.setPointerCapture(e.pointerId);
      const sx = e.clientX - (parseFloat(panel.style.left) || 0);
      const sy = e.clientY - (parseFloat(panel.style.top) || 0);
      const move = (ev) => {
        if (!panel) return;
        const left = Math.min(window.innerWidth - 60, Math.max(60 - panel.offsetWidth, ev.clientX - sx));
        const top = Math.min(window.innerHeight - 40, Math.max(0, ev.clientY - sy));
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
      };
      const up = (ev) => {
        try { head.releasePointerCapture(ev.pointerId); } catch {}
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        head.removeEventListener('pointercancel', up);
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
      head.addEventListener('pointercancel', up);
    });
  }

  function positionPanel(rect) {
    const M = 12;
    const W = panel.offsetWidth || 780, H = panel.offsetHeight || 600;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left;
    if (rect.right + M + W <= vw) left = rect.right + M;            // right of element
    else if (rect.left - M - W >= 0) left = rect.left - M - W;      // left of element
    else left = Math.max(M, Math.min(vw - W - M, rect.left));       // overlap, clamped
    let top = Math.max(M, Math.min(rect.top, vh - H - M));
    panel.style.left = `${Math.max(M, left)}px`;
    panel.style.top = `${Math.max(M, top)}px`;
  }

  function closePanel() {
    closePop();
    if (panel) { panel.remove(); panel = null; }
    if (dimEl) dimEl.style.display = 'none';
  }

  function body() { return panel?.querySelector('.fp-body'); }

  function setWait(text, extraHtml = '') {
    const b = body();
    if (!b) return;
    const mode = b.dataset.mode;
    b.innerHTML = `
      <div class="fp-row">
        <span class="fp-chip ${mode.toLowerCase()}">${mode}</span>
      </div>
      ${extraHtml}
      <div class="fp-wait"><span class="fp-spin"></span>${escapeHtml(text)}</div>`;
  }

  function thumbHtml(dataUrl) {
    return `<img class="fp-hero" src="${dataUrl}" alt="">`;
  }

  function stripHtml(frames, n, withDl = false) {
    let cells = frames.map((f, i) =>
      `<div class="fr" data-i="${i}"><img src="${f.dataUrl}" alt="">${withDl ? '<button class="dl" title="Download this frame">⤓</button>' : ''}<span>${f.t.toFixed(1)}s</span></div>`).join('');
    for (let i = frames.length; i < n; i++) {
      cells += `<div class="fr"><div class="ph"></div><span>·</span></div>`;
    }
    return `<div class="fp-strip">${cells}</div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function wordCount(s) { return (s.trim().match(/\S+/g) || []).length; }

  function showError(message, rect) {
    if (!panel && rect) openPanel(rect, 'STILL');
    const b = body();
    if (!b) { toast(`FramePick: ${message}`, 4000); return; }
    b.innerHTML = `<div class="fp-err">${escapeHtml(message)}</div>`;
  }

  function showApiError(message) {
    const b = body();
    if (!b) return;
    if (message === 'NO_KEY') {
      b.innerHTML = `<div class="fp-err">No API key set. <span class="fp-link">Open Options</span> and paste your Anthropic API key.</div>`;
      b.querySelector('.fp-link').addEventListener('click', () => sendBg({ type: 'open-options' }));
    } else {
      b.innerHTML = `<div class="fp-err">${escapeHtml(message)}</div>
        <div class="fp-actions"><button class="fp-btn" data-act="retry">↻ Retry</button></div>`;
      b.querySelector('[data-act=retry]').addEventListener('click', regenerate);
    }
  }

  function copyBtnFlash(btn, label = 'Copied ✓') {
    const orig = btn.textContent;
    btn.textContent = label;
    setTimeout(() => { btn.textContent = orig; }, 1300);
  }

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (btn) copyBtnFlash(btn);
  }

  function renderStill(dataUrl, prompt, heroPrompt) {
    const b = body();
    if (!b) return;
    b.dataset.mode = 'STILL';
    const fromMotion = !!derivedStill;
    const hasHero = !!heroPrompt;
    let promptMode = hasHero ? 'hero' : 'clip';
    b.innerHTML = `
      ${fromMotion ? '<button class="fp-back" data-act="back" title="Back to the MOTION breakdown">‹ back to MOTION</button>' : ''}
      <div class="fp-row">
        <img class="fp-thumb" src="${dataUrl}" alt="">
        <div>
          <span class="fp-chip still">STILL</span>${fromMotion ? '<span class="fp-meta">from frame ' + (derivedStill.frameIndex + 1) + '</span>' : ''}<br>
          <span class="fp-meta" data-words></span>
        </div>
        ${hasHero ? `<span class="fp-seg" style="margin-left:auto" title="@hero keeps the composition, lighting and grade — the subject becomes the @hero token, which nFrame resolves to its Hero slot">
          <button class="sg${promptMode === 'clip' ? ' on' : ''}" data-p="clip">Clip</button>
          <button class="sg${promptMode === 'hero' ? ' on' : ''}" data-p="hero">@hero</button>
        </span>` : ''}
      </div>
      <div class="fp-mono" data-prompt></div>
      <div class="fp-actions">
        <button class="fp-btn" data-act="copy">Copy</button>
        <button class="fp-btn" data-act="regen" title="Regenerate">↻</button>
        <span style="flex:1"></span>
        <button class="fp-btn primary" data-act="usecomp" title="Send to nFrame as this shot's COMPOSITION reference — only the layout is used; your Hero stays the subject">Use as Composition →</button>
      </div>`;
    const promptEl = b.querySelector('[data-prompt]');
    const wordsEl = b.querySelector('[data-words]');
    const activePrompt = () => (promptMode === 'hero' && hasHero ? heroPrompt : prompt);
    const renderPrompt = () => {
      promptEl.innerHTML = escapeHtml(activePrompt()).replace(/@hero/g, '<span class="fp-token">@hero</span>');
      wordsEl.textContent = `FLUX.2 prompt · ${wordCount(activePrompt())} words`;
    };
    renderPrompt();
    b.querySelectorAll('.fp-seg .sg').forEach((sg) =>
      sg.addEventListener('click', () => {
        promptMode = sg.dataset.p;
        b.querySelectorAll('.fp-seg .sg').forEach((x) => x.classList.toggle('on', x === sg));
        renderPrompt();
      }));
    b.querySelector('[data-act=copy]').addEventListener('click', (e) => copyText(activePrompt(), e.currentTarget));
    b.querySelector('[data-act=regen]').addEventListener('click', regenerate);
    b.querySelector('[data-act=back]')?.addEventListener('click', backToMotion);
    b.querySelector('[data-act=usecomp]').addEventListener('click', (e) => sendComposition(dataUrl, prompt, heroPrompt, e.currentTarget));
  }

  function backToMotion() {
    if (!motionResult) return;
    derivedStill = null;
    const b = body();
    if (b) b.dataset.mode = 'MOTION';
    renderMotion(motionResult.frames, motionResult.duration, motionResult.data);
  }

  function renderMotion(frames, duration, data) {
    const b = body();
    if (!b) return;
    b.dataset.mode = 'MOTION';
    derivedStill = null;
    if (lastCapture && lastCapture.kind === 'motion' &&
        (lastCapture.selected == null || lastCapture.selected >= frames.length)) {
      lastCapture.selected = Math.floor(frames.length / 2);
    }
    const heroIdx = lastCapture?.selected ?? Math.floor(frames.length / 2);
    const rows = [
      ['SHOT', data.shot], ['COMPOSITION', data.composition],
      ['CAMERA MOVEMENT', data.camera_movement], ['SCENE ACTION', data.scene_action],
      ['EVOLUTION', data.evolution], ['LIGHT & GRADE', data.light_and_grade],
    ];
    const hasHero = !!data.hero_video_prompt;
    let promptMode = hasHero ? 'hero' : 'clip';
    const dotPos = (f, i) =>
      duration > 0 ? Math.min(100, (f.t / duration) * 100) : frames.length > 1 ? (i / (frames.length - 1)) * 100 : 50;
    b.innerHTML = `
      <div class="fp-row" style="margin-bottom:8px">
        <span class="fp-chip motion">MOTION</span>
        <span class="fp-meta">${frames.length} frame${frames.length === 1 ? '' : 's'} · 0–${duration.toFixed(1)}s</span>
        <button class="fp-dd" data-act="frames" title="Frames sampled per video / GIF — pick a count and the clip resamples on the spot">${frames.length} frame${frames.length === 1 ? '' : 's'} <span class="chev">▾</span></button>
      </div>
      <div class="fp-herowrap">
        <img class="fp-hero" src="${frames[heroIdx].dataUrl}" alt="">
        <span class="fp-time">${frames[heroIdx].t.toFixed(1)}s</span>
        <div class="fp-tl"><div class="track"></div>${frames.map((f, i) =>
          `<span class="dot${i === heroIdx ? ' on' : ''}" data-i="${i}" title="${f.t.toFixed(1)}s" style="left:${dotPos(f, i)}%"></span>`).join('')}</div>
      </div>
      ${stripHtml(frames, frames.length, true)}
      <div class="fp-sec">${rows.map(([k, v]) => `
        <div class="sr"><span class="k">${k}</span><span class="v">${escapeHtml(v)}</span>
        <button class="c" title="Copy ${k.toLowerCase()}" data-copy="${escapeHtml(v)}">⧉</button></div>`).join('')}
      </div>
      <div class="fp-label-row">
        <span class="fp-label">VIDEO PROMPT</span>
        ${hasHero ? `<span class="fp-seg" title="@hero keeps the shot, composition, camera and grade — the subject becomes the @hero token, which nFrame resolves to its Hero slot">
          <button class="sg${promptMode === 'clip' ? ' on' : ''}" data-p="clip">Clip</button>
          <button class="sg${promptMode === 'hero' ? ' on' : ''}" data-p="hero">@hero</button>
        </span>` : ''}
      </div>
      <div class="fp-mono" data-prompt></div>
      <div class="fp-actions">
        <button class="fp-btn" data-act="copy">Copy prompt</button>
        <button class="fp-btn" data-act="regen" title="Regenerate">↻</button>
        <span style="flex:1"></span>
        <button class="fp-btn" data-act="still" title="Generate a FLUX.2 STILL prompt from the selected frame instead">force STILL</button>
        <button class="fp-btn primary" data-act="nframe" title="Send keyframes, breakdown and the @hero video prompt to nFrame — keyframes guide motion & layout only; the Hero slot stays the subject">Use in nFrame →</button>
      </div>`;
    const heroEl = b.querySelector('.fp-hero');
    const timeEl = b.querySelector('.fp-time');
    const promptEl = b.querySelector('[data-prompt]');
    const activePrompt = () => (promptMode === 'hero' && hasHero ? data.hero_video_prompt : data.video_prompt);
    const renderPrompt = () => {
      promptEl.innerHTML = escapeHtml(activePrompt()).replace(/@hero/g, '<span class="fp-token">@hero</span>');
    };
    renderPrompt();
    b.querySelectorAll('.fp-seg .sg').forEach((sg) =>
      sg.addEventListener('click', () => {
        promptMode = sg.dataset.p;
        b.querySelectorAll('.fp-seg .sg').forEach((x) => x.classList.toggle('on', x === sg));
        renderPrompt();
      }));
    // one selection model shared by the hero timeline dots and the film strip
    const selectFrame = (i) => {
      heroEl.src = frames[i].dataUrl;
      if (timeEl) timeEl.textContent = `${frames[i].t.toFixed(1)}s`;
      b.querySelectorAll('.fp-strip .fr').forEach((x) => x.classList.remove('sel'));
      b.querySelector(`.fp-strip .fr[data-i="${i}"]`)?.classList.add('sel');
      b.querySelectorAll('.fp-tl .dot').forEach((d) => d.classList.toggle('on', Number(d.dataset.i) === i));
      if (lastCapture && lastCapture.kind === 'motion') lastCapture.selected = i;
    };
    // frame-count dropdown: pick a count, the clip resamples on the spot
    b.querySelector('[data-act=frames]').addEventListener('click', (e) => {
      e.stopPropagation();
      openFramesMenu(e.currentTarget, frames.length);
    });
    // timeline dots + strip: click = inspect/select (no API call); ⤓ = downloads
    b.querySelectorAll('.fp-tl .dot').forEach((d) => d.addEventListener('click', () => selectFrame(Number(d.dataset.i))));
    b.querySelectorAll('.fp-strip .fr[data-i]').forEach((fr) => {
      const i = Number(fr.dataset.i);
      if (i === heroIdx) fr.classList.add('sel');
      fr.querySelector('.dl')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openDownloadMenu(e.currentTarget, frames, i);
      });
      fr.addEventListener('click', () => selectFrame(i));
    });
    b.querySelectorAll('[data-copy]').forEach((btn) =>
      btn.addEventListener('click', (e) => copyText(btn.dataset.copy, null) && copyBtnFlash(e.currentTarget, '✓')));
    b.querySelector('[data-act=copy]').addEventListener('click', (e) => copyText(activePrompt(), e.currentTarget));
    b.querySelector('[data-act=regen]').addEventListener('click', regenerate);
    b.querySelector('[data-act=still]').addEventListener('click', forceStill);
    b.querySelector('[data-act=nframe]').addEventListener('click', (e) => sendMotionToNFrame(frames, duration, data, e.currentTarget));
  }

  // ---------- nFrame Studio handoff ----------
  // Compositions ship at 1024px, keyframes at 512px — plenty for layout /
  // motion guidance while keeping the studio's local storage light.

  async function downscaleForHandoff(dataUrl, maxEdge) {
    try {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const k = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      if (k >= 1) return dataUrl;
      const cv = mkCanvas(Math.max(1, Math.round(img.naturalWidth * k)), Math.max(1, Math.round(img.naturalHeight * k)));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.8);
    } catch {
      return dataUrl;
    }
  }

  function sendFeedback(btn, res, idleLabel) {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = res.ok ? (res.opened ? 'Opening nFrame ✓' : 'Sent to nFrame ✓') : 'Failed — retry';
    setTimeout(() => { btn.textContent = idleLabel; }, 2400);
  }

  async function sendComposition(dataUrl, prompt, heroPrompt, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    const image = await downscaleForHandoff(dataUrl, 1024);
    const res = await sendBg({
      type: 'nframe-send',
      payload: { kind: 'composition', image, prompt, heroPrompt: heroPrompt || '', sourceUrl: location.href.slice(0, 300), ts: Date.now() },
    });
    sendFeedback(btn, res, 'Use as Composition →');
    if (res.ok) toast(res.opened ? 'Opening nFrame Studio — composition queued for the Inbox' : 'Composition sent to nFrame — your Hero stays the subject', 3000);
    else toast(`Couldn't reach nFrame: ${res.error || 'unknown error'}`, 3600);
  }

  async function sendMotionToNFrame(frames, duration, data, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    const small = await Promise.all(frames.map(async (f) => ({ t: f.t, src: await downscaleForHandoff(f.dataUrl, 512) })));
    const res = await sendBg({
      type: 'nframe-send',
      payload: {
        kind: 'motion',
        frames: small,
        duration,
        breakdown: {
          shot: data.shot, composition: data.composition, camera_movement: data.camera_movement,
          scene_action: data.scene_action, evolution: data.evolution, light_and_grade: data.light_and_grade,
        },
        videoPrompt: data.video_prompt,
        heroPrompt: data.hero_video_prompt || '',
        sourceUrl: location.href.slice(0, 300),
        ts: Date.now(),
      },
    });
    sendFeedback(btn, res, 'Use in nFrame →');
    if (res.ok) toast(res.opened ? 'Opening nFrame Studio — motion structure queued for the Inbox' : 'Motion structure sent to nFrame — @hero resolves to its Hero slot', 3200);
    else toast(`Couldn't reach nFrame: ${res.error || 'unknown error'}`, 3600);
  }

  // ---------- frame downloads (original / sketch storyboard) ----------

  let pop = null;

  function closePop() {
    if (pop) { pop.remove(); pop = null; }
    document.removeEventListener('pointerdown', closePop);
  }

  // Frame-count dropdown menu (1 / 2 / 4 / 6 / 8 / 10).
  function openFramesMenu(anchor, current) {
    closePop();
    pop = el('div', 'fp-pop');
    pop.addEventListener('pointerdown', (e) => e.stopPropagation());
    for (const n of FRAME_CHOICES) {
      const btn = el('button', null, '');
      btn.innerHTML = `${n} frame${n === 1 ? '' : 's'}${n === current ? ' <span style="float:right;color:#0a84ff">✓</span>' : ''}`;
      btn.addEventListener('click', () => {
        closePop();
        if (n !== current) resampleMotion(n);
      });
      pop.appendChild(btn);
    }
    root.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8))}px`;
    pop.style.top = `${Math.min(r.bottom + 4, window.innerHeight - pop.offsetHeight - 8)}px`;
    setTimeout(() => document.addEventListener('pointerdown', closePop), 0);
  }

  function openDownloadMenu(anchor, frames, i) {
    closePop();
    pop = el('div', 'fp-pop');
    pop.addEventListener('pointerdown', (e) => e.stopPropagation());
    const items = [
      [`Frame ${i + 1} · original`, () => downloadFrame(frames[i], i, 'original')],
      [`Frame ${i + 1} · black & white`, () => downloadFrame(frames[i], i, 'bw')],
      null,
      ['All frames · original', () => downloadAll(frames, 'original')],
      ['All frames · black & white', () => downloadAll(frames, 'bw')],
    ];
    for (const it of items) {
      if (!it) { pop.appendChild(el('hr')); continue; }
      const btn = el('button', null, it[0]);
      btn.addEventListener('click', () => { closePop(); it[1](); });
      pop.appendChild(btn);
    }
    root.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8))}px`;
    pop.style.top = `${Math.min(r.bottom + 4, window.innerHeight - pop.offsetHeight - 8)}px`;
    setTimeout(() => document.addEventListener('pointerdown', closePop), 0);
  }

  async function downloadFrame(frame, i, style) {
    const stamp = `${frame.t.toFixed(1)}s`.replace('.', '_');
    const bw = style === 'bw';
    const url = bw ? await bwify(frame.dataUrl) : frame.dataUrl;
    const a = document.createElement('a');
    a.href = url;
    a.download = `framepick-frame${i + 1}-${stamp}${bw ? '-bw' : ''}.jpg`;
    a.click();
  }

  // The original frame, converted to black & white.
  async function bwify(dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const cv = mkCanvas(img.naturalWidth, img.naturalHeight);
    const c = cv.getContext('2d');
    c.filter = 'grayscale(1)';
    c.drawImage(img, 0, 0);
    return cv.toDataURL('image/jpeg', 0.92);
  }

  async function downloadAll(frames, style) {
    for (let i = 0; i < frames.length; i++) {
      await downloadFrame(frames[i], i, style);
      await sleep(250); // let the browser's multiple-downloads prompt keep up
    }
  }

  const mkCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };

  async function regenerate() {
    if (!lastCapture || busy) return;
    busy = true;
    try {
      // a STILL forced out of a motion frame regenerates that frame's still
      if (derivedStill) {
        setWait('generating…', thumbHtml(derivedStill.dataUrl));
        const res = await sendBg({ type: 'generate-still', dataUrl: derivedStill.dataUrl });
        if (!res.ok) return showApiError(res.error);
        renderStill(derivedStill.dataUrl, res.prompt, res.heroPrompt);
        addHistory('STILL', derivedStill.dataUrl, res.prompt);
      } else if (lastCapture.kind === 'still') {
        setWait('generating…', thumbHtml(lastCapture.dataUrl));
        const res = await sendBg({ type: 'generate-still', dataUrl: lastCapture.dataUrl });
        if (!res.ok) return showApiError(res.error);
        renderStill(lastCapture.dataUrl, res.prompt, res.heroPrompt);
        addHistory('STILL', lastCapture.dataUrl, res.prompt);
      } else {
        setWait('generating…', stripHtml(lastCapture.frames, lastCapture.frames.length));
        const res = await sendBg({ type: 'generate-motion', frames: lastCapture.frames, duration: lastCapture.duration });
        if (!res.ok) return showApiError(res.error);
        motionResult = { frames: lastCapture.frames, duration: lastCapture.duration, data: res.data };
        renderMotion(lastCapture.frames, lastCapture.duration, res.data);
        const sel = lastCapture.selected ?? Math.floor(lastCapture.frames.length / 2);
        addHistory('MOTION', lastCapture.frames[sel].dataUrl, res.data.video_prompt, res.data, lastCapture.frames.length);
      }
    } finally {
      busy = false;
    }
  }

  // Generate a STILL prompt from the currently selected motion frame, keeping
  // the motion result around so "back to MOTION" can restore it instantly.
  async function forceStill() {
    if (!lastCapture || lastCapture.kind !== 'motion' || busy) return;
    busy = true;
    try {
      const idx = lastCapture.selected ?? Math.floor(lastCapture.frames.length / 2);
      const frame = lastCapture.frames[idx];
      derivedStill = { frameIndex: idx, dataUrl: frame.dataUrl };
      const b = body();
      if (b) b.dataset.mode = 'STILL';
      setWait('generating…', thumbHtml(frame.dataUrl));
      const res = await sendBg({ type: 'generate-still', dataUrl: frame.dataUrl });
      if (!res.ok) { derivedStill = null; return showApiError(res.error); }
      renderStill(frame.dataUrl, res.prompt, res.heroPrompt);
      addHistory('STILL', frame.dataUrl, res.prompt);
    } finally {
      busy = false;
    }
  }

  // ---------- history ----------

  async function addHistory(mode, sourceDataUrl, prompt, breakdown = null, frameCount = 0) {
    // tiny thumbnail to keep storage small
    let thumb = sourceDataUrl;
    try {
      const img = new Image();
      img.src = sourceDataUrl;
      await img.decode();
      const k = 96 / Math.max(img.naturalWidth, img.naturalHeight);
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.naturalWidth * k));
      cv.height = Math.max(1, Math.round(img.naturalHeight * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      thumb = cv.toDataURL('image/jpeg', 0.7);
    } catch { /* keep full thumb */ }
    sendBg({
      type: 'history-add',
      item: { mode, thumb, prompt, breakdown, frameCount, url: location.href.slice(0, 200) },
    });
  }

  // ---------- messages from popup / background ----------

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'set-picker':
        setPicker(!!msg.on);
        sendResponse({ ok: true, on: pickerOn });
        break;
      case 'toggle-picker':
        setPicker(!pickerOn);
        sendResponse({ ok: true, on: pickerOn });
        break;
      case 'get-picker':
        sendResponse({ ok: true, on: pickerOn });
        break;
    }
  });
})();

// FramePick — background service worker
// Image processing (fetch/downscale via OffscreenCanvas), Claude / OpenAI API
// calls, history storage, badge state, keyboard command.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULTS = {
  provider: 'anthropic',
  apiKey: '',                 // Anthropic key
  model: 'claude-opus-4-8',
  openaiKey: '',              // OpenAI key
  openaiModel: 'gpt-4o',
  frameCount: 8,
  // nFrame Studio — where "Use in nFrame" handoffs are delivered
  studioUrl: 'https://framepick.comprido-david.workers.dev',
};
const HISTORY_MAX = 20;

const STILL_SYSTEM = `You are FramePick, a tool that turns a reference image into a single image-generation prompt for FLUX.2.

Given one image, write exactly one FLUX.2-ready prompt that would recreate its look and content:
- One paragraph, 100–160 words, present tense, no line breaks.
- Concrete visual language only: subject and action, composition and framing, lens/perspective feel, lighting (direction, quality, color temperature), color grade and palette, mood, materials and surface texture, background and depth of field, any notable style (photographic, illustration, 3D, etc.).
- Do not mention that this is a prompt, do not address the user, no preamble, no quotes, no markdown. Output the prompt text only.`;

const MOTION_SYSTEM = `You are FramePick, a tool that analyzes a short video clip from frames sampled evenly across its duration (in chronological order, each labeled with its timestamp).

Analyze the motion across the frames — not just one frame — and produce a structured breakdown:
- shot: shot type and subject (e.g. "medium close-up of a runner, handheld feel").
- composition: framing, balance, foreground/background layering, where the eye goes.
- camera_movement: Infer how the CAMERA moves across the clip by comparing the frames in order. Read the cues carefully: subjects growing larger / the frame closing in = push-in or dolly-in (or zoom-in); subjects shrinking = pull-out / dolly-out; the whole scene sliding horizontally = pan or truck (left/right); sliding vertically = tilt or pedestal (up/down); the viewpoint circling a subject = orbit / arc; jitter and micro-reframing = handheld; smooth rising/falling = crane/jib; foreground and background shifting at different rates = parallax from a moving camera. Name the movement using standard cinematography terms — pan left/right, tilt up/down, dolly/push-in, dolly/pull-out, truck, pedestal, zoom in/out, tracking/following, orbit/arc, crane, handheld, whip pan, rack focus. Combine terms when several apply (e.g. "slow push-in with a slight pan left"). Only answer "static / locked-off" when the framing genuinely does not change between frames; do NOT default to static — most clips have at least subtle movement, so look hard before concluding it is locked off.
- scene_action: what happens in the scene over time, in order.
- evolution: how the image changes start → end (light, position, energy, framing).
- light_and_grade: lighting setup, color grade, palette, contrast, mood.
- video_prompt: one paste-ready paragraph (90–150 words, present tense) for a text-to-video model (Veo / Runway / Kling style), combining all of the above into a single fluent description of the clip including camera movement and how the shot evolves. No preamble, no markdown.
- hero_video_prompt: the same video_prompt rewritten so the clip's main subject is replaced everywhere by the literal token @hero — keep the shot type, composition, camera movement, scene action, evolution and grade identical. Refer to the subject only as @hero (e.g. "@hero crosses frame left to right"); never describe the original subject's identity, species, clothing or appearance.

Each field is plain text, 1–3 sentences except video_prompt and hero_video_prompt.`;

const MOTION_SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      shot: { type: 'string' },
      composition: { type: 'string' },
      camera_movement: { type: 'string' },
      scene_action: { type: 'string' },
      evolution: { type: 'string' },
      light_and_grade: { type: 'string' },
      video_prompt: { type: 'string' },
      hero_video_prompt: { type: 'string' },
    },
    required: ['shot', 'composition', 'camera_movement', 'scene_action', 'evolution', 'light_and_grade', 'video_prompt', 'hero_video_prompt'],
    additionalProperties: false,
  },
};

// ---------- settings ----------

async function getSettings() {
  const stored = await chrome.storage.local.get(
    ['provider', 'apiKey', 'model', 'openaiKey', 'openaiModel', 'frameCount', 'studioUrl']);
  return { ...DEFAULTS, ...stored };
}

// ---------- image helpers ----------

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Failed to read image data'));
    fr.readAsDataURL(blob);
  });
}

// Decode → downscale to maxEdge → JPEG data URL. White matte under transparency.
async function toJpegDataUrl(blob, maxEdge) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  const cv = new OffscreenCanvas(w, h);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const out = await cv.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  return blobToDataUrl(out);
}

// Short-lived byte cache: hover-sniff warms it, so the click-time capture and
// GIF decode reuse the same download instead of re-fetching.
const byteCache = new Map(); // url -> { dataUrl, mediaType, animated, ts }
const CACHE_TTL = 90_000;
const CACHE_MAX = 16;

async function getBytes(url) {
  const hit = byteCache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
  const blob = await res.blob();
  const entry = {
    dataUrl: await blobToDataUrl(blob),
    mediaType: blob.type || 'application/octet-stream',
    animated: isAnimatedImage(await blob.arrayBuffer()),
    ts: Date.now(),
  };
  byteCache.delete(url);
  byteCache.set(url, entry);
  if (byteCache.size > CACHE_MAX) byteCache.delete(byteCache.keys().next().value);
  return entry;
}

async function fetchAndProcess(url, maxEdge) {
  const { dataUrl } = await getBytes(url);
  const blob = await (await fetch(dataUrl)).blob();
  return toJpegDataUrl(blob, maxEdge);
}

async function processDataUrl(dataUrl, maxEdge) {
  const blob = await (await fetch(dataUrl)).blob();
  return toJpegDataUrl(blob, maxEdge);
}

function base64Of(dataUrl) {
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

function motionUserText(frames, duration) {
  return `These ${frames.length} frames were sampled evenly across a clip of about ${duration.toFixed(1)}s, in chronological order. Compare them carefully to infer the camera movement, then produce the motion breakdown.`;
}

// ---------- animated-image sniffing (GIF / APNG / animated WebP) ----------

function isAnimatedImage(buf) {
  const b = new Uint8Array(buf);
  const ascii = (i, s) => {
    for (let k = 0; k < s.length; k++) if (b[i + k] !== s.charCodeAt(k)) return false;
    return true;
  };
  const limit = Math.min(b.length, 400000);
  if (ascii(0, 'GIF')) {
    let gce = 0;
    for (let i = 0; i < limit - 1; i++) {
      if (b[i] === 0x21 && b[i + 1] === 0xf9 && ++gce > 1) return true;
    }
    return false;
  }
  if (b[0] === 0x89 && ascii(1, 'PNG')) { // APNG: acTL chunk before IDAT
    for (let i = 8; i < limit - 4; i++) {
      if (ascii(i, 'acTL')) return true;
      if (ascii(i, 'IDAT')) break;
    }
    return false;
  }
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) { // animated WebP: ANIM chunk
    for (let i = 12; i < limit - 4; i++) if (ascii(i, 'ANIM')) return true;
    return false;
  }
  return false;
}

async function sniffAnimated(url) {
  return (await getBytes(url)).animated;
}

// ---------- Anthropic (Claude) ----------

async function callClaude(body, apiKey) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);
  return data;
}

async function claudeStill(imageDataUrl, { apiKey, model }) {
  if (!apiKey) throw new Error('NO_KEY');
  const response = await callClaude({
    model,
    max_tokens: 1024,
    system: STILL_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Of(imageDataUrl) } },
        { type: 'text', text: 'Write the FLUX.2 prompt for this image.' },
      ],
    }],
  }, apiKey);
  const text = response.content.find((b) => b.type === 'text')?.text?.trim();
  if (!text) throw new Error('Empty response from the model');
  return text;
}

async function claudeMotion(frames, duration, { apiKey, model }) {
  if (!apiKey) throw new Error('NO_KEY');
  const content = [];
  frames.forEach((f, i) => {
    content.push({ type: 'text', text: `Frame ${i + 1}/${frames.length} · t = ${f.t.toFixed(1)}s` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Of(f.dataUrl) } });
  });
  content.push({ type: 'text', text: motionUserText(frames, duration) });
  const response = await callClaude({
    model,
    max_tokens: 2048,
    system: MOTION_SYSTEM,
    output_config: { format: MOTION_SCHEMA },
    messages: [{ role: 'user', content }],
  }, apiKey);
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('Empty response from the model');
  return JSON.parse(text);
}

// ---------- OpenAI (ChatGPT) ----------

async function callOpenAI(body, apiKey) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);
  return data;
}

async function openaiStill(imageDataUrl, { openaiKey, openaiModel }) {
  if (!openaiKey) throw new Error('NO_KEY');
  const data = await callOpenAI({
    model: openaiModel,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: STILL_SYSTEM },
      { role: 'user', content: [
        { type: 'text', text: 'Write the FLUX.2 prompt for this image.' },
        { type: 'image_url', image_url: { url: imageDataUrl } }, // OpenAI takes the full data: URL
      ] },
    ],
  }, openaiKey);
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from the model');
  return text;
}

async function openaiMotion(frames, duration, { openaiKey, openaiModel }) {
  if (!openaiKey) throw new Error('NO_KEY');
  const content = [];
  frames.forEach((f, i) => {
    content.push({ type: 'text', text: `Frame ${i + 1}/${frames.length} · t = ${f.t.toFixed(1)}s` });
    content.push({ type: 'image_url', image_url: { url: f.dataUrl } });
  });
  content.push({ type: 'text', text: motionUserText(frames, duration) });
  const data = await callOpenAI({
    model: openaiModel,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: MOTION_SYSTEM },
      { role: 'user', content },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'motion_breakdown', strict: true, schema: MOTION_SCHEMA.schema },
    },
  }, openaiKey);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from the model');
  return JSON.parse(text);
}

// ---------- dispatch ----------

async function generateStill(imageDataUrl) {
  const s = await getSettings();
  return s.provider === 'openai' ? openaiStill(imageDataUrl, s) : claudeStill(imageDataUrl, s);
}

async function generateMotion(frames, duration) {
  const s = await getSettings();
  return s.provider === 'openai'
    ? openaiMotion(frames, duration, s)
    : claudeMotion(frames, duration, s);
}

// ---------- nFrame Studio handoff ----------
//
// "Use in nFrame" routes a handoff payload to an open studio tab via the
// bridge content script; if no tab is ready, the payload is queued in
// storage and the studio is opened — the bridge pulls the queue once the
// app announces it is ready.

const PENDING_KEY = 'nframePending';
const PENDING_MAX = 10;

async function nframeSend(payload) {
  const s = await getSettings();
  let origin;
  try {
    origin = new URL(s.studioUrl || DEFAULTS.studioUrl).origin;
  } catch {
    origin = new URL(DEFAULTS.studioUrl).origin;
  }
  const u = new URL(origin);
  // match patterns ignore ports — query by scheme + host
  const tabs = await chrome.tabs.query({ url: `${u.protocol}//${u.hostname}/*` });
  for (const tab of tabs) {
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'nframe-deliver', payload });
      if (res && res.ok) {
        await chrome.tabs.update(tab.id, { active: true }).catch(() => {});
        await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
        return { delivered: true, opened: false };
      }
    } catch { /* that tab has no live bridge — try the next */ }
  }
  const { [PENDING_KEY]: pending = [] } = await chrome.storage.local.get(PENDING_KEY);
  pending.push(payload);
  await chrome.storage.local.set({ [PENDING_KEY]: pending.slice(-PENDING_MAX) });
  await chrome.tabs.create({ url: origin });
  return { delivered: true, opened: true };
}

async function nframePull() {
  const { [PENDING_KEY]: pending = [] } = await chrome.storage.local.get(PENDING_KEY);
  await chrome.storage.local.set({ [PENDING_KEY]: [] });
  return pending;
}

// ---------- history ----------

async function historyAdd(item) {
  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift({ ...item, id: crypto.randomUUID(), ts: Date.now() });
  await chrome.storage.local.set({ history: history.slice(0, HISTORY_MAX) });
}

// ---------- messaging ----------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'fetch-image':
          sendResponse({ ok: true, dataUrl: await fetchAndProcess(msg.url, msg.maxEdge || 1568) });
          break;
        case 'fetch-bytes': {
          const e = await getBytes(msg.url);
          sendResponse({ ok: true, dataUrl: e.dataUrl, mediaType: e.mediaType, animated: e.animated });
          break;
        }
        case 'process-dataurl':
          sendResponse({ ok: true, dataUrl: await processDataUrl(msg.dataUrl, msg.maxEdge || 1568) });
          break;
        case 'capture-visible': {
          const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'jpeg', quality: 92 });
          sendResponse({ ok: true, dataUrl });
          break;
        }
        case 'generate-still':
          sendResponse({ ok: true, prompt: await generateStill(msg.dataUrl) });
          break;
        case 'generate-motion':
          sendResponse({ ok: true, data: await generateMotion(msg.frames, msg.duration) });
          break;
        case 'sniff-media':
          sendResponse({ ok: true, animated: await sniffAnimated(msg.url) });
          break;
        case 'history-add':
          await historyAdd(msg.item);
          sendResponse({ ok: true });
          break;
        case 'nframe-send':
          sendResponse({ ok: true, ...(await nframeSend(msg.payload)) });
          break;
        case 'nframe-pull':
          sendResponse({ ok: true, items: await nframePull() });
          break;
        case 'get-settings':
          sendResponse({ ok: true, settings: await getSettings() });
          break;
        case 'set-badge':
          if (sender.tab) {
            chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.on ? 'ON' : '' });
            chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#0a84ff' });
          }
          sendResponse({ ok: true });
          break;
        case 'open-options':
          chrome.runtime.openOptionsPage();
          sendResponse({ ok: true });
          break;
        default:
          sendResponse({ ok: false, error: `Unknown message: ${msg.type}` });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message || String(e) });
    }
  })();
  return true; // keep the channel open for the async response
});

// Keyboard shortcut toggles the picker on the active tab.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-picker') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'toggle-picker' }).catch(() => {});
});

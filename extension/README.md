# FramePick (extension)

Click any image, video, or GIF on a page → get a paste-ready AI prompt — and send it straight into **nFrame Studio**.

- **STILL** (images): generates a FLUX.2-ready image-generation prompt. **Use as Composition →** sends the image to nFrame as a composition reference (layout only — the shot's Hero stays the subject).
- **MOTION** (videos & GIFs): samples 2–10 frames evenly across the clip and generates a structured motion breakdown (SHOT · COMPOSITION · CAMERA MOVEMENT · SCENE ACTION · EVOLUTION · LIGHT & GRADE) plus **two** paste-ready video prompts: the original **Clip** prompt and the **@hero** prompt, where the subject is replaced by the literal token `@hero` (resolved by nFrame to its Hero slot). **Use in nFrame →** ships keyframes + breakdown + prompts to the studio's Inbox.

Powered by your choice of the **Anthropic Claude API** or the **OpenAI (ChatGPT) API** — both via vision. You bring your own API key.

The UI follows an Apple-style design language: dark translucent panels, hairline borders, pill buttons, system blue `#0A84FF`.

## Install (Chrome or Brave)

1. Open `chrome://extensions` (Brave: `brave://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension` folder.
4. Click the FramePick toolbar icon → **Options (API key)** → pick a **Provider** (Anthropic or OpenAI), paste that provider's key (from [platform.claude.com](https://platform.claude.com/) or [platform.openai.com](https://platform.openai.com/api-keys)) → **Save**. Use **Test key** to verify.

## Use

1. Open any page with media. Click the FramePick icon and flip the **picker** switch on (or press **Alt+Shift+P**).
2. Hover media — it gets a dashed outline and a tag showing the auto-detected mode (`img · 1280 × 720 → STILL`, `video · 0:12 → MOTION`).
3. Click it. A panel appears next to the element — **drag its header** to move it, **drag the bottom-right corner** to resize it (the size is remembered):
   - STILL → thumbnail + FLUX.2 prompt, **Copy** / **↻ Regenerate**.
   - MOTION → filmstrip of sampled frames, the six-row breakdown with per-row copy, and the **VIDEO PROMPT** block.
     - **Click a frame** to inspect it large and select it (no API call). It becomes the frame used by *force STILL* and download.
     - **‹ N ›** in the panel header changes the frame count (2–10) and resamples on the spot.
     - Hover a frame and hit **⤓** to download it — **original** or **black & white**, single frame or all frames.
     - **force STILL** generates a FLUX.2 prompt from the selected frame; a **‹ back to MOTION** button returns to the breakdown instantly (no regeneration).
4. **Esc** closes the panel / exits the picker. The popup keeps the last 20 picks with one-click copy.

## How capture works (and its fallbacks)

- Images are fetched by the background service worker (bypasses page CORS) and downscaled before being sent to the API.
- Videos are sampled by seeking a muted offscreen clone of the `<video>`.
- GIFs and animated images are detected by **sniffing the actual bytes** (GIF / APNG / animated WebP) — not just the URL — so CDN GIFs served without a `.gif` extension still route to MOTION.
- GIF / animated-image frames are **decoded directly from the file** (`ImageDecoder`), so sampling always starts at frame 0 of the loop, hits exact evenly-spaced frames, and completes near-instantly — no waiting for the animation to play.
- Fetched media bytes are **cached briefly in the background worker**, so the hover sniff, the click-time capture, and the GIF decode share one download.
- If the source is CORS-tainted, a streaming (MSE/blob) video, or an undecodable animation, FramePick falls back to **visible-tab captures while the media plays**, cropped to the element. For GIFs this fallback first swaps in a fresh copy of the file so the loop restarts from the beginning before capturing; videos rewind to 0. Playback state is restored afterwards.
- Media inside cross-origin iframes can't use the tab-capture fallback — open it in its own tab instead.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Provider | Anthropic (Claude) | Switch to OpenAI (ChatGPT) — each provider keeps its own key + model. |
| API key | — | Stored in `chrome.storage.local` only; sent only to the selected provider (`api.anthropic.com` or `api.openai.com`). |
| Claude model | Claude Opus 4.8 | Fable 5 / Sonnet 4.6 / Haiku 4.5 also available. |
| ChatGPT model | GPT-4o | GPT-4.1 / GPT-4.1 mini / GPT-4o mini also available. |
| Frames per clip | 8 | 2–10, sampled evenly across the duration. |

## Files

```
manifest.json   MV3 manifest
background.js   service worker: image processing, Claude API calls, history
content.js      picker, frame sampler, anchored result panel (shadow DOM)
popup.html/js   picker toggle + last-20 history
options.html/js API key, model, frame count
icons/          toolbar icons
```

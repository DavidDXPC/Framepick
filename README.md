# FramePick

**Pick anywhere. Generate with intent.**

FramePick is a unified toolkit for AI generation artists, in two connected parts:

| Surface | What it is |
| --- | --- |
| **FramePick extension** (`extension/`) | A Chrome/Brave extension: click any image, video, or GIF on any page → get a paste-ready AI prompt (FLUX.2 stills, structured motion breakdowns for Veo / Runway / Kling), then send it straight into the studio. |
| **FramePick Studio** (web app, repo root) | A shot-list & storyboard studio: scenes, shot cards with **Hero** + **Composition** references, cinematography (Frame/Motion) taxonomies, gpt-image generation, Moodboard, and Academy. Served by a Cloudflare Worker. |

Live studio: **https://framepick.comprido-david.workers.dev**

## The workflow — STILL → FramePick Studio, MOTION → FramePick Studio

The core idea: **your Hero never leaves FramePick Studio.** FramePick only ships structure — composition, motion, and prompts that reference the subject as a token.

### STILL → Composition

1. Browse references anywhere (Pinterest, Behance, anywhere). Arm the picker, click a still.
2. FramePick generates the FLUX.2 prompt and shows **Use as Composition →**.
3. One click sends the image into FramePick Studio's **Inbox**. Drop it on a shot — it lands in the **Composition** slot: only the layout, framing and pose are used. The shot's **Hero** reference stays the subject.

### MOTION → @hero

1. Click a video or GIF. FramePick samples keyframes (2–10, evenly), and produces the six-row motion breakdown plus **two** video prompts:
   - **Clip** — the original clip described as-is.
   - **@hero** — the same shot, composition, camera move, evolution and grade, with the subject replaced by the literal token `@hero`.
2. **Use in FramePick Studio →** sends keyframes + breakdown + both prompts to the studio.
3. In FramePick Studio, the keyframes attach to a shot as **motion & layout guides** (never the final subject). The `@hero` token resolves to that shot's Hero slot — copy the resolved video prompt with one click.

The extension finds an open studio tab and delivers live; if none is open it queues the handoff and opens the studio — the Inbox picks it up on load.

## Develop

```bash
git clone https://github.com/DavidDXPC/Framepick.git
cd Framepick
npm install
npm run dev        # studio dev server (http://localhost:5173)
npm run typecheck  # tsc --noEmit
npm run build      # production build → ./dist
npm run deploy     # vite build && wrangler deploy (Worker name: "framepick")
```

### Extension (Chrome / Brave)

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `extension/`.
2. Open **Options…** → pick a provider (Anthropic Claude or OpenAI), paste your API key, **Save**.
3. The **FramePick Studio URL** option controls where handoffs are delivered — point it at `http://localhost:5173` while developing.

### Icons

`public/favicon.svg` is the single source of the FramePick mark. Regenerate all PNG sizes (extension icons + touch icons) with:

```bash
npm i --no-save sharp && node scripts/gen-icons.mjs
```

## Deploy

`npm run deploy` builds and deploys from your machine (Worker name **framepick**).

Pushes to `main` also auto-deploy via GitHub Actions (`.github/workflows/deploy.yml`). It needs two repo secrets:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | your Cloudflare account id |
| `CLOUDFLARE_API_TOKEN`  | a Cloudflare API token with the **Edit Cloudflare Workers** permission |

## Architecture notes

- **Handoff contract** — one message shape both sides share: `{ source: 'framepick', type: 'handoff', payload }` where payload is `composition` (image + prompt) or `motion` (keyframes + breakdown + clip/@hero prompts). Web side: `src/lib/framepickBridge.ts`. Extension side: `extension/bridge.js` (runs only on studio origins, gated by the `<meta name="framepick-studio">` handshake).
- **Queue + live delivery** — `extension/background.js` routes `nframe-send` to an open studio tab via the bridge, or queues in `chrome.storage.local` and opens the studio; the bridge flushes the queue after the app announces `studio-ready`.
- **@hero resolution** — `resolveHeroPrompt()` replaces the token with the shot description and appends a Hero-identity directive when a Hero reference is attached. Keyframes are explicitly guides; the Hero slot is the subject.
- **Keys stay client-side** — the studio's Worker (`worker/index.ts`) proxies OpenAI per-request with keys from localStorage; the extension stores its keys in `chrome.storage.local` and calls providers directly.
- **Motion video (Kling)** — a motion shot's Composition module has a **Generate video** action. The Worker signs a per-request HS256 JWT (`iss`=Access Key, 30-min expiry) and calls Kling image-to-video (`api-singapore.klingai.com`, model `kling-v3` by default), animating the shot's generated still with the resolved `@hero` prompt, then polls to completion and plays the result inline. Add your Kling **Access Key** + **Secret Key** in **API keys** (create them at [kling.ai/dev/api-key](https://kling.ai/dev/api-key)).

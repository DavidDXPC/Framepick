// Cloudflare Worker: serves the built SPA (env.ASSETS) and implements the two
// dynamic endpoints the app calls — /api/generate-image and /api/dop-assist —
// by proxying to OpenAI with the key the client passes in the request body.
// Keys never live in the bundle; they travel per-request from localStorage.

interface Env {
	ASSETS: { fetch: (req: Request) => Promise<Response> };
}

// Newest first; the request automatically falls back to the next model if a
// newer ID (or a parameter) is rejected by the API.
const IMAGE_MODELS = ['gpt-image-2', 'gpt-image-1'];
const TEXT_MODELS = ['gpt-5.2', 'gpt-5', 'gpt-4o'];

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// Fall back to the next model only when the failure looks like an unavailable
// model or an unsupported parameter for that model — not on auth/quota/policy.
function shouldFallback(status: number, data: any): boolean {
	if (status === 404) return true;
	if (status === 400) return /model|unsupported|not supported|does not exist|unknown|invalid/i.test(data?.error?.message || '');
	return false;
}

interface Attempt {
	res: Response;
	data: any;
}

// Try each model in order; resolve on the first ok response, advance only when
// shouldFallback, and return the last attempt if all fail.
async function tryModels(models: string[], send: (model: string) => Promise<Attempt>): Promise<Attempt> {
	let last: Attempt | null = null;
	for (const model of models) {
		const attempt = await send(model);
		if (attempt.res.ok) return attempt;
		last = attempt;
		if (!shouldFallback(attempt.res.status, attempt.data)) break;
	}
	return last as Attempt;
}

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
	const v = String(value || '').toLowerCase();
	return (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function dataUrlToBlob(dataUrl: string): Blob {
	const [head, b64] = dataUrl.split(',');
	const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/png';
	const bin = atob(b64 || '');
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new Blob([bytes], { type: mime });
}

function abToBase64(ab: ArrayBuffer): string {
	let binary = '';
	const bytes = new Uint8Array(ab);
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
	}
	return btoa(binary);
}

// ---------------------------------------------------------------------------
// POST /api/generate-image
// ---------------------------------------------------------------------------
async function handleGenerateImage(body: Record<string, any>): Promise<Response> {
	const key = (body.openaiApiKey || '').trim();
	if (!key) return json({ error: 'Image generation needs an OpenAI API key (set it in API keys).' }, 400);

	const prompt = String(body.prompt || '').trim();
	if (!prompt) return json({ error: 'Empty prompt.' }, 400);

	const size = pick(body.size, ['1024x1024', '1024x1536', '1536x1024', 'auto'], 'auto');
	const quality = pick(body.quality, ['low', 'medium', 'high', 'auto'], 'auto');
	const background = pick(body.background, ['transparent', 'opaque', 'auto'], 'auto');
	const outputFormat = pick(body.outputFormat, ['png', 'jpeg', 'webp'], 'png');
	const inputImages: { src: string; name?: string }[] = (Array.isArray(body.inputImages) ? body.inputImages : []).filter((img) => img?.src);
	// Prompts reference input images ORDINALLY ("the FIRST input image…"), so a
	// silently dropped image would shift every role. Fail loud instead.
	const nonData = inputImages.find((img) => !img.src.startsWith('data:'));
	if (nonData) return json({ error: `Input image "${nonData.name || 'reference'}" is not embedded image data — re-attach it and try again.` }, 400);

	const { res, data } = await tryModels(IMAGE_MODELS, async (model) => {
		let r: Response;
		if (inputImages.length) {
			// FormData is consumed per request, so rebuild it for each attempt.
			const form = new FormData();
			form.append('model', model);
			form.append('prompt', prompt);
			form.append('size', size);
			form.append('quality', quality);
			form.append('output_format', outputFormat);
			if (background !== 'auto') form.append('background', background);
			inputImages.forEach((img, i) => {
				if (img?.src?.startsWith('data:')) form.append('image[]', dataUrlToBlob(img.src), img.name || `ref-${i}.png`);
			});
			r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
		} else {
			const payload: Record<string, unknown> = { model, prompt, size, quality, output_format: outputFormat, n: 1 };
			if (background !== 'auto') payload.background = background;
			r = await fetch('https://api.openai.com/v1/images/generations', {
				method: 'POST',
				headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
		}
		return { res: r, data: (await r.json().catch(() => ({}))) as any };
	});

	if (!res.ok) return json({ error: data?.error?.message || `OpenAI error (${res.status})` }, res.status);
	const b64 = data?.data?.[0]?.b64_json;
	if (!b64) return json({ error: 'No image returned by the model.' }, 502);
	return json({ image: `data:image/${outputFormat};base64,${b64}` });
}

// ---------------------------------------------------------------------------
// POST /api/dop-assist  (enhance / suggest / clarity / shorten / custom /
// describe / academy) — OpenAI chat + vision.
// ---------------------------------------------------------------------------
function instructionFor(agent: string, field: string, customInstruction: string): string {
	if (agent === 'custom' || agent === 'describe') return customInstruction || `Rewrite this ${field}.`;
	switch (agent) {
		case 'suggest':
			return `Suggest a single fresh, vivid "${field}" for an image-generation prompt. One line.`;
		case 'clarity':
			return `Rewrite this "${field}" for clarity and rhythm — same meaning, no filler.`;
		case 'shorten':
			return `Shorten this "${field}" to about half its length, keeping the strongest concrete production details.`;
		case 'enhance':
		default:
			return `Rewrite this "${field}" as a vivid, production-specific fragment in a director-of-photography voice, suitable for an image-generation prompt.`;
	}
}

async function handleDopAssist(body: Record<string, any>): Promise<Response> {
	const key = (body.openaiApiKey || '').trim();
	if (!key) return json({ error: 'Add an API key in settings to use AI assist.' }, 400);
	const agent = String(body.agent || 'enhance');

	// Academy: derive the six components for an actual reference image (vision).
	if (agent === 'academy') {
		const imageUrl = String(body.imageUrl || '').trim();
		if (!imageUrl) return json({ error: 'Missing image URL.' }, 400);
		let dataUrl = imageUrl;
		if (!imageUrl.startsWith('data:')) {
			const imgRes = await fetch(imageUrl, { redirect: 'follow' });
			if (!imgRes.ok) return json({ error: `Couldn't fetch reference image (${imgRes.status}).` }, 502);
			const ct = imgRes.headers.get('content-type') || 'image/jpeg';
			dataUrl = `data:${ct};base64,${abToBase64(await imgRes.arrayBuffer())}`;
		}
		const sys =
			'You are a cinematography instructor. Look at the image and describe it across six components for a teaching tool. Return ONLY raw JSON (no markdown) with keys: subject (string), action (string), environment (string), style (array of 2-3 short medium/style terms), lighting (array of 2-3 short lighting/palette terms), angle (array of 2-3 short camera/lens/angle terms). Be specific and accurate to what is actually visible.';
		const { res, data } = await tryModels(TEXT_MODELS, async (model) => {
			const r = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model,
					messages: [
						{ role: 'system', content: sys },
						{ role: 'user', content: [{ type: 'text', text: 'Describe this reference image.' }, { type: 'image_url', image_url: { url: dataUrl } }] },
					],
					response_format: { type: 'json_object' },
				}),
			});
			return { res: r, data: (await r.json().catch(() => ({}))) as any };
		});
		if (!res.ok) return json({ error: data?.error?.message || `OpenAI error (${res.status})` }, res.status);
		const raw = data?.choices?.[0]?.message?.content || '{}';
		try {
			const parsed = JSON.parse(raw);
			return json({ academy: parsed });
		} catch {
			return json({ error: 'Model returned malformed JSON.' }, 502);
		}
	}

	// Academy Intuitive path: grade a student's free-form description against the image (vision).
	if (agent === 'academy-feedback') {
		const imageUrl = String(body.imageUrl || '').trim();
		const userText = String(body.userText || '').trim();
		if (!imageUrl) return json({ error: 'Missing image URL.' }, 400);
		if (!userText) return json({ error: 'Write a description first.' }, 400);
		let dataUrl = imageUrl;
		if (!imageUrl.startsWith('data:')) {
			const imgRes = await fetch(imageUrl, { redirect: 'follow' });
			if (!imgRes.ok) return json({ error: `Couldn't fetch reference image (${imgRes.status}).` }, 502);
			const ct = imgRes.headers.get('content-type') || 'image/jpeg';
			dataUrl = `data:${ct};base64,${abToBase64(await imgRes.arrayBuffer())}`;
		}
		const sys =
			'You are a warm, encouraging cinematography instructor grading a student\'s free-form description of an image. Judge how well the description captures what is actually visible across subject, action, environment, style/medium, lighting/palette, and camera angle. Return ONLY raw JSON (no markdown) with keys: score (integer 0-100), strengths (array of 2-4 short phrases naming what they captured well), gaps (array of 2-4 short phrases naming what they missed or were too vague about), expert (one concise paragraph: how a director of photography would describe this image). Be specific and reference what is in the image.';
		const { res, data } = await tryModels(TEXT_MODELS, async (model) => {
			const r = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model,
					messages: [
						{ role: 'system', content: sys },
						{
							role: 'user',
							content: [
								{ type: 'text', text: `Student description:\n"""${userText}"""\n\nEvaluate it against the image.` },
								{ type: 'image_url', image_url: { url: dataUrl } },
							],
						},
					],
					response_format: { type: 'json_object' },
				}),
			});
			return { res: r, data: (await r.json().catch(() => ({}))) as any };
		});
		if (!res.ok) return json({ error: data?.error?.message || `OpenAI error (${res.status})` }, res.status);
		try {
			return json({ feedback: JSON.parse(data?.choices?.[0]?.message?.content || '{}') });
		} catch {
			return json({ error: 'Model returned malformed JSON.' }, 502);
		}
	}

	const field = String(body.field || 'text');
	const instruction = instructionFor(agent, field, String(body.customInstruction || ''));
	const sourceText = String(body.sourceText || '');
	const contextFields: { label: string; value: string }[] = Array.isArray(body.contextFields) ? body.contextFields : [];
	const context = contextFields.map((c) => `${c.label}: ${c.value}`).join('\n');
	const imageDataUrls: string[] = Array.isArray(body.imageDataUrls)
		? body.imageDataUrls.filter((u: unknown): u is string => typeof u === 'string' && !!u)
		: body.imageDataUrl
			? [String(body.imageDataUrl)]
			: [];

	const userText = [instruction, context ? `Context:\n${context}` : '', sourceText ? `Current ${field}:\n"""${sourceText}"""` : '']
		.filter(Boolean)
		.join('\n\n');

	const userContent: unknown = imageDataUrls.length
		? [{ type: 'text', text: userText }, ...imageDataUrls.map((url) => ({ type: 'image_url', image_url: { url } }))]
		: userText;

	const { res, data } = await tryModels(TEXT_MODELS, async (model) => {
		const r = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model,
				messages: [
					{ role: 'system', content: 'You are DOP VOICE, a senior commercial director of photography. Reply with the requested text only — no preamble, no surrounding quotes, no markdown.' },
					{ role: 'user', content: userContent },
				],
			}),
		});
		return { res: r, data: (await r.json().catch(() => ({}))) as any };
	});
	if (!res.ok) return json({ error: data?.error?.message || `OpenAI error (${res.status})` }, res.status);
	const text = (data?.choices?.[0]?.message?.content || '').trim();
	return json({ text });
}

// ---------------------------------------------------------------------------
// Kling (Kuaishou) image-to-video — https://api-singapore.klingai.com
// Auth: a per-request HS256 JWT signed with the Secret Key (iss = Access Key,
// exp = now + 30min, nbf = now − 5s). Keys travel per-request from the client;
// they are never stored in the bundle.
// ---------------------------------------------------------------------------
const KLING_HOST = 'https://api-singapore.klingai.com';

function b64url(bytes: Uint8Array): string {
	let s = '';
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signKlingJwt(accessKey: string, secretKey: string): Promise<string> {
	const enc = new TextEncoder();
	const now = Math.floor(Date.now() / 1000);
	const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
	const payload = b64url(enc.encode(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })));
	const data = `${header}.${payload}`;
	const key = await crypto.subtle.importKey('raw', enc.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
	return `${data}.${b64url(new Uint8Array(sig))}`;
}

async function klingAuth(body: Record<string, any>): Promise<string> {
	// Kling keys are alphanumeric with no internal whitespace, so strip ALL
	// whitespace — this defuses the #1 cause of "signature invalid": a stray
	// space or newline pasted into the key field.
	const accessKey = String(body.klingAccessKey || '').replace(/\s+/g, '');
	const secretKey = String(body.klingSecretKey || '').replace(/\s+/g, '');
	if (!accessKey || !secretKey) throw new Error('NO_KLING_KEY');
	return signKlingJwt(accessKey, secretKey);
}

// Friendlier message for Kling auth failures — point the user at the key field.
function klingError(data: any, status: number): Response {
	const msg = data?.message || `Kling error (${status})`;
	const hint = /signature|invalid|auth|token|expired/i.test(msg)
		? `${msg} — re-check your Kling Access Key and Secret Key in API keys (copy each exactly, with no extra spaces).`
		: msg;
	return json({ error: hint }, status >= 400 ? status : 502);
}

async function handleGenerateVideo(body: Record<string, any>): Promise<Response> {
	let token: string;
	try {
		token = await klingAuth(body);
	} catch {
		return json({ error: 'Add your Kling Access Key and Secret Key in API keys to generate video.' }, 400);
	}
	const image = String(body.image || '');
	if (!image) return json({ error: 'A start image is required to animate (generate a still or attach a Hero first).' }, 400);
	// Kling wants raw base64 (no data: prefix) or a URL.
	const imageField = image.startsWith('data:') ? image.slice(image.indexOf(',') + 1) : image;
	const duration = body.duration === '10' || body.duration === 10 ? '10' : '5';
	const aspect = pick(body.aspectRatio, ['16:9', '9:16', '1:1'], '16:9');
	const payload: Record<string, unknown> = {
		model_name: String(body.model || 'kling-v3'),
		image: imageField,
		prompt: String(body.prompt || '').slice(0, 2500),
		mode: body.mode === 'pro' ? 'pro' : 'std',
		duration,
		aspect_ratio: aspect,
		cfg_scale: typeof body.cfgScale === 'number' ? body.cfgScale : 0.5,
	};
	if (body.negativePrompt) payload.negative_prompt = String(body.negativePrompt).slice(0, 2500);

	const r = await fetch(`${KLING_HOST}/v1/videos/image2video`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload),
	});
	const data = (await r.json().catch(() => ({}))) as any;
	if (!r.ok || data?.code !== 0) return klingError(data, r.status);
	return json({ taskId: data?.data?.task_id });
}

// Validate Kling credentials via the exact signing path used for generation:
// sign a JWT and make one cheap authenticated GET. A "task not found" reply
// means the signature was accepted; an auth/signature error means bad keys.
async function handleKlingTest(body: Record<string, any>): Promise<Response> {
	let token: string;
	try {
		token = await klingAuth(body);
	} catch {
		return json({ ok: false, error: 'Enter both the Access Key and Secret Key.' });
	}
	const r = await fetch(`${KLING_HOST}/v1/videos/image2video/framepick-keytest`, { headers: { Authorization: `Bearer ${token}` } });
	const data = (await r.json().catch(() => ({}))) as any;
	const msg = String(data?.message || '');
	if (/signature|invalid|unauthor|forbidden|token|expired|access key|secret/i.test(msg)) return json({ ok: false, error: msg });
	// code 0, or "task not found", or any non-auth error all mean auth passed.
	return json({ ok: true });
}

// Live Kling balance: sum remaining/total units across active resource packs.
async function handleKlingCredits(body: Record<string, any>): Promise<Response> {
	let token: string;
	try {
		token = await klingAuth(body);
	} catch {
		return json({ error: 'Missing Kling credentials.' }, 400);
	}
	const now = Math.floor(Date.now() / 1000);
	const url = `${KLING_HOST}/account/costs?start_time=${(now - 90 * 24 * 3600) * 1000}&end_time=${now * 1000}`;
	const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	const data = (await r.json().catch(() => ({}))) as any;
	if (!r.ok || data?.code !== 0) return klingError(data, r.status);
	const packs: any[] = data?.data?.resource_pack_subscribe_infos || [];
	let remaining = 0;
	let total = 0;
	for (const p of packs) {
		if (p?.status === 'online') {
			remaining += Number(p.remaining_quantity) || 0;
			total += Number(p.total_quantity) || 0;
		}
	}
	return json({ remaining, total });
}

async function handleVideoStatus(body: Record<string, any>): Promise<Response> {
	let token: string;
	try {
		token = await klingAuth(body);
	} catch {
		return json({ error: 'Missing Kling credentials.' }, 400);
	}
	const taskId = String(body.taskId || '').trim();
	if (!taskId) return json({ error: 'Missing task id.' }, 400);
	const r = await fetch(`${KLING_HOST}/v1/videos/image2video/${encodeURIComponent(taskId)}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	const data = (await r.json().catch(() => ({}))) as any;
	if (!r.ok || data?.code !== 0) return klingError(data, r.status);
	const status = data?.data?.task_status as string; // submitted | processing | succeed | failed
	const videoUrl = data?.data?.task_result?.videos?.[0]?.url || '';
	return json({ status, videoUrl, message: data?.data?.task_status_msg || '' });
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith('/api/')) {
			if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
			let body: Record<string, any> = {};
			try {
				body = (await request.json()) as Record<string, any>;
			} catch {
				return json({ error: 'Invalid JSON body.' }, 400);
			}
			try {
				if (url.pathname === '/api/generate-image') return await handleGenerateImage(body);
				if (url.pathname === '/api/dop-assist') return await handleDopAssist(body);
				if (url.pathname === '/api/generate-video') return await handleGenerateVideo(body);
				if (url.pathname === '/api/video-status') return await handleVideoStatus(body);
				if (url.pathname === '/api/kling-test') return await handleKlingTest(body);
				if (url.pathname === '/api/kling-credits') return await handleKlingCredits(body);
				return json({ error: 'Not found' }, 404);
			} catch (e) {
				return json({ error: (e as Error).message || 'Server error' }, 500);
			}
		}
		return env.ASSETS.fetch(request);
	},
};

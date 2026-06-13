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
				return json({ error: 'Not found' }, 404);
			} catch (e) {
				return json({ error: (e as Error).message || 'Server error' }, 500);
			}
		}
		return env.ASSETS.fetch(request);
	},
};

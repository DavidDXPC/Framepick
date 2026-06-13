import type { FieldDef, Option } from '../data/frame';
import { LENS_CHARACTER, LENS_FOCAL, LIGHTING, optValue } from '../data/frame';
import { getProvider } from '../state/persistence';

export type { Provider } from '../state/persistence';
export { getProvider };

interface ContextField {
	label: string;
	value: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) throw new Error((data.error as string) || `Request failed: ${res.status}`);
	return data as T;
}

// AI text assist endpoint (aa)
export function dopAssist(payload: unknown): Promise<{ text?: string; academy?: Record<string, unknown>; feedback?: Record<string, unknown> }> {
	return postJson('/api/dop-assist', payload);
}

// Image generation endpoint with a 3-minute timeout ($h)
export async function generateImage(payload: unknown): Promise<Record<string, unknown>> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 180000);
	try {
		const res = await fetch('/api/generate-image', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
		const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
		if (!res.ok) throw new Error((data.error as string) || `Request failed: ${res.status}`);
		return data;
	} catch (err) {
		if ((err as Error)?.name === 'AbortError') throw new Error('Image generation timed out after 3 minutes.');
		throw err;
	} finally {
		clearTimeout(timer);
	}
}

// ---------------------------------------------------------------------------
// Kling video generation (image → video), via the Worker proxy.
// ---------------------------------------------------------------------------
export interface VideoRequest {
	accessKey: string;
	secretKey: string;
	model: string;
	image: string; // data URL or remote URL — the start frame
	prompt: string;
	duration?: '5' | '10';
	aspectRatio?: string;
	mode?: 'std' | 'pro';
	negativePrompt?: string;
}

// Validate Kling keys through the exact signing path (no video task created).
export function testKling(accessKey: string, secretKey: string): Promise<{ ok: boolean; error?: string }> {
	return postJson('/api/kling-test', { klingAccessKey: accessKey, klingSecretKey: secretKey });
}

// Live Kling resource-pack balance (units remaining / total across active packs).
export function klingCredits(accessKey: string, secretKey: string): Promise<{ remaining: number; total: number; error?: string }> {
	return postJson('/api/kling-credits', { klingAccessKey: accessKey, klingSecretKey: secretKey });
}

// Kick off a Kling image-to-video task; resolves to its task id.
export async function generateVideo(req: VideoRequest): Promise<string> {
	const data = await postJson<{ taskId?: string }>('/api/generate-video', {
		klingAccessKey: req.accessKey,
		klingSecretKey: req.secretKey,
		model: req.model,
		image: req.image,
		prompt: req.prompt,
		duration: req.duration || '5',
		aspectRatio: req.aspectRatio || '16:9',
		mode: req.mode || 'std',
		negativePrompt: req.negativePrompt || '',
	});
	if (!data.taskId) throw new Error('Kling did not return a task id.');
	return data.taskId;
}

// Poll a Kling task to completion. Calls onTick(status) on each poll.
// Kling image-to-video typically takes 1–5 minutes.
export async function pollVideo(
	creds: { accessKey: string; secretKey: string },
	taskId: string,
	onTick?: (status: string) => void,
	opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<string> {
	const interval = opts.intervalMs ?? 6000;
	const deadline = Date.now() + (opts.timeoutMs ?? 8 * 60 * 1000);
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const data = await postJson<{ status?: string; videoUrl?: string; message?: string }>('/api/video-status', {
			klingAccessKey: creds.accessKey,
			klingSecretKey: creds.secretKey,
			taskId,
		});
		const status = data.status || 'processing';
		onTick?.(status);
		if (status === 'succeed' && data.videoUrl) return data.videoUrl;
		if (status === 'failed') throw new Error(data.message || 'Kling reported the task failed.');
		if (Date.now() > deadline) throw new Error('Video generation timed out. Check Kling for the task status.');
		await new Promise((r) => setTimeout(r, interval));
	}
}

// Field-level text assist: enhance / suggest / clarity / shorten / custom (Qp)
export async function fieldAssist(opts: {
	action: string;
	value: string;
	fieldLabel: string;
	visualStyle?: string;
	description?: string;
	customInstruction?: string;
	imageDataUrls?: string[];
}): Promise<string> {
	const provider = getProvider();
	if (provider.provider === 'none') throw new Error('Add an API key in settings to use AI assist.');
	const contextFields: ContextField[] = [];
	if (opts.visualStyle) contextFields.push({ label: 'Visual Style', value: opts.visualStyle });
	if (opts.description && opts.fieldLabel !== 'Description') contextFields.push({ label: 'Shot description', value: opts.description });
	const agent = ['enhance', 'suggest', 'clarity', 'shorten', 'custom'].includes(opts.action) ? opts.action : 'enhance';
	const res = await dopAssist({
		...provider,
		agent,
		field: opts.fieldLabel,
		sourceText: opts.value || '',
		customInstruction: opts.customInstruction || '',
		contextFields,
		imageDataUrls: opts.imageDataUrls || [],
	});
	return (res.text || '').trim();
}

// Build the instruction listing allowed control values (Gp)
export function buildControlsInstruction(fields: FieldDef[], mood?: string, custom?: string): string {
	const body = fields
		.map((f) => {
			if (f.type === 'lighting') {
				return LIGHTING.map((c) => `- ${c.label}${c.kind === 'multi' ? ' (one or more, comma-separated)' : ''}: ${c.options.join(' | ')}`).join('\n');
			}
			if (f.type === 'lens') {
				return `- Lens Focal Length: ${LENS_FOCAL.join(' | ')}\n- Lens Character: ${LENS_CHARACTER.join(' | ')}`;
			}
			const opts = f.groups ? f.groups.flatMap((g) => g.items.map(optValue)) : (f.options || []).map(optValue);
			return `- ${f.label}${f.type === 'multi' ? ' (one or more, comma-separated)' : ''}: ${opts.join(' | ')}`;
		})
		.join('\n');
	const moodLine = mood ? `Lean toward a ${mood} treatment. ` : '';
	const customLine = custom ? `User instruction: ${custom}. ` : '';
	return `You are a cinematographer choosing camera/lighting controls for a shot. ${moodLine}${customLine}Choose the single best value for each control below (or "none" if not applicable). You MUST pick only from the allowed values listed.

${body}

Return ONLY lines in the exact form "Control Label: Value". No prose, no extra text.`;
}

// Parse "Label: Value" lines into a lowercased map (Yp)
export function parseControlLines(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	String(text || '')
		.split('\n')
		.forEach((line) => {
			const m = line.match(/^\s*[-*]?\s*(.+?)\s*:\s*(.+?)\s*$/);
			if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
		});
	return out;
}

// Match a model-returned value against the allowed option list (Kr)
// Returns "" for none, null for invalid, or the canonical value.
export function matchOption(value: string, options: Option[]): string | null {
	if (!value || /^none$/i.test(value)) return '';
	const a = value.trim().toLowerCase();
	const hit =
		options.find((o) => optValue(o).toLowerCase() === a) ||
		options.find((o) => optValue(o).toLowerCase().startsWith(a) || a.startsWith(optValue(o).toLowerCase()));
	return hit ? optValue(hit) : null;
}

// Validate + collect a patch from parsed control lines (Gu)
export function applyControls(fields: FieldDef[], parsed: Record<string, string>): { patch: Record<string, string | string[]>; invalid: boolean; any: boolean } {
	const patch: Record<string, string | string[]> = {};
	let invalid = false;
	let any = false;
	const get = (label: string) => parsed[label.toLowerCase()];

	fields.forEach((f) => {
		if (f.type === 'lighting') {
			LIGHTING.forEach((cat) => {
				const v = get(cat.label);
				if (v === undefined) return;
				if (cat.kind === 'multi') {
					const matched = v.split(',').map((s) => matchOption(s, cat.options)).filter((s): s is string => !!s);
					if (matched.length) {
						patch[`lighting.${cat.key}`] = matched;
						any = true;
					}
				} else {
					const m = matchOption(v, cat.options);
					if (m === null) invalid = true;
					else if (m) {
						patch[`lighting.${cat.key}`] = m;
						any = true;
					}
				}
			});
		} else if (f.type === 'lens') {
			const focal = get('Lens Focal Length');
			const character = get('Lens Character');
			if (focal !== undefined) {
				const m = matchOption(focal, LENS_FOCAL);
				if (m === null) invalid = true;
				else if (m) {
					patch['lens.focalLength'] = m;
					any = true;
				}
			}
			if (character !== undefined) {
				const m = matchOption(character, LENS_CHARACTER);
				if (m === null) invalid = true;
				else if (m) {
					patch['lens.character'] = m;
					any = true;
				}
			}
		} else {
			const v = get(f.label);
			if (v === undefined) return;
			const opts = f.groups ? f.groups.flatMap((g) => g.items) : f.options || [];
			if (f.type === 'multi') {
				const matched = v.split(',').map((s) => matchOption(s, opts)).filter((s): s is string => !!s);
				if (matched.length) {
					patch[f.key] = matched;
					any = true;
				}
			} else {
				const m = matchOption(v, opts);
				if (m === null) invalid = true;
				else if (m) {
					patch[f.key] = m;
					any = true;
				}
			}
		}
	});
	return { patch, invalid, any };
}

// Run a full controls "fill" with one retry (Xp)
export async function fillControls(opts: {
	fields: FieldDef[];
	visualStyle?: string;
	shot: { description?: string };
	mood?: string;
	custom?: string;
}): Promise<Record<string, string | string[]>> {
	const provider = getProvider();
	if (provider.provider === 'none') throw new Error('Add an API key in settings to use AI fill.');
	const contextFields: ContextField[] = [];
	if (opts.visualStyle) contextFields.push({ label: 'Visual Style', value: opts.visualStyle });
	if (opts.shot.description) contextFields.push({ label: 'Description', value: opts.shot.description });
	const instruction = buildControlsInstruction(opts.fields, opts.mood, opts.custom);
	const run = async () => {
		const res = await dopAssist({
			...provider,
			agent: 'custom',
			field: 'Shot controls',
			sourceText: '',
			customInstruction: instruction,
			contextFields,
		});
		return parseControlLines(res.text || '');
	};
	let parsed = await run();
	let result = applyControls(opts.fields, parsed);
	if (result.invalid) {
		parsed = await run();
		result = applyControls(opts.fields, parsed);
	}
	if (result.invalid) throw new Error("Couldn't generate a valid configuration — try again");
	if (!result.any) throw new Error("Couldn't generate a valid configuration — try again");
	return result.patch;
}

// Video (Kling) generation settings — model, mode, duration, aspect ratio —
// persisted locally and read fresh at generation time. The model also mirrors
// into the API-keys store (klingModel) so getKling() stays the single source
// of truth for which model signs/runs.

export interface VideoSettings {
	model: string;
	mode: 'std' | 'pro';
	duration: '5' | '10';
	aspectRatio: 'auto' | '16:9' | '9:16' | '1:1';
}

const KEY = 'framepick:videoSettings:v1';
const DEFAULTS: VideoSettings = { model: 'kling-v3', mode: 'std', duration: '5', aspectRatio: 'auto' };

export interface KlingModelInfo {
	id: string;
	label: string;
	note: string;
}

// Image-to-video models, newest first.
export const KLING_MODELS: KlingModelInfo[] = [
	{ id: 'kling-v3', label: 'Kling 3.0', note: 'Newest — best motion, native audio' },
	{ id: 'kling-v2-6', label: 'Kling 2.6', note: 'Fast, high quality' },
	{ id: 'kling-v2-5-turbo', label: 'Kling 2.5 Turbo', note: 'Quickest renders' },
	{ id: 'kling-v2-1-master', label: 'Kling 2.1 Master', note: 'Cinematic detail' },
	{ id: 'kling-v1-6', label: 'Kling 1.6', note: 'Legacy — lightest cost' },
];

// Approximate API units per generation, normalised to a Standard 5s clip.
// Kling bills in resource-pack "units"; exact rates vary, so these are shown
// as estimates (the live remaining balance is authoritative).
const BASE_UNITS: Record<string, number> = {
	'kling-v3': 3,
	'kling-v2-6': 2,
	'kling-v2-5-turbo': 2,
	'kling-v2-1-master': 2,
	'kling-v1-6': 1,
};

export function estimateUnits(model: string, mode: 'std' | 'pro', duration: '5' | '10'): number {
	const base = BASE_UNITS[model] ?? 2;
	return base * (duration === '10' ? 2 : 1) * (mode === 'pro' ? 2 : 1);
}

export function loadVideoSettings(): VideoSettings {
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
		if (raw && typeof raw === 'object') return { ...DEFAULTS, ...raw };
	} catch {
		/* ignore */
	}
	return { ...DEFAULTS };
}

export function saveVideoSettings(s: VideoSettings): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(s));
	} catch {
		/* non-fatal */
	}
}

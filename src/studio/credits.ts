// Video credit ledger + cost model (local, persisted). Available credits start
// at 500.8K and are deducted when a video generation is dispatched.
const KEY = 'framepick:credits:v1';
const DEFAULT = 500800;

export function loadCredits(): number {
	try {
		const v = JSON.parse(localStorage.getItem(KEY) || 'null');
		return typeof v === 'number' && v >= 0 ? v : DEFAULT;
	} catch {
		return DEFAULT;
	}
}

export function saveCredits(n: number): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(Math.max(0, Math.round(n))));
	} catch {
		/* quota */
	}
}

// Relative compute cost per model (Standard 5s, batch 1 baseline).
const MODEL_BASE: Record<string, number> = {
	'kling-v3': 3,
	'kling-v2-6': 2,
	'kling-v2-5-turbo': 2,
	'kling-v2-1-master': 2,
	'kling-v1-6': 1,
};

export interface VideoCostInput {
	model: string;
	quality: string; // 'std' | 'pro'
	duration: number; // seconds (3–15)
	aspect: string;
	resolution?: string;
	batch: number;
}

// totalCost = baseCost(model, quality, resolution, duration, aspect) × batchSize
export function videoCost(i: VideoCostInput): number {
	const base = MODEL_BASE[i.model] ?? 2;
	const quality = i.quality === 'pro' ? 2 : 1;
	const durationMult = Math.max(1, i.duration) / 5; // scale against the 5s baseline
	const resolution = i.resolution === '4K' ? 2 : i.resolution === '2K' ? 1.5 : 1;
	const aspect = 1; // aspect ratio does not change Kling cost
	const per = Math.max(1, Math.ceil(base * quality * durationMult * resolution * aspect));
	return per * Math.max(1, i.batch);
}

// 500800 -> "500.8K", 1500000 -> "1.5M", 980 -> "980"
export function formatCredits(n: number): string {
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
	if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
	return String(Math.round(n));
}

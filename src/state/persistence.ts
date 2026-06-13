import type { ApiKeys, MoodItem, MoodView, Scene, Shot, ShotListState } from './types';
import { emptyFrame, emptyMotion, newScene, newShot } from './defaults';

// ---------------------------------------------------------------------------
// Shot list (localStorage, with migration from older versions)
// ---------------------------------------------------------------------------
const SHOTLIST_KEY = 'nframe:shotList:v3';

// Does this lighting object carry any value?
function anyLighting(l: Shot['frame']['lighting'] | undefined): boolean {
	if (!l) return false;
	return !!(
		l.timeOfDay ||
		l.direction ||
		l.quality ||
		l.colorTemp ||
		l.keyContrast ||
		(l.lightSource && l.lightSource.length) ||
		(l.atmospheric && l.atmospheric.length) ||
		(l.special && l.special.length)
	);
}

function hydrateShot(s: Shot): Shot {
	const frame = s.frame
		? { ...s.frame, lightingOverride: s.frame.lightingOverride ?? anyLighting(s.frame.lighting), lightingStyle: s.frame.lightingStyle ?? '' }
		: s.frame;
	return {
		...s,
		frame,
		generating: false,
		error: '',
		talentRef: s.talentRef || s.refImage || null,
		sketchRef: s.sketchRef || null,
		motionRef: s.motionRef || null,
	};
}

function hydrateScenes(scenes: Scene[]): Scene[] {
	return (scenes || []).map((sc) => ({ ...sc, shots: (sc.shots || []).map(hydrateShot) }));
}

// migrate a v2 shot (flat fields) into the v3 shape
function migrateShotV2(raw: Record<string, unknown>, i: number): Shot {
	if (raw.frame && raw.motion) return raw as unknown as Shot;
	const s = newShot((raw.number as number) || i + 1);
	s.id = (raw.id as string) || s.id;
	s.description = (raw.description as string) || '';
	s.images = (raw.images as Shot['images']) || [];
	if (raw.shotSize) s.frame.shotSize = raw.shotSize as string;
	if (raw.shotType) s.frame.shotType = raw.shotType as string;
	if (raw.lens) s.frame.lens.focalLength = raw.lens as string;
	if (raw.movement) s.motion.cameraMovement = raw.movement as string;
	if (raw.equipment) s.motion.equipment = raw.equipment as string;
	return s;
}

export function loadShotList(): ShotListState | null {
	try {
		const v3 = JSON.parse(localStorage.getItem(SHOTLIST_KEY) || 'null');
		if (v3 && Array.isArray(v3.scenes)) return { ...v3, scenes: hydrateScenes(v3.scenes) };
		const v2 = JSON.parse(localStorage.getItem('nframe:shotList:v2') || 'null');
		if (v2 && Array.isArray(v2.scenes)) {
			return {
				visualStyle: '',
				scenes: hydrateScenes(
					v2.scenes.map((sc: Record<string, unknown>) => ({
						...sc,
						aspectRatio: (sc.aspectRatio as string) || '16:9',
						shots: ((sc.shots as Record<string, unknown>[]) || []).map(migrateShotV2),
					})) as Scene[],
				),
				selectedSceneId: v2.selectedSceneId || v2.scenes[0]?.id || '',
				view: v2.view || 'g3',
			};
		}
	} catch {
		/* ignore */
	}
	return null;
}

export function saveShotList(state: ShotListState): void {
	try {
		localStorage.setItem(SHOTLIST_KEY, JSON.stringify(state));
	} catch {
		/* quota / serialization errors are non-fatal */
	}
}

export function initialShotList(): ShotListState {
	const loaded = loadShotList();
	if (loaded && loaded.scenes.length) {
		return {
			visualStyle: loaded.visualStyle || '',
			scenes: loaded.scenes,
			selectedSceneId: loaded.selectedSceneId || loaded.scenes[0].id,
			view: loaded.view || 'g3',
		};
	}
	const scene = newScene(1);
	return { visualStyle: '', scenes: [scene], selectedSceneId: scene.id, view: 'g3' };
}

// keep emptyFrame/emptyMotion reachable for callers that reset fields
export { emptyFrame, emptyMotion };

// ---------------------------------------------------------------------------
// API keys (localStorage)
// ---------------------------------------------------------------------------
const API_KEYS_KEY = 'dop:apiKeys';

export function loadApiKeys(): ApiKeys {
	try {
		const raw = localStorage.getItem(API_KEYS_KEY);
		if (raw) return { openai: '', anthropic: '', klingModel: 'kling-v3', ...JSON.parse(raw) };
	} catch {
		/* ignore */
	}
	return { openai: '', anthropic: '', klingModel: 'kling-v3' };
}

export function saveApiKeys(keys: ApiKeys): void {
	localStorage.setItem(
		API_KEYS_KEY,
		JSON.stringify({
			openai: keys.openai || '',
			anthropic: keys.anthropic || '',
			klingAccessKey: keys.klingAccessKey || '',
			klingSecretKey: keys.klingSecretKey || '',
			klingModel: keys.klingModel || 'kling-v3',
		}),
	);
}

// Kling credentials for video generation, or null when not configured.
export function getKling(): { accessKey: string; secretKey: string; model: string } | null {
	const k = loadApiKeys();
	// strip ALL whitespace — keys are alphanumeric, and a pasted space/newline
	// is the usual cause of Kling "signature invalid".
	const accessKey = (k.klingAccessKey || '').replace(/\s+/g, '');
	const secretKey = (k.klingSecretKey || '').replace(/\s+/g, '');
	if (!accessKey || !secretKey) return null;
	return { accessKey, secretKey, model: (k.klingModel || 'kling-v3').trim() };
}

export type Provider =
	| { provider: 'openai'; openaiApiKey: string }
	| { provider: 'anthropic'; anthropicApiKey: string }
	| { provider: 'none' };

export function getProvider(): Provider {
	const k = loadApiKeys();
	const openai = (k.openai || '').trim();
	const anthropic = (k.anthropic || '').trim();
	if (openai) return { provider: 'openai', openaiApiKey: openai };
	if (anthropic) return { provider: 'anthropic', anthropicApiKey: anthropic };
	return { provider: 'none' };
}

// ---------------------------------------------------------------------------
// Moodboard — localStorage snapshot + IndexedDB (authoritative, larger)
// ---------------------------------------------------------------------------
const MOODBOARD_LS_KEY = 'nframe:moodboard:v1';
const MOODBOARD_IDB_NAME = 'nframe-moodboard';

export interface MoodboardState {
	items: MoodItem[];
	view: MoodView;
}

export function loadMoodboardLocal(): MoodboardState {
	try {
		const raw = JSON.parse(localStorage.getItem(MOODBOARD_LS_KEY) || 'null');
		if (raw && Array.isArray(raw.items)) return raw;
	} catch {
		/* ignore */
	}
	return { items: [], view: { x: 0, y: 0, scale: 1 } };
}

function openIdb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('no-idb'));
			return;
		}
		const req = indexedDB.open(MOODBOARD_IDB_NAME, 1);
		req.onupgradeneeded = () => req.result.createObjectStore('kv');
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export function loadMoodboardIdb(): Promise<MoodboardState | null> {
	return openIdb()
		.then(
			(db) =>
				new Promise<MoodboardState | null>((resolve) => {
					const req = db.transaction('kv', 'readonly').objectStore('kv').get('state');
					req.onsuccess = () => resolve((req.result as MoodboardState) || null);
					req.onerror = () => resolve(null);
				}),
		)
		.catch(() => null);
}

export function saveMoodboardIdb(state: MoodboardState): Promise<boolean> {
	return openIdb()
		.then(
			(db) =>
				new Promise<boolean>((resolve) => {
					const tx = db.transaction('kv', 'readwrite');
					tx.objectStore('kv').put(state, 'state');
					tx.oncomplete = () => resolve(true);
					tx.onerror = () => resolve(false);
					tx.onabort = () => resolve(false);
				}),
		)
		.catch(() => false);
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

// Read a File into a data URL ref-image (Xs)
export function fileToRefImage(file: File): Promise<{ id: string; src: string; originalUrl: string; name: string }> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () =>
			resolve({
				id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				src: reader.result as string,
				originalUrl: reader.result as string,
				name: file.name,
			});
		reader.readAsDataURL(file);
	});
}

// Downscale a data/remote URL to <= maxEdge, returning a JPEG data URL (jh)
export function downscaleImage(url: string, maxEdge = 1280): Promise<string> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const ratio = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
			if (ratio >= 1) {
				resolve(url);
				return;
			}
			const w = Math.round(img.naturalWidth * ratio);
			const h = Math.round(img.naturalHeight * ratio);
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			try {
				canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
				resolve(canvas.toDataURL('image/jpeg', 0.86));
			} catch {
				resolve(url);
			}
		};
		img.onerror = () => resolve(url);
		img.src = url;
	});
}

// Download an image URL/data URL as a PNG (Bp)
export async function downloadImage(url: string, name = 'nframe-shot'): Promise<void> {
	const filename = `${String(name).replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'nframe-shot'}.png`;
	const trigger = (href: string, revoke?: boolean) => {
		const a = document.createElement('a');
		a.href = href;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1500);
	};
	try {
		if (url.startsWith('data:')) {
			trigger(url);
			return;
		}
		const blob = await (await fetch(url, { mode: 'cors' })).blob();
		trigger(URL.createObjectURL(blob), true);
	} catch {
		window.open(url, '_blank', 'noopener');
	}
}

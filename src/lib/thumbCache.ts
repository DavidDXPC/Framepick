import { useEffect, useRef, useState } from 'react';
import { generateImage, getProvider } from './aiAssist';

// IndexedDB store of generated example thumbnails, keyed by stable option id.
// Generated once (lazily, low quality) and reused forever.
const DB_NAME = 'nframe-thumbs';
const STORE = 'kv';

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('no-idb'));
			return;
		}
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

// Static thumbnails bundled in the project folder (public/thumbs/). These are
// generated once by scripts/gen-thumbs.mjs, committed to the repo, and shipped
// with the app — so they look identical for everyone and cost no API calls.
// A manifest lists which ids exist as files; we need it because the Worker's
// SPA fallback returns index.html (200) for missing paths, so a bare fetch of
// a .jpg can't tell "exists" from "missing".
let manifestPromise: Promise<Set<string>> | null = null;
function staticManifest(): Promise<Set<string>> {
	if (manifestPromise) return manifestPromise;
	manifestPromise = fetch('/thumbs/manifest.json', { cache: 'force-cache' })
		.then((r) => (r.ok ? r.json() : null))
		.then((j) => new Set<string>(Array.isArray(j?.ids) ? j.ids : []))
		.catch(() => new Set<string>());
	return manifestPromise;
}
export async function staticThumbUrl(id: string): Promise<string | null> {
	const set = await staticManifest();
	return set.has(id) ? `/thumbs/${id}.jpg` : null;
}

export function getThumb(id: string): Promise<string | null> {
	return openDb()
		.then(
			(db) =>
				new Promise<string | null>((resolve) => {
					const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
					r.onsuccess = () => resolve((r.result as string) || null);
					r.onerror = () => resolve(null);
				}),
		)
		.catch(() => null);
}

function putThumb(id: string, dataUrl: string): Promise<void> {
	return openDb()
		.then(
			(db) =>
				new Promise<void>((resolve) => {
					const tx = db.transaction(STORE, 'readwrite');
					tx.objectStore(STORE).put(dataUrl, id);
					tx.oncomplete = () => resolve();
					tx.onerror = () => resolve();
				}),
		)
		.catch(() => {});
}

// Concurrency cap + in-flight de-duplication so opening a category doesn't fire
// dozens of simultaneous generations.
const MAX_CONCURRENT = 3;
let active = 0;
const queue: (() => void)[] = [];
const inFlight = new Map<string, Promise<string | null>>();

function slot(): Promise<void> {
	if (active < MAX_CONCURRENT) {
		active++;
		return Promise.resolve();
	}
	return new Promise<void>((resolve) => queue.push(() => resolve())).then(() => {
		active++;
	});
}
function release() {
	active--;
	const next = queue.shift();
	if (next) next();
}

export function ensureThumb(id: string, prompt: string): Promise<string | null> {
	if (inFlight.has(id)) return inFlight.get(id)!;
	const job = (async () => {
		const stat = await staticThumbUrl(id);
		if (stat) return stat;
		const cached = await getThumb(id);
		if (cached) return cached;
		const provider = getProvider();
		if (provider.provider === 'none') return null;
		await slot();
		try {
			const res = await generateImage({ ...provider, prompt, size: '1024x1024', quality: 'low', background: 'opaque', outputFormat: 'jpeg' });
			const src = (res.image as string) || ((res.images as { src: string }[]) || [])[0]?.src || (res.url as string);
			if (src) {
				await putThumb(id, src);
				return src;
			}
			return null;
		} catch {
			return null;
		} finally {
			release();
		}
	})();
	inFlight.set(id, job);
	job.finally(() => inFlight.delete(id));
	return job;
}

export interface ThumbState {
	src: string | null;
	loading: boolean;
	error: boolean;
}

// Resolve an option's thumbnail offline-first: bundled static file → previously
// generated AI thumb (IDB) → the procedural offline library (`offline`), which
// is instant and needs no API key. Nothing is auto-generated on open anymore;
// `ensureThumb` stays available for explicit, user-initiated generation.
export function useThumb(id: string, _prompt: string, enabled: boolean, offline?: string): ThumbState {
	const [state, setState] = useState<ThumbState>({ src: offline || null, loading: false, error: false });
	const idRef = useRef(id);
	idRef.current = id;
	useEffect(() => {
		let alive = true;
		// offline library renders immediately; upgrades below swap in richer art
		setState({ src: offline || null, loading: false, error: false });
		(async () => {
			// 1) bundled static file (no key needed, identical for everyone)
			const stat = await staticThumbUrl(id);
			if (!alive) return;
			if (stat) {
				setState({ src: stat, loading: false, error: false });
				return;
			}
			// 2) previously generated + cached in this browser
			const cached = await getThumb(id);
			if (!alive || idRef.current !== id) return;
			if (cached) setState({ src: cached, loading: false, error: false });
		})();
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, enabled]);
	return state;
}

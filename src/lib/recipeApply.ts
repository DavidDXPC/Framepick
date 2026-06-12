import type { DeepPartial, Frame } from '../state/types';
import { emptyFrame } from '../state/defaults';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Leaf = any;

// Leaf paths a recipe can set. Lighting + lens are nested; the rest are flat.
const LIGHTING_LEAVES = ['timeOfDay', 'lightSource', 'direction', 'quality', 'colorTemp', 'keyContrast', 'atmospheric', 'special'] as const;
const LENS_LEAVES = ['focalLength', 'character'] as const;
const FLAT_LEAVES = ['shotSize', 'shotType', 'framing', 'focusDof', 'dutch', 'aspect'] as const;

function isEmpty(v: Leaf): boolean {
	if (Array.isArray(v)) return v.length === 0;
	return v === undefined || v === null || v === '';
}

function equals(a: Leaf, b: Leaf): boolean {
	if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
	return (a ?? '') === (b ?? '');
}

const emptyFor = (v: Leaf): Leaf => (Array.isArray(v) ? [] : '');

// Resolve one leaf: keep manual edits, replace recipe-owned, clear dropped.
function resolveLeaf(current: Leaf, prevVal: Leaf, nextVal: Leaf, hasNext: boolean, hasPrev: boolean): Leaf {
	const ownedOrEmpty = isEmpty(current) || (hasPrev && equals(current, prevVal));
	if (hasNext) return ownedOrEmpty ? nextVal : current;
	// next recipe doesn't define it: clear only if it was recipe-owned and untouched
	if (hasPrev && equals(current, prevVal)) return emptyFor(current);
	return current;
}

// Merge a new recipe's Frame into the current Frame, treating fields the
// PREVIOUS recipe set (and the user hasn't changed) as recipe-owned, so they
// refresh on a recipe switch while manual edits are preserved.
export function mergeRecipeFrame(current: Frame, prevRecipeFrame: DeepPartial<Frame> | null, nextRecipeFrame: DeepPartial<Frame>): Frame {
	const base = emptyFrame();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const out: any = { ...current, lighting: { ...current.lighting }, lens: { ...current.lens } };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const prev = (prevRecipeFrame || {}) as any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const next = nextRecipeFrame as any;

	for (const k of LIGHTING_LEAVES) {
		const hasPrev = prev.lighting ? k in prev.lighting : false;
		const hasNext = next.lighting ? k in next.lighting : false;
		out.lighting[k] = resolveLeaf(current.lighting[k], prev.lighting?.[k], next.lighting?.[k] ?? base.lighting[k], hasNext, hasPrev);
	}
	for (const k of LENS_LEAVES) {
		const hasPrev = prev.lens ? k in prev.lens : false;
		const hasNext = next.lens ? k in next.lens : false;
		out.lens[k] = resolveLeaf(current.lens[k], prev.lens?.[k], next.lens?.[k] ?? '', hasNext, hasPrev);
	}
	for (const k of FLAT_LEAVES) {
		const hasPrev = k in prev;
		const hasNext = k in next;
		out[k] = resolveLeaf((current as Leaf)[k], prev[k], next[k] ?? '', hasNext, hasPrev);
	}
	// A recipe that specifies lighting must turn the per-shot override on so its
	// lighting actually applies (lighting is off by default).
	if (next.lighting && Object.keys(next.lighting).length) out.lightingOverride = true;
	return out as Frame;
}

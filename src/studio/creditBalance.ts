// Single source of truth for the available Kling credit balance, shared across
// the app and kept in sync with the real account. The balance is fetched from
// the same Kling endpoint a Credit-Usage view uses (klingCredits), cached
// locally for instant paint, and updated optimistically on spend.
import { getKling } from '../state/persistence';
import { klingCredits } from '../lib/aiAssist';

const KEY = 'framepick:kling-balance:v1';
let balance: number | null = load();
let inflight = false;
const subs = new Set<() => void>();

function load(): number | null {
	try {
		const v = JSON.parse(localStorage.getItem(KEY) || 'null');
		return typeof v === 'number' && v >= 0 ? v : null;
	} catch {
		return null;
	}
}
function save(): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(balance));
	} catch {
		/* quota */
	}
}
function emit(): void {
	subs.forEach((f) => f());
}

export function getBalance(): number | null {
	return balance;
}

export function subscribeBalance(fn: () => void): () => void {
	subs.add(fn);
	return () => subs.delete(fn);
}

// Pull the live remaining balance from Kling (no-op without valid keys).
export async function refreshBalance(): Promise<void> {
	const k = getKling();
	if (!k || inflight) return;
	inflight = true;
	try {
		const r = await klingCredits(k.accessKey, k.secretKey);
		if (!r.error && typeof r.remaining === 'number') {
			balance = r.remaining;
			save();
			emit();
		}
	} catch {
		/* leave last-known */
	} finally {
		inflight = false;
	}
}

// Optimistic local decrement when a generation starts; trued-up by refresh.
export function noteSpend(cost: number): void {
	if (balance != null) {
		balance = Math.max(0, balance - cost);
		save();
		emit();
	}
}

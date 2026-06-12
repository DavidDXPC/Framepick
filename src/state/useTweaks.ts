import { useCallback, useState } from 'react';
import type { Tweaks } from './types';

// gd in the original: tweak state that also broadcasts changes to the host
// editing environment (postMessage) so the live design-tweak panel can sync.
export function useTweaks(initial: Tweaks): [Tweaks, (keyOrObj: keyof Tweaks | Partial<Tweaks>, val?: unknown) => void] {
	const [state, setState] = useState<Tweaks>(initial);
	const set = useCallback((keyOrObj: keyof Tweaks | Partial<Tweaks>, val?: unknown) => {
		const edits = (typeof keyOrObj === 'object' && keyOrObj !== null ? keyOrObj : { [keyOrObj]: val }) as Partial<Tweaks>;
		setState((s) => ({ ...s, ...edits }));
		window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
		window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
	}, []);
	return [state, set];
}

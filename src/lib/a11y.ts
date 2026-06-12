import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Modal accessibility: focus the dialog on open, trap Tab within it, close on
// Escape, and restore focus to the previously-focused element on unmount.
// Attach the returned ref to the dialog container (give it tabIndex={-1}).
export function useModalA11y<T extends HTMLElement>(onClose: () => void) {
	const ref = useRef<T>(null);
	useEffect(() => {
		const previouslyFocused = document.activeElement as HTMLElement | null;
		const el = ref.current;
		const focusables = () => (el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((e) => e.offsetParent !== null) : []);
		// focus the first control, or the dialog itself
		const first = focusables()[0];
		(first || el)?.focus?.();

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				onClose();
				return;
			}
			if (e.key === 'Tab' && el) {
				const f = focusables();
				if (!f.length) {
					e.preventDefault();
					el.focus();
					return;
				}
				const firstEl = f[0];
				const lastEl = f[f.length - 1];
				const active = document.activeElement as HTMLElement;
				if (e.shiftKey && (active === firstEl || active === el)) {
					e.preventDefault();
					lastEl.focus();
				} else if (!e.shiftKey && active === lastEl) {
					e.preventDefault();
					firstEl.focus();
				}
			}
		};
		document.addEventListener('keydown', onKey, true);
		return () => {
			document.removeEventListener('keydown', onKey, true);
			previouslyFocused?.focus?.();
		};
	}, [onClose]);
	return ref;
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

// useDismiss (Jn): close on outside-click / Escape; ignores clicks inside any
// .nf-anchored-pop (so nested portaled popovers don't dismiss their opener).
export function useDismiss(open: boolean, setOpen: (v: boolean) => void) {
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			const t = e.target as HTMLElement;
			if (ref.current && !ref.current.contains(t) && !t.closest?.('.nf-anchored-pop')) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);
	return ref as RefObject<HTMLElement>;
}

// AnchoredPopover (jr): a portaled, viewport-aware popover positioned under (or
// above) an anchor element.
export function AnchoredPopover({
	anchorRef,
	open,
	align = 'left',
	width = 240,
	estHeight = 340,
	children,
}: {
	anchorRef: RefObject<HTMLElement | null>;
	open: boolean;
	align?: 'left' | 'right';
	width?: number;
	estHeight?: number;
	children: ReactNode;
}) {
	const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
	useLayoutEffect(() => {
		if (!open) {
			setPos(null);
			return;
		}
		const place = () => {
			const el = anchorRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			const w = Math.min(width, window.innerWidth - 16);
			let left = align === 'right' ? r.right - w : r.left;
			left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
			const estH = estHeight;
			const below = r.bottom + 6;
			const top = below + estH > window.innerHeight - 8 && r.top - 6 - estH > 8 ? Math.max(8, r.top - 6 - estH) : below;
			const maxHeight = Math.max(160, window.innerHeight - top - 12);
			setPos({ top, left, width: w, maxHeight });
		};
		place();
		const onChange = () => place();
		window.addEventListener('scroll', onChange, true);
		window.addEventListener('resize', onChange);
		return () => {
			window.removeEventListener('scroll', onChange, true);
			window.removeEventListener('resize', onChange);
		};
	}, [open, align, width, estHeight, anchorRef]);
	if (!open || !pos) return null;
	return createPortal(
		<div className="nf-anchored-pop" style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, zIndex: 1400 }}>
			{children}
		</div>,
		document.body,
	);
}

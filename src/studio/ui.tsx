// nFrame Studio — tiny shared UI primitives (Spinner, NImg, Popover).
import type { ReactNode, CSSProperties } from 'react';

export function Spinner({ className = '' }: { className?: string }) {
	return <span className={'fp-spin ' + className} />;
}

// Real-image element (replaces the prototype's gradient placeholder).
export function NImg({
	src,
	className = '',
	fit = 'cover',
	style,
}: {
	src: string;
	className?: string;
	fit?: CSSProperties['objectFit'];
	style?: CSSProperties;
}) {
	return (
		<span className={'fp-photo ' + className}>
			<img
				src={src}
				alt=""
				draggable={false}
				style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, ...style }}
			/>
		</span>
	);
}

// Anchored popover — parent must be position:relative.
export function Popover({
	open,
	onClose,
	align,
	children,
}: {
	open: boolean;
	onClose: () => void;
	align?: 'left' | 'right';
	children: ReactNode;
}) {
	if (!open) return null;
	return (
		<>
			<div className="ns-pop-veil" onClick={onClose} />
			<div className={'ns-pop ' + (align || 'left')}>{children}</div>
		</>
	);
}

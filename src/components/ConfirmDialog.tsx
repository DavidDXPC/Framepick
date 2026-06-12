import { useEffect, useRef } from 'react';

export interface ConfirmRequest {
	title: string;
	message: string;
	actionLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
}

// Centered, Apple-alert-style confirmation. Replaces window.confirm so
// destructive actions get a proper focused dialog instead of the browser bar.
export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
	const confirmRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!request) return;
		confirmRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [request, onClose]);

	if (!request) return null;

	return (
		<div className="nf-confirm-scrim" onClick={onClose} role="presentation">
			<div className="nf-confirm" role="alertdialog" aria-modal="true" aria-label={request.title} onClick={(e) => e.stopPropagation()}>
				<strong className="nf-confirm-title">{request.title}</strong>
				<p className="nf-confirm-msg">{request.message}</p>
				<div className="nf-confirm-actions">
					<button type="button" className="nf-confirm-btn" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						ref={confirmRef}
						className={'nf-confirm-btn primary' + (request.danger ? ' danger' : '')}
						onClick={() => {
							request.onConfirm();
							onClose();
						}}
					>
						{request.actionLabel || 'Confirm'}
					</button>
				</div>
			</div>
		</div>
	);
}

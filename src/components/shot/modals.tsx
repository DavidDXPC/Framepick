import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { icons } from '../../lib/icons';
import { RECIPES, type Recipe } from '../../data/recipes';
import { loadMoodboardLocal } from '../../state/persistence';
import { assembleShotPrompt } from '../../lib/promptBuilder';
import { useModalA11y } from '../../lib/a11y';
import type { MoodItem, Shot } from '../../state/types';

// RecipesModal (yh)
export function RecipesModal({ onApply, onClose }: { onApply: (recipe: Recipe) => void; onClose: () => void }) {
	const dialogRef = useModalA11y<HTMLDivElement>(onClose);
	return createPortal(
		<div
			className="nf-fm-scrim"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="nf-fm-modal" role="dialog" aria-modal="true" aria-label="Prompt recipes" tabIndex={-1} ref={dialogRef}>
				<div className="nf-fm-modal-head">
					<span className="nf-fm-modal-title">
						{icons.wand}
						<span>Prompt recipes</span>
					</span>
					<button type="button" className="nf-fm-modal-x" onClick={onClose} aria-label="Close">
						{icons.x}
					</button>
				</div>
				<div className="nf-fm-modal-body">
					<div className="nf-recipe-grid">
						{RECIPES.map((r) => (
							<button key={r.id} type="button" className="nf-recipe-card" onClick={() => onApply(r)}>
								<span className="nf-recipe-name">{r.name}</span>
								<span className="nf-recipe-tag">{r.tag}</span>
								<span className="nf-recipe-desc">{r.visualStyle}</span>
							</button>
						))}
					</div>
				</div>
				<div className="nf-fm-modal-foot">
					<span style={{ fontSize: 12, color: 'var(--muted)' }}>Sets the Visual Style and seeds Frame defaults into shots you haven't configured yet.</span>
					<button type="button" className="nf-toolbar-btn" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

// BoardPicker (vh)
export function BoardPicker({
	target,
	onPick,
	onClose,
	boardImages,
}: {
	target: 'style' | 'talent' | 'sketch';
	onPick: (item: MoodItem) => void;
	onClose: () => void;
	boardImages?: MoodItem[];
}) {
	const source = Array.isArray(boardImages) && boardImages.length ? boardImages : loadMoodboardLocal().items || [];
	const images = useMemo(() => source.filter((it) => (it as MoodItem & { type?: string }).type === 'image' && it.src), [source]);
	const title = target === 'style' ? 'Derive Visual Style from board' : target === 'sketch' ? 'Pick a Composition reference (layout)' : 'Pick a Hero reference (subject)';
	const dialogRef = useModalA11y<HTMLDivElement>(onClose);
	return createPortal(
		<div
			className="nf-fm-scrim"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="nf-fm-modal" role="dialog" aria-modal="true" aria-label="Pick from Moodboard" tabIndex={-1} ref={dialogRef}>
				<div className="nf-fm-modal-head">
					<span className="nf-fm-modal-title">
						{icons.image}
						<span>{title}</span>
					</span>
					<button type="button" className="nf-fm-modal-x" onClick={onClose} aria-label="Close">
						{icons.x}
					</button>
				</div>
				<div className="nf-fm-modal-body">
					{images.length ? (
						<div className="nf-board-grid">
							{images.map((it) => (
								<button
									key={it.id}
									type="button"
									className="nf-board-pick"
									onClick={() => onPick(it)}
									title={target === 'style' ? 'Use as style reference & describe' : `Use as ${target} reference`}
								>
									<img src={it.src} alt={(it as MoodItem & { name?: string }).name || 'board image'} />
								</button>
							))}
						</div>
					) : (
						<div className="nf-board-empty">No images on the Moodboard yet. Add references on the Moodboard tab, then pick them here.</div>
					)}
				</div>
				<div className="nf-fm-modal-foot">
					<span style={{ fontSize: 12, color: 'var(--muted)' }}>
						{target === 'style'
							? 'Picking an image sets it as the style reference and auto-describes the look.'
							: "Picking an image attaches it as this shot's subject reference."}
					</span>
					<button type="button" className="nf-toolbar-btn" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

// PromptModal — view / copy / edit the exact gpt-image prompt for a shot.
export function PromptModal({
	shot,
	visualStyle,
	sceneAspect,
	onSaveOverride,
	onClose,
}: {
	shot: Shot;
	visualStyle: string;
	sceneAspect: string;
	onSaveOverride: (text: string | undefined) => void;
	onClose: () => void;
}) {
	const auto = assembleShotPrompt(visualStyle, shot, sceneAspect);
	const [draft, setDraft] = useState(shot.promptOverride?.trim() ? shot.promptOverride : auto);
	const [copied, setCopied] = useState(false);
	const dialogRef = useModalA11y<HTMLDivElement>(onClose);
	const isCustom = !!draft.trim() && draft.trim() !== auto.trim();
	const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(draft);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard blocked */
		}
	};
	const done = () => {
		const t = draft.trim();
		onSaveOverride(!t || t === auto.trim() ? undefined : t);
		onClose();
	};

	return createPortal(
		<div
			className="nf-fm-scrim"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="nf-fm-modal" role="dialog" aria-modal="true" aria-label="Generation prompt" tabIndex={-1} ref={dialogRef} style={{ maxWidth: 720 }}>
				<div className="nf-fm-modal-head">
					<span className="nf-fm-modal-title">
						{icons.spark}
						<span>Generation prompt</span>
					</span>
					<button type="button" className="nf-fm-modal-x" onClick={onClose} aria-label="Close">
						{icons.x}
					</button>
				</div>
				<div className="nf-fm-modal-body">
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
						<span style={{ fontSize: 12, color: 'var(--muted)' }}>
							{isCustom ? 'Custom — sent to the model exactly as written.' : 'Auto — built from your Visual Style, references and Frame. Edit to override.'}
						</span>
						<span style={{ fontSize: 11.5, color: words > 280 ? 'var(--danger)' : 'var(--faint)' }}>{words} words</span>
					</div>
					<textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						spellCheck={false}
						aria-label="Generation prompt text"
						className="mono"
						style={{
							width: '100%',
							minHeight: 260,
							resize: 'vertical',
							padding: '12px 14px',
							fontSize: 12.5,
							lineHeight: 1.6,
							border: '1px solid var(--border)',
							borderRadius: 10,
							background: 'var(--card-2)',
							color: 'var(--ink)',
							outline: 'none',
							whiteSpace: 'pre-wrap',
							boxSizing: 'border-box',
						}}
					/>
				</div>
				<div className="nf-fm-modal-foot">
					<div style={{ display: 'flex', gap: 8 }}>
						<button type="button" className="nf-toolbar-btn" onClick={copy}>
							{copied ? 'Copied' : 'Copy'}
						</button>
						<button type="button" className="nf-toolbar-btn" onClick={() => setDraft(auto)} disabled={!isCustom}>
							Reset to auto
						</button>
					</div>
					<button type="button" className="nf-primary-btn" onClick={done}>
						Done
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

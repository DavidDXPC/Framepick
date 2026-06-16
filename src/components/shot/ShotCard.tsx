import { useRef, useState } from 'react';
import { icons } from '../../lib/icons';
import { assembleShotPrompt, fieldChips, shotSignature } from '../../lib/promptBuilder';
import { fileToRefImage } from '../../state/persistence';
import { HERO_TOKEN } from '../../lib/framepickBridge';
import type { FieldChip, ImageItem, ImageSettings as ImageSettingsType, RefImage, Shot, Variant } from '../../state/types';
import { Spinner } from '../ui';
import { AnchoredPopover, useDismiss } from './popover';
import { MediaShell, Variants } from './media';
import { CompositionFrames } from './references';
import { EnhancePill, DESCRIPTION_ENHANCE_MODES } from './ai';
import { FrameMotionChips, type PatchFn } from './frameMotion';
import { ImageSettings, VariantCount } from './controls';
import { PromptModal } from './modals';

// Small inline marks matching the prototype's reference language.
const heroMark = (
	<svg
		viewBox="0 0 24 24"
		width="12"
		height="12"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M12 3l2.4 5.3L20 9l-4 3.9 1 5.6L12 16l-5 2.5 1-5.6L4 9l5.6-.7z" />
	</svg>
);
const layersMark = (
	<svg
		viewBox="0 0 24 24"
		width="12"
		height="12"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M12 3l9 5-9 5-9-5z" />
		<path d="M3 13l9 5 9-5" />
	</svg>
);
const frameMark = (
	<svg
		viewBox="0 0 24 24"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.7"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="8.4" />
		<path d="M12 3.6L9 12M20 9.5l-8.6 1M16.5 20l-3-8.4M4 14.5l8.6-1M7.5 4l3 8.4" />
	</svg>
);

// Workspace layout switcher — Flow / Stage / Stack (drives data-layout on .ns-grid).
const LAYOUT_OPTS: { v: string; label: string; icon: React.ReactNode }[] = [
	{
		v: 'flow',
		label: 'Flow',
		icon: (
			<svg viewBox="0 0 16 12" width={14} height={11} aria-hidden="true">
				<rect x={1} y={1.5} width={4} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
				<rect x={6} y={1.5} width={4} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
				<rect x={11} y={1.5} width={4} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
			</svg>
		),
	},
	{
		v: 'stage',
		label: 'Stage',
		icon: (
			<svg viewBox="0 0 16 12" width={14} height={11} aria-hidden="true">
				<rect x={1} y={1.5} width={6} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
				<rect x={8.5} y={1.5} width={6.5} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
			</svg>
		),
	},
	{
		v: 'stack',
		label: 'Stack',
		icon: (
			<svg viewBox="0 0 16 12" width={14} height={11} aria-hidden="true">
				<rect x={2} y={1.5} width={12} height={3.5} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
				<rect x={2} y={7} width={12} height={3.5} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
			</svg>
		),
	},
];

// RefSlot — a Hero or Composition reference slot in the prototype's card style.
// Upload / drop / clear / pick-from-Board, wired straight to the real ref state.
function RefSlot({
	kind,
	image,
	onChange,
	onPickBoard,
}: {
	kind: 'hero' | 'comp';
	image?: RefImage | null;
	onChange: (img: RefImage | null) => void;
	onPickBoard?: (() => void) | null;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const isHero = kind === 'hero';
	const read = async (file?: File) => {
		if (!file) return;
		onChange(await fileToRefImage(file));
	};
	const fileInput = (
		<input
			ref={inputRef}
			type="file"
			accept="image/*"
			hidden
			onChange={(e) => {
				read(e.target.files?.[0]);
				e.target.value = '';
			}}
		/>
	);

	if (!image) {
		return (
			<button
				type="button"
				className="ns-slot-add"
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => e.preventDefault()}
				onDrop={(e) => {
					e.preventDefault();
					read(e.dataTransfer.files?.[0]);
				}}
				title={
					isHero
						? 'Hero — the subject identity, kept consistent across the shot'
						: 'Composition — the layout / pose the Hero is placed into'
				}
			>
				{isHero ? heroMark : layersMark}
				<span>Add {isHero ? 'Hero' : 'Composition'}</span>
				{fileInput}
			</button>
		);
	}

	return (
		<div className={isHero ? 'ns-hero' : 'ns-comp'}>
			<button
				type="button"
				className="ns-slot-thumb"
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => e.preventDefault()}
				onDrop={(e) => {
					e.preventDefault();
					read(e.dataTransfer.files?.[0]);
				}}
				title="Click to replace"
			>
				<img src={image.src} alt={isHero ? 'Hero reference' : 'Composition reference'} />
				<span className="ns-thumb-replace">{icons.image}</span>
			</button>
			<div className="ns-slot-meta">
				<span className="ns-lab">
					{isHero ? heroMark : layersMark}
					<span className={'ns-tok' + (isHero ? '' : ' ns-tok-comp')}>{isHero ? '@hero' : '@composition'}</span>
				</span>
				<span className="ns-slot-sub">{isHero ? 'Subject identity — kept consistent' : 'Layout & framing only'}</span>
				{onPickBoard && (
					<button type="button" className="ns-slot-board" onClick={onPickBoard} title="Pick from Moodboard">
						{icons.list}
						<span>Board</span>
					</button>
				)}
			</div>
			<button type="button" className="ns-slot-x" title="Remove reference" onClick={() => onChange(null)}>
				{icons.x}
			</button>
			{fileInput}
		</div>
	);
}

// Renders the assembled prompt, highlighting any literal @hero token as a chip.
function PromptPreview({ text }: { text: string }) {
	const parts = text.split(HERO_TOKEN);
	return (
		<>
			{parts.map((part, i) => (
				<span key={i}>
					{part}
					{i < parts.length - 1 && <span className="nf-hero-token">@hero</span>}
				</span>
			))}
		</>
	);
}

export function ShotCard({
	shot,
	aspectRatio,
	projectAspect,
	visualStyle,
	layout,
	onLayout,
	onUpdate,
	onPatchShot,
	onDelete,
	onReset,
	onDuplicate,
	onMove,
	onEditImage,
	onGenerate,
	imageSettings,
	onImageSettings,
	onSetHeroVariant,
	onFavoriteVariant,
	onDeleteVariant,
	onBranchVariant,
	onPickBoardRef,
	onClearField,
	onApplyHeroFrames,
	heroBusy,
	heroProgress,
	onGenerateVideo,
	videoBusy,
	videoStatus,
}: {
	shot: Shot;
	aspectRatio: string;
	projectAspect: string;
	visualStyle: string;
	layout?: string;
	onLayout?: (v: string) => void;
	onUpdate: (patch: Partial<Shot>) => void;
	onPatchShot: PatchFn;
	onDelete: () => void;
	onReset: () => void;
	onDuplicate: () => void;
	onMove: (dir: number) => void;
	onEditImage: (index: number) => void;
	onGenerate: () => void;
	imageSettings: ImageSettingsType;
	onImageSettings: (s: ImageSettingsType) => void;
	onSetHeroVariant: (shotId: string, variantId: string) => void;
	onFavoriteVariant: (shotId: string, variantId: string) => void;
	onDeleteVariant: (shotId: string, variantId: string) => void;
	onBranchVariant: (shot: Shot, variant: Variant) => void;
	onPickBoardRef?: (shotId: string, target: 'talent' | 'sketch') => void;
	onClearField: (chip: FieldChip) => void;
	onApplyHeroFrames?: (() => void) | null;
	heroBusy?: boolean;
	heroProgress?: string;
	onGenerateVideo?: (() => void) | null;
	videoBusy?: boolean;
	videoStatus?: string;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useDismiss(menuOpen, setMenuOpen) as React.RefObject<HTMLDivElement>;
	const menuBtnRef = useRef<HTMLButtonElement>(null);
	const [promptOpen, setPromptOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	const lay = layout === 'flow' || layout === 'stage' || layout === 'stack' ? layout : 'flow';
	const hasImages = (shot.images || []).length > 0;
	const stale = hasImages && shot.lastGeneratedSig !== shotSignature(shot);
	const genLabel = hasImages ? (stale ? 'Update Preview' : 'Regenerate') : 'Generate';
	const primary = !hasImages || stale;
	const hasMotion = !!shot.motionRef?.frames?.length;

	const status: 'gen' | 'ready' | 'draft' = shot.generating ? 'gen' : hasImages ? 'ready' : 'draft';
	const statusLabel = status === 'gen' ? 'Generating' : status === 'ready' ? 'Ready' : 'Draft';

	const chips = fieldChips(shot);
	const promptText = shot.promptOverride?.trim() ? shot.promptOverride.trim() : assembleShotPrompt(visualStyle, shot, aspectRatio);

	const copyPrompt = async () => {
		try {
			await navigator.clipboard.writeText(promptText);
			setCopied(true);
			setTimeout(() => setCopied(false), 1400);
		} catch {
			/* clipboard unavailable */
		}
	};

	return (
		<article className="ns-ws">
			<div className="ns-ws-head">
				<div className="ns-ws-titles">
					<div className="ns-ws-titlerow">
						<input
							className="ns-ws-title"
							value={shot.title ?? ''}
							placeholder={`Shot ${String(shot.number).padStart(2, '0')}`}
							aria-label="Shot title"
							onChange={(e) => onUpdate({ title: e.target.value })}
						/>
						<span className="ns-chip">{String(shot.number).padStart(2, '0')}</span>
						<span className={'ns-status ' + status}>
							<span className="ns-status-dot" />
							{statusLabel}
						</span>
					</div>
				</div>
				<div className="ns-ws-actions">
					<div className="nf-seg" role="radiogroup" aria-label="Workspace layout">
						{LAYOUT_OPTS.map((o) => (
							<button
								key={o.v}
								type="button"
								role="radio"
								aria-checked={lay === o.v}
								title={`${o.label} layout`}
								aria-label={`${o.label} layout`}
								className={'nf-seg-btn nf-seg-ico' + (lay === o.v ? ' active' : '')}
								onClick={() => onLayout?.(o.v)}
							>
								{o.icon}
							</button>
						))}
					</div>
					<div className="nf-card-menu" ref={menuRef}>
						<button type="button" className="nf-icon-button" ref={menuBtnRef} onClick={() => setMenuOpen((o) => !o)} title="Shot options">
							{icons.more}
						</button>
						<AnchoredPopover anchorRef={menuBtnRef} open={menuOpen} align="right" width={196}>
							<div className="nf-popover nf-menu-popover">
								<button
									type="button"
									onClick={() => {
										onDuplicate();
										setMenuOpen(false);
									}}
								>
									<span className="nf-menu-row">
										{icons.copy}
										<span>Duplicate</span>
									</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onMove(-1);
										setMenuOpen(false);
									}}
								>
									<span className="nf-menu-row">
										{icons.up}
										<span>Move up</span>
									</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onMove(1);
										setMenuOpen(false);
									}}
								>
									<span className="nf-menu-row">
										{icons.down}
										<span>Move down</span>
									</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onReset();
										setMenuOpen(false);
									}}
								>
									<span className="nf-menu-row">
										{icons.reset}
										<span>Reset</span>
									</span>
								</button>
								<button
									type="button"
									className="danger"
									onClick={() => {
										onDelete();
										setMenuOpen(false);
									}}
								>
									<span className="nf-menu-row">
										{icons.trash}
										<span>Delete</span>
									</span>
								</button>
							</div>
						</AnchoredPopover>
					</div>
				</div>
			</div>

			<div className="ns-grid" data-layout={lay}>
				{/* ── References ─────────────────────────────────────────── */}
				<section className="ns-panel ns-area-refs">
					<div className="ns-panel-head">
						<h2>References</h2>
						<span className={'ns-refmode ' + (hasMotion ? 'motion' : 'still')}>{hasMotion ? 'Motion' : 'Still'}</span>
					</div>
					<div className="ns-panel-body">
						<RefSlot
							kind="hero"
							image={shot.talentRef}
							onChange={(img) => onUpdate({ talentRef: img })}
							onPickBoard={onPickBoardRef ? () => onPickBoardRef(shot.id, 'talent') : null}
						/>
						{hasMotion && shot.motionRef ? (
							<CompositionFrames
								motionRef={shot.motionRef}
								description={shot.description}
								hasHeroRef={!!shot.talentRef?.src}
								heroBusy={heroBusy}
								heroProgress={heroProgress}
								onApplyHero={onApplyHeroFrames}
								onRemove={() => onUpdate({ motionRef: null, videoUrl: undefined })}
								videoUrl={shot.videoUrl}
								videoBusy={videoBusy}
								videoStatus={videoStatus}
								onGenerateVideo={onGenerateVideo}
								onRemoveVideo={() => onUpdate({ videoUrl: undefined })}
							/>
						) : (
							<RefSlot
								kind="comp"
								image={shot.sketchRef}
								onChange={(img) => onUpdate({ sketchRef: img })}
								onPickBoard={onPickBoardRef ? () => onPickBoardRef(shot.id, 'sketch') : null}
							/>
						)}
						<p className="ns-refs-note">
							The <b>Hero</b> stays the subject; the <b>Composition</b> only lends its layout, framing and pose.
						</p>
					</div>
				</section>

				{/* ── Prompt ─────────────────────────────────────────────── */}
				<section className="ns-panel ns-area-prompt">
					<div className="ns-panel-head">
						<h2>Prompt</h2>
					</div>
					<div className="ns-panel-body">
						<div className="ns-prompt-descwrap">
							<textarea
								className="ns-prompt-desc"
								value={shot.description || ''}
								onChange={(e) => onUpdate({ description: e.target.value })}
								placeholder={
									hasMotion
										? 'Optional — name the subject to sharpen identity (e.g. a white DC running sneaker)…'
										: 'Describe the subject and its action (e.g. a sneaker floating, rotated 90°)…'
								}
								rows={3}
							/>
							<span className="ns-desc-enhance">
								<EnhancePill
									fieldLabel="Description"
									value={shot.description}
									visualStyle={visualStyle}
									description={shot.description}
									onResult={(v) => onUpdate({ description: v })}
									compact
									modes={DESCRIPTION_ENHANCE_MODES}
									talentImage={shot.talentRef?.src}
									sketchImage={shot.sketchRef?.src}
								/>
							</span>
						</div>

						<div className="ns-prompt-label">{icons.list} Assembled prompt</div>
						<div className="ns-prompt-box">
							<div className="ns-prompt-acts">
								<button
									type="button"
									className="ns-prompt-act"
									title={shot.promptOverride?.trim() ? 'Custom prompt set — view / edit' : 'View / edit the generation prompt'}
									onClick={() => setPromptOpen(true)}
								>
									{icons.edit}
								</button>
								<button type="button" className="ns-prompt-act" title="Copy full prompt" onClick={copyPrompt}>
									{copied ? icons.check : icons.copy}
								</button>
							</div>
							<PromptPreview text={promptText} />
						</div>

						<div className="ns-tools-sep" />
						<div className="ns-prompt-label">{frameMark} Cinematography</div>
						<FrameMotionChips shot={shot} projectAspect={projectAspect} visualStyle={visualStyle} onPatch={onPatchShot} />
						{chips.length > 0 && (
							<div className="nf-config-summary" style={{ paddingTop: 10 }}>
								{chips.map((chip, i) => (
									<span className="nf-config-tag" key={i}>
										<em>{chip.label}</em>
										{chip.value}
										<button type="button" className="nf-config-tag-x" title={`Clear ${chip.label}`} onClick={() => onClearField(chip)}>
											{icons.x}
										</button>
									</span>
								))}
							</div>
						)}
					</div>
				</section>

				{/* ── Output ─────────────────────────────────────────────── */}
				<section className="ns-panel ns-area-out">
					<div className="ns-panel-head">
						<h2>Output</h2>
						<span className="ns-flex" />
						<span className={'ns-refmode ' + (hasMotion ? 'motion' : 'still')}>{hasMotion ? 'Motion' : 'Still'}</span>
					</div>
					<div className="ns-panel-body">
						<MediaShell
							shot={shot}
							aspectRatio={aspectRatio}
							visualStyle={visualStyle}
							onChange={(images: ImageItem[]) => onUpdate({ images })}
							onEdit={onEditImage}
							onGenerate={onGenerate}
						/>
						<Variants
							shot={shot}
							onSetHero={(id) => onSetHeroVariant(shot.id, id)}
							onFavorite={(id) => onFavoriteVariant(shot.id, id)}
							onDelete={(id) => onDeleteVariant(shot.id, id)}
							onBranch={(v) => onBranchVariant(shot, v)}
						/>
					</div>
					<div className="ns-out-foot">
						<VariantCount value={imageSettings.variations} onChange={(n) => onImageSettings({ ...imageSettings, variations: n })} />
						<ImageSettings settings={imageSettings} onChange={onImageSettings} aspectRatio={aspectRatio} />
						<span className="ns-flex" />
						<button
							type="button"
							className={(primary ? 'nf-primary-btn' : 'nf-toolbar-btn') + ' nf-gen-action'}
							disabled={shot.generating}
							onClick={onGenerate}
						>
							{shot.generating ? <Spinner size={13} /> : null}
							<span>{shot.generating ? 'Generating…' : genLabel}</span>
							{!shot.generating && <span className="nf-gen-arrow">→</span>}
						</button>
					</div>
				</section>
			</div>

			{promptOpen && (
				<PromptModal
					shot={shot}
					visualStyle={visualStyle}
					sceneAspect={aspectRatio}
					onSaveOverride={(text) => onUpdate({ promptOverride: text })}
					onClose={() => setPromptOpen(false)}
				/>
			)}
		</article>
	);
}

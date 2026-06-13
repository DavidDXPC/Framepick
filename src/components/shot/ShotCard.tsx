import { useRef, useState } from 'react';
import { icons } from '../../lib/icons';
import { fieldChips, shotSignature } from '../../lib/promptBuilder';
import type { FieldChip, ImageItem, ImageSettings as ImageSettingsType, RefImage, Shot, Variant } from '../../state/types';
import { Spinner } from '../ui';
import { AnchoredPopover, useDismiss } from './popover';
import { MediaShell, Variants } from './media';
import { DescriptionBlock } from './references';
import { FrameMotionChips, type PatchFn } from './frameMotion';
import { ImageSettings, VariantCount } from './controls';
import { PromptModal } from './modals';

export function ShotCard({
	shot,
	aspectRatio,
	projectAspect,
	visualStyle,
	selected,
	onSelectChange,
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
	selected: boolean;
	onSelectChange?: (v: boolean) => void;
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
	onSendToBuild?: () => void;
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

	const hasImages = (shot.images || []).length > 0;
	const stale = hasImages && shot.lastGeneratedSig !== shotSignature(shot);
	const genLabel = hasImages ? (stale ? 'Update Preview' : 'Regenerate') : 'Generate';
	const primary = !hasImages || stale;

	const chips = fieldChips(shot);

	return (
		<article className="nf-shot-card">
			<header className="nf-shot-card-header">
				<label className="nf-checkbox">
					<input type="checkbox" checked={!!selected} onChange={(e) => onSelectChange?.(e.target.checked)} />
					<span />
				</label>
				<strong>Shot {String(shot.number).padStart(2, '0')}</strong>
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
			</header>

			<MediaShell shot={shot} aspectRatio={aspectRatio} visualStyle={visualStyle} onChange={(images: ImageItem[]) => onUpdate({ images })} onEdit={onEditImage} onGenerate={onGenerate} />

			<div className="nf-shot-card-body">
				<Variants
					shot={shot}
					onSetHero={(id) => onSetHeroVariant(shot.id, id)}
					onFavorite={(id) => onFavoriteVariant(shot.id, id)}
					onDelete={(id) => onDeleteVariant(shot.id, id)}
					onBranch={(v) => onBranchVariant(shot, v)}
				/>
				<DescriptionBlock
					value={shot.description}
					talentRef={shot.talentRef}
					sketchRef={shot.sketchRef}
					motionRef={shot.motionRef}
					visualStyle={visualStyle}
					onChange={(v) => onUpdate({ description: v })}
					onTalentRef={(img: RefImage | null) => onUpdate({ talentRef: img })}
					onSketchRef={(img: RefImage | null) => onUpdate({ sketchRef: img })}
					onPickBoard={onPickBoardRef ? (target) => onPickBoardRef(shot.id, target) : null}
					onRemoveMotion={() => onUpdate({ motionRef: null, videoUrl: undefined })}
					onApplyHeroFrames={onApplyHeroFrames}
					heroBusy={heroBusy}
					heroProgress={heroProgress}
					videoUrl={shot.videoUrl}
					videoBusy={videoBusy}
					videoStatus={videoStatus}
					onGenerateVideo={onGenerateVideo}
					onRemoveVideo={() => onUpdate({ videoUrl: undefined })}
				/>
				<FrameMotionChips shot={shot} projectAspect={projectAspect} visualStyle={visualStyle} onPatch={onPatchShot} />
				<div className="nf-card-action">
					<div className="nf-gen-controls">
						<VariantCount value={imageSettings.variations} onChange={(n) => onImageSettings({ ...imageSettings, variations: n })} />
						<button type="button" className={primary ? 'nf-primary-btn nf-gen-action' : 'nf-toolbar-btn nf-gen-action'} disabled={shot.generating} onClick={onGenerate}>
							{shot.generating ? <Spinner size={13} /> : null}
							<span>{shot.generating ? 'Generating…' : genLabel}</span>
							{!shot.generating && <span className="nf-gen-arrow">→</span>}
						</button>
						<button
							type="button"
							className={'nf-icon-button' + (shot.promptOverride?.trim() ? ' nf-imgset-gear' : '')}
							title={shot.promptOverride?.trim() ? 'Custom prompt set — view / edit' : 'View / edit the generation prompt'}
							aria-label="View or edit the generation prompt"
							onClick={() => setPromptOpen(true)}
						>
							{icons.list}
						</button>
						<ImageSettings settings={imageSettings} onChange={onImageSettings} aspectRatio={aspectRatio} />
					</div>
				</div>
				{chips.length > 0 && (
					<div className="nf-config-summary">
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

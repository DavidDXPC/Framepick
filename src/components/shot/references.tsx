import { useRef, useState } from 'react';
import { icons } from '../../lib/icons';
import { fileToRefImage } from '../../state/persistence';
import type { MotionRef, RefImage } from '../../state/types';
import { DESCRIPTION_ENHANCE_MODES, EnhancePill } from './ai';

// RefThumb (Zs): a single reference-image thumbnail with upload / drop / clear / Board.
export function RefThumb({
	image,
	onChange,
	title = 'Add reference image',
	onPickBoard,
	role,
}: {
	image?: RefImage | null;
	onChange: (img: RefImage | null) => void;
	title?: string;
	onPickBoard?: (() => void) | null;
	role?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const read = async (file?: File) => {
		if (!file) return;
		const img = await fileToRefImage(file);
		onChange(img);
	};
	return (
		<div className="nf-refthumb-wrap">
			{role && <span className="nf-ref-role-cap">{role}</span>}
			<div
				className={'nf-refthumb' + (image ? ' has' : '')}
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => e.preventDefault()}
				onDrop={(e) => {
					e.preventDefault();
					read(e.dataTransfer.files?.[0]);
				}}
				title={image ? `${role || 'Reference'} — click to replace` : title}
			>
				{image ? (
					<>
						<img src={image.src} alt="reference" />
						<button
							type="button"
							className="nf-refthumb-x"
							title="Remove reference"
							onClick={(e) => {
								e.stopPropagation();
								onChange(null);
							}}
						>
							{icons.x}
						</button>
					</>
				) : (
					icons.image
				)}
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
			</div>
			{onPickBoard && (
				<button type="button" className="nf-refthumb-board" title="Pick from Moodboard" onClick={onPickBoard}>
					{icons.list}
					<span>Board</span>
				</button>
			)}
		</div>
	);
}

// CompositionFrames: motion keyframes from FramePick occupying the Composition
// slot — layout & motion guides only. When "@hero applied" versions exist, a
// mini segmented control flips the strip between Source and @hero frames.
function CompositionFrames({
	motionRef,
	heroBusy,
	heroProgress,
	onApplyHero,
	onRemove,
}: {
	motionRef: MotionRef;
	heroBusy?: boolean;
	heroProgress?: string;
	onApplyHero?: (() => void) | null;
	onRemove: () => void;
}) {
	const hasHero = !!motionRef.heroFrames?.length;
	const [view, setView] = useState<'src' | 'hero'>(hasHero ? 'hero' : 'src');
	const frames = view === 'hero' && hasHero ? motionRef.heroFrames! : motionRef.frames;
	return (
		<div className="nf-comp-frames">
			<div className="nf-comp-frames-head">
				<span className="nf-ref-role-cap">Composition</span>
				{hasHero && (
					<span className="nf-comp-seg" role="tablist" aria-label="Composition frame source">
						<button type="button" className={view === 'src' ? 'on' : ''} onClick={() => setView('src')}>
							Source
						</button>
						<button type="button" className={view === 'hero' ? 'on' : ''} onClick={() => setView('hero')}>
							@hero
						</button>
					</span>
				)}
				<button type="button" className="nf-comp-x" title="Remove motion frames" onClick={onRemove}>
					{icons.x}
				</button>
			</div>
			<div className="nf-comp-strip" title="Motion keyframes — they guide the hero's placement, framing, scale, timing and continuity. They are never the final subject.">
				{frames.map((f, i) => (
					<figure key={`${view}-${i}`}>
						<img src={f.src} alt="" />
						<figcaption>{f.t.toFixed(1)}s</figcaption>
					</figure>
				))}
			</div>
			{onApplyHero && (
				<button
					type="button"
					className="nf-comp-apply"
					disabled={!!heroBusy}
					title="Generate new composition frames with your Hero as the subject — composition, camera angle, framing, lighting and motion structure are preserved."
					onClick={onApplyHero}
				>
					{heroBusy ? heroProgress || 'Applying @hero…' : 'Apply @hero to Frames'}
				</button>
			)}
		</div>
	);
}

// DescriptionBlock (oh): Hero + Composition reference slots above the description textarea.
export function DescriptionBlock({
	value,
	visualStyle,
	onChange,
	talentRef,
	sketchRef,
	motionRef,
	onTalentRef,
	onSketchRef,
	onPickBoard,
	onRemoveMotion,
	onApplyHeroFrames,
	heroBusy,
	heroProgress,
}: {
	value: string;
	visualStyle?: string;
	onChange: (v: string) => void;
	talentRef?: RefImage | null;
	sketchRef?: RefImage | null;
	motionRef?: MotionRef | null;
	onTalentRef: (img: RefImage | null) => void;
	onSketchRef: (img: RefImage | null) => void;
	onPickBoard?: ((target: 'talent' | 'sketch') => void) | null;
	onRemoveMotion?: () => void;
	onApplyHeroFrames?: (() => void) | null;
	heroBusy?: boolean;
	heroProgress?: string;
}) {
	return (
		<div className="nf-description">
			<div className="nf-ref-roles nf-ref-roles-top">
				<RefThumb
					image={talentRef}
					onChange={onTalentRef}
					role="Hero"
					title="Hero — the subject's identity. The generator keeps its look and places it into the shot."
					onPickBoard={onPickBoard ? () => onPickBoard('talent') : null}
				/>
				{motionRef?.frames?.length ? (
					<CompositionFrames motionRef={motionRef} heroBusy={heroBusy} heroProgress={heroProgress} onApplyHero={onApplyHeroFrames} onRemove={() => onRemoveMotion?.()} />
				) : (
					<RefThumb
						image={sketchRef}
						onChange={onSketchRef}
						role="Composition"
						title="Composition — the layout/pose the Hero is placed into (the Hero replaces its subject). Only the composition is used — not its background, scenery or lighting."
						onPickBoard={onPickBoard ? () => onPickBoard('sketch') : null}
					/>
				)}
			</div>
			<div className="nf-description-head">
				<span>Description</span>
				<em style={{ fontStyle: 'normal', color: 'var(--faint)', fontSize: 11.5, fontWeight: 400 }}>the subject &amp; what it's doing</em>
			</div>
			<div className="nf-description-body">
				<div className="nf-desc-input-wrap">
					<textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Describe the subject and its action (e.g. a sneaker floating, rotated 90°)…" rows={3} />
					<span className="nf-desc-enhance">
						<EnhancePill fieldLabel="Description" value={value} visualStyle={visualStyle} description={value} onResult={onChange} compact modes={DESCRIPTION_ENHANCE_MODES} talentImage={talentRef?.src} sketchImage={sketchRef?.src} />
					</span>
				</div>
			</div>
		</div>
	);
}

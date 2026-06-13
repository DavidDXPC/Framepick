import { useEffect, useRef, useState } from 'react';
import { icons } from '../../lib/icons';
import { fileToRefImage } from '../../state/persistence';
import { HERO_TOKEN, resolveHeroPrompt } from '../../lib/framepickBridge';
import type { MotionRef, RefImage } from '../../state/types';
import { DESCRIPTION_ENHANCE_MODES, EnhancePill } from './ai';
import { VideoSettings } from './VideoSettings';

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

// Renders prompt text with each @hero token highlighted as a chip.
function HeroPromptText({ prompt }: { prompt: string }) {
	const parts = prompt.split(HERO_TOKEN);
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

// The Composition module for FramePick motion handoffs — everything the
// workflow needs in one card: keyframe strip (Source / @hero views), the
// @hero video prompt, Copy (resolved against the Hero slot) and the
// "Apply @hero to Frames" generator.
function CompositionFrames({
	motionRef,
	description,
	hasHeroRef,
	heroBusy,
	heroProgress,
	onApplyHero,
	onRemove,
	videoUrl,
	videoBusy,
	videoStatus,
	onGenerateVideo,
	onRemoveVideo,
}: {
	motionRef: MotionRef;
	description?: string;
	hasHeroRef?: boolean;
	heroBusy?: boolean;
	heroProgress?: string;
	onApplyHero?: (() => void) | null;
	onRemove: () => void;
	videoUrl?: string;
	videoBusy?: boolean;
	videoStatus?: string;
	onGenerateVideo?: (() => void) | null;
	onRemoveVideo?: () => void;
}) {
	const hasHeroFrames = !!motionRef.heroFrames?.length;
	const [view, setView] = useState<'src' | 'hero'>(hasHeroFrames ? 'hero' : 'src');
	const [expanded, setExpanded] = useState(false);
	const [copied, setCopied] = useState(false);
	// when "Apply @hero to Frames" finishes, surface the new frames immediately
	const hadHeroFrames = useRef(hasHeroFrames);
	useEffect(() => {
		if (hasHeroFrames && !hadHeroFrames.current) setView('hero');
		hadHeroFrames.current = hasHeroFrames;
	}, [hasHeroFrames]);
	const frames = view === 'hero' && hasHeroFrames ? motionRef.heroFrames! : motionRef.frames;
	const prompt = motionRef.heroPrompt || motionRef.videoPrompt;

	const copyResolved = async () => {
		try {
			await navigator.clipboard.writeText(resolveHeroPrompt(prompt, { description, hasHeroRef }));
			setCopied(true);
			setTimeout(() => setCopied(false), 1400);
		} catch {
			/* clipboard unavailable */
		}
	};

	return (
		<div className="nf-comp-frames">
			<div className="nf-comp-frames-head">
				<span className="nf-ref-role-cap">Composition</span>
				<em className="nf-comp-meta">
					{motionRef.frames.length} keyframes · {motionRef.duration.toFixed(1)}s
				</em>
				{hasHeroFrames && (
					<span className="nf-comp-seg" role="tablist" aria-label="Composition frame source">
						<button type="button" className={view === 'src' ? 'on' : ''} onClick={() => setView('src')}>
							Source
						</button>
						<button type="button" className={view === 'hero' ? 'on' : ''} onClick={() => setView('hero')}>
							@hero
						</button>
					</span>
				)}
				<button type="button" className="nf-comp-x" title="Remove motion reference" onClick={onRemove}>
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
			{prompt && (
				<div className="nf-comp-promptwrap">
					<div
						className={'nf-comp-prompt' + (expanded ? ' expanded' : '')}
						role="button"
						tabIndex={0}
						aria-expanded={expanded}
						title={expanded ? 'Click to collapse' : 'Click to expand'}
						onClick={() => {
							// don't steal a text selection — only toggle on plain clicks
							if (window.getSelection()?.toString()) return;
							setExpanded((e) => !e);
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								setExpanded((x) => !x);
							}
						}}
					>
						<HeroPromptText prompt={prompt} />
					</div>
					<button type="button" className="nf-comp-copy" title="Copy the video prompt with @hero resolved to this shot's Hero" onClick={copyResolved}>
						{copied ? '✓' : icons.copy}
					</button>
				</div>
			)}
			{videoUrl && (
				<div className="nf-comp-video">
					<video src={videoUrl} controls playsInline preload="metadata" />
					<button type="button" className="nf-comp-video-x" title="Remove video" onClick={() => onRemoveVideo?.()}>
						{icons.x}
					</button>
				</div>
			)}
			<div className="nf-comp-foot">
				<span className="nf-comp-hint">{hasHeroRef ? '@hero → your Hero reference' : description?.trim() ? '@hero → your description' : 'Add a Hero or description to resolve @hero'}</span>
				{onApplyHero && (
					<button
						type="button"
						className="nf-comp-btn"
						disabled={!!heroBusy || !!videoBusy}
						title="Generate new composition frames with your Hero as the subject — composition, camera angle, framing, lighting and motion structure are preserved."
						onClick={onApplyHero}
					>
						{heroBusy ? heroProgress || 'Applying @hero…' : 'Apply @hero to Frames'}
					</button>
				)}
				{onGenerateVideo && <VideoSettings />}
				{onGenerateVideo && (
					<button
						type="button"
						className="nf-comp-btn primary"
						disabled={!!videoBusy || !!heroBusy}
						title="Animate this shot with Kling — the @hero prompt drives the motion from your generated still"
						onClick={onGenerateVideo}
					>
						{videoBusy ? videoStatus || 'Generating…' : videoUrl ? 'Regenerate video' : 'Generate video'}
					</button>
				)}
			</div>
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
	videoUrl,
	videoBusy,
	videoStatus,
	onGenerateVideo,
	onRemoveVideo,
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
	videoUrl?: string;
	videoBusy?: boolean;
	videoStatus?: string;
	onGenerateVideo?: (() => void) | null;
	onRemoveVideo?: () => void;
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
					<CompositionFrames
						motionRef={motionRef}
						description={value}
						hasHeroRef={!!talentRef?.src}
						heroBusy={heroBusy}
						heroProgress={heroProgress}
						onApplyHero={onApplyHeroFrames}
						onRemove={() => onRemoveMotion?.()}
						videoUrl={videoUrl}
						videoBusy={videoBusy}
						videoStatus={videoStatus}
						onGenerateVideo={onGenerateVideo}
						onRemoveVideo={onRemoveVideo}
					/>
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
					<textarea
						value={value || ''}
						onChange={(e) => onChange(e.target.value)}
						placeholder={
							motionRef?.frames?.length
								? 'Optional — the @hero prompt drives this shot. Name the subject to sharpen identity (e.g. a white DC running sneaker)…'
								: 'Describe the subject and its action (e.g. a sneaker floating, rotated 90°)…'
						}
						rows={3}
					/>
					<span className="nf-desc-enhance">
						<EnhancePill fieldLabel="Description" value={value} visualStyle={visualStyle} description={value} onResult={onChange} compact modes={DESCRIPTION_ENHANCE_MODES} talentImage={talentRef?.src} sketchImage={sketchRef?.src} />
					</span>
				</div>
			</div>
		</div>
	);
}

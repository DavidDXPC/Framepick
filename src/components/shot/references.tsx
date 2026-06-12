import { useRef } from 'react';
import { icons } from '../../lib/icons';
import { fileToRefImage } from '../../state/persistence';
import type { RefImage } from '../../state/types';
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

// DescriptionBlock (oh): Hero + Composition reference slots above the description textarea.
export function DescriptionBlock({
	value,
	visualStyle,
	onChange,
	talentRef,
	sketchRef,
	onTalentRef,
	onSketchRef,
	onPickBoard,
}: {
	value: string;
	visualStyle?: string;
	onChange: (v: string) => void;
	talentRef?: RefImage | null;
	sketchRef?: RefImage | null;
	onTalentRef: (img: RefImage | null) => void;
	onSketchRef: (img: RefImage | null) => void;
	onPickBoard?: ((target: 'talent' | 'sketch') => void) | null;
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
				<RefThumb
					image={sketchRef}
					onChange={onSketchRef}
					role="Composition"
					title="Composition — the layout/pose the Hero is placed into (the Hero replaces its subject). Only the composition is used — not its background, scenery or lighting."
					onPickBoard={onPickBoard ? () => onPickBoard('sketch') : null}
				/>
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

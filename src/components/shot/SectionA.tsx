import { useState } from 'react';
import { icons } from '../../lib/icons';
import type { RefImage } from '../../state/types';
import { Spinner } from '../ui';
import { RefThumb } from './references';
import { EnhancePill } from './ai';

// SectionA (uh): the project Visual Style block (reference + auto-describe + text).
export function SectionA({
	value,
	onChange,
	refImage,
	onRefImage,
	describing,
	onReset,
	onPickBoard,
	onRecipes,
	onHelp,
}: {
	value: string;
	onChange: (v: string) => void;
	refImage?: RefImage | null;
	onRefImage: (img: RefImage | null) => void;
	describing: boolean;
	onReset: () => void;
	onPickBoard?: (() => void) | null;
	onRecipes?: () => void;
	onHelp?: () => void;
}) {
	const [info, setInfo] = useState(false);
	return (
		<section className="nf-vs-card">
			<div className="nf-vs-head">
				<span className="nf-section-label">Section A — Visual Style</span>
				<div className="nf-vs-head-actions">
					{onHelp && (
						<button type="button" className="nf-vs-reset" onClick={onHelp} title="Show the 3-step guide">
							?
						</button>
					)}
					{onRecipes && (
						<button type="button" className="nf-vs-reset nf-vs-recipes" onClick={onRecipes}>
							{icons.wand}
							<span>Recipes</span>
						</button>
					)}
					<button type="button" className="nf-vs-reset" onClick={onReset}>
						Reset Project
					</button>
				</div>
			</div>
			<div className="nf-vs-row">
				<RefThumb image={refImage} onChange={onRefImage} title="Style reference — auto-describes on upload" onPickBoard={onPickBoard} />
				<div className="nf-vs-field">
					<textarea
						value={value || ''}
						onChange={(e) => onChange(e.target.value)}
						rows={2}
						disabled={describing}
						placeholder="Set the visual style (e.g. cinematic lighting, 35mm film, warm color palette, shallow depth of field) ..."
					/>
					{describing && (
						<div className="nf-vs-describing">
							<Spinner size={13} />
							<span>Describing the reference image…</span>
						</div>
					)}
					<div className="nf-vs-tools">
						<button type="button" className="nf-vs-info" title="What does this control?" onClick={() => setInfo((v) => !v)}>
							{icons.info}
						</button>
						<EnhancePill fieldLabel="Visual Style" value={value} visualStyle={value} onResult={onChange} compact />
					</div>
				</div>
			</div>
			{info && (
				<div className="nf-vs-info-pop">
					The project's look — its <b>lighting register and color grade</b>, applied to every shot. Upload a reference and it auto-describes that look here; the text and reference cascade into every generated image. (The <b>subject</b> comes from each shot's Description + Hero; the <b>composition</b> from the Composition reference + Frame tools.)
				</div>
			)}
		</section>
	);
}

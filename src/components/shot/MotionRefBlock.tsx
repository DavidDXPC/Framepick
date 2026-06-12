import { useState } from 'react';
import { icons } from '../../lib/icons';
import { HERO_TOKEN, resolveHeroPrompt } from '../../lib/framepickBridge';
import type { Shot } from '../../state/types';

// Renders the @hero prompt with the token highlighted as a chip.
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

// Motion guide received from FramePick: keyframes (layout only), the
// structured breakdown, and the @hero video prompt resolved against the
// shot's Hero slot at copy time.
export function MotionRefBlock({ shot, onRemove }: { shot: Shot; onRemove: () => void }) {
	const [expanded, setExpanded] = useState(false);
	const [copied, setCopied] = useState(false);
	const mr = shot.motionRef;
	if (!mr) return null;

	const prompt = mr.heroPrompt || mr.videoPrompt;
	const copyResolved = async () => {
		const text = resolveHeroPrompt(prompt, { description: shot.description, hasHeroRef: !!shot.talentRef?.src });
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1400);
		} catch {
			/* clipboard unavailable */
		}
	};

	const rows: [string, string][] = [
		['Shot', mr.breakdown.shot],
		['Composition', mr.breakdown.composition],
		['Camera', mr.breakdown.camera_movement],
		['Action', mr.breakdown.scene_action],
		['Evolution', mr.breakdown.evolution],
		['Light & grade', mr.breakdown.light_and_grade],
	];

	return (
		<div className="nf-motionref">
			<div className="nf-motionref-head">
				<span className="nf-motionref-cap">
					Motion · FramePick
					<em>
						{mr.frames.length} keyframes · {mr.duration.toFixed(1)}s
					</em>
				</span>
				<span className="nf-motionref-tools">
					<button type="button" className="nf-icon-button" title={expanded ? 'Collapse breakdown' : 'Show breakdown'} onClick={() => setExpanded((e) => !e)}>
						{expanded ? icons.up : icons.down}
					</button>
					<button type="button" className="nf-icon-button" title="Remove motion reference" onClick={onRemove}>
						{icons.x}
					</button>
				</span>
			</div>
			{expanded && (
				<div className="nf-motionref-rows">
					{rows.map(
						([k, v]) =>
							v && (
								<div className="nf-motionref-row" key={k}>
									<em>{k}</em>
									<span>{v}</span>
								</div>
							),
					)}
				</div>
			)}
			<div className="nf-motionref-prompt">
				<HeroPromptText prompt={prompt} />
			</div>
			<div className="nf-motionref-foot">
				<span className="nf-motionref-hint">{shot.talentRef?.src ? '@hero → your Hero reference' : shot.description?.trim() ? '@hero → shot description' : 'Add a Hero ref or description to resolve @hero'}</span>
				<button type="button" className="nf-fpi-apply" onClick={copyResolved}>
					{copied ? 'Copied ✓' : 'Copy video prompt'}
				</button>
			</div>
		</div>
	);
}

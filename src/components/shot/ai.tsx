import { useEffect, useRef, useState } from 'react';
import { icons } from '../../lib/icons';
import { fieldAssist, fillControls } from '../../lib/aiAssist';
import type { FieldDef } from '../../data/frame';
import type { Shot } from '../../state/types';
import { Spinner } from '../ui';
import { AnchoredPopover, useDismiss } from './popover';

export interface EnhanceMode {
	id: string;
	label: string;
	hint: string;
	// When set, the mode runs as a scoped instruction (no Custom prompt dialog).
	instruction?: string;
	// Reference images this mode reads via vision (in order). Each is required —
	// if missing, the user is told to attach it first.
	needs?: ('talent' | 'sketch')[];
}

const DEFAULT_ENHANCE_MODES: EnhanceMode[] = [
	{ id: 'enhance', label: 'Enhance prompt', hint: 'Tighten phrasing, add production specifics' },
	{ id: 'suggest', label: 'Suggest prompt', hint: 'Generate a fresh option for this field' },
	{ id: 'clarity', label: 'Rewrite for clarity', hint: 'Same meaning, cleaner prose' },
	{ id: 'shorten', label: 'Shorten', hint: 'Compress without adding details' },
	{ id: 'custom', label: 'Custom prompt', hint: 'Write your own instruction' },
];

// The Description owns only the SUBJECT + ACTION (the Hero and what it's
// doing). Lighting + color grade come from the Visual Style; composition from
// the Frame tools — so the Description assist is deliberately scoped to two
// subject-focused moves and is told to avoid those other axes.
export const DESCRIPTION_ENHANCE_MODES: EnhanceMode[] = [
	{
		id: 'describe-talent',
		label: 'Describe the Hero',
		hint: 'Read the Hero image',
		needs: ['talent'],
		instruction:
			'Look at the attached image (the Hero). Describe the SUBJECT it shows and a plausible ACTION for it, in one concise line — what the subject is and what it is doing. Do NOT mention lighting, color, grade, camera, lens, framing, angle, or composition; those are set elsewhere.',
	},
	{
		id: 'talent-into-sketch',
		label: 'Hero into the Composition',
		hint: "Place the Hero in the Composition's layout",
		needs: ['talent', 'sketch'],
		instruction:
			"Two images are attached: the FIRST is the HERO (the subject), the SECOND is the COMPOSITION (a layout / framing reference). In one concise line, describe the HERO subject placed into the COMPOSITION's layout — its pose, placement and framing — with the composition reference's own subject replaced by the Hero. Describe only the subject and what it is doing within that layout. Do NOT describe the composition reference's background, environment, scenery, colors, lighting, camera or lens.",
	},
	{
		id: 'enhance',
		label: 'Enhance prompt',
		hint: 'Tighten and enrich the current text',
		instruction:
			'Rewrite and enrich the current shot description, keeping it about the SUBJECT and its ACTION. Make it more vivid and specific without changing the meaning. Do NOT add lighting, color, grade, camera, lens, or composition. Return one concise line.',
	},
];

// EnhancePill (hd): the inline "Enhance" AI menu used on Description and Visual Style.
export function EnhancePill({
	fieldLabel,
	value,
	visualStyle,
	description,
	onResult,
	compact,
	modes = DEFAULT_ENHANCE_MODES,
	talentImage,
	sketchImage,
}: {
	fieldLabel: string;
	value?: string;
	visualStyle?: string;
	description?: string;
	onResult: (text: string) => void;
	compact?: boolean;
	modes?: EnhanceMode[];
	talentImage?: string;
	sketchImage?: string;
}) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState('');
	const wrapRef = useDismiss(open, setOpen) as React.RefObject<HTMLSpanElement>;
	const btnRef = useRef<HTMLButtonElement>(null);

	const run = async (mode: EnhanceMode) => {
		let action = mode.id;
		let custom = '';
		// gather (and require) the reference images this mode reads, in order
		const images: string[] = [];
		for (const need of mode.needs || []) {
			const img = need === 'talent' ? talentImage : sketchImage;
			if (!img) {
				setOpen(false);
				setErr(`Add a ${need === 'talent' ? 'Hero' : 'Composition'} reference first.`);
				window.setTimeout(() => setErr(''), 4000);
				return;
			}
			images.push(img);
		}
		if (mode.instruction) {
			// scoped mode → run as a fixed custom instruction
			action = 'custom';
			custom = mode.instruction;
		} else if (mode.id === 'custom') {
			custom = window.prompt('Custom instruction', 'Make it feel more cinematic') || '';
			if (!custom.trim()) return;
		}
		setOpen(false);
		setLoading(true);
		setErr('');
		try {
			const text = await fieldAssist({ action, value: value || '', fieldLabel, visualStyle, description, customInstruction: custom, imageDataUrls: images });
			if (text) onResult(text);
		} catch (e) {
			setErr((e as Error).message || String(e));
			window.setTimeout(() => setErr(''), 4000);
		} finally {
			setLoading(false);
		}
	};

	return (
		<span className="nf-ai-pill-wrap" ref={wrapRef}>
			<button type="button" className={'nf-enhance-pill' + (loading ? ' loading' : '')} ref={btnRef} onClick={() => setOpen((o) => !o)} disabled={loading} title="AI assist">
				{loading ? <Spinner /> : icons.spark}
				<span>{compact ? '' : loading ? 'Working' : 'Enhance'}</span>
			</button>
			{err && <span className="nf-ai-err">{err}</span>}
			<AnchoredPopover anchorRef={btnRef} open={open} align="right" width={262}>
				<div className="nf-popover nf-ai-menu">
					<div className="nf-popover-title">{fieldLabel}</div>
					{modes.map((m) => (
						<button key={m.id} type="button" className="nf-ai-mode" onClick={() => run(m)}>
							<span className="nf-ai-mode-ic">{icons.spark}</span>
							<span>
								<strong>{m.label}</strong>
								<em>{m.hint}</em>
							</span>
						</button>
					))}
				</div>
			</AnchoredPopover>
		</span>
	);
}

// AiFillMenu (Jp): the Frame/Motion modal "AI fill" wheel — Suggest / Options / Custom.
export function AiFillMenu({
	fields,
	visualStyle,
	shot,
	onApply,
	anchorClass,
}: {
	fields: FieldDef[];
	visualStyle?: string;
	shot: Shot;
	onApply: (patch: Record<string, string | string[]>) => void;
	anchorClass?: string;
}) {
	const [open, setOpen] = useState(false);
	const [stage, setStage] = useState<'root' | 'options' | 'custom'>('root');
	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState('');
	const [custom, setCustom] = useState('');
	const wrapRef = useDismiss(open, setOpen) as React.RefObject<HTMLSpanElement>;
	const btnRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!open) {
			setStage('root');
			setErr('');
			setCustom('');
		}
	}, [open]);

	const run = async ({ mood, custom: customText }: { mood?: string; custom?: string }) => {
		setLoading(true);
		setErr('');
		try {
			const patch = await fillControls({ fields, visualStyle, shot, mood, custom: customText });
			onApply(patch);
			setOpen(false);
		} catch (e) {
			setErr((e as Error).message || String(e));
		} finally {
			setLoading(false);
		}
	};

	return (
		<span className={'nf-chip-ai ' + (anchorClass || '')} ref={wrapRef}>
			<button type="button" className="nf-chip-ai-btn" ref={btnRef} title="AI fill" onClick={() => setOpen((o) => !o)}>
				{loading ? <Spinner size={12} /> : icons.spark}
			</button>
			<AnchoredPopover anchorRef={btnRef} open={open} align="right" width={260}>
				<div className="nf-popover nf-ai-menu">
					{stage === 'root' && (
						<>
							<button type="button" className="nf-ai-mode" disabled={loading} onClick={() => run({})}>
								<span className="nf-ai-mode-ic">{icons.spark}</span>
								<span>
									<strong>Suggest</strong>
									<em>AI picks values from Visual Style + Description</em>
								</span>
							</button>
							<button type="button" className="nf-ai-mode" onClick={() => setStage('options')}>
								<span className="nf-ai-mode-ic">{icons.list}</span>
								<span>
									<strong>Options</strong>
									<em>Three distinct stylistic directions</em>
								</span>
							</button>
							<button type="button" className="nf-ai-mode" onClick={() => setStage('custom')}>
								<span className="nf-ai-mode-ic">{icons.plus}</span>
								<span>
									<strong>Custom</strong>
									<em>Describe the intent in your words</em>
								</span>
							</button>
						</>
					)}
					{stage === 'options' && (
						<>
							<div className="nf-popover-title">Choose a direction</div>
							{['Naturalistic', 'Dramatic', 'Stylized'].map((mood) => (
								<button key={mood} type="button" className="nf-ai-mode" disabled={loading} onClick={() => run({ mood })}>
									<span className="nf-ai-mode-ic">{icons.wand}</span>
									<span>
										<strong>{mood}</strong>
									</span>
								</button>
							))}
						</>
					)}
					{stage === 'custom' && (
						<div className="nf-ai-custom">
							<textarea value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. late-afternoon café, warm and soft" rows={2} autoFocus />
							<div className="nf-ai-custom-actions">
								<button type="button" className="nf-toolbar-btn" onClick={() => setStage('root')}>
									Back
								</button>
								<button type="button" className="nf-primary-btn" disabled={loading || !custom.trim()} onClick={() => run({ custom: custom.trim() })}>
									Apply
								</button>
							</div>
						</div>
					)}
					{err && <div className="nf-ai-err-row">{err}</div>}
				</div>
			</AnchoredPopover>
		</span>
	);
}

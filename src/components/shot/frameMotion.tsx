import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { icons, fieldIcons } from '../../lib/icons';
import {
	ASPECT_OPTS,
	FOCUS_OPTS,
	FRAME_FIELDS,
	FRAMING_OPTS,
	LENS_CHARACTER,
	LENS_FOCAL,
	LIGHTING,
	MOTION_FIELDS,
	SHOT_SIZE_ABBR,
	SHOT_SIZE_GROUPS,
	SHOT_TYPES,
	SHOT_TYPE_ABBR,
	optAbbr,
	optValue,
} from '../../data/frame';
import type { FieldDef, Option } from '../../data/frame';
import { MOVIE_LOOKS, FILM_STOCKS, LIGHTING_STYLES } from '../../data/looks';
import { thumbId, thumbPrompt } from '../../data/thumbs';
import { emptyFrame, emptyMotion } from '../../state/defaults';
import { countFrame, countLighting, countMotion } from '../../lib/promptBuilder';
import { useThumb } from '../../lib/thumbCache';
import type { Frame, Lens, Lighting, Motion, Shot } from '../../state/types';
import { Spinner } from '../ui';
import { AnchoredPopover, useDismiss } from './popover';
import { AiFillMenu } from './ai';
import { useModalA11y } from '../../lib/a11y';

// The Frame/Motion settings dialog — extracted so the focus-trap hook mounts
// only while it's open.
function FrameSettingsModal({
	title,
	icon,
	headerAction,
	children,
	onReset,
	onClose,
	wide,
}: {
	title: string;
	icon: React.ReactNode;
	headerAction: React.ReactNode;
	children: React.ReactNode;
	onReset: () => void;
	onClose: () => void;
	wide?: boolean;
}) {
	const dialogRef = useModalA11y<HTMLDivElement>(onClose);
	return createPortal(
		<div
			className="nf-fm-scrim"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className={'nf-fm-modal' + (wide ? ' nf-fm-modal-wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={dialogRef}>
				<div className="nf-fm-modal-head">
					<span className="nf-fm-modal-title">
						{icon}
						<span>{title}</span>
					</span>
					<div className="nf-fm-modal-head-actions">
						{headerAction}
						<button type="button" className="nf-fm-modal-x" onClick={onClose} aria-label="Close">
							{icons.x}
						</button>
					</div>
				</div>
				<div className="nf-fm-modal-body">{children}</div>
				<div className="nf-fm-modal-foot">
					<button type="button" className="nf-fm-reset" onClick={onReset}>
						{icons.reset}
						<span>Reset all fields</span>
					</button>
					<button type="button" className="nf-primary-btn" onClick={onClose}>
						Continue
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

export type PatchFn = (
	patch: { frame?: Frame; motion?: Motion },
	clearAiKey?: string | null,
	addAiKeys?: string[],
	delAiKey?: string | null,
	delAiKeys?: string[] | null,
) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = Record<string, any>;

// OptionList (Qr)
function OptionList({ options, value, onPick, multi }: { options: Option[]; value: string | string[]; onPick: (v: string | string[]) => void; multi?: boolean }) {
	const current = multi ? (Array.isArray(value) ? value : []) : value;
	const isOn = (v: string) => (multi ? (current as string[]).includes(v) : current === v);
	const pick = (v: string) => {
		if (multi) {
			const set = new Set(current as string[]);
			if (set.has(v)) set.delete(v);
			else set.add(v);
			onPick([...set]);
		} else onPick(v);
	};
	return (
		<>
			{options.map((o) => {
				const v = optValue(o);
				const abbr = optAbbr(o);
				return (
					<button key={v} type="button" className={'nf-popover-opt' + (isOn(v) ? ' selected' : '')} onClick={() => pick(v)}>
						<span>{v}</span>
						<span className="nf-popover-opt-right">
							{abbr && <span className="nf-abbr">{abbr}</span>}
							{isOn(v) && icons.check}
						</span>
					</button>
				);
			})}
		</>
	);
}

// ChipPopover (eh): single / multi / lens field popovers
function ChipPopover({ field, value, onChange, onClose }: { field: FieldDef; value: AnyRec | string | string[]; onChange: (v: AnyRec | string | string[]) => void; onClose: () => void }) {
	const [custom, setCustom] = useState('');
	if (field.type === 'single') {
		return (
			<div className={'nf-popover nf-chip-popover' + (field.groups ? ' nf-chip-popover-wide' : '')} onClick={(e) => e.stopPropagation()}>
				<button
					type="button"
					className="nf-popover-opt"
					onClick={() => {
						onChange('');
						onClose();
					}}
				>
					<span style={{ color: 'var(--ink-3)' }}>None</span>
					{!value && icons.check}
				</button>
				{field.groups ? (
					<div className="nf-chip-cols">
						{field.groups.map((g) => (
							<div className="nf-chip-col" key={g.label}>
								<div className="nf-popover-group">{g.label}</div>
								<OptionList
									options={g.items}
									value={value as string}
									onPick={(v) => {
										onChange(v);
										onClose();
									}}
								/>
							</div>
						))}
					</div>
				) : (
					<OptionList
						options={field.options || []}
						value={value as string}
						onPick={(v) => {
							onChange(v);
							onClose();
						}}
					/>
				)}
				{field.custom && (
					<div className="nf-popover-custom">
						<input
							value={custom}
							onChange={(e) => setCustom(e.target.value)}
							placeholder="Custom value…"
							onKeyDown={(e) => {
								if (e.key === 'Enter' && custom.trim()) {
									onChange(custom.trim());
									onClose();
								}
							}}
						/>
					</div>
				)}
			</div>
		);
	}
	if (field.type === 'multi') {
		return (
			<div className="nf-popover nf-chip-popover" onClick={(e) => e.stopPropagation()}>
				<OptionList options={field.options || []} value={value as string[]} onPick={onChange} multi />
			</div>
		);
	}
	if (field.type === 'lens') {
		const lens = value as Lens;
		return (
			<div className="nf-popover nf-chip-popover nf-chip-popover-wide" onClick={(e) => e.stopPropagation()}>
				<div className="nf-chip-cols">
					<div className="nf-chip-col">
						<div className="nf-popover-group">Focal Length</div>
						<OptionList options={LENS_FOCAL} value={lens.focalLength} onPick={(v) => onChange({ ...lens, focalLength: lens.focalLength === v ? '' : (v as string) })} />
					</div>
					<div className="nf-chip-col">
						<div className="nf-popover-group">Lens Character</div>
						<OptionList options={LENS_CHARACTER} value={lens.character} onPick={(v) => onChange({ ...lens, character: lens.character === v ? '' : (v as string) })} />
					</div>
				</div>
			</div>
		);
	}
	return null;
}

// LightingPopover (th) — with the per-shot override toggle
function LightingPopover({
	value,
	override,
	onToggleOverride,
	onChange,
}: {
	value: Lighting;
	override: boolean;
	onToggleOverride: (v: boolean) => void;
	onChange: (v: Lighting) => void;
}) {
	return (
		<div className="nf-popover nf-lighting-popover" onClick={(e) => e.stopPropagation()}>
			<div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '2px 2px 8px' }}>
				<span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
					{override ? 'Per-shot lighting — overrides the project Visual Style.' : 'Lighting follows the project Visual Style. Turn on to override for this shot.'}
				</span>
				<button
					type="button"
					role="switch"
					aria-checked={override}
					aria-label="Override project lighting for this shot"
					onClick={() => onToggleOverride(!override)}
					style={{
						flexShrink: 0,
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						padding: '4px 10px',
						borderRadius: 999,
						border: '1px solid var(--border)',
						background: override ? 'var(--accent)' : 'var(--card-2)',
						color: override ? '#FFFEFB' : 'var(--ink-2)',
						fontSize: 12,
						fontWeight: 500,
						cursor: 'pointer',
					}}
				>
					{override ? 'Override: on' : 'Override: off'}
				</button>
			</div>
			{LIGHTING.map((cat) => (
				<div className="nf-lighting-group" key={cat.key} style={{ opacity: override ? 1 : 0.4, pointerEvents: override ? 'auto' : 'none' }} aria-disabled={!override}>
					<div className="nf-popover-group">
						{cat.label}
						{cat.kind === 'multi' && <span className="nf-multi-tag">multi</span>}
					</div>
					<div className="nf-lighting-opts">
						<OptionList
							options={cat.options}
							value={(value as AnyRec)[cat.key]}
							multi={cat.kind === 'multi'}
							onPick={(v) => onChange({ ...value, [cat.key]: v === (value as AnyRec)[cat.key] && cat.kind === 'single' ? '' : v })}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

// FieldChip (nh): a single chip button + its anchored popover
function FieldChip({
	field,
	shot,
	projectAspect,
	aiFilled,
	onChange,
	onClearAi,
}: {
	field: FieldDef;
	shot: Shot;
	projectAspect: string;
	aiFilled: boolean;
	onChange: (p: AnyRec) => void;
	onClearAi?: (key: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const wrapRef = useDismiss(open, setOpen) as React.RefObject<HTMLSpanElement>;
	const frame = shot.frame as AnyRec;
	const motion = shot.motion as AnyRec;
	const raw = frame[field.key] !== undefined ? frame[field.key] : motion[field.key];

	let display = '—';
	let filled = false;
	let note: string | null = null;
	if (field.type === 'lighting') {
		const on = shot.frame.lightingOverride;
		const n = countLighting(shot.frame.lighting);
		filled = on && n > 0;
		display = on ? `(${n}/8)` : 'Off';
	} else if (field.type === 'lens') {
		const lens = shot.frame.lens;
		filled = !!(lens.focalLength || lens.character);
		display = filled ? [lens.focalLength, lens.character].filter(Boolean).join(' · ') : '—';
	} else if (field.type === 'multi') {
		const arr = Array.isArray(raw) ? raw : [];
		filled = arr.length > 0;
		display = filled ? `${arr.length} set` : '—';
	} else if (field.key === 'aspect') {
		filled = !!raw;
		display = raw || projectAspect;
		if (!raw) note = 'inherit';
	} else {
		filled = !!raw;
		display = filled ? (field.abbr && (SHOT_SIZE_ABBR[raw] || SHOT_TYPE_ABBR[raw])) || raw : '—';
	}

	const btnRef = useRef<HTMLButtonElement>(null);
	const width =
		field.type === 'lighting'
			? Math.min(1120, Math.round((typeof window !== 'undefined' ? window.innerWidth : 1200) * 0.92))
			: field.type === 'lens'
				? Math.min(440, Math.round((typeof window !== 'undefined' ? window.innerWidth : 1200) * 0.9))
				: field.type === 'single' && field.groups
					? Math.min(620, Math.round((typeof window !== 'undefined' ? window.innerWidth : 1200) * 0.92))
					: 240;

	const applySingle = (v: string) => {
		onChange({ value: v });
		onClearAi?.(field.key);
	};

	return (
		<span className={'nf-chip' + (open ? ' open' : '') + (filled ? ' filled' : '')} ref={wrapRef}>
			<button type="button" className="nf-chip-btn" ref={btnRef} onClick={() => setOpen((o) => !o)}>
				{aiFilled ? (
					<span className="nf-chip-ai-glyph" title="Suggested by AI — click to edit">
						{icons.spark}
					</span>
				) : (
					fieldIcons[field.key] && <span className="nf-chip-fieldico">{fieldIcons[field.key]}</span>
				)}
				<span className="nf-chip-label">{field.label}</span>
				<span className={'nf-chip-val' + (filled ? '' : ' unset')}>
					{display}
					{note && <em className="nf-chip-inherit"> ({note})</em>}
				</span>
				<span className="nf-chip-chev">{icons.chev}</span>
			</button>
			<AnchoredPopover anchorRef={btnRef} open={open} width={width}>
				{field.type === 'lighting' ? (
					<LightingPopover
						value={shot.frame.lighting}
						override={shot.frame.lightingOverride}
						onToggleOverride={(b) => onChange({ lightingOverride: b })}
						onChange={(v) => {
							onChange({ lighting: v });
							onClearAi?.('lighting');
						}}
					/>
				) : (
					<ChipPopover
						field={field}
						value={field.type === 'lens' ? shot.frame.lens : raw}
						onChange={(v) => {
							if (field.type === 'lens') onChange({ lens: v });
							else if (field.type === 'multi') onChange({ value: v });
							else applySingle(v as string);
							onClearAi?.(field.key);
						}}
						onClose={() => setOpen(false)}
					/>
				)}
			</AnchoredPopover>
		</span>
	);
}

// ---------------------------------------------------------------------------
// Visual (image-card) Frame picker — the redesigned Frame studio.
// ---------------------------------------------------------------------------
interface PickerOpt {
	value: string;
	label: string;
	abbr?: string;
}

function VisualCard({ category, value, label, abbr, selected, onSelect, enabled }: { category: string; value: string; label: string; abbr?: string; selected: boolean; onSelect: (v: string) => void; enabled: boolean }) {
	const { src, loading } = useThumb(thumbId(category, value), thumbPrompt(category, value), enabled);
	return (
		<button type="button" className={'nf-fs-card' + (selected ? ' selected' : '')} onClick={() => onSelect(value)} title={label} aria-pressed={selected}>
			<span className="nf-fs-thumb" style={src ? { backgroundImage: `url("${src}")` } : undefined}>
				{!src && (loading ? <Spinner size={16} /> : <span className="nf-fs-thumb-ph">{abbr || label}</span>)}
				{selected && <span className="nf-fs-check">{icons.check}</span>}
			</span>
			<span className="nf-fs-card-label">{label}</span>
		</button>
	);
}

function VisualPicker({ category, options, groups, selected, onSelect, searchLabel }: { category: string; options?: PickerOpt[]; groups?: { label: string; options: PickerOpt[] }[]; selected: string; onSelect: (v: string) => void; searchLabel: string }) {
	const [q, setQ] = useState('');
	const match = (o: PickerOpt) => o.label.toLowerCase().includes(q.trim().toLowerCase());
	return (
		<div className="nf-fs-pickwrap">
			<input className="nf-fs-search" placeholder={`Search ${searchLabel}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${searchLabel}`} />
			{groups
				? groups.map((g) => {
						const opts = g.options.filter(match);
						if (!opts.length) return null;
						return (
							<div key={g.label} className="nf-fs-group">
								<div className="nf-fs-group-label">{g.label}</div>
								<div className="nf-fs-grid">
									{opts.map((o) => (
										<VisualCard key={o.value} category={category} value={o.value} label={o.label} abbr={o.abbr} selected={selected === o.value} onSelect={onSelect} enabled />
									))}
								</div>
							</div>
						);
					})
				: (
						<div className="nf-fs-grid">
							{(options || []).filter(match).map((o) => (
								<VisualCard key={o.value} category={category} value={o.value} label={o.label} abbr={o.abbr} selected={selected === o.value} onSelect={onSelect} enabled />
							))}
						</div>
					)}
		</div>
	);
}

const FS_CATEGORIES = [
	{ key: 'movieLook', label: 'Movie Look' },
	{ key: 'filmStock', label: 'Film Stock' },
	{ key: 'lighting', label: 'Lighting' },
	{ key: 'shotType', label: 'Shot Type' },
	{ key: 'shotSize', label: 'Shot Size' },
	{ key: 'framing', label: 'Framing' },
	{ key: 'focusDof', label: 'Focus / DOF' },
	{ key: 'lens', label: 'Lens' },
	{ key: 'aspect', label: 'Aspect' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFrame = any;

export function FrameStudio({ shot, projectAspect, onPatch }: { shot: Shot; projectAspect: string; onPatch: PatchFn }) {
	const [cat, setCat] = useState('movieLook');
	const f = shot.frame;
	const setKey = (key: string, value: string) => onPatch({ frame: { ...f, [key]: (f as AnyFrame)[key] === value ? '' : value } as Frame }, key);
	const setLens = (part: 'focalLength' | 'character', value: string) =>
		onPatch({ frame: { ...f, lens: { ...f.lens, [part]: f.lens[part] === value ? '' : value } } }, 'lens');

	const hasValue = (key: string): boolean => {
		if (key === 'lens') return !!(f.lens.focalLength || f.lens.character);
		if (key === 'lighting') return !!f.lightingStyle || (f.lightingOverride && countLighting(f.lighting) > 0);
		return !!(f as AnyFrame)[key];
	};

	const opt = (vals: Option[]): PickerOpt[] => vals.map((v) => ({ value: optValue(v), label: optValue(v), abbr: optAbbr(v) || undefined }));

	const pane = () => {
		switch (cat) {
			case 'movieLook':
				return <VisualPicker category="movieLook" options={MOVIE_LOOKS.map((l) => ({ value: l.value, label: l.value }))} selected={f.movieLook} onSelect={(v) => setKey('movieLook', v)} searchLabel="movie looks" />;
			case 'filmStock':
				return <VisualPicker category="filmStock" options={FILM_STOCKS.map((l) => ({ value: l.value, label: l.value }))} selected={f.filmStock} onSelect={(v) => setKey('filmStock', v)} searchLabel="film stocks" />;
			case 'shotType':
				return <VisualPicker category="shotType" options={opt(SHOT_TYPES)} selected={f.shotType} onSelect={(v) => setKey('shotType', v)} searchLabel="shot types" />;
			case 'shotSize':
				return (
					<VisualPicker
						category="shotSize"
						groups={SHOT_SIZE_GROUPS.map((g) => ({ label: g.label, options: opt(g.items) }))}
						selected={f.shotSize}
						onSelect={(v) => setKey('shotSize', v)}
						searchLabel="shot sizes"
					/>
				);
			case 'framing':
				return <VisualPicker category="framing" options={opt(FRAMING_OPTS)} selected={f.framing} onSelect={(v) => setKey('framing', v)} searchLabel="framing" />;
			case 'focusDof':
				return <VisualPicker category="focusDof" options={opt(FOCUS_OPTS)} selected={f.focusDof} onSelect={(v) => setKey('focusDof', v)} searchLabel="focus" />;
			case 'lens':
				return (
					<div className="nf-fs-pickwrap">
						<div className="nf-fs-group">
							<div className="nf-fs-group-label">Focal length</div>
							<div className="nf-fs-grid">
								{opt(LENS_FOCAL).map((o) => (
									<VisualCard key={o.value} category="lensFocal" value={o.value} label={o.label} selected={f.lens.focalLength === o.value} onSelect={(v) => setLens('focalLength', v)} enabled />
								))}
							</div>
						</div>
						<div className="nf-fs-group">
							<div className="nf-fs-group-label">Lens character</div>
							<div className="nf-fs-grid">
								{opt(LENS_CHARACTER).map((o) => (
									<VisualCard key={o.value} category="lensCharacter" value={o.value} label={o.label} selected={f.lens.character === o.value} onSelect={(v) => setLens('character', v)} enabled />
								))}
							</div>
						</div>
					</div>
				);
			case 'aspect':
				return (
					<div className="nf-fs-pickwrap">
						<div className="nf-fs-grid nf-fs-grid-aspect">
							{ASPECT_OPTS.map((a) => (
								<button key={a} type="button" className={'nf-fs-card nf-fs-aspectcard' + (f.aspect === a ? ' selected' : '')} onClick={() => setKey('aspect', a)} aria-pressed={f.aspect === a}>
									<span className="nf-fs-aspectbox" data-ratio={a} />
									<span className="nf-fs-card-label">
										{a}
										{!f.aspect && a === projectAspect ? ' (scene)' : ''}
									</span>
								</button>
							))}
						</div>
					</div>
				);
			case 'lighting':
			default:
				return (
					<div className="nf-fs-pickwrap">
						<VisualPicker
							category="lightingStyle"
							options={LIGHTING_STYLES.map((l) => ({ value: l.value, label: l.value }))}
							selected={f.lightingStyle}
							onSelect={(v) => setKey('lightingStyle', v)}
							searchLabel="lighting styles"
						/>
						<details className="nf-fs-advanced">
							<summary>Advanced lighting (manual axes)</summary>
							<LightingPopover
								value={f.lighting}
								override={f.lightingOverride}
								onToggleOverride={(b) => onPatch({ frame: { ...f, lightingOverride: b } }, 'lighting')}
								onChange={(v) => onPatch({ frame: { ...f, lighting: v } }, 'lighting')}
							/>
						</details>
					</div>
				);
		}
	};

	return (
		<div className="nf-fs">
			<div className="nf-fs-rail" role="tablist" aria-label="Frame categories">
				{FS_CATEGORIES.map((c) => (
					<button key={c.key} type="button" role="tab" aria-selected={cat === c.key} className={'nf-fs-railbtn' + (cat === c.key ? ' active' : '')} onClick={() => setCat(c.key)}>
						<span>{c.label}</span>
						{hasValue(c.key) && <span className="nf-fs-raildot" aria-hidden="true" />}
					</button>
				))}
			</div>
			<div className="nf-fs-pane">{pane()}</div>
		</div>
	);
}

// FrameMotionChips (rh): the Frame / Motion trigger buttons + settings modal
export function FrameMotionChips({
	shot,
	projectAspect,
	visualStyle,
	onPatch,
}: {
	shot: Shot;
	projectAspect: string;
	visualStyle?: string;
	onPatch: PatchFn;
}) {
	const [modal, setModal] = useState<'frame' | 'motion' | null>(null);

	const changeField = (key: string, payload: AnyRec) => {
		if (payload.lightingOverride !== undefined) {
			onPatch({ frame: { ...shot.frame, lightingOverride: payload.lightingOverride } }, key);
		} else if (payload.lighting !== undefined) {
			onPatch({ frame: { ...shot.frame, lighting: payload.lighting } }, key);
		} else if (payload.lens !== undefined) {
			onPatch({ frame: { ...shot.frame, lens: payload.lens } }, key);
		} else {
			const inFrame = (shot.frame as AnyRec)[key] !== undefined;
			onPatch(inFrame ? { frame: { ...shot.frame, [key]: payload.value } } : { motion: { ...shot.motion, [key]: payload.value } }, key);
		}
	};

	const applyAiFill = (patch: Record<string, string | string[]>) => {
		const frame = { ...shot.frame, lighting: { ...shot.frame.lighting }, lens: { ...shot.frame.lens } } as AnyRec;
		const motion = { ...shot.motion } as AnyRec;
		const changed: string[] = [];
		Object.entries(patch).forEach(([k, v]) => {
			if (k.startsWith('lighting.')) {
				frame.lighting[k.split('.')[1]] = v;
				if (!changed.includes('lighting')) changed.push('lighting');
			} else if (k.startsWith('lens.')) {
				frame.lens[k.split('.')[1]] = v;
				if (!changed.includes('lens')) changed.push('lens');
			} else if (frame[k] !== undefined) {
				frame[k] = v;
				changed.push(k);
			} else if (motion[k] !== undefined) {
				motion[k] = v;
				changed.push(k);
			}
		});
		onPatch({ frame: frame as Frame, motion: motion as Motion }, null, changed);
	};

	const frameCount = countFrame(shot);
	const motionCount = countMotion(shot);

	const renderChips = (fields: FieldDef[]) => (
		<div className="nf-chip-row">
			{fields.map((f) => (
				<FieldChip
					key={f.key}
					field={f}
					shot={shot}
					projectAspect={projectAspect}
					aiFilled={!!(shot.ai as AnyRec)?.[f.key]}
					onChange={(payload) => changeField(f.key, payload)}
					onClearAi={(k) => onPatch({}, null, [], k)}
				/>
			))}
		</div>
	);

	const resetAll = (which: 'frame' | 'motion') => {
		if (which === 'frame') onPatch({ frame: emptyFrame() }, null, [], null, FRAME_FIELDS.map((f) => f.key));
		else onPatch({ motion: emptyMotion() }, null, [], null, MOTION_FIELDS.map((f) => f.key));
	};

	const Trigger = ({ id, label, count, icon }: { id: 'frame' | 'motion'; label: string; count: number; icon: React.ReactNode }) => (
		<button type="button" className={'nf-fm-trigger' + (count > 0 ? ' filled' : '')} onClick={() => setModal(id)}>
			<span className="nf-fm-trigger-main">
				<span className="nf-fm-trigger-cap">
					{label}
					{count > 0 && <span className="nf-fm-count">{count}</span>}
				</span>
			</span>
			<span className="nf-fm-trigger-ico">{icon}</span>
		</button>
	);

	const active =
		modal === 'frame'
			? { title: 'Frame settings', fields: FRAME_FIELDS, icon: fieldIcons.framing }
			: modal === 'motion'
				? { title: 'Motion settings', fields: MOTION_FIELDS, icon: fieldIcons.cameraMovement }
				: null;

	return (
		<>
			<div className="nf-fm-triggers">
				<Trigger id="frame" label="Frame" count={frameCount} icon={fieldIcons.framing} />
				<Trigger id="motion" label="Motion" count={motionCount} icon={fieldIcons.cameraMovement} />
			</div>
			{active && (
				<FrameSettingsModal
					title={active.title}
					icon={active.icon}
					headerAction={<AiFillMenu fields={active.fields} visualStyle={visualStyle} shot={shot} onApply={applyAiFill} />}
					onReset={() => resetAll(modal!)}
					onClose={() => setModal(null)}
					wide={modal === 'frame'}
				>
					{modal === 'frame' ? <FrameStudio shot={shot} projectAspect={projectAspect} onPatch={onPatch} /> : renderChips(active.fields)}
				</FrameSettingsModal>
			)}
		</>
	);
}

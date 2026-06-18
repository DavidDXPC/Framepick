// nFrame Studio — Tools layer: Frame · Motion · Visual Style · Recipes + resolvePrompt.
// Ported from ns-tools.jsx; window globals replaced with ES imports.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { NI, I, TI } from './icons';
import { Popover } from './ui';
import type { FrameTools, MotionTools, Recipe, Style, StudioShot, ToolState } from './types';

// ---------- Visual Style presets ----------
export const STYLES: Style[] = [
	{ id: 'amber', name: 'Amber Product', sw: ['#e8a13c', '#7a3d12'], grade: 'Amber', mood: 'Warm · glossy · premium', suffix: ' Warm amber commercial grade, glossy speculars, rich shadows.', frame: { light: 'Soft top key', contrast: 'High', temp: '4500K', focus: 'Medium ƒ4', look: 'Modern digital' }, motion: { path: 'Ease-out', scale: 'Subtle push' } },
	{ id: 'neon', name: 'Neon Cyberpunk', sw: ['#ff2d95', '#1b1040'], grade: 'Neon · Mag-Cyan', mood: 'Neon · wet · nocturnal', suffix: ' Neon cyberpunk grade, magenta-and-cyan practicals, wet reflections, deep blacks.', frame: { light: 'Neon practicals', contrast: 'High', temp: 'Mixed', focus: 'Shallow ƒ1.8', look: 'Anamorphic' }, motion: { path: 'Ease-in-out', scale: 'Dramatic' } },
	{ id: 'cold', name: 'Cold Minimalism', sw: ['#cdd8e2', '#5b6b7a'], grade: 'Cool neutral', mood: 'Clean · airy · restrained', suffix: ' Cold minimalist grade, desaturated cool neutrals, soft even light, generous negative space.', frame: { light: 'Window daylight', contrast: 'Low', temp: '6500K', focus: 'Deep', look: 'Modern digital' }, motion: { path: 'Linear', scale: 'None' } },
	{ id: 'warm', name: 'Warm Whimsy', sw: ['#ffd27a', '#e8845a'], grade: 'Golden pastel', mood: 'Golden · soft · playful', suffix: ' Warm whimsical grade, golden pastels, gentle bloom, playful soft light.', frame: { light: 'Window daylight', contrast: 'Low', temp: '4500K', focus: 'Shallow ƒ1.8', look: '35mm film' }, motion: { path: 'Ease-in-out', scale: 'Subtle push' } },
	{ id: 'scifi', name: 'Contemplative Sci-Fi', sw: ['#7fb6c9', '#16323f'], grade: 'Teal · Slate', mood: 'Teal · hazy · still', suffix: ' Contemplative sci-fi grade, teal-slate palette, volumetric haze, restrained contrast.', frame: { light: 'Low-key', contrast: 'Medium', temp: 'Mixed', focus: 'Medium ƒ4', look: 'Anamorphic' }, motion: { path: 'Hold-release', scale: 'Subtle push' } },
	{ id: 'bw', name: 'High-Contrast B&W', sw: ['#f5f5f5', '#0e0e0e'], grade: 'Mono · High', mood: 'Mono · sculpted · graphic', suffix: ' High-contrast black-and-white, deep blacks, sculpted highlights, fine grain.', frame: { light: 'Hard key', contrast: 'Ultra', temp: '4500K', focus: 'Shallow ƒ1.8', look: '35mm film' }, motion: { path: 'Ease-out', scale: 'None' } },
];

export const STYLE_BY_ID: Record<string, Style> = Object.fromEntries(STYLES.map((s) => [s.id, s]));

// ---------- Frame Tools taxonomy ----------
const FRAME_ESS: [keyof FrameTools, string, string[]][] = [
	['size', 'Shot size', ['XCU', 'Close', 'Medium', 'Wide', 'XWide']],
	['lens', 'Lens', ['24mm', '35mm', '50mm', '85mm', '100mm']],
	['fstop', 'Aperture ƒ', ['1.4', '1.8', '2.0', '4', '8']],
	['direction', 'Direction', ['Front', '¾ L', '¾ R', 'Profile', 'Top']],
];
const FRAME_MORE: [keyof FrameTools, string, string[]][] = [
	['look', 'Movie look', ['Modern digital', '35mm film', 'Anamorphic', '16mm vintage', 'Documentary']],
	['stock', 'Film stock', ['Clean digital', 'Vision3', 'Portra 400', 'CineStill 800T', 'Ektachrome']],
	['light', 'Lighting', ['Soft top key', 'Hard key', 'Neon practicals', 'Window daylight', 'Low-key']],
	['framing', 'Framing', ['Centered', 'Thirds', 'Symmetrical', 'Negative space', 'Dutch']],
	['focus', 'Focus / DOF', ['Deep', 'Shallow ƒ1.8', 'Medium ƒ4', 'Macro', 'Tilt-shift']],
	['contrast', 'Key / Contrast', ['Low', 'Medium', 'High', 'Ultra']],
	['temp', 'Color temp', ['3200K', '4500K', '6500K', 'Mixed']],
];

// ---------- Motion Tools taxonomy ----------
const MOTION_MORE: [keyof MotionTools, string, string[]][] = [
	['path', 'Movement path', ['Linear', 'Ease-out', 'Ease-in-out', 'Hold-release']],
	['scale', 'Scale change', ['None', 'Subtle push', 'Dramatic']],
	['continuity', 'Continuity', ['Strict', 'Loose']],
	['transition', 'Transition', ['Cut', 'Dissolve', 'Match-cut']],
	['res', 'Resolution', ['720p', '1080p']],
];

// ---------- Edit Tools ----------
const EDIT_ACTIONS: [string, string, string][] = [
	['hero', 'Replace subject with @hero', 'Swap the source subject for your Hero'],
	['consistency', 'Strengthen subject consistency', 'Lock Hero identity, label & colors'],
	['split', 'Fix split-image output', 'Merge a duplicated or split subject'],
	['artifacts', 'Clean source artifacts', 'Remove compression noise & halos'],
	['overlay', 'Remove UI overlays', 'Strip watermarks, buttons, captions'],
	['compose', 'Improve composition accuracy', 'Snap framing to the reference'],
	['crop', 'Adjust crop / framing', 'Re-frame without a full regenerate'],
	['region', 'Regenerate a region', 'Mask & re-render only part of the frame'],
];

// ---------- Prompt recipes ----------
export const RECIPES0: Recipe[] = [
	{ id: 'luxury', name: 'Luxury Product', tags: ['Premium', 'Macro', 'Low-key'], style: 'amber', desc: 'Modern high-end commercial realism with restrained editorial polish — crisp micro-contrast, gentle highlight roll-off so surfaces read tactile without turning hyperreal. Purposeful shallow depth and immaculate negative space.', frame: { size: 'XCU', lens: '100mm', fstop: '4', aspect: '1:1', direction: '¾ R', look: '35mm film', stock: 'Vision3', light: 'Low-key', framing: 'Negative space', focus: 'Macro', contrast: 'High', temp: '4500K' }, motion: { move: 'Push-in', path: 'Ease-out', scale: 'Subtle push' } },
	{ id: 'fashion', name: 'Fashion Editorial', tags: ['Bold', 'Sculpted', '35mm'], style: 'bw', desc: 'High-fashion editorial: bold directional lighting and sculpted shadows, a saturated yet refined palette, 35mm film texture, confident negative space and magazine-grade finish.', frame: { size: 'Medium', lens: '35mm', fstop: '2.0', aspect: '1:1', direction: '¾ L', look: '35mm film', stock: 'Portra 400', light: 'Hard key', framing: 'Negative space', focus: 'Shallow ƒ1.8', contrast: 'High', temp: '4500K' }, motion: { move: 'Pan L→R', path: 'Ease-in-out', scale: 'Subtle push' } },
	{ id: 'fmcg', name: 'FMCG Hero', tags: ['Bright', 'Punchy', 'High-key'], style: 'warm', desc: 'Bright, punchy FMCG hero: clean high-key lighting, vivid saturated color, crisp product clarity with glossy speculars — energetic, appetising and advertising-ready.', frame: { size: 'Close', lens: '100mm', fstop: '8', aspect: '1:1', direction: 'Front', look: 'Modern digital', stock: 'Clean digital', light: 'Soft top key', framing: 'Centered', focus: 'Deep', contrast: 'Medium', temp: '6500K' }, motion: { move: 'Push-in', path: 'Ease-out', scale: 'Subtle push' } },
	{ id: 'auto', name: 'Automotive', tags: ['Cinematic', 'Reflective', 'Moody'], style: 'scifi', desc: 'Cinematic automotive: dramatic low-key lighting, long sculpted reflections, deep blacks and controlled rim light, a moody atmosphere with a wide anamorphic feel and premium metallic grade.', frame: { size: 'Wide', lens: '50mm', fstop: '4', aspect: '16:9', direction: '¾ R', look: 'Anamorphic', stock: 'CineStill 800T', light: 'Low-key', framing: 'Thirds', focus: 'Deep', contrast: 'Ultra', temp: '3200K' }, motion: { move: 'Orbit 180°', path: 'Ease-in-out', scale: 'Dramatic' } },
	{ id: 'beauty', name: 'Cinematic Beauty', tags: ['Soft', 'Luminous', 'Pastel'], style: 'warm', desc: 'Soft cinematic beauty: wraparound soft light and luminous skin, a pastel palette with gentle bloom, shallow focus — tender and aspirational.', frame: { size: 'Close', lens: '85mm', fstop: '1.8', aspect: '1:1', direction: '¾ L', look: '35mm film', stock: 'Portra 400', light: 'Window daylight', framing: 'Centered', focus: 'Shallow ƒ1.8', contrast: 'Low', temp: '4500K' }, motion: { move: 'Push-in', path: 'Ease-in-out', scale: 'Subtle push' } },
	{ id: 'westworld', name: 'Westworld', tags: ['Uncanny', 'Low-key', 'Clinical'], style: 'cold', desc: 'Prestige sci-fi realism in the Westworld register: soft directional low-key lighting with gentle falloff into deep shadow, a desaturated cool-neutral grade kept just-warm in the flesh tones, milky highlights and clinical restraint.', frame: { size: 'Medium', lens: '50mm', fstop: '2.0', aspect: '16:9', direction: 'Front', look: 'Modern digital', stock: 'Clean digital', light: 'Low-key', framing: 'Symmetrical', focus: 'Medium ƒ4', contrast: 'High', temp: 'Mixed' }, motion: { move: 'Orbit 180°', path: 'Hold-release', scale: 'Subtle push' } },
];

export function recipeSummary(r: Recipe): string {
	const st = STYLE_BY_ID[r.style];
	return `${st.name} style · ${r.frame.lens} · ${(r.frame.light || '').toLowerCase()} · ${(r.frame.contrast || '').toLowerCase()} contrast`;
}

// ---------- per-shot tool defaults ----------
export function nsDefaultTools(shot: StudioShot): ToolState {
	const base: ToolState = {
		frame: { size: 'Medium', lens: '100mm', fstop: '8', aspect: shot.aspect || '16:9', direction: '¾ R', look: 'Modern digital', stock: 'Clean digital', light: 'Soft top key', framing: 'Centered', focus: 'Medium ƒ4', contrast: 'High', temp: '4500K' },
		style: 'amber',
		motion: { move: 'Orbit 180°', model: 'Kling v3', path: 'Ease-out', scale: 'Subtle push', continuity: 'Strict', transition: 'Cut', res: '720p', dur: 6, keyframes: 8 },
	};
	if (shot.id === 's1') base.frame.size = 'Close';
	return base;
}

// project-level visual style description, derived from a style preset
export function recipeStyleText(st: Style): string {
	return `Cinematic ${st.name.toLowerCase()} look — ${st.mood.replace(/ · /g, ', ')}.${st.suffix}`;
}

// resolve the full prompt text (final, on Run / for copy / export)
export function resolvePrompt(shot: StudioShot, view: string, style: Style, frame: FrameTools): string {
	const subj = view === 'hero' ? '@hero' : shot.subject;
	const cam = ` Shot on ${frame.lens} at ƒ${frame.fstop}, ${frame.size.toLowerCase()} framing, ${frame.light.toLowerCase()}, ${style.grade.toLowerCase()} grade.`;
	const extra = shot.promptExtra ? ' ' + shot.promptExtra : '';
	return (shot.promptPre + subj + shot.promptPost + (style.suffix || '') + cam + extra).replace(/\s+/g, ' ').trim();
}

// ============ shared bits ============
function OptRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
	return (
		<div className="ns-ctl">
			<span className="ns-ctl-lbl">{label}</span>
			<div className="ns-opts">
				{options.map((o) => (
					<button key={o} className={'ns-opt' + (o === value ? ' on' : '')} onClick={() => onChange(o)}>{o}</button>
				))}
			</div>
		</div>
	);
}

function PopHead({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
	return (
		<div className="ns-pop-h">
			<span className="ns-tool-ic">{icon}</span>
			<div><b>{title}</b>{sub && <p>{sub}</p>}</div>
		</div>
	);
}

function FramePop({ frame, onSet }: { frame: FrameTools; onSet: (k: string, v: string) => void }) {
	const [more, setMore] = useState(false);
	return (
		<div>
			{FRAME_ESS.map(([k, l, o]) => <OptRow key={k} label={l} value={frame[k]} options={o} onChange={(v) => onSet(k, v)} />)}
			{more ? (
				FRAME_MORE.map(([k, l, o]) => <OptRow key={k} label={l} value={frame[k]} options={o} onChange={(v) => onSet(k, v)} />)
			) : (
				<button className="ns-pop-more" onClick={() => setMore(true)}>More cinematography {TI.chev()}</button>
			)}
		</div>
	);
}

function StylePop({ recipes, activeRecipeId, scope, onScope, onPick, onAddStyle }: { recipes: Recipe[]; activeRecipeId?: string; scope: string; onScope: (s: string) => void; onPick: (id: string) => void; onAddStyle: (desc: string) => void }) {
	const [adding, setAdding] = useState(false);
	const [text, setText] = useState('');
	const submit = () => { if (text.trim()) { onAddStyle(text.trim()); setText(''); setAdding(false); } };
	return (
		<div>
			<PopHead icon={TI.style()} title="Visual Style" sub="Pick a look — auto-tunes prompt, lighting, color & mood." />
			<div className="ns-ctl">
				<span className="ns-ctl-lbl">Apply to</span>
				<div className="seg full">
					<button className={scope === 'shot' ? 'on' : ''} onClick={() => onScope('shot')}>This shot</button>
					<button className={scope === 'project' ? 'on' : ''} onClick={() => onScope('project')}>Whole project</button>
				</div>
			</div>
			<div className="ns-style-grid">
				{recipes.map((r) => {
					const st = STYLE_BY_ID[r.style];
					const on = r.id === activeRecipeId;
					return (
						<button key={r.id} className={'ns-style-card' + (on ? ' on' : '')} onClick={() => onPick(r.id)} title={r.desc}>
							<span className="ns-style-sw" style={{ background: `linear-gradient(120deg, ${st.sw[0]}, ${st.sw[1]})` }} />
							<b>{r.name}{on && <span className="ns-style-tick">{TI.check()}</span>}</b>
						</button>
					);
				})}
			</div>
			{adding ? (
				<div className="ns-style-add">
					<textarea className="ns-style-add-input" autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); if (e.key === 'Escape') { setAdding(false); setText(''); } }} placeholder="Describe a custom look — e.g. moody film noir, hard side light, deep shadows, grainy B&W…" />
					<div className="ns-style-add-row">
						<button className="btn sm" onClick={() => { setAdding(false); setText(''); }}>Cancel</button>
						<span className="flex" />
						<button className="btn filled sm" disabled={!text.trim()} onClick={submit}>{TI.plus()} Add style</button>
					</div>
				</div>
			) : (
				<button className="ns-style-addbtn" onClick={() => setAdding(true)}>{TI.plus()} Add visual style</button>
			)}
		</div>
	);
}

function MotionPop({ motion, onSet }: { motion: MotionTools; onSet: (k: string, v: string | number) => void }) {
	return (
		<div>
			<OptRow label="Camera movement" value={motion.move} options={['Static', 'Push-in', 'Pull-out', 'Orbit 180°', 'Orbit 360°', 'Pan L→R', 'Crane up']} onChange={(v) => onSet('move', v)} />
			<div className="ns-ctl">
				<span className="ns-ctl-lbl">Keyframes · {motion.keyframes}</span>
				<input className="ns-range" type="range" min="2" max="10" step="1" value={motion.keyframes} onChange={(e) => onSet('keyframes', +e.target.value)} />
			</div>
			{MOTION_MORE.map(([k, l, o]) => <OptRow key={k} label={l} value={String(motion[k])} options={o} onChange={(v) => onSet(k, v)} />)}
			<div className="ns-pop-note">Sampled frames stay <b>layout &amp; video guides only</b>. The Hero slot is the final subject through <span className="ns-tok" style={{ fontSize: '10px', padding: '0 4px' }}>@hero</span>.</div>
		</div>
	);
}

function EditPop({ onApply }: { onApply: (id: string, label: string) => void }) {
	return (
		<div>
			<PopHead icon={TI.edit()} title="Edit Tools" sub="Refine the result — regenerate only what needs fixing." />
			{EDIT_ACTIONS.map(([id, label, desc]) => (
				<button key={id} className="ns-edit-row" onClick={() => onApply(id, label)}>
					<span className="ns-edit-ic">{id === 'hero' ? <span style={{ fontSize: '10px', fontWeight: 700 }}>@</span> : TI.edit()}</span>
					<span className="ns-edit-txt"><b>{label}</b><span>{desc}</span></span>
				</button>
			))}
		</div>
	);
}

// ============ Prompt recipes modal ============
export function RecipesModal({ recipes, activeTitle, activeConfigured, unconfiguredCount, onApply, onSave, onClose }: { recipes: Recipe[]; activeTitle: string; activeConfigured: boolean; unconfiguredCount: number; onApply: (r: Recipe, scope: string) => void; onSave: (name: string) => void; onClose: () => void }) {
	const [sel, setSel] = useState<string | null>(null);
	const [scope, setScope] = useState(unconfiguredCount > 0 ? 'unconfigured' : 'shot');
	const [confirm, setConfirm] = useState(false);
	const [name, setName] = useState('');
	const recipe = recipes.find((r) => r.id === sel);

	const pick = (r: Recipe) => { setSel(r.id); setConfirm(false); if (r && scope === 'unconfigured' && unconfiguredCount === 0) setScope('shot'); };
	const doApply = () => {
		if (!recipe) return;
		if (scope === 'shot' && activeConfigured && !confirm) { setConfirm(true); return; }
		onApply(recipe, scope); onClose();
	};

	return (
		<div className="ns-modal-veil" onClick={onClose}>
			<div className="ns-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Prompt recipes">
				<div className="ns-modal-h">
					<span className="ns-modal-title">{TI.recipe()} Prompt recipes</span>
					<button className="icon-btn" onClick={onClose} title="Close">{I.x()}</button>
				</div>
				<div className="ns-modal-body">
					<div className="ns-recipe-grid">
						{recipes.map((r) => {
							const st = STYLE_BY_ID[r.style];
							return (
								<button key={r.id} className={'ns-recipe-card' + (r.id === sel ? ' on' : '')} onClick={() => pick(r)}>
									<span className="ns-recipe-sw" style={{ background: `linear-gradient(120deg, ${st.sw[0]}, ${st.sw[1]})` }} />
									<b>{r.name}{r.id === sel && <span className="ns-style-tick">{TI.check()}</span>}</b>
									<span className="ns-recipe-cardtags">{r.tags.map((t, i) => <span key={t}>{i > 0 && <i>·</i>}<em>{t}</em></span>)}</span>
									<p>{r.desc}</p>
								</button>
							);
						})}
					</div>
					<div className="ns-recipe-saverow">
						<input className="ns-recipe-input" placeholder={`Save "${activeTitle}" as a recipe…`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onSave(name.trim()); setName(''); onClose(); } }} />
						<button className="btn sm" disabled={!name.trim()} onClick={() => { if (name.trim()) { onSave(name.trim()); setName(''); onClose(); } }}>{TI.plus()} Save shot</button>
					</div>
				</div>
				<div className="ns-modal-foot">
					{!recipe ? (
						<span className="ns-modal-note">Sets the Visual Style and seeds Frame defaults into shots you haven't configured yet.</span>
					) : confirm ? (
						<span className="ns-modal-note warn"><b>"{activeTitle}" already has a look.</b> Replace it with {recipe.name}?</span>
					) : (
						<span className="ns-modal-note">
							<b>{recipe.name}</b> → {recipeSummary(recipe)}.
							<span className="ns-scope-seg">
								<button className={scope === 'shot' ? 'on' : ''} onClick={() => { setScope('shot'); setConfirm(false); }}>This shot</button>
								<button className={scope === 'unconfigured' ? 'on' : ''} disabled={unconfiguredCount === 0} onClick={() => { setScope('unconfigured'); setConfirm(false); }}>{unconfiguredCount} unconfigured</button>
							</span>
						</span>
					)}
					<span className="flex" />
					{confirm && <button className="btn sm" onClick={() => setConfirm(false)}>Cancel</button>}
					<button className="btn sm" onClick={onClose}>Close</button>
					<button className="btn filled sm" disabled={!recipe} onClick={doApply}>{confirm ? 'Replace look' : 'Apply recipe'}</button>
				</div>
			</div>
		</div>
	);
}

// ============ Section A — Visual Style (project level) ============
export function VisualStyleSection({ text, activeStyle, styleSet = true, recipes, activeRecipeId, scope, onChange, onEnhance, onOpenRecipes, onReset, onScope, onPickRecipe, onAddStyle }: { text: string; activeStyle: Style; styleSet?: boolean; recipes: Recipe[]; activeRecipeId?: string; scope: string; onChange: (v: string) => void; onEnhance: () => void; onOpenRecipes: () => void; onReset: () => void; onScope: (s: string) => void; onPickRecipe: (id: string) => void; onAddStyle: (desc: string) => void }) {
	const [pick, setPick] = useState(false);
	return (
		<section className="ns-vs">
			<div className="ns-vs-head">
				<span className="ns-vs-title">Section A — Visual Style</span>
				<div className="ns-vs-actions">
					<button className="ns-vs-link" onClick={onOpenRecipes}>{TI.recipe()} Recipes</button>
					<button className="ns-vs-link" onClick={onReset}>{TI.reset()} Reset Project</button>
				</div>
			</div>
			<div className="ns-vs-body">
				<div className="ns-vs-board">
					<div className="ns-vs-slotwrap">
						{styleSet ? (
							<button className="ns-vs-slot filled" onClick={() => setPick((o) => !o)} title="Choose a visual style" style={{ background: `linear-gradient(135deg, ${activeStyle.sw[0]}, ${activeStyle.sw[1]})` }}>
								<span className="ns-vs-slot-tag">{activeStyle.name.split(' ')[0]}</span>
							</button>
						) : (
							<button className="ns-vs-slot empty" onClick={() => setPick((o) => !o)} title="Choose a visual style">{TI.style()}</button>
						)}
						<Popover open={pick} onClose={() => setPick(false)}>
							<StylePop recipes={recipes} activeRecipeId={activeRecipeId} scope={scope} onScope={onScope} onPick={(id) => onPickRecipe(id)} onAddStyle={onAddStyle} />
						</Popover>
					</div>
					<button className={'ns-vs-boardbtn' + (pick ? ' on' : '')} onClick={() => setPick((o) => !o)}>{TI.style()} Style {TI.chev({ style: { fontSize: '12px' } })}</button>
				</div>
				<div className="ns-vs-input-wrap">
					<textarea className="ns-vs-input" value={text} onChange={(e) => onChange(e.target.value)} placeholder="Set the visual style (e.g. cinematic lighting, 35mm film, warm color palette, shallow depth of field) …" />
					<button className="ns-vs-spark" onClick={onEnhance} title={text ? 'Refine with FramePick' : 'Draft from the selected style'}>{NI.sparkles()}</button>
				</div>
			</div>
		</section>
	);
}

// ============ Tools bar ============
function ToolBtn({ k, icon, label, summary, swatch, open, align, onToggle, children }: { k: string; icon: ReactNode; label: string; summary: string; swatch?: string; open: boolean; align?: 'left' | 'right'; onToggle: (k: string | null) => void; children: ReactNode }) {
	return (
		<div className="ns-tool">
			<button className={'ns-tool-btn' + (open ? ' on' : '')} onClick={() => onToggle(open ? null : k)}>
				<span className="ns-tool-ic">{icon}</span>
				<span className="ns-tool-lbl"><b>{label}</b><span>{swatch && <span className="ns-tool-sw" style={{ background: swatch }} />}{summary}</span></span>
				<span className="ns-tool-caret" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>{TI.chev()}</span>
			</button>
			{open && <><div className="ns-pop-veil" onClick={() => onToggle(null)} /><div className={'ns-pop ' + (align || 'left')}>{children}</div></>}
		</div>
	);
}

export function ToolsBar({ shot, tools, onFrame, onMotion }: { shot: StudioShot; tools: ToolState; onFrame: (k: string, v: string) => void; onMotion: (k: string, v: string | number) => void }) {
	const [open, setOpen] = useState<string | null>(null);
	const f = tools.frame, m = tools.motion;
	const isMotion = shot.mode === 'motion';
	return (
		<div className="ns-tools">
			<ToolBtn k="frame" icon={TI.frame()} label="Frame" summary={`${f.lens} · ƒ${f.fstop} · ${f.size}`} open={open === 'frame'} onToggle={setOpen}>
				<FramePop frame={f} onSet={onFrame} />
			</ToolBtn>
			{isMotion && (
				<ToolBtn k="motion" icon={TI.motion()} label="Video" summary={`${m.move} · ${m.keyframes} keyframes`} open={open === 'motion'} onToggle={setOpen}>
					<MotionPop motion={m} onSet={onMotion} />
				</ToolBtn>
			)}
		</div>
	);
}

// contextual edit controls shown under a generated result
export function EditStrip({ onEdit }: { onEdit: (id: string, label: string) => void }) {
	const [more, setMore] = useState(false);
	const quick = [EDIT_ACTIONS[0], EDIT_ACTIONS[2], EDIT_ACTIONS[3], EDIT_ACTIONS[6]];
	return (
		<div className="ns-editstrip">
			<span className="ns-editstrip-lbl">{TI.edit()} Fixes</span>
			{quick.map(([id, label]) => <button key={id} className="ns-editstrip-chip" onClick={() => onEdit(id, label)}>{id === 'hero' ? 'Replace → @hero' : label}</button>)}
			<div className="ns-editstrip-more">
				<button className={'ns-editstrip-chip ghost' + (more ? ' on' : '')} onClick={() => setMore((o) => !o)}>More {TI.chev({ style: { fontSize: '11px' } })}</button>
				<Popover open={more} onClose={() => setMore(false)} align="right">
					<EditPop onApply={(id, label) => { onEdit(id, label); setMore(false); }} />
				</Popover>
			</div>
		</div>
	);
}

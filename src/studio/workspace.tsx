// nFrame Studio — Shot Workspace (References · Prompt · Output) with real images.
// Ported from ns-workspace.jsx; window globals replaced with ES imports.
import { useEffect, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { NI, I, TI } from './icons';
import { NImg, Popover, Spinner } from './ui';
import { A, NS_MEDIA_BY_ID } from './assets';
import { fileToRefImage } from '../state/persistence';
import { resolvePrompt, ToolsBar, VisualStyleSection } from './tools';
import { KLING_MODELS } from '../lib/videoSettings';
import { videoCost, formatCredits } from './credits';
import { getBalance, subscribeBalance, refreshBalance, noteSpend } from './creditBalance';
import type { Comp, Dispatch, Fix, Gen, Status, StudioShot, Style, ToolState, Tx } from './types';

/* ---------------- drag & drop: References → slots ---------------- */
interface DragItem { src: string; kind?: string }
let NS_DRAGGED: DragItem | null = null;

function refDragProps(item: DragItem) {
	return {
		draggable: true,
		onDragStart: (e: DragEvent) => { NS_DRAGGED = item; e.dataTransfer.effectAllowed = 'copy'; try { e.dataTransfer.setData('text/plain', item.src || ''); } catch { /* noop */ } },
		onDragEnd: () => { NS_DRAGGED = null; },
	};
}

// Open the OS file dialog and resolve a data URL (real desktop upload).
function pickImageFile(): Promise<string | null> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = async () => { const f = input.files?.[0]; resolve(f ? (await fileToRefImage(f)).src : null); };
		input.click();
	});
}

// Drop zone that accepts a dragged library/output image OR an OS file drop,
// plus pick() to open the file dialog.
function useUploadDrop(onSrc: (src: string) => void) {
	const [over, setOver] = useState(false);
	const pick = async () => { const s = await pickImageFile(); if (s) onSrc(s); };
	const dropProps = {
		onDragOver: (e: DragEvent) => { if (NS_DRAGGED || e.dataTransfer.types?.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!over) setOver(true); } },
		onDragLeave: () => setOver(false),
		onDrop: async (e: DragEvent) => {
			e.preventDefault(); setOver(false);
			const f = e.dataTransfer.files?.[0];
			if (f) { onSrc((await fileToRefImage(f)).src); return; }
			if (NS_DRAGGED) onSrc(NS_DRAGGED.src);
		},
	};
	return { over, dropProps, pick };
}

/* ---------------- References ---------------- */
function StatusPill({ status, onChange }: { status: Status; onChange: (v: string) => void }) {
	const [open, setOpen] = useState(false);
	const done = status === 'ready';
	return (
		<span className="ns-statwrap">
			<button className={'status status-btn ' + (done ? 'ready' : 'draft')} onClick={() => setOpen((o) => !o)}>
				{done ? 'Done' : 'Draft'}{TI.chev({ style: { fontSize: '11px', marginLeft: '1px' } })}
			</button>
			<Popover open={open} onClose={() => setOpen(false)}>
				<div className="ns-stat-menu">
					<button className={!done ? 'on' : ''} onClick={() => { onChange('draft'); setOpen(false); }}><span className="ns-stat-dot draft" />Draft</button>
					<button className={done ? 'on' : ''} onClick={() => { onChange('ready'); setOpen(false); }}><span className="ns-stat-dot ready" />Done</button>
				</div>
			</Popover>
		</span>
	);
}

function RefTile({ comp, dispatch }: { comp: Comp; dispatch: Dispatch }) {
	const m = comp.mediaId ? NS_MEDIA_BY_ID[comp.mediaId] : { src: comp.src || '', kind: comp.kind || 'still' };
	const motion = (m.kind || comp.kind) === 'motion';
	const [lb, setLb] = useState(false);
	return (
		<div className="ns-comp ns-comp-draggable" {...refDragProps({ src: m.src, kind: comp.kind })} title="Drag onto a Keyframe or Input slot">
			<span className="ns-comp-thumb">
				<NImg src={m.src} />
				{motion && <span className="ns-ref-vid">{I.play()}</span>}
				<span className="ns-expand" role="button" title="Expand preview" onClick={(e) => { e.stopPropagation(); setLb(true); }}>{I.expand()}</span>
				<button className="ns-comp-remove" title="Remove reference" onClick={() => dispatch({ type: 'removeComp', id: comp.id })}>{I.x()}</button>
			</span>
			{lb && (
				<div className="ns-modal-veil" onClick={() => setLb(false)}>
					<div className="ns-lightbox" onClick={(e) => e.stopPropagation()}>
						<button className="ns-lightbox-x" onClick={() => setLb(false)} title="Close">{I.x()}</button>
						<img src={m.src} alt="Reference preview" draggable={false} />
					</div>
				</div>
			)}
		</div>
	);
}

// hero / composition / start / end input thumbnail — fill by click or by dragging a reference
function InputSlot({ label, value, onSet, onClear }: { label: string; value?: string | null; onSet: (v: string) => void; onClear: () => void }) {
	const { over, dropProps, pick } = useUploadDrop(onSet);
	const src = value || null;
	return (
		<div className="ns-fslot">
			{src ? (
				<button className={'ns-fslot-img' + (over ? ' ns-drop-over' : '')} {...dropProps} title={'Replace ' + label.toLowerCase()} onClick={pick}>
					<NImg src={src} />
					<span className="ns-fslot-tag">{label}</span>
					<span className="ns-fslot-x" role="button" title={'Remove ' + label.toLowerCase()} onClick={(e) => { e.stopPropagation(); onClear(); }}>{I.x()}</span>
				</button>
			) : (
				<button className={'ns-fslot-add' + (over ? ' ns-drop-over' : '')} {...dropProps} onClick={pick}>
					{NI.still()}
					<b>{label}</b>
					<span>Upload or drag</span>
				</button>
			)}
		</div>
	);
}

// References section (video mode) — multi-image slots + a plus-only Add slot.
function ReferencesGroup({ shot, dispatch }: { shot: StudioShot; dispatch: Dispatch }) {
	const refs = shot.refs || [];
	const addZone = useUploadDrop((src) => dispatch({ type: 'addRef', src }));
	return (
		<div className="ns-inputs ns-refsgroup">
			<div className="ns-refgroup-h">{NI.layers()} References</div>
			<div className="ns-fslot-row">
				{refs.map((r) => (
					<div className="ns-fslot" key={r.id}>
						<div className="ns-fslot-img" style={{ cursor: 'default' }}>
							<NImg src={r.src} />
							<span className="ns-fslot-tag">Reference</span>
							<span className="ns-fslot-x" role="button" title="Remove reference" onClick={() => dispatch({ type: 'removeRef', id: r.id })}>{I.x()}</span>
						</div>
					</div>
				))}
				<div className="ns-fslot">
					<button className={'ns-fslot-add' + (addZone.over ? ' ns-drop-over' : '')} {...addZone.dropProps} onClick={addZone.pick} title="Upload, or drag a reference from the library or output">
						{refs.length ? I.plus() : <>{NI.layers()}<b>References</b><span>Upload or drag</span></>}
					</button>
				</div>
			</div>
		</div>
	);
}

// empty thumbnail slot — click to add a reference
function EmptyRefSlot({ dispatch }: { dispatch: Dispatch }) {
	const { over, dropProps, pick } = useUploadDrop((src) => dispatch({ type: 'addComp', src }));
	return (
		<button className={'ns-comp-empty' + (over ? ' ns-drop-over' : '')} {...dropProps} onClick={pick} title="Upload or drop a reference image">{I.plus()}</button>
	);
}

function StillReferences({ shot, dispatch }: { shot: StudioShot; dispatch: Dispatch }) {
	return (
		<div className="ns-comps-grid">
			{shot.comps.map((c) => <RefTile key={c.id} comp={c} dispatch={dispatch} />)}
			<EmptyRefSlot dispatch={dispatch} />
		</div>
	);
}

function MotionReferences({ shot, dispatch }: { shot: StudioShot; dispatch: Dispatch }) {
	return (
		<div className="ns-motionrefs">
			<div className="ns-comps-grid">
				{shot.comps.map((c) => <RefTile key={c.id} comp={c} dispatch={dispatch} />)}
				<EmptyRefSlot dispatch={dispatch} />
			</div>
		</div>
	);
}

function ReferencesPanel({ shot, dispatch, spot }: { shot: StudioShot; dispatch: Dispatch; spot: string | null }) {
	const motion = shot.mode === 'motion';
	const count = motion
		? (shot.sampledFrames ? shot.sampledFrames.length : 0) + (shot.startFrame ? 1 : 0) + (shot.endFrame ? 1 : 0) + shot.comps.length
		: shot.comps.length;
	return (
		<section className={'ns-panel ns-area-refs' + (spot === 'refs' ? ' ns-spot' : '')}>
			<div className="ns-panel-head">
				<h2>References Library</h2>
				<span className="flex" /><span className="chip">{count}</span>
			</div>
			<div className="ns-panel-body">
				{motion ? <MotionReferences shot={shot} dispatch={dispatch} /> : <StillReferences shot={shot} dispatch={dispatch} />}
			</div>
		</section>
	);
}

/* ---------------- Prompt (Frame + Visual Style + staging) ---------------- */
const REFINE_TIPS = [{ title: 'Hero into the Composition', desc: "Place the Hero in the Composition's layout" }];
const ENHANCE_CLAUSE = 'Heightened realism, refined micro-contrast and deliberate light shaping.';

function PromptPanel({ shot, view, dispatch, spot, toast, frame, style, tx }: { shot: StudioShot; view: string; dispatch: Dispatch; spot: string | null; toast: (m: string) => void; frame: ToolState['frame']; style: Style; tx: Tx }) {
	const motion = shot.mode === 'motion';
	const tips = REFINE_TIPS;
	const [assembledOpen, setAssembledOpen] = useState(false);
	const [assembledEdit, setAssembledEdit] = useState<string | null>(null);
	const cameraLine = ` Shot on ${frame.lens} at ƒ${frame.fstop}, ${frame.size.toLowerCase()} framing, ${frame.light.toLowerCase()}, ${style.grade.toLowerCase()} grade.`;
	const HERO_HINT = "@hero placed into the reference's exact framing, scale and lighting.";
	const styleDesc = (style.suffix || '').trim();
	const workflowOn = !!shot.workflow;
	const finalized = !!shot.promptFinal;
	const styleLine = tx.styleSet ? (styleDesc + cameraLine).replace(/\s+/g, ' ').trim() : '';
	const previewBase = styleLine;
	const previewHint = workflowOn ? HERO_HINT : '';
	const previewText = (previewBase + (previewHint ? ' ' + previewHint : '')).replace(/\s+/g, ' ').trim();
	const override = (shot.promptOverride || '').trim();
	const finalText = override || resolvePrompt(shot, view, style, frame);
	const videoSentence = `@hero performs the reference's ${tx.tools.motion.move.toLowerCase()} — smooth, continuous video with consistent lighting and label legibility across the full ${tx.tools.motion.dur}s.`;
	const videoFinal = override || videoSentence;
	const videoText = finalized ? videoFinal : videoSentence;
	const promptText = motion ? videoText : finalized ? finalText : previewText;
	const copyPrompt = () => {
		if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(promptText).then(() => toast('Prompt copied to clipboard'), () => toast('Prompt copied'));
		else toast('Prompt copied');
	};
	return (
		<section className={'ns-panel ns-area-prompt' + (spot === 'prompt' ? ' ns-spot' : '')}>
			<div className="ns-panel-head">
				<div className="seg">
					<button className={!motion ? 'on' : ''} onClick={() => dispatch({ type: 'setMode', value: 'still' })}>{NI.still()} Image</button>
					<button className={motion ? 'on' : ''} onClick={() => dispatch({ type: 'setMode', value: 'motion' })}>{NI.motion()} Video</button>
				</div>
				<span className="flex" />
			</div>
			<div className="ns-panel-body">
				<div className="ns-kf-row ns-inputs-row">
					{motion ? (
						<div className="ns-inputs">
							<div className="ns-refgroup-h">{NI.motion()} Video input<span className="flex" />
								<div className="seg sm ns-vmode">
									<button className={shot.videoMode === 'refs' ? '' : 'on'} onClick={() => dispatch({ type: 'setVideoMode', value: 'frames' })} title="Animate from a Start frame to an End frame">Start → End</button>
									<button className={shot.videoMode === 'refs' ? 'on' : ''} onClick={() => dispatch({ type: 'setVideoMode', value: 'refs' })} title="Drive the clip from up to 4 reference images (Kling Elements)">References</button>
								</div>
							</div>
							{shot.videoMode === 'refs' ? (
								<ReferencesGroup shot={shot} dispatch={dispatch} />
							) : (
								<div className="ns-fslot-row">
									<InputSlot label="Start frame" value={shot.startFrame} onSet={(v) => dispatch({ type: 'setFrameRef', role: 'start', value: v })} onClear={() => dispatch({ type: 'setFrameRef', role: 'start', value: null })} />
									<InputSlot label="End frame" value={shot.endFrame} onSet={(v) => dispatch({ type: 'setFrameRef', role: 'end', value: v })} onClear={() => dispatch({ type: 'setFrameRef', role: 'end', value: null })} />
								</div>
							)}
						</div>
					) : (
						<div className="ns-inputs">
							<div className="ns-refgroup-h">{NI.hero()} Inputs</div>
							<div className="ns-fslot-row">
								<InputSlot label="Hero" value={shot.heroSrc} onSet={(v) => dispatch({ type: 'setInput', field: 'heroSrc', value: v })} onClear={() => dispatch({ type: 'setInput', field: 'heroSrc', value: null })} />
								<InputSlot label="Composition" value={shot.compSrc} onSet={(v) => dispatch({ type: 'setInput', field: 'compSrc', value: v })} onClear={() => dispatch({ type: 'setInput', field: 'compSrc', value: null })} />
							</div>
						</div>
					)}
				</div>
				{!motion && (
					<div className="ns-refine">
						<div className="ns-refine-head">{NI.wand()} Workflow{workflowOn && <button className="ns-refine-clear" onClick={() => { dispatch({ type: 'setWorkflow', value: false }); toast('Workflow cleared'); }}>{I.x({ style: { fontSize: '11px' } })} Clear</button>}</div>
						<div className="ns-refine-cards">
							{tips.map((t) => {
								const on = workflowOn;
								return (
									<button className={'ns-refine-card' + (on ? ' on' : '')} key={t.title} onClick={() => { dispatch({ type: 'setWorkflow' }); toast((on ? 'Removed · ' : 'Applied · ') + t.title); }}>
										<b>{t.title}{on && <span className="ns-refine-tick">{TI.check()}</span>}</b>
										<span>{t.desc}</span>
									</button>
								);
							})}
						</div>
					</div>
				)}
				{!motion && (
					<div className="ns-prompt-box" contentEditable suppressContentEditableWarning spellCheck={false} title="Click to edit the prompt">
						<div className="ns-prompt-bar" contentEditable={false}>
							<div className="ns-prompt-acts">
								<button className="ns-prompt-act" title="Enhance prompt" onClick={() => { dispatch({ type: 'promptAppend', text: ENHANCE_CLAUSE }); toast('Prompt enhanced'); }}>{NI.sparkles()}</button>
								<button className="ns-prompt-act" title="Copy full prompt" onClick={copyPrompt}>{I.copy()}</button>
							</div>
						</div>
						{finalized ? (
							<span className="ns-prompt-cam">{finalText}</span>
						) : previewText ? (
							<>{previewBase && <span className="ns-prompt-empty">{previewBase}</span>}{previewHint && <span className="ns-prompt-extra">{previewBase ? ' ' : ''}{previewHint}</span>}</>
						) : (
							<span className="ns-prompt-empty" contentEditable={false}>Add a Hero and Composition, then pick a Workflow — the assembled prompt builds here.</span>
						)}
						<div className="ns-prompt-actions-row" contentEditable={false}>
							<button className="ns-prompt-assembled" onClick={() => setAssembledOpen(true)} title="Open the full assembled prompt to view & edit">{NI.motion()} Assembled prompt</button>
							<button className="ns-prompt-go" title="Run — assemble the final prompt" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'finalizePrompt' }); toast('Prompt assembled'); }}>{I.play()} Run</button>
						</div>
					</div>
				)}
				{!motion && <div className="ns-tools-sep" />}
				{!motion && <ToolsBar shot={shot} tools={tx.tools} onFrame={tx.onFrame} onMotion={tx.onMotion} />}
				{motion && (
					<div className="ns-vprompt">
						<div className="ns-refgroup-h">{NI.motion()} Video Prompt</div>
						<div className="ns-prompt-box ns-vprompt-box" contentEditable suppressContentEditableWarning spellCheck={false} title="Describe how @hero moves through the clip">
							<div className="ns-prompt-bar" contentEditable={false}>
								<div className="ns-prompt-acts">
									<button className="ns-prompt-act" title="Copy full prompt" onClick={copyPrompt}>{I.copy()}</button>
								</div>
							</div>
							{videoText.split('@hero').map((p, i) => (
								<span key={i}>{i > 0 && <span className="ns-tok" style={{ fontSize: '11px', padding: '0 4px' }}>@hero</span>}{p}</span>
							))}
							<div className="ns-prompt-actions-row" contentEditable={false}>
								<button className="ns-prompt-assembled" onClick={() => setAssembledOpen(true)} title="Open the full assembled prompt to view & edit">{NI.motion()} Assembled prompt</button>
								<button className="ns-prompt-go" title="Run — assemble the final video prompt" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'finalizePrompt' }); toast('Video prompt assembled'); }}>{I.play()} Run</button>
							</div>
						</div>
					</div>
				)}
			</div>
			{assembledOpen && (
				<div className="ns-modal-veil" onClick={() => setAssembledOpen(false)}>
					<div className="ns-modal ns-modal-prompt" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Assembled prompt">
						<div className="ns-modal-h">
							<span className="ns-modal-title">{NI.motion()} Assembled prompt</span>
							<button className="icon-btn" onClick={() => setAssembledOpen(false)} title="Close">{I.x()}</button>
						</div>
						<div className="ns-modal-body">
							<textarea className={'ns-assembled-ta' + (!finalized && assembledEdit == null ? ' preview' : '')} spellCheck={false} placeholder="Add a Hero and Composition, then pick a Workflow — the assembled prompt builds here." value={assembledEdit ?? promptText} onChange={(e) => setAssembledEdit(e.target.value)} />
						</div>
						<div className="ns-modal-foot">
							<span className="ns-modal-note">The complete prompt sent to the model — edit freely, then Save.</span>
							<span className="flex" />
							{assembledEdit != null && <button className="btn" onClick={() => { setAssembledEdit(null); dispatch({ type: 'setPromptOverride', text: '' }); toast('Reset to assembled prompt'); }}>{I.refresh()} Reset</button>}
							<button className="btn" onClick={() => { const t = assembledEdit ?? promptText; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t); toast('Prompt copied'); }}>{I.copy()} Copy</button>
							<button className="btn filled" onClick={() => { if (assembledEdit != null) dispatch({ type: 'setPromptOverride', text: assembledEdit }); setAssembledOpen(false); }}>Save</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

/* ---------------- Output ---------------- */
function StillResult({ shot, style, selSrc, takeNo }: { shot: StudioShot; style: Style; selSrc: string; takeNo: number }) {
	return (
		<>
			<NImg src={selSrc || A.stills[0] || shot.stillSrc} className="ns-stage-img" fit="contain" style={{ background: '#0e0f12' }} />
			<span className="ns-stage-badge">{NI.sparkles()} FramePick · gpt-image · {style.grade}</span>
			<span className="ns-stage-tc">@hero composed into reference · take {takeNo}</span>
		</>
	);
}

function DemoFrames({ motion, frames }: { motion: ToolState['motion']; frames: string[] }) {
	const [i, setI] = useState(0);
	useEffect(() => {
		const id = setInterval(() => setI((x) => (x + 1) % frames.length), 360);
		return () => clearInterval(id);
	}, [frames.length]);
	const t = (i / (frames.length - 1)) * motion.dur;
	return (
		<>
			<NImg src={frames[i]} className="ns-stage-img" fit="cover" />
			<span className="ns-stage-badge"><span className="ns-rec" /> {motion.model} · {motion.dur}s · preview</span>
			<span className="ns-stage-tc">{t.toFixed(1)}s / {motion.dur.toFixed(1)}s · {motion.move}</span>
		</>
	);
}

function MotionResult({ shot, motion }: { shot: StudioShot; motion: ToolState['motion'] }) {
	if (shot.videoUrl) {
		return (
			<>
				<video className="ns-stage-img" src={shot.videoUrl} controls autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#0e0f12' }} />
				<span className="ns-stage-badge">{NI.motion()} {motion.model} · {motion.dur}s</span>
			</>
		);
	}
	return <DemoFrames motion={motion} frames={shot.motionFrames || A.outFrames} />;
}

function OutputPanel({ shot, gen, dispatch, spot, tools, style, fix, toast }: { shot: StudioShot; gen: Gen | null; dispatch: Dispatch; spot: string | null; tools: ToolState; style: Style; fix: Fix | null; toast: (m: string) => void }) {
	const mode = shot.mode;
	const ready = shot.output[mode] === 'ready';
	const busy = !!gen && gen.shotId === shot.id && gen.mode === mode;
	const fixing = !!fix && fix.shotId === shot.id;
	const motion = mode === 'motion';
	const hist = shot.history && shot.history.length ? shot.history : ready && !motion ? [A.stills.slice(0, 4)] : [];
	const sel = shot.sel || { r: hist.length - 1, c: 0 };
	const selSrc = hist[sel.r] ? hist[sel.r][sel.c] : A.stills[0];
	const takeNo = hist.slice(0, sel.r).reduce((n, row) => n + row.length, 0) + sel.c + 1;
	const likedSrcs = new Set(shot.comps.map((c) => (c.mediaId ? NS_MEDIA_BY_ID[c.mediaId].src : c.src || '')));
	const [genRes, setGenRes] = useState('2K');
	const [genAspect, setGenAspect] = useState('1:1');
	const [genBatch, setGenBatch] = useState(1);
	const [vidModel, setVidModel] = useState('kling-v3');
	const [vidQuality, setVidQuality] = useState('std');
	const [vidDur, setVidDur] = useState(5);
	const [vidAspect, setVidAspect] = useState('1:1');
	const [vidBatch, setVidBatch] = useState(1);
	const [lightbox, setLightbox] = useState<string | null>(null);
	const [credits, setCredits] = useState<number | null>(getBalance());
	useEffect(() => {
		const unsub = subscribeBalance(() => setCredits(getBalance()));
		if (motion) refreshBalance();
		return unsub;
	}, [motion, ready]);
	const vidCost = videoCost({ model: vidModel, quality: vidQuality, duration: vidDur, aspect: vidAspect, batch: vidBatch });
	const enoughCredits = credits == null || credits >= vidCost; // can't block when balance is unknown
	const runVideo = () => {
		if (busy || !enoughCredits) return;
		dispatch({ type: 'generate', settings: { aspect: vidAspect, batch: vidBatch, dur: String(vidDur), quality: vidQuality, model: vidModel } });
		noteSpend(vidCost); // optimistic; trued up by refreshBalance after the job
	};

	return (
		<section className={'ns-panel ns-area-out' + (spot === 'out' ? ' ns-spot' : '')}>
			<div className="ns-out-head">
				<h2 style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--faint)' }}>Output</h2>
				<span className="flex" />
			</div>

			<div className={'ns-stage' + (!ready && !busy ? ' empty' : '')}>
				{busy ? (
					<div className="ns-stage-veil"><Spinner className="lt" /><span>{gen.label}</span></div>
				) : ready ? (
					<>
						{motion ? <MotionResult shot={shot} motion={tools.motion} /> : <StillResult shot={shot} style={style} selSrc={selSrc} takeNo={takeNo} />}
						{fixing && fix && <div className="ns-stage-veil"><Spinner className="lt" /><span>{fix.label}</span></div>}
					</>
				) : (
					<div className="ns-stage-empty">
						<span className="ic">{motion ? NI.motion() : NI.still()}</span>
						<b>Generate to preview</b>
						<p>{motion ? 'Sampled frames guide the camera move; @hero performs it as a Kling clip.' : '@hero is composed into the reference framing as an image.'}</p>
					</div>
				)}
			</div>

			{!motion && hist.length > 0 && (
				<div className="ns-history">
					{hist.map((row, r) => (
						<div className="ns-variants" key={r}>
							{row.map((src, c) => {
								const on = sel.r === r && sel.c === c;
								const liked = likedSrcs.has(src);
								return (
									<button key={c} className={'ns-variant' + (on ? ' on' : '')} {...refDragProps({ src, kind: 'still' })} onClick={() => dispatch({ type: 'setSel', value: { r, c } })} title={`Take ${hist.slice(0, r).reduce((n, rr) => n + rr.length, 0) + c + 1} — drag into a slot`}>
										<img src={src} alt="" draggable={false} />
										<span className="ns-expand" role="button" title="Expand preview" onClick={(e) => { e.stopPropagation(); setLightbox(src); }}>{I.expand()}</span>
										<span className={'ns-like' + (liked ? ' on' : '')} role="button" title={liked ? 'In References Library' : 'Add to References Library'} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'likeImage', src }); toast(liked ? 'Already in References Library' : 'Added to References Library'); }}>
											{I.heart({ fill: liked ? 'currentColor' : 'none' })}
										</span>
									</button>
								);
							})}
						</div>
					))}
				</div>
			)}

			<div className="ns-out-foot">
				{motion && (
					<div className="ns-genset">
						<div className="ns-genset-grp"><span>Model</span>
							<select className="ns-genset-select" value={vidModel} onChange={(e) => setVidModel(e.target.value)} title="Kling video model">
								{KLING_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
							</select>
						</div>
						<div className="ns-genset-grp"><span>Quality</span>
							<div className="seg sm">{[['std', 'Standard'], ['pro', 'Pro']].map(([v, l]) => <button key={v} className={vidQuality === v ? 'on' : ''} onClick={() => setVidQuality(v)}>{l}</button>)}</div>
						</div>
						<div className="ns-genset-grp"><span>Duration</span>
							<div className="ns-step">
								<button className="ns-step-btn" title="Shorter" disabled={vidDur <= 3} onClick={() => setVidDur((d) => Math.max(3, d - 1))}>−</button>
								<b className="ns-step-val">{vidDur}s</b>
								<button className="ns-step-btn" title="Longer" disabled={vidDur >= 15} onClick={() => setVidDur((d) => Math.min(15, d + 1))}>+</button>
							</div>
						</div>
						<div className="ns-genset-grp"><span>Aspect ratio</span>
							<div className="seg sm">{['1:1', '9:16', '16:9'].map((a) => <button key={a} className={vidAspect === a ? 'on' : ''} onClick={() => setVidAspect(a)}>{a}</button>)}</div>
						</div>
						<div className="ns-genset-grp"><span>Batch size</span>
							<div className="seg sm">{[1, 2, 3, 4].map((b) => <button key={b} className={vidBatch === b ? 'on' : ''} onClick={() => setVidBatch(b)}>{b}</button>)}</div>
						</div>
						<div className="ns-credits">
							<span>Cost <b>~{vidCost}</b> credits</span>
							<span className="flex" />
							<span className={enoughCredits ? '' : 'low'} title={credits == null ? 'Connect valid Kling keys to see your balance' : ''}>Available <b>{credits == null ? '—' : formatCredits(credits)}</b> credits</span>
						</div>
						<button className="btn filled ns-genset-go" disabled={busy || !enoughCredits} onClick={runVideo}>
							{busy ? <><Spinner className="lt" /> {gen.label}</> : !enoughCredits ? <>Not enough credits</> : ready ? <>{I.refresh()} Regenerate Video</> : <>{NI.sparkles()} Generate Video</>}
						</button>
					</div>
				)}
				{!motion && (
					<div className="ns-genset">
						<div className="ns-genset-grp"><span>Model</span><b className="ns-genset-model">{NI.sparkles()} GPT Image 2</b></div>
						<div className="ns-genset-grp"><span>Quality</span><b>Low</b></div>
						<div className="ns-genset-grp"><span>Resolution</span>
							<div className="seg sm">{['1K', '2K', '4K'].map((r) => <button key={r} className={genRes === r ? 'on' : ''} onClick={() => setGenRes(r)}>{r}</button>)}</div>
						</div>
						<div className="ns-genset-grp"><span>Aspect ratio</span>
							<div className="seg sm">{['1:1', '9:16', '16:9'].map((a) => <button key={a} className={genAspect === a ? 'on' : ''} onClick={() => setGenAspect(a)}>{a}</button>)}</div>
						</div>
						<div className="ns-genset-grp"><span>Batch size</span>
							<div className="seg sm">{[1, 2, 3, 4].map((b) => <button key={b} className={genBatch === b ? 'on' : ''} onClick={() => setGenBatch(b)}>{b}</button>)}</div>
						</div>
						<button className="btn filled ns-genset-go" disabled={busy} onClick={() => dispatch({ type: 'generate', settings: { res: genRes, aspect: genAspect, batch: genBatch } })}>
							{busy ? <><Spinner className="lt" /> {gen.label}</> : ready ? <>{I.refresh()} Regenerate</> : <>{NI.sparkles()} Generate</>}
						</button>
					</div>
				)}
			</div>
			{lightbox && (
				<div className="ns-modal-veil" onClick={() => setLightbox(null)}>
					<div className="ns-lightbox" onClick={(e) => e.stopPropagation()}>
						<button className="ns-lightbox-x" onClick={() => setLightbox(null)} title="Close">{I.x()}</button>
						<img src={lightbox} alt="Generated preview" draggable={false} />
					</div>
				</div>
			)}
		</section>
	);
}

/* ---------------- Workspace shell ---------------- */
export function ShotWorkspace({ shot, layout, promptView, gen, spot, dispatch, toast, banner, tx }: { shot: StudioShot; layout: string; promptView: string; gen: Gen | null; spot: string | null; dispatch: Dispatch; toast: (m: string) => void; banner: ReactNode; tx: Tx }) {
	const [editing, setEditing] = useState(false);
	const [val, setVal] = useState(shot.title);
	useEffect(() => { setVal(shot.title); }, [shot.id, shot.title]);
	const commit = () => { setEditing(false); if (val.trim() && val !== shot.title) dispatch({ type: 'rename', title: val.trim() }); else setVal(shot.title); };
	const style = tx.activeStyle;

	return (
		<div className="ns-ws">
			<div className="ns-ws-head">
				<div className="ns-ws-titles">
					<div className="row">
						{editing ? (
							<input className="ns-ws-title-input" autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(shot.title); setEditing(false); } }} />
						) : (
							<h1 onClick={() => setEditing(true)}>{shot.title}</h1>
						)}
						<span className="chip">{shot.n}</span>
						{shot.status === 'gen' ? (
							<span className="status gen">Generating</span>
						) : (
							<StatusPill status={shot.status} onChange={(v) => dispatch({ type: 'setStatus', value: v })} />
						)}
					</div>
				</div>
				<div className="ns-ws-actions" />
			</div>
			<div className="ns-ws-body">
				{banner}
				<VisualStyleSection text={tx.vsText} activeStyle={style} styleSet={tx.styleSet} recipes={tx.recipes} activeRecipeId={tx.activeRecipeId} scope={tx.scope} onChange={tx.onVsText} onEnhance={tx.onEnhanceStyle} onOpenRecipes={tx.onOpenRecipes} onReset={tx.onResetProject} onScope={tx.onScope} onPickRecipe={tx.onPickRecipe} onAddStyle={tx.onAddStyle} />
				<div className="ns-grid" data-layout={layout}>
					<ReferencesPanel shot={shot} dispatch={dispatch} spot={spot} />
					<PromptPanel shot={shot} view={promptView} dispatch={dispatch} spot={spot} toast={toast} frame={tx.tools.frame} style={style} tx={tx} />
					<OutputPanel shot={shot} gen={gen} dispatch={dispatch} spot={spot} tools={tx.tools} style={style} fix={tx.fix} toast={toast} />
				</div>
			</div>
		</div>
	);
}

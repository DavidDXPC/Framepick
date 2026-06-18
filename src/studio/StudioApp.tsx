// nFrame Studio — app shell, slim shot rail, guided walkthroughs.
// Ported from ns-app.jsx; window globals → ES imports, simulated generation →
// real OpenAI/Kling services (generation.ts) with a demo-history fallback.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { NI, I, TI } from './icons';
import { A, COMP_POOL, NS_MEDIA_BY_ID, NS_SHOTS0, nsUid } from './assets';
import { nsDefaultTools, RECIPES0, recipeStyleText, resolvePrompt, STYLE_BY_ID, RecipesModal } from './tools';
import { ShotWorkspace } from './workspace';
import { SafariWindow } from './extension';
import { studioGenerateImage, studioGenerateVideo } from './generation';
import { ApiKeysModal } from '../components/ApiKeysModal';
import { loadApiKeys } from '../state/persistence';
import type { ApiKeys } from '../state/types';
import type { Demo, DemoKind, Fix, Gen, Mode, Recipe, Style, StudioShot, ToolState, Tx } from './types';

const CAPTIONS: Record<DemoKind, string[]> = {
	default: [
		'The default flow lives in one Shot Workspace. Your Hero — the Prozis shaker — is the subject FramePick keeps consistent.',
		'Add a Composition reference — the tru ENERGY can. It sets framing, lens and light; your Hero stays the subject.',
		'The prompt keeps @hero in the subject slot — the reference only drives the look.',
		'Generate an image — or switch to Video. They are equal peers on every shot.',
		'That is a shot: Hero in, reference in, @hero out.',
	],
	still: [
		'In Chrome, the user browses a site like Pinterest and finds a still image — or pauses on a specific frame.',
		'They activate the FramePick Extension — its picker arms over the page.',
		'The Extension captures the frame as a Composition Reference and analyzes its composition, lighting, camera angle, framing, mood and style.',
		'It writes a prompt for that look, then replaces the original subject with @hero. The user clicks "Use as Composition".',
		'FramePick Studio receives the image, prompt, source URL and metadata. Applied to this shot, the frame drops into the Composition slot — the existing Hero stays the subject.',
		'Hero into Composition + Run assembles the final @hero prompt; Generate Image places the Hero inside the captured composition, keeping its lighting, mood and visual-style grade.',
	],
	motion: [
		'In Chrome, the user finds a motion reference — a video, GIF, reel or animated preview.',
		'They activate the FramePick Extension — it detects the motion source and lets them sample 4, 6, 8 or 10 frames.',
		'The Extension captures keyframes across the timeline as Composition References and analyzes the camera move, subject placement, framing, scale, timing and scene evolution.',
		'It writes a motion prompt for that sequence, swaps the original subject for @hero, and the user clicks "Use as Composition Refs".',
		'FramePick Studio receives the frames, timestamps, prompt, source URL and metadata — adding the sampled frames to the References Library and the shot’s Composition refs. The Hero stays the subject.',
		'Hero into Composition + Run composites @hero into each sampled frame (saved to the library) → those clean hero frames move into the Video Panel as references → Generate Video drives @hero through the motion.',
	],
	appMotion: [
		'Same Shot Workspace, same Hero — the Prozis shaker. This time we give it video, no extension needed.',
		'Switch the shot to Video. Image and Video are equal peers on every shot.',
		'Add a video reference — a turntable clip. Set start & end keyframes whenever you want them.',
		'The prompt keeps @hero as the subject, performing the reference’s move.',
		'Generate — @hero turns through the reference’s video as a Kling clip.',
		'That is a video shot: Hero in, video reference in, @hero animated out.',
	],
};
const DEMO_TITLE: Record<DemoKind, string> = { default: 'In-app · Image', appMotion: 'In-app · Video', still: 'FramePick Extension · Image', motion: 'FramePick Extension · Video' };

const STORAGE_KEY = 'framepick:studio:v1';

function computeStyle(tc: ToolState, projectStyle: string, recipes: Recipe[]): Style {
	const base = STYLE_BY_ID[tc.style || projectStyle] || STYLE_BY_ID[projectStyle];
	const activeRecipe = recipes.find((r) => r.id === tc.recipeId);
	return activeRecipe && activeRecipe.custom ? { ...base, name: activeRecipe.name } : base;
}

function ShotRail({ shots, activeId, onSelect, onAdd, onDuplicate, onDelete }: { shots: StudioShot[]; activeId: string; onSelect: (id: string) => void; onAdd: () => void; onDuplicate: (id: string) => void; onDelete: (id: string) => void }) {
	return (
		<div className="ns-rail">
			<span className="ns-rail-head">Shots</span>
			{shots.map((s) => {
				const dotColor = s.output[s.mode] === 'ready' ? 'var(--green)' : s.status === 'gen' ? 'var(--orange)' : 'var(--faint)';
				return (
					<div key={s.id} className={'ns-rail-item' + (s.id === activeId ? ' on' : '')} onClick={() => onSelect(s.id)} role="button" tabIndex={0}>
						<span className="ns-rail-thumb">
							<span className="ns-rail-badge">{s.n}</span>
							{s.mode === 'motion' && <span className="ns-rail-vid">{I.play()}</span>}
							<span className="ns-rail-acts">
								<button className="ns-rail-act" title="Duplicate shot" onClick={(e) => { e.stopPropagation(); onDuplicate(s.id); }}>{TI.dup()}</button>
								<button className="ns-rail-act danger" title="Delete shot" onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}>{TI.trash()}</button>
							</span>
						</span>
						<span className="ns-rail-n" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
							<span className="ns-rail-sdot" style={{ background: dotColor }} />{s.mode === 'motion' ? 'Video' : 'Image'}
						</span>
					</div>
				);
			})}
			<button className="ns-rail-add" title="Reset shot" onClick={onAdd}>{I.plus()}</button>
		</div>
	);
}

interface Persisted {
	shots: StudioShot[];
	toolState: Record<string, ToolState>;
	projectStyle: string;
	styleSet: boolean;
	projectStyleText: string;
	recipes: Recipe[];
	activeId: string;
}

function loadStudio(): Partial<Persisted> | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Partial<Persisted>) : null;
	} catch {
		return null;
	}
}

const defaultToolState = (): Record<string, ToolState> =>
	Object.fromEntries(NS_SHOTS0.map((s) => [s.id, { ...nsDefaultTools(s), configured: s.status === 'ready', recipe: null }]));

export function StudioApp() {
	const saved = useRef(loadStudio()).current;
	const [shots, setShots] = useState<StudioShot[]>(() => (saved?.shots?.length ? saved.shots : NS_SHOTS0));
	const [activeId, setActiveId] = useState(() => saved?.activeId || 's1');
	const [screen, setScreen] = useState<'workspace' | 'browser'>('workspace');
	const layout = 'flow';
	const [promptView, setPromptView] = useState('hero');
	const [gen, setGen] = useState<Gen | null>(null);
	const [demo, setDemo] = useState<Demo | null>(null);
	const [spot, setSpot] = useState<string | null>(null);
	const [toastMsg, setToastMsg] = useState<string | null>(null);
	const [toolState, setToolState] = useState<Record<string, ToolState>>(() => saved?.toolState || defaultToolState());
	const [projectStyle, setProjectStyle] = useState(saved?.projectStyle || 'amber');
	const [styleSet, setStyleSet] = useState(saved?.styleSet ?? true);
	const [styleScope, setStyleScope] = useState('shot');
	const [recipes, setRecipes] = useState<Recipe[]>(saved?.recipes?.length ? saved.recipes : RECIPES0);
	const [recipesOpen, setRecipesOpen] = useState(false);
	const [projectStyleText, setProjectStyleText] = useState(saved?.projectStyleText || '');
	const [fix, setFix] = useState<Fix | null>(null);
	const [guideOpen, setGuideOpen] = useState(false);
	const [apiKeys, setApiKeys] = useState<ApiKeys>(() => loadApiKeys());
	const [apiKeysOpen, setApiKeysOpen] = useState(false);

	const timers = useRef<number[]>([]);
	const after = (ms: number, fn: () => void) => { const id = window.setTimeout(fn, ms); timers.current.push(id); return id; };
	const clearTimers = () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = []; };
	useEffect(() => () => clearTimers(), []);
	const toastTimer = useRef<number | null>(null);
	const toast = useCallback((msg: string) => { setToastMsg(msg); if (toastTimer.current) window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToastMsg(null), 2000); }, []);

	const activeShot = shots.find((s) => s.id === activeId) || shots[0];
	const patchShot = (id: string, patch: Partial<StudioShot> | ((s: StudioShot) => Partial<StudioShot>)) =>
		setShots((l) => l.map((s) => (s.id === id ? { ...s, ...(typeof patch === 'function' ? patch(s) : patch) } : s)));

	// persist
	useEffect(() => {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ shots, toolState, projectStyle, styleSet, projectStyleText, recipes, activeId })); } catch { /* quota */ }
	}, [shots, toolState, projectStyle, styleSet, projectStyleText, recipes, activeId]);

	// fresh-state ref for async generation (avoids stale closures in timed guides)
	const stateRef = useRef({ shots, toolState, projectStyle, recipes });
	stateRef.current = { shots, toolState, projectStyle, recipes };
	const demoRef = useRef(demo);
	demoRef.current = demo;

	// reset the single starter shot to a clean "new still" so the demos start fresh
	const resetDemoShot = () => setShots((l) => l.map((s) => (s.id === 's1' ? { ...s, comps: [{ id: nsUid(), mediaId: 'ref-shaker', kind: 'still' }, { id: nsUid(), mediaId: 'ref-rope', kind: 'still' }], status: 'draft', mode: 'still', startFrame: null, endFrame: null, sampledFrames: [], heroSrc: null, compSrc: null, refs: [], workflow: false, promptFinal: false, history: [], sel: null, output: { still: null, motion: null } } : s)));
	const addMotionCompTo = (id: string) => setShots((l) => l.map((s) => (s.id === id ? { ...s, mode: 'motion', startFrame: null, endFrame: null, sampledFrames: [], comps: [{ id: nsUid(), mediaId: 'vid-orbit', kind: 'motion', frameCount: 8, dur: 6 }] } : s)));
	const sampleMotionTo = (id: string) => setShots((l) => l.map((s) => {
		if (s.id !== id) return s;
		const frames = A.srcFrames.slice(0, 3).map((src, i) => ({ id: nsUid(), src, n: i + 1 }));
		return { ...s, mode: 'motion', startFrame: null, endFrame: null, comps: [...s.comps, ...frames.map((f) => ({ id: nsUid(), src: f.src, kind: 'still' as const }))], refs: frames.map((f) => ({ id: nsUid(), src: f.src })), sampledFrames: frames, heroSrc: A.heroAsset };
	}));

	// ---------- generation (real, with demo fallback) ----------
	const demoStills = (shotId: string, batch: number): string[] => {
		const s = stateRef.current.shots.find((x) => x.id === shotId);
		const prior = (s?.history || []).reduce((n, row) => n + row.length, 0);
		return Array.from({ length: batch }, (_, k) => A.stills[(prior + k) % A.stills.length]);
	};
	const finishImage = (shotId: string, srcs: string[]) => {
		setGen(null);
		patchShot(shotId, (s) => { const history = [...(s.history || []), srcs]; return { status: 'ready', output: { ...s.output, still: 'ready' }, history, sel: { r: history.length - 1, c: 0 } }; });
		toast('Image generated — @hero composed');
	};
	const finishMotion = (shotId: string, ok: boolean) => {
		setGen(null);
		patchShot(shotId, (s) => ({ status: 'ready', output: { ...s.output, motion: 'ready' } }));
		toast(ok ? 'Video generated — @hero animated' : 'Video generated — @hero animated (preview)');
	};
	const generate = (shotId: string, mode: Mode, settings?: { res?: string; aspect?: string; batch?: number }) => {
		const st = stateRef.current;
		const shot = st.shots.find((s) => s.id === shotId);
		if (!shot) return;
		const tc = st.toolState[shotId] || nsDefaultTools(shot);
		const style = computeStyle(tc, st.projectStyle, st.recipes);
		patchShot(shotId, { status: 'gen', promptFinal: true });
		const aspect = settings?.aspect || tc.frame.aspect || '1:1';
		const batch = settings?.batch || 1;
		if (mode === 'motion') {
			setGen({ shotId, mode, label: 'Animating with Kling…' });
			const startImage = (shot.history && shot.history.length ? shot.history[shot.history.length - 1][0] : null) || shot.heroSrc || A.heroAsset;
			const prompt = `@hero performs the reference's ${tc.motion.move.toLowerCase()} — smooth, continuous video, consistent lighting and label legibility across the full ${tc.motion.dur}s.`;
			studioGenerateVideo({ prompt, startImage, aspect }, (s) => setGen((g) => (g && g.shotId === shotId ? { ...g, label: `Kling · ${s}…` } : g)))
				.then(() => finishMotion(shotId, true))
				.catch((e: Error) => {
					if (demoRef.current) { finishMotion(shotId, false); return; }
					setGen(null); patchShot(shotId, { status: 'draft' });
					toast(/Kling/i.test(e?.message || '') ? 'Add your Kling keys (🔑 top-right) to generate video.' : 'Video generation failed — ' + (e?.message || 'check your Kling keys.'));
				});
		} else {
			setGen({ shotId, mode, label: 'Rendering image…' });
			const prompt = (shot.promptOverride || '').trim() || resolvePrompt(shot, 'hero', style, tc.frame);
			const hero = shot.heroSrc || A.heroAsset;
			const comp = shot.compSrc || (shot.comps[0] ? (shot.comps[0].mediaId ? NS_MEDIA_BY_ID[shot.comps[0].mediaId].src : shot.comps[0].src || A.ref) : A.ref);
			studioGenerateImage({ prompt, hero, comp, aspect, batch })
				.then((srcs) => finishImage(shotId, srcs))
				.catch((e: Error) => {
					if (demoRef.current) { finishImage(shotId, demoStills(shotId, batch)); return; }
					setGen(null); patchShot(shotId, { status: 'draft' });
					toast(/OpenAI/i.test(e?.message || '') ? 'Add your OpenAI API key (🔑 top-right) to generate images.' : 'Image generation failed — ' + (e?.message || 'check your API key.'));
				});
		}
	};

	const addCompTo = (id: string) => setShots((l) => l.map((s) => {
		if (s.id !== id) return s;
		const used = new Set(s.comps.map((c) => c.mediaId));
		const next = COMP_POOL.find((x) => !used.has(x)) || COMP_POOL[s.comps.length % COMP_POOL.length];
		const m = NS_MEDIA_BY_ID[next];
		return { ...s, comps: [...s.comps, { id: nsUid(), mediaId: next, kind: m.kind, frameCount: 8, dur: 6 }] };
	}));

	// ---------- tools layer ----------
	const activeTools = toolState[activeId] || nsDefaultTools(activeShot);
	const activeStyle = computeStyle(activeTools, projectStyle, recipes);
	const setFrame = (key: string, val: string) => setToolState((m) => ({ ...m, [activeId]: { ...m[activeId], frame: { ...m[activeId].frame, [key]: val } } }));
	const setMotion = (key: string, val: string | number) => setToolState((m) => ({ ...m, [activeId]: { ...m[activeId], motion: { ...m[activeId].motion, [key]: val } } }));
	const pickStyle = (styleId: string) => {
		const st = STYLE_BY_ID[styleId];
		setStyleSet(true);
		patchShot(activeId, { promptFinal: false });
		const applyTo = (t: ToolState): ToolState => ({ ...t, style: styleId, configured: true, frame: { ...t.frame, ...st.frame }, motion: { ...t.motion, ...st.motion } });
		if (styleScope === 'project') {
			setProjectStyle(styleId);
			setProjectStyleText(recipeStyleText(st));
			setToolState((m) => { const n = { ...m }; Object.keys(n).forEach((k) => (n[k] = applyTo(n[k]))); return n; });
			toast('Project style · ' + st.name);
		} else {
			setToolState((m) => ({ ...m, [activeId]: applyTo(m[activeId]) }));
			toast('Shot style · ' + st.name);
		}
	};
	const applyEdit = (_id: string, label: string) => {
		if (activeShot.output[activeShot.mode] !== 'ready') { toast('Generate a result first'); return; }
		setFix({ shotId: activeId, label: label + '…' });
		after(1300, () => { setFix(null); toast('Applied · ' + label); });
	};
	const seedRecipe = (t: ToolState, r: Recipe): ToolState => ({ ...t, frame: { ...t.frame, ...r.frame }, style: r.style, motion: { ...t.motion, ...r.motion }, configured: true, recipe: r.name, recipeId: r.id });
	const applyRecipe = (r: Recipe, scope: string) => {
		if (scope === 'unconfigured') {
			const ids = shots.filter((s) => !(toolState[s.id] && toolState[s.id].configured)).map((s) => s.id);
			if (ids.length === 0) { toast('No unconfigured shots'); return; }
			setToolState((m) => { const n = { ...m }; ids.forEach((id) => (n[id] = seedRecipe(n[id], r))); return n; });
			toast(`${r.name} applied to ${ids.length} shot${ids.length > 1 ? 's' : ''}`);
		} else {
			setToolState((m) => ({ ...m, [activeId]: seedRecipe(m[activeId], r) }));
			toast('Recipe · ' + r.name);
		}
		setProjectStyleText(`${r.name} — ${r.desc}`);
	};
	const addCustomStyle = (styleDesc: string) => {
		setStyleSet(true);
		patchShot(activeId, { promptFinal: false });
		const baseId = activeTools.style || projectStyle;
		const words = styleDesc.trim().split(/\s+/).slice(0, 3);
		const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Custom';
		const r: Recipe = { id: nsUid(), name, tags: ['Custom'], desc: styleDesc.trim(), style: baseId, frame: { ...activeTools.frame }, motion: { ...activeTools.motion }, custom: true };
		setRecipes((l) => [...l, r]);
		if (styleScope === 'project') {
			setProjectStyle(r.style);
			setToolState((m) => { const n = { ...m }; Object.keys(n).forEach((k) => (n[k] = seedRecipe(n[k], r))); return n; });
			toast(`Custom style "${name}" · whole project`);
		} else {
			setToolState((m) => ({ ...m, [activeId]: seedRecipe(m[activeId], r) }));
			toast(`Custom style "${name}" added`);
		}
		setProjectStyleText(styleDesc.trim());
	};
	const pickRecipeInline = (recipeId: string) => {
		setStyleSet(true);
		patchShot(activeId, { promptFinal: false });
		const r = recipes.find((x) => x.id === recipeId);
		if (!r) return;
		if (styleScope === 'project') {
			setProjectStyle(r.style);
			setToolState((m) => { const n = { ...m }; Object.keys(n).forEach((k) => (n[k] = seedRecipe(n[k], r))); return n; });
			setProjectStyleText(`${r.name} — ${r.desc}`);
			toast(`${r.name} · whole project`);
		} else {
			setToolState((m) => ({ ...m, [activeId]: seedRecipe(m[activeId], r) }));
			setProjectStyleText(`${r.name} — ${r.desc}`);
			toast('Style · ' + r.name);
		}
	};
	const saveRecipe = (name: string) => {
		const tc = toolState[activeId]; const st = STYLE_BY_ID[tc.style || projectStyle];
		const nr: Recipe = { id: nsUid(), name, tags: [st.name.split(' ')[0], tc.frame.lens, tc.frame.size], desc: `Saved from "${activeShot.title}" — ${st.grade} grade, ${tc.frame.lens} ${tc.frame.light.toLowerCase()}, ${tc.frame.contrast.toLowerCase()} contrast.`, frame: { ...tc.frame }, style: tc.style || projectStyle, motion: { ...tc.motion } };
		setRecipes((l) => [nr, ...l]); toast('Recipe saved · ' + name);
	};
	const unconfiguredCount = shots.filter((s) => !(toolState[s.id] && toolState[s.id].configured)).length;
	const enhanceStyle = () => {
		if (!projectStyleText.trim()) { setProjectStyleText(recipeStyleText(activeStyle)); toast('Style drafted from · ' + activeStyle.name); }
		else toast('Refining visual style with FramePick…');
	};
	const resetProject = () => {
		setProjectStyleText(''); setProjectStyle('amber'); setStyleScope('shot'); setStyleSet(false);
		setShots((l) => l.map((s) => ({ ...s, title: 'New shot', beat: 'Add a reference to set the look', mode: 'still', status: 'draft', heroSrc: null, compSrc: null, startFrame: null, endFrame: null, sampledFrames: [], refs: [], promptExtra: '', workflow: false, promptFinal: false, history: [], sel: null, output: { still: null, motion: null } })));
		setToolState(() => { const next: Record<string, ToolState> = {}; for (const sh of shots) next[sh.id] = { ...nsDefaultTools(sh), configured: false, recipe: null }; return next; });
		setPromptView('hero');
		toast('Project reset — References Library kept');
	};
	const tx: Tx = { tools: activeTools, activeStyle, styleSet, scope: styleScope, recipes, activeRecipeId: activeTools.recipeId, recipeCount: recipes.length, vsText: projectStyleText, onFrame: setFrame, onMotion: setMotion, onStyle: pickStyle, onPickRecipe: pickRecipeInline, onAddStyle: addCustomStyle, onScope: setStyleScope, onEdit: applyEdit, onOpenRecipes: () => setRecipesOpen(true), onVsText: setProjectStyleText, onEnhanceStyle: enhanceStyle, onResetProject: resetProject, fix };

	// ---------- workspace dispatch ----------
	const mergeClause = (extra: string | undefined, text: string) => { const e = (extra || '').trim(); return e.includes(text) ? e : e ? e + ' ' + text : text; };
	const dispatch = (a: { type: string; [k: string]: unknown }) => {
		switch (a.type) {
			case 'rename': return patchShot(activeId, { title: a.title as string });
			case 'promptView': return setPromptView(a.value as string);
			case 'setMode': return patchShot(activeId, { mode: a.value as Mode });
			case 'setStatus': return patchShot(activeId, { status: a.value as StudioShot['status'] });
			case 'setSel': return patchShot(activeId, { sel: a.value as StudioShot['sel'] });
			case 'likeImage': return patchShot(activeId, (s) => {
				const has = s.comps.some((c) => (c.mediaId ? NS_MEDIA_BY_ID[c.mediaId].src : c.src) === a.src);
				if (has) return {};
				return { comps: [...s.comps, { id: nsUid(), src: a.src as string, kind: 'still' }] };
			});
			case 'promptAppend': return patchShot(activeId, (s) => ({ promptExtra: mergeClause(s.promptExtra, a.text as string) }));
			case 'addComp': return a.src ? patchShot(activeId, (s) => ({ comps: [...s.comps, { id: nsUid(), src: a.src as string, kind: 'still' }] })) : addCompTo(activeId);
			case 'setInput': return patchShot(activeId, { [a.field as string]: a.value, promptFinal: false } as Partial<StudioShot>);
			case 'addRef': return patchShot(activeId, (s) => ({ refs: [...(s.refs || []), { id: nsUid(), src: a.src as string }] }));
			case 'removeRef': return patchShot(activeId, (s) => ({ refs: (s.refs || []).filter((r) => r.id !== a.id) }));
			case 'setWorkflow': return patchShot(activeId, (s) => ({ workflow: a.value !== undefined ? (a.value as boolean) : !s.workflow, promptFinal: false }));
			case 'setFrameRef': {
				const key = a.role === 'start' ? 'startFrame' : 'endFrame';
				const def = a.role === 'start' ? A.srcFrames[0] : A.srcFrames[A.srcFrames.length - 1];
				return patchShot(activeId, { [key]: a.value === null ? null : a.value === 'default' ? def : (a.value as string) } as Partial<StudioShot>);
			}
			case 'removeComp': return patchShot(activeId, (s) => ({ comps: s.comps.filter((c) => c.id !== a.id) }));
			case 'generate': patchShot(activeId, { promptFinal: true }); return generate(activeId, activeShot.mode, a.settings as { res?: string; aspect?: string; batch?: number });
			case 'finalizePrompt': return patchShot(activeId, { promptFinal: true });
			case 'setPromptOverride': return patchShot(activeId, { promptOverride: a.text as string });
			default: return;
		}
	};

	const renumber = (l: StudioShot[]) => l.map((s, i) => ({ ...s, n: String(i + 1).padStart(2, '0') }));

	const addShot = () => {
		setShots((l) => l.map((s) => (s.id === activeId ? { ...s, title: 'New shot', beat: 'Add a reference to set the look', mode: 'still', status: 'draft', comps: [], heroSrc: null, compSrc: null, startFrame: null, endFrame: null, sampledFrames: [], refs: [], promptExtra: '', workflow: false, promptFinal: false, history: [], sel: null, output: { still: null, motion: null } } : s)));
		setToolState((m) => ({ ...m, [activeId]: { ...nsDefaultTools(activeShot), configured: false, recipe: null } }));
		setPromptView('hero');
		toast('Shot reset');
	};
	const duplicateShot = (id: string) => {
		const i = shots.findIndex((s) => s.id === id);
		if (i < 0) return;
		const src = shots[i];
		const copy: StudioShot = { ...src, id: nsUid(), title: src.title + ' copy', comps: src.comps.map((c) => ({ ...c, id: nsUid() })) };
		setToolState((m) => ({ ...m, [copy.id]: JSON.parse(JSON.stringify(m[id] || nsDefaultTools(src))) }));
		setShots((l) => { const j = l.findIndex((s) => s.id === id); return renumber([...l.slice(0, j + 1), copy, ...l.slice(j + 1)]); });
		setActiveId(copy.id);
		toast('Shot duplicated');
	};
	const deleteShot = (id: string) => {
		if (shots.length <= 1) { toast('Keep at least one shot'); return; }
		const i = shots.findIndex((s) => s.id === id);
		const next = renumber(shots.filter((s) => s.id !== id));
		setShots(next);
		if (id === activeId) setActiveId((next[i] || next[next.length - 1]).id);
		toast('Shot deleted');
	};

	// ---------- guided walkthroughs ----------
	const handoff = (kind: DemoKind) => {
		setScreen('workspace'); setPromptView('hero');
		if (kind === 'still') {
			setActiveId('s1');
			setShots((l) => l.map((s) => (s.id === 's1' ? { ...s, compSrc: A.ref, heroSrc: A.heroAsset, workflow: false, promptFinal: false } : s)));
			setDemo({ kind, step: 4 }); setSpot('prompt');
			toast('Applied from FramePick Studio → Composition · Hero stays the subject');
			after(1500, () => setShots((l) => l.map((s) => (s.id === 's1' ? { ...s, workflow: true, promptFinal: true } : s))));
			after(2100, () => { setDemo({ kind, step: 5 }); setSpot('out'); generate('s1', 'still'); });
			after(2700, () => setSpot(null));
		} else {
			setActiveId('s1'); sampleMotionTo('s1'); setDemo({ kind, step: 4 }); setSpot('refs');
			toast('Frames sampled → References Library + Composition refs · Hero stays the subject');
			after(1500, () => setShots((l) => l.map((s) => (s.id === 's1' ? { ...s, workflow: true, promptFinal: true } : s))));
			after(2100, () => { setDemo({ kind, step: 5 }); setSpot('out'); generate('s1', 'motion'); });
			after(2700, () => setSpot(null));
		}
	};
	const startDefault = () => {
		clearTimers(); resetDemoShot(); setDemo({ kind: 'default', step: 0 }); setScreen('workspace'); setActiveId('s1'); setPromptView('hero'); setSpot('refs');
		after(1700, () => { setDemo({ kind: 'default', step: 1 }); addCompTo('s1'); });
		after(3500, () => { setDemo({ kind: 'default', step: 2 }); setSpot('prompt'); });
		after(5300, () => { setDemo({ kind: 'default', step: 3 }); setSpot('out'); generate('s1', 'still'); });
		after(8400, () => { setDemo({ kind: 'default', step: 4 }); setSpot(null); });
	};
	const startMotion = () => {
		clearTimers(); resetDemoShot(); setDemo({ kind: 'appMotion', step: 0 }); setScreen('workspace'); setActiveId('s1'); setPromptView('hero'); setSpot('refs');
		after(1700, () => { setDemo({ kind: 'appMotion', step: 1 }); patchShot('s1', { mode: 'motion' }); });
		after(3300, () => { setDemo({ kind: 'appMotion', step: 2 }); addMotionCompTo('s1'); });
		after(5100, () => { setDemo({ kind: 'appMotion', step: 3 }); setSpot('prompt'); setPromptView('hero'); });
		after(6900, () => { setDemo({ kind: 'appMotion', step: 4 }); setSpot('out'); generate('s1', 'motion'); });
		after(10600, () => { setDemo({ kind: 'appMotion', step: 5 }); setSpot(null); });
	};
	const startExt = (kind: DemoKind) => {
		clearTimers(); resetDemoShot(); setDemo({ kind, step: 0 }); setScreen('browser'); setSpot(null);
		after(1100, () => setDemo({ kind, step: 1 }));
		after(2500, () => setDemo({ kind, step: 2 }));
		after(4300, () => setDemo({ kind, step: 3 }));
		after(6300, () => handoff(kind));
	};
	const demoPick = () => { if (!demo) return; clearTimers(); const kind = demo.kind; setDemo({ kind, step: 2 }); after(1800, () => setDemo({ kind, step: 3 })); after(3700, () => handoff(kind)); };
	const exitDemo = () => { clearTimers(); setDemo(null); setSpot(null); setScreen('workspace'); };
	const replay = () => { if (!demo) return; const k = demo.kind; if (k === 'default') startDefault(); else if (k === 'appMotion') startMotion(); else startExt(k); };
	const isExt = !!demo && (demo.kind === 'still' || demo.kind === 'motion');
	const gotoStep = (step: number) => {
		if (!demo) return;
		const max = (CAPTIONS[demo.kind] || []).length - 1;
		const s = Math.max(0, Math.min(max, step));
		clearTimers(); setSpot(null);
		if (isExt) setScreen(s <= 3 ? 'browser' : 'workspace'); else setScreen('workspace');
		setDemo({ kind: demo.kind, step: s });
	};

	const caps = demo ? CAPTIONS[demo.kind] : [];
	const rotate = (deg: number): CSSProperties => ({ transform: `rotate(${deg}deg)` });

	return (
		<div className="ns-app" data-density="spacious">
			<div className="ns-wall" />
			<div className="ns-window">
				<div className="ns-toolbar">
					<span className="lights"><i className="r" /><i className="y" /><i className="g" /></span>
					<span className="ns-brand"><span className="ns-brand-mark">{NI.still()}</span> <b>Framepick</b> <span>Studio</span></span>
					{screen === 'workspace' ? (
						<span className="ns-tb-crumb">{I.chev({ style: { transform: 'rotate(90deg)', opacity: 0.4 } })} <span className="chip">Predators Prey · Savage</span></span>
					) : (
						<span className="ns-tb-crumb">{NI.puzzle()} FramePick picker · {demo && demo.kind === 'motion' ? 'Video' : 'Image'}</span>
					)}
					<span className="flex" />
					{screen === 'workspace' && (
						<div className="ns-guide-wrap">
							<button className={'ns-guide-btn' + (guideOpen ? ' on' : '')} onClick={() => setGuideOpen((o) => !o)} title="Guided walkthroughs">{NI.sparkles()} Guides {TI.chev({ style: { fontSize: '13px', opacity: 0.6 } })}</button>
							{guideOpen && (
								<><div className="ns-pop-veil" onClick={() => setGuideOpen(false)} />
									<div className="ns-guide-menu">
										<span className="ns-guide-menu-h">From FramePick extension</span>
										<button className="ns-guide-item" onClick={() => { setGuideOpen(false); startExt('still'); }}><span className="ns-guide-ic still">{NI.still()}</span><span><b>Grab an image</b><i>Pick an image → subject swaps to @hero</i></span></button>
										<button className="ns-guide-item" onClick={() => { setGuideOpen(false); startExt('motion'); }}><span className="ns-guide-ic motion">{NI.motion()}</span><span><b>Grab video</b><i>Sample frames → @hero performs the move</i></span></button>
									</div></>
							)}
						</div>
					)}
					{screen === 'workspace' && <span className="ns-ext-pill"><span className="ns-ext-dot">{I.cross()}</span> FramePick <em>· linked</em></span>}
					<button className="icon-btn" title="API keys" onClick={() => setApiKeysOpen(true)}>{I.key()}</button>
					<span className="me">DC</span>
				</div>

				{screen === 'browser' && demo ? (
					<SafariWindow demo={demo} onUse={() => handoff(demo.kind)} onPick={demoPick} onExit={exitDemo} />
				) : (
					<div className="ns-body">
						<ShotRail shots={shots} activeId={activeId} onSelect={(id) => setActiveId(id)} onAdd={addShot} onDuplicate={duplicateShot} onDelete={deleteShot} />
						<ShotWorkspace shot={activeShot} layout={layout} promptView={promptView} gen={gen} spot={demo ? spot : null} dispatch={dispatch} toast={toast} tx={tx} banner={null} />
					</div>
				)}
			</div>

			{demo && (
				<div className="ns-cap">
					<span className="ns-cap-badge">{DEMO_TITLE[demo.kind]}</span>
					<span className="ns-cap-text">{caps[demo.step]}</span>
					<span className="ns-cap-dots">{caps.map((_, i) => <i key={i} className={i === demo.step ? 'on' : i < demo.step ? 'done' : ''} />)}</span>
					<span className="flex" />
					<button className="ns-cap-btn" disabled={demo.step <= 0} onClick={() => gotoStep(demo.step - 1)} title="Previous step">{I.chev({ style: rotate(90) })} Back</button>
					<button className="ns-cap-btn" disabled={demo.step >= caps.length - 1} onClick={() => gotoStep(demo.step + 1)} title="Next step">Next {I.chev({ style: rotate(-90) })}</button>
					{demo.step >= caps.length - 1 && <button className="ns-cap-btn" onClick={replay}>{I.refresh()} Replay</button>}
					<button className="ns-cap-btn ghost" onClick={exitDemo}>Done</button>
				</div>
			)}

			<div className={'ns-toast' + (toastMsg ? ' show' : '')}>{toastMsg}</div>

			{recipesOpen && (
				<RecipesModal recipes={recipes} activeTitle={activeShot.title} activeConfigured={!!(toolState[activeId] && toolState[activeId].configured)} unconfiguredCount={unconfiguredCount} onApply={applyRecipe} onSave={saveRecipe} onClose={() => setRecipesOpen(false)} />
			)}

			{apiKeysOpen && <ApiKeysModal onClose={() => setApiKeysOpen(false)} keys={apiKeys} setKeys={setApiKeys} />}
		</div>
	);
}

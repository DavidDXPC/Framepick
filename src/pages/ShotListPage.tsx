import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { icons } from '../lib/icons';
import { loadShotList, saveShotList, loadShotListIdb, saveShotListIdb, getProvider, getKling, downscaleImage } from '../state/persistence';
import { dopAssist, generateImage, generateVideo, pollVideo } from '../lib/aiAssist';
import { assembleShotPrompt, buildStoryboardHtml, shotSignature } from '../lib/promptBuilder';
import { initialScene, newScene, newShot } from '../state/defaults';
import { mergeRecipeFrame } from '../lib/recipeApply';
import type { FieldChip, ImageSettings, MoodItem, RefImage, Scene, Shot, Variant } from '../state/types';
import { RECIPES, type Recipe } from '../data/recipes';
import { Card, PrimaryBtn } from '../components/ui';
import { Toolbar } from '../components/shot/Toolbar';
import { SectionA } from '../components/shot/SectionA';
import { ShotCard } from '../components/shot/ShotCard';
import { RecipesModal, BoardPicker } from '../components/shot/modals';
import { ImageEditStage } from '../components/shot/ImageEditStage';
import { FramePickInbox } from '../components/FramePickInbox';
import { ConfirmDialog, type ConfirmRequest } from '../components/ConfirmDialog';
import { inboxCount, removeInboxItem, resolveHeroPrompt, subscribeInbox, type InboxItem } from '../lib/framepickBridge';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface BoardPick {
	target: 'style' | 'talent' | 'sketch';
	shotId?: string;
}

export function ShotListPage({ onSendShotToBuild, boardImages }: { onSendShotToBuild?: (shot: Shot, visualStyle: string) => void; boardImages: MoodItem[] }) {
	const loaded = useMemo(() => loadShotList() as (ReturnType<typeof loadShotList> & { visualStyleRef?: RefImage | null }) | null, []);
	const [visualStyle, setVisualStyle] = useState(() => loaded?.visualStyle || '');
	const [visualStyleRef, setVisualStyleRef] = useState<RefImage | null>(() => loaded?.visualStyleRef || null);
	const [scenes, setScenes] = useState<Scene[]>(() => (loaded?.scenes?.length ? loaded.scenes : [initialScene()]));
	const [selectedSceneId, setSelectedSceneId] = useState(() => loaded?.selectedSceneId || loaded?.scenes?.[0]?.id || '');
	const [view, setView] = useState(() => loaded?.view || 'g3');
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [savedFlash, setSavedFlash] = useState(false);
	const [editTarget, setEditTarget] = useState<{ shotId: string; imageIndex: number } | null>(null);
	const [warning, setWarning] = useState('');
	const [describing, setDescribing] = useState(false);
	const [boardPick, setBoardPick] = useState<BoardPick | null>(null);
	const [recipesOpen, setRecipesOpen] = useState(false);
	const [appliedRecipeId, setAppliedRecipeId] = useState(() => loaded?.appliedRecipeId || '');
	const [imageSettings, setImageSettings] = useState<ImageSettings>({ quality: 'Low', background: 'Opaque', format: 'PNG', variations: 1, seed: '' });
	const [coach, setCoach] = useState(() => {
		try {
			return !localStorage.getItem('nframe:onboarded');
		} catch {
			return false;
		}
	});
	const dismissCoach = () => {
		try {
			localStorage.setItem('nframe:onboarded', '1');
		} catch {
			/* ignore */
		}
		setCoach(false);
	};

	const scene = scenes.find((s) => s.id === selectedSceneId) || scenes[0] || null;
	const sceneAspect = scene?.aspectRatio || '16:9';

	const flash = (msg: string, ms = 4000) => {
		setWarning(msg);
		window.setTimeout(() => setWarning(''), ms);
	};

	// Centered confirm dialog (replaces window.confirm)
	const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
	const ask = (req: ConfirmRequest) => setConfirmReq(req);

	// ---- FramePick Inbox ----------------------------------------------------
	const [inboxOpen, setInboxOpen] = useState(false);
	const fpCount = useSyncExternalStore(subscribeInbox, inboxCount);
	const fpPrev = useRef(fpCount);
	useEffect(() => {
		// a fresh handoff just arrived — surface the tray so it's one glance away
		if (fpCount > fpPrev.current) setInboxOpen(true);
		fpPrev.current = fpCount;
	}, [fpCount]);
	useEffect(() => {
		const onToggle = () => setInboxOpen((o) => !o);
		window.addEventListener('framepick:toggle-inbox', onToggle);
		return () => window.removeEventListener('framepick:toggle-inbox', onToggle);
	}, []);

	const applyHandoff = (item: InboxItem, target: string) => {
		const p = item.payload;
		onScene((s) => {
			let shots = s.shots;
			let id = target;
			if (target === 'new' || !shots.some((sh) => sh.id === target)) {
				const sh = newShot(shots.length + 1);
				id = sh.id;
				shots = [...shots, sh];
			}
			shots = shots.map((sh) => {
				if (sh.id !== id) return sh;
				if (p.kind === 'composition') {
					return { ...sh, sketchRef: { src: p.image, name: 'framepick-composition' } };
				}
				// motion: keyframes land in the Composition slot as guides. The prompt
				// lives in the Composition module — the description stays the user's.
				return {
					...sh,
					motionRef: {
						frames: p.frames,
						duration: p.duration,
						breakdown: p.breakdown,
						videoPrompt: p.videoPrompt,
						heroPrompt: p.heroPrompt,
						sourceUrl: p.sourceUrl,
						ts: p.ts,
					},
				};
			});
			return { ...s, shots };
		});
		removeInboxItem(item.id);
		flash(
			p.kind === 'composition'
				? 'Composition placed — only the layout is used; your Hero stays the subject.'
				: 'Motion frames placed in the Composition slot — @hero resolves to the shot’s Hero.',
			4500,
		);
	};

	// ---- Apply @hero to Frames -----------------------------------------------
	// Re-generates each motion keyframe with the shot's Hero swapped in as the
	// subject — composition, camera angle, framing, lighting and motion
	// structure preserved. Results land in the Composition strip (@hero view)
	// and the shot's variants.
	const [heroGen, setHeroGen] = useState<Record<string, { done: number; total: number }>>({});

	const applyHeroToFrames = async (shotId: string) => {
		const sh = scene?.shots.find((s) => s.id === shotId);
		if (!sh || heroGen[shotId]) return;
		const mr = sh.motionRef;
		if (!mr?.frames?.length) return;
		if (!sh.talentRef?.src) {
			flash('Add a Hero reference first — “Apply @hero to Frames” swaps your Hero into each keyframe.', 5000);
			return;
		}
		const prov = getProvider();
		if (prov.provider !== 'openai') {
			flash('Applying @hero to frames needs an OpenAI API key (set it in API keys).', 4500);
			return;
		}
		const total = mr.frames.length;
		setHeroGen((g) => ({ ...g, [shotId]: { done: 0, total } }));
		// The model can't see image *names* — only their order. So the contract is
		// ordinal: image 1 = the scene being edited, image 2 = the subject to
		// insert. The original subject must be removed, not restyled.
		const heroSubject = (sh.description || '').trim().split(/(?<=[.!?])\s/)[0].slice(0, 160);
		const prompt =
			`Produce exactly ONE single, full-frame photograph — never a split screen, diptych, side-by-side, before/after, collage or grid. ` +
			`There are two input images. Image 1 is a COMPOSITION GUIDE: read ONLY its camera angle, framing, subject placement, scale, orientation and lighting direction from it. Image 2 is the HERO — the real subject. ` +
			`Render the HERO${heroSubject ? ` (${heroSubject})` : ''} alone in that composition, matching image 1's placement and scale. The HERO must keep its exact identity, shape, colors, materials, branding and design from image 2 — do not restyle, recolor, redesign or duplicate it. There is exactly one subject. ` +
			`Image 1 is a frame grabbed from a video, so it may contain non-photographic clutter — you must completely EXCLUDE all of it: play buttons, progress/scrub bars, timecodes, captions or subtitles, watermarks, logos, channel or site names, cursors, app icons, UI panels or controls, on-screen text, guide/grid/focus lines, and black letterbox or pillarbox bars. None of these may appear in the result. ` +
			`Image 1's original subject must NOT appear — not blended, ghosted, reflected or partially visible. ` +
			`Output a clean, photorealistic frame: coherent lighting, shadows and reflections, no added objects, no text, no borders, no watermarks.`;
		const size = sceneAspect === '1:1' ? '1024x1024' : sceneAspect === '9:16' ? '1024x1536' : '1536x1024';
		const quality = String(imageSettings.quality || 'medium').toLowerCase();
		const results: { t: number; src: string }[] = [];
		try {
			for (let i = 0; i < mr.frames.length; i++) {
				const frame = mr.frames[i];
				const res = await generateImage({
					...prov,
					prompt,
					size,
					quality,
					background: 'opaque',
					outputFormat: 'png',
					inputImages: [
						{ src: frame.src, name: 'composition-frame' },
						{ src: sh.talentRef.src, name: 'hero-subject' },
					],
				});
				const src = (res.image as string) || ((res.images as { src: string }[]) || [])[0]?.src || (res.url as string);
				if (src) results.push({ t: frame.t, src });
				setHeroGen((g) => (g[shotId] ? { ...g, [shotId]: { done: i + 1, total } } : g));
			}
		} catch (e) {
			flash(`@hero frames stopped after ${results.length}/${total}: ${(e as Error).message || e}`, 6000);
		}
		if (results.length) {
			// The strip copy is a guide, not a deliverable — downscale it hard so
			// localStorage persistence survives (full-res stays in the variants).
			const guides = await Promise.all(results.map(async (r) => ({ t: r.t, src: await downscaleImage(r.src, 512) })));
			onScene((s) => ({
				...s,
				shots: s.shots.map((x) => {
					if (x.id !== shotId) return x;
					const newVariants: Variant[] = results.map((r, i) => ({
						id: `var-hero-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
						src: r.src,
						favorite: false,
						prompt: `@hero frame · ${r.t.toFixed(1)}s`,
					}));
					const variants = [...newVariants, ...(x.variants || [])];
					const images = x.images?.length ? x.images : [{ id: `img-${Date.now()}`, src: results[0].src, originalUrl: results[0].src, name: `shot-${x.number}-hero-frame` }];
					return { ...x, motionRef: x.motionRef ? { ...x.motionRef, heroFrames: guides } : x.motionRef, variants, images };
				}),
			}));
			flash(`Generated ${results.length} @hero frame${results.length === 1 ? '' : 's'} — see the Composition strip (@hero) and the shot's variants.`, 5200);
		}
		setHeroGen((g) => {
			const next = { ...g };
			delete next[shotId];
			return next;
		});
	};

	// ---- Generate video (Kling image → video) --------------------------------
	// Per-shot progress carries an ETA so the button can show a live countdown.
	type VideoJob = { phase: 'submit' | 'queued' | 'render' | 'finish'; startMs: number; etaMs: number };
	const [videoGen, setVideoGen] = useState<Record<string, VideoJob>>({});
	// 1s heartbeat so the countdown re-renders while any video is generating.
	const [, setVideoTick] = useState(0);
	const videoBusy = Object.keys(videoGen).length > 0;
	useEffect(() => {
		if (!videoBusy) return;
		const id = window.setInterval(() => setVideoTick((t) => t + 1), 1000);
		return () => window.clearInterval(id);
	}, [videoBusy]);

	// Estimated render time — Kling has no ETA API, so approximate by duration
	// and model (v3 is slower). Overestimate slightly so it lands on "Almost
	// done…" rather than stalling at 0.
	const estimateVideoMs = (duration: string, model: string) => {
		const base = duration === '10' ? 300_000 : 180_000;
		return /v3/.test(model) ? Math.round(base * 1.4) : base;
	};

	const videoLabel = (shotId: string): string | undefined => {
		const job = videoGen[shotId];
		if (!job) return undefined;
		if (job.phase === 'submit') return 'Submitting…';
		if (job.phase === 'finish') return 'Finishing…';
		const remaining = job.etaMs - (Date.now() - job.startMs);
		if (remaining <= 0) return 'Almost done…';
		const total = Math.round(remaining / 1000);
		return `Time remaining: ${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
	};

	const generateShotVideo = async (shotId: string) => {
		const sh = scene?.shots.find((s) => s.id === shotId);
		if (!sh || videoGen[shotId]) return;
		const kling = getKling();
		if (!kling) {
			flash('Add your Kling Access Key and Secret Key in API keys to generate video.', 5000);
			return;
		}
		// Start frame: the generated still (Hero already composed) → an @hero
		// keyframe → the Hero reference itself.
		const startImage = sh.images?.[0]?.src || sh.motionRef?.heroFrames?.[0]?.src || sh.talentRef?.src;
		if (!startImage) {
			flash('Generate a still or attach a Hero first — Kling animates a start image.', 5000);
			return;
		}
		// Prompt: the resolved @hero motion prompt, else the written description.
		const motionPrompt = sh.motionRef?.heroPrompt || sh.motionRef?.videoPrompt || '';
		const prompt = motionPrompt
			? resolveHeroPrompt(motionPrompt, { description: sh.description, hasHeroRef: !!sh.talentRef?.src })
			: (sh.description || '').trim();
		if (!prompt) {
			flash('Add a description or a motion prompt to guide the video.', 4500);
			return;
		}
		const duration = sh.motionRef && sh.motionRef.duration > 7.5 ? '10' : '5';
		const job: VideoJob = { phase: 'submit', startMs: Date.now(), etaMs: estimateVideoMs(duration, kling.model) };
		setVideoGen((g) => ({ ...g, [shotId]: job }));
		try {
			// Kling caps input at 10MB — downscale to a safe JPEG start frame.
			const image = await downscaleImage(startImage, 1024);
			const taskId = await generateVideo({
				accessKey: kling.accessKey,
				secretKey: kling.secretKey,
				model: kling.model,
				image,
				prompt,
				duration,
				aspectRatio: sceneAspect,
				mode: 'std',
			});
			const phaseOf = (status: string): VideoJob['phase'] => (status === 'succeed' ? 'finish' : status === 'processing' ? 'render' : 'queued');
			const url = await pollVideo(kling, taskId, (status) =>
				setVideoGen((g) => (g[shotId] ? { ...g, [shotId]: { ...g[shotId], phase: phaseOf(status) } } : g)),
			);
			updateShot(shotId, { videoUrl: url });
			flash('Motion video ready — playing in the shot.', 4000);
		} catch (e) {
			flash(`Video generation failed: ${(e as Error).message || e}`, 6000);
		} finally {
			setVideoGen((g) => {
				const next = { ...g };
				delete next[shotId];
				return next;
			});
		}
	};

	const describeRef = async (img: RefImage | null) => {
		setVisualStyleRef(img);
		if (!img?.src) return;
		const prov = getProvider();
		if (prov.provider === 'none') {
			flash('Reference saved. Add an API key to auto-describe the visual style.', 4500);
			return;
		}
		setDescribing(true);
		try {
			const res = await dopAssist({
				...prov,
				agent: 'describe',
				imageDataUrl: img.src,
				field: 'Visual Style',
				customInstruction:
					'Describe ONLY the visual style of this image for a project style bible: lighting register, color palette, contrast, depth of field, grade/finish, grain, and overall mood. Do not describe the subject or objects. Return one concise paragraph.',
			});
			if (res.text) setVisualStyle(res.text.trim());
		} catch (e) {
			flash(`Couldn't describe the image: ${(e as Error).message || e}`, 4500);
		} finally {
			setDescribing(false);
		}
	};

	// Hydrate from IndexedDB once on mount (authoritative, holds the full
	// project incl. images/videos); localStorage gave only the instant first
	// paint. Until this completes we must NOT write to IDB or we'd clobber the
	// saved project with the stale snapshot.
	const hydrated = useRef(false);
	useEffect(() => {
		let alive = true;
		loadShotListIdb().then((idb) => {
			if (!alive) return;
			if (idb && Array.isArray(idb.scenes) && idb.scenes.length) {
				setVisualStyle(idb.visualStyle || '');
				setVisualStyleRef((idb as Any).visualStyleRef || null);
				setAppliedRecipeId((idb as Any).appliedRecipeId || '');
				setScenes(idb.scenes);
				setSelectedSceneId(idb.selectedSceneId || idb.scenes[0].id);
				if (idb.view) setView(idb.view);
			} else {
				// first run on IDB — migrate whatever localStorage had into it
				saveShotListIdb({ visualStyle, visualStyleRef, appliedRecipeId, scenes, selectedSceneId: scene?.id || '', view } as Any);
			}
			hydrated.current = true;
		});
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const state = { visualStyle, visualStyleRef, appliedRecipeId, scenes, selectedSceneId: scene?.id || '', view } as Any;
		saveShotList(state); // small instant-paint snapshot (may no-op past quota)
		if (!hydrated.current) return; // don't overwrite IDB before hydration
		setSavedFlash(true);
		const save = setTimeout(() => saveShotListIdb(state), 250); // debounced full save
		const flashOff = setTimeout(() => setSavedFlash(false), 1000);
		return () => {
			clearTimeout(save);
			clearTimeout(flashOff);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visualStyle, visualStyleRef, appliedRecipeId, scenes, selectedSceneId, scene?.id, view]);

	const updateScene = (id: string, fn: (s: Scene) => Scene) => setScenes((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
	const onScene = (fn: (s: Scene) => Scene) => {
		if (scene) updateScene(scene.id, fn);
	};
	const setAspect = (ar: string) => onScene((s) => ({ ...s, aspectRatio: ar }));
	const addScene = () => {
		const s = newScene(scenes.length + 1);
		setScenes((prev) => [...prev, s]);
		setSelectedSceneId(s.id);
	};
	const addShot = () => onScene((s) => ({ ...s, shots: [...s.shots, newShot(s.shots.length + 1)] }));
	const updateShot = (id: string, patch: Partial<Shot>) => onScene((s) => ({ ...s, shots: s.shots.map((sh) => (sh.id !== id ? sh : { ...sh, ...patch })) }));

	// onPatchShot (_e): apply a patch + adjust the per-field "AI suggested" flags
	const patchShot = (id: string, patch: Partial<Shot>, clearAiKey?: string | null, addAiKeys?: string[], delAiKey?: string | null, delAiKeys?: string[] | null) =>
		onScene((s) => ({
			...s,
			shots: s.shots.map((sh) => {
				if (sh.id !== id) return sh;
				const ai: Record<string, unknown> = { ...(sh.ai || {}) };
				if (delAiKey) delete ai[delAiKey];
				if (Array.isArray(delAiKeys)) delAiKeys.forEach((k) => delete ai[k]);
				if (clearAiKey) delete ai[clearAiKey];
				if (Array.isArray(addAiKeys)) addAiKeys.forEach((k) => (ai[k] = true));
				return { ...sh, ...patch, ai };
			}),
		}));

	const deleteShot = (id: string) => {
		onScene((s) => ({ ...s, shots: s.shots.filter((sh) => sh.id !== id).map((sh, i) => ({ ...sh, number: i + 1 })) }));
		setSelected((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	};
	const duplicateShot = (shot: Shot) =>
		onScene((s) => {
			const idx = s.shots.findIndex((sh) => sh.id === shot.id);
			const copy = { ...JSON.parse(JSON.stringify(shot)), id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
			const next = idx >= 0 ? [...s.shots.slice(0, idx + 1), copy, ...s.shots.slice(idx + 1)] : [...s.shots, copy];
			return { ...s, shots: next.map((sh, i) => ({ ...sh, number: i + 1 })) };
		});
	const moveShot = (id: string, dir: number) =>
		onScene((s) => {
			const idx = s.shots.findIndex((sh) => sh.id === id);
			const to = idx + dir;
			if (idx < 0 || to < 0 || to >= s.shots.length) return s;
			const arr = [...s.shots];
			[arr[idx], arr[to]] = [arr[to], arr[idx]];
			return { ...s, shots: arr.map((sh, i) => ({ ...sh, number: i + 1 })) };
		});
	const resetProject = () => {
		ask({
			title: 'Reset entire project?',
			message: 'All scenes, shots, references and the visual style will be deleted. This cannot be undone.',
			actionLabel: 'Reset project',
			danger: true,
			onConfirm: () => {
				setVisualStyle('');
				setVisualStyleRef(null);
				const s = newScene(1);
				setScenes([s]);
				setSelectedSceneId(s.id);
				setSelected(new Set());
			},
		});
	};

	// Full reset of a single card: blank shot, same id + number.
	const resetShot = (id: string) => {
		onScene((s) => ({ ...s, shots: s.shots.map((sh) => (sh.id === id ? { ...newShot(sh.number), id: sh.id } : sh)) }));
		setSelected((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	};

	const generate = async (id: string) => {
		const shot = scene?.shots.find((s) => s.id === id);
		if (!shot) return;
		// A shot needs a subject: a written description, or a Hero reference that
		// the motion @hero prompt can resolve to. The raw clip prompt is never
		// used as a subject — it would re-describe the source's own subject.
		if (!(shot.description || '').trim() && !(shot.motionRef?.heroPrompt && shot.talentRef?.src)) {
			flash(shot.motionRef ? 'Attach a Hero (or write a description) — @hero needs a subject to resolve to.' : 'Add a description before generating — describe the shot first.');
			return;
		}
		if (!visualStyle.trim()) {
			flash("Set a visual style first — this is the project's visual bible.", 4500);
			return;
		}
		const prov = getProvider();
		if (prov.provider !== 'openai') {
			updateShot(id, { error: 'Image generation needs an OpenAI API key (set it in API keys).' });
			return;
		}
		updateShot(id, { generating: true, error: '' });
		try {
			const inputImages: { src: string; name: string }[] = [];
			if (shot.talentRef?.src) inputImages.push({ src: shot.talentRef.src, name: shot.talentRef.name || 'hero-subject' });
			if (shot.motionRef?.frames?.length) {
				// FramePick motion guides: the middle keyframe anchors layout & scale
				// (prefer the @hero-applied version when it exists).
				const frames = shot.motionRef.heroFrames?.length ? shot.motionRef.heroFrames : shot.motionRef.frames;
				const mid = frames[Math.floor(frames.length / 2)];
				inputImages.push({ src: mid.src, name: 'composition-ref' });
			} else if (shot.sketchRef?.src) inputImages.push({ src: shot.sketchRef.src, name: shot.sketchRef.name || 'composition-ref' });
			// Use the verbatim override when set, otherwise the auto-assembled spec.
			const prompt = shot.promptOverride?.trim() ? shot.promptOverride.trim() : assembleShotPrompt(visualStyle, shot, sceneAspect);
			const size = sceneAspect === '1:1' ? '1024x1024' : sceneAspect === '9:16' ? '1024x1536' : '1536x1024';
			const quality = String(imageSettings.quality || 'auto').toLowerCase();
			const background = String(imageSettings.background || 'auto').toLowerCase();
			const outputFormat = String(imageSettings.format || 'png').toLowerCase();
			const count = Math.max(1, Math.min(4, imageSettings.variations || 1));
			const settled = await Promise.allSettled(
				Array.from({ length: count }).map(() => generateImage({ ...prov, prompt, size, quality, background, outputFormat, inputImages })),
			);
			const newVariants = settled
				.filter((r): r is PromiseFulfilledResult<Any> => r.status === 'fulfilled')
				.map((r, i) => {
					const src = r.value.image || r.value.images?.[0]?.src || r.value.url;
					return src ? { id: `var-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`, src, favorite: false } : null;
				})
				.filter(Boolean) as Variant[];
			if (!newVariants.length) throw new Error('No variants returned. Try again.');
			onScene((s) => ({
				...s,
				shots: s.shots.map((sh) => {
					if (sh.id !== id) return sh;
					const variants = [...newVariants, ...(sh.variants || [])];
					const images = sh.images?.length ? sh.images : [{ id: `img-${Date.now()}`, src: newVariants[0].src, originalUrl: newVariants[0].src, name: `shot-${sh.number}` }];
					return { ...sh, variants, images, generating: false, error: '', lastGeneratedSig: shotSignature(sh) };
				}),
			}));
		} catch (e) {
			updateShot(id, { generating: false, error: (e as Error).message || 'Generation failed.' });
		}
	};

	const setHeroVariant = (id: string, variantId: string) =>
		onScene((s) => ({
			...s,
			shots: s.shots.map((sh) => {
				if (sh.id !== id) return sh;
				const v = (sh.variants || []).find((x) => x.id === variantId);
				return v ? { ...sh, images: [{ id: `img-${Date.now()}`, src: v.src, originalUrl: v.src, name: `shot-${sh.number}` }] } : sh;
			}),
		}));
	const favoriteVariant = (id: string, variantId: string) =>
		onScene((s) => ({
			...s,
			shots: s.shots.map((sh) => {
				if (sh.id !== id) return sh;
				const variants = (sh.variants || []).map((v) => (v.id === variantId ? { ...v, favorite: !v.favorite } : v));
				const fav = variants.find((v) => v.id === variantId && v.favorite);
				const images = fav ? [{ id: `img-${Date.now()}`, src: fav.src, originalUrl: fav.src, name: `shot-${sh.number}` }] : sh.images;
				return { ...sh, variants, images };
			}),
		}));
	const deleteVariant = (id: string, variantId: string) =>
		onScene((s) => ({ ...s, shots: s.shots.map((sh) => (sh.id === id ? { ...sh, variants: (sh.variants || []).filter((v) => v.id !== variantId) } : sh)) }));
	const branchVariant = (shot: Shot, variant: Variant) =>
		onScene((s) => {
			const idx = s.shots.findIndex((sh) => sh.id === shot.id);
			const branch = {
				...JSON.parse(JSON.stringify(shot)),
				id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				variants: [{ ...variant, favorite: true }],
				images: [{ id: `img-${Date.now()}`, src: variant.src, originalUrl: variant.src, name: 'branch' }],
			};
			const next = idx >= 0 ? [...s.shots.slice(0, idx + 1), branch, ...s.shots.slice(idx + 1)] : [...s.shots, branch];
			return { ...s, shots: next.map((sh, i) => ({ ...sh, number: i + 1 })) };
		});

	const editImage = (shotId: string, imageIndex: number) => setEditTarget({ shotId, imageIndex });
	const editImageData = useMemo(() => {
		if (!editTarget || !scene) return null;
		const shot = scene.shots.find((s) => s.id === editTarget.shotId);
		const img = shot?.images?.[editTarget.imageIndex];
		return img ? { ...img, shotNumber: shot!.number, sceneName: scene.name } : null;
	}, [editTarget, scene]);
	const saveEditedImage = ({ url, originalUrl, edits }: { url: string; originalUrl: string; edits: unknown }) => {
		if (!editTarget || !scene) return;
		updateScene(scene.id, (s) => ({
			...s,
			shots: s.shots.map((sh) => {
				if (sh.id !== editTarget.shotId) return sh;
				const images = [...(sh.images || [])];
				const img = images[editTarget.imageIndex];
				if (img) images[editTarget.imageIndex] = { ...img, originalUrl: img.originalUrl || originalUrl || img.src, editedUrl: url, src: url, edits, updatedAt: Date.now() };
				return { ...sh, images };
			}),
		}));
		setEditTarget(null);
	};

	const clearField = (shotId: string, chip: FieldChip) => {
		const shot = scene?.shots.find((s) => s.id === shotId);
		if (!shot) return;
		if (chip.group === 'lighting') {
			patchShot(shotId, { frame: { ...shot.frame, lighting: { ...shot.frame.lighting, [chip.key]: chip.multi ? [] : '' } } }, null, [], 'lighting');
		} else if (chip.group === 'lens') {
			patchShot(shotId, { frame: { ...shot.frame, lens: { focalLength: '', character: '' } } }, null, [], 'lens');
		} else if (chip.group === 'frame') {
			patchShot(shotId, { frame: { ...shot.frame, [chip.key]: '' } }, null, [], chip.key);
		} else if (chip.group === 'motion') {
			patchShot(shotId, { motion: { ...shot.motion, [chip.key]: chip.multi ? [] : '' } }, null, [], chip.key);
		}
	};

	const onBoardPicked = (item: MoodItem) => {
		if (!boardPick) return;
		const ref = { src: item.src!, name: (item as MoodItem & { name?: string }).name || 'board-reference' };
		if (boardPick.target === 'talent') updateShot(boardPick.shotId!, { talentRef: ref });
		else if (boardPick.target === 'sketch') updateShot(boardPick.shotId!, { sketchRef: ref });
		else describeRef(ref);
		setBoardPick(null);
	};

	const applyRecipe = (recipe: Recipe) => {
		const prev = RECIPES.find((r) => r.id === appliedRecipeId)?.frame ?? null;
		setVisualStyle(recipe.visualStyle);
		onScene((s) => ({
			...s,
			shots: s.shots.map((sh) => ({ ...sh, frame: mergeRecipeFrame(sh.frame, prev, recipe.frame) })),
		}));
		setAppliedRecipeId(recipe.id);
		setRecipesOpen(false);
	};

	const printStoryboard = () => {
		if (!scene) return;
		const html = buildStoryboardHtml(scene.name, visualStyle, scene.shots);
		const win = window.open('', '_blank');
		if (!win) {
			flash('Allow pop-ups to export the storyboard.');
			return;
		}
		win.document.open();
		win.document.write(html);
		win.document.close();
		win.setTimeout(() => win.print(), 400);
	};
	const downloadHtml = () => {
		if (!scene) return;
		const html = buildStoryboardHtml(scene.name, visualStyle, scene.shots);
		const blob = new Blob([html], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${(scene.name || 'storyboard').replace(/[^\w-]+/g, '-')}-storyboard.html`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1500);
	};

	const toggleSelectAll = (on: boolean) => {
		if (scene) setSelected(on ? new Set(scene.shots.map((s) => s.id)) : new Set());
	};
	const bulkDelete = () => {
		ask({
			title: `Delete ${selected.size} shot${selected.size === 1 ? '' : 's'}?`,
			message: 'The selected shots and their generated images will be deleted. This cannot be undone.',
			actionLabel: 'Delete',
			danger: true,
			onConfirm: () => {
				onScene((s) => ({ ...s, shots: s.shots.filter((sh) => !selected.has(sh.id)).map((sh, i) => ({ ...sh, number: i + 1 })) }));
				setSelected(new Set());
			},
		});
	};

	const cols = view.startsWith('g') ? parseInt(view.slice(1), 10) : 0;
	const allSelected = !!scene && scene.shots.length > 0 && scene.shots.every((s) => selected.has(s.id));

	return (
		<div className="nf-shot-page" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
			<main className="nf-shot-main">
				<Toolbar
					scene={scene}
					aspectRatio={sceneAspect}
					setAspectRatio={setAspect}
					view={view}
					setView={setView}
					onAddShot={addShot}
					savedFlash={savedFlash}
					onPrint={printStoryboard}
					onDownloadHtml={downloadHtml}
				/>
				{coach && (
					<div className="nf-coach">
						<div className="nf-coach-main">
							<strong>Welcome to FramePick Studio — 3 steps to your first shot</strong>
							<ol>
								<li>
									<b>Set the Visual Style</b> in Section A (or pick a Recipe) — the lighting &amp; color grade for every shot.
								</li>
								<li>
									Describe the <b>subject + action</b>, attach a <b>Hero</b> reference (the subject), an optional <b>Composition</b> reference (the layout to drop it into), and set the <b>Frame</b> (camera/composition).
								</li>
								<li>
									<b>Generate</b> — you'll get variants to compare and favorite.
								</li>
							</ol>
						</div>
						<button type="button" className="nf-coach-x" onClick={dismissCoach}>
							Got it
						</button>
					</div>
				)}
				<SectionA
					value={visualStyle}
					onChange={setVisualStyle}
					refImage={visualStyleRef}
					onRefImage={describeRef}
					describing={describing}
					onReset={resetProject}
					onPickBoard={() => setBoardPick({ target: 'style' })}
					onRecipes={() => setRecipesOpen(true)}
				/>
				{warning && <div className="nf-warning">{warning}</div>}
				<div className="nf-timeline-head">
					<span className="nf-section-label">Project Timeline</span>
				</div>
				{scene && (
					<div className="nf-select-row">
						<label className="nf-select-label">
							<span className="nf-checkbox">
								<input type="checkbox" checked={allSelected} onChange={(e) => toggleSelectAll(e.target.checked)} />
								<span />
							</span>
							<span>Select all</span>
						</label>
						{selected.size > 0 && (
							<div className="nf-bulk-actions">
								<span>{selected.size} selected</span>
								<button type="button" className="nf-toolbar-btn" style={{ color: 'var(--danger)' }} onClick={bulkDelete}>
									{icons.trash}
									<span>Delete</span>
								</button>
							</div>
						)}
					</div>
				)}
				{scene ? (
					<div className="nf-shot-grid" style={{ '--shot-cols': cols || 3 } as Any}>
						{scene.shots.map((shot) => (
							<ShotCard
								key={shot.id}
								shot={shot}
								aspectRatio={sceneAspect}
								projectAspect={sceneAspect}
								visualStyle={visualStyle}
								selected={selected.has(shot.id)}
								onSelectChange={(on) =>
									setSelected((prev) => {
										const next = new Set(prev);
										if (on) next.add(shot.id);
										else next.delete(shot.id);
										return next;
									})
								}
								onUpdate={(patch) => updateShot(shot.id, patch)}
								onPatchShot={(patch, clearAiKey, addAiKeys, delAiKey, delAiKeys) => patchShot(shot.id, patch, clearAiKey, addAiKeys, delAiKey, delAiKeys)}
								onDelete={() =>
									ask({
										title: `Delete Shot ${String(shot.number).padStart(2, '0')}?`,
										message: 'The shot, its references and generated images will be deleted. This cannot be undone.',
										actionLabel: 'Delete',
										danger: true,
										onConfirm: () => deleteShot(shot.id),
									})
								}
								onReset={() =>
									ask({
										title: `Reset Shot ${String(shot.number).padStart(2, '0')}?`,
										message: 'This clears its description, references, settings and generated images.',
										actionLabel: 'Reset',
										danger: true,
										onConfirm: () => resetShot(shot.id),
									})
								}
								onDuplicate={() => duplicateShot(shot)}
								onMove={(dir) => moveShot(shot.id, dir)}
								onEditImage={(index) => editImage(shot.id, index)}
								onGenerate={() => generate(shot.id)}
								imageSettings={imageSettings}
								onImageSettings={setImageSettings}
								onSendToBuild={() => onSendShotToBuild?.(shot, visualStyle)}
								onSetHeroVariant={setHeroVariant}
								onFavoriteVariant={favoriteVariant}
								onDeleteVariant={deleteVariant}
								onBranchVariant={branchVariant}
								onPickBoardRef={(shotId, target) => setBoardPick({ target: target === 'sketch' ? 'sketch' : 'talent', shotId })}
								onClearField={(chip) => clearField(shot.id, chip)}
								onApplyHeroFrames={() => applyHeroToFrames(shot.id)}
								heroBusy={!!heroGen[shot.id]}
								heroProgress={heroGen[shot.id] ? `Applying @hero ${heroGen[shot.id].done}/${heroGen[shot.id].total}…` : undefined}
								onGenerateVideo={() => generateShotVideo(shot.id)}
								videoBusy={videoGen[shot.id] !== undefined}
								videoStatus={videoLabel(shot.id)}
							/>
						))}
						<button className="nf-add-shot-card" type="button" onClick={addShot}>
							<span>+</span>
							<span>Add Shot</span>
						</button>
					</div>
				) : (
					<Card pad={28}>
						<div className="nf-empty-shot-state">
							<div>No scenes</div>
							<p>Create a scene to start building a shooting list.</p>
							<PrimaryBtn onClick={addScene}>Create scene</PrimaryBtn>
						</div>
					</Card>
				)}
			</main>
			{editTarget && editImageData && (
				<ImageEditStage
					image={editImageData}
					shotLabel={`${editImageData.sceneName} · Shot ${String(editImageData.shotNumber).padStart(2, '0')} · Image ${editTarget.imageIndex + 1}`}
					onClose={() => setEditTarget(null)}
					onSave={saveEditedImage}
				/>
			)}
			{boardPick && <BoardPicker target={boardPick.target} boardImages={boardImages} onPick={onBoardPicked} onClose={() => setBoardPick(null)} />}
			{recipesOpen && <RecipesModal onApply={applyRecipe} onClose={() => setRecipesOpen(false)} />}
			<FramePickInbox open={inboxOpen} onClose={() => setInboxOpen(false)} scene={scene} onApply={applyHandoff} />
			<ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />
		</div>
	);
}

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { icons } from '../lib/icons';
import { loadShotList, saveShotList, getProvider } from '../state/persistence';
import { dopAssist, generateImage } from '../lib/aiAssist';
import { assembleShotPrompt, buildStoryboardHtml, shotSignature } from '../lib/promptBuilder';
import { initialScene, newScene, newShot } from '../state/defaults';
import { mergeRecipeFrame } from '../lib/recipeApply';
import type { FieldChip, ImageSettings, MoodItem, RefImage, Scene, Shot, Variant } from '../state/types';
import { RECIPES, type Recipe } from '../data/recipes';
import { Card, PrimaryBtn } from '../components/ui';
import { ScenesSidebar } from '../components/shot/ScenesSidebar';
import { Toolbar } from '../components/shot/Toolbar';
import { SectionA } from '../components/shot/SectionA';
import { ShotCard } from '../components/shot/ShotCard';
import { RecipesModal, BoardPicker } from '../components/shot/modals';
import { ImageEditStage } from '../components/shot/ImageEditStage';
import { FramePickInbox } from '../components/FramePickInbox';
import { inboxCount, removeInboxItem, subscribeInbox, type InboxItem } from '../lib/framepickBridge';

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
	const [sidebarOpen, setSidebarOpen] = useState(true);
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
				: 'Motion structure attached — @hero resolves to the shot’s Hero slot.',
			4500,
		);
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

	useEffect(() => {
		saveShotList({ visualStyle, visualStyleRef, appliedRecipeId, scenes, selectedSceneId: scene?.id || '', view } as Any);
		setSavedFlash(true);
		const t = setTimeout(() => setSavedFlash(false), 1000);
		return () => clearTimeout(t);
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
	const renameScene = (id: string, name: string) => setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
	const deleteScene = (id: string) => {
		if (!window.confirm('Delete this scene and all its shots?')) return;
		setScenes((prev) => {
			const rest = prev.filter((s) => s.id !== id);
			if (!rest.length) {
				const s = newScene(1);
				setSelectedSceneId(s.id);
				return [s];
			}
			if (id === selectedSceneId) setSelectedSceneId(rest[0].id);
			return rest;
		});
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
		if (!window.confirm('Reset entire project? This deletes all shots and cannot be undone.')) return;
		setVisualStyle('');
		setVisualStyleRef(null);
		const s = newScene(1);
		setScenes([s]);
		setSelectedSceneId(s.id);
		setSelected(new Set());
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
		if (!(shot.description || '').trim()) {
			flash('Add a description before generating — describe the shot first.');
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
			if (shot.sketchRef?.src) inputImages.push({ src: shot.sketchRef.src, name: shot.sketchRef.name || 'composition-ref' });
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
		if (!window.confirm(`Delete ${selected.size} shot(s)?`)) return;
		onScene((s) => ({ ...s, shots: s.shots.filter((sh) => !selected.has(sh.id)).map((sh, i) => ({ ...sh, number: i + 1 })) }));
		setSelected(new Set());
	};

	const cols = view.startsWith('g') ? parseInt(view.slice(1), 10) : 0;
	const allSelected = !!scene && scene.shots.length > 0 && scene.shots.every((s) => selected.has(s.id));

	return (
		<div className="nf-shot-page" style={{ gridTemplateColumns: sidebarOpen ? '232px minmax(0, 1fr)' : 'minmax(0, 1fr)' }}>
			{sidebarOpen && (
				<ScenesSidebar scenes={scenes} selectedSceneId={scene?.id || ''} onSelect={setSelectedSceneId} onAdd={addScene} onRename={renameScene} onDelete={deleteScene} />
			)}
			<main className="nf-shot-main">
				<Toolbar
					scene={scene}
					aspectRatio={sceneAspect}
					setAspectRatio={setAspect}
					view={view}
					setView={setView}
					onAddShot={addShot}
					onToggleSidebar={() => setSidebarOpen((o) => !o)}
					savedFlash={savedFlash}
					onPrint={printStoryboard}
					onDownloadHtml={downloadHtml}
				/>
				{coach && (
					<div className="nf-coach">
						<div className="nf-coach-main">
							<strong>Welcome to nFrame — 3 steps to your first shot</strong>
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
					onHelp={() => setCoach(true)}
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
								onDelete={() => {
									if (window.confirm(`Delete Shot ${String(shot.number).padStart(2, '0')}?`)) deleteShot(shot.id);
								}}
								onReset={() => {
									if (window.confirm(`Reset Shot ${String(shot.number).padStart(2, '0')}? This clears its description, references, settings and generated images.`)) resetShot(shot.id);
								}}
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
		</div>
	);
}

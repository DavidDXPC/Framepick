import React from 'react';
import type { MoodItem, MoodView } from '../state/types';
import { downscaleImage } from '../state/persistence';
import { icons } from '../lib/icons';

// The recovered bundle stores a few extra fields on moodboard items that the
// canonical MoodItem type does not declare (legacy shape: `type`/`name`/
// `rotation`/`color`/`size`). We model them locally and reconcile at the prop
// boundary so the exact runtime logic is preserved.
type MbItem = MoodItem & {
	type?: 'image' | 'text';
	name?: string;
	rotation?: number;
	color?: string;
	size?: number;
	w?: number;
	h?: number;
};

type SetItems = (u: MoodItem[] | ((p: MoodItem[]) => MoodItem[])) => void;
type SetView = (u: MoodView | ((p: MoodView) => MoodView)) => void;

interface MoodboardPageProps {
	items: MoodItem[];
	setItems: SetItems;
	view: MoodView;
	setView: SetView;
	saveFailed: boolean;
}

// `icons` (the bundle's `le`) has no `text` or `refresh` keys; the original
// read `le.text` (undefined → nothing) and `le.refresh || "⟳"` (→ "⟳").
const ic = icons as typeof icons & { text?: React.ReactNode; refresh?: React.ReactNode };

export function MoodboardPage({ items, setItems, view, setView, saveFailed }: MoodboardPageProps) {
	const [selectedId, setSelectedId] = React.useState<string | null>(null);
	const [editingId, setEditingId] = React.useState<string | null>(null);
	const stageRef = React.useRef<HTMLDivElement>(null);
	const fileRef = React.useRef<HTMLInputElement>(null);
	React.useRef(null);

	const setItemsList = setItems as (u: MbItem[] | ((p: MbItem[]) => MbItem[])) => void;
	const itemList = items as MbItem[];

	const toWorld = (clientX: number, clientY: number) => {
		const rect = stageRef.current!.getBoundingClientRect();
		return {
			x: (clientX - rect.left - view.x) / view.scale,
			y: (clientY - rect.top - view.y) / view.scale,
		};
	};

	const addImages = async (files: FileList | null, at?: { x: number; y: number }) => {
		const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
		if (!imageFiles.length) return;
		const loaded = await Promise.all(
			imageFiles.map(
				(file) =>
					new Promise<{ src: string; name: string }>((resolve) => {
						const reader = new FileReader();
						reader.onload = async () =>
							resolve({
								src: await downscaleImage(reader.result as string),
								name: file.name,
							});
						reader.readAsDataURL(file);
					}),
			),
		);
		const origin = at || toWorld(window.innerWidth / 2, window.innerHeight / 2);
		setItemsList((prev) => [
			...prev,
			...loaded.map((img, i) => ({
				id: `mb-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
				type: 'image' as const,
				kind: 'image' as const,
				src: img.src,
				name: img.name,
				x: origin.x - 110 + i * 24,
				y: origin.y - 80 + i * 24,
				w: 220,
				h: 0,
				rotation: 0,
			})),
		]);
	};

	const addText = () => {
		const origin = toWorld(window.innerWidth / 2, window.innerHeight / 2);
		const id = `mb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
		setItemsList((prev) => [
			...prev,
			{
				id,
				type: 'text' as const,
				kind: 'text' as const,
				text: 'Label',
				x: origin.x - 60,
				y: origin.y - 16,
				w: 160,
				h: 40,
				rotation: 0,
				color: '#1A1A1A',
				size: 28,
			},
		]);
		setSelectedId(id);
		setEditingId(id);
	};

	const updateItem = (id: string, patch: Partial<MbItem>) =>
		setItemsList((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

	const removeItem = (id: string) => {
		setItemsList((prev) => prev.filter((it) => it.id !== id));
		if (selectedId === id) setSelectedId(null);
	};

	const bringToFront = (id: string) =>
		setItemsList((prev) => {
			const found = prev.find((it) => it.id === id);
			return found ? [...prev.filter((it) => it.id !== id), found] : prev;
		});

	const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		const target = e.target as HTMLElement;
		if (target !== stageRef.current && !target.classList.contains('nf-mb-world')) return;
		setSelectedId(null);
		setEditingId(null);
		const start = {
			x: e.clientX,
			y: e.clientY,
			vx: view.x,
			vy: view.y,
		};
		const onMove = (ev: PointerEvent) =>
			setView((prev) => ({
				...prev,
				x: start.vx + (ev.clientX - start.x),
				y: start.vy + (ev.clientY - start.y),
			}));
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	};

	const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 8) return;
		e.preventDefault();
		const rect = stageRef.current!.getBoundingClientRect();
		const px = e.clientX - rect.left;
		const py = e.clientY - rect.top;
		const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
		setView((prev) => {
			const scale = Math.max(0.2, Math.min(3, prev.scale * factor));
			const ratio = scale / prev.scale;
			return {
				scale,
				x: px - (px - prev.x) * ratio,
				y: py - (py - prev.y) * ratio,
			};
		});
	};

	const zoomBy = (factor: number) =>
		setView((prev) => {
			const scale = Math.max(0.2, Math.min(3, prev.scale * factor));
			const rect = stageRef.current!.getBoundingClientRect();
			const cx = rect.width / 2;
			const cy = rect.height / 2;
			const ratio = scale / prev.scale;
			return {
				scale,
				x: cx - (cx - prev.x) * ratio,
				y: cy - (cy - prev.y) * ratio,
			};
		});

	const resetView = () => setView({ x: 0, y: 0, scale: 1 });

	const onItemPointerDown = (
		e: React.PointerEvent<HTMLElement>,
		id: string,
		mode: 'move' | 'resize' | 'rotate',
	) => {
		e.stopPropagation();
		const item = itemList.find((it) => it.id === id);
		if (!item) return;
		setSelectedId(id);
		bringToFront(id);
		const start = {
			mx: e.clientX,
			my: e.clientY,
			x: item.x,
			y: item.y,
			w: item.w!,
			h: item.h!,
			rot: item.rotation,
		};
		const centerX = item.x + item.w! / 2;
		const centerY = item.y + (item.h || item.w!) / 2;
		const onMove = (ev: PointerEvent) => {
			const dx = (ev.clientX - start.mx) / view.scale;
			const dy = (ev.clientY - start.my) / view.scale;
			if (mode === 'move')
				updateItem(id, {
					x: start.x + dx,
					y: start.y + dy,
				});
			else if (mode === 'resize') {
				const w = Math.max(40, start.w + dx);
				updateItem(id, {
					w,
					h: item.type === 'image' ? 0 : Math.max(24, start.h + dy),
				});
			} else if (mode === 'rotate') {
				const p = toWorld(ev.clientX, ev.clientY);
				const angle = (Math.atan2(p.y - centerY, p.x - centerX) * 180) / Math.PI + 90;
				updateItem(id, {
					rotation: Math.round(angle),
				});
			}
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	};

	React.useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && editingId !== selectedId) {
				e.preventDefault();
				removeItem(selectedId);
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedId, editingId]);

	return (
		<div className="nf-mb">
			{saveFailed && (
				<div className="nf-warning">
					This board is too large to save for next session — your images are kept while the app is open, but may not survive a full
					page reload. Remove a few images to restore saving.
				</div>
			)}
			<div className="nf-mb-toolbar">
				<div className="nf-mb-title">
					<strong>Moodboard</strong>
					<span>
						{itemList.length} item{itemList.length === 1 ? '' : 's'}
					</span>
				</div>
				<div className="nf-mb-tools">
					<button type="button" className="nf-toolbar-btn" onClick={() => fileRef.current?.click()}>
						{ic.image}
						<span>Add image</span>
					</button>
					<button type="button" className="nf-toolbar-btn" onClick={addText}>
						{ic.text}
						<span>Add text</span>
					</button>
					<span className="nf-vsep" />
					<div className="nf-mb-zoom">
						<button type="button" className="nf-toolbar-btn icon-only" onClick={() => zoomBy(1 / 1.15)} title="Zoom out">
							−
						</button>
						<span className="nf-mb-zoom-val" onClick={resetView} title="Reset view">
							{Math.round(view.scale * 100)}%
						</span>
						<button type="button" className="nf-toolbar-btn icon-only" onClick={() => zoomBy(1.15)} title="Zoom in">
							+
						</button>
					</div>
				</div>
				<input
					ref={fileRef}
					type="file"
					accept="image/*"
					multiple
					hidden
					onChange={(e) => {
						addImages(e.target.files);
						e.target.value = '';
					}}
				/>
			</div>
			<div
				className="nf-mb-stage"
				ref={stageRef}
				onPointerDown={onStagePointerDown}
				onWheel={onWheel}
				onDragOver={(e) => e.preventDefault()}
				onDrop={(e) => {
					e.preventDefault();
					addImages(e.dataTransfer.files, toWorld(e.clientX, e.clientY));
				}}
				onDoubleClick={(e) => {
					const target = e.target as HTMLElement;
					if (target === stageRef.current || target.classList.contains('nf-mb-world')) addText();
				}}
			>
				{!itemList.length && (
					<div className="nf-mb-empty">
						<div className="nf-mb-empty-ic">{ic.image}</div>
						<div>Drop reference images here</div>
						<p>Drag images in, or use Add image. Double-click for a text label. Scroll to zoom, drag the canvas to pan.</p>
					</div>
				)}
				<div
					className="nf-mb-world"
					style={{
						transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
					}}
				>
					{itemList.map((item) => {
						const selected = item.id === selectedId;
						const itemStyle: React.CSSProperties = {
							left: item.x,
							top: item.y,
							width: item.w,
							height: item.type === 'image' ? 'auto' : item.h,
							transform: `rotate(${item.rotation || 0}deg)`,
						};
						return (
							<div
								className={'nf-mb-item' + (selected ? ' selected' : '')}
								style={itemStyle}
								onPointerDown={(e) => onItemPointerDown(e, item.id, 'move')}
								key={item.id}
							>
								{item.type === 'image' ? (
									<img src={item.src} alt={item.name || ''} draggable={false} />
								) : editingId === item.id ? (
									<textarea
										className="nf-mb-textedit"
										autoFocus
										defaultValue={item.text}
										style={{
											fontSize: item.size,
											color: item.color,
										}}
										onPointerDown={(e) => e.stopPropagation()}
										onBlur={(e) => {
											updateItem(item.id, {
												text: e.target.value,
											});
											setEditingId(null);
										}}
									/>
								) : (
									<div
										className="nf-mb-text"
										style={{
											fontSize: item.size,
											color: item.color,
										}}
										onDoubleClick={(e) => {
											e.stopPropagation();
											setEditingId(item.id);
										}}
									>
										{item.text || 'Label'}
									</div>
								)}
								{selected && (
									<>
										<button
											type="button"
											className="nf-mb-del"
											title="Delete"
											onPointerDown={(e) => e.stopPropagation()}
											onClick={() => removeItem(item.id)}
										>
											{ic.x}
										</button>
										<span
											className="nf-mb-handle resize"
											onPointerDown={(e) => onItemPointerDown(e, item.id, 'resize')}
										/>
										<span
											className="nf-mb-handle rotate"
											onPointerDown={(e) => onItemPointerDown(e, item.id, 'rotate')}
										>
											{ic.refresh || '⟳'}
										</span>
									</>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { icons } from '../../lib/icons';
import { downloadImage, fileToRefImage } from '../../state/persistence';
import type { ImageItem, Shot, Variant } from '../../state/types';
import { Spinner } from '../ui';

// MediaShell (ih): the shot's image preview frame, upload/generate empty state,
// per-image actions, and the fullscreen lightbox.
export function MediaShell({
	shot,
	aspectRatio,
	onChange,
	onEdit,
	onGenerate,
}: {
	shot: Shot;
	aspectRatio: string;
	visualStyle?: string;
	onChange: (images: ImageItem[]) => void;
	onEdit?: (index: number) => void;
	onGenerate?: () => void;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [lightbox, setLightbox] = useState<string | null>(null);
	useEffect(() => {
		if (!lightbox) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setLightbox(null);
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [lightbox]);

	const ratio = aspectRatio === '1:1' ? '1 / 1' : aspectRatio === '9:16' ? '9 / 16' : '16 / 9';
	const arClass = 'ar-' + aspectRatio.replace(':', 'x');
	const images = shot.images || [];

	const addFiles = async (list: FileList | null) => {
		const files = Array.from(list || []).slice(0, Math.max(0, 3 - images.length));
		if (!files.length) return;
		const loaded = await Promise.all(files.map(fileToRefImage));
		onChange([...images, ...loaded].slice(0, 3));
		if (fileRef.current) fileRef.current.value = '';
	};
	const replaceAt = async (index: number, file?: File) => {
		if (!file) return;
		const img = await fileToRefImage(file);
		onChange(images.map((it, i) => (i === index ? img : it)));
	};
	const removeAt = (index: number) => onChange(images.filter((_, i) => i !== index));
	const hasDesc = !!(shot.description || '').trim();

	return (
		<div className={`nf-media-shell ${arClass}`}>
			<div className="nf-media-frame" style={{ aspectRatio: ratio, gridTemplateColumns: `repeat(${Math.max(1, images.length)}, minmax(0, 1fr))` }}>
				{images.length ? (
					images.map((img, i) => {
						const adj = img.adjustments;
						const filter = adj ? `brightness(${adj.brightness ?? 1}) contrast(${adj.contrast ?? 1}) saturate(${adj.saturate ?? 1})` : undefined;
						return (
							<div className="nf-media-tile" key={img.id || img.src}>
								<img src={img.src} alt={img.name || `Shot image ${i + 1}`} style={{ filter }} />
								<div className="nf-media-actions">
									<button type="button" className="nf-media-act-btn" title="Expand to full screen" onClick={() => setLightbox(img.src)}>
										{icons.expand}
									</button>
									<button type="button" className="nf-media-act-btn" title="Download .png" onClick={() => downloadImage(img.src, img.name || `shot-${shot.number}`)}>
										{icons.download}
									</button>
									<button type="button" className="nf-media-act-btn primary" title="Edit image" onClick={() => onEdit?.(i)}>
										{icons.edit}
									</button>
									<label className="nf-media-act-btn" title="Replace image">
										{icons.image}
										<input
											type="file"
											accept="image/*"
											hidden
											onChange={(e) => {
												replaceAt(i, e.target.files?.[0]);
												e.target.value = '';
											}}
										/>
									</label>
									<button type="button" className="nf-media-act-btn danger" title="Remove image" onClick={() => removeAt(i)}>
										{icons.x}
									</button>
								</div>
							</div>
						);
					})
				) : (
					<div className="nf-media-empty-stack">
						{shot.generating ? (
							<div className="nf-media-loading">
								<Spinner size={18} />
								<span>Generating…</span>
							</div>
						) : (
							<>
								<button type="button" className="nf-media-empty" onClick={() => fileRef.current?.click()}>
									{icons.image}
									<span>Drop image or click to upload</span>
								</button>
								<button type="button" className="nf-media-genbtn" disabled={!hasDesc} title={hasDesc ? 'Generate from description' : 'Add a description first'} onClick={() => onGenerate?.()}>
									{icons.spark}
									<span>Generate from description</span>
								</button>
							</>
						)}
					</div>
				)}
				{images.length > 0 && images.length < 3 && (
					<button type="button" className="nf-media-add" title="Add image" onClick={() => fileRef.current?.click()}>
						+
					</button>
				)}
			</div>
			<input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} />
			{shot.error && (
				<div className="nf-media-error">
					{shot.error}{' '}
					<button type="button" onClick={() => onGenerate?.()}>
						Retry
					</button>
				</div>
			)}
			{lightbox &&
				createPortal(
					<div className="nf-lightbox" onClick={() => setLightbox(null)}>
						<button type="button" className="nf-lightbox-x" title="Close (Esc)" onClick={() => setLightbox(null)}>
							{icons.x}
						</button>
						<img src={lightbox} alt="Full preview" onClick={(e) => e.stopPropagation()} />
					</div>,
					document.body,
				)}
		</div>
	);
}

// Variants (lh): the generated-variant strip below the preview.
export function Variants({
	shot,
	onSetHero,
	onFavorite,
	onDelete,
	onBranch,
}: {
	shot: Shot;
	onSetHero: (id: string) => void;
	onFavorite: (id: string) => void;
	onDelete: (id: string) => void;
	onBranch: (v: Variant) => void;
}) {
	const variants = shot.variants || [];
	if (!variants.length) return null;
	const heroSrc = shot.images?.[0]?.src;
	return (
		<div className="nf-variants">
			<div className="nf-variants-head">
				<span>
					{variants.length} variant{variants.length === 1 ? '' : 's'}
				</span>
				<span className="nf-variants-hint">click to use · ★ favorite</span>
			</div>
			<div className="nf-variants-row">
				{variants.map((v) => (
					<div key={v.id} className={'nf-variant' + (v.src === heroSrc ? ' active' : '') + (v.favorite ? ' fav' : '')}>
						<button type="button" className="nf-variant-img" title="Use this variant" onClick={() => onSetHero(v.id!)}>
							<img src={v.src} alt="variant" />
						</button>
						<button type="button" className="nf-variant-star" title={v.favorite ? 'Unfavorite' : 'Favorite'} onClick={() => onFavorite(v.id!)}>
							{v.favorite ? '★' : '☆'}
						</button>
						<div className="nf-variant-tools">
							<button type="button" title="Branch into a new shot" onClick={() => onBranch(v)}>
								{icons.copy}
							</button>
							<button type="button" title="Delete variant" onClick={() => onDelete(v.id!)}>
								{icons.x}
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

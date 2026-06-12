import { type ReactNode, type CSSProperties } from 'react';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Local icon set (bundle `ut` / `st`) — distinct from the shared Glyph set.
// ---------------------------------------------------------------------------

function iesIcon(node: ReactNode, size = 18) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{node}
		</svg>
	);
}

const iesIcons = {
	close: iesIcon(
		<>
			<path d="M6 6l12 12" />
			<path d="M18 6 6 18" />
		</>,
		16,
	),
	undo: iesIcon(
		<>
			<path d="M3 7v6h6" />
			<path d="M3 13a9 9 0 1 0 3-6.7L3 9" />
		</>,
		16,
	),
	redo: iesIcon(
		<>
			<path d="M21 7v6h-6" />
			<path d="M21 13a9 9 0 1 1-3-6.7L21 9" />
		</>,
		16,
	),
	reset: iesIcon(
		<>
			<path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
			<path d="M21 3v5h-5" />
		</>,
		14,
	),
	zoomIn: iesIcon(
		<>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
			<path d="M11 8v6" />
			<path d="M8 11h6" />
		</>,
		14,
	),
	zoomOut: iesIcon(
		<>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
			<path d="M8 11h6" />
		</>,
		14,
	),
	check: iesIcon(<path d="M5 12l5 5 9-11" />, 14),
	crop: iesIcon(
		<>
			<path d="M6 2v14a2 2 0 0 0 2 2h14" />
			<path d="M2 6h14a2 2 0 0 1 2 2v14" />
		</>,
	),
	reframe: iesIcon(
		<>
			<rect x="3" y="6" width="18" height="12" rx="1.5" />
			<path d="M8 9.5 5.5 12 8 14.5" />
			<path d="m16 9.5 2.5 2.5L16 14.5" />
		</>,
	),
	finetune: iesIcon(
		<>
			<line x1="4" y1="7" x2="20" y2="7" />
			<circle cx="10" cy="7" r="2.2" fill="currentColor" />
			<line x1="4" y1="12" x2="20" y2="12" />
			<circle cx="15" cy="12" r="2.2" fill="currentColor" />
			<line x1="4" y1="17" x2="20" y2="17" />
			<circle cx="8" cy="17" r="2.2" fill="currentColor" />
		</>,
	),
	filter: iesIcon(
		<>
			<path d="M3 5h18" />
			<path d="M6 12h12" />
			<path d="M10 19h4" />
		</>,
	),
	annotate: iesIcon(
		<>
			<path d="M4 20h4l11-11-4-4L4 16v4Z" />
			<path d="m14 6 4 4" />
		</>,
	),
	arrows: iesIcon(
		<>
			<path d="M4 12h16" />
			<path d="m14 6 6 6-6 6" />
		</>,
	),
	brush: iesIcon(
		<>
			<path d="M4 20c0-2 1-3 3-3 0 0 1.5-.2 2.5-1.2L18 7" />
			<path d="M14 3l4 4" />
		</>,
		14,
	),
	line: iesIcon(
		<>
			<path d="M5 19 19 5" />
		</>,
		14,
	),
	rect: iesIcon(<rect x="4" y="6" width="16" height="12" rx="1.5" />, 14),
	ellipse: iesIcon(<ellipse cx="12" cy="12" rx="8" ry="6" />, 14),
	text: iesIcon(
		<>
			<path d="M5 5h14" />
			<path d="M12 5v14" />
			<path d="M9 19h6" />
		</>,
		14,
	),
	eraser: iesIcon(
		<>
			<path d="M3 17 13 7l5 5L8 22H3v-5z" />
			<path d="m15 5 4 4" />
		</>,
		14,
	),
};

// ---------------------------------------------------------------------------
// Filter presets (bundle `Us`)
// ---------------------------------------------------------------------------

const FILTER_PRESETS: Record<string, { label: string; filter: string }> = {
	original: { label: 'Original', filter: '' },
	softWarm: {
		label: 'Soft Warm',
		filter: 'sepia(0.18) saturate(1.05) brightness(1.04) contrast(0.96)',
	},
	cleanProduct: {
		label: 'Clean Product',
		filter: 'saturate(0.92) brightness(1.06) contrast(1.08)',
	},
	cinematic: {
		label: 'Cinematic',
		filter: 'contrast(1.18) saturate(1.1) brightness(0.96)',
	},
	matte: {
		label: 'Matte',
		filter: 'contrast(0.88) saturate(0.85) brightness(1.04)',
	},
	bw: { label: 'Black & White', filter: 'grayscale(1) contrast(1.05)' },
	coolStudio: {
		label: 'Cool Studio',
		filter: 'hue-rotate(-10deg) saturate(0.85) brightness(1.04)',
	},
	highKey: {
		label: 'High Key',
		filter: 'brightness(1.15) contrast(0.92) saturate(0.95)',
	},
};

// Default adjustments (bundle `Gr`)
const DEFAULT_ADJUSTMENTS = {
	brightness: 0,
	contrast: 0,
	saturation: 0,
	exposure: 0,
	temperature: 0,
	clarity: 0,
	highlights: 0,
	shadows: 0,
	sharpness: 0,
	vignette: 0,
};

// ---------------------------------------------------------------------------
// Filter / temperature / image-load helpers (bundle `Zu`, `bh`, `Ch`)
// ---------------------------------------------------------------------------

function adjustmentsToFilter(adjustments?: any): string {
	const a = { ...DEFAULT_ADJUSTMENTS, ...(adjustments || {}) };
	const brightness =
		1 +
		(a.brightness / 100) * 0.5 +
		(a.exposure / 100) * 0.5 +
		(a.shadows / 100) * 0.12;
	const contrast =
		1 +
		(a.contrast / 100) * 0.6 +
		(a.clarity / 100) * 0.35 -
		(a.highlights / 100) * 0.1;
	const saturate = 1 + (a.saturation / 100) * 0.8;
	return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturate.toFixed(3)})`;
}

function temperatureOverlay(value: number) {
	if (!value) return null;
	const clamped = Math.max(-100, Math.min(100, value));
	const alpha = (Math.abs(clamped) / 100) * 0.32;
	return {
		color: `rgba(${clamped > 0 ? '255, 147, 41' : '41, 140, 255'}, ${alpha})`,
		alpha,
		rgb: clamped > 0 ? [255, 147, 41] : [41, 140, 255],
	};
}

// ---------------------------------------------------------------------------
// Arrow style catalog (bundle `Vs`) and color swatches (bundle `Ks`)
// ---------------------------------------------------------------------------

const ARROW_STYLES: Record<string, { id: string; svg: ReactNode }[]> = {
	Flat: [
		{
			id: 'flat-right',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M3 12h28M24 5l8 7-8 7"
						stroke="currentColor"
						strokeWidth="2.4"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'flat-thin',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M3 12h28M26 7l6 5-6 5"
						stroke="currentColor"
						strokeWidth="1.4"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'flat-bold',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M3 12h26l-6-6m6 6-6 6"
						stroke="currentColor"
						strokeWidth="3.6"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'flat-short',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M14 12h16M22 5l8 7-8 7"
						stroke="currentColor"
						strokeWidth="2.4"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'flat-long',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M2 12h32M27 6l7 6-7 6"
						stroke="currentColor"
						strokeWidth="2"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
	],
	'3D': [
		{
			id: '3d-triangle',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M4 12 32 4l-6 8 6 8z"
						fill="currentColor"
						stroke="currentColor"
						strokeWidth="1"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: '3d-paper',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path d="M6 20 18 6l4 6 12-2-16 12z" fill="currentColor" />
				</svg>
			),
		},
		{
			id: '3d-block',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path d="M2 14h22V8l12 4-12 4v-4H2z" fill="currentColor" />
				</svg>
			),
		},
	],
	Fade: [
		{
			id: 'fade-right',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<defs>
						<linearGradient id="fr" x1="0" x2="1">
							<stop offset="0" stopColor="currentColor" stopOpacity="0.1" />
							<stop offset="1" stopColor="currentColor" />
						</linearGradient>
					</defs>
					<path
						d="M3 12h32"
						stroke="url(#fr)"
						strokeWidth="3"
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d="M26 6l9 6-9 6"
						stroke="currentColor"
						strokeWidth="2.4"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'fade-bar',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<defs>
						<linearGradient id="fb" x1="0" x2="1">
							<stop offset="0" stopColor="currentColor" stopOpacity="0.05" />
							<stop offset="1" stopColor="currentColor" />
						</linearGradient>
					</defs>
					<rect x="3" y="10" width="32" height="4" rx="2" fill="url(#fb)" />
				</svg>
			),
		},
		{
			id: 'fade-bold',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<defs>
						<linearGradient id="fbo" x1="0" x2="1">
							<stop offset="0" stopColor="currentColor" stopOpacity="0.1" />
							<stop offset="1" stopColor="currentColor" />
						</linearGradient>
					</defs>
					<path
						d="M3 12h26l-6-6m6 6-6 6"
						stroke="url(#fbo)"
						strokeWidth="3.6"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
	],
	Curved: [
		{
			id: 'curve-r',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M4 19 Q22 -2 34 12M28 8l6 4-3 6"
						stroke="currentColor"
						strokeWidth="2"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'curve-l',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M36 19 Q18 -2 6 12M12 8 6 12l3 6"
						stroke="currentColor"
						strokeWidth="2"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'curve-u',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M6 6 Q20 22 34 6M28 12l6-6-6-2"
						stroke="currentColor"
						strokeWidth="2"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
	],
	Corners: [
		{
			id: 'corner-tr',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M4 20h12V8h14M22 4l8 4-8 4"
						stroke="currentColor"
						strokeWidth="2"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'corner-br',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M4 4h12v12h14M22 12l8 4-8 4"
						stroke="currentColor"
						strokeWidth="2"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
		{
			id: 'corner-tl',
			svg: (
				<svg viewBox="0 0 40 24" width="100%" height="100%">
					<path
						d="M36 20H24V8H10M18 4l-8 4 8 4"
						stroke="currentColor"
						strokeWidth="2"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			),
		},
	],
};

const COLOR_SWATCHES = [
	'#FFFFFF',
	'#000000',
	'#FF3B30',
	'#F5A623',
	'#F8E71C',
	'#34C759',
	'#0A84FF',
	'#AF52DE',
];

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

// ---------------------------------------------------------------------------
// SVG annotation renderer (bundle `qu`) + arrow SVG renderer (bundle `Nh`)
// ---------------------------------------------------------------------------

function renderAnnotation(ann: any, opts: any = {}): ReactNode {
	const { selected, onMove, draft } = opts;
	const id = ann.id || 'draft';
	const color = ann.color || '#FFFFFF';
	const strokeWidth = (ann.stroke || 4) / 800;
	const dataProps: any = draft
		? {}
		: {
				'data-ann-id': id,
				style: { cursor: 'move' },
			};
	const onPointer = (e: any) => {
		if (!draft && onMove) onMove(e, id, 'move');
	};
	if (ann.kind === 'brush') {
		const d = ann.points
			.map(([px, py]: [number, number], i: number) => `${i === 0 ? 'M' : 'L'}${px} ${py}`)
			.join(' ');
		return (
			<path
				key={id}
				d={d}
				fill="none"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				{...dataProps}
				onPointerDown={onPointer}
			/>
		);
	}
	if (ann.kind === 'line')
		return (
			<line
				key={id}
				x1={ann.x1}
				y1={ann.y1}
				x2={ann.x2}
				y2={ann.y2}
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				{...dataProps}
				onPointerDown={onPointer}
			/>
		);
	if (ann.kind === 'rect') {
		const x = Math.min(ann.x, ann.x + ann.w);
		const y = Math.min(ann.y, ann.y + ann.h);
		const w = Math.abs(ann.w);
		const h = Math.abs(ann.h);
		return (
			<g key={id} {...dataProps} onPointerDown={onPointer}>
				<rect
					x={x}
					y={y}
					width={w}
					height={h}
					fill={ann.fill ? color : 'none'}
					fillOpacity={ann.fill ? 0.18 : 0}
					stroke={color}
					strokeWidth={strokeWidth}
				/>
				{selected && !draft && onMove && (
					<circle
						data-ann-handle="se"
						cx={x + w}
						cy={y + h}
						r="0.012"
						fill="white"
						stroke={color}
						strokeWidth="0.0025"
						onPointerDown={(e: any) => onMove(e, id, 'resize', 'se')}
					/>
				)}
			</g>
		);
	}
	if (ann.kind === 'ellipse') {
		const cx = ann.x + ann.w / 2;
		const cy = ann.y + ann.h / 2;
		const rx = Math.abs(ann.w) / 2;
		const ry = Math.abs(ann.h) / 2;
		return (
			<g key={id} {...dataProps} onPointerDown={onPointer}>
				<ellipse
					cx={cx}
					cy={cy}
					rx={rx}
					ry={ry}
					fill={ann.fill ? color : 'none'}
					fillOpacity={ann.fill ? 0.18 : 0}
					stroke={color}
					strokeWidth={strokeWidth}
				/>
				{selected && !draft && onMove && (
					<circle
						data-ann-handle="se"
						cx={ann.x + ann.w}
						cy={ann.y + ann.h}
						r="0.012"
						fill="white"
						stroke={color}
						strokeWidth="0.0025"
						onPointerDown={(e: any) => onMove(e, id, 'resize', 'se')}
					/>
				)}
			</g>
		);
	}
	if (ann.kind === 'text') {
		const size = (ann.size || 24) / 800;
		return (
			<g key={id} {...dataProps} onPointerDown={onPointer}>
				<text
					x={ann.x}
					y={ann.y + size * 0.85}
					fontSize={size}
					fill={ann.color || '#FFFFFF'}
					fontFamily="Inter Tight, Inter, sans-serif"
					fontWeight="600"
					stroke="rgba(0,0,0,0.45)"
					strokeWidth={size * 0.05}
					paintOrder="stroke fill"
				>
					{ann.text}
				</text>
			</g>
		);
	}
	return ann.kind === 'arrow'
		? renderArrow(ann, {
				id,
				dataProps,
				onPointer,
				draft,
				onMove,
				selected,
			})
		: null;
}

function renderArrow(ann: any, ctx: any): ReactNode {
	const { id, dataProps, onPointer, draft, onMove, selected } = ctx;
	const x1 = ann.x;
	const y1 = ann.y;
	const x2 = ann.x + ann.w;
	const y2 = ann.y + ann.h;
	const color = ann.color || '#FF3B30';
	const opacity = ann.opacity ?? 1;
	const size = (ann.size || 28) / 800;
	const head = size * 1.4;
	const angle = Math.atan2(y2 - y1, x2 - x1);
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const len = Math.hypot(x2 - x1, y2 - y1) || 1e-4;
	const baseX = x2 - cos * head;
	const baseY = y2 - sin * head;
	let shape: ReactNode = null;
	if (ann.cat === 'Flat' || ann.cat === 'Corners') {
		const headPath = `M ${x2} ${y2} L ${baseX - sin * head * 0.5} ${baseY + cos * head * 0.5} L ${baseX + sin * head * 0.5} ${baseY - cos * head * 0.5} Z`;
		const lineW =
			ann.style === 'flat-thin'
				? size * 0.4
				: ann.style === 'flat-bold'
					? size * 1.4
					: size;
		shape = (
			<g>
				<line
					x1={x1}
					y1={y1}
					x2={baseX}
					y2={baseY}
					stroke={color}
					strokeWidth={lineW}
					strokeLinecap="round"
				/>
				<path
					d={headPath}
					fill={color}
					stroke={color}
					strokeWidth={lineW * 0.4}
					strokeLinejoin="round"
				/>
			</g>
		);
	} else if (ann.cat === 'Fade') {
		const gradId = `g-${id}`;
		const headPath = `M ${x2} ${y2} L ${baseX - sin * head * 0.5} ${baseY + cos * head * 0.5} L ${baseX + sin * head * 0.5} ${baseY - cos * head * 0.5} Z`;
		shape = (
			<g>
				<defs>
					<linearGradient
						id={gradId}
						x1={x1}
						y1={y1}
						x2={baseX}
						y2={baseY}
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0" stopColor={color} stopOpacity="0.05" />
						<stop offset="1" stopColor={color} stopOpacity="1" />
					</linearGradient>
				</defs>
				<line
					x1={x1}
					y1={y1}
					x2={baseX}
					y2={baseY}
					stroke={`url(#${gradId})`}
					strokeWidth={size}
					strokeLinecap="round"
				/>
				<path d={headPath} fill={color} />
			</g>
		);
	} else if (ann.cat === 'Curved') {
		const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
		const bow = len * 0.35 * (ann.style === 'curve-u' ? -1 : 1);
		const ctrlX = mid.x + -sin * bow;
		const ctrlY = mid.y + cos * bow;
		const dx = x2 - ctrlX;
		const dy = y2 - ctrlY;
		const dlen = Math.hypot(dx, dy) || 1e-4;
		const ndx = dx / dlen;
		const ndy = dy / dlen;
		const tipX = x2 - ndx * head;
		const tipY = y2 - ndy * head;
		const headPath = `M ${x2} ${y2} L ${tipX - ndy * head * 0.5} ${tipY + ndx * head * 0.5} L ${tipX + ndy * head * 0.5} ${tipY - ndx * head * 0.5} Z`;
		shape = (
			<g>
				<path
					d={`M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
					stroke={color}
					strokeWidth={size}
					fill="none"
					strokeLinecap="round"
				/>
				<path d={headPath} fill={color} />
			</g>
		);
	} else if (ann.cat === '3D') {
		const headPath = `M ${x2} ${y2} L ${baseX - sin * head * 0.7} ${baseY + cos * head * 0.7} L ${baseX - sin * head * 0.3} ${baseY + cos * head * 0.3} L ${x1 - sin * head * 0.25} ${y1 + cos * head * 0.25} L ${x1 + sin * head * 0.25} ${y1 - cos * head * 0.25} L ${baseX + sin * head * 0.3} ${baseY - cos * head * 0.3} L ${baseX + sin * head * 0.7} ${baseY - cos * head * 0.7} Z`;
		shape = (
			<g>
				<path
					d={headPath}
					fill="black"
					fillOpacity="0.25"
					transform={`translate(${size * 0.18} ${size * 0.18})`}
				/>
				<path d={headPath} fill={color} stroke={color} strokeWidth={size * 0.05} />
			</g>
		);
	}
	return (
		<g key={id} opacity={opacity} {...dataProps} onPointerDown={onPointer}>
			{shape}
			{selected && !draft && onMove && (
				<circle
					data-ann-handle="se"
					cx={x2}
					cy={y2}
					r="0.012"
					fill="white"
					stroke={color}
					strokeWidth="0.0025"
					onPointerDown={(e: any) => onMove(e, id, 'resize', 'se')}
				/>
			)}
		</g>
	);
}

// ---------------------------------------------------------------------------
// Canvas annotation renderers (bundle `Mh`, `Fh`) + hex->rgba (bundle `Lh`)
// ---------------------------------------------------------------------------

function drawAnnotation(
	ctx: CanvasRenderingContext2D,
	ann: any,
	region: { sx: number; sy: number; cw: number; ch: number; srcW: number; srcH: number },
) {
	const { sx, sy, cw, ch, srcW, srcH } = region;
	const toCanvas = (nx: number, ny: number) => ({
		x: nx * srcW - sx,
		y: ny * srcH - sy,
	});
	const stroke = ((ann.stroke || ann.size || 4) / 800) * Math.max(cw, ch);
	ctx.save();
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.strokeStyle = ann.color || '#FFFFFF';
	ctx.fillStyle = ann.color || '#FFFFFF';
	ctx.globalAlpha = ann.opacity ?? 1;
	if (ann.kind === 'brush' && ann.points?.length) {
		ctx.lineWidth = stroke;
		ctx.beginPath();
		ann.points.forEach(([px, py]: [number, number], i: number) => {
			const p = toCanvas(px, py);
			if (i === 0) ctx.moveTo(p.x, p.y);
			else ctx.lineTo(p.x, p.y);
		});
		ctx.stroke();
	} else if (ann.kind === 'line') {
		ctx.lineWidth = stroke;
		const p1 = toCanvas(ann.x1, ann.y1);
		const p2 = toCanvas(ann.x2, ann.y2);
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();
	} else if (ann.kind === 'rect') {
		ctx.lineWidth = stroke;
		const p = toCanvas(Math.min(ann.x, ann.x + ann.w), Math.min(ann.y, ann.y + ann.h));
		const w = Math.abs(ann.w) * srcW;
		const h = Math.abs(ann.h) * srcH;
		if (ann.fill) {
			ctx.globalAlpha = (ann.opacity ?? 1) * 0.2;
			ctx.fillRect(p.x, p.y, w, h);
			ctx.globalAlpha = ann.opacity ?? 1;
		}
		ctx.strokeRect(p.x, p.y, w, h);
	} else if (ann.kind === 'ellipse') {
		ctx.lineWidth = stroke;
		const cx = (ann.x + ann.w / 2) * srcW - sx;
		const cy = (ann.y + ann.h / 2) * srcH - sy;
		const rx = (Math.abs(ann.w) * srcW) / 2;
		const ry = (Math.abs(ann.h) * srcH) / 2;
		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		if (ann.fill) {
			ctx.globalAlpha = (ann.opacity ?? 1) * 0.2;
			ctx.fill();
			ctx.globalAlpha = ann.opacity ?? 1;
		}
		ctx.stroke();
	} else if (ann.kind === 'text') {
		const size = ((ann.size || 24) / 800) * Math.max(cw, ch);
		ctx.font = `600 ${size}px "Inter Tight", "Inter", sans-serif`;
		ctx.textBaseline = 'alphabetic';
		const p = toCanvas(ann.x, ann.y);
		ctx.strokeStyle = 'rgba(0,0,0,0.5)';
		ctx.lineWidth = size * 0.08;
		ctx.strokeText(ann.text || '', p.x, p.y + size * 0.85);
		ctx.fillStyle = ann.color || '#FFFFFF';
		ctx.fillText(ann.text || '', p.x, p.y + size * 0.85);
	} else if (ann.kind === 'arrow') {
		drawArrow(ctx, ann, region);
	}
	ctx.restore();
}

function drawArrow(
	ctx: CanvasRenderingContext2D,
	ann: any,
	region: { sx: number; sy: number; cw: number; ch: number; srcW: number; srcH: number },
) {
	const { sx, sy, srcW, srcH, cw, ch } = region;
	const x1 = ann.x * srcW - sx;
	const y1 = ann.y * srcH - sy;
	const x2 = (ann.x + ann.w) * srcW - sx;
	const y2 = (ann.y + ann.h) * srcH - sy;
	const size = ((ann.size || 28) / 800) * Math.max(cw, ch);
	const head = size * 1.4;
	const angle = Math.atan2(y2 - y1, x2 - x1);
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const baseX = x2 - cos * head;
	const baseY = y2 - sin * head;
	const color = ann.color || '#FF3B30';
	ctx.save();
	ctx.globalAlpha = ann.opacity ?? 1;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	if (ann.cat === 'Flat' || ann.cat === 'Corners') {
		const lineW =
			ann.style === 'flat-thin'
				? size * 0.4
				: ann.style === 'flat-bold'
					? size * 1.4
					: size;
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		ctx.lineWidth = lineW;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(baseX, baseY);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(baseX - sin * head * 0.5, baseY + cos * head * 0.5);
		ctx.lineTo(baseX + sin * head * 0.5, baseY - cos * head * 0.5);
		ctx.closePath();
		ctx.fill();
	} else if (ann.cat === 'Fade') {
		const grad = ctx.createLinearGradient(x1, y1, baseX, baseY);
		grad.addColorStop(0, hexToRgba(color, 0.05));
		grad.addColorStop(1, color);
		ctx.strokeStyle = grad;
		ctx.lineWidth = size;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(baseX, baseY);
		ctx.stroke();
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(baseX - sin * head * 0.5, baseY + cos * head * 0.5);
		ctx.lineTo(baseX + sin * head * 0.5, baseY - cos * head * 0.5);
		ctx.closePath();
		ctx.fill();
	} else if (ann.cat === 'Curved') {
		const len = Math.hypot(x2 - x1, y2 - y1) || 1;
		const midX = (x1 + x2) / 2;
		const midY = (y1 + y2) / 2;
		const bow = len * 0.35 * (ann.style === 'curve-u' ? -1 : 1);
		const ctrlX = midX + -sin * bow;
		const ctrlY = midY + cos * bow;
		const dx = x2 - ctrlX;
		const dy = y2 - ctrlY;
		const dlen = Math.hypot(dx, dy) || 1;
		const ndx = dx / dlen;
		const ndy = dy / dlen;
		const tipX = x2 - ndx * head;
		const tipY = y2 - ndy * head;
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		ctx.lineWidth = size;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(tipX - ndy * head * 0.5, tipY + ndx * head * 0.5);
		ctx.lineTo(tipX + ndy * head * 0.5, tipY - ndx * head * 0.5);
		ctx.closePath();
		ctx.fill();
	} else if (ann.cat === '3D') {
		const drawHead = () => {
			ctx.beginPath();
			ctx.moveTo(x2, y2);
			ctx.lineTo(baseX - sin * head * 0.7, baseY + cos * head * 0.7);
			ctx.lineTo(baseX - sin * head * 0.3, baseY + cos * head * 0.3);
			ctx.lineTo(x1 - sin * head * 0.25, y1 + cos * head * 0.25);
			ctx.lineTo(x1 + sin * head * 0.25, y1 - cos * head * 0.25);
			ctx.lineTo(baseX + sin * head * 0.3, baseY - cos * head * 0.3);
			ctx.lineTo(baseX + sin * head * 0.7, baseY - cos * head * 0.7);
			ctx.closePath();
		};
		ctx.save();
		ctx.translate(size * 0.18, size * 0.18);
		ctx.fillStyle = 'rgba(0,0,0,0.25)';
		drawHead();
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = color;
		drawHead();
		ctx.fill();
	}
	ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
	const h = hex.replace('#', '');
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Image Edit Studio (bundle `Eh`)
// ---------------------------------------------------------------------------

interface ImageEditStageProps {
	image: {
		src: string;
		originalUrl?: string;
		editedUrl?: string;
		edits?: any;
		shotNumber?: number;
		sceneName?: string;
		[k: string]: any;
	};
	shotLabel: string;
	onClose: () => void;
	onSave: (r: { url: string; originalUrl: string; edits: any }) => void;
}

export function ImageEditStage({
	image,
	shotLabel,
	onClose,
	onSave,
}: ImageEditStageProps) {
	const sourceUrl = image.originalUrl || image.src;
	const [tool, setTool] = React.useState('crop');
	const [zoom, setZoom] = React.useState(1);
	const initialEdits = image.edits || {};
	const [filterId, setFilterId] = React.useState<string>(initialEdits.filterId || 'original');
	const [adjustments, setAdjustments] = React.useState<any>({
		...DEFAULT_ADJUSTMENTS,
		...(initialEdits.adjustments || {}),
	});
	const [crop, setCrop] = React.useState<any>(initialEdits.crop || null);
	const [annotations, setAnnotations] = React.useState<any[]>(initialEdits.annotations || []);
	const [annTool, setAnnTool] = React.useState('brush');
	const [annColor, setAnnColor] = React.useState(COLOR_SWATCHES[0]);
	const [strokeSize, setStrokeSize] = React.useState(4);
	const [fillShape, setFillShape] = React.useState(false);
	const [arrowCat, setArrowCat] = React.useState('Flat');
	const [arrowStyle, setArrowStyle] = React.useState('flat-right');
	const [arrowColor, setArrowColor] = React.useState('#FF3B30');
	const [arrowSize, setArrowSize] = React.useState(28);
	const [arrowWeight, setArrowWeight] = React.useState(6);
	const [arrowOpacity, setArrowOpacity] = React.useState(1);
	const [arrowSnap, setArrowSnap] = React.useState(true);
	const [reframe, setReframe] = React.useState<any>(initialEdits.reframe || null);
	const [reframeFill, setReframeFill] = React.useState<string>(initialEdits.reframe?.fill || 'blur');
	const [reframeColor, setReframeColor] = React.useState<string>(initialEdits.reframe?.color || '#16171B');
	const [selectedAnn, setSelectedAnn] = React.useState<any>(null);
	const [draftAnn, setDraftAnn] = React.useState<any>(null);
	const [textDraft, setTextDraft] = React.useState<any>(null);
	const [confirm, setConfirm] = React.useState<any>(null);
	const [loadError, setLoadError] = React.useState('');
	const [cropDraft, setCropDraft] = React.useState<any>(crop);
	const [aspect, setAspect] = React.useState('free');
	const [, setQrUnused] = React.useState<any>(null);
	const imgRef = React.useRef<HTMLImageElement | null>(null);
	const stageRef = React.useRef<HTMLDivElement | null>(null);
	const overlayRef = React.useRef<SVGSVGElement | null>(null);
	const [loadedImg, setLoadedImg] = React.useState<HTMLImageElement | null>(null);
	const [natural, setNatural] = React.useState({ w: 0, h: 0 });
	const [history, setHistory] = React.useState<any[]>([]);
	const [historyIndex, setHistoryIndex] = React.useState(-1);
	const dirtyRef = React.useRef(false);

	React.useEffect(() => {
		if (tool === 'crop')
			setCropDraft(crop || { x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tool]);

	React.useEffect(() => {
		let alive = true;
		loadImage(sourceUrl)
			.then((img) => {
				if (alive) {
					setLoadedImg(img);
					setNatural({ w: img.naturalWidth, h: img.naturalHeight });
				}
			})
			.catch(() => {
				setLoadError('Could not load the source image.');
			});
		return () => {
			alive = false;
		};
	}, [sourceUrl]);

	const pushHistory = React.useCallback(
		(snapshot: any) => {
			setHistory((prev) => [...prev.slice(0, historyIndex + 1), snapshot].slice(-50));
			setHistoryIndex((i) => Math.min(i + 1, 49));
			dirtyRef.current = true;
		},
		[historyIndex],
	);

	React.useEffect(() => {
		if (history.length === 0 && loadedImg) {
			setHistory([
				{
					filterId,
					adjustments,
					crop,
					annotations,
					reframe,
				},
			]);
			setHistoryIndex(0);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loadedImg]);

	const snapshot = React.useCallback(
		(overrides: any = {}) => ({
			filterId: overrides.filterId ?? filterId,
			adjustments: overrides.adjustments ?? adjustments,
			crop: overrides.crop ?? crop,
			annotations: overrides.annotations ?? annotations,
			reframe: overrides.reframe !== void 0 ? overrides.reframe : reframe,
		}),
		[filterId, adjustments, crop, annotations, reframe],
	);

	const commit = React.useCallback(
		(overrides: any = {}) => {
			pushHistory(snapshot(overrides));
		},
		[pushHistory, snapshot],
	);

	const applySnapshot = (s: any) => {
		setFilterId(s.filterId);
		setAdjustments(s.adjustments);
		setCrop(s.crop);
		setAnnotations(s.annotations);
		setReframe(s.reframe ?? null);
	};

	const undo = () => {
		if (historyIndex <= 0) return;
		const idx = historyIndex - 1;
		applySnapshot(history[idx]);
		setHistoryIndex(idx);
		dirtyRef.current = true;
	};

	const redo = () => {
		if (historyIndex >= history.length - 1) return;
		const idx = historyIndex + 1;
		applySnapshot(history[idx]);
		setHistoryIndex(idx);
		dirtyRef.current = true;
	};

	React.useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!textDraft) {
				if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
					e.preventDefault();
					undo();
				} else if (
					(e.metaKey || e.ctrlKey) &&
					(e.key === 'y' || (e.key === 'z' && e.shiftKey))
				) {
					e.preventDefault();
					redo();
				} else if (e.key === 'Escape') {
					if (selectedAnn) setSelectedAnn(null);
					else requestClose();
				} else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnn) {
					const next = annotations.filter((a) => a.id !== selectedAnn);
					setAnnotations(next);
					setSelectedAnn(null);
					commit({ annotations: next });
				}
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [textDraft, selectedAnn, annotations, commit, historyIndex, history]);

	const liveFilter = `${FILTER_PRESETS[filterId]?.filter || ''} ${adjustmentsToFilter(adjustments)}`.trim();
	const tempOverlay = temperatureOverlay(adjustments.temperature);

	(() => {
		if (!natural.w || !natural.h) return 1;
		const w = crop ? crop.w * natural.w : natural.w;
		const h = crop ? crop.h * natural.h : natural.h;
		return h ? w / h : 1;
	})();
	if (crop) {
		void (crop.y * 100, (1 - crop.x - crop.w) * 100, (1 - crop.y - crop.h) * 100, crop.x * 100);
	}

	const reframeRatio = (() => {
		if (!reframe || reframe.ratio === 'original') return null;
		const [a, b] = reframe.ratio.split(':').map(Number);
		return a / b;
	})();

	const toNorm = (e: { clientX: number; clientY: number }) => {
		const overlay = overlayRef.current;
		if (!overlay) return { x: 0, y: 0 };
		const rect = overlay.getBoundingClientRect();
		const nx = (e.clientX - rect.left) / rect.width;
		const ny = (e.clientY - rect.top) / rect.height;
		return {
			x: Math.max(0, Math.min(1, nx)),
			y: Math.max(0, Math.min(1, ny)),
		};
	};

	const snap = (v: number) => {
		if (!arrowSnap) return v;
		const t = 0.035;
		return v < t ? 0 : v > 1 - t ? 1 : v;
	};

	const [frameSize, setFrameSize] = React.useState({ w: 0, h: 0 });

	React.useLayoutEffect(() => {
		if (!imgRef.current) return;
		const node = imgRef.current;
		const measure = () => {
			const rect = node.getBoundingClientRect();
			if (rect.width && rect.height)
				setFrameSize({ w: rect.width / zoom, h: rect.height / zoom });
		};
		measure();
		const ro = typeof ResizeObserver < 'u' ? new ResizeObserver(measure) : null;
		ro?.observe(node);
		return () => ro?.disconnect();
	}, [loadedImg, zoom, crop]);

	(() => {
		if (!reframeRatio || !frameSize.w || !frameSize.h) return null;
		const frameRatio = frameSize.w / frameSize.h;
		let w: number, h: number;
		if (reframeRatio > frameRatio) {
			h = frameSize.h;
			w = h * reframeRatio;
		} else {
			w = frameSize.w;
			h = w / reframeRatio;
		}
		return { width: `${w}px`, height: `${h}px` };
	})();

	const onOverlayDown = (e: any) => {
		if (
			(tool !== 'annotate' && tool !== 'arrows') ||
			e.target.closest('[data-ann-handle]')
		)
			return;
		if (e.target.dataset?.annId) {
			if (annTool === 'eraser' && tool === 'annotate') {
				const id = e.target.dataset.annId;
				const next = annotations.filter((a) => a.id !== id);
				setAnnotations(next);
				commit({ annotations: next });
				return;
			}
			setSelectedAnn(e.target.dataset.annId);
			return;
		}
		setSelectedAnn(null);
		const { x, y } = toNorm(e);
		if (tool === 'annotate') {
			if (annTool === 'brush')
				setDraftAnn({
					kind: 'brush',
					points: [[x, y]],
					color: annColor,
					stroke: strokeSize,
				});
			else if (annTool === 'line')
				setDraftAnn({
					kind: 'line',
					x1: x,
					y1: y,
					x2: x,
					y2: y,
					color: annColor,
					stroke: strokeSize,
				});
			else if (annTool === 'rect')
				setDraftAnn({
					kind: 'rect',
					x,
					y,
					w: 0,
					h: 0,
					color: annColor,
					stroke: strokeSize,
					fill: fillShape,
				});
			else if (annTool === 'ellipse')
				setDraftAnn({
					kind: 'ellipse',
					x,
					y,
					w: 0,
					h: 0,
					color: annColor,
					stroke: strokeSize,
					fill: fillShape,
				});
			else if (annTool === 'text')
				setTextDraft({
					x,
					y,
					w: 0.24,
					h: 0.06,
					color: annColor,
					size: 24,
					value: '',
				});
		} else if (tool === 'arrows')
			setDraftAnn({
				kind: 'arrow',
				x: snap(x),
				y: snap(y),
				w: 0,
				h: 0,
				color: arrowColor,
				size: arrowSize,
				weight: arrowWeight,
				opacity: arrowOpacity,
				style: arrowStyle,
				cat: arrowCat,
			});
	};

	const onOverlayMove = (e: any) => {
		if (!draftAnn) return;
		const { x, y } = toNorm(e);
		setDraftAnn((d: any) => {
			if (!d) return d;
			if (d.kind === 'brush') return { ...d, points: [...d.points, [x, y]] };
			if (d.kind === 'line') return { ...d, x2: x, y2: y };
			if (d.kind === 'arrow') {
				const sx = snap(x);
				const sy = snap(y);
				return { ...d, w: sx - d.x, h: sy - d.y };
			}
			return { ...d, w: x - d.x, h: y - d.y };
		});
	};

	const onOverlayUp = () => {
		if (!draftAnn) return;
		const next = [
			...annotations,
			{
				id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				...draftAnn,
			},
		];
		setAnnotations(next);
		setDraftAnn(null);
		commit({ annotations: next });
	};

	const dragRef = React.useRef<any>(null);

	const onAnnHandle = (e: any, id: string, mode = 'move', handle: string | null = null) => {
		e.stopPropagation();
		dragRef.current = {
			id,
			mode,
			handle,
			start: toNorm(e),
			origAnn: annotations.find((a) => a.id === id),
		};
		setSelectedAnn(id);
		const onMove = (ev: PointerEvent) => {
			const drag = dragRef.current;
			if (!drag) return;
			const pos = toNorm(ev);
			const dx = pos.x - drag.start.x;
			const dy = pos.y - drag.start.y;
			setAnnotations((list) =>
				list.map((item) => {
					if (item.id !== drag.id) return item;
					const orig = drag.origAnn;
					return drag.mode === 'move'
						? orig.kind === 'brush'
							? {
									...orig,
									points: orig.points.map(([px, py]: [number, number]) => [px + dx, py + dy]),
								}
							: orig.kind === 'line'
								? {
										...orig,
										x1: orig.x1 + dx,
										y1: orig.y1 + dy,
										x2: orig.x2 + dx,
										y2: orig.y2 + dy,
									}
								: { ...orig, x: orig.x + dx, y: orig.y + dy }
						: drag.mode === 'resize' && orig.kind !== 'brush' && orig.kind !== 'line'
							? { ...orig, w: orig.w + dx, h: orig.h + dy }
							: item;
				}),
			);
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			if (dragRef.current) {
				dragRef.current = null;
				commit();
			}
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	};

	const onCropDown = (e: any, mode: string) => {
		if (tool !== 'crop' || !cropDraft) return;
		e.stopPropagation();
		const start = toNorm(e);
		const base = { ...cropDraft };
		const onMove = (ev: PointerEvent) => {
			const pos = toNorm(ev);
			const dx = pos.x - start.x;
			const dy = pos.y - start.y;
			if (mode === 'move') {
				const x = Math.max(0, Math.min(1 - base.w, base.x + dx));
				const y = Math.max(0, Math.min(1 - base.h, base.y + dy));
				setCropDraft({ x, y, w: base.w, h: base.h });
			} else if (mode === 'nw') {
				const w = base.w - dx;
				const h = base.h - dy;
				if (w > 0.04 && h > 0.04)
					setCropDraft({ x: base.x + dx, y: base.y + dy, w, h });
			} else if (mode === 'ne') {
				const w = base.w + dx;
				const h = base.h - dy;
				if (w > 0.04 && h > 0.04)
					setCropDraft({ x: base.x, y: base.y + dy, w, h });
			} else if (mode === 'sw') {
				const w = base.w - dx;
				const h = base.h + dy;
				if (w > 0.04 && h > 0.04)
					setCropDraft({ x: base.x + dx, y: base.y, w, h });
			} else if (mode === 'se') {
				const w = base.w + dx;
				const h = base.h + dy;
				if (w > 0.04 && h > 0.04)
					setCropDraft({ x: base.x, y: base.y, w, h });
			}
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	};

	const applyCrop = () => {
		setCrop(cropDraft);
		commit({ crop: cropDraft });
		setTool('finetune');
	};

	const resetCrop = () => {
		setCropDraft({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
		setAspect('free');
	};

	const setAspectRatio = (id: string) => {
		setAspect(id);
		if (id === 'free' || id === 'original') {
			setCropDraft({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
			return;
		}
		const [a, b] = id.split(':').map(Number);
		const target = a / b;
		const imgRatio = natural.w / natural.h;
		let w: number, h: number;
		if (target > imgRatio) {
			w = 0.9;
			h = (w * imgRatio) / target;
		} else {
			h = 0.9;
			w = (h * target) / imgRatio;
		}
		setCropDraft({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
	};

	const resetAll = () => {
		setConfirm({
			title: 'Reset to original?',
			message: 'All edits, crops, filters, and annotations will be removed.',
			actions: [
				{ label: 'Cancel', variant: 'ghost', onClick: () => setConfirm(null) },
				{
					label: 'Reset',
					variant: 'danger',
					onClick: () => {
						setFilterId('original');
						setAdjustments({ ...DEFAULT_ADJUSTMENTS });
						setCrop(null);
						setAnnotations([]);
						setReframe(null);
						commit({
							filterId: 'original',
							adjustments: { ...DEFAULT_ADJUSTMENTS },
							crop: null,
							annotations: [],
							reframe: null,
						});
						setConfirm(null);
					},
				},
			],
		});
	};

	const requestClose = () => {
		if (!dirtyRef.current) {
			onClose();
			return;
		}
		setConfirm({
			title: 'Discard unsaved edits?',
			message: 'You have unsaved changes to this image.',
			actions: [
				{ label: 'Cancel', variant: 'ghost', onClick: () => setConfirm(null) },
				{
					label: 'Discard',
					variant: 'danger',
					onClick: () => {
						setConfirm(null);
						onClose();
					},
				},
				{
					label: 'Save',
					variant: 'primary',
					onClick: () => {
						setConfirm(null);
						save();
					},
				},
			],
		});
	};

	const renderToImage = async (): Promise<string> => {
		if (!loadedImg) throw new Error('Image not loaded');
		const srcW = loadedImg.naturalWidth;
		const srcH = loadedImg.naturalHeight;
		const cw = crop ? Math.max(1, Math.round(crop.w * srcW)) : srcW;
		const ch = crop ? Math.max(1, Math.round(crop.h * srcH)) : srcH;
		const sx = crop ? Math.round(crop.x * srcW) : 0;
		const sy = crop ? Math.round(crop.y * srcH) : 0;
		const filter = `${FILTER_PRESETS[filterId]?.filter || ''} ${adjustmentsToFilter(adjustments)}`.trim();
		let outW = cw;
		let outH = ch;
		let offX = 0;
		let offY = 0;
		if (reframe && reframe.ratio !== 'original') {
			const [a, b] = reframe.ratio.split(':').map(Number);
			const target = a / b;
			const cropRatio = cw / ch;
			if (target > cropRatio) {
				outH = ch;
				outW = Math.round(ch * target);
				offX = Math.round((outW - cw) / 2);
				offY = 0;
			} else {
				outW = cw;
				outH = Math.round(cw / target);
				offX = 0;
				offY = Math.round((outH - ch) / 2);
			}
		}
		const canvas = document.createElement('canvas');
		canvas.width = outW;
		canvas.height = outH;
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingQuality = 'high';
		if (outW !== cw || outH !== ch) {
			const fill = reframe?.fill || 'blur';
			if (fill === 'color') {
				ctx.fillStyle = reframe?.color || '#16171B';
				ctx.fillRect(0, 0, outW, outH);
			} else if (fill === 'mirror') {
				const drawMirror = (dx: number) => {
					ctx.save();
					ctx.translate(dx, 0);
					ctx.scale(-1, 1);
					ctx.translate(-cw, 0);
					ctx.drawImage(loadedImg, sx, sy, cw, ch, 0, offY, cw, ch);
					ctx.restore();
				};
				if (outW > cw) {
					drawMirror(offX - cw);
					drawMirror(offX + cw);
				} else ctx.drawImage(loadedImg, sx, sy, cw, ch, 0, 0, outW, outH);
			} else {
				ctx.filter = `blur(${Math.round(Math.max(outW, outH) * 0.04)}px) saturate(1.1) brightness(0.92)`;
				const scale = Math.max(outW / cw, outH / ch) * 1.15;
				const bw = cw * scale;
				const bh = ch * scale;
				ctx.drawImage(loadedImg, sx, sy, cw, ch, (outW - bw) / 2, (outH - bh) / 2, bw, bh);
				ctx.filter = 'none';
			}
		}
		if (filter) ctx.filter = filter;
		ctx.drawImage(loadedImg, sx, sy, cw, ch, offX, offY, cw, ch);
		ctx.filter = 'none';
		if (tempOverlay) {
			ctx.save();
			ctx.globalCompositeOperation = 'overlay';
			ctx.fillStyle = tempOverlay.color;
			ctx.fillRect(offX, offY, cw, ch);
			ctx.restore();
		}
		if (adjustments.vignette) {
			const v = Math.max(-100, Math.min(100, adjustments.vignette)) / 100;
			const cx = offX + cw / 2;
			const cy = offY + ch / 2;
			const radius = Math.hypot(cw, ch) / 2;
			const grad = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
			if (v >= 0) {
				grad.addColorStop(0, 'rgba(0,0,0,0)');
				grad.addColorStop(1, `rgba(0,0,0,${(v * 0.65).toFixed(3)})`);
			} else {
				grad.addColorStop(0, 'rgba(255,255,255,0)');
				grad.addColorStop(1, `rgba(255,255,255,${(Math.abs(v) * 0.5).toFixed(3)})`);
			}
			ctx.fillStyle = grad;
			ctx.fillRect(offX, offY, cw, ch);
		}
		annotations.forEach((ann) =>
			drawAnnotation(ctx, ann, { sx, sy, cw, ch, srcW, srcH }),
		);
		return canvas.toDataURL('image/png');
	};

	const save = async () => {
		try {
			const url = await renderToImage();
			onSave({
				url,
				originalUrl: sourceUrl,
				edits: {
					filterId,
					adjustments,
					crop,
					annotations,
					reframe,
				},
			});
		} catch (err: any) {
			setLoadError(err?.message || 'Could not save image.');
		}
	};

	const swatchBg = `url("${sourceUrl}")`;
	const stepZoom = (delta: number) =>
		setZoom((z) => Math.max(0.25, Math.min(3, parseFloat((z + delta).toFixed(2)))));
	const resetZoom = () => setZoom(1);

	// keep otherwise-unused reframe state referenced (parity with original)
	void reframeFill;
	void reframeColor;
	void setReframeFill;
	void setReframeColor;
	void arrowWeight;
	void setArrowWeight;
	void setArrowSnap;
	void setQrUnused;
	void stageRef;

	if (loadError)
		return (
			<div className="nf-ies-root">
				<div className="nf-ies-top">
					<div className="nf-ies-top-left">
						<button className="nf-ies-btn icon-only ghost" onClick={onClose}>
							{iesIcons.close}
						</button>
					</div>
					<div></div>
					<div></div>
				</div>
				<div className="nf-ies-stage-wrap">
					<div className="nf-ies-stage" style={{ flexDirection: 'column', gap: 12 }}>
						<p style={{ color: 'var(--ies-ink-2)' }}>
							Image Edit Studio could not load this image.
						</p>
						<pre style={{ color: 'var(--ies-ink-3)', fontSize: 12 }}>{loadError}</pre>
					</div>
				</div>
			</div>
		);

	return (
		<div className="nf-ies-root" role="dialog" aria-label="Image Edit Studio">
			<header className="nf-ies-top">
				<div className="nf-ies-top-left">
					<button
						className="nf-ies-btn icon-only ghost"
						onClick={requestClose}
						title="Close (Esc)"
						aria-label="Close"
					>
						{iesIcons.close}
					</button>
					<button
						className="nf-ies-btn icon-only"
						onClick={undo}
						disabled={historyIndex <= 0}
						title="Undo (Ctrl/Cmd+Z)"
						aria-label="Undo"
					>
						{iesIcons.undo}
					</button>
					<button
						className="nf-ies-btn icon-only"
						onClick={redo}
						disabled={historyIndex >= history.length - 1}
						title="Redo (Ctrl/Cmd+Shift+Z)"
						aria-label="Redo"
					>
						{iesIcons.redo}
					</button>
					<button
						className="nf-ies-btn icon-only"
						onClick={resetAll}
						title="Reset to original"
						aria-label="Reset"
					>
						{iesIcons.reset}
					</button>
					<div className="nf-ies-title">
						<strong>Image Edit Studio</strong>
						<span>{shotLabel}</span>
					</div>
				</div>
				<div className="nf-ies-top-center" role="group" aria-label="Zoom">
					<button
						className="nf-ies-btn icon-only ghost"
						onClick={() => stepZoom(-0.1)}
						title="Zoom out"
						aria-label="Zoom out"
					>
						{iesIcons.zoomOut}
					</button>
					<span
						className="nf-ies-zoom-val"
						onClick={resetZoom}
						title="Reset zoom"
						style={{ cursor: 'pointer' }}
					>
						{Math.round(zoom * 100)}%
					</span>
					<button
						className="nf-ies-btn icon-only ghost"
						onClick={() => stepZoom(0.1)}
						title="Zoom in"
						aria-label="Zoom in"
					>
						{iesIcons.zoomIn}
					</button>
				</div>
				<div className="nf-ies-top-right">
					<button
						className="nf-ies-btn primary"
						onClick={save}
						title="Save (Ctrl/Cmd+S)"
					>
						{iesIcons.check}
						<span>Save</span>
					</button>
				</div>
			</header>
			<div className="nf-ies-body">
				<nav className="nf-ies-toolbar" aria-label="Editor tools">
					{[
						{ id: 'crop', label: 'Crop', icon: iesIcons.crop },
						{ id: 'reframe', label: 'Reframe', icon: iesIcons.reframe },
						{ id: 'finetune', label: 'Fine-tune', icon: iesIcons.finetune },
						{ id: 'filter', label: 'Filter', icon: iesIcons.filter },
						{ id: 'annotate', label: 'Annotate', icon: iesIcons.annotate },
						{ id: 'arrows', label: 'Arrows', icon: iesIcons.arrows },
					].map((t) => (
						<button
							key={t.id}
							type="button"
							className={`nf-ies-tool ${tool === t.id ? 'active' : ''}`}
							onClick={() => {
								setTool(t.id);
								setSelectedAnn(null);
							}}
						>
							{t.icon}
							<span className="nf-ies-tool-label">{t.label}</span>
						</button>
					))}
				</nav>
				<div className="nf-ies-stage-wrap">
					<div className="nf-ies-stage" ref={stageRef}>
						<div
							className="nf-ies-canvas-frame"
							style={{
								transform: `scale(${zoom})`,
								transformOrigin: 'center center',
							}}
						>
							{loadedImg && (
								<img
									ref={imgRef}
									className="nf-ies-canvas-img"
									src={sourceUrl}
									alt=""
									draggable={false}
									style={{
										filter: liveFilter,
										clipPath: crop
											? `inset(${crop.y * 100}% ${(1 - crop.x - crop.w) * 100}% ${(1 - crop.y - crop.h) * 100}% ${crop.x * 100}%)`
											: void 0,
									}}
								/>
							)}
							<svg
								ref={overlayRef}
								className={`nf-ies-svg-overlay ${tool === 'finetune' || tool === 'filter' ? 'idle' : ''}`}
								viewBox="0 0 1 1"
								preserveAspectRatio="none"
								onPointerDown={onOverlayDown}
								onPointerMove={onOverlayMove}
								onPointerUp={onOverlayUp}
								style={{
									pointerEvents:
										tool === 'finetune' || tool === 'filter' ? 'none' : 'auto',
								}}
							>
								{annotations.map((ann) =>
									renderAnnotation(ann, {
										selected: ann.id === selectedAnn,
										onPick: (id: string) => setSelectedAnn(id),
										onMove: onAnnHandle,
									}),
								)}
								{draftAnn && renderAnnotation(draftAnn, { draft: true })}
							</svg>
							{tool === 'crop' && cropDraft && (
								<div className="nf-ies-crop-overlay">
									<div
										className="nf-ies-crop-box"
										onPointerDown={(e) => onCropDown(e, 'move')}
										style={{
											left: `${cropDraft.x * 100}%`,
											top: `${cropDraft.y * 100}%`,
											width: `${cropDraft.w * 100}%`,
											height: `${cropDraft.h * 100}%`,
										}}
									>
										<div
											className="nf-ies-crop-handle"
											style={{ left: -6, top: -6 }}
											onPointerDown={(e) => onCropDown(e, 'nw')}
										/>
										<div
											className="nf-ies-crop-handle"
											style={{ right: -6, top: -6 }}
											onPointerDown={(e) => onCropDown(e, 'ne')}
										/>
										<div
											className="nf-ies-crop-handle"
											style={{ left: -6, bottom: -6 }}
											onPointerDown={(e) => onCropDown(e, 'sw')}
										/>
										<div
											className="nf-ies-crop-handle"
											style={{ right: -6, bottom: -6 }}
											onPointerDown={(e) => onCropDown(e, 'se')}
										/>
									</div>
								</div>
							)}
							{textDraft && (
								<textarea
									className="nf-ies-text-input"
									autoFocus
									value={textDraft.value}
									placeholder="Type text"
									onChange={(e) =>
										setTextDraft((d: any) => d && { ...d, value: e.target.value })
									}
									onBlur={() => {
										if (!textDraft) return;
										const text = (textDraft.value || '').trim();
										if (text) {
											const next = [
												...annotations,
												{
													id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
													kind: 'text',
													x: textDraft.x,
													y: textDraft.y,
													w: textDraft.w,
													h: textDraft.h,
													color: textDraft.color,
													size: textDraft.size,
													text,
												},
											];
											setAnnotations(next);
											commit({ annotations: next });
										}
										setTextDraft(null);
									}}
									onKeyDown={(e) => {
										if (e.key === 'Escape') {
											setTextDraft(null);
											e.preventDefault();
										}
									}}
									style={{
										left: `${textDraft.x * 100}%`,
										top: `${textDraft.y * 100}%`,
										minWidth: 120,
										width: 180,
										height: 56,
										fontSize: textDraft.size,
										color: textDraft.color,
									}}
								/>
							)}
						</div>
					</div>
					<div className="nf-ies-bottom" key={tool}>
						{tool === 'crop' && (
							<>
								<span className="nf-ies-bottom-label">Aspect</span>
								<div className="nf-ies-crop-opts">
									{[
										{ id: 'free', label: 'Free' },
										{ id: 'original', label: 'Original' },
										{ id: '1:1', label: '1:1' },
										{ id: '9:16', label: '9:16' },
										{ id: '16:9', label: '16:9' },
									].map((opt) => (
										<button
											key={opt.id}
											type="button"
											className={`nf-ies-btn ${aspect === opt.id ? 'primary' : ''}`}
											onClick={() => setAspectRatio(opt.id)}
										>
											{opt.label}
										</button>
									))}
								</div>
								<span className="nf-ies-vsep" />
								<button type="button" className="nf-ies-btn" onClick={resetCrop}>
									Reset
								</button>
								<button type="button" className="nf-ies-btn primary" onClick={applyCrop}>
									Apply Crop
								</button>
							</>
						)}
						{tool === 'finetune' && (
							<div className="nf-ies-finetune">
								{[
									{ key: 'brightness', label: 'Brightness' },
									{ key: 'contrast', label: 'Contrast' },
									{ key: 'saturation', label: 'Saturation' },
									{ key: 'exposure', label: 'Exposure' },
									{ key: 'highlights', label: 'Highlights' },
									{ key: 'shadows', label: 'Shadows' },
									{ key: 'sharpness', label: 'Sharpness' },
								].map(({ key, label }) => (
									<div key={key} className="nf-ies-fine-item">
										<label>
											<span>{label}</span>
											<span>{adjustments[key]}</span>
										</label>
										<input
											type="range"
											min="-100"
											max="100"
											step="1"
											value={adjustments[key]}
											onChange={(e) =>
												setAdjustments((a: any) => ({
													...a,
													[key]: parseInt(e.target.value, 10),
												}))
											}
											onPointerUp={() => commit({ adjustments })}
										/>
									</div>
								))}
								<button
									type="button"
									className="nf-ies-btn"
									onClick={() => {
										setAdjustments({ ...DEFAULT_ADJUSTMENTS });
										commit({ adjustments: { ...DEFAULT_ADJUSTMENTS } });
									}}
								>
									Reset all
								</button>
							</div>
						)}
						{tool === 'filter' && (
							<div className="nf-ies-filter-strip">
								{Object.entries(FILTER_PRESETS).map(([id, preset]) => (
									<button
										key={id}
										type="button"
										className={`nf-ies-filter-chip ${filterId === id ? 'active' : ''}`}
										onClick={() => {
											setFilterId(id);
											commit({ filterId: id });
										}}
									>
										<div
											className="nf-ies-filter-swatch"
											style={{
												backgroundImage: swatchBg,
												filter: preset.filter || 'none',
											}}
										/>
										<span>{preset.label}</span>
									</button>
								))}
							</div>
						)}
						{tool === 'annotate' && (
							<>
								<span className="nf-ies-bottom-label">Tool</span>
								<div className="nf-ies-shape-row">
									{[
										{ id: 'brush', icon: iesIcons.brush, label: 'Sharpie' },
										{ id: 'line', icon: iesIcons.line, label: 'Line' },
										{ id: 'rect', icon: iesIcons.rect, label: 'Rectangle' },
										{ id: 'ellipse', icon: iesIcons.ellipse, label: 'Ellipse' },
										{ id: 'text', icon: iesIcons.text, label: 'Text' },
										{ id: 'eraser', icon: iesIcons.eraser, label: 'Eraser' },
									].map((s) => (
										<button
											key={s.id}
											type="button"
											className={`nf-ies-btn ${annTool === s.id ? 'primary' : ''}`}
											onClick={() => setAnnTool(s.id)}
										>
											{s.icon}
											<span>{s.label}</span>
										</button>
									))}
								</div>
								<span className="nf-ies-vsep" />
								<span className="nf-ies-bottom-label">Color</span>
								<div className="nf-ies-color-swatches">
									{COLOR_SWATCHES.map((c) => (
										<button
											key={c}
											type="button"
											className={`nf-ies-color-swatch ${annColor === c ? 'active' : ''}`}
											style={{ '--c': c } as CSSProperties}
											onClick={() => setAnnColor(c)}
											aria-label={`Color ${c}`}
										/>
									))}
								</div>
								<span className="nf-ies-vsep" />
								<label className="nf-ies-stroke">
									<span>Stroke</span>
									<input
										type="range"
										min="1"
										max="16"
										step="1"
										value={strokeSize}
										onChange={(e) => setStrokeSize(parseInt(e.target.value, 10))}
									/>
									<span style={{ fontFamily: 'var(--font-num)' }}>{strokeSize}</span>
								</label>
								{(annTool === 'rect' || annTool === 'ellipse') && (
									<label className="nf-ies-stroke">
										<input
											type="checkbox"
											checked={fillShape}
											onChange={(e) => setFillShape(e.target.checked)}
										/>
										<span>Fill</span>
									</label>
								)}
							</>
						)}
						{tool === 'arrows' && (
							<>
								<div className="nf-ies-arrow-tabs" role="tablist">
									{Object.keys(ARROW_STYLES).map((cat) => (
										<button
											key={cat}
											type="button"
											className={`nf-ies-arrow-tab ${arrowCat === cat ? 'active' : ''}`}
											onClick={() => {
												setArrowCat(cat);
												setArrowStyle(ARROW_STYLES[cat][0].id);
											}}
										>
											{cat}
										</button>
									))}
								</div>
								<div className="nf-ies-arrow-row">
									{ARROW_STYLES[arrowCat].map((s) => (
										<button
											key={s.id}
											type="button"
											className={`nf-ies-arrow-chip ${arrowStyle === s.id ? 'active' : ''}`}
											onClick={() => setArrowStyle(s.id)}
											title={s.id}
										>
											{s.svg}
										</button>
									))}
								</div>
								<span className="nf-ies-vsep" />
								<span className="nf-ies-bottom-label">Color</span>
								<div className="nf-ies-color-swatches">
									{COLOR_SWATCHES.map((c) => (
										<button
											key={c}
											type="button"
											className={`nf-ies-color-swatch ${arrowColor === c ? 'active' : ''}`}
											style={{ '--c': c } as CSSProperties}
											onClick={() => setArrowColor(c)}
											aria-label={`Color ${c}`}
										/>
									))}
								</div>
								<span className="nf-ies-vsep" />
								<label className="nf-ies-stroke">
									<span>Size</span>
									<input
										type="range"
										min="10"
										max="64"
										step="1"
										value={arrowSize}
										onChange={(e) => setArrowSize(parseInt(e.target.value, 10))}
									/>
									<span style={{ fontFamily: 'var(--font-num)' }}>{arrowSize}</span>
								</label>
								<label className="nf-ies-stroke">
									<span>Opacity</span>
									<input
										type="range"
										min="0.2"
										max="1"
										step="0.05"
										value={arrowOpacity}
										onChange={(e) => setArrowOpacity(parseFloat(e.target.value))}
									/>
									<span style={{ fontFamily: 'var(--font-num)' }}>
										{Math.round(arrowOpacity * 100)}%
									</span>
								</label>
							</>
						)}
					</div>
				</div>
			</div>
			{confirm && (
				<div className="nf-ies-confirm-backdrop" role="dialog" aria-modal="true">
					<div className="nf-ies-confirm">
						<h4>{confirm.title}</h4>
						<p>{confirm.message}</p>
						<div className="nf-ies-confirm-actions">
							{confirm.actions.map((a: any, i: number) => (
								<button
									key={i}
									type="button"
									className={`nf-ies-btn ${a.variant === 'primary' ? 'primary' : a.variant === 'danger' ? 'danger' : 'ghost'}`}
									onClick={a.onClick}
								>
									{a.label}
								</button>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// Offline thumbnail library for the Frame settings pickers.
//
// Every option gets a deterministic, procedurally drawn SVG card — instant,
// identical for everyone, zero API calls. Static AI-generated files
// (public/thumbs/) and previously cached generations still take precedence
// in thumbCache; this library is the always-available base layer.
//
// Canvas is 240×160 — the exact 3:2 aspect of `.nf-fs-thumb`, so nothing crops.

const W = 240;
const H = 160;

const cache = new Map<string, string>();

function uri(defs: string, body: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

let uid = 0;
function id(p: string): string {
	return `${p}${++uid}`;
}

// Film grain + vignette shared treatments.
function grain(opacity = 0.16): { def: string; el: string } {
	const fid = id('g');
	return {
		def: `<filter id="${fid}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="${opacity}"/></feComponentTransfer></filter>`,
		el: `<rect width="${W}" height="${H}" filter="url(#${fid})" opacity="${opacity}"/>`,
	};
}

function vignette(strength = 0.55): { def: string; el: string } {
	const vid = id('v');
	return {
		def: `<radialGradient id="${vid}" cx="50%" cy="46%" r="75%"><stop offset="58%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${strength}"/></radialGradient>`,
		el: `<rect width="${W}" height="${H}" fill="url(#${vid})"/>`,
	};
}

// A standing figure silhouette, height h, feet at (x, baseY).
function figure(x: number, baseY: number, h: number, fill: string, opacity = 1): string {
	const head = h * 0.16;
	const bodyW = h * 0.34;
	return `<g fill="${fill}" opacity="${opacity}">
		<circle cx="${x}" cy="${baseY - h + head}" r="${head}"/>
		<path d="M ${x - bodyW / 2} ${baseY} L ${x - bodyW / 2.6} ${baseY - h + head * 2.4} Q ${x} ${baseY - h + head * 1.7} ${x + bodyW / 2.6} ${baseY - h + head * 2.4} L ${x + bodyW / 2} ${baseY} Z"/>
	</g>`;
}

// A bust (head + shoulders) used by lighting cards.
function bust(cx: number, cy: number, s: number, fill: string): string {
	return `<g fill="${fill}">
		<circle cx="${cx}" cy="${cy - s * 0.28}" r="${s * 0.34}"/>
		<path d="M ${cx - s * 0.62} ${cy + s * 0.7} Q ${cx - s * 0.6} ${cy + s * 0.05} ${cx - s * 0.26} ${cy - s * 0.02} L ${cx + s * 0.26} ${cy - s * 0.02} Q ${cx + s * 0.6} ${cy + s * 0.05} ${cx + s * 0.62} ${cy + s * 0.7} Z"/>
	</g>`;
}

// A simple ceramic vase, base at (x, baseY), height s.
function vase(x: number, baseY: number, s: number, fill: string, blurId?: string): string {
	return `<g fill="${fill}"${blurId ? ` filter="url(#${blurId})"` : ''}>
		<path d="M ${x - s * 0.3} ${baseY} Q ${x - s * 0.42} ${baseY - s * 0.55} ${x - s * 0.14} ${baseY - s * 0.8} L ${x - s * 0.1} ${baseY - s} L ${x + s * 0.1} ${baseY - s} L ${x + s * 0.14} ${baseY - s * 0.8} Q ${x + s * 0.42} ${baseY - s * 0.55} ${x + s * 0.3} ${baseY} Z"/>
	</g>`;
}

// ---------------------------------------------------------------------------
// Color palettes — [hi, mid, deep] per look / stock.
// ---------------------------------------------------------------------------

const MOVIE_LOOK_PAL: Record<string, [string, string, string]> = {
	'Neon Cyberpunk': ['#ff2d95', '#00e5ff', '#0a0118'],
	'Cold Minimalism': ['#dfe6ec', '#aebdc9', '#2c3a45'],
	'Futuristic Neon Blue': ['#00d4e8', '#1f6bff', '#03102e'],
	'Contemplative Sci-Fi': ['#c2cbd4', '#8b9aa8', '#3a4a57'],
	'Warm Whimsy': ['#ffe3b3', '#ffb45e', '#7a4216'],
	'Pastel Symmetrical': ['#f7c8d8', '#bfe3f2', '#b48ea4'],
	'Saturated Apocalyptic': ['#ffc46b', '#ff7a1a', '#591c02'],
	'Controlled Tension': ['#9fb0bd', '#5d707f', '#222e38'],
	'Desaturated Dread': ['#9aa89a', '#6a7a6a', '#1f261f'],
	'High Contrast B&W': ['#f5f5f5', '#9a9a9a', '#0a0a0a'],
	'Golden Ancient Rome': ['#f6d995', '#e0a93f', '#5e3c0a'],
	'Soft Countryside': ['#e4f0d4', '#9fc48a', '#4c6b3c'],
	'Digital Nightscape': ['#19e0ff', '#2e5cff', '#070d2a'],
	'Candlelit Period': ['#ffd9a0', '#ff9d3c', '#33150a'],
	'Dreamlike Memories': ['#f7e6d6', '#f2c4a0', '#9c6b54'],
};

const FILM_STOCK_PAL: Record<string, [string, string, string]> = {
	'Kodak Portra 400': ['#f5e9d8', '#e8c9a8', '#7d5b41'],
	'Kodak Vision3 500T': ['#d7a45f', '#3a4a63', '#191c26'],
	'CineStill 800T': ['#ff5f6d', '#3e57a8', '#120f1e'],
	'Fujifilm Pro 400H': ['#eef7ef', '#bfe0d2', '#5e8273'],
	Ektachrome: ['#eef4f8', '#5aa6d8', '#23527a'],
	'Velvia 50': ['#e23b2e', '#3d8f3d', '#15301a'],
	'Tungsten Balanced': ['#fff1d8', '#ffc878', '#6b4a23'],
	'Cinema Daylight': ['#f4f6f7', '#cfd8dc', '#54616a'],
	'High Contrast B&W': ['#ffffff', '#888888', '#000000'],
	'Soft Pastel': ['#f3d9e5', '#d8e8f3', '#a98ea0'],
	'Green Cast': ['#dfe8cf', '#9fbf8f', '#3c5232'],
	'Saturated Heavy Grain': ['#ffd23f', '#ff5533', '#341b3a'],
	'Instant Film': ['#fdf6e9', '#f1e3c8', '#9b8a6f'],
	'Bleach Bypass': ['#c9cdd0', '#8d9499', '#23272a'],
};

function hashHue(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
	return h;
}

function fallbackPal(value: string): [string, string, string] {
	const h = hashHue(value);
	return [`hsl(${h} 45% 82%)`, `hsl(${h} 40% 55%)`, `hsl(${(h + 30) % 360} 45% 16%)`];
}

// A graded "film still": sky gradient, sun, horizon, lone figure, grain.
function lookCard(pal: [string, string, string], heavyGrain = false): string {
	const [hi, mid, deep] = pal;
	const sky = id('s');
	const g = grain(heavyGrain ? 0.3 : 0.16);
	const v = vignette(0.5);
	const defs = `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${hi}"/><stop offset="62%" stop-color="${mid}"/><stop offset="100%" stop-color="${deep}"/></linearGradient>${g.def}${v.def}`;
	const body = `
		<rect width="${W}" height="${H}" fill="url(#${sky})"/>
		<circle cx="170" cy="46" r="20" fill="${hi}" opacity=".85"/>
		<rect y="112" width="${W}" height="48" fill="${deep}" opacity=".9"/>
		${figure(92, 134, 52, deep)}
		${v.el}${g.el}`;
	return uri(defs, body);
}

// ---------------------------------------------------------------------------
// Lighting styles — a bust lit from a style-specific direction / character.
// ---------------------------------------------------------------------------

interface LightSpec {
	lx: number;
	ly: number; // in 0..160 space
	c: string; // light color
	amb: string; // ambient/background
	mode?: 'rim' | 'silhouette' | 'beams' | 'spot' | 'flame';
	bright?: boolean;
}

const LIGHTING_SPEC: Record<string, LightSpec> = {
	'Golden Hour': { lx: 52, ly: 56, c: '#ffb45e', amb: '#3a2110' },
	'Blue Hour': { lx: 120, ly: 24, c: '#8fb4dd', amb: '#141f31' },
	'High Key': { lx: 120, ly: 30, c: '#ffffff', amb: '#c9ced6', bright: true },
	'Low Key': { lx: 186, ly: 42, c: '#e8e2d2', amb: '#08080a' },
	'Rembrandt Lighting': { lx: 176, ly: 38, c: '#f5e3c4', amb: '#171310' },
	'Butterfly Lighting': { lx: 120, ly: 22, c: '#f8efe2', amb: '#221d18' },
	'Loop Lighting': { lx: 152, ly: 30, c: '#f5e8d2', amb: '#1e1914' },
	'Split Lighting': { lx: 204, ly: 74, c: '#f0e6d0', amb: '#131009' },
	'Broad Lighting': { lx: 66, ly: 40, c: '#f5e8d2', amb: '#1b1611' },
	'Short Lighting': { lx: 188, ly: 48, c: '#efe2cc', amb: '#15110d' },
	'Rim Lighting': { lx: 120, ly: 20, c: '#fff4dd', amb: '#0b0b0d', mode: 'rim' },
	Backlight: { lx: 120, ly: 64, c: '#ffe9c4', amb: '#15110c', mode: 'silhouette' },
	'Hard Sunlight': { lx: 58, ly: 24, c: '#fff3c4', amb: '#23231a' },
	Candlelight: { lx: 120, ly: 118, c: '#ff9d3c', amb: '#170b04', mode: 'flame' },
	Moonlight: { lx: 62, ly: 26, c: '#a8c4e8', amb: '#0a1220' },
	'Stage Lighting': { lx: 120, ly: 12, c: '#fff0c8', amb: '#0c0a10', mode: 'spot' },
	'Volumetric Lighting': { lx: 70, ly: 8, c: '#ffe9b8', amb: '#191510', mode: 'beams' },
	Silhouette: { lx: 120, ly: 64, c: '#ffd98e', amb: '#f2b75c', mode: 'silhouette' },
};

function lightingCard(value: string): string {
	const s = LIGHTING_SPEC[value] || { lx: 120, ly: 26, c: '#f0e6d0', amb: '#1a1712' };
	const glow = id('l');
	const sphere = id('p');
	const g = grain(0.1);
	const v = vignette(0.4);
	const cx = 120;
	const cy = 86;
	const dx = (s.lx - cx) * 0.22;
	const dy = (s.ly - cy) * 0.22;
	const isSil = s.mode === 'silhouette';
	const defs = `
		<radialGradient id="${glow}" cx="${(s.lx / W) * 100}%" cy="${(s.ly / H) * 100}%" r="68%">
			<stop offset="0%" stop-color="${s.c}" stop-opacity="${s.bright ? 0.95 : 0.8}"/>
			<stop offset="100%" stop-color="${s.c}" stop-opacity="0"/>
		</radialGradient>
		<radialGradient id="${sphere}" cx="${50 + (dx / 44) * 50}%" cy="${42 + (dy / 44) * 42}%" r="78%">
			<stop offset="0%" stop-color="${isSil ? '#15110c' : s.c}"/>
			<stop offset="58%" stop-color="${isSil ? '#0e0b08' : '#6b6258'}"/>
			<stop offset="100%" stop-color="#0c0a08"/>
		</radialGradient>${g.def}${v.def}`;
	let extras = '';
	if (s.mode === 'beams') {
		extras = `<g fill="${s.c}" opacity=".22"><path d="M ${s.lx} 0 L ${s.lx + 50} 0 L ${s.lx + 108} ${H} L ${s.lx + 30} ${H} Z"/><path d="M ${s.lx - 30} 0 L ${s.lx - 10} 0 L ${s.lx + 22} ${H} L ${s.lx - 22} ${H} Z"/></g>`;
	} else if (s.mode === 'spot') {
		extras = `<path d="M 112 10 L 128 10 L 174 ${H} L 66 ${H} Z" fill="${s.c}" opacity=".26"/><circle cx="120" cy="12" r="6" fill="${s.c}"/>`;
	} else if (s.mode === 'flame') {
		extras = `<ellipse cx="120" cy="${H - 36}" rx="5" ry="9" fill="#ffc97e"/><ellipse cx="120" cy="${H - 33}" rx="2.5" ry="5" fill="#fff3d6"/><rect x="115" y="${H - 28}" width="10" height="14" rx="3" fill="#d8cab2"/>`;
	}
	const rim = s.mode === 'rim' ? `<path d="M 120 ${cy - 44} a 44 44 0 0 1 0 88" fill="none" stroke="${s.c}" stroke-width="3.5" opacity=".9"/>` : '';
	const body = `
		<rect width="${W}" height="${H}" fill="${s.amb}"/>
		<rect width="${W}" height="${H}" fill="url(#${glow})"/>
		${extras}
		${bust(cx, cy, 44, `url(#${sphere})`)}
		${rim}
		<rect y="${H - 26}" width="${W}" height="26" fill="#000" opacity="${s.bright ? 0.08 : 0.3}"/>
		${v.el}${g.el}`;
	return uri(defs, body);
}

// ---------------------------------------------------------------------------
// Shot size — one figure, scaled per size, on a simple stage.
// ---------------------------------------------------------------------------

const SIZE_SCALE: Record<string, number> = {
	'Extreme Close-up': 9.0,
	'Close-up': 5.4,
	'Medium Close-up': 4.0,
	'Wide Close-up': 3.2,
	'Medium Close Shot': 2.6,
	'Close Shot': 2.2,
	'Medium Shot': 1.8,
	'Medium Full Shot': 1.35,
	'Full Shot': 1.0,
	'Long Shot': 0.72,
	'Wide Shot': 0.5,
	'Extreme Wide Shot': 0.3,
	'Extreme Long Shot': 0.2,
};

function shotSizeCard(value: string): string {
	const k = SIZE_SCALE[value] ?? 1;
	const figH = 104 * k;
	// close-ups anchor on the face; wider sizes stand on the ground line
	const baseY = k > 2.4 ? 80 + figH * 0.45 : 134;
	const g = grain(0.08);
	const v = vignette(0.35);
	const sky = id('s');
	const defs = `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e7e3da"/><stop offset="100%" stop-color="#b9b2a4"/></linearGradient>${g.def}${v.def}`;
	const body = `
		<rect width="${W}" height="${H}" fill="url(#${sky})"/>
		<rect y="134" width="${W}" height="26" fill="#8e877a"/>
		${figure(120, baseY, figH, '#3a352c')}
		${v.el}${g.el}`;
	return uri(defs, body);
}

// ---------------------------------------------------------------------------
// Shot type (camera angle) — scene with shifted horizon / rotation / occluders.
// ---------------------------------------------------------------------------

interface AngleSpec {
	horizon: number; // 0..1 from top
	figH: number;
	rotate?: number;
	overhead?: boolean;
	ots?: boolean;
	back?: boolean;
	pov?: boolean;
}

const ANGLE_SPEC: Record<string, AngleSpec> = {
	'Eye Level': { horizon: 0.52, figH: 64 },
	'Low Angle': { horizon: 0.78, figH: 92 },
	'High Angle': { horizon: 0.26, figH: 46 },
	Overhead: { horizon: 0, figH: 0, overhead: true },
	'Shoulder Level': { horizon: 0.46, figH: 66 },
	'Hip Level': { horizon: 0.62, figH: 72 },
	'Knee Level': { horizon: 0.7, figH: 78 },
	'Ground Level': { horizon: 0.84, figH: 82 },
	'Dutch Angle': { horizon: 0.52, figH: 64, rotate: 12 },
	'Over the Shoulder': { horizon: 0.5, figH: 58, ots: true },
	Back: { horizon: 0.52, figH: 70, back: true },
	POV: { horizon: 0.5, figH: 54, pov: true },
	"Bird's Eye View": { horizon: 0, figH: 0, overhead: true },
	"Worm's Eye View": { horizon: 0.92, figH: 104 },
};

function shotTypeCard(value: string): string {
	const a = ANGLE_SPEC[value] || ANGLE_SPEC['Eye Level'];
	const g = grain(0.08);
	const v = vignette(0.35);
	const sky = id('s');
	const defs = `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#dfe4e8"/><stop offset="100%" stop-color="#aab3ba"/></linearGradient>${g.def}${v.def}`;
	let scene: string;
	if (a.overhead) {
		scene = `
			<rect width="${W}" height="${H}" fill="#9aa39f"/>
			<circle cx="120" cy="78" r="16" fill="#32302a"/>
			<ellipse cx="120" cy="101" rx="11" ry="24" fill="#32302a" opacity=".5"/>
			<g stroke="#7d857f" stroke-width="2" opacity=".6"><line x1="0" y1="38" x2="240" y2="38"/><line x1="0" y1="126" x2="240" y2="126"/><line x1="60" y1="0" x2="60" y2="160"/><line x1="186" y1="0" x2="186" y2="160"/></g>`;
	} else {
		const hy = a.horizon * H;
		scene = `
			<g transform="rotate(${a.rotate || 0} 120 80)">
				<rect x="-40" y="-40" width="320" height="${hy + 40}" fill="url(#${sky})"/>
				<rect x="-40" y="${hy}" width="320" height="${H - hy + 40}" fill="#968e7e"/>
				${figure(120, Math.min(H - 8, hy + a.figH * 0.92), a.figH, '#352f26')}
			</g>`;
		if (a.ots) scene += `<path d="M -10 ${H} L -10 ${H * 0.54} Q 70 ${H * 0.49} 96 ${H * 0.65} L 96 ${H} Z" fill="#1d1a15" opacity=".92"/>`;
		if (a.back) scene += `<circle cx="120" cy="${a.horizon * H + a.figH * 0.92 - a.figH * 0.84}" r="${a.figH * 0.05}" fill="#968e7e"/>`;
		if (a.pov)
			scene += `<g stroke="#1d1a15" stroke-width="4" fill="none" opacity=".85"><path d="M 24 12 L 12 12 L 12 24"/><path d="M 216 12 L 228 12 L 228 24"/><path d="M 24 ${H - 12} L 12 ${H - 12} L 12 ${H - 24}"/><path d="M 216 ${H - 12} L 228 ${H - 12} L 228 ${H - 24}"/></g>`;
	}
	return uri(defs, `${scene}${v.el}${g.el}`);
}

// ---------------------------------------------------------------------------
// Framing — arrangements of one or more figures.
// ---------------------------------------------------------------------------

function framingCard(value: string): string {
	const g = grain(0.08);
	const v = vignette(0.35);
	const defs = `${g.def}${v.def}`;
	const bg = `<rect width="${W}" height="${H}" fill="#d9d4c8"/><rect y="118" width="${W}" height="42" fill="#a39a87"/>`;
	let fig = '';
	switch (value) {
		case 'Single':
			fig = figure(120, 132, 70, '#36302a');
			break;
		case 'Two Shot':
			fig = figure(88, 132, 66, '#36302a') + figure(154, 132, 60, '#4a4138');
			break;
		case 'Three Shot':
			fig = figure(66, 132, 60, '#4a4138') + figure(120, 132, 70, '#36302a') + figure(176, 132, 58, '#4a4138');
			break;
		case 'Over-the-Shoulder':
			fig = figure(150, 128, 62, '#36302a') + `<path d="M -10 ${H} L -10 80 Q 76 72 100 102 L 100 ${H} Z" fill="#1d1a15" opacity=".92"/>`;
			break;
		case 'Over-the-Hip':
			fig = figure(150, 128, 64, '#36302a') + `<path d="M -10 ${H} L -10 116 Q 70 110 96 130 L 96 ${H} Z" fill="#1d1a15" opacity=".92"/>`;
			break;
		case 'Point of View':
			fig =
				figure(132, 126, 58, '#36302a') +
				`<g stroke="#1d1a15" stroke-width="4" fill="none" opacity=".85"><path d="M 24 12 L 12 12 L 12 24"/><path d="M 216 12 L 228 12 L 228 24"/><path d="M 24 148 L 12 148 L 12 136"/><path d="M 216 148 L 228 148 L 228 136"/></g>`;
			break;
		default:
			fig = figure(120, 132, 70, '#36302a');
	}
	return uri(defs, `${bg}${fig}${v.el}${g.el}`);
}

// ---------------------------------------------------------------------------
// Focus / DOF — vases at three depths with selective blur.
// ---------------------------------------------------------------------------

function focusCard(value: string): string {
	const b1 = id('b');
	const b2 = id('b');
	const g = grain(0.08);
	const v = vignette(0.35);
	const defs = `<filter id="${b1}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.8"/></filter><filter id="${b2}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>${g.def}${v.def}`;
	const bg = `<rect width="${W}" height="${H}" fill="#d8d2c6"/><rect y="114" width="${W}" height="46" fill="#aaa190"/>`;
	let items = '';
	switch (value) {
		case 'Deep Focus':
			items = vase(70, 138, 58, '#4a443a') + vase(132, 124, 44, '#5d564a') + vase(182, 114, 32, '#6e6759');
			break;
		case 'Shallow Focus':
			items = vase(70, 138, 58, '#4a443a') + vase(132, 124, 44, '#5d564a', b1) + vase(182, 114, 32, '#6e6759', b2);
			break;
		case 'Rack Focus':
			items =
				vase(70, 138, 58, '#4a443a', b1) +
				vase(132, 124, 44, '#5d564a') +
				vase(182, 114, 32, '#6e6759', b1) +
				`<path d="M 92 52 q 24 -16 48 0" fill="none" stroke="#36302a" stroke-width="2.5"/><path d="M 136 46 l 6 6 l -8 3 Z" fill="#36302a"/>`;
			break;
		case 'Tilt-Shift':
			items = `${vase(70, 138, 58, '#4a443a', b2)}${vase(182, 114, 32, '#6e6759', b2)}${vase(132, 124, 44, '#5d564a')}`;
			break;
		case 'Zoom focus':
			items =
				vase(132, 132, 54, '#4a443a') +
				`<g stroke="#36302a" stroke-width="2.5" opacity=".55"><line x1="14" y1="14" x2="64" y2="44"/><line x1="226" y1="14" x2="176" y2="44"/><line x1="14" y1="146" x2="64" y2="118"/><line x1="226" y1="146" x2="176" y2="118"/></g>`;
			break;
		default:
			items = vase(70, 138, 58, '#4a443a') + vase(132, 124, 44, '#5d564a', b1) + vase(182, 114, 32, '#6e6759', b2);
	}
	return uri(defs, `${bg}${items}${v.el}${g.el}`);
}

// ---------------------------------------------------------------------------
// Lens focal — FOV wedge + mm label.
// ---------------------------------------------------------------------------

const FOCAL_FOV: Record<string, number> = {
	'8mm (fisheye)': 150,
	'14mm': 114,
	'24mm': 84,
	'35mm': 63,
	'50mm': 47,
	'85mm': 29,
	'100mm (macro)': 24,
	'135mm': 18,
	'200mm': 12,
};

function lensFocalCard(value: string): string {
	const fov = FOCAL_FOV[value] ?? 47;
	const g = grain(0.08);
	const v = vignette(0.3);
	const defs = `${g.def}${v.def}`;
	const apexX = 120;
	const apexY = 146;
	const len = 132;
	const a = (fov / 2) * (Math.PI / 180);
	const x1 = apexX - Math.sin(a) * len;
	const x2 = apexX + Math.sin(a) * len;
	const y = apexY - Math.cos(a) * len;
	const label = value.replace(/\s*\(.*\)/, '');
	const body = `
		<rect width="${W}" height="${H}" fill="#23262b"/>
		<path d="M ${apexX} ${apexY} L ${x1} ${y} L ${x2} ${y} Z" fill="#0a84ff" opacity=".3"/>
		<path d="M ${apexX} ${apexY} L ${x1} ${y}" stroke="#0a84ff" stroke-width="2.5"/>
		<path d="M ${apexX} ${apexY} L ${x2} ${y}" stroke="#0a84ff" stroke-width="2.5"/>
		<circle cx="${apexX}" cy="${apexY}" r="6" fill="#e8eaee"/>
		${figure(120, 92, 30, '#e8eaee', 0.9)}
		<text x="120" y="34" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="21" font-weight="700" fill="#e8eaee">${label}</text>
		${v.el}${g.el}`;
	return uri(defs, body);
}

// ---------------------------------------------------------------------------
// Lens character — the still-life with a per-character optical treatment.
// ---------------------------------------------------------------------------

function lensCharacterCard(value: string): string {
	const g = grain(0.1);
	const v = vignette(value === 'Vintage' ? 0.75 : 0.35);
	const blur = id('b');
	const defs = `<filter id="${blur}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4.5"/></filter>${g.def}${v.def}`;
	const base = `<rect width="${W}" height="${H}" fill="#d4cec2"/><rect y="114" width="${W}" height="46" fill="#a59c8b"/>`;
	let scene = vase(96, 134, 56, '#4a443a') + vase(156, 122, 40, '#5d564a');
	let fx = '';
	switch (value) {
		case 'Anamorphic':
			fx = `<rect x="0" y="68" width="${W}" height="4" fill="#4f9bff" opacity=".75"/><rect x="0" y="64" width="${W}" height="11" fill="#4f9bff" opacity=".22"/><ellipse cx="190" cy="42" rx="14" ry="21" fill="#fff" opacity=".3"/>`;
			break;
		case 'Macro':
			scene = vase(120, 152, 116, '#453f35') + `<circle cx="146" cy="56" r="22" fill="#fff" opacity=".14"/>`;
			fx = `<rect width="${W}" height="24" fill="#d4cec2" filter="url(#${blur})" opacity=".8"/>`;
			break;
		case 'Tilt-Shift':
			fx = `<rect x="0" y="0" width="${W}" height="50" fill="#cfc8ba" opacity=".62" filter="url(#${blur})"/><rect x="0" y="124" width="${W}" height="36" fill="#cfc8ba" opacity=".62" filter="url(#${blur})"/>`;
			break;
		case 'Fisheye':
			fx = `<g stroke="#7c7466" stroke-width="2" fill="none" opacity=".7"><path d="M 16 40 Q 120 18 224 40"/><path d="M 16 80 Q 120 64 224 80"/><path d="M 16 120 Q 120 138 224 120"/><path d="M 60 12 Q 36 80 60 148"/><path d="M 180 12 Q 204 80 180 148"/></g><ellipse cx="120" cy="80" rx="112" ry="74" fill="none" stroke="#36302a" stroke-width="3.5" opacity=".5"/>`;
			break;
		case 'Vintage':
			fx = `<rect width="${W}" height="${H}" fill="#d8a868" opacity=".22"/><circle cx="58" cy="34" r="1.8" fill="#fff" opacity=".6"/><circle cx="200" cy="108" r="1.5" fill="#fff" opacity=".5"/><circle cx="170" cy="26" r="1.3" fill="#fff" opacity=".5"/>`;
			break;
		default:
			fx = '';
	}
	return uri(defs, `${base}${scene}${fx}${v.el}${g.el}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function offlineThumb(category: string, value: string): string {
	const key = `${category}::${value}`;
	const hit = cache.get(key);
	if (hit) return hit;
	let out: string;
	switch (category) {
		case 'movieLook':
			out = lookCard(MOVIE_LOOK_PAL[value] || fallbackPal(value));
			break;
		case 'filmStock':
			out = lookCard(FILM_STOCK_PAL[value] || fallbackPal(value), /grain/i.test(value) || value === 'Instant Film');
			break;
		case 'lighting':
		case 'lightingStyle':
			out = lightingCard(value);
			break;
		case 'shotSize':
			out = shotSizeCard(value);
			break;
		case 'shotType':
			out = shotTypeCard(value);
			break;
		case 'framing':
			out = framingCard(value);
			break;
		case 'focusDof':
			out = focusCard(value);
			break;
		case 'lensFocal':
			out = lensFocalCard(value);
			break;
		case 'lensCharacter':
			out = lensCharacterCard(value);
			break;
		default:
			out = lookCard(fallbackPal(value));
	}
	cache.set(key, out);
	return out;
}

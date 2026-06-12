import type { ReactNode } from 'react';

// Generic 24x24 line-icon wrapper. Header icons use stroke-width 1.5 (sw),
// the general + field icon sets use 1.6 — preserved verbatim from the original.
export function Glyph({ d, w = 16, sw = 1.5, fill = 'none' }: { d: ReactNode; w?: number; sw?: number; fill?: string }) {
	return (
		<svg
			width={w}
			height={w}
			viewBox="0 0 24 24"
			fill={fill}
			stroke="currentColor"
			strokeWidth={sw}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{d}
		</svg>
	);
}

function G(d: ReactNode, w = 16) {
	return <Glyph d={d} w={w} sw={1.6} />;
}

// Header / brand icon set (Fn) — stroke 1.5.
export const headerIcons = {
	text: <Glyph d={<><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h10" /></>} />,
	image: <Glyph d={<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M3 17l5-4 4 3 3-2 6 5" /></>} />,
	user: <Glyph d={<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></>} />,
	cam: <Glyph d={<><path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /></>} />,
	bulb: <Glyph d={<><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>} />,
	swatch: <Glyph d={<><circle cx="6" cy="8" r="2" /><circle cx="14" cy="6" r="2" /><circle cx="18" cy="13" r="2" /><path d="M3 17a4 4 0 0 0 4 4h11a3 3 0 0 0 0-6h-1" /></>} />,
	out: <Glyph d={<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 14h18" /></>} />,
	spark: <Glyph d={<><path d="M12 3v5" /><path d="M12 16v5" /><path d="M3 12h5" /><path d="M16 12h5" /><path d="m6 6 3 3" /><path d="m15 15 3 3" /><path d="m18 6-3 3" /><path d="m9 15-3 3" /></>} />,
	copy: <Glyph d={<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>} />,
	refresh: <Glyph d={<><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>} />,
	arrow: <Glyph d={<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>} />,
	play: <Glyph d={<><path d="M7 5v14l12-7Z" /></>} />,
	download: <Glyph d={<><path d="M12 4v12" /><path d="m6 12 6 6 6-6" /><path d="M4 20h16" /></>} />,
	up: <Glyph d={<><path d="M12 4v12" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" /></>} />,
	examples: <Glyph d={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M9 4v16" /></>} />,
	presets: <Glyph d={<><circle cx="12" cy="12" r="3.2" /><path d="M19 12a7 7 0 0 0-.1-1.3l1.6-1.1-1.5-2.6-1.9.6a7 7 0 0 0-2.2-1.3L14.5 4h-5l-.4 2.3a7 7 0 0 0-2.2 1.3l-1.9-.6L3.5 9.6l1.6 1.1A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-1.6 1.1 1.5 2.6 1.9-.6a7 7 0 0 0 2.2 1.3l.4 2.3h5l.4-2.3a7 7 0 0 0 2.2-1.3l1.9.6 1.5-2.6-1.6-1.1c.1-.4.1-.9.1-1.3Z" /></>} />,
	key: <Glyph d={<><circle cx="7.5" cy="15.5" r="3.5" /><path d="m10 13 9.5-9.5" /><path d="m14.5 7.5 3 3" /></>} />,
	moon: <Glyph d={<><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 0 0 11.5 11.5Z" /></>} />,
	upload: <Glyph d={<><path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" /></>} />,
	chev: <Glyph d={<><path d="m6 9 6 6 6-6" /></>} />,
	fullscreen: <Glyph d={<><path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" /></>} />,
	close: <Glyph d={<><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>} />,
};

// General icon set (le) — stroke 1.6, mixed sizes.
export const icons = {
	list: G(<><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>),
	check: G(<path d="M5 12l5 5 9-11" />, 14),
	chev: G(<path d="m6 9 6 6 6-6" />, 12),
	plus: G(<><path d="M12 5v14" /><path d="M5 12h14" /></>),
	more: G(<><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>, 14),
	trash: G(<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>, 14),
	copy: G(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>, 14),
	edit: G(<><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m14 6 4 4" /></>, 14),
	sidebar: G(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>, 14),
	image: G(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M3 17l5-4 4 3 3-2 6 5" /></>, 14),
	x: G(<><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>, 12),
	spark: G(<><path d="M12 3v5" /><path d="M12 16v5" /><path d="M3 12h5" /><path d="M16 12h5" /><path d="m6 6 3 3" /><path d="m15 15 3 3" /><path d="m18 6-3 3" /><path d="m9 15-3 3" /></>, 12),
	up: G(<><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>, 14),
	down: G(<><path d="M12 5v14" /><path d="m5 12 7 7 7-7" /></>, 14),
	info: G(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>, 13),
	wand: G(<><path d="M15 4V2" /><path d="M15 10V8" /><path d="M12.5 6.5h-2" /><path d="M19.5 6.5h-2" /><path d="m3 21 9-9" /><path d="M14 7l3 3" /></>, 13),
	expand: G(<><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>, 14),
	download: G(<><path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>, 14),
	reset: G(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>, 14),
	gear: G(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>, 14),
};

// Per-field flaticons (Yr) for Frame / Motion settings — stroke 1.6, size 16.
export const fieldIcons: Record<string, ReactNode> = {
	lighting: G(<><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>),
	shotSize: G(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18" /><path d="M9 5v14" /></>),
	shotType: G(<><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 9 6-3v12l-6-3" /></>),
	framing: G(<><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M4 9h16" /><path d="M9 4v16" /></>),
	focusDof: G(<><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /></>),
	dutch: G(<><path d="M3 16 21 6" /><path d="M5 12l4-2" /><path d="M11 9l4-2" /></>),
	aspect: G(<rect x="3" y="6" width="18" height="12" rx="1" />),
	lens: G(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>),
	cameraMovement: G(<path d="M3 12h4l3-8 4 16 3-8h4" />),
	movementDirection: G(<><path d="M3 12h18" /><path d="m16 7 5 5-5 5" /><path d="M8 17l-5-5 5-5" /></>),
	speed: G(<><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 12l5-3" /><path d="M12 7v5" /></>),
	equipment: G(<><path d="M4 18h16" /><path d="M6 18V8l6-3 6 3v10" /><circle cx="12" cy="11" r="2" /></>),
	stabilization: G(<path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4Z" />),
	subjectMotion: G(<><circle cx="9" cy="7" r="2.5" /><path d="M5 21c0-3 2-5 4-5" /><path d="M14 12h6" /><path d="m17 9 3 3-3 3" /></>),
	timeEffects: G(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
};

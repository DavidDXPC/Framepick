// nFrame Studio — icon sets ported from the prototype (ns-data NI, fp-ui I, ns-tools TI).
// Inline SVG, currentColor, 1em sizing. Ported verbatim from the design source.
import type { SVGProps, ReactElement } from 'react';

type P = SVGProps<SVGSVGElement>;
type Icon = (p?: P) => ReactElement;

const base = { width: '1em', height: '1em' } as const;

// ---------- NI (ns-data) ----------
export const NI: Record<string, Icon> = {
	search: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>,
	hero: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l2.4 5.3L20 9l-4 3.9 1 5.6L12 16l-5 2.5 1-5.6L4 9l5.6-.7z" /></svg>,
	layers: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>,
	still: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 16l-5-5L5 20" /></svg>,
	motion: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h6M5 7h10M5 17h8" /><path d="M16 9l4 3-4 3z" /></svg>,
	sparkles: (p) => <svg viewBox="0 0 24 24" {...base} fill="currentColor" {...p}><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" /><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" /></svg>,
	wand: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2L5 13h6l-1 9 9-12h-6l2-8z" /></svg>,
	arrow: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
	puzzle: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 4.5a1.6 1.6 0 0 1 3.2 0c0 .5.4.9.9.9h2.4v2.4c0 .5.4.9.9.9a1.6 1.6 0 0 1 0 3.2c-.5 0-.9.4-.9.9V16h-2.4c-.5 0-.9.4-.9.9a1.6 1.6 0 0 1-3.2 0c0-.5-.4-.9-.9-.9H5.6v-2.4c0-.5-.4-.9-.9-.9a1.6 1.6 0 0 1 0-3.2c.5 0 .9-.4.9-.9V5.4H8c.5 0 .9-.4.9-.9z" /></svg>,
};

// ---------- I (fp-ui) ----------
export const I: Record<string, Icon> = {
	cross: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="6" /><path d="M12 1v5M12 18v5M1 12h5M18 12h5" /></svg>,
	copy: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>,
	check: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5l5 5L20 6" /></svg>,
	x: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>,
	image: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 16l-5-5L5 20" /></svg>,
	play: (p) => <svg viewBox="0 0 24 24" {...base} fill="currentColor" {...p}><path d="M8 5.5v13l11-6.5z" /></svg>,
	trash: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13" /></svg>,
	chev: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6" /></svg>,
	spark: (p) => <svg viewBox="0 0 24 24" {...base} fill="currentColor" {...p}><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" /></svg>,
	video: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="M16 10l5-3v10l-5-3z" /></svg>,
	inbox: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 13l2-7h12l2 7M4 13v5h16v-5M4 13h5l1 2h4l1-2h5" /></svg>,
	key: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="4.5" /><path d="M11 11l8 8M16 16l2-2M18.5 18.5l1.5-1.5" /></svg>,
	more: (p) => <svg viewBox="0 0 24 24" {...base} fill="currentColor" {...p}><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>,
	plus: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
	refresh: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 11a8 8 0 1 0-.5 4" /><path d="M20 5v6h-6" /></svg>,
	expand: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7" /></svg>,
	heart: (p) => <svg viewBox="0 0 24 24" {...base} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>,
};

// ---------- TI (ns-tools) ----------
export const TI: Record<string, Icon> = {
	frame: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8.4" /><path d="M12 3.6L9 12M20 9.5l-8.6 1M16.5 20l-3-8.4M4 14.5l8.6-1M7.5 4l3 8.4" /></svg>,
	edit: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 7h9M5 12h6M5 17h11" /><circle cx="17.5" cy="7" r="2" /><circle cx="13.5" cy="12" r="2" /><circle cx="19" cy="17" r="2" /></svg>,
	motion: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></svg>,
	style: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-1.4-1.2-1.7-1.2-2.8 0-.8.7-1.4 1.6-1.4H16a5 5 0 0 0 5-5c0-3.9-4-6.8-9-6.8z" /><circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" /><circle cx="12" cy="7.8" r="1.1" fill="currentColor" /><circle cx="16.4" cy="11" r="1.1" fill="currentColor" /></svg>,
	recipe: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 4h10a2 2 0 0 1 2 2v15l-7-3.2L6 21V4z" /></svg>,
	chev: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6" /></svg>,
	check: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12.5l4.5 4.5L19 6.5" /></svg>,
	plus: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
	dup: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="8" y="8" width="12" height="12" rx="2.2" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></svg>,
	trash: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 11a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" /></svg>,
	board: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
	image: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.7" /><path d="M20 15l-4.5-4.5L5 20" /></svg>,
	reset: (p) => <svg viewBox="0 0 24 24" {...base} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4.5 9a8 8 0 1 1-.6 5" /><path d="M3.5 4.5V9H8" /></svg>,
};

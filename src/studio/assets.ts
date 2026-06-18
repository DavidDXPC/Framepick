// nFrame Studio — asset map, Hero identity, seeded media + shot, extension pins.
// Real images live in /public/studio/q and are referenced by absolute URL.
import type { Mode, StudioShot } from './types';

const Q = '/studio/q/';

export const A = {
	heroAsset: Q + 'shaker_hero.png',
	shaker: Q + 'lib_shaker.png',
	ref: Q + 'can_comp.jpg',
	compTop: Q + 'comp_top.jpg',
	compNest: Q + 'comp_nest.jpg',
	compDetail: Q + 'comp_detail.jpg',
	stills: [1, 2, 3, 4].map((i) => `${Q}res_${i}.jpg`),
	srcFrames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `${Q}src_f${i}.jpg`),
	outFrames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `${Q}out_f${i}.jpg`),
	tiles: {
		blue: Q + 'tile_blue.jpg',
		green: Q + 'tile_green.jpg',
		magenta: Q + 'tile_magenta.jpg',
		teal: Q + 'tile_teal.jpg',
		amber: Q + 'tile_amber.jpg',
		violet: Q + 'tile_violet.jpg',
	},
};

// @hero — the persistent subject living in the Hero slot
export const HERO_SUBJECT = 'the Prozis shaker';
export const HERO_NAME = 'Prozis · Shaker';
export const HERO_DESC = 'Yellow protein shaker';

export interface Media {
	id: string;
	src: string;
	title: string;
	kind: Mode;
	frames?: string[];
	dur?: number;
}

export const NS_MEDIA_BY_ID: Record<string, Media> = {
	'ref-shaker': { id: 'ref-shaker', src: A.shaker, title: 'Prozis shaker', kind: 'still' },
	'ref-rope': { id: 'ref-rope', src: A.ref, title: 'tru ENERGY can', kind: 'still' },
	'comp-top': { id: 'comp-top', src: A.compTop, title: 'Rope braid · overhead', kind: 'still' },
	'comp-detail': { id: 'comp-detail', src: A.compDetail, title: 'Rope wrap · macro', kind: 'still' },
	'comp-nest': { id: 'comp-nest', src: A.compNest, title: 'Rope nest · base', kind: 'still' },
	'vid-orbit': { id: 'vid-orbit', src: A.srcFrames[0], title: 'Can turntable · 6s', kind: 'motion', frames: A.srcFrames, dur: 6 },
};

let UID = 100;
export const nsUid = () => 'ns' + ++UID;

export const NS_SHOTS0: StudioShot[] = [
	{
		id: 's1',
		n: '01',
		title: 'New shot',
		beat: 'Add a reference, write the prompt, then generate',
		mode: 'still',
		status: 'draft',
		aspect: '4:5',
		thumb: A.heroAsset,
		comps: [
			{ id: 'c-shaker', mediaId: 'ref-shaker', kind: 'still' },
			{ id: 'c-can', mediaId: 'ref-rope', kind: 'still' },
		],
		subject: 'a slim energy can',
		promptPre: 'Product hero shot of ',
		promptPost: ' standing on a clean white studio block beside fresh orange slices, against a bright blue seamless backdrop.',
		params: [['Shot', 'Product hero'], ['Lens', '100mm macro'], ['ƒ', '8'], ['Light', 'Soft top key'], ['Grade', 'Bright']],
		stillSrc: A.stills[1],
		motionFrames: A.outFrames,
		output: { still: null, motion: null },
		refs: [],
		sampledFrames: [],
		history: [],
		sel: null,
	},
];

export const NS_REFINE = ['More cinematic', 'Tighter crop', 'Cooler grade', 'More citrus', 'Punch the label'];

// composition refs the "+ Add reference" button can cycle through
export const COMP_POOL = ['ref-rope', 'comp-top', 'comp-detail', 'comp-nest'];

// ---------- Pinterest board for the extension demo ----------
export interface Pin {
	id: string;
	src: string;
	title: string;
	h: number;
	type?: 'video';
	dur?: number;
}

export const NS_PINS: Pin[] = [
	{ id: 't-magenta', src: A.tiles.magenta, title: 'Gradient pour · splash', h: 158 },
	{ id: 'ufrope', src: A.ref, title: 'tru ENERGY can', h: 206 },
	{ id: 'vidcan', src: A.srcFrames[0], title: 'Beverage can · turntable', type: 'video', dur: 6, h: 188 },
	{ id: 't-blue', src: A.tiles.blue, title: 'Chrome can · cold light', h: 150 },
	{ id: 't-amber', src: A.tiles.amber, title: 'Hero tub · rope set', h: 196 },
	{ id: 't-green', src: A.tiles.green, title: 'Matte tub · studio', h: 188 },
	{ id: 't-teal', src: A.tiles.teal, title: 'Frosted bottle · ice', h: 158 },
	{ id: 't-violet', src: A.tiles.violet, title: 'Powder burst · backlit', h: 140 },
];

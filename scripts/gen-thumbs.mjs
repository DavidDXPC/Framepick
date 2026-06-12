#!/usr/bin/env node
// Generate the Frame-picker example thumbnails ONCE and store them in the
// project folder (public/thumbs/<id>.jpg + manifest.json). These ship with the
// app, look identical for every user, and cost zero API calls at runtime.
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/gen-thumbs.mjs            # generate missing
//   OPENAI_API_KEY=sk-... node scripts/gen-thumbs.mjs --force    # regenerate all
//   node scripts/gen-thumbs.mjs --key sk-... --only movieLook,filmStock
//
// Keep the taxonomy + prompts below in sync with src/data/frame.ts,
// src/data/looks.ts and src/data/thumbs.ts.

import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'thumbs');

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
	const i = args.indexOf(f);
	return i >= 0 ? args[i + 1] : undefined;
};
const FORCE = has('--force');
const ONLY = (val('--only') || '').split(',').map((s) => s.trim()).filter(Boolean);
const API_KEY = val('--key') || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const IMAGE_MODELS = ['gpt-image-2', 'gpt-image-1'];

if (!API_KEY) {
	console.error('No API key. Set OPENAI_API_KEY=sk-... or pass --key sk-...');
	process.exit(1);
}

// ---- taxonomy (mirror of src/data) ----------------------------------------
const SHOT_SIZES = [
	'Extreme Close-up', 'Close-up', 'Medium Close-up', 'Wide Close-up',
	'Medium Close Shot', 'Close Shot', 'Medium Shot',
	'Medium Full Shot', 'Full Shot', 'Long Shot', 'Wide Shot', 'Extreme Wide Shot', 'Extreme Long Shot',
];
const SHOT_TYPES = ['Eye Level', 'Low Angle', 'High Angle', 'Overhead', 'Shoulder Level', 'Hip Level', 'Knee Level', 'Ground Level', 'Dutch Angle', 'Over the Shoulder', 'Back', 'POV', "Bird's Eye View", "Worm's Eye View"];
const LIGHTING_STYLES = [
	['Golden Hour', 'warm low golden-hour sun, long soft shadows, amber glow'],
	['Blue Hour', 'cool blue-hour twilight, soft ambient sky light, gentle contrast'],
	['High Key', 'high-key lighting, bright airy exposure, soft shadows, low contrast'],
	['Low Key', 'low-key lighting, deep shadows, single hard source, dramatic contrast'],
	['Rembrandt Lighting', 'Rembrandt lighting, 45° key with a triangle of light on the shadow cheek'],
	['Butterfly Lighting', 'butterfly/paramount lighting, frontal high key casting a small nose shadow'],
	['Loop Lighting', 'loop lighting, key slightly off-axis casting a small looping nose shadow'],
	['Split Lighting', 'split lighting, hard side key dividing the subject into light and shadow halves'],
	['Broad Lighting', 'broad lighting, key on the side of the face turned toward camera'],
	['Short Lighting', 'short lighting, key on the side of the face turned away from camera, sculpted'],
	['Rim Lighting', 'rim/edge lighting, bright backlight outlining the subject against a dark field'],
	['Backlight', 'strong backlight, glowing edges and lifted haze, subject in soft silhouette'],
	['Hard Sunlight', 'hard direct sunlight, crisp dark shadows, high contrast'],
	['Candlelight', 'warm flickering candlelight, deep falloff, intimate pools of light'],
	['Moonlight', 'cool moonlight, low-key blue cast, soft ambient fill from a window'],
	['Stage Lighting', 'theatrical stage lighting, focused spotlight, dark surrounding falloff'],
	['Volumetric Lighting', 'volumetric god-rays through haze, defined light beams, atmospheric depth'],
	['Silhouette', 'silhouette lighting, bright background, subject rendered as a dark shape'],
];
const lightingGrade = Object.fromEntries(LIGHTING_STYLES);
const FRAMING = ['Single', 'Two Shot', 'Three Shot', 'Over-the-Shoulder', 'Over-the-Hip', 'Point of View'];
const FOCUS = ['Deep Focus', 'Shallow Focus', 'Rack Focus', 'Tilt-Shift', 'Zoom focus'];
const LENS_FOCAL = ['8mm (fisheye)', '14mm', '24mm', '35mm', '50mm', '85mm', '100mm (macro)', '135mm', '200mm'];
const LENS_CHARACTER = ['Spherical', 'Anamorphic', 'Macro', 'Tilt-Shift', 'Fisheye', 'Vintage'];

const MOVIE_LOOKS = [
	['Neon Cyberpunk', 'neon-soaked cyberpunk grade, saturated magenta-and-cyan, deep blacks, high contrast'],
	['Cold Minimalism', 'cold minimalist grade, desaturated blue-grey, clean negative space, soft contrast'],
	['Futuristic Neon Blue', 'futuristic sci-fi grade, electric blue key with teal shadows, glossy speculars'],
	['Contemplative Sci-Fi', 'muted contemplative sci-fi grade, hazy desaturated palette, soft atmospheric light'],
	['Warm Whimsy', 'warm whimsical grade, golden amber tones, gentle film softness, inviting'],
	['Pastel Symmetrical', 'pastel symmetrical grade, candy palette, even soft light, storybook precision'],
	['Saturated Apocalyptic', 'saturated apocalyptic desert grade, scorched orange and dust, hard sun'],
	['Controlled Tension', 'controlled tension grade, muted naturalism, cool steel tones, restrained contrast'],
	['Desaturated Dread', 'desaturated dread grade, bleach-bypass low saturation, crushed greens, bleak'],
	['High Contrast B&W', 'high-contrast black-and-white, deep blacks, bright highlights, dramatic'],
	['Golden Ancient Rome', 'golden epic grade, warm amber dust, sunlit haze, heroic contrast'],
	['Soft Countryside', 'soft countryside grade, natural greens, gentle daylight, lifted shadows'],
	['Digital Nightscape', 'digital nightscape grade, neon bokeh, wet reflections, cool city blues'],
	['Candlelit Period', 'candlelit period grade, warm tungsten glow, deep shadow, painterly'],
	['Dreamlike Memories', 'dreamlike memory grade, hazy warm diffusion, soft bloom, faded edges'],
];
const FILM_STOCKS = [
	['Kodak Portra 400', 'Kodak Portra 400 response, warm editorial palette, lifted shadows, fine grain'],
	['Kodak Vision3 500T', 'Kodak Vision3 500T look, tungsten-tuned, crushed blacks, protected highlights'],
	['CineStill 800T', 'CineStill 800T look, halated highlights, magenta-leaning shadows, night tungsten'],
	['Fujifilm Pro 400H', 'Fujifilm Pro 400H, pastel cyan-greens, milky highlights, soft contrast'],
	['Ektachrome', 'Ektachrome slide look, punchy saturation, clean blue-leaning whites'],
	['Velvia 50', 'Velvia 50 look, super-saturated reds and greens, high micro-contrast'],
	['Tungsten Balanced', 'tungsten-balanced stock, warm interior whites, gentle grain'],
	['Cinema Daylight', 'daylight-balanced cinema stock, neutral clean color, natural contrast'],
	['High Contrast B&W', 'high-contrast black-and-white film, deep grain, sculpted tonality'],
	['Soft Pastel', 'soft pastel stock, low saturation, milky highlights, airy'],
	['Green Cast', 'cool green-cast film look, fluorescent tint, urban grit'],
	['Saturated Heavy Grain', 'saturated stock with heavy grain, punchy color, analog texture'],
	['Instant Film', 'instant-film look, washed warm tones, soft vignette, low contrast'],
	['Bleach Bypass', 'bleach-bypass process, desaturated mids, crushed blacks, silver highlights'],
];
const movieGrade = Object.fromEntries(MOVIE_LOOKS);
const stockGrade = Object.fromEntries(FILM_STOCKS);

// ---- prompts (mirror of src/data/thumbs.ts) -------------------------------
const COMMON = 'Photorealistic, premium, muted neutral palette, soft natural light. Square composition. No text, no watermark, no logos.';
const STILL_LIFE = 'A still life of two or three pale matte ceramic vases with a single dried branch, arranged on a rough stone plinth against a plain concrete wall';

const thumbId = (category, value) => `thumb:${category}:${value}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function thumbPrompt(category, value) {
	switch (category) {
		case 'shotSize':
			return `Editorial portrait of one ordinary person against a plain seamless neutral-grey studio backdrop, calm expression, muted earth-tone wardrobe, framed as a ${value} (${value} shot size). ${COMMON}`;
		case 'shotType':
			return `One ordinary person in a real lived-in environment (quiet street, workshop or countryside), photographed from a ${value} camera angle. Cinematic still. ${COMMON}`;
		case 'framing':
			return `A "${value}" framing arrangement of people in a plain understated interior. Cinematic still. ${COMMON}`;
		case 'focusDof':
			return `${STILL_LIFE}, demonstrating ${value} (focus / depth of field). No people. ${COMMON}`;
		case 'lensFocal':
			return `${STILL_LIFE}, photographed on a ${value} lens. No people. ${COMMON}`;
		case 'lensCharacter':
			return `${STILL_LIFE}, rendered with a ${value} lens character. No people. ${COMMON}`;
		case 'lightingStyle':
			return `${STILL_LIFE}, lit with ${lightingGrade[value] || value}. No people. ${COMMON}`;
		case 'movieLook':
			return `Cinematic film still — ${movieGrade[value] || value}. A lone figure in a simple environment. Photorealistic. Square composition. No text, no watermark, no logos.`;
		case 'filmStock':
			return `An everyday photograph on ${value} film — ${stockGrade[value] || value}. A simple ordinary scene. Photorealistic. Square composition. No text, no watermark, no logos.`;
		default:
			return `${value}. A simple neutral scene. ${COMMON}`;
	}
}

// ---- build the work list ---------------------------------------------------
const CATEGORIES = {
	movieLook: MOVIE_LOOKS.map((l) => l[0]),
	filmStock: FILM_STOCKS.map((l) => l[0]),
	lightingStyle: LIGHTING_STYLES.map((l) => l[0]),
	shotType: SHOT_TYPES,
	shotSize: SHOT_SIZES,
	framing: FRAMING,
	focusDof: FOCUS,
	lensFocal: LENS_FOCAL,
	lensCharacter: LENS_CHARACTER,
};

const jobs = [];
for (const [cat, values] of Object.entries(CATEGORIES)) {
	if (ONLY.length && !ONLY.includes(cat)) continue;
	for (const v of values) jobs.push({ id: thumbId(cat, v), prompt: thumbPrompt(cat, v), cat, value: v });
}

// ---- OpenAI image generation with model fallback ---------------------------
async function genImage(prompt) {
	let lastErr;
	for (const model of IMAGE_MODELS) {
		const res = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
			body: JSON.stringify({ model, prompt, n: 1, size: '1024x1024', quality: 'low', output_format: 'jpeg', background: 'opaque' }),
		});
		if (res.ok) {
			const data = await res.json();
			const b64 = data?.data?.[0]?.b64_json;
			if (b64) return Buffer.from(b64, 'base64');
			lastErr = new Error('no image in response');
			continue;
		}
		const txt = await res.text();
		lastErr = new Error(`${model} -> ${res.status} ${txt.slice(0, 200)}`);
		// 400/404/model errors -> try next model; auth/rate errors -> stop
		if (res.status === 401 || res.status === 429) break;
	}
	throw lastErr;
}

// ---- run (limited concurrency) ---------------------------------------------
async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const existing = new Set((existsSync(OUT_DIR) ? await readdir(OUT_DIR) : []).filter((f) => f.endsWith('.jpg')).map((f) => f.replace(/\.jpg$/, '')));

	const todo = jobs.filter((j) => FORCE || !existing.has(j.id));
	console.log(`${jobs.length} thumbnails total · ${todo.length} to generate · out: ${OUT_DIR}`);

	const CONCURRENCY = 3;
	let i = 0, done = 0, failed = 0;
	async function worker() {
		while (i < todo.length) {
			const job = todo[i++];
			try {
				const buf = await genImage(job.prompt);
				await writeFile(join(OUT_DIR, `${job.id}.jpg`), buf);
				done++;
				console.log(`  ✓ ${job.cat}/${job.value}  (${done}/${todo.length})`);
			} catch (e) {
				failed++;
				console.warn(`  ✗ ${job.cat}/${job.value}: ${e.message}`);
			}
		}
	}
	await Promise.all(Array.from({ length: CONCURRENCY }, worker));

	// rebuild manifest from whatever .jpg files now exist
	const ids = (await readdir(OUT_DIR)).filter((f) => f.endsWith('.jpg')).map((f) => f.replace(/\.jpg$/, '')).sort();
	await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify({ ids, count: ids.length }, null, '\t'));
	console.log(`Done. ${done} generated, ${failed} failed. Manifest lists ${ids.length} thumbnails.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

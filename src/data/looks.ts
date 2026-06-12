// Named "look" presets for the visual Frame picker. `grade` is the descriptor
// fed into the prompt's color-grade line; `value` is the display name + stored key.
export interface LookOption {
	value: string;
	grade: string;
}

export const MOVIE_LOOKS: LookOption[] = [
	{ value: 'Neon Cyberpunk', grade: 'neon-soaked cyberpunk grade, saturated magenta-and-cyan, deep blacks, high contrast' },
	{ value: 'Cold Minimalism', grade: 'cold minimalist grade, desaturated blue-grey, clean negative space, soft contrast' },
	{ value: 'Futuristic Neon Blue', grade: 'futuristic sci-fi grade, electric blue key with teal shadows, glossy speculars' },
	{ value: 'Contemplative Sci-Fi', grade: 'muted contemplative sci-fi grade, hazy desaturated palette, soft atmospheric light' },
	{ value: 'Warm Whimsy', grade: 'warm whimsical grade, golden amber tones, gentle film softness, inviting' },
	{ value: 'Pastel Symmetrical', grade: 'pastel symmetrical grade, candy palette, even soft light, storybook precision' },
	{ value: 'Saturated Apocalyptic', grade: 'saturated apocalyptic desert grade, scorched orange and dust, hard sun' },
	{ value: 'Controlled Tension', grade: 'controlled tension grade, muted naturalism, cool steel tones, restrained contrast' },
	{ value: 'Desaturated Dread', grade: 'desaturated dread grade, bleach-bypass low saturation, crushed greens, bleak' },
	{ value: 'High Contrast B&W', grade: 'high-contrast black-and-white, deep blacks, bright highlights, dramatic' },
	{ value: 'Golden Ancient Rome', grade: 'golden epic grade, warm amber dust, sunlit haze, heroic contrast' },
	{ value: 'Soft Countryside', grade: 'soft countryside grade, natural greens, gentle daylight, lifted shadows' },
	{ value: 'Digital Nightscape', grade: 'digital nightscape grade, neon bokeh, wet reflections, cool city blues' },
	{ value: 'Candlelit Period', grade: 'candlelit period grade, warm tungsten glow, deep shadow, painterly' },
	{ value: 'Dreamlike Memories', grade: 'dreamlike memory grade, hazy warm diffusion, soft bloom, faded edges' },
];

export const FILM_STOCKS: LookOption[] = [
	{ value: 'Kodak Portra 400', grade: 'Kodak Portra 400 response, warm editorial palette, lifted shadows, fine grain' },
	{ value: 'Kodak Vision3 500T', grade: 'Kodak Vision3 500T look, tungsten-tuned, crushed blacks, protected highlights' },
	{ value: 'CineStill 800T', grade: 'CineStill 800T look, halated highlights, magenta-leaning shadows, night tungsten' },
	{ value: 'Fujifilm Pro 400H', grade: 'Fujifilm Pro 400H, pastel cyan-greens, milky highlights, soft contrast' },
	{ value: 'Ektachrome', grade: 'Ektachrome slide look, punchy saturation, clean blue-leaning whites' },
	{ value: 'Velvia 50', grade: 'Velvia 50 look, super-saturated reds and greens, high micro-contrast' },
	{ value: 'Tungsten Balanced', grade: 'tungsten-balanced stock, warm interior whites, gentle grain' },
	{ value: 'Cinema Daylight', grade: 'daylight-balanced cinema stock, neutral clean color, natural contrast' },
	{ value: 'High Contrast B&W', grade: 'high-contrast black-and-white film, deep grain, sculpted tonality' },
	{ value: 'Soft Pastel', grade: 'soft pastel stock, low saturation, milky highlights, airy' },
	{ value: 'Green Cast', grade: 'cool green-cast film look, fluorescent tint, urban grit' },
	{ value: 'Saturated Heavy Grain', grade: 'saturated stock with heavy grain, punchy color, analog texture' },
	{ value: 'Instant Film', grade: 'instant-film look, washed warm tones, soft vignette, low contrast' },
	{ value: 'Bleach Bypass', grade: 'bleach-bypass process, desaturated mids, crushed blacks, silver highlights' },
];

// Named lighting-style presets for the visual Lighting grid. `grade` describes
// the lighting setup for both the prompt and the example thumbnail.
export const LIGHTING_STYLES: LookOption[] = [
	{ value: 'Golden Hour', grade: 'warm low golden-hour sun, long soft shadows, amber glow' },
	{ value: 'Blue Hour', grade: 'cool blue-hour twilight, soft ambient sky light, gentle contrast' },
	{ value: 'High Key', grade: 'high-key lighting, bright airy exposure, soft shadows, low contrast' },
	{ value: 'Low Key', grade: 'low-key lighting, deep shadows, single hard source, dramatic contrast' },
	{ value: 'Rembrandt Lighting', grade: 'Rembrandt lighting, 45° key with a triangle of light on the shadow cheek' },
	{ value: 'Butterfly Lighting', grade: 'butterfly/paramount lighting, frontal high key casting a small nose shadow' },
	{ value: 'Loop Lighting', grade: 'loop lighting, key slightly off-axis casting a small looping nose shadow' },
	{ value: 'Split Lighting', grade: 'split lighting, hard side key dividing the subject into light and shadow halves' },
	{ value: 'Broad Lighting', grade: 'broad lighting, key on the side of the face turned toward camera' },
	{ value: 'Short Lighting', grade: 'short lighting, key on the side of the face turned away from camera, sculpted' },
	{ value: 'Rim Lighting', grade: 'rim/edge lighting, bright backlight outlining the subject against a dark field' },
	{ value: 'Backlight', grade: 'strong backlight, glowing edges and lifted haze, subject in soft silhouette' },
	{ value: 'Hard Sunlight', grade: 'hard direct sunlight, crisp dark shadows, high contrast' },
	{ value: 'Candlelight', grade: 'warm flickering candlelight, deep falloff, intimate pools of light' },
	{ value: 'Moonlight', grade: 'cool moonlight, low-key blue cast, soft ambient fill from a window' },
	{ value: 'Stage Lighting', grade: 'theatrical stage lighting, focused spotlight, dark surrounding falloff' },
	{ value: 'Volumetric Lighting', grade: 'volumetric god-rays through haze, defined light beams, atmospheric depth' },
	{ value: 'Silhouette', grade: 'silhouette lighting, bright background, subject rendered as a dark shape' },
];

const movieGrade: Record<string, string> = Object.fromEntries(MOVIE_LOOKS.map((l) => [l.value, l.grade]));
const stockGrade: Record<string, string> = Object.fromEntries(FILM_STOCKS.map((l) => [l.value, l.grade]));
const lightingGrade: Record<string, string> = Object.fromEntries(LIGHTING_STYLES.map((l) => [l.value, l.grade]));

export const movieLookGrade = (value: string): string => movieGrade[value] || '';
export const filmStockGrade = (value: string): string => stockGrade[value] || '';
export const lightingStyleGrade = (value: string): string => lightingGrade[value] || '';

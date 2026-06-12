// Academy teaching-mode data — the single source of truth for the six
// components, the click-to-insert vocabulary, and the curated pre-tagged image
// pool (each image carries its own answer key). Reconstructed verbatim.

export const FORMULA = 'Subject · Action · Environment · Style · Lighting · Camera Angle';

export interface AcademySegment {
	key: 'subject' | 'action' | 'environment' | 'style' | 'lighting' | 'angle';
	label: string;
	hint: string;
	placeholder: string;
	validateTerms: boolean;
}

export const SEGMENTS: AcademySegment[] = [
	{ key: 'subject', label: 'Subject', hint: 'main focus', placeholder: 'a lone astronaut', validateTerms: false },
	{ key: 'action', label: 'Action', hint: "what's happening", placeholder: 'gazing up, helmet held at the hip', validateTerms: false },
	{ key: 'environment', label: 'Environment', hint: 'where', placeholder: 'on a windswept red-dust ridge', validateTerms: false },
	{ key: 'style', label: 'Style', hint: 'medium', placeholder: 'cinematic sci-fi concept art', validateTerms: true },
	{ key: 'lighting', label: 'Lighting', hint: 'light + palette', placeholder: 'golden backlight, teal-orange grade', validateTerms: true },
	{ key: 'angle', label: 'Angle', hint: 'camera perspective', placeholder: 'low-angle wide shot, 24mm', validateTerms: true },
];

export interface VocabTerm {
	term: string;
	cat: 'style' | 'lighting' | 'angle';
	note?: string;
}

export const VOCAB: VocabTerm[] = [
	{ term: 'Cinematic', cat: 'style', note: 'film-like framing, lighting and color grade' },
	{ term: 'Photorealistic', cat: 'style', note: 'true-to-life detail, like a real photograph' },
	{ term: 'Cyberpunk', cat: 'style', note: 'neon-soaked high-tech dystopian look' },
	{ term: 'Film noir', cat: 'style', note: 'high-contrast black-and-white crime drama' },
	{ term: 'Watercolor', cat: 'style', note: 'soft, translucent painted washes' },
	{ term: 'Oil painting', cat: 'style', note: 'rich, textured brushstrokes on canvas' },
	{ term: 'Concept art', cat: 'style', note: 'illustrative design art for film and games' },
	{ term: 'Vaporwave', cat: 'style', note: 'retro 80s/90s pastel-neon aesthetic' },
	{ term: 'Documentary', cat: 'style', note: 'candid, unstaged real-world look' },
	{ term: 'Surrealism', cat: 'style', note: 'dreamlike, impossible juxtapositions' },
	{ term: 'Chiaroscuro', cat: 'lighting', note: 'strong contrast between light and dark' },
	{ term: 'Golden hour', cat: 'lighting', note: 'warm, low, raking light near sunrise/sunset' },
	{ term: 'High-key', cat: 'lighting', note: 'bright, low-contrast, very few shadows' },
	{ term: 'Low-key', cat: 'lighting', note: 'dark and dramatic with deep shadows' },
	{ term: 'Rim light', cat: 'lighting', note: 'bright edge that separates subject from background' },
	{ term: 'Backlight', cat: 'lighting', note: 'main light behind the subject, glowing edges' },
	{ term: 'Soft light', cat: 'lighting', note: 'diffused light with gentle shadow edges' },
	{ term: 'Neon glow', cat: 'lighting', note: 'colored glow cast by neon / LED signage' },
	{ term: 'Teal & orange', cat: 'lighting', note: 'teal shadows + warm skin, popular grade' },
	{ term: 'Volumetric haze', cat: 'lighting', note: 'visible beams of light through atmosphere' },
	{ term: 'Macro lens', cat: 'angle', note: 'extreme close-up of very small detail' },
	{ term: 'Wide-angle', cat: 'angle', note: 'broad field of view, exaggerated depth' },
	{ term: 'Telephoto', cat: 'angle', note: 'compressed perspective, isolated subject' },
	{ term: '35mm', cat: 'angle', note: 'natural, reportage-style focal length' },
	{ term: 'Low angle', cat: 'angle', note: 'camera looks up — conveys power and scale' },
	{ term: 'High angle', cat: 'angle', note: 'camera looks down — conveys vulnerability' },
	{ term: 'Dutch tilt', cat: 'angle', note: 'tilted horizon — conveys unease or tension' },
	{ term: 'Rule of thirds', cat: 'angle', note: 'subject placed on a thirds gridline' },
	{ term: 'Close-up', cat: 'angle', note: 'tight framing filling most of the frame' },
	{ term: "Bird's-eye view", cat: 'angle', note: 'directly overhead, top-down view' },
];

// term -> note lookup
export const TERM_NOTES: Record<string, string> = Object.fromEntries(VOCAB.map((t) => [t.term, t.note || '']));

export interface AcademyImage {
	tags: string[];
	lock: number;
	subject: string;
	action: string;
	environment: string;
	style: string[];
	lighting: string[];
	angle: string[];
}

export const IMAGE_POOL: AcademyImage[] = [
	{ tags: ['coffee', 'cup', 'cafe'], lock: 11, subject: 'a ceramic coffee cup', action: 'steaming gently on a saucer', environment: 'on a rustic wooden café table', style: ['Documentary', 'Photorealistic', 'Cinematic'], lighting: ['Soft light', 'Golden hour', 'High-key'], angle: ['Close-up', 'Macro lens', '35mm'] },
	{ tags: ['neon', 'alley', 'rain', 'night'], lock: 21, subject: 'a lone figure in a long coat', action: 'walking away from camera', environment: 'down a rain-slicked neon alley', style: ['Cyberpunk', 'Film noir', 'Cinematic'], lighting: ['Neon glow', 'Low-key', 'Rim light'], angle: ['Wide-angle', 'Low angle', 'Dutch tilt'] },
	{ tags: ['mountain', 'hiking', 'sunrise'], lock: 7, subject: 'a lone hiker', action: 'pausing to look across the valley', environment: 'on a windswept mountain ridge at dawn', style: ['Cinematic', 'Photorealistic', 'Documentary'], lighting: ['Golden hour', 'Volumetric haze', 'Backlight'], angle: ['Wide-angle', 'Low angle', 'Rule of thirds'] },
	{ tags: ['portrait', 'face', 'elderly'], lock: 33, subject: 'an elderly fisherman', action: 'gazing off-frame in quiet thought', environment: 'against a dark studio backdrop', style: ['Photorealistic', 'Oil painting', 'Documentary'], lighting: ['Chiaroscuro', 'Low-key', 'Rim light'], angle: ['Close-up', 'Telephoto', 'Rule of thirds'] },
	{ tags: ['leaf', 'dew', 'macro'], lock: 5, subject: 'a single dew-covered leaf', action: 'holding a trembling water droplet', environment: 'in a misty morning garden', style: ['Photorealistic', 'Concept art', 'Documentary'], lighting: ['Soft light', 'Backlight', 'Golden hour'], angle: ['Macro lens', 'Close-up', 'Rule of thirds'] },
	{ tags: ['city', 'skyline', 'night'], lock: 42, subject: 'a dense city skyline', action: 'glittering after dark', environment: 'across a wide river bend', style: ['Cyberpunk', 'Cinematic', 'Vaporwave'], lighting: ['Neon glow', 'Teal & orange', 'Low-key'], angle: ['Wide-angle', "Bird's-eye view", 'Telephoto'] },
	{ tags: ['desert', 'dunes', 'sand'], lock: 14, subject: 'rolling sand dunes', action: 'sculpted by the wind', environment: 'in a vast empty desert at midday', style: ['Photorealistic', 'Concept art', 'Cinematic'], lighting: ['High-key', 'Soft light', 'Golden hour'], angle: ['Wide-angle', "Bird's-eye view", '35mm'] },
	{ tags: ['market', 'bazaar', 'spices'], lock: 28, subject: 'a vendor at a spice stall', action: 'weighing saffron on brass scales', environment: 'in a crowded covered bazaar', style: ['Documentary', 'Photorealistic', 'Cinematic'], lighting: ['Volumetric haze', 'Soft light', 'Backlight'], angle: ['35mm', 'Close-up', 'Rule of thirds'] },
	{ tags: ['underwater', 'diver', 'coral'], lock: 9, subject: 'a free-diver', action: 'descending toward a coral reef', environment: 'in clear turquoise open water', style: ['Cinematic', 'Photorealistic', 'Surrealism'], lighting: ['Volumetric haze', 'Backlight', 'Teal & orange'], angle: ['Wide-angle', 'Low angle', "Bird's-eye view"] },
	{ tags: ['sportscar', 'car', 'studio'], lock: 17, subject: 'a glossy red sports car', action: 'parked on a reflective floor', environment: 'in a seamless dark studio', style: ['Photorealistic', 'Concept art', 'Cinematic'], lighting: ['Rim light', 'Low-key', 'Soft light'], angle: ['Wide-angle', 'Low angle', '35mm'] },
];

export function academyImageUrl(img: AcademyImage | undefined, w = 960, h = 600): string {
	const tags = (Array.isArray(img?.tags) ? img!.tags : [(img?.tags as unknown as string) || 'nature']).map(encodeURIComponent).join(',');
	const lock = img?.lock || 1;
	return `https://loremflickr.com/${w}/${h}/${tags}?lock=${lock}`;
}

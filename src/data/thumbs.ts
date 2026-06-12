import { filmStockGrade, lightingStyleGrade, movieLookGrade } from './looks';

// Stable cache key for an option's example thumbnail.
export function thumbId(category: string, value: string): string {
	return `thumb:${category}:${value}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Reference-faithful example prompts. Every category keeps ONE consistent
// neutral subject (matching the look of the picker references) so the only
// thing that visibly changes between cards is the option itself:
//   • people categories  -> one ordinary person, muted editorial styling
//   • optical categories -> pale ceramic vases + a dried branch on a stone plinth
//   • look categories     -> a lone figure / simple everyday scene
// Keep these in sync with scripts/gen-thumbs.mjs.
const COMMON = 'Photorealistic, premium, muted neutral palette, soft natural light. Square composition. No text, no watermark, no logos.';
const STILL_LIFE = 'A still life of two or three pale matte ceramic vases with a single dried branch, arranged on a rough stone plinth against a plain concrete wall';

export function thumbPrompt(category: string, value: string): string {
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
		case 'lighting':
		case 'lightingStyle':
			return `${STILL_LIFE}, lit with ${lightingStyleGrade(value) || value}. No people. Photorealistic, premium, muted neutral palette. Square composition. No text, no watermark, no logos.`;
		case 'movieLook':
			return `Cinematic film still — ${movieLookGrade(value) || value}. A lone figure in a simple environment. Photorealistic. Square composition. No text, no watermark, no logos.`;
		case 'filmStock':
			return `An everyday photograph on ${value} film — ${filmStockGrade(value) || value}. A simple ordinary scene. Photorealistic. Square composition. No text, no watermark, no logos.`;
		default:
			return `${value}. A simple neutral scene. ${COMMON}`;
	}
}

// Prompt recipes — one-click Visual Style presets (Up in the original).
import type { DeepPartial, Frame } from '../state/types';

export interface Recipe {
	id: string;
	name: string;
	tag: string;
	visualStyle: string;
	frame: DeepPartial<Frame>;
}

export const RECIPES: Recipe[] = [
	{
		id: 'luxury',
		name: 'Luxury Product',
		tag: 'Premium · macro · low-key',
		visualStyle:
			'Modern high-end commercial realism with restrained editorial polish — crisp micro-contrast, gentle highlight roll-off so surfaces read tactile without turning hyperreal. Purposeful shallow depth of field, hero subject clean against a softly structured background with controlled edge separation. Premium grade, minimal clutter, subtle filmic grain, a quiet sense of luxury.',
		frame: {
			lighting: { quality: 'Soft', direction: 'Side (left)', keyContrast: 'Low-key', colorTemp: 'Neutral (4500K)' },
			shotSize: 'Close-up',
			focusDof: 'Shallow Focus',
			lens: { focalLength: '100mm (macro)', character: 'Macro' },
		},
	},
	{
		id: 'fashion',
		name: 'Fashion Editorial',
		tag: 'Bold · sculpted · 35mm',
		visualStyle:
			'High-fashion editorial: bold directional lighting and sculpted shadows, a saturated yet refined palette, 35mm film texture, confident negative space and magazine-grade finish.',
		frame: {
			lighting: { quality: 'Hard', direction: '3/4 Front', keyContrast: 'Chiaroscuro' },
			shotSize: 'Medium Shot',
			lens: { focalLength: '85mm', character: 'Spherical' },
		},
	},
	{
		id: 'fmcg',
		name: 'FMCG Hero',
		tag: 'Bright · punchy · high-key',
		visualStyle:
			'Bright, punchy FMCG hero: clean high-key lighting, vivid saturated color, crisp product clarity with glossy speculars — energetic, appetising and advertising-ready.',
		frame: {
			lighting: { quality: 'Soft', keyContrast: 'High-key', colorTemp: 'Cool (5600K)' },
			shotSize: 'Medium Close-up',
			focusDof: 'Deep Focus',
			lens: { focalLength: '50mm' },
		},
	},
	{
		id: 'automotive',
		name: 'Automotive',
		tag: 'Cinematic · reflective · moody',
		visualStyle:
			'Cinematic automotive: dramatic low-key lighting, long sculpted reflections, deep blacks and controlled rim light, a moody atmosphere with a wide anamorphic feel and premium metallic grade.',
		frame: {
			lighting: { quality: 'Specular', direction: 'Back', keyContrast: 'Low-key', atmospheric: ['Haze'] },
			shotSize: 'Wide Shot',
			lens: { focalLength: '35mm', character: 'Anamorphic' },
		},
	},
	{
		id: 'beauty',
		name: 'Cinematic Beauty',
		tag: 'Soft · luminous · pastel',
		visualStyle:
			'Soft cinematic beauty: wraparound soft light and luminous skin, a pastel palette with gentle bloom, shallow focus — tender and aspirational.',
		frame: {
			lighting: { quality: 'Diffused', direction: 'Front', keyContrast: 'High-key' },
			shotSize: 'Close-up',
			focusDof: 'Shallow Focus',
			lens: { focalLength: '85mm' },
		},
	},
	{
		id: 'westworld',
		name: 'Westworld',
		tag: 'Uncanny · low-key · clinical',
		visualStyle:
			'Prestige sci-fi realism in the Westworld register: soft directional low-key lighting with gentle falloff into deep shadow, a desaturated cool-neutral grade kept just-warm in the flesh tones, milky muted highlights and clean blacks. Hyperreal organic texture meeting exposed synthetic machinery, fine filmic grain, anamorphic compression and a quiet, melancholic, clinical stillness.',
		frame: {
			lighting: { quality: 'Soft', direction: 'Side (left)', keyContrast: 'Low-key', colorTemp: 'Neutral (4500K)' },
			shotSize: 'Close-up',
			focusDof: 'Shallow Focus',
			lens: { focalLength: '85mm', character: 'Anamorphic' },
		},
	},
];

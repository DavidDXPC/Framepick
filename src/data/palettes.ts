// Studio palettes for the Tweaks panel ($o) + tweak defaults (Ih).
import type { Tweaks } from '../state/types';

export interface Palette {
	name: string;
	swatch: string[];
	vars: Record<string, string>;
}

export const PALETTES: Record<string, Palette> = {
	apple: {
		name: 'Lavender Studio',
		swatch: ['#5B5BD6', '#1A1A1A', '#FBFBFC'],
		vars: {
			'--bg': '#FBFBFC',
			'--bg-2': '#F1F1F4',
			'--card': '#FFFFFF',
			'--card-2': '#F8F8F9',
			'--border': '#E8E8EB',
			'--border-soft': '#EFEFF2',
			'--ink': '#1A1A1A',
			'--ink-2': '#6B6B70',
			'--muted': '#6B6B70',
			'--faint': '#A0A0A5',
			'--accent': '#5B5BD6',
			'--accent-2': '#4A4AC4',
			'--accent-bg': '#EEEEFB',
			'--accent-soft': '#EEEEFB',
		},
	},
	rust: {
		name: 'Warm Rust',
		swatch: ['#C25B36', '#1F1A14', '#F3EEE5'],
		vars: {
			'--bg': '#F3EEE5',
			'--bg-2': '#EBE4D5',
			'--card': '#FFFFFF',
			'--card-2': '#FAF5EC',
			'--border': '#E6DCC9',
			'--border-soft': '#F1E9D9',
			'--ink': '#1F1A14',
			'--ink-2': '#4B4035',
			'--muted': '#8A7E6C',
			'--faint': '#B5A993',
			'--accent': '#C25B36',
			'--accent-2': '#A04527',
			'--accent-bg': '#FCF1EA',
			'--accent-soft': '#FDF7F1',
		},
	},
	studio: {
		name: 'Studio Cool',
		swatch: ['#2E5BD9', '#131722', '#ECEEF2'],
		vars: {
			'--bg': '#ECEEF2',
			'--bg-2': '#E1E5EE',
			'--card': '#FFFFFF',
			'--card-2': '#F4F6FA',
			'--border': '#D8DEE8',
			'--border-soft': '#E6EBF2',
			'--ink': '#131722',
			'--ink-2': '#3A4258',
			'--muted': '#6E7689',
			'--faint': '#A8B0BE',
			'--accent': '#2E5BD9',
			'--accent-2': '#1F3FA8',
			'--accent-bg': '#EAEFFC',
			'--accent-soft': '#F4F7FE',
		},
	},
	editorial: {
		name: 'Editorial Cream',
		swatch: ['#6B3F1F', '#2B201A', '#F5F1E8'],
		vars: {
			'--bg': '#F5F1E8',
			'--bg-2': '#EDE5D2',
			'--card': '#FBF8F1',
			'--card-2': '#F2EDE1',
			'--border': '#DDD3BD',
			'--border-soft': '#E8DFCD',
			'--ink': '#2B201A',
			'--ink-2': '#5A4A3F',
			'--muted': '#918273',
			'--faint': '#B8AC9B',
			'--accent': '#6B3F1F',
			'--accent-2': '#4D2C13',
			'--accent-bg': '#EFE4D3',
			'--accent-soft': '#F7F0E1',
		},
	},
	noir: {
		name: 'Noir Amber',
		swatch: ['#E8A33D', '#F1EEDD', '#15171C'],
		vars: {
			'--bg': '#15171C',
			'--bg-2': '#0F1115',
			'--card': '#1E2128',
			'--card-2': '#252830',
			'--border': '#353A45',
			'--border-soft': '#2B2E37',
			'--ink': '#F1EEDD',
			'--ink-2': '#C8C2AE',
			'--muted': '#908B7B',
			'--faint': '#5E5B53',
			'--accent': '#E8A33D',
			'--accent-2': '#C68820',
			'--accent-bg': 'rgba(232,163,61,0.15)',
			'--accent-soft': 'rgba(232,163,61,0.07)',
		},
	},
};

export const DEFAULT_TWEAKS: Tweaks = {
	palette: 'apple',
	density: 'comfortable',
	material: 'soft',
};

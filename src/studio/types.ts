// nFrame Studio — shared TypeScript types for the ported studio modules.
// Faithful to the prototype's per-shot state shape (ns-data / ns-app).

export type Mode = 'still' | 'motion';
export type Status = 'draft' | 'gen' | 'ready';

export interface Comp {
	id: string;
	mediaId?: string;
	src?: string;
	kind: Mode;
	frameCount?: number;
	dur?: number;
}

export interface RefItem {
	id: string;
	src: string;
}

export interface SampledFrame {
	id: string;
	src: string;
	n: number;
	hero?: boolean;
}

export interface ShotOutput {
	still: 'ready' | null;
	motion: 'ready' | null;
}

export interface StudioShot {
	id: string;
	n: string;
	title: string;
	beat: string;
	mode: Mode;
	status: Status;
	aspect: string;
	thumb: string;
	comps: Comp[];
	subject: string;
	promptPre: string;
	promptPost: string;
	params: [string, string][];
	stillSrc: string;
	motionFrames: string[];
	output: ShotOutput;
	heroSrc?: string | null;
	compSrc?: string | null;
	startFrame?: string | null;
	endFrame?: string | null;
	refs?: RefItem[];
	sampledFrames?: SampledFrame[];
	workflow?: boolean;
	promptFinal?: boolean;
	promptExtra?: string;
	promptOverride?: string;
	videoUrl?: string;
	history?: string[][];
	sel?: { r: number; c: number } | null;
	variant?: number;
}

export interface FrameTools {
	size: string;
	lens: string;
	fstop: string;
	direction: string;
	aspect: string;
	look: string;
	stock: string;
	light: string;
	framing: string;
	focus: string;
	contrast: string;
	temp: string;
}

export interface MotionTools {
	move: string;
	model: string;
	path: string;
	scale: string;
	continuity: string;
	transition: string;
	res: string;
	dur: number;
	keyframes: number;
}

export interface ToolState {
	frame: FrameTools;
	style: string;
	motion: MotionTools;
	configured?: boolean;
	recipe?: string | null;
	recipeId?: string;
}

export interface Style {
	id: string;
	name: string;
	sw: [string, string];
	grade: string;
	mood: string;
	suffix: string;
	frame: Partial<FrameTools>;
	motion: Partial<MotionTools>;
}

export interface Recipe {
	id: string;
	name: string;
	tags: string[];
	style: string;
	desc: string;
	frame: Partial<FrameTools>;
	motion: Partial<MotionTools>;
	custom?: boolean;
}

export interface Gen {
	shotId: string;
	mode: Mode;
	label: string;
}

export interface Fix {
	shotId: string;
	label: string;
}

export type DemoKind = 'default' | 'appMotion' | 'still' | 'motion';
export interface Demo {
	kind: DemoKind;
	step: number;
}

// Dispatch payloads are intentionally loose (mirrors the prototype's reducer).
export interface Action {
	type: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}
export type Dispatch = (a: Action) => void;

// The bag of project-level tool/style handlers passed down to the workspace (the prototype's `tx`).
export interface Tx {
	tools: ToolState;
	activeStyle: Style;
	styleSet: boolean;
	scope: string;
	recipes: Recipe[];
	activeRecipeId?: string;
	recipeCount: number;
	vsText: string;
	onFrame: (key: string, val: string) => void;
	onMotion: (key: string, val: string | number) => void;
	onStyle: (styleId: string) => void;
	onPickRecipe: (recipeId: string) => void;
	onAddStyle: (desc: string) => void;
	onScope: (scope: string) => void;
	onEdit: (id: string, label: string) => void;
	onOpenRecipes: () => void;
	onVsText: (text: string) => void;
	onEnhanceStyle: () => void;
	onResetProject: () => void;
	fix: Fix | null;
}

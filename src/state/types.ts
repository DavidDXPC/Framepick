// Core data model, reconstructed from the original defaults/migrations.

export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface Lighting {
	timeOfDay: string;
	lightSource: string[];
	direction: string;
	quality: string;
	colorTemp: string;
	keyContrast: string;
	atmospheric: string[];
	special: string[];
}

export interface Lens {
	focalLength: string;
	character: string;
}

export interface Frame {
	lighting: Lighting;
	// When false, the Lighting section is ignored and the project Visual Style
	// owns lighting. When true, these per-shot values override the project look.
	lightingOverride: boolean;
	shotSize: string;
	shotType: string;
	framing: string;
	focusDof: string;
	dutch: string;
	aspect: string;
	lens: Lens;
	// Named lighting-style preset (the visual Lighting grid). Coexists with the
	// structured `lighting` axes below — both apply when set.
	lightingStyle: string;
	// Visual-library "look" axes (named presets that feed the color grade).
	movieLook: string;
	filmStock: string;
}

export interface Motion {
	cameraMovement: string;
	movementDirection: string;
	speed: string;
	equipment: string;
	stabilization: string;
	subjectMotion: string[];
	timeEffects: string;
}

export interface RefImage {
	id?: string;
	src: string;
	originalUrl?: string;
	name?: string;
}

export interface ImageAdjustments {
	brightness?: number;
	contrast?: number;
	saturate?: number;
}

export interface ImageItem {
	id?: string;
	src: string;
	name?: string;
	originalUrl?: string;
	editedUrl?: string;
	adjustments?: ImageAdjustments;
	edits?: unknown;
	updatedAt?: number;
	prompt?: string;
}

export interface Variant {
	id?: string;
	src: string;
	favorite?: boolean;
	prompt?: string;
}

// A motion reference handed off from FramePick: sampled keyframes (layout /
// motion guides only — never the final subject), the structured breakdown,
// and the replicated video prompt whose subject is the @hero token.
export interface MotionRef {
	frames: { t: number; src: string }[];
	// Generated "@hero applied" versions of the frames (Hero swapped in as the
	// subject, composition/camera/lighting preserved). Filled by the
	// "Apply @hero to Frames" action.
	heroFrames?: { t: number; src: string }[];
	duration: number;
	breakdown: {
		shot: string;
		composition: string;
		camera_movement: string;
		scene_action: string;
		evolution: string;
		light_and_grade: string;
	};
	videoPrompt: string;
	heroPrompt: string;
	sourceUrl?: string;
	ts: number;
}

export interface Shot {
	id: string;
	number: number;
	description: string;
	images: ImageItem[];
	variants: Variant[];
	talentRef: RefImage | null;
	sketchRef: RefImage | null;
	// Motion structure received from FramePick (keyframes + @hero video prompt).
	motionRef?: MotionRef | null;
	frame: Frame;
	motion: Motion;
	ai: Record<string, unknown>;
	// Optional verbatim prompt override; when set, it is sent as-is instead of
	// the auto-assembled spec.
	promptOverride?: string;
	// Kling-generated motion preview for this shot.
	videoUrl?: string;
	lastGeneratedSig: string;
	generating: boolean;
	error: string;
	// migration leftovers tolerated on load
	refImage?: RefImage | null;
}

export interface Scene {
	id: string;
	name: string;
	aspectRatio: string;
	shots: Shot[];
}

export interface ShotListState {
	visualStyle: string;
	visualStyleRef?: RefImage | null;
	appliedRecipeId?: string;
	scenes: Scene[];
	selectedSceneId: string;
	view: ViewMode;
}

export type ViewMode = string;

export interface ImageSettings {
	quality: string;
	background: string;
	format: string;
	variations: number;
	seed: string;
}

export type TabKey = 'moodboard' | 'shot' | 'academy';

// Moodboard
export interface MoodItem {
	id: string;
	kind: 'image' | 'text';
	x: number;
	y: number;
	w?: number;
	h?: number;
	src?: string;
	text?: string;
	fontSize?: number;
}

export interface MoodView {
	x: number;
	y: number;
	scale: number;
}

// API keys
export interface ApiKeys {
	openai: string;
	anthropic: string;
	// Kling (Kuaishou) video generation — Access Key / Secret Key pair + model.
	klingAccessKey?: string;
	klingSecretKey?: string;
	klingModel?: string;
}

// Tweaks (palette / density / material)
export interface Tweaks {
	palette: string;
	density: 'compact' | 'comfortable' | 'spacious';
	material: 'paper' | 'soft' | 'glass';
}

// A summary chip extracted from a shot's configured fields
export interface FieldChip {
	label: string;
	value: string;
	group: 'lighting' | 'frame' | 'motion' | 'lens';
	key: string;
	multi?: boolean;
}

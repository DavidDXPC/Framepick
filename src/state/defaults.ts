import type { Frame, Motion, Scene, Shot } from './types';

let counter = 0;
function uid(prefix: string): string {
	counter++;
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyFrame(): Frame {
	return {
		lighting: {
			timeOfDay: '',
			lightSource: [],
			direction: '',
			quality: '',
			colorTemp: '',
			keyContrast: '',
			atmospheric: [],
			special: [],
		},
		lightingOverride: false,
		shotSize: '',
		shotType: '',
		framing: '',
		focusDof: '',
		dutch: '',
		aspect: '',
		lens: { focalLength: '', character: '' },
		lightingStyle: '',
		movieLook: '',
		filmStock: '',
	};
}

export function emptyMotion(): Motion {
	return {
		cameraMovement: '',
		movementDirection: '',
		speed: '',
		equipment: '',
		stabilization: '',
		subjectMotion: [],
		timeEffects: '',
	};
}

export function newShot(number: number): Shot {
	return {
		id: uid('shot'),
		number,
		description: '',
		images: [],
		variants: [],
		talentRef: null,
		sketchRef: null,
		motionRef: null,
		frame: emptyFrame(),
		motion: emptyMotion(),
		ai: {},
		lastGeneratedSig: '',
		generating: false,
		error: '',
	};
}

export function newScene(num: number, name?: string): Scene {
	return {
		id: uid('scene'),
		name: name || `Sc. ${num}`,
		aspectRatio: '16:9',
		shots: [newShot(1), newShot(2), newShot(3)],
	};
}

export function initialScene(): Scene {
	return newScene(1);
}

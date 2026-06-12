// Cinematography taxonomy backing the Frame and Motion settings modals.
// Reconstructed verbatim from the original.

export interface AbbrItem {
	value: string;
	abbr: string;
}
export type Option = string | AbbrItem;

// value / abbr accessors (wr / _p in the original)
export const optValue = (o: Option): string => (typeof o === 'string' ? o : o.value);
export const optAbbr = (o: Option): string | null => (typeof o === 'string' ? null : o.abbr);

// Lighting sub-categories (Ho)
export interface LightingCat {
	key: 'timeOfDay' | 'lightSource' | 'direction' | 'quality' | 'colorTemp' | 'keyContrast' | 'atmospheric' | 'special';
	label: string;
	kind: 'single' | 'multi';
	options: string[];
}

export const LIGHTING: LightingCat[] = [
	{ key: 'timeOfDay', label: 'Time of Day', kind: 'single', options: ['Day', 'Night', 'Sunrise', 'Sunset', 'Golden Hour', 'Blue Hour', 'Magic Hour', 'Overcast', 'Midday', 'Dawn', 'Dusk'] },
	{ key: 'lightSource', label: 'Light Source', kind: 'multi', options: ['Natural', 'Practical', 'Artificial', 'Tungsten', 'HMI', 'LED', 'Fluorescent', 'Fire/Candle', 'Mixed'] },
	{ key: 'direction', label: 'Direction', kind: 'single', options: ['Front', 'Side (left)', 'Side (right)', '3/4 Front', '3/4 Back', 'Back', 'Top', 'Underlight', 'Ambient'] },
	{ key: 'quality', label: 'Quality', kind: 'single', options: ['Hard', 'Soft', 'Diffused', 'Specular'] },
	{ key: 'colorTemp', label: 'Color Temperature', kind: 'single', options: ['Warm (3200K)', 'Neutral (4500K)', 'Cool (5600K)', 'Mixed warm/cool', 'Tungsten', 'Daylight'] },
	{ key: 'keyContrast', label: 'Key / Contrast', kind: 'single', options: ['High-key', 'Low-key', 'Chiaroscuro', 'Naturalistic', 'Silhouette', 'Backlit'] },
	{ key: 'atmospheric', label: 'Atmospheric', kind: 'multi', options: ['Haze', 'Fog', 'Smoke', 'Dust', 'Rain', 'Mist', 'Volumetric rays', 'Clean air'] },
	{ key: 'special', label: 'Special', kind: 'multi', options: ['Lens flare', 'God rays', 'Bokeh highlights', 'Light leaks', 'Caustics', 'Reflections'] },
];

// Shot Size groups (sd)
export const SHOT_SIZE_GROUPS: { label: string; items: AbbrItem[] }[] = [
	{ label: 'Close-ups', items: [{ value: 'Extreme Close-up', abbr: 'ECU' }, { value: 'Close-up', abbr: 'CU' }, { value: 'Medium Close-up', abbr: 'MCU' }, { value: 'Wide Close-up', abbr: 'WCU' }] },
	{ label: 'Medium Shots', items: [{ value: 'Medium Close Shot', abbr: 'MCS' }, { value: 'Close Shot', abbr: 'CS' }, { value: 'Medium Shot', abbr: 'MS' }] },
	{ label: 'Long Shots', items: [{ value: 'Medium Full Shot', abbr: 'MFS' }, { value: 'Full Shot', abbr: 'FS' }, { value: 'Long Shot', abbr: 'LS' }, { value: 'Wide Shot', abbr: 'WS' }, { value: 'Extreme Wide Shot', abbr: 'EWS' }, { value: 'Extreme Long Shot', abbr: 'ELS' }] },
];

// Shot Type (ad)
export const SHOT_TYPES: AbbrItem[] = [
	{ value: 'Eye Level', abbr: 'EL' },
	{ value: 'Low Angle', abbr: 'LA' },
	{ value: 'High Angle', abbr: 'HA' },
	{ value: 'Overhead', abbr: 'OH' },
	{ value: 'Shoulder Level', abbr: 'SL' },
	{ value: 'Hip Level', abbr: 'HL' },
	{ value: 'Knee Level', abbr: 'KL' },
	{ value: 'Ground Level', abbr: 'GL' },
	{ value: 'Dutch Angle', abbr: 'DA' },
	{ value: 'Over the Shoulder', abbr: 'OTS' },
	{ value: 'Back', abbr: 'BK' },
	{ value: 'POV', abbr: 'POV' },
	{ value: "Bird's Eye View", abbr: 'BEV' },
	{ value: "Worm's Eye View", abbr: 'WEV' },
];

export const FRAMING_OPTS = ['Single', 'Two Shot', 'Three Shot', 'Over-the-Shoulder', 'Over-the-Hip', 'Point of View'];
export const FOCUS_OPTS = ['Deep Focus', 'Shallow Focus', 'Rack Focus', 'Tilt-Shift', 'Zoom focus'];
export const DUTCH_OPTS = ['None', 'Dutch (left)', 'Dutch (right)'];
export const ASPECT_OPTS = ['1:1', '9:16', '16:9', '4:3', '2.39:1 (anamorphic)', '21:9'];
export const LENS_FOCAL = ['8mm (fisheye)', '14mm', '24mm', '35mm', '50mm', '85mm', '100mm (macro)', '135mm', '200mm'];
export const LENS_CHARACTER = ['Spherical', 'Anamorphic', 'Macro', 'Tilt-Shift', 'Fisheye', 'Vintage'];

// Motion option lists
export const MOVEMENT_OPTS = ['Static', 'Pan', 'Tilt', 'Swish Pan', 'Swish Tilt', 'Tracking', 'Dolly In', 'Dolly Out', 'Truck Left', 'Truck Right', 'Pedestal Up', 'Pedestal Down', 'Crane', 'Arc', 'Orbit', 'Whip Pan', 'Handheld'];
export const MOVE_DIR_OPTS = ['None', 'Left to right', 'Right to left', 'Forward (push in)', 'Backward (pull out)', 'Upward', 'Downward', 'Diagonal', 'Circular'];
export const SPEED_OPTS = ['Static', 'Slow', 'Medium', 'Fast', 'Whip', 'Speed ramp', 'Variable'];
export const EQUIPMENT_OPTS = ['Tripod', 'Handheld', 'Gimbal', 'Steadicam', 'Dolly', 'Slider', 'Crane', 'Drone', 'Cable cam', 'Vehicle mount', 'Shoulder rig'];
export const STABILIZATION_OPTS = ['Locked-off', 'Stabilized', 'Subtle handheld', 'Aggressive handheld'];
export const SUBJECT_MOTION_OPTS = ['Subject static', 'Toward camera', 'Away from camera', 'Crossing frame L→R', 'Crossing frame R→L', 'Orbiting', 'Falling', 'Rising'];
export const TIME_FX_OPTS = ['Real time', 'Slow motion', 'Time-lapse', 'Hyperlapse', 'Reverse', 'Freeze frame', 'Bullet time'];

// Frame field definitions (Uu)
export interface FieldDef {
	key: string;
	label: string;
	type: 'lighting' | 'single' | 'multi' | 'lens';
	groups?: { label: string; items: AbbrItem[] }[];
	options?: Option[];
	abbr?: boolean;
	custom?: boolean;
	inherit?: boolean;
}

export const FRAME_FIELDS: FieldDef[] = [
	{ key: 'lighting', label: 'Lighting', type: 'lighting' },
	{ key: 'shotSize', label: 'Shot Size', type: 'single', groups: SHOT_SIZE_GROUPS, abbr: true, custom: true },
	{ key: 'shotType', label: 'Shot Type', type: 'single', options: SHOT_TYPES, abbr: true },
	{ key: 'framing', label: 'Framing', type: 'single', options: FRAMING_OPTS },
	{ key: 'focusDof', label: 'Focus/DOF', type: 'single', options: FOCUS_OPTS },
	{ key: 'dutch', label: 'Dutch', type: 'single', options: DUTCH_OPTS },
	{ key: 'aspect', label: 'Aspect', type: 'single', options: ASPECT_OPTS, inherit: true },
	{ key: 'lens', label: 'Lens', type: 'lens' },
];

// Motion field definitions (Vu)
export const MOTION_FIELDS: FieldDef[] = [
	{ key: 'cameraMovement', label: 'Movement', type: 'single', options: MOVEMENT_OPTS },
	{ key: 'movementDirection', label: 'Direction', type: 'single', options: MOVE_DIR_OPTS },
	{ key: 'speed', label: 'Speed', type: 'single', options: SPEED_OPTS },
	{ key: 'equipment', label: 'Equipment', type: 'single', options: EQUIPMENT_OPTS },
	{ key: 'stabilization', label: 'Stabilization', type: 'single', options: STABILIZATION_OPTS },
	{ key: 'subjectMotion', label: 'Subject Motion', type: 'multi', options: SUBJECT_MOTION_OPTS },
	{ key: 'timeEffects', label: 'Time', type: 'single', options: TIME_FX_OPTS },
];

// value -> abbr maps (ia / la)
export const SHOT_SIZE_ABBR: Record<string, string> = {};
SHOT_SIZE_GROUPS.forEach((g) => g.items.forEach((i) => (SHOT_SIZE_ABBR[i.value] = i.abbr)));

export const SHOT_TYPE_ABBR: Record<string, string> = {};
SHOT_TYPES.forEach((i) => (SHOT_TYPE_ABBR[i.value] = i.abbr));

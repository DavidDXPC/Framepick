import type { FieldChip, Lighting, Shot } from '../state/types';
import { LIGHTING, SHOT_SIZE_ABBR, SHOT_TYPE_ABBR } from '../data/frame';
import { filmStockGrade, lightingStyleGrade, movieLookGrade } from '../data/looks';

// Count of configured lighting sub-fields (sa)
export function countLighting(lighting: Lighting): number {
	return LIGHTING.reduce((acc, cat) => {
		const v = lighting[cat.key];
		return acc + (cat.kind === 'multi' ? (Array.isArray(v) && v.length ? 1 : 0) : v ? 1 : 0);
	}, 0);
}

// Count of configured frame fields (fd)
export function countFrame(shot: Shot): number {
	let c = 0;
	if (shot.frame.lightingOverride && countLighting(shot.frame.lighting) > 0) c++;
	(['lightingStyle', 'shotSize', 'shotType', 'framing', 'focusDof', 'dutch', 'aspect', 'movieLook', 'filmStock'] as const).forEach((k) => {
		if (shot.frame[k]) c++;
	});
	if (shot.frame.lens.focalLength || shot.frame.lens.character) c++;
	return c;
}

// Count of configured motion fields (Hp)
export function countMotion(shot: Shot): number {
	let c = 0;
	(['cameraMovement', 'movementDirection', 'speed', 'equipment', 'stabilization', 'timeEffects'] as const).forEach((k) => {
		if (shot.motion[k]) c++;
	});
	if ((shot.motion.subjectMotion || []).length) c++;
	return c;
}

// Configured-field chips for a shot (pd)
export function fieldChips(shot: Shot): FieldChip[] {
	const chips: FieldChip[] = [];
	const f = shot.frame;
	const m = shot.motion;
	const lighting = f.lighting;

	if (f.lightingOverride) {
		LIGHTING.forEach((cat) => {
			const v = lighting[cat.key];
			if (Array.isArray(v) ? v.length : v) {
				chips.push({ label: cat.label, value: Array.isArray(v) ? v.join(', ') : v, group: 'lighting', key: cat.key, multi: cat.kind === 'multi' });
			}
		});
	}
	if (f.lightingStyle) chips.push({ label: 'Lighting', value: f.lightingStyle, group: 'frame', key: 'lightingStyle' });
	if (f.shotSize) chips.push({ label: 'Shot Size', value: f.shotSize, group: 'frame', key: 'shotSize' });
	if (f.shotType) chips.push({ label: 'Shot Type', value: f.shotType, group: 'frame', key: 'shotType' });
	if (f.framing) chips.push({ label: 'Framing', value: f.framing, group: 'frame', key: 'framing' });
	if (f.focusDof) chips.push({ label: 'Focus/DOF', value: f.focusDof, group: 'frame', key: 'focusDof' });
	if (f.dutch && f.dutch !== 'None') chips.push({ label: 'Dutch', value: f.dutch, group: 'frame', key: 'dutch' });
	if (f.aspect) chips.push({ label: 'Aspect', value: f.aspect, group: 'frame', key: 'aspect' });
	if (f.lens.focalLength || f.lens.character) {
		chips.push({ label: 'Lens', value: [f.lens.focalLength, f.lens.character].filter(Boolean).join(' '), group: 'lens', key: '' });
	}
	if (f.movieLook) chips.push({ label: 'Movie Look', value: f.movieLook, group: 'frame', key: 'movieLook' });
	if (f.filmStock) chips.push({ label: 'Film Stock', value: f.filmStock, group: 'frame', key: 'filmStock' });
	if (m.cameraMovement) chips.push({ label: 'Movement', value: m.cameraMovement, group: 'motion', key: 'cameraMovement' });
	if (m.movementDirection && m.movementDirection !== 'None') chips.push({ label: 'Direction', value: m.movementDirection, group: 'motion', key: 'movementDirection' });
	if (m.speed) chips.push({ label: 'Speed', value: m.speed, group: 'motion', key: 'speed' });
	if (m.equipment) chips.push({ label: 'Equipment', value: m.equipment, group: 'motion', key: 'equipment' });
	if (m.stabilization) chips.push({ label: 'Stabilization', value: m.stabilization, group: 'motion', key: 'stabilization' });
	if ((m.subjectMotion || []).length) chips.push({ label: 'Subject Motion', value: m.subjectMotion.join(', '), group: 'motion', key: 'subjectMotion', multi: true });
	if (m.timeEffects) chips.push({ label: 'Time', value: m.timeEffects, group: 'motion', key: 'timeEffects' });
	return chips;
}

// Compact frame summary for the card (Vp)
export function frameSummary(shot: Shot): string {
	const f = shot.frame;
	const parts: string[] = [];
	if (f.lightingStyle) parts.push(f.lightingStyle);
	else if (f.lightingOverride && countLighting(f.lighting)) parts.push('Lighting');
	if (f.shotSize) parts.push(SHOT_SIZE_ABBR[f.shotSize] || f.shotSize);
	if (f.shotType) parts.push(SHOT_TYPE_ABBR[f.shotType] || f.shotType);
	if (f.lens.focalLength) parts.push(f.lens.focalLength);
	return parts.slice(0, 3).join(' · ');
}

// Compact motion summary for the card (Kp)
export function motionSummary(shot: Shot): string {
	const m = shot.motion;
	return [m.cameraMovement, m.speed, m.equipment].filter(Boolean).slice(0, 3).join(' · ');
}

// Signature used to detect unchanged shots (dd)
export function shotSignature(shot: Shot): string {
	return JSON.stringify({ d: shot.description, f: shot.frame, m: shot.motion });
}

// Build the labeled image-generation spec (Wp)
export function buildPrompt(visualStyle: string, shot: Shot, sceneAspect: string): string {
	const f = shot.frame;
	const m = shot.motion;
	const h = f.lighting;
	const out: string[] = [];
	const subject = (shot.description || '').trim() || 'the hero subject';
	out.push(`Hero commercial still image: ${subject}. Photorealistic.`);

	const camera = [
		f.lens.focalLength && `${f.lens.focalLength}${f.lens.character ? ` ${f.lens.character}` : ''} lens`,
		f.focusDof,
		f.shotSize && `${f.shotSize} framing`,
	].filter(Boolean);
	if (camera.length) out.push(`Camera: ${camera.join(', ')}.`);

	const composition = [
		f.shotType,
		f.framing,
		f.dutch && f.dutch !== 'None' && f.dutch,
		(f.aspect || sceneAspect) && `${f.aspect || sceneAspect} aspect`,
	].filter(Boolean);
	if (composition.length) out.push(`Composition: ${composition.join(', ')}.`);

	const materiality = [
		m.cameraMovement && m.cameraMovement !== 'Static' && m.cameraMovement,
		m.movementDirection && m.movementDirection !== 'None' && m.movementDirection,
		m.speed && m.speed !== 'Static' && `${m.speed} pace`,
		...(m.subjectMotion || []),
		m.timeEffects && m.timeEffects !== 'Real time' && m.timeEffects,
	].filter(Boolean);
	if (materiality.length) {
		out.push(`Materiality: frozen-instant capture of ${materiality.join(', ')}, crystalline detail with no unintended motion blur.`);
	}

	// Look — the Visual Direction is the project-wide base; any per-shot Frame
	// lighting (incl. white balance) is stated after it and flagged as an override.
	const baseLook = (visualStyle || '').trim();
	if (baseLook) out.push(`Look — project lighting & color grade (Visual Direction): ${baseLook}`);
	const filmLook = [f.movieLook && movieLookGrade(f.movieLook), f.filmStock && filmStockGrade(f.filmStock)].filter(Boolean);
	if (filmLook.length) out.push(`Film look for this shot: ${filmLook.join('. ')}.`);
	const styleGrade = f.lightingStyle ? lightingStyleGrade(f.lightingStyle) || f.lightingStyle : '';
	const shotLighting = [
		h.timeOfDay,
		h.quality && `${h.quality} quality`,
		h.direction && `${h.direction} key`,
		h.keyContrast,
		...(h.lightSource || []),
		...(h.atmospheric || []),
		...(h.special || []),
		h.colorTemp && `${h.colorTemp} white balance`,
	].filter(Boolean);
	const lightingParts = [styleGrade, ...(f.lightingOverride ? shotLighting : [])].filter(Boolean);
	if (lightingParts.length) out.push(`Lighting for this shot — these take precedence over the project look: ${lightingParts.join(', ')}.`);

	out.push(`Output: photorealistic, ${f.aspect || sceneAspect} aspect ratio, accurate color.`);
	out.push('Constraints: accurate color, clean specular geometry, coherent edges and geometry, no duplicate elements, no extra text, no watermarks.');
	return out.join('\n\n');
}

// The exact prompt that will be sent for a shot: the Hero/Composition input-image
// directives (when refs are attached) followed by the labeled spec. This is the
// single source of truth shared by generation and the "view prompt" UI.
export function assembleShotPrompt(visualStyle: string, shot: Shot, sceneAspect: string): string {
	const base = buildPrompt(visualStyle, shot, sceneAspect);
	const prefix: string[] = [];
	if (shot.talentRef?.src) prefix.push('Use the HERO reference image as the exact subject — preserve its identity, colors, materials and design.');
	if (shot.sketchRef?.src)
		prefix.push(
			"Use the COMPOSITION reference image ONLY for layout, framing, camera angle, pose and placement of the subject. Do NOT copy its background, environment, scenery, props, colors or lighting — take only the spatial composition. Place the HERO subject into that composition, replacing the reference's own subject. Explicit Frame settings and lighting specified below take precedence.",
		);
	return prefix.length ? `${prefix.join(' ')} ${base}` : base;
}

// Map an aspect ratio to a gpt-image size label (Bh)
export function aspectToSizeLabel(aspect: string): string {
	const a = String(aspect || '');
	if (/^(2:3|4:5|9:16)$/i.test(a)) return '1024 × 1536 (portrait)';
	if (/^(3:2|5:4|16:9|21:9)$/i.test(a)) return '1536 × 1024 (landscape)';
	return '1024 × 1024 (square)';
}

// Build a self-contained HTML storyboard for export (Qu)
export function buildStoryboardHtml(name: string, visualStyle: string, shots: Shot[]): string {
	const esc = (v: unknown) =>
		String(v || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
	const articles = (shots || [])
		.map((shot) => {
			const src =
				shot.images?.[0]?.src ||
				(shot.variants || []).find((v) => v.favorite)?.src ||
				shot.variants?.[0]?.src ||
				shot.talentRef?.src ||
				'';
			const meta = fieldChips(shot)
				.map((c) => `<span class="t"><em>${esc(c.label)}</em>${esc(c.value)}</span>`)
				.join('');
			return `<article class="shot">
      <div class="thumb">${src ? `<img src="${src}" alt="Shot ${shot.number}">` : '<div class="ph">No image</div>'}</div>
      <div class="info">
        <h3>Shot ${String(shot.number).padStart(2, '0')}</h3>
        <p class="desc">${esc(shot.description) || '<em>No description</em>'}</p>
        ${meta ? `<div class="meta">${meta}</div>` : ''}
      </div>
    </article>`;
		})
		.join('');
	return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} — Storyboard</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Inter Tight",-apple-system,system-ui,sans-serif;background:#fff;color:#1A1A1A;padding:40px;line-height:1.5}
  header{max-width:920px;margin:0 auto 28px}
  h1{font-size:22px;font-weight:700;letter-spacing:-0.01em}
  .sub{color:#80818C;font-size:13px;margin-top:4px}
  .style{margin-top:14px;padding:12px 14px;background:#F8F8F9;border:1px solid #E8E8EB;border-radius:10px;font-size:13px;color:#43434B}
  .style b{color:#1A1A1A;text-transform:uppercase;font-size:10.5px;letter-spacing:0.08em;display:block;margin-bottom:4px;color:#80818C}
  main{max-width:920px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
  .shot{display:grid;grid-template-columns:240px 1fr;gap:18px;border:1px solid #E8E8EB;border-radius:14px;overflow:hidden;page-break-inside:avoid;background:#fff}
  .thumb{background:#ECECF2;display:flex;align-items:center;justify-content:center;min-height:160px}
  .thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .ph{color:#A0A4AE;font-size:13px}
  .info{padding:16px}
  .info h3{font-size:14px;font-weight:700;letter-spacing:0.02em}
  .desc{font-size:13.5px;color:#43434B;margin:6px 0 12px}
  .meta{display:flex;flex-wrap:wrap;gap:6px}
  .t{display:inline-flex;align-items:center;gap:5px;background:#F8F8F9;border:1px solid #EFEFF2;border-radius:999px;padding:3px 9px;font-size:11.5px}
  .t em{font-style:normal;color:#80818C;font-weight:500}
  footer{max-width:920px;margin:28px auto 0;color:#A0A4AE;font-size:11.5px;text-align:center}
  @media print{body{padding:0}.shot{border-color:#ddd}}
</style></head><body>
  <header>
    <h1>${esc(name)} — Shooting List &amp; Storyboard</h1>
    <div class="sub">${(shots || []).length} shots · nFrame</div>
    ${visualStyle ? `<div class="style"><b>Visual Style</b>${esc(visualStyle)}</div>` : ''}
  </header>
  <main>${articles}</main>
  <footer>Generated with nFrame · ${new Date().toLocaleDateString()}</footer>
</body></html>`;
}

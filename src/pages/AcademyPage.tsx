import { Fragment, useEffect, useState } from 'react';
import { icons } from '../lib/icons';
import { academyImageUrl, FORMULA, IMAGE_POOL, SEGMENTS, TERM_NOTES, VOCAB } from '../data/academy';
import type { AcademyImage, AcademySegment } from '../data/academy';
import { getProvider } from '../state/persistence';
import { dopAssist } from '../lib/aiAssist';
import { Spinner } from '../components/ui';
import { AcademyIntuitive } from './AcademyIntuitive';

type FieldMap = Record<string, string>;
interface ValidationResult {
	missing: AcademySegment[];
	vague: AcademySegment[];
	complete: boolean;
}

// Coerce a vision response into a complete answer key, falling back to the
// curated metadata for any missing field.
function normalizeAnswerKey(raw: Record<string, unknown>, fallback: AcademyImage): AcademyImage {
	const str = (v: unknown, fb: string) => (typeof v === 'string' && v.trim() ? v.trim() : fb);
	const arr = (v: unknown, fb: string[]) => {
		if (Array.isArray(v)) {
			const out = v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((s) => s.trim());
			if (out.length) return out;
		}
		if (typeof v === 'string' && v.trim()) return [v.trim()];
		return fb;
	};
	return {
		tags: fallback.tags,
		lock: fallback.lock,
		subject: str(raw.subject, fallback.subject),
		action: str(raw.action, fallback.action),
		environment: str(raw.environment, fallback.environment),
		style: arr(raw.style, fallback.style),
		lighting: arr(raw.lighting, fallback.lighting),
		angle: arr(raw.angle, fallback.angle),
	};
}

export function AcademyPage() {
	const [mode, setMode] = useState<'guided' | 'intuitive'>('guided');
	const [idx, setIdx] = useState(0);
	const [imgErr, setImgErr] = useState(false);
	const [fields, setFields] = useState<FieldMap>(() => Object.fromEntries(SEGMENTS.map((s) => [s.key, ''])));
	const [focus, setFocus] = useState<string>('subject');
	const [result, setResult] = useState<ValidationResult | null>(null);
	const [hints, setHints] = useState<Record<string, boolean>>({});
	const [revealAll, setRevealAll] = useState(false);
	const [visionByIdx, setVisionByIdx] = useState<Record<number, AcademyImage>>({});
	const [analyzing, setAnalyzing] = useState(false);

	const curated = IMAGE_POOL[idx];
	// When an API key is present, derive the answer key from the ACTUAL image via
	// vision so the hints match what's shown; otherwise fall back to curated tags.
	useEffect(() => {
		if (visionByIdx[idx]) return;
		const prov = getProvider();
		if (prov.provider === 'none') return;
		let alive = true;
		setAnalyzing(true);
		dopAssist({ ...prov, agent: 'academy', imageUrl: academyImageUrl(curated) })
			.then((res) => {
				if (alive && res.academy) setVisionByIdx((m) => ({ ...m, [idx]: normalizeAnswerKey(res.academy!, curated) }));
			})
			.catch(() => {
				/* fall back to curated metadata */
			})
			.finally(() => {
				if (alive) setAnalyzing(false);
			});
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [idx]);

	// effective answer key for this image (vision-derived when available)
	const img = visionByIdx[idx] || curated;
	const loadingHints = analyzing && !visionByIdx[idx];
	// first acceptable answer (P) and the full readable answer (L) per segment
	const firstAnswer = (s: AcademySegment): string => (s.validateTerms ? (img[s.key] as string[])?.[0] || '' : (img[s.key] as string) || '');
	const fullAnswer = (s: AcademySegment): string => (s.validateTerms ? ((img[s.key] as string[]) || []).join(', ') : (img[s.key] as string) || '');
	const correctDescription = SEGMENTS.map(firstAnswer).filter(Boolean).join(', ');

	const setField = (key: string, value: string) => {
		setFields((f) => ({ ...f, [key]: value }));
		setResult(null);
	};

	const generate = () => {
		let next = Math.floor(Math.random() * IMAGE_POOL.length);
		if (next === idx && IMAGE_POOL.length > 1) next = (next + 1) % IMAGE_POOL.length;
		setIdx(next);
		setImgErr(false);
		setFields(Object.fromEntries(SEGMENTS.map((s) => [s.key, ''])));
		setResult(null);
		setHints({});
		setRevealAll(false);
	};

	const assembled = SEGMENTS.map((s) => fields[s.key].trim()).filter(Boolean).join(', ');

	const insertTerm = (term: string, key: string) => {
		const target = SEGMENTS.some((s) => s.key === key) ? key : focus;
		const current = fields[target].trim();
		setField(target, current ? `${current}, ${term}` : term);
	};

	const validate = () => {
		const missing: AcademySegment[] = [];
		const vague: AcademySegment[] = [];
		SEGMENTS.forEach((s) => {
			const value = fields[s.key].trim();
			if (!value) {
				missing.push(s);
				return;
			}
			if (s.validateTerms) {
				const ok = VOCAB.some((t) => t.cat === s.key && value.toLowerCase().includes(t.term.toLowerCase()));
				if (!ok) vague.push(s);
			}
		});
		setResult({ missing, vague, complete: missing.length === 0 });
	};

	const vocabGroups = SEGMENTS.filter((s) => s.validateTerms).map((s) => ({ seg: s, terms: (img[s.key] as string[]) || [] }));

	return (
		<div className="nf-academy">
			<div className="nf-acad-head">
				<div>
					<span className="serif nf-acad-title">Academy</span>
					<p className="nf-acad-sub">
						{mode === 'guided'
							? "Reverse-engineer a reference image into a complete prompt. Describe it, then validate for what's missing — repeat to build the general-to-specific habit."
							: 'Train your eye: describe an image freely, in your own words, then get feedback on what you captured and what you missed.'}
					</p>
				</div>
				<div className="nf-acad-modeswitch" role="tablist" aria-label="Academy mode">
					<button type="button" role="tab" aria-selected={mode === 'guided'} className={'nf-acad-modebtn' + (mode === 'guided' ? ' active' : '')} onClick={() => setMode('guided')}>
						Guided
					</button>
					<button type="button" role="tab" aria-selected={mode === 'intuitive'} className={'nf-acad-modebtn' + (mode === 'intuitive' ? ' active' : '')} onClick={() => setMode('intuitive')}>
						Intuitive
					</button>
				</div>
			</div>

			{mode === 'intuitive' && <AcademyIntuitive />}

			{mode === 'guided' && (
				<>
			<section className="nf-acad-card nf-acad-vocab-band">
				<div className="nf-acad-band-head">
					<span className="nf-acad-hint-lvl">Level 1 · Vocabulary — click to insert</span>
					<span className="nf-acad-cheat" title="Level 2 · Formula reminder">
						Subject + Scenario + Camera + Light
					</span>
				</div>
				<div className="nf-acad-vocab-cols">
					{loadingHints && (
						<div className="nf-acad-analyzing">
							<Spinner size={13} />
							<span>Analyzing the reference image…</span>
						</div>
					)}
					{!loadingHints &&
						vocabGroups.map(({ seg, terms }) => (
						<div className="nf-acad-termgroup" key={seg.key}>
							<span className="nf-acad-termcat">{seg.label}</span>
							<div className="nf-acad-cloud">
								{terms.map((term) => (
									<button
										key={term}
										type="button"
										className="nf-acad-term"
										title={TERM_NOTES[term] ? `${term} — ${TERM_NOTES[term]}` : `Insert into ${seg.label}`}
										onClick={() => insertTerm(term, seg.key)}
									>
										{term}
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			</section>

			<div className="nf-acad-main">
				<section className="nf-acad-card nf-acad-image-card">
					<div className="nf-acad-imgframe">
						{imgErr ? (
							<div className="nf-acad-imgfallback">
								{icons.image}
								<span>Couldn't load image — check your connection, then generate another.</span>
							</div>
						) : (
							<img key={idx} src={academyImageUrl(img)} alt="Reference to describe" onError={() => setImgErr(true)} />
						)}
					</div>
					<button type="button" className="nf-primary-btn nf-acad-newimg" onClick={generate}>
						{icons.spark}
						<span>Generate random image</span>
					</button>
					{loadingHints && (
						<div className="nf-acad-analyzing">
							<Spinner size={13} />
							<span>Reading the image to build accurate hints…</span>
						</div>
					)}
				</section>

				<section className="nf-acad-card nf-acad-write">
					<div className="nf-acad-seg-head">
						<span>Describe the shot</span>
						<span className="nf-acad-formula">{FORMULA}</span>
					</div>
					<div className="nf-acad-segs">
						{SEGMENTS.map((s) => (
							<div className={'nf-acad-seg' + (focus === s.key ? ' focus' : '')} key={s.key}>
								<div className="nf-acad-seg-label">
									<span>
										{s.label}
										<em>{s.hint}</em>
									</span>
									<button
										type="button"
										className={'nf-acad-hintbtn' + (hints[s.key] ? ' on' : '')}
										onClick={() => setHints((h) => ({ ...h, [s.key]: !h[s.key] }))}
									>
										HINT
									</button>
								</div>
								<input
									value={fields[s.key]}
									placeholder={s.placeholder}
									onFocus={() => setFocus(s.key)}
									onChange={(e) => setField(s.key, e.target.value)}
								/>
								{hints[s.key] &&
									(loadingHints ? (
										<div className="nf-acad-reveal">
											<span>
												<Spinner size={12} /> Analyzing the image…
											</span>
										</div>
									) : (
										<div className="nf-acad-reveal">
											<span>
												{fullAnswer(s)}
												{s.validateTerms && ((img[s.key] as string[]) || []).length > 1 && <em className="nf-acad-reveal-note"> — any of these fit</em>}
											</span>
											<button type="button" onClick={() => setField(s.key, firstAnswer(s))}>
												Insert
											</button>
										</div>
									))}
							</div>
						))}
					</div>
					<div className="nf-description nf-acad-assembled">
						<div className="nf-description-head">
							<span>Assembled prompt</span>
							<button
								type="button"
								className={'nf-acad-revealall' + (revealAll ? ' on' : '')}
								title="Reveal correct description"
								onClick={() => setRevealAll((v) => !v)}
							>
								{icons.spark}
							</button>
						</div>
						<div className="nf-acad-assembled-body">
							{assembled || <span className="nf-acad-placeholder">Fill the components above — your prompt builds here.</span>}
						</div>
						{revealAll && (
							<div className="nf-acad-truth">
								<span className="nf-acad-truth-label">Correct description</span>
								<span className="nf-acad-truth-body">{correctDescription}</span>
							</div>
						)}
					</div>
					<div className="nf-acad-actions">
						<button type="button" className="nf-primary-btn" onClick={validate} disabled={!assembled}>
							Validate
						</button>
					</div>
					{result && (
						<div className={'nf-acad-feedback' + (result.complete && !result.vague.length ? ' ok' : '')}>
							{result.complete && !result.vague.length ? (
								<div className="nf-acad-fb-row ok">
									{icons.check}
									<span>Complete prompt — all six components covered. Generate a new image and go again.</span>
								</div>
							) : (
								<Fragment>
									{result.missing.map((s) => (
										<div className="nf-acad-fb-row miss" key={s.key}>
											<strong>Missing {s.label}</strong>
											<span>
												No {s.label.toLowerCase()} specified ({s.hint}).
											</span>
										</div>
									))}
									{result.vague.map((s) => (
										<div className="nf-acad-fb-row vague" key={s.key}>
											<strong>Vague {s.label}</strong>
											<span>
												Add a specific {s.label.toLowerCase()} term — try the {s.label} vocabulary above.
											</span>
										</div>
									))}
								</Fragment>
							)}
						</div>
					)}
				</section>
			</div>
				</>
			)}
		</div>
	);
}

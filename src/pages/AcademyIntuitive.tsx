import { Fragment, useState } from 'react';
import { icons } from '../lib/icons';
import { academyImageUrl, IMAGE_POOL } from '../data/academy';
import type { AcademyImage } from '../data/academy';
import { getProvider } from '../state/persistence';
import { dopAssist } from '../lib/aiAssist';
import { Spinner } from '../components/ui';

interface Feedback {
	score: number;
	strengths: string[];
	gaps: string[];
	expert: string;
}

const COMPONENTS: { key: keyof AcademyImage; label: string }[] = [
	{ key: 'subject', label: 'Subject' },
	{ key: 'action', label: 'Action' },
	{ key: 'environment', label: 'Environment' },
	{ key: 'style', label: 'Style' },
	{ key: 'lighting', label: 'Lighting' },
	{ key: 'angle', label: 'Camera angle' },
];

function tokens(v: string | string[]): string[] {
	const arr = Array.isArray(v) ? v : [v];
	return arr.flatMap((s) => String(s).toLowerCase().split(/[^a-z0-9]+/)).filter((t) => t.length > 2);
}

// Offline grading: keyword-coverage against the curated answer key.
function offlineFeedback(img: AcademyImage, text: string): Feedback {
	const t = text.toLowerCase();
	const strengths: string[] = [];
	const gaps: string[] = [];
	COMPONENTS.forEach((c) => {
		const hit = tokens(img[c.key] as string | string[]).some((tok) => t.includes(tok));
		if (hit) strengths.push(`${c.label} — captured`);
		else gaps.push(`${c.label} — not clearly described`);
	});
	const score = Math.round((strengths.length / COMPONENTS.length) * 100);
	const expert = [img.subject, img.action, img.environment, (img.style || [])[0], (img.lighting || [])[0], (img.angle || [])[0]].filter(Boolean).join(', ');
	return { score, strengths, gaps, expert };
}

function scoreLabel(s: number): string {
	if (s >= 80) return 'Sharp eye';
	if (s >= 55) return 'Good read';
	if (s >= 30) return 'Getting there';
	return 'Keep looking';
}

export function AcademyIntuitive() {
	const [idx, setIdx] = useState(() => Math.floor(Math.random() * IMAGE_POOL.length));
	const [imgErr, setImgErr] = useState(false);
	const [text, setText] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [feedback, setFeedback] = useState<Feedback | null>(null);
	const [offline, setOffline] = useState(false);
	const img = IMAGE_POOL[idx];

	const generate = () => {
		let n = Math.floor(Math.random() * IMAGE_POOL.length);
		if (n === idx && IMAGE_POOL.length > 1) n = (n + 1) % IMAGE_POOL.length;
		setIdx(n);
		setImgErr(false);
		setText('');
		setFeedback(null);
		setError('');
		setOffline(false);
	};

	const check = async () => {
		if (!text.trim()) return;
		setError('');
		const prov = getProvider();
		if (prov.provider === 'none') {
			setOffline(true);
			setFeedback(offlineFeedback(img, text));
			return;
		}
		setLoading(true);
		setFeedback(null);
		setOffline(false);
		try {
			const res = await dopAssist({ ...prov, agent: 'academy-feedback', imageUrl: academyImageUrl(img), userText: text });
			const f = res.feedback as { score?: unknown; strengths?: unknown; gaps?: unknown; expert?: unknown } | undefined;
			if (f) {
				setFeedback({
					score: Math.max(0, Math.min(100, Math.round(Number(f.score) || 0))),
					strengths: Array.isArray(f.strengths) ? (f.strengths as string[]) : [],
					gaps: Array.isArray(f.gaps) ? (f.gaps as string[]) : [],
					expert: String(f.expert || ''),
				});
			} else {
				setError('No feedback returned — try again.');
			}
		} catch (e) {
			setError((e as Error).message || String(e));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="nf-acad-main">
			<section className="nf-acad-card nf-acad-image-card">
				<div className="nf-acad-imgframe">
					{imgErr ? (
						<div className="nf-acad-imgfallback">
							{icons.image}
							<span>Couldn't load image — generate another.</span>
						</div>
					) : (
						<img key={idx} src={academyImageUrl(img)} alt="Describe this reference" onError={() => setImgErr(true)} />
					)}
				</div>
				<button type="button" className="nf-primary-btn nf-acad-newimg" onClick={generate}>
					{icons.spark}
					<span>Generate random image</span>
				</button>
			</section>

			<section className="nf-acad-card nf-acad-write">
				<div className="nf-acad-seg-head">
					<span>Describe what you see</span>
					<span className="nf-acad-formula">in your own words — no fields, just observe</span>
				</div>
				<div className="nf-acad-intuitive-input">
					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Describe the image freely: the subject, what's happening, the setting and mood, the quality of light, the color, and how it's framed…"
						rows={6}
						aria-label="Your description"
					/>
				</div>
				<div className="nf-acad-actions">
					<button type="button" className="nf-primary-btn" onClick={check} disabled={!text.trim() || loading}>
						{loading ? (
							<>
								<Spinner size={13} /> <span>Reading the image…</span>
							</>
						) : (
							'Check my description'
						)}
					</button>
				</div>

				{error && (
					<div className="nf-acad-feedback">
						<div className="nf-acad-fb-row vague">
							<span>{error}</span>
						</div>
					</div>
				)}

				{feedback && (
					<div className="nf-acad-feedback ok">
						<div className="nf-acad-score-row">
							<div className="nf-acad-score" data-tier={feedback.score >= 55 ? 'good' : 'low'}>
								{feedback.score}
							</div>
							<div className="nf-acad-score-meta">
								<strong>{scoreLabel(feedback.score)}</strong>
								<span>{offline ? 'Offline check vs the reference notes — add an API key for full AI feedback.' : 'How completely your description reads the image.'}</span>
							</div>
						</div>
						{feedback.strengths.length > 0 && (
							<div className="nf-acad-fb-block">
								<strong>What you captured</strong>
								<ul>
									{feedback.strengths.map((s, i) => (
										<li key={i} className="ok">
											{icons.check}
											<span>{s}</span>
										</li>
									))}
								</ul>
							</div>
						)}
						{feedback.gaps.length > 0 && (
							<div className="nf-acad-fb-block">
								<strong>What to add next time</strong>
								<ul>
									{feedback.gaps.map((g, i) => (
										<li key={i} className="gap">
											<Fragment>→</Fragment>
											<span>{g}</span>
										</li>
									))}
								</ul>
							</div>
						)}
						{feedback.expert && (
							<div className="nf-acad-truth">
								<span className="nf-acad-truth-label">How a DP would describe it</span>
								<span className="nf-acad-truth-body">{feedback.expert}</span>
							</div>
						)}
					</div>
				)}
			</section>
		</div>
	);
}

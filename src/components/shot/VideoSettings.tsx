import { useEffect, useRef, useState } from 'react';
import { AnchoredPopover, useDismiss } from './popover';
import { icons } from '../../lib/icons';
import { getKling, loadApiKeys, saveApiKeys } from '../../state/persistence';
import { klingCredits } from '../../lib/aiAssist';
import { KLING_MODELS, estimateUnits, loadVideoSettings, saveVideoSettings, type VideoSettings as VS } from '../../lib/videoSettings';

type Credits = { remaining: number; total: number };
type CredState = Credits | 'loading' | 'error' | null;

// The video-model settings wheel (Magnific-style): model picker with per-model
// unit estimates, aspect ratio, duration, quality, and the live remaining
// Kling balance. Self-contained — persists to localStorage; generation reads
// it fresh at run time.
export function VideoSettings() {
	const [open, setOpen] = useState(false);
	const wrapRef = useDismiss(open, setOpen) as React.RefObject<HTMLDivElement>;
	const btnRef = useRef<HTMLButtonElement>(null);
	const [vs, setVs] = useState<VS>(loadVideoSettings);
	const [creds, setCreds] = useState<CredState>(null);

	const update = (patch: Partial<VS>) => {
		const next = { ...vs, ...patch };
		setVs(next);
		saveVideoSettings(next);
		if (patch.model) saveApiKeys({ ...loadApiKeys(), klingModel: patch.model }); // keep getKling() in sync
	};

	const refreshCreds = async () => {
		const k = getKling();
		if (!k) {
			setCreds('error');
			return;
		}
		setCreds('loading');
		try {
			const r = await klingCredits(k.accessKey, k.secretKey);
			setCreds(typeof r?.remaining === 'number' ? { remaining: r.remaining, total: r.total } : 'error');
		} catch {
			setCreds('error');
		}
	};
	useEffect(() => {
		if (open && creds === null) refreshCreds();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const estRun = estimateUnits(vs.model, vs.mode, vs.duration);
	const pct = creds && typeof creds === 'object' && creds.total ? Math.max(0, Math.min(100, (creds.remaining / creds.total) * 100)) : 0;

	const Seg = <T extends string>({ value, options, onPick }: { value: T; options: { v: T; label: string }[]; onPick: (v: T) => void }) => (
		<div className="nf-vset-seg">
			{options.map((o) => (
				<button key={o.v} type="button" className={value === o.v ? 'on' : ''} onClick={() => onPick(o.v)}>
					{o.label}
				</button>
			))}
		</div>
	);

	return (
		<div className="nf-vset" ref={wrapRef}>
			<button ref={btnRef} type="button" className="nf-icon-button" title="Video model settings" aria-label="Video model settings" onClick={() => setOpen((o) => !o)}>
				{icons.gear}
			</button>
			<AnchoredPopover anchorRef={btnRef} open={open} align="right" width={312}>
				<div className="nf-popover nf-vset-pop">
					<div className="nf-vset-title">Video model</div>
					<div className="nf-vset-models">
						{KLING_MODELS.map((m) => (
							<button key={m.id} type="button" className={'nf-vset-model' + (vs.model === m.id ? ' on' : '')} onClick={() => update({ model: m.id })}>
								<span className="nf-vset-model-main">
									<strong>{m.label}</strong>
									<em>{m.note}</em>
								</span>
								<span className="nf-vset-cost">≈ {estimateUnits(m.id, vs.mode, vs.duration)}u</span>
								{vs.model === m.id && <span className="nf-vset-check">{icons.check}</span>}
							</button>
						))}
					</div>

					<div className="nf-vset-label">Aspect ratio</div>
					<Seg
						value={vs.aspectRatio}
						options={[
							{ v: 'auto', label: 'Auto' },
							{ v: '16:9', label: '16:9' },
							{ v: '9:16', label: '9:16' },
							{ v: '1:1', label: '1:1' },
						]}
						onPick={(v) => update({ aspectRatio: v })}
					/>

					<div className="nf-vset-grid2">
						<div>
							<div className="nf-vset-label">Duration</div>
							<Seg value={vs.duration} options={[{ v: '5', label: '5s' }, { v: '10', label: '10s' }]} onPick={(v) => update({ duration: v })} />
						</div>
						<div>
							<div className="nf-vset-label">Quality</div>
							<Seg value={vs.mode} options={[{ v: 'std', label: 'Standard' }, { v: 'pro', label: 'Pro' }]} onPick={(v) => update({ mode: v })} />
						</div>
					</div>

					<div className="nf-vset-credits">
						<div className="nf-vset-credits-head">
							<span>Credits left</span>
							<span className="nf-vset-credits-val">
								{creds === 'loading' && '…'}
								{creds === 'error' && '—'}
								{creds === null && '—'}
								{creds && typeof creds === 'object' && `${creds.remaining} / ${creds.total} units`}
								<button type="button" className="nf-vset-refresh" title="Refresh balance" onClick={refreshCreds}>
									{icons.reset}
								</button>
							</span>
						</div>
						{creds && typeof creds === 'object' && (
							<div className="nf-vset-meter">
								<span style={{ width: `${pct}%` }} />
							</div>
						)}
						<div className="nf-vset-run">
							This run ≈ <b>{estRun} units</b> · estimate
						</div>
						{creds === 'error' && <div className="nf-vset-run">Add valid Kling keys in API keys to see your balance.</div>}
					</div>
				</div>
			</AnchoredPopover>
		</div>
	);
}

import { useRef, useState } from 'react';
import { icons } from '../../lib/icons';
import { aspectToSizeLabel } from '../../lib/promptBuilder';
import type { ImageSettings as ImageSettingsType } from '../../state/types';
import { Row, Segmented, monoInputStyle } from '../ui';
import { AnchoredPopover, useDismiss } from './popover';

// VariantCount (sh): the 1/2/3/4 variants-to-generate picker.
export function VariantCount({ value, onChange }: { value: number; onChange: (n: number) => void }) {
	const [open, setOpen] = useState(false);
	const wrapRef = useDismiss(open, setOpen) as React.RefObject<HTMLSpanElement>;
	const btnRef = useRef<HTMLButtonElement>(null);
	return (
		<span className="nf-vc-picker" ref={wrapRef}>
			<button type="button" ref={btnRef} className="nf-vc-trigger" title="Variants to generate" onClick={() => setOpen((o) => !o)}>
				<span>{value}</span>
				{icons.chev}
			</button>
			<AnchoredPopover anchorRef={btnRef} open={open} width={88} estHeight={56}>
				<div className="nf-popover nf-vc-pop" role="listbox" aria-label="Number of variants">
					{[1, 2, 3, 4].map((n) => (
						<button
							key={n}
							type="button"
							role="option"
							aria-selected={value === n}
							className={'nf-vc-opt' + (value === n ? ' active' : '')}
							onClick={() => {
								onChange(n);
								setOpen(false);
							}}
						>
							{n}
						</button>
					))}
				</div>
			</AnchoredPopover>
		</span>
	);
}

// ImageSettings (ah): the per-shot gear popover (model/size/quality/etc.).
export function ImageSettings({ settings, onChange, aspectRatio }: { settings: ImageSettingsType; onChange: (s: ImageSettingsType) => void; aspectRatio: string }) {
	const [open, setOpen] = useState(false);
	const wrapRef = useDismiss(open, setOpen) as React.RefObject<HTMLSpanElement>;
	const btnRef = useRef<HTMLButtonElement>(null);
	const mono = {
		padding: '8px 10px',
		fontSize: 12.5,
		background: 'var(--card-2)',
		border: '1px solid var(--border)',
		borderRadius: 6,
		color: 'var(--ink)',
	};
	return (
		<span className="nf-imgset" ref={wrapRef}>
			<button type="button" ref={btnRef} className="nf-icon-button nf-imgset-gear" title="Image generation settings" onClick={() => setOpen((o) => !o)}>
				{icons.gear}
			</button>
			<AnchoredPopover anchorRef={btnRef} open={open} align="right" width={420}>
				<div className="nf-popover nf-imgset-pop">
					<Row label="Model" control={<div className="mono" style={mono}>gpt-image-2</div>} />
					<Row label="Size" sub="follows scene aspect ratio" control={<div className="mono" style={mono}>{aspectToSizeLabel(aspectRatio)}</div>} />
					<Row label="Quality" control={<Segmented value={settings.quality} onChange={(v) => onChange({ ...settings, quality: v })} options={['Low', 'Medium', 'High', 'Auto']} />} />
					<Row label="Background" control={<Segmented value={settings.background} onChange={(v) => onChange({ ...settings, background: v })} options={['Opaque', 'Transparent', 'Auto']} />} />
					<Row label="Format" control={<Segmented value={settings.format} onChange={(v) => onChange({ ...settings, format: v })} options={['PNG', 'WebP', 'JPEG']} />} />
					<Row
						label="Variations"
						sub={`${settings.variations} parallel run${settings.variations === 1 ? '' : 's'}`}
						control={<Segmented value={String(settings.variations)} onChange={(v) => onChange({ ...settings, variations: parseInt(v, 10) || 1 })} options={['1', '2', '3', '4']} />}
					/>
					<Row
						label="Seed"
						sub="leave blank for random · use to reproduce"
						control={<input value={settings.seed} placeholder="random" onChange={(e) => onChange({ ...settings, seed: e.target.value })} style={monoInputStyle} />}
					/>
				</div>
			</AnchoredPopover>
		</span>
	);
}

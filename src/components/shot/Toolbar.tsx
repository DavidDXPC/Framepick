import type { ReactNode } from 'react';
import type { Scene } from '../../state/types';

// Workspace layout options for the focused shot (drives data-layout on the card).
const LAYOUTS: { v: string; label: string; icon: ReactNode }[] = [
	{
		v: 'stack',
		label: 'Stack',
		icon: (
			<svg viewBox="0 0 16 12" width={15} height={12} aria-hidden="true">
				<rect x={2} y={1.5} width={12} height={3.5} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
				<rect x={2} y={7} width={12} height={3.5} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
			</svg>
		),
	},
	{
		v: 'flow',
		label: 'Flow',
		icon: (
			<svg viewBox="0 0 16 12" width={15} height={12} aria-hidden="true">
				<rect x={1.5} y={1.5} width={6} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
				<rect x={9} y={1.5} width={5.5} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
			</svg>
		),
	},
	{
		v: 'stage',
		label: 'Stage',
		icon: (
			<svg viewBox="0 0 16 12" width={15} height={12} aria-hidden="true">
				<rect x={1.5} y={1.5} width={9} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
				<rect x={12} y={1.5} width={2.5} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
			</svg>
		),
	},
];

// AspectSeg (fh)
function AspectSeg({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	return (
		<div className="nf-seg" role="radiogroup" aria-label="Aspect ratio">
			{['1:1', '9:16', '16:9'].map((a) => (
				<button key={a} type="button" role="radio" aria-checked={value === a} className={'nf-seg-btn' + (value === a ? ' active' : '')} onClick={() => onChange(a)}>
					{a}
				</button>
			))}
		</div>
	);
}

// LayoutSeg — Stack / Flow / Stage focus modes for the shot workspace.
function LayoutSeg({ view, setView }: { view: string; setView: (v: string) => void }) {
	const cur = view === 'flow' || view === 'stage' || view === 'stack' ? view : 'flow';
	return (
		<div className="nf-seg" role="radiogroup" aria-label="Workspace layout">
			{LAYOUTS.map((o) => (
				<button
					key={o.v}
					type="button"
					role="radio"
					aria-checked={cur === o.v}
					title={`${o.label} layout`}
					aria-label={`${o.label} layout`}
					className={'nf-seg-btn nf-seg-ico' + (cur === o.v ? ' active' : '')}
					onClick={() => setView(o.v)}
				>
					{o.icon}
				</button>
			))}
		</div>
	);
}

// Toolbar (mh)
export function Toolbar({
	scene,
	aspectRatio,
	setAspectRatio,
	view,
	setView,
	savedFlash,
	onExport,
}: {
	scene: Scene | null;
	aspectRatio: string;
	setAspectRatio: (v: string) => void;
	view: string;
	setView: (v: string) => void;
	savedFlash: boolean;
	onExport?: () => void;
}) {
	return (
		<div className="nf-shot-toolbar">
			<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
				<div>
					<h1>Storyboard</h1>
					<p>
						{scene ? `${scene.shots.length} ${scene.shots.length === 1 ? 'shot' : 'shots'}` : 'No shots'}
						{savedFlash && <span className="nf-saved-pip" title="All changes saved" />}
					</p>
				</div>
			</div>
			<div className="nf-shot-toolbar-controls">
				<AspectSeg value={aspectRatio} onChange={setAspectRatio} />
				<span className="nf-vsep" />
				<LayoutSeg view={view} setView={setView} />
				{onExport && (
					<>
						<span className="nf-vsep" />
						<button type="button" className="nf-toolbar-btn" onClick={onExport} title="Export storyboard as a standalone HTML file">
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
								<path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
							</svg>
							<span>Export</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
}

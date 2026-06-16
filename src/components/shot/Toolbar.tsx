import type { Scene } from '../../state/types';

// AspectSeg (fh)
function AspectSeg({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	return (
		<div className="nf-seg" role="radiogroup" aria-label="Aspect ratio">
			{['1:1', '9:16', '16:9'].map((a) => (
				<button
					key={a}
					type="button"
					role="radio"
					aria-checked={value === a}
					className={'nf-seg-btn' + (value === a ? ' active' : '')}
					onClick={() => onChange(a)}
				>
					{a}
				</button>
			))}
		</div>
	);
}

// Toolbar (mh) — project chrome above the shot workspace. The per-shot layout
// switcher now lives in the shot workspace head (see ShotCard).
export function Toolbar({
	scene,
	aspectRatio,
	setAspectRatio,
	savedFlash,
	onExport,
}: {
	scene: Scene | null;
	aspectRatio: string;
	setAspectRatio: (v: string) => void;
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
				{onExport && (
					<>
						<span className="nf-vsep" />
						<button type="button" className="nf-toolbar-btn" onClick={onExport} title="Export storyboard as a standalone HTML file">
							<svg
								viewBox="0 0 24 24"
								width="14"
								height="14"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
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

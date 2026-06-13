import { useRef, useState } from 'react';
import { icons } from '../../lib/icons';
import type { Scene } from '../../state/types';
import { AnchoredPopover, useDismiss } from './popover';

// ColsIcon (Yu): a tiny multi-column glyph for the view picker.
function ColsIcon({ cols }: { cols: number }) {
	const w = (16 - 1.4 * (cols - 1)) / cols;
	return (
		<svg viewBox="0 0 16 12" width={16} height={12}>
			{Array.from({ length: cols }).map((_, i) => (
				<rect key={i} x={i * (w + 1.4)} y={1.5} width={w} height={9} rx={1} fill="none" stroke="currentColor" strokeWidth="1.3" />
			))}
		</svg>
	);
}

const VIEW_OPTS = [
	{ v: 'list', label: 'List View' },
	{ v: 'g1', label: 'One Column' },
	{ v: 'g2', label: 'Two Columns' },
	{ v: 'g3', label: 'Three Columns' },
	{ v: 'g4', label: 'Four Columns' },
	{ v: 'g5', label: 'Five Columns' },
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

// ViewSelect (ph)
function ViewSelect({ view, setView }: { view: string; setView: (v: string) => void }) {
	const [open, setOpen] = useState(false);
	const ref = useDismiss(open, setOpen) as React.RefObject<HTMLDivElement>;
	return (
		<div className="nf-view-select" ref={ref}>
			<button type="button" className="nf-toolbar-btn" onClick={() => setOpen((o) => !o)} title="View type">
				{view === 'list' ? icons.list : <ColsIcon cols={parseInt(view.slice(1), 10) || 1} />}
				{icons.chev}
			</button>
			{open && (
				<div className="nf-popover" role="menu">
					<div className="nf-popover-title">View</div>
					{VIEW_OPTS.map((o) => (
						<button
							key={o.v}
							type="button"
							className={'nf-popover-opt' + (view === o.v ? ' selected' : '')}
							onClick={() => {
								setView(o.v);
								setOpen(false);
							}}
						>
							<span className="nf-view-opt-label">
								<span className="nf-view-opt-ic">{o.v === 'list' ? icons.list : <ColsIcon cols={parseInt(o.v.slice(1), 10) || 1} />}</span>
								{o.label}
							</span>
							{view === o.v && icons.check}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ExportMenu (hh)
function ExportMenu({ onPrint, onDownloadHtml }: { onPrint: () => void; onDownloadHtml: () => void }) {
	const [open, setOpen] = useState(false);
	const ref = useDismiss(open, setOpen) as React.RefObject<HTMLDivElement>;
	const btnRef = useRef<HTMLButtonElement>(null);
	return (
		<div className="nf-view-select" ref={ref}>
			<button type="button" className="nf-toolbar-btn" ref={btnRef} onClick={() => setOpen((o) => !o)} title="Export storyboard">
				{icons.download}
				<span>Export</span>
				{icons.chev}
			</button>
			<AnchoredPopover anchorRef={btnRef} open={open} align="right" width={228}>
				<div className="nf-popover">
					<div className="nf-popover-title">Export storyboard</div>
					<button
						type="button"
						className="nf-popover-opt"
						onClick={() => {
							onPrint();
							setOpen(false);
						}}
					>
						<span>Print / Save as PDF</span>
					</button>
					<button
						type="button"
						className="nf-popover-opt"
						onClick={() => {
							onDownloadHtml();
							setOpen(false);
						}}
					>
						<span>Download HTML deck</span>
					</button>
				</div>
			</AnchoredPopover>
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
	onAddShot,
	savedFlash,
	onPrint,
	onDownloadHtml,
}: {
	scene: Scene | null;
	aspectRatio: string;
	setAspectRatio: (v: string) => void;
	view: string;
	setView: (v: string) => void;
	onAddShot: () => void;
	savedFlash: boolean;
	onPrint: () => void;
	onDownloadHtml: () => void;
}) {
	return (
		<div className="nf-shot-toolbar">
			<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
				<div>
					<h1>Shooting List and Storyboard</h1>
					<p>
						{scene ? `${scene.shots.length} ${scene.shots.length === 1 ? 'shot' : 'shots'}` : 'No shots'}
						{savedFlash && <span className="nf-saved-pip" title="All changes saved" />}
					</p>
				</div>
			</div>
			<div className="nf-shot-toolbar-controls">
				<AspectSeg value={aspectRatio} onChange={setAspectRatio} />
				<span className="nf-vsep" />
				<ViewSelect view={view} setView={setView} />
				<ExportMenu onPrint={onPrint} onDownloadHtml={onDownloadHtml} />
				<span className="nf-vsep" />
				<button type="button" className="nf-primary-btn" onClick={onAddShot}>
					{icons.plus}
					<span>Add Shot</span>
				</button>
			</div>
		</div>
	);
}

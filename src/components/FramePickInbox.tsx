import { useMemo, useState, useSyncExternalStore } from 'react';
import { clearInbox, getInbox, removeInboxItem, subscribeInbox, type InboxItem } from '../lib/framepickBridge';
import { icons } from '../lib/icons';
import { FramePickLogo } from './FramePickLogo';
import type { Scene } from '../state/types';

function timeAgo(ts: number): string {
	const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
	if (s < 60) return 'just now';
	const m = Math.round(s / 60);
	if (m < 60) return `${m} min ago`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h} h ago`;
	return `${Math.round(h / 24)} d ago`;
}

function hostOf(url?: string): string {
	try {
		return url ? new URL(url).hostname.replace(/^www\./, '') : '';
	} catch {
		return '';
	}
}

// The FramePick Inbox tray: handoffs sent from the extension land here, then
// flow into a shot — composition refs into the Composition slot, motion
// structures into the shot's Motion guide (keyframes + @hero video prompt).
export function FramePickInbox({
	open,
	onClose,
	scene,
	onApply,
}: {
	open: boolean;
	onClose: () => void;
	scene: Scene | null;
	onApply: (item: InboxItem, target: string) => void; // target: shot id or 'new'
}) {
	const items = useSyncExternalStore(subscribeInbox, getInbox);
	const [targets, setTargets] = useState<Record<string, string>>({});
	const shots = useMemo(() => scene?.shots || [], [scene]);

	if (!open) return null;

	return (
		<div className="nf-fpi" role="dialog" aria-label="FramePick Inbox">
			<header className="nf-fpi-head">
				<span className="nf-fpi-title">
					<FramePickLogo size={20} />
					<strong>FramePick Inbox</strong>
					{items.length > 0 && <em className="nf-fpi-count">{items.length}</em>}
				</span>
				<span className="nf-fpi-head-actions">
					{items.length > 0 && (
						<button type="button" className="nf-fpi-clear" onClick={clearInbox}>
							Clear all
						</button>
					)}
					<button type="button" className="nf-icon-button" title="Close" onClick={onClose}>
						{icons.x}
					</button>
				</span>
			</header>

			{items.length === 0 ? (
				<div className="nf-fpi-empty">
					<FramePickLogo size={34} tile />
					<strong>Nothing here yet</strong>
					<p>
						Browse anywhere with the FramePick extension, pick a still or a clip, and hit <b>Use in FramePick Studio</b>. Compositions and motion structures arrive here, ready to drop into a
						shot.
					</p>
				</div>
			) : (
				<div className="nf-fpi-list">
					{items.map((item) => {
						const p = item.payload;
						const isMotion = p.kind === 'motion';
						const thumb = isMotion ? p.frames[Math.floor(p.frames.length / 2)]?.src : p.image;
						const target = targets[item.id] || (shots.length ? shots[0].id : 'new');
						const host = hostOf(p.sourceUrl);
						return (
							<article className="nf-fpi-item" key={item.id}>
								<div className="nf-fpi-thumb">
									<img src={thumb} alt="" />
									{isMotion && <span className="nf-fpi-frames">▦ {p.frames.length}</span>}
								</div>
								<div className="nf-fpi-mid">
									<div className="nf-fpi-meta">
										<span className={`nf-fpi-chip ${isMotion ? 'motion' : 'still'}`}>{isMotion ? 'MOTION' : 'COMPOSITION'}</span>
										<span className="nf-fpi-when">
											{timeAgo(item.receivedAt)}
											{host ? ` · ${host}` : ''}
										</span>
									</div>
									<p className="nf-fpi-line" title={isMotion ? p.heroPrompt || p.videoPrompt : p.prompt}>
										{isMotion ? p.heroPrompt || p.videoPrompt : p.prompt}
									</p>
									<div className="nf-fpi-actions">
										<select className="nf-fpi-select" value={target} onChange={(e) => setTargets((t) => ({ ...t, [item.id]: e.target.value }))} aria-label="Target shot">
											{shots.map((s) => (
												<option key={s.id} value={s.id}>
													Shot {String(s.number).padStart(2, '0')}
												</option>
											))}
											<option value="new">＋ New shot</option>
										</select>
										<button type="button" className="nf-fpi-apply" onClick={() => onApply(item, target)}>
											{isMotion ? 'Use as Motion' : 'Use as Composition'}
										</button>
										<button type="button" className="nf-icon-button" title="Dismiss" onClick={() => removeInboxItem(item.id)}>
											{icons.trash}
										</button>
									</div>
								</div>
							</article>
						);
					})}
				</div>
			)}
			<footer className="nf-fpi-foot">
				Composition refs shape the layout only — your <b>Hero</b> stays the subject. Motion prompts use <span className="nf-hero-token">@hero</span>, resolved to the shot's Hero slot.
			</footer>
		</div>
	);
}

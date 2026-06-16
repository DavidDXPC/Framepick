import { useSyncExternalStore } from 'react';
import { headerIcons as Icons } from '../lib/icons';
import { inboxCount, subscribeInbox } from '../lib/framepickBridge';
import { FramePickLogo } from './FramePickLogo';
import type { TabKey } from '../state/types';

const TABS: { id: TabKey; label: string }[] = [
	{ id: 'moodboard', label: 'Moodboard' },
	{ id: 'shot', label: 'Shot list' },
	{ id: 'academy', label: 'Academy' },
];

// The window toolbar — frosted macOS chrome. Traffic lights are a decorative
// motif (aria-hidden, not controls). The Inbox count is the real, live signal
// that the FramePick extension has delivered handoffs.
export function Header({
	tab,
	setTab,
	onApiKeys,
	onInbox,
}: {
	tab: TabKey;
	setTab: (t: TabKey) => void;
	onApiKeys: () => void;
	onInbox: () => void;
}) {
	const fpCount = useSyncExternalStore(subscribeInbox, inboxCount);
	return (
		<header className="ns-toolbar">
			<span className="ns-lights" aria-hidden="true">
				<i className="r" />
				<i className="y" />
				<i className="g" />
			</span>
			<div className="ns-brand">
				<FramePickLogo size={22} tile />
				<span>FramePick</span>
			</div>

			<nav className="ns-tabs" aria-label="Sections">
				{TABS.map((t) => (
					<button key={t.id} type="button" className={'ns-tab' + (tab === t.id ? ' on' : '')} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
						{t.label}
					</button>
				))}
			</nav>

			<div className="ns-toolbar-right">
				<button type="button" className="nf-inbox-btn" title="FramePick Inbox — compositions & motion sent from the extension" onClick={onInbox}>
					<FramePickLogo size={16} />
					<span>Inbox</span>
					{fpCount > 0 && <em className="nf-inbox-badge">{fpCount}</em>}
				</button>
				<button type="button" className="ns-tb-btn" onClick={onApiKeys}>
					<span className="nf-accent-ic">{Icons.key}</span>
					API keys
				</button>
				<span className="ns-avatar" title="david.comprido@prozis.com">DC</span>
			</div>
		</header>
	);
}

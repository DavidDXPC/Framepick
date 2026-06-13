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

export function Header({
	tab,
	setTab,
	dark,
	setDark,
	onApiKeys,
	onInbox,
}: {
	tab: TabKey;
	setTab: (t: TabKey) => void;
	dark: boolean;
	setDark: (v: boolean) => void;
	onApiKeys: () => void;
	onInbox: () => void;
}) {
	const fpCount = useSyncExternalStore(subscribeInbox, inboxCount);
	return (
		<header
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 16,
				flexWrap: 'wrap',
				padding: '10px 14px',
				borderRadius: 14,
				background: 'var(--card)',
				border: '1px solid var(--border)',
				boxShadow: 'var(--shadow-soft)',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6 }}>
				<FramePickLogo size={24} tile />
				<span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
					<span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>FramePick</span>
					<span className="serif" style={{ fontSize: 15, color: 'var(--muted)' }}>
						Studio
					</span>
				</span>
			</div>

			<nav
				style={{
					margin: '0 auto',
					display: 'inline-flex',
					padding: 3,
					background: 'var(--card-2)',
					borderRadius: 999,
					border: '1px solid var(--border-soft)',
					overflowX: 'auto',
					maxWidth: '100%',
				}}
			>
				{TABS.map((t) => {
					const active = tab === t.id;
					return (
						<button
							key={t.id}
							onClick={() => setTab(t.id)}
							style={{
								padding: '7px 16px',
								fontSize: 13.5,
								fontWeight: 500,
								color: active ? 'var(--primary-foreground, #FFFFFF)' : 'var(--ink-2)',
								background: active ? 'var(--primary, var(--ink))' : 'transparent',
								border: 'none',
								borderRadius: 999,
								cursor: 'pointer',
								transition: 'background 140ms, color 140ms',
							}}
						>
							{t.label}
						</button>
					);
				})}
			</nav>

			<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
				<button type="button" className="nf-inbox-btn" title="FramePick Inbox — compositions & motion sent from the extension" onClick={onInbox}>
					<FramePickLogo size={16} />
					<span>Inbox</span>
					{fpCount > 0 && <em className="nf-inbox-badge">{fpCount}</em>}
				</button>
				<button
					title="Dark mode"
					onClick={() => setDark(!dark)}
					style={{
						width: 32,
						height: 32,
						border: 'none',
						background: 'transparent',
						borderRadius: 8,
						cursor: 'pointer',
						color: 'var(--muted)',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
					onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-2)')}
					onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
				>
					{Icons.moon}
				</button>
				<button
					onClick={onApiKeys}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
						padding: '7px 12px',
						fontSize: 13,
						fontWeight: 500,
						color: 'var(--ink-2)',
						background: 'var(--card)',
						border: '1px solid var(--border)',
						borderRadius: 999,
						cursor: 'pointer',
					}}
				>
					<span style={{ color: 'var(--accent)' }}>{Icons.key}</span>
					API keys
				</button>
			</div>
		</header>
	);
}

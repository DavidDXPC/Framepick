import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ApiKeysModal } from './components/ApiKeysModal';
import { AcademyPage } from './pages/AcademyPage';
import { ShotListPage } from './pages/ShotListPage';
import { MoodboardPage } from './pages/MoodboardPage';
import { TweaksPanel } from './components/TweaksPanel';
import { PALETTES, DEFAULT_TWEAKS } from './data/palettes';
import { useTweaks } from './state/useTweaks';
import { loadApiKeys, loadMoodboardLocal, loadMoodboardIdb, saveMoodboardIdb } from './state/persistence';
import type { ApiKeys, MoodItem, MoodView, TabKey } from './state/types';

export function App() {
	const [tab, setTab] = useState<TabKey>('shot');
	const [dark, setDark] = useState(false);
	const [apiKeysOpen, setApiKeysOpen] = useState(false);
	const [apiKeys, setApiKeys] = useState<ApiKeys>(() => loadApiKeys());
	const [tweaks, setTweak] = useTweaks(DEFAULT_TWEAKS);

	// Apply palette / density / material to the document (theme effect)
	useEffect(() => {
		const pal = PALETTES[tweaks.palette] || PALETTES.apple;
		const root = document.documentElement;
		if (pal === PALETTES.apple) {
			root.style.setProperty('--accent-strong', '#5B50E6');
			root.style.setProperty('--accent-ink', '#4A3FD6');
			root.style.setProperty('--placeholder-bg', '#EBECF2');
			root.style.setProperty('--placeholder-ink', '#B2B4C0');
			root.style.setProperty('--border-strong', '#D6D7DE');
			root.style.setProperty('--divider', '#EDEDF1');
		}
		Object.entries(pal.vars).forEach(([k, v]) => root.style.setProperty(k, v));
		root.setAttribute('data-density', tweaks.density);
		root.setAttribute('data-material', tweaks.material);
		root.style.colorScheme = tweaks.palette === 'noir' ? 'dark' : 'light';
	}, [tweaks.palette, tweaks.density, tweaks.material]);

	// Moodboard state — IndexedDB authoritative, localStorage fallback
	const [items, setItems] = useState<MoodItem[]>(() => loadMoodboardLocal().items || []);
	const [view, setView] = useState<MoodView>(() => loadMoodboardLocal().view || { x: 0, y: 0, scale: 1 });
	const [saveFailed, setSaveFailed] = useState(false);
	const ready = useRef(false);

	useEffect(() => {
		let alive = true;
		loadMoodboardIdb().then((res) => {
			if (!alive) return;
			if (res && Array.isArray(res.items)) {
				setItems(res.items);
				if (res.view) setView(res.view);
			} else {
				const local = loadMoodboardLocal();
				if (local.items?.length) saveMoodboardIdb({ items: local.items, view: local.view });
			}
			ready.current = true;
		});
		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		if (!ready.current) return;
		const t = setTimeout(() => {
			saveMoodboardIdb({ items, view }).then((ok) => setSaveFailed(!ok));
		}, 400);
		return () => clearTimeout(t);
	}, [items, view]);

	return (
		<div className="nf-app-shell-wrap" style={{ width: '100%', margin: 0, padding: '16px 32px 56px', display: 'flex', flexDirection: 'column', gap: 14 }}>
			<Header
				tab={tab}
				setTab={setTab}
				dark={dark}
				setDark={setDark}
				onApiKeys={() => setApiKeysOpen(true)}
				onInbox={() => {
					// the inbox lives on the Shot list page — jump there, then toggle
					setTab('shot');
					requestAnimationFrame(() => window.dispatchEvent(new Event('framepick:toggle-inbox')));
				}}
			/>
			{tab === 'shot' && <ShotListPage boardImages={items} />}
			{tab === 'academy' && <AcademyPage />}
			{tab === 'moodboard' && <MoodboardPage items={items} setItems={setItems} view={view} setView={setView} saveFailed={saveFailed} />}
			{apiKeysOpen && <ApiKeysModal onClose={() => setApiKeysOpen(false)} keys={apiKeys} setKeys={setApiKeys} />}
			<TweaksPanel tweaks={tweaks} setTweak={setTweak} />
		</div>
	);
}

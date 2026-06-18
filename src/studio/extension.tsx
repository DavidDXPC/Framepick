// nFrame Studio — simulated Chrome + FramePick Extension panel (real images).
// Ported from ns-extension.jsx.
import { useEffect, useState } from 'react';
import { I, NI } from './icons';
import { NImg, Spinner } from './ui';
import { A, NS_PINS } from './assets';
import type { Pin } from './assets';
import type { Demo } from './types';

const EXT_STILL = {
	sub: 'a slim UFF+ protein can',
	pre: 'Product hero shot of ',
	post: ' cradled in a nest of coiled orange climbing rope on a warm tangerine sweep — 100mm macro at ƒ/8, soft top-left key, crisp rope speculars, deep contact shadow, rich amber grade.',
};
const EXT_MOTION = {
	sub: 'a slim beverage can',
	rows: [
		['Framing', 'Centered product, eye level, rope leads into frame'],
		['Camera', 'Slow 180° orbit, steady gimbal, ease-out to rest'],
		['Timing', '6.0s — constant velocity, settle on the last beat'],
		['Light', 'Soft top-left key, crisp rope speculars'],
	] as [string, string][],
	pre: 'Slow 180° orbit around ',
	post: ' cradled in coiled orange rope, steady gimbal easing to rest, a specular highlight traveling along the braid, soft top key, clean amber grade.',
};

export function SafariWindow({ demo, onUse, onPick, onExit }: { demo: Demo; onUse: () => void; onPick: () => void; onExit: () => void }) {
	const targetId = demo.kind === 'motion' ? 'vidcan' : 'ufrope';
	const pickerOn = demo.step >= 1;
	const panelOpen = demo.step >= 2;
	const capturing = demo.step === 2;
	const target = NS_PINS.find((p) => p.id === targetId)!;

	return (
		<div className="ns-safari">
			<div className="ns-sf-chrome">
				<span className="lights"><i className="r" /><i className="y" /><i className="g" /></span>
				<div className="ns-sf-nav">
					<button>{I.chev({ style: { transform: 'rotate(90deg)' } })}</button>
					<button>{I.chev({ style: { transform: 'rotate(-90deg)' } })}</button>
				</div>
				<div className="ns-sf-addr"><span className="ns-sf-lock">🔒</span> pinterest.com/search/product-photography-rope</div>
				<button className={'ns-sf-ext' + (pickerOn ? ' on' : '')} title="FramePick picker">{I.cross()}</button>
				<button className="icon-btn light" title="Exit example" onClick={onExit}>{I.x()}</button>
			</div>

			<div className={'ns-sf-body' + (pickerOn && !panelOpen ? ' picking' : '')}>
				<div className="ns-pin-grid">
					{NS_PINS.map((m) => {
						const hot = pickerOn && m.id === targetId;
						const dim = panelOpen && m.id !== targetId;
						const mode = m.type === 'video' ? 'VIDEO' : 'IMAGE';
						return (
							<figure key={m.id} className={'ns-pin' + (hot ? ' hot' : '') + (dim ? ' dim' : '')} style={{ height: m.h }} onClick={() => { if (pickerOn && m.id === targetId && !panelOpen) onPick(); }}>
								<NImg src={m.src} />
								{m.type === 'video' && <span className="ns-pin-play">{I.play()}</span>}
								{m.type === 'video' && <span className="ns-pin-dur">0:0{m.dur}</span>}
								<figcaption className="ns-pin-cap">{m.title}</figcaption>
								{hot && !panelOpen && <span className="ns-pin-tag">{m.type === 'video' ? 'video' : 'img'} · <b>{mode}</b></span>}
							</figure>
						);
					})}
				</div>

				{pickerOn && !panelOpen && (
					<div className="ns-sf-toast">FramePick picker is on — click the highlighted {target.type === 'video' ? 'clip' : 'image'}</div>
				)}
				{panelOpen && <div className="ns-sf-dim" />}
				{panelOpen && <ExtPanel kind={demo.kind} media={target} capturing={capturing} onUse={onUse} onExit={onExit} />}
			</div>
		</div>
	);
}

function ExtPanel({ kind, media, capturing, onUse, onExit }: { kind: string; media: Pin; capturing: boolean; onUse: () => void; onExit: () => void }) {
	const motion = kind === 'motion';
	return (
		<div className="ns-extp" role="dialog" aria-label="FramePick">
			<div className="ns-extp-head">
				<span className="ns-extp-brand"><span className="ns-extp-mark">{I.cross()}</span> FramePick <span>· Extension</span></span>
				<button className="icon-btn light" onClick={onExit}>{I.x()}</button>
			</div>
			<div className="ns-extp-body">
				{capturing ? <ExtCapturing media={media} motion={motion} /> : motion ? <ExtMotion /> : <ExtStill media={media} />}
				<div className="ns-extp-actions">
					<button className="ns-extp-btn">{I.copy()} Copy</button>
					<button className="ns-extp-btn">{I.refresh()} Regenerate</button>
					<span className="flex" />
					<button className="ns-extp-btn primary" disabled={capturing} onClick={onUse}>{motion ? 'Use as Composition Refs' : 'Use as Composition'} {I.chev({ style: { transform: 'rotate(-90deg)', fontSize: '13px' } })}</button>
				</div>
			</div>
		</div>
	);
}

function ExtCapturing({ media, motion }: { media: Pin; motion: boolean }) {
	const [n, setN] = useState(motion ? 1 : 0);
	useEffect(() => {
		if (!motion) return;
		const id = setInterval(() => setN((x) => Math.min(8, x + 1)), 160);
		return () => clearInterval(id);
	}, [motion]);
	return (
		<div>
			<div className="ns-extp-row">
				<span className={'ns-extp-chip ' + (motion ? 'motion' : 'still')}>{motion ? 'VIDEO' : 'IMAGE'}</span>
				<span className="ns-extp-status"><Spinner /> {motion ? `sampling frame ${n} / 8…` : 'analyzing composition & light…'}</span>
			</div>
			{motion ? (
				<div className="ns-extp-strip mt">
					{A.srcFrames.map((src, i) => (
						<div className="ns-extp-fr" key={i}>{i < n ? <NImg src={src} /> : <span className="ns-extp-ph" />}</div>
					))}
				</div>
			) : (
				<div className="ns-extp-hero"><NImg src={media.src} /></div>
			)}
		</div>
	);
}

function ExtStill({ media }: { media: Pin }) {
	return (
		<div>
			<div className="ns-extp-row">
				<div className="ns-extp-thumb"><NImg src={media.src} /></div>
				<div className="ns-extp-col">
					<span className="ns-extp-chip still">IMAGE</span>
					<span className="ns-extp-meta">FLUX.2 prompt · sent as Composition</span>
				</div>
			</div>
			<div className="ns-extp-rewrite">
				<span className="lab">SUBJECT → @HERO</span>
				<div className="diff">
					<span className="from">{EXT_STILL.sub}</span>
					<span className="arr">{NI.arrow()}</span>
					<span className="ns-tok">@hero</span>
				</div>
			</div>
			<div className="ns-extp-mono">{EXT_STILL.pre}<span className="ns-tok">@hero</span>{EXT_STILL.post}</div>
		</div>
	);
}

function ExtMotion() {
	const [vp, setVp] = useState('hero');
	const hero = vp === 'hero';
	return (
		<div>
			<div className="ns-extp-row">
				<span className="ns-extp-chip motion">VIDEO</span>
				<span className="ns-extp-meta">8 frames · 0–6.0s · six-row breakdown</span>
			</div>
			<div className="ns-extp-strip mt">
				{A.srcFrames.map((src, i) => (<div className={'ns-extp-fr' + (i === 2 ? ' sel' : '')} key={i}><NImg src={src} /></div>))}
			</div>
			<div className="ns-extp-rows">
				{EXT_MOTION.rows.map(([k, v]) => (<div className="ns-extp-srow" key={k}><span className="ns-extp-k">{k}</span><span className="ns-extp-v">{v}</span></div>))}
			</div>
			<div className="ns-extp-vp">
				<span className="lab">VIDEO PROMPT</span>
				<div className="ns-extp-seg">
					<button className={!hero ? 'on' : ''} onClick={() => setVp('clip')}>Clip</button>
					<button className={hero ? 'on' : ''} onClick={() => setVp('hero')}>@hero</button>
				</div>
			</div>
			{hero
				? <div className="ns-extp-mono">{EXT_MOTION.pre}<span className="ns-tok">@hero</span>{EXT_MOTION.post}</div>
				: <div className="ns-extp-mono">{EXT_MOTION.pre}<span className="from">{EXT_MOTION.sub}</span>{EXT_MOTION.post}</div>}
		</div>
	);
}

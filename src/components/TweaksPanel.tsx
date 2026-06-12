// Host-driven "Tweaks" design panel and sub-controls.
// De-minified from the recovered production bundle (Th / yd / Wo / Zr / Ph / vd /
// qs / xd / Rh / Dh / _h / wd / Ah / Uh). DOM, classNames, inline styles, strings,
// postMessage protocol and drag math reproduced verbatim.

import * as React from 'react';
import { PALETTES } from '../data/palettes';
import type { Tweaks } from '../state/types';

// Th — scoped CSS for the panel.
const TWEAKS_CSS = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ---------------------------------------------------------------------------
// Shared option type for radio/select controls.
type Opt = string | { value: string; label: string };

// Wo — TweakSection.
function TweakSection({ label, children }: { label: React.ReactNode; children?: React.ReactNode }) {
	return (
		<>
			<div className="twk-sect">{label}</div>
			{children}
		</>
	);
}

// Zr — TweakRow.
function TweakRow({
	label,
	value,
	children,
	inline = false,
}: {
	label: React.ReactNode;
	value?: React.ReactNode;
	children?: React.ReactNode;
	inline?: boolean;
}) {
	return (
		<div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
			<div className="twk-lbl">
				<span>{label}</span>
				{value != null && <span className="twk-val">{value}</span>}
			</div>
			{children}
		</div>
	);
}

// Ph — TweakSlider.
function TweakSlider({
	label,
	value,
	min = 0,
	max = 100,
	step = 1,
	unit = '',
	onChange,
}: {
	label: React.ReactNode;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	unit?: string;
	onChange: (v: number) => void;
}) {
	return (
		<TweakRow label={label} value={`${value}${unit}`}>
			<input
				type="range"
				className="twk-slider"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
			/>
		</TweakRow>
	);
}

// vd — TweakToggle.
function TweakToggle({
	label,
	value,
	onChange,
}: {
	label: React.ReactNode;
	value: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<div className="twk-row twk-row-h">
			<div className="twk-lbl">
				<span>{label}</span>
			</div>
			<button
				type="button"
				className="twk-toggle"
				data-on={value ? '1' : '0'}
				role="switch"
				aria-checked={!!value}
				onClick={() => onChange(!value)}
			>
				<i />
			</button>
		</div>
	);
}

// qs — TweakRadio (segmented control, falls back to a <select> when labels are long).
function TweakRadio({
	label,
	value,
	options,
	onChange,
}: {
	label: React.ReactNode;
	value: string;
	options: Opt[];
	onChange: (v: string) => void;
}) {
	const segRef = React.useRef<HTMLDivElement>(null);
	const [dragging, setDragging] = React.useState(false);
	const valRef = React.useRef(value);
	valRef.current = value;
	const len = (o: Opt) => String(typeof o === 'object' ? o.label : o).length;
	if (
		!(
			options.reduce((m, o) => Math.max(m, len(o)), 0) <=
			(({ 2: 16, 3: 10 } as Record<number, number>)[options.length] ?? 0)
		)
	) {
		const resolve = (e: string) => {
			const r = options.find((o) => String(typeof o === 'object' ? o.value : o) === e);
			return r === undefined ? e : typeof r === 'object' ? r.value : r;
		};
		return (
			<TweakSelect label={label} value={value} options={options} onChange={(e) => onChange(resolve(e))} />
		);
	}
	const items = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
	const idx = Math.max(0, items.findIndex((o) => o.value === value));
	const n = items.length;
	const valueAt = (x: number) => {
		const rect = segRef.current!.getBoundingClientRect();
		const w = rect.width - 4;
		const i = Math.floor(((x - rect.left - 2) / w) * n);
		return items[Math.max(0, Math.min(n - 1, i))].value;
	};
	const onPointerDown = (e: React.PointerEvent) => {
		setDragging(true);
		const first = valueAt(e.clientX);
		if (first !== valRef.current) onChange(first);
		const move = (ev: PointerEvent) => {
			if (!segRef.current) return;
			const v = valueAt(ev.clientX);
			if (v !== valRef.current) onChange(v);
		};
		const up = () => {
			setDragging(false);
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	};
	return (
		<TweakRow label={label}>
			<div
				ref={segRef}
				role="radiogroup"
				onPointerDown={onPointerDown}
				className={dragging ? 'twk-seg dragging' : 'twk-seg'}
			>
				<div
					className="twk-seg-thumb"
					style={{
						left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
						width: `calc((100% - 4px) / ${n})`,
					}}
				/>
				{items.map((o) => (
					<button type="button" role="radio" aria-checked={o.value === value} key={o.value}>
						{o.label}
					</button>
				))}
			</div>
		</TweakRow>
	);
}

// xd — TweakSelect.
function TweakSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: React.ReactNode;
	value: string;
	options: Opt[];
	onChange: (v: string) => void;
}) {
	return (
		<TweakRow label={label}>
			<select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
				{options.map((o) => {
					const v = typeof o === 'object' ? o.value : o;
					const l = typeof o === 'object' ? o.label : o;
					return (
						<option value={v} key={v}>
							{l}
						</option>
					);
				})}
			</select>
		</TweakRow>
	);
}

// Rh — TweakText.
function TweakText({
	label,
	value,
	placeholder,
	onChange,
}: {
	label: React.ReactNode;
	value: string;
	placeholder?: string;
	onChange: (v: string) => void;
}) {
	return (
		<TweakRow label={label}>
			<input
				className="twk-field"
				type="text"
				value={value}
				placeholder={placeholder}
				onChange={(e) => onChange(e.target.value)}
			/>
		</TweakRow>
	);
}

// Dh — TweakNumber (with drag-on-label scrubbing).
function TweakNumber({
	label,
	value,
	min,
	max,
	step = 1,
	unit = '',
	onChange,
}: {
	label: React.ReactNode;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	unit?: string;
	onChange: (v: number) => void;
}) {
	const clamp = (v: number) => (min != null && v < min ? min : max != null && v > max ? max : v);
	const start = React.useRef({ x: 0, val: 0 });
	const onPointerDown = (e: React.PointerEvent) => {
		e.preventDefault();
		start.current = { x: e.clientX, val: value };
		const decimals = (String(step).split('.')[1] || '').length;
		const move = (ev: PointerEvent) => {
			const dx = ev.clientX - start.current.x;
			const raw = start.current.val + dx * step;
			const snapped = Math.round(raw / step) * step;
			onChange(clamp(Number(snapped.toFixed(decimals))));
		};
		const up = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	};
	return (
		<div className="twk-num">
			<span className="twk-num-lbl" onPointerDown={onPointerDown}>
				{label}
			</span>
			<input
				type="number"
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={(e) => onChange(clamp(Number(e.target.value)))}
			/>
			{unit && <span className="twk-num-unit">{unit}</span>}
		</div>
	);
}

// _h — perceived-luminance test for picking dark vs light check-mark.
function isLight(c: unknown) {
	const raw = String(c).replace('#', '');
	const hex = raw.length === 3 ? raw.replace(/./g, (g) => g + g) : raw.padEnd(6, '0');
	const n = parseInt(hex.slice(0, 6), 16);
	if (Number.isNaN(n)) return true;
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	return r * 299 + g * 587 + b * 114 > 148e3;
}

// zh — the check-mark glyph for the selected color chip.
const CheckGlyph = ({ light }: { light: boolean }) => (
	<svg viewBox="0 0 14 14" aria-hidden="true">
		<path
			d="M3 7.2 5.8 10 11 4.2"
			fill="none"
			strokeWidth="2.2"
			strokeLinecap="round"
			strokeLinejoin="round"
			stroke={light ? 'rgba(0,0,0,.78)' : '#fff'}
		/>
	</svg>
);

// wd — TweakColor (single <input type=color> or a row of palette chips).
type ColorOpt = string | string[];
function TweakColor({
	label,
	value,
	options,
	onChange,
}: {
	label: React.ReactNode;
	value: ColorOpt;
	options?: ColorOpt[];
	onChange: (v: ColorOpt) => void;
}) {
	if (!options || !options.length) {
		return (
			<div className="twk-row twk-row-h">
				<div className="twk-lbl">
					<span>{label}</span>
				</div>
				<input
					type="color"
					className="twk-swatch"
					value={value as string}
					onChange={(e) => onChange(e.target.value)}
				/>
			</div>
		);
	}
	const norm = (f: ColorOpt) => String(JSON.stringify(f)).toLowerCase();
	const cur = norm(value);
	return (
		<TweakRow label={label}>
			<div className="twk-chips" role="radiogroup">
				{options.map((f, g) => {
					const arr = Array.isArray(f) ? f : [f];
					const [head, ...rest] = arr;
					const tail = rest.slice(0, 4);
					const on = norm(f) === cur;
					return (
						<button
							type="button"
							className="twk-chip"
							role="radio"
							aria-checked={on}
							data-on={on ? '1' : '0'}
							aria-label={arr.join(', ')}
							title={arr.join(' · ')}
							style={{ background: head }}
							onClick={() => onChange(f)}
							key={g}
						>
							{tail.length > 0 && (
								<span>
									{tail.map((i, b) => (
										<i style={{ background: i }} key={b} />
									))}
								</span>
							)}
							{on && <CheckGlyph light={isLight(head)} />}
						</button>
					);
				})}
			</div>
		</TweakRow>
	);
}

// Ah — TweakButton.
function TweakButton({
	label,
	onClick,
	secondary = false,
}: {
	label: React.ReactNode;
	onClick?: () => void;
	secondary?: boolean;
}) {
	return (
		<button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'} onClick={onClick}>
			{label}
		</button>
	);
}

// Uh — palette swatch picker.
function PaletteSwatchPicker({ active, onPick }: { active: string; onPick: (k: string) => void }) {
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(2, 1fr)',
				gap: 6,
				padding: '2px 12px 10px',
			}}
		>
			{Object.entries(PALETTES).map(([key, p]) => {
				const on = key === active;
				return (
					<button
						onClick={() => onPick(key)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							padding: '6px 8px',
							borderRadius: 8,
							cursor: 'pointer',
							background: on ? 'rgba(0,0,0,0.06)' : 'transparent',
							border: on ? '1px solid rgba(0,0,0,0.12)' : '1px solid transparent',
							color: '#29261b',
							fontSize: 11,
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
						key={key}
					>
						<span
							style={{
								display: 'inline-flex',
								flexShrink: 0,
								width: 28,
								height: 18,
								borderRadius: 4,
								overflow: 'hidden',
								boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.2)',
							}}
						>
							<span style={{ flex: 1, background: p.swatch[2] }} />
							<span style={{ flex: 1, background: p.swatch[1] }} />
							<span style={{ flex: 1, background: p.swatch[0] }} />
						</span>
						<span
							style={{
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{p.name}
						</span>
					</button>
				);
			})}
		</div>
	);
}

// yd — the draggable floating Tweaks panel shell.
function TweaksShell({
	title = 'Tweaks',
	noDeckControls = false,
	children,
}: {
	title?: React.ReactNode;
	noDeckControls?: boolean;
	children?: React.ReactNode;
}) {
	const [active, setActive] = React.useState(false);
	const panelRef = React.useRef<HTMLDivElement>(null);
	const hasDeck = React.useMemo(
		() => typeof document < 'u' && !!document.querySelector('deck-stage'),
		[]
	);
	const [railAvailable, setRailAvailable] = React.useState(
		() => hasDeck && !!(document.querySelector('deck-stage') as any)?._railEnabled
	);
	React.useEffect(() => {
		if (!hasDeck || railAvailable) return;
		const onMsg = (ev: MessageEvent) => {
			if (ev.data && ev.data.type === '__omelette_rail_enabled') setRailAvailable(true);
		};
		window.addEventListener('message', onMsg);
		return () => window.removeEventListener('message', onMsg);
	}, [hasDeck, railAvailable]);
	const [railVisible, setRailVisible] = React.useState(() => {
		try {
			return localStorage.getItem('deck-stage.railVisible') !== '0';
		} catch {
			return true;
		}
	});
	const toggleRail = (on: boolean) => {
		setRailVisible(on);
		window.postMessage({ type: '__deck_rail_visible', on }, '*');
	};
	const pos = React.useRef({ x: 16, y: 16 });
	const MARGIN = 16;
	const clampToViewport = React.useCallback(() => {
		const el = panelRef.current;
		if (!el) return;
		const w = el.offsetWidth;
		const h = el.offsetHeight;
		const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN);
		const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN);
		pos.current = {
			x: Math.min(maxX, Math.max(MARGIN, pos.current.x)),
			y: Math.min(maxY, Math.max(MARGIN, pos.current.y)),
		};
		el.style.right = pos.current.x + 'px';
		el.style.bottom = pos.current.y + 'px';
	}, []);
	React.useEffect(() => {
		if (!active) return;
		clampToViewport();
		if (typeof ResizeObserver > 'u') {
			window.addEventListener('resize', clampToViewport);
			return () => window.removeEventListener('resize', clampToViewport);
		}
		const ro = new ResizeObserver(clampToViewport);
		ro.observe(document.documentElement);
		return () => ro.disconnect();
	}, [active, clampToViewport]);
	React.useEffect(() => {
		const onMsg = (ev: MessageEvent) => {
			const t = ev?.data?.type;
			if (t === '__activate_edit_mode') setActive(true);
			else if (t === '__deactivate_edit_mode') setActive(false);
		};
		window.addEventListener('message', onMsg);
		window.parent.postMessage({ type: '__edit_mode_available' }, '*');
		return () => window.removeEventListener('message', onMsg);
	}, []);
	const close = () => {
		setActive(false);
		window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
	};
	const onHeaderMouseDown = (e: React.MouseEvent) => {
		const el = panelRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const startX = e.clientX;
		const startY = e.clientY;
		const baseRight = window.innerWidth - rect.right;
		const baseBottom = window.innerHeight - rect.bottom;
		const move = (ev: MouseEvent) => {
			pos.current = {
				x: baseRight - (ev.clientX - startX),
				y: baseBottom - (ev.clientY - startY),
			};
			clampToViewport();
		};
		const up = () => {
			window.removeEventListener('mousemove', move);
			window.removeEventListener('mouseup', up);
		};
		window.addEventListener('mousemove', move);
		window.addEventListener('mouseup', up);
	};
	return active ? (
		<>
			<style>{TWEAKS_CSS}</style>
			<div
				ref={panelRef}
				className="twk-panel"
				data-noncommentable=""
				style={{ right: pos.current.x, bottom: pos.current.y }}
			>
				<div className="twk-hd" onMouseDown={onHeaderMouseDown}>
					<b>{title}</b>
					<button
						className="twk-x"
						aria-label="Close tweaks"
						onMouseDown={(e) => e.stopPropagation()}
						onClick={close}
					>
						{'✕'}
					</button>
				</div>
				<div className="twk-body">
					{children}
					{hasDeck && railAvailable && !noDeckControls && (
						<TweakSection label="Deck">
							<TweakToggle label="Thumbnail rail" value={railVisible} onChange={toggleRail} />
						</TweakSection>
					)}
				</div>
			</div>
		</>
	) : null;
}

// Re-export the sub-controls under their public names (parallels the bundle's
// Object.assign(window, { ... }) registration). Kept for API parity / reuse.
export {
	TweaksShell,
	TweakSection,
	TweakRow,
	TweakSlider,
	TweakToggle,
	TweakRadio,
	TweakSelect,
	TweakText,
	TweakNumber,
	TweakColor,
	TweakButton,
	PaletteSwatchPicker,
};

// Hh-composed panel: the App wires these 7 controls into the yd shell.
export function TweaksPanel({
	tweaks,
	setTweak,
}: {
	tweaks: Tweaks;
	setTweak: (keyOrObj: keyof Tweaks | Partial<Tweaks>, val?: unknown) => void;
}) {
	return (
		<TweaksShell title="Tweaks">
			<TweakSection label="Palette" />
			<TweakColor
				label="Studio palette"
				value={tweaks.palette}
				options={Object.keys(PALETTES)}
				onChange={(v) => setTweak('palette', v)}
			/>
			<PaletteSwatchPicker active={tweaks.palette} onPick={(v) => setTweak('palette', v)} />
			<TweakSection label="Density" />
			<TweakRadio
				label="Breathing room"
				value={tweaks.density}
				options={['compact', 'comfortable', 'spacious']}
				onChange={(v) => setTweak('density', v)}
			/>
			<TweakSection label="Surface" />
			<TweakRadio
				label="Material"
				value={tweaks.material}
				options={['paper', 'soft', 'glass']}
				onChange={(v) => setTweak('material', v)}
			/>
		</TweaksShell>
	);
}

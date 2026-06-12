import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Glyph, headerIcons as Icons } from '../lib/icons';

// Spinner (kr)
export function Spinner({ size = 14 }: { size?: number }) {
	return (
		<span
			aria-hidden="true"
			style={{
				width: size,
				height: size,
				borderRadius: 999,
				border: '2px solid currentColor',
				borderRightColor: 'transparent',
				display: 'inline-block',
				animation: 'hf-spin 900ms linear infinite',
				opacity: 0.82,
			}}
		/>
	);
}

// Token colors (Hu / rd)
const TOKEN_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
	'@hero': { fg: '#B25A38', bg: '#F0E4DD', border: '#DBBCA8' },
	'@ref1': { fg: '#4E76E6', bg: '#DCE4FA', border: '#C5D2F5' },
	'@ref2': { fg: '#3D9C72', bg: '#DDF1E5', border: '#BFDFC9' },
	'@ref3': { fg: '#B68A2E', bg: '#F5EFD9', border: '#E3D9B0' },
	'@ref4': { fg: '#9C73E6', bg: '#EEE7FA', border: '#DCCEF3' },
	'@ref5': { fg: '#3E9FA6', bg: '#D9F0F1', border: '#B7DEDF' },
	'@ref6': { fg: '#C04680', bg: '#F8E2EC', border: '#E5B5C8' },
};
export function tokenColor(label: string) {
	return TOKEN_COLORS[label] || TOKEN_COLORS['@hero'];
}
if (typeof window !== 'undefined') (window as unknown as { HF_tokenColor: typeof tokenColor }).HF_tokenColor = tokenColor;

// Token chip (Gs)
export function Token({ label, size = 'md' }: { kind?: string; label: string; size?: 'sm' | 'md' }) {
	const c = tokenColor(label);
	const sm = size === 'sm';
	return (
		<span
			className="mono"
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				padding: sm ? '1px 6px' : '2px 8px',
				fontSize: sm ? 11 : 12,
				fontWeight: 500,
				color: c.fg,
				background: c.bg,
				border: `1px solid ${c.border}`,
				borderRadius: 4,
				lineHeight: 1.4,
				letterSpacing: '-0.01em',
			}}
		>
			{label}
		</span>
	);
}

// Card (od)
export function Card({
	icon,
	title,
	hint,
	children,
	pad = 18,
	headerPad = 16,
	style,
	flexCol,
	className,
	headerAction,
}: {
	icon?: ReactNode;
	title?: ReactNode;
	hint?: ReactNode;
	children?: ReactNode;
	pad?: number;
	headerPad?: number;
	style?: CSSProperties;
	flexCol?: boolean;
	className?: string;
	headerAction?: ReactNode;
}) {
	const hasBody = children != null && children !== false;
	return (
		<section
			className={className}
			style={{
				background: 'var(--card)',
				borderRadius: 16,
				border: '1px solid var(--border)',
				boxShadow: 'var(--shadow-soft, 0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 8px rgba(31,26,20,0.045), 0 18px 34px -22px rgba(31,26,20,0.16))',
				display: flexCol ? 'flex' : undefined,
				flexDirection: flexCol ? 'column' : undefined,
				...style,
			}}
		>
			{title && (
				<header
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						padding: `${headerPad}px ${pad}px ${headerPad - 4}px`,
						borderBottom: '1px solid var(--border-soft)',
						flexShrink: 0,
					}}
				>
					<span style={{ color: 'var(--muted)', display: 'inline-flex' }}>{icon}</span>
					<h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{title}</h3>
					{hint && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{hint}</span>}
					{headerAction}
				</header>
			)}
			{hasBody && (
				<div style={{ padding: pad, flex: flexCol ? 1 : undefined, display: flexCol ? 'flex' : undefined, flexDirection: flexCol ? 'column' : undefined }}>{children}</div>
			)}
		</section>
	);
}

// Row (mn)
export function Row({ label, sub, control, align = 'center' }: { label: ReactNode; sub?: ReactNode; control: ReactNode; align?: 'center' | 'start' }) {
	return (
		<div
			className="hf-row"
			style={{
				display: 'grid',
				gridTemplateColumns: '150px 1fr',
				alignItems: align === 'center' ? 'center' : 'flex-start',
				gap: 16,
				padding: '10px 0',
				borderTop: '1px solid var(--border-soft)',
			}}
		>
			<div style={{ paddingTop: align === 'center' ? 0 : 6 }}>
				<div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{label}</div>
				{sub && <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
			</div>
			<div>{control}</div>
		</div>
	);
}

export type SparkleApply = (action: string, custom: string) => void;

// AI assist sparkle button + menu (ta / wp / xp)
const SPARKLE_ACTIONS = [
	{ id: 'enhance', label: 'Enhance prompt', hint: 'Tighten phrasing, add production specifics', icon: Icons.spark },
	{ id: 'suggest', label: 'Suggest prompt', hint: 'Generate a fresh option for this field', icon: <Glyph d={<><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>} /> },
	{ id: 'clarity', label: 'Rewrite for clarity', hint: 'Same meaning, cleaner prose', icon: <Glyph d={<><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m14 6 4 4" /></>} /> },
	{ id: 'shorten', label: 'Shorten', hint: 'Compress without adding details', icon: <Glyph d={<><path d="M4 12h16" /><path d="M8 8h8" /><path d="M10 16h4" /></>} /> },
	{ id: 'custom', label: 'Custom prompt', hint: 'Write your own instruction', icon: <Glyph d={<><path d="M12 5v14" /><path d="M5 12h14" /></>} /> },
];

function SparkleMenu({ anchor, fieldLabel, onClose, onApply }: { anchor: HTMLElement | null; fieldLabel?: string; value?: string; onClose: () => void; onApply?: SparkleApply }) {
	const ref = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ top: 0, left: 0 });
	useEffect(() => {
		function place() {
			if (!anchor) return;
			const r = anchor.getBoundingClientRect();
			const w = 260;
			const left = Math.max(10, Math.min(r.right - w, window.innerWidth - w - 10));
			const below = r.bottom + 6;
			const h = 258;
			const top = below + h > window.innerHeight - 10 ? Math.max(10, r.top - h - 6) : below;
			setPos({ top, left });
		}
		place();
		window.addEventListener('scroll', place, true);
		window.addEventListener('resize', place);
		function onDown(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node) && anchor !== e.target && !anchor?.contains(e.target as Node)) onClose();
		}
		document.addEventListener('mousedown', onDown);
		return () => {
			document.removeEventListener('mousedown', onDown);
			window.removeEventListener('scroll', place, true);
			window.removeEventListener('resize', place);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [anchor]);
	return (
		<div
			ref={ref}
			style={{
				position: 'fixed',
				top: pos.top,
				left: pos.left,
				width: 260,
				zIndex: 1000,
				background: 'var(--card)',
				border: '1px solid var(--border)',
				borderRadius: 12,
				boxShadow: '0 12px 32px rgba(31,26,20,0.12), 0 2px 6px rgba(31,26,20,0.05)',
				padding: 6,
				overflow: 'hidden',
			}}
		>
			{fieldLabel && (
				<div style={{ padding: '6px 10px 4px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 600 }}>{fieldLabel}</div>
			)}
			{SPARKLE_ACTIONS.map((a) => (
				<button
					key={a.id}
					onClick={() => {
						const custom = a.id === 'custom' ? window.prompt('Custom instruction', 'Improve this field in DoP voice') : '';
						if (a.id === 'custom' && !custom?.trim()) return;
						onApply?.(a.id, custom || '');
						onClose();
					}}
					style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
					onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')}
					onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
				>
					<span style={{ color: 'var(--accent)', display: 'inline-flex' }}>{a.icon}</span>
					<span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						<span style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</span>
						<span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{a.hint}</span>
					</span>
				</button>
			))}
		</div>
	);
}

export function SparkleBtn({
	onApply,
	fieldLabel,
	value,
	tone = 'muted',
	variant = 'plain',
	loading = false,
	disabled = false,
}: {
	onApply?: SparkleApply;
	fieldLabel?: string;
	value?: string;
	tone?: 'muted' | 'accent';
	variant?: 'plain' | 'boxed' | 'strongBox';
	loading?: boolean;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLButtonElement>(null);
	const muteColor = tone === 'accent' ? 'var(--accent)' : 'var(--muted)';
	const boxed = variant === 'boxed';
	const strong = variant === 'strongBox';
	useEffect(() => {
		if (disabled || loading) setOpen(false);
	}, [disabled, loading]);
	return (
		<span style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				ref={ref}
				className="hf-sparkle-btn"
				data-open={open ? 'true' : 'false'}
				onClick={(e) => {
					e.stopPropagation();
					if (!(disabled || loading)) setOpen((o) => !o);
				}}
				disabled={disabled || loading}
				title="AI Assist · refine this prompt"
				aria-label="AI Assist · refine this prompt"
				style={{
					width: strong ? 32 : 28,
					height: strong ? 32 : 28,
					border: strong ? '1px solid var(--accent)' : boxed ? '1px solid var(--border)' : 'none',
					background: strong ? 'var(--accent-soft)' : boxed ? 'var(--card)' : 'transparent',
					borderRadius: strong ? 9 : 6,
					cursor: disabled || loading ? 'not-allowed' : 'pointer',
					color: strong ? 'var(--accent)' : muteColor,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow: strong ? '0 1px 3px rgba(194,91,54,0.16)' : boxed ? '0 1px 2px rgba(31,26,20,0.05)' : 'none',
					opacity: disabled ? 0.5 : 1,
				}}
				onMouseEnter={(e) => {
					if (!disabled && !loading && (boxed || strong)) e.currentTarget.style.background = 'var(--accent-soft)';
				}}
				onMouseLeave={(e) => {
					if (!disabled && !loading) {
						if (strong) e.currentTarget.style.background = 'var(--accent-soft)';
						else if (boxed) e.currentTarget.style.background = 'var(--card)';
					}
				}}
			>
				{loading ? <Spinner /> : Icons.spark}
			</button>
			{open && !disabled && !loading && (
				<SparkleMenu anchor={ref.current} fieldLabel={fieldLabel} value={value} onClose={() => setOpen(false)} onApply={onApply} />
			)}
		</span>
	);
}

// Text field with optional inline sparkle (yp)
export function TextField({
	value,
	onChange,
	placeholder,
	multiline,
	mono,
	rows = 2,
	withSparkle = true,
	onSparkle,
	fieldLabel,
	suffix,
	autoSize,
}: {
	value?: string;
	onChange?: (v: string) => void;
	placeholder?: string;
	multiline?: boolean;
	mono?: boolean;
	rows?: number;
	withSparkle?: boolean;
	onSparkle?: SparkleApply;
	fieldLabel?: string;
	suffix?: ReactNode;
	autoSize?: boolean;
}) {
	// One ref covers both element kinds; the original was untyped JS.
	const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
	useEffect(() => {
		if (multiline && autoSize && ref.current) {
			ref.current.style.height = 'auto';
			ref.current.style.height = ref.current.scrollHeight + 'px';
		}
	}, [value, multiline, autoSize]);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Tag = (multiline ? 'textarea' : 'input') as any;
	return (
		<div style={{ display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 8, width: '100%', minWidth: 0 }}>
			<Tag
				ref={ref}
				value={value || ''}
				onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange?.(e.target.value)}
				placeholder={placeholder}
				rows={multiline ? rows : undefined}
				className={mono ? 'mono' : ''}
				style={{
					flex: '1 1 auto',
					width: '100%',
					minWidth: 0,
					maxWidth: '100%',
					padding: '8px 10px',
					fontSize: mono ? 12.5 : 13,
					fontFamily: mono ? "'JetBrains Mono', ui-monospace, monospace" : 'inherit',
					lineHeight: 1.55,
					color: 'var(--ink)',
					background: 'transparent',
					border: '1px solid transparent',
					borderRadius: 6,
					outline: 'none',
					resize: 'none',
					height: multiline ? Math.max(58, rows * 28) : undefined,
					overflowY: multiline ? 'auto' : undefined,
					overflowX: 'hidden',
					transition: 'background 120ms, border-color 120ms',
				}}
				onFocus={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
					e.target.style.background = 'var(--accent-soft)';
					e.target.style.borderColor = 'var(--accent)';
				}}
				onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
					e.target.style.background = 'transparent';
					e.target.style.borderColor = 'transparent';
				}}
			/>
			{suffix}
			{withSparkle && <SparkleBtn onApply={onSparkle} fieldLabel={fieldLabel} value={value} />}
		</div>
	);
}

// Select with optional sparkle (vp)
export function SelectField({
	value,
	onChange,
	options = [],
	placeholder,
	withSparkle = true,
	onSparkle,
	fieldLabel,
	tint,
}: {
	value?: string;
	onChange: (v: string) => void;
	options?: string[];
	placeholder?: string;
	withSparkle?: boolean;
	onSparkle?: SparkleApply;
	fieldLabel?: string;
	tint?: { bg: string; border: string };
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		function onDown(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('mousedown', onDown);
		return () => document.removeEventListener('mousedown', onDown);
	}, []);
	return (
		<div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', width: '100%', minWidth: 0 }}>
			<button
				onClick={() => setOpen((o) => !o)}
				style={{
					flex: '1 1 auto',
					width: '100%',
					minWidth: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '8px 10px',
					border: `1px solid ${tint ? tint.border : 'var(--border)'}`,
					borderRadius: 6,
					background: tint ? tint.bg : 'var(--card)',
					color: value ? 'var(--ink)' : 'var(--faint)',
					fontSize: 13,
					cursor: 'pointer',
					textAlign: 'left',
				}}
			>
				<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || placeholder}</span>
				<span style={{ color: 'var(--muted)', marginLeft: 8 }}>{Icons.chev}</span>
			</button>
			{withSparkle && <SparkleBtn onApply={onSparkle} fieldLabel={fieldLabel} value={value} />}
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						right: withSparkle ? 36 : 0,
						marginTop: 4,
						background: 'var(--card)',
						border: '1px solid var(--border)',
						borderRadius: 8,
						boxShadow: '0 8px 24px rgba(31,26,20,0.10)',
						zIndex: 50,
						maxHeight: 280,
						overflowY: 'auto',
					}}
				>
					{options.map((opt, i) => (
						<div
							key={i}
							onClick={() => {
								onChange(opt);
								setOpen(false);
							}}
							onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')}
							onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
							style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--ink)' }}
						>
							{opt}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// Toolbar icon chip (kp)
export function IconChip({ icon, label, onClick, active }: { icon?: ReactNode; label: ReactNode; onClick?: () => void; active?: boolean }) {
	return (
		<button
			onClick={onClick}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				padding: '7px 11px',
				borderRadius: 8,
				background: active ? 'var(--card-2)' : 'transparent',
				border: '1px solid ' + (active ? 'var(--border)' : 'transparent'),
				color: 'var(--ink-2)',
				fontSize: 13,
				fontWeight: 500,
				cursor: 'pointer',
			}}
			onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-2)')}
			onMouseLeave={(e) => (e.currentTarget.style.background = active ? 'var(--card-2)' : 'transparent')}
		>
			<span style={{ color: 'var(--muted)', display: 'inline-flex' }}>{icon}</span>
			{label}
		</button>
	);
}

// Prompt text with @hero/@refN token highlighting (jp)
export function PromptText({ text, size = 12.5 }: { text?: string; size?: number }) {
	const parts = (text || '').split(/(@hero|@ref\d+)/g);
	return (
		<div className="mono" style={{ fontSize: size, lineHeight: 1.65, color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
			{parts.map((p, i) =>
				p === '@hero' ? (
					<Token key={i} kind="hero" label="@hero" size="sm" />
				) : /^@ref\d+$/.test(p) ? (
					<Token key={i} kind="ref" label={p} size="sm" />
				) : (
					<Fragment key={i}>{p}</Fragment>
				),
			)}
		</div>
	);
}

// Image drop / preview slot (Sp)
export function ImageSlot({
	src,
	onClick,
	onClear,
	onImage,
	size = 96,
	token,
	dashed,
	accent,
	palette,
	gradient,
}: {
	src?: string;
	label?: string;
	onClick?: () => void;
	onClear?: () => void;
	onImage?: (img: { src: string; name: string; size: number; type: string }) => void;
	size?: number;
	token?: string;
	dashed?: boolean;
	accent?: boolean;
	palette?: string[];
	gradient?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const readFile = (file?: File) => {
		if (!file || !file.type?.startsWith('image/')) return;
		const reader = new FileReader();
		reader.onload = () => onImage?.({ src: reader.result as string, name: file.name, size: file.size, type: file.type });
		reader.readAsDataURL(file);
	};
	const pick = () => inputRef.current?.click();
	const handleClick = () => (onImage ? pick() : onClick?.());
	const tc = token ? tokenColor(token) : null;
	const bgStyle: CSSProperties = src
		? { backgroundImage: `url("${src}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
		: gradient
			? { backgroundImage: gradient }
			: palette
				? { backgroundImage: `linear-gradient(135deg, ${palette[0]}, ${palette[1] || palette[0]})` }
				: tc
					? { background: tc.bg }
					: { background: 'var(--card-2)' };
	const borderColor = tc ? tc.border : accent ? 'var(--accent)' : 'var(--border)';
	return (
		<div
			onClick={handleClick}
			onDragOver={(e) => onImage && e.preventDefault()}
			onDrop={(e) => {
				if (onImage) {
					e.preventDefault();
					readFile(e.dataTransfer.files?.[0]);
				}
			}}
			style={{
				position: 'relative',
				width: size,
				height: size,
				borderRadius: 10,
				...bgStyle,
				border: `${dashed ? '1.5px dashed' : '1.5px solid'} ${borderColor}`,
				cursor: onClick || onImage ? 'pointer' : 'default',
				overflow: 'hidden',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
			}}
		>
			{onImage && (
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					hidden
					onClick={(e) => e.stopPropagation()}
					onChange={(e) => {
						readFile(e.target.files?.[0]);
						e.target.value = '';
					}}
				/>
			)}
			{!src && !palette && !gradient && (
				<span style={{ color: tc ? tc.fg : 'var(--faint)', display: 'inline-flex', opacity: tc ? 0.55 : 1 }}>{Icons.upload}</span>
			)}
			{token &&
				(() => {
					const c = tokenColor(token);
					return (
						<span
							className="mono"
							style={{ position: 'absolute', left: 6, bottom: 6, padding: '1px 6px', fontSize: 10.5, fontWeight: 500, background: c.fg, color: '#FFFEFB', borderRadius: 3, letterSpacing: '-0.01em', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
						>
							{token}
						</span>
					);
				})()}
			{src && onClear && (
				<button
					onClick={(e) => {
						e.stopPropagation();
						onClear();
					}}
					style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, background: 'rgba(31,26,20,0.7)', color: '#FFFEFB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1 }}
				>
					×
				</button>
			)}
		</div>
	);
}

// Segmented control (Oo)
export function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[] }) {
	return (
		<div style={{ display: 'inline-flex', padding: 3, background: 'var(--card-2)', borderRadius: 8, border: '1px solid var(--border-soft)' }}>
			{options.map((o) => {
				const v = typeof o === 'string' ? o : o.value;
				const lbl = typeof o === 'string' ? o : o.label;
				const active = value === v;
				return (
					<button
						key={v}
						onClick={() => onChange(v)}
						style={{ padding: '6px 12px', fontSize: 12.5, fontWeight: 500, color: active ? '#FFFEFB' : 'var(--ink-2)', background: active ? 'var(--ink)' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}
					>
						{lbl}
					</button>
				);
			})}
		</div>
	);
}

// Primary button (na)
export function PrimaryBtn({ children, onClick, icon, iconAfter, full, size = 'md', disabled }: { children?: ReactNode; onClick?: () => void; icon?: ReactNode; iconAfter?: ReactNode; full?: boolean; size?: 'md' | 'lg'; disabled?: boolean }) {
	const lg = size === 'lg';
	return (
		<button
			onClick={disabled ? undefined : onClick}
			disabled={disabled}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 8,
				padding: lg ? '10px 18px' : '8px 14px',
				fontSize: lg ? 14 : 13,
				fontWeight: 500,
				color: '#FFFEFB',
				background: 'var(--accent)',
				border: 'none',
				borderRadius: 8,
				cursor: disabled ? 'not-allowed' : 'pointer',
				boxShadow: '0 1px 0 rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.18)',
				width: full ? '100%' : 'auto',
				opacity: disabled ? 0.55 : 1,
			}}
			onMouseEnter={(e) => {
				if (!disabled) e.currentTarget.style.background = 'var(--accent-2)';
			}}
			onMouseLeave={(e) => {
				if (!disabled) e.currentTarget.style.background = 'var(--accent)';
			}}
		>
			{icon}
			{children}
			{iconAfter}
		</button>
	);
}

// Ghost / secondary button (id)
export function GhostBtn({ children, onClick, icon, iconAfter, full, size = 'md', danger, disabled }: { children?: ReactNode; onClick?: () => void; icon?: ReactNode; iconAfter?: ReactNode; full?: boolean; size?: 'md' | 'lg'; danger?: boolean; disabled?: boolean }) {
	const lg = size === 'lg';
	return (
		<button
			onClick={disabled ? undefined : onClick}
			disabled={disabled}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 8,
				padding: lg ? '10px 16px' : '8px 12px',
				fontSize: lg ? 14 : 13,
				fontWeight: 500,
				color: danger ? 'var(--accent)' : 'var(--ink)',
				background: 'var(--card)',
				border: '1px solid var(--border)',
				borderRadius: 8,
				cursor: disabled ? 'not-allowed' : 'pointer',
				width: full ? '100%' : 'auto',
				opacity: disabled ? 0.48 : 1,
			}}
			onMouseEnter={(e) => {
				if (!disabled) e.currentTarget.style.background = 'var(--card-2)';
			}}
			onMouseLeave={(e) => {
				if (!disabled) e.currentTarget.style.background = 'var(--card)';
			}}
		>
			{icon}
			{children}
			{iconAfter}
		</button>
	);
}

// Monospace input style for API-key fields (Ys)
export const monoInputStyle: CSSProperties = {
	width: '100%',
	padding: '8px 10px',
	fontSize: 13,
	border: '1px solid var(--border)',
	borderRadius: 6,
	background: 'var(--card)',
	outline: 'none',
	color: 'var(--ink)',
	fontFamily: "'JetBrains Mono', ui-monospace, monospace",
	boxSizing: 'border-box',
};

// The FramePick mark: a rounded filmstrip with a glowing center dot.
// Used in the header brand, the inbox, and (rasterized) as favicon/app icons.

export function FramePickLogo({ size = 22, tile = false }: { size?: number; tile?: boolean }) {
	const strip = (
		<g>
			<rect x="14" y="22" width="72" height="56" rx="12" fill="none" stroke="#0A84FF" strokeWidth="9" />
			<circle cx="50" cy="50" r="9.5" fill="url(#fpDot)" />
			<g fill="#0A84FF">
				<rect x="27" y="30.5" width="7" height="7" rx="2" />
				<rect x="46.5" y="30.5" width="7" height="7" rx="2" />
				<rect x="66" y="30.5" width="7" height="7" rx="2" />
				<rect x="27" y="62.5" width="7" height="7" rx="2" />
				<rect x="46.5" y="62.5" width="7" height="7" rx="2" />
				<rect x="66" y="62.5" width="7" height="7" rx="2" />
			</g>
		</g>
	);
	return (
		<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
			<defs>
				<radialGradient id="fpDot" cx="38%" cy="32%" r="80%">
					<stop offset="0%" stopColor="#CFE8FF" />
					<stop offset="55%" stopColor="#6FB6FF" />
					<stop offset="100%" stopColor="#0A84FF" />
				</radialGradient>
			</defs>
			{tile && <rect x="2" y="2" width="96" height="96" rx="24" fill="#101013" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" />}
			{strip}
		</svg>
	);
}

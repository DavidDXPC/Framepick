import { headerIcons as Icons } from '../lib/icons';
import { saveApiKeys } from '../state/persistence';
import { useModalA11y } from '../lib/a11y';
import type { ApiKeys } from '../state/types';
import { GhostBtn, monoInputStyle, PrimaryBtn, Row } from './ui';

export function ApiKeysModal({
	onClose,
	keys,
	setKeys,
}: {
	onClose: () => void;
	keys: ApiKeys;
	setKeys: (k: ApiKeys) => void;
}) {
	const dialogRef = useModalA11y<HTMLDivElement>(onClose);
	const onField = (field: keyof ApiKeys) => (e: React.ChangeEvent<HTMLInputElement>) => setKeys({ ...keys, [field]: e.target.value });
	const save = () => {
		saveApiKeys(keys);
		onClose();
	};
	return (
		<div
			onClick={onClose}
			style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(31,26,20,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="API keys"
				tabIndex={-1}
				ref={dialogRef}
				style={{ width: 'min(520px, 100%)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 24px 80px rgba(31,26,20,0.24)', overflow: 'hidden' }}
			>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border-soft)' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
						<span style={{ color: 'var(--accent)' }}>{Icons.key}</span>
						<span style={{ fontSize: 15, fontWeight: 650, color: 'var(--ink)' }}>API keys</span>
					</div>
					<button
						title="Close"
						onClick={onClose}
						style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
					>
						{Icons.close}
					</button>
				</div>
				<div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
					<Row
						label="OpenAI key"
						sub="Used for GPT-5.2 vision and GPT Image 2"
						control={<input type="password" value={keys.openai || ''} placeholder="sk-..." onChange={onField('openai')} style={monoInputStyle} />}
					/>
					<Row
						label="Anthropic key"
						sub="Fallback for Claude Sonnet vision/text"
						control={<input type="password" value={keys.anthropic || ''} placeholder="sk-ant-..." onChange={onField('anthropic')} style={monoInputStyle} />}
					/>
					<div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--muted)' }}>
						Keys are stored in this browser's localStorage. OpenAI is used first when both are saved.
					</div>
				</div>
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 18px', borderTop: '1px solid var(--border-soft)', background: 'var(--card-2)' }}>
					<GhostBtn
						onClick={() => {
							const cleared = { openai: '', anthropic: '' };
							setKeys(cleared);
							saveApiKeys(cleared);
						}}
					>
						Clear
					</GhostBtn>
					<PrimaryBtn onClick={save}>Save</PrimaryBtn>
				</div>
			</div>
		</div>
	);
}

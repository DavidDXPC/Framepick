import { useState } from 'react';
import { headerIcons as Icons } from '../lib/icons';
import { saveApiKeys } from '../state/persistence';
import { testKling } from '../lib/aiAssist';
import { useModalA11y } from '../lib/a11y';
import type { ApiKeys } from '../state/types';
import { GhostBtn, monoInputStyle, PrimaryBtn, Row } from './ui';

// Attributes that stop browser / password-manager autofill from silently
// overwriting an API-key field (a common cause of "invalid" credentials).
const noFill = { autoComplete: 'off', spellCheck: false, 'data-lpignore': 'true', 'data-1p-ignore': true, 'data-form-type': 'other' } as const;

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
	const onField = (field: keyof ApiKeys) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setKeys({ ...keys, [field]: e.target.value });
	const save = () => {
		saveApiKeys(keys);
		onClose();
	};

	// Kling key tester — runs the exact signing path the video generator uses.
	const [klingTest, setKlingTest] = useState<{ state: 'idle' | 'testing' | 'ok' | 'err'; msg?: string }>({ state: 'idle' });
	const runKlingTest = async () => {
		const ak = (keys.klingAccessKey || '').replace(/\s+/g, '');
		const sk = (keys.klingSecretKey || '').replace(/\s+/g, '');
		if (!ak || !sk) {
			setKlingTest({ state: 'err', msg: 'Enter both keys first' });
			return;
		}
		setKlingTest({ state: 'testing' });
		try {
			const res = await testKling(ak, sk);
			setKlingTest(res.ok ? { state: 'ok' } : { state: 'err', msg: res.error || 'Keys rejected' });
		} catch (e) {
			setKlingTest({ state: 'err', msg: (e as Error).message || 'Test failed' });
		}
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
						control={<input type="password" name="fp-openai-key" value={keys.openai || ''} placeholder="sk-..." onChange={onField('openai')} style={monoInputStyle} {...noFill} />}
					/>
					<Row
						label="Anthropic key"
						sub="Fallback for Claude Sonnet vision/text"
						control={<input type="password" name="fp-anthropic-key" value={keys.anthropic || ''} placeholder="sk-ant-..." onChange={onField('anthropic')} style={monoInputStyle} {...noFill} />}
					/>
					<div style={{ borderTop: '1px solid var(--border-soft)', margin: '2px 0' }} />
					<Row
						label="Kling Access Key"
						sub="Motion video (image → video). Create keys at kling.ai/dev/api-key"
						control={<input type="text" name="fp-kling-ak" value={keys.klingAccessKey || ''} placeholder="AK..." onChange={onField('klingAccessKey')} style={{ ...monoInputStyle, WebkitTextSecurity: 'disc' } as React.CSSProperties} {...noFill} />}
					/>
					<Row
						label="Kling Secret Key"
						sub="Paired with the Access Key; used to sign each request"
						control={<input type="text" name="fp-kling-sk" value={keys.klingSecretKey || ''} placeholder="SK..." onChange={onField('klingSecretKey')} style={{ ...monoInputStyle, WebkitTextSecurity: 'disc' } as React.CSSProperties} {...noFill} />}
					/>
					<Row
						label="Kling model"
						sub="Image-to-video model for the Generate video action"
						control={
							<select value={keys.klingModel || 'kling-v3'} onChange={onField('klingModel')} style={{ ...monoInputStyle, fontFamily: 'inherit' }}>
								<option value="kling-v3">Kling 3.0 (kling-v3)</option>
								<option value="kling-v2-6">Kling 2.6 (kling-v2-6)</option>
								<option value="kling-v2-5-turbo">Kling 2.5 Turbo (kling-v2-5-turbo)</option>
								<option value="kling-v2-1-master">Kling 2.1 Master (kling-v2-1-master)</option>
								<option value="kling-v1-6">Kling 1.6 (kling-v1-6)</option>
							</select>
						}
					/>
					<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
						<GhostBtn onClick={runKlingTest}>{klingTest.state === 'testing' ? 'Testing…' : 'Test Kling keys'}</GhostBtn>
						{klingTest.state === 'ok' && <span style={{ color: 'var(--success)', fontSize: 12.5, fontWeight: 600 }}>✓ Keys valid</span>}
						{klingTest.state === 'err' && <span style={{ color: 'var(--danger)', fontSize: 12.5 }}>{klingTest.msg}</span>}
					</div>
					<div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--muted)' }}>
						Keys are stored in this browser's localStorage and sent per-request to their provider only. OpenAI is used first when both vision keys are saved. <b>Tip:</b> if Kling video fails, click <b>Test Kling keys</b> — then re-paste any key it rejects.
					</div>
				</div>
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 18px', borderTop: '1px solid var(--border-soft)', background: 'var(--card-2)' }}>
					<GhostBtn
						onClick={() => {
							const cleared = { openai: '', anthropic: '', klingAccessKey: '', klingSecretKey: '', klingModel: 'kling-v3' };
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

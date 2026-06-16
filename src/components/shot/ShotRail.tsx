import { icons } from '../../lib/icons';
import type { Shot } from '../../state/types';

type Status = 'ready' | 'generating' | 'draft';

function shotStatus(shot: Shot): Status {
	if (shot.generating) return 'generating';
	if ((shot.images || []).length > 0) return 'ready';
	return 'draft';
}

// ShotRail — a slim left filmstrip of every shot. Clicking a thumb focuses that
// shot in the workspace; the active shot carries an accent outline. Hover reveals
// duplicate / delete. The dashed tile at the foot adds a new shot.
export function ShotRail({
	shots,
	activeId,
	onSelect,
	onAdd,
	onDuplicate,
	onDelete,
}: {
	shots: Shot[];
	activeId: string;
	onSelect: (id: string) => void;
	onAdd: () => void;
	onDuplicate: (shot: Shot) => void;
	onDelete: (shot: Shot) => void;
}) {
	return (
		<aside className="nf-rail" aria-label="Shots">
			<div className="nf-rail-head">Shots</div>
			{shots.map((shot) => {
				const status = shotStatus(shot);
				const thumb = shot.images?.[0]?.src;
				const hasMotion = !!(shot.motionRef?.frames?.length || shot.videoUrl);
				const label = shot.title?.trim() || `Shot ${String(shot.number).padStart(2, '0')}`;
				return (
					<div key={shot.id} className={'nf-rail-item' + (shot.id === activeId ? ' on' : '')}>
						<div
							className="nf-rail-thumb"
							role="button"
							tabIndex={0}
							title={label}
							aria-label={label}
							aria-pressed={shot.id === activeId}
							onClick={() => onSelect(shot.id)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onSelect(shot.id);
								}
							}}
						>
							{thumb ? <img src={thumb} alt="" /> : <span className="nf-rail-thumb-empty">{icons.image}</span>}
							<span className={'nf-rail-dot ' + status} title={status} />
							{hasMotion && (
								<span className="nf-rail-vid">
									<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" aria-hidden="true">
										<path d="M7 5v14l12-7Z" />
									</svg>
								</span>
							)}
							<span className="nf-rail-acts">
								<button
									type="button"
									className="nf-rail-act"
									title="Duplicate shot"
									onClick={(e) => {
										e.stopPropagation();
										onDuplicate(shot);
									}}
								>
									{icons.copy}
								</button>
								<button
									type="button"
									className="nf-rail-act danger"
									title="Delete shot"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(shot);
									}}
								>
									{icons.trash}
								</button>
							</span>
						</div>
						<span className="nf-rail-n">{String(shot.number).padStart(2, '0')}</span>
					</div>
				);
			})}
			<button type="button" className="nf-rail-add" onClick={onAdd} title="Add shot" aria-label="Add shot">
				{icons.plus}
			</button>
		</aside>
	);
}

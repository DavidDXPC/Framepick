import { useState } from 'react';
import { icons } from '../../lib/icons';
import type { Scene } from '../../state/types';

// ScenesSidebar (dh)
export function ScenesSidebar({
	scenes,
	selectedSceneId,
	onSelect,
	onAdd,
	onRename,
	onDelete,
}: {
	scenes: Scene[];
	selectedSceneId: string;
	onSelect: (id: string) => void;
	onAdd: () => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
}) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState('');
	return (
		<aside className="nf-scenes-panel">
			<div className="nf-scenes-header">
				<span>Scenes</span>
				<button type="button" className="nf-icon-button" title="Add scene" onClick={onAdd}>
					{icons.plus}
				</button>
			</div>
			<div className="nf-scenes-list">
				{scenes.map((scene) => (
					<div
						key={scene.id}
						className={`nf-scene-row ${scene.id === selectedSceneId ? 'active' : ''}`}
						onClick={() => onSelect(scene.id)}
						onDoubleClick={() => {
							setEditingId(scene.id);
							setDraft(scene.name);
						}}
						role="button"
						tabIndex={0}
						onKeyDown={(e) => {
							if (e.key === 'Enter') onSelect(scene.id);
						}}
					>
						<span className="nf-scene-icon">{icons.list}</span>
						{editingId === scene.id ? (
							<input
								autoFocus
								className="nf-scene-input"
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onClick={(e) => e.stopPropagation()}
								onBlur={() => {
									onRename(scene.id, draft.trim() || scene.name);
									setEditingId(null);
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										onRename(scene.id, draft.trim() || scene.name);
										setEditingId(null);
									}
									if (e.key === 'Escape') setEditingId(null);
								}}
							/>
						) : (
							<span className="nf-scene-name">{scene.name}</span>
						)}
						<span className="nf-scene-count">{scene.shots.length}</span>
						<button
							type="button"
							className="nf-scene-delete"
							title="Delete scene"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(scene.id);
							}}
						>
							{icons.x}
						</button>
					</div>
				))}
				{!scenes.length && <div className="nf-scenes-empty">No scenes yet.</div>}
			</div>
			<button type="button" className="nf-new-scene" onClick={onAdd}>
				{icons.plus}
				<span>New Scene</span>
			</button>
		</aside>
	);
}

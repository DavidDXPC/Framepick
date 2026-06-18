import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import './styles/theme-apple.css';
import './styles/studio-nframe.css';
import { StudioApp } from './studio/StudioApp';
import { installFramePickListener } from './lib/framepickBridge';

// Accept handoffs from the FramePick extension as soon as the app boots.
installFramePickListener();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<StudioApp />
	</StrictMode>,
);

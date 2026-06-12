import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App';
import { installFramePickListener } from './lib/framepickBridge';

// Accept handoffs from the FramePick extension as soon as the app boots.
installFramePickListener();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../panel/App';
import DevtoTestPanel from '../panel/DevtoTest';

function mountPanel() {
  if (document.getElementById('affilink-panel-root')) return;

  const container = document.createElement('div');
  container.id = 'affilink-panel-root';
  document.documentElement.appendChild(container);

  const root = createRoot(container);
  const isDevto = location.hostname === 'dev.to';
  root.render(
    <React.StrictMode>
      {isDevto ? <DevtoTestPanel /> : <App />}
    </React.StrictMode>
  );
}

// Wait for page to settle a bit
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPanel, { once: true });
} else {
  mountPanel();
}



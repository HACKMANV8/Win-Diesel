import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../panel/App';
import { linkProductsFromDevto } from '../lib/devtoDom';
import { isYouTubeUploadPage } from '../lib/youtubeDom';
import YouTubeTranscriptionPanel from '../panel/YouTubeTranscription';

function injectDevtoButton() {
  // Check if button already exists
  if (document.getElementById('devto-link-products-btn')) return;

  const button = document.createElement('button');
  button.id = 'devto-link-products-btn';
  button.textContent = 'Link products';
  button.type = 'button';
  
  // Fixed position in top right corner with high z-index
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #3b49df;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: background-color 0.2s, transform 0.1s;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = '#2f3ab2';
    button.style.transform = 'scale(1.05)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = '#3b49df';
    button.style.transform = 'scale(1)';
  });

  let isLoading = false;
  button.addEventListener('click', async () => {
    if (isLoading) return;
    
    isLoading = true;
    button.disabled = true;
    button.textContent = 'Processing...';
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';

    try {
      const result = await linkProductsFromDevto();
      
      // Brief success feedback
      if (result.success) {
        button.textContent = `✓ ${result.message}`;
        button.style.backgroundColor = '#00b894';
        setTimeout(() => {
          button.textContent = 'Link products';
          button.style.backgroundColor = '#3b49df';
        }, 2000);
      } else {
        button.textContent = '✗ Failed';
        button.style.backgroundColor = '#ef4444';
        setTimeout(() => {
          button.textContent = 'Link products';
          button.style.backgroundColor = '#3b49df';
        }, 2000);
      }
    } catch (error) {
      button.textContent = '✗ Error';
      button.style.backgroundColor = '#ef4444';
      setTimeout(() => {
        button.textContent = 'Link products';
        button.style.backgroundColor = '#3b49df';
      }, 2000);
    } finally {
      isLoading = false;
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  });

  // Append to body
  document.body.appendChild(button);
}

function mountYouTubePanel() {
  if (document.getElementById('youtube-transcription-panel-root')) {
    console.log('[YouTube Transcription] Panel already mounted');
    return;
  }

  console.log('[YouTube Transcription] Mounting panel on YouTube Studio');
  
  const container = document.createElement('div');
  container.id = 'youtube-transcription-panel-root';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <YouTubeTranscriptionPanel />
    </React.StrictMode>
  );
  
  console.log('[YouTube Transcription] Panel mounted successfully');
}

function mountPanel() {
  const isDevto = location.hostname === 'dev.to';
  const isYouTube = isYouTubeUploadPage();
  
  console.log('[Content Script] Page detection:', {
    hostname: location.hostname,
    pathname: location.pathname,
    isDevto,
    isYouTube
  });
  
  if (isDevto) {
    // For dev.to, inject button instead of React panel
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for dev.to to render
        setTimeout(injectDevtoButton, 300);
      }, { once: true });
    } else {
      setTimeout(injectDevtoButton, 300);
    }
  } else if (isYouTube) {
    // For YouTube Studio, inject transcription panel
    console.log('[Content Script] YouTube Studio detected, will mount panel');
    const mountWithRetry = (retries = 3) => {
      if (document.body && document.body.children.length > 0) {
        mountYouTubePanel();
      } else if (retries > 0) {
        console.log(`[Content Script] Body not ready, retrying in 500ms (${retries} retries left)`);
        setTimeout(() => mountWithRetry(retries - 1), 500);
      } else {
        console.error('[Content Script] Failed to mount panel after retries');
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => mountWithRetry(), 1000);
      }, { once: true });
    } else {
      setTimeout(() => mountWithRetry(), 1000);
    }
  } else {
    // For Medium, use React panel as before
    if (document.getElementById('affilink-panel-root')) return;

    const container = document.createElement('div');
    container.id = 'affilink-panel-root';
    document.documentElement.appendChild(container);

    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

// Wait for page to settle a bit
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPanel, { once: true });
} else {
  mountPanel();
}



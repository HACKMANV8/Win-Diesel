// Simple background service worker
console.log('🔧 Background service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed successfully');
});

// Handle any runtime errors
chrome.runtime.onStartup.addListener(() => {
    console.log('🚀 Extension started');
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request);
    
    if (request.action === 'transcribe') {
        // Handle transcription requests here if needed
        sendResponse({ success: true, message: 'Transcription initiated' });
    }
    
    return true; // Keep message channel open for async responses
});
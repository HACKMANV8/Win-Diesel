chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings if not present
  chrome.storage.sync.get({
    backendBaseUrl: '',
    affiliateTag: 'shivanshkaran-21',
    linkPolicy: 'first',
    doNotLink: [] as string[]
  }, (items) => {
    chrome.storage.sync.set(items);
  });
});

// Simple ping handler for health checks
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PING') {
    sendResponse({ ok: true });
  }
});



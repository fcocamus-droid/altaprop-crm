// Background service worker - handles API calls (bypasses page CSP)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'importProperty') {
    fetch('https://www.loginaltaprop.cl/api/import-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data),
    })
      .then(res => res.json())
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ error: err.message }));

    return true; // Keep channel open for async response
  }
});

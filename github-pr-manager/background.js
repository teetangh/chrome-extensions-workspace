// Background service worker for GitHub PR Manager
chrome.runtime.onInstalled.addListener(() => {
  console.log('GitHub PR Manager extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadPRReport') {
    handleDownloadReport(request.data, request.filename);
    sendResponse({ success: true });
  } else if (request.action === 'getPRData') {
    // This will be handled by content script
    sendResponse({ success: true });
  }
});

// Handle downloading the PR report
function handleDownloadReport(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: filename || 'github-pr-report.json',
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download failed:', chrome.runtime.lastError);
    } else {
      console.log('Download started with ID:', downloadId);
      // Clean up the object URL after download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Check if we're on a GitHub PR page
  if (tab.url && tab.url.includes('github.com') && tab.url.includes('/pull/')) {
    // Popup will handle the interaction
    console.log('On GitHub PR page');
  } else {
    // Show a notification that we need to be on a GitHub PR page
    console.log('Not on a GitHub PR page');
  }
}); 
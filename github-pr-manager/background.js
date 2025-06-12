// Background service worker for GitHub PR Manager
chrome.runtime.onInstalled.addListener(() => {
  console.log('GitHub PR Manager extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadPRReport') {
    handleDownloadReport(request.data, request.filename)
      .then(result => {
        sendResponse({ success: true, downloadId: result.downloadId });
      })
      .catch(error => {
        console.error('Download error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (request.action === 'getPRData') {
    // This will be handled by content script
    sendResponse({ success: true });
  }
});

// Handle downloading the PR report
async function handleDownloadReport(data, filename) {
  try {
    console.log('Starting download process...', filename);
    
    // Create JSON string with proper formatting
    const jsonString = JSON.stringify(data, null, 2);
    console.log('JSON data size:', jsonString.length);
    
    // Create blob
    const blob = new Blob([jsonString], { 
      type: 'application/json'
    });
    console.log('Blob created:', blob.size, 'bytes');
    
    // Create object URL
    const url = URL.createObjectURL(blob);
    console.log('Object URL created:', url);
    
    // Generate safe filename
    const safeFilename = filename ? filename.replace(/[^a-z0-9.-]/gi, '_') : 'github-pr-report.json';
    console.log('Using filename:', safeFilename);
    
    // Attempt download
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: url,
        filename: safeFilename,
        saveAs: true,
        conflictAction: 'uniquify'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome download error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log('Download initiated successfully with ID:', downloadId);
          resolve(downloadId);
        }
      });
    });
    
    // Clean up the object URL after a delay
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
        console.log('Object URL cleaned up');
      } catch (e) {
        console.warn('Failed to revoke object URL:', e);
      }
    }, 5000);
    
    return { downloadId, success: true };
    
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
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

// Add debugging for download events
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('Download created:', downloadItem);
});

chrome.downloads.onChanged.addListener((delta) => {
  console.log('Download changed:', delta);
  if (delta.error) {
    console.error('Download error occurred:', delta.error);
  }
});

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  console.log('Determining filename for:', downloadItem);
  suggest();
}); 
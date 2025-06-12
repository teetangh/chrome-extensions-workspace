// Background service worker for GitHub PR Manager
chrome.runtime.onInstalled.addListener(() => {
  console.log('GitHub PR Manager extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);
  
  if (request.action === 'download' || request.action === 'downloadPRReport') {
    // Return true to indicate we will send a response asynchronously
    downloadPRData(request.data, request.filename)
      .then((downloadId) => {
        console.log('Download successful, ID:', downloadId);
        sendResponse({ success: true, downloadId: downloadId });
      })
      .catch((error) => {
        console.error('Download error details:', error);
        // Better error serialization
        const errorMessage = error.message || error.toString() || 'Unknown download error';
        const errorDetails = {
          message: errorMessage,
          name: error.name,
          stack: error.stack
        };
        console.error('Serialized error:', errorDetails);
        sendResponse({ success: false, error: errorMessage, details: errorDetails });
      });
    
    // Return true to keep the message channel open for async response
    return true;
  } else if (request.action === 'getPRData') {
    // This will be handled by content script
    sendResponse({ success: true });
  }
});

// Function to handle downloads in Manifest V3
async function downloadPRData(data, filename) {
  try {
    console.log('Starting download process...');
    console.log('Filename:', filename);
    console.log('Data size:', JSON.stringify(data).length, 'characters');
    
    // Validate inputs
    if (!data) {
      throw new Error('No data provided for download');
    }
    
    if (!filename) {
      filename = 'github-pr-data.json';
    }
    
    // Convert data to JSON string
    const jsonString = JSON.stringify(data, null, 2);
    console.log('JSON string created, length:', jsonString.length);
    
    // Create data URL with proper encoding
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
    console.log('Data URL created, length:', dataUrl.length);
    
    // Check if data URL is too large (Chrome has limits)
    if (dataUrl.length > 2 * 1024 * 1024) { // 2MB limit
      throw new Error('Data too large for download (>2MB). Try reducing the amount of data.');
    }
    
    // Use chrome.downloads API to download the file
    console.log('Initiating chrome.downloads.download...');
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log('Download initiated successfully with ID:', downloadId);
          resolve(downloadId);
        }
      });
    });
    
    return downloadId;
    
  } catch (error) {
    console.error('downloadPRData error:', error);
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
    // Try to get more details about the error
    if (typeof delta.error === 'object') {
      console.error('Error details:', JSON.stringify(delta.error, null, 2));
    }
  }
  if (delta.state && delta.state.current === 'complete') {
    console.log('Download completed successfully');
  }
});

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  console.log('Determining filename for:', downloadItem);
  suggest();
}); 
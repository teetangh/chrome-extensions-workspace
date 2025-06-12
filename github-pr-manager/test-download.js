// Simple test for download functionality
// Run this in the browser console on a GitHub PR page to test

console.log('Testing GitHub PR Manager download functionality...');

// Test data
const testData = {
  pullRequest: {
    number: 123,
    title: "Test PR",
    author: "testuser",
    state: "open"
  },
  comments: [
    {
      id: "test-comment-1",
      author: "reviewer1",
      body: "This looks good!",
      filePath: "src/test.js",
      lineNumber: 42
    }
  ],
  files: [
    {
      filename: "src/test.js",
      status: "modified",
      additions: 5,
      deletions: 2
    }
  ]
};

// Test background script communication
chrome.runtime.sendMessage({
  action: 'downloadPRReport',
  data: testData,
  filename: 'test-download.json'
}, (response) => {
  console.log('Test download response:', response);
  
  if (chrome.runtime.lastError) {
    console.error('Chrome runtime error:', chrome.runtime.lastError);
  }
  
  if (response) {
    if (response.success) {
      console.log('✅ Test download successful!');
    } else {
      console.error('❌ Test download failed:', response.error);
      if (response.details) {
        console.error('Error details:', response.details);
      }
    }
  } else {
    console.error('❌ No response received from background script');
  }
});

console.log('Test message sent to background script...'); 
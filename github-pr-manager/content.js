// Content script for GitHub PR Manager
console.log('GitHub PR Manager content script loaded');

class GitHubPRExtractor {
  constructor() {
    this.prData = {
      url: window.location.href,
      extractedAt: new Date().toISOString(),
      pullRequest: {},
      files: [],
      comments: [],
      reviews: []
    };
  }

  // Extract basic PR information
  extractPRInfo() {
    const prTitle = document.querySelector('h1.gh-header-title .js-issue-title')?.textContent?.trim();
    const prNumber = window.location.href.match(/\/pull\/(\d+)/)?.[1];
    const prState = document.querySelector('.State')?.textContent?.trim();
    const author = document.querySelector('.author')?.textContent?.trim();
    
    // Extract PR description
    const description = document.querySelector('.js-comment-body p')?.textContent?.trim() || '';
    
    // Extract branch information
    const baseBranch = document.querySelector('.base-ref')?.textContent?.trim();
    const headBranch = document.querySelector('.head-ref')?.textContent?.trim();
    
    // Extract labels
    const labels = Array.from(document.querySelectorAll('.js-issue-labels .IssueLabel'))
      .map(label => ({
        name: label.textContent.trim(),
        color: label.style.backgroundColor
      }));

    this.prData.pullRequest = {
      number: prNumber,
      title: prTitle,
      state: prState,
      author: author,
      description: description,
      baseBranch: baseBranch,
      headBranch: headBranch,
      labels: labels,
      createdAt: this.extractDate('.js-timestamp'),
      updatedAt: this.extractDate('.js-timestamp:last-child')
    };
  }

  // Extract file changes
  extractFiles() {
    const fileElements = document.querySelectorAll('.file-header[data-path]');
    
    fileElements.forEach(fileElement => {
      const filePath = fileElement.getAttribute('data-path');
      const fileStats = fileElement.querySelector('.file-info');
      const additions = fileStats?.textContent?.match(/\+(\d+)/)?.[1] || '0';
      const deletions = fileStats?.textContent?.match(/-(\d+)/)?.[1] || '0';
      
      // Get file type/extension
      const extension = filePath.split('.').pop() || '';
      
      // Extract file content changes (if visible)
      const fileBody = fileElement.parentElement.querySelector('.js-file-content');
      const changes = this.extractFileChanges(fileBody);
      
      this.prData.files.push({
        path: filePath,
        extension: extension,
        additions: parseInt(additions),
        deletions: parseInt(deletions),
        changes: changes
      });
    });
  }

  // Extract file changes (additions/deletions)
  extractFileChanges(fileBody) {
    if (!fileBody) return [];
    
    const changes = [];
    const codeRows = fileBody.querySelectorAll('tr');
    
    codeRows.forEach(row => {
      const lineNumber = row.querySelector('.js-line-number')?.textContent?.trim();
      const changeType = row.classList.contains('blob-addition') ? 'addition' : 
                        row.classList.contains('blob-deletion') ? 'deletion' : 'context';
      const content = row.querySelector('.blob-code-inner')?.textContent || '';
      
      if (lineNumber && (changeType === 'addition' || changeType === 'deletion')) {
        changes.push({
          lineNumber: parseInt(lineNumber),
          type: changeType,
          content: content
        });
      }
    });
    
    return changes;
  }

  // Extract comments (including inline comments)
  extractComments() {
    console.log('Starting comment extraction...');
    
    // Method 1: Extract review comments from the Files changed tab
    this.extractReviewComments();
    
    // Method 2: Extract general timeline comments
    this.extractTimelineComments();
    
    // Method 3: Extract inline diff comments
    this.extractInlineDiffComments();
    
    console.log(`Total comments extracted: ${this.prData.comments.length}`);
  }

  // Extract review comments from Files changed tab
  extractReviewComments() {
    // Look for review comments in the Files changed tab
    const reviewComments = document.querySelectorAll('[data-review-comment-id], .js-comment-container, .review-comment');
    
    reviewComments.forEach(comment => {
      const commentId = comment.getAttribute('data-review-comment-id') || 
                       comment.getAttribute('id') || 
                       `review-comment-${Date.now()}-${Math.random()}`;
      
      const author = this.extractAuthor(comment);
      const timestamp = this.extractTimestamp(comment);
      const body = this.extractCommentBody(comment);
      
      // Extract file context with enhanced methods
      const { filePath, lineNumber } = this.extractFileContextEnhanced(comment);
      
      if (body) {
        this.prData.comments.push({
          id: commentId,
          type: 'review',
          author: author,
          timestamp: timestamp,
          body: body,
          filePath: filePath,
          lineNumber: lineNumber
        });
      }
    });
  }

  // Extract timeline comments from Conversation tab
  extractTimelineComments() {
    const timelineComments = document.querySelectorAll('.js-timeline-item .js-comment, .timeline-comment');
    
    timelineComments.forEach(comment => {
      const commentId = comment.closest('[id]')?.getAttribute('id') || 
                       `timeline-comment-${Date.now()}-${Math.random()}`;
      
      const author = this.extractAuthor(comment);
      const timestamp = this.extractTimestamp(comment);
      const body = this.extractCommentBody(comment);
      
      if (body) {
        this.prData.comments.push({
          id: commentId,
          type: 'general',
          author: author,
          timestamp: timestamp,
          body: body,
          filePath: null, // Timeline comments don't have file context
          lineNumber: null
        });
      }
    });
  }

  // Extract inline diff comments
  extractInlineDiffComments() {
    // Look for comments in diff tables
    const diffComments = document.querySelectorAll('tr.js-inline-comments-container, .inline-comments, [data-path] .js-comment');
    
    diffComments.forEach(comment => {
      const commentId = comment.getAttribute('id') || 
                       `diff-comment-${Date.now()}-${Math.random()}`;
      
      const author = this.extractAuthor(comment);
      const timestamp = this.extractTimestamp(comment);
      const body = this.extractCommentBody(comment);
      
      // Extract file context for diff comments
      const { filePath, lineNumber } = this.extractFileContextEnhanced(comment);
      
      if (body) {
        this.prData.comments.push({
          id: commentId,
          type: 'inline',
          author: author,
          timestamp: timestamp,
          body: body,
          filePath: filePath,
          lineNumber: lineNumber
        });
      }
    });
  }

  // Enhanced file context extraction
  extractFileContextEnhanced(element) {
    let filePath = null;
    let lineNumber = null;
    
    try {
      // Method 1: Look for data-path attribute in parent elements
      let current = element;
      while (current && current !== document.body) {
        if (current.hasAttribute('data-path')) {
          filePath = current.getAttribute('data-path');
          break;
        }
        current = current.parentElement;
      }
      
      // Method 2: Look for file header with data-path
      if (!filePath) {
        const fileHeader = element.closest('.file') || 
                          element.closest('[data-path]') ||
                          element.querySelector('[data-path]');
        if (fileHeader) {
          filePath = fileHeader.getAttribute('data-path') || 
                    fileHeader.dataset.path;
        }
      }
      
      // Method 3: Look for file path in nearby elements
      if (!filePath) {
        const pathElement = element.closest('.file-header') ||
                           element.querySelector('.file-header') ||
                           element.closest('[data-testid="file-diff-header"]');
        if (pathElement) {
          const pathText = pathElement.querySelector('[title]')?.getAttribute('title') ||
                          pathElement.querySelector('a')?.textContent ||
                          pathElement.textContent;
          if (pathText && pathText.includes('/') || pathText.includes('.')) {
            filePath = pathText.trim();
          }
        }
      }
      
      // Method 4: Extract from URL or link
      if (!filePath) {
        const linkElement = element.querySelector('a[href*="#diff-"]') ||
                           element.closest('a[href*="#diff-"]');
        if (linkElement) {
          const href = linkElement.getAttribute('href');
          const match = href.match(/\/([^\/]+\.[^\/]+)#/);
          if (match) {
            filePath = match[1];
          }
        }
      }
      
      // Line number extraction methods
      // Method 1: Direct data-line-number attribute
      const lineElement = element.querySelector('[data-line-number]') ||
                         element.closest('[data-line-number]');
      if (lineElement) {
        const lineAttr = lineElement.getAttribute('data-line-number');
        if (lineAttr && lineAttr !== '0') {
          lineNumber = parseInt(lineAttr, 10);
        }
      }
      
      // Method 2: Look for line number in table cells
      if (!lineNumber) {
        const lineCell = element.querySelector('.js-line-number, .blob-num') ||
                        element.closest('tr')?.querySelector('.js-line-number, .blob-num');
        if (lineCell) {
          const lineText = lineCell.textContent.trim();
          const parsed = parseInt(lineText, 10);
          if (!isNaN(parsed) && parsed > 0) {
            lineNumber = parsed;
          }
        }
      }
      
      // Method 3: Extract from permalink or anchor
      if (!lineNumber) {
        const permalink = element.querySelector('a[href*="#L"]') ||
                         element.closest('a[href*="#L"]');
        if (permalink) {
          const href = permalink.getAttribute('href');
          const match = href.match(/#L(\d+)/);
          if (match) {
            lineNumber = parseInt(match[1], 10);
          }
        }
      }
      
      // Method 4: Look for line number in comment metadata
      if (!lineNumber) {
        const metadataElement = element.querySelector('.js-comment-header, .comment-header') ||
                               element.closest('.js-comment-header, .comment-header');
        if (metadataElement) {
          const lineText = metadataElement.textContent;
          const match = lineText.match(/line\s+(\d+)/i);
          if (match) {
            lineNumber = parseInt(match[1], 10);
          }
        }
      }
      
      // Method 5: Look in parent table row for line context
      if (!lineNumber) {
        const tableRow = element.closest('tr');
        if (tableRow) {
          const lineNumberCell = tableRow.querySelector('td[data-line-number], .blob-num-addition, .blob-num-deletion');
          if (lineNumberCell) {
            const lineAttr = lineNumberCell.getAttribute('data-line-number') ||
                            lineNumberCell.textContent.trim();
            const parsed = parseInt(lineAttr, 10);
            if (!isNaN(parsed) && parsed > 0) {
              lineNumber = parsed;
            }
          }
        }
      }
      
    } catch (error) {
      console.warn('Error extracting file context:', error);
    }
    
    return { filePath, lineNumber };
  }

  // Helper method to extract author
  extractAuthor(element) {
    const authorElement = element.querySelector('.author, .js-discussion-author, [data-hovercard-type="user"]') ||
                         element.querySelector('a[href^="/"]') ||
                         element.querySelector('.timeline-comment-header strong');
    return authorElement?.textContent?.trim() || 'Unknown';
  }

  // Helper method to extract timestamp
  extractTimestamp(element) {
    const timeElement = element.querySelector('.js-timestamp, time, [datetime]') ||
                       element.querySelector('relative-time');
    return timeElement?.getAttribute('datetime') || 
           timeElement?.getAttribute('title') ||
           timeElement?.textContent?.trim() ||
           null;
  }

  // Helper method to extract comment body
  extractCommentBody(element) {
    const bodyElement = element.querySelector('.js-comment-body, .comment-body, .js-comment-text') ||
                       element.querySelector('.markdown-body') ||
                       element.querySelector('p, div');
    return bodyElement?.textContent?.trim() || null;
  }

  // Extract reviews
  extractReviews() {
    const reviewElements = document.querySelectorAll('.js-timeline-item[data-review-state]');
    
    reviewElements.forEach(reviewElement => {
      const reviewState = reviewElement.getAttribute('data-review-state');
      const reviewer = reviewElement.querySelector('.author')?.textContent?.trim();
      const timestamp = reviewElement.querySelector('.js-timestamp')?.getAttribute('datetime');
      const reviewBody = reviewElement.querySelector('.js-comment-body')?.textContent?.trim();
      
      // Get review comments count
      const commentsCount = reviewElement.querySelectorAll('.js-comment').length;
      
      this.prData.reviews.push({
        reviewer: reviewer,
        state: reviewState,
        timestamp: timestamp,
        body: reviewBody,
        commentsCount: commentsCount
      });
    });
  }

  // Helper function to extract dates
  extractDate(selector) {
    const element = document.querySelector(selector);
    return element?.getAttribute('datetime') || element?.textContent?.trim();
  }

  // Main extraction method
  async extractAllData() {
    console.log('Starting PR data extraction...');
    
    try {
      this.extractPRInfo();
      this.extractFiles();
      this.extractComments();
      this.extractReviews();
      
      console.log('PR data extraction completed:', this.prData);
      return this.prData;
    } catch (error) {
      console.error('Error extracting PR data:', error);
      throw error;
    }
  }

  // Download PR data
  downloadData() {
    const filename = `github-pr-${this.prData.number}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    
    console.log('Attempting to download PR data...');
    
    // Try background script download first
    chrome.runtime.sendMessage({
      action: 'download',
      data: this.prData,
      filename: filename
    }, (response) => {
      // Check if there was an error in the message passing
      if (chrome.runtime.lastError) {
        console.error('Message passing error:', chrome.runtime.lastError);
        this.handleFallbackDownload(this.prData, filename);
        return;
      }
      
      // Check if response exists and has success property
      if (!response) {
        console.error('No response received from background script');
        this.handleFallbackDownload(this.prData, filename);
        return;
      }
      
      if (response.success) {
        console.log('Download initiated successfully via background script');
        this.showStatus('Download started successfully!', 'success');
      } else {
        console.error('Service worker download failed:', response.error);
        console.log('Trying fallback download method...');
        this.handleFallbackDownload(this.prData, filename);
      }
    });
  }

  // Fallback download method for content script
  handleFallbackDownload(data, filename) {
    try {
      console.log('Using fallback download method...');
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'github-pr-data.json';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log('Fallback download completed successfully');
      this.showStatus('Download completed via fallback method!', 'success');
    } catch (error) {
      console.error('Fallback download failed:', error);
      this.showStatus('Download failed: ' + error.message, 'error');
    }
  }

  // Show status message to user
  showStatus(message, type = 'info') {
    console.log(`Status (${type}): ${message}`);
    
    // Create a temporary status element
    const statusDiv = document.createElement('div');
    statusDiv.textContent = message;
    statusDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 15px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      max-width: 300px;
      ${type === 'success' ? 'background-color: #28a745;' : 
        type === 'error' ? 'background-color: #dc3545;' : 
        'background-color: #007bff;'}
    `;
    
    document.body.appendChild(statusDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 3000);
  }
}

// Message listener for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPRData') {
    const extractor = new GitHubPRExtractor();
    extractor.extractAllData()
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

// Auto-extract data when page loads (optional)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('GitHub PR page loaded');
  });
} else {
  console.log('GitHub PR page already loaded');
} 
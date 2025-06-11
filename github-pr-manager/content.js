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
    // General comments
    const generalComments = document.querySelectorAll('.js-timeline-item .js-comment');
    
    generalComments.forEach(comment => {
      const author = comment.querySelector('.author')?.textContent?.trim();
      const timestamp = comment.querySelector('.js-timestamp')?.getAttribute('datetime');
      const body = comment.querySelector('.js-comment-body')?.textContent?.trim();
      const commentId = comment.closest('[id]')?.getAttribute('id');
      
      this.prData.comments.push({
        id: commentId,
        type: 'general',
        author: author,
        timestamp: timestamp,
        body: body,
        lineNumber: null,
        filePath: null
      });
    });

    // Inline comments on code
    const inlineComments = document.querySelectorAll('.js-inline-comments .js-comment');
    
    inlineComments.forEach(comment => {
      const author = comment.querySelector('.author')?.textContent?.trim();
      const timestamp = comment.querySelector('.js-timestamp')?.getAttribute('datetime');
      const body = comment.querySelector('.js-comment-body')?.textContent?.trim();
      const commentId = comment.closest('[id]')?.getAttribute('id');
      
      // Try to get file path and line number from context
      const diffRow = comment.closest('tr[data-line-number]');
      const lineNumber = diffRow?.getAttribute('data-line-number');
      const fileHeader = comment.closest('.file').querySelector('[data-path]');
      const filePath = fileHeader?.getAttribute('data-path');
      
      this.prData.comments.push({
        id: commentId,
        type: 'inline',
        author: author,
        timestamp: timestamp,
        body: body,
        lineNumber: lineNumber ? parseInt(lineNumber) : null,
        filePath: filePath
      });
    });
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
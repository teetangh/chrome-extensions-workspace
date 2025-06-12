// Popup script for GitHub PR Manager
console.log('GitHub PR Manager popup loaded');

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.extractedData = null;
    this.isGitHubPRPage = false;
    
    this.initElements();
    this.attachEventListeners();
    this.checkCurrentPage();
  }

  initElements() {
    // Status elements
    this.statusIndicator = document.getElementById('status');
    this.statusText = document.getElementById('status-text');
    
    // Page info elements
    this.pageUrlElement = document.getElementById('page-url');
    
    // Action buttons
    this.extractBtn = document.getElementById('extract-btn');
    this.downloadBtn = document.getElementById('download-btn');
    
    // Options
    this.includeFileChanges = document.getElementById('include-file-changes');
    this.includeInlineComments = document.getElementById('include-inline-comments');
    this.formatJson = document.getElementById('format-json');
    
    // Preview elements
    this.previewSection = document.getElementById('preview-section');
    this.filesCount = document.getElementById('files-count');
    this.commentsCount = document.getElementById('comments-count');
    this.reviewsCount = document.getElementById('reviews-count');
  }

  attachEventListeners() {
    this.extractBtn.addEventListener('click', () => this.extractPRData());
    this.downloadBtn.addEventListener('click', () => this.downloadReport());
    
    // Options change handlers
    this.includeFileChanges.addEventListener('change', () => this.saveOptions());
    this.includeInlineComments.addEventListener('change', () => this.saveOptions());
    this.formatJson.addEventListener('change', () => this.saveOptions());
  }

  async checkCurrentPage() {
    try {
      this.updateStatus('detecting', 'Checking current page...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      if (tab.url) {
        this.pageUrlElement.textContent = this.truncateUrl(tab.url);
        this.isGitHubPRPage = this.isValidGitHubPRUrl(tab.url);
        
        if (this.isGitHubPRPage) {
          this.updateStatus('ready', 'Ready to extract PR data');
          this.extractBtn.disabled = false;
        } else {
          this.updateStatus('error', 'Not a GitHub PR page');
          this.extractBtn.disabled = true;
          this.pageUrlElement.textContent = 'Please navigate to a GitHub pull request';
        }
      } else {
        this.updateStatus('error', 'Cannot access current page');
        this.extractBtn.disabled = true;
      }
    } catch (error) {
      console.error('Error checking current page:', error);
      this.updateStatus('error', 'Error detecting page');
      this.extractBtn.disabled = true;
    }
  }

  isValidGitHubPRUrl(url) {
    const githubPRPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/;
    return githubPRPattern.test(url);
  }

  truncateUrl(url, maxLength = 40) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }

  updateStatus(type, message) {
    this.statusIndicator.className = `status-indicator ${type}`;
    this.statusText.textContent = message;
  }

  async extractPRData() {
    try {
      this.updateStatus('extracting', 'Extracting PR data...');
      this.extractBtn.disabled = true;
      this.extractBtn.classList.add('loading');
      
      // Send message to content script to extract data
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractPRData'
      });
      
      if (response.success) {
        this.extractedData = response.data;
        this.updateStatus('ready', 'Data extracted successfully');
        this.showPreview(this.extractedData);
        this.downloadBtn.disabled = false;
      } else {
        throw new Error(response.error || 'Failed to extract data');
      }
    } catch (error) {
      console.error('Error extracting PR data:', error);
      this.updateStatus('error', 'Extraction failed');
      this.showErrorMessage('Failed to extract PR data. Please make sure the page is fully loaded.');
    } finally {
      this.extractBtn.disabled = false;
      this.extractBtn.classList.remove('loading');
    }
  }

  showPreview(data) {
    // Update preview counts
    this.filesCount.textContent = data.files?.length || 0;
    this.commentsCount.textContent = data.comments?.length || 0;
    this.reviewsCount.textContent = data.reviews?.length || 0;
    
    // Show preview section
    this.previewSection.style.display = 'block';
  }

  async downloadReport() {
    try {
      if (!this.extractedData) {
        throw new Error('No data to download');
      }

      this.updateStatus('extracting', 'Preparing download...');
      this.downloadBtn.disabled = true;
      this.downloadBtn.classList.add('loading');
      
      // Apply user options to filter data
      const filteredData = this.applyUserOptions(this.extractedData);
      
      // Generate filename
      const prNumber = filteredData.pullRequest?.number || 'unknown';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `github-pr-${prNumber}-${timestamp}.json`;
      
      console.log('Initiating download with filename:', filename);
      
      try {
        // Try service worker download first
        const response = await chrome.runtime.sendMessage({
          action: 'downloadPRReport',
          data: filteredData,
          filename: filename
        });
        
        if (response.success) {
          this.updateStatus('ready', `Download started (ID: ${response.downloadId})`);
          console.log('Download successful with ID:', response.downloadId);
          
          // Show success message for a moment
          setTimeout(() => {
            this.updateStatus('ready', 'Ready for next extraction');
          }, 3000);
        } else {
          throw new Error(response.error || 'Service worker download failed');
        }
      } catch (serviceWorkerError) {
        console.warn('Service worker download failed, trying fallback:', serviceWorkerError);
        
        // Fallback: Download directly from popup
        this.updateStatus('extracting', 'Using fallback download...');
        await this.downloadReportFallback(filteredData, filename);
        
        this.updateStatus('ready', 'Download completed (fallback method)');
        setTimeout(() => {
          this.updateStatus('ready', 'Ready for next extraction');
        }, 3000);
      }
      
    } catch (error) {
      console.error('Error downloading report:', error);
      this.updateStatus('error', `Download failed: ${error.message}`);
      this.showErrorMessage(`Failed to download report: ${error.message}`);
    } finally {
      this.downloadBtn.disabled = false;
      this.downloadBtn.classList.remove('loading');
    }
  }

  // Fallback download method that works directly in popup context
  async downloadReportFallback(data, filename) {
    try {
      // Create JSON blob
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('Fallback download completed');
    } catch (error) {
      console.error('Fallback download failed:', error);
      throw new Error(`Fallback download failed: ${error.message}`);
    }
  }

  applyUserOptions(data) {
    const filteredData = { ...data };
    
    // Apply file changes filter
    if (!this.includeFileChanges.checked && filteredData.files) {
      filteredData.files = filteredData.files.map(file => ({
        ...file,
        changes: [] // Remove detailed changes
      }));
    }
    
    // Apply inline comments filter
    if (!this.includeInlineComments.checked && filteredData.comments) {
      filteredData.comments = filteredData.comments.filter(comment => 
        comment.type !== 'inline'
      );
    }
    
    return filteredData;
  }

  showErrorMessage(message) {
    // You could implement a toast notification or modal here
    console.error(message);
    
    // Update status to show error for longer
    setTimeout(() => {
      if (this.statusText.textContent.includes('failed')) {
        this.updateStatus('ready', 'Ready for next extraction');
      }
    }, 5000);
  }

  async saveOptions() {
    const options = {
      includeFileChanges: this.includeFileChanges.checked,
      includeInlineComments: this.includeInlineComments.checked,
      formatJson: this.formatJson.checked
    };
    
    await chrome.storage.sync.set({ options });
  }

  async loadOptions() {
    try {
      const { options } = await chrome.storage.sync.get('options');
      if (options) {
        this.includeFileChanges.checked = options.includeFileChanges ?? true;
        this.includeInlineComments.checked = options.includeInlineComments ?? true;
        this.formatJson.checked = options.formatJson ?? true;
      }
    } catch (error) {
      console.error('Error loading options:', error);
    }
  }
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getRepoInfoFromUrl(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      prNumber: match[3]
    };
  }
  return null;
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupManager();
  popup.loadOptions();
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    // Refresh the popup state when tab is updated
    setTimeout(() => {
      if (window.popup) {
        window.popup.checkCurrentPage();
      }
    }, 1000);
  }
}); 
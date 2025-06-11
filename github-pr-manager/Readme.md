# GitHub PR Manager Chrome Extension

A powerful Chrome extension for extracting and downloading comprehensive JSON reports of GitHub pull requests, including file changes, comments, reviews, and metadata.

## Features

- 📊 **Complete PR Data Extraction**: Extract all PR metadata, file changes, comments, and reviews
- 💾 **JSON Report Download**: Download structured JSON reports with customizable options
- 🎯 **Smart Detection**: Automatically detects GitHub PR pages and enables functionality
- 🔧 **Customizable Options**: Choose what data to include in your reports
- 🚀 **Modern UI**: Clean, responsive interface following GitHub's design language
- ⚡ **Manifest V3**: Built with the latest Chrome extension standards

## What Data is Extracted

### Pull Request Metadata
- PR number, title, state, and description
- Author information and timestamps
- Base and head branch information
- Labels and their colors
- Creation and update dates

### File Changes
- File paths and extensions
- Addition and deletion counts
- Line-by-line changes (additions/deletions)
- File type classification

### Comments
- General PR comments with timestamps and authors
- Inline code comments with file paths and line numbers
- Comment IDs for tracking and reference

### Reviews
- Review states (approved, changes requested, etc.)
- Reviewer information and timestamps
- Review bodies and comment counts

## Installation

### From Source (Development)

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `github-pr-manager` folder
5. The extension will appear in your Chrome toolbar

### Icon Requirements

Before loading the extension, you'll need to add actual PNG icon files to the `icons/` directory:
- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create these icons using design tools like GIMP, Photoshop, or online icon generators.

## Usage

1. **Navigate to a GitHub Pull Request**: Open any GitHub PR page (e.g., `https://github.com/owner/repo/pull/123`)

2. **Open the Extension**: Click the GitHub PR Manager icon in your Chrome toolbar

3. **Extract Data**: Click the "Extract PR Data" button to analyze the current PR

4. **Review Data**: Check the data preview showing counts of files, comments, and reviews

5. **Customize Options** (optional):
   - Toggle "Include file changes" to control detailed line-by-line changes
   - Toggle "Include inline comments" to include/exclude code review comments
   - Toggle "Format JSON output" for pretty-printed JSON

6. **Download Report**: Click "Download Report" to save the JSON file

## Output Format

The generated JSON report has the following structure:

```json
{
  "url": "https://github.com/owner/repo/pull/123",
  "extractedAt": "2024-01-01T12:00:00.000Z",
  "pullRequest": {
    "number": "123",
    "title": "Add new feature",
    "state": "open",
    "author": "username",
    "description": "PR description...",
    "baseBranch": "main",
    "headBranch": "feature-branch",
    "labels": [...],
    "createdAt": "...",
    "updatedAt": "..."
  },
  "files": [
    {
      "path": "src/component.js",
      "extension": "js",
      "additions": 15,
      "deletions": 3,
      "changes": [
        {
          "lineNumber": 42,
          "type": "addition",
          "content": "+ console.log('new feature');"
        }
      ]
    }
  ],
  "comments": [
    {
      "id": "comment-id",
      "type": "general|inline",
      "author": "reviewer",
      "timestamp": "...",
      "body": "Comment text...",
      "lineNumber": null,
      "filePath": null
    }
  ],
  "reviews": [
    {
      "reviewer": "reviewer-name",
      "state": "approved",
      "timestamp": "...",
      "body": "Review comment...",
      "commentsCount": 3
    }
  ]
}
```

## File Structure

```
github-pr-manager/
├── manifest.json          # Extension configuration
├── background.js           # Service worker for downloads
├── content.js             # PR data extraction logic
├── popup/
│   ├── popup.html         # Extension popup interface
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup interaction logic
├── icons/
│   ├── icon16.png         # 16x16 extension icon
│   ├── icon32.png         # 32x32 extension icon
│   ├── icon48.png         # 48x48 extension icon
│   └── icon128.png        # 128x128 extension icon
└── Readme.md              # This file
```

## Development

### Architecture

The extension uses Chrome's Manifest V3 architecture with:
- **Service Worker** (`background.js`): Handles file downloads and extension lifecycle
- **Content Script** (`content.js`): Extracts data from GitHub PR pages
- **Popup** (`popup/`): User interface for controlling the extension

### Key Technologies

- **Manifest V3**: Latest Chrome extension standard
- **DOM Parsing**: Extracts data directly from GitHub's HTML structure
- **Chrome APIs**: Uses `chrome.downloads`, `chrome.storage`, and `chrome.tabs`
- **Modern JavaScript**: ES6+ features with async/await

### Permissions

The extension requires these permissions:
- `activeTab`: Access to the current GitHub page
- `storage`: Save user preferences
- `downloads`: Download JSON reports
- `host_permissions`: Access to github.com and api.github.com

## Troubleshooting

### Extension Not Working
- Ensure you're on a GitHub pull request page
- Check that the page has fully loaded
- Refresh the page and try again

### Data Extraction Issues
- Some PR elements might not be visible (collapsed sections)
- Ensure all comments and reviews are expanded
- Large PRs might take longer to process

### Download Problems
- Check Chrome's download settings
- Ensure you have write permissions to the download folder
- Try a different filename if there are conflicts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on various GitHub PRs
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- Basic PR data extraction
- JSON report generation
- Customizable export options
- Modern Manifest V3 implementation

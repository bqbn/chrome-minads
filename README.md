# Chrome MinAds - Minimal Ads Chrome Extension

**Chrome MinAds** is a Chrome extension designed to minimize advertisements on websites, creating a cleaner and more focused browsing experience. By blocking ads from known ad-serving domains, MinAds reduces distractions and enhances page load times.

## Features
- **Ad Blocking**: Blocks ads across websites by preventing requests to known ad-serving domains.
- **Domain Exclusions**: Manually exclude specific domains from ad blocking to support trusted websites.
- **Lightweight**: Efficient performance using Chrome's native declarativeNetRequest API.
- **Real-time Statistics**: View blocked ad counts and URLs for each tab.
- **Auto-updates**: Automatically updates blocking rules daily for optimal protection.
- **Sync Settings**: Domain exclusions sync across your Chrome installations.
- **Block List Source**: Uses the [StevenBlack/hosts](https://github.com/StevenBlack/hosts) community-maintained blocklist.

## How to Use

### Basic Ad Blocking
- Once installed, MinAds automatically starts blocking ads on all websites
- Click the extension icon to see blocked ad statistics for the current page
- View detailed list of blocked URLs by clicking "Show Details"

### Domain Exclusions
- **Quick Exclusion**: Click the extension icon and use "Exclude Domain" to exclude the current site
- **Full Management**: Click "Manage Excluded Domains" to open the options page
- **Add Domains**: Enter domain names (e.g., "example.com") to exclude them from blocking
- **Import/Export**: Backup and restore your exclusion list using JSON filesMinAds - Minimal Ads Chrome Extension

## Installation

Follow these steps to install MinAds:

1. **Get the extension files**:
   - **Clone the repository** (for Git users):
     ```bash
     git clone https://github.com/bqbn/chrome-minads.git
     ```
   - **Alternative**: Download the ZIP file from GitHub and extract it to a folder of your choice.

2. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** by toggling the switch in the top-right corner.
   - Click **Load unpacked** and select the folder containing the cloned or extracted files.

3. **Start minimizing ads**:
   - Once loaded, MinAds will automatically fetch its initial ad-blocking rules and begin reducing ads on websites you visit.

## Troubleshooting
If you encounter issues:
- **Extension not working**: Ensure the selected folder contains a valid `manifest.json` file.
- **Ads still appearing**: Some ads may persist if they originate from the same domain as the website. Consider using domain exclusions if a site breaks.
- **Site functionality broken**: Use the domain exclusion feature to allow ads on specific sites that require them to function properly.
- **Exclusions not working**: Domain exclusions are applied when rules update (every 24 hours) or when you manually toggle exclusions.

## License
This project is licensed under the [MIT License](LICENSE).

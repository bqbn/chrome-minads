# Chrome MinAds - Minimal Ads Chrome Extension

**Chrome MinAds** is a Chrome extension designed to minimize advertisements on websites, creating a cleaner and more focused browsing experience. By blocking ads from known ad-serving domains, MinAds reduces distractions and enhances page load times.

## Features
- Blocks ads across websites by preventing requests to known ad-serving domains.
- Lightweight and efficient, using Chrome’s native tools for optimal performance.
- Automatically updates its blocking rules upon installation for immediate effect.
- Block List Source: MinAds relies on the [StevenBlack/hosts](https://github.com/StevenBlack/hosts) block list, a widely-used, community-maintained list of ad-serving domains. This ensures the extension stays up-to-date with the latest ad-blocking rules.



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
- **Ads still appearing**: Some ads may persist if they originate from the same domain as the website.

## License
This project is licensed under the [MIT License](LICENSE).

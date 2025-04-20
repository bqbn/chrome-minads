const FILTER_LIST_URL = 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts';

// Object to store blocked ad data per tab
let blockedData = {};

async function updateRules() {
  try {
    // Fetch the ad domain list
    const response = await fetch(FILTER_LIST_URL);
    const text = await response.text();
    const lines = text.split('\n');

    // Extract domains from the hosts file (format: "0.0.0.0 domain.com")
    const domains = lines
      .filter(line => line.startsWith('0.0.0.0'))
      .map(line => line.split(' ')[1])
      .filter(domain => domain && !domain.startsWith('#'));

    // Group domains into chunks of 1,000 because Chrome has a limit of 5,000
    // dynamic rules, and the requestDomains condition allows up to 1,000
    // domains per rule.
    const chunkSize = 1000;
    const rules = [];
    for (let i = 0; i < domains.length; i += chunkSize) {
      const chunk = domains.slice(i, i + chunkSize);
      rules.push({
        id: rules.length + 1,  // Unique ID starting from 1
        priority: 1,
        action: { type: 'block' },
        condition: { requestDomains: chunk }
      });
    }

    // Get existing rules to remove them
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    // Update rules: remove old ones and add new ones
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });

    console.log('Rules updated successfully');
  } catch (error) {
    console.error('Error updating rules:', error);
  }
}

// Schedule periodic updates (every 24 hours)
chrome.alarms.create('updateRules', { periodInMinutes: 1440 });

// Trigger update when alarm fires
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'updateRules') {
    updateRules();
  }
});

// Update rules on extension install or update
chrome.runtime.onInstalled.addListener(() => {
  updateRules();
});

chrome.action.setBadgeBackgroundColor({ color: '#505050' });

// Listen for blocked requests
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
  const tabId = details.request.tabId;
  if (tabId >= 0) { // Ensure it’s a valid tab
    if (!blockedData[tabId]) {
      blockedData[tabId] = { count: 0, urls: [] };
    }
    blockedData[tabId].count += 1; // Increment count
    blockedData[tabId].urls.push(details.request.url); // Log the blocked URL

    // Update the badge text for this tab
    chrome.action.setBadgeText({
      text: blockedData[tabId].count.toString(),
      tabId: tabId
    });

    // Send update to popup (optional real-time update)
    chrome.runtime.sendMessage({
      type: 'UPDATE_BLOCKED',
      tabId: tabId,
      count: blockedData[tabId].count
    });
  }
});

// Clean up data when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete blockedData[tabId];
});

// Handle requests from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BLOCKED') {
    const tabId = message.tabId;
    const data = blockedData[tabId] || { count: 0, urls: [] };
    sendResponse(data);
  }
});

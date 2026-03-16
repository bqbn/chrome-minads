const FILTER_LIST_URL = 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts';

// Object to store blocked ad data per tab
let blockedData = {};

// Load extension status from storage
async function loadExtensionStatus() {
  const result = await chrome.storage.sync.get(['extensionEnabled']);
  return result.extensionEnabled !== false; // Default to true
}

// Save extension status to storage
async function saveExtensionStatus(enabled) {
  await chrome.storage.sync.set({ extensionEnabled: enabled });
}

// Load excluded domains from storage
async function loadExcludedDomains() {
  const result = await chrome.storage.sync.get(['excludedDomains']);
  return result.excludedDomains || [];
}

// Save excluded domains to storage
async function saveExcludedDomains(domains) {
  await chrome.storage.sync.set({ excludedDomains: domains });
}

// Add a domain to exclusions
async function addExcludedDomain(domain) {
  const excludedDomains = await loadExcludedDomains();
  if (!excludedDomains.includes(domain)) {
    excludedDomains.push(domain);
    await saveExcludedDomains(excludedDomains);
    // Trigger rules update to apply exclusion
    await updateRules();
    return true;
  }
  return false;
}

// Remove a domain from exclusions
async function removeExcludedDomain(domain) {
  const excludedDomains = await loadExcludedDomains();
  const index = excludedDomains.indexOf(domain);
  if (index > -1) {
    excludedDomains.splice(index, 1);
    await saveExcludedDomains(excludedDomains);
    // Trigger rules update to apply changes
    await updateRules();
    return true;
  }
  return false;
}

// Check if a domain is excluded
async function isDomainExcluded(domain) {
  const excludedDomains = await loadExcludedDomains();
  return excludedDomains.includes(domain);
}

// Filter domains based on exclusions
async function filterDomainsForRules(domains) {
  const excludedDomains = await loadExcludedDomains();
  return domains.filter(domain => {
    // Check exact match
    if (excludedDomains.includes(domain)) return false;

    // Check if any excluded domain would be affected by blocking this domain
    return !excludedDomains.some(excluded => {
      // Case 1: domain is a parent of excluded (e.g., blocking "example.com" affects "sub.example.com")
      // Case 2: excluded is a parent of domain (e.g., excluding "example.com" should also exclude "sub.example.com" from blocklist)
      return domain.endsWith('.' + excluded) ||
             domain === excluded ||
             excluded.endsWith('.' + domain);
    });
  });
}

// Update badge status
async function updateBadgeStatus(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#505050' });
    // Restore counts for tabs that have them
    for (const tabId in blockedData) {
      try {
        const tab = await chrome.tabs.get(parseInt(tabId));
        if (tab) {
          chrome.action.setBadgeText({
            text: blockedData[tabId].count.toString(),
            tabId: parseInt(tabId)
          });
        }
      } catch (e) {
        // Tab might be closed
      }
    }
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#a0a0a0' });
    // Clear tab specific badges so global 'OFF' shows
    for (const tabId in blockedData) {
      chrome.action.setBadgeText({ text: '', tabId: parseInt(tabId) });
    }
  }
}

async function updateRules() {
  try {
    const enabled = await loadExtensionStatus();
    updateBadgeStatus(enabled);
    if (!enabled) {
      // Remove all rules if disabled
      const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
      const oldRuleIds = oldRules.map(rule => rule.id);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: []
      });
      console.log('Extension disabled, rules removed');
      return;
    }

    // Fetch the ad domain list
    const response = await fetch(FILTER_LIST_URL);
    const text = await response.text();
    const lines = text.split('\n');

    // Extract domains from the hosts file (format: "0.0.0.0 domain.com")
    const allDomains = lines
      .filter(line => line.startsWith('0.0.0.0'))
      .map(line => line.split(' ')[1])
      .filter(domain => domain && !domain.startsWith('#'));

    // Filter out excluded domains
    const domains = await filterDomainsForRules(allDomains);

    console.log(`Loaded ${allDomains.length} domains, ${domains.length} after exclusions`);

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
  loadExtensionStatus().then(enabled => updateBadgeStatus(enabled));
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

    // Send update to popup (optional real-time update) - only if popup is listening
    chrome.runtime.sendMessage({
      type: 'UPDATE_BLOCKED',
      tabId: tabId,
      count: blockedData[tabId].count
    }, (response) => {
      // Handle the case where no one is listening (popup closed)
      if (chrome.runtime.lastError) {
        // This is expected when popup is closed, so we silently ignore it
        // chrome.runtime.lastError.message would be "Could not establish connection. Receiving end does not exist."
      }
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
  } else if (message.type === 'FORCE_UPDATE_RULES') {
    updateRules().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  } else if (message.type === 'CHECK_DOMAIN_EXCLUSION') {
    isDomainExcluded(message.domain).then(excluded => {
      sendResponse({ excluded });
    });
    return true; // Keep message channel open for async response
  } else if (message.type === 'TOGGLE_DOMAIN_EXCLUSION') {
    const { domain, exclude } = message;
    if (exclude) {
      addExcludedDomain(domain).then(success => {
        sendResponse({ success, action: 'excluded' });
      });
    } else {
      removeExcludedDomain(domain).then(success => {
        sendResponse({ success, action: 'included' });
      });
    }
    return true; // Keep message channel open for async response
  } else if (message.type === 'GET_EXCLUDED_DOMAINS') {
    loadExcludedDomains().then(domains => {
      sendResponse({ domains });
    });
    return true; // Keep message channel open for async response
  } else if (message.type === 'UPDATE_EXCLUDED_DOMAINS') {
    saveExcludedDomains(message.domains).then(() => {
      updateRules().then(() => {
        sendResponse({ success: true });
      });
    });
    return true; // Keep message channel open for async response
  } else if (message.type === 'GET_EXTENSION_STATUS') {
    loadExtensionStatus().then(enabled => {
      sendResponse({ enabled });
    });
    return true; // Keep message channel open for async response
  } else if (message.type === 'TOGGLE_EXTENSION') {
    const { enabled } = message;
    saveExtensionStatus(enabled).then(() => {
      updateRules().then(() => {
        // Notify tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'EXTENSION_STATUS_CHANGED', enabled }).catch(() => {
              // Ignore errors for tabs without content scripts
            });
          });
        });
        sendResponse({ success: true });
      });
    });
    return true; // Keep message channel open for async response
  }
});

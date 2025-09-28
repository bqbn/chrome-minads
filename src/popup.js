let currentDomain = '';
let isExcluded = false;

document.addEventListener('DOMContentLoaded', () => {
  // Get the active tab and fetch blocked data
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    const url = tabs[0].url;

    // Extract domain from URL
    currentDomain = extractDomain(url);
    document.getElementById('currentDomain').textContent = currentDomain;

    // Get blocked data
    chrome.runtime.sendMessage({ type: 'GET_BLOCKED', tabId: tabId }, (response) => {
      updateUI(response.count, response.urls);
    });

    // Check if current domain is excluded
    chrome.runtime.sendMessage({
      type: 'CHECK_DOMAIN_EXCLUSION',
      domain: currentDomain
    }, (response) => {
      isExcluded = response.excluded;
      updateExclusionUI();
    });
  });

  // Toggle the details list
  document.getElementById('details').addEventListener('click', () => {
    const list = document.getElementById('list');
    list.style.display = list.style.display === 'none' ? 'block' : 'none';
  });

  // Toggle domain exclusion
  document.getElementById('toggleExclusion').addEventListener('click', () => {
    const button = document.getElementById('toggleExclusion');
    button.disabled = true;
    button.textContent = 'Updating...';

    chrome.runtime.sendMessage({
      type: 'TOGGLE_DOMAIN_EXCLUSION',
      domain: currentDomain,
      exclude: !isExcluded
    }, (response) => {
      if (response.success) {
        isExcluded = !isExcluded;
        updateExclusionUI();
        // Show feedback
        showNotification(`Domain ${response.action} successfully!`);
      } else {
        showNotification('Failed to update domain exclusion', 'error');
      }
      button.disabled = false;
    });
  });

  // Open options page
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return 'unknown';
  }
}

function updateExclusionUI() {
  const statusElement = document.getElementById('exclusionStatus');
  const buttonElement = document.getElementById('toggleExclusion');

  if (currentDomain === 'unknown' || currentDomain.startsWith('chrome') || currentDomain.startsWith('moz-extension')) {
    statusElement.textContent = 'Not applicable for this page';
    statusElement.className = '';
    buttonElement.style.display = 'none';
    return;
  }

  buttonElement.style.display = 'inline-block';
  buttonElement.disabled = false;

  if (isExcluded) {
    statusElement.textContent = 'Excluded from ad blocking';
    statusElement.className = 'excluded';
    buttonElement.textContent = 'Remove Exclusion';
    buttonElement.className = 'include';
  } else {
    statusElement.textContent = 'Ad blocking active';
    statusElement.className = 'not-excluded';
    buttonElement.textContent = 'Exclude Domain';
    buttonElement.className = 'exclude';
  }
}

function updateUI(count, urls) {
  document.getElementById('count').textContent = count;
  const list = document.getElementById('list');
  list.innerHTML = ''; // Clear existing list
  urls.forEach(url => {
    const li = document.createElement('li');
    li.textContent = url;
    list.appendChild(li);
  });
}

function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#f44336' : '#4caf50'};
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Optional: Listen for real-time updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_BLOCKED') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (message.tabId === tabs[0].id) {
        document.getElementById('count').textContent = message.count;
      }
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Get the active tab and fetch blocked data
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ type: 'GET_BLOCKED', tabId: tabId }, (response) => {
      updateUI(response.count, response.urls);
    });
  });

  // Toggle the details list
  document.getElementById('details').addEventListener('click', () => {
    const list = document.getElementById('list');
    list.style.display = list.style.display === 'none' ? 'block' : 'none';
  });
});

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

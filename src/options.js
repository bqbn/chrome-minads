let excludedDomains = [];

document.addEventListener('DOMContentLoaded', () => {
    loadExcludedDomains();
    setupEventListeners();
});

function setupEventListeners() {
    // Add domain
    document.getElementById('addDomain').addEventListener('click', addDomain);
    document.getElementById('newDomain').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addDomain();
        }
    });

    // Import/Export
    document.getElementById('exportDomains').addEventListener('click', exportDomains);
    document.getElementById('importDomains').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', importDomains);
    document.getElementById('clearAll').addEventListener('click', clearAllDomains);
}

async function loadExcludedDomains() {
    chrome.runtime.sendMessage({ type: 'GET_EXCLUDED_DOMAINS' }, (response) => {
        excludedDomains = response.domains || [];
        updateUI();
    });
}

function updateUI() {
    updateDomainCount();
    updateDomainList();
    updateLastUpdated();
}

function updateDomainCount() {
    document.getElementById('domainCount').textContent = excludedDomains.length;
}

function updateDomainList() {
    const domainList = document.getElementById('domainList');

    if (excludedDomains.length === 0) {
        domainList.innerHTML = `
            <div class="empty-state">
                <p>No domains excluded yet.</p>
                <p>Add domains above to exclude them from ad blocking.</p>
            </div>
        `;
        return;
    }

    // Sort domains alphabetically
    const sortedDomains = [...excludedDomains].sort();

    domainList.innerHTML = sortedDomains.map(domain => `
        <div class="domain-item">
            <span class="domain-name">${escapeHtml(domain)}</span>
            <button class="danger" onclick="removeDomain('${escapeHtml(domain)}')">Remove</button>
        </div>
    `).join('');
}

function updateLastUpdated() {
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
}

function addDomain() {
    const input = document.getElementById('newDomain');
    const domain = input.value.trim().toLowerCase();

    if (!domain) {
        showNotification('Please enter a domain name', 'error');
        return;
    }

    // Basic domain validation
    if (!isValidDomain(domain)) {
        showNotification('Please enter a valid domain name (e.g., example.com)', 'error');
        return;
    }

    if (excludedDomains.includes(domain)) {
        showNotification('Domain is already excluded', 'error');
        return;
    }

    // Add to local list
    excludedDomains.push(domain);

    // Save to storage
    saveExcludedDomains().then(() => {
        input.value = '';
        updateUI();
        showNotification(`Domain "${domain}" excluded successfully`, 'success');
    }).catch(() => {
        // Remove from local list if save failed
        excludedDomains = excludedDomains.filter(d => d !== domain);
        showNotification('Failed to save domain exclusion', 'error');
    });
}

function removeDomain(domain) {
    if (!confirm(`Remove "${domain}" from excluded domains?\n\nAd blocking will be re-enabled for this domain.`)) {
        return;
    }

    // Remove from local list
    excludedDomains = excludedDomains.filter(d => d !== domain);

    // Save to storage
    saveExcludedDomains().then(() => {
        updateUI();
        showNotification(`Domain "${domain}" removed successfully`, 'success');
    }).catch(() => {
        // Re-add to local list if save failed
        excludedDomains.push(domain);
        showNotification('Failed to remove domain exclusion', 'error');
    });
}

function saveExcludedDomains() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: 'UPDATE_EXCLUDED_DOMAINS',
            domains: excludedDomains
        }, (response) => {
            if (response && response.success) {
                resolve();
            } else {
                reject();
            }
        });
    });
}

function exportDomains() {
    if (excludedDomains.length === 0) {
        showNotification('No domains to export', 'error');
        return;
    }

    const data = {
        excludedDomains: excludedDomains,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `minads-excluded-domains-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    showNotification(`Exported ${excludedDomains.length} domains`, 'success');
}

function importDomains(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.excludedDomains || !Array.isArray(data.excludedDomains)) {
                throw new Error('Invalid file format');
            }

            // Validate and filter domains
            const validDomains = data.excludedDomains.filter(domain =>
                typeof domain === 'string' && isValidDomain(domain)
            );

            if (validDomains.length === 0) {
                showNotification('No valid domains found in file', 'error');
                return;
            }

            // Merge with existing domains (remove duplicates)
            const newDomains = [...new Set([...excludedDomains, ...validDomains])];
            const addedCount = newDomains.length - excludedDomains.length;

            if (addedCount === 0) {
                showNotification('All domains were already excluded', 'error');
                return;
            }

            excludedDomains = newDomains;

            saveExcludedDomains().then(() => {
                updateUI();
                showNotification(`Imported ${addedCount} new domains`, 'success');
            }).catch(() => {
                showNotification('Failed to save imported domains', 'error');
            });

        } catch (error) {
            showNotification('Failed to import domains: Invalid file format', 'error');
        }
    };

    reader.readAsText(file);
    // Clear the file input
    event.target.value = '';
}

function clearAllDomains() {
    if (excludedDomains.length === 0) {
        showNotification('No domains to clear', 'error');
        return;
    }

    const count = excludedDomains.length;
    if (!confirm(`Remove all ${count} excluded domains?\n\nAd blocking will be re-enabled for all these domains.`)) {
        return;
    }

    excludedDomains = [];

    saveExcludedDomains().then(() => {
        updateUI();
        showNotification(`Cleared ${count} domains`, 'success');
    }).catch(() => {
        showNotification('Failed to clear domains', 'error');
    });
}

function isValidDomain(domain) {
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain) && domain.includes('.') && domain.length <= 253;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}
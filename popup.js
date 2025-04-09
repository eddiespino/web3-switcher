let peakdButton = document.getElementById('redirect-peakd');
let ecencyButton = document.getElementById('redirect-ecency');
let hiveButton = document.getElementById('redirect-hiveblog');
let inleoButton = document.getElementById('redirect-inleo');

if (peakdButton) {
  peakdButton.addEventListener('click', () => handleRedirect('peakd.com', 'https'));
}

if (ecencyButton) {
  ecencyButton.addEventListener('click', () => handleRedirect('ecency.com', 'https'));
}

if (hiveButton) {
  hiveButton.addEventListener('click', () => handleRedirect('hive.blog', 'https'));
}

if (inleoButton) {
  inleoButton.addEventListener('click', () => handleRedirect('inleo.io', 'https'));
}

/*
 * Checks if the given hostname belongs to a supported domain.
 */
function isSupportedDomain(hostname) {
  return ['hive.blog', 'peakd.com', 'ecency.com', 'inleo.io'].includes(hostname);
}

function handleRedirect(domain, protocol = 'https') {
  /*
   * Redirects the active tab to the specified domain.
   * If the current URL matches certain domains, it replaces the hostname.
   * For invalid URLs or mismatched domains, it navigates to the domain's homepage.
   */
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      console.error('No active tab found.');
      return; // Exit the function if no active tab is found.
    }
    let currentTab = tabs[0];
    try {
      let url = new URL(currentTab.url);
      // Check if the URL is valid and belongs to a supported domain.
      if (isSupportedDomain(url.hostname)) {
        // Replace the domain with the given domain.
        url.hostname = domain;
        chrome.tabs.update(currentTab.id, { url: url.href });
      } else {
        // If the URL is valid but not a supported domain, navigate to the given domain's homepage.
        chrome.tabs.update(currentTab.id, { url: `${protocol}://${domain}` });
      }
    } catch (e) {
      // If the URL is invalid, navigate to the given domain's homepage.
      chrome.tabs.update(currentTab.id, { url: `${protocol}://${domain}` });
    }
  });
}


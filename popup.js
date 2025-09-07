// =====================
// Web3Switcher - popup
// =====================

const DEFAULT_FRONTENDS = [
  { label: "PeakD",     host: "peakd.com"   },
  { label: "Ecency",    host: "ecency.com"  },
  { label: "Hive.blog", host: "hive.blog"   },
  { label: "Inleo",     host: "inleo.io"    }
];

// ---- storage helpers ----
function getFrontends() {
  return new Promise(resolve =>
    chrome.storage.sync.get({ frontends: DEFAULT_FRONTENDS }, r => resolve(r.frontends))
  );
}
const DEFAULT_PREFS = { defaultFrontend: null };
function getDefaultFrontend() {
  return new Promise(resolve =>
    chrome.storage.sync.get(DEFAULT_PREFS, r => resolve(r.defaultFrontend))
  );
}

// ---- utils ----
function sanitizeHost(h) {
  return String(h).trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*/, "");
}
function convertUrl(originalUrl, targetHost) {
  try { const u = new URL(originalUrl); u.hostname = targetHost; return u.toString(); }
  catch { return null; }
}
function showMsg(text) {
  const el = document.getElementById("msg");
  if (el) el.textContent = text || "";
}

// Map static popup buttons → hosts (must match popup.html IDs)
const BUTTON_MAP = {
  "redirect-peakd":    "peakd.com",
  "redirect-ecency":   "ecency.com",
  "redirect-hiveblog": "hive.blog",
  "redirect-inleo":    "inleo.io"
};

async function updateButtonStates() {
  const frontends = await getFrontends();
  const supported = new Set(frontends.map(f => sanitizeHost(f.host)));

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url || "";
  let currentHost = "";
  try { currentHost = sanitizeHost(new URL(currentUrl).hostname); } catch {}

  const isOnSupportedPage = supported.has(currentHost);

  for (const [btnId, host] of Object.entries(BUTTON_MAP)) {
    const btn = document.getElementById(btnId);
    if (!btn) continue;
    const hostKey = sanitizeHost(host);
    btn.disabled = !isOnSupportedPage || currentHost === hostKey || !supported.has(hostKey);
  }

  showMsg(isOnSupportedPage ? "" : "Open a Hive page to enable buttons.");
}

async function bindStaticButtons() {
  for (const [btnId, host] of Object.entries(BUTTON_MAP)) {
    const btn = document.getElementById(btnId);
    if (!btn) continue;
    btn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const target = convertUrl(tab?.url || "", host);
      if (target) { await chrome.tabs.update(tab.id, { url: target }); window.close(); }
    });
  }
}

async function init() {
  const openOptions = document.getElementById("openOptions");
  const openDefault = document.getElementById("openDefault");

  openOptions?.addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

  openDefault?.addEventListener("click", async (e) => {
    e.preventDefault();
    const defaultHost = await getDefaultFrontend();
    const list = await getFrontends();
    const targetHost = defaultHost || list[0]?.host;
    if (!targetHost) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const target = tab?.url ? convertUrl(tab.url, targetHost) : null;
    if (target) { await chrome.tabs.update(tab.id, { url: target }); window.close(); }
  });

  // Live refresh on storage change (frontends/default)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.frontends || changes.defaultFrontend) updateButtonStates();
  });

  await bindStaticButtons();
  await updateButtonStates();
}

init();
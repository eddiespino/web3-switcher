// =========================
// Web3Switcher - background
// =========================

const SW_VERSION = "v1.4.3";
const log = (...args) => console.log("[Web3Switcher]", ...args);
log("Service worker loaded", SW_VERSION, { id: chrome.runtime.id });

// ---- Defaults ----
const DEFAULT_FRONTENDS = [
  { label: "PeakD",     host: "peakd.com"   },
  { label: "Ecency",    host: "ecency.com"  },
  { label: "Hive.blog", host: "hive.blog"   },
  { label: "Inleo",     host: "inleo.io"    }
];
const DEFAULT_SETTINGS = { openInNewTab: false };
const DEFAULT_PREFS    = { defaultFrontend: null };
const DEFAULT_REDIRECT = { autoRedirectMode: "off" }; // "off" | "ask" | "always"

// ---- Storage helpers ----
function getFrontends() { return new Promise(r => chrome.storage.sync.get({ frontends: DEFAULT_FRONTENDS }, x => r(x.frontends))); }
function setFrontends(frontends) { return new Promise(r => chrome.storage.sync.set({ frontends }, r)); }
function getSettings() { return new Promise(r => chrome.storage.sync.get(DEFAULT_SETTINGS, x => r(x))); }
function getDefaultFrontend() { return new Promise(r => chrome.storage.sync.get(DEFAULT_PREFS, x => r(x.defaultFrontend))); }
function setDefaultFrontend(host) { return new Promise(r => chrome.storage.sync.set({ defaultFrontend: host }, r)); }
function getRedirectPrefs() { return new Promise(r => chrome.storage.sync.get(DEFAULT_REDIRECT, x => r(x))); }
function setRedirectMode(mode) { return new Promise(r => chrome.storage.sync.set({ autoRedirectMode: mode }, r)); }

// ---- URL helpers ----
function sanitizeHost(h = "") { return String(h).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*/, "").toLowerCase(); }
function convertUrl(originalUrl, targetHost) { try { const u = new URL(originalUrl); u.hostname = targetHost; return u.toString(); } catch { return null; } }
function isSupportedUrl(urlStr, set) { try { const u = new URL(urlStr); return set.has(sanitizeHost(u.hostname)); } catch { return false; } }
function openUrl(targetUrl, tab, openInNewTab) { if (!targetUrl) return; if (openInNewTab || !tab?.id) chrome.tabs.create({ url: targetUrl }); else chrome.tabs.update(tab.id, { url: targetUrl }); }

// ---- Offscreen clipboard ----
async function ensureOffscreen() {
  try {
    if (!chrome.offscreen?.createDocument) return;
    if (chrome.offscreen.hasDocument && await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["CLIPBOARD"], justification: "Copy converted Hive URLs" });
    await new Promise(r => setTimeout(r, 0));
  } catch (e) { log("ensureOffscreen error:", e); }
}
async function copyToClipboard(text) {
  try { await ensureOffscreen(); await chrome.runtime.sendMessage({ type: "COPY_TO_CLIPBOARD", text }); }
  catch (e) { log("copyToClipboard: receiving end missing", e); }
}

// ---- Context menus (serialized rebuild) ----
let _menusBuilding = false, _menusBuildQueued = false;
async function rebuildContextMenus() {
  if (_menusBuilding) { _menusBuildQueued = true; return; }
  _menusBuilding = true;
  try {
    await new Promise(res => chrome.contextMenus.removeAll(res));
    const frontends = await getFrontends();
    const defaultHost = await getDefaultFrontend();
    const def = frontends.find(f => sanitizeHost(f.host) === sanitizeHost(defaultHost || "")) || null;

    chrome.contextMenus.create({ id: "open-parent", title: "Open in…", contexts: ["link", "page"] });
    chrome.contextMenus.create({ id: "copy-parent", title: "Copy as…", contexts: ["link", "page"] });

    for (const fe of frontends) {
      chrome.contextMenus.create({ id: `open-in-${fe.host}-link`, parentId: "open-parent", title: fe.label + " (link)", contexts: ["link"] });
      chrome.contextMenus.create({ id: `open-in-${fe.host}-page`, parentId: "open-parent", title: fe.label + " (page)", contexts: ["page"] });
      chrome.contextMenus.create({ id: `copy-as-${fe.host}-link`, parentId: "copy-parent", title: fe.label + " (link)", contexts: ["link"] });
      chrome.contextMenus.create({ id: `copy-as-${fe.host}-page`, parentId: "copy-parent", title: fe.label + " (page)", contexts: ["page"] });
    }

    chrome.contextMenus.create({ id: "open-in-default-link", title: def ? `Open link in ${def.label} (Default)` : "Open link in default (not set)", contexts: ["link"] });
    chrome.contextMenus.create({ id: "open-in-default-page", title: def ? `Open this page in ${def.label} (Default)` : "Open this page in default (not set)", contexts: ["page"] });
    chrome.contextMenus.create({ id: "cycle-next-page", title: "Switch to next frontend", contexts: ["page"] });

    log("Context menus rebuilt.");
  } catch (e) {
    log("rebuildContextMenus error:", e);
  } finally {
    _menusBuilding = false;
    if (_menusBuildQueued) { _menusBuildQueued = false; rebuildContextMenus(); }
  }
}
chrome.runtime.onInstalled.addListener(() => { log("onInstalled"); rebuildContextMenus(); setBadgeForActiveTab(); });
chrome.runtime.onStartup.addListener(()   => { log("onStartup");  rebuildContextMenus(); setBadgeForActiveTab(); });
chrome.storage.onChanged.addListener((c, area) => { if (area === "sync" && (c.frontends || c.defaultFrontend)) rebuildContextMenus(); });

// ---- Context menu click handler ----
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "cycle-next-page") { await cycleCurrentTab(); return; }

  const frontends = await getFrontends();
  const supported = new Set(frontends.map(f => sanitizeHost(f.host)));
  const { openInNewTab } = await getSettings();

  if (String(info.menuItemId).startsWith("copy-as-")) {
    const target = frontends.find(fe => info.menuItemId === `copy-as-${fe.host}-link` || info.menuItemId === `copy-as-${fe.host}-page`);
    if (!target) return;
    const sourceUrl = (info.linkUrl && isSupportedUrl(info.linkUrl, supported)) ? info.linkUrl : (info.pageUrl || tab?.url || "");
    if (!sourceUrl || !isSupportedUrl(sourceUrl, supported)) return;
    const converted = convertUrl(sourceUrl, target.host);
    if (converted) await copyToClipboard(converted);
    return;
  }

  if (info.menuItemId === "open-in-default-link" || info.menuItemId === "open-in-default-page") {
    const defaultHost = await getDefaultFrontend();
    const targetHost = defaultHost || frontends[0]?.host; if (!targetHost) return;
    const sourceUrl = (info.linkUrl && isSupportedUrl(info.linkUrl, supported)) ? info.linkUrl : (info.pageUrl || tab?.url || "");
    if (!sourceUrl || !isSupportedUrl(sourceUrl, supported)) return;
    const targetUrl = convertUrl(sourceUrl, targetHost); openUrl(targetUrl, tab, openInNewTab); return;
  }

  const target = frontends.find(fe => info.menuItemId === `open-in-${fe.host}-link` || info.menuItemId === `open-in-${fe.host}-page`);
  if (!target) return;
  if (info.linkUrl && isSupportedUrl(info.linkUrl, supported)) { openUrl(convertUrl(info.linkUrl, target.host), tab, openInNewTab); return; }
  const pageUrl = info.pageUrl || tab?.url || "";
  if (pageUrl && isSupportedUrl(pageUrl, supported)) openUrl(convertUrl(pageUrl, target.host), tab, openInNewTab);
});

// ---- Keyboard Shortcuts ----
const COMMAND_TO_INDEX = { "switch-to-1": 0, "switch-to-2": 1, "switch-to-3": 2 };
chrome.commands.onCommand.addListener(async (cmd) => { if (cmd === "cycle-frontend") return void cycleCurrentTab(); const i = COMMAND_TO_INDEX[cmd]; if (i !== undefined) switchActiveTabToIndex(i); });
async function switchActiveTabToIndex(i) { const f = await getFrontends(); if (i<0||i>=f.length) return; const [tab] = await chrome.tabs.query({ active:true, currentWindow:true }); if (!tab?.url) return; const { openInNewTab } = await getSettings(); openUrl(convertUrl(tab.url, f[i].host), tab, openInNewTab); }

// ---- Cycle ----
function indexByHost(frontends, host) { const h = sanitizeHost(host); return frontends.findIndex(f => sanitizeHost(f.host) === h); }
async function cycleCurrentTab() {
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true }); if (!tab?.url) return;
  const f = await getFrontends(); if (!f.length) return; const { openInNewTab } = await getSettings();
  const cur = (() => { try { return sanitizeHost(new URL(tab.url).hostname); } catch { return ""; } })();
  const idx = indexByHost(f, cur), next = idx >= 0 ? (idx+1) % f.length : 0;
  openUrl(convertUrl(tab.url, f[next].host), tab, openInNewTab);
}

// ---- Helpers for robust Ask messaging ----
async function safeSendMessageToTab(tabId, msg) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, msg, (res) => {
        const err = chrome.runtime.lastError;
        if (err) { log("tabs.sendMessage error:", err.message); resolve(null); }
        else resolve(res ?? {});
      });
    } catch (e) {
      log("tabs.sendMessage try-catch error", e);
      resolve(null);
    }
  });
}
function isScriptableUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

// ---- Ask mode (in-page modal + fallback) ----
const askedOnce = new Set();
async function injectAskOverlay(tabId, payload) {
  try {
    // Check the tab URL is scriptable (skip chrome://, pdf viewer, etc.)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id !== tabId || !isScriptableUrl(tab.url)) throw new Error("Tab not scriptable");

    // Try to inject and message the overlay
    await chrome.scripting.executeScript({ target: { tabId }, files: ["ask_overlay.js"] });
    const res = await safeSendMessageToTab(tabId, { type: "ASK_SHOW", ...payload });

    // If no response (no listener), fall back to window prompt
    if (!res) throw new Error("Overlay did not respond");
  } catch (e) {
    log("injectAskOverlay failed → fallback window", e);
  }
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "ASK_ACTION") {
    const tabId = sender?.tab?.id ?? msg.tabId; if (!tabId) return;
    if (msg.action === "switch") chrome.tabs.update(tabId, { url: msg.url });
    if (msg.action === "newtab") chrome.tabs.create({ url: msg.url });
    sendResponse?.({ ok: true }); return true;
  }
});

if (chrome.webNavigation?.onCommitted) {
  chrome.webNavigation.onCommitted.addListener(async (d) => {
    if (d.frameId !== 0) return;
    const { autoRedirectMode } = await getRedirectPrefs(); if (autoRedirectMode === "off") return;

    const f = await getFrontends(); const supported = new Set(f.map(x => sanitizeHost(x.host)));
    const defHost = await getDefaultFrontend(); if (!defHost) return;

    const url = d.url || ""; let curHost = ""; try { curHost = sanitizeHost(new URL(url).hostname); } catch { return; }
    if (!supported.has(curHost) || curHost === sanitizeHost(defHost)) return;

    const key = `${d.tabId}|${curHost}`; if (askedOnce.has(key) && autoRedirectMode === "ask") return;

    const targetUrl = convertUrl(url, defHost); if (!targetUrl) return;

    if (autoRedirectMode === "always") { chrome.tabs.update(d.tabId, { url: targetUrl }); return; }

    // ask → overlay (with fallback)
    askedOnce.add(key);
    const defLabel = (f.find(x => sanitizeHost(x.host) === sanitizeHost(defHost))?.label) || defHost;
    log("ASK: triggering overlay", { tabId: d.tabId, from: curHost, to: defHost });
    await injectAskOverlay(d.tabId, { targetUrl, fromHost: curHost, toLabel: defLabel });
  });
}

// ---- Badge ----
function initialForHost(host){ const h=sanitizeHost(host); if (h.includes("peakd")) return "P"; if (h.includes("ecency")) return "E"; if (h==="hive.blog"||h.includes("hive.blog")) return "H"; if (h.includes("inleo")) return "L"; return ""; }
async function setBadgeForUrl(url){ let t=""; try{ const u=new URL(url); t=initialForHost(u.hostname);}catch{} await chrome.action.setBadgeText({text:t}); if(t) await chrome.action.setBadgeBackgroundColor({color:"#475569"}); }
async function setBadgeForActiveTab(){ const [tab]=await chrome.tabs.query({active:true,currentWindow:true}); if(tab?.url) await setBadgeForUrl(tab.url); else await chrome.action.setBadgeText({text:""}); }
chrome.tabs.onActivated.addListener(async()=>{ await setBadgeForActiveTab(); });
chrome.tabs.onUpdated.addListener(async(_id,info,tab)=>{ if(!tab?.active) return; if(info.url||info.status==="complete") await setBadgeForUrl(tab.url||""); });

// ==========================
// Web3Switcher — options UI
// ==========================

const DEFAULT_FRONTENDS = [
  { label: "PeakD",     host: "peakd.com"   },
  { label: "Ecency",    host: "ecency.com"  },
  { label: "Hive.blog", host: "hive.blog"   },
  { label: "Inleo",     host: "inleo.io"    }
];
const DEFAULT_SETTINGS  = { openInNewTab: false };

// ---- storage helpers ----
function getFrontends() {
  return new Promise(resolve =>
    chrome.storage.sync.get({ frontends: DEFAULT_FRONTENDS }, r => resolve(r.frontends))
  );
}
function setFrontends(frontends) {
  return new Promise(resolve => chrome.storage.sync.set({ frontends }, resolve));
}
function getDefaultFrontend() {
  return new Promise(resolve =>
    chrome.storage.sync.get({ defaultFrontend: null }, r => resolve(r.defaultFrontend))
  );
}
function setDefaultFrontend(host) {
  return new Promise(resolve => chrome.storage.sync.set({ defaultFrontend: host }, resolve));
}
function getSettings() {
  return new Promise(resolve =>
    chrome.storage.sync.get(DEFAULT_SETTINGS, r => resolve(r))
  );
}
function setOpenInNewTab(value) {
  return new Promise(resolve => chrome.storage.sync.set({ openInNewTab: !!value }, resolve));
}
function getAutoRedirectMode() {
  return new Promise(resolve =>
    chrome.storage.sync.get({ autoRedirectMode: "off" }, r => resolve(r.autoRedirectMode))
  );
}
function setAutoRedirectMode(mode) {
  const allowed = new Set(["off", "ask", "always"]);
  const val = allowed.has(mode) ? mode : "off";
  return new Promise(resolve => chrome.storage.sync.set({ autoRedirectMode: val }, resolve));
}

// ---- utils ----
function sanitizeHost(h) {
  return String(h).trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*/, "");
}
function sameHost(a, b) { return sanitizeHost(a) === sanitizeHost(b); }
function el(tag, attrs = {}, html = "") {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => (n[k] = v));
  if (html) n.innerHTML = html;
  return n;
}
function setMsg(text) {
  const m = document.getElementById("msg");
  if (m) m.textContent = text || "";
}

// Remove duplicate hosts (keep first occurrence)
function dedupeFrontends(list) {
  const seen = new Set();
  const out = [];
  for (const fe of list) {
    const key = sanitizeHost(fe.host);
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ label: String(fe.label || "").trim() || key, host: key });
    }
  }
  return out;
}

// ---- renderers ----
async function renderFrontends() {
  const wrap = document.getElementById("frontends");

  // Load & auto-clean duplicates
  let list = await getFrontends();
  const clean = dedupeFrontends(list);
  if (clean.length !== list.length) {
    await setFrontends(clean);
    list = clean;
  }

  const def = await getDefaultFrontend();

  // Clear & rebuild
  wrap.replaceChildren();

  list.forEach((fe, i) => {
    const row = el("div", { className: "row" });
    const isDefault = sameHost(fe.host, def || "");

    const label = el(
      "div",
      { className: "grow" },
      `<b>${fe.label}</b> — ${fe.host} ${isDefault ? "<span class='star' title='Default'>★</span>" : ""}`
    );

    const bDefault = el("button", { title: "Set as default" }, "★");
    const bUp      = el("button", {}, "↑");
    const bDown    = el("button", {}, "↓");
    const bDel     = el("button", {}, "Delete");

    bDefault.addEventListener("click", async () => {
      await setDefaultFrontend(list[i].host);
      setMsg(`Default set to ${list[i].label} ✔`);
      renderFrontends();
    });

    bUp.addEventListener("click", async () => {
      if (i === 0) return;
      [list[i - 1], list[i]] = [list[i], list[i - 1]];
      await setFrontends(list);
      setMsg("");
      renderFrontends();
    });

    bDown.addEventListener("click", async () => {
      if (i === list.length - 1) return;
      [list[i + 1], list[i]] = [list[i], list[i + 1]];
      await setFrontends(list);
      setMsg("");
      renderFrontends();
    });

    bDel.addEventListener("click", async () => {
      const removed = list.splice(i, 1)[0];
      await setFrontends(list);
      if (sameHost(removed.host, def || "")) await setDefaultFrontend(null); // clear default if removed
      setMsg(`Removed ${removed.label} ✔`);
      renderFrontends();
    });

    row.appendChild(label);
    row.appendChild(bDefault);
    row.appendChild(bUp);
    row.appendChild(bDown);
    row.appendChild(bDel);
    wrap.appendChild(row);
  });
}

// ---- init ----
async function init() {
  // Prevent double init (e.g., hot reloads)
  if (window.__w3s_opts_inited) return;
  window.__w3s_opts_inited = true;

  // Controls
  const addBtn      = document.getElementById("add");
  const restoreBtn  = document.getElementById("restore");
  const labelEl     = document.getElementById("label");
  const hostEl      = document.getElementById("host");
  const newTabEl    = document.getElementById("openInNewTab");
  const redirRadios = Array.from(document.querySelectorAll('input[name="redir"]'));

  await renderFrontends();

  // Load settings
  const { openInNewTab } = await getSettings();
  newTabEl.checked = !!openInNewTab;

  const mode = await getAutoRedirectMode();
  const current = redirRadios.find(r => r.value === mode);
  if (current) current.checked = true;

  // Settings events
  newTabEl.addEventListener("change", async () => {
    await setOpenInNewTab(newTabEl.checked);
    setMsg(`Open in new tab: ${newTabEl.checked ? "on" : "off"} ✔`);
  });
  redirRadios.forEach(r => {
    r.addEventListener("change", async () => {
      if (!r.checked) return;
      await setAutoRedirectMode(r.value);
      setMsg(`Auto-redirect: ${r.value} ✔`);
    });
  });

  // Add frontend
  addBtn.addEventListener("click", async () => {
    const label = (labelEl.value || "").trim();
    const host  = sanitizeHost(hostEl.value || "");
    if (!label || !host) { setMsg("Please enter both label and host."); return; }

    // De-dupe against current list
    const list = await getFrontends();
    if (list.some(f => sameHost(f.host, host))) {
      setMsg("That host already exists."); return;
    }

    const next = dedupeFrontends([...list, { label, host }]);
    await setFrontends(next);
    labelEl.value = ""; hostEl.value = "";
    setMsg("Added ✔");
    renderFrontends();
  });
  // Enter submits Add
  labelEl.addEventListener("keydown", e => { if (e.key === "Enter") addBtn.click(); });
  hostEl.addEventListener("keydown",  e => { if (e.key === "Enter") addBtn.click(); });

  // Restore defaults
  restoreBtn.addEventListener("click", async () => {
    await setFrontends(DEFAULT_FRONTENDS);
    await setDefaultFrontend(null); // clear default
    setMsg("Restored defaults ✔");
    renderFrontends();
  });

  // Live updates
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.frontends || changes.defaultFrontend) renderFrontends();
    if (changes.openInNewTab) newTabEl.checked = !!changes.openInNewTab.newValue;
    if (changes.autoRedirectMode) {
      const m = changes.autoRedirectMode.newValue;
      const r = redirRadios.find(x => x.value === m);
      if (r) r.checked = true;
    }
  });
}

init();

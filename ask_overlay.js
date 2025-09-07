// In-page Ask modal. Injected on demand by background.js

(() => {
  if (window.__w3s_ask_ready) return;
  window.__w3s_ask_ready = true;
  console.log("[W3S overlay] ready");

  function ensureStyles() {
    if (document.getElementById("w3s-ask-style")) return;
    const css = `
      #w3s-ask-backdrop {
        position: fixed; inset: 0; background: rgba(15,23,42,.55);
        z-index: 2147483647; display: flex; align-items: center; justify-content: center;
      }
      #w3s-ask-card {
        background: #0b1220; color: #e2e8f0; border-radius: 12px; padding: 16px 18px; width: min(460px, 92vw);
        box-shadow: 0 10px 24px rgba(0,0,0,.35); font-family: system-ui, Arial, sans-serif;
      }
      #w3s-ask-card h1 { margin: 0 0 8px; font-size: 16px; }
      #w3s-ask-card p { margin: 0 0 14px; font-size: 13px; color:#94a3b8; }
      #w3s-ask-actions { display:flex; gap:8px; justify-content:flex-end; }
      #w3s-ask-actions button {
        padding: 8px 12px; border-radius: 8px; border: 1px solid #334155; background:#111827; color:#e5e7eb; cursor:pointer;
      }
      #w3s-ask-actions button:hover { background:#0f172a; }
      #w3s-ask-actions .primary { border-color:#2563eb; background:#1d4ed8; }
      #w3s-ask-actions .primary:hover { background:#1e40af; }
    `;
    const style = document.createElement("style");
    style.id = "w3s-ask-style";
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  function showModal({ targetUrl, fromHost, toLabel }) {
    console.log("[W3S overlay] showModal", { targetUrl, fromHost, toLabel });
    ensureStyles();
    document.getElementById("w3s-ask-backdrop")?.remove();

    const $backdrop = document.createElement("div");
    $backdrop.id = "w3s-ask-backdrop";
    const $card = document.createElement("div");
    $card.id = "w3s-ask-card";

    const title = `Open this page in your default frontend?`;
    const desc  = `You are on ${fromHost}. Switch to ${toLabel}?`;

    $card.innerHTML = `
      <h1>${title}</h1>
      <p>${desc}</p>
      <div id="w3s-ask-actions">
        <button id="w3s-ask-stay">Stay</button>
        <button id="w3s-ask-new" title="Open in a new tab">Open in new tab</button>
        <button id="w3s-ask-go" class="primary" title="Switch this tab">Switch</button>
      </div>
    `;
    $backdrop.appendChild($card);
    document.body.appendChild($backdrop);

    function close() { $backdrop.remove(); }

    document.getElementById("w3s-ask-go").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "ASK_ACTION", action: "switch", url: targetUrl }, () => {});
      close();
    });
    document.getElementById("w3s-ask-new").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "ASK_ACTION", action: "newtab", url: targetUrl }, () => {});
      close();
    });
    document.getElementById("w3s-ask-stay").addEventListener("click", close);
    $backdrop.addEventListener("click", (e) => { if (e.target === $backdrop) close(); });
  }

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "ASK_SHOW") {
      console.log("[W3S overlay] ASK_SHOW received", msg);
      ready(() => showModal(msg));
    }
  });
})();

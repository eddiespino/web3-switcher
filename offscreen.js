// Listens only; never sends messages on load.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "COPY_TO_CLIPBOARD") {
    writeClipboard(msg.text)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true; // keep channel open for async response
  }
});

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text ?? ""));
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = String(text ?? "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}
function qp(name) {
  const m = new URLSearchParams(location.search).get(name);
  return name === "tabId" ? Number(m) : m;
}
const tabId = qp("tabId");
const url   = qp("url");

document.getElementById("switch").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ASK_ACTION", action: "switch", tabId, url });
  window.close();
});
document.getElementById("newtab").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ASK_ACTION", action: "newtab", tabId, url });
  window.close();
});
document.getElementById("cancel").addEventListener("click", () => window.close());
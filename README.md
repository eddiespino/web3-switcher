![Cover Web3Switcher][dev]

[dev]: images/web3SwitcherCover.png

# Web3Switcher

Switch any Hive post or page between popular frontends (PeakD, Ecency, Hive.blog, Inleo) in one click. Clean popup, smart context menus, keyboard shortcuts, and an optional **default frontend** with **auto-redirect** (ask/always).

> Built by @eddiespino from the Aliento Project.

---

## ✨ Features

* **Popup switcher** with brand cards & logos
  Open the current page in PeakD / Ecency / Hive.blog / Inleo.
* **Context menus** (right-click)

  * *Open in…* (link or page)
  * *Copy as…* (convert URL and copy to clipboard)
  * *Switch to next frontend* (cycles through your list)
* **Keyboard shortcuts**

  * `Alt+1` / `Alt+2` / `Alt+3` → switch to the 1st / 2nd / 3rd frontend
  * `Alt+Shift+X` → cycle to the next frontend

  > Shortcuts are configurable at `chrome://extensions/shortcuts`.
* **Options page**

  * Add / remove / reorder frontends
  * Choose a **Default frontend** (⭐)
  * Choose behavior for **Auto-redirect to Default**:

    * **off**: never redirect
    * **ask**: show an **in-page modal** asking to switch (with “Stay / New tab / Switch”)
    * **always**: redirect immediately
  * “Open in new tab” toggle for popups/context menus/shortcuts
* **“Copy as…”** uses an **offscreen page** for reliable clipboard write
* **Toolbar badge** shows an initial (`P` / `E` / `H` / `L`) for the current frontend
* **Syncs settings** via `chrome.storage.sync` (works across your Chrome profiles)

---

## 🖼 Supported frontends (defaults)

* PeakD — `peakd.com`
* Ecency — `ecency.com`
* Hive.blog — `hive.blog`
* Inleo — `inleo.io`

You can add more (or remove any) from **Options → Frontends**.

---

## 🔧 Install (from source)

1. Clone or download this repo.
2. Open **Chrome** → `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** → select the project folder (where `manifest.json` lives).

> Works on Chromium-based browsers (Chrome, Brave, Edge).

---

## 📁 Project structure

```
.
├─ manifest.json
├─ background.js
├─ popup.html / popup.js
├─ options.html / options.js
├─ ask_overlay.js             # in-page modal for “ask” mode
├─ offscreen.html / offscreen.js
├─ styles/
│  ├─ shared.css
│  ├─ popup.css
│  └─ options.css
├─ images/                    # logos used in popup
└─ icons/                     # extension icons
```

---

## 🔐 Permissions (why they’re needed)

* `tabs`, `activeTab` — read current tab URL & update it
* `contextMenus` — show the “Open in…” / “Copy as…” menus
* `storage` — save your frontends & settings
* `clipboardWrite`, `offscreen` — copy converted URLs reliably
* `scripting`, `webNavigation` — inject the **ask** modal and detect navigation
* **Host permissions** for frontends (peakd/ecency/hive.blog/inleo) to convert URLs

**Privacy:** no analytics, no network calls, no data collection. All data stays in your browser.

---

## 🧭 Usage tips

* Reorder items in **Options** — order controls:

  * the **Alt+1/2/3** shortcuts
  * the **Cycle** command
* Set your **Default frontend** (⭐) to enable **Auto-redirect** modes.
* The **ask** modal appears **only** on a non-default frontend.
  On pages Chrome can’t script (e.g., PDFs, `chrome://`), a small fallback window asks instead.

---

## 🧪 Build a ZIP (for sharing or the Chrome Web Store)

**macOS/Linux**

```bash
zip -r web3switcher-v1.5.0.zip \
  manifest.json background.js popup.html popup.js options.html options.js ask_overlay.js \
  offscreen.html offscreen.js \
  styles images icons
```

**Windows (PowerShell)**

```powershell
Compress-Archive -Path manifest.json, background.js, popup.html, popup.js, options.html, options.js, ask_overlay.js, offscreen.html, offscreen.js, styles, images, icons -DestinationPath web3switcher-v1.5.0.zip
```

---

## 🚀 Releasing

1. Bump the version in `manifest.json`.
2. Commit, tag, and push:

   ```bash
   git add manifest.json
   git commit -m "chore: bump version to 1.5.0"
   git tag -a v1.5.0 -m "Web3Switcher v1.5.0"
   git push && git push origin v1.5.0
   ```
3. On GitHub → **Releases** → Draft a new release → pick tag → attach the ZIP → Publish.

---

## 🐞 Troubleshooting

* **Buttons disabled in popup:** open a page on a supported frontend first (PeakD/Ecency/Hive.blog/Inleo).
* **Ask modal doesn’t show:** ensure **Auto-redirect = ask** and a **Default** is set. On non-scriptable pages a small confirmation window is used.
* **Context menu duplicates:** fixed with serialized rebuild; if you ever see it, reload the extension.

---

## 📜 License

MIT — see [LICENSE](LICENSE).

---

## 🙌 Credits

Made with ❤️ by **eddiespino** from The Aliento Project.
Logos belong to their respective projects.

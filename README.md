# HTML Studio — standalone build

This folder is the **complete standalone version** of HTML Studio. It needs no build step,
no npm install and no server: open `index.html` (or publish the folder on GitHub Pages) and
every feature works.

## What's inside

```
html-studio/
├── index.html          the app shell
├── css/studio.css      all styling + theme tokens
└── js/
    ├── keys.js         access keys for the advanced Terminal (one line per key)
    ├── core.js         storage, themes, formatter, code folding, ZIP, preview, snippets, plugins
    ├── keystorage.js   per-key storage engine + storage-script export for GitHub
    ├── keystoragemanager.js  the Key Storage panel (rail 🗄 → every key + its storage)
    ├── templates.js    the template library (boilerplates, layouts, apps and games)
    ├── terminal.js     HSL — the Terminal's own language + its manual
    ├── editor.js       editor pane: gutter, folding, minimap, search & replace
    └── app.js          panels, tabs, explorer, preview, console, terminal, settings, plugins
```

## Features (identical to the in-app version)

- Open HTML / CSS / JS / JSON / text files — from the **Open** button, the file explorer, or by
  **dragging and dropping** them anywhere over the workspace.
- **Open ZIP archives** — a dropped or opened `.zip` is read and every text file inside is
  extracted into its own folder, one tab each (stored entries and DEFLATE both supported).
- **Tabs** for every open file, with drag-to-reorder, pinned tabs that shrink like Chrome's
  pinned tabs, and a **right-click menu with 16 actions** (rename, pin, close, close others,
  close to the right, close all, duplicate, move left/right, copy name, copy content, format,
  set as main page, save to library, export, delete).
- **Editor** with an optional **minimap** (scaled overview + draggable viewport), **code folding**
  with fold arrows in the gutter, **Format** for tidying HTML/CSS/JS, word wrap, and a
  **right-click menu with 16 actions** (cut, copy, paste, undo, redo, select all, format,
  duplicate line, delete line, move line up/down, toggle comment, find, fold, unfold, library).
- **Live preview** with device widths, **FPS and RAM meters**, and **New tab** which opens the
  page in a real `about:blank` window (meters included).
- **Console** at the bottom of the editor: logs, warnings, errors and uncaught exceptions from
  your JavaScript, plus a prompt that runs lines inside the running preview.
- **Search and replace** across one file or the whole project (regex and match-case options).
- **Templates** menu with 18 starters: HTML5 boilerplate, CSS reset, JS starter, dark-mode
  toggle, landing page, flexbox gallery, grid dashboard, form validation, fetch demo, todo app,
  canvas particles, analog clock, SVG chart, hash router, dialog, and games (Snake, Breakout,
  Memory Match, Typing Race).
- **Snippet library** with six starters — insert, copy, delete, or save the current file.
- **File explorer** and a separate **Pages** panel, with folders (ZIP imports create folders).
- **Movable, resizable panels** for Project, Pages, Code, Preview and Terminal — drag the header
  to move, the corner to resize, drag to a screen edge to snap into a half or full screen, and
  use the minimise / maximise / close buttons beside the grip.
- **Themes**: Black (default), Grey, White and a square green-on-black Retro Terminal theme,
  plus **personal themes** you build in Settings and keep in local storage.
- **Settings**: studio name, side tabs, minimap, word wrap, FPS/RAM meters, layout reset,
  plugin manager, the full HSL manual, and storage download / restore.
- **Plugin system**: install JS modules that register Terminal commands, top-bar panel buttons
  and themes — an "Insert example plugin" button is included.
- **Advanced Terminal** protected by **access keys**: type `admin` (or press the key button) to
  open the full-screen welcome screen. A wrong key shakes and is refused; a correct key unlocks
  the advanced commands. Keys are defined in `keys.js`.
- **ZIP export** of the whole project (folders preserved) so it can go straight to GitHub.

## Access keys

Edit `js/keys.js`:

```js
window.HS_KEYS = [
  { key: 'admin',       tier: 'admin', label: 'Full admin access',              enabled: true },
  { key: 'htmlstudio',  tier: 'dev',   label: 'Developer access',               enabled: false },
  { key: 'open-sesame', tier: 'guest', label: 'Read-only terminal access',      enabled: true }
];
```

### Turning keys off

- **One key:** change its line to `enabled: false`. It is refused at the lock
  screen and in the Terminal; leave the line there and set it back to `true`
  whenever you want it again.
- **Every key at once:** set `window.HS_KEYS_ENABLED = false;` at the top of
  `js/keys.js`. The lock screen then reports that keys are switched off. Nothing
  is deleted — the data of every key stays in its storage.

## Key storage scripts (one per key)

Every access key owns its **own storage** — game data, settings, notes, anything the preview
saves through `window.HSStorage`. Each store is named after its key
(`js/hs-storage-<key-name>-<tier>.js`) and never mixes with another key's data.

Open the panel from the side rail (**🗄 Key storage**), from **Settings → Storage → Manage key
storage**, or in the Terminal with `store manage`. It lists every key with the script file bound
to it, how much it holds, and **Download / Copy / Rename / Clear** per key — plus download-all and
restore for moving storage between machines.

In the Terminal, signed in with a key:

| Command | What it does |
| --- | --- |
| `store script` | Downloads that key's storage script (`hs-storage-<name>.js`). |
| `store copy` | Copies the same script to the clipboard, ready to paste on GitHub. |
| `store rename <name>` | Renames the script file — it stays linked to the same key. |
| `store export` | Downloads **all** key storages as one `hs-key-storages.json` transfer file. |
| `store import` | Restores a transfer file, matching each storage back to its key. |

The script is a plain JS file that declares the data, so it can live in your repo:

```js
// js/my-game.js  (rename with: store rename my-game)
window.HS_KEY_STORAGE = { scriptName: "my-game", storeId: "...", tier: "dev", data: { score: 42 } };
```

Add it to `index.html` **before** `js/app.js`:

```html
<script src="js/keystorage.js"></script>
<script src="js/my-game.js"></script>
```

## Put it on GitHub (GitHub Pages)

1. Create a new repository on GitHub.
2. Copy the whole contents of this folder into the repository (keep the `index.html` at the root,
   or in `docs/`).
3. Commit and push.
4. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
   Branch: `main` and folder `/ (root)`** (or `/docs`), then **Save**.
5. GitHub gives you a URL like `https://your-name.github.io/your-repo/` — HTML Studio is live,
   fully client-side, no server needed.

Everything is stored in your browser's local storage, so each visitor keeps their own project.
Use **Settings → Storage → Download my storage** to keep a backup, and the same panel to open it
again later.

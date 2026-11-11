/* HTML Studio standalone — the application shell: panels, tabs, explorer, preview,
   console, terminal, settings, plugins, ZIP import/export. */
(function (HS) {
  var state = {
    project: HS.readLS(HS.KEYS.project, null),
    settings: HS.loadSettings(),
    snippets: HS.readLS(HS.KEYS.snippets, null),
    plugins: HS.readLS(HS.KEYS.plugins, null),
    console: [],
    tier: null,
    key: null,
    findOpen: false,
    consoleFilter: 'all'
  };
  if (!state.project || !state.project.files || !state.project.files.length) state.project = HS.starterProject();
  if (!state.snippets || !state.snippets.length) state.snippets = HS.DEFAULT_SNIPPETS.slice();
  if (!state.plugins) state.plugins = [];

  function require(perm) {
  if (window.can(state.tier, perm)) return null;
  var need = { read: 'any key', edit: 'dev or higher', admin: 'admin or higher', owner: 'owner' }[perm] || 'a key';
  return 'Locked — ' + need + ' required. Type "admin" to switch keys.';
  }

  var DEFAULT_LAYOUT = {
    explorer: { x: 0, y: 0, w: 21, h: 58, open: true },
    pages: { x: 0, y: 58, w: 21, h: 42, open: true },
    code: { x: 21, y: 0, w: 49, h: 100, open: true },
    preview: { x: 70, y: 0, w: 30, h: 100, open: true },
    terminal: { x: 21, y: 62, w: 49, h: 38, open: false }
  };

  var els = {};

  /* ---------------- per-key storage (engine in js/keystorage.js) ---------------- */
  var readStore = window.HSKV.read;
  var writeStore = window.HSKV.write;
  var storeStats = window.HSKV.stats;
  var fmtBytes = window.HSKV.fmt;
  var allKeys = window.HSKV.allKeys;
  var kStoreId = window.HSKV.id;
  var keyEntryText = window.HSKV.entryText;
  function keyStorageShim() { return window.HSKV.shim(state.key, state.tier); }
  function refreshStoreBar() {
    var st = storeStats(readStore(state.key));
    if (els.storeInfoEl) els.storeInfoEl.textContent = st.entries + ' entries · ' + fmtBytes(st.bytes);
    if (els.storeTierEl) els.storeTierEl.textContent = state.tier || 'no key';
  }

  /* ---------------- persistence + derived ---------------- */
  function save() {
    HS.writeLS(HS.KEYS.project, state.project);
    HS.saveSettings(state.settings);
    HS.writeLS(HS.KEYS.snippets, state.snippets);
    HS.writeLS(HS.KEYS.plugins, state.plugins);
  }
  function layout(id) {
    var stored = (state.settings.layout || {})[id];
    return Object.assign({}, DEFAULT_LAYOUT[id], stored || {});
  }
  function setLayout(id, next) {
    state.settings.layout = Object.assign({}, state.settings.layout, (function () { var o = {}; o[id] = next; return o; })());
    save(); renderPanels();
  }
  function togglePanel(id) {
    var l = layout(id);
    l.open = !l.open;
    setLayout(id, l);
  }
  function activeFile() {
    for (var i = 0; i < state.project.files.length; i += 1) if (state.project.files[i].id === state.project.activeId) return state.project.files[i];
    return state.project.files[0] || null;
  }
  function fileById(id) {
    for (var i = 0; i < state.project.files.length; i += 1) if (state.project.files[i].id === id) return state.project.files[i];
    return null;
  }
  function fileByName(name) {
    for (var i = 0; i < state.project.files.length; i += 1) {
      if (state.project.files[i].name.toLowerCase() === String(name).toLowerCase()) return state.project.files[i];
    }
    return null;
  }
  function folderById(id) {
    for (var i = 0; i < state.project.folders.length; i += 1) if (state.project.folders[i].id === id) return state.project.folders[i];
    return null;
  }

  /* ---------------- console ---------------- */
  function log(level, text) {
    state.console.push({ level: level || 'info', text: String(text), time: Date.now() });
    if (state.console.length > 400) state.console.shift();
    renderConsole();
    renderStatus();
  }

  /* ---------------- preview ---------------- */
  function previewDoc() {
    var html = null, css = [], js = [], i, f;
    for (i = 0; i < state.project.files.length; i += 1) {
      f = state.project.files[i];
      if (f.type === 'html' && f.main) html = f;
    }
    if (!html) for (i = 0; i < state.project.files.length; i += 1) if (state.project.files[i].type === 'html') { html = state.project.files[i]; break; }
    state.project.files.forEach(function (file) {
      if (file.type === 'css') css.push(file.content);
      if (file.type === 'js') js.push(file.content);
    });
    var doc = HS.buildDoc({
      html: html ? html.content : '<p style="font-family:sans-serif;padding:24px">Add an HTML file to see a preview.</p>',
      css: css, js: js,
      meters: state.settings.showFps || state.settings.showRam,
      title: state.settings.appName
    });
    var shim = keyStorageShim();
    return /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, shim + '</body>') : doc + shim;
  }
  function sendMeters() {
    if (!els.frame || !els.frame.contentWindow) return;
    try {
      els.frame.contentWindow.postMessage({ source: 'hs-meters', fps: state.settings.showFps, ram: state.settings.showRam }, '*');
    } catch (e) { /* ignore */ }
  }
  function refreshPreview() {
    if (els.frame) els.frame.srcdoc = previewDoc();
    setTimeout(sendMeters, 300);
    setTimeout(sendMeters, 1200);
    log('info', 'Preview refreshed.');
  }
  function openInNewTab() {
    var ok = HS.openInNewTab(previewDoc(), true);
    log(ok ? 'info' : 'error', ok ? 'Opened the preview in a new about:blank tab.' : 'The browser blocked the new tab — allow pop-ups for this page.');
  }

  /* ---------------- files ---------------- */
  function createFile(opts) {
    opts = opts || {};
    var file = {
      id: HS.uid(), name: opts.name || 'untitled.html', type: opts.type || HS.detectType(opts.name || ''),
      content: opts.content || '', folderId: opts.folderId || null, pinned: false, main: false
    };
    state.project.files.push(file);
    if (opts.open !== false) {
      state.project.openTabs.push(file.id);
      state.project.activeId = file.id;
    }
    save(); refreshAll();
    return file;
  }
  function createFolder(name) {
    state.project.folders.push({ id: HS.uid('d'), name: name });
    save(); renderExplorer();
    return state.project.folders[state.project.folders.length - 1];
  }
  function openTab(id) {
    if (state.project.openTabs.indexOf(id) < 0) state.project.openTabs.push(id);
    state.project.activeId = id;
    save(); refreshAll();
  }
  function closeTab(id) {
    state.project.openTabs = state.project.openTabs.filter(function (t) { return t !== id; });
    if (state.project.activeId === id) state.project.activeId = state.project.openTabs[state.project.openTabs.length - 1] || null;
    save(); refreshAll();
  }
  function closeTabs(mode, id) {
    if (mode === 'others') state.project.openTabs = [id];
    else if (mode === 'all') state.project.openTabs = [];
    else if (mode === 'right') state.project.openTabs = state.project.openTabs.slice(0, state.project.openTabs.indexOf(id) + 1);
    if (state.project.openTabs.indexOf(state.project.activeId) < 0) state.project.activeId = state.project.openTabs[0] || null;
    save(); refreshAll();
  }
  function deleteFile(id) {
    state.project.files = state.project.files.filter(function (f) { return f.id !== id; });
    state.project.openTabs = state.project.openTabs.filter(function (t) { return t !== id; });
    if (state.project.activeId === id) state.project.activeId = state.project.openTabs[0] || (state.project.files[0] ? state.project.files[0].id : null);
    save(); refreshAll();
  }
  function moveTab(id, dir) {
    var tabs = state.project.openTabs, i = tabs.indexOf(id), j = dir === 'left' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= tabs.length) return;
    var t = tabs[i]; tabs[i] = tabs[j]; tabs[j] = t;
    save(); renderTabs();
  }
  function togglePin(id) {
    var file = fileById(id);
    if (!file) return;
    file.pinned = !file.pinned;
    if (file.pinned) {
      state.project.openTabs = [id].concat(state.project.openTabs.filter(function (t) { return t !== id; }));
    }
    save(); refreshAll();
  }
  function setMainHtml(id) {
    state.project.files.forEach(function (f) { f.main = (f.id === id); });
    save(); refreshAll();
  }
  function formatActive() {
    var file = activeFile();
    if (!file) return;
    file.content = HS.format(file.content, file.type);
    save(); refreshAll();
    log('info', file.name + ' formatted.');
  }
  function copyText(text, label) {
    navigator.clipboard.writeText(text).then(function () { log('info', 'Copied ' + label + '.'); }, function () { log('error', 'Clipboard blocked by the browser.'); });
  }
  function exportProjectZip() {
    var files = state.project.files.map(function (f) {
      var folder = folderById(f.folderId);
      return { path: (folder ? folder.name + '/' : '') + f.name, text: f.content };
    });
    HS.downloadBlob(HS.makeZip(files), (state.settings.appName || 'html-studio').replace(/\s+/g, '-').toLowerCase() + '.zip');
    log('info', 'Exported ' + files.length + ' files as a ZIP.');
  }
  function exportFile(file) {
    HS.downloadText(file.content, file.name, 'text/plain');
  }
  function importFiles(list) {
    var files = Array.prototype.slice.call(list || []);
    var done = 0;
    files.forEach(function (file) {
      if (/\.zip$/i.test(file.name)) {
        HS.readFileBuffer(file).then(HS.readZip).then(function (entries) {
          var texts = entries.filter(function (e) { return e.text !== null; });
          var folder = createFolder(file.name.replace(/\.zip$/i, '') || 'Imported');
          texts.forEach(function (e) {
            var record = {
              id: HS.uid(), name: e.name, type: HS.detectType(e.name), content: e.text,
              folderId: folder.id, pinned: false, main: /index\.html?$/i.test(e.name)
            };
            state.project.files.push(record);
            state.project.openTabs.push(record.id);
            state.project.activeId = record.id;
          });
          save(); refreshAll();
          log('info', 'Unzipped "' + file.name + '" — extracted ' + texts.length + ' file(s) into "' + folder.name + '".');
        }, function (err) { log('error', 'Could not open ' + file.name + ': ' + err.message); });
        return;
      }
      HS.readFileText(file).then(function (text) {
        done += 1;
        createFile({ name: file.name, type: HS.detectType(file.name), content: text });
        if (done === files.length) log('info', 'Opened ' + done + ' file(s).');
      });
    });
  }
  function replaceInProject(query, replacement, opts) {
    if (!query) return;
    var pattern;
    try {
      pattern = opts.regex ? new RegExp(query, opts.caseSensitive ? 'g' : 'gi')
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), opts.caseSensitive ? 'g' : 'gi');
    } catch (e) { log('error', 'Invalid expression.'); return; }
    var count = 0;
    state.project.files.forEach(function (file) {
      if (opts.scopeFileId && file.id !== opts.scopeFileId) return;
      if (!opts.all) {
        var replaced = false;
        pattern.lastIndex = 0;
        file.content = file.content.replace(pattern, function (m) {
          if (replaced) return m;
          replaced = true; count += 1; return replacement;
        });
        return;
      }
      pattern.lastIndex = 0;
      file.content = file.content.replace(pattern, function () { count += 1; return replacement; });
    });
    save(); refreshAll();
    log('info', 'Replaced ' + count + ' occurrence(s).');
  }

  /* ---------------- menus ---------------- */
  function openMenu(x, y, items) {
    closeMenu();
    var menu = HS.el('div', { class: 'hs-menu' });
    items.filter(Boolean).forEach(function (item) {
      if (item.sep) { menu.appendChild(HS.el('div', { class: 'sep' })); return; }
      var btn = HS.el('button', { class: item.danger ? 'danger' : '' });
      btn.appendChild(HS.el('span', { text: item.label }));
      if (item.hint) btn.appendChild(HS.el('span', { class: 'hint', text: item.hint }));
      if (item.disabled) btn.disabled = true;
      btn.addEventListener('click', function () { closeMenu(); item.run(); });
      menu.appendChild(btn);
    });
    menu.style.left = Math.min(x, window.innerWidth - 250) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 80) + 'px';
    HS.$('#hs-menus').appendChild(menu);
  }
  function closeMenu() { HS.$('#hs-menus').innerHTML = ''; }
  document.addEventListener('mousedown', function (e) {
    var menu = HS.$('#hs-menus .hs-menu');
    if (menu && !menu.contains(e.target)) closeMenu();
  }, true);
  window.addEventListener('blur', closeMenu);

  /* ---------------- top bar ---------------- */
  function renderTop() {
    var top = els.top;
    top.innerHTML = '';
    function b(label, handler, opts) {
      opts = opts || {};
      var btn = HS.el('button', { class: 'hs-btn' + (opts.primary ? ' primary' : ''), title: opts.title || label });
      btn.appendChild(HS.el('span', { text: opts.icon || '' }));
      btn.appendChild(HS.el('span', { class: 'wide', text: label }));
      btn.addEventListener('click', handler);
      return btn;
    }
    var brand = HS.el('span', { class: 'hs-brand' }, [
      HS.el('i', { text: (state.settings.appName || 'H').slice(0, 1).toUpperCase() }),
      HS.el('span', { class: 'wide', text: state.settings.appName })
    ]);
    top.appendChild(brand);
    top.appendChild(b('New', function () {
      createFile({ name: 'untitled-' + (state.project.files.length + 1) + '.html', type: 'html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>Untitled</title>\n</head>\n<body>\n\n</body>\n</html>\n' });
    }, { icon: '＋' }));
    top.appendChild(b('Templates', function () { openTemplates(); }, { icon: '▤' }));
    top.appendChild(b('Open', function () { els.fileInput.click(); }, { icon: '▸' }));
    top.appendChild(HS.el('span', { class: 'hs-div' }));
    top.appendChild(b('Format', formatActive, { icon: '≡' }));
    top.appendChild(b('Save', function () { save(); log('info', 'Project saved to this browser.'); }, { icon: '⤓' }));
    top.appendChild(b('Run', refreshPreview, { primary: true, icon: '▶' }));
    top.appendChild(HS.el('span', { class: 'hs-div' }));
    top.appendChild(b('Find', function () { state.findOpen = !state.findOpen; renderCode(); }, { icon: '⌕' }));
    top.appendChild(b('New tab', openInNewTab, { icon: '⧉' }));
    top.appendChild(b('Export', exportProjectZip, { icon: '⬇' }));
    top.appendChild(HS.el('span', { class: 'hs-div' }));
    top.appendChild(b('Terminal', function () { togglePanel('terminal'); }, { icon: '▮' }));
    (HS.pluginHost ? HS.pluginHost.panels : []).forEach(function (p) {
      top.appendChild(b(p.label, function () {
        try { p.run(pluginCtx()); } catch (e) { log('error', 'Plugin panel error: ' + e.message); }
      }, { icon: '◆', title: 'Plugin panel · ' + p.plugin }));
    });

    var right = HS.el('div', { class: 'hs-right' });
    var select = HS.el('select', { title: 'Theme' });
    HS.allThemes(state.settings).forEach(function (t) {
      select.appendChild(HS.el('option', { value: t.id, text: t.name, selected: state.settings.theme === t.id ? 'selected' : null }));
    });
    select.value = state.settings.theme;
    select.addEventListener('change', function () { state.settings.theme = select.value; save(); applyThemeNow(); renderTop(); });
    right.appendChild(select);
    right.appendChild(b('', function () { openSettings(); }, { icon: '⚙', title: 'Settings' }));
    top.appendChild(right);
  }

  /* ---------------- rail ---------------- */
  function renderRail() {
    var rail = els.rail;
    rail.innerHTML = '';
    if (state.settings.railCollapsed) {
      var exp = HS.el('button', { class: 'hs-rail-btn', text: '⮞', title: 'Expand side menu' });
      exp.addEventListener('click', function () { state.settings.railCollapsed = false; save(); renderRail(); });
      rail.appendChild(exp);
      return;
    }
    function rb(icon, title, handler, active) {
      var btn = HS.el('button', { class: 'hs-rail-btn' + (active ? ' active' : ''), text: icon, title: title });
      btn.addEventListener('click', handler);
      rail.appendChild(btn);
    }
    rb('⮜', 'Collapse side menu', function () { state.settings.railCollapsed = true; save(); renderRail(); });
    rb('🗂', 'Project files', function () { togglePanel('explorer'); }, layout('explorer').open);
    rb('🌐', 'Pages', function () { togglePanel('pages'); }, layout('pages').open);
    rb('☰', 'Code editor', function () { togglePanel('code'); }, layout('code').open);
    rb('👁', 'Preview', function () { togglePanel('preview'); }, layout('preview').open);
    rb('▤', 'Templates', function () { openTemplates(); });
    rb('🔖', 'Snippet library', function () { openSnippets(); });
    rb('▮', 'Terminal', function () { togglePanel('terminal'); }, layout('terminal').open);
    rb('🗄', 'Key storage', openStoreManager);
    rail.appendChild(HS.el('span', { class: 'spacer' }));
    rb('🔑', 'Access key', function () { openKeyGate(); });
    rb('⚙', 'Settings', function () { openSettings(); });
  }

  /* ---------------- panels ---------------- */
  function renderPanels() {
    HS.$$('.hs-panel').forEach(function (panel) {
      var id = panel.getAttribute('data-panel');
      var l = layout(id);
      panel.classList.toggle('open', !!l.open);
      panel.classList.toggle('minimized', !!l.min);
      panel.classList.toggle('maximized', !!l.max);
      if (!l.max) {
        panel.style.left = l.x + '%';
        panel.style.top = l.y + '%';
        panel.style.width = l.w + '%';
        panel.style.height = (l.min ? 38 : l.h) + '%';
      } else {
        panel.style.left = panel.style.top = '';
        panel.style.width = panel.style.height = '';
      }
    });
    renderRail();
    if (HS.Editor.sync) HS.Editor.sync();
  }

  function buildPanel(id, title, icon) {
    var panel = HS.$('.hs-panel[data-panel="' + id + '"]');
    var head = HS.el('div', { class: 'hs-panel-head' });
    head.appendChild(HS.el('span', { class: 'grip', text: '⠿' }));
    head.appendChild(HS.el('span', { text: icon }));
    head.appendChild(HS.el('h2', { text: title }));
    var grow = HS.el('span', { class: 'grow' });
    head.appendChild(grow);
    var actions = HS.el('span', { class: 'actions' });
    head.appendChild(actions);
    function winbtn(label, title2, handler, cls) {
      var btn = HS.el('button', { class: 'hs-winbtn' + (cls ? ' ' + cls : ''), text: label, title: title2 });
      btn.addEventListener('click', handler);
      return btn;
    }
    head.appendChild(winbtn('–', 'Minimize', function () { var l = layout(id); setLayout(id, Object.assign(l, { min: !l.min, max: false })); }));
    head.appendChild(winbtn('▢', 'Maximize', function () { var l = layout(id); setLayout(id, Object.assign(l, { max: !l.max, min: false })); }));
    head.appendChild(winbtn('✕', 'Close', function () { var l = layout(id); setLayout(id, Object.assign(l, { open: false })); }, 'close'));
    var body = HS.el('div', { class: 'hs-panel-body' });
    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(HS.el('div', { class: 'hs-resize' }));

    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || layout(id).max) return;
      var start = { x: e.clientX, y: e.clientY, l: layout(id) };
      panel.classList.add('dragging');
      var snapEl = els.snap;
      function move(ev) {
        var box = els.workspace.getBoundingClientRect();
        var l = layout(id);
        var dx = ((ev.clientX - start.x) / box.width) * 100;
        var dy = ((ev.clientY - start.y) / box.height) * 100;
        l.x = Math.min(100 - l.w, Math.max(0, start.l.x + dx));
        l.y = Math.min(100 - 6, Math.max(0, start.l.y + dy));
        panel.style.left = l.x + '%';
        panel.style.top = l.y + '%';
        var px = ev.clientX - box.left, py = ev.clientY - box.top;
        var zone = px < box.width * 0.05 ? 'left' : px > box.width * 0.95 ? 'right' : py < box.height * 0.05 ? 'top' : null;
        snapEl.className = 'hs-snap' + (zone ? ' show' : '');
        if (zone === 'left' || zone === 'right') {
          snapEl.style.left = (zone === 'right' ? 50 : 0) + '%';
          snapEl.style.top = 0; snapEl.style.width = '50%'; snapEl.style.height = '100%';
        } else if (zone === 'top') {
          snapEl.style.left = 0; snapEl.style.top = 0; snapEl.style.width = '100%'; snapEl.style.height = '100%';
        }
      }
      function up(ev) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        panel.classList.remove('dragging');
        snapEl.className = 'hs-snap';
        var l = layout(id);
        var box = els.workspace.getBoundingClientRect();
        var px = ev.clientX - box.left, py = ev.clientY - box.top;
        if (px < box.width * 0.05) setLayout(id, Object.assign(l, { x: 0, y: 0, w: 50, h: 100 }));
        else if (px > box.width * 0.95) setLayout(id, Object.assign(l, { x: 50, y: 0, w: 50, h: 100 }));
        else if (py < box.height * 0.05) setLayout(id, Object.assign(l, { max: true }));
        else setLayout(id, l);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    var resizer = panel.querySelector('.hs-resize');
    resizer.addEventListener('pointerdown', function () {
      panel.classList.add('resizing');
      function move(ev) {
        var box = els.workspace.getBoundingClientRect();
        var l = layout(id);
        l.w = Math.min(100 - l.x, Math.max(18, ((ev.clientX - box.left) / box.width) * 100 - l.x));
        l.h = Math.min(100 - l.y, Math.max(16, ((ev.clientY - box.top) / box.height) * 100 - l.y));
        l.max = false;
        panel.style.width = l.w + '%';
        panel.style.height = l.h + '%';
      }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        panel.classList.remove('resizing');
        setLayout(id, layout(id));
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    return { panel: panel, head: head, body: body, actions: actions };
  }

  /* ---------------- tabs ---------------- */
  function renderTabs() {
    var wrap = els.tabsHost;
    if (!wrap) return;
    wrap.className = 'hs-tabs' + (state.settings.sideTabs ? ' vertical' : '');
    wrap.innerHTML = '';

    state.project.openTabs.forEach(function (id, index) {
      var file = fileById(id);
      if (!file) return;
      var active = state.project.activeId === file.id;
      var tab = HS.el('div', { class: 'hs-tab' + (active ? ' active' : '') + (file.pinned ? ' pinned' : ''), title: file.name });
      tab.appendChild(HS.el('span', { class: 'dot', style: { background: { html: '#f28b82', css: '#8ab4f8', js: '#fdd663', json: '#81c995' }[file.type] || 'var(--hs-dim)' } }));
      if (file.main) tab.appendChild(HS.el('span', { class: 'label', style: { color: 'var(--hs-accent)' }, text: '★' }));
      var label = HS.el('span', { class: 'label', text: file.pinned ? file.name.split('.')[0].slice(0, 6) : file.name });
      tab.appendChild(label);
      var x = HS.el('button', { class: 'x', text: '✕' });
      x.addEventListener('click', function (e) { e.stopPropagation(); closeTab(file.id); });
      tab.appendChild(x);
      tab.addEventListener('click', function () { openTab(file.id); });
      function renameTab() {
        HS.renameInline(label, file.name, function (name) {
          if (name === file.name) return;
          file.name = name;
          save(); refreshAll();
          log('info', 'Renamed tab to ' + name + '.');
        });
      }
      tab.addEventListener('dblclick', function (e) { e.stopPropagation(); renameTab(); });
      tab.addEventListener('contextmenu', function (e) { e.preventDefault(); openMenu(e.clientX, e.clientY, tabMenu(file, renameTab)); });
      tab.draggable = true;
      tab.addEventListener('dragstart', function () { tab.dataset.drag = String(index); });
      tab.addEventListener('dragover', function (e) { e.preventDefault(); });
      tab.addEventListener('drop', function (e) {
        e.preventDefault();
        var from = parseInt(tab.dataset.drag, 10);
        if (isNaN(from) || from === index) return;
        var tabs = state.project.openTabs;
        var moved = tabs.splice(from, 1)[0];
        tabs.splice(index, 0, moved);
        save(); renderTabs();
      });
      wrap.appendChild(tab);
    });

    var add = HS.el('button', { class: 'hs-rail-btn', text: '＋', title: 'New tab' });
    add.style.width = '28px'; add.style.height = '28px';
    add.addEventListener('click', function () {
      createFile({ name: 'untitled-' + (state.project.files.length + 1) + '.html', type: 'html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>Untitled</title>\n</head>\n<body>\n\n</body>\n</html>\n' });
    });
    wrap.appendChild(add);
  }

  function tabMenu(file, renameTab) {
    return [
      { label: 'Rename tab', run: renameTab },
      { label: file.pinned ? 'Unpin tab' : 'Pin tab (minimise)', run: function () { togglePin(file.id); } },
      { label: 'Close tab', run: function () { closeTab(file.id); } },
      { sep: true },
      { label: 'Close other tabs', run: function () { closeTabs('others', file.id); } },
      { label: 'Close tabs to the right', run: function () { closeTabs('right', file.id); } },
      { label: 'Close all tabs', run: function () { closeTabs('all', file.id); } },
      { sep: true },
      { label: 'Duplicate tab', run: function () { createFile({ name: file.name, type: file.type, content: file.content }); } },
      { label: 'Move tab left', run: function () { moveTab(file.id, 'left'); } },
      { label: 'Move tab right', run: function () { moveTab(file.id, 'right'); } },
      { sep: true },
      { label: 'Copy file name', run: function () { copyText(file.name, 'name'); } },
      { label: 'Copy file content', run: function () { copyText(file.content, file.name + ' content'); } },
      { label: 'Format file', run: function () { file.content = HS.format(file.content, file.type); save(); refreshAll(); log('info', file.name + ' formatted.'); } },
      { label: 'Set as main HTML', disabled: file.type !== 'html', run: function () { setMainHtml(file.id); log('info', file.name + ' is now the main page.'); } },
      { label: 'Save to snippet library', run: function () { state.snippets.push({ id: HS.uid('snip'), name: file.name, type: file.type, tags: 'tab', content: file.content }); save(); log('info', file.name + ' saved to the library.'); } },
      { label: 'Export this file', run: function () { exportFile(file); } },
      { label: 'Delete file', danger: true, run: function () { deleteFile(file.id); } }
    ];
  }

  /* ---------------- explorer + pages ---------------- */
  function renderExplorer() {
    var body = els.explorerBody;
    body.innerHTML = '';
    var tree = HS.el('div', { class: 'tree' });

    function node(label, opts) {
      var row = HS.el('div', { class: 'hs-node' + (opts.active ? ' active' : '') });
      row.appendChild(HS.el('span', { text: opts.icon || '📄' }));
      var nameSpan = HS.el('span', { text: label, style: { overflow: 'hidden', textOverflow: 'ellipsis' } });
      row.appendChild(nameSpan);
      row.__label = nameSpan;
      if (opts.star) row.appendChild(HS.el('span', { class: 'star', text: '★' }));
      if (opts.count !== undefined) row.appendChild(HS.el('span', { class: 'count', text: String(opts.count) }));
      if (opts.onClick) row.addEventListener('click', opts.onClick);
      if (opts.onMenu) row.addEventListener('contextmenu', function (e) { e.preventDefault(); openMenu(e.clientX, e.clientY, opts.onMenu()); });
      return row;
    }

    function renameNode(rowEl, current, commit) {
      if (!rowEl || !rowEl.__label) return;
      HS.renameInline(rowEl.__label, current, function (name) {
        if (name === current) return;
        commit(name);
      });
    }
    function fileMenu(file, rowEl) {
      return [
        { label: 'Open in tab', run: function () { openTab(file.id); } },
        { sep: true },
        { label: 'Rename', run: function () { renameNode(rowEl, file.name, function (name) { file.name = name; save(); refreshAll(); log('info', 'Renamed to ' + name + '.'); }); } },
        { label: 'Set as main HTML', disabled: file.type !== 'html', run: function () { setMainHtml(file.id); } },
        { label: 'Duplicate', run: function () { createFile({ name: file.name, type: file.type, content: file.content }); } },
        { label: 'Download this file', run: function () { exportFile(file); } },
        { sep: true },
        { label: 'Delete file', danger: true, run: function () { deleteFile(file.id); } }
      ];
    }
    function folderMenu(folder, rowEl) {
      return [
        { label: 'Rename folder', run: function () { renameNode(rowEl, folder.name, function (name) { folder.name = name; save(); refreshAll(); log('info', 'Renamed folder to ' + name + '.'); }); } },
        { label: 'New file inside', run: function () { createFile({ name: 'new-file.html', type: 'html', content: '', folderId: folder.id }); } },
        { label: 'Download folder as ZIP', run: function () {
          var files = state.project.files.filter(function (f) { return f.folderId === folder.id; });
          if (!files.length) { log('warn', 'That folder is empty.'); return; }
          HS.downloadBlob(HS.makeZip(files.map(function (f) { return { path: folder.name + '/' + f.name, text: f.content }; })), folder.name + '.zip');
          log('info', 'Exported ' + files.length + ' file(s) from ' + folder.name + '.');
        } },
        { sep: true },
        { label: 'Delete folder (keep files)', danger: true, run: function () {
          state.project.folders = state.project.folders.filter(function (f) { return f.id !== folder.id; });
          state.project.files.forEach(function (f) { if (f.folderId === folder.id) f.folderId = null; });
          save(); refreshAll();
        } }
      ];
    }

    tree.appendChild(HS.el('div', { class: 'hs-group', text: 'Pages' }));
    var pages = state.project.files.filter(function (f) { return f.type === 'html'; });
    pages.forEach(function (file) {
      var pageRow = node(file.name, { icon: '🌐', active: activeFile() && activeFile().id === file.id, star: file.main, onClick: function () { openTab(file.id); }, onMenu: function () { return fileMenu(file, pageRow); } });
      tree.appendChild(pageRow);
    });
    if (!pages.length) tree.appendChild(HS.el('div', { class: 'hs-node', text: 'No HTML pages yet.' }));

    tree.appendChild(HS.el('div', { class: 'hs-group', text: 'Files' }));
    state.project.files.filter(function (f) { return !f.folderId; }).forEach(function (file) {
      var looseRow = node(file.name, { active: activeFile() && activeFile().id === file.id, onClick: function () { openTab(file.id); }, onMenu: function () { return fileMenu(file, looseRow); } });
      tree.appendChild(looseRow);
    });
    state.project.folders.forEach(function (folder) {
      var files = state.project.files.filter(function (f) { return f.folderId === folder.id; });
      var folderRow = node(folder.name, { icon: '📁', count: files.length, onClick: function () {}, onMenu: function () { return folderMenu(folder, folderRow); } });
      tree.appendChild(folderRow);
      files.forEach(function (file) {
        var row = node(file.name, { active: activeFile() && activeFile().id === file.id, onClick: function () { openTab(file.id); }, onMenu: function () { return fileMenu(file, row); } });
        row.classList.add('indent');
        tree.appendChild(row);
      });
    });

    body.appendChild(tree);
  }

  function renderPages() {
    var body = els.pagesBody;
    body.innerHTML = '';
    var wrap = HS.el('div', { class: 'tree' });
    state.project.files.filter(function (f) { return f.type === 'html'; }).forEach(function (file) {
      var row = HS.el('div', { class: 'hs-node' + (activeFile() && activeFile().id === file.id ? ' active' : '') });
      row.appendChild(HS.el('span', { text: '🌐' }));
      row.appendChild(HS.el('span', { text: file.name }));
      var star = HS.el('button', { class: 'winbtn', text: '★', title: file.main ? 'This page is previewed' : 'Set as the page the preview runs' });
      star.style.marginLeft = 'auto';
      star.style.color = file.main ? 'var(--hs-accent)' : 'var(--hs-dim)';
      star.addEventListener('click', function (e) { e.stopPropagation(); setMainHtml(file.id); });
      row.appendChild(star);
      row.addEventListener('click', function () { openTab(file.id); });
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
  }

  /* ---------------- code panel ---------------- */
  function renderCode() {
    var panel = layout('code');
    var file = activeFile();
    var title = els.codeHead.querySelector('h2');
    if (title) title.textContent = file ? 'Code — ' + file.name : 'Code';
    els.codeActions.innerHTML = '';

    var sideWrap = HS.el('div', {});
    sideWrap.style.display = 'flex';
    sideWrap.style.minHeight = '0';
    sideWrap.style.flex = '1';
    sideWrap.style.flexDirection = state.settings.sideTabs ? 'row' : 'column';

    var tabBar = HS.el('div', { class: 'hs-tabs' + (state.settings.sideTabs ? ' vertical' : '') });
    els.tabsHost = tabBar;
    if (state.settings.sideTabs) {
      tabBar.style.borderRight = '1px solid var(--hs-border)';
      tabBar.style.height = '100%';
      tabBar.style.width = '168px';
      tabBar.style.flex = '0 0 168px';
    }
    sideWrap.appendChild(tabBar);
    renderTabs();

    var mainCol = HS.el('div', {});
    mainCol.style.display = 'flex';
    mainCol.style.flexDirection = 'column';
    mainCol.style.flex = '1';
    mainCol.style.minHeight = '0';

    var editorHost = HS.el('div', { class: 'hs-editor' });
    editorHost.style.display = 'none';
    editorHost.style.flexDirection = 'column';
    editorHost.style.flex = '1';
    editorHost.style.minHeight = '0';
    mainCol.appendChild(editorHost);

    var findHost = HS.el('div', {});
    findHost.style.display = state.findOpen ? 'flex' : 'none';
    findHost.style.flexDirection = 'column';
    findHost.style.flex = '1';
    findHost.style.minHeight = '0';
    mainCol.appendChild(findHost);

    var consoleBox = HS.el('div', { class: 'hs-console' });
    consoleBox.style.height = '34%';
    consoleBox.style.minHeight = '132px';
    consoleBox.style.borderTop = '1px solid var(--hs-border)';
    mainCol.appendChild(consoleBox);
    sideWrap.appendChild(mainCol);

    els.codeBody.innerHTML = '';
    els.codeBody.appendChild(sideWrap);

    if (state.findOpen) {
      editorHost.style.display = 'none';
      findHost.style.display = 'flex';
      HS.mountFindReplace(findHost, {
        files: function () { return state.project.files; },
        activeId: function () { return state.project.activeId; },
        onReplace: replaceInProject,
        onClose: function () { state.findOpen = false; renderCode(); }
      });
    } else {
      findHost.style.display = 'none';
      editorHost.style.display = 'flex';
      HS.Editor.mount(editorHost, editorCtx());
    }
    mountConsole(consoleBox);
    if (file) HS.Editor.setFile(file);
    else HS.Editor.setFile(null);
  }

  function editorCtx() {
    return {
      getSettings: function () { return state.settings; },
      onChange: function (content) { var file = activeFile(); if (!file) return; file.content = content; save(); renderExplorer(); renderPages(); renderStatus(); if (file.type === 'html' && file.main) refreshPreview(); },
      onFormat: formatActive,
      onFind: function () { state.findOpen = true; renderCode(); },
      onOpenSnippets: function () { openSnippets(); },
      onSave: function () { save(); log('info', 'Project saved to this browser.'); },
      onToggleSetting: function (key, value) { state.settings[key] = value; save(); renderTop(); HS.Editor.render(); },
      log: function (text) { if (text) log('debug', text); },
      openMenu: openMenu
    };
  }

  /* ---------------- console ---------------- */
  function mountConsole(host) {
    host.innerHTML = '';
    var head = HS.el('div', { class: 'head' });
    head.appendChild(HS.el('span', { text: '▮ Console' }));
    ['all', 'error', 'warn', 'info'].forEach(function (f) {
      var chip = HS.el('button', { class: 'chip' + (state.consoleFilter === f ? ' on' : ''), text: f, style: { textTransform: 'capitalize' } });
      chip.addEventListener('click', function () { state.consoleFilter = f; renderConsole(); });
      head.appendChild(chip);
    });
    var clear = HS.el('button', { class: 'winbtn', text: '🗑', title: 'Clear console' });
    clear.style.marginLeft = 'auto';
    clear.addEventListener('click', function () { state.console = []; renderConsole(); renderStatus(); });
    head.appendChild(clear);
    host.appendChild(head);

    var list = HS.el('div', { class: 'list' });
    host.appendChild(list);
    els.consoleList = list;

    var prompt = HS.el('div', { class: 'prompt' });
    prompt.appendChild(HS.el('span', { text: '›' }));
    var input = HS.el('input', { placeholder: 'Run JavaScript in the preview…' });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !input.value.trim()) return;
      var code = input.value.trim();
      input.value = '';
      log('debug', '> ' + code);
      var frame = els.frame;
      try { frame.contentWindow.postMessage({ source: 'hs-eval', code: code }, '*'); } catch (err) { log('error', 'Preview is not running.'); }
    });
    prompt.appendChild(input);
    host.appendChild(prompt);
    renderConsole();
  }
  function renderConsole() {
    if (!els.consoleList) return;
    var shown = state.console.filter(function (l) { return state.consoleFilter === 'all' || l.level === state.consoleFilter; });
    els.consoleList.innerHTML = '';
    var colors = { error: 'var(--hs-danger)', warn: '#fdd663', info: 'var(--hs-dim)', debug: 'var(--hs-dim)', log: 'var(--hs-text)', result: 'var(--hs-accent)' };
    shown.forEach(function (line) {
      var row = HS.el('div', { class: 'line' }, [
        HS.el('span', { class: 't', text: new Date(line.time).toLocaleTimeString() }),
        HS.el('span', { text: line.text, style: { color: colors[line.level] || 'var(--hs-text)' } })
      ]);
      els.consoleList.appendChild(row);
    });
    if (!shown.length) els.consoleList.appendChild(HS.el('p', { class: 'hs-msg', text: 'Console output appears here — logs, warnings and errors from your JavaScript.' }));
    els.consoleList.scrollTop = els.consoleList.scrollHeight;
  }

  /* ---------------- preview panel ---------------- */
  function renderPreviewPanel() {
    var body = els.previewBody;
    body.innerHTML = '';
    var wrap = HS.el('div', { class: 'hs-preview' });
    var head = HS.el('div', { class: 'head' });
    function chip(label, handler, on) {
      var btn = HS.el('button', { class: 'chip' + (on ? ' on' : ''), text: label });
      btn.addEventListener('click', handler);
      return btn;
    }
    head.appendChild(chip('Run', refreshPreview));
    head.appendChild(chip('New tab', openInNewTab));
    head.appendChild(HS.el('span', { class: 'grow' }));
    [['full', 'Fit', '100%'], ['desktop', '1280', '1280px'], ['tablet', '820', '820px'], ['phone', '390', '390px']].forEach(function (s) {
      var btn = HS.el('button', { class: 'chip', text: s[1] });
      btn.addEventListener('click', function () {
        els.frame.style.width = s[2];
        HS.$$('.chip', head).forEach(function (c) { c.classList.remove('on'); });
        btn.classList.add('on');
      });
      head.appendChild(btn);
    });
    head.appendChild(HS.el('span', { class: 'grow' }));
    head.appendChild(chip('FPS', function () { state.settings.showFps = !state.settings.showFps; save(); renderPreviewPanel(); sendMeters(); }, state.settings.showFps));
    head.appendChild(chip('RAM', function () { state.settings.showRam = !state.settings.showRam; save(); renderPreviewPanel(); sendMeters(); }, state.settings.showRam));
    wrap.appendChild(head);

    var store = readStore(state.key);
    var st = storeStats(store);
    var sbar = HS.el('div', { class: 'head' });
    sbar.appendChild(HS.el('span', { text: '🗄 key storage' }));
    els.storeTierEl = HS.el('span', { class: 'chip on', text: state.tier || 'no key' });
    sbar.appendChild(els.storeTierEl);
    els.storeInfoEl = HS.el('span', { text: st.entries + ' entries · ' + fmtBytes(st.bytes) });
    sbar.appendChild(els.storeInfoEl);
    var sList = HS.el('div', { style: { display: 'none', maxHeight: '120px', overflow: 'auto', fontSize: '11px', padding: '4px 10px' } });
    var sEntries = Object.keys(store.entries || {});
    if (!sEntries.length) sList.appendChild(HS.el('p', { class: 'hs-msg', text: 'Empty — pages write here with window.HSStorage.set(key, value).' }));
    sEntries.forEach(function (k) { sList.appendChild(HS.el('pre', { text: k + ' = ' + keyEntryText(store.entries[k]) })); });
    var sToggle = HS.el('button', { class: 'chip', text: 'what it holds' });
    sToggle.addEventListener('click', function () {
      var show = sList.style.display === 'none';
      sList.style.display = show ? 'block' : 'none';
      sToggle.textContent = show ? 'hide' : 'what it holds';
    });
    sbar.appendChild(sToggle);
    wrap.appendChild(sbar);
    wrap.appendChild(sList);

    var box = HS.el('div', { class: 'frame-box' });
    var frame = HS.el('iframe', { title: 'Live preview', sandbox: 'allow-scripts allow-modals allow-forms allow-popups allow-same-origin' });
    frame.style.width = '100%';
    frame.srcdoc = previewDoc();
    frame.addEventListener('load', sendMeters);
    box.appendChild(frame);
    wrap.appendChild(box);
    body.appendChild(wrap);
    els.frame = frame;
    setTimeout(sendMeters, 400);
  }

  /* ---------------- terminal ---------------- */
  function renderTerminalPanel() {
    var body = els.terminalBody;
    body.innerHTML = '';
    var wrap = HS.el('div', { class: 'hs-terminal' });
    var head = HS.el('div', { class: 'head' });
    head.appendChild(HS.el('span', { text: state.tier ? '🔓 advanced mode · ' + state.tier : '🔒 locked — no key accepted' }));
    var keyBtn = HS.el('button', { class: 'hs-btn', text: state.tier ? 'Switch key' : 'Enter key' });
    keyBtn.addEventListener('click', openKeyGate);
    head.appendChild(keyBtn);
    if (state.tier) {
      var lockBtn = HS.el('button', { class: 'hs-btn', text: 'Lock' });
      lockBtn.addEventListener('click', lock);
      head.appendChild(lockBtn);
    }
    var clearBtn = HS.el('button', { class: 'hs-btn', text: 'clear' });
    clearBtn.style.marginLeft = 'auto';
    clearBtn.addEventListener('click', function () { state.termLines = []; renderTerminalPanel(); });
    head.appendChild(clearBtn);
    wrap.appendChild(head);

    var out = HS.el('div', { class: 'out' });
    var lines = state.termLines || (state.termLines = [
      { level: 'info', text: 'HTML Studio Terminal — type help for commands, manual for the HSL guide.' },
      { level: 'info', text: 'Advanced commands need an access key: type admin to open the welcome screen.' }
    ]);
    lines.forEach(function (l) {
      out.appendChild(HS.el('pre', { class: l.level, text: l.text }));
    });
    wrap.appendChild(out);

    var prompt = HS.el('div', { class: 'prompt' });
    prompt.appendChild(HS.el('span', { text: '›' }));
    var input = HS.el('input', { placeholder: state.tier ? 'HSL command…' : 'type "admin" to unlock, or "help"' });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var raw = input.value.trim();
      input.value = '';
      if (!raw) return;
      runTerminalInput(raw);
    });
    prompt.appendChild(input);
    wrap.appendChild(prompt);
    body.appendChild(wrap);
    out.scrollTop = out.scrollHeight;
    els.termInput = input;
  }

  function say(text, level) {
    if (!state.termLines) state.termLines = [];
    state.termLines.push({ level: level || 'out', text: String(text) });
    var out = HS.$('.hs-terminal .out');
    if (out) {
      out.appendChild(HS.el('pre', { class: level || 'out', text: String(text) }));
      out.scrollTop = out.scrollHeight;
    }
  }

  function termHandler(command, args) {
    var arg = String(args || '').trim().replace(/^"|"$/g, '');
    switch (command) {
      case 'help': return 'Commands: help, manual, print, let, math, ls, tabs, new file/folder, open, close, rename tab, format, run, export, theme, name, set, snippets, snippet add, plugins, plugin example, store (manage, script, copy, rename, export, import), key, keys, keys list, owner, wipe, whoami, account, clear, version. Owner: audit, purge, broadcast, seal, backup, stats, sudo, purgeall.';
      case 'manual': return HS.MANUAL;
      case 'whoami': return state.tier ? 'Signed in with tier: ' + state.tier : 'Guest — no access key accepted yet.';
      case 'keys': {
        if (arg === 'list') {
          var lk = require('owner'); if (lk) return lk;
          return (window.HS_KEYS || []).map(function (k) {
            return k.key + ' → ' + k.tier + ' (' + k.label + ')' + (k.enabled === false ? ' — DISABLED' : '');
          }).join('\n');
        }
        if (window.HS_KEYS_ENABLED === false) return 'All keys are switched off in js/keys.js (window.HS_KEYS_ENABLED = false).';
        return 'Enabled tiers: ' + window.HSEnabledKeys().map(function (k) { return k.tier + ' (' + k.label + ')'; }).join(', ') + '. Use "keys list" (owner only) to reveal the keys.';
      }
      case 'owner': return window.can(state.tier, 'owner') ? 'Owner controls active — full authority.' : 'Owner-only command. Enter the owner key.';
      case 'wipe': { var lw = require('owner'); if (lw) return lw; try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} setTimeout(function () { window.location.reload(); }, 800); return 'All local storage wiped. Reloading…'; }
      case 'key': {
        var parts = String(args || '').trim().split(/\s+/);
        var found = parts.length >= 2 ? validateKey(parts[1], parts[0]) : validateKey(parts[0]);
        if (found) { state.tier = found.tier; renderTerminalPanel(); return 'Access granted — tier "' + found.tier + '".'; }
        return 'That key was not recognised. For username-protected keys, use: key <username> <key>.';
      }
      case 'version': return 'HTML Studio — ' + state.settings.appName + ' · theme ' + state.settings.theme + ' · ' + state.plugins.length + ' plugin(s)';
      case 'ls': return state.project.files.map(function (f) {
        var folder = folderById(f.folderId);
        return (folder ? folder.name + '/' : '') + f.name + ' (' + f.type + ', ' + f.content.split('\n').length + ' lines)';
      }).join('\n');
      case 'tabs': return state.project.openTabs.length ? state.project.openTabs.map(function (id) { var f = fileById(id); return f ? f.name : ''; }).join(', ') : 'No tabs open.';
      case 'open': {
        var f1 = fileByName(arg);
        if (!f1) return 'No file called ' + arg + '.';
        openTab(f1.id);
        return 'Opened ' + f1.name + '.';
      }
      case 'close': {
        var f2 = fileByName(arg);
        if (!f2) return 'No file called ' + arg + '.';
        closeTab(f2.id);
        return 'Closed ' + f2.name + '.';
      }
      case 'rename': {
        var lk2 = require('edit'); if (lk2) return lk2;
        var name = args.replace(/^tab\s+/, '').trim();
        var current = activeFile();
        if (!current || !name) return 'Usage: rename tab new-name.html';
        current.name = name;
        save(); refreshAll();
        return 'Renamed tab to ' + name + '.';
      }
      case 'new': {
        var lk3 = require('edit'); if (lk3) return lk3;
        if (args.indexOf('file ') === 0) {
          var fname = args.slice(5).trim();
          createFile({ name: fname, type: HS.detectType(fname), content: '' });
          return 'Created ' + fname + '.';
        }
        if (args.indexOf('folder ') === 0) {
          var folderName = args.slice(7).trim();
          createFolder(folderName);
          return 'Created folder ' + folderName + '.';
        }
        return 'Usage: new file name.html | new folder assets';
      }
      case 'format': {
        var lk4 = require('edit'); if (lk4) return lk4;
        formatActive();
        return 'Reformatted the active file.';
      }
      case 'run':
        refreshPreview();
        return 'Preview re-run.';
      case 'export': {
        var lk5 = require('edit'); if (lk5) return lk5;
        exportProjectZip();
        return 'Project ZIP downloaded.';
      }
      case 'theme': {
        var lk6 = require('edit'); if (lk6) return lk6;
        state.settings.theme = arg;
        save(); applyThemeNow(); renderTop();
        renderPreviewPanel();
        return 'Theme set to ' + arg + '.';
      }
      case 'name': {
        var lk7 = require('edit'); if (lk7) return lk7;
        state.settings.appName = arg || 'HTML Studio';
        save(); renderTop();
        return 'Studio renamed to ' + arg + '.';
      }
      case 'set': {
        var lk8 = require('edit'); if (lk8) return lk8;
        var pair = args.split(/\s+/);
        var map = { fps: 'showFps', ram: 'showRam', minimap: 'showMinimap', wrap: 'wordWrap', sidetabs: 'sideTabs' };
        if (!map[pair[0]]) return 'Usage: set fps|ram|minimap|wrap|sidetabs true|false';
        state.settings[map[pair[0]]] = String(pair[1]).toLowerCase() === 'true';
        save(); renderTop(); renderCode(); renderPreviewPanel();
        return pair[0] + ' is now ' + state.settings[map[pair[0]]] + '.';
      }
      case 'snippets': return state.snippets.map(function (s) { return s.name + ' (' + s.type + ')'; }).join(', ') || 'Library is empty.';
      case 'snippet': {
        var lk9 = require('edit'); if (lk9) return lk9;
        var file = activeFile();
        if (!file) return 'Nothing open to save.';
        var label = args.replace(/^add\s*/i, '').replace(/^"|"$/g, '') || file.name;
        state.snippets.push({ id: HS.uid('snip'), name: label, type: file.type, tags: 'terminal', content: file.content });
        save();
        return 'Saved "' + label + '" to the library (' + state.snippets.length + ' snippets).';
      }
      case 'plugins': return state.plugins.length ? state.plugins.map(function (p) { return p.name + ' — ' + (p.enabled ? 'enabled' : 'disabled'); }).join(', ') : 'No plugins installed.';
      case 'plugin': {
        var lkA = require('admin'); if (lkA) return lkA;
        if (arg === 'example') {
          installPlugin({ id: 'example', name: 'Example plugin', enabled: true, source: HS.EXAMPLE_PLUGIN_SOURCE });
          return 'Installed the example plugin — try "hello" or "stamp", and check the theme list.';
        }
        return 'Usage: plugin example';
      }
      case 'account': {
        if (!state.key) return 'No key active in this session.';
        var ak = readStore(state.key), ast = storeStats(ak);
        return 'Account\nUsername: ' + (state.key.username || '(none)') + '\nTier: ' + state.key.tier + '\nKey: ' + state.key.label + '\nStore: ' + ak.storeId + '\nStorage: ' + ast.entries + ' entries · ' + fmtBytes(ast.bytes);
      }
      case 'store': {
        if (!state.key) return 'No key active — enter a key first.';
        var sub = arg.split(/\s+/)[0];
        var rest = String(args || '').trim().slice(sub.length).trim();
        if (sub === 'manage' || sub === 'panel') {
          openStoreManager();
          return 'Opening the key storage panel…';
        }
        if (sub === 'script' || sub === 'download') {
          var sName = window.HSKV.scriptName(state.key);
          HS.downloadText(window.HSKV.scriptText(state.key), 'hs-storage-' + sName + '.js', 'application/javascript');
          return 'Storage script downloaded — hs-storage-' + sName + '.js, bound to ' + (state.key.username || state.key.label) + '.\nCommit it as js/' + sName + '.js in your GitHub repo.';
        }
        if (sub === 'copy') {
          copyText(window.HSKV.scriptText(state.key), 'storage script');
          return 'Storage script copied — paste it into js/' + window.HSKV.scriptName(state.key) + '.js on GitHub.';
        }
        if (sub === 'rename') {
          var lrn = require('edit'); if (lrn) return lrn;
          if (!rest) return 'Usage: store rename <name> — names this key\'s storage script file.';
          window.HSKV.setScriptName(state.key, rest);
          refreshStoreBar();
          return 'Storage script renamed to hs-storage-' + window.HSKV.scriptName(state.key) + '.js and still linked to this key.';
        }
        if (sub === 'export') {
          HS.downloadText(window.HSKV.bundleText(), 'hs-key-storages.json', 'application/json');
          return 'Exported every key storage — transfer hs-key-storages.json, then "store import" on the other machine.';
        }
        if (sub === 'import') {
          var lin = require('edit'); if (lin) return lin;
          window.HSKV.pickImport(function (count) {
            say(count ? 'Restored ' + count + ' storage(s) from the bundle.' : 'That file was not a key-storage bundle.', count ? 'info' : 'error');
            refreshStoreBar(); renderPreviewPanel();
          });
          return 'Choose a hs-key-storages.json file to restore…';
        }
        if (!sub || sub === 'list') {
          var s = readStore(state.key), st1 = storeStats(s);
          var body = Object.keys(s.entries).length ? Object.keys(s.entries).map(function (k) { return k + ' = ' + keyEntryText(s.entries[k]); }).join('\n') : '(empty)';
          return 'Key storage · ' + state.key.tier + ' · ' + state.key.label + '\nStore id: ' + s.storeId + '\n' + st1.entries + ' entries · ' + fmtBytes(st1.bytes) + '\n' + body;
        }
        if (sub === 'get') {
          var sg = readStore(state.key);
          if (!(rest in sg.entries)) return 'Nothing stored under "' + rest + '".';
          var gv = sg.entries[rest];
          return typeof gv === 'object' ? JSON.stringify(gv, null, 2) : String(gv);
        }
        if (sub === 'set') {
          var lset = require('edit'); if (lset) return lset;
          var m = /^(\S+)\s+([\s\S]*)$/.exec(rest);
          if (!m) return 'Usage: store set <name> <value>';
          var nv = m[2]; try { nv = JSON.parse(m[2]); } catch (e) { /* keep string */ }
          var cs = readStore(state.key); cs.entries[m[1]] = nv; writeStore(state.key, cs.entries); refreshStoreBar();
          return 'Stored "' + m[1] + '".';
        }
        if (sub === 'remove' || sub === 'rm') {
          var lrm = require('edit'); if (lrm) return lrm;
          var cr = readStore(state.key); delete cr.entries[rest]; writeStore(state.key, cr.entries); refreshStoreBar();
          return 'Removed "' + rest + '".';
        }
        if (sub === 'clear') {
          var lcl = require('edit'); if (lcl) return lcl;
          writeStore(state.key, {}); refreshStoreBar();
          return "Cleared this key's storage.";
        }
        return 'Usage: store | store get <name> | store set <name> <value> | store remove <name> | store clear\n'
          + 'Transfer: store script (download this key\'s storage script) | store copy (copy it for GitHub) | store rename <name> (rename the script) | store export (all storages) | store import (restore a bundle)';
      }
      case 'audit': {
        var la = require('owner'); if (la) return la;
        var au = readStore(state.key), aust = storeStats(au);
        return 'SESSION AUDIT\nTier: ' + state.tier + '\nKey: ' + (state.key ? state.key.label : '—') + '\nUsername: ' + (state.key ? (state.key.username || '—') : '—') + '\nStore: ' + (au.storeId || '—') + '\nStorage: ' + aust.entries + ' entries · ' + fmtBytes(aust.bytes) + '\nFiles: ' + state.project.files.length + '\nPlugins: ' + state.plugins.length;
      }
      case 'purge': {
        var lp = require('owner'); if (lp) return lp;
        var tg = allKeys().filter(function (k) { return k.tier === arg.toLowerCase(); });
        if (!tg.length) return 'Usage: purge <tier> — guest, dev, admin, owner';
        tg.forEach(function (k) { writeStore(k, {}); });
        refreshStoreBar();
        return 'Purged ' + tg.length + ' storage(s) for ' + arg + '.';
      }
      case 'broadcast': {
        var lb = require('owner'); if (lb) return lb;
        if (!arg || arg === 'clear' || arg === 'off') { state.settings.broadcast = ''; save(); renderStatus(); return 'Broadcast cleared.'; }
        state.settings.broadcast = arg; save(); renderStatus();
        return 'Broadcast posted: ' + arg;
      }
      case 'seal': {
        var lseal = require('owner'); if (lseal) return lseal;
        setTimeout(lock, 300);
        return 'Studio sealed — session dropped.';
      }
      case 'backup': {
        var lbk = require('owner'); if (lbk) return lbk;
        var stores = allKeys().map(function (k) { return { storeId: kStoreId(k), tier: k.tier, label: k.label, username: k.username || '', entries: readStore(k).entries }; });
        HS.downloadText(JSON.stringify({ app: 'HTML Studio', exported: new Date().toISOString(), project: state.project, settings: state.settings, stores: stores }, null, 2), 'hs-master-backup.json', 'application/json');
        return 'Master backup downloaded (' + stores.length + ' key stores).';
      }
      case 'stats': {
        var lst = require('owner'); if (lst) return lst;
        return allKeys().map(function (k) { var ss = storeStats(readStore(k)); return k.tier + ' ' + k.label + ' — ' + ss.entries + ' entries · ' + fmtBytes(ss.bytes); }).join('\n');
      }
      case 'sudo': {
        if (!state.key || state.key.tier !== 'owner') return 'Owner only.';
        if (!arg || arg === 'restore' || arg === 'owner') { state.tier = 'owner'; renderTerminalPanel(); renderStatus(); return 'Owner tier restored.'; }
        if (['guest', 'dev', 'admin'].indexOf(arg) < 0) return 'Usage: sudo guest|dev|admin|restore';
        state.tier = arg; renderTerminalPanel(); renderStatus();
        return 'Now viewing as "' + arg + '". Type "sudo restore" to return to owner.';
      }
      case 'purgeall': {
        var lpa = require('owner'); if (lpa) return lpa;
        allKeys().forEach(function (k) { writeStore(k, {}); });
        refreshStoreBar();
        return 'Cleared storage for all ' + allKeys().length + ' keys.';
      }
      case 'clear':
        state.termLines = [];
        renderTerminalPanel();
        return null;
      default:
        return undefined;
    }
  }

  function runTerminalInput(raw) {
    say('› ' + raw, 'in');
    if (/^(admin|key|access)$/i.test(raw)) { openKeyGate(); say('Opening the key lock…', 'info'); return; }
    var word = raw.split(/\s+/)[0].toLowerCase();
    if (HS.pluginHost && HS.pluginHost.commands[word]) {
      try { HS.pluginHost.commands[word].fn(pluginCtx(restOf(raw))); } catch (e) { say('Plugin error: ' + e.message, 'error'); }
      return;
    }
    HS.createInterpreter({ handler: termHandler, print: say }).run(raw);
  }
  function restOf(raw) { return raw.split(/\s+/).slice(1).join(' '); }

  /* ---------------- plugins ---------------- */
  var pluginRegistryVersion = 0;
  function pluginCtx(args) {
    return {
      say: function (m) { say(String(m), 'info'); log('info', String(m)); },
      args: args || '',
      files: function () { return state.project.files; },
      tabs: function () { return state.project.openTabs; },
      getContent: function () { var f = activeFile(); return f ? f.content : ''; },
      setContent: function (text) { var f = activeFile(); if (f) { f.content = text; save(); refreshAll(); } },
      addFile: function (name, content) { createFile({ name: name, content: content }); },
      settings: state.settings
    };
  }
  function installPlugin(plugin) {
    state.plugins = state.plugins.filter(function (p) { return p.id !== plugin.id; }).concat([plugin]);
    save(); bootPlugins(); renderTop();
  }
  function bootPlugins() {
    HS.pluginHost = HS.createPluginHost({
      registerTheme: function (theme) {
        state.settings.customThemes = (state.settings.customThemes || []).filter(function (t) { return t.id !== theme.id; }).concat([theme]);
        save();
      },
      say: function (msg) { log('info', String(msg)); },
      files: function () { return state.project.files; },
      tabs: function () { return state.project.openTabs; },
      getContent: function () { var f = activeFile(); return f ? f.content : ''; },
      setContent: function (text) { var f = activeFile(); if (f) { f.content = text; save(); refreshAll(); } },
      addFile: function (name, content) { createFile({ name: name, content: content }); }
    });
    var errors = HS.pluginHost.loadAll(state.plugins);
    errors.forEach(function (e) { log('error', 'Plugin failed — ' + e); });
    pluginRegistryVersion += 1;
  }

  /* ---------------- modals ---------------- */
  function openModal(node) {
    var backdrop = HS.el('div', { class: 'hs-backdrop' });
    backdrop.appendChild(node);
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });
    function close() { backdrop.remove(); }
    HS.$('#hs-modals').appendChild(backdrop);
    return close;
  }

  function modalShell(title, opts) {
    opts = opts || {};
    var modal = HS.el('div', { class: 'hs-modal' + (opts.narrow ? ' narrow' : '') });
    var content = HS.el('div', { class: 'content' });
    var header = HS.el('header');
    header.appendChild(HS.el('h2', { text: title }));
    var grow = HS.el('span', { class: 'grow' });
    header.appendChild(grow);
    var closeBtn = HS.el('button', { class: 'winbtn', text: '✕' });
    header.appendChild(closeBtn);
    var body = HS.el('div', { class: 'body' });
    content.appendChild(header); content.appendChild(body);
    modal.appendChild(content);
    if (opts.nav) modal.insertBefore(opts.nav, content);
    var close = openModal(modal);
    closeBtn.addEventListener('click', close);
    return { close: close, body: body, header: header, modal: modal };
  }

  function openTemplates() {
    var shell = modalShell('Templates');
    var cats = ['All'].concat(HS.TEMPLATE_CATEGORIES);
    var bar = HS.el('div', { class: 'hs-tabs' });
    var grid = HS.el('div', {});
    function paint(cat) {
      grid.innerHTML = '';
      HS.TEMPLATES.filter(function (t) { return cat === 'All' || t.category === cat; }).forEach(function (tpl) {
        var card = HS.el('button', { class: 'hs-card' }, [
          HS.el('strong', { text: tpl.name }),
          HS.el('span', { text: tpl.description }),
          HS.el('span', { class: 'hs-tag', text: tpl.category })
        ]);
        card.addEventListener('click', function () {
          var base = tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          var ext = tpl.type === 'css' ? 'css' : tpl.type === 'js' ? 'js' : 'html';
          createFile({ name: base + '.' + ext, type: tpl.type, content: tpl.content });
          log('info', 'New file from template: ' + tpl.name + '.');
          shell.close();
        });
        grid.appendChild(card);
      });
    }
    cats.forEach(function (c) {
      var chip = HS.el('button', { class: 'hs-tool' + (c === 'All' ? ' on' : ''), text: c });
      chip.addEventListener('click', function () {
        HS.$$('.hs-tool', bar).forEach(function (b) { b.classList.remove('on'); });
        chip.classList.add('on');
        paint(c);
      });
      bar.appendChild(chip);
    });
    shell.body.appendChild(bar);
    grid.className = 'hs-cards';
    grid.style.marginTop = '12px';
    shell.body.appendChild(grid);
    paint('All');
  }

  function openSnippets() {
    var shell = modalShell('Snippet library');
    var bar = HS.el('div', { class: 'hs-tabs' });
    var saveBtn = HS.el('button', { class: 'hs-btn primary', text: '＋ Save current file' });
    saveBtn.addEventListener('click', function () {
      var file = activeFile();
      if (!file) return;
      state.snippets.push({ id: HS.uid('snip'), name: file.name, type: file.type, tags: 'manual', content: file.content });
      save();
      log('info', file.name + ' saved to the library.');
      shell.close();
      openSnippets();
    });
    bar.appendChild(saveBtn);
    shell.body.appendChild(bar);
    var list = HS.el('div', {});
    list.style.marginTop = '10px';
    shell.body.appendChild(list);
    function paint() {
      list.innerHTML = '';
      state.snippets.forEach(function (snip) {
        var card = HS.el('div', { class: 'hs-card' });
        var top = HS.el('div', {});
        top.style.display = 'flex';
        top.style.alignItems = 'center';
        top.style.gap = '8px';
        top.appendChild(HS.el('strong', { text: snip.name }));
        top.appendChild(HS.el('span', { class: 'hs-tag', text: snip.type }));
        if (snip.tags) top.appendChild(HS.el('span', { class: 'hs-msg', text: '#' + snip.tags }));
        var insert = HS.el('button', { class: 'hs-btn', text: 'insert' });
        insert.style.marginLeft = 'auto';
        insert.addEventListener('click', function () {
          var file = activeFile();
          if (!file) { createFile({ name: snip.name.replace(/\s+/g, '-').toLowerCase() + '.' + snip.type, type: snip.type, content: snip.content }); }
          else { file.content = file.content.replace(/\s*$/, '') + '\n\n' + snip.content; save(); refreshAll(); log('info', 'Inserted "' + snip.name + '" into ' + file.name + '.'); }
          shell.close();
        });
        top.appendChild(insert);
        var copy = HS.el('button', { class: 'winbtn', text: '⧉', title: 'Copy' });
        copy.addEventListener('click', function () { copyText(snip.content, snip.name); });
        top.appendChild(copy);
        var del = HS.el('button', { class: 'winbtn close', text: '✕', title: 'Delete' });
        del.addEventListener('click', function () {
          state.snippets = state.snippets.filter(function (s) { return s.id !== snip.id; });
          save(); paint();
        });
        top.appendChild(del);
        card.appendChild(top);
        var pre = HS.el('pre', { class: 'hs-pre', text: snip.content.slice(0, 400) });
        pre.style.marginTop = '8px';
        card.appendChild(pre);
        list.appendChild(card);
      });
      if (!state.snippets.length) list.appendChild(HS.el('p', { text: 'The library is empty.' }));
    }
    paint();
  }

  function openKeyGate() {
    if (HS.$('#hs-keygate')) return;
    var wrap = HS.el('div', { id: 'hs-keygate' });
    wrap.className = 'hs-keygate';
    var card = HS.el('div', { class: 'card' });
    card.style.maxWidth = '440px';
    card.style.textAlign = 'left';
    var badge = HS.el('span', { class: 'badge', text: '🔒' });
    badge.style.marginBottom = '12px';
    var head = HS.el('div', { class: 'head' }, [
      HS.el('div', {}, [
        HS.el('h2', { text: 'HTML Studio' }),
        HS.el('p', { class: 'hs-msg', text: 'Sign in with your access key to continue' })
      ])
    ]);
    head.style.flexDirection = 'column';
    head.style.alignItems = 'center';
    head.style.textAlign = 'center';
    card.appendChild(head);
    card.appendChild(HS.el('label', { class: 'hs-label', text: 'Username (optional)' }));
    var userInput = HS.el('input', { class: 'hs-input', type: 'text', placeholder: 'ada, owner, or leave blank' });
    card.appendChild(userInput);
    card.appendChild(HS.el('label', { class: 'hs-label', text: 'Access key', style: { marginTop: '14px' } }));
    var keyInput = HS.el('input', { class: 'hs-input', type: 'password', placeholder: '••••••••' });
    card.appendChild(keyInput);
    var go = HS.el('button', { class: 'hs-btn primary', text: 'Sign in' });
    go.style.width = '100%';
    go.style.marginTop = '16px';
    card.appendChild(go);
    var help = window.HS_KEYS_HELP || {};
    var msg = HS.el('p', { class: 'hs-msg', text: (help.simple || 'Keys are stored in js/keys.js — one line per key.') + ' ' + (help.tiers || '') });
    msg.style.marginTop = '12px';
    card.appendChild(msg);
    if (window.HS_KEYS_ENABLED === false) {
      msg.className = 'hs-msg bad';
      msg.textContent = 'All keys are switched off in js/keys.js (window.HS_KEYS_ENABLED = false). Set it back to true to sign in.';
      go.disabled = true;
      go.style.opacity = '0.4';
      keyInput.disabled = true;
      userInput.disabled = true;
    }
    wrap.appendChild(card);
    function submit() {
      var found = validateKey(keyInput.value, userInput.value);
      if (found) {
        state.tier = found.tier;
        state.key = found;
        try { sessionStorage.setItem('hs_unlocked_key', JSON.stringify({ key: found.key, username: userInput.value || '' })); } catch (e) { /* ignore */ }
        msg.className = 'hs-msg ok';
        msg.textContent = 'Access granted · ' + found.label;
        log('info', 'Access granted — tier "' + found.tier + '".');
        renderTerminalPanel();
        renderStatus();
        renderPreviewPanel();
        setTimeout(function () { wrap.remove(); }, 500);
      } else {
        card.classList.add('shake');
        setTimeout(function () { card.classList.remove('shake'); }, 520);
        msg.className = 'hs-msg bad';
        msg.textContent = 'Invalid credentials — check your username and key.';
        keyInput.value = '';
        keyInput.focus();
      }
    }
    go.addEventListener('click', submit);
    function onKey(e) { if (e.key === 'Enter') submit(); }
    userInput.addEventListener('keydown', onKey);
    keyInput.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    keyInput.focus();
  }

  function lock() {
    try { sessionStorage.removeItem('hs_unlocked_key'); } catch (e) { /* ignore */ }
    state.tier = null;
    state.key = null;
    renderTerminalPanel();
    renderStatus();
    renderPreviewPanel();
    openKeyGate();
  }

  function openStoreManager() {
    window.HSKeyStorageManager.open({
      tier: state.tier,
      activeKey: state.key,
      say: function (msg, level) { say(msg, level || 'info'); },
      onChanged: function (hard) {
        refreshStoreBar();
        renderStatus();
        if (hard) renderPreviewPanel();
      }
    });
  }

  function openSettings() {
    var nav = HS.el('nav');
    var shell = modalShell('Appearance', { nav: nav });
    var tabs = [
      ['look', 'Appearance'], ['themes', 'Themes'], ['layout', 'Layout'],
      ['plugins', 'Plugins'], ['terminal', 'Terminal'], ['storage', 'Storage']
    ];
    var current = 'look';
    function paint() {
      shell.body.innerHTML = '';
      shell.header.querySelector('h2').textContent = (tabs.filter(function (t) { return t[0] === current; })[0] || [])[1] || 'Settings';
      HS.$$('button', nav).forEach(function (b) { b.classList.toggle('active', b.dataset.tab === current); });
      if (current === 'look') paintLook();
      if (current === 'themes') paintThemes();
      if (current === 'layout') paintLayout();
      if (current === 'plugins') paintPlugins();
      if (current === 'terminal') paintTerminal();
      if (current === 'storage') paintStorage();
    }
    tabs.forEach(function (t) {
      var btn = HS.el('button', { text: t[1], 'data-tab': t[0] });
      btn.addEventListener('click', function () { current = t[0]; paint(); });
      nav.appendChild(btn);
    });

    function row(label, hint, value, onChange) {
      var el = HS.el('div', { class: 'hs-row' }, [
        HS.el('span', {}, [HS.el('span', { text: label }), hint ? HS.el('span', { class: 'hint', text: hint }) : null]),
        HS.el('span', { class: 'hs-switch' + (value ? ' on' : '') }, [HS.el('i', {})])
      ]);
      el.addEventListener('click', function () { onChange(!value); });
      return el;
    }

    function paintLook() {
      var box = HS.el('div', {});
      box.appendChild(HS.el('label', { class: 'hs-label', text: 'Studio name' }));
      var nameInput = HS.el('input', { class: 'hs-input', value: state.settings.appName });
      nameInput.addEventListener('input', function () { state.settings.appName = nameInput.value; save(); renderTop(); });
      box.appendChild(nameInput);
      box.appendChild(row('Side tabs', 'Show open tabs down the side of the explorer.', state.settings.sideTabs, function (v) { state.settings.sideTabs = v; save(); renderCode(); }));
      box.appendChild(row('Code minimap', 'Scaled overview with a draggable viewport indicator.', state.settings.showMinimap, function (v) { state.settings.showMinimap = v; save(); HS.Editor.render(); paint(); }));
      box.appendChild(row('Word wrap', null, state.settings.wordWrap, function (v) { state.settings.wordWrap = v; save(); HS.Editor.render(); paint(); }));
      box.appendChild(row('FPS meter in preview', 'Also shown in the new-tab and about:blank view.', state.settings.showFps, function (v) { state.settings.showFps = v; save(); sendMeters(); paint(); }));
      box.appendChild(row('Memory meter in preview', null, state.settings.showRam, function (v) { state.settings.showRam = v; save(); sendMeters(); paint(); }));
      shell.body.appendChild(box);
    }

    function paintThemes() {
      var grid = HS.el('div', { class: 'hs-cards' });
      HS.allThemes(state.settings).forEach(function (t) {
        var card = HS.el('div', { class: 'hs-theme-card' });
        card.style.background = t.tokens.panel;
        card.appendChild(HS.el('strong', { text: t.name, style: { color: t.tokens.text } }));
        card.appendChild(HS.el('span', { class: 'hs-msg', text: (HS.THEMES.filter(function (b) { return b.id === t.id; }).length ? 'built-in' : 'personal · saved locally') }));
        var apply = HS.el('button', { class: 'hs-btn', text: 'Apply' });
        apply.style.marginTop = '8px';
        apply.addEventListener('click', function () { state.settings.theme = t.id; save(); applyThemeNow(); renderTop(); paint(); });
        card.appendChild(apply);
        grid.appendChild(card);
      });
      shell.body.appendChild(grid);

      var draft = { name: 'My theme', radius: '16px' };
      HS.THEME_VARS.forEach(function (k) { draft[k] = '#111111'; });
      var builder = HS.el('div', {});
      builder.style.marginTop = '18px';
      builder.appendChild(HS.el('p', { text: 'Create a personal theme — saved to this browser and included when you download your storage.' }));
      builder.appendChild(HS.el('label', { class: 'hs-label', text: 'Theme name' }));
      var nameInput = HS.el('input', { class: 'hs-input', value: draft.name });
      nameInput.addEventListener('input', function () { draft.name = nameInput.value; });
      builder.appendChild(nameInput);
      var swatches = HS.el('div', { class: 'hs-grid' });
      swatches.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
      swatches.style.marginTop = '10px';
      HS.THEME_VARS.concat(['radius']).forEach(function (key) {
        var swatch = HS.el('label', { class: 'hs-swatch' });
        var picker = HS.el('input', { type: 'color', value: '#111111' });
        picker.addEventListener('input', function () { draft[key] = picker.value; });
        swatch.appendChild(picker);
        swatch.appendChild(HS.el('span', { text: key }));
        swatches.appendChild(swatch);
      });
      builder.appendChild(swatches);
      var saveTheme = HS.el('button', { class: 'hs-btn primary', text: 'Save theme & apply' });
      saveTheme.style.marginTop = '12px';
      saveTheme.addEventListener('click', function () {
        var tokens = {};
        HS.THEME_VARS.forEach(function (k) { tokens[k] = draft[k]; });
        tokens.radius = draft.radius;
        tokens.radiusSm = draft.radius === '0px' ? '0px' : '10px';
        tokens.font = "'Google Sans', Roboto, Arial, sans-serif";
        tokens.mono = "'Roboto Mono', monospace";
        var id = 'custom_' + draft.name.toLowerCase().replace(/\s+/g, '-');
        state.settings.customThemes = (state.settings.customThemes || []).filter(function (t) { return t.id !== id; }).concat([{ id: id, name: draft.name, tokens: tokens }]);
        state.settings.theme = id;
        save(); applyThemeNow(); renderTop(); paint();
        log('info', 'Personal theme "' + draft.name + '" saved.');
      });
      builder.appendChild(saveTheme);
      var removeThemes = HS.el('button', { class: 'hs-btn', text: 'Remove personal themes' });
      removeThemes.style.marginLeft = '8px';
      removeThemes.addEventListener('click', function () { state.settings.customThemes = []; save(); applyThemeNow(); renderTop(); paint(); });
      builder.appendChild(removeThemes);
      shell.body.appendChild(builder);
    }

    function paintLayout() {
      shell.body.appendChild(HS.el('p', { text: 'Drag a panel header to move it, drag its bottom-right corner to resize, and drag to a screen edge to snap it into a half or full screen. The buttons beside the grip minimise, maximise and close each frame.' }));
      var reset = HS.el('button', { class: 'hs-btn primary', text: 'Reset panel layout' });
      reset.addEventListener('click', function () { state.settings.layout = {}; save(); renderPanels(); });
      shell.body.appendChild(reset);
      var list = HS.el('div', {});
      list.style.marginTop = '12px';
      ['explorer', 'pages', 'code', 'preview', 'terminal'].forEach(function (id) {
        list.appendChild(HS.el('div', { class: 'hs-row' }, [
          HS.el('span', { text: id, style: { textTransform: 'capitalize' } }),
          HS.el('span', { class: 'hint', text: (layout(id).open ? 'open' : 'closed') + ' · ' + Math.round(layout(id).w) + '% × ' + Math.round(layout(id).h) + '%' })
        ]));
      });
      shell.body.appendChild(list);
    }

    function paintPlugins() {
      var presets = HS.PRESET_PLUGINS || [];
      if (presets.length) {
        shell.body.appendChild(HS.el('p', { text: 'Preset plugins — click to install:', style: { fontWeight: '500', marginTop: '4px' } }));
        var grid = HS.el('div', { class: 'hs-cards' });
        grid.style.marginBottom = '14px';
        presets.forEach(function (p) {
          var installed = state.plugins.some(function (x) { return x.id === p.id; });
          var card = HS.el('div', { class: 'hs-card' });
          card.appendChild(HS.el('strong', { text: p.name }));
          card.appendChild(HS.el('span', { class: 'hs-msg', text: p.desc }));
          var btn = HS.el('button', { class: 'hs-btn' + (installed ? '' : ' primary'), text: installed ? 'Installed' : 'Install', style: { marginTop: '8px' } });
          btn.addEventListener('click', function () {
            if (installed) return;
            installPlugin({ id: p.id, name: p.name, enabled: true, source: p.source });
            log('info', 'Installed preset: ' + p.name);
            paint();
          });
          card.appendChild(btn);
          grid.appendChild(card);
        });
        shell.body.appendChild(grid);
      }
      shell.body.appendChild(HS.el('p', { text: 'A plugin is a small JS module. Register commands (they run in the Terminal), UI panels (buttons in the top bar) and themes.' }));
      state.plugins.forEach(function (p) {
        var row = HS.el('div', { class: 'hs-row' });
        row.appendChild(HS.el('span', { text: p.name }));
        row.appendChild(HS.el('span', { class: 'hint', text: p.enabled ? 'enabled' : 'disabled' }));
        var toggle = HS.el('button', { class: 'hs-btn', text: p.enabled ? 'Disable' : 'Enable' });
        toggle.style.marginLeft = 'auto';
        toggle.addEventListener('click', function () { p.enabled = !p.enabled; save(); bootPlugins(); renderTop(); paint(); });
        row.appendChild(toggle);
        var del = HS.el('button', { class: 'winbtn close', text: '✕', title: 'Remove plugin' });
        del.addEventListener('click', function () { state.plugins = state.plugins.filter(function (x) { return x.id !== p.id; }); save(); bootPlugins(); renderTop(); paint(); });
        row.appendChild(del);
        shell.body.appendChild(row);
      });
      var area = HS.el('textarea', { class: 'hs-textarea', rows: '9', placeholder: 'register({\n  name: "My plugin",\n  commands: { ping: function (ctx) { ctx.say("pong"); } },\n  panels: [{ id: "ping", label: "Ping", run: function (ctx) { ctx.say("pong"); } }],\n  themes: []\n});' });
      area.style.marginTop = '12px';
      shell.body.appendChild(area);
      var install = HS.el('button', { class: 'hs-btn primary', text: '＋ Install plugin' });
      install.style.marginTop = '10px';
      install.addEventListener('click', function () {
        if (!area.value.trim()) return;
        var nameMatch = area.value.match(/name:\s*['"]([^'"]+)/);
        installPlugin({ id: HS.uid('pl'), name: nameMatch ? nameMatch[1] : 'Custom plugin', enabled: true, source: area.value });
        log('info', 'Plugin installed.');
        paint();
      });
      shell.body.appendChild(install);
      var example = HS.el('button', { class: 'hs-btn', text: 'Insert example plugin' });
      example.style.marginTop = '10px';
      example.style.marginLeft = '8px';
      example.addEventListener('click', function () { area.value = HS.EXAMPLE_PLUGIN_SOURCE; });
      shell.body.appendChild(example);
    }

    function paintTerminal() {
      shell.body.appendChild(HS.el('pre', { class: 'hs-pre', text: HS.MANUAL }));
      var box = HS.el('div', { class: 'hs-card' });
      box.style.marginTop = '12px';
      box.appendChild(HS.el('strong', { text: 'Access keys' }));
      box.appendChild(HS.el('p', { text: 'Keys live in js/keys.js — one line per key. Tiers available: ' + (window.HS_KEYS || []).map(function (k) { return k.tier; }).join(', ') + '.' }));
      shell.body.appendChild(box);
    }

    function paintStorage() {
      shell.body.appendChild(HS.el('p', { text: 'Everything you build is stored in this browser. Download it to keep a copy, or open a saved copy to restore it.' }));
      var row = HS.el('div', {});
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.flexWrap = 'wrap';
      var dl = HS.el('button', { class: 'hs-btn primary', text: '⬇ Download my storage' });
      dl.addEventListener('click', function () { HS.downloadText(HS.exportWorkspace(), 'html-studio-workspace.json', 'application/json'); });
      row.appendChild(dl);
      var openBtn = HS.el('button', { class: 'hs-btn', text: '⬆ Open a saved storage file' });
      var input = HS.el('input', { type: 'file', accept: '.json', style: { display: 'none' } });
      input.addEventListener('change', function () {
        if (!input.files[0]) return;
        HS.readFileText(input.files[0]).then(function (text) {
          try {
            var data = JSON.parse(text);
            if (data.project) HS.writeLS(HS.KEYS.project, data.project);
            if (data.settings) HS.writeLS(HS.KEYS.settings, data.settings);
            if (data.snippets) HS.writeLS(HS.KEYS.snippets, data.snippets);
            if (data.plugins) HS.writeLS(HS.KEYS.plugins, data.plugins);
            location.reload();
          } catch (e) { log('error', 'That file is not an HTML Studio storage file.'); }
        });
      });
      openBtn.addEventListener('click', function () { input.click(); });
      row.appendChild(openBtn);
      row.appendChild(input);
      var zip = HS.el('button', { class: 'hs-btn', text: '⬇ Project ZIP (GitHub ready)' });
      zip.addEventListener('click', exportProjectZip);
      row.appendChild(zip);
      var manage = HS.el('button', { class: 'hs-btn', text: '🗄 Manage key storage' });
      manage.addEventListener('click', function () { openStoreManager(); });
      row.appendChild(manage);
      shell.body.appendChild(row);
      shell.body.appendChild(HS.el('p', { text: state.project.files.length + ' files · ' + state.project.folders.length + ' folders · ' + (state.settings.customThemes || []).length + ' personal themes · ' + state.plugins.length + ' plugins' }));
    }

    paint();
  }

  /* ---------------- status bar ---------------- */
  function renderStatus() {
    var bar = els.status;
    bar.innerHTML = '';
    var file = activeFile();
    var errors = state.console.filter(function (l) { return l.level === 'error'; }).length;
    bar.appendChild(HS.el('span', { text: 'Drop .html · .css · .js · .zip anywhere to open them' }));
    bar.appendChild(HS.el('span', { text: '⌘S save · ⌘F find · right-click tabs and code for more' }));
    if (state.settings.broadcast) bar.appendChild(HS.el('span', { text: '📣 ' + state.settings.broadcast, style: { color: 'var(--hs-accent)' } }));
    var right = HS.el('span', { class: 'right' });
    right.appendChild(HS.el('span', { text: file ? file.name + ' · ' + file.type.toUpperCase() : 'no file open' }));
    var kst = storeStats(readStore(state.key));
    right.appendChild(HS.el('span', { text: '🗄 ' + kst.entries + ' · ' + fmtBytes(kst.bytes), title: 'Storage held by this key' }));
    right.appendChild(HS.el('span', { text: state.project.files.length + ' files' }));
    right.appendChild(HS.el('span', { text: errors + ' error' + (errors === 1 ? '' : 's'), style: { color: errors ? 'var(--hs-danger)' : '' } }));
    right.appendChild(HS.el('span', { text: state.plugins.length + ' plugins' }));
    right.appendChild(HS.el('span', { text: (state.settings.showFps || state.settings.showRam) ? 'FPS/RAM on' : 'FPS/RAM off' }));
    right.appendChild(HS.el('span', { text: state.tier ? 'advanced · ' + state.tier : 'locked', style: { color: state.tier ? 'var(--hs-accent)' : '' } }));
    bar.appendChild(right);
  }

  function applyThemeNow() {
    HS.applyTheme(HS.findTheme(state.settings.theme, state.settings));
  }

  /* ---------------- refresh everything ---------------- */
  function refreshAll() {
    applyThemeNow();
    renderTabs();
    renderExplorer();
    renderPages();
    renderStatus();
    var file = activeFile();
    if (file) HS.Editor.setFile(file);
    renderCode();
  }

  /* ---------------- keyboard ---------------- */
  window.addEventListener('keydown', function (e) {
    var meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); save(); log('info', 'Project saved to this browser.'); }
    if (meta && e.key.toLowerCase() === 'f') { e.preventDefault(); state.findOpen = true; renderCode(); }
    if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); refreshPreview(); }
    if (e.key === 'Escape') { state.findOpen = false; renderCode(); }
  });

  window.addEventListener('message', function (e) {
    var data = e.data || {};
    if (data.source === 'hs-key-store') {
      if (state.key) { writeStore(state.key, data.data || {}); refreshStoreBar(); }
      return;
    }
    if (data.source !== 'hs-preview') return;
    log(data.level === 'result' ? 'info' : data.level, (data.args || []).join(' '));
  });

  /* ---------------- init ---------------- */
  function init() {
    els.top = HS.$('#hs-top');
    els.rail = HS.$('#hs-rail');
    els.workspace = HS.$('#hs-workspace');
    els.status = HS.$('#hs-status');

    var explorer = buildPanel('explorer', 'Project', '🗂');
    els.explorerBody = explorer.body;
    var pages = buildPanel('pages', 'Pages', '🌐');
    els.pagesBody = pages.body;
    var code = buildPanel('code', 'Code', '{}');
    els.codeBody = code.body;
    els.codeHead = code.panel.querySelector('.hs-panel-head');
    els.codeActions = code.actions;
    var preview = buildPanel('preview', 'Preview', '👁');
    els.previewBody = preview.body;
    var terminal = buildPanel('terminal', 'Terminal — HSL', '▮');
    els.terminalBody = terminal.body;

    els.workspace.appendChild(HS.el('div', { class: 'hs-snap' }));
    els.snap = els.workspace.querySelector('.hs-snap');
    var drop = HS.el('div', { id: 'hs-drop', text: 'Drop HTML, CSS, JS or ZIP files to open them in new tabs' });
    els.workspace.appendChild(drop);

    var fileInput = HS.el('input', { type: 'file', multiple: 'multiple', accept: '.html,.htm,.css,.js,.mjs,.json,.txt,.md,.zip', style: { display: 'none' } });
    fileInput.addEventListener('change', function () { importFiles(fileInput.files); fileInput.value = ''; });
    document.body.appendChild(fileInput);
    els.fileInput = fileInput;

    ['dragenter', 'dragover'].forEach(function (evt) {
      els.workspace.addEventListener(evt, function (e) { e.preventDefault(); drop.classList.add('show'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      els.workspace.addEventListener(evt, function (e) {
        if (evt === 'dragleave' && e.target !== els.workspace) return;
        drop.classList.remove('show');
      });
    });
    els.workspace.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
    });

    applyThemeNow();
    bootPlugins();
    renderTop();
    renderPanels();
    renderExplorer();
    renderPages();
    renderPreviewPanel();
    renderTerminalPanel();
    renderCode();
    renderStatus();
    log('info', 'HTML Studio ready — ' + state.project.files.length + ' files loaded from this browser.');
    var saved = null;
    try { saved = sessionStorage.getItem('hs_unlocked_key'); } catch (e) { /* ignore */ }
    var sessionData = null;
    try { sessionData = saved ? JSON.parse(saved) : null; } catch (e) { sessionData = null; }
    if (sessionData && validateKey(sessionData.key, sessionData.username)) {
      state.key = validateKey(sessionData.key, sessionData.username);
      state.tier = state.key.tier;
      renderTerminalPanel();
      renderStatus();
    } else {
      openKeyGate();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.HS);

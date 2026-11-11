/* HTML Studio standalone — editor pane: gutter, code folding, minimap, context menu. */
window.HS = window.HS || {};

(function (HS) {
  function lineHeight() { return 20; }

  function drawMinimap(canvas, content, scrollTop, scrollHeight, clientHeight) {
    var lines = String(content).split('\n');
    var width = canvas.clientWidth || 84;
    var height = canvas.clientHeight || 300;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    var ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, width, height);
    var rowH = Math.max(1.6, height / Math.max(lines.length, 1));
    var palette = {
      dim: 'rgba(154,160,166,.55)', accent: 'rgba(138,180,248,.85)', warm: 'rgba(242,139,130,.7)',
      cool: 'rgba(129,201,149,.75)', plain: 'rgba(200,205,212,.5)'
    };
    lines.forEach(function (line, i) {
      var t = line.trim();
      if (!t) return;
      var kind = 'plain';
      if (/^(\/\/|\/\*|\*|<!--)/.test(t)) kind = 'dim';
      else if (/^(function|const|let|var|class|def|async)\b/.test(t)) kind = 'accent';
      else if (/^[.#@a-zA-Z0-9,\s\[\]="'-]+\{/.test(t)) kind = 'warm';
      else if (/^<\/?[a-zA-Z]/.test(t)) kind = 'cool';
      var indent = (line.match(/^\s*/)[0].length || 0) * 1.2;
      var len = Math.min(width - indent - 4, Math.max(3, t.length * 1.1));
      ctx.fillStyle = palette[kind];
      ctx.fillRect(indent + 2, i * rowH, len, Math.max(1, rowH * 0.55));
    });
    var total = Math.max(scrollHeight, 1);
    var top = (scrollTop / total) * height;
    var h = Math.max(18, (clientHeight / total) * height);
    ctx.fillStyle = 'rgba(138,180,248,.16)';
    ctx.fillRect(0, top, width, h);
    ctx.strokeStyle = 'rgba(138,180,248,.7)';
    ctx.strokeRect(0.5, top + 0.5, width - 1, h - 1);
  }

  HS.Editor = {
    refs: null,
    file: null,
    collapsed: [],
    history: { stack: [], index: -1, last: 0 },

    mount: function (container, ctx) {
      var self = this;
      this.ctx = ctx;
      container.innerHTML = '';

      var tools = HS.el('div', { class: 'hs-editor-tools' });
      var wrap = HS.el('div', { class: 'hs-editor-wrap' });
      var gutter = HS.el('div', { class: 'hs-gutter' }, [HS.el('div', { class: 'inner' })]);
      var code = HS.el('textarea', { class: 'hs-code', spellcheck: 'false' });
      var map = HS.el('div', { class: 'hs-minimap' }, [HS.el('canvas', {})]);
      wrap.appendChild(gutter); wrap.appendChild(code); wrap.appendChild(map);
      container.appendChild(tools); container.appendChild(wrap);

      function tool(label, title, handler) {
        return HS.el('button', { class: 'hs-tool', text: label, title: title, onclick: handler });
      }

      this.refs = { tools: tools, gutter: gutter, code: code, map: map, canvas: map.firstChild, inner: gutter.firstChild };

      tools.appendChild(tool('Format', 'Format the document', function () { ctx.onFormat(); }));
      tools.appendChild(tool('Fold', 'Fold every block', function () { self.foldAll(); }));
      tools.appendChild(tool('Unfold', 'Unfold everything', function () { self.collapsed = []; self.render(); }));
      tools.appendChild(tool('Find', 'Search and replace', function () { ctx.onFind(); }));
      var grow = HS.el('span', { class: 'grow' });
      tools.appendChild(grow);
      this.refs.count = HS.el('span', { text: '' });
      this.refs.mapBtn = tool('Map on', 'Toggle the minimap', function () {
        var s = ctx.getSettings();
        ctx.onToggleSetting('showMinimap', !s.showMinimap);
      });
      this.refs.wrapBtn = tool('Wrap', 'Toggle word wrap', function () {
        var s = ctx.getSettings();
        ctx.onToggleSetting('wordWrap', !s.wordWrap);
      });
      tools.appendChild(this.refs.count);
      tools.appendChild(this.refs.mapBtn);
      tools.appendChild(this.refs.wrapBtn);

      code.addEventListener('input', function () { self.handleInput(); });
      code.addEventListener('scroll', function () { self.sync(); });
      code.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        ctx.openMenu(e.clientX, e.clientY, self.menuItems());
      });
      code.addEventListener('keydown', function (e) {
        var meta = e.metaKey || e.ctrlKey;
        if (meta && e.key.toLowerCase() === 'f') { e.preventDefault(); ctx.onFind(); }
        if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); ctx.onSave(); }
        if (e.key === 'Tab') { e.preventDefault(); self.insertText('  '); }
      });
      map.addEventListener('pointerdown', function (e) {
        function jump(clientY) {
          var rect = map.getBoundingClientRect();
          var ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
          code.scrollTop = ratio * Math.max(code.scrollHeight - code.clientHeight, 0);
        }
        jump(e.clientY);
        function move(ev) { jump(ev.clientY); }
        function up() { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
      this.render();
    },

    setFile: function (file) {
      if (!file) { this.file = null; this.collapsed = []; this.render(); return; }
      if (!this.file || this.file.id !== file.id) this.collapsed = [];
      this.file = file;
      this.history = { stack: [], index: -1, last: 0 };
      this.render();
    },

    ranges: function () {
      if (!this.file) return [];
      return HS.foldRanges(this.file.content.split('\n'), this.file.type);
    },

    foldAll: function () {
      var raw = this.file.content.split('\n');
      this.collapsed = this.ranges().map(function (r) { return raw[r.start]; });
      this.render();
    },

    caret: function () {
      var code = this.refs.code;
      var upTo = code.value.slice(0, code.selectionStart);
      return { line: upTo.split('\n').length - 1, col: upTo.length - (upTo.lastIndexOf('\n') + 1) };
    },

    rawIndex: function (displayLine, map) {
      var entry = map[displayLine];
      return entry ? { start: entry.start, end: entry.end } : { start: 0, end: 0 };
    },

    setContent: function (content) {
      this.ctx.onChange(content);
      var h = this.history, now = Date.now();
      if (now - h.last < 600 && h.index >= 0) h.stack[h.index] = content;
      else {
        h.stack = h.stack.slice(Math.max(0, h.index - 60), h.index + 1);
        h.stack.push(content);
        h.index = h.stack.length - 1;
        h.last = now;
      }
    },

    handleInput: function () {
      if (!this.file) return;
      var raw = this.file.content.split('\n');
      var display = HS.buildDisplay(raw, this.ranges(), this.collapsed);
      var next = this.refs.code.value.split('\n');
      this.setContent(HS.applyDisplayEdit(raw, { lines: display.lines, map: display.map, collapsed: this.collapsed }, next));
      this.render();
    },

    insertText: function (text) {
      var code = this.refs.code;
      var value = code.value;
      code.value = value.slice(0, code.selectionStart) + text + value.slice(code.selectionEnd);
      this.handleInput();
    },

    selected: function () {
      var code = this.refs.code;
      return code.value.slice(code.selectionStart, code.selectionEnd);
    },

    withLine: function (fn) {
      if (!this.file) return;
      var raw = this.file.content.split('\n');
      var display = HS.buildDisplay(raw, this.ranges(), this.collapsed);
      var entry = display.map[this.caret().line];
      var index = entry ? entry.start : 0;
      fn(raw, index);
      this.setContent(raw.join('\n'));
      this.render();
    },

    menuItems: function () {
      var self = this;
      var type = this.file ? this.file.type : 'html';
      return [
        { label: 'Cut', hint: '⌘X', run: function () { navigator.clipboard.writeText(self.selected()); self.refs.code.value = self.refs.code.value.replace(self.selected(), ''); self.handleInput(); } },
        { label: 'Copy', hint: '⌘C', run: function () { navigator.clipboard.writeText(self.selected()); } },
        { label: 'Paste', hint: '⌘V', run: function () { navigator.clipboard.readText().then(function (t) { if (t) self.insertText(t); }); } },
        { sep: true },
        { label: 'Undo', hint: '⌘Z', run: function () { self.undo(-1); } },
        { label: 'Redo', hint: '⇧⌘Z', run: function () { self.undo(1); } },
        { label: 'Select all', hint: '⌘A', run: function () { self.refs.code.select(); } },
        { sep: true },
        { label: 'Format document', run: function () { self.ctx.onFormat(); } },
        { label: 'Duplicate line', run: function () { self.withLine(function (lines, i) { lines.splice(i, 0, lines[i]); self.ctx.log('Duplicated line ' + (i + 1)); }); } },
        { label: 'Delete line', run: function () { self.withLine(function (lines, i) { lines.splice(i, 1); self.ctx.log('Deleted line ' + (i + 1)); }); } },
        { label: 'Move line up', run: function () { self.withLine(function (lines, i) { if (i > 0) { var t = lines[i - 1]; lines[i - 1] = lines[i]; lines[i] = t; } }); } },
        { label: 'Move line down', run: function () { self.withLine(function (lines, i) { if (i < lines.length - 1) { var t = lines[i + 1]; lines[i + 1] = lines[i]; lines[i] = t; } }); } },
        { label: 'Toggle comment', run: function () {
          self.withLine(function (lines, i) {
            var open = type === 'html' ? '<!-- ' : '/* ';
            var close = type === 'html' ? ' -->' : ' */';
            lines[i] = lines[i].trim().indexOf(open.trim()) === 0
              ? lines[i].replace(open, '').replace(close, '')
              : open + lines[i] + close;
          });
        } },
        { sep: true },
        { label: 'Find / replace', hint: '⌘F', run: function () { self.ctx.onFind(); } },
        { label: self.collapsed.length ? 'Unfold all' : 'Fold all', run: function () { if (self.collapsed.length) { self.collapsed = []; self.render(); } else self.foldAll(); } },
        { label: 'Insert from library', run: function () { self.ctx.onOpenSnippets(); } }
      ];
    },

    undo: function (dir) {
      var h = this.history;
      var next = h.index + dir;
      if (next < 0 || next >= h.stack.length) return;
      h.index = next;
      this.ctx.onChange(h.stack[next]);
      this.render();
    },

    render: function () {
      var refs = this.refs;
      if (!refs) return;
      if (!this.file) {
        refs.code.value = 'No file open — create one or drop a file here.';
        refs.inner.innerHTML = '';
        refs.canvas.getContext('2d').clearRect(0, 0, refs.canvas.width, refs.canvas.height);
        return;
      }
      var settings = this.ctx.getSettings();
      var raw = this.file.content.split('\n');
      var ranges = this.ranges();
      var display = HS.buildDisplay(raw, ranges, this.collapsed);
      if (refs.code.value !== display.text) refs.code.value = display.text;
      refs.code.style.whiteSpace = settings.wordWrap ? 'pre-wrap' : 'pre';
      refs.code.wrap = settings.wordWrap ? 'soft' : 'off';
      refs.map.style.display = settings.showMinimap ? '' : 'none';
      refs.mapBtn.className = 'hs-tool' + (settings.showMinimap ? ' on' : '');
      refs.mapBtn.textContent = settings.showMinimap ? 'Map on' : 'Map off';
      refs.wrapBtn.className = 'hs-tool' + (settings.wordWrap ? ' on' : '');
      refs.count.textContent = raw.length + ' lines · ' + String(this.file.type).toUpperCase() +
        (this.collapsed.length ? ' · ' + this.collapsed.length + ' folded' : '');

      var frag = document.createDocumentFragment();
      display.lines.forEach(function (line, i) {
        var entry = display.map[i];
        var foldable = null, k;
        for (k = 0; k < ranges.length; k += 1) {
          if (ranges[k].start === entry.start && ranges[k].end > ranges[k].start) { foldable = ranges[k]; break; }
        }
        var isFolded = entry.kind === 'fold';
        var row = HS.el('div', { class: 'row' });
        if (foldable) {
          var collapsedNow = this.collapsed.indexOf(raw[foldable.start]) >= 0;
          row.appendChild(HS.el('button', {
            class: 'fold', text: collapsedNow ? '▸' : '▾',
            onclick: (function (self, header) {
              return function () {
                var idx = self.collapsed.indexOf(header);
                if (idx >= 0) self.collapsed.splice(idx, 1); else self.collapsed.push(header);
                self.render();
              };
            })(this, raw[foldable.start])
          }));
        } else row.appendChild(HS.el('span', { class: 'fold' }));
        row.appendChild(HS.el('span', { text: isFolded ? '⋯' : String(i + 1) }));
        frag.appendChild(row);
      }, this);
      refs.inner.innerHTML = '';
      refs.inner.appendChild(frag);
      refs.inner.style.transform = 'translateY(' + (-refs.code.scrollTop) + 'px)';
      drawMinimap(refs.canvas, this.file.content, refs.code.scrollTop, refs.code.scrollHeight, refs.code.clientHeight);
    },

    sync: function () {
      var refs = this.refs;
      if (!refs || !this.file) return;
      refs.inner.style.transform = 'translateY(' + (-refs.code.scrollTop) + 'px)';
      drawMinimap(refs.canvas, this.file.content, refs.code.scrollTop, refs.code.scrollHeight, refs.code.clientHeight);
    }
  };

  /* ---------------- search and replace ---------------- */
  HS.mountFindReplace = function (container, opts) {
    var state = { query: '', replacement: '', regex: false, caseSensitive: false, projectWide: true };
    container.innerHTML = '';
    var bar = HS.el('div', { class: 'hs-editor-tools' });
    var queryInput = HS.el('input', { class: 'hs-input', placeholder: 'Find across files…', style: { maxWidth: '220px' } });
    var replaceInput = HS.el('input', { class: 'hs-input', placeholder: 'Replace with…', style: { maxWidth: '220px' } });
    var replaceAllBtn = HS.el('button', { class: 'hs-btn primary', text: 'Replace all' });
    var closeBtn = HS.el('button', { class: 'hs-tool', text: '✕ Close' });
    var optionsRow = HS.el('div', { class: 'hs-editor-tools' });
    var list = HS.el('div', { class: 'hs-console' }, [HS.el('div', { class: 'list' })]);
    list.style.flex = '1';
    var results = list.firstChild;

    function checkbox(label, get, set) {
      var input = HS.el('input', { type: 'checkbox' });
      input.checked = get();
      input.addEventListener('change', function () { set(input.checked); search(); });
      return HS.el('label', { class: 'hs-node' }, [input, HS.el('span', { text: label })]);
    }

    bar.appendChild(queryInput); bar.appendChild(replaceInput); bar.appendChild(replaceAllBtn);
    var grow = HS.el('span', { class: 'grow' }); bar.appendChild(grow); bar.appendChild(closeBtn);
    optionsRow.appendChild(checkbox('all files', function () { return state.projectWide; }, function (v) { state.projectWide = v; }));
    optionsRow.appendChild(checkbox('regex', function () { return state.regex; }, function (v) { state.regex = v; }));
    optionsRow.appendChild(checkbox('match case', function () { return state.caseSensitive; }, function (v) { state.caseSensitive = v; }));
    var countLabel = HS.el('span', { text: '' });
    optionsRow.appendChild(countLabel);
    container.appendChild(bar); container.appendChild(optionsRow); container.appendChild(list);

    function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function collect() {
      if (!state.query) return [];
      var scope = state.projectWide ? opts.files() : opts.files().filter(function (f) { return f.id === opts.activeId(); });
      var out = [];
      var pattern;
      try {
        pattern = state.regex ? new RegExp(state.query, state.caseSensitive ? 'g' : 'gi')
          : new RegExp(escapeRe(state.query), state.caseSensitive ? 'g' : 'gi');
      } catch (e) { return [{ file: 'Invalid expression', line: 0, text: '' }]; }
      scope.forEach(function (file) {
        file.content.split('\n').forEach(function (line, i) {
          pattern.lastIndex = 0;
          if (pattern.test(line) && out.length < 120) out.push({ id: file.id, file: file.name, line: i + 1, text: line.trim().slice(0, 90) });
        });
      });
      return out;
    }

    function search() {
      results.innerHTML = '';
      var hits = collect();
      countLabel.textContent = hits.length + ' match' + (hits.length === 1 ? '' : 'es');
      hits.forEach(function (hit) {
        var row = HS.el('div', { class: 'line' }, [
          HS.el('span', { text: hit.file, style: { color: 'var(--hs-accent)', minWidth: '150px' } }),
          HS.el('span', { class: 't', text: String(hit.line) }),
          HS.el('span', { text: hit.text })
        ]);
        results.appendChild(row);
      });
    }

    queryInput.addEventListener('input', function () { state.query = queryInput.value; search(); });
    replaceInput.addEventListener('input', function () { state.replacement = replaceInput.value; });
    replaceAllBtn.addEventListener('click', function () {
      opts.onReplace(state.query, state.replacement, { all: true, regex: state.regex, caseSensitive: state.caseSensitive, scopeFileId: state.projectWide ? null : opts.activeId() });
      search();
    });
    closeBtn.addEventListener('click', function () { opts.onClose(); });
    search();
    queryInput.focus();
  };
})(window.HS);

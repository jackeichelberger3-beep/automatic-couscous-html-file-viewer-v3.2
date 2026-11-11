/* HTML Studio standalone — core engines (storage, themes, format, folding, zip, preview, plugins). */
window.HS = window.HS || {};

(function (HS) {
  /* ---------------- small helpers ---------------- */
  HS.$ = function (sel, root) { return (root || document).querySelector(sel); };
  HS.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  HS.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  };

  HS.uid = function (p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 9); };
  HS.escape = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };

  HS.readLS = function (key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  };
  HS.writeLS = function (key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
  };

  /* ---------------- storage ---------------- */
  HS.KEYS = { project: 'hs_project_v1', settings: 'hs_settings_v1', snippets: 'hs_snippets_v1', plugins: 'hs_plugins_v1' };

  HS.DEFAULT_SETTINGS = {
    appName: 'HTML Studio',
    theme: 'black',
    customThemes: [],
    sideTabs: false,
    showRam: true,
    showFps: true,
    showMinimap: true,
    wordWrap: false,
    layout: {}
  };

  HS.loadSettings = function () {
    var s = HS.readLS(HS.KEYS.settings, {}) || {};
    var out = {};
    Object.keys(HS.DEFAULT_SETTINGS).forEach(function (k) { out[k] = (s[k] === undefined ? HS.DEFAULT_SETTINGS[k] : s[k]); });
    return out;
  };
  HS.saveSettings = function (s) { HS.writeLS(HS.KEYS.settings, s); };

  HS.captureProject = function () {
    var p = HS.readLS(HS.KEYS.project, null);
    if (!p) return null;
    return JSON.stringify(p);
  };

  HS.starterProject = function () {
    var html = { id: HS.uid(), name: 'index.html', type: 'html', main: true, pinned: false, folderId: null,
      content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>Welcome to HTML Studio</title>\n</head>\n<body>\n  <h1>Hello from HTML Studio</h1>\n  <p>Edit me, or use Templates to start something new.</p>\n</body>\n</html>\n' };
    var css = { id: HS.uid(), name: 'styles.css', type: 'css', pinned: false, folderId: null,
      content: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 40px;\n}\n' };
    var js = { id: HS.uid(), name: 'script.js', type: 'js', pinned: false, folderId: null,
      content: "console.log('HTML Studio is running.');\n" };
    return { files: [html, css, js], folders: [], openTabs: [html.id], activeId: html.id };
  };

  HS.exportWorkspace = function () {
    return JSON.stringify({
      app: 'HTML Studio', version: 2, exported: new Date().toISOString(),
      project: HS.readLS(HS.KEYS.project, null),
      settings: HS.readLS(HS.KEYS.settings, null),
      snippets: HS.readLS(HS.KEYS.snippets, null),
      plugins: HS.readLS(HS.KEYS.plugins, null)
    }, null, 2);
  };

  HS.downloadText = function (text, filename, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    HS.downloadBlob(blob, filename);
  };

  HS.downloadBlob = function (blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };

  /* ---------------- themes ---------------- */
  HS.THEMES = [
    { id: 'black', name: 'Black (default)', tokens: { bg: '#000000', panel: '#0a0a0b', panel2: '#141417', panel3: '#1c1c20', border: '#2a2a2f', text: '#e8eaed', dim: '#9aa0a6', accent: '#8ab4f8', accentText: '#0b0f19', danger: '#f28b82', radius: '16px', radiusSm: '10px', font: "'Google Sans', Roboto, Arial, sans-serif", mono: "'Roboto Mono', ui-monospace, Menlo, monospace" } },
    { id: 'grey', name: 'Grey', tokens: { bg: '#1b1c1e', panel: '#26282b', panel2: '#2f3237', panel3: '#3a3e44', border: '#43474d', text: '#f1f3f4', dim: '#b6bcc4', accent: '#a8c7fa', accentText: '#1b1c1e', danger: '#f6aea9', radius: '14px', radiusSm: '10px', font: "'Google Sans', Roboto, Arial, sans-serif", mono: "'Roboto Mono', ui-monospace, Menlo, monospace" } },
    { id: 'white', name: 'White', tokens: { bg: '#ffffff', panel: '#f8f9fa', panel2: '#f1f3f4', panel3: '#e8eaed', border: '#dadce0', text: '#202124', dim: '#5f6368', accent: '#1a73e8', accentText: '#ffffff', danger: '#d93025', radius: '16px', radiusSm: '10px', font: "'Google Sans', Roboto, Arial, sans-serif", mono: "'Roboto Mono', ui-monospace, Menlo, monospace" } },
    { id: 'retro', name: 'Retro Terminal', tokens: { bg: '#000000', panel: '#001100', panel2: '#002200', panel3: '#003300', border: '#00aa44', text: '#33ff66', dim: '#00bb55', accent: '#00ff88', accentText: '#001100', danger: '#ff5555', radius: '0px', radiusSm: '0px', font: "'Courier New', ui-monospace, monospace", mono: "'Courier New', ui-monospace, monospace" } },
    { id: 'midnight', name: 'Midnight Blue', tokens: { bg: '#0d1117', panel: '#161b22', panel2: '#1c2330', panel3: '#27313f', border: '#30363d', text: '#e6edf3', dim: '#8b949e', accent: '#58a6ff', accentText: '#0d1117', danger: '#ff7b72', radius: '14px', radiusSm: '10px', font: "'Google Sans', Roboto, Arial, sans-serif", mono: "'Roboto Mono', ui-monospace, Menlo, monospace" } },
    { id: 'dracula', name: 'Dracula', tokens: { bg: '#282a36', panel: '#2e3240', panel2: '#353a4a', panel3: '#3d4455', border: '#44475a', text: '#f8f8f2', dim: '#9295b5', accent: '#bd93f9', accentText: '#282a36', danger: '#ff5555', radius: '14px', radiusSm: '10px', font: "'Google Sans', Roboto, Arial, sans-serif", mono: "'Roboto Mono', ui-monospace, Menlo, monospace" } },
    { id: 'nord', name: 'Nord', tokens: { bg: '#2e3440', panel: '#3b4252', panel2: '#434c5e', panel3: '#4c566a', border: '#57606f', text: '#eceff4', dim: '#a3b1c2', accent: '#88c0d0', accentText: '#2e3440', danger: '#bf616a', radius: '14px', radiusSm: '10px', font: "'Google Sans', Roboto, Arial, sans-serif", mono: "'Roboto Mono', ui-monospace, Menlo, monospace" } },
    { id: 'solarized', name: 'Solarized Dark', tokens: { bg: '#002b36', panel: '#073642', panel2: '#0d444f', panel3: '#15525e', border: '#1d6373', text: '#fdf6e3', dim: '#93a1a1', accent: '#268bd2', accentText: '#002b36', danger: '#dc322f', radius: '14px', radiusSm: '10px', font: "'Google Sans', Roboto, Arial, sans-serif", mono: "'Roboto Mono', ui-monospace, Menlo, monospace" } },
    { id: 'cobalt', name: 'Cobalt', tokens: { bg: '#0a1628', panel: '#102236', panel2: '#162d44', panel3: '#1d3a55', border: '#284a68', text: '#e0eaf5', dim: '#7a9bc4', accent: '#3399ff', accentText: '#0a1628', danger: '#ff6b6b', radius: '16px', radiusSm: '10px', font: "'Google Sans', Roboto, Arial, sans-serif", mono: "'Roboto Mono', ui-monospace, Menlo, monospace" } }
  ];

  HS.allThemes = function (settings) {
    return HS.THEMES.concat((settings && settings.customThemes) || []).concat(HS.pluginThemes || []);
  };
  HS.findTheme = function (id, settings) {
    var list = HS.allThemes(settings);
    for (var i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i];
    return HS.THEMES[0];
  };
  HS.applyTheme = function (theme) {
    var t = (theme && theme.tokens) || HS.THEMES[0].tokens;
    var root = document.documentElement;
    Object.keys(t).forEach(function (k) { root.style.setProperty('--hs-' + k, t[k]); });
  };
  HS.THEME_VARS = ['bg', 'panel', 'panel2', 'panel3', 'border', 'text', 'dim', 'accent', 'accentText', 'danger'];

  /* ---------------- formatter ---------------- */
  var VOID_TAGS = ('area base br col embed hr img input link meta param source track wbr !doctype').split(' ');
  var INLINE_TAGS = ('a b i em strong span small code kbd sub sup label abbr cite q time bdi bdo u s mark br wbr img input').split(' ');

  function formatHtml(src) {
    var text = String(src).replace(/\r\n/g, '\n');
    var blocks = text.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) || [];
    var out = [], level = 0, inline = '';
    function flush() { if (inline.trim()) out.push(new Array(level + 1).join('  ') + inline.trim()); inline = ''; }
    blocks.forEach(function (raw) {
      var block = raw.trim();
      if (!block) return;
      if (block.indexOf('<!--') === 0) { flush(); out.push(new Array(level + 1).join('  ') + block); return; }
      if (block.charAt(0) !== '<') { inline += (inline ? ' ' : '') + block.replace(/\s+/g, ' '); return; }
      var m = /^<\/?\s*([a-zA-Z0-9!-]+)/.exec(block);
      var tag = (m ? m[1] : '').toLowerCase();
      var isClose = block.indexOf('</') === 0;
      var selfClosed = block.slice(-2) === '/>' || VOID_TAGS.indexOf(tag) >= 0;
      var inlineTag = INLINE_TAGS.indexOf(tag) >= 0;
      if (isClose) { flush(); level = Math.max(0, level - 1); out.push(new Array(level + 1).join('  ') + block); return; }
      if (inlineTag && !selfClosed) { inline += (inline ? ' ' : '') + block; return; }
      flush();
      out.push(new Array(level + 1).join('  ') + block);
      if (!selfClosed) level += 1;
    });
    flush();
    return out.join('\n') + '\n';
  }

  function formatBraces(src) {
    var text = String(src).replace(/\r\n/g, '\n');
    var out = [], level = 0, buf = '', inStr = null, inLine = false, inBlock = false;
    function push(line) { var t = line.trim(); out.push(new Array(level + 1).join('  ') + t); }
    function flush() { if (buf.trim()) push(buf); buf = ''; }
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i], next = text[i + 1];
      if (inLine) { buf += ch; if (ch === '\n') { inLine = false; flush(); } continue; }
      if (inBlock) { buf += ch; if (ch === '*' && next === '/') { buf += next; i += 1; inBlock = false; flush(); } continue; }
      if (inStr) { buf += ch; if (ch === '\\') { buf += next || ''; i += 1; continue; } if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; buf += ch; continue; }
      if (ch === '/' && next === '*') { inBlock = true; buf += ch; continue; }
      if (ch === '/' && next === '/') { inLine = true; buf += ch; continue; }
      if (ch === '\n') { flush(); continue; }
      if (ch === '{') { out.push(new Array(level + 1).join('  ') + buf.trim() + ' {'); buf = ''; level += 1; continue; }
      if (ch === '}') {
        flush(); level = Math.max(0, level - 1);
        var tail = '';
        while (text[i + 1] === ';' || text[i + 1] === ',') { tail += text[i + 1]; i += 1; }
        out.push(new Array(level + 1).join('  ') + '}' + tail);
        continue;
      }
      if (ch === ';') { buf += ch; flush(); continue; }
      buf += ch;
    }
    flush();
    return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  }

  HS.format = function (code, type) {
    if (!code || !String(code).trim()) return code;
    try {
      if (type === 'css' || type === 'js') return formatBraces(code);
      if (type === 'json') return JSON.stringify(JSON.parse(code), null, 2) + '\n';
      return formatHtml(code);
    } catch (e) { return code; }
  };

  HS.detectType = function (name) {
    var ext = String(name || '').split('.').pop().toLowerCase();
    if (ext === 'css') return 'css';
    if (ext === 'js' || ext === 'mjs') return 'js';
    if (ext === 'json') return 'json';
    if (ext === 'html' || ext === 'htm') return 'html';
    return 'txt';
  };

  /* ---------------- folding ---------------- */
  var FOLD_SUFFIX = /\s{3}⋯ \d+ lines$/;
  HS.isFoldHeader = function (line) { return FOLD_SUFFIX.test(line); };
  HS.stripFoldSuffix = function (line) { return line.replace(FOLD_SUFFIX, ''); };

  HS.foldRanges = function (lines, type) {
    var ranges = [];
    var i, j, start;
    if (type === 'css' || type === 'js') {
      var stack = [];
      for (i = 0; i < lines.length; i += 1) {
        var opens = (lines[i].match(/\{/g) || []).length;
        var closes = (lines[i].match(/\}/g) || []).length;
        if (opens > closes) stack.push(i);
        for (j = 0; j < closes; j += 1) {
          start = stack.pop();
          if (start !== undefined && i - start > 1) ranges.push({ start: start, end: i });
        }
      }
      return ranges;
    }
    function indentOf(line) { return (line.match(/^[ \t]*/) || [''])[0].length; }
    for (i = 0; i < lines.length; i += 1) {
      if (!lines[i].trim() || i + 1 >= lines.length || !lines[i + 1].trim()) continue;
      if (indentOf(lines[i + 1]) <= indentOf(lines[i])) continue;
      var end = i + 1;
      for (j = i + 1; j < lines.length; j += 1) {
        if (lines[j].trim() && indentOf(lines[j]) <= indentOf(lines[i])) break;
        end = j;
      }
      if (end - i > 1) ranges.push({ start: i, end: end });
    }
    return ranges;
  };

  HS.buildDisplay = function (rawLines, ranges, collapsedHeaders) {
    var hidden = {}, lines = [], map = [], i, k, range;
    ranges.forEach(function (r) {
      if (collapsedHeaders.indexOf(rawLines[r.start]) >= 0) for (i = r.start + 1; i <= r.end; i += 1) hidden[i] = true;
    });
    for (i = 0; i < rawLines.length; i += 1) {
      if (hidden[i]) continue;
      range = null;
      for (k = 0; k < ranges.length; k += 1) {
        if (ranges[k].start === i && collapsedHeaders.indexOf(rawLines[i]) >= 0) { range = ranges[k]; break; }
      }
      if (range) {
        lines.push(rawLines[i] + '   ⋯ ' + (range.end - range.start) + ' lines');
        map.push({ kind: 'fold', start: range.start, end: range.end });
      } else {
        lines.push(rawLines[i]);
        map.push({ kind: 'raw', start: i, end: i });
      }
    }
    return { text: lines.join('\n'), lines: lines, map: map };
  };

  HS.applyDisplayEdit = function (rawLines, previous, nextLines) {
    if (!previous.collapsed.length) return nextLines.join('\n');
    var prefix = 0, suffix = 0;
    while (prefix < previous.lines.length && prefix < nextLines.length && previous.lines[prefix] === nextLines[prefix]) prefix += 1;
    while (suffix < previous.lines.length - prefix && suffix < nextLines.length - prefix &&
      previous.lines[previous.lines.length - 1 - suffix] === nextLines[nextLines.length - 1 - suffix]) suffix += 1;

    var oldChanged = previous.lines.slice(prefix, previous.lines.length - suffix);
    var newChanged = nextLines.slice(prefix, nextLines.length - suffix).map(HS.stripFoldSuffix);
    var firstEntry = prefix < previous.map.length ? previous.map[prefix] : null;
    var startRaw = firstEntry ? firstEntry.start : rawLines.length;
    var endRaw = startRaw - 1, preserved = [];
    oldChanged.forEach(function (line, idx) {
      var entry = previous.map[prefix + idx];
      if (!entry) return;
      endRaw = entry.end;
      if (entry.kind === 'fold' && HS.isFoldHeader(line)) preserved = preserved.concat(rawLines.slice(entry.start, entry.end + 1));
    });
    var head = rawLines.slice(0, startRaw);
    var tail = endRaw >= startRaw ? rawLines.slice(endRaw + 1) : rawLines.slice(startRaw);
    return head.concat(newChanged).concat(preserved).concat(tail).join('\n');
  };

  /* ---------------- zip ---------------- */
  var CRC_TABLE = (function () {
    var table = new Uint32Array(256), n, k, c;
    for (n = 0; n < 256; n += 1) {
      c = n;
      for (k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xffffffff, i;
    for (i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  var TEXT_EXT = ['html', 'htm', 'css', 'js', 'mjs', 'json', 'txt', 'md', 'svg', 'xml', 'csv'];
  HS.isTextFile = function (path) { return TEXT_EXT.indexOf(String(path).split('.').pop().toLowerCase()) >= 0; };

  HS.readZip = function (buffer) {
    var view = new DataView(buffer), bytes = new Uint8Array(buffer), decoder = new TextDecoder();
    var eocd = -1, i, offset, count, entries = [];
    for (i = bytes.length - 22; i >= 0 && i > bytes.length - 66000; i -= 1) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return Promise.reject(new Error('Not a valid ZIP file.'));
    count = view.getUint16(eocd + 10, true);
    offset = view.getUint32(eocd + 16, true);
    var jobs = [];
    for (i = 0; i < count; i += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      var method = view.getUint16(offset + 10, true);
      var compSize = view.getUint32(offset + 20, true);
      var nameLen = view.getUint16(offset + 28, true);
      var extraLen = view.getUint16(offset + 30, true);
      var commentLen = view.getUint16(offset + 32, true);
      var localOffset = view.getUint32(offset + 42, true);
      var rawName = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
      offset += 46 + nameLen + extraLen + commentLen;
      if (rawName.slice(-1) === '/') continue;
      (function (rawName, method, compSize, localOffset) {
        var lNameLen = view.getUint16(localOffset + 26, true);
        var lExtraLen = view.getUint16(localOffset + 28, true);
        var dataStart = localOffset + 30 + lNameLen + lExtraLen;
        var compressed = bytes.subarray(dataStart, dataStart + compSize);
        var promise;
        if (method === 0) promise = Promise.resolve(compressed);
        else if (method === 8) {
          if (typeof DecompressionStream === 'undefined') return;
          promise = new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
            .then(function (buf) { return new Uint8Array(buf); });
        } else return;
        jobs.push(promise.then(function (data) {
          var path = rawName.replace(/\\/g, '/');
          var parts = path.split('/');
          entries.push({
            path: path, name: parts[parts.length - 1],
            folder: parts.length > 1 ? parts[0] : 'Imported',
            text: HS.isTextFile(path) ? decoder.decode(data) : null
          });
        }));
      })(rawName, method, compSize, localOffset);
    }
    return Promise.all(jobs).then(function () { return entries; });
  };

  HS.makeZip = function (files) {
    var encoder = new TextEncoder(), chunks = [], central = [], offset = 0;
    files.forEach(function (f) {
      var nameBytes = encoder.encode(f.path), data = encoder.encode(f.text || ''), crc = crc32(data);
      var local = new Uint8Array(30 + nameBytes.length), lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, nameBytes.length, true);
      local.set(nameBytes, 30);
      chunks.push(local, data);
      var cd = new Uint8Array(46 + nameBytes.length), cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      central.push(cd);
      offset += local.length + data.length;
    });
    var centralSize = central.reduce(function (n, c) { return n + c.length; }, 0);
    var end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    return new Blob(chunks.concat(central, [end]), { type: 'application/zip' });
  };

  HS.readFileText = function (file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.readAsText(file);
    });
  };
  HS.readFileBuffer = function (file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.readAsArrayBuffer(file);
    });
  };

  /* ---------------- preview ---------------- */
  HS.CONSOLE_SHIM = '<scr' + 'ipt>(function(){' +
    'var send=function(level,args){try{parent.postMessage({source:"hs-preview",level:level,args:Array.prototype.slice.call(args).map(function(a){try{if(typeof a==="object"&&a!==null){return JSON.stringify(a);}return String(a);}catch(e){return String(a);}})},"*");}catch(e){}};' +
    '["log","info","warn","error","debug"].forEach(function(level){var orig=console[level]?console[level].bind(console):function(){};console[level]=function(){send(level,arguments);orig.apply(null,arguments);};});' +
    'window.addEventListener("error",function(e){send("error",[(e.message||"Error")+"  (line "+e.lineno+")"]);});' +
    'window.addEventListener("unhandledrejection",function(e){send("error",["Unhandled promise: "+e.reason]);});' +
    'window.addEventListener("message",function(e){var d=e.data||{};if(d.source==="hs-eval"){try{var r=(0,eval)(d.code);send("result",[String(r)]);}catch(err){send("error",[String((err&&err.message)||err)]);}}});' +
    '})();</scr' + 'ipt>';

  HS.METER_SHIM = '<scr' + 'ipt>(function(){' +
    'var wrap=document.createElement("div");wrap.style.cssText="position:fixed;right:10px;bottom:10px;z-index:2147483647;font:11px/1.5 ui-monospace,Menlo,monospace;background:rgba(0,0,0,.72);color:#e8eaed;border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:6px 9px;pointer-events:none;display:none;white-space:pre";' +
    'document.addEventListener("DOMContentLoaded",function(){document.body.appendChild(wrap);});' +
    'var frames=0,last=performance.now(),fps=0,showFps=false,showRam=false;' +
    'function render(){var parts=[];if(showFps)parts.push("FPS  "+fps);if(showRam){var m=performance.memory;parts.push("RAM  "+(m?Math.round(m.usedJSHeapSize/1048576)+" / "+Math.round(m.jsHeapSizeLimit/1048576)+" MB":"n/a"));}if(!parts.length){wrap.style.display="none";return;}wrap.style.display="block";wrap.textContent=parts.join("\\n");}' +
    'function loop(t){frames++;if(t-last>=500){fps=Math.round(frames*1000/(t-last));frames=0;last=t;render();}requestAnimationFrame(loop);}' +
    'window.addEventListener("message",function(e){var d=e.data||{};if(d.source==="hs-meters"){showFps=!!d.fps;showRam=!!d.ram;render();}});' +
    'requestAnimationFrame(loop);' +
    '})();</scr' + 'ipt>';

  HS.buildDoc = function (parts) {
    var html = parts.html || '', css = parts.css || [], js = parts.js || [];
    var style = css.filter(Boolean).map(function (c) { return '<style>\n' + c + '\n</style>'; }).join('\n');
    var script = js.filter(Boolean).map(function (s) { return '<scr' + 'ipt>\ntry{\n' + s + '\n}catch(e){console.error(e.message)}\n</scr' + 'ipt>'; }).join('\n');
    var inject = style + '\n' + HS.CONSOLE_SHIM + (parts.meters ? HS.METER_SHIM : '') + script;
    if (html && /<html[\s>]/i.test(html)) {
      if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, inject + '\n</body>');
      if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, inject + '\n</head>');
      return html + inject;
    }
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n<title>' +
      (parts.title || 'Preview') + '</title>\n' + style + '\n</head>\n<body>\n' + html + '\n' + HS.CONSOLE_SHIM + (parts.meters ? HS.METER_SHIM : '') + '\n' + script + '\n</body>\n</html>';
  };

  HS.openInNewTab = function (doc, meters) {
    var win = window.open('about:blank', '_blank');
    if (!win) return false;
    win.document.open();
    win.document.write(doc);
    win.document.close();
    if (meters) setTimeout(function () { try { win.postMessage({ source: 'hs-meters', fps: true, ram: true }, '*'); } catch (e) { /* ignore */ } }, 600);
    return true;
  };

  /* ---------------- snippets ---------------- */
  HS.DEFAULT_SNIPPETS = [
    { id: 'snip-flex', name: 'Center anything (flex)', type: 'css', tags: 'layout', content: '.center {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n' },
    { id: 'snip-debounce', name: 'Debounce helper', type: 'js', tags: 'utility', content: 'function debounce(fn, wait = 250) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), wait);\n  };\n}\n' },
    { id: 'snip-fetch-json', name: 'Fetch JSON', type: 'js', tags: 'network', content: "async function getJSON(url) {\n  const res = await fetch(url);\n  if (!res.ok) throw new Error('Request failed: ' + res.status);\n  return res.json();\n}\n" },
    { id: 'snip-media-query', name: 'Responsive breakpoints', type: 'css', tags: 'layout', content: '@media (max-width: 900px) {\n}\n\n@media (max-width: 600px) {\n}\n' },
    { id: 'snip-html-section', name: 'Semantic section', type: 'html', tags: 'structure', content: '<section class="section">\n  <h2>Section title</h2>\n  <p>Supporting copy goes here.</p>\n</section>\n' },
    { id: 'snip-localstorage', name: 'Safe localStorage', type: 'js', tags: 'storage', content: "function save(key, value) {\n  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('save failed', e); }\n}\n\nfunction load(key, fallback = null) {\n  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }\n}\n" }
  ];

  /* ---------------- plugin host ---------------- */
  HS.EXAMPLE_PLUGIN_SOURCE = "register({\n" +
    "  name: 'Example plugin',\n" +
    "  commands: {\n" +
    "    hello: function (ctx) { ctx.say('Hello from the example plugin!'); },\n" +
    "    stamp: function (ctx) { ctx.say('Project has ' + ctx.files().length + ' files.'); }\n" +
    "  },\n" +
    "  panels: [\n" +
    "    { id: 'example-echo', label: 'Echo tabs', run: function (ctx) { ctx.say('Open tabs: ' + ctx.tabs().length); } }\n" +
    "  ],\n" +
    "  themes: [\n" +
    "    { id: 'example-ocean', name: 'Ocean (plugin)', tokens: { bg: '#04121c', panel: '#08202f', panel2: '#0c2b3d', panel3: '#124057', border: '#1d5d7c', text: '#dff2ff', dim: '#8fbed6', accent: '#4fc3f7', accentText: '#04121c', danger: '#ff8a80', radius: '14px', radiusSm: '10px', font: \"'Google Sans', Roboto, Arial, sans-serif\", mono: \"'Roboto Mono', monospace\" } }\n" +
    "  ],\n" +
    "  setup: function (api) { api.registerTheme({ id: 'example-sand', name: 'Sand (plugin)', tokens: { bg: '#1a1614', panel: '#241f1b', panel2: '#2e2823', panel3: '#3a322b', border: '#514639', text: '#f4ece1', dim: '#b9a48d', accent: '#e8b07a', accentText: '#1a1614', danger: '#ef8a80', radius: '16px', radiusSm: '10px', font: \"'Google Sans', Roboto, Arial, sans-serif\", mono: \"'Roboto Mono', monospace\" } }); }\n" +
    "});";

  HS.PRESET_PLUGINS = [
    { id: 'preset-boilerplate', name: 'Boilerplate Generator', desc: 'Command: boilerplate html|css|js — generates starter code.', source: "register({\n  name: 'Boilerplate Generator',\n  commands: {\n    boilerplate: function (ctx) {\n      var type = ctx.args || 'html';\n      if (type === 'html') ctx.addFile('boilerplate.html', '<!DOCTYPE html>\\n<html lang=\"en\">\\n<head>\\n  <meta charset=\"UTF-8\" />\\n  <title>Boilerplate</title>\\n</head>\\n<body>\\n  <h1>Hello World</h1>\\n</body>\\n</html>');\n      else if (type === 'css') ctx.addFile('boilerplate.css', 'body {\\n  margin: 0;\\n  font-family: system-ui, sans-serif;\\n  display: grid;\\n  place-items: center;\\n  min-height: 100vh;\\n}\\n');\n      else if (type === 'js') ctx.addFile('boilerplate.js', 'document.addEventListener(\"DOMContentLoaded\", function () {\\n  console.log(\"Ready\");\\n});\\n');\n      else ctx.say('Usage: boilerplate html|css|js');\n    }\n  }\n});" },
    { id: 'preset-joke', name: 'Joke Teller', desc: 'Command: joke — prints a random programming joke.', source: "register({\n  name: 'Joke Teller',\n  commands: {\n    joke: function (ctx) {\n      var jokes = [\n        'Why do programmers prefer dark mode? Because light attracts bugs.',\n        'How many programmers does it take to change a light bulb? None — that\\'s a hardware problem.',\n        'A SQL query walks into a bar, goes up to two tables and asks: \"Can I join you?\"',\n        'Why did the developer go broke? He used up all his cache.',\n        'There are 10 types of people: those who understand binary and those who don\\'t.',\n        'I would tell you a UDP joke but you might not get it.'\n      ];\n      ctx.say(jokes[Math.floor(Math.random() * jokes.length)]);\n    }\n  },\n  panels: [\n    { id: 'joke-btn', label: 'Tell joke', run: function (ctx) { ctx.say('Type \"joke\" in the terminal!'); } }\n  ]\n});" },
    { id: 'preset-stats', name: 'Project Stats', desc: 'Command: stats — file count, line count and type breakdown.', source: "register({\n  name: 'Project Stats',\n  commands: {\n    stats: function (ctx) {\n      var files = ctx.files();\n      var lines = 0, types = {};\n      files.forEach(function (f) {\n        lines += f.content.split('\\n').length;\n        types[f.type] = (types[f.type] || 0) + 1;\n      });\n      var breakdown = Object.keys(types).map(function (t) { return t + ': ' + types[t]; }).join(', ');\n      ctx.say(files.length + ' files · ' + lines + ' lines · ' + breakdown);\n    }\n  }\n});" },
    { id: 'preset-minify', name: 'CSS Minifier', desc: 'Command: minify — minifies the active CSS file.', source: "register({\n  name: 'CSS Minifier',\n  commands: {\n    minify: function (ctx) {\n      var content = ctx.getContent();\n      if (!content) { ctx.say('Nothing open.'); return; }\n      var min = content.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/\\s+/g, ' ').replace(/\\s*([{}:;,>])\\s*/g, '$1').trim();\n      ctx.setContent(min);\n      ctx.say('Minified — saved ' + (content.length - min.length) + ' characters.');\n    }\n  }\n});" },
    { id: 'preset-rainbow', name: 'Rainbow Theme Pack', desc: 'Adds 3 colourful themes: Sunset, Aurora and Candy.', source: "register({\n  name: 'Rainbow Theme Pack',\n  themes: [\n    { id: 'rainbow-sunset', name: 'Sunset', tokens: { bg: '#1a0a0a', panel: '#2a1010', panel2: '#3a1818', panel3: '#4a2020', border: '#5a2a2a', text: '#ffe8e0', dim: '#d4a098', accent: '#ff6b6b', accentText: '#1a0a0a', danger: '#ff4444', radius: '16px', radiusSm: '10px', font: \"'Google Sans', Roboto, Arial, sans-serif\", mono: \"'Roboto Mono', monospace\" } },\n    { id: 'rainbow-aurora', name: 'Aurora', tokens: { bg: '#0a1a14', panel: '#102a20', panel2: '#163830', panel3: '#1c463a', border: '#2a5a4a', text: '#e0fff0', dim: '#98d4b0', accent: '#4ade80', accentText: '#0a1a14', danger: '#f87171', radius: '16px', radiusSm: '10px', font: \"'Google Sans', Roboto, Arial, sans-serif\", mono: \"'Roboto Mono', monospace\" } },\n    { id: 'rainbow-candy', name: 'Candy', tokens: { bg: '#1a0a1a', panel: '#2a1030', panel2: '#341840', panel3: '#3e2050', border: '#5a2a6a', text: '#ffe0f5', dim: '#d498c8', accent: '#e879f9', accentText: '#1a0a1a', danger: '#fb7185', radius: '16px', radiusSm: '10px', font: \"'Google Sans', Roboto, Arial, sans-serif\", mono: \"'Roboto Mono', monospace\" } }\n  ]\n});" }
  ];

  HS.createPluginHost = function (api) {
    var registry = { commands: {}, panels: [], themes: [] };
    function register(definition) {
      definition = definition || {};
      Object.keys(definition.commands || {}).forEach(function (name) {
        registry.commands[name.toLowerCase()] = { name: name, fn: definition.commands[name], plugin: definition.name };
      });
      (definition.panels || []).forEach(function (p) { registry.panels.push({ id: p.id, label: p.label, run: p.run, plugin: definition.name }); });
      (definition.themes || []).forEach(function (t) { registry.themes.push({ id: t.id, name: t.name, tokens: t.tokens, plugin: definition.name }); });
      if (typeof definition.setup === 'function') definition.setup(api);
    }
    return {
      register: register,
      load: function (plugin) {
        if (!plugin.enabled) return { ok: true };
        try {
          /* eslint-disable no-new-func */
          var fn = new Function('register', '"use strict";\n' + plugin.source + '\n');
          fn(register);
          return { ok: true };
        } catch (e) { return { ok: false, error: e.message }; }
      },
      loadAll: function (plugins) {
        var errors = [];
        (plugins || []).forEach(function (p) {
          var res = this.load(p);
          if (!res.ok) errors.push(p.name + ': ' + res.error);
        }, this);
        HS.pluginThemes = registry.themes;
        return errors;
      },
      commands: registry.commands,
      panels: registry.panels,
      themes: registry.themes
    };
  };
})(window.HS);

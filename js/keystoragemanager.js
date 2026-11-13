/* HTML Studio standalone — Key Storage panel.
   Shows every access key next to the storage bound to it: the script file name
   in your repo, the store id, how much is saved, and buttons to download, copy,
   rename or clear that one key's storage — plus download-all / restore.
   Opened from the side rail, Settings → Storage, or the Terminal: store manage. */
window.HSKeyStorageManager = (function () {
  function line(text, cls, mono) {
    var node = window.HS.el('p', { class: cls || 'hs-msg', text: text });
    if (mono) node.style.fontFamily = 'var(--hs-mono)';
    return node;
  }

  function button(label, handler, opts) {
    opts = opts || {};
    var btn = window.HS.el('button', { class: 'hs-btn' + (opts.primary ? ' primary' : '') });
    btn.appendChild(window.HS.el('span', { text: (opts.icon ? opts.icon + ' ' : '') + label }));
    if (opts.disabled) {
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.addEventListener('click', handler);
    }
    return btn;
  }

  function actionsRow() {
    var row = window.HS.el('div', {});
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '6px';
    row.style.marginTop = '8px';
    return row;
  }

  function card(k, tier, repaint, say, changed) {
    var KV = window.HSKV;
    var store = KV.read(k);
    var st = KV.stats(store);
    var name = KV.scriptName(k, store);
    var enabled = KV.keyEnabled(k);
    var canEdit = window.can(tier, 'edit');
    var canAdmin = window.can(tier, 'admin');
    var canOwner = window.can(tier, 'owner');
    var label = k.label || k.key;

    var wrap = window.HS.el('div', { class: 'hs-card' });
    wrap.style.marginBottom = '10px';

    var head = window.HS.el('div', {});
    head.style.display = 'flex';
    head.style.flexWrap = 'wrap';
    head.style.alignItems = 'center';
    head.style.gap = '8px';
    head.appendChild(window.HS.el('strong', { text: label }));
    head.appendChild(window.HS.el('span', { class: 'hs-tag', text: k.tier }));
    if (k.username) head.appendChild(window.HS.el('span', { class: 'hs-tag', text: '@' + k.username }));
    if (!enabled) head.appendChild(window.HS.el('span', { class: 'chip', text: 'disabled in keys.js' }));
    var statsEl = window.HS.el('span', { class: 'hint', text: st.entries + ' entries · ' + KV.fmt(st.bytes) });
    statsEl.style.marginLeft = 'auto';
    head.appendChild(statsEl);
    wrap.appendChild(head);

    var scriptLine = line('js/hs-storage-' + name + '.js  ·  store ' + (store.storeId || KV.id(k)), 'hs-msg', true);
    wrap.appendChild(scriptLine);

    var actions = actionsRow();
    actions.appendChild(button('Download', function () {
      var file = KV.downloadScript(k);
      say('Downloaded ' + file + ' — storage of "' + label + '".');
    }, { icon: '⬇', primary: true, disabled: !canEdit }));
    actions.appendChild(button('Copy', function () {
      KV.copyScript(k, function (ok) {
        say(ok
          ? 'Storage script for "' + label + '" copied — paste it into js/hs-storage-' + name + '.js.'
          : 'Clipboard blocked by the browser — use Download.', ok ? 'info' : 'error');
      });
    }, { icon: '⧉', disabled: !canEdit }));
    actions.appendChild(button('Rename', function () {
      window.HS.renameInline(scriptLine, name, function (next) {
        if (next === name) return;
        KV.setScriptName(k, next);
        say('Renamed to js/hs-storage-' + KV.scriptName(k, KV.read(k)) + '.js — still linked to "' + label + '".');
        changed();
        repaint();
      });
    }, { icon: '✎', disabled: !canEdit }));
    var clearBtn = button('Clear', null, { icon: '🗑', disabled: !canOwner });
    clearBtn.addEventListener('click', function () {
      if (clearBtn.dataset.armed !== '1') {
        clearBtn.dataset.armed = '1';
        clearBtn.querySelector('span').textContent = 'Confirm clear';
        setTimeout(function () {
          if (!clearBtn.isConnected) return;
          clearBtn.dataset.armed = '';
          clearBtn.querySelector('span').textContent = 'Clear';
        }, 4000);
        return;
      }
      KV.write(k, {});
      say('Cleared storage for "' + label + '".');
      changed(true);
      repaint();
    });
    actions.appendChild(clearBtn);
    wrap.appendChild(actions);

    var entriesBox = window.HS.el('div', {});
    entriesBox.style.display = 'none';
    entriesBox.style.marginTop = '6px';
    var names = Object.keys(store.entries || {});
    if (!names.length) {
      entriesBox.appendChild(line('Nothing saved yet — pages write here with window.HSStorage.set(key, value).', 'hs-msg'));
    }
    names.forEach(function (entryName) {
      var row = window.HS.el('pre', { class: 'hs-pre', text: entryName + ' = ' + KV.entryText(store.entries[entryName]) });
      row.style.marginTop = '4px';
      entriesBox.appendChild(row);
    });
    var holdBtn = button('What it holds', function () {
      var show = entriesBox.style.display === 'none';
      entriesBox.style.display = show ? 'block' : 'none';
      holdBtn.querySelector('span').textContent = (show ? 'Hide' : '👁 What it holds');
    }, { icon: '👁' });
    // keep the toggle next to the other actions
    actions.insertBefore(holdBtn, actions.lastChild);
    wrap.appendChild(entriesBox);

    if (!canAdmin && k.tier !== 'guest') {
      var note = line('An admin key is needed to download another key\'s storage.', 'hs-msg');
      note.style.marginTop = '4px';
      wrap.appendChild(note);
    }
    return wrap;
  }

  function open(ctx) {
    ctx = ctx || {};
    var KV = window.HSKV;
    var tier = ctx.tier || null;
    var say = ctx.say || function () {};
    var changed = ctx.onChanged || function () {};

    var backdrop = window.HS.el('div', { class: 'hs-backdrop' });
    var modal = window.HS.el('div', { class: 'hs-modal' });
    var content = window.HS.el('div', { class: 'content' });
    var header = window.HS.el('header');
    header.appendChild(window.HS.el('h2', { text: 'Key storage' }));
    var grow = window.HS.el('span', { class: 'grow' });
    grow.style.marginLeft = 'auto';
    header.appendChild(grow);
    var closeBtn = window.HS.el('button', { class: 'winbtn', text: '✕', title: 'Close' });
    header.appendChild(closeBtn);
    var body = window.HS.el('div', { class: 'body' });
    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);
    backdrop.appendChild(modal);
    window.HS.$('#hs-modals').appendChild(backdrop);

    function close() { backdrop.remove(); }
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });

    function repaint() {
      body.innerHTML = '';
      var rows = KV.list();
      var entries = 0;
      var bytes = 0;
      rows.forEach(function (r) { entries += r.stats.entries; bytes += r.stats.bytes; });

      body.appendChild(window.HS.el('p', {
        text: 'Each key owns one storage script, named after that key. Anything a page saves with window.HSStorage lands in the store of the key signed in — kept separate per key, and downloadable as a file for your repo.'
      }));
      body.appendChild(line(rows.length + ' keys · ' + entries + ' entries · ' + KV.fmt(bytes) + ' in total', 'hs-msg'));

      var list = window.HS.el('div', {});
      list.style.marginTop = '10px';
      rows.forEach(function (r) { list.appendChild(card(r.key, tier, repaint, say, changed)); });
      body.appendChild(list);

      var footer = actionsRow();
      footer.style.marginTop = '14px';
      footer.appendChild(button('Download all storages', function () {
        window.HS.downloadText(KV.bundleText(), 'hs-key-storages.json', 'application/json');
        say('Every key storage downloaded as hs-key-storages.json.');
      }, { icon: '⬇', disabled: !window.can(tier, 'admin') }));
      footer.appendChild(button('Restore storages', function () {
        KV.pickImport(function (count) {
          say(count ? 'Restored ' + count + ' key storage(s).' : 'That file was not a key-storage bundle.', count ? 'info' : 'error');
          changed(true);
          repaint();
        });
      }, { icon: '⬆', disabled: !window.can(tier, 'admin') }));
      body.appendChild(footer);
      body.appendChild(line('Commit each script as js/hs-storage-<name>.js and load it before app.js — or use "store copy" in the Terminal.', 'hs-msg'));
    }

    repaint();
    return close;
  }

  return { open: open };
})();
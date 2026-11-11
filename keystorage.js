/* HTML Studio standalone — per-key storage linked to each access key.
   Mirrors src/lib/studio/keyStorage.js. Loaded after core.js (needs HS) and
   keys.js (needs window.HS_KEYS). */
window.HSKV = (function () {
  var PREFIX = 'hs_keystore_';

  function hashStr(s) {
    var h = 5381, str = String(s || ''), i;
    for (i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function id(k) {
    if (!k) return null;
    var label = String(k.label || k.tier || 'key').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28);
    return (k.tier || 'key') + '_' + label + '_' + hashStr(k.key);
  }

  function read(k) {
    if (!k) return { storeId: null, label: '', tier: '', username: '', entries: {}, updated: 0 };
    var storeId = id(k);
    var raw = window.HS.readLS(PREFIX + storeId, null);
    return { storeId: storeId, label: k.label || '', tier: k.tier || '', username: k.username || '', entries: (raw && raw.entries) || {}, updated: (raw && raw.updated) || 0 };
  }

  function write(k, entries) {
    if (!k) return null;
    var storeId = id(k);
    var next = { storeId: storeId, label: k.label || '', tier: k.tier || '', username: k.username || '', entries: entries || {}, updated: Date.now() };
    window.HS.writeLS(PREFIX + storeId, next);
    return next;
  }

  function stats(store) {
    var entries = (store && store.entries) || {};
    var bytes = 0;
    try { bytes = new Blob([JSON.stringify(entries)]).size; } catch (e) { bytes = JSON.stringify(entries).length; }
    return { entries: Object.keys(entries).length, bytes: bytes };
  }

  function fmt(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  function allKeys() { return window.HS_KEYS || []; }

  function entryText(v) { return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v); }

  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  /* Default script name: the key's own name (username, else label) plus its
     tier — so a file in the repo obviously belongs to that key. "store rename"
     overrides it; the store id never changes, so the link always stays intact. */
  function keyFileName(k) {
    if (!k) return 'unassigned';
    return slug((k.username || k.label || k.tier) + '-' + (k.tier || 'key')) || 'storage';
  }

  function scriptName(k, store) {
    store = store || read(k);
    var custom = (store && store.scriptName) || '';
    return slug(custom) || keyFileName(k) || 'storage';
  }

  function setScriptName(k, name) {
    var s = read(k);
    var next = {
      storeId: id(k), label: s.label, tier: s.tier, username: s.username,
      entries: s.entries || {}, scriptName: String(name || '').trim(), updated: Date.now()
    };
    window.HS.writeLS(PREFIX + id(k), next);
    return next;
  }

  function scriptText(k, store) {
    store = store || read(k);
    var name = scriptName(k, store);
    var data = (store && store.entries) || {};
    return '/* HTML Studio — key storage script\n'
      + ' * Script:   ' + name + '\n'
      + ' * Key:      ' + ((k && k.label) || 'unassigned') + ' (' + ((k && k.tier) || 'guest') + ')\n'
      + ' * Username: ' + ((k && k.username) || '(none)') + '\n'
      + ' * Store id: ' + id(k) + '\n'
      + ' * Bound to the key above — this store only ever holds that key\'s data.\n'
      + ' * Commit as js/hs-storage-' + name + '.js and load it before app.js.\n'
      + ' */\n'
      + 'window.HS_KEY_STORAGE = ' + JSON.stringify({
        scriptName: name, storeId: id(k), tier: (k && k.tier) || 'guest',
        label: (k && k.label) || '', username: (k && k.username) || '', data: data
      }, null, 2) + ';\n';
  }

  function bundleText() {
    return JSON.stringify({
      app: 'HTML Studio', kind: 'key-storages', version: 1, exported: new Date().toISOString(),
      stores: allKeys().map(function (k) {
        var s = read(k);
        return { storeId: id(k), scriptName: scriptName(k, s), tier: k.tier, label: k.label, username: k.username || '', entries: s.entries };
      })
    }, null, 2);
  }

  function importBundle(text) {
    var parsed = JSON.parse(text);
    var list = Array.isArray(parsed) ? parsed : parsed && parsed.stores;
    if (!Array.isArray(list)) throw new Error('That file is not an HTML Studio key-storage bundle.');
    var restored = 0;
    list.forEach(function (item) {
      var match = null;
      allKeys().forEach(function (k) {
        if (match) return;
        if (item.storeId === id(k)) match = k;
        else if (item.tier === k.tier && (item.username || '') === (k.username || '')) match = k;
      });
      if (!match) return;
      write(match, item.entries || {});
      if (item.scriptName) setScriptName(match, item.scriptName);
      restored += 1;
    });
    return restored;
  }

  function pickImport(cb) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', function () {
      if (!input.files[0]) return;
      window.HS.readFileText(input.files[0]).then(function (text) {
        try { cb(importBundle(text)); } catch (e) { cb(0); }
      });
    });
    input.click();
  }

  // Injects window.HSStorage into the preview, bound to one key's store.
  function shim(keyRecord, tier) {
    var store = read(keyRecord);
    var sid = store.storeId || 'none';
    return '<script>(function(){var S=' + JSON.stringify(sid) + ',T=' + JSON.stringify(tier || 'guest') + ',d=' + JSON.stringify(store.entries || {}) + ';'
      + 'var K="hs_kv_"+S;'
      + 'function b(){try{return new Blob([JSON.stringify(d)]).size;}catch(e){return JSON.stringify(d).length;}}'
      + 'function f(){try{parent.postMessage({source:"hs-key-store",storeId:S,tier:T,data:d},"*");}catch(e){}try{localStorage.setItem(K,JSON.stringify(d));}catch(e){}}'
      + 'window.HSStorage={storeId:S,tier:T,get:function(k,fb){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:(fb===undefined?null:fb);},set:function(k,v){d[k]=v;f();return v;},remove:function(k){delete d[k];f();},clear:function(){d={};f();},keys:function(){return Object.keys(d);},all:function(){return JSON.parse(JSON.stringify(d));},info:function(){return{storeId:S,tier:T,entries:Object.keys(d).length,bytes:b()};}};'
      + 'window.addEventListener("message",function(e){var m=e.data||{};if(m.source==="hs-key-sync"&&m.storeId===S){d=m.data||{};f();}});'
      + 'f();})();<\/script>';
  }

  /* Enabled state comes from keys.js — a disabled key keeps its storage but
     cannot be signed in with. */
  function keyEnabled(k) {
    if (window.HS_KEYS_ENABLED === false) return false;
    return !!k && k.enabled !== false;
  }

  /* Every key paired with the storage bound to it (used by the Key Storage panel). */
  function list() {
    return allKeys().map(function (k) {
      var s = read(k);
      return { key: k, store: s, storeId: id(k), scriptName: scriptName(k, s), stats: stats(s), enabled: keyEnabled(k) };
    });
  }

  function downloadScript(k) {
    var s = read(k);
    var file = 'hs-storage-' + scriptName(k, s) + '.js';
    window.HS.downloadText(scriptText(k, s), file, 'application/javascript');
    return file;
  }

  function copyScript(k, cb) {
    var text = scriptText(k, read(k));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { if (cb) cb(true); }, function () { if (cb) cb(false); });
    } else if (cb) cb(false);
  }

  return {
    id: id, read: read, write: write, stats: stats, fmt: fmt, allKeys: allKeys,
    entryText: entryText, shim: shim, scriptName: scriptName, setScriptName: setScriptName,
    scriptText: scriptText, bundleText: bundleText, importBundle: importBundle, pickImport: pickImport,
    keyFileName: keyFileName, keyEnabled: keyEnabled, list: list,
    downloadScript: downloadScript, copyScript: copyScript
  };
})();

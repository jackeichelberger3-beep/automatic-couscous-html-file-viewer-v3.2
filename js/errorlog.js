/* HTML Studio standalone — error log.
   Collects runtime errors, rejected promises, console errors and errors the
   studio reports itself, so the lock screen can show them even when the
   studio behind the lock cannot draw. */
(function () {
  var MAX = 80;
  var entries = [];
  var listeners = [];
  var installed = false;

  function textOf(value) {
    if (value instanceof Error) return value.message + (value.stack ? '\n' + value.stack : '');
    if (value && typeof value === 'object') {
      try { return JSON.stringify(value); } catch (e) { return String(value); }
    }
    return String(value);
  }

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(entries.slice()); } catch (e) { /* a broken listener must not break logging */ }
    });
  }

  function push(kind, value, extra) {
    entries.push({ kind: kind, message: textOf(value), extra: extra || '', time: Date.now() });
    if (entries.length > MAX) entries = entries.slice(-MAX);
    notify();
  }

  function install() {
    if (installed) return;
    installed = true;
    window.addEventListener('error', function (e) {
      if (!e) return;
      push('error', e.message || 'Script error', (e.filename || '') + (e.lineno ? ':' + e.lineno : ''));
    });
    window.addEventListener('unhandledrejection', function (e) {
      var reason = e && e.reason;
      push('promise', reason && reason.message ? reason.message : reason, reason && reason.stack ? reason.stack : '');
    });
    if (window.console && console.error) {
      var native = console.error.bind(console);
      console.error = function () {
        push('console', Array.prototype.map.call(arguments, textOf).join(' '));
        native.apply(null, arguments);
      };
    }
  }

  window.HSErrorLog = {
    install: install,
    all: function () { return entries.slice(); },
    push: push,
    clear: function () { entries = []; notify(); },
    subscribe: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    }
  };

  install();
})();
/* HTML Studio — inline rename for tabs, files and folders.
   window.prompt is blocked inside sandboxed iframes (and some browsers), so a
   right-click → Rename edits the label in place instead: the label becomes an
   input, Enter or clicking away commits, Escape cancels. */
(function (HS) {
  function renameInline(labelEl, currentValue, onCommit) {
    if (!labelEl || !labelEl.parentNode || labelEl.__editing) return;
    labelEl.__editing = true;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'hs-inline-edit';
    input.value = currentValue == null ? '' : String(currentValue);

    labelEl.style.display = 'none';
    labelEl.parentNode.insertBefore(input, labelEl.nextSibling);

    var done = false;
    function finish(commit) {
      if (done) return;
      done = true;
      var value = String(input.value).trim();
      if (input.parentNode) input.parentNode.removeChild(input);
      labelEl.style.display = '';
      labelEl.__editing = false;
      if (commit && value) onCommit(value);
    }

    input.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', function () { finish(true); });
    ['click', 'mousedown', 'dblclick', 'contextmenu'].forEach(function (type) {
      input.addEventListener(type, function (e) { e.stopPropagation(); });
    });

    input.focus();
    input.select();
  }

  HS.renameInline = renameInline;
})(window.HS);
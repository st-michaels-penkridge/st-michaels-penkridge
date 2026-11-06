// Local review control. Share an explicit ?design=1&type=warm URL to compare.
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  // The pairing is chosen now. Old comparison URLs must not override it.
  if (params.get('design') !== '1') return;
  var styles = [
    ['classic', '01 · Original', 'Castoro + Josefin Sans', 'Castoro, Georgia, serif'],
    ['literary', '02 · Literary', 'Cormorant Garamond + Inter', '"Cormorant Garamond", Georgia, serif'],
    ['warm', '03 · Warm', 'Lora + Source Sans 3', 'Lora, Georgia, serif'],
    ['modern', '04 · Modern', 'DM Sans', '"DM Sans", sans-serif']
  ];
  var current = params.get('type') || 'classic';
  if (!styles.some(function (s) { return s[0] === current; })) current = 'classic';
  document.body.dataset.type = current;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && params.get('design') !== '1') return;
  var panel = document.createElement('details');
  panel.className = 'type-preview';
  var summary = document.createElement('summary');
  summary.textContent = 'Compare 4 font directions';
  panel.appendChild(summary);
  var choices = document.createElement('div');
  choices.className = 'type-options';
  styles.forEach(function (style) {
    var button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(current === style[0]));
    var sample = document.createElement('span');
    sample.textContent = 'Aa'; sample.style.fontFamily = style[3];
    button.appendChild(sample);
    button.appendChild(document.createTextNode(style[1]));
    var description = document.createElement('small');
    description.textContent = style[2]; button.appendChild(description);
    button.addEventListener('click', function () {
      document.body.dataset.type = style[0];
      choices.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      var url = new URL(location.href); url.searchParams.set('type', style[0]);
      history.replaceState(null, '', url);
    });
    choices.appendChild(button);
  });
  panel.appendChild(choices);
  var note = document.createElement('p'); note.className = 'type-note';
  note.textContent = 'Preview controls. Changes apply across this home page, including the navigation.';
  panel.appendChild(note);
  document.body.appendChild(panel);
})();

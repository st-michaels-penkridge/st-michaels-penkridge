// Demo branch only: try any Google font on the whole site.
// Pick a font for headings and one for text; the choice stays in this browser while you click around.
(function () {
  var KEY = "smp-fonts";
  var base = document.currentScript.src.replace(/font-lab\.js.*$/, "");
  var FALLBACK = { s: "serif", a: "sans-serif", d: "serif", h: "cursive", m: "monospace" };
  var KINDS = [["", "All"], ["s", "Serif"], ["a", "Sans"], ["d", "Display"], ["h", "Handwriting"], ["m", "Mono"]];
  var ROLES = [["display", "Headings"], ["body", "Text"]];
  var root = document.documentElement;
  var picks = {};
  try { picks = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* nothing stored */ }

  function sheet(href) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  function plus(name) {
    return encodeURIComponent(name).replace(/%20/g, "+");
  }
  // font = [name, kind, weights, has italic]
  function stack(font) {
    return '"' + font[0] + '", ' + FALLBACK[font[1]];
  }
  function fullHref(font) {
    var w = font[2].filter(function (n) { return n >= 400 && n <= 700; });
    if (!w.length) w = [font[2][0]];
    var spec = font[3] && w.indexOf(400) > -1
      ? "ital,wght@" + w.map(function (n) { return "0," + n; }).join(";") + ";1,400"
      : "wght@" + w.join(";");
    return "https://fonts.googleapis.com/css2?family=" + plus(font[0]) + ":" + spec + "&display=swap";
  }
  function previewHref(font) {
    var w = font[2].indexOf(400) > -1 ? 400 : font[2][0];
    return "https://fonts.googleapis.com/css2?family=" + plus(font[0]) + ":wght@" + w + "&text=" + encodeURIComponent(font[0]) + "&display=swap";
  }
  function apply(role, font) {
    if (font) {
      sheet(fullHref(font));
      root.style.setProperty("--" + role, stack(font));
    } else {
      root.style.removeProperty("--" + role);
    }
  }
  ROLES.forEach(function (r) { apply(r[0], picks[r[0]]); });

  // The panel
  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "font-lab-toggle";
  toggle.id = "font-lab-toggle";
  toggle.textContent = "Fonts";
  toggle.setAttribute("aria-expanded", "false");
  document.body.appendChild(toggle);
  sheet(base + "font-lab.css?v=20261127");

  var panel, list, search, count, now, role = "display", kind = "", fonts;

  function chip(label, pressed, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", function () {
      b.parentNode.querySelectorAll("button").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      onClick();
    });
    return b;
  }
  function group(cls, label, items) {
    var g = document.createElement("div");
    g.className = cls;
    g.setAttribute("role", "group");
    g.setAttribute("aria-label", label);
    items.forEach(function (i) { g.appendChild(i); });
    return g;
  }
  function showNow() {
    now.textContent = ROLES.map(function (r) {
      return r[1] + ": " + (picks[r[0]] ? picks[r[0]][0] : "the site's own");
    }).join(" · ");
    list.querySelectorAll("button").forEach(function (b) {
      var p = picks[role];
      b.setAttribute("aria-pressed", String(!!p && p[0] === b.dataset.name));
    });
  }
  function filter() {
    var q = search.value.trim().toLowerCase(), shown = 0;
    list.querySelectorAll("li").forEach(function (li) {
      var hit = (!kind || li.dataset.kind === kind) && li.dataset.key.indexOf(q) > -1;
      li.hidden = !hit;
      if (hit) shown++;
    });
    count.textContent = shown + (shown === 1 ? " font" : " fonts");
  }
  function build() {
    panel = document.createElement("section");
    panel.className = "font-lab";
    panel.id = "font-lab";
    panel.setAttribute("aria-label", "Try fonts");
    panel.hidden = true;
    panel.innerHTML = '<div class="font-lab-head"><h2>Try fonts</h2><button type="button" class="font-lab-close" aria-label="Close">&times;</button></div>' +
      '<p class="font-lab-now" aria-live="polite"></p>' +
      '<label class="font-lab-search">Search<input type="search" autocomplete="off" placeholder="Loading fonts..."></label>' +
      '<p class="font-lab-count" aria-live="polite"></p><ul class="font-lab-list"></ul>' +
      '<button type="button" class="font-lab-reset">Back to the site\'s fonts</button>';
    now = panel.querySelector(".font-lab-now");
    search = panel.querySelector("input");
    count = panel.querySelector(".font-lab-count");
    list = panel.querySelector("ul");
    panel.insertBefore(group("font-lab-roles", "Change the font for", ROLES.map(function (r) {
      return chip(r[1], r[0] === role, function () { role = r[0]; showNow(); });
    })), now);
    panel.insertBefore(group("font-lab-kinds", "Kind of font", KINDS.map(function (k) {
      return chip(k[1], k[0] === kind, function () { kind = k[0]; filter(); });
    })), count);
    panel.querySelector(".font-lab-close").addEventListener("click", close);
    panel.querySelector(".font-lab-reset").addEventListener("click", function () {
      picks = {};
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ }
      ROLES.forEach(function (r) { apply(r[0]); });
      showNow();
    });
    search.addEventListener("input", filter);
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.body.appendChild(panel);

    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var b = en.target;
        sheet(previewHref(fonts[b.dataset.i]));
        b.style.fontFamily = stack(fonts[b.dataset.i]);
        seen.unobserve(b);
      });
    }, { root: list, rootMargin: "200px 0px" });

    fetch(base + "font-lab.json").then(function (r) { return r.json(); }).then(function (data) {
      fonts = data;
      var frag = document.createDocumentFragment();
      data.forEach(function (font, i) {
        var li = document.createElement("li");
        li.dataset.kind = font[1];
        li.dataset.key = font[0].toLowerCase();
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = font[0];
        b.dataset.name = font[0];
        b.dataset.i = i;
        b.addEventListener("click", function () {
          picks[role] = font;
          try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch (e) { /* not kept */ }
          apply(role, font);
          showNow();
        });
        li.appendChild(b);
        frag.appendChild(li);
        seen.observe(b);
      });
      list.appendChild(frag);
      search.placeholder = "Search " + data.length.toLocaleString("en-GB") + " fonts";
      filter();
      showNow();
    });
    showNow();
  }
  function open() {
    if (!panel) build();
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    search.focus();
  }
  function close() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }
  toggle.addEventListener("click", function () {
    if (panel && !panel.hidden) close(); else open();
  });
})();

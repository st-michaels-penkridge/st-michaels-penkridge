// Church seasons: the site takes on the colour of the season, as the altar frontal does.
// Advent runs from Advent Sunday to 23 December, Christmas from 24 December to Epiphany (6 January),
// Easter from Easter Day to the day before Pentecost, and Pentecost for its own week.
// To preview a season, add ?season=advent (or christmas, easter, pentecost, none) to any page address.
(function () {
  "use strict";
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var year = today.getFullYear();

  function daysAfter(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  // Easter Day in the Western church (the Meeus/Jones/Butcher method)
  function easterDay(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }

  function seasonOn() {
    var christmas = new Date(year, 11, 25);
    // Advent Sunday is the fourth Sunday before Christmas Day
    var adventSunday = daysAfter(christmas, -(christmas.getDay() || 7) - 21);
    var easter = easterDay(year);
    var pentecost = daysAfter(easter, 49);
    if (today >= adventSunday && today < new Date(year, 11, 24)) return "advent";
    if (today >= new Date(year, 11, 24) || today <= new Date(year, 0, 6)) return "christmas";
    if (today >= easter && today < pentecost) return "easter";
    if (today >= pentecost && today < daysAfter(pentecost, 7)) return "pentecost";
    return "";
  }

  var preview = new URLSearchParams(location.search).get("season");
  var season = /^(advent|christmas|easter|pentecost|none)$/.test(preview) ? preview : seasonOn();
  if (season && season !== "none") document.documentElement.setAttribute("data-season", season);
})();

(function () {
  "use strict";
  // Size the full-screen hero to whatever height the header really is
  var mast = document.querySelector(".masthead");
  function sizeHero() {
    if (mast) document.documentElement.style.setProperty("--mast-h", mast.offsetHeight + "px");
  }
  sizeHero();
  window.addEventListener("resize", sizeHero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeHero);

  // A soft shadow under the header once the page has moved
  if (mast) {
    var onScroll = function () { mast.classList.toggle("is-scrolled", window.scrollY > 4); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Buttons and donate buttons: a light that follows the cursor, and a gentle magnet pull on .btn.
  // Only for mouse and trackpad users, and never when motion is turned off.
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine) return;

  document.querySelectorAll(".btn, .btn-give, .btn-line, .nav a[data-nav='donate']").forEach(function (btn) {
    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      btn.style.setProperty("--mx", x + "px");
      btn.style.setProperty("--my", y + "px");
      if (still) return;
      var tx = ((x - r.width / 2) / r.width) * 6;
      var ty = ((y - r.height / 2) / r.height) * 5;
      btn.style.setProperty("--tx", tx.toFixed(1) + "px");
      btn.style.setProperty("--ty", ty.toFixed(1) + "px");
    });
    btn.addEventListener("pointerleave", function () {
      btn.style.removeProperty("--tx");
      btn.style.removeProperty("--ty");
    });
  });

  // Stained glass: each window tilts slightly towards the cursor
  if (still) return;
  document.querySelectorAll(".lancet").forEach(function (glass) {
    glass.addEventListener("pointermove", function (e) {
      var r = glass.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      glass.style.setProperty("--ry", (px * 14).toFixed(2) + "deg");
      glass.style.setProperty("--rx", (-py * 6).toFixed(2) + "deg");
      glass.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
      glass.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
      glass.classList.add("is-tilting");
    });
    glass.addEventListener("pointerleave", function () {
      ["--rx", "--ry"].forEach(function (p) { glass.style.removeProperty(p); });
      glass.classList.remove("is-tilting");
    });
  });
})();

// Glass controls (the Menu corner and the first Sunday tab): like iOS, their lettering turns white over dark
// parts of the page and stays black over light ones. The Menu lines and word are checked one by one, so each
// gets .on-dark when what is behind it is dark, even when the corner sits across two sections.
(function () {
  "use strict";
  var darkParts = ".hero-altar, .life, .find-grave, .give-text, .footer";
  var parts = document.querySelectorAll(".nav-toggle-bars, .nav-toggle-word, .sunday-tab");
  if (!parts.length) return;
  var pending = false;
  function tint() {
    pending = false;
    parts.forEach(function (el) {
      var host = el.closest(".masthead, .first-sunday"), box = el.getBoundingClientRect();
      var under = document.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2).filter(function (u) { return !host.contains(u); })[0];
      el.classList.toggle("on-dark", !!(under && under.closest(darkParts)));
    });
  }
  function queue() { if (!pending) { pending = true; requestAnimationFrame(tint); } }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  window.addEventListener("load", queue);
  tint();
})();

// Main menu: a tab at the top of every page opens a panel with every page listed (Farm Africa style)
(function () {
  "use strict";
  var mast = document.querySelector(".masthead");
  var toggle = document.querySelector(".nav-toggle");
  var groups = Array.prototype.slice.call(document.querySelectorAll(".nav-group"));
  function setGroup(g, open) {
    g.classList.toggle("is-open", open);
    g.querySelector(".nav-group-btn").setAttribute("aria-expanded", String(open));
  }
  function closeAll(except) { groups.forEach(function (g) { if (g !== except) setGroup(g, false); }); }
  groups.forEach(function (g) {
    var btn = g.querySelector(".nav-group-btn");
    btn.addEventListener("click", function () {
      if (mast && mast.classList.contains("nav-open")) return; // in the full menu every group stays open
      var open = !g.classList.contains("is-open");
      closeAll(g); setGroup(g, open);
    });
    g.addEventListener("focusout", function (e) {
      if (mast && mast.classList.contains("nav-open")) return;
      if (!g.contains(e.relatedTarget) && window.matchMedia("(min-width: 1001px)").matches) setGroup(g, false);
    });
  });
  // The tab reads "Close" while the menu is open, and sits on the panel's lower edge
  function word(open) {
    var w = toggle.querySelector(".nav-toggle-word");
    if (w) w.textContent = open ? "Close" : "Menu";
    if (open) mast.style.setProperty("--menu-h", document.getElementById("site-nav").offsetHeight + "px");
  }
  // Closing sweeps the panel back into the corner first (.is-closing), then the menu is put away
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function closeMenu(focus) {
    if (!mast.classList.contains("nav-open") || mast.classList.contains("is-closing")) return;
    toggle.setAttribute("aria-expanded", "false"); word(false);
    if (focus) toggle.focus();
    function done() { mast.classList.remove("nav-open", "is-closing"); closeAll(); }
    if (still) return done();
    mast.classList.add("is-closing");
    setTimeout(done, 450);
  }
  if (toggle && mast) {
    toggle.addEventListener("click", function () {
      if (mast.classList.contains("is-closing")) return;
      if (mast.classList.contains("nav-open")) return closeMenu(false);
      mast.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      groups.forEach(function (g) { setGroup(g, true); }); // the full menu shows every page at once
      word(true);
    });
  }
  document.addEventListener("click", function (e) {
    if (mast && mast.classList.contains("nav-open")) {
      // A click on the dimmed page closes the menu
      if (!e.target.closest("#site-nav") && !e.target.closest(".nav-toggle")) closeMenu(false);
      return;
    }
    if (!e.target.closest || !e.target.closest(".nav-group")) {
      if (window.matchMedia("(min-width: 1001px)").matches) closeAll();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (mast && mast.classList.contains("nav-open") && toggle) { closeMenu(true); return; }
    var g = document.activeElement && document.activeElement.closest && document.activeElement.closest(".nav-group");
    closeAll();
    if (g) g.querySelector(".nav-group-btn").focus();
  });
})();

// Cookies: on a first visit a bar asks once, with "Accept all" and "Reject all" given equal weight.
// Google's map sets cookies, so it loads only after "Accept all", or once when someone presses "Show the map".
// The answer is remembered in this browser and can be changed on the privacy page.
(function () {
  "use strict";
  var KEY = "smp-cookies";
  var settings = document.querySelector("[data-cookie-settings]");
  var bar = null;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(choice) {
    try { localStorage.setItem(KEY, choice); } catch (e) { /* storage blocked: ask again next visit */ }
  }
  function load(box) {
    var frame = document.createElement("iframe");
    frame.title = "Google map showing St Michael's Church, Penkridge";
    frame.src = box.getAttribute("data-src");
    frame.referrerPolicy = "no-referrer-when-downgrade";
    box.replaceWith(frame);
  }
  function loadAll() {
    document.querySelectorAll(".map-facade").forEach(load);
  }
  function ask() {
    if (bar) return;
    bar = document.createElement("div");
    bar.className = "cookie-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Cookies");
    bar.innerHTML = '<p>We use optional cookies, such as Google Maps for our map. You can change your mind at any time on our <a href="privacy.html#cookies">privacy page</a>.</p>' +
      '<div class="actions"><button type="button" class="btn-square btn-line" data-choice="accepted">Accept all</button>' +
      '<button type="button" class="btn-square btn-line" data-choice="rejected">Reject all</button></div>';
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-choice]");
      if (!btn) return;
      store(btn.getAttribute("data-choice"));
      bar.remove();
      bar = null;
      if (btn.getAttribute("data-choice") === "accepted") loadAll();
    });
    document.body.appendChild(bar);
  }

  // "Show the map" still loads that one map, just this once
  document.querySelectorAll(".map-facade .map-load").forEach(function (btn) {
    btn.addEventListener("click", function () { load(btn.closest(".map-facade")); });
  });
  if (settings) settings.addEventListener("click", function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ }
    ask();
  });
  if (stored() === "accepted") loadAll();
  else if (!stored()) ask();
})();

// Find a grave: example surnames roll down through the empty search field to prompt
// a search. They stop once someone types, and stay still for people who turn motion off.
(function () {
  "use strict";
  var form = document.querySelector(".grave-search");
  var hint = form && form.querySelector(".grave-hint");
  if (!hint) return;
  var input = form.querySelector("input"), name = hint.querySelector(".grave-name");
  // Surnames of a similar width, so the gap before the "…" stays small
  var names = ["Smith", "Wright", "Walker", "Taylor", "Green", "Turner", "Harris", "Baker", "Clarke", "Morris", "Parker", "Lewis",
    "Wilson", "Carter", "Mason", "Bailey", "Fisher", "Davies", "Evans", "Barker", "Moore", "Marsh", "Rogers", "Butler"];
  var i = 0, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  input.placeholder = "";
  hint.hidden = false;
  function typed() { form.classList.toggle("typed", input.value !== ""); }
  typed(); // a name the browser kept from last time
  // Hold the name's space at the width of the longest surname, so the "…" after it never moves
  function fit() {
    var widest = 0, shown = name.textContent;
    name.style.minWidth = "";
    names.forEach(function (n) {
      name.textContent = n;
      widest = Math.max(widest, name.getBoundingClientRect().width);
    });
    name.textContent = shown;
    name.style.minWidth = Math.ceil(widest) + "px";
  }
  fit();
  if (document.fonts) document.fonts.ready.then(fit);
  input.addEventListener("input", typed);
  if (still) return;
  setInterval(function () {
    if (input.value) return;
    name.classList.add("out");
    setTimeout(function () {
      i = (i + 1) % names.length;
      name.textContent = names[i];
      name.classList.remove("out");
      name.classList.add("prep");
      void name.offsetWidth;
      name.classList.remove("prep");
    }, 250);
  }, 1560);
})();

// Find a grave: churchyard photos drift slowly behind the search, with a button to pause them.
// They stay still for anyone who has turned motion off.
(function () {
  var section = document.querySelector(".find-grave");
  var pause = section && section.querySelector(".reel-pause");
  if (!pause || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  section.classList.add("is-moving");
  pause.hidden = false;
  pause.addEventListener("click", function () {
    var paused = pause.getAttribute("aria-pressed") !== "true";
    pause.setAttribute("aria-pressed", String(paused));
    section.classList.toggle("is-paused", paused);
  });
})();

// Your first Sunday: the tab on the right edge grows into a panel, and shrinks back into the tab when closed
(function () {
  var tab = document.querySelector(".sunday-tab");
  var panel = tab && document.getElementById(tab.getAttribute("aria-controls"));
  if (!panel) return;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var address = document.querySelector(".hero-address span");

  // The tab stays on the hero, its bottom level with the address line, and scrolls away with the page
  function place() {
    if (!address) return;
    var top = address.getBoundingClientRect().bottom + window.scrollY - tab.offsetHeight;
    tab.parentElement.style.setProperty("--tab-top", Math.max(16, top) + "px");
  }
  place();
  window.addEventListener("resize", place);

  function open() {
    var r = tab.getBoundingClientRect();
    // The panel opens from wherever the tab is on screen, kept clear of the screen edges
    panel.style.setProperty("--panel-bottom", Math.min(Math.max(16, window.innerHeight - r.bottom), window.innerHeight * .4) + "px");
    panel.style.setProperty("--tab-h", r.height + "px");
    panel.style.setProperty("--tab-w", r.width + "px");
    panel.hidden = false;
    void panel.offsetWidth;
    panel.classList.add("is-open");
    tab.parentElement.classList.add("is-open");
    tab.setAttribute("aria-expanded", "true");
    panel.querySelector("h2").focus({ preventScroll: true });
  }

  function close(returnFocus) {
    if (panel.hidden) return;
    panel.classList.remove("is-open");
    tab.parentElement.classList.remove("is-open");
    tab.setAttribute("aria-expanded", "false");
    if (returnFocus) tab.focus();
    setTimeout(function () {
      if (!panel.classList.contains("is-open")) panel.hidden = true;
    }, still ? 0 : 500);
  }

  tab.addEventListener("click", function () {
    if (panel.hidden) open(); else close(true);
  });
  panel.querySelector(".sunday-close").addEventListener("click", function () { close(true); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close(true);
  });
  document.addEventListener("click", function (e) {
    if (!panel.contains(e.target) && e.target !== tab) close(false);
  });
})();

// Home: if the visitor is still on the hero after 5 seconds (once the finger on the first Sunday tab has finished)
// and hasn't scrolled or touched anything, the page lifts a little to show there is more below and drops back,
// on the same spring as the menu. The CSS does the moving; this only sets the classes.
(function () {
  var hero = document.querySelector(".hero-altar");
  if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var root = document.documentElement;
  var busy = false;
  var stop = function () { busy = true; };
  var inputs = ["wheel", "touchstart", "keydown", "pointerdown", "scroll"];
  inputs.forEach(function (type) { window.addEventListener(type, stop, { passive: true }); });
  setTimeout(function () {
    inputs.forEach(function (type) { window.removeEventListener(type, stop); });
    if (busy || window.scrollY > 0 || document.querySelector(".first-sunday.is-open, .masthead.nav-open")) return;
    root.classList.add("hint-down");
    setTimeout(function () {
      root.classList.replace("hint-down", "hint-up");
      setTimeout(function () { root.classList.remove("hint-up"); }, 700);
    }, 1400);
  }, 5000);
})();

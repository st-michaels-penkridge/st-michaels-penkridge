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
    var onScroll = function () {
      mast.classList.toggle("is-scrolled", window.scrollY > 4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Buttons: a light that follows the cursor, and a gentle magnet pull.
  // Only for mouse and trackpad users, and never when motion is turned off.
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine) return;

  document.querySelectorAll(".btn").forEach(function (btn) {
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

// Main menu: dropdown groups, and the Menu button on phones
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
      var open = !g.classList.contains("is-open");
      closeAll(g); setGroup(g, open);
    });
    g.addEventListener("focusout", function (e) {
      if (!g.contains(e.relatedTarget) && window.matchMedia("(min-width: 1001px)").matches) setGroup(g, false);
    });
  });
  if (toggle && mast) {
    toggle.addEventListener("click", function () {
      var open = !mast.classList.contains("nav-open");
      mast.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (open) groups.forEach(function (g) { if (g.classList.contains("is-current")) setGroup(g, true); });
    });
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".nav-group")) {
      if (window.matchMedia("(min-width: 1001px)").matches) closeAll();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var g = document.activeElement && document.activeElement.closest && document.activeElement.closest(".nav-group");
    closeAll();
    if (g) g.querySelector(".nav-group-btn").focus();
    else if (mast && mast.classList.contains("nav-open") && toggle) { mast.classList.remove("nav-open"); toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
  });
})();

// Google's map sets cookies, so it loads only once the visitor agrees: by pressing
// "Show the map", or by allowing it on the privacy page, which this browser remembers.
(function () {
  "use strict";
  var KEY = "smp-cookies";
  var settings = document.querySelector("[data-cookie-settings]");
  if (!document.querySelector(".map-facade") && !settings) return;
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
    bar.innerHTML = '<p>Our map comes from Google, which sets cookies. Are you happy for it to load? <a href="privacy.html#cookies">About cookies</a></p>' +
      '<div class="actions"><button type="button" class="btn-square btn-square-ghost" data-choice="accepted">Allow Google Maps</button>' +
      '<button type="button" class="btn-square btn-square-ghost" data-choice="rejected">No thanks</button></div>';
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
})();

// Life at St Michael's: one pane of frosted glass glides to whichever row is pointed at
// or focused. Without this script the rows still slide and fill their arrows.
(function () {
  "use strict";
  var list = document.querySelector(".life-rows");
  if (!list) return;
  function show(link) {
    list.style.setProperty("--y", link.offsetTop + "px");
    list.style.setProperty("--h", link.offsetHeight + "px");
    if (list.classList.contains("is-on")) return;
    void list.offsetWidth; // place the block before it fades in, so it doesn't glide from the last row
    list.classList.add("is-on");
  }
  function hide() { list.classList.remove("is-on"); }
  list.addEventListener("pointerover", function (e) {
    var link = e.target.closest("a");
    if (link) show(link);
  });
  list.addEventListener("pointerleave", hide);
  list.addEventListener("focusin", function (e) { show(e.target); });
  list.addEventListener("focusout", function (e) { if (!list.contains(e.relatedTarget)) hide(); });

  // A soft patch of light follows the mouse across the glass. Near the arrow,
  // its white circle follows the mouse too, then eases back when the mouse moves away
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  list.addEventListener("pointermove", function (e) {
    var link = e.target.closest("a");
    if (!link) return;
    var arrow = link.lastElementChild, box = link.getBoundingClientRect();
    list.style.setProperty("--gx", (e.clientX - box.left).toFixed(0) + "px");
    list.style.setProperty("--gy", (e.clientY - box.top).toFixed(0) + "px");
    var dx = e.clientX - (box.left + arrow.offsetLeft + arrow.offsetWidth / 2);
    var dy = e.clientY - (box.top + arrow.offsetTop + arrow.offsetHeight / 2);
    arrow.style.translate = Math.hypot(dx, dy) < 110 ? (dx * .35).toFixed(1) + "px " + (dy * .245).toFixed(1) + "px" : "";
  });
  list.addEventListener("pointerout", function (e) {
    var link = e.target.closest("a");
    if (link && !link.contains(e.relatedTarget)) link.lastElementChild.style.translate = "";
  });
})();

// Find a grave: example surnames roll down through the empty search field to prompt
// a search. They stop once someone types, and stay still for people who turn motion off.
(function () {
  "use strict";
  var form = document.querySelector(".grave-search");
  var hint = form && form.querySelector(".grave-hint");
  if (!hint) return;
  var input = form.querySelector("input"), name = hint.querySelector(".grave-name");
  var names = ["Smith", "Wright", "Walker", "Taylor", "Green", "Hall", "Jackson", "Wood", "Turner", "Harris", "Baker", "Clarke",
    "Morris", "Cooper", "Ward", "Hughes", "Robinson", "Lewis", "Wilson", "Edwards", "Thompson", "Hill", "Allen", "Bennett"];
  var i = 0, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  input.placeholder = "";
  hint.hidden = false;
  function typed() { form.classList.toggle("typed", input.value !== ""); }
  typed(); // a name the browser kept from last time
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

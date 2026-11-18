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

// Map loads only when asked, so the page stays light
(function () {
  "use strict";
  document.querySelectorAll(".map-facade").forEach(function (box) {
    var btn = box.querySelector(".map-load");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var frame = document.createElement("iframe");
      frame.title = "Google map showing St Michael's Church, Penkridge";
      frame.src = box.getAttribute("data-src");
      frame.referrerPolicy = "no-referrer-when-downgrade";
      box.replaceWith(frame);
    });
  });
})();

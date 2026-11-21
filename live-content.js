// What's on: Coming up, notices and service details from the members area,
// plus the pictures (newsletters, posters) pinned to the Notices page, and on
// Bygone days the past notices the office chose to keep.
// The office changes them in members/editor.html. If the members area isn't set
// up yet, or can't be reached, the dates written into the page stay as they are.
(function () {
  "use strict";
  var cfg = window.SMP_SUPABASE || {};
  var base = (cfg.url || "").replace(/\/+$/, "") + "/rest/v1/";
  function get(path) {
    return fetch(base + path, { headers: { apikey: cfg.key, Accept: "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  var today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  function showEvents(rows) {
    var list = document.getElementById("coming-list");
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    var old = document.getElementById("coming-empty");
    if (old) old.remove();
    if (!rows.length) {
      var none = el("p", "muted", "Nothing in the diary just now. New dates go up here as soon as they're fixed.");
      none.id = "coming-empty";
      list.parentNode.insertBefore(none, list.nextSibling);
      return;
    }
    rows.forEach(function (e) {
      var p = e.starts_on.split("-");
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      var li = el("li");
      li.setAttribute("data-date", e.starts_on);
      var cal = el("time", "cal");
      cal.setAttribute("datetime", e.starts_on);
      cal.appendChild(el("span", "cal-month", d.toLocaleDateString("en-GB", { month: "short" })));
      cal.appendChild(el("span", "cal-day", String(d.getDate())));
      cal.appendChild(el("span", "cal-dow", d.toLocaleDateString("en-GB", { weekday: "long" })));
      var body = el("div");
      body.appendChild(el("h3", null, e.title));
      var line = (e.start_time ? "At " + e.start_time.slice(0, 5) + ". " : "") + (e.summary || "");
      if (line) body.appendChild(el("p", null, line));
      li.appendChild(cal);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function showNotices(rows) {
    var box = document.getElementById("notices");
    if (!box) return;
    rows = rows.filter(function (n) { return n.published && n.show_from <= today && (!n.show_until || n.show_until >= today); });
    rows.sort(function (a, b) { return b.show_from.localeCompare(a.show_from); });
    rows = rows.slice(0, Number(box.dataset.limit) || 5);
    while (box.firstChild) box.removeChild(box.firstChild);
    rows.forEach(function (n) {
      var item = el("div", "notice");
      item.appendChild(el("h3", null, n.title));
      if (n.body) item.appendChild(el("p", null, n.body));
      box.appendChild(item);
    });
    box.hidden = rows.length === 0;
    var status = document.getElementById("notice-status");
    if (status) status.hidden = true;
    if (!rows.length) showComingUp();
  }

  // Bygone days: notices the office ticked to keep, once their last day has passed
  function showPast(rows) {
    var box = document.getElementById("past-notices");
    if (!box) return;
    rows = rows.filter(function (n) { return n.published && n.keep && n.show_until && n.show_until < today; });
    rows.sort(function (a, b) { return b.show_until.localeCompare(a.show_until); });
    while (box.firstChild) box.removeChild(box.firstChild);
    rows.forEach(function (n) {
      var p = n.show_until.split("-");
      var item = el("div", "notice");
      item.appendChild(el("span", "kicker notice-date", new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })));
      item.appendChild(el("h3", null, n.title));
      if (n.body) item.appendChild(el("p", null, n.body));
      box.appendChild(item);
    });
    document.getElementById("past-events").hidden = !rows.length;
  }

  // Pictures keep the crop chosen in the page editor: shape, position and size
  function showPictures(rows, srcOf) {
    var box = document.getElementById("board-pictures");
    if (!box) return;
    rows = rows.filter(function (p) { return p.published && p.show_from <= today && (!p.show_until || p.show_until >= today); });
    rows.sort(function (a, b) { return b.show_from.localeCompare(a.show_from); });
    rows = rows.slice(0, 3);
    while (box.firstChild) box.removeChild(box.firstChild);
    rows.forEach(function (p) {
      var fig = el("figure", "board-picture");
      fig.setAttribute("data-shape", p.shape);
      var link = el("a", "board-frame");
      link.href = srcOf(p);
      link.target = "_blank";
      link.rel = "noopener";
      var img = el("img");
      img.src = srcOf(p);
      img.alt = p.alt;
      img.loading = "lazy";
      img.decoding = "async";
      img.style.setProperty("--x", p.focus_x + "%");
      img.style.setProperty("--y", p.focus_y + "%");
      img.style.setProperty("--zoom", p.zoom);
      link.appendChild(img);
      link.appendChild(el("span", "visually-hidden", " (opens full size in a new tab)"));
      fig.appendChild(link);
      if (p.caption) fig.appendChild(el("figcaption", null, p.caption));
      box.appendChild(fig);
    });
    box.hidden = !rows.length;
    var body = document.getElementById("board-body");
    if (body) body.classList.toggle("has-pictures", rows.length > 0);
  }

  function showStatus() {
    var status = document.getElementById("notice-status");
    if (status) status.hidden = false;
  }

  // With no notices to show, the notice board shows the next dates
  // from What's on instead, so it never sits empty. events.html is the one place
  // those dates are written, so nothing needs updating twice.
  function showComingUp() {
    var box = document.getElementById("notices");
    if (!box || document.getElementById("coming-list")) return;
    if (!window.fetch || !window.DOMParser) { showStatus(); return; }
    fetch("events.html", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var items = Array.prototype.filter.call(doc.querySelectorAll("#coming-list li[data-date]"), function (li) {
        return li.getAttribute("data-date") >= today;
      }).slice(0, Number(box.dataset.limit) || 3);
      if (!items.length) { showStatus(); return; }
      while (box.firstChild) box.removeChild(box.firstChild);
      items.forEach(function (li) {
        var p = li.getAttribute("data-date").split("-");
        var d = new Date(+p[0], +p[1] - 1, +p[2]);
        var title = li.querySelector("h3");
        var text = li.querySelector("p");
        var item = el("div", "notice");
        item.appendChild(el("span", "kicker notice-date", d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })));
        item.appendChild(el("h3", null, title ? title.textContent.trim() : ""));
        if (text) item.appendChild(el("p", null, text.textContent.trim()));
        box.appendChild(item);
      });
      box.hidden = false;
      var label = document.getElementById("notice-demo");
      if (label) label.hidden = true;
      var status = document.getElementById("notice-status");
      if (status) status.hidden = true;
    }).catch(showStatus);
  }

  function showText(rows) {
    rows.forEach(function (t) {
      if (!t.value) return;
      document.querySelectorAll('[data-text="' + t.key + '"]').forEach(function (node) {
        node.textContent = t.value;
      });
    });
  }

  if (!cfg.url || !cfg.key) {
    // Only local previews read the made-up members data; never show it on a public site.
    if (["localhost", "127.0.0.1", "[::1]"].indexOf(location.hostname) !== -1) {
      function previewNotices() {
        try {
          var data = JSON.parse(localStorage.getItem("smp-members-demo-1") || "null");
          if (data && Array.isArray(data.pictures)) showPictures(data.pictures, function (p) { return p.src; });
          if (!data || !Array.isArray(data.notices)) { showComingUp(); return; }
          ["notice-demo", "past-demo"].forEach(function (id) {
            var label = document.getElementById(id);
            if (label) label.hidden = false;
          });
          showNotices(data.notices);
          showPast(data.notices);
        } catch (e) { showComingUp(); }
      }
      previewNotices();
      window.addEventListener("storage", previewNotices);
      window.addEventListener("pageshow", previewNotices);
    } else {
      showComingUp();
    }
    return;
  }
  if (document.getElementById("coming-list")) get("events?select=starts_on,start_time,title,summary&published=is.true&starts_on=gte." + today + "&order=starts_on.asc&limit=12")
    .then(showEvents).catch(function () { /* keep the dates in the HTML */ });
  if (document.getElementById("notices")) get("notices?select=title,body,published,show_from,show_until&published=is.true&show_from=lte." + today + "&or=(show_until.is.null,show_until.gte." + today + ")&order=show_from.desc&limit=5")
    .then(showNotices).catch(showComingUp);
  if (document.getElementById("past-notices")) get("notices?select=title,body,published,keep,show_until&published=is.true&keep=is.true&show_until=lt." + today + "&order=show_until.desc&limit=30")
    .then(showPast).catch(function () { /* Bygone days keeps its postcards */ });
  if (document.getElementById("board-pictures")) get("board_pictures?select=path,alt,caption,shape,zoom,focus_x,focus_y,show_from,show_until,published&published=is.true&show_from=lte." + today + "&or=(show_until.is.null,show_until.gte." + today + ")&order=show_from.desc&limit=3")
    .then(function (rows) {
      var store = cfg.url.replace(/\/+$/, "") + "/storage/v1/object/public/notice-board/";
      showPictures(rows, function (p) { return store + encodeURIComponent(p.path); });
    }).catch(function () { /* the board shows notices only */ });
  if (document.querySelector("[data-text]")) get("site_text?select=key,value")
    .then(showText).catch(function () {});
})();

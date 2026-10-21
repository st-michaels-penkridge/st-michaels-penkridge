// What's on: Coming up, notices and service details from the members area.
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
    if (status) {
      status.hidden = rows.length > 0;
      status.textContent = "No current notices. See What's on for upcoming services and events.";
    }
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
          if (!data || !Array.isArray(data.notices)) return;
          var label = document.getElementById("notice-demo");
          if (label) label.hidden = false;
          showNotices(data.notices);
        } catch (e) { /* Leave the connection message if browser storage is unavailable. */ }
      }
      previewNotices();
      window.addEventListener("storage", previewNotices);
      window.addEventListener("pageshow", previewNotices);
    }
    return;
  }
  if (document.getElementById("coming-list")) get("events?select=starts_on,start_time,title,summary&published=is.true&starts_on=gte." + today + "&order=starts_on.asc&limit=12")
    .then(showEvents).catch(function () { /* keep the dates in the HTML */ });
  get("notices?select=title,body,published,show_from,show_until&published=is.true&show_from=lte." + today + "&or=(show_until.is.null,show_until.gte." + today + ")&order=show_from.desc&limit=5")
    .then(showNotices).catch(function () {
      var status = document.getElementById("notice-status");
      if (status) status.textContent = "We couldn't load the notice board. Please try again later or contact the parish office.";
    });
  if (document.querySelector("[data-text]")) get("site_text?select=key,value")
    .then(showText).catch(function () {});
})();

// What's on: Coming up, notices and service details from the members area.
// The office changes them in members/editor.html. If the members area isn't set
// up yet, or can't be reached, the dates written into the page stay as they are.
(function () {
  "use strict";
  var cfg = window.SMP_SUPABASE || {};
  if (!cfg.url || !cfg.key) return;

  var base = cfg.url.replace(/\/+$/, "") + "/rest/v1/";
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
  var now = new Date();
  var today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

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
    while (box.firstChild) box.removeChild(box.firstChild);
    rows.forEach(function (n) {
      var item = el("div", "notice");
      item.appendChild(el("h3", null, n.title));
      if (n.body) item.appendChild(el("p", null, n.body));
      box.appendChild(item);
    });
    box.hidden = rows.length === 0;
  }

  function showText(rows) {
    rows.forEach(function (t) {
      if (!t.value) return;
      document.querySelectorAll('[data-text="' + t.key + '"]').forEach(function (node) {
        node.textContent = t.value;
      });
    });
  }

  get("events?select=starts_on,start_time,title,summary&published=is.true&starts_on=gte." + today + "&order=starts_on.asc&limit=12")
    .then(showEvents).catch(function () { /* keep the dates in the HTML */ });
  get("notices?select=title,body&order=show_from.desc&limit=5")
    .then(showNotices).catch(function () {});
  get("site_text?select=key,value")
    .then(showText).catch(function () {});
})();

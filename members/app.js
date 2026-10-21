// Members area pages. Each page's <body data-members="..."> says which one to draw.
(function () {
  "use strict";

  var api = window.SMPMembers;
  var PAGE = document.body.getAttribute("data-members") || "home";
  var root = document.getElementById("members-app");
  var TZ = "Europe/London";
  var state = { access: null, names: {}, rotas: [], signedIn: null };

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------

  // Build elements safely: text always goes in as text, never as HTML
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, v);
      });
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  // add(parent, child, child, ...): strings become text, arrays are flattened, empty values skipped
  function add(el) {
    for (var i = 1; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); continue; }
      el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  function dayLong(iso) { return new Date(iso).toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }); }
  function dayShort(iso) { return new Date(iso).toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }); }
  function time(iso) { return new Date(iso).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }); }
  function calParts(iso) {
    var d = new Date(iso);
    return {
      month: d.toLocaleDateString("en-GB", { timeZone: TZ, month: "short" }),
      day: d.toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric" }),
      dow: d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long" })
    };
  }
  // "2026-11-08" as a date on its own, with no time zone shift
  function plainDate(ymd, opts) {
    var p = String(ymd).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-GB", opts || { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function today() { return ymd(new Date()); }
  function firstName(name) { return String(name || "").split(" ")[0] || "there"; }
  function nameOf(id) { return state.names[id] || "Someone"; }
  function cal(iso) {
    var c = calParts(iso);
    return h("span", { class: "cal", "aria-hidden": "true" },
      h("span", { class: "cal-month", text: c.month }), h("span", { class: "cal-day", text: c.day }), h("span", { class: "cal-dow", text: c.dow }));
  }

  // One place for messages, read out by screen readers
  var flash = h("div", { class: "m-flash", role: "status", "aria-live": "polite" });
  function say(msg, kind) {
    clear(flash);
    if (!msg) return;
    flash.className = "m-flash is-" + (kind || "ok");
    add(flash, h("p", { text: msg }));
    if (kind === "error") flash.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // Run an action from a button: stop double clicks, show errors in plain words
  function act(btn, fn, okMsg) {
    return async function (e) {
      if (e) e.preventDefault();
      if (btn.disabled) return;
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      try {
        await fn();
        if (okMsg) say(okMsg, "ok");
      } catch (err) {
        say(err.message || String(err), "error");
      } finally {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
    };
  }

  // A button that asks "are you sure?" in place before it does anything
  function confirmButton(label, confirmLabel, fn, cls) {
    var b = h("button", { type: "button", class: cls || "m-btn m-btn-quiet" , text: label });
    var armed = false, timer = null;
    b.addEventListener("click", async function () {
      if (!armed) {
        armed = true;
        b.textContent = confirmLabel;
        b.classList.add("is-armed");
        timer = setTimeout(function () { armed = false; b.textContent = label; b.classList.remove("is-armed"); }, 5000);
        return;
      }
      clearTimeout(timer);
      armed = false;
      b.classList.remove("is-armed");
      b.textContent = label;
      await act(b, fn)();
    });
    return b;
  }

  function field(label, input, help) {
    var id = input.id || ("f" + Math.random().toString(36).slice(2, 9));
    input.id = id;
    var helpEl = null;
    if (help) {
      helpEl = h("span", { class: "m-help", id: id + "-help", text: help });
      input.setAttribute("aria-describedby", id + "-help");
    }
    return h("div", { class: "m-field" }, h("label", { for: id, text: label }), helpEl, input);
  }
  function input(attrs) { return h("input", Object.assign({ type: "text" }, attrs)); }
  function button(label, cls, attrs) { return h("button", Object.assign({ type: "submit", class: cls || "m-btn" , text: label }, attrs || {})); }
  function section(title, kicker) {
    var s = h("section", { class: "m-section" });
    if (kicker) add(s, h("span", { class: "kicker", text: kicker }));
    add(s, h("h2", { text: title }));
    return s;
  }
  function empty(text) { return h("p", { class: "m-empty", text: text }); }

  function download(name, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = h("a", { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------------------------------------------------------------------
  // The frame round every page
  // ---------------------------------------------------------------------
  var main = h("div", { class: "m-main" });

  function demoBar() {
    if (api.mode !== "demo") return null;
    var role = api.demoRole();
    var pick = h("select", { id: "demo-role", onchange: function () { api.setDemoRole(pick.value); state.signedIn = null; say(""); route(); } },
      [["member", "Daniel, a member"], ["lead", "Ruth, the AV rota lead"], ["admin", "Alex, an admin"]].map(function (o) {
        return h("option", { value: o[0], selected: o[0] === role }, o[1]);
      }));
    return h("div", { class: "m-demo", role: "note" },
      h("p", null, h("strong", { text: "Demo with made-up names. " }), "Nothing here is real, and changes stay in this browser."),
      h("div", { class: "m-demo-controls" },
        h("label", { for: "demo-role", text: "See it as" }), pick,
        h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Start the demo again",
          onclick: function () { api.resetDemo(); state.signedIn = null; say("The demo has been reset.", "ok"); route(); } })));
  }

  function subnav() {
    var a = state.access;
    var items = [["index.html", "Home", "home"], ["rota.html", "Rotas", "rota"]];
    if (a.admin_account) items.push(["editor.html", "Page editor", "editor"], ["people.html", "People", "people"]);
    items.push(["account.html", "My details", "account"]);
    var nav = h("nav", { class: "m-nav", "aria-label": "Members area" },
      items.map(function (it) { return h("a", { href: it[0], "aria-current": it[2] === PAGE ? "page" : null, text: it[1] }); }));
    var out = h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Sign out" });
    out.addEventListener("click", act(out, async function () {
      await api.signOut();
      state.signedIn = null;
      say("You're signed out.", "ok");
      route();
    }));
    return h("div", { class: "m-bar" }, nav, h("p", { class: "m-who" }, h("span", { text: a.full_name || "Signed in" }), out));
  }

  function frame(withNav) {
    clear(root);
    add(root, [demoBar(), withNav ? subnav() : null, flash, clear(main)]);
  }

  // ---------------------------------------------------------------------
  // Signing in
  // ---------------------------------------------------------------------
  function linkError() {
    var hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    var search = new URLSearchParams(location.search);
    var desc = hash.get("error_description") || search.get("error_description");
    if (!desc) return null;
    history.replaceState(null, "", location.pathname + location.search.replace(/[?&]error[^&]*/g, ""));
    return /expired|invalid/i.test(desc) ? "That sign-in link has run out or was already used. Ask for a new one below." : desc;
  }

  function signInPage() {
    frame(false);
    var err = linkError();
    if (err) say(err, "error");

    var box = h("div", { class: "m-card" });
    function askEmail() {
      clear(box);
      var email = input({ type: "email", name: "email", autocomplete: "email", required: true, inputmode: "email" });
      var go = button(api.mode === "demo" ? "Sign in to the demo" : "Email me a link");
      var form = h("form", { class: "m-form", novalidate: true },
        h("h2", { text: "Sign in" }),
        h("p", { text: "Put in the email address the church has for you and we'll send you a link. There's no password to remember." }),
        api.mode === "demo" ? h("p", { class: "m-help", text: "Demo: any email works. Choose who to be in the bar above." }) : null,
        field("Email address", email), go);
      form.addEventListener("submit", act(go, async function () {
        var v = email.value.trim();
        if (api.mode === "demo") {
          await api.demoSignIn();
          state.signedIn = null;
          return route();
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new Error("Please put in a full email address, like name@example.com.");
        await api.sendLink(v);
        askCode(v);
      }));
      add(box, form);
      if (!err) setTimeout(function () { email.focus(); }, 0);
    }
    function askCode(address) {
      clear(box);
      say("");
      var code = input({ name: "code", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", pattern: "[0-9]{6}", required: true, class: "m-code" });
      var go = button("Sign in");
      var form = h("form", { class: "m-form" },
        h("h2", { text: "Check your email" }),
        h("p", null, "If ", h("strong", { text: address }), " is on our list, a sign-in link is on its way. It works once, for the next hour. Check your junk folder if it hasn't come in a minute or two."),
        h("p", { text: "Or type the 6-digit code from the email:" }),
        field("Code from the email", code), go,
        h("p", { class: "m-help" }, h("button", { type: "button", class: "m-link", text: "Use a different email address", onclick: askEmail })));
      form.addEventListener("submit", act(go, async function () {
        var v = code.value.replace(/\D/g, "");
        if (v.length !== 6) throw new Error("The code is 6 numbers long.");
        await api.verifyCode(address, v);
        state.signedIn = null;
        route();
      }));
      add(box, form);
      code.focus();
    }
    askEmail();

    var join = h("div", { class: "m-card m-card-stone" });
    function joinForm() {
      clear(join);
      var name = input({ name: "name", autocomplete: "name", required: true, maxlength: "80" });
      var email = input({ type: "email", name: "email", autocomplete: "email", required: true });
      var note = h("textarea", { name: "message", rows: "3", maxlength: "300" });
      var go = button("Ask to join", "m-btn m-btn-quiet");
      var form = h("form", { class: "m-form" },
        h("h2", { text: "New to the rotas?" }),
        h("p", { text: "Ask to join and the parish office will send you an invite." }),
        field("Your name", name), field("Email address", email),
        field("Anything we should know (optional)", note, "For example which team you help with."),
        go,
        h("p", { class: "m-help" }, "We keep only your name and email address. ", h("a", { href: "privacy.html", text: "How we look after them" }), "."));
      form.addEventListener("submit", act(go, async function () {
        if (!name.value.trim()) throw new Error("Please give your name.");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) throw new Error("Please put in a full email address.");
        await api.requestAccess(name.value.trim(), email.value.trim(), note.value.trim());
        clear(join);
        add(join, h("h2", { text: "Thank you" }), h("p", { text: "We've passed your request to the parish office. They'll be in touch by email." }));
      }));
      add(join, form);
    }
    joinForm();
    add(main, h("div", { class: "m-grid" }, box, join));
  }

  function waitingPage() {
    frame(false);
    var out = h("button", { type: "button", class: "m-btn m-btn-quiet", text: "Sign out" });
    out.addEventListener("click", act(out, async function () { await api.signOut(); state.signedIn = null; route(); }));
    add(main, h("div", { class: "m-card" },
      h("h2", { text: "Nearly there" }),
      h("p", { text: "You're signed in, but the parish office hasn't approved your account yet. Once they have, the rotas will appear here." }),
      out));
  }

  // Admins type their two-step code before the admin tools open
  function twoStepGate(where, after) {
    var card = h("div", { class: "m-card m-gate" });
    api.mfaFactors().then(function (factors) {
      if (!factors.length) {
        add(card, h("h2", { text: "Turn on two-step sign-in" }),
          h("p", { text: "You're an admin, so you need two-step sign-in before the admin tools open. It takes a minute with a free authenticator app on your phone." }),
          h("a", { class: "m-btn", href: "account.html#two-step", text: "Set it up" }));
        return;
      }
      var code = input({ inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", class: "m-code" });
      var go = button("Unlock admin tools");
      var form = h("form", { class: "m-form m-inline-form" }, field("Code from your authenticator app", code), go);
      form.addEventListener("submit", act(go, async function () {
        await api.mfaVerify(factors[0].id, code.value.replace(/\D/g, ""));
        state.access = await api.access();
        say("Admin tools unlocked.", "ok");
        if (after) after(); else route();
      }));
      add(card, h("h2", { text: where === "banner" ? "Unlock the admin tools" : "Admin tools are locked" }),
        h("p", { text: api.mode === "demo" ? "Type the 6-digit code from your authenticator app. In the demo, any 6 numbers work." : "Type the 6-digit code from your authenticator app." }),
        form);
    }).catch(function (e) { say(e.message, "error"); });
    return card;
  }

  // ---------------------------------------------------------------------
  // Routing
  // ---------------------------------------------------------------------
  async function loadBasics() {
    var res = await Promise.all([api.access(), api.people(), api.rotas()]);
    state.access = res[0];
    state.names = {};
    res[1].forEach(function (p) { state.names[p.id] = p.full_name || "Unnamed member"; });
    state.people = res[1];
    state.rotas = res[2];
  }

  var routing = false;
  async function route() {
    if (routing) return;
    routing = true;
    try {
      var session = await api.session();
      state.signedIn = Boolean(session);
      state.myId = session ? session.id : null;
      if (PAGE === "privacy") return;
      if (!session) return signInPage();
      state.access = await api.access();
      if (!state.access.approved) return waitingPage();
      await loadBasics();
      frame(true);
      var needsAdmin = PAGE === "editor" || PAGE === "people";
      if (needsAdmin && !state.access.admin_account) {
        add(main, h("div", { class: "m-card" }, h("h2", { text: "For admins" }), h("p", { text: "This page is for the parish office and other admins." }),
          h("a", { class: "m-btn", href: "index.html", text: "Back to members home" })));
        return;
      }
      if (needsAdmin && !state.access.admin) { add(main, twoStepGate("page")); return; }
      await (PAGES[PAGE] || PAGES.home)();
    } catch (e) {
      frame(false);
      say(e.message || "Something went wrong.", "error");
    } finally {
      routing = false;
    }
  }

  // ---------------------------------------------------------------------
  // Home
  // ---------------------------------------------------------------------
  async function homePage() {
    var a = state.access;
    add(main, h("div", { class: "m-hello" }, h("h2", { text: "Hello, " + firstName(a.full_name) })));
    if (a.admin_account && !a.admin) add(main, twoStepGate("banner"));

    var res = await Promise.all([api.myDates(), api.openSwaps(), api.myAway()]);
    var dates = res[0], swaps = res[1], away = res[2];

    // Your next dates
    var s1 = section("Your next dates");
    if (!dates.length) add(s1, empty("You're not down for anything yet. Your rota lead will put you on."));
    else add(s1, h("ul", { class: "m-dates" }, dates.map(dateItem)));
    add(main, s1);

    // Swaps the person could take
    if (swaps.length) {
      var s2 = section("Dates you could cover");
      add(s2, h("p", { class: "muted", text: "Someone on your team is looking for cover. If you take it, the date moves to you straight away." }));
      add(s2, h("ul", { class: "m-dates" }, swaps.map(function (w) {
        var take = confirmButton("I'll do it", "Yes, I'll do it", async function () {
          await api.takeSwap(w.id);
          say("Thank you. " + dayLong(w.starts_at) + " is now yours.", "ok");
          route();
        }, "m-btn m-btn-sm");
        return h("li", { class: "m-date" }, cal(w.starts_at),
          h("div", null,
            h("h3", { text: w.rota + ", " + w.job }),
            h("p", { text: w.service + " at " + time(w.starts_at) + ". Asked by " + nameOf(w.requested_by) + "." }),
            w.note ? h("p", { class: "m-note", text: "“" + w.note + "”" }) : null),
          h("div", { class: "m-actions" }, take));
      })));
      add(main, s2);
    }

    // Away dates
    var s3 = section("Dates you're away");
    add(s3, h("p", { class: "muted", text: "Rota leads see these when they plan, so you're not put down when you can't come." }));
    if (away.length) {
      add(s3, h("ul", { class: "m-away" }, away.map(function (x) {
        var label = x.starts_on === x.ends_on ? plainDate(x.starts_on) : plainDate(x.starts_on) + " to " + plainDate(x.ends_on);
        var rm = h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Remove", "aria-label": "Remove " + label });
        rm.addEventListener("click", act(rm, async function () { await api.removeAway(x.id); route(); }));
        return h("li", null, h("span", { text: label }), rm);
      })));
    }
    var from = input({ type: "date", min: today(), required: true });
    var to = input({ type: "date", min: today(), required: true });
    from.addEventListener("change", function () { to.min = from.value || today(); if (!to.value || to.value < from.value) to.value = from.value; });
    var addAway = button("Add", "m-btn m-btn-sm");
    var awayForm = h("form", { class: "m-form m-inline-form" }, field("From", from), field("To", to), addAway);
    awayForm.addEventListener("submit", act(addAway, async function () {
      if (!from.value || !to.value) throw new Error("Choose the first and last day you're away.");
      if (to.value < from.value) throw new Error("The last day can't be before the first.");
      await api.addAway(from.value, to.value);
      say("Added. Your rota lead will see it.", "ok");
      route();
    }));
    add(s3, awayForm);
    add(main, s3);

    // Rotas
    var s4 = section("Rotas");
    if (!state.rotas.length) add(s4, empty("There are no rotas yet."));
    add(s4, h("ul", { class: "m-rotas" }, state.rotas.map(function (r) {
      var mine = a.rotas.indexOf(r.id) !== -1, lead = a.leads.indexOf(r.id) !== -1;
      return h("li", null, h("a", { href: "rota.html?rota=" + encodeURIComponent(r.slug) },
        h("strong", { text: r.name }),
        h("span", { text: r.description || "" }),
        h("span", { class: "m-tag", text: lead ? "You lead this rota" : mine ? "You're on this team" : "See who's on" })));
    })));
    add(main, s4);
  }

  function dateItem(d) {
    var actions = h("div", { class: "m-actions" });
    function draw() {
      clear(actions);
      if (d.swap_id) {
        var cancel = h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Cancel the swap" });
        cancel.addEventListener("click", act(cancel, async function () { await api.cancelSwap(d.swap_id); d.swap_id = null; draw(); say("Swap request cancelled. You're still down for this date.", "ok"); }));
        add(actions, h("span", { class: "m-tag m-tag-red", text: "Swap asked" }), cancel);
      } else {
        var ask = h("button", { type: "button", class: "m-btn m-btn-sm", text: "Ask for a swap" });
        ask.addEventListener("click", function () {
          clear(actions);
          var note = input({ maxlength: "200", placeholder: "For example: away that weekend" });
          var send = button("Ask the team", "m-btn m-btn-sm");
          var back = h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Not now", onclick: draw });
          var form = h("form", { class: "m-form m-swap-form" }, field("A note for the team (optional)", note), h("div", { class: "m-row" }, send, back));
          form.addEventListener("submit", act(send, async function () {
            d.swap_id = await api.requestSwap(d.id, note.value.trim());
            draw();
            say("Your team can now see that you need cover. You're still down until someone takes it.", "ok");
          }));
          add(actions, form);
          note.focus();
        });
        add(actions, ask);
      }
    }
    draw();
    return h("li", { class: "m-date" }, cal(d.starts_at),
      h("div", null, h("h3", { text: d.rota + ", " + d.job }),
        h("p", null, d.service + " at " + time(d.starts_at) + ". ", h("a", { href: "rota.html?rota=" + encodeURIComponent(d.slug), text: "See the rota" }))),
      actions);
  }

  // ---------------------------------------------------------------------
  // Rota
  // ---------------------------------------------------------------------
  async function rotaPage() {
    var slug = new URLSearchParams(location.search).get("rota");
    if (!slug) {
      if (state.rotas.length === 1) slug = state.rotas[0].slug;
      else {
        var s = section("Rotas");
        if (!state.rotas.length) add(s, empty("There are no rotas yet."));
        add(s, h("ul", { class: "m-rotas" }, state.rotas.map(function (r) {
          return h("li", null, h("a", { href: "rota.html?rota=" + encodeURIComponent(r.slug) }, h("strong", { text: r.name }), h("span", { text: r.description || "" })));
        })));
        add(main, s);
        return;
      }
    }
    var data = await api.rota(slug);
    if (!data) { add(main, h("div", { class: "m-card" }, h("h2", { text: "Rota not found" }), h("a", { href: "rota.html", text: "See all rotas" }))); return; }
    drawRota(data);
  }

  function drawRota(data) {
    var a = state.access;
    var me = state.myId;
    var rota = data.rota;
    var isLead = a.admin || a.leads.indexOf(rota.id) !== -1;
    var onTeam = data.team.some(function (t) { return t.profile_id === me; });
    var teamIds = data.team.map(function (t) { return t.profile_id; });
    var swapByAsg = {};
    data.swaps.forEach(function (w) { swapByAsg[w.assignment_id] = w; });
    function awayOn(pid, iso) {
      var day = new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
      return data.away.some(function (x) { return x.profile_id === pid && x.starts_on <= day && x.ends_on >= day; });
    }
    async function reload() { drawRota(await api.rota(rota.slug)); }

    clear(main);
    var head = h("div", { class: "m-rota-head" },
      h("div", null, h("span", { class: "kicker", text: "Rota" }), h("h2", { text: rota.name }), rota.description ? h("p", { class: "muted", text: rota.description }) : null),
      h("div", { class: "m-row m-no-print" },
        h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Print", onclick: function () { window.print(); } }),
        state.rotas.length > 1 ? h("a", { class: "m-btn m-btn-quiet m-btn-sm", href: "rota.html", text: "All rotas" }) : null));
    add(main, head);

    if (!data.positions.length) add(main, empty("This rota has no jobs yet." + (isLead ? " Add one below." : "")));
    if (!data.services.length) add(main, empty("No dates yet." + (isLead ? " Add some below." : "")));

    if (data.positions.length && data.services.length) {
      add(main, h("p", { class: "m-help m-no-print", text: "Your dates are in red. “Needs cover” means that person has asked for a swap." }));
      var table = h("table", { class: "m-rota" },
        h("thead", null, h("tr", null, h("th", { scope: "col", text: "Date" }), data.positions.map(function (p) { return h("th", { scope: "col", text: p.name }); }))),
        h("tbody", null, data.services.map(function (sv) { return serviceRow(sv); })));
      add(main, h("div", { class: "m-table-wrap" }, table));
    }

    function serviceRow(sv) {
      var th = h("th", { scope: "row" },
        h("span", { class: "m-when", text: dayShort(sv.starts_at) }),
        h("span", { class: "m-what", text: time(sv.starts_at) + " " + sv.title }),
        sv.notes ? h("span", { class: "m-what", text: sv.notes }) : null);
      if (isLead) {
        var edit = h("button", { type: "button", class: "m-link m-no-print", text: "Edit" });
        edit.addEventListener("click", function () {
          var title = input({ value: sv.title, maxlength: "80" });
          var notes = input({ value: sv.notes || "", maxlength: "300" });
          var save = button("Save", "m-btn m-btn-sm");
          var form = h("form", { class: "m-form m-mini-form" }, field("Service", title), field("Note", notes), h("div", { class: "m-row" }, save,
            a.admin ? confirmButton("Remove date", "Yes, remove it", async function () { await api.deleteService(sv.id); say("Date removed.", "ok"); reload(); }, "m-btn m-btn-quiet m-btn-sm") : null));
          form.addEventListener("submit", act(save, async function () { await api.saveService(sv.id, { title: title.value.trim() || sv.title, notes: notes.value.trim() }); reload(); }, "Saved."));
          edit.replaceWith(form);
          title.focus();
        });
        add(th, edit);
      }
      return h("tr", null, th, data.positions.map(function (p) { return cell(sv, p); }));
    }

    function cell(sv, p) {
      var here = data.assignments.filter(function (x) { return x.service_id === sv.id && x.position_id === p.id; });
      var td = h("td", { "data-label": p.name });
      var list = h("ul", { class: "m-chips" });
      here.forEach(function (x) {
        var mine = x.profile_id === me;
        var swap = swapByAsg[x.id];
        var chip = h("li", { class: "m-chip" + (mine ? " is-mine" : "") + (swap ? " is-swap" : "") },
          h("span", { text: nameOf(x.profile_id) }));
        if (swap) {
          add(chip, h("span", { class: "m-tag m-tag-red", text: "Needs cover" }));
          if (onTeam && !mine) {
            add(chip, confirmButton("I'll do it", "Yes, I'll do it", async function () {
              await api.takeSwap(swap.id);
              say("Thank you. This date is now yours.", "ok");
              reload();
            }, "m-btn m-btn-sm m-no-print"));
          }
        }
        if (isLead && !awayOn(x.profile_id, sv.starts_at)) { /* fine */ }
        if (isLead && awayOn(x.profile_id, sv.starts_at)) add(chip, h("span", { class: "m-tag", text: "Away" }));
        if (isLead) {
          var rm = h("button", { type: "button", class: "m-x m-no-print", "aria-label": "Take " + nameOf(x.profile_id) + " off " + dayShort(sv.starts_at), text: "×" });
          rm.addEventListener("click", act(rm, async function () { await api.unassign(x.id); reload(); }));
          add(chip, rm);
        }
        add(list, chip);
      });
      if (here.length) add(td, list);
      else if (!isLead) add(td, h("span", { class: "m-nobody", text: "Nobody yet" }));

      if (isLead) {
        var taken = here.map(function (x) { return x.profile_id; });
        var choices = teamIds.filter(function (id) { return taken.indexOf(id) === -1; })
          .map(function (id) { return { id: id, name: nameOf(id), away: awayOn(id, sv.starts_at) }; })
          .sort(function (x, y) { return (x.away - y.away) || x.name.localeCompare(y.name); });
        if (choices.length && here.length < 10) {
          var sel = h("select", { class: "m-add m-no-print", "aria-label": "Put someone on " + p.name + ", " + dayShort(sv.starts_at) },
            h("option", { value: "", text: here.length >= p.needed ? "Add another…" : "Add someone…" }),
            choices.map(function (c) { return h("option", { value: c.id, text: c.name + (c.away ? " (away)" : "") }); }));
          sel.addEventListener("change", async function () {
            if (!sel.value) return;
            sel.disabled = true;
            try { await api.assign(sv.id, p.id, sel.value); reload(); }
            catch (e) { say(e.message, "error"); sel.disabled = false; sel.value = ""; }
          });
          add(td, sel);
        }
        if (!here.length && !choices.length) add(td, h("span", { class: "m-nobody", text: "Add people to the team first" }));
      }
      return td;
    }

    if (isLead) add(main, leadTools(data, reload));
    else add(main, h("p", { class: "m-help", text: "Can't make a date? Ask for a swap from the members home page." }));
  }

  function leadTools(data, reload) {
    var a = state.access;
    var rota = data.rota;
    var wrap = h("div", { class: "m-tools m-no-print" });

    // Add dates
    var s1 = section("Add dates", "For the rota lead");
    var weeks = h("select", null, [4, 6, 8, 12].map(function (n) { return h("option", { value: n, selected: n === 8, text: n }); }));
    var at = input({ type: "time", value: "10:30", required: true });
    var title = input({ value: "Holy Communion", maxlength: "80" });
    var skip = input({ type: "checkbox", checked: true });
    var go = button("Add the dates", "m-btn m-btn-sm");
    var last = data.services.length ? data.services[data.services.length - 1].starts_at : null;
    var fromDay = last ? new Date(new Date(last).getTime() + 86400000) : new Date();
    var f1 = h("form", { class: "m-form" },
      h("div", { class: "m-row m-wrap" }, field("Sundays", weeks), field("At", at), field("Service", title)),
      h("label", { class: "m-check" }, skip, " Leave out the third Sunday of the month"),
      h("p", { class: "m-help", text: last ? "Starts after the last date on the rota, " + dayLong(last) + "." : "Starts this coming Sunday." }),
      go);
    f1.addEventListener("submit", act(go, async function () {
      var n = await api.addSundays(ymd(fromDay), +weeks.value, at.value, title.value.trim() || "Holy Communion", skip.checked);
      say(n === 1 ? "Added 1 date." : "Added " + n + " dates.", "ok");
      reload();
    }));
    var oneDay = input({ type: "date", min: today(), required: true });
    var oneAt = input({ type: "time", value: "10:30", required: true });
    var oneTitle = input({ value: "Holy Communion", maxlength: "80", required: true });
    var go2 = button("Add this date", "m-btn m-btn-quiet m-btn-sm");
    var f2 = h("form", { class: "m-form" }, h("h3", { text: "Or a single date" }),
      h("div", { class: "m-row m-wrap" }, field("Date", oneDay), field("At", oneAt), field("Service", oneTitle)), go2);
    f2.addEventListener("submit", act(go2, async function () {
      if (!oneDay.value) throw new Error("Choose the date.");
      await api.addService(oneDay.value, oneAt.value, oneTitle.value.trim());
      say("Date added.", "ok");
      reload();
    }));
    add(s1, f1, f2);
    add(wrap, s1);

    // Team
    var s2 = section("The team");
    api.contacts().then(function (cs) {
      var byId = {};
      cs.forEach(function (c) { byId[c.profile_id] = c; });
      var rows = data.team.slice().sort(function (x, y) { return nameOf(x.profile_id).localeCompare(nameOf(y.profile_id)); });
      if (!rows.length) add(s2, empty("Nobody on this team yet."));
      add(s2, h("ul", { class: "m-people" }, rows.map(function (t) {
        var c = byId[t.profile_id] || {};
        var actions = h("div", { class: "m-row" });
        if (a.admin) {
          var lead = h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: t.is_lead ? "Stop leading" : "Make lead" });
          lead.addEventListener("click", act(lead, async function () { await api.setTeamMember(rota.id, t.profile_id, true, !t.is_lead); reload(); }));
          add(actions, lead);
        }
        if (!t.is_lead || a.admin) {
          add(actions, confirmButton("Take off the team", "Yes, take them off", async function () {
            await api.setTeamMember(rota.id, t.profile_id, false, false);
            say(nameOf(t.profile_id) + " is off the team, and off its future dates.", "ok");
            reload();
          }, "m-btn m-btn-quiet m-btn-sm"));
        }
        return h("li", null,
          h("div", null, h("strong", { text: nameOf(t.profile_id) }), t.is_lead ? h("span", { class: "m-tag", text: "Lead" }) : null,
            h("span", { class: "m-contact" }, c.email ? h("a", { href: "mailto:" + c.email, text: c.email }) : null, c.phone ? h("a", { href: "tel:" + c.phone.replace(/\s/g, ""), text: c.phone }) : null)),
          actions);
      })));
      var others = state.people.filter(function (p) { return p.approved && data.team.every(function (t) { return t.profile_id !== p.id; }); });
      if (others.length) {
        var who = h("select", { required: true }, h("option", { value: "", text: "Choose someone…" }), others.map(function (p) { return h("option", { value: p.id, text: p.full_name }); }));
        var addBtn = button("Add to the team", "m-btn m-btn-sm");
        var f = h("form", { class: "m-form m-inline-form" }, field("Add a member to the team", who), addBtn);
        f.addEventListener("submit", act(addBtn, async function () {
          if (!who.value) throw new Error("Choose who to add.");
          await api.setTeamMember(rota.id, who.value, true, false);
          say(nameOf(who.value) + " is on the team.", "ok");
          reload();
        }));
        add(s2, f);
      }
      add(s2, h("p", { class: "m-help", text: "Someone not listed? Ask the parish office to invite them to the members area." }));
    }).catch(function (e) { say(e.message, "error"); });
    add(wrap, s2);

    // Jobs
    var s3 = section("Jobs on this rota");
    add(s3, h("p", { class: "muted", text: "Each job is a column on the rota. “People needed” is how many you want each time." }));
    data.positions.forEach(function (p) {
      var nm = input({ value: p.name, maxlength: "60", required: true });
      var need = input({ type: "number", min: "1", max: "10", value: p.needed });
      var save = button("Save", "m-btn m-btn-quiet m-btn-sm");
      var f = h("form", { class: "m-form m-inline-form" }, field("Job", nm), field("People needed", need), save,
        confirmButton("Remove", "Yes, remove the job and its names", async function () { await api.deletePosition(p.id); reload(); }, "m-btn m-btn-quiet m-btn-sm"));
      f.addEventListener("submit", act(save, async function () { await api.savePosition(p.id, { name: nm.value.trim(), needed: Math.max(1, Math.min(10, +need.value || 1)) }); reload(); }, "Saved."));
      add(s3, f);
    });
    var newName = input({ maxlength: "60", required: true, placeholder: "For example: Sound desk" });
    var newNeed = input({ type: "number", min: "1", max: "10", value: "1" });
    var addJob = button("Add the job", "m-btn m-btn-sm");
    var fj = h("form", { class: "m-form m-inline-form" }, field("New job", newName), field("People needed", newNeed), addJob);
    fj.addEventListener("submit", act(addJob, async function () {
      if (!newName.value.trim()) throw new Error("Give the job a name.");
      await api.addPosition(rota.id, newName.value.trim(), Math.max(1, Math.min(10, +newNeed.value || 1)), data.positions.length + 1);
      reload();
    }, "Job added."));
    add(s3, fj);
    add(wrap, s3);

    // Name and description
    var s4 = section("About this rota");
    var rn = input({ value: rota.name, maxlength: "60", required: true });
    var rd = h("textarea", { rows: "2", maxlength: "300" });
    rd.value = rota.description || "";
    var saveR = button("Save", "m-btn m-btn-quiet m-btn-sm");
    var fr = h("form", { class: "m-form" }, field("Name", rn), field("What the team does", rd), saveR);
    fr.addEventListener("submit", act(saveR, async function () { await api.saveRota(rota.id, { name: rn.value.trim(), description: rd.value.trim() }); state.rotas = await api.rotas(); reload(); }, "Saved."));
    add(s4, fr);
    add(wrap, s4);
    return wrap;
  }

  // ---------------------------------------------------------------------
  // Page editor
  // ---------------------------------------------------------------------
  async function editorPage() {
    add(main, h("p", { class: "lede", text: "Changes show on the What's on page as soon as you save." }),
      h("p", null, h("a", { href: "../events.html", target: "_blank", rel: "noopener", text: "Open the What's on page" })));
    var res = await Promise.all([api.events(), api.notices(), api.siteText()]);
    add(main, eventsEditor(res[0]), noticesEditor(res[1]), textEditor(res[2]));
  }

  function counter(el, max) {
    var c = h("span", { class: "m-count", "aria-live": "off" });
    function upd() { c.textContent = el.value.length + " of " + max; }
    el.addEventListener("input", upd);
    upd();
    return c;
  }

  function eventForm(evt, onDone) {
    var d = evt || { starts_on: "", start_time: "", title: "", summary: "", published: true };
    var date = input({ type: "date", value: d.starts_on || "", required: true });
    var t = input({ type: "time", value: (d.start_time || "").slice(0, 5) });
    var title = input({ value: d.title, maxlength: "80", required: true });
    var summary = h("textarea", { rows: "3", maxlength: "300" });
    summary.value = d.summary || "";
    var pub = input({ type: "checkbox", checked: d.published !== false });
    var save = button(evt ? "Save changes" : "Add to Coming up", "m-btn m-btn-sm");
    var f = h("form", { class: "m-form m-edit" },
      h("div", { class: "m-row m-wrap" }, field("Date", date), field("Time (optional)", t)),
      field("Title", title), field("A line or two about it", summary), counter(summary, 300),
      h("label", { class: "m-check" }, pub, " Show it on the website"),
      h("div", { class: "m-row" }, save, evt ? h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Cancel", onclick: function () { onDone(false); } }) : null));
    f.addEventListener("submit", act(save, async function () {
      if (!date.value || !title.value.trim()) throw new Error("Give the event a date and a title.");
      await api.saveEvent({ id: evt && evt.id, starts_on: date.value, start_time: t.value || null, title: title.value.trim(), summary: summary.value.trim(), published: pub.checked });
      say(evt ? "Saved." : "Added to Coming up.", "ok");
      onDone(true);
    }));
    return f;
  }

  function eventsEditor(list) {
    var s = section("Coming up", "What's on page");
    var body = h("div");
    async function redraw() { drawList(await api.events()); }
    function drawList(items) {
      clear(body);
      var t = today();
      var upcoming = items.filter(function (e) { return e.starts_on >= t; });
      var past = items.filter(function (e) { return e.starts_on < t; }).reverse();
      if (!upcoming.length) add(body, empty("Nothing coming up. Add the next event below."));
      add(body, h("ul", { class: "m-items" }, upcoming.map(item)));
      if (past.length) add(body, h("details", { class: "m-past" }, h("summary", { text: "Past events (" + past.length + ")" }), h("ul", { class: "m-items" }, past.map(item))));
      var addBox = h("details", { class: "m-add-box", open: !upcoming.length },
        h("summary", { text: "Add an event" }), eventForm(null, function () { redraw(); }));
      add(body, addBox);
    }
    function item(e) {
      var li = h("li", { class: "m-item" + (e.published ? "" : " is-draft") });
      function view() {
        clear(li);
        add(li, h("div", { class: "m-item-date" }, h("strong", { text: plainDate(e.starts_on, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) }),
          e.start_time ? h("span", { text: e.start_time.slice(0, 5) }) : null),
          h("div", { class: "m-item-body" }, h("h3", { text: e.title }), e.summary ? h("p", { text: e.summary }) : null,
            e.published ? null : h("span", { class: "m-tag", text: "Hidden from the website" })),
          h("div", { class: "m-row" },
            h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Edit", onclick: edit }),
            confirmButton("Remove", "Yes, remove it", async function () { await api.deleteEvent(e.id); say("Removed.", "ok"); redraw(); }, "m-btn m-btn-quiet m-btn-sm")));
      }
      function edit() { clear(li); add(li, eventForm(e, function (changed) { if (changed) redraw(); else view(); })); }
      view();
      return li;
    }
    drawList(list);
    add(s, body);
    return s;
  }

  function noticeForm(n, onDone) {
    var d = n || { title: "", body: "", show_from: today(), show_until: "", published: true };
    var title = input({ value: d.title, maxlength: "80", required: true });
    var body = h("textarea", { rows: "3", maxlength: "600" });
    body.value = d.body || "";
    var from = input({ type: "date", value: d.show_from || today(), required: true });
    var until = input({ type: "date", value: d.show_until || "" });
    var pub = input({ type: "checkbox", checked: d.published !== false });
    var save = button(n ? "Save changes" : "Add the notice", "m-btn m-btn-sm");
    var f = h("form", { class: "m-form m-edit" },
      field("Title", title), field("The notice", body), counter(body, 600),
      h("div", { class: "m-row m-wrap" }, field("Show from", from), field("Until (optional)", until, "Leave empty to show it until you remove it.")),
      h("label", { class: "m-check" }, pub, " Show it on the website"),
      h("div", { class: "m-row" }, save, n ? h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Cancel", onclick: function () { onDone(false); } }) : null));
    f.addEventListener("submit", act(save, async function () {
      if (!title.value.trim()) throw new Error("Give the notice a title.");
      if (until.value && until.value < from.value) throw new Error("The last day can't be before the first.");
      await api.saveNotice({ id: n && n.id, title: title.value.trim(), body: body.value.trim(), show_from: from.value, show_until: until.value || null, published: pub.checked });
      say(n ? "Saved." : "Notice added.", "ok");
      onDone(true);
    }));
    return f;
  }

  function noticesEditor(list) {
    var s = section("Notices", "What's on page");
    add(s, h("p", { class: "muted", text: "Short notices show at the top of What's on between the dates you choose, like a closed car park or a change of time." }));
    var body = h("div");
    async function redraw() { drawList(await api.notices()); }
    function drawList(items) {
      clear(body);
      var t = today();
      if (!items.length) add(body, empty("No notices."));
      add(body, h("ul", { class: "m-items" }, items.map(function (n) {
        var li = h("li", { class: "m-item" });
        var live = n.published && n.show_from <= t && (!n.show_until || n.show_until >= t);
        function view() {
          clear(li);
          add(li, h("div", { class: "m-item-date" },
            h("strong", { text: plainDate(n.show_from, { day: "numeric", month: "short" }) + (n.show_until ? " to " + plainDate(n.show_until, { day: "numeric", month: "short" }) : " onwards") })),
            h("div", { class: "m-item-body" }, h("h3", { text: n.title }), n.body ? h("p", { text: n.body }) : null,
              h("span", { class: "m-tag" + (live ? " m-tag-red" : ""), text: live ? "On the website now" : n.published ? "Not showing on these dates" : "Hidden from the website" })),
            h("div", { class: "m-row" },
              h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Edit", onclick: function () { clear(li); add(li, noticeForm(n, function (c) { if (c) redraw(); else view(); })); } }),
              confirmButton("Remove", "Yes, remove it", async function () { await api.deleteNotice(n.id); say("Removed.", "ok"); redraw(); }, "m-btn m-btn-quiet m-btn-sm")));
        }
        view();
        return li;
      })));
      add(body, h("details", { class: "m-add-box" }, h("summary", { text: "Add a notice" }), noticeForm(null, function () { redraw(); })));
    }
    drawList(list);
    add(s, body);
    return s;
  }

  function textEditor(list) {
    var s = section("Times and details", "What's on page");
    add(s, h("p", { class: "muted", text: "Single lines on the What's on page. Leave one empty and the page points people to the parish Facebook page instead." }));
    list.forEach(function (t) {
      var v = h("textarea", { rows: "2", maxlength: "400" });
      v.value = t.value || "";
      var save = button("Save", "m-btn m-btn-quiet m-btn-sm");
      var f = h("form", { class: "m-form m-edit" }, field(t.label, v, t.help), save);
      f.addEventListener("submit", act(save, async function () { await api.saveSiteText(t.key, v.value.trim()); }, "Saved."));
      add(s, f);
    });
    return s;
  }

  // ---------------------------------------------------------------------
  // People (admins)
  // ---------------------------------------------------------------------
  async function peoplePage() {
    var res = await Promise.all([api.accessRequests(), api.contacts(), api.activity()]);
    var requests = res[0], contacts = res[1], activity = res[2];
    var byId = {};
    contacts.forEach(function (c) { byId[c.profile_id] = c; });
    var teamsOf = {};
    for (var i = 0; i < state.rotas.length; i++) {
      var r = await api.rota(state.rotas[i].slug);
      r.team.forEach(function (t) { (teamsOf[t.profile_id] = teamsOf[t.profile_id] || []).push(r.rota.name + (t.is_lead ? " (lead)" : "")); });
    }

    // Invite form first, so "Invite" on a request can fill it in
    var inviteSection = section("Invite someone");
    var nm = input({ maxlength: "80", required: true, autocomplete: "off" });
    var em = input({ type: "email", required: true, autocomplete: "off" });
    var reqId = null;
    var boxes = state.rotas.map(function (r) { return { id: r.id, el: input({ type: "checkbox" }), name: r.name }; });
    var send = button("Send the invite");
    var inviteForm = h("form", { class: "m-form" },
      h("div", { class: "m-row m-wrap" }, field("Name", nm), field("Email address", em)),
      boxes.length ? h("fieldset", { class: "m-fieldset" }, h("legend", { text: "Put them on these teams (optional)" }),
        boxes.map(function (b) { return h("label", { class: "m-check" }, b.el, " " + b.name); })) : null,
      send,
      h("p", { class: "m-help", text: "They get an email with a link to sign in. Only invite people the church already knows." }));
    inviteForm.addEventListener("submit", act(send, async function () {
      var r = await api.invite({ email: em.value.trim(), full_name: nm.value.trim(), request_id: reqId,
        rota_ids: boxes.filter(function (b) { return b.el.checked; }).map(function (b) { return b.id; }) });
      say(r.already_had_account ? nm.value.trim() + " already had an account. They're approved and can sign in from the members page." : "Invite sent to " + em.value.trim() + ".", "ok");
      route();
    }));
    add(inviteSection, inviteForm);

    if (requests.length) {
      var s0 = section("Asking to join");
      add(s0, h("ul", { class: "m-items" }, requests.map(function (q) {
        return h("li", { class: "m-item" },
          h("div", { class: "m-item-date" }, h("strong", { text: "Asked" }),
            h("span", { text: new Date(q.created_at).toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric", month: "short" }) })),
          h("div", { class: "m-item-body" }, h("h3", { text: q.full_name }), h("p", { text: q.email }), q.message ? h("p", { class: "m-note", text: "“" + q.message + "”" }) : null),
          h("div", { class: "m-row" },
            h("button", { type: "button", class: "m-btn m-btn-sm", text: "Invite", onclick: function () {
              nm.value = q.full_name; em.value = q.email; reqId = q.id;
              inviteSection.scrollIntoView({ behavior: "smooth", block: "start" });
              nm.focus();
            } }),
            confirmButton("Decline", "Yes, decline", async function () { await api.declineRequest(q.id); say("Request declined and deleted.", "ok"); route(); }, "m-btn m-btn-quiet m-btn-sm")));
      })));
      add(main, s0);
    }
    add(main, inviteSection);

    // Members
    var s2 = section("Members");
    var people = state.people.slice().sort(function (x, y) { return x.full_name.localeCompare(y.full_name); });
    add(s2, h("div", { class: "m-table-wrap" }, h("table", { class: "m-table" },
      h("thead", null, h("tr", null, ["Name", "Email", "Phone", "Teams", ""].map(function (x) { return h("th", { scope: "col", text: x }); }))),
      h("tbody", null, people.map(function (p) {
        var c = byId[p.id] || {};
        var self = p.id === state.myId;
        var acts = h("div", { class: "m-row" });
        add(acts, confirmButton(p.is_admin ? "Remove admin" : "Make admin", p.is_admin ? "Yes, remove admin" : "Yes, make admin", async function () {
          await api.setAdmin(p.id, !p.is_admin);
          say(p.is_admin ? p.full_name + " is no longer an admin." : p.full_name + " is now an admin. They'll need to set up two-step sign-in.", "ok");
          route();
        }, "m-btn m-btn-quiet m-btn-sm"));
        if (!self) {
          add(acts, confirmButton("Remove", "Yes, delete their account", async function () {
            await api.removeMember(p.id);
            say(p.full_name + " has been removed, with their dates and details.", "ok");
            route();
          }, "m-btn m-btn-quiet m-btn-sm"));
        }
        return h("tr", null,
          h("td", { "data-label": "Name" }, h("strong", { text: p.full_name || "No name yet" }), p.is_admin ? h("span", { class: "m-tag", text: "Admin" }) : null, p.approved ? null : h("span", { class: "m-tag", text: "Not approved" })),
          h("td", { "data-label": "Email" }, c.email ? h("a", { href: "mailto:" + c.email, text: c.email }) : ""),
          h("td", { "data-label": "Phone", text: c.phone || "" }),
          h("td", { "data-label": "Teams", text: (teamsOf[p.id] || []).join(", ") || "None" }),
          h("td", { "data-label": "" }, acts));
      })))));
    add(s2, h("p", { class: "m-help", text: "Removing someone deletes their account, contact details, team places, dates and away dates. Do it when they leave." }));
    add(main, s2);

    // Rotas
    var s3 = section("Rotas");
    add(s3, h("ul", { class: "m-rotas" }, state.rotas.map(function (r) {
      return h("li", null, h("a", { href: "rota.html?rota=" + encodeURIComponent(r.slug) }, h("strong", { text: r.name }), h("span", { text: r.description || "" })));
    })));
    var rn = input({ maxlength: "60", required: true, placeholder: "For example: Readers" });
    var rd = input({ maxlength: "300" });
    var addR = button("Add the rota", "m-btn m-btn-sm");
    var fr = h("form", { class: "m-form" }, h("div", { class: "m-row m-wrap" }, field("Rota name", rn), field("What the team does", rd)), addR,
      h("p", { class: "m-help", text: "A new rota starts with one job, “On duty”, which its lead can rename. Choose a lead on the rota's page." }));
    fr.addEventListener("submit", act(addR, async function () {
      if (!rn.value.trim()) throw new Error("Give the rota a name.");
      var made = await api.addRota(rn.value.trim(), rd.value.trim());
      location.href = "rota.html?rota=" + encodeURIComponent(made.slug);
    }));
    add(s3, fr);
    add(main, s3);

    // Recent changes
    var s4 = section("Recent changes");
    if (!activity.length) add(s4, empty("Nothing changed yet."));
    else add(s4, h("div", { class: "m-table-wrap" }, h("table", { class: "m-table m-log" },
      h("thead", null, h("tr", null, ["When", "Who", "What"].map(function (x) { return h("th", { scope: "col", text: x }); }))),
      h("tbody", null, activity.map(function (x) {
        return h("tr", null,
          h("td", { "data-label": "When", text: new Date(x.at).toLocaleString("en-GB", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) }),
          h("td", { "data-label": "Who", text: x.actor ? nameOf(x.actor) : "The system" }),
          h("td", { "data-label": "What", text: describe(x) }));
      })))));
    add(main, s4);
  }

  function describe(x) {
    var who = x.table_name === "profiles" ? (state.names[x.row_id] || "someone who has since left") : "";
    var words = {
      "events:insert": "added an event to Coming up", "events:update": "changed an event", "events:delete": "removed an event",
      "notices:insert": "added a notice", "notices:update": "changed a notice", "notices:delete": "removed a notice",
      "site_text:update": "changed the page text (" + String(x.row_id || "").replace(/_/g, " ") + ")",
      "services:insert": "added a date", "services:update": "changed a date", "services:delete": "removed a date",
      "assignments:insert": "put someone on a rota", "assignments:update": "swapped a date", "assignments:delete": "took someone off a rota",
      "rota_members:insert": "added someone to a team", "rota_members:update": "changed a team", "rota_members:delete": "took someone off a team",
      "profiles:invited": "invited " + who, "profiles:approved": "approved " + who, "profiles:removed": "removed a member",
      "profiles:made admin": "made " + who + " an admin", "profiles:admin removed": "stopped " + who + " being an admin"
    };
    return words[x.table_name + ":" + x.action] || x.action + " " + x.table_name.replace(/_/g, " ");
  }

  // ---------------------------------------------------------------------
  // My details
  // ---------------------------------------------------------------------
  async function accountPage() {
    var me = await api.myDetails();

    var s1 = section("Your details");
    var nm = input({ value: me.full_name, maxlength: "80", required: true, autocomplete: "name" });
    var ph = input({ type: "tel", value: me.phone || "", maxlength: "20", autocomplete: "tel" });
    var save = button("Save", "m-btn m-btn-sm");
    var f = h("form", { class: "m-form" },
      field("Name", nm, "This is how your name shows on the rotas."),
      h("div", { class: "m-field" }, h("span", { class: "m-label", text: "Email address" }), h("p", { class: "m-static", text: me.email }),
        h("span", { class: "m-help", text: "To change it, ask the parish office." })),
      field("Phone (optional)", ph, "Only your rota leads and the parish office can see it."),
      save);
    f.addEventListener("submit", act(save, async function () {
      if (!nm.value.trim()) throw new Error("Please give your name.");
      await api.saveMyDetails({ full_name: nm.value.trim(), phone: ph.value.trim() });
      state.access = await api.access();
    }, "Saved."));
    add(s1, f);
    add(main, s1);

    // Two-step sign-in
    var s2 = section("Two-step sign-in");
    s2.id = "two-step";
    var box = h("div");
    add(s2, box);
    add(main, s2);
    async function drawTwoStep() {
      clear(box);
      var factors = await api.mfaFactors();
      var a = state.access;
      if (factors.length) {
        add(box, h("p", null, h("span", { class: "m-tag m-tag-red", text: "On" }), " When you sign in, you'll be asked for the code from your authenticator app before the admin tools open."));
        if (a.admin_account && !a.admin) add(box, twoStepGate("banner", function () { route(); }));
        return;
      }
      add(box, h("p", { text: a.admin_account
        ? "You're an admin, so you need this. As well as the email link, you'll type a code from an app on your phone, so nobody can get into the admin tools with just your email."
        : "Optional for members. As well as the email link, you'll type a code from an app on your phone." }),
        h("p", { class: "muted", text: "Use any free authenticator app, such as Google Authenticator or Microsoft Authenticator." }));
      var start = h("button", { type: "button", class: "m-btn m-btn-sm", text: "Set it up" });
      start.addEventListener("click", act(start, async function () {
        var e = await api.mfaEnroll();
        clear(box);
        var code = input({ inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", class: "m-code", required: true });
        var turnOn = button("Turn it on", "m-btn m-btn-sm");
        var form = h("form", { class: "m-form" },
          h("ol", { class: "m-steps" },
            h("li", { text: "Open your authenticator app and choose to add an account." }),
            h("li", null, "Scan this code, or type the key in by hand.",
              e.qr ? h("img", { class: "m-qr", src: e.qr, alt: "QR code for your authenticator app", width: "180", height: "180" }) : h("p", { class: "m-help", text: "In the demo there's no QR code. Type any 6 numbers below." }),
              h("p", { class: "m-key" }, h("span", { class: "m-label", text: "Key: " }), h("code", { text: e.secret.replace(/(.{4})/g, "$1 ").trim() }))),
            h("li", null, "Type the 6-digit code the app shows.", field("Code", code))),
          turnOn);
        form.addEventListener("submit", act(turnOn, async function () {
          await api.mfaVerify(e.factorId, code.value.replace(/\D/g, ""));
          state.access = await api.access();
          say("Two-step sign-in is on.", "ok");
          frame(true);
          await accountPage();
        }));
        add(box, form);
        code.focus();
      }));
      add(box, start);
    }
    await drawTwoStep();

    // Your data
    var s3 = section("Your data");
    add(s3, h("p", { text: "We keep your name, your email address, your phone number if you've added one, which teams you're on, your rota dates and your away dates. Nothing else." }));
    var dl = h("button", { type: "button", class: "m-btn m-btn-quiet m-btn-sm", text: "Download my data" });
    dl.addEventListener("click", act(dl, async function () { download("my-st-michaels-data.json", await api.myData()); }));
    var confirmText = input({ autocomplete: "off", placeholder: "delete" });
    var del = button("Delete my account", "m-btn m-btn-quiet m-btn-sm m-danger");
    var fd = h("form", { class: "m-form m-inline-form" },
      field("To delete your account and everything above, type “delete”", confirmText), del);
    fd.addEventListener("submit", act(del, async function () {
      if (confirmText.value.trim().toLowerCase() !== "delete") throw new Error("Type the word delete to confirm.");
      await api.deleteMe();
      state.signedIn = null;
      say("Your account and everything we held about you has been deleted.", "ok");
      route();
    }));
    add(s3, h("div", { class: "m-row" }, dl), fd,
      h("p", { class: "m-help" }, h("a", { href: "privacy.html", text: "Read how we look after your details" }), "."));
    add(main, s3);
  }

  var PAGES = { home: homePage, rota: rotaPage, editor: editorPage, people: peoplePage, account: accountPage };

  // ---------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------
  api.ready.then(function () {
    api.onAuthChange(async function (event) {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      var now = await api.session();
      if (Boolean(now) !== state.signedIn) route();
    });
    return route();
  }).catch(function (e) {
    clear(root);
    add(root, h("div", { class: "m-flash is-error" }, h("p", { text: e.message || "The members area couldn't start. Please refresh the page." })));
  });
})();

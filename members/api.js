// Members area: everything that reads or changes data goes through here.
//
// With members/config.js filled in, this talks to Supabase. Without it, a demo
// with made-up names runs entirely in this browser, so the members area can be
// shown to the PCC before any real data goes in.
(function () {
  "use strict";

  var cfg = window.SMP_SUPABASE || {};
  var LIVE = Boolean(cfg.url && cfg.key);
  var LIB = "vendor/supabase-2.117.2.js";

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  // Turn database errors into something a person can act on. Messages the
  // app itself raises on purpose (e.g. "Please give your name") are safe to
  // show as-is; anything that looks like a raw database/driver error is
  // replaced so column, table and constraint names never reach the screen.
  var RAW_DB_ERROR = /constraint|relation|column|duplicate key|syntax error|violates|null value|is not present in table|out of range|too long for type/i;
  function friendly(err) {
    var msg = (err && (err.message || err.error_description || err.msg)) || "Something went wrong. Please try again.";
    if (/row-level security|permission denied|not allowed|42501/i.test(msg)) msg = "You don't have permission to do that.";
    else if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) msg = "Couldn't reach the members area. Check your connection and try again.";
    else if (/JWT expired|invalid JWT|refresh token/i.test(msg)) msg = "Your sign-in has run out. Please sign in again.";
    else if (RAW_DB_ERROR.test(msg)) {
      console.error("Members area error:", err);
      msg = "Something went wrong. Please try again.";
    }
    var e = new Error(msg);
    e.original = err;
    return e;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Couldn't load the sign-in library.")); };
      document.head.appendChild(s);
    });
  }

  function slugify(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "rota";
  }

  // ---------------------------------------------------------------------
  // Live: Supabase
  // ---------------------------------------------------------------------
  function liveApi() {
    var sb = null;
    var ready = loadScript(LIB).then(function () {
      sb = window.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" }
      });
    });
    function check(r) {
      if (r.error) throw friendly(r.error);
      return r.data;
    }
    async function uid() {
      var r = await sb.auth.getSession();
      return r.data.session ? r.data.session.user.id : null;
    }
    async function invoke(name, body) {
      var r = await sb.functions.invoke(name, { body: body || {} });
      if (r.error) {
        var msg = r.error.message;
        try {
          var j = await r.error.context.json();
          if (j && j.error) msg = j.error;
        } catch (e) { /* keep the general message */ }
        throw new Error(msg);
      }
      return r.data;
    }

    return {
      mode: "live",
      ready: ready,

      // Sign-in -----------------------------------------------------------
      session: async function () {
        var r = await sb.auth.getSession();
        var s = r.data.session;
        return s ? { id: s.user.id, email: s.user.email } : null;
      },
      onAuthChange: function (cb) {
        sb.auth.onAuthStateChange(function (event) { setTimeout(function () { cb(event); }, 0); });
      },
      sendLink: async function (email) {
        var r = await sb.auth.signInWithOtp({
          email: email,
          options: { shouldCreateUser: false, emailRedirectTo: new URL("./", location.href).href }
        });
        if (!r.error) return;
        // Unknown addresses get the same answer, so this page never reveals who is a member
        if (r.error.status === 429 || /rate limit|security purposes/i.test(r.error.message)) {
          throw new Error("A link was sent a moment ago. Please wait a minute before asking for another.");
        }
        if (/signups? not allowed|not found|otp_disabled/i.test(r.error.message) || r.error.status === 422) return;
        throw friendly(r.error);
      },
      verifyCode: async function (email, code) {
        var r = await sb.auth.verifyOtp({ email: email, token: code, type: "email" });
        if (r.error) throw new Error("That code didn't work. Check it, or ask for a new link.");
      },
      signOut: async function () { await sb.auth.signOut(); },
      access: async function () { return check(await sb.rpc("my_access")); },

      // Two-step sign-in ----------------------------------------------------
      mfaFactors: async function () {
        var d = check(await sb.auth.mfa.listFactors());
        return (d.totp || []).filter(function (f) { return f.status === "verified"; });
      },
      mfaEnroll: async function () {
        var list = check(await sb.auth.mfa.listFactors());
        var stale = (list.all || []).filter(function (f) { return f.status !== "verified"; });
        for (var i = 0; i < stale.length; i++) await sb.auth.mfa.unenroll({ factorId: stale[i].id });
        var d = check(await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app " + Date.now() }));
        return { factorId: d.id, qr: d.totp.qr_code, secret: d.totp.secret };
      },
      mfaVerify: async function (factorId, code) {
        var r = await sb.auth.mfa.challengeAndVerify({ factorId: factorId, code: code });
        if (r.error) throw new Error("That code didn't work. Codes change every 30 seconds, so try the newest one.");
      },

      // Joining ---------------------------------------------------------------
      requestAccess: async function (name, email, message) {
        check(await sb.rpc("request_access", { p_name: name, p_email: email, p_message: message || "" }));
      },

      // People ----------------------------------------------------------------
      people: async function () {
        return check(await sb.from("profiles").select("id, full_name, is_admin, approved").order("full_name"));
      },
      contacts: async function () {
        return check(await sb.from("contact_details").select("profile_id, email, phone"));
      },
      myDetails: async function () {
        var id = await uid();
        var p = check(await sb.from("profiles").select("full_name").eq("id", id).single());
        var c = check(await sb.from("contact_details").select("email, phone").eq("profile_id", id).single());
        return { id: id, full_name: p.full_name, email: c.email, phone: c.phone || "" };
      },
      saveMyDetails: async function (d) {
        var id = await uid();
        check(await sb.from("profiles").update({ full_name: d.full_name }).eq("id", id));
        check(await sb.from("contact_details").update({ phone: d.phone || null }).eq("profile_id", id));
      },
      setAdmin: async function (id, value) { check(await sb.rpc("set_admin", { p_profile: id, p_admin: value })); },
      accessRequests: async function () {
        return check(await sb.from("access_requests").select("id, full_name, email, message, created_at").order("created_at"));
      },
      declineRequest: async function (id) { check(await sb.from("access_requests").delete().eq("id", id)); },
      invite: async function (d) { return invoke("invite-member", d); },
      removeMember: async function (id) { return invoke("remove-member", { profile_id: id }); },
      activity: async function () {
        return check(await sb.from("activity_log").select("at, actor, table_name, action, row_id").order("at", { ascending: false }).limit(40));
      },
      myData: async function () { return check(await sb.rpc("my_data")); },
      deleteMe: async function () {
        await invoke("delete-me", {});
        // the account is gone, so just forget the sign-in in this browser
        await sb.auth.signOut({ scope: "local" });
      },

      // Rotas -------------------------------------------------------------------
      rotas: async function () {
        return check(await sb.from("rotas").select("id, slug, name, description").order("sort").order("name"));
      },
      addRota: async function (name, description) {
        var existing = check(await sb.from("rotas").select("slug"));
        var base = slugify(name), slug = base, n = 2;
        var taken = existing.map(function (r) { return r.slug; });
        while (taken.indexOf(slug) !== -1) slug = base + "-" + n++;
        var r = check(await sb.from("rotas").insert({ slug: slug, name: name, description: description || "", sort: existing.length + 1 }).select("id, slug").single());
        check(await sb.from("rota_positions").insert({ rota_id: r.id, name: "On duty", needed: 1, sort: 1 }));
        return r;
      },
      saveRota: async function (id, d) { check(await sb.from("rotas").update({ name: d.name, description: d.description }).eq("id", id)); },
      rota: async function (slug) {
        var rota = check(await sb.from("rotas").select("id, slug, name, description").eq("slug", slug).maybeSingle());
        if (!rota) return null;
        var since = startOfToday();
        var res = await Promise.all([
          sb.from("rota_positions").select("id, name, needed, sort").eq("rota_id", rota.id).order("sort"),
          sb.from("rota_members").select("profile_id, is_lead").eq("rota_id", rota.id),
          sb.from("services").select("id, starts_at, title, notes").gte("starts_at", since).order("starts_at").limit(40),
          sb.from("away_dates").select("profile_id, starts_on, ends_on").gte("ends_on", todayISO())
        ]);
        var positions = check(res[0]), team = check(res[1]), services = check(res[2]), away = check(res[3]);
        var assignments = [], swaps = [];
        if (positions.length && services.length) {
          assignments = check(await sb.from("assignments").select("id, service_id, position_id, profile_id")
            .in("position_id", positions.map(function (p) { return p.id; }))
            .in("service_id", services.map(function (s) { return s.id; })));
        }
        if (assignments.length) {
          swaps = check(await sb.from("swap_requests").select("id, assignment_id, requested_by, note")
            .eq("status", "open").in("assignment_id", assignments.map(function (a) { return a.id; })));
        }
        return { rota: rota, positions: positions, team: team, services: services, assignments: assignments, swaps: swaps, away: away };
      },
      setTeamMember: async function (rotaId, profileId, member, lead) {
        check(await sb.rpc("set_rota_member", { p_rota: rotaId, p_profile: profileId, p_member: member, p_lead: Boolean(lead) }));
      },
      addPosition: async function (rotaId, name, needed, sort) {
        check(await sb.from("rota_positions").insert({ rota_id: rotaId, name: name, needed: needed || 1, sort: sort || 0 }));
      },
      savePosition: async function (id, d) { check(await sb.from("rota_positions").update({ name: d.name, needed: d.needed }).eq("id", id)); },
      deletePosition: async function (id) { check(await sb.from("rota_positions").delete().eq("id", id)); },
      addSundays: async function (from, weeks, time, title, skipThird) {
        return check(await sb.rpc("add_sundays", { p_from: from, p_weeks: weeks, p_time: time, p_title: title, p_skip_third: skipThird }));
      },
      addService: async function (date, time, title) {
        check(await sb.from("services").insert({ starts_at: date + " " + time + ":00 Europe/London", title: title }));
      },
      saveService: async function (id, d) { check(await sb.from("services").update({ title: d.title, notes: d.notes }).eq("id", id)); },
      deleteService: async function (id) { check(await sb.from("services").delete().eq("id", id)); },
      assign: async function (serviceId, positionId, profileId) {
        check(await sb.from("assignments").insert({ service_id: serviceId, position_id: positionId, profile_id: profileId }));
      },
      unassign: async function (id) { check(await sb.from("assignments").delete().eq("id", id)); },

      // Your dates and swaps ------------------------------------------------------
      myDates: async function () {
        var id = await uid();
        var rows = check(await sb.from("assignments")
          .select("id, service_id, services!inner(starts_at, title), rota_positions!inner(name, rotas!inner(name, slug))")
          .eq("profile_id", id).gte("services.starts_at", new Date().toISOString()));
        var open = check(await sb.from("swap_requests").select("id, assignment_id").eq("requested_by", id).eq("status", "open"));
        return rows.map(function (r) {
          var swap = open.filter(function (s) { return s.assignment_id === r.id; })[0];
          return { id: r.id, starts_at: r.services.starts_at, service: r.services.title, job: r.rota_positions.name,
                   rota: r.rota_positions.rotas.name, slug: r.rota_positions.rotas.slug, swap_id: swap ? swap.id : null };
        }).sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; });
      },
      openSwaps: async function () {
        var id = await uid();
        var mine = check(await sb.from("rota_members").select("rota_id").eq("profile_id", id)).map(function (m) { return m.rota_id; });
        var rows = check(await sb.from("swap_requests")
          .select("id, note, requested_by, assignments!inner(services!inner(starts_at, title), rota_positions!inner(name, rota_id, rotas!inner(name, slug)))")
          .eq("status", "open").neq("requested_by", id));
        var now = new Date().toISOString();
        return rows.filter(function (r) {
          return r.assignments.services.starts_at > now && mine.indexOf(r.assignments.rota_positions.rota_id) !== -1;
        }).map(function (r) {
          return { id: r.id, note: r.note, requested_by: r.requested_by, starts_at: r.assignments.services.starts_at,
                   service: r.assignments.services.title, job: r.assignments.rota_positions.name,
                   rota: r.assignments.rota_positions.rotas.name, slug: r.assignments.rota_positions.rotas.slug };
        }).sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; });
      },
      requestSwap: async function (assignmentId, note) { return check(await sb.rpc("request_swap", { p_assignment: assignmentId, p_note: note || "" })); },
      cancelSwap: async function (id) { check(await sb.rpc("cancel_swap", { p_swap: id })); },
      takeSwap: async function (id) { check(await sb.rpc("take_swap", { p_swap: id })); },

      // Away dates ----------------------------------------------------------------
      myAway: async function () {
        var id = await uid();
        return check(await sb.from("away_dates").select("id, starts_on, ends_on").eq("profile_id", id).gte("ends_on", todayISO()).order("starts_on"));
      },
      addAway: async function (from, to) { check(await sb.from("away_dates").insert({ starts_on: from, ends_on: to })); },
      removeAway: async function (id) { check(await sb.from("away_dates").delete().eq("id", id)); },

      // Page content ----------------------------------------------------------------
      events: async function () { return check(await sb.from("events").select("id, starts_on, start_time, title, summary, published").order("starts_on")); },
      saveEvent: async function (d) {
        var row = { starts_on: d.starts_on, start_time: d.start_time || null, title: d.title, summary: d.summary, published: d.published };
        if (d.id) check(await sb.from("events").update(row).eq("id", d.id));
        else check(await sb.from("events").insert(row));
      },
      deleteEvent: async function (id) { check(await sb.from("events").delete().eq("id", id)); },
      notices: async function () { return check(await sb.from("notices").select("id, title, body, show_from, show_until, published").order("show_from", { ascending: false })); },
      saveNotice: async function (d) {
        var row = { title: d.title, body: d.body, show_from: d.show_from, show_until: d.show_until || null, published: d.published };
        if (d.id) check(await sb.from("notices").update(row).eq("id", d.id));
        else check(await sb.from("notices").insert(row));
      },
      deleteNotice: async function (id) { check(await sb.from("notices").delete().eq("id", id)); },
      siteText: async function () { return check(await sb.from("site_text").select("key, label, help, value").order("sort")); },
      saveSiteText: async function (key, value) { check(await sb.from("site_text").update({ value: value }).eq("key", key)); }
    };
  }

  // ---------------------------------------------------------------------
  // Demo: made-up names, kept in this browser only
  // ---------------------------------------------------------------------
  function demoApi() {
    var KEY = "smp-members-demo-1";
    var memory = null;
    var listeners = [];
    var n = 0;
    function id() { n += 1; return "d" + Date.now().toString(36) + n; }

    function sundays(count) {
      var out = [], d = new Date();
      d.setHours(10, 30, 0, 0);
      d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
      if (d < new Date()) d.setDate(d.getDate() + 7);
      while (out.length < count) {
        if (!(d.getDate() >= 15 && d.getDate() <= 21)) out.push(new Date(d));
        d.setDate(d.getDate() + 7);
      }
      return out;
    }
    function addDays(n) {
      var d = new Date();
      d.setDate(d.getDate() + n);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function fresh() {
      var names = ["Alex Morgan", "Ruth Ashby", "Daniel Okafor", "Margaret Hill", "Sam Patel", "Joy Bennett", "Peter Lowe", "Helen Ward"];
      var people = names.map(function (name, i) {
        return { id: "p" + (i + 1), full_name: name, is_admin: i === 0, approved: true,
                 email: name.toLowerCase().replace(" ", ".") + "@example.org", phone: i === 2 ? "07700 900123" : "" };
      });
      var services = sundays(8).map(function (d, i) { return { id: "s" + (i + 1), starts_at: d.toISOString(), title: "Holy Communion", notes: "" }; });
      var team = people.slice(1).map(function (p, i) { return { rota_id: "r1", profile_id: p.id, is_lead: i === 0 }; });
      var assignments = services.map(function (s, i) {
        return { id: "a" + (i + 1), service_id: s.id, position_id: "pos1", profile_id: team[i % team.length].profile_id };
      });
      return {
        role: "member",
        signedIn: false,
        aal2: false,
        mfaEnrolled: { p1: true },
        people: people,
        rotas: [{ id: "r1", slug: "av", name: "AV team", description: "Running the words on the screens (PowerPoint) for the 10:30 service.", sort: 1 }],
        positions: [{ id: "pos1", rota_id: "r1", name: "Screens", needed: 1, sort: 1 }],
        team: team,
        services: services,
        assignments: assignments,
        swaps: [{ id: "w1", assignment_id: "a4", requested_by: assignments[3].profile_id, note: "Visiting family that weekend", status: "open" }],
        away: [{ id: "aw1", profile_id: "p4", starts_on: addDays(20), ends_on: addDays(34) }],
        requests: [{ id: "q1", full_name: "Chris Adeyemi", email: "chris.adeyemi@example.org",
                     message: "I help with coffee after the service and would like to see the rota.", created_at: new Date().toISOString() }],
        events: [
          { id: "e1", starts_on: "2026-11-08", start_time: null, title: "Remembrance Sunday", summary: "We remember those who have died in war, with two minutes' silence.", published: true },
          { id: "e2", starts_on: "2026-11-29", start_time: null, title: "Advent Sunday", summary: "The start of the church year, and the four weeks of getting ready for Christmas.", published: true },
          { id: "e3", starts_on: "2026-12-24", start_time: null, title: "Christmas Eve", summary: "Services on Christmas Eve. Times go up nearer the day.", published: true },
          { id: "e4", starts_on: "2026-12-25", start_time: null, title: "Christmas Day", summary: "Celebrate Christmas morning at St Michael's. Times go up nearer the day.", published: true }
        ],
        notices: [{ id: "n1", title: "Car park resurfacing", body: "The church car park is closed on Saturday while it is resurfaced. Please park on St Michael's Square.", show_from: todayISO(), show_until: addDays(6), published: true }],
        siteText: [
          { key: "messy_church_when", label: "Messy Church: when it meets", help: "For example \"Second Saturday of the month, 3:30 to 5:30\". Leave empty to point people to Facebook.", value: "" },
          { key: "coffee_morning_when", label: "Coffee mornings: when they are", help: "For example \"Every Wednesday, 10 to 12\". Leave empty to point people to Facebook.", value: "" },
          { key: "third_sunday", label: "Third Sunday of the month", help: "What happens on the third Sunday. Leave empty to point people to Facebook.", value: "" }
        ],
        activity: []
      };
    }

    function load() {
      if (memory) return memory;
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) memory = JSON.parse(raw);
      } catch (e) { /* private window: keep it in memory */ }
      if (!memory) memory = fresh();
      return memory;
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* memory only */ }
    }
    function db() { return load(); }
    function wait() { return new Promise(function (r) { setTimeout(r, 120); }); }
    function deny() { throw new Error("You don't have permission to do that."); }
    function meId() { return { member: "p3", lead: "p2", admin: "p1" }[db().role] || "p3"; }
    function me() { var m = meId(); return db().people.filter(function (p) { return p.id === m; })[0]; }
    function isAdmin() { return Boolean(me() && me().is_admin && db().aal2); }
    function leads(rotaId) {
      return isAdmin() || db().team.some(function (t) { return t.rota_id === rotaId && t.profile_id === meId() && t.is_lead; });
    }
    function leadsAny() { return isAdmin() || db().team.some(function (t) { return t.profile_id === meId() && t.is_lead; }); }
    function inRota(rotaId) { return db().team.some(function (t) { return t.rota_id === rotaId && t.profile_id === meId(); }); }
    function rotaOfPosition(pid) { var p = db().positions.filter(function (x) { return x.id === pid; })[0]; return p && p.rota_id; }
    function log(table, action, row) { db().activity.unshift({ at: new Date().toISOString(), actor: meId(), table_name: table, action: action, row_id: row }); }
    function changed() { save(); listeners.forEach(function (cb) { cb("CHANGED"); }); }
    function signedIn() { if (!db().signedIn) throw new Error("Please sign in."); }
    function copy(x) { return JSON.parse(JSON.stringify(x)); }

    return {
      mode: "demo",
      ready: Promise.resolve(),

      // Demo controls
      demoRole: function () { return db().role; },
      setDemoRole: function (role) {
        var s = db();
        s.role = role;
        s.aal2 = false;
        save();
      },
      resetDemo: function () {
        memory = fresh();
        save();
      },

      session: async function () { return db().signedIn ? { id: meId(), email: me().email } : null; },
      onAuthChange: function (cb) { listeners.push(cb); },
      sendLink: async function () { await wait(); },
      verifyCode: async function () { await wait(); db().signedIn = true; db().aal2 = false; save(); },
      demoSignIn: async function () { await wait(); db().signedIn = true; db().aal2 = false; save(); },
      signOut: async function () { db().signedIn = false; db().aal2 = false; save(); },
      access: async function () {
        var s = db();
        if (!s.signedIn) return { signed_in: false, approved: false, admin_account: false, admin: false, aal: "", full_name: "", leads: [], rotas: [] };
        var m = me();
        return {
          signed_in: true, approved: true, admin_account: m.is_admin, admin: isAdmin(), aal: s.aal2 ? "aal2" : "aal1", full_name: m.full_name,
          leads: s.team.filter(function (t) { return t.profile_id === m.id && t.is_lead; }).map(function (t) { return t.rota_id; }),
          rotas: s.team.filter(function (t) { return t.profile_id === m.id; }).map(function (t) { return t.rota_id; })
        };
      },
      mfaFactors: async function () { return db().mfaEnrolled[meId()] ? [{ id: "f-" + meId(), status: "verified" }] : []; },
      mfaEnroll: async function () {
        await wait();
        return { factorId: "f-" + meId(), qr: "", secret: "DEMODEMODEMODEMO" };
      },
      mfaVerify: async function (factorId, code) {
        await wait();
        if (!/^\d{6}$/.test(code)) throw new Error("Type the 6 numbers from the app. In the demo, any 6 numbers work.");
        db().mfaEnrolled[meId()] = true;
        db().aal2 = true;
        changed();
      },

      requestAccess: async function (name, email, message) {
        await wait();
        if (!name.trim()) throw new Error("Please give your name");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Please give a valid email address");
        db().requests.push({ id: id(), full_name: name, email: email.toLowerCase(), message: message || "", created_at: new Date().toISOString() });
        save();
      },

      people: async function () { signedIn(); return copy(db().people.map(function (p) { return { id: p.id, full_name: p.full_name, is_admin: p.is_admin, approved: p.approved }; })); },
      contacts: async function () {
        signedIn();
        var s = db();
        return s.people.filter(function (p) {
          if (p.id === meId() || isAdmin()) return true;
          return s.team.some(function (mine) {
            return mine.profile_id === meId() && mine.is_lead && s.team.some(function (t) { return t.rota_id === mine.rota_id && t.profile_id === p.id; });
          });
        }).map(function (p) { return { profile_id: p.id, email: p.email, phone: p.phone }; });
      },
      myDetails: async function () { var m = me(); return { id: m.id, full_name: m.full_name, email: m.email, phone: m.phone }; },
      saveMyDetails: async function (d) { await wait(); var m = me(); m.full_name = d.full_name; m.phone = d.phone; changed(); },
      setAdmin: async function (pid, value) {
        if (!isAdmin()) deny();
        var s = db();
        if (!value && s.people.filter(function (p) { return p.is_admin && p.id !== pid; }).length === 0) throw new Error("There must always be at least one admin");
        s.people.forEach(function (p) { if (p.id === pid) p.is_admin = value; });
        log("profiles", value ? "made admin" : "admin removed", pid);
        changed();
      },
      accessRequests: async function () { if (!isAdmin()) return []; return copy(db().requests); },
      declineRequest: async function (rid) { if (!isAdmin()) deny(); db().requests = db().requests.filter(function (r) { return r.id !== rid; }); changed(); },
      invite: async function (d) {
        await wait();
        if (!isAdmin()) throw new Error("Only an admin who has signed in with their two-step code can do this");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || "")) throw new Error("Please give a valid email address");
        if (!(d.full_name || "").trim()) throw new Error("Please give their name");
        var s = db();
        var known = s.people.filter(function (p) { return p.email === d.email.toLowerCase(); })[0];
        var pid = known ? known.id : id();
        if (!known) s.people.push({ id: pid, full_name: d.full_name, is_admin: false, approved: true, email: d.email.toLowerCase(), phone: "" });
        (d.rota_ids || []).forEach(function (r) {
          if (!s.team.some(function (t) { return t.rota_id === r && t.profile_id === pid; })) s.team.push({ rota_id: r, profile_id: pid, is_lead: false });
        });
        s.requests = s.requests.filter(function (r) { return r.id !== d.request_id && r.email !== d.email.toLowerCase(); });
        log("profiles", known ? "approved" : "invited", pid);
        changed();
        return { ok: true, user_id: pid, already_had_account: Boolean(known) };
      },
      removeMember: async function (pid) {
        await wait();
        if (!isAdmin()) deny();
        if (pid === meId()) throw new Error("To remove your own account, use Delete my account on My details");
        var s = db();
        var target = s.people.filter(function (p) { return p.id === pid; })[0];
        if (target && target.is_admin && s.people.filter(function (p) { return p.is_admin && p.id !== pid; }).length === 0) throw new Error("There must always be at least one admin");
        s.people = s.people.filter(function (p) { return p.id !== pid; });
        s.team = s.team.filter(function (t) { return t.profile_id !== pid; });
        var gone = s.assignments.filter(function (a) { return a.profile_id === pid; }).map(function (a) { return a.id; });
        s.assignments = s.assignments.filter(function (a) { return a.profile_id !== pid; });
        s.swaps = s.swaps.filter(function (w) { return gone.indexOf(w.assignment_id) === -1; });
        s.away = s.away.filter(function (a) { return a.profile_id !== pid; });
        log("profiles", "removed", pid);
        changed();
      },
      activity: async function () { if (!isAdmin()) return []; return copy(db().activity.slice(0, 40)); },
      myData: async function () {
        var s = db(), m = me();
        return {
          exported_at: new Date().toISOString(),
          profile: { full_name: m.full_name, is_admin: m.is_admin },
          contact_details: { email: m.email, phone: m.phone },
          teams: s.team.filter(function (t) { return t.profile_id === m.id; }).map(function (t) { return { rota: "AV team", lead: t.is_lead }; }),
          dates: s.assignments.filter(function (a) { return a.profile_id === m.id; }).map(function (a) {
            var sv = s.services.filter(function (x) { return x.id === a.service_id; })[0];
            return { service: sv.title, starts_at: sv.starts_at };
          }),
          away_dates: s.away.filter(function (a) { return a.profile_id === m.id; }).map(function (a) { return { from: a.starts_on, to: a.ends_on }; }),
          note: "Demo data: made-up names only"
        };
      },
      deleteMe: async function () { throw new Error("In the demo you can't delete the made-up people. With real data, this deletes your account straight away."); },

      rotas: async function () { signedIn(); return copy(db().rotas).sort(function (a, b) { return a.sort - b.sort; }); },
      addRota: async function (name, description) {
        if (!isAdmin()) deny();
        var s = db(), base = slugify(name), slug = base, k = 2;
        while (s.rotas.some(function (r) { return r.slug === slug; })) slug = base + "-" + k++;
        var r = { id: id(), slug: slug, name: name, description: description || "", sort: s.rotas.length + 1 };
        s.rotas.push(r);
        s.positions.push({ id: id(), rota_id: r.id, name: "On duty", needed: 1, sort: 1 });
        changed();
        return r;
      },
      saveRota: async function (rid, d) {
        if (!leads(rid)) deny();
        db().rotas.forEach(function (r) { if (r.id === rid) { r.name = d.name; r.description = d.description; } });
        changed();
      },
      rota: async function (slug) {
        signedIn();
        var s = db();
        var rota = s.rotas.filter(function (r) { return r.slug === slug; })[0];
        if (!rota) return null;
        var since = startOfToday();
        var positions = s.positions.filter(function (p) { return p.rota_id === rota.id; }).sort(function (a, b) { return a.sort - b.sort; });
        var services = s.services.filter(function (x) { return x.starts_at >= since; }).sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; });
        var posIds = positions.map(function (p) { return p.id; });
        var assignments = s.assignments.filter(function (a) { return posIds.indexOf(a.position_id) !== -1; });
        var asgIds = assignments.map(function (a) { return a.id; });
        var canSeeAway = function (pid) {
          return pid === meId() || isAdmin() || s.team.some(function (mine) {
            return mine.profile_id === meId() && mine.is_lead && s.team.some(function (t) { return t.rota_id === mine.rota_id && t.profile_id === pid; });
          });
        };
        return copy({
          rota: rota, positions: positions,
          team: s.team.filter(function (t) { return t.rota_id === rota.id; }).map(function (t) { return { profile_id: t.profile_id, is_lead: t.is_lead }; }),
          services: services, assignments: assignments,
          swaps: s.swaps.filter(function (w) { return w.status === "open" && asgIds.indexOf(w.assignment_id) !== -1; }),
          away: s.away.filter(function (a) { return a.ends_on >= todayISO() && canSeeAway(a.profile_id); })
        });
      },
      setTeamMember: async function (rotaId, pid, member, lead) {
        await wait();
        if (!leads(rotaId)) throw new Error("Only the rota lead or an admin can change this team");
        var s = db();
        var cur = s.team.filter(function (t) { return t.rota_id === rotaId && t.profile_id === pid; })[0];
        if (!member) {
          if (cur && cur.is_lead && !isAdmin()) throw new Error("Only an admin can take a lead off the team");
          s.team = s.team.filter(function (t) { return t !== cur; });
          var now = new Date().toISOString();
          var futurePos = s.positions.filter(function (p) { return p.rota_id === rotaId; }).map(function (p) { return p.id; });
          s.assignments = s.assignments.filter(function (a) {
            var sv = s.services.filter(function (x) { return x.id === a.service_id; })[0];
            return !(a.profile_id === pid && futurePos.indexOf(a.position_id) !== -1 && sv && sv.starts_at > now);
          });
        } else {
          if (Boolean(cur && cur.is_lead) !== Boolean(lead) && !isAdmin()) throw new Error("Only an admin can choose who leads a rota");
          if (cur) cur.is_lead = Boolean(lead);
          else s.team.push({ rota_id: rotaId, profile_id: pid, is_lead: Boolean(lead) });
        }
        log("rota_members", member ? "update" : "delete", rotaId + ":" + pid);
        changed();
      },
      addPosition: async function (rotaId, name, needed, sort) {
        if (!leads(rotaId)) deny();
        db().positions.push({ id: id(), rota_id: rotaId, name: name, needed: needed || 1, sort: sort || 0 });
        changed();
      },
      savePosition: async function (pid, d) {
        var p = db().positions.filter(function (x) { return x.id === pid; })[0];
        if (!p || !leads(p.rota_id)) deny();
        p.name = d.name;
        p.needed = d.needed;
        changed();
      },
      deletePosition: async function (pid) {
        var s = db(), p = s.positions.filter(function (x) { return x.id === pid; })[0];
        if (!p || !leads(p.rota_id)) deny();
        s.positions = s.positions.filter(function (x) { return x.id !== pid; });
        s.assignments = s.assignments.filter(function (a) { return a.position_id !== pid; });
        changed();
      },
      addSundays: async function (from, weeks, time, title, skipThird) {
        await wait();
        if (!leadsAny()) throw new Error("Only rota leads and admins can add dates");
        var s = db(), added = 0, count = 0;
        var parts = from.split("-"), tp = time.split(":");
        var d = new Date(+parts[0], +parts[1] - 1, +parts[2], +tp[0], +tp[1]);
        d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
        while (count < weeks) {
          if (!(skipThird && d.getDate() >= 15 && d.getDate() <= 21)) {
            var iso = d.toISOString();
            if (!s.services.some(function (x) { return x.starts_at === iso; })) {
              s.services.push({ id: id(), starts_at: iso, title: title, notes: "" });
              added++;
            }
            count++;
          }
          d.setDate(d.getDate() + 7);
        }
        changed();
        return added;
      },
      addService: async function (date, time, title) {
        if (!leadsAny()) deny();
        var p = date.split("-"), t = time.split(":");
        db().services.push({ id: id(), starts_at: new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1]).toISOString(), title: title, notes: "" });
        changed();
      },
      saveService: async function (sid, d) {
        if (!leadsAny()) deny();
        db().services.forEach(function (x) { if (x.id === sid) { x.title = d.title; x.notes = d.notes; } });
        changed();
      },
      deleteService: async function (sid) {
        if (!isAdmin()) deny();
        var s = db();
        var gone = s.assignments.filter(function (a) { return a.service_id === sid; }).map(function (a) { return a.id; });
        s.services = s.services.filter(function (x) { return x.id !== sid; });
        s.assignments = s.assignments.filter(function (a) { return a.service_id !== sid; });
        s.swaps = s.swaps.filter(function (w) { return gone.indexOf(w.assignment_id) === -1; });
        changed();
      },
      assign: async function (sid, pid, person) {
        var s = db(), rotaId = rotaOfPosition(pid);
        if (!leads(rotaId)) deny();
        if (!s.team.some(function (t) { return t.rota_id === rotaId && t.profile_id === person; })) throw new Error("That person is not on this rota's team");
        if (s.assignments.some(function (a) { return a.service_id === sid && a.position_id === pid && a.profile_id === person; })) return;
        s.assignments.push({ id: id(), service_id: sid, position_id: pid, profile_id: person });
        log("assignments", "insert", sid);
        changed();
      },
      unassign: async function (aid) {
        var s = db(), a = s.assignments.filter(function (x) { return x.id === aid; })[0];
        if (!a || !leads(rotaOfPosition(a.position_id))) deny();
        s.assignments = s.assignments.filter(function (x) { return x.id !== aid; });
        s.swaps = s.swaps.filter(function (w) { return w.assignment_id !== aid; });
        log("assignments", "delete", aid);
        changed();
      },

      myDates: async function () {
        var s = db(), now = new Date().toISOString();
        return s.assignments.filter(function (a) { return a.profile_id === meId(); }).map(function (a) {
          var sv = s.services.filter(function (x) { return x.id === a.service_id; })[0];
          var pos = s.positions.filter(function (x) { return x.id === a.position_id; })[0];
          var rota = s.rotas.filter(function (x) { return x.id === pos.rota_id; })[0];
          var swap = s.swaps.filter(function (w) { return w.assignment_id === a.id && w.status === "open"; })[0];
          return { id: a.id, starts_at: sv.starts_at, service: sv.title, job: pos.name, rota: rota.name, slug: rota.slug, swap_id: swap ? swap.id : null };
        }).filter(function (x) { return x.starts_at > now; }).sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; });
      },
      openSwaps: async function () {
        var s = db(), now = new Date().toISOString();
        return s.swaps.filter(function (w) { return w.status === "open" && w.requested_by !== meId(); }).map(function (w) {
          var a = s.assignments.filter(function (x) { return x.id === w.assignment_id; })[0];
          if (!a) return null;
          var sv = s.services.filter(function (x) { return x.id === a.service_id; })[0];
          var pos = s.positions.filter(function (x) { return x.id === a.position_id; })[0];
          var rota = s.rotas.filter(function (x) { return x.id === pos.rota_id; })[0];
          if (!inRota(rota.id)) return null;
          return { id: w.id, note: w.note, requested_by: w.requested_by, starts_at: sv.starts_at, service: sv.title, job: pos.name, rota: rota.name, slug: rota.slug };
        }).filter(function (x) { return x && x.starts_at > now; });
      },
      requestSwap: async function (aid, note) {
        await wait();
        var s = db(), a = s.assignments.filter(function (x) { return x.id === aid; })[0];
        if (!a || a.profile_id !== meId()) throw new Error("You can only ask for a swap on your own future dates");
        if (s.swaps.some(function (w) { return w.assignment_id === aid && w.status === "open"; })) throw new Error("You have already asked for a swap on this date");
        var w = { id: id(), assignment_id: aid, requested_by: meId(), note: note || "", status: "open" };
        s.swaps.push(w);
        changed();
        return w.id;
      },
      cancelSwap: async function (wid) {
        var s = db(), w = s.swaps.filter(function (x) { return x.id === wid; })[0];
        if (!w || w.status !== "open") throw new Error("That swap request is not open, or it is not yours to cancel");
        var a = s.assignments.filter(function (x) { return x.id === w.assignment_id; })[0];
        if (w.requested_by !== meId() && !(a && leads(rotaOfPosition(a.position_id)))) throw new Error("That swap request is not open, or it is not yours to cancel");
        w.status = "cancelled";
        changed();
      },
      takeSwap: async function (wid) {
        await wait();
        var s = db(), w = s.swaps.filter(function (x) { return x.id === wid; })[0];
        if (!w || w.status !== "open") throw new Error("Someone has already taken this date, or the request was cancelled");
        var a = s.assignments.filter(function (x) { return x.id === w.assignment_id; })[0];
        if (!inRota(rotaOfPosition(a.position_id))) throw new Error("Only people on this team can take the date");
        if (w.requested_by === meId()) throw new Error("You cannot take your own date");
        if (s.assignments.some(function (x) { return x.service_id === a.service_id && x.position_id === a.position_id && x.profile_id === meId(); })) {
          throw new Error("You are already down for this job on that date");
        }
        a.profile_id = meId();
        w.status = "taken";
        w.taken_by = meId();
        log("assignments", "update", a.id);
        changed();
      },

      myAway: async function () {
        return copy(db().away.filter(function (a) { return a.profile_id === meId() && a.ends_on >= todayISO(); }))
          .sort(function (a, b) { return a.starts_on < b.starts_on ? -1 : 1; });
      },
      addAway: async function (from, to) {
        if (!from || !to || to < from) throw new Error("Check the dates: the last day can't be before the first.");
        db().away.push({ id: id(), profile_id: meId(), starts_on: from, ends_on: to });
        changed();
      },
      removeAway: async function (aid) { db().away = db().away.filter(function (a) { return a.id !== aid || a.profile_id !== meId(); }); changed(); },

      events: async function () { if (!isAdmin()) deny(); return copy(db().events).sort(function (a, b) { return a.starts_on < b.starts_on ? -1 : 1; }); },
      saveEvent: async function (d) {
        if (!isAdmin()) deny();
        if (!d.title.trim() || !d.starts_on) throw new Error("Give the event a date and a title.");
        var s = db();
        if (d.id) s.events = s.events.map(function (e) { return e.id === d.id ? d : e; });
        else { d.id = id(); s.events.push(d); }
        log("events", d.id ? "update" : "insert", d.id);
        changed();
      },
      deleteEvent: async function (eid) { if (!isAdmin()) deny(); db().events = db().events.filter(function (e) { return e.id !== eid; }); log("events", "delete", eid); changed(); },
      notices: async function () { if (!isAdmin()) deny(); return copy(db().notices); },
      saveNotice: async function (d) {
        if (!isAdmin()) deny();
        if (!d.title.trim()) throw new Error("Give the notice a title.");
        var s = db();
        if (d.id) s.notices = s.notices.map(function (x) { return x.id === d.id ? d : x; });
        else { d.id = id(); s.notices.unshift(d); }
        log("notices", "update", d.id);
        changed();
      },
      deleteNotice: async function (nid) { if (!isAdmin()) deny(); db().notices = db().notices.filter(function (x) { return x.id !== nid; }); log("notices", "delete", nid); changed(); },
      siteText: async function () { return copy(db().siteText); },
      saveSiteText: async function (key, value) {
        if (!isAdmin()) deny();
        db().siteText.forEach(function (t) { if (t.key === key) t.value = value; });
        log("site_text", "update", key);
        changed();
      }
    };
  }

  window.SMPMembers = LIVE ? liveApi() : demoApi();
})();

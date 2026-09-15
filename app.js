/* Health File — a private record that stays on the phone. */

var state = {
  people: [],
  currentId: null,
  visits: [],
  meds: [],
  labs: [],
  meta: { unsaved: 0, lastBackup: null, nudgeOff: false },
  view: "home",
  tab: "visits",
  query: "",
  sheet: null,
  draft: null,
  editing: null
};

var app = document.getElementById("app");
var appbar = document.getElementById("appbar");
var bottomnav = document.getElementById("bottomnav");
var fab = document.getElementById("fab");

/* ------------------------- icons ------------------------- */

var ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  visits: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  pill: '<svg viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/></svg>',
  lab: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  stetho: '<svg viewBox="0 0 24 24"><path d="M6 3v6a5 5 0 0010 0V3"/><path d="M4 3h3M14 3h3"/><path d="M11 14v2a5 5 0 0010 0v-1"/><circle cx="20" cy="11" r="2.2"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  person: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>'
};

/* ------------------------- lab types ------------------------- */

var LAB_TYPES = [
  { n: "HbA1c", u: "%" },
  { n: "Fasting glucose", u: "mg/dL" },
  { n: "Post-prandial glucose", u: "mg/dL" },
  { n: "Total cholesterol", u: "mg/dL" },
  { n: "LDL", u: "mg/dL" },
  { n: "HDL", u: "mg/dL" },
  { n: "Triglycerides", u: "mg/dL" },
  { n: "TSH", u: "\u00B5IU/mL" },
  { n: "Vitamin D", u: "ng/mL" },
  { n: "Vitamin B12", u: "pg/mL" },
  { n: "Haemoglobin", u: "g/dL" },
  { n: "Creatinine", u: "mg/dL" },
  { n: "Uric acid", u: "mg/dL" },
  { n: "Blood pressure (systolic)", u: "mmHg" },
  { n: "Blood pressure (diastolic)", u: "mmHg" },
  { n: "Weight", u: "kg" }
];

/* ------------------------- utilities ------------------------- */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(d) {
  if (!d) return "\u2014";
  var p = String(d).split("-");
  if (p.length !== 3) return d;
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
}
function fmtShort(d) {
  var p = String(d).split("-");
  if (p.length !== 3) return d;
  return MONTHS[Number(p[1]) - 1] + " " + p[0].slice(2);
}

function ageFrom(born) {
  if (!born) return null;
  var b = new Date(born), n = new Date();
  if (isNaN(b.getTime())) return null;
  var a = n.getFullYear() - b.getFullYear();
  var m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a > 0 && a < 130 ? a : null;
}

function duration(since) {
  if (!since) return "";
  var days = (Date.now() - new Date(since).getTime()) / 86400000;
  if (days < 0) return "not started yet";
  if (days < 45) return Math.max(1, Math.round(days)) + " days";
  if (days < 400) return Math.round(days / 30) + " months";
  return (days / 365).toFixed(1) + " years";
}

function daysUntil(d) {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000);
}

function today() { return new Date().toISOString().slice(0, 10); }
function uid(p) { return p + Date.now() + Math.random().toString(36).slice(2, 6); }

function toast(msg) {
  var el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.classList.add("hidden"); }, 2800);
}

function val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function on(id, fn) {
  var el = document.getElementById(id);
  if (el) el.onclick = fn;
}

function each(sel, fn) {
  var n = document.querySelectorAll(sel);
  for (var i = 0; i < n.length; i++) fn(n[i], i);
}

/* ------------------------- persistence ------------------------- */

function save(counts) {
  if (counts !== false) state.meta.unsaved = (state.meta.unsaved || 0) + 1;
  return DB.set("data", {
    version: 2,
    people: state.people, currentId: state.currentId,
    visits: state.visits, meds: state.meds, labs: state.labs, meta: state.meta
  }).catch(function () { toast("Could not save \u2014 the phone may be out of storage"); });
}

function load() {
  return DB.get("data").then(function (d) {
    if (!d) return;

    if (d.version === 2) {
      state.people = d.people || [];
      state.currentId = d.currentId || (state.people[0] && state.people[0].id) || null;
      state.visits = d.visits || [];
      state.meds = d.meds || [];
      state.labs = d.labs || [];
      state.meta = d.meta || state.meta;
      return;
    }

    /* migrate the old single-person format */
    if (d.profile) {
      var p = {
        id: uid("p"), name: d.profile.name, born: d.profile.born, sex: d.profile.sex,
        place: d.profile.place, notes: d.profile.notes, blood: "", contacts: []
      };
      state.people = [p];
      state.currentId = p.id;
      state.visits = (d.visits || []).map(function (v) { v.personId = p.id; return v; });
      state.meds = (d.meds || []).map(function (m) { m.personId = p.id; return m; });
      state.labs = [];
    }
  }).catch(function () {});
}

function person() {
  for (var i = 0; i < state.people.length; i++) {
    if (state.people[i].id === state.currentId) return state.people[i];
  }
  return state.people[0] || null;
}

function mine(list) {
  var id = state.currentId;
  return list.filter(function (x) { return x.personId === id; });
}

function myVisits() {
  return mine(state.visits).sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });
}

/* ------------------------- chrome ------------------------- */

function setChrome(o) {
  if (o.title === null) { appbar.classList.add("hidden"); appbar.innerHTML = ""; }
  else {
    appbar.classList.remove("hidden");
    var left = o.back
      ? '<button class="iconbtn" id="bar-back" aria-label="Back">' + ICON.back + '</button>'
      : '<div style="width:6px"></div>';
    var mid = o.person
      ? '<button class="personbtn" id="bar-person"><span class="nm">' +
        esc(o.title) + '</span>' + ICON.down + '</button>'
      : '<div class="title">' + esc(o.title) + '</div>';
    var right = "";
    if (o.search) right += '<button class="iconbtn" id="bar-search" aria-label="Search">' + ICON.search + '</button>';
    if (o.print) right += '<button class="iconbtn" id="bar-print" aria-label="Print">' + ICON.print + '</button>';
    if (o.settings) right += '<button class="iconbtn" id="bar-gear" aria-label="Settings">' + ICON.gear + '</button>';

    appbar.innerHTML = left + mid + right;
    on("bar-back", o.back);
    on("bar-person", function () { openSheet("people"); });
    on("bar-gear", function () { go("settings"); });
    on("bar-print", function () { window.print(); });
    on("bar-search", function () {
      state.query = state.query === null ? "" : (state.query ? "" : " ");
      state.query = state.query.trim();
      state.searching = !state.searching;
      render();
      var el = document.getElementById("q");
      if (el) el.focus();
    });
  }

  if (o.nav) {
    bottomnav.classList.remove("hidden");
    bottomnav.innerHTML =
      navBtn("visits", ICON.visits, "Visits") +
      navBtn("meds", ICON.pill, "Medicines") +
      navBtn("labs", ICON.lab, "Results") +
      '<button id="nav-doc">' + ICON.stetho + '<span>Show doctor</span></button>';
    on("nav-visits", function () { state.tab = "visits"; render(); });
    on("nav-meds", function () { state.tab = "meds"; render(); });
    on("nav-labs", function () { state.tab = "labs"; render(); });
    on("nav-doc", function () { go("doctor"); });
  } else { bottomnav.classList.add("hidden"); bottomnav.innerHTML = ""; }

  if (o.fab) {
    fab.classList.remove("hidden");
    fab.innerHTML = ICON.plus + '<span>' + esc(o.fab.label) + '</span>';
    fab.onclick = o.fab.action;
  } else { fab.classList.add("hidden"); }

  app.className = o.nav ? "" : "full";
}

function navBtn(key, icon, label) {
  return '<button id="nav-' + key + '" class="' + (state.tab === key ? "on" : "") + '">' +
    icon + '<span>' + label + '</span></button>';
}

function go(view, arg) {
  state.view = view;
  state.editing = arg || null;
  state.draft = null;
  state.sheet = null;
  window.scrollTo(0, 0);
  render();
}

function render() {
  each(".doctorview, .sheet, .ecard", function (n) { n.remove(); });

  if (!state.people.length) { renderSetup(); return; }
  if (state.view === "doctor") { renderDoctor(); return; }
  if (state.view === "emergency") { renderEmergency(); return; }
  if (state.view === "addVisit") { renderAddVisit(); return; }
  if (state.view === "addMed") { renderAddMed(); return; }
  if (state.view === "addLab") { renderAddLab(); return; }
  if (state.view === "person") { renderPerson(); return; }
  if (state.view === "settings") { renderSettings(); return; }
  renderHome();
  if (state.sheet) drawSheet();
}

/* ------------------------- first run ------------------------- */

function renderSetup() {
  setChrome({ title: null });
  app.className = "full";
  app.style.paddingTop = "calc(env(safe-area-inset-top) + 28px)";
  app.innerHTML =
    '<h2 class="screen-title">Whose health record is this?</h2>' +
    '<p class="screen-note">This stays on your phone only. Nothing is uploaded and there is no ' +
    'account to create. You can add more people later.</p>' + personForm(null) +
    '<div class="actions"><button class="btn primary grow" id="p-save">Start</button></div>';
  wirePersonSave(null, function () { app.style.paddingTop = ""; go("home"); });
}

function personForm(p) {
  p = p || { name: "", born: "", sex: "", place: "", blood: "", notes: "", contacts: [] };
  var c = p.contacts || [];
  return '<div class="field"><label for="p-name">Full name</label>' +
    '<input id="p-name" autocomplete="name" value="' + esc(p.name) + '" /></div>' +
    '<div class="row"><div class="field"><label for="p-born">Date of birth</label>' +
    '<input id="p-born" type="date" value="' + esc(p.born) + '" /></div>' +
    '<div class="field"><label for="p-sex">Sex</label><select id="p-sex">' +
    ["", "Female", "Male", "Other"].map(function (o) {
      return '<option value="' + o + '"' + (o === p.sex ? " selected" : "") + '>' +
        (o || "Not stated") + '</option>';
    }).join("") + '</select></div></div>' +
    '<div class="row"><div class="field"><label for="p-blood">Blood group</label>' +
    '<input id="p-blood" value="' + esc(p.blood || "") + '" placeholder="B+" /></div>' +
    '<div class="field"><label for="p-place">City</label>' +
    '<input id="p-place" value="' + esc(p.place) + '" /></div></div>' +
    '<div class="field"><label for="p-notes">Allergies and long-term conditions</label>' +
    '<textarea id="p-notes" placeholder="Penicillin allergy. Diabetes since 2019.">' +
    esc(p.notes) + '</textarea></div>' +
    '<div class="group-label">EMERGENCY CONTACTS</div>' +
    [0, 1].map(function (i) {
      var x = c[i] || { name: "", phone: "", rel: "" };
      return '<div class="row" style="margin-bottom:12px">' +
        '<div style="flex:1.2"><label for="c' + i + '-name">Name</label>' +
        '<input id="c' + i + '-name" value="' + esc(x.name) + '" /></div>' +
        '<div style="flex:1"><label for="c' + i + '-rel">Relation</label>' +
        '<input id="c' + i + '-rel" value="' + esc(x.rel) + '" placeholder="Son" /></div>' +
        '<div style="flex:1.2"><label for="c' + i + '-phone">Phone</label>' +
        '<input id="c' + i + '-phone" type="tel" value="' + esc(x.phone) + '" /></div></div>';
    }).join("");
}

function readPersonForm(existing) {
  var name = val("p-name");
  if (!name) { toast("A name is needed"); return null; }
  var contacts = [];
  [0, 1].forEach(function (i) {
    var n = val("c" + i + "-name"), ph = val("c" + i + "-phone");
    if (n || ph) contacts.push({ name: n, phone: ph, rel: val("c" + i + "-rel") });
  });
  var sex = val("p-sex");
  return {
    id: existing ? existing.id : uid("p"),
    name: name, born: val("p-born"), sex: sex === "Not stated" ? "" : sex,
    blood: val("p-blood"), place: val("p-place"), notes: val("p-notes"), contacts: contacts
  };
}

function wirePersonSave(existing, after) {
  on("p-save", function () {
    var p = readPersonForm(existing);
    if (!p) return;
    if (existing) {
      state.people = state.people.map(function (x) { return x.id === p.id ? p : x; });
    } else {
      state.people.push(p);
      state.currentId = p.id;
    }
    save().then(function () { DB.persist(); toast("Saved"); after(); });
  });
}

/* ------------------------- home ------------------------- */

function renderHome() {
  app.style.paddingTop = "";
  var p = person();

  setChrome({
    title: p.name, person: true, search: true, settings: true, nav: true,
    fab: state.tab === "visits" ? { label: "Visit", action: function () { go("addVisit"); } }
       : state.tab === "meds" ? { label: "Medicine", action: function () { go("addMed"); } }
       : { label: "Result", action: function () { go("addLab"); } }
  });

  var html = banners();

  if (state.searching) {
    html += '<div class="searchwrap"><input id="q" placeholder="Search visits, medicines, results\u2026" ' +
      'value="' + esc(state.query) + '" /></div>';
  } else {
    html += hero(p);
  }

  html += state.tab === "visits" ? visitList()
        : state.tab === "meds" ? medList()
        : labList();

  html += '<p class="footnote">Everything stays on this phone. Nothing is uploaded and there is no ' +
    'account. This app does not give medical advice \u2014 it only shows a doctor what has already ' +
    'been recorded.</p>';

  app.innerHTML = html;

  var q = document.getElementById("q");
  if (q) {
    q.oninput = function () {
      state.query = q.value;
      var body = state.tab === "visits" ? visitList() : state.tab === "meds" ? medList() : labList();
      var holder = document.getElementById("listholder");
      if (holder) { holder.outerHTML = body; wireList(); }
    };
  }

  on("go-doctor", function () { go("doctor"); });
  on("go-emergency", function () { go("emergency"); });
  wireList();
}

function hero(p) {
  var age = ageFrom(p.born);
  var taking = mine(state.meds).filter(function (m) { return m.taking; });
  var v = myVisits();
  return '<div class="hero">' +
    '<div class="who">' + esc(p.name) + (age != null ? ", " + age : "") + '</div>' +
    '<div class="stats">' + taking.length + (taking.length === 1 ? " medicine" : " medicines") +
      ' \u00b7 ' + v.length + (v.length === 1 ? " visit" : " visits") +
      (v.length ? ' \u00b7 last seen ' + fmt(v[0].date) : '') + '</div>' +
    '<button class="showdoc" id="go-doctor">' + ICON.stetho +
      '<div><div class="t">Show the doctor</div>' +
      '<div class="s">Everything on one screen \u2014 hand over the phone</div></div></button>' +
    '<button class="btn wide" id="go-emergency" style="margin-top:9px">Emergency card</button>' +
    '</div>';
}

function banners() {
  var out = "";

  var due = myVisits().filter(function (v) {
    if (!v.followUp || v.followUpDone) return false;
    var d = daysUntil(v.followUp);
    return d !== null && d <= 7;
  });
  if (due.length) {
    out += due.map(function (v) {
      var d = daysUntil(v.followUp);
      var when = d < 0 ? Math.abs(d) + " days ago" : d === 0 ? "today" : "in " + d + " days";
      return '<div class="banner warn">' + ICON.alert +
        '<div class="b-main"><strong>Follow-up ' + when + '</strong>' +
        esc(v.doctor) + (v.specialty ? ", " + esc(v.specialty) : "") +
        ' \u2014 ' + fmt(v.followUp) + '</div>' +
        '<button data-followdone="' + esc(v.id) + '">Done</button></div>';
    }).join("");
  }

  var low = mine(state.meds).filter(function (m) {
    return m.taking && m.qty && m.perDay && (m.qty / m.perDay) <= 7;
  });
  if (low.length) {
    out += '<div class="banner warn">' + ICON.alert +
      '<div class="b-main"><strong>Running low</strong>' +
      low.map(function (m) {
        var d = Math.floor(m.qty / m.perDay);
        return esc(m.name) + " (" + (d <= 0 ? "finished" : d + " days") + ")";
      }).join(", ") + '</div></div>';
  }

  if (!state.meta.nudgeOff && (state.meta.unsaved || 0) >= 8) {
    out += '<div class="banner info">' + ICON.alert +
      '<div class="b-main"><strong>Time for a backup</strong>' +
      'You have made ' + state.meta.unsaved + ' changes since the last one. ' +
      'If this phone is lost, the record goes with it.</div>' +
      '<button id="nudge-go">Back up</button></div>';
  }

  return out;
}

function wireList() {
  each("[data-img]", function (b) {
    b.onclick = function () {
      var box = document.getElementById("lightbox");
      box.innerHTML = '<div><img src="' + esc(b.getAttribute("data-img")) + '" alt="">' +
        '<div class="cap">' + esc(b.getAttribute("data-cap")) + '</div></div>';
      box.classList.remove("hidden");
      box.onclick = function () { box.classList.add("hidden"); box.innerHTML = ""; };
    };
  });

  each("[data-toggle]", function (b) {
    b.onclick = function () {
      var id = b.getAttribute("data-toggle");
      state.meds = state.meds.map(function (m) {
        if (m.id !== id) return m;
        return Object.assign({}, m, { taking: !m.taking, stoppedOn: m.taking ? today() : null });
      });
      save().then(render);
    };
  });

  each("[data-followdone]", function (b) {
    b.onclick = function () {
      var id = b.getAttribute("data-followdone");
      state.visits = state.visits.map(function (v) {
        return v.id === id ? Object.assign({}, v, { followUpDone: true }) : v;
      });
      save().then(render);
    };
  });

  each("[data-editvisit]", function (b) {
    b.onclick = function () { go("addVisit", b.getAttribute("data-editvisit")); };
  });
  each("[data-editmed]", function (b) {
    b.onclick = function () { go("addMed", b.getAttribute("data-editmed")); };
  });
  each("[data-dellab]", function (b) {
    b.onclick = function () {
      if (!confirm("Delete this reading?")) return;
      var id = b.getAttribute("data-dellab");
      state.labs = state.labs.filter(function (l) { return l.id !== id; });
      save().then(render);
    };
  });

  on("nudge-go", function () { go("settings"); });
}

function matches(text) {
  var q = state.query.trim().toLowerCase();
  if (!q) return true;
  return String(text).toLowerCase().indexOf(q) !== -1;
}

/* ---------- visits ---------- */

function visitList() {
  var list = myVisits().filter(function (v) {
    return matches([v.doctor, v.specialty, v.reason, v.said].join(" "));
  });

  if (!list.length) {
    return '<div id="listholder"><div class="empty">' + ICON.empty +
      '<div class="lead">' + (state.query ? "Nothing matched" : "No visits yet") + '</div>' +
      (state.query ? "Try different words."
        : "After the next appointment, add the date and photograph whatever paper you were given.") +
      '</div></div>';
  }

  return '<div id="listholder">' +
    '<div class="group-label">' + list.length + (list.length === 1 ? " VISIT" : " VISITS") + '</div>' +
    list.map(function (v) {
      var files = (v.files || []).map(function (f) {
        return f.url
          ? '<button class="thumb" data-img="' + esc(f.url) + '" data-cap="' + esc(f.name) + '"><img src="' + esc(f.url) + '" alt=""></button>'
          : '<div class="filechip">' + esc(f.name) + '</div>';
      }).join("");

      var chip = "";
      if (v.followUp) {
        var d = daysUntil(v.followUp);
        var overdue = d !== null && d <= 7 && !v.followUpDone;
        chip = '<div class="followchip' + (overdue ? " due" : "") + '">' +
          (v.followUpDone ? "Follow-up done" : "Follow-up " + fmt(v.followUp)) + '</div>';
      }

      return '<div class="item" data-editvisit="' + esc(v.id) + '">' +
        '<div class="date">' + fmt(v.date) + '</div>' +
        '<div class="who">' + esc(v.doctor) + '</div>' +
        (v.specialty ? '<div class="spec">' + esc(v.specialty) + '</div>' : '') +
        (v.reason ? '<div class="reason"><span>Went for \u2014 </span>' + esc(v.reason) + '</div>' : '') +
        (v.said ? '<p class="said">' + esc(v.said) + '</p>' : '') +
        chip + (files ? '<div class="chips">' + files + '</div>' : '') + '</div>';
    }).join("") + '</div>';
}

/* ---------- medicines ---------- */

function medList() {
  var all = mine(state.meds).filter(function (m) {
    return matches([m.name, m.from, m.when].join(" "));
  });

  if (!all.length) {
    return '<div id="listholder"><div class="empty">' + ICON.pill +
      '<div class="lead">' + (state.query ? "Nothing matched" : "No medicines yet") + '</div>' +
      (state.query ? "Try different words."
        : "Photograph each strip. The printed name is what a doctor needs to see.") + '</div></div>';
  }

  var on_ = all.filter(function (m) { return m.taking; });
  var off = all.filter(function (m) { return !m.taking; });

  function block(list) {
    return list.map(function (m) {
      var pic = m.photo
        ? '<button class="med-photo" data-img="' + esc(m.photo) + '" data-cap="' + esc(m.name) + '"><img src="' + esc(m.photo) + '" alt=""></button>'
        : '<div class="med-nophoto">no<br>photo</div>';

      var refill = "";
      if (m.taking && m.qty && m.perDay) {
        var d = Math.floor(m.qty / m.perDay);
        if (d <= 0) refill = '<div class="refill out">Finished \u2014 refill needed</div>';
        else if (d <= 14) refill = '<div class="refill' + (d <= 7 ? " out" : "") + '">About ' + d + ' days left</div>';
      }

      return '<div class="med' + (m.taking ? "" : " off") + '">' + pic +
        '<div class="med-main" data-editmed="' + esc(m.id) + '">' +
          '<div class="med-name">' + esc(m.name) + '</div>' +
          '<div class="med-when">' + esc(m.when) + '</div>' +
          '<div class="med-from">' + esc(m.from) + ' \u00b7 ' + duration(m.since) + '</div>' +
          refill +
        '</div>' +
        '<button class="pill" data-toggle="' + esc(m.id) + '">' +
          (m.taking ? "Stop" : "Resume") + '</button></div>';
    }).join("");
  }

  return '<div id="listholder">' +
    (on_.length ? '<div class="group-label">CURRENTLY TAKING</div>' + block(on_) : '') +
    (off.length ? '<div class="group-label">STOPPED</div>' + block(off) : '') + '</div>';
}

/* ---------- lab results ---------- */

function labList() {
  var all = mine(state.labs).filter(function (l) { return matches(l.type); });

  if (!all.length) {
    return '<div id="listholder"><div class="empty">' + ICON.lab +
      '<div class="lead">' + (state.query ? "Nothing matched" : "No results yet") + '</div>' +
      (state.query ? "Try different words."
        : "Add a number from a lab report and it gets charted. Three years of HbA1c on one line " +
          "tells a doctor more than three separate reports.") + '</div></div>';
  }

  var groups = {};
  all.forEach(function (l) { (groups[l.type] = groups[l.type] || []).push(l); });

  var keys = Object.keys(groups).sort(function (a, b) {
    var la = groups[a][groups[a].length - 1], lb = groups[b][groups[b].length - 1];
    return String(lb.date).localeCompare(String(la.date));
  });

  return '<div id="listholder">' + keys.map(function (k) {
    var rows = groups[k].slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });
    var last = rows[rows.length - 1];

    return '<div class="labcard">' +
      '<div class="lab-top"><div><div class="lab-name">' + esc(k) + '</div>' +
      '<div class="lab-sub">' + rows.length + (rows.length === 1 ? " reading" : " readings") +
      ' \u00b7 latest ' + fmt(last.date) + '</div></div>' +
      '<div class="lab-latest">' + esc(last.value) + ' <span>' + esc(last.unit || "") + '</span></div></div>' +
      (rows.length > 1 ? '<div class="lab-chart">' + chart(rows) + '</div>' : '') +
      '<div class="lab-rows">' + rows.slice().reverse().map(function (r) {
        return '<div class="lab-row"><span class="d">' + fmt(r.date) + '</span>' +
          '<span><span class="v">' + esc(r.value) + '</span> ' +
          '<span class="d">' + esc(r.unit || "") + '</span>' +
          '<button class="lab-del" data-dellab="' + esc(r.id) + '" aria-label="Delete">\u00d7</button>' +
          '</span></div>';
      }).join("") + '</div></div>';
  }).join("") + '</div>';
}

function chart(rows) {
  var W = 320, H = 108, PL = 6, PR = 6, PT = 14, PB = 20;
  var vals = rows.map(function (r) { return Number(r.value); });
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  if (hi === lo) { hi = lo + 1; lo = lo - 1; }
  var pad = (hi - lo) * 0.18;
  lo -= pad; hi += pad;

  var n = rows.length;
  function X(i) { return PL + (i * (W - PL - PR)) / Math.max(1, n - 1); }
  function Y(v) { return PT + (H - PT - PB) * (1 - (v - lo) / (hi - lo)); }

  var pts = vals.map(function (v, i) { return X(i) + "," + Y(v); }).join(" ");
  var area = "M" + X(0) + "," + (H - PB) + " L" + pts.split(" ").join(" L") +
             " L" + X(n - 1) + "," + (H - PB) + " Z";

  var dots = vals.map(function (v, i) {
    var lastOne = i === n - 1;
    return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (lastOne ? 4.5 : 3) +
      '" fill="' + (lastOne ? "#0F6B5C" : "#fff") + '" stroke="#0F6B5C" stroke-width="2"/>';
  }).join("");

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" ' +
    'style="height:108px" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="' + area + '" fill="#0F6B5C" opacity="0.07"/>' +
    '<polyline points="' + pts + '" fill="none" stroke="#0F6B5C" stroke-width="2.2" ' +
    'stroke-linejoin="round" stroke-linecap="round"/>' + dots +
    '<text x="' + PL + '" y="' + (H - 4) + '" font-size="10" fill="#8E9C9E" ' +
    'font-family="system-ui">' + esc(fmtShort(rows[0].date)) + '</text>' +
    '<text x="' + (W - PR) + '" y="' + (H - 4) + '" font-size="10" fill="#8E9C9E" ' +
    'text-anchor="end" font-family="system-ui">' + esc(fmtShort(rows[n - 1].date)) + '</text>' +
    '</svg>';
}

/* ------------------------- people sheet ------------------------- */

function openSheet(kind) { state.sheet = kind; drawSheet(); }

function drawSheet() {
  each(".sheet", function (n) { n.remove(); });
  if (!state.sheet) return;

  var el = document.createElement("div");
  el.className = "sheet";
  el.innerHTML = '<div class="sheet-inner"><div class="sheet-grip"></div>' +
    '<div class="sheet-title">WHOSE RECORD</div>' +
    state.people.map(function (p) {
      return '<button class="sheet-row' + (p.id === state.currentId ? " on" : "") +
        '" data-person="' + esc(p.id) + '">' + ICON.person + esc(p.name) +
        (p.id === state.currentId ? '<span class="tick">' + ICON.tick + '</span>' : '') + '</button>';
    }).join("") +
    '<button class="sheet-row" id="sheet-add">' + ICON.plus + 'Add another person</button>' +
    (person() ? '<button class="sheet-row" id="sheet-edit">' + ICON.gear +
      'Edit ' + esc(person().name) + '\u2019s details</button>' : '') +
    '</div>';

  el.onclick = function (e) { if (e.target === el) { state.sheet = null; drawSheet(); } };
  document.body.appendChild(el);

  each(".sheet [data-person]", function (b) {
    b.onclick = function () {
      state.currentId = b.getAttribute("data-person");
      state.sheet = null;
      save(false).then(function () { go("home"); });
    };
  });
  on("sheet-add", function () { state.sheet = null; go("person", "new"); });
  on("sheet-edit", function () { state.sheet = null; go("person", state.currentId); });
}

function renderPerson() {
  var isNew = state.editing === "new";
  var p = isNew ? null : person();

  setChrome({ title: isNew ? "Add a person" : "Personal details",
              back: function () { go("home"); } });

  app.innerHTML =
    '<p class="screen-note">Blood group, allergies and contacts appear on the emergency card.</p>' +
    personForm(p) +
    '<div class="actions"><button class="btn primary grow" id="p-save">Save</button></div>' +
    (!isNew && state.people.length > 1
      ? '<div style="height:12px"></div><button class="btn wide danger" id="p-del">' +
        'Delete ' + esc(p.name) + ' and all their records</button>'
      : '');

  wirePersonSave(p, function () { go("home"); });

  on("p-del", function () {
    if (!confirm("Delete " + p.name + " and every visit, medicine and result for them?")) return;
    if (!confirm("This cannot be undone. Delete?")) return;
    state.people = state.people.filter(function (x) { return x.id !== p.id; });
    state.visits = state.visits.filter(function (x) { return x.personId !== p.id; });
    state.meds = state.meds.filter(function (x) { return x.personId !== p.id; });
    state.labs = state.labs.filter(function (x) { return x.personId !== p.id; });
    state.currentId = state.people[0].id;
    save().then(function () { toast("Deleted"); go("home"); });
  });
}

/* ------------------------- add / edit visit ------------------------- */

function findVisit(id) {
  for (var i = 0; i < state.visits.length; i++) if (state.visits[i].id === id) return state.visits[i];
  return null;
}

function renderAddVisit() {
  var ex = state.editing ? findVisit(state.editing) : null;
  if (!state.draft) state.draft = { files: ex ? (ex.files || []).slice() : [] };

  setChrome({ title: ex ? "Edit visit" : "Record a visit", back: function () { go("home"); } });

  app.innerHTML =
    '<p class="screen-note">Fill what you can. Even just a date and a photo of the paper is ' +
    'useful later.</p>' +
    '<div class="field"><label for="v-doctor">Doctor</label>' +
    '<input id="v-doctor" placeholder="Dr. " value="' + esc(ex ? ex.doctor : "") + '" /></div>' +
    '<div class="row"><div class="field"><label for="v-spec">Specialty</label>' +
    '<input id="v-spec" placeholder="Cardiology" value="' + esc(ex ? ex.specialty : "") + '" /></div>' +
    '<div class="field"><label for="v-date">Date</label>' +
    '<input id="v-date" type="date" value="' + esc(ex ? ex.date : today()) + '" /></div></div>' +
    '<div class="field"><label for="v-reason">What was the problem</label>' +
    '<input id="v-reason" placeholder="Knee pain for 2 weeks" value="' + esc(ex ? ex.reason : "") + '" /></div>' +
    '<div class="field"><label for="v-said">What the doctor said</label>' +
    '<textarea id="v-said" placeholder="Diagnosis, tests advised, anything to remember">' +
    esc(ex ? ex.said : "") + '</textarea></div>' +
    '<div class="field"><label for="v-follow">Come back on</label>' +
    '<input id="v-follow" type="date" value="' + esc(ex ? (ex.followUp || "") : "") + '" />' +
    '<div class="hint">If the doctor said &ldquo;review in 8 weeks&rdquo;, put the date here and ' +
    'the app will remind you a week before.</div></div>' +
    '<label>Photos of the prescription, reports, scans</label>' +
    '<input type="file" id="v-files" accept="image/*" multiple hidden />' +
    '<button class="dropzone" id="v-pick">Add photos</button>' +
    '<div class="chips" id="v-preview"></div>' +
    '<div class="actions"><button class="btn primary grow" id="v-save">' +
    (ex ? "Save changes" : "Save visit") + '</button></div>' +
    (ex ? '<div style="height:12px"></div>' +
      '<button class="btn wide danger" id="v-del">Delete this visit</button>' : '');

  var input = document.getElementById("v-files");
  on("v-pick", function () { input.click(); });

  function drawPreview() {
    var box = document.getElementById("v-preview");
    if (!box) return;
    box.innerHTML = state.draft.files.map(function (f, i) {
      var inner = f.url ? '<button class="thumb"><img src="' + esc(f.url) + '" alt=""></button>'
                        : '<div class="filechip">' + esc(f.name) + '</div>';
      return '<div class="thumb-wrap">' + inner +
        '<button class="thumb-x" data-i="' + i + '" aria-label="Remove">&times;</button></div>';
    }).join("");
    each("#v-preview .thumb-x", function (b) {
      b.onclick = function () {
        state.draft.files.splice(Number(b.getAttribute("data-i")), 1);
        drawPreview();
      };
    });
  }

  input.onchange = function () {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    toast("Adding " + files.length + (files.length === 1 ? " photo" : " photos"));
    Promise.all(files.map(function (f) { return readImage(f); }))
      .then(function (out) { state.draft.files = state.draft.files.concat(out); drawPreview(); })
      .catch(function () { toast("One of those files could not be read"); });
    input.value = "";
  };
  drawPreview();

  on("v-save", function () {
    var doctor = val("v-doctor"), date = val("v-date");
    if (!doctor && !date && !state.draft.files.length) {
      toast("Add at least a doctor, a date or a photo"); return;
    }
    var rec = {
      id: ex ? ex.id : uid("v"), personId: state.currentId,
      doctor: doctor || "Not recorded", specialty: val("v-spec"),
      date: date || today(), reason: val("v-reason"), said: val("v-said"),
      followUp: val("v-follow"), followUpDone: ex ? !!ex.followUpDone : false,
      files: state.draft.files
    };
    if (ex) state.visits = state.visits.map(function (x) { return x.id === ex.id ? rec : x; });
    else state.visits.push(rec);
    save().then(function () { state.tab = "visits"; toast("Saved"); go("home"); });
  });

  on("v-del", function () {
    if (!confirm("Delete this visit and its photos?")) return;
    state.visits = state.visits.filter(function (x) { return x.id !== ex.id; });
    save().then(function () { toast("Deleted"); go("home"); });
  });
}

/* ------------------------- add / edit medicine ------------------------- */

function findMed(id) {
  for (var i = 0; i < state.meds.length; i++) if (state.meds[i].id === id) return state.meds[i];
  return null;
}

function renderAddMed() {
  var ex = state.editing ? findMed(state.editing) : null;
  if (!state.draft) state.draft = { photo: ex ? ex.photo : null };

  setChrome({ title: ex ? "Edit medicine" : "Add a medicine", back: function () { go("home"); } });

  app.innerHTML =
    '<p class="screen-note">Photograph the strip. The name printed on it is what the doctor needs ' +
    'to see.</p>' +
    '<input type="file" id="m-file" accept="image/*" hidden />' +
    '<button class="dropzone" id="m-pick">' +
    (state.draft.photo ? '<img src="' + esc(state.draft.photo) + '" alt="">' : 'Photograph the strip') +
    '</button>' +
    '<div style="height:18px"></div>' +
    '<div class="field"><label for="m-name">Name as printed on the strip</label>' +
    '<input id="m-name" placeholder="Telma 40" value="' + esc(ex ? ex.name : "") + '" /></div>' +
    '<div class="field"><label for="m-when">When it is taken</label>' +
    '<input id="m-when" placeholder="Morning, before food" value="' + esc(ex ? ex.when : "") + '" /></div>' +
    '<div class="row"><div class="field"><label for="m-from">Prescribed by</label>' +
    '<input id="m-from" placeholder="Dr. " value="' + esc(ex ? ex.from : "") + '" /></div>' +
    '<div class="field"><label for="m-since">Started on</label>' +
    '<input id="m-since" type="date" value="' + esc(ex ? ex.since : "") + '" /></div></div>' +
    '<div class="row"><div class="field"><label for="m-qty">Tablets left</label>' +
    '<input id="m-qty" type="number" min="0" placeholder="30" value="' + esc(ex && ex.qty ? ex.qty : "") + '" /></div>' +
    '<div class="field"><label for="m-per">Taken per day</label>' +
    '<input id="m-per" type="number" min="0" step="0.5" placeholder="2" value="' + esc(ex && ex.perDay ? ex.perDay : "") + '" /></div></div>' +
    '<div class="hint" style="margin-top:-8px">Optional. Fill both and the app warns you a week ' +
    'before the strip runs out.</div>' +
    '<div class="actions"><button class="btn primary grow" id="m-save">' +
    (ex ? "Save changes" : "Save medicine") + '</button></div>' +
    (ex ? '<div style="height:12px"></div>' +
      '<button class="btn wide danger" id="m-del">Delete this medicine</button>' : '');

  var file = document.getElementById("m-file");
  var zone = document.getElementById("m-pick");
  if (state.draft.photo) zone.style.padding = "8px";
  zone.onclick = function () { file.click(); };

  file.onchange = function () {
    var f = file.files && file.files[0];
    if (!f) return;
    readImage(f).then(function (out) {
      if (out.url) {
        state.draft.photo = out.url;
        zone.innerHTML = '<img src="' + esc(out.url) + '" alt="">';
        zone.style.padding = "8px";
      } else toast("That file is not a photo");
    }).catch(function () { toast("That photo could not be read"); });
    file.value = "";
  };

  on("m-save", function () {
    var name = val("m-name");
    if (!name) { toast("The medicine name is needed"); return; }
    var rec = {
      id: ex ? ex.id : uid("m"), personId: state.currentId, name: name,
      when: val("m-when") || "Not recorded", from: val("m-from") || "Not recorded",
      since: val("m-since") || today(),
      qty: Number(val("m-qty")) || null, perDay: Number(val("m-per")) || null,
      taking: ex ? ex.taking : true, stoppedOn: ex ? ex.stoppedOn : null,
      photo: state.draft.photo
    };
    if (ex) state.meds = state.meds.map(function (x) { return x.id === ex.id ? rec : x; });
    else state.meds.push(rec);
    save().then(function () { state.tab = "meds"; toast("Saved"); go("home"); });
  });

  on("m-del", function () {
    if (!confirm("Delete " + ex.name + "?")) return;
    state.meds = state.meds.filter(function (x) { return x.id !== ex.id; });
    save().then(function () { toast("Deleted"); go("home"); });
  });
}

/* ------------------------- add lab result ------------------------- */

function renderAddLab() {
  setChrome({ title: "Add a result", back: function () { go("home"); } });

  var used = {};
  mine(state.labs).forEach(function (l) { used[l.type] = l.unit; });

  app.innerHTML =
    '<p class="screen-note">Copy the number straight from the lab report. Add the same test after ' +
    'each visit and the app charts how it is moving.</p>' +
    '<div class="field"><label for="l-type">Test</label><select id="l-type">' +
      LAB_TYPES.map(function (t) {
        return '<option value="' + esc(t.n) + '" data-u="' + esc(t.u) + '">' + esc(t.n) + '</option>';
      }).join("") + '<option value="__other">Something else\u2026</option></select></div>' +
    '<div class="field hidden" id="l-otherwrap"><label for="l-other">Test name</label>' +
    '<input id="l-other" placeholder="Serum ferritin" /></div>' +
    '<div class="row"><div class="field"><label for="l-value">Value</label>' +
    '<input id="l-value" type="number" step="any" inputmode="decimal" /></div>' +
    '<div class="field"><label for="l-unit">Unit</label><input id="l-unit" /></div></div>' +
    '<div class="field"><label for="l-date">Date of the test</label>' +
    '<input id="l-date" type="date" value="' + today() + '" /></div>' +
    '<div class="actions"><button class="btn primary grow" id="l-save">Save result</button></div>' +
    '<p class="footnote">The app only stores and charts the numbers you enter. It does not judge ' +
    'whether a value is normal \u2014 reference ranges differ between labs and between people, and ' +
    'your report carries the right ones.</p>';

  var sel = document.getElementById("l-type");
  var unit = document.getElementById("l-unit");

  function sync() {
    var opt = sel.options[sel.selectedIndex];
    var other = sel.value === "__other";
    document.getElementById("l-otherwrap").classList.toggle("hidden", !other);
    if (!other) unit.value = used[sel.value] || opt.getAttribute("data-u") || "";
  }
  sel.onchange = sync;
  sync();

  on("l-save", function () {
    var type = sel.value === "__other" ? val("l-other") : sel.value;
    var value = val("l-value");
    if (!type) { toast("Name the test"); return; }
    if (value === "" || isNaN(Number(value))) { toast("Enter a number"); return; }
    state.labs.push({
      id: uid("l"), personId: state.currentId, type: type,
      value: Number(value), unit: val("l-unit"), date: val("l-date") || today()
    });
    save().then(function () { state.tab = "labs"; toast("Result saved"); go("home"); });
  });
}

/* ------------------------- emergency card ------------------------- */

function renderEmergency() {
  var p = person();
  var age = ageFrom(p.born);
  var taking = mine(state.meds).filter(function (m) { return m.taking; });

  setChrome({ title: null });

  var el = document.createElement("div");
  el.className = "ecard";
  el.innerHTML =
    '<button class="close" id="e-close" aria-label="Close">&times;</button>' +
    '<div class="tag">IN AN EMERGENCY</div>' +
    '<div class="nm">' + esc(p.name) + '</div>' +
    '<div class="sub">' + [age != null ? age + " years" : null, p.sex, p.place]
      .filter(Boolean).map(esc).join(" \u00b7 ") + '</div>' +
    (p.blood ? '<div class="blood">' + esc(p.blood) + '</div>' : '') +

    (p.notes ? '<h3>ALLERGIES AND CONDITIONS</h3><div class="line">' + esc(p.notes) + '</div>' : '') +

    '<h3>CURRENTLY TAKING</h3>' +
    (taking.length
      ? taking.map(function (m) {
          return '<div class="line">' + esc(m.name) + '<small>' + esc(m.when) + '</small></div>';
        }).join("")
      : '<div class="line" style="opacity:.75">Nothing recorded</div>') +

    '<h3>CALL</h3>' +
    ((p.contacts || []).length
      ? p.contacts.map(function (c) {
          return '<a class="call" href="tel:' + esc(c.phone) + '"><span>' + esc(c.name) +
            '<small>' + esc(c.rel || "Contact") + ' \u00b7 ' + esc(c.phone) + '</small></span>' +
            '<span>\u260E</span></a>';
        }).join("")
      : '<div class="line" style="opacity:.75">No contacts added \u2014 add them in personal details</div>') +
    '<a class="call" href="tel:108"><span>Ambulance<small>108 \u00b7 national emergency number</small></span><span>\u260E</span></a>';

  document.body.appendChild(el);
  on("e-close", function () { go("home"); });
}

/* ------------------------- doctor view ------------------------- */

function renderDoctor() {
  var p = person();
  var age = ageFrom(p.born);
  var taking = mine(state.meds).filter(function (m) { return m.taking; });
  var stopped = mine(state.meds).filter(function (m) { return !m.taking; });
  var visits = myVisits();

  var labs = {};
  mine(state.labs).forEach(function (l) { (labs[l.type] = labs[l.type] || []).push(l); });
  var labKeys = Object.keys(labs);

  setChrome({ title: "Showing the doctor", back: function () { go("home"); }, print: true });

  var el = document.createElement("div");
  el.className = "doctorview";
  el.innerHTML = '<div class="dv-inner">' +
    '<div class="dv-name">' + esc(p.name) + '</div>' +
    '<div class="dv-meta">' + [age != null ? age + " years" : null, p.sex,
      p.blood ? "Blood group " + p.blood : null, p.place]
      .filter(Boolean).map(esc).join(" \u00b7 ") + '</div>' +
    (p.notes ? '<div class="dv-alert">' + esc(p.notes) + '</div>' : '') +

    '<div class="section-head">CURRENTLY TAKING \u2014 ' + taking.length + '</div>' +
    (taking.length
      ? taking.map(function (m) {
          return '<div class="dv-med"><div class="n">' + esc(m.name) + '</div>' +
            '<div class="d">' + esc(m.when) + ' \u00b7 since ' + fmt(m.since) +
            ' (' + duration(m.since) + ') \u00b7 ' + esc(m.from) + '</div></div>';
        }).join("")
      : '<div class="dv-none">Nothing recorded</div>') +

    (stopped.length
      ? '<div class="section-head">RECENTLY STOPPED</div>' +
        stopped.map(function (m) {
          return '<div class="dv-med"><div class="n" style="font-weight:500;color:#5E6F72">' +
            esc(m.name) + '</div><div class="d">was ' + esc(m.when) + ', from ' + esc(m.from) +
            (m.stoppedOn ? ' \u00b7 stopped ' + fmt(m.stoppedOn) : '') + '</div></div>';
        }).join("")
      : '') +

    (labKeys.length
      ? '<div class="section-head">TEST RESULTS</div>' +
        labKeys.map(function (k) {
          var rows = labs[k].slice().sort(function (a, b) {
            return String(b.date).localeCompare(String(a.date));
          }).slice(0, 6);
          return '<div class="dv-med"><div class="n">' + esc(k) + '</div>' +
            '<div class="d">' + rows.map(function (r) {
              return esc(r.value) + " " + esc(r.unit || "") + " (" + fmtShort(r.date) + ")";
            }).join("  \u00b7  ") + '</div></div>';
        }).join("")
      : '') +

    '<div class="section-head">VISITS</div>' +
    (visits.length
      ? visits.map(function (v) {
          return '<div class="dv-visit"><div class="top">' +
            '<div class="who">' + esc(v.doctor) + '</div>' +
            '<div class="when">' + fmt(v.date) + '</div></div>' +
            (v.specialty ? '<div style="font-size:13px;color:#8E9C9E">' + esc(v.specialty) + '</div>' : '') +
            (v.reason ? '<div style="font-size:14px;margin-top:5px;color:#5E6F72">For \u2014 ' +
              esc(v.reason) + '</div>' : '') +
            (v.said ? '<div style="font-size:14.5px;margin-top:4px;line-height:1.5">' +
              esc(v.said) + '</div>' : '') +
            ((v.files || []).length
              ? '<div style="font-size:12.5px;color:#0F6B5C;margin-top:6px;font-weight:600" ' +
                'class="printhide">' + v.files.length +
                (v.files.length === 1 ? " file" : " files") + ' attached \u2014 ask to see</div>'
              : '') + '</div>';
        }).join("")
      : '<div class="dv-none">Nothing recorded</div>') +

    '<div style="margin-top:26px;font-size:11px;color:#8E9C9E">Printed from Health File \u00b7 ' +
    fmt(today()) + '</div></div>';

  document.body.appendChild(el);
}

/* ------------------------- settings ------------------------- */

function renderSettings() {
  setChrome({ title: "Backup and settings", back: function () { go("home"); } });

  var lastB = state.meta.lastBackup;

  app.innerHTML =
    '<p class="screen-note">This app keeps everything on this phone. That keeps it private, but it ' +
    'also means a lost or reset phone loses the record. Save a backup file somewhere safe.</p>' +

    (lastB
      ? '<div class="banner info" style="margin-bottom:14px">' + ICON.tick +
        '<div class="b-main">Last backup ' + fmt(lastB) + ' \u00b7 ' +
        (state.meta.unsaved || 0) + ' changes since</div></div>'
      : '') +

    '<div class="stack">' +
      '<button class="btn primary wide" id="s-export">Save a backup file</button>' +
      '<input type="file" id="s-file" accept=".json,application/json" hidden />' +
      '<button class="btn wide" id="s-import">Restore from a backup file</button>' +
      '<button class="btn wide" id="s-person">Edit personal details</button>' +
      '<button class="btn wide" id="s-addperson">Add another person</button>' +
    '</div>' +

    '<div class="group-label" style="margin-top:26px">REMINDERS</div>' +
    '<button class="btn wide" id="s-nudge">' +
      (state.meta.nudgeOff ? "Turn backup reminders on" : "Turn backup reminders off") + '</button>' +

    '<div class="group-label" style="margin-top:26px">SPACE USED</div>' +
    '<div id="s-space" style="font-size:14px;color:#5E6F72;padding:4px 2px 12px">Checking\u2026</div>' +

    '<div class="group-label">ERASE</div>' +
    '<p style="font-size:13.5px;color:#5E6F72;line-height:1.55;margin:4px 2px 12px">' +
    'Removes every person, visit, medicine, result and photo from this phone. Cannot be undone.</p>' +
    '<button class="btn wide danger" id="s-erase">Erase everything</button>';

  on("s-person", function () { go("person", state.currentId); });
  on("s-addperson", function () { go("person", "new"); });

  on("s-nudge", function () {
    state.meta.nudgeOff = !state.meta.nudgeOff;
    save(false).then(render);
  });

  on("s-export", function () {
    var payload = {
      format: "healthfile-backup", version: 2, savedOn: new Date().toISOString(),
      people: state.people, visits: state.visits, meds: state.meds, labs: state.labs
    };
    var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "health-file-" + today() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    state.meta.lastBackup = today();
    state.meta.unsaved = 0;
    save(false);
    toast("Backup saved to your downloads");
  });

  var f = document.getElementById("s-file");
  on("s-import", function () { f.click(); });
  f.onchange = function () {
    var file = f.files && f.files[0];
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (d.format !== "healthfile-backup") throw new Error("wrong file");
        if (!confirm("Replace everything on this phone with the contents of this backup?")) return;

        if (d.version === 2) {
          state.people = d.people || [];
          state.visits = d.visits || [];
          state.meds = d.meds || [];
          state.labs = d.labs || [];
        } else {
          var p = Object.assign({ id: uid("p"), contacts: [], blood: "" }, d.profile || {});
          state.people = [p];
          state.visits = (d.visits || []).map(function (v) { v.personId = p.id; return v; });
          state.meds = (d.meds || []).map(function (m) { m.personId = p.id; return m; });
          state.labs = [];
        }
        state.currentId = state.people[0] && state.people[0].id;
        state.meta.unsaved = 0;
        save(false).then(function () { toast("Backup restored"); go("home"); });
      } catch (e) { toast("That is not a Health File backup"); }
    };
    r.onerror = function () { toast("That file could not be read"); };
    r.readAsText(file);
    f.value = "";
  };

  on("s-erase", function () {
    if (!confirm("Erase every person, visit, medicine, result and photo? This cannot be undone.")) return;
    if (!confirm("Last check \u2014 erase everything?")) return;
    DB.clear().then(function () {
      state.people = []; state.visits = []; state.meds = []; state.labs = [];
      state.currentId = null; state.meta = { unsaved: 0, lastBackup: null, nudgeOff: false };
      go("home");
    });
  });

  DB.estimate().then(function (e) {
    var box = document.getElementById("s-space");
    if (!box) return;
    if (!e || !e.usage) { box.textContent = "Not reported by this browser."; return; }
    box.textContent = (e.usage / 1048576).toFixed(1) + " MB used" +
      (e.quota ? " of about " + (e.quota / 1073741824).toFixed(1) + " GB available" : "") + ".";
  });
}

/* ------------------------- start ------------------------- */

window.addEventListener("popstate", function () {
  if (state.sheet) { state.sheet = null; drawSheet(); }
  else if (state.searching) { state.searching = false; state.query = ""; render(); }
  else if (state.view !== "home") go("home");
  history.pushState(null, "", location.href);
});
history.pushState(null, "", location.href);

load().then(function () { render(); DB.persist(); });

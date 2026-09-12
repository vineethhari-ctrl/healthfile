/* Health File — a private record that stays on the phone. */

var state = {
  profile: null,
  visits: [],
  meds: [],
  view: "home",      // home | addVisit | addMed | profile | settings | doctor
  tab: "visits",     // visits | meds
  draft: null
};

var app = document.getElementById("app");
var appbar = document.getElementById("appbar");
var bottomnav = document.getElementById("bottomnav");
var fab = document.getElementById("fab");

/* ------------------------- icons ------------------------- */

var ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  visits: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  pill: '<svg viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/></svg>',
  stetho: '<svg viewBox="0 0 24 24"><path d="M6 3v6a5 5 0 0010 0V3"/><path d="M4 3h3M14 3h3"/><path d="M11 14v2a5 5 0 0010 0v-1"/><circle cx="20" cy="11" r="2.2"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>'
};

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

function today() { return new Date().toISOString().slice(0, 10); }
function uid(p) { return p + Date.now() + Math.random().toString(36).slice(2, 7); }

function toast(msg) {
  var el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.classList.add("hidden"); }, 2600);
}

function val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

/* ------------------------- persistence ------------------------- */

function save() {
  return DB.set("data", {
    profile: state.profile, visits: state.visits, meds: state.meds
  }).catch(function () { toast("Could not save \u2014 the phone may be out of storage"); });
}

function load() {
  return DB.get("data").then(function (d) {
    if (d) {
      state.profile = d.profile || null;
      state.visits = d.visits || [];
      state.meds = d.meds || [];
    }
  }).catch(function () {});
}

function sortedVisits() {
  return state.visits.slice().sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });
}

/* ------------------------- chrome ------------------------- */

function setChrome(opts) {
  if (opts.title === null) {
    appbar.classList.add("hidden");
    appbar.innerHTML = "";
  } else {
    appbar.classList.remove("hidden");
    appbar.innerHTML =
      (opts.back ? '<button class="iconbtn" id="bar-back" aria-label="Back">' + ICON.back + '</button>'
                 : '<div style="width:6px"></div>') +
      '<div class="title">' + esc(opts.title) + '</div>' +
      (opts.settings ? '<button class="iconbtn" id="bar-gear" aria-label="Settings">' + ICON.gear + '</button>' : '');
    var b = document.getElementById("bar-back");
    if (b) b.onclick = opts.back;
    var g = document.getElementById("bar-gear");
    if (g) g.onclick = function () { go("settings"); };
  }

  if (opts.nav) {
    bottomnav.classList.remove("hidden");
    bottomnav.innerHTML =
      '<button id="nav-visits" class="' + (state.tab === "visits" ? "on" : "") + '">' + ICON.visits + '<span>Visits</span></button>' +
      '<button id="nav-meds" class="' + (state.tab === "meds" ? "on" : "") + '">' + ICON.pill + '<span>Medicines</span></button>' +
      '<button id="nav-doc">' + ICON.stetho + '<span>Show doctor</span></button>';
    document.getElementById("nav-visits").onclick = function () { state.tab = "visits"; render(); };
    document.getElementById("nav-meds").onclick = function () { state.tab = "meds"; render(); };
    document.getElementById("nav-doc").onclick = function () { go("doctor"); };
  } else {
    bottomnav.classList.add("hidden");
    bottomnav.innerHTML = "";
  }

  if (opts.fab) {
    fab.classList.remove("hidden");
    fab.innerHTML = ICON.plus + '<span>' + esc(opts.fab.label) + '</span>';
    fab.onclick = opts.fab.action;
  } else {
    fab.classList.add("hidden");
  }

  app.className = opts.nav ? "" : "full";
}

function go(view) {
  state.view = view;
  state.draft = null;
  window.scrollTo(0, 0);
  render();
}

function render() {
  var old = document.querySelectorAll(".doctorview");
  for (var i = 0; i < old.length; i++) old[i].remove();

  if (!state.profile) { renderSetup(); return; }
  if (state.view === "doctor") { renderDoctor(); return; }
  if (state.view === "addVisit") { renderAddVisit(); return; }
  if (state.view === "addMed") { renderAddMed(); return; }
  if (state.view === "profile") { renderProfile(); return; }
  if (state.view === "settings") { renderSettings(); return; }
  renderHome();
}

/* ------------------------- first run ------------------------- */

function renderSetup() {
  setChrome({ title: null });
  app.className = "full";
  app.style.paddingTop = "calc(env(safe-area-inset-top) + 28px)";

  app.innerHTML =
    '<h2 class="screen-title">Whose health record is this?</h2>' +
    '<p class="screen-note">This stays on your phone only. Nothing is uploaded and there is no account to create.</p>' +
    '<div class="field"><label for="p-name">Full name</label><input id="p-name" autocomplete="name" /></div>' +
    '<div class="row"><div class="field"><label for="p-born">Date of birth</label><input id="p-born" type="date" /></div>' +
    '<div class="field"><label for="p-sex">Sex</label><select id="p-sex"><option value="">Not stated</option><option>Female</option><option>Male</option><option>Other</option></select></div></div>' +
    '<div class="field"><label for="p-place">City</label><input id="p-place" placeholder="Optional" /></div>' +
    '<div class="field"><label for="p-notes">Allergies and long-term conditions</label>' +
    '<textarea id="p-notes" placeholder="Penicillin allergy. Diabetes since 2019."></textarea></div>' +
    '<div class="actions"><button class="btn primary grow" id="p-save">Start</button></div>';

  document.getElementById("p-save").onclick = function () {
    var name = val("p-name");
    if (!name) { toast("A name is needed to start"); return; }
    state.profile = {
      name: name, born: val("p-born"), sex: val("p-sex"),
      place: val("p-place"), notes: val("p-notes")
    };
    app.style.paddingTop = "";
    save().then(function () { DB.persist(); go("home"); });
  };
}

/* ------------------------- home ------------------------- */

function renderHome() {
  app.style.paddingTop = "";
  var isVisits = state.tab === "visits";

  setChrome({
    title: "Health File",
    settings: true,
    nav: true,
    fab: isVisits
      ? { label: "Visit", action: function () { go("addVisit"); } }
      : { label: "Medicine", action: function () { go("addMed"); } }
  });

  var taking = state.meds.filter(function (m) { return m.taking; });
  var visits = sortedVisits();
  var age = ageFrom(state.profile.born);

  var hero =
    '<div class="hero">' +
      '<div class="who">' + esc(state.profile.name) + (age != null ? ", " + age : "") + '</div>' +
      '<div class="stats">' + taking.length + (taking.length === 1 ? " medicine" : " medicines") +
        ' \u00b7 ' + visits.length + (visits.length === 1 ? " visit" : " visits") +
        (visits.length ? ' \u00b7 last seen ' + fmt(visits[0].date) : '') + '</div>' +
      '<button class="showdoc" id="go-doctor">' + ICON.stetho +
        '<div><div class="t">Show the doctor</div>' +
        '<div class="s">Everything on one screen \u2014 hand over the phone</div></div></button>' +
    '</div>';

  app.innerHTML = hero + (isVisits ? visitList(visits) : medList()) +
    '<p class="footnote">Everything stays on this phone. Nothing is uploaded and there is no account. ' +
    'This app does not give medical advice \u2014 it only shows a doctor what has already been prescribed and taken.</p>';

  document.getElementById("go-doctor").onclick = function () { go("doctor"); };
  wireThumbs();
  wireMedToggles();
}

function visitList(visits) {
  if (!visits.length) {
    return '<div class="empty">' + ICON.empty +
      '<div class="lead">No visits yet</div>' +
      'After the next appointment, add the date and photograph whatever paper you were given.</div>';
  }
  return '<div class="group-label">' + visits.length + (visits.length === 1 ? " VISIT" : " VISITS") + '</div>' +
    visits.map(function (v) {
      var files = (v.files || []).map(function (f) {
        return f.url
          ? '<button class="thumb" data-img="' + esc(f.url) + '" data-cap="' + esc(f.name) + '"><img src="' + esc(f.url) + '" alt="' + esc(f.name) + '"></button>'
          : '<div class="filechip">' + esc(f.name) + '</div>';
      }).join("");

      return '<div class="item">' +
        '<div class="date">' + fmt(v.date) + '</div>' +
        '<div class="who">' + esc(v.doctor) + '</div>' +
        (v.specialty ? '<div class="spec">' + esc(v.specialty) + '</div>' : '') +
        (v.reason ? '<div class="reason"><span>Went for \u2014 </span>' + esc(v.reason) + '</div>' : '') +
        (v.said ? '<p class="said">' + esc(v.said) + '</p>' : '') +
        (files ? '<div class="chips">' + files + '</div>' : '') +
      '</div>';
    }).join("");
}

function medList() {
  if (!state.meds.length) {
    return '<div class="empty">' + ICON.pill +
      '<div class="lead">No medicines yet</div>' +
      'Photograph each strip in the cupboard. The printed name is what a doctor needs to see.</div>';
  }
  var on = state.meds.filter(function (m) { return m.taking; });
  var off = state.meds.filter(function (m) { return !m.taking; });

  function block(list) {
    return list.map(function (m) {
      var pic = m.photo
        ? '<button class="med-photo" data-img="' + esc(m.photo) + '" data-cap="' + esc(m.name) + '"><img src="' + esc(m.photo) + '" alt=""></button>'
        : '<div class="med-nophoto">no<br>photo</div>';
      return '<div class="med' + (m.taking ? "" : " off") + '">' + pic +
        '<div class="med-main">' +
          '<div class="med-name">' + esc(m.name) + '</div>' +
          '<div class="med-when">' + esc(m.when) + '</div>' +
          '<div class="med-from">' + esc(m.from) + ' \u00b7 ' + duration(m.since) + '</div>' +
        '</div>' +
        '<button class="pill med-toggle" data-id="' + esc(m.id) + '">' +
          (m.taking ? "Stop" : "Resume") + '</button></div>';
    }).join("");
  }

  return (on.length ? '<div class="group-label">CURRENTLY TAKING</div>' + block(on) : '') +
         (off.length ? '<div class="group-label">STOPPED</div>' + block(off) : '');
}

function wireMedToggles() {
  var btns = document.querySelectorAll(".med-toggle");
  for (var i = 0; i < btns.length; i++) {
    (function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-id");
        state.meds = state.meds.map(function (m) {
          if (m.id !== id) return m;
          return Object.assign({}, m, { taking: !m.taking, stoppedOn: m.taking ? today() : null });
        });
        save().then(render);
      };
    })(btns[i]);
  }
}

function wireThumbs() {
  var btns = document.querySelectorAll("[data-img]");
  for (var i = 0; i < btns.length; i++) {
    (function (b) {
      b.onclick = function () {
        var box = document.getElementById("lightbox");
        box.innerHTML = '<div><img src="' + esc(b.getAttribute("data-img")) + '" alt="">' +
          '<div class="cap">' + esc(b.getAttribute("data-cap")) + '</div></div>';
        box.classList.remove("hidden");
        box.onclick = function () { box.classList.add("hidden"); box.innerHTML = ""; };
      };
    })(btns[i]);
  }
}

/* ------------------------- add visit ------------------------- */

function renderAddVisit() {
  if (!state.draft) state.draft = { files: [] };
  setChrome({ title: "Record a visit", back: function () { go("home"); } });

  app.innerHTML =
    '<p class="screen-note">Fill what you can. Even just a date and a photo of the paper is useful later.</p>' +
    '<div class="field"><label for="v-doctor">Doctor</label><input id="v-doctor" placeholder="Dr. " /></div>' +
    '<div class="row"><div class="field"><label for="v-spec">Specialty</label><input id="v-spec" placeholder="Cardiology" /></div>' +
    '<div class="field"><label for="v-date">Date</label><input id="v-date" type="date" value="' + today() + '" /></div></div>' +
    '<div class="field"><label for="v-reason">What was the problem</label><input id="v-reason" placeholder="Knee pain for 2 weeks" /></div>' +
    '<div class="field"><label for="v-said">What the doctor said</label>' +
    '<textarea id="v-said" placeholder="Diagnosis, tests advised, anything to remember"></textarea></div>' +
    '<label>Photos of the prescription, reports, scans</label>' +
    '<input type="file" id="v-files" accept="image/*" multiple hidden />' +
    '<button class="dropzone" id="v-pick">Add photos</button>' +
    '<div class="chips" id="v-preview"></div>' +
    '<div class="actions"><button class="btn primary grow" id="v-save">Save visit</button></div>';

  var input = document.getElementById("v-files");
  document.getElementById("v-pick").onclick = function () { input.click(); };

  function drawPreview() {
    var box = document.getElementById("v-preview");
    if (!box) return;
    box.innerHTML = state.draft.files.map(function (f, i) {
      var inner = f.url
        ? '<button class="thumb"><img src="' + esc(f.url) + '" alt=""></button>'
        : '<div class="filechip">' + esc(f.name) + '</div>';
      return '<div class="thumb-wrap">' + inner +
        '<button class="thumb-x" data-i="' + i + '" aria-label="Remove">&times;</button></div>';
    }).join("");
    var xs = box.querySelectorAll(".thumb-x");
    for (var i = 0; i < xs.length; i++) {
      (function (b) {
        b.onclick = function () {
          state.draft.files.splice(Number(b.getAttribute("data-i")), 1);
          drawPreview();
        };
      })(xs[i]);
    }
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

  document.getElementById("v-save").onclick = function () {
    var doctor = val("v-doctor"), date = val("v-date");
    if (!doctor && !date && !state.draft.files.length) {
      toast("Add at least a doctor, a date or a photo"); return;
    }
    state.visits.push({
      id: uid("v"), doctor: doctor || "Not recorded", specialty: val("v-spec"),
      date: date || today(), reason: val("v-reason"), said: val("v-said"),
      files: state.draft.files
    });
    save().then(function () { state.tab = "visits"; toast("Visit saved"); go("home"); });
  };
}

/* ------------------------- add medicine ------------------------- */

function renderAddMed() {
  if (!state.draft) state.draft = { photo: null };
  setChrome({ title: "Add a medicine", back: function () { go("home"); } });

  app.innerHTML =
    '<p class="screen-note">Photograph the strip. The name printed on it is what the doctor needs to see.</p>' +
    '<input type="file" id="m-file" accept="image/*" hidden />' +
    '<button class="dropzone" id="m-pick">Photograph the strip</button>' +
    '<div style="height:18px"></div>' +
    '<div class="field"><label for="m-name">Name as printed on the strip</label><input id="m-name" placeholder="Telma 40" /></div>' +
    '<div class="field"><label for="m-when">When it is taken</label><input id="m-when" placeholder="Morning, before food" /></div>' +
    '<div class="row"><div class="field"><label for="m-from">Prescribed by</label><input id="m-from" placeholder="Dr. " /></div>' +
    '<div class="field"><label for="m-since">Started on</label><input id="m-since" type="date" /></div></div>' +
    '<div class="actions"><button class="btn primary grow" id="m-save">Save medicine</button></div>';

  var file = document.getElementById("m-file");
  var zone = document.getElementById("m-pick");
  zone.onclick = function () { file.click(); };

  file.onchange = function () {
    var f = file.files && file.files[0];
    if (!f) return;
    readImage(f).then(function (out) {
      if (out.url) {
        state.draft.photo = out.url;
        zone.innerHTML = '<img src="' + esc(out.url) + '" alt="">';
        zone.style.padding = "8px";
      } else { toast("That file is not a photo"); }
    }).catch(function () { toast("That photo could not be read"); });
    file.value = "";
  };

  document.getElementById("m-save").onclick = function () {
    var name = val("m-name");
    if (!name) { toast("The medicine name is needed"); return; }
    state.meds.push({
      id: uid("m"), name: name,
      when: val("m-when") || "Not recorded",
      from: val("m-from") || "Not recorded",
      since: val("m-since") || today(),
      taking: true, stoppedOn: null, photo: state.draft.photo
    });
    save().then(function () { state.tab = "meds"; toast("Medicine saved"); go("home"); });
  };
}

/* ------------------------- profile ------------------------- */

function renderProfile() {
  var p = state.profile;
  setChrome({ title: "Personal details", back: function () { go("settings"); } });

  app.innerHTML =
    '<p class="screen-note">Allergies and long-term conditions appear at the top of the doctor screen.</p>' +
    '<div class="field"><label for="p-name">Full name</label><input id="p-name" value="' + esc(p.name) + '" /></div>' +
    '<div class="row"><div class="field"><label for="p-born">Date of birth</label><input id="p-born" type="date" value="' + esc(p.born) + '" /></div>' +
    '<div class="field"><label for="p-sex">Sex</label><select id="p-sex">' +
      ["", "Female", "Male", "Other"].map(function (o) {
        return '<option value="' + o + '"' + (o === p.sex ? " selected" : "") + '>' + (o || "Not stated") + '</option>';
      }).join("") + '</select></div></div>' +
    '<div class="field"><label for="p-place">City</label><input id="p-place" value="' + esc(p.place) + '" /></div>' +
    '<div class="field"><label for="p-notes">Allergies and long-term conditions</label>' +
    '<textarea id="p-notes">' + esc(p.notes) + '</textarea></div>' +
    '<div class="actions"><button class="btn primary grow" id="p-save">Save</button></div>';

  document.getElementById("p-save").onclick = function () {
    var name = val("p-name");
    if (!name) { toast("A name is needed"); return; }
    state.profile = {
      name: name, born: val("p-born"), sex: val("p-sex"),
      place: val("p-place"), notes: val("p-notes")
    };
    save().then(function () { toast("Saved"); go("settings"); });
  };
}

/* ------------------------- doctor view ------------------------- */

function renderDoctor() {
  var p = state.profile;
  var age = ageFrom(p.born);
  var taking = state.meds.filter(function (m) { return m.taking; });
  var stopped = state.meds.filter(function (m) { return !m.taking; });
  var visits = sortedVisits();

  setChrome({ title: "Showing the doctor", back: function () { go("home"); } });

  var el = document.createElement("div");
  el.className = "doctorview";
  el.innerHTML = '<div class="dv-inner">' +
    '<div class="dv-name">' + esc(p.name) + '</div>' +
    '<div class="dv-meta">' + [age != null ? age + " years" : null, p.sex, p.place]
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
          return '<div class="dv-med"><div class="n" style="font-weight:500;color:#5E6F72">' + esc(m.name) + '</div>' +
            '<div class="d">was ' + esc(m.when) + ', from ' + esc(m.from) +
            (m.stoppedOn ? ' \u00b7 stopped ' + fmt(m.stoppedOn) : '') + '</div></div>';
        }).join("")
      : '') +

    '<div class="section-head">VISITS</div>' +
    (visits.length
      ? visits.map(function (v) {
          return '<div class="dv-visit"><div class="top">' +
            '<div class="who">' + esc(v.doctor) + '</div>' +
            '<div class="when">' + fmt(v.date) + '</div></div>' +
            (v.specialty ? '<div style="font-size:13px;color:#8E9C9E">' + esc(v.specialty) + '</div>' : '') +
            (v.reason ? '<div style="font-size:14px;margin-top:5px;color:#5E6F72">For \u2014 ' + esc(v.reason) + '</div>' : '') +
            (v.said ? '<div style="font-size:14.5px;margin-top:4px;line-height:1.5">' + esc(v.said) + '</div>' : '') +
            ((v.files || []).length
              ? '<div style="font-size:12.5px;color:#0F6B5C;margin-top:6px;font-weight:600">' +
                v.files.length + (v.files.length === 1 ? " file" : " files") + ' attached \u2014 ask to see</div>'
              : '') + '</div>';
        }).join("")
      : '<div class="dv-none">Nothing recorded</div>') +
    '</div>';

  document.body.appendChild(el);
}

/* ------------------------- settings ------------------------- */

function renderSettings() {
  setChrome({ title: "Backup and settings", back: function () { go("home"); } });

  app.innerHTML =
    '<p class="screen-note">This app keeps everything on this phone. That keeps it private, but it also ' +
    'means a lost or reset phone loses the record. Save a backup file somewhere safe.</p>' +

    '<div class="stack">' +
      '<button class="btn primary wide" id="s-export">Save a backup file</button>' +
      '<input type="file" id="s-file" accept=".json,application/json" hidden />' +
      '<button class="btn wide" id="s-import">Restore from a backup file</button>' +
      '<button class="btn wide" id="s-profile">Edit personal details</button>' +
    '</div>' +

    '<div class="group-label" style="margin-top:26px">SPACE USED</div>' +
    '<div id="s-space" style="font-size:14px;color:#5E6F72;padding:4px 2px 12px">Checking\u2026</div>' +

    '<div class="group-label">ERASE</div>' +
    '<p style="font-size:13.5px;color:#5E6F72;line-height:1.55;margin:4px 2px 12px">' +
    'Removes every visit, medicine and photo from this phone. This cannot be undone.</p>' +
    '<button class="btn wide danger" id="s-erase">Erase everything</button>';

  document.getElementById("s-profile").onclick = function () { go("profile"); };

  document.getElementById("s-export").onclick = function () {
    var payload = {
      format: "healthfile-backup", version: 1, savedOn: new Date().toISOString(),
      profile: state.profile, visits: state.visits, meds: state.meds
    };
    var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "health-file-" + today() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast("Backup saved to your downloads");
  };

  var f = document.getElementById("s-file");
  document.getElementById("s-import").onclick = function () { f.click(); };
  f.onchange = function () {
    var file = f.files && f.files[0];
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (d.format !== "healthfile-backup") throw new Error("wrong file");
        if (!confirm("Replace everything on this phone with the contents of this backup?")) return;
        state.profile = d.profile || state.profile;
        state.visits = d.visits || [];
        state.meds = d.meds || [];
        save().then(function () { toast("Backup restored"); go("home"); });
      } catch (e) { toast("That is not a Health File backup"); }
    };
    r.onerror = function () { toast("That file could not be read"); };
    r.readAsText(file);
    f.value = "";
  };

  document.getElementById("s-erase").onclick = function () {
    if (!confirm("Erase every visit, medicine and photo? This cannot be undone.")) return;
    if (!confirm("Last check \u2014 erase everything?")) return;
    DB.clear().then(function () {
      state.profile = null; state.visits = []; state.meds = [];
      go("home");
    });
  };

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
  if (state.view !== "home") {
    go("home");
    history.pushState(null, "", location.href);
  }
});
history.pushState(null, "", location.href);

load().then(function () { render(); DB.persist(); });

/* Health File — a private record that stays on the phone. */

var state = {
  profile: null,          // { name, born, sex, place, notes }
  visits: [],
  meds: [],
  view: "home",           // home | addVisit | addMed | profile | doctor | settings
  tab: "visits",
  draft: null
};

var app = document.getElementById("app");

/* ------------------------- utilities ------------------------- */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(d) {
  if (!d) return "—";
  var p = d.split("-");
  if (p.length !== 3) return d;
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
}

function ageFrom(born) {
  if (!born) return null;
  var b = new Date(born), n = new Date();
  var a = n.getFullYear() - b.getFullYear();
  var m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
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
    profile: state.profile,
    visits: state.visits,
    meds: state.meds
  }).catch(function () {
    toast("Could not save. The phone may be out of storage.");
  });
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

/* ------------------------- rendering ------------------------- */

function sortedVisits() {
  return state.visits.slice().sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });
}

function render() {
  if (!state.profile) { renderSetup(); return; }
  if (state.view === "doctor") { renderDoctor(); return; }

  document.querySelectorAll(".doctorview").forEach(function (n) { n.remove(); });

  if (state.view === "addVisit") { renderAddVisit(); return; }
  if (state.view === "addMed") { renderAddMed(); return; }
  if (state.view === "profile") { renderProfile(); return; }
  if (state.view === "settings") { renderSettings(); return; }
  renderHome();
}

function go(view) {
  state.view = view;
  state.draft = null;
  window.scrollTo(0, 0);
  render();
}

/* ---------- first run ---------- */

function renderSetup() {
  app.innerHTML =
    '<h2 class="screen-title">Whose health record is this?</h2>' +
    '<p class="screen-note">This stays on your phone only. Nothing is uploaded and there is no account to create.</p>' +
    '<div class="field"><label for="p-name">Full name</label><input id="p-name" /></div>' +
    '<div class="row"><div class="field"><label for="p-born">Date of birth</label><input id="p-born" type="date" /></div>' +
    '<div class="field"><label for="p-sex">Sex</label><select id="p-sex"><option value="">—</option><option>Female</option><option>Male</option><option>Other</option></select></div></div>' +
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
    save().then(function () { DB.persist(); go("home"); });
  };
}

/* ---------- home ---------- */

function renderHome() {
  var taking = state.meds.filter(function (m) { return m.taking; });
  var visits = sortedVisits();
  var age = ageFrom(state.profile.born);

  var head =
    '<div class="eyebrow">Health record for</div>' +
    '<div class="name">' + esc(state.profile.name) + (age != null ? ", " + age : "") + '</div>' +
    '<div class="meta">' + taking.length + ' medicines · ' + visits.length + ' visits' +
      (visits.length ? ' · last seen ' + fmt(visits[0].date) : '') + '</div>';

  var doctorBtn =
    '<button class="doctor-btn" id="go-doctor">' +
      '<div class="big">Show the doctor</div>' +
      '<div class="small">Everything on one screen — hand over the phone</div>' +
    '</button>';

  var tabs =
    '<div class="tabs">' +
      '<button id="t-visits" class="' + (state.tab === "visits" ? "on" : "") + '">Visits</button>' +
      '<button id="t-meds" class="' + (state.tab === "meds" ? "on" : "") + '">Medicines</button>' +
    '</div>';

  var body = state.tab === "visits" ? visitList(visits) : medList();

  app.innerHTML = head + doctorBtn + tabs + body +
    '<p class="footnote">Everything stays on this phone. Nothing is uploaded and there is no account. ' +
    'This app does not give medical advice — it only shows a doctor what has already been prescribed and taken.<br><br>' +
    '<a href="#" id="open-settings" style="color:var(--soft)">Backup, restore and settings</a></p>';

  document.getElementById("go-doctor").onclick = function () { go("doctor"); };
  document.getElementById("t-visits").onclick = function () { state.tab = "visits"; render(); };
  document.getElementById("t-meds").onclick = function () { state.tab = "meds"; render(); };
  document.getElementById("open-settings").onclick = function (e) { e.preventDefault(); go("settings"); };

  var addV = document.getElementById("add-visit");
  if (addV) addV.onclick = function () { go("addVisit"); };
  var addM = document.getElementById("add-med");
  if (addM) addM.onclick = function () { go("addMed"); };

  wireThumbs();
  wireMedToggles();
}

function visitList(visits) {
  if (!visits.length) {
    return '<div class="empty"><div class="lead">No visits recorded yet</div>' +
      'After the next appointment, add the date and photograph whatever paper you were given.</div>' +
      '<button class="btn wide" id="add-visit">Record a visit</button>';
  }
  var html = visits.map(function (v) {
    var files = (v.files || []).map(function (f, i) {
      return f.url
        ? '<button class="thumb" data-img="' + esc(f.url) + '" data-cap="' + esc(f.name) + '"><img src="' + esc(f.url) + '" alt="' + esc(f.name) + '"></button>'
        : '<div class="filechip">' + esc(f.name) + '</div>';
    }).join("");

    return '<div class="visit"><div class="rail"><div class="dot"></div><div class="stem"></div></div>' +
      '<div class="visit-body">' +
        '<div class="visit-date">' + fmt(v.date) + '</div>' +
        '<div class="visit-doctor">' + esc(v.doctor) + '</div>' +
        (v.specialty ? '<div class="visit-spec">' + esc(v.specialty) + '</div>' : '') +
        (v.reason ? '<div class="visit-reason"><span>Went for — </span>' + esc(v.reason) + '</div>' : '') +
        (v.said ? '<p class="visit-said">' + esc(v.said) + '</p>' : '') +
        (files ? '<div class="chips">' + files + '</div>' : '') +
      '</div></div>';
  }).join("");

  return html + '<button class="btn wide" id="add-visit" style="margin-top:8px">Record a visit</button>';
}

function medList() {
  if (!state.meds.length) {
    return '<div class="empty"><div class="lead">No medicines added yet</div>' +
      'Photograph each strip in the cupboard. The printed name is what a doctor needs to see.</div>' +
      '<button class="btn wide" id="add-med">Add a medicine</button>';
  }
  var html = state.meds.map(function (m) {
    var pic = m.photo
      ? '<button class="med-photo" data-img="' + esc(m.photo) + '" data-cap="' + esc(m.name) + '"><img src="' + esc(m.photo) + '" alt="' + esc(m.name) + '"></button>'
      : '<div class="med-nophoto">no photo</div>';
    return '<div class="med' + (m.taking ? "" : " off") + '">' + pic +
      '<div class="med-main">' +
        '<div class="med-name">' + esc(m.name) + '</div>' +
        '<div class="med-when">' + esc(m.when) + '</div>' +
        '<div class="med-from">' + esc(m.from) + ' · taking ' + duration(m.since) + '</div>' +
      '</div>' +
      '<button class="btn small med-toggle" data-id="' + esc(m.id) + '" style="align-self:center">' +
        (m.taking ? "Stopped" : "Resume") + '</button></div>';
  }).join("");

  return html + '<button class="btn wide" id="add-med" style="margin-top:16px">Add a medicine</button>';
}

function wireMedToggles() {
  document.querySelectorAll(".med-toggle").forEach(function (b) {
    b.onclick = function () {
      var id = b.getAttribute("data-id");
      state.meds = state.meds.map(function (m) {
        if (m.id !== id) return m;
        return Object.assign({}, m, {
          taking: !m.taking,
          stoppedOn: m.taking ? today() : null
        });
      });
      save().then(render);
    };
  });
}

/* ---------- lightbox ---------- */

function wireThumbs() {
  document.querySelectorAll("[data-img]").forEach(function (b) {
    b.onclick = function () {
      var box = document.getElementById("lightbox");
      box.innerHTML = '<div><img src="' + esc(b.getAttribute("data-img")) + '" alt="">' +
        '<div class="cap">' + esc(b.getAttribute("data-cap")) + '</div></div>';
      box.classList.remove("hidden");
      box.onclick = function () { box.classList.add("hidden"); box.innerHTML = ""; };
    };
  });
}

/* ---------- add visit ---------- */

function renderAddVisit() {
  if (!state.draft) state.draft = { files: [] };

  app.innerHTML =
    '<h2 class="screen-title">Record a visit</h2>' +
    '<p class="screen-note">Fill what you can. Even just a date and a photo of the paper is useful later.</p>' +
    '<div class="field"><label for="v-doctor">Doctor</label><input id="v-doctor" placeholder="Dr. " /></div>' +
    '<div class="row"><div class="field"><label for="v-spec">Specialty</label><input id="v-spec" placeholder="Cardiology" /></div>' +
    '<div class="field"><label for="v-date">Date</label><input id="v-date" type="date" value="' + today() + '" /></div></div>' +
    '<div class="field"><label for="v-reason">What was the problem</label><input id="v-reason" placeholder="Knee pain for 2 weeks" /></div>' +
    '<div class="field"><label for="v-said">What the doctor said</label>' +
    '<textarea id="v-said" placeholder="Diagnosis, tests advised, anything to remember"></textarea></div>' +
    '<label>Photos of the prescription, reports, scans</label>' +
    '<input type="file" id="v-files" accept="image/*,.pdf" multiple hidden />' +
    '<button class="btn wide" id="v-pick">Choose photos or files</button>' +
    '<div class="chips" id="v-preview"></div>' +
    '<div class="actions"><button class="btn primary grow" id="v-save">Save visit</button>' +
    '<button class="btn" id="v-cancel">Cancel</button></div>';

  var input = document.getElementById("v-files");
  document.getElementById("v-pick").onclick = function () { input.click(); };

  input.onchange = function () {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    toast("Adding " + files.length + (files.length === 1 ? " file" : " files"));
    Promise.all(files.map(function (f) { return readImage(f); }))
      .then(function (out) {
        state.draft.files = state.draft.files.concat(out);
        drawPreview();
      })
      .catch(function () { toast("One of those files could not be read"); });
    input.value = "";
  };

  function drawPreview() {
    var box = document.getElementById("v-preview");
    box.innerHTML = state.draft.files.map(function (f, i) {
      var inner = f.url
        ? '<button class="thumb"><img src="' + esc(f.url) + '" alt=""></button>'
        : '<div class="filechip">' + esc(f.name) + '</div>';
      return '<div class="thumb-wrap">' + inner +
        '<button class="thumb-x" data-i="' + i + '" aria-label="Remove">&times;</button></div>';
    }).join("");
    box.querySelectorAll(".thumb-x").forEach(function (b) {
      b.onclick = function () {
        state.draft.files.splice(Number(b.getAttribute("data-i")), 1);
        drawPreview();
      };
    });
  }
  drawPreview();

  document.getElementById("v-cancel").onclick = function () { go("home"); };
  document.getElementById("v-save").onclick = function () {
    var doctor = val("v-doctor");
    var date = val("v-date");
    if (!doctor && !date && !state.draft.files.length) {
      toast("Add at least a doctor, a date or a photo");
      return;
    }
    state.visits.push({
      id: uid("v"),
      doctor: doctor || "Not recorded",
      specialty: val("v-spec"),
      date: date || today(),
      reason: val("v-reason"),
      said: val("v-said"),
      files: state.draft.files
    });
    save().then(function () { state.tab = "visits"; toast("Visit saved"); go("home"); });
  };
}

/* ---------- add medicine ---------- */

function renderAddMed() {
  if (!state.draft) state.draft = { photo: null };

  app.innerHTML =
    '<h2 class="screen-title">Add a medicine</h2>' +
    '<p class="screen-note">Photograph the strip. The name printed on it is what the doctor needs to see.</p>' +
    '<input type="file" id="m-file" accept="image/*" hidden />' +
    '<button class="dropzone" id="m-pick">Photograph the strip</button>' +
    '<div style="height:16px"></div>' +
    '<div class="field"><label for="m-name">Name as printed on the strip</label><input id="m-name" placeholder="Telma 40" /></div>' +
    '<div class="field"><label for="m-when">When it is taken</label><input id="m-when" placeholder="Morning, before food" /></div>' +
    '<div class="row"><div class="field"><label for="m-from">Prescribed by</label><input id="m-from" placeholder="Dr. " /></div>' +
    '<div class="field"><label for="m-since">Started on</label><input id="m-since" type="date" /></div></div>' +
    '<div class="actions"><button class="btn primary grow" id="m-save">Save medicine</button>' +
    '<button class="btn" id="m-cancel">Cancel</button></div>';

  var file = document.getElementById("m-file");
  var zone = document.getElementById("m-pick");
  zone.onclick = function () { file.click(); };

  file.onchange = function () {
    var f = file.files && file.files[0];
    if (!f) return;
    readImage(f).then(function (out) {
      state.draft.photo = out.url;
      if (out.url) {
        zone.innerHTML = '<img src="' + esc(out.url) + '" alt="">';
        zone.style.padding = "8px";
      } else {
        toast("That file is not a photo");
      }
    }).catch(function () { toast("That photo could not be read"); });
    file.value = "";
  };

  document.getElementById("m-cancel").onclick = function () { go("home"); };
  document.getElementById("m-save").onclick = function () {
    var name = val("m-name");
    if (!name) { toast("The medicine name is needed"); return; }
    state.meds.push({
      id: uid("m"), name: name,
      when: val("m-when") || "Not recorded",
      from: val("m-from") || "Not recorded",
      since: val("m-since") || today(),
      taking: true, stoppedOn: null,
      photo: state.draft.photo
    });
    save().then(function () { state.tab = "meds"; toast("Medicine saved"); go("home"); });
  };
}

/* ---------- profile ---------- */

function renderProfile() {
  var p = state.profile;
  app.innerHTML =
    '<h2 class="screen-title">Personal details</h2>' +
    '<p class="screen-note">Allergies and long-term conditions appear at the top of the doctor screen.</p>' +
    '<div class="field"><label for="p-name">Full name</label><input id="p-name" value="' + esc(p.name) + '" /></div>' +
    '<div class="row"><div class="field"><label for="p-born">Date of birth</label><input id="p-born" type="date" value="' + esc(p.born) + '" /></div>' +
    '<div class="field"><label for="p-sex">Sex</label><select id="p-sex">' +
      ["", "Female", "Male", "Other"].map(function (o) {
        return '<option' + (o === p.sex ? " selected" : "") + '>' + (o || "—") + '</option>';
      }).join("") + '</select></div></div>' +
    '<div class="field"><label for="p-place">City</label><input id="p-place" value="' + esc(p.place) + '" /></div>' +
    '<div class="field"><label for="p-notes">Allergies and long-term conditions</label>' +
    '<textarea id="p-notes">' + esc(p.notes) + '</textarea></div>' +
    '<div class="actions"><button class="btn primary grow" id="p-save">Save</button>' +
    '<button class="btn" id="p-cancel">Cancel</button></div>';

  document.getElementById("p-cancel").onclick = function () { go("settings"); };
  document.getElementById("p-save").onclick = function () {
    var name = val("p-name");
    if (!name) { toast("A name is needed"); return; }
    var sex = val("p-sex");
    state.profile = {
      name: name, born: val("p-born"), sex: sex === "—" ? "" : sex,
      place: val("p-place"), notes: val("p-notes")
    };
    save().then(function () { toast("Saved"); go("settings"); });
  };
}

/* ---------- doctor view ---------- */

function renderDoctor() {
  var p = state.profile;
  var age = ageFrom(p.born);
  var taking = state.meds.filter(function (m) { return m.taking; });
  var stopped = state.meds.filter(function (m) { return !m.taking; });
  var visits = sortedVisits();

  var el = document.createElement("div");
  el.className = "doctorview";
  el.innerHTML =
    '<div class="inner">' +
      '<div class="dv-top"><div style="font-size:12.5px;color:var(--soft)">Showing to the doctor</div>' +
      '<button class="btn small" id="dv-close">Done</button></div>' +

      '<div class="name">' + esc(p.name) + '</div>' +
      '<div class="meta">' + [age != null ? age + " years" : null, p.sex, p.place]
        .filter(Boolean).map(esc).join(" · ") + '</div>' +

      (p.notes
        ? '<div style="margin-top:14px;padding:12px 14px;background:var(--green-bg);border-radius:4px;font-size:15px;line-height:1.5">' +
          esc(p.notes) + '</div>'
        : '') +

      '<div class="section-head">Currently taking — ' + taking.length + '</div>' +
      (taking.length
        ? taking.map(function (m) {
            return '<div class="dv-med"><div class="n">' + esc(m.name) + '</div>' +
              '<div class="d">' + esc(m.when) + ' · since ' + fmt(m.since) +
              ' (' + duration(m.since) + ') · ' + esc(m.from) + '</div></div>';
          }).join("")
        : '<div style="padding:10px 0;color:var(--soft)">Nothing recorded</div>') +

      (stopped.length
        ? '<div style="font-size:13px;color:var(--soft);margin:18px 0 6px">Recently stopped</div>' +
          stopped.map(function (m) {
            return '<div style="font-size:14.5px;color:var(--soft);padding:5px 0">' +
              esc(m.name) + ' — was ' + esc(m.when) + ', from ' + esc(m.from) +
              (m.stoppedOn ? ', stopped ' + fmt(m.stoppedOn) : '') + '</div>';
          }).join("")
        : '') +

      '<div class="section-head">Visits</div>' +
      (visits.length
        ? visits.map(function (v) {
            return '<div class="dv-visit"><div class="top">' +
              '<div class="who">' + esc(v.doctor) + '</div>' +
              '<div class="when">' + fmt(v.date) + '</div></div>' +
              (v.specialty ? '<div style="font-size:13px;color:var(--faint)">' + esc(v.specialty) + '</div>' : '') +
              (v.said ? '<div style="font-size:14.5px;margin-top:5px;line-height:1.5">' + esc(v.said) + '</div>' : '') +
              ((v.files || []).length
                ? '<div style="font-size:12.5px;color:var(--soft);margin-top:5px">' +
                  v.files.length + (v.files.length === 1 ? " file" : " files") + ' attached — ask to see</div>'
                : '') +
              '</div>';
          }).join("")
        : '<div style="padding:10px 0;color:var(--soft)">Nothing recorded</div>') +
    '</div>';

  document.body.appendChild(el);
  el.querySelector("#dv-close").onclick = function () { go("home"); };
}

/* ---------- settings, backup, restore ---------- */

function renderSettings() {
  app.innerHTML =
    '<h2 class="screen-title">Backup and settings</h2>' +
    '<p class="screen-note">This app keeps everything on this phone. That keeps it private, ' +
    'but it also means a lost or reset phone loses the record. Save a backup file somewhere safe.</p>' +

    '<button class="btn wide" id="s-export">Save a backup file</button>' +
    '<div style="height:10px"></div>' +
    '<input type="file" id="s-file" accept=".json,application/json" hidden />' +
    '<button class="btn wide" id="s-import">Restore from a backup file</button>' +

    '<div class="section-head">Details</div>' +
    '<button class="btn wide" id="s-profile" style="margin-top:12px">Edit personal details</button>' +

    '<div class="section-head">Space used</div>' +
    '<div id="s-space" style="font-size:14px;color:var(--soft);padding:10px 0">Checking…</div>' +

    '<div class="section-head">Erase</div>' +
    '<p style="font-size:13.5px;color:var(--soft);line-height:1.55">' +
    'Removes every visit, medicine and photo from this phone. This cannot be undone.</p>' +
    '<button class="btn wide" id="s-erase">Erase everything</button>' +

    '<div class="actions"><button class="btn grow" id="s-back">Back</button></div>';

  document.getElementById("s-back").onclick = function () { go("home"); };
  document.getElementById("s-profile").onclick = function () { go("profile"); };

  document.getElementById("s-export").onclick = function () {
    var payload = {
      format: "healthfile-backup",
      version: 1,
      savedOn: new Date().toISOString(),
      profile: state.profile,
      visits: state.visits,
      meds: state.meds
    };
    var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "health-file-" + today() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
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
      } catch (e) {
        toast("That is not a Health File backup");
      }
    };
    r.onerror = function () { toast("That file could not be read"); };
    r.readAsText(file);
    f.value = "";
  };

  document.getElementById("s-erase").onclick = function () {
    if (!confirm("Erase every visit, medicine and photo? This cannot be undone.")) return;
    if (!confirm("Last check — erase everything?")) return;
    DB.clear().then(function () {
      state.profile = null; state.visits = []; state.meds = [];
      go("home");
    });
  };

  DB.estimate().then(function (e) {
    var box = document.getElementById("s-space");
    if (!box) return;
    if (!e || !e.usage) { box.textContent = "Not reported by this browser."; return; }
    var mb = (e.usage / 1048576).toFixed(1);
    var quota = e.quota ? " of about " + (e.quota / 1073741824).toFixed(1) + " GB available" : "";
    box.textContent = mb + " MB used" + quota + ".";
  });
}

/* ------------------------- start ------------------------- */

load().then(function () {
  render();
  DB.persist();
});

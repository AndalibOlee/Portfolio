/* ==========================================================================
   views-people.js — attachments UI, People (directory, org chart),
   My profile (+ Benefits, Events), HR status & pay changes,
   timesheet approvals in the inbox, and Timesheet Status for HR / payroll
   ========================================================================== */

/* ---------------- attachments ---------------- */
UI.files = UI.files || {};
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.ceil(b / 1024))} KB`);

/** drag & drop box inside a request / claim form; files go with the form's submit */
function fileDrop(key, label = "Attachments", hint = "Receipts, quotes, itineraries — PDF, JPG or PNG") {
  return `<div class="fld fdrop-wrap" style="grid-column:1/-1"><label>${esc(label)} <span class="muted" style="font-weight:400">— optional</span></label>
    <div class="fdrop" data-fzone="${key}" role="button" tabindex="0" aria-label="Attach files"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 18a4.5 4.5 0 1 1 .8-8.9A6 6 0 0 1 19 10.5 3.8 3.8 0 0 1 18 18"/><path d="M12 12v8M9 15l3-3 3 3"/></svg><b>Drag &amp; drop files here, or click to choose</b><small>${esc(hint)} · your approver sees them</small></div>
    <input type="file" multiple accept="application/pdf,image/jpeg,image/png" data-fdrop="${key}" style="display:none">
    <div id="fchips-${key}" class="fchips">${pendingChips(key)}</div></div>`;
}
function pendingChips(key) {
  return (UI.files[key] || []).map((f, i) => `<span class="fchip">📎 ${esc(f.name)} <small>${fmtSize(f.size)}</small><button type="button" class="lnk" data-a="fileRemove" data-k="${key}" data-i="${i}" aria-label="Remove ${esc(f.name)}">✕</button></span>`).join("");
}
function takeFiles(key) { const f = UI.files[key] || []; UI.files[key] = []; return f; }
async function addFiles(key, list) {
  const cur = UI.files[key] = UI.files[key] || [];
  for (const file of [...(list || [])]) {
    if (!FILE_TYPES.includes(file.type)) { toast("Not attached", `${file.name} isn't a PDF, JPG or PNG.`, "err"); continue; }
    if (cur.length >= 8) { toast("Not attached", "Up to 8 files per request.", "err"); break; }
    const f = { name: file.name, size: file.size, type: file.type };
    if (file.size <= FILE_KEEP_MAX) f.data = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(undefined); r.readAsDataURL(file); });
    cur.push(f);
  }
  const host = document.getElementById(`fchips-${key}`);
  if (host) host.innerHTML = pendingChips(key);
}
/** files already on a record — anyone who can see the record can open them */
function fileChips(entityType, id) {
  const list = filesOf(entityType, id);
  return list.length ? `<div class="fchips">${list.map((f) => `<button type="button" class="fchip link" data-a="openFile" data-id="${f.id}" title="${esc(f.fileName)} · ${fmtSize(f.sizeBytes)}">📎 ${esc(f.fileName)}</button>`).join("")}</div>` : "";
}
async function openFile(id) {
  const f = (S.files || []).find((x) => x.id === id);
  if (!f) return;
  if (!f.data) { toast("Name only in the demo", `${f.fileName} (${fmtSize(f.sizeBytes)}) was bigger than the demo keeps — on the live site the whole file is stored.`, ""); return; }
  if (f.mimeType.startsWith("image/")) { UI.modal = `<h3 style="margin:0 0 10px">${esc(f.fileName)}</h3><img src="${f.data}" alt="${esc(f.fileName)}" style="max-width:100%;max-height:70vh;border-radius:8px;display:block;margin:0 auto"><p class="hint">Attached by ${esc(f.uploadedByName)} · ${esc(dTime(f.createdAt))}</p><div class="form-row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">Close</button></div>`; safeRender(); return; }
  const dl = await DOWNLOADS();
  if (!dl) { toast("Can't open here", "Saving files isn't available in this view.", "err"); return; }
  try { const blob = await (await fetch(f.data)).blob(); await dl.save({ filename: f.fileName, data: blob }); } catch (e) { if (e?.code !== "declined") toast("Not saved", e?.message || "The file couldn't be saved.", "err"); }
}
let _dl;
function DOWNLOADS() { if (_dl === undefined) _dl = (window.claude?.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null)); return _dl; }

/* ---------------- pill navigation ---------------- */
function pillNav(label, items, current) {
  // the shell renders the section tabs (People Directory, My Profile …); only a record's own sub-pages keep a pill bar
  if (label !== "Project" || shellTabsShown()) return "";
  return `<div class="pillnav"><span class="pl">${esc(label.toUpperCase())} ›</span>${items.map(([href, t]) => `<button class="pill ${href === current ? "on" : ""}" data-go="${href}" ${href === current ? 'aria-current="page"' : ""}>${esc(t)}</button>`).join("")}</div>`;
}
const peoplePills = () => [["/people/directory", "Employee directory"], ["/people/org-chart", "Organization chart"], ...(can(A, "hr.employees.view") ? [["/hr/employees", "Employee records"]] : [])];
const bigTitle = (t, p) => `<h1 class="big-h">${esc(t)}</h1>${p ? `<p class="big-p">${esc(p)}</p>` : ""}`;
const peopleInView = () => { const ids = scopeIds(S, A); return S.employees.filter((e) => ids.includes(e.companyId) && !["TERMINATED", "INACTIVE"].includes(e.status)).sort((a, b) => a.lastName.localeCompare(b.lastName)); };
function alsoWorksIn(e) {
  const sheets = new Set(S.timesheets.filter((t) => t.employeeId === e.id).map((t) => t.id));
  const m = new Map();
  for (const x of S.timesheetEntries) if (sheets.has(x.timesheetId) && x.departmentId && x.departmentId !== e.departmentId && x.date >= "2026-01-01") m.set(x.departmentId, (m.get(x.departmentId) || 0) + (x.workedHours || 0));
  return [...m].filter(([, h]) => h > 0).sort((a, b) => b[1] - a[1]).map(([id, h]) => ({ d: byId(S.departments, id), h })).filter((x) => x.d);
}

/* ---------------- Employee directory ---------------- */
function vDirectory() {
  const edit = can(A, "hr.employees.edit");
  const list = peopleInView();
  const deps = S.departments.filter((d) => scopeIds(S, A).includes(d.companyId));
  return pillNav("People", peoplePills(), "/people/directory") + bigTitle("Employee directory", `Who does what, and the departments each person works in.${edit ? " Set anyone’s main department here; the other departments they split time with come from their timesheets." : ""}`) + flashHtml()
    + `<div class="form-row" style="margin-bottom:12px"><input class="in" style="max-width:360px;border-radius:999px" placeholder="Search by name, role, department, manager…" aria-label="Search people" data-filter="dirT"><span class="hint">${list.length} people</span></div>`
    + cardFlush("", `<div class="tw"><table class="t" id="dirT"><thead><tr><th>Person</th><th>Main department</th><th>Also works in</th><th>Reports to</th><th>Contact</th></tr></thead><tbody>${list.map((e) => { const mgr = e.managerId ? byId(S.employees, e.managerId) : null; const dep = byId(S.departments, e.departmentId); const also = alsoWorksIn(e);
      return `<tr><td><span style="display:flex;align-items:center;gap:10px">${avatar(e, 34)}<span><strong>${esc(empName(e))}</strong><span class="hint" style="display:block">${esc(byId(S.positions, e.positionId)?.title || "—")}</span><span class="hint" style="display:block">${coTag(e.companyId)}</span></span></span></td>
        <td>${edit ? `<select class="in" style="height:32px;max-width:220px" data-a="setDept" data-id="${e.id}" aria-label="Main department for ${esc(empName(e))}">${S.departments.filter((d) => d.companyId === e.companyId).map((d) => opt(d.id, `${d.code} — ${d.name}`, d.id === e.departmentId)).join("")}</select>` : dep ? `${esc(dep.code)} — ${esc(dep.name)}` : "—"}</td>
        <td>${also.length ? also.map((x) => `<span class="chip" title="${hrs(x.h)} h this year">${esc(x.d.code)} — ${esc(x.d.name)}</span>`).join(" ") : `<span class="muted">—</span>`}</td>
        <td>${mgr ? esc(empName(mgr)) : `<span class="muted">—</span>`}</td><td style="font-size:12.5px">${e.workEmail ? `<span class="mono">${esc(e.workEmail)}</span>` : "—"}${e.phone ? `<div class="hint">${esc(e.phone)}</div>` : ""}</td></tr>`; }).join("")}</tbody></table></div>`)
    + (edit ? `<p class="hint">Changing the department saves right away and is recorded in the person's history. You can also drag people between departments on the organization chart.</p>` : "");
}

/* ---------------- Organization chart ----------------
   A top-down chart of the WHOLE organization for everyone (names and job titles only):
   group → company → department → people, or the reporting lines. HR and administrators
   (hr.employees.edit) drag a person onto another department of the same company to move them. */
const orgPeople = () => S.employees.filter((e) => !["TERMINATED", "INACTIVE"].includes(e.status));
function vOrgChart() {
  const edit = can(A, "hr.employees.edit");
  const view = UI.tabs.org || "departments";
  const people = orgPeople();
  const cos = S.companies.filter((c) => people.some((e) => e.companyId === c.id)).sort((a, b) => (a.id === "HAICO" ? -1 : b.id === "HAICO" ? 1 : a.displayName.localeCompare(b.displayName)));
  const title = (e) => byId(S.positions, e.positionId)?.title || "—";
  const toggle = `<div class="seg">${[["departments", "By department"], ["reporting", "Reporting lines"]].map(([k, l]) => `<button class="${view === k ? "on" : ""}" data-a="tab" data-k="org" data-v="${k}">${l}</button>`).join("")}</div>`;
  const movable = (e) => edit && view === "departments" && scopeIds(S, A).includes(e.companyId);
  const pcard = (e, lead) => `<div class="oc-p${lead ? " lead" : ""}"${movable(e) ? ` draggable="true" data-drag="${e.id}" title="Drag to another department"` : ""}>${avatar(e, 30)}<b>${esc(empName(e))}</b><small>${esc(title(e))}</small>${lead ? `<span class="oc-tag">Lead</span>` : ""}</div>`;
  const stack = (cards) => `<div class="oc-stack">${cards.join("")}</div>`;
  let tree;
  if (view === "reporting") {
    const kids = (id) => people.filter((e) => e.managerId === id).sort((a, b) => a.lastName.localeCompare(b.lastName));
    const ids = new Set(people.map((e) => e.id));
    const node = (e) => {
      const k = kids(e.id), box = `<div class="oc-p oc-mgr" style="--cc:${esc(co(e.companyId)?.colorTag || "#17566b")}">${avatar(e, 38)}<b>${esc(empName(e))}</b><small>${esc(title(e))}</small><span class="oc-co">${esc(co(e.companyId)?.displayName || "")}</span></div>`;
      if (!k.length) return `<li>${box}</li>`;
      if (k.every((x) => !kids(x.id).length)) return `<li>${box}${stack(k.map((x) => pcard(x)))}</li>`;
      return `<li>${box}<ul>${k.map(node).join("")}</ul></li>`;
    };
    const roots = people.filter((e) => !e.managerId || !ids.has(e.managerId));
    tree = `<ul>${roots.map(node).join("")}</ul>`;
  } else {
    const dept = (d) => {
      const mem = people.filter((e) => e.departmentId === d.id).sort((a, b) => (a.id === d.managerId ? -1 : b.id === d.managerId ? 1 : a.lastName.localeCompare(b.lastName)));
      const head = d.managerId ? byId(S.employees, d.managerId) : null;
      return `<li><div class="oc-col" data-dropdept="${d.id}" data-co="${d.companyId}"><div class="oc-d"><b>${esc(d.name)}</b><small>${esc(d.code)}${head ? ` · led by ${esc(empName(head))}` : ""}</small><span class="oc-n">${mem.length} ${mem.length === 1 ? "person" : "people"}</span></div>${mem.length ? stack(mem.map((e) => pcard(e, e.id === d.managerId))) : `<div class="oc-stack"><div class="oc-empty">${edit ? "Drop someone here" : "Nobody yet"}</div></div>`}</div></li>`;
    };
    const company = (c) => {
      const deps = S.departments.filter((d) => d.companyId === c.id).sort((a, b) => a.code.localeCompare(b.code));
      const leadDep = deps.find((d) => d.managerId) , lead = leadDep ? byId(S.employees, leadDep.managerId) : null;
      const n = people.filter((e) => e.companyId === c.id).length;
      return `<li><div class="oc-c" style="--cc:${esc(c.colorTag)}">${lead ? avatar(lead, 38) : ""}<b>${esc(c.displayName)}</b><small>${lead ? `${esc(empName(lead))} · ${esc(title(lead))}` : ""}</small><span class="oc-n">${n} people · ${deps.length} departments</span></div><ul>${deps.map(dept).join("")}</ul></li>`;
    };
    tree = `<ul><li><div class="oc-g"><span class="weave" style="width:70px;height:4px;margin:0 auto 6px"></span><b>HaiCo Group</b><small>${cos.length} companies · ${people.length} people</small></div><ul>${cos.map(company).join("")}</ul></li></ul>`;
  }
  const hint = view === "departments"
    ? (edit ? `<div class="msg info">Drag a person onto another department to move them — within the same company. It saves right away and shows in their History.</div>` : `<p class="hint" style="margin:0 0 10px">The whole organization, every company. Only HR and administrators can move people between departments.</p>`)
    : `<p class="hint" style="margin:0 0 10px">Who reports to whom, across every company. Change a manager on the person's record (People › Employees).</p>`;
  return pillNav("People", peoplePills(), "/people/org-chart") + `<div class="ph" style="align-items:flex-end"><div>${bigTitle("Organization chart", "How the whole organization fits together — every company, department and person.")}</div><div class="acts">${toggle}</div></div>` + flashHtml() + hint
    + `<div class="ocw"><div class="ochart${edit && view === "departments" ? " can-drag" : ""}">${tree}</div></div>`;
}
injectCss(`
.ocw{overflow-x:auto;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px 8px 20px}
.ochart{--ln:color-mix(in srgb,var(--primary) 55%,var(--border));--box:color-mix(in srgb,var(--primary) 13%,var(--card));--box2:color-mix(in srgb,var(--primary) 7%,var(--card));width:max-content;min-width:100%;display:flex;justify-content:center}
.ochart ul{display:flex;justify-content:center;margin:0;padding:20px 0 0;list-style:none;position:relative}
.ochart>ul{padding-top:0}
.ochart li{position:relative;display:flex;flex-direction:column;align-items:center;padding:20px 4px 0}
.ochart>ul>li{padding-top:0}
.ochart li::before,.ochart li::after{content:"";position:absolute;top:0;right:50%;width:50%;height:20px;border-top:2px solid var(--ln)}
.ochart li::after{right:auto;left:50%;border-left:2px solid var(--ln)}
.ochart li:only-child::before,.ochart li:only-child::after{display:none}.ochart li:only-child{padding-top:0}
.ochart li:first-child::before,.ochart li:last-child::after{border:0}
.ochart li:last-child::before{border-right:2px solid var(--ln);border-radius:0 7px 0 0}
.ochart li:first-child::after{border-radius:7px 0 0 0}
.ochart ul ul::before{content:"";position:absolute;top:0;left:50%;height:20px;border-left:2px solid var(--ln)}
.ochart>ul>li:only-child::before{display:none}
.oc-g,.oc-c,.oc-d,.oc-p{display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;border-radius:12px;position:relative}
.oc-g{background:var(--primary);color:var(--primary-fg);padding:10px 22px;min-width:180px}.oc-g b{font-size:15px}.oc-g small{opacity:.85;font-size:12px}
.oc-c{background:var(--box);border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));border-top:4px solid var(--cc);padding:9px 10px 8px;min-width:150px;max-width:224px}
.oc-c b{font-size:14px}.oc-c small{font-size:11.5px;color:var(--muted-fg)}.oc-c .av{margin-bottom:3px}
.oc-n{font-size:10.5px;font-weight:700;color:var(--muted-fg);letter-spacing:.03em}
.oc-col{display:flex;flex-direction:column;align-items:center;border-radius:14px;padding:3px;transition:background .15s,box-shadow .15s}
.oc-d{background:var(--box);border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));padding:7px 7px;width:110px}
.oc-d b{font-size:12.5px;line-height:1.2}.oc-d small{font-size:10.5px;color:var(--muted-fg);line-height:1.25}
.oc-stack{display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:14px;position:relative}
.oc-stack::before{content:"";position:absolute;top:0;bottom:24px;left:50%;border-left:2px solid var(--ln)}
.oc-p{background:var(--box2);border:1px solid var(--border);padding:7px 5px 6px;width:106px;z-index:1}
.oc-p b{font-size:12px;line-height:1.2;font-weight:600}.oc-p small{font-size:10.5px;color:var(--muted-fg);line-height:1.2}.oc-p .av{margin-bottom:2px}
.oc-p.lead{border-color:color-mix(in srgb,var(--primary) 40%,var(--border))}
.oc-tag{position:absolute;top:5px;right:5px;font-size:9px;font-weight:700;background:var(--primary);color:var(--primary-fg);border-radius:99px;padding:0 5px}
.oc-mgr{background:var(--box);border-color:color-mix(in srgb,var(--primary) 28%,var(--border));border-top:3px solid var(--cc);width:124px}
.oc-co{font-size:9.5px;color:var(--muted-fg);font-weight:600}
.oc-empty{border:1px dashed var(--border);border-radius:10px;padding:10px 8px;width:106px;font-size:11px;color:var(--muted-fg);background:var(--card);z-index:1}
.can-drag .oc-p[draggable=true]{cursor:grab}.can-drag .oc-p[draggable=true]:hover{border-color:var(--primary);box-shadow:0 2px 8px rgba(0,0,0,.08)}
.oc-p.dragging{opacity:.4}
.oc-col.over{background:var(--info-bg);box-shadow:0 0 0 2px var(--info)}.oc-col.blocked{background:var(--bad-bg);box-shadow:0 0 0 2px var(--bad-line)}
`);

/* ---------------- My profile ---------------- */
const PROFILE_PILLS = [["/me/profile", "My profile"], ["/me/profile/benefits", "Benefits"], ["/me/profile/events", "Events"]];
const kvRow = (k, v) => `<div class="prow"><span>${esc(k)}</span><span>${v ?? "—"}</span></div>`;
const glance = (l, v, h = "") => `<div class="glance"><small>${esc(l.toUpperCase())}</small><b>${esc(v)}</b>${h ? `<span class="hint">${esc(h)}</span>` : ""}</div>`;
/** My Profile is one row of tabs (Overview · Employment · Pension & Benefits · Reviews · Certificates);
    each profile page shows the record's parts that belong under it */
const PROFILE_PAGES = {
  overview: ["My profile", "Your own employee record — the same one HR keeps, seen from your side. Everyone in the organization has this.", ["overview"]],
  employment: ["Employment", "Your job, pay, the departments you work in, your journey here, onboarding and the history of your record.", ["employment", "departments", "journey", "onboarding", "history"]],
  time: ["Time & time off", "Your timesheets, time-off balances (banked overtime included) and requests, and the approvals you asked for or decided.", ["time", "leave", "approvals"]],
  documents: ["Documents", "Documents and files kept on your record.", ["documents"]],
};
function vProfile(q, page) {
  const [title, sub, keys] = PROFILE_PAGES[page] || PROFILE_PAGES.overview;
  const head = pillNav("My profile", PROFILE_PILLS, "/me/profile") + bigTitle(title, sub);
  const e = A.employee;
  if (!e) return head + card("", empty("This account isn't linked to an employee"));
  const bal = leaveBalances(e.id);
  const left = (code) => { const b = bal.find((x) => x.lt.code === code); return b ? b.ent - b.used : 0; };
  const dep = byId(S.departments, e.departmentId), mgr = e.managerId ? byId(S.employees, e.managerId) : null, comp = latestComp(e.id);
  const parts = [];
  for (const tab of keys) {
  let body = "";
  if (tab === "overview") {
    body = `<div class="grid g2"><section class="card pcard"><h2>${esc(empName(e))}</h2>${kvRow("Position", esc(byId(S.positions, e.positionId)?.title || "—"))}${kvRow("Department", dep ? `${esc(dep.code)} — ${esc(dep.name)}` : "—")}${kvRow("Reports to", mgr ? esc(empName(mgr)) : "—")}${kvRow("Employee number", esc(e.employeeNumber))}${kvRow("Company", esc(co(e.companyId).displayName))}${kvRow("Work email", esc(e.workEmail || "—"))}${kvRow("Work phone", esc(e.phone || "—"))}${kvRow("Status", badge(e.status))}<p class="hint" style="margin-top:12px">Your own record. HR and Finance keep it up to date — tell them if something is wrong.</p></section>
      <section class="card pcard"><h2>At a glance</h2><div class="grid">${glance("Annual hours", hrs(left("VACATION")), "Vacation left for 2026")}${glance("Sick hours", hrs(left("SICK")))}${glance("Banked", hrs(left("BANKED_OT")), "Banked overtime")}${glance("Personal hours", hrs(left("PERSONAL")))}</div></section></div>`;
  } else if (tab === "journey") {
    const ev = [{ at: e.startDate, t: `Joined ${co(e.companyId).displayName}`, d: `${byId(S.positions, e.positionId)?.title || ""}${dep ? ` · ${dep.name}` : ""}`, c: "#17566b" }];
    for (const c of S.compensations.filter((x) => x.employeeId === e.id)) ev.push({ at: c.effectiveDate, t: c.changeReason || "Pay set", d: c.payType === "HOURLY" ? "Hourly" : "Salaried", c: "#3e6b34" });
    for (const a of S.audit.filter((x) => x.entityType === "Employee" && x.entityId === e.id)) ev.push({ at: a.at.slice(0, 10), t: a.summary, c: "#a03c28" });
    const yrs = Number(todayStr().slice(0, 4)) - Number(e.startDate.slice(0, 4));
    for (let y = 1; y <= yrs; y++) { const at = `${Number(e.startDate.slice(0, 4)) + y}${e.startDate.slice(4)}`; if (at <= todayStr()) ev.push({ at, t: `${y} year${y === 1 ? "" : "s"} with ${co(e.companyId).displayName}`, c: "#b85c44" }); }
    ev.sort((a, b) => (a.at < b.at ? -1 : 1));
    body = `<section class="card pcard"><h2>Your journey</h2><ol class="journey">${ev.map((x) => `<li><i style="background:${x.c}"></i><small>${esc(dLong(x.at))}</small><b>${esc(x.t)}</b>${x.d ? `<span class="hint">${esc(x.d)}</span>` : ""}</li>`).join("")}</ol></section>`;
  } else if (tab === "employment") {
    body = `<div class="grid g2"><section class="card pcard"><h2>Job</h2>${kvRow("Employment type", esc(EMPLOYMENT[e.employmentType] || e.employmentType))}${kvRow("Start date", esc(dLong(e.startDate)))}${kvRow("Location", esc(byId(S.locations, e.locationId)?.name || "—"))}${kvRow("Company", esc(co(e.companyId).displayName))}</section>
      <section class="card pcard"><h2>Pay</h2>${comp ? kvRow("Pay type", comp.payType === "HOURLY" ? "Hourly" : "Salaried") + kvRow(comp.payType === "HOURLY" ? "Hourly rate" : "Annual salary", `<span class="num">${comp.payType === "HOURLY" ? money(comp.hourlyRateCents) : money(comp.annualSalaryCents)}</span>`) + kvRow("Pay schedule", esc({ WEEKLY: "Weekly", BIWEEKLY: "Biweekly", SEMI_MONTHLY: "Semi-monthly", MONTHLY: "Monthly" }[comp.payFrequency] || comp.payFrequency)) + kvRow("Overtime eligible", comp.overtimeEligible ? "Yes" : "No") + kvRow("Since", esc(dLong(comp.effectiveDate))) : empty("No pay on file")}<p class="hint" style="margin-top:10px">Pay statements are under ${goLink("/me/pay", "My Pay")}.</p></section></div>`;
  } else if (tab === "departments") {
    const also = alsoWorksIn(e);
    const mainH = (() => { const sheets = new Set(S.timesheets.filter((t) => t.employeeId === e.id).map((t) => t.id)); return S.timesheetEntries.filter((x) => sheets.has(x.timesheetId) && (!x.departmentId || x.departmentId === e.departmentId)).reduce((s, x) => s + (x.workedHours || 0), 0); })();
    const all = [...(dep ? [{ d: dep, h: mainH, main: true }] : []), ...also];
    const tot = all.reduce((s, x) => s + x.h, 0);
    body = `<section class="card pcard"><h2>Departments you work in</h2><p class="hint">Your main department, plus any others you split time with — from the hours on your timesheets.</p>${all.map((x) => `<div class="dline"><div class="form-row" style="justify-content:space-between"><b>${esc(x.d.code)} — ${esc(x.d.name)} ${x.main ? `<span class="badge tone-teal">Main</span>` : ""}</b><span class="num">${hrs(x.h)} h${tot ? ` · ${Math.round((x.h / tot) * 100)}%` : ""}</span></div><div class="bar"><i style="width:${tot ? (x.h / tot) * 100 : 0}%"></i></div></div>`).join("")}</section>`;
  } else if (tab === "approvals") {
    const asked = S.approvals.filter((i) => i.requestedById === A.user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 25);
    const decided = S.approvalActions.filter((x) => x.approverId === A.user.id).sort((a, b) => (a.actedAt < b.actedAt ? 1 : -1)).slice(0, 25);
    body = `<div class="grid g2"><section class="card pcard"><h2>What you asked for</h2>${asked.map((i) => `<div class="row" style="padding:9px 0;border-top:1px solid var(--border)"><div class="grow"><div style="font-size:13.5px">${esc(i.entityLabel)}</div><div class="hint">${esc(dTime(i.createdAt))}</div>${fileChips(i.entityType, i.entityId)}</div>${badge(i.status)}</div>`).join("") || empty("Nothing yet")}</section>
      <section class="card pcard"><h2>What you decided</h2>${decided.map((x) => `<div class="row" style="padding:9px 0;border-top:1px solid var(--border)"><div class="grow"><div style="font-size:13.5px">${esc(byId(S.approvals, x.instanceId)?.entityLabel || "")}</div><div class="hint">${esc(x.stepName)} · ${esc(dTime(x.actedAt))}${x.comment ? ` — “${esc(x.comment)}”` : ""}</div></div>${badge(x.action)}</div>`).join("") || empty("Nothing yet", "Anything waiting on you is in Approvals.")}</section></div>`;
  } else if (tab === "time") {
    const sheets = S.timesheets.filter((t) => t.employeeId === e.id).sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1)).slice(0, 12);
    body = cardFlush("Timesheets", table(["Period", ">Worked", ">Overtime", ">Leave", ">Stat", "Status", "Approved by"], sheets.map((s) => `<tr><td>${esc(periodLabel(s.periodStart, s.periodEnd))}</td>${td(hrs(s.workedHours), 1)}${td(hrs((s.overtimeHours || 0) + (s.doubleOtHours || 0)), 1)}${td(hrs(s.vacationHours + s.sickHours + s.personalHours + s.otherLeaveHours), 1)}${td(hrs(s.statHours), 1)}<td>${badge(s.status)}</td><td>${esc(s.approvedByName || "—")}</td></tr>`), "No timesheets yet."), `<button class="lnk" style="font-size:12px" data-go="/me/time">Open My Timesheet →</button>`);
  } else if (tab === "leave") {
    const reqs = S.leaveRequests.filter((r) => r.employeeId === e.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    body = `<div class="grid g2"><section class="card pcard"><h2>Balances · 2026</h2>${bal.filter((b) => b.has || b.lt.code === "BANKED_OT").map((b) => `<div class="dline"><div class="form-row" style="justify-content:space-between"><b><span class="sq" style="background:${esc(b.lt.color || "#17566b")}"></span> ${esc(b.lt.name)}</b><span class="num"><strong>${hrs(b.ent - b.used)} h</strong></span></div><span class="hint">${hrs(b.used)} used of ${hrs(b.ent)}</span></div>`).join("")}<button class="btn pri" style="margin-top:12px;border-radius:999px" data-go="/me/time-off">Request time off</button></section>
      <section class="card pcard"><h2>Requests</h2>${reqs.map((r) => `<div class="row" style="padding:9px 0;border-top:1px solid var(--border)"><div class="grow"><div style="font-size:13.5px;font-weight:500">${esc(dLong(r.startDate))}${r.endDate !== r.startDate ? ` → ${esc(dLong(r.endDate))}` : ""}</div><div class="hint">${esc(byId(S.leaveTypes, r.leaveTypeId)?.name)} · ${hrs(r.totalHours)} h</div>${fileChips("LeaveRequest", r.id)}</div>${badge(r.status)}</div>`).join("") || empty("No time off requested yet")}</section></div>`;
  } else if (tab === "documents") {
    const docs = S.documents.filter((d) => d.employeeId === e.id);
    const att = (S.files || []).filter((f) => f.employeeId === e.id);
    body = `<section class="card pcard"><h2>Documents</h2>${docs.map((d) => `<div class="row" style="padding:9px 0;border-top:1px solid var(--border)"><span>📄</span><div class="grow">${esc(d.title)}<div class="hint">${esc(d.category || "")}</div></div></div>`).join("")}${att.map((f) => `<div class="row" style="padding:9px 0;border-top:1px solid var(--border)"><span>📎</span><div class="grow"><button class="lnk" data-a="openFile" data-id="${f.id}">${esc(f.fileName)}</button><div class="hint">Attached to a ${esc(f.entityType.replace(/([A-Z])/g, " $1").trim().toLowerCase())} · ${esc(dTime(f.createdAt))}</div></div></div>`).join("")}${docs.length + att.length ? "" : empty("Nothing filed for you yet")}</section>`;
  } else if (tab === "onboarding") {
    const ts = S.onboardingTasks.filter((t) => t.employeeId === e.id).sort((a, b) => a.sortOrder - b.sortOrder);
    const dn = ts.filter((t) => t.status === "COMPLETE").length;
    body = `<section class="card pcard"><div class="form-row" style="justify-content:space-between"><h2 style="margin:0">Onboarding</h2><span class="hint">${dn} of ${ts.length} done</span></div><div class="bar" style="margin:10px 0 14px"><i style="width:${ts.length ? (dn / ts.length) * 100 : 0}%;background:#3e6b34"></i></div>${ts.map((t) => `<div class="obt ${t.status === "COMPLETE" ? "done" : ""}"><span>${t.status === "COMPLETE" ? "✓" : ""}</span><div><b>${esc(t.title)}</b><small>${esc(t.assigneeRole)}${t.dueDate ? ` · due ${esc(dLong(t.dueDate))}` : ""}</small></div></div>`).join("") || empty("No onboarding checklist on file")}</section>`;
  } else {
    const rows = S.audit.filter((x) => (x.entityType === "Employee" && x.entityId === e.id) || x.actorName === A.user.displayName).slice(-40).reverse();
    body = `<section class="card pcard"><h2>History</h2><p class="hint">Changes to your record and things you did here, newest first.</p>${rows.map((x) => `<div style="padding:9px 0;border-top:1px solid var(--border);font-size:13.5px">${esc(x.summary)}<div class="hint">${esc(dTime(x.at))} · ${esc(x.actorName)}</div></div>`).join("") || empty("Nothing recorded yet")}</section>`;
  }
  parts.push(body);
  }
  return head + parts.join('<div style="height:14px"></div>');
}
function vBenefits() {
  const head = pillNav("My profile", PROFILE_PILLS, "/me/profile/benefits") + bigTitle("Pension & Benefits", "The group plans you're enrolled in, what comes off each pay, and what your employer adds on top.");
  const e = A.employee;
  if (!e) return head + card("", empty("This account isn't linked to an employee"));
  const CAT = { HEALTH: ["Extended health", "🩺"], DENTAL: ["Dental", "🦷"], LIFE: ["Life insurance", "🛡️"], DISABILITY: ["Disability", "🤝"], RRSP: ["Retirement savings", "🌱"], OTHER: ["Other", "✨"] };
  const mine = S.benefits.filter((b) => b.employeeId === e.id && (!b.endDate || b.endDate >= todayStr())).map((b) => ({ b, p: byId(S.benefitPlans, b.planId) })).filter((x) => x.p);
  const inIt = new Set(mine.map((x) => x.p.id));
  const you = mine.reduce((s, x) => s + (x.b.employeeCostCentsOverride ?? x.p.employeeCostCentsPerPay), 0), them = mine.reduce((s, x) => s + (x.b.employerCostCentsOverride ?? x.p.employerCostCentsPerPay), 0);
  const others = S.benefitPlans.filter((p) => p.isActive !== false && !inIt.has(p.id) && (!p.companyId || p.companyId === e.companyId));
  return head + `<div class="stats">${stat("Plans you're in", String(mine.length))}${stat("You pay each pay", money(you))}${stat("Your employer adds", money(them), "", "good")}</div>`
    + `<div class="grid g3">${mine.map(({ b, p }) => { const c = CAT[p.category] || CAT.OTHER; return `<section class="card pcard"><div class="row"><span style="font-size:24px" aria-hidden>${c[1]}</span><div><b style="font-size:15px">${esc(p.name)}</b><div class="hint">${c[0]}${p.taxableBenefit ? " · taxable benefit" : ""}</div></div></div><div class="grid g2" style="margin-top:12px;font-size:13px"><div><span class="hint">You pay / pay</span><div class="num"><strong>${money(b.employeeCostCentsOverride ?? p.employeeCostCentsPerPay)}</strong></div></div><div><span class="hint">Employer / pay</span><div class="num"><strong>${money(b.employerCostCentsOverride ?? p.employerCostCentsPerPay)}</strong></div></div></div><span class="badge tone-green" style="margin-top:10px">Covered since ${esc(dLong(b.effectiveDate))}</span></section>`; }).join("") || card("", empty("You're not enrolled in any group plans yet", "HR enrols you after your waiting period."))}</div>`
    + (others.length ? card("Other plans offered", others.map((p) => `<div class="row" style="justify-content:space-between;padding:8px 0;border-top:1px solid var(--border);font-size:13.5px"><span>${(CAT[p.category] || CAT.OTHER)[1]} ${esc(p.name)}</span><span class="hint">${money(p.employeeCostCentsPerPay)} / pay · ask HR to enrol</span></div>`).join("")) : "");
}
const EVENT_K = { holiday: ["Stat holiday", "var(--c2)", "🎉"], payday: ["Payday", "var(--c3)", "💵"], anniversary: ["Work anniversary", "var(--c1)", "🎂"], timeoff: ["Team time off", "var(--c4)", "🌲"], company: ["Company event", "var(--c6)", "📣"] };
/** what's coming up for the signed-in person: holidays, paydays, anniversaries, team time off, organization events */
function upcomingEventsA(days = 90) {
  const today = todayStr(), until = addDays(today, days), e = A.employee;
  const ev = [];
  for (const h of S.statHolidays) if (h.date >= today && h.date <= until) ev.push({ at: h.date, t: h.name, d: "Office closed · paid stat day", k: "holiday" });
  const runs = S.payrollRuns.filter((r) => r.payDate >= today && r.payDate <= until && r.status !== "CANCELLED" && (!e || r.companyId === e.companyId));
  for (const r of runs) ev.push({ at: r.payDate, t: "Payday", d: `Pay period ending ${dLong(r.periodEnd)}`, k: "payday" });
  if (!runs.length) for (let d = "2026-01-16"; d <= until; d = addDays(d, 14)) if (d >= today) ev.push({ at: d, t: "Payday", d: "Biweekly pay", k: "payday" });
  if (e) {
    for (const c of S.employees.filter((x) => x.companyId === e.companyId && ["ACTIVE", "ON_LEAVE", "ONBOARDING"].includes(x.status))) { let at = today.slice(0, 4) + c.startDate.slice(4); if (at < today) at = String(Number(today.slice(0, 4)) + 1) + c.startDate.slice(4); const y = Number(at.slice(0, 4)) - Number(c.startDate.slice(0, 4)); if (y >= 1 && at <= until) ev.push({ at, t: `${empName(c)} — ${y} year${y === 1 ? "" : "s"}`, k: "anniversary" }); }
    for (const l of S.leaveRequests.filter((r) => r.status === "APPROVED" && r.endDate >= today && r.startDate <= until && byId(S.employees, r.employeeId)?.departmentId === e.departmentId)) ev.push({ at: l.startDate < today ? today : l.startDate, t: `${empName(byId(S.employees, l.employeeId))} is away`, d: `${byId(S.leaveTypes, l.leaveTypeId)?.name} until ${dLong(l.endDate)}`, k: "timeoff" });
  }
  const y = today.slice(0, 4);
  for (const [md, t, d] of [["10-22", "All-staff town hall", "Great hall · 10:00 and online"], ["11-13", "Benefits open enrolment closes", "Changes take effect Jan 1"], ["12-12", "Holiday gathering", "Families welcome"]]) { const at = `${y}-${md}`; if (at >= today && at <= until) ev.push({ at, t, d, k: "company" }); }
  return ev.sort((a, b) => (a.at < b.at ? -1 : 1));
}
function vEvents() {
  const head = pillNav("My profile", PROFILE_PILLS, "/me/profile/events") + bigTitle("Events", "The next 90 days: stat holidays, paydays, who on your team is away, work anniversaries and organization events.");
  const K = EVENT_K, ev = upcomingEventsA(90);
  const months = new Map(); for (const x of ev) { const k = new Date(x.at + "T12:00:00Z").toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }); months.set(k, [...(months.get(k) || []), x]); }
  return head + `<div class="form-row" style="margin-bottom:14px">${Object.values(K).map(([l, c]) => `<span class="chip"><span class="sq" style="background:${c};border-radius:50%"></span>${l}</span>`).join("")}</div>`
    + ([...months].map(([m, list]) => `<div class="sect-l">${esc(m)}</div><div class="grid g2">${list.map((x) => { const dt = new Date(x.at + "T12:00:00Z"); return `<div class="evc"><div class="evd"><small>${dt.toLocaleDateString("en-CA", { weekday: "short", timeZone: "UTC" }).toUpperCase()}</small><b style="color:${K[x.k][1]}">${dt.getUTCDate()}</b></div><div><div style="font-weight:500">${K[x.k][2]} ${esc(x.t)}</div><div class="hint">${K[x.k][0]}${x.d ? ` · ${esc(x.d)}` : ""}</div></div></div>`; }).join("")}</div>`).join("") || card("", empty("Nothing in the next 90 days")));
}

/* ---------------- HR: status + pay change on the employee record ---------------- */
function hrEmployeeControls(e) {
  if (!can(A, "hr.employees.edit")) return "";
  const inactive = ["INACTIVE", "TERMINATED"].includes(e.status);
  const comp = latestComp(e.id);
  return `<div class="grid g2" style="margin-top:14px">${card("Status", `<p class="hint" style="margin-top:0">${inactive ? "This person is switched off: no sign-in, left off the directory, org chart and new payroll runs." : "Deactivate someone who has left, is on a long absence or a seasonal break. Their sign-in is turned off too."}</p><button class="btn ${inactive ? "pri" : "danger"}" data-a="empActive" data-id="${e.id}" data-on="${inactive ? 1 : 0}">${inactive ? "Activate" : "Deactivate"}</button>`)}
    ${card("Change salary or rate", `<form data-f="salary" data-id="${e.id}" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <div class="fld"><label for="salEff">Starts on</label><input class="in" type="date" id="salEff" name="effectiveDate" required></div>
      <div class="fld"><label for="salType">Pay type</label><select class="in" id="salType" name="payType">${opt("SALARY", "Salaried (per year)", comp?.payType !== "HOURLY")}${opt("HOURLY", "Hourly", comp?.payType === "HOURLY")}</select></div>
      <div class="fld"><label for="salAmt">New amount ($)</label><input class="in num" style="text-align:right" id="salAmt" name="amount" inputmode="decimal" required placeholder="${comp?.payType === "HOURLY" ? "e.g. 31.50" : "e.g. 72000"}"></div>
      <div class="fld"><label for="salFreq">Pay schedule</label><select class="in" id="salFreq" name="payFrequency">${[["WEEKLY", "Weekly"], ["BIWEEKLY", "Biweekly"], ["SEMI_MONTHLY", "Semi-monthly"], ["MONTHLY", "Monthly"]].map(([k, l]) => opt(k, l, (comp?.payFrequency || "BIWEEKLY") === k)).join("")}</select></div>
      <div class="fld" style="grid-column:1/-1"><label for="salWhy">Reason</label><input class="in" id="salWhy" name="reason" placeholder="e.g. Annual review 3%, promotion"></div>
      <label class="form-row" style="grid-column:1/-1;font-size:13px"><input type="checkbox" name="overtimeEligible" ${comp?.overtimeEligible ? "checked" : ""}> Overtime eligible</label>
      <div class="form-row" style="grid-column:1/-1;justify-content:space-between"><span class="hint">Saved to pay history and the audit log; payroll uses it from the start date.</span><button class="btn pri">Save pay change</button></div></form>
      ${S.compensations.filter((c) => c.employeeId === e.id).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1)).map((c) => `<div class="row" style="justify-content:space-between;padding:7px 0;border-top:1px solid var(--border);font-size:12.5px"><span>${esc(dLong(c.effectiveDate))} · ${esc(c.changeReason || "Change")}</span><span class="num"><strong>${c.payType === "HOURLY" ? `${money(c.hourlyRateCents)}/h` : `${money(c.annualSalaryCents)}/yr`}</strong></span></div>`).join("")}`)}</div>`;
}

/* ---------------- timesheets in the Approvals inbox ---------------- */
function tsApprovalCards(back = "/approvals") {
  return myTimesheetsToApprove().map((s) => { const e = byId(S.employees, s.employeeId); const paid = s.workedHours + s.statHours + s.vacationHours + s.sickHours + s.personalHours + s.otherLeaveHours; const mgr = e.managerId ? byId(S.employees, e.managerId) : null;
    return `<section class="card"><div class="row" style="align-items:flex-start"><span class="sq" style="width:10px;height:10px;margin-top:5px;background:${esc(co(e.companyId).colorTag)}"></span><div class="grow"><div class="t1"><span class="kind" style="background:var(--info-bg);color:var(--info);border-radius:4px;padding:1px 6px">TIMESHEET</span>${esc(empName(e))} · ${esc(periodLabel(s.periodStart, s.periodEnd))}</div>
      <div class="t2">${esc(co(e.companyId).displayName)} · sent ${esc(ago(s.submittedAt || s.periodEnd))} · <strong>${s.isMyReport ? "your team" : `HR approval${mgr ? ` (manager: ${esc(empName(mgr))})` : ""}`}</strong></div>
      <div class="t2">Worked <strong>${hrs(s.workedHours)}</strong>${s.statHours ? ` · stat <strong>${hrs(s.statHours)}</strong>` : ""}${s.vacationHours ? ` · vacation <strong>${hrs(s.vacationHours)}</strong>` : ""}${s.sickHours ? ` · sick <strong>${hrs(s.sickHours)}</strong>` : ""}${s.personalHours ? ` · personal <strong>${hrs(s.personalHours)}</strong>` : ""} · total <strong>${hrs(paid)}</strong></div></div></div>
      <form class="row" data-f="tsDecide" data-id="${s.id}" style="background:var(--thead);border-radius:0 0 var(--r) var(--r)"><button type="button" class="btn sm" data-go="/hr/timesheets/${s.id}?back=${encodeURIComponent(back)}">View full timesheet</button><input class="in" name="reason" placeholder="Note if sending back…" aria-label="Reason" style="flex:1;min-width:150px;height:32px"><button class="btn ok sm" data-dec="APPROVED">Approve</button><button class="btn sm danger" data-dec="REJECTED">Send back</button></form></section>`; }).join("");
}

/* ---------------- Timesheet Status (HR / payroll) ---------------- */
function recentPeriodsA(n = 8) { const cur = periodStartFor(todayStr()); return Array.from({ length: n }, (_, i) => { const s = addDays(cur, -14 * i); return { s, e: periodEndFor(s) }; }); }
function vTimesheetStatus() {
  const periods = recentPeriodsA();
  const chosen = periods.find((p) => p.s === UI.filters.tsPeriod) || periods[1];
  const rows = periodStatusRows(S, A, chosen.s);
  const done = rows.filter((r) => tsDone(r.status)).length, all = rows.length > 0 && done === rows.length;
  const show = UI.tabs.tss || "";
  const shown = show ? rows.filter((r) => (show === "todo" ? !tsDone(r.status) : r.status === show)) : rows;
  const cnt = (s) => rows.filter((r) => r.status === s).length;
  const paid = (x) => x.workedHours + x.statHours + x.vacationHours + x.sickHours + x.personalHours + x.otherLeaveHours;
  return ph("Timesheet Status", "Whose timesheet is where for the pay period. When every sheet is approved you can download the hours report for payroll.", `<select class="in" style="height:36px" data-a="tsPeriod" aria-label="Pay period">${periods.map((p, i) => opt(p.s, `${periodLabel(p.s, p.e)}${i === 0 ? " (current)" : ""}`, p.s === chosen.s)).join("")}</select>`) + flashHtml()
    + `<section class="card" style="padding:18px;margin-bottom:14px"><div class="form-row" style="justify-content:space-between;align-items:center"><div style="flex:1;min-width:240px"><div class="hint">${esc(periodLabel(chosen.s, chosen.e))}</div><div style="font-size:22px;font-weight:600">${done} of ${rows.length} approved</div><div class="bar" style="margin-top:8px"><i style="width:${rows.length ? (done / rows.length) * 100 : 0}%;background:#3e6b34"></i></div></div>
      <div class="form-row">${all ? "" : `<button class="btn" style="border-radius:999px" data-a="tsRemind" data-p="${chosen.s}">Remind people who haven't sent theirs</button>`}${all ? dlButton("timesheet-period", "Download hours report", { arg: chosen.s }) : `<span class="badge tone-grey" style="padding:8px 14px" title="Every timesheet for the period has to be approved first">⬇ Report unlocks when all ${rows.length} are approved</span>`}</div></div></section>`
    + tabs("tss", [["", "All", rows.length], ["todo", "Still to approve", rows.length - done], ...["NOT_STARTED", "DRAFT", "REJECTED", "SUBMITTED", "APPROVED", "LOCKED"].filter((s) => cnt(s)).map((s) => [s, TS_LABEL[s], cnt(s)])], show)
    + cardFlush("", table(["Employee", "Department", "Manager", "Status", ">Worked", ">Leave + stat", ">Paid hours", "Sent / approved"], shown.map(({ e, sheet: x, status }) => `<tr><td><strong>${esc(empName(e))}</strong><div class="hint">${coTag(e.companyId)} <span class="mono">${esc(e.employeeNumber)}</span></div></td><td>${esc(byId(S.departments, e.departmentId)?.name || "—")}</td><td>${e.managerId ? esc(empName(byId(S.employees, e.managerId))) : "—"}</td><td>${status === "NOT_STARTED" ? `<span class="badge tone-grey">Not started</span>` : badge(status)}</td>${td(x ? hrs(x.workedHours) : "—", 1)}${td(x ? hrs(x.statHours + x.vacationHours + x.sickHours + x.personalHours + x.otherLeaveHours) : "—", 1)}${td(x ? `<strong>${hrs(paid(x))}</strong>` : "—", 1)}<td class="hint">${x?.approvedByName ? `✓ ${esc(x.approvedByName)} · ${esc(dTime(x.approvedAt))}` : x?.submittedAt ? `sent ${esc(dTime(x.submittedAt))}` : status === "REJECTED" ? esc(x?.rejectedReason || "sent back") : "—"}</td></tr>`), "Nobody in this group."))
    + `<p class="hint">Managers approve their team's sheets in Approvals; HR can approve anyone's there too.</p>`;
}
function timesheetReportRows(start) {
  const rows = periodStatusRows(S, A, start);
  if (!rows.length || rows.some((r) => !tsDone(r.status))) { toast("Not yet", "Every timesheet for the period has to be approved first.", "err"); return null; }
  const h = (v) => (Number(v) || 0).toFixed(2);
  return { base: `haico-timesheets-${start}`, title: "Timesheet hours report", rows: [["Pay period start", "Pay period end", "Company", "Employee #", "Name", "Department", "Manager", "Status", "Approved by", "Approved at", "Worked", "Overtime 1.5x", "Double time", "Stat", "Vacation", "Sick", "Personal", "Other leave", "Banked OT", "Total paid hours"],
    ...rows.map(({ e, sheet: x }) => [start, periodEndFor(start), co(e.companyId).displayName, e.employeeNumber, empName(e), byId(S.departments, e.departmentId)?.name, e.managerId ? empName(byId(S.employees, e.managerId)) : "", TS_LABEL[x.status], x.approvedByName, (x.approvedAt || "").replace("T", " ").slice(0, 16), h(x.workedHours), h(x.overtimeHours), h(x.doubleOtHours), h(x.statHours), h(x.vacationHours), h(x.sickHours), h(x.personalHours), h(x.otherLeaveHours), h(x.bankedOtHours), h(x.workedHours + x.statHours + x.vacationHours + x.sickHours + x.personalHours + x.otherLeaveHours)])] };
}

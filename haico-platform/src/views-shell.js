/* ==========================================================================
   views-shell.js — the look switcher (5 looks x light/dark), approval
   categories shared by Home and Approvals, and the read-only timesheet view
   (/hr/timesheets/:id) with Approve / Send back for whoever may decide it.
   ========================================================================== */

/* ---------------- looks (A's five looks and tokens; chooser screen laid out like B's) ---------------- */
/** swatches are the light-mode background · sidebar accent · action colours, shown in the menu only */
const LOOKS = [
  ["cedar", "Cedar Classic", "Warm sand, serif headings", ["#f7f3ec", "#a03c28", "#3e6b34"]],
  ["harbour", "Harbour Slate", "Cool slate and teal", ["#f4f6f7", "#17566b", "#4f95ab"]],
  ["navy", "Boardroom Navy", "White and navy, crisp", ["#ffffff", "#1f3a75", "#5d7fc4"]],
  ["moss", "Moss & Stone", "Stone greys and moss green", ["#f2f1ec", "#3f6b35", "#9bb87d"]],
  ["graphite", "Graphite Compact", "Neutral greys, dense tables", ["#f1f1f2", "#1c1c1e", "#a03c28"]],
];
function lookPanel() {
  const cur = LOOKS.some((l) => l[0] === UI.look) ? UI.look : "cedar";
  const mode = UI.theme === "dark" || UI.theme === "light" ? UI.theme : "system";
  return `<div class="pop lookpop" role="menu" aria-label="Look"><h4>Look</h4>${LOOKS.map(([id, label, hint, sw]) => `<button role="menuitemradio" aria-checked="${id === cur}" class="${id === cur ? "on" : ""}" data-a="setLook" data-v="${id}"><span class="sws" aria-hidden="true">${sw.map((c) => `<i style="background:${c}"></i>`).join("")}</span><span style="min-width:0"><b>${esc(label)}</b><small>${esc(hint)}</small></span>${id === cur ? icon("tick") : ""}</button>`).join("")}
    <div class="modes" role="group" aria-label="Light or dark">${[["light", "Light"], ["dark", "Dark"], ["system", "Device"]].map(([k, l]) => `<button class="${mode === k ? "on" : ""}" data-a="setMode" data-v="${k}" aria-pressed="${mode === k}">${l}</button>`).join("")}</div>
    <div class="modes" style="border-top:0;padding-top:2px"><button data-go="/me/looks" style="justify-content:center">See all looks →</button></div></div>`;
}
/** the look's own tokens, read from the stylesheet (so the preview cards use exactly A's design tokens, never a second copy) */
function lookTokens(id, dark) {
  const want = id === "cedar" ? (dark ? ':root[data-theme="dark"]' : ":root") : (dark ? `:root[data-look="${id}"][data-theme="dark"]` : `:root[data-look="${id}"]`);
  const keys = ["--bg", "--card", "--border", "--fg", "--muted-fg", "--muted", "--primary", "--action", "--side", "--side-fg", "--side-border", "--side-pri", "--cedar", "--ocean", "--moss", "--ochre"];
  const out = {};
  const grab = (rule) => { for (const k of keys) { const v = rule.style.getPropertyValue(k).trim(); if (v && out[k] == null) out[k] = v; } };
  try {
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; }
      for (const r of rules) { if (r.selectorText === want) grab(r); } }
    if (id !== "cedar" || dark) { const base = lookTokens._base || (lookTokens._base = lookTokens("cedar", false)); for (const k of keys) if (out[k] == null) out[k] = base[k]; }
  } catch { /* no stylesheet access */ }
  return out;
}
const lookIsDark = () => UI.theme === "dark" || (UI.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
function lookCard(l, dark) {
  const [id, name, blurb] = l, c = lookTokens(id, dark), on = (LOOKS.some((x) => x[0] === UI.look) ? UI.look : "cedar") === id;
  const v = (k, fb) => c[k] || c[fb] || "transparent";
  return `<button class="lookc ${on ? "on" : ""}" data-a="setLook" data-v="${id}" data-stay="1" aria-pressed="${on}">
    <span class="lookp" style="background:${v("--bg")};border-color:${v("--border")}"><span class="lp-side" style="background:${v("--side", "--card")};border-color:${v("--side-border", "--border")}"><i style="background:${v("--side-fg", "--fg")}"></i><i style="background:${v("--side-pri", "--primary")}"></i><i style="background:${v("--side-fg", "--fg")}"></i><i style="background:${v("--side-fg", "--fg")}"></i></span>
      <span class="lp-main"><span class="lp-card" style="background:${v("--card")};border-color:${v("--border")}"><i style="background:${v("--fg")}"></i><i style="background:${v("--muted-fg")}"></i><span class="lp-row"><b style="background:${v("--action", "--primary")}"></b><b style="background:${v("--card")};border:1px solid ${v("--border")}"></b></span></span>
      <span class="lp-card" style="background:${v("--card")};border-color:${v("--border")};justify-content:center"><span class="lp-sw" aria-hidden="true"><i style="background:${v("--cedar")}"></i><i style="background:${v("--ocean")}"></i><i style="background:${v("--moss")}"></i><i style="background:${v("--ochre")}"></i></span></span></span></span>
    <b>${esc(name)}${on ? ` <span class="badge tone-green">In use</span>` : ""}</b><small>${esc(blurb)}</small></button>`;
}
/** /me/looks — the five looks as preview cards, light / dark / device underneath (B's chooser screen, A's looks) */
function vLooks() {
  const dark = lookIsDark(), mode = UI.theme === "dark" || UI.theme === "light" ? UI.theme : "system";
  return ph("Choose a look", "Five styles, each in light and dark. Your pick is saved on this device, for you only — everyone else keeps theirs.")
    + flashHtml()
    + card("", `<div class="looks">${LOOKS.map((l) => lookCard(l, dark)).join("")}</div>
      <div class="form-row" style="justify-content:space-between;margin-top:16px;flex-wrap:wrap"><div class="seg" role="group" aria-label="Light or dark">${[["light", "Light"], ["dark", "Dark"], ["system", "Follow my device"]].map(([k, l]) => `<button class="${mode === k ? "on" : ""}" data-a="setMode" data-v="${k}" aria-pressed="${mode === k}">${l}</button>`).join("")}</div><span class="hint">The palette button in the top bar switches looks from any page.</span></div>`);
}
route("/me/looks", null, vLooks);
window.ACTIONS_EXT.push({
  lookMenu() { UI.pop = UI.pop === "look" ? null : "look"; safeRender(); },
  setLook(el) { UI.look = el.dataset.v; UI.pop = null; applyTheme(); savePrefs(); safeRender(); if (el.dataset.stay) toast("Look changed", `${LOOKS.find((l) => l[0] === UI.look)?.[1] || UI.look} — only on this device.`, "ok"); },
  setMode(el) { UI.theme = el.dataset.v; applyTheme(); savePrefs(); safeRender(); },
});

/* ---------------- global search (top bar, "/" anywhere): people, requests, bills, invoices, POs, projects, tasks, vendors, customers, guides, pages ---------------- */
function searchResults(q) {
  const t = String(q || "").trim().toLowerCase();
  if (t.length < 2) return [];
  const ids = scopeIds(S, A), hit = (s) => String(s || "").toLowerCase().includes(t), out = [];
  const push = (group, items) => { if (items.length) out.push([group, items.slice(0, 6)]); };
  const st = (s) => (STATUS[s] || [s])[0];
  const me = A.employee?.id;
  const pages = [];
  for (const g of buildNav()) for (const i of g.items) { if (hit(i.title) || hit(g.label)) pages.push({ t: i.title, s: g.label === "Home" ? "Page" : g.label, go: i.href }); const sec = SECTION_BY_KEY[i.section]; if (sec) for (const tb of visibleTabs(sec)) if (tb.href !== i.href && hit(tb.label)) pages.push({ t: tb.label, s: i.title, go: tb.href }); }
  push("Pages", pages);
  push("People", S.employees.filter((e) => ids.includes(e.companyId) && e.status !== "TERMINATED" && (hit(empName(e)) || hit(e.employeeNumber) || hit(byId(S.positions, e.positionId)?.title))).map((e) => ({ t: empName(e), s: `${byId(S.positions, e.positionId)?.title || ""} · ${co(e.companyId)?.displayName || ""}`, go: can(A, "hr.employees.view") ? `/hr/employees/${e.id}` : "/people/directory" })));
  // requests: mine, my team's (manager), everyone's for the people who work them
  const reqOk = (r) => r.employeeId === me || seesMoneyRequests() || can(A, "hr.employees.view") || (!!me && byId(S.employees, r.employeeId)?.managerId === me);
  push("Requests", (S.requests || []).filter((r) => ids.includes(r.companyId) && reqOk(r) && (hit(r.title) || hit(r.requestNumber) || hit(requestTypeLabel(r.type)))).map((r) => ({ t: `${r.requestNumber} — ${r.title}`, s: `${requestTypeLabel(r.type)} · ${empName(byId(S.employees, r.employeeId))} · ${st(r.status)}`, go: `/me/requests/${r.id}` })));
  push("Time off", S.leaveRequests.filter((r) => ids.includes(r.companyId) && (r.employeeId === me || can(A, "leave.view")) && (hit(byId(S.leaveTypes, r.leaveTypeId)?.name) || hit(empName(byId(S.employees, r.employeeId))) || hit(r.notes))).map((r) => ({ t: `${empName(byId(S.employees, r.employeeId))} · ${byId(S.leaveTypes, r.leaveTypeId)?.name || "Time off"}`, s: `${dLong(r.startDate)}${r.endDate !== r.startDate ? " → " + dLong(r.endDate) : ""} · ${st(r.status)}`, go: r.employeeId === me ? "/me/time-off" : "/hr/leave" })));
  if (can(A, "ap.view")) {
    push("Vendors", S.vendors.filter((v) => ids.includes(v.companyId) && (hit(v.name) || hit(v.vendorNumber))).map((v) => ({ t: v.name, s: `${v.vendorNumber || ""} · ${co(v.companyId)?.displayName || ""}`, go: `/finance/ap/vendors/${v.id}` })));
    push("Vendor bills", S.apInvoices.filter((i) => ids.includes(i.companyId) && (hit(i.invoiceNumber) || hit(byId(S.vendors, i.vendorId)?.name) || hit(i.description))).map((i) => ({ t: `Bill ${i.invoiceNumber} — ${byId(S.vendors, i.vendorId)?.name || ""}`, s: `${money(i.totalCents)} · ${st(i.status)} · due ${dLong(i.dueDate)}`, go: `/finance/ap/${i.id}` })));
  }
  if (can(A, "ar.view")) {
    push("Customers", S.customers.filter((c) => ids.includes(c.companyId) && (hit(c.name) || hit(c.customerNumber))).map((c) => ({ t: c.name, s: `${c.customerNumber || ""} · ${co(c.companyId)?.displayName || ""}`, go: "/finance/ar" })));
    push("Customer invoices", S.arInvoices.filter((i) => ids.includes(i.companyId) && (hit(i.invoiceNumber) || hit(byId(S.customers, i.customerId)?.name) || hit(i.memo))).map((i) => ({ t: `Invoice ${i.invoiceNumber} — ${byId(S.customers, i.customerId)?.name || ""}`, s: `${money(i.totalCents)} · ${st(i.status)}`, go: "/finance/ar" })));
  }
  if (can(A, "procurement.view")) push("Purchase orders", (S.purchaseOrders || []).filter((p) => ids.includes(p.companyId) && (hit(p.poNumber) || hit(p.vendorName) || hit(p.description))).map((p) => ({ t: `${p.poNumber} — ${p.vendorName || byId(S.vendors, p.vendorId)?.name || ""}`, s: `${money(p.totalCents || p.amountCents || 0)} · ${st(p.status)}`, go: "/procurement/pos" })));
  if (can(A, "projects.view")) push("Projects", S.projects.filter((p) => ids.includes(p.companyId) && (hit(p.code) || hit(p.name))).map((p) => ({ t: `${p.code} · ${p.name}`, s: `${co(p.companyId)?.displayName || ""} · ${st(p.status)}`, go: `/projects/${p.id}` })));
  if (typeof teamScope === "function") push("Tasks", teamScope().filter((x) => hit(x.title) || hit(x.description)).map((x) => ({ t: x.title, s: `${TEAM_ST_LABEL[x.status] || x.status} · ${x.assigneeId ? empName(byId(S.employees, x.assigneeId)) : "Unassigned"}${x.dueDate ? ` · due ${dShort(x.dueDate)}` : ""}`, go: `/team/${x.id}` })));
  if (typeof HOWTO !== "undefined") push("How-to guides", HOWTO.flatMap((r) => r[4].map((g) => ({ role: r[1], g }))).filter(({ g }) => hit(g[1]) || hit(g[2])).map(({ role, g }) => ({ t: g[1], s: `How-to · ${role}`, go: "/help", topic: g[0] })));
  return out;
}
function searchResultsHtml(q) {
  if (String(q || "").trim().length < 2) return `<p class="hint" style="padding:10px 4px">Type at least two letters — a name, a bill or invoice number, a vendor, a project, a task…</p>`;
  const groups = searchResults(q);
  if (!groups.length) return `<p class="hint" style="padding:10px 4px">Nothing found for “${esc(q)}”. Try fewer letters, or part of a name.</p>`;
  let n = 0;
  return groups.map(([g, items]) => `<div class="srch-g">${esc(g)}</div>${items.map((x) => `<button class="srch-r ${n++ === 0 ? "sel" : ""}" data-go="${esc(x.go)}"${x.topic ? ` data-topic="${esc(x.topic)}"` : ""} role="option"><b>${esc(x.t)}</b><small>${esc(x.s || "")}</small></button>`).join("")}`).join("");
}
function searchModalHtml() {
  return `<div class="srch"><div class="srch-in">${icon("search")}<input id="srchq" class="in" placeholder="Search people, vendors, bills, invoices, projects, tasks, guides, pages…" aria-label="Search" autocomplete="off" value="${esc(UI.srchq || "")}"><button class="iconbtn" data-a="closeModal" aria-label="Close">✕</button></div><div id="srchres" class="srch-res" role="listbox" aria-label="Results">${searchResultsHtml(UI.srchq || "")}</div><p class="hint" style="margin:10px 2px 0">Press <kbd>/</kbd> anywhere to search, <kbd>Enter</kbd> opens the first result, <kbd>Esc</kbd> closes. Only what your role can open is shown.</p></div>`;
}
window.ACTIONS_EXT.push({
  searchOpen() { UI.modal = "SEARCH"; UI.pop = null; UI.modalWide = false; safeRender(); setTimeout(() => { const i = document.getElementById("srchq"); if (i) { i.focus(); i.select(); } }, 0); },
});
document.addEventListener("input", (ev) => { const el = ev.target; if (el.id === "srchq") { UI.srchq = el.value; const r = document.getElementById("srchres"); if (r) r.innerHTML = searchResultsHtml(el.value); } });
document.addEventListener("keydown", (ev) => {
  const el = ev.target, typing = el.closest?.("input, textarea, select, [contenteditable]");
  if (A && !UI.modal && ((ev.key === "/" && !typing) || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k"))) { ev.preventDefault(); ACTIONS.searchOpen(); return; }
  if (UI.modal === "SEARCH" && ev.key === "Enter" && el.id === "srchq") { const first = document.querySelector("#srchres .srch-r"); if (first) { ev.preventDefault(); first.click(); } }
});

/* ---------------- approval categories (Home "Needs your attention" + Approvals chips) ---------------- */
const APPROVAL_CATS = [["timeoff", "Time off", "calendar"], ["expenses", "Expenses & claims", "receipt"], ["purchases", "Purchases", "cart"], ["bills", "Bills", "filetext"], ["payroll", "Payroll", "banknote"], ["other", "Other", "inbox"]];
function approvalCat(inst) {
  switch (inst.entityType) {
    case "LeaveRequest": return "timeoff";
    case "ExpenseClaim": return "expenses";
    case "PurchaseRequest": case "PurchaseOrder": return "purchases";
    case "ApInvoice": return "bills";
    case "PayrollRun": return "payroll";
    case "EmployeeRequest": { const t = byId(S.requests, inst.entityId)?.type; return t === "CREDIT_CARD_PURCHASE" ? "purchases" : t === "TRAVEL_CLAIM" || t === "TRAVEL_REQUEST" ? "expenses" : "other"; }
    default: return "other";
  }
}

/* ---------------- one timesheet, read-only (+ decide) ---------------- */
const TS_BACKS = { "/approvals": "Back to Approvals", "/dashboard": "Back to Home", "/hr/timesheets": "Back to Timesheets", "/payroll/timesheet-status": "Back to Pay-period status", "/me/time": "Back to My Timesheet" };
function canDecideSheet(s) {
  if (!s || s.status !== "SUBMITTED") return false;
  const me = A.employee?.id, e = byId(S.employees, s.employeeId);
  if (!e || e.id === me || !canSee(A, s.companyId)) return false;
  return (!!me && e.managerId === me) || approvesAnyTimesheet();
}
function vTimesheetView(q, id) {
  const s = byId(S.timesheets, id);
  if (!s) return vNotFound();
  const e = byId(S.employees, s.employeeId), me = A.employee?.id;
  const isMine = !!me && s.employeeId === me, isManager = !!me && e?.managerId === me;
  if (!isMine && !isManager && !(can(A, "timesheets.view") && canSee(A, s.companyId))) return vDenied("timesheets.view");
  const back = q.back && TS_BACKS[q.back] ? q.back : isMine ? "/me/time" : can(A, "timesheets.view") ? "/hr/timesheets" : "/approvals";
  const rules = rulesOf(settingsFor(S, s.companyId));
  const entries = S.timesheetEntries.filter((x) => x.timesheetId === s.id).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const daily = new Map(); for (const x of entries) daily.set(x.date, (daily.get(x.date) || 0) + (x.workedHours || 0));
  const dayOt = (h) => Math.max(0, Math.min(h, rules.dailyDouble) - rules.dailyOt) + Math.max(0, h - rules.dailyDouble);
  const totOt = classifyOvertime([...daily].map(([date, hours]) => ({ date, hours })), rules);
  const firstOfDay = new Set(); const seen = new Set(); for (const x of entries) if (!seen.has(x.date)) { seen.add(x.date); firstOfDay.add(x.id); }
  const sum = (k) => entries.reduce((t, x) => t + (x[k] || 0), 0);
  const tot = { worked: sum("workedHours"), stat: sum("statHours"), vac: sum("vacationHours"), sick: sum("sickHours"), pers: sum("personalHours"), other: sum("otherLeaveHours"), banked: sum("bankedOtHours") };
  const paid = tot.worked + tot.stat + tot.vac + tot.sick + tot.pers + tot.other;
  const n = (v) => (v ? hrs(v) : "");
  const dep = (x) => [x.departmentId ? byId(S.departments, x.departmentId)?.name : null, x.projectId ? (() => { const p = byId(S.projects, x.projectId); return p ? `${p.code} · ${p.name}` : null; })() : null].filter(Boolean).join(" / ");
  const mgr = e?.managerId ? byId(S.employees, e.managerId) : null;
  const pos = e?.positionId ? byId(S.positions, e.positionId) : null;
  const department = e?.departmentId ? byId(S.departments, e.departmentId) : null;
  const name = empName(e);
  const rows = entries.map((x) => { const wd = new Date(x.date + "T12:00:00Z").getUTCDay(); const ot = firstOfDay.has(x.id) ? dayOt(daily.get(x.date) || 0) : 0;
    return `<tr class="${wd === 0 || wd === 6 ? "we" : ""}${x.statHours ? " tsd-stat" : ""}"><td style="white-space:nowrap">${esc(new Date(x.date + "T12:00:00Z").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }))}</td><td style="max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(dep(x))}">${esc(dep(x)) || '<span class="muted">—</span>'}${x.isAutoFilled ? ` <span class="autof" title="Filled in automatically from approved time off or a stat holiday">auto</span>` : ""}</td>${[x.workedHours, ot, x.statHours, x.vacationHours, x.sickHours, x.personalHours, x.otherLeaveHours, x.bankedOtHours].map((v) => `<td class="r num">${n(v)}</td>`).join("")}<td class="muted" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(x.notes || "")}">${esc(x.notes || "")}</td></tr>`; }).join("");
  const grid = `<div class="card" style="margin-bottom:6px"><div class="tw"><table class="t tsd" style="min-width:960px"><thead><tr><th>Date</th><th>Department / project</th>${["Worked", "OT", "Stat", "Vacation", "Sick", "Personal", "Other", "Banked"].map((h) => `<th class="r">${h}</th>`).join("")}<th>Notes</th></tr></thead><tbody>${rows || `<tr><td colspan="11" class="muted" style="text-align:center;padding:20px">No hours entered on this timesheet.</td></tr>`}</tbody>
    <tfoot><tr class="tot"><td colspan="2">Total</td>${[tot.worked, totOt.ot + totOt.dot, tot.stat, tot.vac, tot.sick, tot.pers, tot.other, tot.banked].map((v) => `<td class="r num">${hrs(v)}</td>`).join("")}<td class="hint" style="font-weight:400">Paid hours ${hrs(paid)}</td></tr></tfoot></table></div></div>
    <p class="hint" style="margin:0 0 16px">OT per day uses the daily rule (over ${rules.dailyOt} h; double over ${rules.dailyDouble} h). The total also counts weekly overtime over ${rules.weeklyOt} h${totOt.dot ? ` — ${hrs(totOt.dot)} h of it at double time` : ""}.</p>`;
  const label = periodLabel(s.periodStart, s.periodEnd);
  const trail = S.audit.filter((x) => x.module === "timesheets" && (x.action === "APPROVE" || x.action === "REJECT") && x.summary.includes(name) && x.summary.includes(label));
  const hist = [
    s.submittedAt ? `<li class="wrow"><b style="font-weight:600">Sent for approval</b> <span class="muted">· ${esc(dTime(s.submittedAt))}</span></li>` : "",
    ...trail.map((t) => `<li class="wrow"><b style="font-weight:600;${t.action === "REJECT" ? "color:var(--bad)" : ""}">${t.action === "APPROVE" ? "Approved" : "Sent back"}</b> <span class="muted">· ${esc(t.actorName || "")} · ${esc(dTime(t.at))}</span><div class="muted">${esc(t.summary)}</div></li>`),
    s.approvedByName && !trail.some((t) => t.action === "APPROVE") ? `<li class="wrow"><b style="font-weight:600">Approved</b> <span class="muted">· ${esc(s.approvedByName)}${s.approvedAt ? ` · ${esc(dTime(s.approvedAt))}` : ""}</span></li>` : "",
    s.status === "REJECTED" && s.rejectedReason ? `<li class="wrow"><b style="font-weight:600;color:var(--bad)">Reason sent back</b> <span class="muted">· “${esc(s.rejectedReason)}”</span></li>` : "",
    s.status === "LOCKED" || s.payrollRunId ? `<li class="wrow"><b style="font-weight:600">Included in a payroll run</b> <span class="muted">· locked</span></li>` : "",
  ].filter(Boolean);
  const decide = canDecideSheet(s)
    ? `<section class="hcard"><div class="hcard-h"><h2>Your decision</h2></div><form class="wform2" style="padding:12px 14px;margin:0" data-f="tsDecide" data-id="${s.id}" data-back="${esc(back)}"><input class="in" name="reason" placeholder="Note if sending back…" aria-label="Reason"><button class="btn ok" data-dec="APPROVED">Approve</button><button class="btn danger" data-dec="REJECTED">Send back</button></form><p class="hint" style="margin:0;padding:0 14px 12px">Approved hours go into the next payroll run. Sending back tells ${esc(e.firstName || name)} what to fix.</p></section>`
    : s.status === "SUBMITTED" && !isMine ? `<section class="hcard"><p class="empty-s">Waiting for ${mgr ? esc(empName(mgr)) : "the manager"} or HR to approve.</p></section>` : "";
  return `<div class="crumb">${crumb(back, TS_BACKS[back].replace(/^Back to /, ""))}</div>`
    + ph(`Timesheet · ${name}`, `${label} · ${co(s.companyId)?.displayName || ""}${department ? ` · ${department.name}` : ""}`, badge(s.status)) + flashHtml()
    + `<div class="card" style="margin-bottom:14px"><div class="card-b" style="padding:12px 16px"><div class="grid g4" style="font-size:12.5px">
        <div><div class="muted">Employee</div><div style="font-weight:600">${esc(name)}${e?.employeeNumber ? ` <span class="muted" style="font-weight:400">· #${esc(e.employeeNumber)}</span>` : ""}</div>${pos ? `<div class="muted">${esc(pos.title)}</div>` : ""}</div>
        <div><div class="muted">Manager</div><div style="font-weight:600">${mgr ? esc(empName(mgr)) : "—"}</div></div>
        <div><div class="muted">Sent for approval</div><div style="font-weight:600">${s.submittedAt ? esc(dTime(s.submittedAt)) : "Not sent yet"}</div></div>
        <div><div class="muted">Paid hours</div><div class="num" style="font-weight:700;font-size:15px">${hrs(paid)}</div></div></div></div></div>`
    + grid
    + `<div class="grid g2" style="align-items:start"><section class="hcard"><div class="hcard-h"><h2>Approval history</h2></div>${hist.length ? `<ul class="hlist" style="font-size:12.5px">${hist.join("")}</ul>` : `<p class="empty-s">Nothing yet — this timesheet hasn't been sent.</p>`}</section>${decide}</div>`;
}
route("/hr/timesheets/:id", () => !!A, vTimesheetView);
/** after deciding from the timesheet page, go back where the person came from */
window.FORMS_EXT.push({
  tsDecide(f, ev) {
    const dec = ev.submitter?.dataset.dec || "APPROVED"; const d = fd(f);
    const ok = act("timesheet.decide", { timesheetId: f.dataset.id, decision: dec, reason: d.reason }, dec === "APPROVED" ? "Timesheet approved." : "Timesheet sent back.");
    if (ok && f.dataset.back) { const msg = UI.flash; go(f.dataset.back); UI.flash = msg; safeRender(); }
  },
});

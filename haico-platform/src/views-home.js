/* ==========================================================================
   views-home.js — Home (greeting, quick actions, waiting on you with
   requests | timesheets side by side, coming up, recent history),
   History, everyday Reports with CSV, and How-to guides with screenshots
   ========================================================================== */

/* ---------------- history over the audit trail ---------------- */
const H_AREAS = {
  requests: ["Requests & approvals", "📨", ["requests", "approvals", "procurement", "finance.expenses"]],
  timeoff: ["Time off", "🌲", ["leave"]],
  timesheets: ["Timesheets", "🕒", ["timesheets"]],
  pay: ["Pay", "💵", ["payroll"]],
  people: ["People & files", "👥", ["hr", "documents"]],
  money: ["Money & books", "📒", ["finance.ap", "finance.ar", "finance.gl", "finance", "finance.periods", "banking", "interco", "projects"]],
  inventory: ["Inventory & selling", "📦", ["inventory", "sales"]],
  system: ["Sign-ins & settings", "⚙️", ["auth", "admin", "reports", "feedback"]],
};
const H_ICON = { SUBMIT: "📨", APPROVE: "✅", REJECT: "↩️", CREATE: "➕", UPDATE: "✏️", STATUS_CHANGE: "🔁", POST: "📒", ATTACH: "📎", EXPORT: "⬇️", LOGIN: "🔑", DELETE: "🗑️" };
const areaOfModule = (m) => Object.keys(H_AREAS).find((k) => H_AREAS[k][2].includes(m)) || null;
const myTeam = () => (A.employee ? S.employees.filter((e) => e.managerId === A.employee.id) : []);
function historyScopesA() {
  const s = [["me", "Just me"]];
  if (myTeam().length) s.push(["team", "My team"]);
  if (["audit.view", "reports.view", "hr.employees.view", "finance.view"].some((p) => can(A, p))) s.push(["all", "Everyone I can see"]);
  return s;
}
function historyRowsA(f = {}) {
  const scopes = historyScopesA().map((x) => x[0]);
  const scope = scopes.includes(f.scope) ? f.scope : "me";
  const myName = A.user.displayName, myEmp = A.employee ? empName(A.employee) : null;
  const team = myTeam().map(empName), ids = scopeIds(S, A);
  let rows = S.audit.filter((x) => {
    if (scope === "me") return x.actorName === myName || (myEmp && x.summary.includes(myEmp));
    if (scope === "team") return team.includes(x.actorName) || team.some((n) => x.summary.includes(n));
    return !x.companyId || ids.includes(x.companyId);
  });
  // pay changes are HR / payroll business: everyone else only sees their own
  if (!can(A, "payroll.view") && !can(A, "hr.employees.edit")) rows = rows.filter((x) => !(x.summary.includes("'s pay from") && !(myEmp && x.summary.includes(myEmp))));
  const counts = {}; for (const r of rows) { const a = areaOfModule(r.module); if (a) counts[a] = (counts[a] || 0) + 1; }
  if (f.area && H_AREAS[f.area]) rows = rows.filter((r) => H_AREAS[f.area][2].includes(r.module));
  const q = (f.q || "").trim().toLowerCase(), who = (f.who || "").trim().toLowerCase();
  if (q) rows = rows.filter((r) => r.summary.toLowerCase().includes(q));
  if (who) rows = rows.filter((r) => (r.actorName || "").toLowerCase().includes(who));
  if (f.from) rows = rows.filter((r) => r.at.slice(0, 10) >= f.from);
  if (f.to) rows = rows.filter((r) => r.at.slice(0, 10) <= f.to);
  rows = rows.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  return { rows, scope, counts };
}
const dayWord = (iso) => { const d = iso.slice(0, 10), t = todayStr(); if (d === t) return "Today"; if (d === addDays(t, -1)) return "Yesterday"; return new Date(d + "T12:00:00Z").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }); };
const clock = (iso) => new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
function historyLine(r) {
  const a = areaOfModule(r.module);
  return `<li><span class="hdot" aria-hidden>${H_ICON[r.action] || "•"}</span><div class="hbox"><div>${esc(r.summary)}</div><small>${esc(clock(r.at))} · ${esc(r.actorName || "System")}${a ? ` · ${H_AREAS[a][0]}` : ""}</small></div></li>`;
}
function vHistory(q = {}) {
  const f = UI.filters.hist || (UI.filters.hist = { scope: "me" });
  if (q.scope && q.scope !== f.lastQ) { f.scope = q.scope; f.lastQ = q.scope; }
  const { rows, scope, counts } = historyRowsA(f);
  const limit = f.limit || 60, shown = rows.slice(0, limit);
  const days = new Map(); for (const r of shown) { const k = dayWord(r.at); days.set(k, [...(days.get(k) || []), r]); }
  const seg = `<div class="seg">${historyScopesA().map(([k, l]) => `<button class="${scope === k ? "on" : ""}" data-a="histSet" data-k="scope" data-v="${k}">${l}</button>`).join("")}</div>`;
  const chips = `<div class="form-row" style="margin:10px 0">${[["", "Everything", null], ...Object.entries(H_AREAS).filter(([k]) => counts[k] || f.area === k).map(([k, v]) => [k, v[0], counts[k] || 0])].map(([k, l, n]) => `<button class="hchip ${(f.area || "") === k ? "on" : ""}" data-a="histSet" data-k="area" data-v="${k}">${esc(l)}${n != null ? ` <span>${n}</span>` : ""}</button>`).join("")}</div>`;
  return ph("History", "Everything that happened, in plain words — who asked, who approved, what changed and when. Nothing here can be edited.", `${helpBtn("history")}${dlButton("history", "Download this list", { variant: "outline" })}`) + flashHtml()
    + `<div class="form-row"><span class="hint" style="font-weight:600">Show</span>${seg}</div>${chips}`
    + `<form data-f="histSearch" class="hsearch"><input class="in" name="q" value="${esc(f.q || "")}" placeholder="Search words, e.g. vacation, TRV-2026, boots…" aria-label="Search"><input class="in" name="who" value="${esc(f.who || "")}" placeholder="Done by (name)" aria-label="Done by" style="max-width:190px"><label class="hint">From <input class="in" type="date" name="from" value="${esc(f.from || "")}"></label><label class="hint">To <input class="in" type="date" name="to" value="${esc(f.to || "")}"></label><button class="btn pri" style="border-radius:999px">Search</button>${f.q || f.who || f.from || f.to ? `<button type="button" class="lnk" data-a="histClear">Clear</button>` : ""}</form>`
    + `<p class="hint">${rows.length ? `${rows.length} ${rows.length === 1 ? "thing" : "things"} found${rows.length > shown.length ? ` — showing the latest ${shown.length}` : ""}.` : "Nothing matches — try “Everything” or a wider date range."}</p>`
    + [...days].map(([d, list]) => `<div class="sect-l">${esc(d)}</div><ol class="htl">${list.map(historyLine).join("")}</ol>`).join("")
    + (rows.length > shown.length ? `<div style="text-align:center;margin-top:14px"><button class="btn" style="border-radius:999px" data-a="histMore">Show more</button></div>` : "");
}

/* ---------------- Needs attention: approvals by type, my own to-dos, then the benchmark modules ---------------- */
function needsAttentionItems() {
  const out = [];
  const push = (key, ic, tone, title, detail, go, count) => out.push({ key, icon: ic, tone, title, detail, go, count });
  const n = (k, one, many) => (k === 1 ? one : many);
  // approvals waiting on me, one row per kind
  const sheets = myTimesheetsToApprove().length;
  if (sheets) push("appr-ts", "clock", "warn", `${sheets} timesheet${n(sheets, "", "s")} to approve`, "Your team's hours for the pay period", "/approvals?tab=timesheets", sheets);
  const counts = {}; for (const i of myActionable()) { const c = approvalCat(i); counts[c] = (counts[c] || 0) + 1; }
  for (const [k, l, ic] of APPROVAL_CATS) if (counts[k]) push(`appr-${k}`, ic, "warn", `${l}: ${counts[k]} waiting for your approval`, "Approve or decline in Approvals", `/approvals?type=${k}`, counts[k]);
  // my own timesheets, declined requests and tasks
  const e = A.employee;
  if (e) {
    const cad = settingsFor(S, e.companyId)?.timesheetCadence || "BIWEEKLY", today = todayStr();
    const curStart = periodStartFor(today, cad), curEnd = periodEndFor(curStart, cad);
    const prevStart = periodStartFor(addDays(curStart, -1), cad), prevEnd = periodEndFor(prevStart, cad);
    const mine = S.timesheets.filter((t) => t.employeeId === e.id);
    const statusOf = (st) => mine.find((t) => t.periodStart === st)?.status || "NOT_STARTED";
    const sent = (st) => ["SUBMITTED", "APPROVED", "LOCKED"].includes(st);
    for (const r of mine.filter((t) => t.status === "REJECTED").sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1)).slice(0, 3))
      push(`ts-ret-${r.periodStart}`, "undo", "bad", `Your timesheet for ${dShort(r.periodStart)} – ${dShort(r.periodEnd)} was sent back`, r.rejectedReason ? `“${r.rejectedReason}” — fix it and send it again` : "Fix it and send it again", "/me/time");
    const ps = statusOf(prevStart);
    if (!sent(ps) && ps !== "REJECTED") push("ts-prev", "clock", "bad", "Last period's timesheet isn't sent yet", `${dShort(prevStart)} – ${dShort(prevEnd)} · payroll needs it`, "/me/time");
    const cs = statusOf(curStart);
    if (!sent(cs) && cs !== "REJECTED") { const left = Math.round((D(curEnd) - D(today)) / MS_DAY) + 1; push("ts-cur", "clock", left <= 3 ? "warn" : "info", "This period's timesheet isn't sent yet", `${dShort(curStart)} – ${dShort(curEnd)} · ${left <= 0 ? "period has ended" : `${left} day${n(left, "", "s")} left`}`, "/me/time"); }
    const since = addDays(today, -14);
    const declined = statusRows(e.id).filter((r) => r.status === "REJECTED" && String(r.at || "").slice(0, 10) >= since).length;
    if (declined) push("req-declined", "undo", "warn", `${declined} of your requests ${n(declined, "was", "were")} declined recently`, "See why, and send a new one if needed", "/me/requests", declined);
    const soon = addDays(today, 3);
    const tasks = (S.tasks || []).filter((t) => t.assigneeId === e.id && t.status !== "DONE" && t.dueDate && t.dueDate <= soon).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    const overdue = tasks.filter((t) => t.dueDate < today), dueSoon = tasks.filter((t) => t.dueDate >= today);
    if (overdue.length) push("tasks-overdue", "tasks", "bad", `${overdue.length} task${n(overdue.length, " is", "s are")} overdue`, overdue.slice(0, 2).map((t) => `${t.title} (due ${dShort(t.dueDate)})`).join(" · "), "/me/tasks", overdue.length);
    if (dueSoon.length) push("tasks-soon", "tasks", "warn", `${dueSoon.length} task${n(dueSoon.length, "", "s")} due in the next 3 days`, dueSoon.slice(0, 2).map((t) => `${t.title} (due ${dShort(t.dueDate)})`).join(" · "), "/me/tasks", dueSoon.length);
  }
  // the benchmark modules this person looks after
  if (can(A, "hr.employees.view") && typeof hr2ExpiringCerts === "function") {
    const certs = hr2ExpiringCerts(60), expired = certs.filter((c) => c.status === "EXPIRED"), soonC = certs.filter((c) => c.status === "EXPIRING");
    if (expired.length) push("cert-x", "award", "bad", `${expired.length} certification${n(expired.length, " has", "s have")} expired`, expired.slice(0, 2).map((c) => `${c.person} · ${c.name}`).join(" · "), "/hr/certifications");
    if (soonC.length) push("cert-s", "award", "warn", `${soonC.length} certification${n(soonC.length, "", "s")} expiring within 60 days`, soonC.slice(0, 2).map((c) => `${c.person} · ${c.name}`).join(" · "), "/hr/certifications");
  }
  if (can(A, "hr.employees.edit")) { const b = inScope((S.benefitEnrollments || []).map((r) => ({ ...r, companyId: byId(S.employees, r.employeeId)?.companyId }))).filter((r) => r.status === "REQUESTED").length; if (b) push("ben", "heart", "info", `${b} benefit enrolment request${n(b, "", "s")} to review`, "Approve or decline in Benefits", "/hr/benefits"); }
  if (can(A, "hr.employees.view")) { const late = inScope((S.reviews || []).map((r) => ({ ...r, companyId: byId(S.employees, r.employeeId)?.companyId }))).filter((r) => r.status !== "COMPLETED" && r.dueDate < todayStr()).length; if (late) push("rv", "star", "warn", `${late} performance review${n(late, " is", "s are")} past due`, "Nudge the reviewer or complete it", "/hr/reviews"); }
  if (can(A, "ar.view") || can(A, "procurement.view")) {
    const items = new Map(inScope(S.items || []).filter((i) => i.type === "STOCK" && i.isActive !== false && i.reorderPoint > 0).map((i) => [i.id, i]));
    const low = (S.stockLevels || []).filter((l) => items.has(l.itemId) && l.onHand - (l.reserved || 0) <= items.get(l.itemId).reorderPoint);
    if (low.length) push("stock", "package", "warn", `${low.length} item${n(low.length, "", "s")} at or below the reorder point`, low.slice(0, 3).map((l) => `${items.get(l.itemId).name} (${byId(S.warehouses, l.warehouseId)?.code || ""})`).join(" · "), "/inventory/stock");
  }
  if (can(A, "ap.view")) { const v = inScope(S.apInvoices).filter((i) => i.matchStatus === "VARIANCE").length; if (v) push("match", "search", "warn", `${v} vendor bill${n(v, " doesn't", "s don't")} match the PO and receipt`, "Check the Matching before paying", "/procurement/match"); }
  if (can(A, "payroll.view")) for (const r of inScope(S.remittances || []).filter((r) => r.status === "DUE").slice(0, 3)) { const late = r.dueDate < todayStr(); push(`rem${r.id}`, "landmark", late ? "bad" : "info", `CRA remittance ${late ? "overdue" : "due"} ${dShort(r.dueDate)} · ${co(r.companyId).displayName}`, `${money(r.totalCents)} · CPP, EI and income tax for ${MON[D(r.periodStart).getUTCMonth()]}`, "/payroll/remittances"); }
  if (can(A, "finance.post")) { const d = inScope(S.recurringJournals || []).filter((r) => r.isActive !== false && r.nextRunDate <= todayStr()).length; if (d) push("rj", "repeat", "info", `${d} recurring journal${n(d, " is", "s are")} due to run`, "One click posts them for the period", "/finance/recurring"); }
  if (can(A, "finance.periods")) for (const p of inScope(S.fiscalPeriods).filter((p) => p.status === "OPEN" && p.endDate < todayStr()).sort((a, b) => (a.endDate < b.endDate ? -1 : 1)).slice(0, 2)) { const tasks = (S.periodCloseTasks || []).filter((t) => t.periodId === p.id); push(`cl${p.id}`, "lock", "info", `${co(p.companyId).displayName} · ${p.fiscalYear}-P${p.periodNumber} is still open`, `${tasks.filter((t) => t.isDone).length} of ${tasks.length} close tasks done`, "/finance/periods"); }
  return out;
}
const attnRow = (it) => `<li><button class="arow" data-go="${esc(it.go)}"><span class="ic ${it.tone}" aria-hidden="true">${icon(it.icon)}</span><span class="tx"><b>${esc(it.title)}</b>${it.detail ? `<small>${esc(it.detail)}</small>` : ""}</span>${it.count ? `<span class="ct">${it.count}</span>` : ""}<span class="chev" aria-hidden="true">${icon("chevright")}</span></button></li>`;
function needsAttention(skipApprovals = false) {
  const items = needsAttentionItems().filter((i) => !(skipApprovals && String(i.key).startsWith("appr-"))), more = UI.filters.homeMore;
  return `<section class="hcard" aria-labelledby="attn-h"><div class="hcard-h"><h2 id="attn-h">Needs your attention</h2><span class="hint">${items.length ? `${items.length} item${items.length > 1 ? "s" : ""}` : ""}</span></div>`
    + (items.length ? `<ul class="hlist">${items.slice(0, more ? items.length : 6).map(attnRow).join("")}</ul>${items.length > 6 ? `<button class="hmore" data-a="homeMore">${more ? "Show fewer" : `Show ${items.length - 6} more`}</button>` : ""}`
      : `<p class="empty-s" style="display:flex;gap:8px;align-items:center"><span style="color:var(--ok);font-weight:700" aria-hidden="true">✓</span>Nothing needs you right now.</p>`) + `</section>`;
}
window.ACTIONS_EXT.push({ homeMore() { UI.filters.homeMore = !UI.filters.homeMore; safeRender(); } });

/* ---------------- Home ---------------- */
const helpBtn = (topic, label = "How does this work?") => `<button class="helpbtn" data-go="/help" data-topic="${topic}"><span aria-hidden>?</span>${esc(label)}</button>`;
const sheetPaid = (s) => s.workedHours + s.statHours + s.vacationHours + s.sickHours + s.personalHours + s.otherLeaveHours;
/** "Waiting on you": requests | timesheets side by side, decide inline; each timesheet links to its full view */
function waitingOnYou(back = "/dashboard") {
  const approvals = myActionable(), sheets = myTimesheetsToApprove();
  const clear = (t) => `<p class="empty-s" style="display:flex;gap:8px;align-items:center"><span style="color:var(--ok);font-weight:700" aria-hidden="true">✓</span>All caught up. ${esc(t)}</p>`;
  const reqs = approvals.slice(0, 5).map((a) => { const st = activeSteps(S, a).find((x) => x.sequence === a.currentStep);
    return `<li class="wrow"><div class="wtop"><span class="sq" style="background:${esc(co(a.companyId).colorTag)}"></span><div style="flex:1;min-width:0"><div class="t1"><span class="kind">${esc((TYPE_LABEL[a.entityType] || a.entityType).toUpperCase())}</span>${esc(a.entityLabel)}</div><div class="t2">from ${esc(byId(S.users, a.requestedById)?.displayName)} · ${esc(ago(a.createdAt))} · step ${a.currentStep} of ${a.totalSteps}: ${esc(st?.name)}</div>${fileChips(a.entityType, a.entityId)}</div>${a.amountCents > 0 ? `<b class="num" style="font-size:13px">${money(a.amountCents)}</b>` : ""}</div>
      <form class="wform2" data-f="decide" data-id="${a.id}"><input class="in" name="comment" placeholder="Note — needed to decline" aria-label="Note"><button class="btn ok sm" data-dec="APPROVED">Approve</button><button class="btn sm danger" data-dec="REJECTED">Decline</button></form></li>`; }).join("");
  const ts = sheets.slice(0, 5).map((s) => { const e = byId(S.employees, s.employeeId); const lv = s.vacationHours + s.sickHours + s.personalHours + s.otherLeaveHours;
    return `<li class="wrow"><div class="wtop"><span class="sq" style="background:${esc(co(e.companyId).colorTag)}"></span><div style="flex:1;min-width:0"><div class="t1">${esc(empName(e))} <span class="muted" style="font-weight:400">· ${esc(periodLabel(s.periodStart, s.periodEnd))}</span></div><div class="t2">${s.isMyReport ? "Your team" : "As HR"} · worked ${hrs(s.workedHours)}${s.statHours ? ` · stat ${hrs(s.statHours)}` : ""}${lv ? ` · leave ${hrs(lv)}` : ""}${s.submittedAt ? ` · sent ${esc(ago(s.submittedAt))}` : ""}</div></div><b class="num" style="font-size:13px">${hrs(sheetPaid(s))} h</b></div>
      <form class="wform2" data-f="tsDecide" data-id="${s.id}"><input class="in" name="reason" placeholder="Note if sending back" aria-label="Reason"><button type="button" class="btn sm" data-go="/hr/timesheets/${s.id}?back=${encodeURIComponent(back)}">View timesheet</button><button class="btn ok sm" data-dec="APPROVED">Approve</button><button class="btn sm danger" data-dec="REJECTED">Send back</button></form></li>`; }).join("");
  return `<section style="margin-bottom:18px" aria-labelledby="wait-h"><div class="form-row" style="justify-content:space-between;align-items:baseline;margin-bottom:8px"><h2 class="h2" id="wait-h" style="margin:0">Waiting on you <span class="cnt">${approvals.length + sheets.length}</span></h2><button class="lnk" style="font-size:12.5px" data-go="/approvals">Open Approvals →</button></div>
    <div class="grid g2" style="align-items:start">
      <div class="hcard"><div class="hcard-h"><h3>${icon("inbox")}Requests &amp; expenses</h3><span class="hint">${approvals.length} waiting</span></div>${approvals.length ? `<ul class="hlist">${reqs}</ul>` : clear("No requests or claims waiting for you.")}${approvals.length > 5 ? `<button class="hmore" data-go="/approvals">+ ${approvals.length - 5} more in Approvals</button>` : ""}</div>
      <div class="hcard"><div class="hcard-h"><h3>${icon("clock")}Timesheets</h3><span class="hint">${sheets.length} waiting</span></div>${sheets.length ? `<ul class="hlist">${ts}</ul>` : clear("No timesheets waiting for you.")}${sheets.length > 5 ? `<button class="hmore" data-go="/approvals?type=timesheets">+ ${sheets.length - 5} more in Approvals</button>` : ""}</div>
    </div></section>`;
}
/* ---------------- B's summary tiles, one row per role (A's stat tile, clickable) ---------------- */
const homeRole = () => {
  if (A.isSuper || A.roleCodes.some((r) => ["EXECUTIVE", "GROUP_ADMIN", "COMPANY_ADMIN"].includes(r))) return "exec";
  if (can(A, "finance.view")) return "finance";
  if (A.roleCodes.includes("PAYROLL_ADMIN")) return "payroll";
  if (A.roleCodes.includes("HR_MANAGER")) return "hr";
  if (A.employee && S.employees.some((e) => e.managerId === A.employee.id && e.status !== "TERMINATED")) return "manager";
  return "employee";
};
const homeTile = (label, value, hint, go, tone = "") => `<button class="stat ${tone}" ${go ? `data-go="${esc(go)}"` : "disabled"}><div class="l">${esc(label)}</div><div class="v">${esc(value)}</div>${hint ? `<div class="h">${esc(hint)}</div>` : ""}</button>`;
const monthWord = (ym) => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][Number(ym.slice(5, 7)) - 1];
function homeTiles() {
  const role = homeRole(), ids = scopeIds(S, A), t0 = todayStr(), ym = t0.slice(0, 7), e = A.employee;
  const one = (n, a, b) => (n === 1 ? a : b);
  let title = "", sub = "", tiles = [];
  try {
    if (role === "employee" || (role === "manager" && !e)) {
      if (!e) return "";
      const st = settingsFor(S, e.companyId), cad = st.timesheetCadence || "BIWEEKLY", start = periodStartFor(t0, cad), end = periodEndFor(start, cad);
      const sheet = S.timesheets.find((t) => t.employeeId === e.id && t.periodStart === start);
      const meta = tsDaysMeta(e, start, end, sheet), expected = meta.filter((m) => !m.we).length * (st.standardHoursPerDay ?? 8);
      const got = sheet ? sheetPaid(sheet) : meta.reduce((s, m) => s + (m.stat?.hours || 0) + m.leave.vac + m.leave.sick + m.leave.pers + m.leave.other, 0);
      const vac = leaveBalances(e.id).find((b) => b.lt.code === "VACATION"), pay = myEntries(e.id)[0], status = sheet?.status || "DRAFT";
      const waiting = statusRows(e.id).filter((r) => PENDING_STATES.has(r.status)).length;
      title = "My summary"; sub = dLong(t0);
      tiles = [homeTile("My timesheet", `${hrs(got)} of ${hrs(expected)} h`, status === "SUBMITTED" ? "sent — waiting for approval" : status === "APPROVED" ? "approved" : status === "REJECTED" ? "sent back — please fix it" : `this pay period · ${periodLabel(start, end)}`, "/me/time", status === "REJECTED" ? "warn" : ""),
        homeTile("Vacation left", vac ? `${hrs(vac.ent - vac.used)} h` : "—", vac?.pending ? `${hrs(vac.pending)} h waiting for approval` : "for this year", "/me/time-off"),
        homeTile("Latest pay", pay ? money(pay.p.netCents) : "—", pay ? `take-home on ${dLong(pay.run.payDate)}` : "no pay statements yet", pay ? `/me/pay/${pay.p.id}` : "/me/pay"),
        homeTile("My requests", String(waiting), waiting ? "waiting for a decision" : "nothing waiting", "/me/requests")];
    } else if (role === "manager") {
      const team = S.employees.filter((x) => x.managerId === e.id && x.status !== "TERMINATED"), wkEnd = addDays(t0, 6);
      const away = S.leaveRequests.filter((r) => team.some((x) => x.id === r.employeeId) && r.status === "APPROVED" && r.startDate <= wkEnd && r.endDate >= t0);
      const items = myActionable(), sheets = myTimesheetsToApprove(), n = items.length + sheets.length;
      const byType = {}; for (const a of items) { const k = TYPE_LABEL[a.entityType] || "Request"; byType[k] = (byType[k] || 0) + 1; } if (sheets.length) byType.Timesheet = sheets.length;
      const late = typeof teamScope === "function" ? teamScope().filter((t) => t.assigneeId !== e.id && t.status !== "DONE" && ((t.dueDate && t.dueDate < t0) || t.status === "BLOCKED")).length : 0;
      title = "My team"; sub = `${team.length} ${one(team.length, "person reports", "people report")} to you`;
      tiles = [homeTile("Waiting for you", String(n), Object.entries(byType).map(([k, c]) => `${c} ${k.toLowerCase()}${c > 1 ? "s" : ""}`).join(" · ") || "nothing waiting", "/approvals", n ? "warn" : "good"),
        homeTile("Away this week", String(new Set(away.map((r) => r.employeeId)).size), away.length ? away.map((r) => `${byId(S.employees, r.employeeId)?.firstName} ${dShort(r.startDate)}–${dShort(r.endDate)}`).slice(0, 2).join(", ") : "everyone's in", "/team"),
        homeTile("Team tasks late or stuck", String(late), late ? "open My Team to help" : "all on track", "/team?view=list", late ? "warn" : ""),
        homeTile("My team", String(team.length), team.map((x) => x.firstName).slice(0, 4).join(", "), "/team")];
    } else if (role === "hr") {
      const people = S.employees.filter((x) => ids.includes(x.companyId) && ["ACTIVE", "ON_LEAVE", "ONBOARDING"].includes(x.status)), wkEnd = addDays(t0, 6);
      const away = inScope(S.leaveRequests).filter((r) => r.status === "APPROVED" && r.startDate <= wkEnd && r.endDate >= t0);
      const waitingLeave = inScope(S.leaveRequests).filter((r) => r.status === "PENDING_APPROVAL").length, onb = people.filter((x) => x.status === "ONBOARDING");
      const certs = typeof hr2ExpiringCerts === "function" ? hr2ExpiringCerts(60).length : 0;
      title = "People at a glance"; sub = `as of ${dLong(t0)}`;
      tiles = [homeTile("People", String(people.length), `${S.companies.filter((c) => ids.includes(c.id)).length} companies`, "/hr/employees"),
        homeTile("Away this week", String(new Set(away.map((r) => r.employeeId)).size), away.length ? away.slice(0, 3).map((r) => empName(byId(S.employees, r.employeeId)).split(" ")[0]).join(", ") : "everyone's in", "/hr/leave"),
        homeTile("Time off to approve", String(waitingLeave), "waiting for managers", "/hr/leave", waitingLeave ? "warn" : ""),
        homeTile("Onboarding", String(onb.length), onb.length ? onb.map((x) => x.firstName).join(", ") : "no new starters", "/hr/onboarding"),
        homeTile("Certificates expiring", String(certs), certs ? "within 60 days, or expired" : "all current", "/hr/certifications", certs ? "warn" : "")].slice(0, 4);
    } else if (role === "finance" || role === "payroll") {
      const ap = inScope(S.apInvoices).filter((i) => ["APPROVED", "PARTIALLY_PAID"].includes(i.status)), soon = ap.filter((i) => i.dueDate <= addDays(t0, 30)), waiting = inScope(S.apInvoices).filter((i) => i.status === "PENDING_APPROVAL").length;
      const ar = inScope(S.arInvoices).filter((i) => ["SENT", "APPROVED", "PARTIALLY_PAID"].includes(i.status)), arOd = ar.filter((i) => i.dueDate < t0);
      const runs = inScope(S.payrollRuns).filter((r) => r.status === "POSTED"), payNow = runs.filter((r) => (r.payDate || "").startsWith(ym)).reduce((s, r) => s + r.grossCents + (r.employerCostsCents || 0), 0);
      const banks = new Set(S.bankAccounts.filter((b) => ids.includes(b.companyId)).map((b) => b.id)), tx = S.bankTransactions.filter((t) => banks.has(t.bankAccountId)), unmatched = tx.filter((t) => t.status !== "MATCHED" && !t.journalEntryId).length;
      title = "Money at a glance"; sub = `${A.activeCompanyId ? co(A.activeCompanyId).displayName : "all your companies"} · as of ${dLong(t0)}`;
      tiles = [homeTile("Bills due in 30 days", money(soon.reduce((s, i) => s + i.totalCents - (i.paidCents || 0), 0)), `${soon.length} bill${one(soon.length, "", "s")}${waiting ? ` · ${waiting} waiting for approval` : ""}`, "/finance/ap", waiting ? "warn" : ""),
        homeTile("Owed to us, overdue", money(arOd.reduce((s, i) => s + i.totalCents - (i.paidCents || 0), 0)), arOd.length ? `${arOd.length} overdue invoice${one(arOd.length, "", "s")}` : "none overdue", "/finance/ar", arOd.length ? "warn" : "good"),
        homeTile(`Payroll in ${monthWord(ym)}`, money(payNow), payNow ? "pay + employer costs" : `none posted yet in ${monthWord(ym)}`, can(A, "payroll.view") ? "/payroll/runs" : "/finance"),
        homeTile("Bank lines to match", String(unmatched), unmatched ? `of ${tx.length} bank lines` : "all matched", "/finance/banking", unmatched ? "warn" : "good")];
    } else {
      const rows = balances(ids), sum = (type, flip) => rows.filter((r) => r.type === type).reduce((s, r) => s + (flip ? -rowTotal(r) : rowTotal(r)), 0);
      const rev = sum("REVENUE", true), exp = sum("EXPENSE", false), net = rev - exp, yr = t0.slice(0, 4);
      const runs = inScope(S.payrollRuns).filter((r) => r.status === "POSTED"), payNow = runs.filter((r) => (r.payDate || "").startsWith(ym)).reduce((s, r) => s + r.grossCents + (r.employerCostsCents || 0), 0);
      title = "Company at a glance"; sub = `${A.activeCompanyId ? co(A.activeCompanyId).displayName : "whole group"} · ${yr} so far · as of ${dLong(t0)}`;
      const rep = can(A, "reports.view") ? "/reports/income-statement" : can(A, "finance.view") ? "/finance" : "/reports";
      tiles = [homeTile("Revenue", moneyCompact(rev), `money earned in ${yr}`, rep), homeTile("Expenses", moneyCompact(exp), `costs recorded in ${yr}`, rep),
        homeTile(net >= 0 ? "Profit" : "Loss", moneyCompact(Math.abs(net)), net >= 0 ? "revenue minus expenses" : "expenses are higher than revenue", rep, net >= 0 ? "good" : "warn"),
        homeTile(`Payroll in ${monthWord(ym)}`, money(payNow), payNow ? "pay + employer costs" : `none posted yet in ${monthWord(ym)}`, can(A, "payroll.view") ? "/payroll/runs" : rep)];
    }
  } catch (x) { console.error(x); return ""; }
  if (!tiles.length) return "";
  return `<section class="htiles" aria-labelledby="htiles-h"><div class="hh"><h2 id="htiles-h">${esc(title)}</h2><span class="hint">${esc(sub)}</span></div><div class="tiles">${tiles.join("")}</div></section>`;
}
function homeTop() {
  const first = A.user.displayName.split(" ")[0];
  const h = new Date().getHours(), hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const approvals = myActionable(), sheets = myTimesheetsToApprove();
  const isApprover = approvals.length + sheets.length > 0 || myTeam().length > 0;
  const actions = A.employee ? [["/me/time", "clock", "Enter my hours"], ["/me/time-off", "calendar", "Request time off"], ["/me/expenses", "receipt", "Submit an expense"], ["/me/requests", "plus", "New request"]] : [];
  const OPEN = ["PENDING_APPROVAL", "SUBMITTED", "OPEN"];
  const open = A.employee ? statusRows(A.employee.id).filter((r) => OPEN.includes(r.status)) : null;
  const greet = `<div class="hgreet"><h1>${hello}, ${esc(first)}</h1><span>${esc(dLong(todayStr()))}</span></div>`;
  const qa = actions.length ? `<section class="hcard" aria-labelledby="qa-h"><div class="hcard-h"><h2 id="qa-h">Quick actions</h2></div><div class="qa2">${actions.slice(0, 4).map(([go, ic, t]) => `<button data-go="${go}">${icon(ic)}<span>${esc(t)}</span></button>`).join("")}</div></section>` : "";
  const mor = open ? `<section class="hcard" aria-labelledby="mor-h"><div class="hcard-h"><h2 id="mor-h">My requests &amp; expenses</h2><button class="lnk" style="font-size:12.5px" data-go="/me/requests">All of them →</button></div>${open.length ? `<ul class="hlist">${open.slice(0, 5).map((r) => `<li><button class="orow" data-go="${esc(r.href || "/me/requests")}"><span class="tx"><b>${esc(r.kind)} · ${esc(r.title)}</b><small>${esc(r.number || "")}${r.waiting ? ` · ${esc(r.waiting)}` : ""}</small></span>${r.amount ? `<span class="num" style="font-size:12px">${money(r.amount)}</span>` : ""}${badge(r.status)}</button></li>`).join("")}</ul>${open.length > 5 ? `<button class="hmore" data-go="/me/requests">+ ${open.length - 5} more open</button>` : ""}` : `<p class="empty-s">Nothing waiting on a decision.</p>`}</section>` : "";
  const ev = upcomingEventsA(60).slice(0, 6);
  const teamRows = myTeam().length ? historyRowsA({ scope: "team" }).rows : [];
  const hist = teamRows.length ? { rows: teamRows, who: "your team" } : { rows: historyRowsA({ scope: "me" }).rows, who: "you" };
  const eh = `<section class="grid g2" style="align-items:start;margin-bottom:18px">
    <div class="hcard"><div class="hcard-h"><h2>Recent activity <span class="hint" style="font-weight:400">· ${hist.who}</span></h2><button class="lnk" style="font-size:12.5px" data-go="/history">All history →</button></div>${hist.rows.length ? `<ul class="hlist">${hist.rows.slice(0, 6).map((r) => { const a = areaOfModule(r.module); return `<li class="hrow" style="cursor:default"><b>${esc(r.summary)}</b><small>${esc(dTime(r.at))} · ${esc(r.actorName || "System")}${a ? ` · ${H_AREAS[a][0]}` : ""}</small></li>`; }).join("")}</ul>` : `<p class="empty-s">Nothing yet — what you and your team do shows up here.</p>`}</div>
    <div class="hcard"><div class="hcard-h"><h2>Coming up</h2>${A.employee ? `<button class="lnk" style="font-size:12.5px" data-go="/me/profile/events">Calendar →</button>` : ""}</div>${ev.length ? `<ul class="hlist">${ev.map((x) => `<li class="erow"><span class="dt">${esc(dShort(x.at))}</span><span class="dot" style="background:${EVENT_K[x.k][1]}" aria-hidden="true"></span><span class="tx"><b>${esc(x.t)}</b><small>${EVENT_K[x.k][0]}${x.d ? ` · ${esc(x.d)}` : ""}</small></span></li>`).join("")}</ul>` : `<p class="empty-s">Nothing in the next few weeks.</p>`}</div></section>`;
  return greet + flashHtml() + homeTiles()
    + (isApprover ? waitingOnYou("/dashboard") : "")
    + `<div class="hgrid"><div class="hcol">${needsAttention(isApprover)}</div><div class="hcol">${qa}${mor}</div></div>` + eh;
}
/** Executive / Finance / HR: one compact strip, at most one donut */
function homeGlance() {
  const isExec = A.isSuper || A.roleCodes.includes("EXECUTIVE") || A.roleCodes.includes("GROUP_ADMIN");
  const isFinance = !isExec && can(A, "finance.post");
  const isHr = !isExec && !isFinance && can(A, "hr.employees.edit");
  if (!isExec && !isFinance && !isHr) return "";
  const ids = scopeIds(S, A);
  const activeEmps = S.employees.filter((e) => ids.includes(e.companyId) && ["ACTIVE", "ON_LEAVE", "ONBOARDING"].includes(e.status));
  const net = (list) => list.reduce((t, i) => t + i.totalCents - (i.paidCents || 0), 0);
  const ap = net(inScope(S.apInvoices).filter((i) => ["APPROVED", "PARTIALLY_PAID", "PENDING_APPROVAL"].includes(i.status)));
  const ar = net(inScope(S.arInvoices).filter((i) => ["SENT", "APPROVED", "PARTIALLY_PAID"].includes(i.status)));
  const byCo = () => S.companies.map((c) => ({ label: c.displayName, v: activeEmps.filter((e) => e.companyId === c.id).length })).filter((x) => x.v).sort((a, b) => b.v - a.v).map((x) => ({ ...x, d: String(x.v) }));
  let tiles, dn;
  if (isFinance) {
    const lastRun = inScope(S.payrollRuns).filter((r) => r.status === "POSTED").sort((a, b) => (a.payDate < b.payDate ? 1 : -1))[0];
    const BILL = { DRAFT: "Draft", PENDING_APPROVAL: "Waiting for approval", APPROVED: "Approved, unpaid", PARTIALLY_PAID: "Partly paid" };
    tiles = [["Cash on hand", moneyCompact(cashOf(ids)), "Bank, all posted activity", "/finance/banking"], ["Bills we owe", moneyCompact(ap), "Unpaid vendor bills", "/finance/ap"], ["Owed to us", moneyCompact(ar), "Unpaid customer invoices", "/finance/ar"], ["Last payroll", lastRun ? moneyCompact(lastRun.grossCents) : "—", lastRun ? `Paid ${dLong(lastRun.payDate)}` : "None posted yet", "/payroll/runs"]];
    const bills = inScope(S.apInvoices).filter((i) => BILL[i.status]);
    dn = { title: "Open bills by status", items: Object.entries(BILL).map(([k, l]) => { const v = bills.filter((b) => b.status === k).length; return { label: l, v, d: String(v) }; }), caption: "bills" };
  } else if (isExec) {
    tiles = [["Cash on hand", moneyCompact(cashOf(ids)), "Bank, all posted activity", can(A, "finance.view") ? "/finance" : "/reports"], ["People", String(activeEmps.length), "Active, on leave or starting", "/people/directory"], ["Bills we owe", moneyCompact(ap), "Unpaid vendor bills", can(A, "ap.view") ? "/finance/ap" : "/reports"], ["Owed to us", moneyCompact(ar), "Unpaid customer invoices", can(A, "ar.view") ? "/finance/ar" : "/reports"]];
    dn = { title: "People by company", items: byCo(), caption: "people" };
  } else {
    const onb = S.employees.filter((e) => ids.includes(e.companyId) && e.status === "ONBOARDING").length;
    const lv = S.leaveRequests.filter((r) => r.status === "PENDING_APPROVAL" && ids.includes(byId(S.employees, r.employeeId)?.companyId)).length;
    const tsw = inScope(S.timesheets).filter((t) => t.status === "SUBMITTED").length;
    tiles = [["People", String(activeEmps.length), "Active, on leave or starting", "/hr/employees"], ["Starting soon", String(onb), "In onboarding", "/hr/onboarding"], ["Time off waiting", String(lv), "Requests not yet decided", "/hr/leave"], ["Timesheets waiting", String(tsw), "Sent, not yet approved", "/hr/timesheets"]];
    dn = { title: "People by company", items: byCo(), caption: "people" };
  }
  return `<section aria-labelledby="glance-h" style="margin-bottom:8px"><div class="form-row" style="justify-content:space-between;align-items:baseline;margin-bottom:8px"><h2 class="h2" id="glance-h" style="margin:0">At a glance</h2><span class="hint">${A.activeCompanyId ? esc(co(A.activeCompanyId).displayName) : "the whole group"} · ${esc(dLong(todayStr()))}</span></div>
    <div class="glance2"><div class="tiles">${tiles.map(([l, v, hint, go]) => `<button class="stat" data-go="${go}"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div><div class="h">${esc(hint)}</div></button>`).join("")}</div>
    ${dn.items.some((x) => x.v > 0) ? `<div class="hcard" style="padding:12px 14px">${donut(dn.items, { title: dn.title, caption: dn.caption, size: 120, thick: 14 })}</div>` : ""}</div></section>`;
}

/* ---------------- animated charts (donut + bars) ---------------- */
/** categorical series colours come from the current look (--c1..--c6, light or dark) */
const seriesColors = () => ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
function foldSlices(items, max = 6) { const s = items.filter((x) => x.v > 0).sort((a, b) => b.v - a.v); if (s.length <= max) return s; const keep = s.slice(0, max - 1), rest = s.slice(max - 1); return [...keep, { label: "Other", v: rest.reduce((t, x) => t + x.v, 0), d: rest[0].fmt ? rest[0].fmt(rest.reduce((t, x) => t + x.v, 0)) : String(rest.reduce((t, x) => t + x.v, 0)) }]; }
/** donut: ring draws itself, slices grow on hover, centre shows the total or the hovered slice; legend + direct labels */
function donut(items, { title = "", total = "", caption = "Total", size = 170, thick = 22 } = {}) {
  const sl = foldSlices(items), sum = sl.reduce((t, x) => t + x.v, 0), cols = seriesColors();
  const r = (size - thick) / 2, c = 2 * Math.PI * r, gap = sl.length > 1 ? 2.5 : 0;
  if (!sum) return `<figure class="chart">${title ? `<figcaption>${esc(title)}</figcaption>` : ""}<div class="hint">Nothing to show yet.</div></figure>`;
  if (sl.length < 2) return `<figure class="chart">${title ? `<figcaption>${esc(title)}</figcaption>` : ""}<div class="glance" style="display:inline-block"><small>${esc(sl[0].label.toUpperCase())}</small><b>${esc(sl[0].d)}</b><span class="hint">all of it</span></div></figure>`;
  let off = 0;
  const arcs = sl.map((x, i) => { const frac = x.v / sum; const a = { i, x, frac, len: Math.max(0, frac * c - gap), start: off, col: x.color || cols[i % cols.length] }; off += frac * c; return a; });
  const id = `dn${Math.random().toString(36).slice(2, 7)}`;
  return `<figure class="chart donut" data-donut="${id}" data-total="${esc(total || sum.toLocaleString("en-CA"))}" data-caption="${esc(caption)}">${title ? `<figcaption>${esc(title)}</figcaption>` : ""}<div class="dwrap"><div class="dring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(title)}: ${esc(sl.map((x) => `${x.label} ${x.d}`).join(", "))}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--muted)" stroke-width="${thick}"/>${arcs.map((a) => `<circle class="arc" data-i="${a.i}" data-v="${esc(a.x.d)}" data-l="${esc(a.x.label)} · ${Math.round(a.frac * 100)}%" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:${a.col}" stroke-width="${thick}" stroke-dasharray="0 ${c}" data-len="${a.len}" stroke-dashoffset="${-a.start}" style="transition-delay:${a.i * 90}ms" tabindex="0"><title>${esc(a.x.label)}: ${esc(a.x.d)} · ${Math.round(a.frac * 100)}%</title></circle>`).join("")}</svg><div class="dcenter"><b>${esc(total || sum.toLocaleString("en-CA"))}</b><small>${esc(caption)}</small></div></div><ul class="dlegend">${arcs.map((a) => `<li data-i="${a.i}"><span class="sq" style="background:${a.col}"></span><span class="grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(a.x.label)}</span><span class="num"><strong>${esc(a.x.d)}</strong></span><span class="hint" style="width:36px;text-align:right">${Math.round(a.frac * 100)}%</span></li>`).join("")}</ul></div></figure>`;
}
/** horizontal bars that grow in — one hue (magnitude), direct values */
function barList(items, { title = "" } = {}) {
  const max = Math.max(1, ...items.map((i) => i.v)), col = seriesColors()[0];
  return `<figure class="chart">${title ? `<figcaption>${esc(title)}</figcaption>` : ""}${items.length ? items.map((i, k) => `<div class="brow"><div class="form-row" style="justify-content:space-between;font-size:12.5px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.label)}</span><span class="num"><strong>${esc(i.d)}</strong></span></div><div class="bar"><i class="grow-in" data-w="${(i.v / max) * 100}" style="width:0;background:${col};transition-delay:${k * 60}ms"></i></div></div>`).join("") : `<p class="hint">Nothing to show.</p>`}</figure>`;
}
function animateCharts() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".arc").forEach((a) => { a.setAttribute("stroke-dasharray", `${a.dataset.len} ${a.getAttribute("stroke-dasharray").split(" ")[1]}`); });
    document.querySelectorAll(".grow-in").forEach((b) => { b.style.width = `${b.dataset.w}%`; });
  });
}
function donutHover(fig, i) {
  const center = fig.querySelector(".dcenter"), arcs = fig.querySelectorAll(".arc"), lis = fig.querySelectorAll(".dlegend li");
  arcs.forEach((a) => { const on = i == null || a.dataset.i == i; a.style.opacity = on ? 1 : 0.35; a.classList.toggle("big", a.dataset.i == i); });
  lis.forEach((l) => l.classList.toggle("on", l.dataset.i == i));
  const a = i == null ? null : fig.querySelector(`.arc[data-i="${i}"]`);
  center.innerHTML = a ? `<b>${esc(a.dataset.v)}</b><small>${esc(a.dataset.l)}</small>` : `<b>${esc(fig.dataset.total)}</b><small>${esc(fig.dataset.caption)}</small>`;
}
document.addEventListener("mouseover", (ev) => { const t = ev.target.closest?.(".arc, .dlegend li"); if (!t) return; donutHover(t.closest("[data-donut]"), t.dataset.i); });
document.addEventListener("mouseout", (ev) => { const t = ev.target.closest?.(".arc, .dlegend li"); if (!t) return; const fig = t.closest("[data-donut]"); if (!fig.contains(ev.relatedTarget) || !ev.relatedTarget?.closest?.(".arc, .dlegend li")) donutHover(fig, null); });

/* ---------------- everyday reports ---------------- */
const STATUS_WORD = { PENDING_APPROVAL: "Waiting", SUBMITTED: "Waiting", APPROVED: "Approved", PAID: "Paid back", REIMBURSED: "Paid back", CONVERTED: "Turned into a PO", REJECTED: "Declined", CANCELLED: "Withdrawn", DRAFT: "Draft", LOCKED: "In payroll" };
const sw = (s) => STATUS_WORD[s] || s;
const REP = {
  requests: { title: "Requests & claims", icon: "📨", hint: "Travel, credit-card and purchase requests, expense and travel claims — who asked, how much, where each one stands.", allowed: () => ["reports.view", "finance.view", "procurement.view", "expenses.approve", "expenses.reimburse"].some((p) => can(A, p)),
    kinds: [["", "All types"], ["TRAVEL_REQUEST", "Travel request"], ["CREDIT_CARD_PURCHASE", "Credit card purchase"], ["TRAVEL_CLAIM", "Travel claim"], ["PURCHASE", "Purchase / PO request"], ["EXPENSE", "Expense claim"]], statuses: ["Waiting", "Approved", "Paid back", "Declined", "Withdrawn"] },
  timeoff: { title: "Time off", icon: "🌲", hint: "Every time-off request with hours and status, totals by type and person, and everyone's balances.", allowed: () => can(A, "leave.view") || can(A, "reports.view"),
    kinds: [["", "All types"], ["VACATION", "Vacation"], ["SICK", "Sick"], ["PERSONAL", "Personal"], ["BANKED_OT", "Banked overtime"], ["OTHER", "Other"]], statuses: ["Waiting", "Approved", "Declined", "Withdrawn"] },
  timesheets: { title: "Timesheet hours", icon: "🕒", hint: "Hours worked, overtime, leave and stat by person and pay period — with totals by department.", allowed: () => can(A, "timesheets.view") || can(A, "payroll.view"),
    kinds: null, statuses: ["Waiting", "Approved", "In payroll", "Draft", "Declined"] },
};
function groupBars(list, key, val, fmt, top = 8) { const m = new Map(); for (const x of list) m.set(key(x), (m.get(key(x)) || 0) + val(x)); const items = [...m].sort((a, b) => b[1] - a[1]).slice(0, top).map(([label, v]) => ({ label, v, d: fmt(v), fmt })); items.total = fmt([...m.values()].reduce((s, v) => s + v, 0)); return items; }
function reportData(key, f) {
  const ids = scopeIds(S, A), inS = (c) => ids.includes(c);
  const who = (f.who || "").trim().toLowerCase(), okWho = (n) => !who || n.toLowerCase().includes(who);
  const inDate = (d) => (!f.from || d.slice(0, 10) >= f.from) && (!f.to || d.slice(0, 10) <= f.to);
  if (key === "requests") {
    let list = [];
    if (!f.kind || ["TRAVEL_REQUEST", "CREDIT_CARD_PURCHASE", "TRAVEL_CLAIM"].includes(f.kind)) for (const r of S.requests) if (inS(r.companyId) && (!f.kind || r.type === f.kind)) { const e = byId(S.employees, r.employeeId); list.push({ sent: r.createdAt, number: r.requestNumber, type: requestTypeLabel(r.type), person: empName(e), company: co(r.companyId).displayName, department: byId(S.departments, e?.departmentId)?.name || "", title: r.title, amount: r.amountCents, status: sw(r.status), decided: (r.status === "PAID" ? r.paidByName : r.decidedByName) || "" }); }
    if (!f.kind || f.kind === "PURCHASE") for (const p of S.purchaseRequests) if (inS(p.companyId)) list.push({ sent: p.createdAt, number: p.requestNumber, type: "Purchase / PO request", person: p.requestedByName || "", company: co(p.companyId).displayName, department: "", title: p.description, amount: p.amountCents, status: sw(p.status), decided: "" });
    if (!f.kind || f.kind === "EXPENSE") for (const x of S.expenseClaims) if (inS(x.companyId)) { const e = byId(S.employees, x.employeeId); const l = S.expenseLines.find((y) => y.expenseClaimId === x.id); list.push({ sent: x.submittedAt || x.createdAt || "", number: x.claimNumber, type: "Expense claim", person: empName(e), company: co(x.companyId).displayName, department: byId(S.departments, e?.departmentId)?.name || "", title: `${x.purpose}${l ? ` — ${l.merchant}` : ""}`, amount: x.totalCents, status: sw(x.status), decided: "" }); }
    list = list.filter((r) => inDate(r.sent || "") && okWho(r.person) && (!f.status || r.status === f.status)).sort((a, b) => (a.sent < b.sent ? 1 : -1));
    const ok = list.filter((r) => ["Approved", "Paid back", "Turned into a PO"].includes(r.status));
    return { cols: [["sent", "Sent", "date"], ["number", "Number"], ["type", "Type"], ["person", "Person"], ["company", "Company"], ["department", "Department"], ["title", "What"], ["amount", "Amount", "money"], ["status", "Status"], ["decided", "Decided / paid by"]], rows: list,
      totals: [["Requests & claims", String(list.length)], ["Total asked for", money(list.reduce((s, r) => s + r.amount, 0))], ["Approved or paid", money(ok.reduce((s, r) => s + r.amount, 0))], ["Still waiting", String(list.filter((r) => r.status === "Waiting").length)]],
      groups: [["Amount by type", groupBars(list, (r) => r.type, (r) => r.amount, money)], ["By status", groupBars(list, (r) => r.status, () => 1, String)], ["Top people by amount", groupBars(list, (r) => r.person, (r) => r.amount, money, 6)]] };
  }
  if (key === "timeoff") {
    let list = S.leaveRequests.filter((l) => inS(l.companyId) && (!f.to || l.startDate <= f.to) && (!f.from || l.endDate >= f.from)).map((l) => { const e = byId(S.employees, l.employeeId), lt = byId(S.leaveTypes, l.leaveTypeId); return { person: empName(e), company: co(l.companyId).displayName, department: byId(S.departments, e?.departmentId)?.name || "", type: lt?.name || "", code: lt?.code, first: l.startDate, last: l.endDate, hours: l.totalHours, status: sw(l.status), decided: l.decidedByName || "", note: l.notes || "" }; });
    list = list.filter((r) => okWho(r.person) && (!f.kind || r.code === f.kind) && (!f.status || r.status === f.status)).sort((a, b) => (a.first < b.first ? 1 : -1));
    const ok = list.filter((r) => r.status === "Approved"), hh = (n) => `${n.toFixed(1)} h`;
    const bal = S.employees.filter((e) => inS(e.companyId) && !["TERMINATED", "INACTIVE"].includes(e.status) && okWho(empName(e))).flatMap((e) => leaveBalances(e.id).filter((b) => b.has && b.ent > 0 && (!f.kind || b.lt.code === f.kind)).map((b) => ({ person: empName(e), company: co(e.companyId).displayName, type: b.lt.name, entitled: b.ent, used: b.used, left: b.ent - b.used })));
    return { cols: [["person", "Person"], ["company", "Company"], ["department", "Department"], ["type", "Type"], ["first", "First day", "date"], ["last", "Last day", "date"], ["hours", "Hours", "hours"], ["status", "Status"], ["decided", "Decided by"], ["note", "Note"]], rows: list,
      totals: [["Requests", String(list.length)], ["Approved hours", hh(ok.reduce((s, r) => s + r.hours, 0))], ["Waiting", String(list.filter((r) => r.status === "Waiting").length)], ["People", String(new Set(list.map((r) => r.person)).size)]],
      groups: [["Approved hours by type", groupBars(ok, (r) => r.type, (r) => r.hours, hh)], ["Approved hours by person", groupBars(ok, (r) => r.person, (r) => r.hours, hh, 6)], ["By status", groupBars(list, (r) => r.status, () => 1, String)]],
      extra: ["Balances · 2026", [["person", "Person"], ["company", "Company"], ["type", "Type"], ["entitled", "Entitled", "hours"], ["used", "Used", "hours"], ["left", "Left", "hours"]], bal] };
  }
  let list = S.timesheets.filter((t) => inS(t.companyId) && (!f.from || t.periodStart >= f.from) && (!f.to || t.periodStart <= f.to)).map((t) => { const e = byId(S.employees, t.employeeId); const lv = t.vacationHours + t.sickHours + t.personalHours + t.otherLeaveHours; return { period: `${t.periodStart} → ${t.periodEnd}`, ps: t.periodStart, person: empName(e), company: co(t.companyId).displayName, department: byId(S.departments, e?.departmentId)?.name || "No department", worked: t.workedHours, ot: (t.overtimeHours || 0) + (t.doubleOtHours || 0), stat: t.statHours, leave: lv, banked: t.bankedOtHours || 0, paid: t.workedHours + t.statHours + lv, status: sw(t.status), approved: t.approvedByName || "" }; });
  list = list.filter((r) => okWho(r.person) && (!f.status || r.status === f.status)).sort((a, b) => (a.ps < b.ps ? 1 : -1));
  const hh = (n) => `${n.toFixed(1)} h`, sum = (k) => list.reduce((s, r) => s + r[k], 0);
  return { cols: [["period", "Pay period"], ["person", "Person"], ["company", "Company"], ["department", "Department"], ["worked", "Worked", "hours"], ["ot", "Overtime", "hours"], ["stat", "Stat", "hours"], ["leave", "Leave", "hours"], ["banked", "Banked OT", "hours"], ["paid", "Paid hours", "hours"], ["status", "Status"], ["approved", "Approved by"]], rows: list,
    totals: [["Timesheets", String(list.length)], ["Hours worked", hh(sum("worked"))], ["Overtime", hh(sum("ot"))], ["Paid hours", hh(sum("paid"))]],
    groups: [["Hours worked by department", groupBars(list, (r) => r.department, (r) => r.worked, hh)], ["Hours worked by person", groupBars(list, (r) => r.person, (r) => r.worked, hh, 6)], ["By status", groupBars(list, (r) => r.status, () => 1, String)]] };
}
const cellA = (v, kind) => kind === "money" ? money(v) : kind === "hours" ? hrs(v) : esc(v ?? "—");
function repTable(cols, rows, max = 300) {
  return `<div class="tw"><table class="t"><thead><tr>${cols.map(([, l, k]) => `<th class="${k === "money" || k === "hours" ? "r" : ""}">${esc(l)}</th>`).join("")}</tr></thead><tbody>${rows.slice(0, max).map((r) => `<tr>${cols.map(([c, , k]) => `<td class="${k === "money" || k === "hours" ? "r num" : k === "date" ? "mono" : ""}">${cellA(r[c], k)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" class="muted" style="text-align:center;padding:26px">Nothing matches these filters — try a wider date range.</td></tr>`}</tbody></table></div>`;
}
function vReport(q, key) {
  const def = REP[key];
  if (!def) return vNotFound();
  if (!def.allowed()) return vDenied("reports.view");
  const f = UI.filters[`rep_${key}`] || {};
  const d = reportData(key, f);
  const t = todayStr(), m0 = t.slice(0, 8) + "01", y0 = t.slice(0, 5) + "01-01";
  const pm = new Date(Date.UTC(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 2, 1)).toISOString().slice(0, 10), pmEnd = addDays(m0, -1);
  const presets = [["This month", m0, t], ["Last month", pm, pmEnd], ["This year", y0, t], ["All time", "", ""]];
  return `<div class="crumb">${crumb("/reports", "All reports")}</div>` + ph(`${def.icon} ${def.title} report`, def.hint, `${helpBtn("reports")}${dlButton("report", "Download", { arg: key })}`)
    + `<form data-f="repFilter" data-k="${key}" class="hsearch" style="align-items:flex-end"><label class="hint">${key === "timesheets" ? "Periods from" : key === "timeoff" ? "Days from" : "Sent from"}<input class="in" type="date" name="from" value="${esc(f.from || "")}"></label><label class="hint">to<input class="in" type="date" name="to" value="${esc(f.to || "")}"></label>${def.kinds ? `<label class="hint">Type<select class="in" name="kind">${def.kinds.map(([v, l]) => opt(v, l, (f.kind || "") === v)).join("")}</select></label>` : ""}<label class="hint">Status<select class="in" name="status">${opt("", "Any status", !f.status)}${def.statuses.map((s) => opt(s, s, f.status === s)).join("")}</select></label><label class="hint">Person<input class="in" name="who" value="${esc(f.who || "")}" placeholder="Any name"></label><button class="btn pri" style="border-radius:999px">Show</button>${Object.values(f).some(Boolean) ? `<button type="button" class="lnk" data-a="repReset" data-k="${key}">Reset</button>` : ""}</form>`
    + `<div class="form-row" style="margin:8px 0 14px"><span class="hint" style="font-weight:600">Quick dates:</span>${presets.map(([l, a, b]) => `<button class="hchip" data-a="repPreset" data-k="${key}" data-from="${a}" data-to="${b}">${l}</button>`).join("")}</div>`
    + `<div class="stats">${d.totals.map(([l, v]) => stat(l, v)).join("")}</div>`
    + `<div class="grid g3" style="margin-bottom:14px">${d.groups.map(([title, items], gi) => `<section class="card" style="padding:14px 16px">${gi < 2 && items.length <= 6 ? donut(items, { title, total: items.total }) : barList(items, { title })}</section>`).join("")}</div>`
    + cardFlush("", repTable(d.cols, d.rows)) + (d.rows.length > 300 ? `<p class="hint">Showing the first 300 of ${d.rows.length}. The download has all of them.</p>` : "")
    + (d.extra ? `<div class="sect-l">${esc(d.extra[0])}</div>` + cardFlush("", repTable(d.extra[1], d.extra[2], 500)) : "");
}
function vReportsHub() {
  const live = Object.entries(REP).filter(([, r]) => r.allowed()).map(([k, r]) => [`/reports/${k}`, r.icon, r.title, r.hint]);
  const groups = [["Everyday reports", "Pick dates, a type or a person — totals and bars update, and every report downloads for Excel.", [...live, ["/history", "🕘", "History", "Who did what and when — search, filter by area, download."]]]];
  if (can(A, "reports.view")) groups.push(["Money", "For Finance and leaders.", [["/reports/income-statement", "📈", "Profit & Loss", "Money in and money out, every company side by side."], ["/reports/balance-sheet", "⚖️", "Balance Sheet", "What we own, what we owe, and what's left."], ["/reports/trial-balance", "🧮", "Trial Balance", "Every account's balance — debits equal credits."]]]);
  const pp = [];
  if (can(A, "reports.view")) pp.push(["/reports/headcount", "👥", "Headcount", "Who works where, by company and team."]);
  if (can(A, "payroll.view") || can(A, "hr.employees.edit")) pp.push(["/payroll/timesheet-status", "✅", "Timesheet Status", "Whose timesheet is where this pay period."]);
  if (pp.length) groups.push(["People & Pay", "For HR, Payroll and managers.", pp]);
  return ph("Reports", "Answers in a click: on screen to read, or download for Excel.", helpBtn("reports")) + groups.map(([g, lead, items]) => `<h2 class="h2" style="margin-top:18px">${esc(g)}</h2><p class="hint" style="margin:0 0 10px">${esc(lead)}</p><div class="grid g3">${items.map(([go, i, t, d]) => `<button class="rcard" data-go="${go}"><span class="ri" aria-hidden>${i}</span><b>${esc(t)}</b><small>${esc(d)}</small><em>Open →</em></button>`).join("")}</div>`).join("");
}

/* ---------------- How-to guides ---------------- */
const HOWTO_IMG = (() => { try { return JSON.parse(document.getElementById("howto-img")?.textContent || "{}"); } catch { return {}; } })();
/* mirrors the app's src/lib/howto.ts: [key, label, icon, who, [[id, title, why, steps, link, linkLabel, tip?], …]] */
const HOWTO = [
  ["everyone", "Everyone", "🙋", "Things every person in the organization can do.", [
    ["home", "Find your way around Home", "Home is your starting point every day.", ["Sign in — you always land on Home.","Use the big buttons at the top for the most common jobs.","“Waiting on you” shows anything you need to approve (only if you approve things).","“Coming up” lists holidays, paydays and who's away; “Recent history” shows what just happened."], "/dashboard", "Go to Home", "The menu on the left folds away — click a group heading like “People” or “Finance” to open it."],
    ["history", "Look back at what happened", "Every request, approval and change is written down in plain words.", ["Open Reports › History (or “All history” on Home).","Choose whose history: Just me, My team or Everyone you can see.","Tap an area such as Time off or Pay to narrow it down, or search a word or a name.","Use “Download this list” to open it in Excel."], "/history", "Open History"],
    ["directory", "Find a person or see the org chart", "Who does what, and who reports to whom.", ["Open People › Directory and type a name, role or department.","Use the Org chart tab to see teams side by side.","Choose “Reporting lines” to see who reports to whom."], "/people/directory", "Open the directory"],
    ["profile", "Check your profile, benefits and events", "Your own record — the same one HR keeps.", ["Open My Profile.","The tabs along the top are Overview, Employment, Pension & Benefits, Reviews and Certificates.","Employment shows your job, departments and history. Your documents — T4, pay statements and policies — are under My Documents; time off and balances under My Time Off."], "/me/profile", "Open my profile"],
    ["my-reviews", "Do your performance review", "Write your self-review and see your manager's.", ["Open My Profile › Reviews.","Open the current cycle, update each goal's status and write your summary.","Press “Submit to manager” — they add their summary and a rating.","Completed reviews stay here for you to look back on."], "/me/reviews", "Open my reviews"],
    ["my-certs", "Keep your tickets and training up to date", "First aid, faller tickets, HACCP — HR is warned 60 days before anything expires.", ["Open My Profile › Certificates.","Press Add, enter the name, issuer and expiry date.","Renewed it? Add the new expiry so the alert goes away."], "/me/certifications", "Open my certifications"],
    ["my-benefits", "Enrol in, change or waive a benefit", "HR approves it and the deduction follows your pay.", ["Open My Profile › Pension & Benefits.","Under “Make a change” pick the plan, what you want (enrol, change or waive) and who it covers.","Choose the effective date and send it — you can withdraw it while it's waiting."], "/me/profile/benefits", "Open my benefits"],
    ["help", "Get help, change the look, send feedback", "Small things that make the platform easier.", ["The “How-to” button at the top brings you back to these guides.","The sun/moon button switches light and dark mode.","The Feedback button at the bottom sends a note to the administrators.","The Email button at the bottom shows every notification email the platform sent."], "/help", "You're here"],
    ["looks", "Change the look", "Pick the colours and density that suit you — it only changes your screen.", ["Press the palette button in the top bar.","Choose a look: Cedar Classic, Harbour Slate, Boardroom Navy, Moss & Stone or Graphite Compact.","The sun/moon button next to it switches between light and dark.","Your choice is remembered on this device."], "/dashboard", "Go to Home"],
    ["download", "Download anything as Excel or PDF", "One button, three formats, everywhere.", ["Look for the green “Download” button on any report, list or history page.","Choose Excel (.xlsx) for a spreadsheet with filters and frozen headers, PDF for a print-ready copy, or CSV for plain data.","The file keeps the filters you had on screen."], "/reports", "Open Reports"],
    ["search", "Search anything from the top bar", "People, bills, invoices, orders, projects, tasks and guides — one box.", ["Click the search box at the top (or press / anywhere).","Type a name, a number such as INV-10245, or a word.","Use the arrow keys or Enter to open the first result; Esc closes."], "/dashboard", "Go to Home"],
    ["looks-screen", "Pick a look on the full-screen chooser", "All five looks side by side, in light or dark.", ["Press the palette button in the top bar — “Choose a look” opens with all five looks.","Click a card to switch at once — only your screen changes.","Choose Light, Dark or Device at the top."], "/me/looks", "Open the looks"],
  ]],
  ["employee", "Employee", "👤", "Asking for time off, entering hours and getting paid back.", [
    ["timeoff", "Request time off", "Your manager gets it straight away, and the hours fill your timesheet once approved.", ["Open My Time Off (or “Request time off” on Home).","Pick the type, then the first and last day — the hours fill in for you.","Check the green box: it shows what you have and what's left afterwards.","Add a note or a doctor's note if you like, then press “Send to …”."], "/me/time-off", "Request time off", "Changed your mind? Press Withdraw next to the request while it's still waiting."],
    ["timesheet", "Fill in your timesheet", "Approved hours go straight into payroll.", ["Open My Timesheet.","Type your hours for each day; stat holidays and approved time off are already there.","Worked in two departments one day? Use “+ dept” to split the day.","Press “Send for approval” at the end of the pay period."], "/me/time", "Open my timesheet"],
    ["requests", "Ask for travel or a purchase", "Get the OK before you spend.", ["Open My Requests & Expenses and pick a tile — Travel request, Credit card purchase or Purchase / PO.","Fill in where, why and roughly how much.","Drag the quote, agenda or screenshot onto the dashed box.","Press Send — you and your manager both get an email at every step."], "/me/requests", "Open requests & claims"],
    ["claims", "Claim an expense or a trip", "Get paid back for what you paid yourself.", ["Choose Expense claim (one receipt) or Travel claim (per diems, kilometres, several receipts).","Enter the amounts.","Drop the receipts into the dashed box — photos and PDFs both work.","Finance pays you back once it's approved; the status changes to Paid back."], "/me/expenses", "Claim an expense"],
    ["team-tasks", "Update your tasks and tick off steps", "Your manager sees how far along you are without having to ask.", ["Open My work › My Tasks — each task shows its due date, progress, status and the last few things that happened on it.","Press 25%, 50%, 75% or 100%, or change the status menu (To do, In progress, Blocked, Done).","Type a note for your manager in the box under the history and press “Add note” — it's kept with your name and the time.","Press “Show all” to see the whole history, or the task title to tick steps one by one.","Need a reminder for yourself? Press “New task” — it's assigned to you."], "/me/tasks", "Open My Tasks", "On the Board you can drag a card to another column, or use the small status menu on the card."],
    ["status", "See where your requests are", "One list for everything you've asked for.", ["Open My Requests & Expenses (or scroll down on Home).","“Status of everything” shows each request and who it's waiting on.","Use the Waiting / Decided tabs to filter.","Click a request to see its approval trail and files."], "/me/requests", "See my requests"],
    ["timeoff-usage", "See what time off you have left", "Each type shows entitlement, used, pending and remaining.", ["Open My Time Off.","Each card (Vacation, Sick, Personal …) shows the hours you had, used, have waiting for approval and still have.","Request from the form below the cards."], "/me/time-off", "Open My Time Off"],
    ["my-notes", "Add a note to your task", "Short notes with a time and your name — your manager sees them.", ["Open My Tasks.","Type a note under the task and press Add.","The last five entries show under the task; “Show all” opens the full history."], "/me/tasks", "Open My Tasks"],
    ["cert-upload", "Add or renew a certificate with its file", "A copy of the ticket is required; only HR can open it.", ["Open My Profile › Certificates and click Add.","Fill in the name, issuer and expiry and attach the PDF or photo (required).","When it is renewed, click Renew, enter the new expiry and attach the new copy — the old one stays in the history."], "/me/certifications", "Open my certificates"],
    ["review-ack", "Acknowledge your performance review", "Confirm you have read the completed review.", ["Open My Profile › Reviews.","Read the manager's review and rating.","Click Acknowledge — HR and your manager see the date."], "/me/reviews", "Open my reviews"],
  ]],
  ["manager", "Manager", "🧑‍💼", "Approving your team's requests, claims and timesheets — and giving out tasks.", [
    ["approvals", "Approve from Home", "Everything waiting on you is on Home — requests on the left, timesheets on the right.", ["Open Home — “Waiting on you” shows requests & claims next to timesheets.","Open any paperclip to see the attached receipt or quote.","Add a note if you want, then press Approve, Decline or Send back.","The employee is emailed right away; the next approver (if any) too."], "/dashboard", "Go to Home"],
    ["inbox", "Use the full Approvals inbox", "The complete list with every step of each approval.", ["Open Approvals in the menu — the number shows how many are waiting.","Timesheets appear first, then requests and claims.","“Requests you sent” at the bottom shows your own requests."], "/approvals", "Open Approvals"],
    ["team-assign", "Give your team a task with steps and dates", "A simple to-do list for the team — who has what, by when, and how far along it is.", ["Open My Team and press “New task”.","Type what needs doing, pick the person, the start and due dates and the priority.","Add up to 8 short steps — progress then follows the ticked steps.","Switch between Board (columns by status), List (one row per task) and Timeline (bars from start to due date across four weeks).","Use the chips (My tasks, Team, Overdue, Done) or the person menu to narrow it down; the Team table shows open, overdue and average progress per person."], "/team", "Open My Team", "Open a task and press Edit to change dates, reassign it within your team, add steps or delete it."],
    ["team-history", "See who did what on a task", "Every tick, percentage, status change and note is kept with a name and time.", ["Open My Team and click the task.","The Activity list on the right shows the newest first: who did it, what changed (for example 25% → 50%) and when.","Ticked steps show who ticked them, right next to the step.","Every change also appears in Reports › History under Tasks."], "/team", "Open My Team"],
    ["ts-review", "Check a full timesheet before approving", "See every day and every hour before the time goes to payroll.", ["Open Approvals, or Home › Waiting on you.","Press “View full timesheet” on the person's timesheet.","Review each day — hours, departments, time off and stat holidays.","Press Approve, or Send back with a note saying what to fix."], "/approvals", "Open Approvals"],
    ["team-activity", "Follow your team's history", "See what your team asked for and what was decided.", ["Open Reports › History and choose “My team”.","Narrow to Time off, Timesheets or Requests.","Download the list for your records."], "/history?scope=team", "My team's history"],
    ["apr-popup", "Open a request before deciding", "Click any waiting request to see every detail in a window, then approve or decline there.", ["Open Approvals (tabs: Timesheets, Time off, Expenses, Purchases & bills, Other, Sent by me).","Click a request card — who asked, what, amounts, attachments and history open in a window.","Approve, or Decline with a reason. Timesheets keep their own “View full timesheet” button."], "/approvals", "Open Approvals"],
  ]],
  ["hr", "HR", "🧑‍🤝‍🧑", "People records, time off, org changes and timesheet status.", [
    ["hr-records", "Deactivate someone or change their pay", "Keep records current when people leave or get a raise.", ["Open People › Employees and click the person.","Press Deactivate (top right) — their sign-in turns off too. Press Activate to undo.","For a raise, open the Job & Pay tab and fill in “Change salary or rate”.","Every change is saved in History."], "/hr/employees", "Open employee records"],
    ["org-move", "Move someone to another department", "Drag and drop on the organization chart.", ["Open People › Org chart.","Grab a person's card and drop it on their new department.","It saves straight away; you can also change the main department in the directory."], "/people/org-chart", "Open the org chart"],
    ["ts-status", "Check timesheets and download the hours report", "See who hasn't sent theirs in before payroll.", ["Open People › Time & Attendance › Pay-period status and pick the pay period.","Use the coloured chips to see who is Not started, Waiting or Approved.","Press “Remind people” to nudge anyone who hasn't sent theirs.","When all are approved, press “Download hours report”."], "/payroll/timesheet-status", "Open Timesheet Status"],
    ["hr-timeoff", "Follow everyone's time off", "Who's away and what's waiting.", ["Open People › Time & Attendance for who's away right now and every request.","Open Reports › Time off for totals by type and person, and everyone's balances.","Download either for Excel."], "/reports/timeoff", "Time off report"],
    ["hr-benefits", "Approve benefit enrolments", "Requests from employees to enrol, change or waive a plan.", ["Open People › Reviews, Benefits & Pension › Benefits.","Each request shows the plan, coverage and effective date.","Press Approve — the enrolment is written to the person's record; or Decline with a reason."], "/hr/benefits", "Open Benefits Enrolment"],
    ["hr-reviews", "Run a review cycle", "Self-review → manager review → rating, for everyone at once.", ["Open People › Reviews, Benefits & Pension › Performance Reviews and press “Start a review cycle”.","Name it (e.g. “2027 Mid-year”), pick the due date and company.","Everyone with a manager gets a self-review; the manager is the reviewer.","Watch the status chips; past-due reviews show on Home under Needs attention."], "/hr/reviews", "Open Performance Reviews"],
    ["hr-hiring", "Post a job and move applicants along", "From posting to hired — and straight into an employee record.", ["Open People › Hiring and press “New posting”.","Open the posting: applicants sit in columns from Applied to Hired.","Use “Move to” on a card to advance someone; add notes and a rating.","Press “Mark hired” — an onboarding employee record is created for you."], "/hr/hiring", "Open Hiring"],
    ["hr-certs", "Track certifications before they expire", "Expired and expiring tickets, in one list.", ["Open People › People › Certificates.","The tiles show Expired, Expiring within 60 days and Current.","Press Renew on a row to enter the new expiry; Download gives you the list as Excel or PDF."], "/hr/certifications", "Open Training & Certifications"],
    ["hr-terminate", "End someone's employment and issue the ROE", "One card closes everything; the Record of Employment is drafted from posted pay.", ["Open People › Employees and the person's record.","In “End employment” enter the last day, ROE reason and vacation pay, then confirm.","The Finance Manager issues the ROE under Payroll › Records of Employment and downloads it."], "/hr/employees", "Open Employees"],
    ["hr-benefits-set", "Enrol someone in a benefit plan", "HR sets enrolment directly — no request needed.", ["Open People › Reviews, Benefits & Pension › Benefits.","Pick the person, the plan, Join / Change coverage / Opt out, Employee only or Family, and the start date.","Save — the change appears in the history and on the person's Pension & Benefits tab."], "/hr/benefits", "Open Benefits"],
    ["hr-balances", "Adjust a time-off balance", "Carry-overs and corrections, with a reason.", ["Open People › Time & Attendance › Time off › Balances.","Click Adjust on the person, enter the hours (+/−) and a reason.","Adjustments are listed below with who made them."], "/hr/leave", "Open Time off"],
    ["hr-opening", "Open a new position and get it approved", "The opening goes to the hiring manager before it is posted.", ["Open People › Employees › Hiring and click New opening.","Fill in company, department, title, headcount, start date, salary range and reason; the hiring manager defaults to the department's manager.","Send for approval — it appears in the manager's Approvals; once approved the posting is live."], "/hr/hiring/new", "Open New opening"],
    ["hr-cert-remind", "Remind someone to renew a certificate", "An email goes out and the reminder is written in the history.", ["Open People › People › Certificates.","On an expiring or expired row click Send reminder.","The row shows “Reminded by … on …”; only HR sees the attached files."], "/hr/certifications", "Open Certificates"],
  ]],
  ["finance", "Finance", "💼", "Requests & claims, paying people back and money reports.", [
    ["fin-requests", "Review and pay back claims", "Every request and claim in one list.", ["Open Finance › Accounts Payable › Employee claims.","Use Waiting / Approved to filter; open the paperclips to check receipts.","Press “Pay back” on an approved claim — the books and bank entry are written for you."], "/hr/requests", "Open Requests & Claims"],
    ["reports", "Run a report", "Answers in a click, ready for Excel.", ["Open Reports and pick a report.","Choose dates (or a quick date like “This month”), a type or a person.","Totals and bars update; the table shows every line.","Press “Download for Excel” to take it with you."], "/reports/requests", "Requests & claims report"],
    ["fin-recurring", "Set up a recurring or accrual entry", "Monthly entries post themselves; accruals reverse themselves.", ["Open Finance › Accounting › Recurring & accruals and press “New recurring journal”.","Pick the frequency, the first run date and the lines (they must balance).","Tick “Reverse automatically” for an accrual — it reverses on the 1st of next month.","Press “Run all due” whenever Home says some are due."], "/finance/recurring", "Open Recurring & Accruals"],
    ["fin-bankrules", "Match bank lines automatically", "Teach it once — “Service charge goes to bank fees” — then one click.", ["Open Finance › Banking and scroll to “Matching rules” under the account.","Add a rule: a word from the bank description and the account to code it to.","Press “Auto-match” — every unmatched line that fits a rule is posted and matched.","Finish the reconciliation as usual."], "/finance/banking", "Open Banking"],
    ["fin-close", "Close the month with the checklist", "Nothing is forgotten, and the period only closes when every box is ticked.", ["Open Finance › Accounting › Period close.","Automatic checks tell you about draft journals, unmatched bank lines, bill variances, unposted payroll and the CRA remittance — each with a link to fix it.","Tick the manual tasks as you go.","Press “Close period” when the list is complete."], "/finance/periods", "Open Period Close"],
    ["ap-attach", "Attach and find vendor invoices", "Keep the PDF with the bill so anyone can check it later.", ["Open Finance › Accounts Payable and click a bill.","Drag the PDF onto “Attachments” (or click it to pick a file).","Or open Accounts Payable › Vendors, click a vendor and use Documents for contracts and statements.","To find any file later, open Accounts Payable › Files and search by vendor, bill number or file name."], "/finance/ap/attachments", "Open AP attachments"],
    ["fin-match", "Check a bill against the PO and receipt", "Pay only for what was ordered and arrived.", ["Open Finance › Accounts Payable › Matching.","Each bill shows the PO total, what was received and what was billed — and the difference.","Press “Run match” to re-check; a Variance says why in plain words.","If the difference is fine, press “Accept variance” with a reason."], "/procurement/match", "Open 3-Way Match"],
    ["fin-stock", "Watch stock and reorder in one click", "What's on the shelf, what's reserved, what's running low.", ["Open Operations › Sales & Inventory › Stock.","“Reorder alerts” at the top lists anything at or below its reorder point.","Press “Create purchase order” — a draft PO for the preferred vendor appears.","Use Adjust or Transfer for counts and moves between warehouses."], "/inventory/stock", "Open Stock on Hand"],
    ["fin-so", "Take an order and bill what shipped", "Confirm → ship → invoice, with stock and the ledger kept in step.", ["Open Operations › Sales & Inventory › Sales orders and press “New sales order” — prices come from the customer's price list.","Press Confirm: stock is reserved for the order.","Press Ship and enter what left the warehouse.","Press “Create invoice” — only what shipped is billed, and it posts to the books."], "/sales/orders", "Open Sales Orders"],
    ["fin-projects", "Bill a project for time and materials", "Hours and expenses become an invoice in one click.", ["Open Operations › Projects and open the project.","Overview shows budget vs actual by category; Time and Expenses show every line.","Flag lines as billable, then open Billing.","Press “Create invoice” — labour per person plus billable expenses, GST added, posted."], "/projects", "Open Projects"],
    ["bank-statement", "Upload the bank statement and match it", "Statement lines on the left, ledger entries on the right — drag to match.", ["Open Finance › Banking and click Upload bank statement (CSV) — or Load sample statement for a demo.","Drag a statement line onto its ledger entry (or click one, then the other). Auto-match pairs the obvious ones.","Lines nothing explains: Post as new entry. Unmatch undoes a pairing. The difference tile shows what is left."], "/finance/banking", "Open Banking"],
    ["recurring-edit", "Edit a recurring entry", "Change the description, schedule, next run or the lines.", ["Open Finance › Accounting › Recurring.","Click Edit on the entry, change what you need and save.","The change is recorded in the entry's history."], "/finance/recurring", "Open Recurring"],
    ["po-cancel", "Cancel a purchase order and search PO history", "Unused orders can be cancelled; every order is searchable in Reports.", ["Open Operations › Purchasing › Purchase orders; open the order and click Cancel (only if nothing was received or billed).","Give a reason — the order is marked Cancelled.","Reports › Purchase order history finds any order by number, supplier, status or date and downloads it."], "/reports/po-history", "Open PO history"],
    ["ap-files", "File vendor invoices by kind", "Invoice copies, credit notes, statements, contracts — filterable and linkable.", ["Open Finance › Accounts Payable › Files.","Drop a file in, choose its kind, and Link it to a bill or a vendor.","Filter by kind, vendor or company; every file is also visible on its bill."], "/finance/ap/attachments", "Open Files"],
    ["link-po", "Link a bill to its purchase order", "Bills that arrived without a PO reference can still be matched.", ["Open Operations › Purchasing › Matching.","Under “Bills not tied to a purchase order” choose the order and click Link and match.","The 3-way match runs at once and shows any variance."], "/procurement/match", "Open Matching"],
    ["deposit-batch", "Post a deposit batch", "Several customer receipts, one bank deposit.", ["Open Finance › Accounts Receivable.","Tick the receipts that went to the bank together and click Deposit batch.","One entry posts to the bank account; each invoice shows the deposit."], "/finance/ar", "Open Accounts Receivable"],
    ["depreciation", "Run monthly depreciation", "One entry per company per month.", ["Open Finance › Accounting › Fixed assets.","Pick the month and click Run depreciation.","The runs table shows what was posted; the journal entry is linked."], "/finance/assets", "Open Fixed assets"],
    ["stock-count", "Count stock and post the adjustments", "Start a count, enter what you found, post the difference.", ["Open Operations › Sales & Stock › Stock and click Stock count.","Enter the counted quantity per item.","Post — differences become stock adjustments with a reason."], "/inventory/count", "Open Stock count"],
  ]],
  ["payroll", "Payroll", "💵", "Hours in, pay out.", [
    ["pay-ts", "Make sure every timesheet is in", "Payroll only uses approved hours.", ["Open Operations › Payroll › Timesheet status.","Remind anyone Not started or in Draft.","Download the hours report once everything is approved."], "/payroll/timesheet-status", "Open Timesheet Status"],
    ["pay-run", "Run payroll", "From approved hours to posted pay statements.", ["Open Operations › Payroll › Pay runs and open the run for the period.","Press Calculate, check the totals, then send it for approval.","Once approved, Post it — statements go out and the books are written."], "/payroll/runs", "Open payroll runs"],
    ["pay-pd7a", "Prepare the CRA remittance (PD7A)", "What to send CRA by the 15th, straight from the posted runs.", ["Open Operations › Payroll › Remittances.","Press “Generate for month” — CPP, EI and income tax are totalled from every posted run that month.","Check the PD7A panel (account number, gross payroll, number of employees).","Press “Mark paid” once it's sent — the payment is posted to the books."], "/payroll/remittances", "Open CRA Remittances"],
    ["roe", "Issue a Record of Employment", "Drafted when HR ends an employment; the Finance Manager issues it.", ["Open Payroll › Records of Employment.","Open the draft, check the pay periods and insurable earnings, and click Issue.","Download the ROE from the same page."], "/payroll/roe", "Open ROEs"],
  ]],
  ["admin", "Administrator", "🛡️", "Who can do what, approval rules and the audit trail.", [
    ["admin-users", "Give someone access", "Roles decide what each person sees.", ["Open Administration › Users & access.","Check each person's roles and companies."], "/admin/users", "Open Users & Access"],
    ["admin-rules", "Change approval rules", "Decide who approves each kind of request, and from what amount the Executive Director also approves.", ["Open Administration › Approval rules.","Change a dollar threshold and save — new requests follow it right away."], "/admin/workflows", "Open Approval Rules"],
    ["admin-audit", "Read the audit log and feedback", "The unchangeable record, and what people told you.", ["Open Administration › Audit log for every change, filtered by area.","Open Administration › Feedback for notes people sent from the footer."], "/admin/audit", "Open the audit log"],
  ]],
];
function defaultGuideRole() {
  const r = A.roleCodes || [];
  if (A.isSuper || r.some((x) => ["GROUP_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(x))) return "admin";
  if (r.includes("HR_MANAGER")) return "hr";
  if (r.includes("FINANCE_MANAGER") || r.includes("ACCOUNTANT")) return "finance";
  if (r.includes("PAYROLL_ADMIN")) return "payroll";
  if (r.includes("MANAGER") || r.includes("EXECUTIVE")) return "manager";
  return A.employee ? "employee" : "everyone";
}
const WHATS_NEW = [{"area": "New in this edition", "items": [{"title": "Grouped menu with counts", "what": "My work, Me, Team, People, Payroll, Finance, Operations, Reports — with a count where something is waiting.", "guide": "home", "link": "/dashboard"}, {"title": "Search", "what": "One box at the top for people, bills, invoices, orders, projects, tasks and guides.", "guide": "search", "link": "/dashboard"}, {"title": "Approvals in a window", "what": "Click a request to see everything, then approve or decline right there; timesheets keep View full timesheet.", "guide": "apr-popup", "link": "/approvals"}, {"title": "Looks chooser", "what": "All five looks side by side in the “Choose a look” popup (palette button in the top bar).", "guide": "looks-screen", "link": "/me/looks"}, {"title": "Bank statement upload + drag-and-drop matching", "what": "Statement on the left, books on the right, drag to match.", "guide": "bank-statement", "link": "/finance/banking"}, {"title": "Certificates with files and reminders", "what": "Employees attach the ticket; HR alone sees it and can send a reminder that is written in the history.", "guide": "cert-upload", "link": "/me/certifications"}, {"title": "End employment → ROE", "what": "HR ends the employment; the Finance Manager issues the Record of Employment.", "guide": "hr-terminate", "link": "/hr/employees"}, {"title": "New opening needs approval", "what": "A hiring request goes to the hiring manager before it is posted.", "guide": "hr-opening", "link": "/hr/hiring/new"}, {"title": "Cancel PO · PO history · link bill to PO · invoice files by kind · deposit batch · depreciation · stock count", "what": "Finance and operations additions picked from both builds.", "guide": "po-cancel", "link": "/reports/po-history"}]}, {"area": "Everyone", "items": [{"title": "Simpler menu", "what": "Fewer menu items; related pages sit as tabs at the top of each page. Your own items (time, time off, requests, pay, profile) are always at the top.", "guide": "home", "link": "/dashboard"}, {"title": "Home: Needs your attention", "what": "One list of everything waiting for you — approvals, unsent timesheets, tasks due, expiring tickets — each a click away.", "guide": "home", "link": "/dashboard"}, {"title": "Five looks + light/dark", "what": "Cedar Classic, Harbour Slate, Boardroom Navy, Moss & Stone or Graphite Compact — pick with the palette button in the top bar.", "guide": "looks", "link": "/dashboard"}, {"title": "One Download button", "what": "Every report and list downloads as Excel, PDF or CSV from one button.", "guide": "download", "link": "/reports"}]}, {"area": "Teams & managers", "items": [{"title": "My Team", "what": "Give tasks with dates and steps, see them as a board, list or timeline.", "guide": "team-assign", "link": "/team"}, {"title": "Update how much is done", "what": "Team members tick steps or set the percentage done; everyone sees who did what in the task's Activity.", "guide": "team-tasks", "link": "/team"}, {"title": "Task history", "what": "Every change on a task — who, what, when, % before and after.", "guide": "team-history", "link": "/team"}, {"title": "View the full timesheet before approving", "what": "Open the whole day-by-day timesheet from Approvals or Home, then approve or send back.", "guide": "ts-review", "link": "/approvals"}, {"title": "Approvals filters", "what": "Filter what's waiting by time off, expenses & claims, purchases, bills or payroll.", "guide": "inbox", "link": "/approvals"}]}, {"area": "Employees", "items": [{"title": "Performance reviews", "what": "Write your self-review, update your goals and see your manager's review.", "guide": "my-reviews", "link": "/me/reviews"}, {"title": "Training & certifications", "what": "Keep your tickets up to date; you're reminded before they expire.", "guide": "my-certs", "link": "/me/certifications"}, {"title": "Benefits changes", "what": "Ask to enrol in, change or waive a benefit plan.", "guide": "my-benefits", "link": "/me/profile/benefits"}]}, {"area": "HR", "items": [{"title": "Benefits enrolment", "what": "Approve or decline employees' benefit requests.", "guide": "hr-benefits", "link": "/hr/benefits"}, {"title": "Review cycles", "what": "Start a cycle for everyone; follow self-review → manager review → rating.", "guide": "hr-reviews", "link": "/hr/reviews"}, {"title": "Hiring", "what": "Job postings and applicants by stage; hiring creates the employee record.", "guide": "hr-hiring", "link": "/hr/hiring"}, {"title": "Certification tracking", "what": "Expired and expiring tickets in one list.", "guide": "hr-certs", "link": "/hr/certifications"}]}, {"area": "Finance & payroll", "items": [{"title": "Vendor invoice attachments", "what": "Attach PDFs to each bill or vendor; find any file under Accounts Payable › Files.", "guide": "ap-attach", "link": "/finance/ap/attachments"}, {"title": "Recurring & accrual journals", "what": "Monthly entries post themselves; accruals reverse on the 1st.", "guide": "fin-recurring", "link": "/finance/recurring"}, {"title": "Bank matching rules", "what": "Teach a rule once, auto-match every fitting bank line.", "guide": "fin-bankrules", "link": "/finance/banking"}, {"title": "Period close checklist", "what": "Automatic checks and a ticklist before a month closes.", "guide": "fin-close", "link": "/finance/periods"}, {"title": "Matching", "what": "Bills checked against the purchase order and what was received.", "guide": "fin-match", "link": "/procurement/match"}, {"title": "Stock & reorder", "what": "Stock on hand by warehouse; low items draft a purchase order in one click.", "guide": "fin-stock", "link": "/inventory/stock"}, {"title": "Sales orders", "what": "Confirm, ship and invoice what shipped.", "guide": "fin-so", "link": "/sales/orders"}, {"title": "Project billing", "what": "Budgets vs actuals; bill time and materials or a share of a fixed fee.", "guide": "fin-projects", "link": "/projects"}, {"title": "CRA remittance (PD7A)", "what": "What to send CRA each month, from the posted pay runs. The Payroll Administrator runs payroll; the Executive Director approves it.", "guide": "pay-pd7a", "link": "/payroll/remittances"}]}];
function vWhatsNew() {
  return `<p class="hint" style="font-size:13px;margin:0 0 10px">Everything added in the latest releases, in one list. Each row has its step-by-step guide and a button to the page.</p>`
    + WHATS_NEW.map((g) => cardFlush(g.area, `<ul class="wnew">${g.items.map((n) => `<li><div style="min-width:0;flex:1"><b>${esc(n.title)}</b><div class="hint">${esc(n.what)}</div></div><button class="lnk" data-go="/help" data-topic="${esc(n.guide)}">Read the guide</button><button class="btn sm" data-go="${esc(n.link)}">Open →</button></li>`).join("")}</ul>`)).join("");
}
function vHelp() {
  const mine = defaultGuideRole();
  const topicRole = UI.helpTopic ? HOWTO.find((x) => x[4].some((g) => g[0] === UI.helpTopic))?.[0] : null;
  const cur = HOWTO.find((x) => x[0] === (UI.tabs.help || topicRole || mine)) || HOWTO[0];
  const isNew = UI.tabs.help === "new";
  const tabsHtml = HOWTO.map(([k, l]) => `<button class="hchip ${!isNew && k === cur[0] ? "on" : ""}" data-a="helpRole" data-v="${k}" role="tab" aria-selected="${!isNew && k === cur[0]}">${esc(l)}${k === mine && k !== cur[0] ? ` <span>· you</span>` : ""}</button>`).join("")
    + `<button class="hchip ${isNew ? "on" : ""}" data-a="helpRole" data-v="new" role="tab" aria-selected="${isNew}" style="font-weight:700">What's new</button>`;
  if (isNew) return ph("How-to guides", "Short, step-by-step guides with a picture of the real screen. Pick your role, or start with Everyone.") + `<div class="fchips2" role="tablist">${tabsHtml}</div>` + vWhatsNew();
  return ph("How-to guides", "Short, step-by-step guides with a picture of the real screen. Pick your role, or start with Everyone.")
    + `<div class="fchips2" role="tablist">${tabsHtml}</div><p class="hint" style="font-size:13px;margin:0 0 4px">${esc(cur[3])}</p>`
    + cur[4].map(([id, title, why, steps, go, label, tip], i) => `<article class="guide ${UI.helpTopic === id ? "hl" : ""}" id="g-${id}"><div class="gtext"><small class="gnum">GUIDE ${i + 1}</small><h2>${esc(title)}</h2><p class="hint">${esc(why)}</p><ol class="gsteps">${steps.map((st, j) => `<li><span>${j + 1}</span>${esc(st)}</li>`).join("")}</ol>${tip ? `<p class="gtip">Tip: ${esc(tip)}</p>` : ""}<button class="btn pri gbtn" data-go="${go}">${esc(label)}</button></div>
      <div class="gimg">${HOWTO_IMG[id] ? `<button class="gshot" data-a="helpZoom" data-id="${id}" title="See it bigger"><img src="${HOWTO_IMG[id]}" alt="Screenshot: ${esc(title)}" loading="lazy"></button><small>Click the picture to see it bigger</small>` : `<div class="gph">Screenshot coming soon</div>`}</div></article>`).join("");
}

/* ==========================================================================
   views-me.js — sign-in, company choice, My Workspace
   ========================================================================== */
const DEMO_PASSWORD = "TEST26!";

function userLabel(u) {
  const roles = [...new Set(S.userRoles.filter((r) => r.userId === u.id).map((r) => ROLES[r.roleCode]?.name))].join(", ") || "User";
  const e = u.employeeId ? byId(S.employees, u.employeeId) : null;
  return `${u.displayName} — ${roles}${e ? " · " + co(e.companyId).displayName : ""}`;
}
const WAVE = `<svg class="wave" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50 C 180 110, 330 110, 500 60 S 820 0, 1000 65 L1000 120 L0 120 Z" fill="var(--wave-fill)"/><path d="M0 50 C 180 110, 330 110, 500 60 S 820 0, 1000 65" fill="none" stroke="#e8352a" stroke-width="9" stroke-linecap="round"/></svg>`;
function vLogin() {
  const users = S.users.filter((u) => u.isActive !== false).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const demo = S.users.filter((u) => u.isDemoUser).sort((a, b) => a.demoLabel.localeCompare(b.demoLabel));
  const cos = [...S.companies].sort((a, b) => a.code.localeCompare(b.code));
  return `<div class="login light"><div class="brandp light">
      <div class="brand-inner"><img src="${HAICO_LOGO}" alt="HaiCo — Haida Enterprise Corporation" class="logo">
      <div class="cos">${cos.map((c) => `<div class="coi"><span class="sq" style="width:10px;height:10px;background:${esc(c.colorTag)}"></span><div><b>${esc(c.displayName)}</b><small>${esc(c.industry)}</small></div></div>`).join("")}</div></div>
      <div class="foot"><span class="tag">DEMO</span><span>All names, figures and identifiers are fictional.</span></div>${WAVE}
    </div>
    <div class="formp"><div class="box">
      <h2>Sign in</h2><p class="muted" style="margin:4px 0 0">Use your HaiCo account</p>
      ${UI.loginError ? `<div class="msg err" style="margin-top:16px">That password didn't work. Every demo account uses ${esc(DEMO_PASSWORD)}.</div>` : ""}
      <form data-f="login" style="margin-top:22px;display:grid;gap:14px">
        <div class="fld"><label for="lgUser">Who are you?</label><select class="in" id="lgUser" name="userId" required>${opt("", `Choose your name (${users.length} people)`, true)}${users.map((u) => opt(u.id, userLabel(u))).join("")}</select></div>
        <div class="fld"><label for="lgPw">Password</label><input class="in" id="lgPw" name="password" type="password" placeholder="••••••••" autocomplete="current-password" required></div>
        <button class="btn pri" style="height:44px;font-size:15px">Sign in</button>
      </form>
      <div class="or">OR EXPLORE WITH A DEMO ROLE</div>
      <div class="roles">${demo.map((u) => `<button class="btn" data-a="demoLogin" data-id="${u.id}">${esc(u.demoLabel)}</button>`).join("")}</div>
      <p class="hint" style="text-align:center;margin-top:20px;line-height:1.7">Every demo account uses the password <span class="pw">${esc(DEMO_PASSWORD)}</span>. You can switch roles anytime from the banner inside the app.<br>${SYNC.mode === "live" ? "This demo is live: everyone with the link works in the same company data." : "Changes you make are kept in this browser."}</p>
    </div></div></div>`;
}
function vChoose() {
  const cos = S.companies.filter((c) => canSee(A, c.id)).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const head = (id) => S.employees.filter((e) => e.companyId === id && ["ACTIVE", "ON_LEAVE", "ONBOARDING"].includes(e.status)).length;
  return `<div class="choose"><div class="weave"></div><h1 style="margin:14px 0 4px;font-size:24px">Welcome, ${esc(A.user.displayName.split(" ")[0])}</h1><p class="muted" style="margin:0">Pick which company to look at. You can switch any time from the top bar.</p>
    <div class="cogrid">${A.companyIds == null ? `<button class="cocard" data-a="pickCo" data-id="ALL"><span class="weave" style="width:60px;height:4px"></span><b>The whole group</b><small>Every company side by side, plus consolidated totals</small></button>` : ""}
    ${cos.map((c) => `<button class="cocard" data-a="pickCo" data-id="${c.id}"><span class="sq" style="width:12px;height:12px;background:${esc(c.colorTag)}"></span><b>${esc(c.displayName)}</b><small>${esc(c.industry)} · ${esc(c.city)} · ${head(c.id)} people</small></button>`).join("")}</div></div>`;
}

/* ---------------- My Dashboard ---------------- */
function leaveBalances(empId, year = 2026) {
  return S.leaveTypes.map((lt) => {
    const b = S.leaveBalances.find((x) => x.employeeId === empId && x.leaveTypeId === lt.id && x.year === year);
    const pending = S.leaveRequests.filter((r) => r.employeeId === empId && r.leaveTypeId === lt.id && r.status === "PENDING_APPROVAL").reduce((s, r) => s + r.totalHours, 0);
    const ent = b ? b.entitledHours + (b.carriedOverHours || 0) : 0, used = b?.usedHours || 0;
    return { lt, ent, used, pending, avail: ent - used - pending, has: !!b };
  });
}
const myEntries = (empId) => S.payrollEntries.filter((p) => p.employeeId === empId).map((p) => ({ p, run: byId(S.payrollRuns, p.payrollRunId) })).filter((x) => x.run?.status === "POSTED").sort((a, b) => (a.run.payDate < b.run.payDate ? 1 : -1));

function vMe() {
  const e = A.employee;
  if (!e) return ph("My Dashboard") + card("", empty("This account isn't linked to an employee", "Ask an administrator to connect your sign-in to your employee record."));
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const bal = leaveBalances(e.id);
  const vac = bal.find((b) => b.lt.code === "VACATION"), sick = bal.find((b) => b.lt.code === "SICK");
  const st = settingsFor(S, e.companyId);
  const start = periodStartFor(todayStr(), st.timesheetCadence);
  const sheet = S.timesheets.find((t) => t.employeeId === e.id && t.periodStart === start);
  const last = myEntries(e.id)[0];
  const pos = byId(S.positions, e.positionId);
  const reqs = [
    ...S.leaveRequests.filter((r) => r.employeeId === e.id).map((r) => ({ at: r.createdAt || r.startDate, t: `${byId(S.leaveTypes, r.leaveTypeId)?.name} · ${dShort(r.startDate)}${r.endDate !== r.startDate ? "–" + dShort(r.endDate) : ""}`, s: r.status, go: "/me/requests" })),
    ...S.expenseClaims.filter((x) => x.employeeId === e.id).map((x) => ({ at: x.submittedAt, t: `${x.claimNumber} · ${x.purpose}`, s: x.status, go: "/me/expenses" })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
  const notes = myNotifs().slice(0, 5);
  return ph(`${hello}, ${e.firstName}`, `${pos?.title || ""} · ${co(e.companyId).displayName}`) + flashHtml()
    + `<div class="stats">${stat("Vacation left", `${hrs(vac?.avail ?? 0)} h`, vac ? `${hrs(vac.used)} used · ${hrs(vac.pending)} waiting` : "", "primary")}${stat("Sick time left", `${hrs(sick?.avail ?? 0)} h`, sick ? `of ${hrs(sick.ent)} h this year` : "")}${stat("Last take-home pay", last ? money(last.p.netCents) : "—", last ? `Paid ${dLong(last.run.payDate)}` : "No statements yet")}${stat("This period's hours", sheet ? (STATUS[sheet.status]?.[0] || sheet.status) : "Not started", periodLabel(start, periodEndFor(start, st.timesheetCadence)), sheet?.status === "REJECTED" ? "warn" : "")}</div>`
    + `<div class="grid g3">${card("Quick actions", `<div style="display:grid;gap:8px"><button class="btn" data-go="/me/time">Enter this period's hours</button><button class="btn" data-go="/me/time-off">Ask for time off</button><button class="btn" data-go="/me/expenses">Claim an expense</button><button class="btn" data-go="/me/pay">See my pay statements</button></div>`)}
      ${card("My requests", reqs.length ? reqs.map((r) => `<div class="row" style="padding:9px 0"><div class="grow" style="min-width:0"><button class="lnk" data-go="${r.go}">${esc(r.t)}</button></div>${badge(r.s)}</div>`).join("") : empty("No requests yet"))}
      ${card("Notifications", notes.length ? notes.map((n) => `<div style="padding:8px 0;border-top:1px solid var(--border)"><div style="font-weight:600;font-size:12.5px">${esc(n.title)}</div><div class="hint">${esc(n.body || "")} ${n.body ? "·" : ""} ${esc(ago(n.createdAt))}</div></div>`).join("") : empty("Nothing new"))}</div>`;
}

/* ---------------- My Time ---------------- */
function tsDaysMeta(e, start, end, sheet) {
  const st = settingsFor(S, e.companyId);
  const stats = new Map(S.statHolidays.map((h) => [h.date, h]));
  const entries = sheet ? S.timesheetEntries.filter((x) => x.timesheetId === sheet.id) : [];
  return eachDate(start, end).map((d) => {
    const es = entries.filter((x) => x.date === d);
    const sh = stats.get(d);
    const sum = (f) => es.reduce((s, x) => s + (x[f] || 0), 0);
    return {
      date: d, we: isWeekend(d), stat: sh && !isWeekend(d) ? { hours: st.standardHoursPerDay ?? 8, name: sh.name } : null,
      leave: { vac: sum("vacationHours"), sick: sum("sickHours"), pers: sum("personalHours"), other: sum("otherLeaveHours") },
      manual: es.filter((x) => !x.isAutoFilled && !x.sourceLeaveRequestId).map((x) => ({ dep: x.departmentId || "", prj: x.projectId || "", worked: x.workedHours || 0, banked: x.bankedOtHours || 0 })),
    };
  });
}
function vMyTime(q) {
  const e = A.employee;
  if (!e) return ph("My Timesheet") + card("", empty("This account isn't linked to an employee"));
  const st = settingsFor(S, e.companyId);
  const cad = st.timesheetCadence || "BIWEEKLY";
  const start = periodStartFor(q.period || todayStr(), cad), end = periodEndFor(start, cad);
  const sheet = S.timesheets.find((t) => t.employeeId === e.id && t.periodStart === start);
  const status = sheet?.status || "DRAFT";
  const editable = ["DRAFT", "REJECTED"].includes(status);
  const meta = tsDaysMeta(e, start, end, sheet);
  const key = `${e.id}|${start}|${status}`;
  if (!UI.ts || UI.ts.key !== key || !editable) {
    UI.ts = { key, empId: e.id, start, days: meta.map((m) => ({ date: m.date, rows: m.manual.length ? m.manual : [{ dep: e.departmentId || "", prj: "", worked: 0, banked: 0 }] })) };
  }
  UI.ts.meta = meta; UI.ts.rules = rulesOf(st); UI.ts.weekBreak = cad === "BIWEEKLY" ? 7 : -1; UI.ts.editable = editable;
  const comp = latestComp(e.id);
  UI.ts.rate = comp?.payType === "HOURLY" ? comp.hourlyRateCents : null;
  const deps = S.departments.filter((d) => d.companyId === e.companyId);
  const prjs = S.projects.filter((p) => p.companyId === e.companyId && p.status === "ACTIVE");
  const dis = editable ? "" : " disabled";
  const totalsRow = (id, label) => `<tr class="wt"><td colspan="3" style="font-family:var(--font)">${label}</td>${["worked", "stat", "banked", "vac", "sick", "pers", "other"].map((k) => `<td id="${id}-${k}"></td>`).join("")}<td id="${id}-all" style="text-align:right"></td><td id="${id}-ot" style="text-align:right;font-size:11px;color:var(--t-amber)"></td></tr>`;
  let rows = "";
  UI.ts.days.forEach((d, di) => {
    const m = meta[di];
    if (di === 0) rows += `<tr class="sect"><td colspan="12">WEEK 1</td></tr>`;
    if (di === UI.ts.weekBreak) rows += totalsRow("w1", "Week 1 total") + `<tr class="sect"><td colspan="12">WEEK 2</td></tr>`;
    const lv = (v) => (v > 0 ? `<span class="lv">${v.toFixed(2)}</span>` : `<span class="lv e">0</span>`);
    d.rows.forEach((r, ri) => {
      rows += `<tr class="${m.we ? "we" : ""} ${m.stat ? "stat" : ""}"><td style="font-weight:600">${ri === 0 ? dShort(m.date) : ""}</td><td>${ri === 0 ? DOW[dowOf(m.date)] : ""}</td>
      <td style="text-align:left"><span style="display:inline-flex;gap:4px"><select aria-label="Department ${dShort(m.date)}" data-ts="dep" data-d="${di}" data-r="${ri}"${dis}>${opt("", "— dept —", !r.dep)}${deps.map((x) => opt(x.id, `${x.code} — ${x.name}`, x.id === r.dep)).join("")}</select><select aria-label="Project ${dShort(m.date)}" data-ts="prj" data-d="${di}" data-r="${ri}"${dis}>${opt("", "— project —", !r.prj)}${prjs.map((x) => opt(x.id, x.code, x.id === r.prj)).join("")}</select></span></td>
      <td><input class="cell" inputmode="decimal" aria-label="Worked hours ${dShort(m.date)}" data-ts="worked" data-d="${di}" data-r="${ri}" value="${r.worked || ""}"${dis}></td>
      <td>${ri === 0 && m.stat ? `<span class="sh" title="${esc(m.stat.name)}">${m.stat.hours.toFixed(1)}</span>` : ""}</td>
      <td><input class="cell" inputmode="decimal" aria-label="Banked hours ${dShort(m.date)}" data-ts="banked" data-d="${di}" data-r="${ri}" value="${r.banked || ""}"${dis}></td>
      <td>${ri === 0 ? lv(m.leave.vac) : ""}</td><td>${ri === 0 ? lv(m.leave.sick) : ""}</td><td>${ri === 0 ? lv(m.leave.pers) : ""}</td><td>${ri === 0 ? lv(m.leave.other) : ""}</td>
      <td class="num" style="text-align:right;font-weight:600" id="${ri === 0 ? `dt-${di}` : ""}"></td>
      <td style="text-align:right">${editable ? (ri === 0 ? `<button class="lnk" style="font-size:11px" data-a="tsAdd" data-d="${di}" title="Split this day across two departments or projects">+ split</button>` : `<button class="lnk" style="font-size:11px;color:var(--danger)" data-a="tsDel" data-d="${di}" data-r="${ri}">remove</button>`) : ""}</td></tr>`;
    });
  });
  rows += totalsRow(UI.ts.weekBreak > 0 ? "w2" : "w1", UI.ts.weekBreak > 0 ? "Week 2 total" : "Week total");
  const prev = addDays(start, -1), next = addDays(end, 1);
  const note = status === "REJECTED" ? `<div class="msg warn">Your manager sent this back: “${esc(sheet.rejectedReason)}” — fix it and send again.</div>`
    : status === "SUBMITTED" ? `<div class="msg info">Sent for approval — your manager will review it. You can't edit while it's waiting.</div>`
    : status === "APPROVED" ? `<div class="msg ok">Approved by ${esc(sheet.approvedByName)}. It goes into the next payroll run.</div>`
    : status === "LOCKED" ? `<div class="msg info">Paid — this period is locked by payroll.</div>` : "";
  return ph("My Timesheet", "Enter your hours for each day, then press Send for approval. Approved time off and stat holidays fill in by themselves.",
    `<div style="display:inline-flex;align-items:center;border:1px solid var(--input);border-radius:8px;background:var(--card)"><button class="lnk" style="padding:6px 12px" data-go="/me/time?period=${prev}" aria-label="Previous period">‹</button><span style="font-weight:600;font-size:13px;padding:0 4px">${periodLabel(start, end)}</span><button class="lnk" style="padding:6px 12px" data-go="/me/time?period=${next}" aria-label="Next period">›</button></div>${badge(status)}${editable ? `<button class="btn pri" data-a="tsSave" data-submit="1">Send for approval</button>` : ""}`)
    + flashHtml() + note
    + `<section class="card" id="tsg"><div class="tw"><table class="tsg"><thead><tr><th>DATE</th><th>DAY</th><th style="text-align:left">DEPARTMENT / PROJECT</th><th>WORKED</th><th>STAT</th><th title="Overtime hours kept as time off instead of being paid">BANKED OT</th><th>VACATION</th><th>SICK</th><th>PERSONAL</th><th>OTHER</th><th style="text-align:right">DAY TOTAL</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="legend"><span><span class="sw" style="background:var(--leave)"></span>filled from approved time off — not typed</span><span><span class="sw" style="border:1.5px dashed var(--stat-border);background:var(--stat-bg)"></span>stat holiday (auto)</span><span style="margin-left:auto;color:var(--fg)" id="ts-sum"></span></div>
      ${editable ? `<div class="legend" style="background:var(--row-head)"><button class="btn" data-a="tsSave" data-submit="0">Save draft</button><button class="btn pri" data-a="tsSave" data-submit="1">Send for approval</button><span>Overtime is worked out automatically — over ${st.dailyOtThreshold} h in a day or ${st.weeklyOtThreshold} h in a week.</span></div>` : ""}</section>
      <p class="hint" style="margin-top:10px">Need time off instead? ${goLink("/me/time-off", "Ask for time off →")}</p>`;
}
function tsWeek(days, meta, rules) {
  const t = { worked: 0, stat: 0, banked: 0, vac: 0, sick: 0, pers: 0, other: 0, ot: 0, dot: 0 };
  days.forEach((d, i) => {
    const m = meta[i];
    const w = d.rows.reduce((s, r) => s + (Number(r.worked) || 0), 0);
    t.worked += w; t.banked += d.rows.reduce((s, r) => s + (Number(r.banked) || 0), 0);
    t.stat += m.stat?.hours || 0; t.vac += m.leave.vac; t.sick += m.leave.sick; t.pers += m.leave.pers; t.other += m.leave.other;
    t.dot += Math.max(0, w - rules.dailyDouble); t.ot += Math.max(0, Math.min(w, rules.dailyDouble) - rules.dailyOt);
  });
  const reg = t.worked - t.ot - t.dot;
  if (reg > rules.weeklyOt) t.ot += reg - rules.weeklyOt;
  return t;
}
function tsTotals() {
  const T = UI.ts; if (!T?.meta) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  T.days.forEach((d, i) => { const m = T.meta[i]; const tot = d.rows.reduce((s, r) => s + (Number(r.worked) || 0) + (Number(r.banked) || 0), 0) + (m.stat?.hours || 0) + m.leave.vac + m.leave.sick + m.leave.pers + m.leave.other; set(`dt-${i}`, tot.toFixed(2)); });
  const wb = T.weekBreak;
  const w1 = tsWeek(wb > 0 ? T.days.slice(0, wb) : T.days, wb > 0 ? T.meta.slice(0, wb) : T.meta, T.rules);
  const w2 = wb > 0 ? tsWeek(T.days.slice(wb), T.meta.slice(wb), T.rules) : null;
  const fill = (id, t) => { ["worked", "stat", "banked", "vac", "sick", "pers", "other"].forEach((k) => set(`${id}-${k}`, t[k].toFixed(2))); set(`${id}-all`, (t.worked + t.stat + t.vac + t.sick + t.pers + t.other).toFixed(2)); set(`${id}-ot`, `OT ${(t.ot + t.dot).toFixed(2)}`); };
  fill("w1", w1); if (w2) fill("w2", w2);
  const all = w2 ? Object.fromEntries(Object.keys(w1).map((k) => [k, w1[k] + w2[k]])) : w1;
  const total = all.worked + all.stat + all.vac + all.sick + all.pers + all.other;
  let est = "";
  if (T.rate != null) { const g = (all.worked - all.ot - all.dot + all.stat) * T.rate + all.ot * T.rate * 1.5 + all.dot * T.rate * 2; est = ` · est. gross <strong class="num">${money(Math.round(g))}</strong>`; }
  const el = document.getElementById("ts-sum");
  if (el) el.innerHTML = `Period total <strong class="num">${total.toFixed(2)} h</strong> · OT <strong class="num" style="color:var(--t-amber)">${(all.ot + all.dot).toFixed(2)} h</strong>${est}`;
}

/* ---------------- My Requests ---------------- */
function vMyRequestsLegacy() {
  const e = A.employee;
  if (!e) return ph("My Requests") + card("", empty("This account isn't linked to an employee"));
  const bal = leaveBalances(e.id);
  const mine = S.leaveRequests.filter((r) => r.employeeId === e.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const mgr = e.managerId ? byId(S.employees, e.managerId) : null;
  const nextMon = addDays(todayStr(), ((8 - dowOf(todayStr())) % 7) || 7);
  const form = `<form data-f="leave" class="form-grid">
    <div class="fld"><label for="lvType">Type of time off</label><select class="in" id="lvType" name="leaveTypeId">${bal.filter((b) => b.has || b.lt.code === "OTHER").map((b) => opt(b.lt.id, b.lt.code === "OTHER" ? b.lt.name : `${b.lt.name} · ${hrs(b.avail)} h left`)).join("")}</select></div>
    <div class="fld"><label for="lvStart">First day</label><input class="in" type="date" id="lvStart" name="start" value="${nextMon}" required></div>
    <div class="fld"><label for="lvEnd">Last day</label><input class="in" type="date" id="lvEnd" name="end" value="${nextMon}"></div>
    <div class="fld"><label for="lvPart">How much of each day</label><select class="in" id="lvPart" name="partialHours">${opt("0", "Full days", true)}${[2, 4, 6].map((h) => opt(h, `${h} hours`)).join("")}</select></div>
    <div class="fld" style="grid-column:1/-1"><label for="lvNotes">Note for ${esc(mgr ? empName(mgr) : "your approver")} (optional)</label><input class="in" id="lvNotes" name="notes" placeholder="e.g. Family trip — back on the 13th"></div>
    <div class="form-row" style="grid-column:1/-1"><button class="btn pri">Send request</button><span class="hint">Weekends and stat holidays aren't counted. Goes to ${esc(mgr ? empName(mgr) : "your manager")} first.</span></div></form>`;
  const balT = table(["Type", ">Entitled", ">Used", ">Waiting", ">Available"], bal.filter((b) => b.has).map((b) => `<tr><td><span class="chip"><span class="sq" style="background:${esc(b.lt.color)}"></span>${esc(b.lt.name)}</span></td>${td(hrs(b.ent), 1)}${td(hrs(b.used), 1)}${td(hrs(b.pending), 1)}${td(`<strong>${hrs(b.avail)}</strong>`, 1)}</tr>`));
  const list = table(["Dates", "Type", ">Hours", "Status", "Decided by", ""], mine.map((r) => `<tr><td>${dLong(r.startDate)}${r.endDate !== r.startDate ? ` → ${dLong(r.endDate)}` : ""}${r.notes ? `<div class="hint">${esc(r.notes)}</div>` : ""}</td><td>${esc(byId(S.leaveTypes, r.leaveTypeId)?.name)}</td>${td(hrs(r.totalHours), 1)}<td>${badge(r.status)}</td><td>${esc(r.decidedByName || (r.status === "PENDING_APPROVAL" ? "Waiting for " + whoIsNext(S, byId(S.approvals, r.approvalInstanceId) || {}) : "—"))}</td><td class="r">${r.status === "PENDING_APPROVAL" ? `<button class="btn sm" data-a="withdraw" data-id="${r.id}">Withdraw</button>` : ""}</td></tr>`), "You haven't asked for time off yet.");
  return ph("My Requests", "Ask for time off and follow each request through approval.") + flashHtml()
    + `<div class="grid g-main">${card("Ask for time off", form)}${cardFlush("My balances · 2026", balT)}</div><div class="sect-l">My time-off requests</div>${cardFlush("", list)}`;
}

/* ---------------- My Pay + statements ---------------- */
function vMyPay() {
  const e = A.employee;
  if (!e) return ph("My Pay") + card("", empty("This account isn't linked to an employee"));
  const list = myEntries(e.id);
  const ytd = list.filter((x) => x.run.payDate.startsWith("2026"));
  const sumL = (code) => ytd.reduce((s, x) => s + S.payrollLines.filter((l) => l.payrollEntryId === x.p.id && l.typeCode === code && l.kind === "DEDUCTION").reduce((a, l) => a + l.amountCents, 0), 0);
  const comp = latestComp(e.id);
  const prof = S.payProfiles.find((p) => p.employeeId === e.id);
  return ph("My Pay", "Every pay statement, with year-to-date totals.") +
    `<div class="stats">${stat("Earned this year", money(ytd.reduce((s, x) => s + x.p.grossCents, 0)), `${ytd.length} pay${ytd.length === 1 ? "" : "s"} in 2026`, "primary")}${stat("Take-home this year", money(ytd.reduce((s, x) => s + x.p.netCents, 0)))}${stat("CPP + EI this year", money(sumL("CPP") + sumL("EI")))}${stat("My pay rate", comp ? (comp.payType === "HOURLY" ? `${money(comp.hourlyRateCents)}/h` : `${moneyCompact(comp.annualSalaryCents)}/yr`) : "—", prof?.directDepositActive ? `Direct deposit ${prof.bankAccountMasked}` : "Paid by cheque")}</div>`
    + cardFlush("Pay statements", table(["Pay day", "Period", "Run", ">Gross", ">Taken off", ">Take-home"], list.map(({ p, run }) => `<tr class="click" data-go="/me/pay/${p.id}"><td><strong>${dLong(run.payDate)}</strong></td><td>${periodLabel(run.periodStart, run.periodEnd)}</td><td class="mono">${esc(run.runNumber)}</td>${td(money(p.grossCents), 1)}${td(money(p.totalDeductionsCents), 1)}${td(`<strong>${money(p.netCents)}</strong>`, 1)}</tr>`), "Your first statement appears here once payroll is posted."));
}
function vStatement(entryId, back) {
  const p = byId(S.payrollEntries, entryId);
  if (!p) return ph("Statement not found") + card("", empty("This statement no longer exists", "It may have been recalculated."));
  const run = byId(S.payrollRuns, p.payrollRunId);
  const emp = byId(S.employees, p.employeeId);
  const c = co(emp.companyId);
  const dep = byId(S.departments, emp.departmentId);
  const prof = S.payProfiles.find((x) => x.employeeId === emp.id);
  const lines = S.payrollLines.filter((l) => l.payrollEntryId === p.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const ytdEntries = S.payrollEntries.filter((x) => x.employeeId === emp.id).filter((x) => { const r = byId(S.payrollRuns, x.payrollRunId); return r && (r.status === "POSTED" || x.id === p.id) && r.payDate <= run.payDate; });
  const ytdIds = new Set(ytdEntries.map((x) => x.id));
  const ytdL = S.payrollLines.filter((l) => ytdIds.has(l.payrollEntryId));
  const ytd = (k, c2) => ytdL.filter((l) => l.kind === k && l.typeCode === c2).reduce((s, l) => s + l.amountCents, 0);
  const ytdT = (k) => ytdL.filter((l) => l.kind === k).reduce((s, l) => s + l.amountCents, 0);
  const sect = (k) => lines.filter((l) => l.kind === k);
  const small = (k, title, total) => `<div style="min-width:0"><div class="sect-l" style="margin-top:14px">${title}</div><div class="tw"><table class="t"><thead><tr><th>Description</th><th class="r">This pay</th><th class="r">This year</th></tr></thead><tbody>${sect(k).map((l) => `<tr><td>${esc(l.description)}</td>${td(money(l.amountCents), 1)}${td(money(ytd(k, l.typeCode)), 1)}</tr>`).join("")}<tr class="tot"><td>Total</td>${td(money(total), 1)}${td(money(ytdT(k)), 1)}</tr></tbody></table></div></div>`;
  return `<div class="crumb">${crumb(back, back === "/me/pay" ? "My Pay" : "Pay statements")}</div>` + `<div class="stmt">
    <div class="hd"><div><div style="font-weight:700;letter-spacing:.06em">${esc(c.legalName.toUpperCase())}</div><div class="hint">A Haico Group company · ${esc(c.city)}, BC</div></div><div style="text-align:right"><div style="font-weight:700;letter-spacing:.1em">PAY STATEMENT</div><div class="mono hint">${esc(run.runNumber)} · ${esc(emp.employeeNumber)}</div><span class="badge tone-amber" style="margin-top:4px">DEMO DOCUMENT</span></div></div>
    <div class="meta"><div><span class="k">Employee</span>${esc(empName(emp))}</div><div><span class="k">Department</span>${esc(dep?.name || "—")}</div><div><span class="k">Payment</span>${prof?.directDepositActive ? `Direct deposit · <span class="mono">${esc(prof.bankAccountMasked)}</span>` : "Cheque"}</div><div><span class="k">Pay period</span><span class="mono">${run.periodStart} → ${run.periodEnd}</span></div><div><span class="k">Pay day</span><span class="mono">${run.payDate}</span></div><div><span class="k">Status</span>${badge(run.status)}</div></div>
    <div class="sect-l" style="margin-top:14px">Earnings</div><div class="tw"><table class="t"><thead><tr><th>Description</th><th class="r">Hours</th><th class="r">Rate</th><th class="r">This pay</th><th class="r">This year</th></tr></thead><tbody>${sect("EARNING").map((l) => `<tr><td>${esc(l.description)}</td>${td(l.hours ? hrs(l.hours) : "—", 1)}${td(l.rateCents ? money(l.rateCents) : "—", 1)}${td(money(l.amountCents), 1)}${td(money(ytd("EARNING", l.typeCode)), 1)}</tr>`).join("")}<tr class="tot"><td>Total earnings</td>${td(hrs(p.insurableHours), 1)}<td></td>${td(money(p.grossCents), 1)}${td(money(ytdT("EARNING")), 1)}</tr></tbody></table></div>
    <div class="grid g2">${small("DEDUCTION", "Taken off your pay", p.totalDeductionsCents)}${small("EMPLOYER_COST", "Paid by the company for you", p.employerCostsCents)}</div>
    <div class="net"><div><span class="k">Gross pay</span><b>${money(p.grossCents)}</b></div><div><span class="k">Total taken off</span><b>−${money(p.totalDeductionsCents)}</b></div><div class="take"><span class="k">Take-home pay</span><b>${money(p.netCents)}</b></div></div>
    <p class="hint" style="margin-top:14px">Insurable earnings this pay: <span class="mono">${money(p.eiInsurableCents)}</span> · Pensionable: <span class="mono">${money(p.cppPensionableCents)}</span>${run.status !== "POSTED" ? " · Preview — not yet posted" : ""}<br>DEMO — produced by HGWEB for the Haico Group platform. Amounts are illustrative and are not certified CRA payroll calculations. © 2026 HGWEB.</p></div>`;
}

/* ---------------- My Expenses ---------------- */
function vMyExpenses() {
  const e = A.employee;
  if (!e) return ph("Expense claim") + card("", empty("This account isn't linked to an employee"));
  const mine = S.expenseClaims.filter((x) => x.employeeId === e.id).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  const form = `<form data-f="expense" class="form-grid">
    <div class="fld"><label for="xMer">Store or supplier</label><input class="in" id="xMer" name="merchant" placeholder="e.g. Island Workwear" required></div>
    <div class="fld"><label for="xCat">What was it for?</label><select class="in" id="xCat" name="categoryCode">${S.expenseCategories.map((c) => opt(c.code, c.name)).join("")}</select></div>
    <div class="fld"><label for="xAmt">Amount (CAD)</label><input class="in num" id="xAmt" name="amount" inputmode="decimal" placeholder="0.00" required></div>
    <div class="fld"><label for="xDate">Date</label><input class="in" type="date" id="xDate" name="date" value="${todayStr()}"></div>
    <div class="fld" style="grid-column:1/-1"><label for="xPur">Purpose</label><input class="in" id="xPur" name="purpose" placeholder="e.g. Safety boots for Site 14"></div>
    ${fileDrop("expense", "Receipt", "Photo or PDF of the receipt")}
    <div class="form-row" style="grid-column:1/-1"><button class="btn pri">Send claim</button><span class="hint">Claims of $500 or more also need Finance approval.</span></div></form>`;
  return ph("Expense claim", "Bought something for work with your own money? Claim it back here — drop the receipt in and your manager sees it with the claim.", "", crumb("/me/requests", "My Requests & Claims")) + flashHtml() + `<div class="grid g-main">${card("New claim", form)}${card("How it works", `<ol style="margin:0;padding-left:18px;line-height:1.8;font-size:13px"><li>Your manager approves the claim.</li><li>Finance approves anything $500 or more.</li><li>Finance pays you back and the claim is posted to the ledger.</li></ol>`)}</div>`
    + `<div class="sect-l">My claims</div>` + cardFlush("", table(["Claim", "Purpose", "Submitted", ">Amount", "Status"], mine.map((x) => `<tr><td class="mono">${esc(x.claimNumber)}</td><td>${esc(x.purpose)}${fileChips("ExpenseClaim", x.id)}</td><td>${dTime(x.submittedAt)}</td>${td(money(x.totalCents), 1)}<td>${badge(x.status)}</td></tr>`), "No claims yet."));
}
function vMyDocs() {
  const e = A.employee;
  const docs = S.documents.filter((d) => d.visibility === "ALL");
  const pays = e ? myEntries(e.id) : [];
  return ph("My Documents", "Company policies and your own pay documents.") + `<div class="grid g2">${cardFlush("Company policies", table(["Title", "File", ">Size"], docs.map((d) => `<tr><td><strong>${esc(d.title)}</strong></td><td class="mono" style="font-size:12px">${esc(d.fileName)}</td>${td(`${Math.round(d.sizeBytes / 1024)} KB`, 1)}</tr>`)))}${cardFlush("My pay statements", table(["Pay day", ">Take-home"], pays.map(({ p, run }) => `<tr class="click" data-go="/me/pay/${p.id}"><td>${dLong(run.payDate)}</td>${td(money(p.netCents), 1)}</tr>`), "None yet."))}</div>`;
}

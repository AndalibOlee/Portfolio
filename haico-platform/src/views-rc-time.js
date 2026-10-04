/* ==========================================================================
   views-rc-time.js — Time off, the Request Centre way: seven balances, one
   request form checked before it is sent, the year at a glance, every
   request with its status. Routing follows the organization chart with the
   away rule (views-rc-core.js); declining needs a comment; the emails use
   the editable "Time off to approve" / "Time off decided" templates.
   ========================================================================== */

/* ---------------- leave types and the 7-hour day ---------------- */
const RC_LEAVE = [
  ["VACATION", "Annual Vacation Entitlement", "Earned through the year; taken with approval."],
  ["BANKED_OT", "Banked OT", "Overtime you chose to bank, credited at 1.5. Used on your timesheet, not requested here."],
  ["SICK", "Medical Leave (Sick Time)", "For your own illness or appointments."],
  ["OTHER", "Other Leaves [Unpaid]", "No balance to draw down; still needs approval."],
  ["PERSONAL", "Personal Leave [Paid]", "A few paid hours a year for the things life needs."],
  ["PERSONAL_UNPAID", "Personal Leave [Unpaid]", "Unpaid personal time within the policy allowance."],
  ["TRADITIONAL", "Traditional Practices Leave [Unpaid]", "For harvesting, ceremony and cultural obligations."],
];
const RC_LEAVE_NEW = { PERSONAL_UNPAID: { id: "lt6", hours: 36, color: "#7A6A9B" }, TRADITIONAL: { id: "lt7", hours: 35, color: "#3F7D5A" } };
{
  const _freshStateTime = freshState;
  freshState = function () {
    const S0 = _freshStateTime();
    for (const [code, x] of Object.entries(RC_LEAVE_NEW)) if (!S0.leaveTypes.some((t) => t.code === code)) S0.leaveTypes.push({ id: x.id, code, name: code, paid: false, defaultAnnualHours: x.hours, color: x.color, isActive: true });
    for (const [code, name, desc] of RC_LEAVE) { const lt = S0.leaveTypes.find((t) => t.code === code); if (lt) Object.assign(lt, { name, description: desc }); }
    const other = S0.leaveTypes.find((t) => t.code === "OTHER"); if (other) other.paid = false;
    S0.leaveTypes.sort((a, b) => RC_LEAVE.findIndex((x) => x[0] === a.code) - RC_LEAVE.findIndex((x) => x[0] === b.code));
    // every current employee gets this year's balance for the two new types — nothing existing is touched
    for (const e of S0.employees) for (const code of Object.keys(RC_LEAVE_NEW)) {
      const lt = S0.leaveTypes.find((t) => t.code === code);
      if (!S0.leaveBalances.some((b) => b.employeeId === e.id && b.leaveTypeId === lt.id && b.year === 2026)) S0.leaveBalances.push({ id: `lb_rc_${e.id}_${code}`, employeeId: e.id, leaveTypeId: lt.id, year: 2026, entitledHours: lt.defaultAnnualHours, carriedOverHours: 0, usedHours: 0 });
    }
    for (const ps of S0.payrollSettings) ps.standardHoursPerDay = 7; // a 7-hour standard day for everyone
    return S0;
  };
}
// unpaid leave lands on the timesheet in its own column, which payroll does not pay; banked OT stays where it was
Object.assign(LEAVE_FIELD, { OTHER: "unpaidLeaveHours", PERSONAL_UNPAID: "unpaidLeaveHours", TRADITIONAL: "unpaidLeaveHours" });
if (!HOUR_FIELDS.includes("unpaidLeaveHours")) HOUR_FIELDS.push("unpaidLeaveHours");

/* ---------------- emails: the two time-off templates ---------------- */
function rcLeaveVars(S0, lr) {
  const emp = byId(S0.employees, lr.employeeId), lt = byId(S0.leaveTypes, lr.leaveTypeId);
  return { emp, lt, title: `${lt?.name || "Time off"}, ${dLong(lr.startDate)}${lr.endDate !== lr.startDate ? ` – ${dLong(lr.endDate)}` : ""}`, rows: [["Type", lt?.name || ""], ["Dates", `${dLong(lr.startDate)}${lr.endDate !== lr.startDate ? ` – ${dLong(lr.endDate)}` : ""}`], ["Hours", `${hrs(lr.totalHours)} hours`], ...(lr.notes ? [["Description", lr.notes]] : [])] };
}
{
  const _notifyStepTime = notifyStep;
  notifyStep = function (S0, ctx, inst) {
    const step = activeSteps(S0, inst).find((s) => s.sequence === inst.currentStep);
    const lr = inst.entityType === "LeaveRequest" ? byId(S0.leaveRequests, inst.entityId) : null;
    if (!lr || step?.approverType !== "MANAGER" || !inst.approverUserIds) return _notifyStepTime(S0, ctx, inst);
    const v = rcLeaveVars(S0, lr);
    rcMail(S0, ctx, "leave_req", inst.approverUserIds, { title: v.title, requester: empName(v.emp), away: rcNames(S0, inst.awayUserIds || []).join(", "), approvers: rcOrList(rcNames(S0, inst.approverUserIds)), link: "/approvals" },
      { rows: v.rows, note: inst.awayUserIds?.length ? `${rcNames(S0, inst.awayUserIds).join(", ")} on time off that day, so it went to ${rcOrList(rcNames(S0, inst.approverUserIds))}. The first decision counts.` : "" });
  };
  const _decideTime = R["approval.decide"];
  R["approval.decide"] = function (S0, p, ctx) {
    const inst = byId(S0.approvals, p.instanceId);
    if (!inst || inst.entityType !== "LeaveRequest") return _decideTime(S0, p, ctx);
    // the "Time off decided" template replaces the plain approved / not approved note
    const notify = ctx.notify;
    ctx.notify = (uid, o) => { if (uid === inst.requestedById && ["APPROVED", "REJECTED"].includes(o?.type)) return; return notify(uid, o); };
    try { _decideTime(S0, p, ctx); } finally { ctx.notify = notify; }
    if (inst.status === "PENDING") return;
    const lr = byId(S0.leaveRequests, inst.entityId); if (!lr) return;
    const v = rcLeaveVars(S0, lr), act = S0.approvalActions.filter((x) => x.instanceId === inst.id).slice(-1)[0];
    rcMail(S0, ctx, "leave_dec", [rcUser(S0, lr.employeeId)?.id], { title: v.title, approver: ctx.actor.displayName, decision: inst.status === "APPROVED" ? "approved" : "declined", link: "/me/time-off" }, { rows: v.rows, note: act?.comment });
  };
}

/* ---------------- the page ---------------- */
injectCss(`
.lvgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start;margin-bottom:16px}
@media (max-width:900px){.lvgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:480px){.lvgrid{grid-template-columns:1fr}}
.lvcard .nm{font-size:12.5px;font-weight:600;color:var(--muted-fg);min-height:2.6em;display:flex;gap:7px;align-items:flex-start}
.lvcard .big{font-size:26px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums}
.lvcard .kvl{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--border);padding:5px 0;font-size:12.5px}
.heat{display:grid;grid-template-columns:18px repeat(53,minmax(0,1fr));grid-auto-rows:11px;gap:2px;align-items:center;font-size:10px;color:var(--muted-fg)}
.heat b{font-weight:600;font-size:10px;white-space:nowrap}.heat i{display:block;height:11px;border-radius:2px;background:var(--row-head)}
.heat i.we{opacity:.55}.heat i.s1{background:#B7DBD5}.heat i.s2{background:#7FBFB7}.heat i.s3{background:#3F8F91}.heat i.s4{background:#1F5F66}
.heat-key{display:flex;gap:6px;align-items:center;margin-top:8px;font-size:12px;color:var(--muted-fg);flex-wrap:wrap}.heat-key i{display:inline-block;width:11px;height:11px;border-radius:2px;background:var(--row-head)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .heat i.s1,:root:not([data-theme="light"]) .heat-key i.s1{background:#244B48}:root:not([data-theme="light"]) .heat i.s2,:root:not([data-theme="light"]) .heat-key i.s2{background:#2F6B68}:root:not([data-theme="light"]) .heat i.s3,:root:not([data-theme="light"]) .heat-key i.s3{background:#4F9A9C}:root:not([data-theme="light"]) .heat i.s4,:root:not([data-theme="light"]) .heat-key i.s4{background:#8CCBC0}}
:root[data-theme="dark"] .heat i.s1,:root[data-theme="dark"] .heat-key i.s1{background:#244B48}:root[data-theme="dark"] .heat i.s2,:root[data-theme="dark"] .heat-key i.s2{background:#2F6B68}:root[data-theme="dark"] .heat i.s3,:root[data-theme="dark"] .heat-key i.s3{background:#4F9A9C}:root[data-theme="dark"] .heat i.s4,:root[data-theme="dark"] .heat-key i.s4{background:#8CCBC0}
.heat-key i.s1{background:#B7DBD5}.heat-key i.s2{background:#7FBFB7}.heat-key i.s3{background:#3F8F91}.heat-key i.s4{background:#1F5F66}
@media (max-width:620px){.heat{grid-auto-rows:7px;gap:1px}.heat i{height:7px}}
`);
function rcHeatmap(empId, year = 2026) {
  const byDay = {}, stats = new Set(S.statHolidays.map((h) => h.date));
  for (const l of S.leaveRequests.filter((r) => r.employeeId === empId && r.status === "APPROVED")) {
    const ds = eachDate(l.startDate, l.endDate).filter((d) => !isWeekend(d) && !stats.has(d)), per = ds.length ? l.totalHours / ds.length : l.totalHours, lt = byId(S.leaveTypes, l.leaveTypeId);
    for (const d of ds) { byDay[d] = byDay[d] || { h: 0, kinds: [] }; byDay[d].h += per; byDay[d].kinds.push(lt?.name || "Leave"); }
  }
  const first = `${year}-01-01`, offset = (dowOf(first) + 6) % 7, cells = [];
  for (let w = 0; w < 53; w++) for (let r = 0; r < 7; r++) {
    const d = addDays(first, w * 7 + r - offset);
    if (!d.startsWith(String(year))) { cells.push(`<i style="grid-column:${w + 2};grid-row:${r + 2};visibility:hidden"></i>`); continue; }
    const v = byDay[d], h = v ? v.h : 0, step = h <= 0 ? 0 : h < 2.5 ? 1 : h < 5 ? 2 : h < 7 ? 3 : 4;
    cells.push(`<i class="s${step}${r >= 5 ? " we" : ""}" style="grid-column:${w + 2};grid-row:${r + 2}" title="${esc(dLong(d) + (v ? ` · ${hrs(h)} h · ${[...new Set(v.kinds)].join(", ")}` : ""))}"></i>`);
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => { const d = `${year}-${String(i + 1).padStart(2, "0")}-01`; const wk = Math.floor((daysBetween(first, d) + offset) / 7); return `<b style="grid-column:${wk + 2} / span 4;grid-row:9">${m}</b>`; }).join("");
  return `<div class="heat" role="img" aria-label="Approved time off in ${year}, one square per day">${["M", "", "W", "", "F", "", ""].map((l, r) => `<b style="grid-column:1;grid-row:${r + 2}">${l}</b>`).join("")}${cells.join("")}${months}</div>
    <div class="heat-key"><span>Less</span><i></i><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i><span>More hours off that day</span><span style="margin-left:auto">Hover a day for the type</span></div>`;
}
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);
{
  const _vMyTimeOffRc = vMyTimeOff;
  vMyTimeOff = function () {
    const e = A.employee;
    if (!e) return _vMyTimeOffRc();
    const route = rcRoute(S, e.id, todayStr(), [A.user.id]), names = rcNames(S, route.ids);
    const open = UI.tabs.lvOpen || "";
    const cards = leaveBalances(e.id).filter((b) => b.lt.isActive !== false && (b.has || b.lt.code === "OTHER" || b.lt.code === "BANKED_OT")).map((b) => {
      const free = b.lt.code === "OTHER", isOpen = open === b.lt.id, today = b.ent - b.used;
      return `<div class="card lvcard" style="padding:14px 16px"><div class="nm"><span class="sq" style="width:10px;height:10px;margin-top:3px;flex:none;background:${esc(b.lt.color || "#17566b")}"></span>${esc(b.lt.name)}</div>
        <div class="big">${free ? "∞" : hrs(today)}</div><div class="hint">Hours balance today${b.pending ? ` · ${hrs(b.pending)} awaiting approval` : ""}</div>
        <button class="btn sm" style="margin-top:10px" data-a="lvOpen" data-id="${b.lt.id}" aria-expanded="${isOpen}">${isOpen ? "Hide details" : "View details"}</button>
        ${isOpen ? `<div style="margin-top:10px;font-size:12.5px"><p style="margin:0 0 6px;color:var(--muted-fg)">${esc(b.lt.description || "")}</p>${[["Entitlement", free ? "No limit" : hrs(b.ent)], ["Used this year", hrs(b.used)], ["Awaiting approval", hrs(b.pending)], ["Remaining", free ? "—" : hrs(b.avail)]].map(([k, v]) => `<div class="kvl"><span>${k}</span><span class="mono">${v}</span></div>`).join("")}</div>` : ""}</div>`;
    }).join("");
    const sendTo = route.away.length ? `${rcOrList(names.map((n) => n.split(" ")[0]))}` : (names[0] || "your manager").split(" ")[0];
    const form = timeOffForm(e).replace(/>Send to [^<]*<\/button>/, `>Send to ${esc(sendTo)}</button>`)
      + (route.away.length ? `<div class="rc-note warn" style="margin-top:10px">${esc(rcNames(S, route.away).join(", "))} ${route.away.length > 1 ? "are" : "is"} on time off today, so it also goes to ${esc(rcOrList(rcNames(S, route.ids.filter((x) => !route.away.includes(x)))))}. Whoever decides first, decides.</div>` : "");
    const all = S.leaveRequests.filter((r) => r.employeeId === e.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    const pill = (r) => {
      if (r.status === "APPROVED") return `<span class="badge tone-green">Approved</span>`;
      if (r.status === "REJECTED") return `<span class="badge tone-red">Declined</span>`;
      if (r.status === "CANCELLED") return `<span class="badge tone-grey">Withdrawn</span>`;
      const inst = byId(S.approvals, r.approvalInstanceId);
      const who = inst?.approverUserIds ? rcOrList(rcNames(S, inst.approverUserIds).map((n) => n.split(" ")[0])) : (inst ? whoIsNext(S, inst) : "");
      return `<span class="badge tone-amber">With ${esc(who || "your supervisor")}</span>`;
    };
    const why = (r) => { const inst = byId(S.approvals, r.approvalInstanceId); const a = inst && S.approvalActions.filter((x) => x.instanceId === inst.id).slice(-1)[0]; return a?.comment ? `<div class="hint">${esc(a.approverName)}: “${esc(a.comment)}”</div>` : r.decidedByName ? `<div class="hint">${r.status === "APPROVED" ? "Approved" : "Declined"} by ${esc(r.decidedByName)}</div>` : ""; };
    const rows = all.map((r) => `<tr><td style="white-space:nowrap">${esc(r.startDate === r.endDate ? dLong(r.startDate) : `${dLong(r.startDate)} – ${dLong(r.endDate)}`)}</td><td>${esc(byId(S.leaveTypes, r.leaveTypeId)?.name || "Leave")}</td>${td(`${hrs(r.totalHours)} hours`, 1)}<td>${esc(r.notes || "")}${r.isPartialDay ? `<div class="hint">Part day · ${hrs(r.hoursPerDay)} h a day</div>` : ""}${why(r)}</td><td>${pill(r)}</td><td class="r">${r.status === "PENDING_APPROVAL" ? `<button class="btn sm" data-a="withdraw" data-id="${r.id}">Withdraw</button>` : ""}</td></tr>`);
    return ph("Time off", "Your balances, a request, what you would have left, and the year at a glance — checked before anything is sent.") + flashHtml()
      + `<div class="lvgrid">${cards}</div>`
      + `<div class="grid g2" style="align-items:start;margin-bottom:16px">${card("Request time off", form)}${card("Yearly usage · 2026", rcHeatmap(e.id) + `<p class="hint" style="margin:12px 0 0">A standard day is ${settingsFor(S, e.companyId).standardHoursPerDay ?? 7} hours. Weekends and stat holidays are never taken from your balance. Banked OT is used on your timesheet.</p>`)}</div>`
      + cardFlush("", table(["Request date(s)", "Type", ">Count as", "Description", "Status", ""], rows, "Nothing booked."));
  };
}
window.ACTIONS_EXT.push({ lvOpen(el) { UI.tabs.lvOpen = UI.tabs.lvOpen === el.dataset.id ? "" : el.dataset.id; safeRender(); } });
window.FORMS_EXT.push({
  leave(f) {
    const d = fd(f), n = S.leaveRequests.length;
    if (!act("leave.request", { leaveTypeId: d.leaveTypeId, start: d.start, end: d.end || d.start, hours: d.hours, partialHours: d.partialHours, notes: d.notes, files: takeFiles("leave") })) return;
    const lr = S.leaveRequests[n], inst = lr && byId(S.approvals, lr.approvalInstanceId);
    const to = inst?.approverUserIds ? rcOrList(rcNames(S, inst.approverUserIds)) : inst ? whoIsNext(S, inst) : "your supervisor";
    UI.flash = { kind: "ok", text: `Sent to ${to}.${inst?.awayUserIds?.length ? ` ${rcNames(S, inst.awayUserIds).join(", ")} is on time off — whoever decides first, decides.` : ""}` }; toast("Done", UI.flash.text, "ok");
    go("/me/time-off");
  },
});

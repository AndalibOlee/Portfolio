/* ==========================================================================
   views-rbp.js — People › Reviews, Benefits & Pension.
   Three tabs: Performance Reviews (/hr/reviews), Benefits (/hr/benefits), Pension (/hr/pension).
   HR (hr.employees.edit) views and edits; Finance (Finance Manager, Accountant, Payroll Administrator) views and downloads only.
   Adds demo benefit plans and enrolments, and a group pension plan with members, contributions and remittances.
   ========================================================================== */

const RBP_FIN_ROLES = ["FINANCE_MANAGER", "ACCOUNTANT", "PAYROLL_ADMIN"]; // finance side: view + download only
const rbpFinance = (auth = A) => !!auth && (auth.roleCodes || []).some((r) => RBP_FIN_ROLES.includes(r));
const rbpEdit = (auth = A) => !!auth && can(auth, "hr.employees.edit");
/** Benefits and Pension: HR (view + edit) and Finance (view + download) */
const rbpView = (auth = A) => rbpEdit(auth) || rbpFinance(auth);
/** Performance Reviews: everyone who could see them before (HR, managers, executives), plus Finance */
const rbpReviewsView = (auth = A) => !!auth && (can(auth, "hr.employees.view") || rbpFinance(auth));
const rbpReadNote = () => (rbpEdit() ? "" : `<div class="msg info">You can view and download this page. Changes are made by HR.</div>`);
/** put a Download button in a page header that was drawn without one */
const rbpWithDl = (html, key) => html.replace(/<div class="ph">([\s\S]*?)<\/div><\/div>/, (m, inner) => `<div class="ph">${inner}</div><div class="acts">${dlButton(key)}</div></div>`);

/* ---------------- demo data: more benefit plans, pension plan, members, remittances ---------------- */
const PEN_PLAN_ID = "pen1";
const PEN_RATES = [3, 4, 5, 6, 7, 8, 9];
const penAnnualPay = (S0, empId) => { const c = S0.compensations.filter((x) => x.employeeId === empId).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0]; return !c ? 0 : c.payType === "HOURLY" ? (c.hourlyRateCents || 0) * 2080 : c.annualSalaryCents || 0; };
{
  const _fsRbp = freshState;
  freshState = function () {
    const S = _fsRbp();
    // benefits: four more group plans, and enrolments for everyone on staff
    const plans = [
      ["bp3", "LIFE-ADD", "Life & AD&D Insurance", "LIFE", 0, 1250, true],
      ["bp4", "LTD", "Long-Term Disability", "DISABILITY", 2100, 0, false],
      ["bp5", "VISION", "Vision Care", "OTHER", 600, 600, false],
      ["bp6", "EFAP", "Employee & Family Assistance", "OTHER", 0, 450, false],
    ];
    for (const [id, code, name, category, ee, er, taxable] of plans) if (!S.benefitPlans.some((p) => p.id === id)) S.benefitPlans.push({ id, code, name, category, employeeCostCentsPerPay: ee, employerCostCentsPerPay: er, taxableBenefit: taxable, glExpenseAccountNumber: "5170", glLiabilityAccountNumber: "2300", isActive: true });
    const staff = S.employees.filter((e) => !["TERMINATED", "INACTIVE"].includes(e.status));
    const from = (e) => (e.startDate > "2026-01-01" ? e.startDate : "2026-01-01");
    const has = (empId, planId) => S.benefits.some((b) => b.employeeId === empId && b.planId === planId);
    const FAMILY = new Set(["e3", "e7", "e8", "e13", "e16"]);
    staff.forEach((e, i) => {
      const add = (planId, fam) => { if (has(e.id, planId)) return; const p = byId(S.benefitPlans, planId); S.benefits.push({ id: `ben_${e.id}_${planId}`, employeeId: e.id, planId, effectiveDate: from(e), coverage: fam ? "FAMILY" : "EMPLOYEE", employeeCostCentsOverride: fam ? p.employeeCostCentsPerPay * 2 : undefined, employerCostCentsOverride: fam ? p.employerCostCentsPerPay * 2 : undefined }); };
      add("bp3"); add("bp6");
      if (e.employmentType === "FULL_TIME") add("bp4");
      if (i % 3 !== 2) add("bp2", FAMILY.has(e.id));
      if (i % 2 === 0) add("bp5", FAMILY.has(e.id));
    });
    const hist = [["e8", "bp5", "ENROL", "FAMILY", "2026-04-01", "Shawna Laboucan", "2026-03-18T17:20:00Z", "Paper form received — spouse and two children."], ["e13", "bp2", "CHANGE", "FAMILY", "2026-05-01", "Shawna Laboucan", "2026-04-22T16:05:00Z", "New baby — moved to family coverage."], ["e9", "bp5", "WAIVE", "EMPLOYEE", "2026-06-01", "Shawna Laboucan", "2026-05-20T19:40:00Z", "Covered under spouse's plan."], ["e5", "bp4", "ENROL", "EMPLOYEE", "2026-01-01", "Shawna Laboucan", "2025-12-15T18:00:00Z", "Annual enrolment."]];
    S.benefitChanges = S.benefitChanges || [];
    hist.forEach(([employeeId, planId, action, coverage, effectiveDate, byName, at, note], i) => { const e = byId(S.employees, employeeId); if (e) S.benefitChanges.push({ id: `bc_seed${i + 1}`, employeeId, companyId: e.companyId, planId, action, coverage, effectiveDate, note, byName, at }); });

    // pension: one group defined-contribution plan; members join after three months
    S.pensionPlans = [{ id: PEN_PLAN_ID, code: "HAICO-DCPP", name: "HaiCo Group Defined Contribution Pension Plan", provider: "Coastal Pension Trust", registration: "BC 1104382", type: "Defined contribution", maxMatchPct: 6, vestingMonths: 24, eligibilityMonths: 3, remitDay: 15, glExpense: "5175", glLiability: "2310" }];
    S.pensionMembers = []; S.pensionChanges = []; S.pensionRemittances = [];
    const BENEF = { e1: "Spouse — Daniel Bellerose", e2: "Spouse — Joseph Sinclair", e3: "Spouse — Marie Desjarlais", e4: "Estate", e5: "Spouse — Luc Morin", e6: "Spouse — Carla Ladouceur", e7: "Spouse — Andrea Bigstone", e8: "Mother — Rose Cardinal", e9: "Father — Lyle Moosomin", e11: "Spouse — Paul Delorme", e12: "Estate", e13: "Spouse — Kim Baptiste", e15: "Spouse — Leah Gladue", e16: "Mother — Joanne Napoleon", e17: "Estate", e19: "Sister — Dana Ermineskin" };
    staff.forEach((e, i) => {
      const elig = addDays(e.startDate, 91);
      if (e.id === "e14" || e.id === "e18") return; // newer crew members: eligible, not yet enrolled
      const joined = elig > "2018-01-01" ? elig : "2018-01-01";
      const rate = PEN_RATES[(i * 3) % PEN_RATES.length];
      const yrs = Math.max(0, (Date.parse("2026-01-01") - Date.parse(joined)) / 31557600000);
      const opening = Math.round(penAnnualPay(S, e.id) * (rate + Math.min(rate, 6)) / 100 * Math.min(yrs, 12) * 1.06);
      S.pensionMembers.push({ id: `pm_${e.id}`, planId: PEN_PLAN_ID, employeeId: e.id, companyId: e.companyId, joinedDate: joined, employeeRatePct: rate, employerRatePct: Math.min(rate, 6), beneficiary: BENEF[e.id] || "Estate", openingBalanceCents: opening, status: e.id === "e17" ? "SUSPENDED" : "ACTIVE", suspendedNote: e.id === "e17" ? "Seasonal layoff — contributions resume on recall." : undefined });
    });
    // monthly remittances to the provider, per company: Jan–Aug paid, September due on Oct 15
    for (const c of S.companies) {
      const ms = S.pensionMembers.filter((m) => m.companyId === c.id && m.status === "ACTIVE");
      if (!ms.length) continue;
      for (let mo = 1; mo <= 9; mo++) {
        const month = `2026-${String(mo).padStart(2, "0")}`, due = `2026-${String(mo + 1).padStart(2, "0")}-15`;
        let ee = 0, er = 0;
        for (const m of ms) { const pay = penAnnualPay(S, m.employeeId) / 12; ee += Math.round(pay * m.employeeRatePct / 100); er += Math.round(pay * m.employerRatePct / 100); }
        S.pensionRemittances.push({ id: `pr_${c.id}_${mo}`, companyId: c.id, month, dueDate: due, employeeCents: ee, employerCents: er, members: ms.length, status: mo <= 8 ? "PAID" : "DUE", paidDate: mo <= 8 ? `2026-${String(mo + 1).padStart(2, "0")}-12` : undefined, paidByName: mo <= 8 ? "Wesley Desjarlais" : undefined });
      }
    }
    return S;
  };
}

/* ---------------- pension helpers ---------------- */
const penPlan = () => byId(S.pensionPlans || [], PEN_PLAN_ID);
const penMonthsBetween = (a, b) => Math.max(0, (Date.parse(b) - Date.parse(a)) / 2629800000);
/** contributions so far this year (from Jan 1 or the join date, to today), employee and employer */
function penYtd(m) {
  if (m.status !== "ACTIVE") return { ee: 0, er: 0 };
  const t = todayStr(), start = m.joinedDate > "2026-01-01" ? m.joinedDate : "2026-01-01";
  const months = Math.min(12, penMonthsBetween(start, t > "2026-12-31" ? "2026-12-31" : t));
  const pay = penAnnualPay(S, m.employeeId) / 12;
  return { ee: Math.round(pay * months * m.employeeRatePct / 100), er: Math.round(pay * months * m.employerRatePct / 100) };
}
const penVested = (m) => penMonthsBetween(m.joinedDate, todayStr()) >= (penPlan()?.vestingMonths || 24);
const penBalance = (m) => { const y = penYtd(m); return (m.openingBalanceCents || 0) + y.ee + y.er; };
const PEN_STATUS = { ACTIVE: ["Contributing", "green"], SUSPENDED: ["Suspended", "amber"], ELIGIBLE: ["Eligible to join", "blue"], WAITING: ["Waiting period", "grey"] };
/** everyone on staff in view, with their membership (or eligibility) */
function penRows() {
  const ids = scopeIds(S, A), t = todayStr();
  return S.employees.filter((e) => ids.includes(e.companyId) && !["TERMINATED", "INACTIVE"].includes(e.status)).map((e) => {
    const m = (S.pensionMembers || []).find((x) => x.employeeId === e.id);
    const st = m ? m.status : addDays(e.startDate, 91) <= t ? "ELIGIBLE" : "WAITING";
    return { e, m, st };
  }).sort((a, b) => a.e.lastName.localeCompare(b.e.lastName));
}

/* ---------------- reducers (HR only) ---------------- */
function penNeed(ctx) { if (!can(ctx.auth, "hr.employees.edit")) fail("Only HR can change pension records. Finance can view and download."); }
function penRate(v) { const r = Number(v); if (!PEN_RATES.includes(r)) fail(`Choose an employee rate between ${PEN_RATES[0]}% and ${PEN_RATES.at(-1)}%.`); return r; }
function penLog(S, ctx, e, action, summary, note) {
  S.pensionChanges = S.pensionChanges || [];
  S.pensionChanges.push({ id: ctx.id("pc"), employeeId: e?.id, companyId: e?.companyId, action, summary, note: (note || "").trim() || undefined, byName: ctx.actor.displayName, at: ctx.now });
  ctx.audit({ module: "hr", action: "UPDATE", companyId: e?.companyId, entityType: "Employee", entityId: e?.id, summary: `${ctx.actor.displayName}: ${summary}` });
  const u = e ? userOfEmployee(S, e.id) : null;
  if (u) ctx.notify(u.id, { type: "SYSTEM", title: "Your pension was updated", body: summary, linkUrl: "/me/profile/benefits" });
}
Object.assign(R, {
  "pension.enrol"(S, p, ctx) {
    penNeed(ctx);
    const e = byId(S.employees, p.employeeId); if (!e) fail("Choose a person.");
    ctx.company(e.companyId);
    S.pensionMembers = S.pensionMembers || [];
    if (S.pensionMembers.some((m) => m.employeeId === e.id)) fail(`${empName(e)} is already a member — change their rate instead.`);
    if (!p.joinedDate) fail("Choose the date they join.");
    if (p.joinedDate < e.startDate) fail("They can't join before their first day.");
    const rate = penRate(p.employeeRatePct), plan = byId(S.pensionPlans || [], PEN_PLAN_ID);
    const m = { id: ctx.id("pm"), planId: PEN_PLAN_ID, employeeId: e.id, companyId: e.companyId, joinedDate: p.joinedDate, employeeRatePct: rate, employerRatePct: Math.min(rate, plan?.maxMatchPct || 6), beneficiary: String(p.beneficiary || "").trim().slice(0, 80) || "Estate", openingBalanceCents: 0, status: "ACTIVE" };
    S.pensionMembers.push(m);
    penLog(S, ctx, e, "ENROL", `${empName(e)} joined the pension plan from ${dLong(m.joinedDate)} at ${rate}% (employer ${m.employerRatePct}%).`, p.note);
  },
  "pension.update"(S, p, ctx) {
    penNeed(ctx);
    const m = byId(S.pensionMembers || [], p.memberId); if (!m) fail("That member no longer exists.");
    const e = byId(S.employees, m.employeeId); ctx.company(m.companyId);
    const rate = penRate(p.employeeRatePct), plan = byId(S.pensionPlans || [], PEN_PLAN_ID), ben = String(p.beneficiary || "").trim().slice(0, 80) || m.beneficiary;
    const changes = [];
    if (rate !== m.employeeRatePct) { changes.push(`rate ${m.employeeRatePct}% → ${rate}%`); m.employeeRatePct = rate; m.employerRatePct = Math.min(rate, plan?.maxMatchPct || 6); }
    if (ben !== m.beneficiary) { changes.push(`beneficiary → ${ben}`); m.beneficiary = ben; }
    const status = p.status === "SUSPENDED" || p.status === "ACTIVE" ? p.status : m.status;
    if (status !== m.status) { changes.push(status === "SUSPENDED" ? "contributions suspended" : "contributions resumed"); m.status = status; m.suspendedNote = status === "SUSPENDED" ? (p.note || "").trim() || undefined : undefined; }
    if (!changes.length) fail("Nothing changed.");
    penLog(S, ctx, e, "CHANGE", `${empName(e)}'s pension: ${changes.join("; ")}.`, p.note);
  },
  "pension.remit"(S, p, ctx) {
    penNeed(ctx);
    const r = byId(S.pensionRemittances || [], p.id); if (!r) fail("Remittance not found.");
    ctx.company(r.companyId);
    if (r.status === "PAID") fail("That remittance is already marked as sent.");
    Object.assign(r, { status: "PAID", paidDate: todayStr(), paidByName: ctx.actor.displayName });
    penLog(S, ctx, null, "REMIT", `${co(r.companyId)?.displayName || r.companyId} pension remittance for ${r.month} marked as sent to the provider — ${money(r.employeeCents + r.employerCents)}.`);
  },
});

/* ---------------- Pension page ---------------- */
function penForm(m) {
  const rows = penRows();
  const opts = m ? [] : rows.filter((x) => !x.m);
  const e = m ? byId(S.employees, m.employeeId) : null;
  const rateSel = (cur, id) => `<select class="in" id="${id}" name="employeeRatePct">${PEN_RATES.map((r) => opt(r, `${r}% (employer ${Math.min(r, penPlan()?.maxMatchPct || 6)}%)`, r === cur)).join("")}</select>`;
  if (m) return `<h3 style="margin:0 0 4px">Change ${esc(empName(e))}'s pension</h3><p class="hint" style="margin:0 0 12px">The employer matches up to ${penPlan()?.maxMatchPct || 6}%. Changes apply from the next pay; the person is told.</p>
    <form data-f="penUpdate" data-id="${m.id}" class="form-grid"><div class="fld"><label for="pnRateM">Employee rate</label>${rateSel(m.employeeRatePct, "pnRateM")}</div>
    <div class="fld"><label for="pnSt">Contributions</label><select class="in" id="pnSt" name="status">${opt("ACTIVE", "Contributing", m.status === "ACTIVE")}${opt("SUSPENDED", "Suspended (leave, layoff)", m.status === "SUSPENDED")}</select></div>
    <div class="fld" style="grid-column:1/-1"><label for="pnBen">Beneficiary</label><input class="in" id="pnBen" name="beneficiary" value="${esc(m.beneficiary || "")}"></div>
    <div class="fld" style="grid-column:1/-1"><label for="pnNote">Note</label><input class="in" id="pnNote" name="note" placeholder="optional — e.g. change form signed"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Save</button></div></form>`;
  if (!opts.length) return `<p class="hint" style="margin:0">Everyone eligible is already in the plan.</p>`;
  return `<form data-f="penEnrol" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="pnWho">Person</label><select class="in" id="pnWho" name="employeeId">${opts.map((x) => opt(x.e.id, `${empName(x.e)} · ${co(x.e.companyId).displayName} · ${PEN_STATUS[x.st][0]}`)).join("")}</select></div>
    <div class="fld"><label for="pnRate">Employee rate</label>${rateSel(5, "pnRate")}</div>
    <div class="fld"><label for="pnFrom">Joins on</label><input class="in" type="date" id="pnFrom" name="joinedDate" value="${hr2FirstOfNextMonth()}" required></div>
    <div class="fld" style="grid-column:1/-1"><label for="pnBen2">Beneficiary</label><input class="in" id="pnBen2" name="beneficiary" placeholder="e.g. Spouse — name, or Estate"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:space-between"><span class="hint">Deductions start with the next pay; the person is told.</span><button class="btn pri">Enrol</button></div></form>`;
}
function vPension() {
  const plan = penPlan();
  if (!plan) return ph("Pension") + card("", empty("No pension plan is set up."));
  const edit = rbpEdit(), ids = scopeIds(S, A);
  const rows = penRows();
  const f = UI.filters.pen || (UI.filters.pen = {});
  const match = (x) => !f.st || (f.st === "NOTVESTED" ? x.m && !penVested(x.m) : x.st === f.st);
  const shown = rows.filter(match);
  const mem = rows.filter((x) => x.m);
  const ytd = mem.reduce((s, x) => { const y = penYtd(x.m); return { ee: s.ee + y.ee, er: s.er + y.er }; }, { ee: 0, er: 0 });
  const assets = mem.reduce((s, x) => s + penBalance(x.m), 0);
  const rem = (S.pensionRemittances || []).filter((r) => ids.includes(r.companyId)).sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : a.companyId.localeCompare(b.companyId)));
  const due = rem.filter((r) => r.status === "DUE");
  const dueAmt = due.reduce((s, r) => s + r.employeeCents + r.employerCents, 0);
  const cnt = (k) => rows.filter((x) => (k === "NOTVESTED" ? x.m && !penVested(x.m) : k ? x.st === k : true)).length;
  const chips = [["", "Everyone"], ["ACTIVE", "Contributing"], ["ELIGIBLE", "Eligible to join"], ["SUSPENDED", "Suspended"], ["NOTVESTED", "Not vested yet"]].map(([k, l]) => `<button class="hchip ${(f.st || "") === k ? "on" : ""}" data-a="hr2Chip" data-k="pen" data-f="st" data-v="${k}">${esc(l)} <span>${cnt(k)}</span></button>`).join("");
  const memRows = shown.map(({ e, m, st }) => { const y = m ? penYtd(m) : null; const [sl, tone] = PEN_STATUS[st];
    return `<tr><td><strong>${esc(empName(e))}</strong><div class="hint">${coTag(e.companyId)} · ${esc(byId(S.positions, e.positionId)?.title || "")}</div></td><td style="white-space:nowrap">${m ? esc(dLong(m.joinedDate)) : `<span class="muted">eligible ${esc(dLong(addDays(e.startDate, 91)))}</span>`}</td>${td(m ? `${m.employeeRatePct}% / ${m.employerRatePct}%` : "—", 1)}${td(y ? money(y.ee + y.er) : "—", 1)}${td(m ? money(penBalance(m)) : "—", 1)}<td>${m ? (penVested(m) ? '<span class="badge tone-green">Vested</span>' : '<span class="badge tone-grey">Not yet</span>') : ""}</td><td><span class="badge tone-${tone}">${esc(sl)}</span>${m?.suspendedNote ? `<div class="hint">${esc(m.suspendedNote)}</div>` : ""}</td><td class="muted" style="font-size:12px">${m ? esc(m.beneficiary || "") : ""}</td>${edit ? `<td class="r">${m ? `<button class="btn sm" data-a="penEdit" data-id="${m.id}">Change</button>` : ""}</td>` : ""}</tr>`; });
  const remRows = rem.slice(0, 16).map((r) => `<tr><td>${esc(new Date(r.month + "-15T12:00:00Z").toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }))}</td><td>${coTag(r.companyId)}</td>${td(String(r.members), 1)}${td(money(r.employeeCents), 1)}${td(money(r.employerCents), 1)}${td(`<strong>${money(r.employeeCents + r.employerCents)}</strong>`, 1)}<td>${r.status === "PAID" ? `<span class="badge tone-green">Sent</span><div class="hint">${esc(dLong(r.paidDate))} · ${esc(r.paidByName || "")}</div>` : `<span class="badge tone-amber">Due ${esc(dLong(r.dueDate))}</span>`}</td>${edit ? `<td class="r">${r.status === "DUE" ? `<button class="btn sm" data-a="penRemit" data-id="${r.id}">Mark sent</button>` : ""}</td>` : ""}</tr>`);
  const hist = (S.pensionChanges || []).filter((h) => !h.companyId || ids.includes(h.companyId)).slice().reverse().slice(0, 20);
  const kv = (k, v) => `<div class="prow"><span>${esc(k)}</span><span>${v}</span></div>`;
  return ph("Pension", `${plan.name}. Each member puts in ${PEN_RATES[0]}–${PEN_RATES.at(-1)}% of pay and the employer matches up to ${plan.maxMatchPct}%. Contributions come off each pay and are sent to ${plan.provider} every month.`, dlButton("pension")) + flashHtml() + rbpReadNote()
    + `<div class="stats">${stat("Members", String(mem.filter((x) => x.m.status === "ACTIVE").length), `${mem.length} in the plan · ${cnt("ELIGIBLE")} eligible to join`)}${stat("Employee contributions", money(ytd.ee), "this year so far")}${stat("Employer contributions", money(ytd.er), "this year so far", "good")}${stat("Plan balance", money(assets), "all members, estimated")}${stat("Next remittance", money(dueAmt), due[0] ? `due ${dLong(due[0].dueDate)}` : "nothing due", due.length ? "warn" : "")}</div>`
    + `<div class="grid ${edit ? "g2" : ""}" style="gap:14px;align-items:start;margin-bottom:14px">${edit ? card("Enrol someone", penForm(null)) : ""}
        ${card("The plan", `<div class="${edit ? "" : "grid g2"}" style="${edit ? "" : "gap:0 24px"}">` + kv("Plan", esc(plan.name)) + kv("Type", esc(plan.type)) + kv("Provider", esc(plan.provider)) + kv("Registration", esc(plan.registration)) + kv("Employee rate", `${PEN_RATES[0]}–${PEN_RATES.at(-1)}% of pay`) + kv("Employer match", `up to ${plan.maxMatchPct}%`) + kv("Joining", `after ${plan.eligibilityMonths} months`) + kv("Vesting", `${plan.vestingMonths} months in the plan`) + kv("Remitted", `monthly, by the ${plan.remitDay}th`) + kv("GL accounts", `${esc(plan.glExpense)} expense · ${esc(plan.glLiability)} payable`) + `</div>`)}</div>`
    + cardFlush(`Members <span class="hint">${mem.length}</span>`, `<div class="hr2chips" style="padding:0 16px 10px">${chips}</div>` + table(["Person", "Joined", ">Rate (you / employer)", ">This year", ">Balance", "Vested", "Status", "Beneficiary", ...(edit ? [""] : [])], memRows, "Nobody matches this filter."))
    + `<div class="grid" style="grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:14px;align-items:start;margin-top:14px">${cardFlush("Remittances to the provider", table(["Month", "Company", ">Members", ">Employee", ">Employer", ">Total", "Status", ...(edit ? [""] : [])], remRows, "No remittances yet."), dlButton("pensionRemit", "Download", { variant: "outline" }))}
        ${cardFlush("History", table(["When", "Change", "By"], hist.map((h) => `<tr><td style="white-space:nowrap">${esc(dLong(h.at.slice(0, 10)))}</td><td>${esc(h.summary)}${h.note ? `<div class="hint">“${esc(h.note)}”</div>` : ""}</td><td>${esc(h.byName)}</td></tr>`), "No changes yet — enrolments, rate changes and remittances show here."))}</div>`;
}

/* ---------------- Benefits for Finance: read-only ---------------- */
function rbpBenRows() {
  const ids = scopeIds(S, A), t0 = todayStr();
  return S.benefits.map((b) => ({ b, p: byId(S.benefitPlans, b.planId), e: byId(S.employees, b.employeeId) }))
    .filter((x) => x.p && x.e && ids.includes(x.e.companyId) && hr2Active(x.e) && (!x.b.endDate || x.b.endDate >= t0) && x.b.effectiveDate <= addDays(t0, 365))
    .sort((a, b) => a.e.lastName.localeCompare(b.e.lastName) || a.p.name.localeCompare(b.p.name));
}
function vRbpBenefitsRead() {
  const active = rbpBenRows(), ids = scopeIds(S, A);
  const people = S.employees.filter((e) => ids.includes(e.companyId) && hr2Active(e));
  const f = UI.filters.hr3ben || (UI.filters.hr3ben = {});
  const shown = f.plan ? active.filter((x) => x.p.id === f.plan) : active;
  const ee = active.reduce((s, x) => s + benCost(x.b, x.p, "employee"), 0), er = active.reduce((s, x) => s + benCost(x.b, x.p, "employer"), 0);
  const plans = S.benefitPlans.filter((p) => p.isActive !== false);
  const chips = [["", "All plans"], ...plans.map((p) => [p.id, p.name])].map(([k, l]) => `<button class="hchip ${(f.plan || "") === k ? "on" : ""}" data-a="hr2Chip" data-k="hr3ben" data-f="plan" data-v="${k}">${esc(l)} <span>${k ? active.filter((x) => x.p.id === k).length : active.length}</span></button>`).join("");
  const hist = (S.benefitChanges || []).filter((r) => ids.includes(r.companyId)).slice().reverse().slice(0, 25);
  return ph("Benefits", "The group plans, who is enrolled and what each pay costs the employees and the employer.", dlButton("benefits")) + flashHtml() + rbpReadNote()
    + `<div class="stats">${stat("People enrolled", String(new Set(active.map((x) => x.e.id)).size), `of ${people.length} on staff`)}${stat("Active enrolments", String(active.length), `${plans.length} plans offered`)}${stat("Employees pay per pay", money(ee), "deducted on each pay")}${stat("Employer cost per pay", money(er), "across active enrolments", "good")}</div>`
    + `<div class="grid" style="grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:14px;align-items:start"><div style="display:grid;gap:14px">${cardFlush("Plans", table(["Plan", ">People", ">Employee / pay", ">Employer / pay"], plans.map((p) => `<tr><td><strong>${esc(p.name)}</strong><div class="hint">${esc(p.code)} · GL ${esc(p.glExpenseAccountNumber || "")}${p.taxableBenefit ? " · taxable benefit" : ""}</div></td>${td(String(active.filter((x) => x.p.id === p.id).length), 1)}${td(money(p.employeeCostCentsPerPay), 1)}${td(money(p.employerCostCentsPerPay), 1)}</tr>`)))}
      ${cardFlush("History", table(["When", "Person", "Change", "By"], hist.map((r) => `<tr><td>${dLong(r.at.slice(0, 10))}</td><td>${esc(empName(byId(S.employees, r.employeeId)))}</td><td>${esc(benLabel(r))}</td><td>${esc(r.byName)}</td></tr>`), "No changes recorded yet."))}</div>
      ${cardFlush(`Who's enrolled <span class="hint">${active.length}</span>`, `<div class="hr2chips" style="padding:0 16px 10px">${chips}</div>` + table(["Person", "Plan", "Coverage", "Since", ">Employee / employer per pay"], shown.map(({ b, p, e }) => `<tr><td><strong>${esc(empName(e))}</strong><div class="hint">${coTag(e.companyId)}</div></td><td>${esc(p.name)}</td><td>${esc((BEN_COVERAGE[b.coverage || "EMPLOYEE"] || BEN_COVERAGE.EMPLOYEE)[0])}</td><td>${esc(dLong(b.effectiveDate))}</td>${td(`${money(benCost(b, p, "employee"))} / ${money(benCost(b, p, "employer"))}`, 1)}</tr>`), "Nobody in this plan."))}</div>`;
}

/* ---------------- downloads (Excel / PDF / CSV) ---------------- */
EXPORTS.pension = () => ({ base: `haico-pension-members-${todayStr()}`, title: "Pension — members", rows: [["Company", "Employee #", "Person", "Status", "Joined", "Employee rate %", "Employer rate %", "Employee this year", "Employer this year", "Balance (est.)", "Vested", "Beneficiary"], ...penRows().map(({ e, m, st }) => { const y = m ? penYtd(m) : { ee: 0, er: 0 }; return [co(e.companyId).displayName, e.employeeNumber, empName(e), PEN_STATUS[st][0], m?.joinedDate || "", m ? String(m.employeeRatePct) : "", m ? String(m.employerRatePct) : "", (y.ee / 100).toFixed(2), (y.er / 100).toFixed(2), m ? (penBalance(m) / 100).toFixed(2) : "", m ? (penVested(m) ? "Yes" : "No") : "", m?.beneficiary || ""]; })] });
EXPORTS.pensionRemit = () => ({ base: `haico-pension-remittances-${todayStr()}`, title: "Pension — remittances", rows: [["Month", "Company", "Members", "Employee", "Employer", "Total", "Status", "Due", "Sent on", "Sent by"], ...(S.pensionRemittances || []).filter((r) => scopeIds(S, A).includes(r.companyId)).map((r) => [r.month, co(r.companyId).displayName, String(r.members), (r.employeeCents / 100).toFixed(2), (r.employerCents / 100).toFixed(2), ((r.employeeCents + r.employerCents) / 100).toFixed(2), r.status === "PAID" ? "Sent" : "Due", r.dueDate, r.paidDate || "", r.paidByName || ""])] });
EXPORTS.benefits = () => ({ base: `haico-benefits-${todayStr()}`, title: "Benefits — enrolments", rows: [["Company", "Employee #", "Person", "Plan", "Coverage", "Since", "Employee per pay", "Employer per pay"], ...rbpBenRows().map(({ b, p, e }) => [co(e.companyId).displayName, e.employeeNumber, empName(e), p.name, (BEN_COVERAGE[b.coverage || "EMPLOYEE"] || BEN_COVERAGE.EMPLOYEE)[0], b.effectiveDate, (benCost(b, p, "employee") / 100).toFixed(2), (benCost(b, p, "employer") / 100).toFixed(2)])] });
EXPORTS.reviews = () => ({ base: `haico-performance-reviews-${todayStr()}`, title: "Performance reviews", rows: [["Company", "Person", "Reviewer", "Cycle", "Due", "Status", "Goals", "Rating"], ...hr2ReviewsInScope().map((r) => { const e = hr2Emp(r.employeeId); return [co(e?.companyId)?.displayName || "", empName(e), r.reviewerId ? empName(hr2Emp(r.reviewerId)) : "", r.cycle || "", r.dueDate || "", (HR2_REVIEW_STATUS[r.status] || [r.status])[0], String((r.goals || []).length), r.rating != null ? String(r.rating) : ""]; })] });

/* ---------------- routes: the three tabs ---------------- */
hr3Route("/hr/reviews", () => rbpReviewsView(), () => rbpWithDl(vHr2Reviews(), "reviews"));
hr3Route("/hr/benefits", () => rbpView(), () => (rbpEdit() ? rbpWithDl(vHr3Benefits(), "benefits") : vRbpBenefitsRead()));
hr3Route("/hr/pension", () => rbpView(), vPension);
/** Finance may open a review from the list (read-only: only the person, their reviewer and HR can change it) */
{
  const _canSee = hr2CanSeeReview;
  hr2CanSeeReview = function (r, auth = A) { if (_canSee(r, auth)) return true; const e = hr2Emp(r.employeeId); return rbpFinance(auth) && (!e || canSee(auth, e.companyId)); };
}

/** the person's own pension, under My Profile › Pension & Benefits */
function penMineHtml() {
  const e = A.employee, m = e && (S.pensionMembers || []).find((x) => x.employeeId === e.id), plan = penPlan();
  if (!e || !plan) return "";
  if (!m) { const el = addDays(e.startDate, 91); return `<div style="margin-top:14px">${card("Pension", `<p style="margin:0">${el <= todayStr() ? `You can join the ${esc(plan.name)} — ask HR to enrol you.` : `You can join the ${esc(plan.name)} from ${esc(dLong(el))}.`} The employer matches up to ${plan.maxMatchPct}% of your pay.</p>`)}</div>`; }
  const y = penYtd(m);
  return `<div style="margin-top:14px">${card("Your pension", `<div class="stats" style="margin:0 0 10px">${stat("You put in", `${m.employeeRatePct}%`, "of each pay")}${stat("Employer adds", `${m.employerRatePct}%`, "", "good")}${stat("This year so far", money(y.ee + y.er), `you ${money(y.ee)} · employer ${money(y.er)}`)}${stat("Balance (estimate)", money(penBalance(m)), penVested(m) ? "vested" : `vests after ${plan.vestingMonths} months`)}</div><p class="hint" style="margin:0">${esc(plan.name)} · ${esc(plan.provider)} · member since ${esc(dLong(m.joinedDate))} · beneficiary: ${esc(m.beneficiary || "Estate")}${m.status === "SUSPENDED" ? " · contributions suspended" : ""}. To change your rate or beneficiary, ask HR.</p>`)}</div>`;
}
hr3Route("/me/profile/benefits", null, () => vHr3MeBenefits() + penMineHtml());

window.ACTIONS_EXT.push({
  penEdit(el) { const m = byId(S.pensionMembers || [], el.dataset.id); if (m) { UI.modal = penForm(m); safeRender(); } },
  penRemit(el) { const r = byId(S.pensionRemittances || [], el.dataset.id); if (r) act("pension.remit", { id: r.id }, `Remittance for ${r.month} marked as sent — ${money(r.employeeCents + r.employerCents)}.`); },
});
window.FORMS_EXT.push({
  penEnrol(f) { const d = fd(f); act("pension.enrol", { employeeId: d.employeeId, employeeRatePct: Number(d.employeeRatePct), joinedDate: d.joinedDate, beneficiary: d.beneficiary }, "Enrolled in the pension plan — the person is told."); },
  penUpdate(f) { const d = fd(f); if (act("pension.update", { memberId: f.dataset.id, employeeRatePct: Number(d.employeeRatePct), status: d.status, beneficiary: d.beneficiary, note: d.note }, "Pension updated — the person is told.")) { UI.modal = null; safeRender(); } },
});

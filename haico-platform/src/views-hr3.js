/* ==========================================================================
   views-hr3.js — merge round: B's naming on A's design for the HR screens.
   Employee record tabs + End employment → Record of Employment (ROE) issued by
   payroll; HR enrols benefits directly (no request step); HR time-off screen
   with balances per person and balance adjustments; review acknowledgement;
   job openings sent to the hiring manager for approval; certificates with
   files, renewals and HR reminders.
   Loads after views-hr2.js and before app.js. Routes registered here are put
   at the FRONT of ROUTES (first match wins), so they replace earlier ones.
   ========================================================================== */
injectCss(`
.hr3tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 14px;border-bottom:1px solid var(--border)}
.hr3tabs button{background:none;border:0;border-bottom:2px solid transparent;padding:8px 12px;font:inherit;font-size:13px;color:var(--muted-fg);cursor:pointer;margin-bottom:-1px}
.hr3tabs button.on{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}
.hr3hist{margin:6px 0 0;padding:0;list-style:none;font-size:11.5px;color:var(--muted-fg)}
.hr3hist li{padding:1px 0}
.hr3blk{border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--card)}
.hr3blk .k{font-size:10px;font-weight:700;letter-spacing:.06em;color:var(--muted-fg);text-transform:uppercase;display:block}
.hr3blk .v{font-size:14px;margin-top:3px}
.hr3row{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--border);font-size:13px}.hr3row:first-child{border-top:0}
.hr3row .grow{flex:1;min-width:0}
.hr3req{font-size:11.5px;color:var(--t-red);font-weight:600}
`);

/* ---------------- route replacement (first match wins, so go to the front) ---------------- */
function hr3Route(pattern, perm, view) {
  const re = new RegExp("^" + pattern.replace(/:(\w+)/g, "([^/]+)") + "$");
  for (let i = ROUTES.length - 1; i >= 0; i--) if (ROUTES[i].re.source === re.source) ROUTES.splice(i, 1);
  ROUTES.unshift({ re, perm, view });
}

/* ---------------- labels (B's wording) ---------------- */
const ROE_REASONS = { A: "Shortage of work / end of contract or season", D: "Illness or injury", E: "Quit", G: "Retirement", K: "Other", M: "Dismissal or suspension", N: "Leave of absence" };
const BEN_ACTIONS = { ENROL: "Join", CHANGE: "Change coverage", WAIVE: "Opt out" };
const BEN_COVERAGE = { EMPLOYEE: ["Employee only", 1], FAMILY: ["Family", 2] };
const BEN_ICON = { HEALTH: "🩺", DENTAL: "🦷", LIFE: "🛡️", DISABILITY: "🤝", RRSP: "🌱", OTHER: "✨" };
const CERT_KINDS = { LICENCE: "Licence", CERTIFICATION: "Certification", TRAINING: "Training" };
const HR3_EMP_TABS = [["overview", "Overview"], ["pay", "Pay & benefits"], ["time", "Time & time off"], ["certs", "Certificates"], ["history", "History"]];
HR2_POSTING.PENDING_APPROVAL = ["Waiting for approval", "amber"];
STATUS.PENDING_APPROVAL = STATUS.PENDING_APPROVAL || ["Waiting for approval", "amber"];
TYPE_LABEL.JobPosting = "Job opening";

/* ---------------- small helpers ---------------- */
const benCost = (b, p, who) => (who === "employee" ? b.employeeCostCentsOverride ?? p.employeeCostCentsPerPay : b.employerCostCentsOverride ?? p.employerCostCentsPerPay);
const benCurrent = (S0, employeeId, planId, onDate) => S0.benefits.filter((b) => b.employeeId === employeeId && b.planId === planId && b.effectiveDate <= onDate && (!b.endDate || b.endDate >= onDate)).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0] || null;
const benLabel = (r) => { const plan = byId(S.benefitPlans, r.planId); return `${BEN_ACTIONS[r.action] || r.action} ${plan?.name || "plan"}${r.action !== "WAIVE" ? ` · ${(BEN_COVERAGE[r.coverage || "EMPLOYEE"] || BEN_COVERAGE.EMPLOYEE)[0]}` : ""} from ${dLong(r.effectiveDate)}`; };
const dueWord = (d) => { const n = hr2DaysUntil(d); return n < 0 ? `${-n} day${n === -1 ? "" : "s"} ago` : n === 0 ? "today" : `in ${n} day${n === 1 ? "" : "s"}`; };
const certFiles = (c) => filesOf("Certification", c.id);
const certCurrentFiles = (c) => certFiles(c).filter((f) => !f.supersededAt);
const certHistoryHtml = (c) => { const h = (c.history || []).slice().reverse(); return h.length ? `<ul class="hr3hist">${h.map((x) => `<li>${esc(x.kind === "REMINDED" ? `Reminded by ${x.by} on ${dLong(x.at.slice(0, 10))}` : x.kind === "RENEWED" ? `Renewed by ${x.by} on ${dLong(x.at.slice(0, 10))} (was ${x.from ? dLong(x.from) : "no expiry"} → ${dLong(x.to)})` : x.kind === "ADDED" ? `Added by ${x.by} on ${dLong(x.at.slice(0, 10))}` : `${x.kind} by ${x.by} on ${dLong(x.at.slice(0, 10))}`)}</li>`).join("")}</ul>` : ""; };
/** drag & drop box with a "required" flag */
function hr3FileDrop(key, label, hint, required) {
  return `<div class="fld fdrop-wrap" style="grid-column:1/-1"><label>${esc(label)} ${required ? `<span class="hr3req">— required</span>` : `<span class="muted" style="font-weight:400">— optional</span>`}</label>
    <div class="fdrop" data-fzone="${key}" role="button" tabindex="0" aria-label="Attach files"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 18a4.5 4.5 0 1 1 .8-8.9A6 6 0 0 1 19 10.5 3.8 3.8 0 0 1 18 18"/><path d="M12 12v8M9 15l3-3 3 3"/></svg><b>Drag &amp; drop the certificate here, or click to choose</b><small>${esc(hint)}</small></div>
    <input type="file" multiple accept="application/pdf,image/jpeg,image/png" data-fdrop="${key}" style="display:none">
    <div id="fchips-${key}" class="fchips">${pendingChips(key)}</div></div>`;
}
const hr3Tabs = (key, list, cur) => `<div class="hr3tabs" role="tablist">${list.map(([k, l, n]) => `<button role="tab" class="${k === cur ? "on" : ""}" data-a="tab" data-k="${key}" data-v="${k}">${esc(l)}${n != null ? ` <span class="cnt">${n}</span>` : ""}</button>`).join("")}</div>`;

/* ---------------- seed additions (deterministic, before replay) ---------------- */
{
  const _fsHr3 = freshState;
  freshState = function () {
    const S = _fsHr3();
    S.roes = S.roes || []; S.leaveAdjustments = []; S.benefitChanges = [];
    for (const c of S.certifications || []) c.history = c.history || [];
    if (!S.workflows.some((w) => w.code === "JOB_REQUISITION")) {
      S.workflows.push({ id: "wf_job_req", code: "JOB_REQUISITION", name: "Job openings", isActive: true });
      S.workflowSteps.push({ id: "wf_job_req_s1", workflowId: "wf_job_req", sequence: 1, name: "Hiring manager approval", approverType: "MANAGER", thresholdMinCents: 0 });
    }
    return S;
  };
}

/* ---------------- approvals: an instance can name its approver (job openings go to the hiring manager) ---------------- */
{
  const _canActOn = canActOn;
  canActOn = function (S, a, inst) {
    if (inst && inst.approverUserId) {
      if (inst.status !== "PENDING") return null;
      const step = activeSteps(S, inst).find((s) => s.sequence === inst.currentStep);
      if (!step) return null;
      return a.isSuper || a.user.id === inst.approverUserId ? step : null;
    }
    return _canActOn(S, a, inst);
  };
  const _whoIsNext = whoIsNext;
  whoIsNext = function (S, inst) { return inst && inst.approverUserId ? inst.approverName || "the hiring manager" : _whoIsNext(S, inst); };
  const _applyOutcome = applyOutcome;
  applyOutcome = function (S, ctx, inst, outcome) {
    if (inst.entityType === "JobPosting") {
      const j = byId(S.jobPostings, inst.entityId);
      if (!j) return;
      if (outcome === "APPROVED") { Object.assign(j, { status: "OPEN", postedAt: ctx.now, approvedAt: ctx.now, approvedByName: ctx.actor.displayName }); ctx.notify(inst.requestedById, { type: "APPROVED", title: `Opening approved: ${j.title}`, body: "The posting is live and takes applicants.", linkUrl: `/hr/hiring/${j.id}` }); }
      else { Object.assign(j, { status: "DRAFT", returnedAt: ctx.now, returnedByName: ctx.actor.displayName }); }
      ctx.audit({ module: "hr", action: outcome === "APPROVED" ? "APPROVE" : "REJECT", companyId: j.companyId, entityType: "JobPosting", entityId: j.id, summary: outcome === "APPROVED" ? `${ctx.actor.displayName} approved the opening “${j.title}” — it is now live.` : `${ctx.actor.displayName} sent the opening “${j.title}” back to draft.` });
      return;
    }
    return _applyOutcome(S, ctx, inst, outcome);
  };
  const _entityLink = entityLink;
  entityLink = function (inst) { if (inst.entityType === "JobPosting") return can(A, "hr.employees.edit") ? `<button class="lnk" style="font-size:12px" data-go="/hr/hiring/${inst.entityId}">Open job opening →</button>` : ""; return _entityLink(inst); };
  const _entityDetail = entityDetail;
  entityDetail = function (inst) {
    if (inst.entityType === "JobPosting") { const j = byId(S.jobPostings, inst.entityId); if (j) return `${esc(byId(S.departments, j.departmentId)?.name || "")} · ${esc(EMPLOYMENT[j.employmentType] || "")} · ${j.openings} opening${j.openings === 1 ? "" : "s"}${j.salaryMinCents ? ` · ${hr3PayRange(j)}` : ""}${j.reason ? ` · ${esc(j.reason)}` : ""}${j.startDate ? ` · start ${dLong(j.startDate)}` : ""}`; }
    return _entityDetail(inst);
  };
}
const hr3PayRange = (j) => (j.salaryMinCents ? (j.salaryMinCents < 50000 ? `${money(j.salaryMinCents)}–${money(j.salaryMaxCents || j.salaryMinCents)} / hour` : `${money(j.salaryMinCents)}–${money(j.salaryMaxCents || j.salaryMinCents)} / year`) : "pay not set");

/* ==========================================================================
   Reducers
   ========================================================================== */
function hr3CertCanEdit(ctx, emp) { if (ctx.auth.employee?.id === emp.id) return; ctx.need("hr.employees.edit"); ctx.company(emp.companyId); }
Object.assign(R, {
  /* ---- end of employment and the Record of Employment ---- */
  "employee.terminate"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const e = byId(S.employees, p.employeeId);
    if (!e) fail("That person no longer exists.");
    ctx.company(e.companyId);
    if (e.status === "TERMINATED") fail(`${empName(e)}'s employment has already ended.`);
    const u = S.users.find((x) => x.employeeId === e.id);
    if (u?.id === ctx.actor.id) fail("You can't end your own employment here.");
    if (u?.isDemoUser) fail("This person is one of the demo sign-ins on the login page, so they stay on staff. Try one of the Taan Forest crew such as Kaylee Bear or Tanner Moosomin — their pay is posted, so the ROE fills in.");
    if (!p.lastDay) fail("Enter the last day worked and paid.");
    if (p.lastDay < e.startDate) fail("The last day is before they started.");
    if (!ROE_REASONS[p.reasonCode]) fail("Choose the reason for the Record of Employment.");
    const vac = Math.max(0, Math.round(Number(p.vacationPayCents) || 0));
    const from = e.status;
    Object.assign(e, { status: "TERMINATED", endDate: p.lastDay, terminationReason: p.reasonCode });
    if (u) u.isActive = false;
    // assignments end: benefits, direct reports, departments / projects / postings they lead, open time-off requests
    for (const b of S.benefits) if (b.employeeId === e.id && (!b.endDate || b.endDate > p.lastDay)) b.endDate = p.lastDay;
    for (const t of S.onboardingTasks) if (t.employeeId === e.id && t.status !== "COMPLETE") t.status = "CANCELLED";
    const reports = S.employees.filter((x) => x.managerId === e.id && x.status !== "TERMINATED");
    for (const r of reports) r.managerId = e.managerId || undefined;
    for (const d of S.departments) if (d.managerId === e.id) d.managerId = e.managerId || undefined;
    for (const pr of S.projects) if (pr.managerId === e.id && pr.status !== "CLOSED") pr.managerId = e.managerId || undefined;
    for (const j of S.jobPostings) if (j.hiringManagerId === e.id && !["FILLED", "CLOSED"].includes(j.status)) j.hiringManagerId = e.managerId || undefined;
    for (const lr of S.leaveRequests) if (lr.employeeId === e.id && lr.status === "PENDING_APPROVAL") { lr.status = "CANCELLED"; const inst = byId(S.approvals, lr.approvalInstanceId); if (inst) Object.assign(inst, { status: "CANCELLED", completedAt: ctx.now }); }
    for (const be of S.benefitEnrollments || []) if (be.employeeId === e.id && be.status === "REQUESTED") be.status = "CANCELLED";
    // Record of Employment: insurable hours and earnings come from posted pay runs (last 53 weeks)
    const finalPeriodEnd = periodEndFor(periodStartFor(p.lastDay));
    const since = addDays(p.lastDay, -371);
    const rows = [];
    for (const pe of S.payrollEntries) {
      if (pe.employeeId !== e.id) continue;
      const run = byId(S.payrollRuns, pe.payrollRunId);
      if (!run || run.status !== "POSTED" || run.periodEnd < since || run.periodStart > finalPeriodEnd) continue;
      rows.push({ periodEnd: run.periodEnd, cents: pe.eiInsurableCents || 0, hours: pe.insurableHours || 0, runNumber: run.runNumber });
    }
    rows.sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1));
    const earnings = rows.slice(0, 27);
    const c0 = byId(S.companies, e.companyId);
    S.roes = S.roes || [];
    const roe = { id: ctx.id("roe"), employeeId: e.id, companyId: e.companyId, status: "DRAFT", reasonCode: p.reasonCode, firstDay: e.startDate, lastDay: p.lastDay, finalPeriodEnd, occupation: byId(S.positions, e.positionId)?.title || "", payFrequency: "Biweekly",
      insurableHours: rows.reduce((s, r) => s + r.hours, 0), earnings, totalEarningsCents: earnings.reduce((s, r) => s + r.cents, 0), vacationPayCents: vac, expectedRecall: p.reasonCode === "A" ? p.recall || "Unknown" : "Not returning",
      comments: (p.notes || "").trim() || undefined, payrollAccount: String(c0.businessNumber || "").replace(/RC(\d+)$/, "RP$1"), createdByName: ctx.actor.displayName, createdAt: ctx.now };
    S.roes.push(roe);
    e.roeId = roe.id;
    ctx.notifyPerm("payroll.run", e.companyId, { type: "PAYROLL", title: `ROE to issue: ${empName(e)}`, body: `Last day ${dLong(p.lastDay)} · ${ROE_REASONS[p.reasonCode]}`, linkUrl: `/payroll/roe/${roe.id}` }, ctx.actor.id);
    ctx.audit({ module: "hr", action: "STATUS_CHANGE", entityType: "Employee", entityId: e.id, companyId: e.companyId, summary: `${ctx.actor.displayName} ended ${empName(e)}'s employment (was ${String(from).toLowerCase()}) — last day ${dLong(p.lastDay)}, reason ${p.reasonCode}. Sign-in off, benefits ended${reports.length ? `, ${reports.length} direct report${reports.length === 1 ? "" : "s"} reassigned` : ""}, ROE drafted.` });
  },
  "roe.issue"(S, p, ctx) {
    ctx.need("payroll.run");
    const roe = byId(S.roes || [], p.id);
    if (!roe || roe.status !== "DRAFT") fail("Only draft ROEs can be issued.");
    ctx.company(roe.companyId);
    const serial = nextNum((S.roes || []).map((r) => r.serial).filter(Boolean), "ROE-2026", 4);
    Object.assign(roe, { status: "ISSUED", serial, issuedAt: ctx.now, issuedByName: ctx.actor.displayName });
    const e = byId(S.employees, roe.employeeId);
    ctx.audit({ module: "payroll", action: "POST", companyId: roe.companyId, entityType: "Employee", entityId: e.id, summary: `${ctx.actor.displayName} issued ${serial} for ${empName(e)} — ${hrs(roe.insurableHours)} insurable hours, ${money(roe.totalEarningsCents)} insurable earnings.` });
  },

  /* ---- benefits: HR enrols directly ---- */
  "benefit.enroll"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const e = byId(S.employees, p.employeeId);
    if (!e) fail("Choose a person.");
    ctx.company(e.companyId);
    if (!hr2Active(e)) fail(`${empName(e)} isn't on staff.`);
    const plan = byId(S.benefitPlans, p.planId);
    if (!plan || plan.isActive === false) fail("Choose a plan.");
    const action = BEN_ACTIONS[p.action] ? p.action : null;
    if (!action) fail("Choose Join, Change coverage or Opt out.");
    const coverage = BEN_COVERAGE[p.coverage] ? p.coverage : "EMPLOYEE";
    if (!p.effectiveDate) fail("Choose the date it should start.");
    const cur = benCurrent(S, e.id, plan.id, p.effectiveDate);
    if (action === "ENROL" && cur) fail(`${empName(e)} is already in ${plan.name} — choose Change coverage or Opt out instead.`);
    if (action !== "ENROL" && !cur) fail(`${empName(e)} isn't in ${plan.name} yet — choose Join.`);
    if (action === "CHANGE" && cur && (cur.coverage || "EMPLOYEE") === coverage) fail("That's the coverage they already have.");
    const mult = BEN_COVERAGE[coverage][1];
    if (cur) { if (cur.effectiveDate === p.effectiveDate) S.benefits.splice(S.benefits.indexOf(cur), 1); else cur.endDate = addDays(p.effectiveDate, -1); }
    if (action !== "WAIVE") S.benefits.push({ id: ctx.id("ben"), employeeId: e.id, planId: plan.id, effectiveDate: p.effectiveDate, coverage, employeeCostCentsOverride: mult > 1 ? plan.employeeCostCentsPerPay * mult : undefined, employerCostCentsOverride: mult > 1 ? plan.employerCostCentsPerPay * mult : undefined });
    S.benefitChanges = S.benefitChanges || [];
    const row = { id: ctx.id("bc"), employeeId: e.id, companyId: e.companyId, planId: plan.id, action, coverage, effectiveDate: p.effectiveDate, note: (p.note || "").trim() || undefined, byName: ctx.actor.displayName, at: ctx.now };
    S.benefitChanges.push(row);
    ctx.notify(userOfEmployee(S, e.id)?.id, { type: "SYSTEM", title: `Benefits updated: ${plan.name}`, body: `${benLabel(row)} — recorded by ${ctx.actor.displayName}.`, linkUrl: "/me/profile/benefits" });
    ctx.audit({ module: "hr", action: "UPDATE", companyId: e.companyId, entityType: "Employee", entityId: e.id, summary: `${ctx.actor.displayName} set ${empName(e)}'s benefits: ${benLabel(row)}.` });
  },
  "benefit.end"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const b = byId(S.benefits, p.id);
    if (!b) fail("That enrolment no longer exists.");
    const e = byId(S.employees, b.employeeId), plan = byId(S.benefitPlans, b.planId);
    ctx.company(e.companyId);
    if (!p.endDate) fail("Choose the last day of coverage.");
    if (p.endDate < b.effectiveDate) fail("Coverage can't end before it started.");
    if (b.endDate && b.endDate <= ctx.now.slice(0, 10)) fail("That enrolment has already ended.");
    b.endDate = p.endDate;
    S.benefitChanges = S.benefitChanges || [];
    const row = { id: ctx.id("bc"), employeeId: e.id, companyId: e.companyId, planId: plan.id, action: "WAIVE", coverage: b.coverage || "EMPLOYEE", effectiveDate: addDays(p.endDate, 1), note: (p.note || "").trim() || undefined, byName: ctx.actor.displayName, at: ctx.now };
    S.benefitChanges.push(row);
    ctx.notify(userOfEmployee(S, e.id)?.id, { type: "SYSTEM", title: `Benefits updated: ${plan.name}`, body: `Coverage ends ${dLong(p.endDate)} — recorded by ${ctx.actor.displayName}.`, linkUrl: "/me/profile/benefits" });
    ctx.audit({ module: "hr", action: "UPDATE", companyId: e.companyId, entityType: "Employee", entityId: e.id, summary: `${ctx.actor.displayName} ended ${empName(e)}'s ${plan.name} coverage on ${dLong(p.endDate)}.` });
  },

  /* ---- time off: HR adjusts a balance ---- */
  "leave.adjust"(S, p, ctx) {
    ctx.need("leave.manage");
    const e = byId(S.employees, p.employeeId), lt = byId(S.leaveTypes, p.leaveTypeId);
    if (!e || !lt) fail("Choose the person and the type of leave.");
    ctx.company(e.companyId);
    const hours = Number(p.hours);
    if (!hours || !isFinite(hours)) fail("Enter the hours to add (or a negative number to take away).");
    if (Math.abs(hours) > 500) fail("That is more than 500 hours — check the number.");
    const reason = (p.reason || "").trim();
    if (!reason) fail("Give a short reason — it shows in the person's history.");
    const year = Number((p.year || ctx.now.slice(0, 4)));
    let bal = S.leaveBalances.find((b) => b.employeeId === e.id && b.leaveTypeId === lt.id && b.year === year);
    if (!bal) { bal = { id: ctx.id("lb"), employeeId: e.id, leaveTypeId: lt.id, year, entitledHours: 0, carriedOverHours: 0, usedHours: 0 }; S.leaveBalances.push(bal); }
    const before = bal.entitledHours + (bal.carriedOverHours || 0) - (bal.usedHours || 0);
    if (before + hours < 0) fail(`${empName(e)} only has ${hrs(before)} h of ${lt.name} left — the balance can't go below zero.`);
    bal.entitledHours = Math.round((bal.entitledHours + hours) * 100) / 100;
    S.leaveAdjustments = S.leaveAdjustments || [];
    S.leaveAdjustments.push({ id: ctx.id("la"), employeeId: e.id, companyId: e.companyId, leaveTypeId: lt.id, year, hours, reason, byName: ctx.actor.displayName, at: ctx.now });
    ctx.notify(userOfEmployee(S, e.id)?.id, { type: "SYSTEM", title: `${lt.name} balance ${hours > 0 ? "increased" : "reduced"} by ${hrs(Math.abs(hours))} h`, body: `${reason} — recorded by ${ctx.actor.displayName}. You now have ${hrs(before + hours)} h left.`, linkUrl: "/me/time-off" });
    ctx.audit({ module: "leave", action: "UPDATE", companyId: e.companyId, entityType: "Employee", entityId: e.id, summary: `${ctx.actor.displayName} adjusted ${empName(e)}'s ${lt.name} balance by ${hours > 0 ? "+" : ""}${hrs(hours)} h (${year}) — ${reason}.` });
  },

  /* ---- performance reviews: the person acknowledges ---- */
  "review.ack"(S, p, ctx) {
    const r = byId(S.reviews, p.id);
    if (!r) fail("That review no longer exists.");
    if (ctx.auth.employee?.id !== r.employeeId) fail("Only the person reviewed can acknowledge it.");
    if (r.status !== "COMPLETED") fail("There's nothing to acknowledge yet — the review isn't completed.");
    if (r.ackAt) fail("You've already acknowledged this review.");
    Object.assign(r, { ackAt: ctx.now, ackComment: (p.comment || "").trim() || undefined });
    const e = hr2Emp(r.employeeId);
    if (r.reviewerId) ctx.notify(userOfEmployee(S, r.reviewerId)?.id, { type: "SYSTEM", title: `${empName(e)} acknowledged their ${r.cycle} review`, body: r.ackComment ? `“${r.ackComment}”` : "No comment added.", linkUrl: `/hr/reviews/${r.id}` });
    ctx.audit({ module: "hr", action: "APPROVE", companyId: e.companyId, entityType: "PerformanceReview", entityId: r.id, summary: `${ctx.actor.displayName} acknowledged their ${r.cycle} review${r.ackComment ? ` — “${r.ackComment}”` : ""}.` });
  },

  /* ---- hiring: a new opening goes to the hiring manager for approval ---- */
  "job.create"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const title = (p.title || "").trim();
    if (!p.companyId || !title) fail("An opening needs a company and a job title.");
    ctx.company(p.companyId);
    const dep = byId(S.departments, p.departmentId);
    if (!dep || dep.companyId !== p.companyId) fail("Choose a department in that company.");
    const openings = Math.max(1, Math.round(Number(p.openings) || 1));
    if (p.hiringManagerId && !hr2Emp(p.hiringManagerId)) fail("Pick a hiring manager from the list.");
    if (p.salaryMinCents && p.salaryMaxCents && p.salaryMaxCents < p.salaryMinCents) fail("The top of the salary range is below the bottom.");
    const row = { id: ctx.id("jp"), companyId: p.companyId, title, departmentId: dep.id, hiringManagerId: p.hiringManagerId || dep.managerId || undefined, openings, locationText: (p.locationText || "").trim() || undefined, employmentType: EMPLOYMENT[p.employmentType] ? p.employmentType : "FULL_TIME", salaryMinCents: p.salaryMinCents || undefined, salaryMaxCents: p.salaryMaxCents || undefined, reason: (p.reason || "").trim() || undefined, startDate: p.startDate || undefined, description: (p.description || "").trim() || undefined, status: "DRAFT", createdByName: ctx.actor.displayName, createdAt: ctx.now };
    S.jobPostings.push(row);
    ctx.audit({ module: "hr", action: "CREATE", companyId: p.companyId, entityType: "JobPosting", entityId: row.id, summary: `${ctx.actor.displayName} drafted the opening “${title}” (${openings} opening${openings === 1 ? "" : "s"}, ${dep.name}).` });
    if (p.submit) R["job.submit"](S, { id: row.id }, ctx);
  },
  "job.submit"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const j = byId(S.jobPostings, p.id);
    if (!j) fail("That opening no longer exists.");
    ctx.company(j.companyId);
    if (j.status !== "DRAFT") fail("Only draft openings can be sent for approval.");
    const dep = byId(S.departments, j.departmentId);
    const me = ctx.auth.employee?.id;
    const cands = [j.hiringManagerId, dep?.managerId, ctx.auth.employee?.managerId].filter((id) => id && id !== me);
    let appEmp = null, appUser = null;
    for (const id of cands) { const e = hr2Emp(id); const u = e && hr2Active(e) ? userOfEmployee(S, e.id) : null; if (u) { appEmp = e; appUser = u; break; } }
    if (!appUser) fail("Nobody is available to approve this — set a hiring manager who has a sign-in.");
    const wf = S.workflows.find((w) => w.code === "JOB_REQUISITION");
    const steps = S.workflowSteps.filter((s) => s.workflowId === wf.id).sort((a, b) => a.sequence - b.sequence);
    const label = `Job opening — ${j.title} × ${j.openings} · ${co(j.companyId).displayName}`;
    const inst = { id: ctx.id("ai"), workflowId: wf.id, companyId: j.companyId, entityType: "JobPosting", entityId: j.id, entityLabel: label, amountCents: 0, requestedById: ctx.actor.id, currentStep: steps[0].sequence, totalSteps: steps.length, status: "PENDING", createdAt: ctx.now, approverUserId: appUser.id, approverName: empName(appEmp) };
    S.approvals.push(inst);
    Object.assign(j, { status: "PENDING_APPROVAL", approvalInstanceId: inst.id, submittedAt: ctx.now, hiringManagerId: j.hiringManagerId || appEmp.id });
    ctx.notify(appUser.id, { type: "APPROVAL_REQUIRED", title: `Approval needed: ${label}`, body: `${dep?.name || ""} · ${j.openings} opening${j.openings === 1 ? "" : "s"}${j.salaryMinCents ? ` · ${hr3PayRange(j)}` : ""} · step ${steps[0].name}`, linkUrl: "/approvals" });
    ctx.notify(ctx.actor.id, { type: "SYSTEM", title: `Sent for approval: ${label}`, body: `Waiting for ${empName(appEmp)} (${steps[0].name}).`, linkUrl: `/hr/hiring/${j.id}` });
    ctx.audit({ module: "approvals", action: "SUBMIT", companyId: j.companyId, entityType: "JobPosting", entityId: j.id, summary: `${ctx.actor.displayName} sent the opening “${j.title}” to ${empName(appEmp)} for approval.` });
  },

  /* ---- certificates: files, renewals, reminders ---- */
  "cert.add"(S, p, ctx) {
    const emp = hr2Emp(p.employeeId);
    const name = (p.name || "").trim();
    if (!emp || !name) fail("Pick the person and type the certificate name.");
    hr3CertCanEdit(ctx, emp);
    const own = ctx.auth.employee?.id === emp.id;
    if (!p.issuedDate) fail("Enter the date it was issued.");
    if (p.expiryDate && p.expiryDate < p.issuedDate) fail("It can't expire before it was issued.");
    const files = (p.files || []).filter((f) => f && f.name);
    if (own && !files.length) fail("Attach the certificate (PDF or photo) — it's required.");
    const kind = CERT_KINDS[p.kind] ? p.kind : "CERTIFICATION";
    S.certifications = S.certifications || [];
    const row = { id: ctx.id("cert"), employeeId: emp.id, name, kind, issuer: (p.issuer || "").trim() || undefined, number: (p.number || "").trim() || undefined, issuedDate: p.issuedDate, expiryDate: p.expiryDate || undefined, reminderDays: Math.max(0, Math.round(Number(p.reminderDays) || 60)), notes: (p.notes || "").trim() || undefined, addedByName: ctx.actor.displayName, createdAt: ctx.now, history: [{ kind: "ADDED", at: ctx.now, by: ctx.actor.displayName }] };
    S.certifications.push(row);
    if (files.length) attachFiles(S, ctx, "Certification", row.id, files, emp.companyId, emp.id);
    if (own) ctx.notifyPerm("hr.employees.edit", emp.companyId, { type: "SYSTEM", title: `Certificate added: ${empName(emp)} — ${name}`, body: `${CERT_KINDS[kind]}${row.expiryDate ? ` · expires ${dLong(row.expiryDate)}` : " · no expiry"} · ${files.length} file${files.length === 1 ? "" : "s"} attached`, linkUrl: "/hr/certifications" }, ctx.actor.id);
    ctx.audit({ module: "hr", action: "CREATE", companyId: emp.companyId, entityType: "Certification", entityId: row.id, summary: `${ctx.actor.displayName} added ${CERT_KINDS[kind].toLowerCase()} “${name}” for ${empName(emp)}${row.expiryDate ? ` (expires ${dLong(row.expiryDate)})` : ""}.` });
  },
  "cert.renew"(S, p, ctx) {
    const c = byId(S.certifications || [], p.id);
    if (!c) fail("That certificate no longer exists.");
    const emp = hr2Emp(c.employeeId);
    hr3CertCanEdit(ctx, emp);
    const own = ctx.auth.employee?.id === emp.id;
    if (!p.expiryDate) fail("Enter the new expiry date.");
    if (c.expiryDate && p.expiryDate <= c.expiryDate) fail("The new expiry date has to be later than the old one.");
    const files = (p.files || []).filter((f) => f && f.name);
    if (own && !files.length) fail("Attach the renewed certificate (PDF or photo) — it's required.");
    const old = certCurrentFiles(c);
    for (const f of old) f.supersededAt = ctx.now;
    c.history = c.history || [];
    c.history.push({ kind: "RENEWED", at: ctx.now, by: ctx.actor.displayName, from: c.expiryDate, to: p.expiryDate, fileIds: old.map((f) => f.id) });
    c.expiryDate = p.expiryDate;
    c.issuedDate = p.issuedDate || ctx.now.slice(0, 10);
    if (p.number) c.number = String(p.number).trim();
    if (files.length) attachFiles(S, ctx, "Certification", c.id, files, emp.companyId, emp.id);
    if (own) ctx.notifyPerm("hr.employees.edit", emp.companyId, { type: "SYSTEM", title: `Certificate renewed: ${empName(emp)} — ${c.name}`, body: `Now expires ${dLong(p.expiryDate)} · new file attached`, linkUrl: "/hr/certifications" }, ctx.actor.id);
    ctx.audit({ module: "hr", action: "UPDATE", companyId: emp.companyId, entityType: "Certification", entityId: c.id, summary: `${ctx.actor.displayName} renewed ${empName(emp)}'s “${c.name}” — now expires ${dLong(p.expiryDate)}.` });
  },
  "cert.remind"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const c = byId(S.certifications || [], p.id);
    if (!c) fail("That certificate no longer exists.");
    const emp = hr2Emp(c.employeeId);
    ctx.company(emp.companyId);
    if (!hr2Active(emp)) fail(`${empName(emp)} isn't on staff any more.`);
    const u = userOfEmployee(S, emp.id);
    if (!u) fail(`${empName(emp)} has no sign-in to email.`);
    const st = hr2CertStatus(c.expiryDate);
    const when = c.expiryDate ? (st === "EXPIRED" ? `expired ${dLong(c.expiryDate)}` : `expires ${dLong(c.expiryDate)}`) : "has no expiry date on file";
    const note = (p.note || "").trim();
    ctx.notify(u.id, { type: "SYSTEM", title: `Please renew your ${c.name}`, body: `Your ${CERT_KINDS[c.kind] || "certificate"} ${when}. Renew it and add the new certificate under My Profile › Certificates.${note ? ` ${note}` : ""}`, linkUrl: "/me/certifications" });
    c.history = c.history || [];
    c.history.push({ kind: "REMINDED", at: ctx.now, by: ctx.actor.displayName, note: note || undefined });
    c.lastRemindedAt = ctx.now; c.lastRemindedBy = ctx.actor.displayName;
    ctx.audit({ module: "hr", action: "UPDATE", companyId: emp.companyId, entityType: "Certification", entityId: c.id, summary: `${ctx.actor.displayName} reminded ${empName(emp)} to renew “${c.name}” (${when}).` });
  },
});

/* ==========================================================================
   Employees — list, record with tabs, End employment
   ========================================================================== */
function vHr3Employees() {
  const f = UI.filters.hr3emp || (UI.filters.hr3emp = {});
  const all = inScope(S.employees).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const shown = all.filter((e) => (f.status === "ON_STAFF" ? !["TERMINATED", "INACTIVE"].includes(e.status) : f.status ? e.status === f.status : true));
  const cnt = (k) => (k === "ON_STAFF" ? all.filter((e) => !["TERMINATED", "INACTIVE"].includes(e.status)).length : k ? all.filter((e) => e.status === k).length : all.length);
  const chips = [["", "All"], ["ON_STAFF", "On staff"], ["ACTIVE", "Active"], ["ONBOARDING", "Onboarding"], ["ON_LEAVE", "On leave"], ["TERMINATED", "Ended"]].filter(([k]) => !k || cnt(k)).map(([k, l]) => `<button class="hchip ${(f.status || "") === k ? "on" : ""}" data-a="hr2Chip" data-k="hr3emp" data-f="status" data-v="${k}">${l} <span>${cnt(k)}</span></button>`).join("");
  return ph("Employee records", `${cnt("ON_STAFF")} people on staff · ${scopeName()} · open someone to change their pay, their benefits or end their employment`, can(A, "hr.employees.create") ? `<button class="btn pri" data-go="/hr/employees/new">Add employee</button>` : "") + flashHtml()
    + `<div class="form-row" style="justify-content:space-between;margin-bottom:12px"><div class="hr2chips" style="margin:0">${chips}</div><input class="in" style="max-width:300px;border-radius:999px" placeholder="Search name, number, position…" aria-label="Search employees" data-filter="empT"></div>`
    + cardFlush("", shown.length ? `<div class="tw"><table class="t" id="empT"><thead><tr><th>Name</th><th>Company</th><th>Department</th><th>Position</th><th>Manager</th><th>Type</th><th>Started</th><th>Status</th></tr></thead><tbody>${shown.map((e) => `<tr class="click" data-go="/hr/employees/${e.id}"><td><span style="display:flex;align-items:center;gap:10px">${avatar(e, 30)}<span><strong>${esc(empName(e))}</strong><span class="hint mono" style="display:block">${esc(e.employeeNumber)}</span></span></span></td><td>${coTag(e.companyId)}</td><td>${esc(byId(S.departments, e.departmentId)?.name || "—")}</td><td>${esc(byId(S.positions, e.positionId)?.title || "—")}</td><td>${esc(e.managerId ? empName(byId(S.employees, e.managerId)) : "—")}</td><td>${esc(EMPLOYMENT[e.employmentType] || e.employmentType)}</td><td>${dLong(e.startDate)}${e.endDate ? `<div class="hint">ended ${esc(dLong(e.endDate))}</div>` : ""}</td><td>${badge(e.status)}</td></tr>`).join("")}</tbody></table></div>` : empty("Nobody matches this filter"));
}

function hr3TerminateCard(e) {
  if (!can(A, "hr.employees.edit")) return "";
  if (e.status === "TERMINATED") { const roe = e.roeId ? byId(S.roes || [], e.roeId) : null; return card("Employment ended", `<p class="hint" style="margin-top:0">Last day ${esc(dLong(e.endDate))} · ${esc(ROE_REASONS[e.terminationReason] || "")}. Sign-in is off, benefits ended, direct reports moved up a level, and they're left out of pay runs after their final period.</p>${roe ? `<button class="btn" data-go="/payroll/roe/${roe.id}">Record of Employment · ${esc(roe.serial || "draft")}</button>` : ""}`); }
  return card("End employment", `<p class="hint" style="margin-top:0">For a resignation, a layoff or the end of a season. Turns off sign-in, ends benefits on the last day, hands their direct reports to their manager, keeps them in the pay run for their final period, and drafts the Record of Employment from their posted pay for Payroll to issue.</p>
    <form data-f="hr3Terminate" data-id="${e.id}" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="fld"><label for="tmLast">Last day worked and paid</label><input class="in" type="date" id="tmLast" name="lastDay" value="${todayStr()}" required></div><div class="fld"><label for="tmWhy">Reason (ROE block 16)</label><select class="in" id="tmWhy" name="reasonCode">${Object.entries(ROE_REASONS).map(([k, v]) => opt(k, `${k} — ${v}`, k === (e.employmentType === "SEASONAL" ? "A" : "E"))).join("")}</select></div><div class="fld"><label for="tmVac">Vacation pay paid out ($)</label><input class="in num" id="tmVac" name="vacation" inputmode="decimal" placeholder="0.00"></div><div class="fld"><label for="tmRecall">Expected to return (layoffs)</label><select class="in" id="tmRecall" name="recall">${["Unknown", "Yes — next season", "Not returning"].map((x) => opt(x, x, x === (e.employmentType === "SEASONAL" ? "Yes — next season" : "Unknown"))).join("")}</select></div><div class="fld" style="grid-column:1/-1"><label for="tmNote">Comments (ROE block 18)</label><input class="in" id="tmNote" name="notes" placeholder="optional"></div><div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button class="btn danger">End employment &amp; draft ROE</button></div></form>`);
}

function vHr3Employee(q, id) {
  const e = byId(S.employees, id);
  if (!e || !canSee(A, e.companyId)) return ph("Employee not found") + card("", empty("This person isn't in the companies you can see"));
  const pos = byId(S.positions, e.positionId), dep = byId(S.departments, e.departmentId), loc = byId(S.locations, e.locationId);
  const mgr = e.managerId ? byId(S.employees, e.managerId) : null;
  const reports = S.employees.filter((x) => x.managerId === e.id);
  const chain = []; let c = mgr; while (c && chain.length < 6) { chain.push(c); c = c.managerId ? byId(S.employees, c.managerId) : null; }
  const comp = latestComp(e.id);
  const prof = S.payProfiles.find((x) => x.employeeId === e.id);
  const edit = can(A, "hr.employees.edit"), seePay = can(A, "payroll.view") || edit;
  const user = userOfEmployee(S, e.id);
  const tab = UI.tabs.hr3emp || "overview";
  const today = todayStr();
  let body = "";
  if (tab === "overview") {
    const tasks = S.onboardingTasks.filter((t) => t.employeeId === e.id).sort((a, b) => a.sortOrder - b.sortOrder);
    body = `<div class="grid g3">${card("Job", `<dl class="kv"><dt>Department</dt><dd>${esc(dep?.name || "—")}</dd><dt>Location</dt><dd>${esc(loc?.name || "—")}</dd><dt>Type</dt><dd>${esc(EMPLOYMENT[e.employmentType] || "—")}</dd><dt>Started</dt><dd>${dLong(e.startDate)}</dd>${e.endDate ? `<dt>Last day</dt><dd>${dLong(e.endDate)}</dd>` : ""}<dt>Email</dt><dd>${esc(e.workEmail || "—")}</dd><dt>Phone</dt><dd>${esc(e.phone || "—")}</dd><dt>Sign-in</dt><dd>${user ? esc(user.email) : e.status === "TERMINATED" ? "Switched off" : "No sign-in yet"}</dd></dl>`)}
      ${card("Reporting line", `<div class="hint" style="margin-bottom:6px">Approvals climb this chain; nobody approves their own request.</div>${chain.length ? chain.map((m, i) => `<div style="display:flex;gap:8px;align-items:center;padding:5px 0;padding-left:${i * 12}px">${avatar(m, 26)}<span><button class="lnk" data-go="/hr/employees/${m.id}">${esc(empName(m))}</button><span class="hint" style="display:block">${esc(byId(S.positions, m.positionId)?.title || "")}</span></span></div>`).join("") : `<div class="hint">Top of the organization.</div>`}${reports.length ? `<div class="sect-l" style="margin:12px 0 4px">Direct reports (${reports.length})</div>${reports.map((r) => `<div style="padding:3px 0"><button class="lnk" data-go="/hr/employees/${r.id}">${esc(empName(r))}</button></div>`).join("")}` : ""}`)}
      ${cardFlush("Onboarding", table(["Task", "Owner", "Due", "Status"], tasks.map((t) => `<tr><td>${esc(t.title)}</td><td>${esc(t.assigneeRole)}</td><td>${dLong(t.dueDate)}</td><td>${badge(t.status)}</td></tr>`), "No onboarding tasks."))}</div>`
      + (edit ? `<div class="grid g2" style="margin-top:14px">${card("Status", (() => { const inactive = ["INACTIVE", "TERMINATED"].includes(e.status); return `<p class="hint" style="margin-top:0">${e.status === "TERMINATED" ? "Employment has ended — see the card on the right." : inactive ? "This person is switched off: no sign-in, left off the directory, org chart and new payroll runs." : "Deactivate someone on a long absence or a seasonal break. Their sign-in is turned off too; nothing else changes."}</p>${e.status === "TERMINATED" ? "" : `<button class="btn ${inactive ? "pri" : ""}" data-a="empActive" data-id="${e.id}" data-on="${inactive ? 1 : 0}">${inactive ? "Activate" : "Deactivate"}</button>`}`; })())}${hr3TerminateCard(e)}</div>` : "");
  } else if (tab === "pay") {
    const mine = S.benefits.filter((b) => b.employeeId === e.id).map((b) => ({ b, p: byId(S.benefitPlans, b.planId) })).filter((x) => x.p).sort((a, b) => (a.b.effectiveDate < b.b.effectiveDate ? 1 : -1));
    const payCard = card("Pay", seePay ? `<dl class="kv"><dt>Pay type</dt><dd>${comp ? (comp.payType === "HOURLY" ? "Hourly" : "Salary") : "—"}</dd><dt>Rate</dt><dd class="num">${comp ? (comp.payType === "HOURLY" ? `${money(comp.hourlyRateCents)}/h` : `${money(comp.annualSalaryCents)}/yr`) : "—"}</dd><dt>Pay group</dt><dd>${esc(byId(S.payGroups, prof?.payGroupId)?.name || "—")}</dd><dt>Province</dt><dd>${esc(prof?.provinceOfEmployment || "BC")}</dd><dt>Deposit</dt><dd>${prof?.directDepositActive ? `<span class="mono">${esc(prof.bankAccountMasked)}</span>` : `<span class="badge tone-amber">None on file</span>`}</dd><dt>SIN</dt><dd class="mono">••• ••• •••</dd></dl>` : `<div class="hint">Pay details are visible to Payroll and HR only.</div>`);
    const benCard = cardFlush("Group plans", table(["Plan", "Coverage", "From", "To", ">Employee / pay", ">Employer / pay"], mine.map(({ b, p }) => `<tr><td>${BEN_ICON[p.category] || ""} <strong>${esc(p.name)}</strong></td><td>${esc((BEN_COVERAGE[b.coverage || "EMPLOYEE"] || BEN_COVERAGE.EMPLOYEE)[0])}</td><td>${dLong(b.effectiveDate)}</td><td>${b.endDate ? dLong(b.endDate) : `<span class="badge tone-green">Current</span>`}</td>${td(money(benCost(b, p, "employee")), 1)}${td(money(benCost(b, p, "employer")), 1)}</tr>`), "Not enrolled in any group plan."), edit ? `<button class="btn sm" data-go="/hr/benefits">Enrol or change →</button>` : "");
    body = `<div class="grid g2">${payCard}${benCard}</div>` + (edit && e.status !== "TERMINATED" ? `<div class="grid g2" style="margin-top:14px">${card("Change salary or rate", hr3SalaryForm(e, comp))}${cardFlush("Pay history", table(["From", "Reason", ">Rate"], S.compensations.filter((c) => c.employeeId === e.id).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1)).map((c) => `<tr><td>${dLong(c.effectiveDate)}</td><td>${esc(c.changeReason || "Change")}</td>${td(`<strong>${c.payType === "HOURLY" ? `${money(c.hourlyRateCents)}/h` : `${money(c.annualSalaryCents)}/yr`}</strong>`, 1)}</tr>`), "No pay history."))}</div>` : "");
  } else if (tab === "time") {
    const bal = leaveBalances(e.id).filter((b) => b.has);
    const reqs = S.leaveRequests.filter((r) => r.employeeId === e.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    const sheets = S.timesheets.filter((t) => t.employeeId === e.id).sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1)).slice(0, 8);
    const adj = (S.leaveAdjustments || []).filter((a) => a.employeeId === e.id).slice().reverse();
    body = `<div class="grid g2">${cardFlush("Time off balances · 2026", table(["Type", ">Entitled", ">Used", ">Waiting", ">Left"], bal.map((b) => `<tr><td>${esc(b.lt.name)}</td>${td(hrs(b.ent), 1)}${td(hrs(b.used), 1)}${td(hrs(b.pending), 1)}${td(`<strong>${hrs(b.avail)}</strong>`, 1)}</tr>`)), can(A, "leave.manage") ? `<button class="btn sm" data-a="hr3AdjustOpen" data-id="${e.id}">Adjust balance</button>` : "")}
      ${cardFlush("Time off requests", table(["Dates", "Type", ">Hours", "Status"], reqs.map((r) => `<tr><td>${dLong(r.startDate)}${r.endDate !== r.startDate ? ` → ${dLong(r.endDate)}` : ""}</td><td>${esc(byId(S.leaveTypes, r.leaveTypeId)?.name)}</td>${td(hrs(r.totalHours), 1)}<td>${badge(r.status)}</td></tr>`), "No time off requested."))}</div>
      <div class="grid g2" style="margin-top:14px">${cardFlush("Timesheets", table(["Period", ">Worked", ">Leave + stat", "Status"], sheets.map((s) => `<tr><td>${esc(periodLabel(s.periodStart, s.periodEnd))}</td>${td(hrs(s.workedHours), 1)}${td(hrs(s.statHours + s.vacationHours + s.sickHours + s.personalHours + s.otherLeaveHours), 1)}<td>${badge(s.status)}</td></tr>`), "No timesheets yet."))}
      ${cardFlush("Balance adjustments", table(["When", "Type", ">Hours", "Reason", "By"], adj.map((a) => `<tr><td>${dLong(a.at.slice(0, 10))}</td><td>${esc(byId(S.leaveTypes, a.leaveTypeId)?.name)}</td>${td(`${a.hours > 0 ? "+" : ""}${hrs(a.hours)}`, 1)}<td>${esc(a.reason)}</td><td>${esc(a.byName)}</td></tr>`), "No adjustments."))}</div>`;
  } else if (tab === "certs") {
    const list = (S.certifications || []).filter((x) => x.employeeId === e.id).sort((a, b) => ((a.expiryDate || "9999") < (b.expiryDate || "9999") ? -1 : 1));
    body = cardFlush("Certificates", list.length ? `<div class="tw"><table class="t"><thead><tr><th>Certificate</th><th>Issued</th><th>Expires</th><th>Status</th>${edit ? "<th>File</th>" : ""}<th>History</th></tr></thead><tbody>${list.map((x) => hr3CertRow(x, { showPerson: false, manage: edit, hr: true })).join("")}</tbody></table></div>` : empty("Nothing on file"), edit ? `<button class="btn sm pri" data-a="hr3CertNew" data-emp="${e.id}">Add a certificate</button>` : "");
  } else {
    const rows = S.audit.filter((x) => x.entityType === "Employee" && x.entityId === e.id || x.entityType === "Certification" && (S.certifications || []).some((c) => c.id === x.entityId && c.employeeId === e.id)).slice(-60).reverse();
    body = card("History", rows.map((x) => `<div class="hr3row"><div class="grow">${esc(x.summary)}<div class="hint">${esc(dTime(x.at))} · ${esc(x.actorName)}</div></div></div>`).join("") || empty("Nothing recorded yet"));
  }
  return ph(empName(e), `${pos?.title || "—"} · ${co(e.companyId).displayName} · ${e.employeeNumber}${dep ? ` · ${dep.name}` : ""}`, badge(e.status), crumb("/hr/employees", "Employee records")) + flashHtml()
    + hr3Tabs("hr3emp", HR3_EMP_TABS, tab) + body;
}
function hr3SalaryForm(e, comp) {
  return `<form data-f="salary" data-id="${e.id}" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <div class="fld"><label for="salEff">Starts on</label><input class="in" type="date" id="salEff" name="effectiveDate" required></div>
      <div class="fld"><label for="salType">Pay type</label><select class="in" id="salType" name="payType">${opt("SALARY", "Salaried (per year)", comp?.payType !== "HOURLY")}${opt("HOURLY", "Hourly", comp?.payType === "HOURLY")}</select></div>
      <div class="fld"><label for="salAmt">New amount ($)</label><input class="in num" style="text-align:right" id="salAmt" name="amount" inputmode="decimal" required placeholder="${comp?.payType === "HOURLY" ? "e.g. 31.50" : "e.g. 72000"}"></div>
      <div class="fld"><label for="salFreq">Pay schedule</label><select class="in" id="salFreq" name="payFrequency">${[["WEEKLY", "Weekly"], ["BIWEEKLY", "Biweekly"], ["SEMI_MONTHLY", "Semi-monthly"], ["MONTHLY", "Monthly"]].map(([k, l]) => opt(k, l, (comp?.payFrequency || "BIWEEKLY") === k)).join("")}</select></div>
      <div class="fld" style="grid-column:1/-1"><label for="salWhy">Reason</label><input class="in" id="salWhy" name="reason" placeholder="e.g. Annual review 3%, promotion"></div>
      <label class="form-row" style="grid-column:1/-1;font-size:13px"><input type="checkbox" name="overtimeEligible" ${comp?.overtimeEligible ? "checked" : ""}> Overtime eligible</label>
      <div class="form-row" style="grid-column:1/-1;justify-content:space-between"><span class="hint">Saved to pay history and the audit log; payroll uses it from the start date.</span><button class="btn pri">Save pay change</button></div></form>`;
}

/* ==========================================================================
   Record of Employment
   ========================================================================== */
function vHr3Roes() {
  const list = (S.roes || []).filter((r) => inView(S, A, r.companyId)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const drafts = list.filter((r) => r.status === "DRAFT").length;
  return ph("Records of Employment", "Drafted when HR ends someone's employment; Payroll checks the insurable hours and earnings and issues it.", dlButton("roes", "Download", { variant: "outline" })) + flashHtml()
    + `<div class="stats">${stat("To issue", String(drafts), drafts ? "drafted by HR, waiting on Payroll" : "nothing waiting", drafts ? "warn" : "")}${stat("Issued", String(list.length - drafts))}${stat("Insurable earnings", money(list.reduce((s, r) => s + r.totalEarningsCents, 0)), "across all ROEs")}</div>`
    + cardFlush("", table(["Employee", "Company", "Last day", "Reason", ">Insurable hours", ">Insurable earnings", "Status", ""], list.map((r) => { const e = byId(S.employees, r.employeeId); return `<tr class="click" data-go="/payroll/roe/${r.id}"><td><strong>${esc(empName(e))}</strong><div class="hint mono">${esc(r.serial || "draft")}</div></td><td>${coTag(r.companyId)}</td><td>${dLong(r.lastDay)}</td><td>${esc(r.reasonCode)} — ${esc(ROE_REASONS[r.reasonCode])}</td>${td(hrs(r.insurableHours), 1)}${td(money(r.totalEarningsCents), 1)}<td>${badge(r.status)}${r.issuedByName ? `<div class="hint">${esc(r.issuedByName)}</div>` : ""}</td><td class="r"><button class="btn sm" data-go="/payroll/roe/${r.id}">Open</button></td></tr>`; }), "No ROEs yet — ending someone's employment from their employee record drafts one from their posted pay."));
}
function vHr3Roe(q, id) {
  const r = byId(S.roes || [], id);
  if (!r || !canSee(A, r.companyId)) return ph("ROE not found") + card("", empty("Not in your companies"));
  const e = byId(S.employees, r.employeeId), c = co(r.companyId);
  const blk = (n, label, v) => `<div class="hr3blk"><span class="k">Block ${n} · ${esc(label)}</span><div class="v">${v}</div></div>`;
  const acts = `${r.status === "DRAFT" && can(A, "payroll.run") ? `<button class="btn pri" data-a="hr3RoeIssue" data-id="${r.id}">Issue ROE</button>` : ""}${dlButton("roe", "Download", { arg: r.id, variant: "outline" })}`;
  return ph(`Record of Employment · ${empName(e)}`, `${c.legalName} · ${r.serial ? `serial ${r.serial}` : "draft — not issued"}`, badge(r.status) + acts, can(A, "payroll.view") ? crumb("/payroll/roe", "Records of Employment") : crumb(`/hr/employees/${e.id}`, empName(e))) + flashHtml()
    + (r.status === "DRAFT" ? `<div class="msg info">${can(A, "payroll.run") ? "Check the figures, then issue. Built from posted pay runs; file it through ROE Web with Service Canada." : "Drafted by HR — Payroll checks the figures and issues it."}</div>` : `<div class="msg ok">Issued by ${esc(r.issuedByName)} · ${esc(dTime(r.issuedAt))}. File it through ROE Web with Service Canada.</div>`)
    + `<section class="card" style="padding:18px"><div class="grid g3">${blk(5, "Employer payroll account", `<span class="mono">${esc(r.payrollAccount)}</span>`)}${blk(6, "Pay period type", esc(r.payFrequency))}${blk(9, "Employee", `${esc(empName(e))} <span class="hint mono">${esc(e.employeeNumber)}</span>`)}${blk(10, "First day worked", dLong(r.firstDay))}${blk(11, "Last day for which paid", dLong(r.lastDay))}${blk(12, "Final pay period ending", dLong(r.finalPeriodEnd))}${blk(13, "Occupation", esc(r.occupation || "—"))}${blk(14, "Expected date of recall", esc(r.expectedRecall))}${blk("15A", "Total insurable hours", hrs(r.insurableHours))}${blk("15B", "Total insurable earnings", money(r.totalEarningsCents))}${blk(16, "Reason for issuing", `${esc(r.reasonCode)} — ${esc(ROE_REASONS[r.reasonCode])}`)}${blk("17A", "Vacation pay", money(r.vacationPayCents))}</div>
      <div class="sect-l">Block 15C · insurable earnings by pay period (most recent first)</div>${table(["Pay period ending", "Pay run", ">Insurable hours", ">Insurable earnings"], r.earnings.map((x, i) => `<tr><td>${i + 1}. ${dLong(x.periodEnd)}</td><td class="mono">${esc(x.runNumber)}</td>${td(hrs(x.hours), 1)}${td(money(x.cents), 1)}</tr>`), "No posted pay in the last 53 weeks — the ROE shows nil earnings.")}
      ${r.comments ? `<div class="sect-l">Block 18 · comments</div><p>${esc(r.comments)}</p>` : ""}<p class="hint" style="margin-top:14px">Drafted by ${esc(r.createdByName)} · ${esc(dTime(r.createdAt))}${r.issuedAt ? ` · issued by ${esc(r.issuedByName)} · ${esc(dTime(r.issuedAt))}` : ""}</p></section>`;
}
EXPORTS.roe = (id) => {
  const r = byId(S.roes || [], id); if (!r) return null;
  const e = byId(S.employees, r.employeeId), c = co(r.companyId);
  const rows = [["Block", "Item", "Value"], ["5", "Employer payroll account", r.payrollAccount], ["", "Employer", c.legalName], ["6", "Pay period type", r.payFrequency], ["9", "Employee", `${empName(e)} (${e.employeeNumber})`], ["10", "First day worked", r.firstDay], ["11", "Last day for which paid", r.lastDay], ["12", "Final pay period ending", r.finalPeriodEnd], ["13", "Occupation", r.occupation || ""], ["14", "Expected date of recall", r.expectedRecall], ["15A", "Total insurable hours", String(r.insurableHours)], ["15B", "Total insurable earnings", (r.totalEarningsCents / 100).toFixed(2)], ["16", "Reason for issuing", `${r.reasonCode} — ${ROE_REASONS[r.reasonCode]}`], ["17A", "Vacation pay", (r.vacationPayCents / 100).toFixed(2)], ["18", "Comments", r.comments || ""], ["", "Status", r.status === "ISSUED" ? `Issued ${r.serial} by ${r.issuedByName} on ${(r.issuedAt || "").slice(0, 10)}` : "Draft"], ["15C", "Pay period ending · run · hours · earnings", ""]];
  r.earnings.forEach((x, i) => rows.push(["15C", `${i + 1}. ${x.periodEnd} · ${x.runNumber}`, `${x.hours} h · ${(x.cents / 100).toFixed(2)}`]));
  return { base: `haico-roe-${r.serial || "draft"}-${e.lastName.toLowerCase()}`, title: `Record of Employment — ${empName(e)}`, rows };
};
EXPORTS.roes = () => { const list = (S.roes || []).filter((r) => inView(S, A, r.companyId)); return { base: `haico-roes-${todayStr()}`, title: "Records of Employment", rows: [["Serial", "Employee", "Employee #", "Company", "First day", "Last day", "Reason", "Insurable hours", "Insurable earnings", "Vacation pay", "Status", "Issued by", "Issued on"], ...list.map((r) => { const e = byId(S.employees, r.employeeId); return [r.serial || "draft", empName(e), e.employeeNumber, co(r.companyId).displayName, r.firstDay, r.lastDay, `${r.reasonCode} — ${ROE_REASONS[r.reasonCode]}`, String(r.insurableHours), (r.totalEarningsCents / 100).toFixed(2), (r.vacationPayCents / 100).toFixed(2), r.status, r.issuedByName || "", (r.issuedAt || "").slice(0, 10)]; })] }; };

/* ==========================================================================
   Benefits — HR enrols directly; the person's own tab is read-only
   ========================================================================== */
function hr3BenForm(e) {
  const plans = S.benefitPlans.filter((p) => p.isActive !== false);
  const people = inScope(S.employees).filter((x) => hr2Active(x)).sort((a, b) => a.lastName.localeCompare(b.lastName));
  return `<form data-f="hr3BenSet" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="bqWho">Person</label><select class="in" id="bqWho" name="employeeId">${people.map((x) => opt(x.id, `${empName(x)} · ${co(x.companyId).displayName}`, x.id === e?.id)).join("")}</select></div>
    <div class="fld"><label for="bqPlan">Plan</label><select class="in" id="bqPlan" name="planId">${plans.map((p) => opt(p.id, `${p.name} · ${money(p.employeeCostCentsPerPay)} / pay`)).join("")}</select></div>
    <div class="fld"><label for="bqAct">What</label><select class="in" id="bqAct" name="action">${Object.entries(BEN_ACTIONS).map(([k, l]) => opt(k, l)).join("")}</select></div>
    <div class="fld"><label for="bqCov">Coverage</label><select class="in" id="bqCov" name="coverage">${Object.entries(BEN_COVERAGE).map(([k, [l, m]]) => opt(k, m > 1 ? `${l} (${m}× the cost)` : l)).join("")}</select></div>
    <div class="fld"><label for="bqFrom">Starts on</label><input class="in" type="date" id="bqFrom" name="effectiveDate" value="${hr2FirstOfNextMonth()}" required></div>
    <div class="fld" style="grid-column:1/-1"><label for="bqNote">Note</label><input class="in" id="bqNote" name="note" placeholder="optional — e.g. paper form received, new hire after probation"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:space-between"><span class="hint">Takes effect straight away; the person is told by email.</span><button class="btn pri">Save</button></div></form>`;
}
function vHr3Benefits() {
  const ids = scopeIds(S, A), t0 = todayStr();
  const people = S.employees.filter((e) => ids.includes(e.companyId) && hr2Active(e));
  const active = S.benefits.filter((b) => people.some((e) => e.id === b.employeeId) && (!b.endDate || b.endDate >= t0) && b.effectiveDate <= addDays(t0, 365)).map((b) => ({ b, p: byId(S.benefitPlans, b.planId), e: byId(S.employees, b.employeeId) })).filter((x) => x.p).sort((a, b) => a.e.lastName.localeCompare(b.e.lastName) || a.p.name.localeCompare(b.p.name));
  const enrolled = new Set(active.map((x) => x.e.id)).size;
  const employer = active.reduce((s, x) => s + benCost(x.b, x.p, "employer"), 0);
  const hist = (S.benefitChanges || []).filter((r) => ids.includes(r.companyId)).slice().reverse().slice(0, 25);
  const f = UI.filters.hr3ben || (UI.filters.hr3ben = {});
  const shown = f.plan ? active.filter((x) => x.p.id === f.plan) : active;
  const chips = [["", "All plans"], ...S.benefitPlans.map((p) => [p.id, p.name])].map(([k, l]) => `<button class="hchip ${(f.plan || "") === k ? "on" : ""}" data-a="hr2Chip" data-k="hr3ben" data-f="plan" data-v="${k}">${esc(l)} <span>${k ? active.filter((x) => x.p.id === k).length : active.length}</span></button>`).join("");
  return ph("Benefits enrolment", "HR enrols people in the group plans, changes their coverage or opts them out — it takes effect from the date chosen and the payroll deduction follows. Each person sees their own plans under My Profile › Benefits.") + flashHtml()
    + `<div class="stats">${stat("People enrolled", String(enrolled), `of ${people.length} on staff`)}${stat("Active enrolments", String(active.length), `${S.benefitPlans.filter((p) => p.isActive !== false).length} plans offered`)}${stat("Employer cost per pay", money(employer), "across active enrolments", "good")}${stat("Changes recorded", String((S.benefitChanges || []).filter((r) => ids.includes(r.companyId)).length), "this session")}</div>`
    + `<div class="grid" style="grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:14px;align-items:start"><div style="display:grid;gap:14px">${card("Enrol or change someone", hr3BenForm(null))}${cardFlush("Enrolment by plan", table(["Plan", ">People", ">Employee / pay", ">Employer / pay"], S.benefitPlans.filter((p) => p.isActive !== false).map((p) => { const xs = active.filter((x) => x.p.id === p.id); return `<tr><td>${BEN_ICON[p.category] || ""} <strong>${esc(p.name)}</strong></td>${td(String(xs.length), 1)}${td(money(xs.reduce((s, x) => s + benCost(x.b, x.p, "employee"), 0)), 1)}${td(money(xs.reduce((s, x) => s + benCost(x.b, x.p, "employer"), 0)), 1)}</tr>`; })))}</div>
      <div style="display:grid;gap:14px">${cardFlush(`Who's enrolled <span class="hint">${active.length}</span>`, `<div class="hr2chips" style="padding:0 16px 10px">${chips}</div>` + table(["Person", "Plan", "Coverage", "Since", ">Employee / employer per pay", ""], shown.map(({ b, p, e }) => `<tr><td><strong>${esc(empName(e))}</strong><div class="hint">${esc(co(e.companyId).displayName)}</div></td><td>${BEN_ICON[p.category] || ""} ${esc(p.name)}</td><td>${esc((BEN_COVERAGE[b.coverage || "EMPLOYEE"] || BEN_COVERAGE.EMPLOYEE)[0])}</td><td>${dLong(b.effectiveDate)}${b.effectiveDate > t0 ? ` <span class="badge tone-blue">Starts</span>` : ""}${b.endDate ? `<div class="hint">ends ${esc(dLong(b.endDate))}</div>` : ""}</td>${td(`${money(benCost(b, p, "employee"))} <span class="hint">/ ${money(benCost(b, p, "employer"))}</span>`, 1)}<td class="r">${b.endDate ? "" : `<button class="btn sm" data-a="hr3BenEndOpen" data-id="${b.id}">End…</button>`}</td></tr>`), "Nobody enrolled in this plan."))}
      ${cardFlush("History", table(["When", "Person", "Change", "By"], hist.map((r) => `<tr><td>${dLong(r.at.slice(0, 10))}</td><td>${esc(empName(byId(S.employees, r.employeeId)))}</td><td>${esc(benLabel(r))}${r.note ? `<div class="hint">“${esc(r.note)}”</div>` : ""}</td><td>${esc(r.byName)}</td></tr>`), "No changes recorded yet — enrol someone with the form."))}</div></div>`;
}
function hr3BenEndForm(b) {
  const e = byId(S.employees, b.employeeId), p = byId(S.benefitPlans, b.planId);
  return `<h3 style="margin:0 0 4px">End ${esc(p.name)} for ${esc(empName(e))}</h3><p class="hint" style="margin:0 0 12px">Covered since ${esc(dLong(b.effectiveDate))} · ${esc((BEN_COVERAGE[b.coverage || "EMPLOYEE"] || BEN_COVERAGE.EMPLOYEE)[0])}. The payroll deduction stops after the last day of coverage and the person is told.</p><form data-f="hr3BenEnd" data-id="${b.id}" class="form-grid"><div class="fld"><label for="beEnd">Last day of coverage</label><input class="in" type="date" id="beEnd" name="endDate" value="${addDays(hr2FirstOfNextMonth(), -1)}" required></div><div class="fld"><label for="beNote">Note <span class="hint" style="font-weight:400">— optional</span></label><input class="in" id="beNote" name="note" placeholder="e.g. covered under spouse's plan"></div><div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">End coverage</button></div></form>`;
}
function vHr3MeBenefits() {
  const base = vBenefits();
  const e = A.employee;
  if (!e) return base;
  const hist = (S.benefitChanges || []).filter((r) => r.employeeId === e.id).slice().reverse();
  const past = S.benefits.filter((b) => b.employeeId === e.id && b.endDate && b.endDate < todayStr()).map((b) => ({ b, p: byId(S.benefitPlans, b.planId) })).filter((x) => x.p);
  return base + `<div class="grid g2" style="margin-top:14px;align-items:start">${card("Changes to your benefits", hist.length ? hist.map((r) => `<div class="hr3row"><div class="grow"><div>${esc(benLabel(r))}</div><div class="hint">Recorded by ${esc(r.byName)} · ${esc(dTime(r.at))}${r.note ? ` — “${esc(r.note)}”` : ""}</div></div></div>`).join("") : empty("No changes recorded", "HR enrols you and changes your coverage — ask them if something needs to change."))}${past.length ? cardFlush("Past coverage", table(["Plan", "From", "To"], past.map(({ b, p }) => `<tr><td>${esc(p.name)}</td><td>${dLong(b.effectiveDate)}</td><td>${dLong(b.endDate)}</td></tr>`))) : ""}</div>`;
}

/* ==========================================================================
   Time off — HR: requests, balances per person, adjustments
   ========================================================================== */
function hr3AdjustForm(empId) {
  const people = inScope(S.employees).filter((e) => hr2Active(e)).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const types = S.leaveTypes.filter((t) => t.isActive !== false);
  return `<h3 style="margin:0 0 4px">Adjust a time-off balance</h3><p class="hint" style="margin:0 0 12px">Adds to (or takes from) the person's entitlement for the year. The person is told, and the reason shows in their history.</p><form data-f="hr3Adjust" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="laWho">Person</label><select class="in" id="laWho" name="employeeId">${people.map((x) => opt(x.id, `${empName(x)} · ${co(x.companyId).displayName}`, x.id === empId)).join("")}</select></div><div class="fld"><label for="laType">Type of leave</label><select class="in" id="laType" name="leaveTypeId">${types.map((t) => opt(t.id, t.name)).join("")}</select></div><div class="fld"><label for="laHrs">Hours (negative to take away)</label><input class="in num" id="laHrs" name="hours" inputmode="decimal" required placeholder="e.g. 8 or -4"></div><div class="fld" style="grid-column:1/-1"><label for="laWhy">Reason</label><input class="in" id="laWhy" name="reason" required placeholder="e.g. Carry-over from 2025 agreed; worked the stat holiday"></div><input type="hidden" name="year" value="${todayStr().slice(0, 4)}"><div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Save adjustment</button></div></form>`;
}
function vHr3Leave() {
  const view = UI.tabs.hr3leave || "requests";
  const all = inScope(S.leaveRequests);
  const waiting = all.filter((r) => r.status === "PENDING_APPROVAL");
  const today = todayStr();
  const away = all.filter((r) => r.status === "APPROVED" && r.startDate <= today && r.endDate >= today);
  const manage = can(A, "leave.manage");
  let body;
  if (view === "balances") {
    const people = inScope(S.employees).filter((e) => hr2Active(e)).sort((a, b) => a.companyId.localeCompare(b.companyId) || a.lastName.localeCompare(b.lastName));
    const types = S.leaveTypes.filter((t) => t.isActive !== false && t.code !== "OTHER");
    const cell = (b) => (b.has ? `<strong>${hrs(b.avail)}</strong><div class="hint">${hrs(b.used)} used of ${hrs(b.ent)}</div>` : `<span class="hint">—</span>`);
    const adj = (S.leaveAdjustments || []).filter((a) => scopeIds(S, A).includes(a.companyId)).slice().reverse().slice(0, 20);
    body = cardFlush("", `<div class="tw"><table class="t" id="hr3BalT"><thead><tr><th>Person</th>${types.map((t) => `<th class="r">${esc(t.name)}</th>`).join("")}${manage ? '<th class="r"></th>' : ""}</tr></thead><tbody>${people.map((e) => { const bal = leaveBalances(e.id); return `<tr><td><strong>${esc(empName(e))}</strong><div class="hint">${coTag(e.companyId)} ${esc(byId(S.departments, e.departmentId)?.name || "")}</div></td>${types.map((t) => `<td class="r num">${cell(bal.find((b) => b.lt.id === t.id) || { has: false })}</td>`).join("")}${manage ? `<td class="r"><button class="btn sm" data-a="hr3AdjustOpen" data-id="${e.id}">Adjust</button></td>` : ""}</tr>`; }).join("")}</tbody></table></div>`)
      + `<p class="hint">Hours left for ${today.slice(0, 4)}: entitlement plus carry-over, less what's been taken. Requests still waiting for approval are not deducted yet.</p>`
      + cardFlush("Recent adjustments", table(["When", "Person", "Type", ">Hours", "Reason", "By"], adj.map((a) => `<tr><td>${dLong(a.at.slice(0, 10))}</td><td>${esc(empName(byId(S.employees, a.employeeId)))}</td><td>${esc(byId(S.leaveTypes, a.leaveTypeId)?.name)}</td>${td(`${a.hours > 0 ? "+" : ""}${hrs(a.hours)}`, 1)}<td>${esc(a.reason)}</td><td>${esc(a.byName)}</td></tr>`), manage ? "No adjustments yet — use Adjust on any row." : "No adjustments yet."));
  } else {
    const cur = UI.tabs.leave || "PENDING_APPROVAL";
    const list = (cur === "ALL" ? all : all.filter((r) => r.status === cur)).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    body = `<div class="hr2chips">${[["PENDING_APPROVAL", "Waiting", waiting.length], ["APPROVED", "Approved", all.filter((r) => r.status === "APPROVED").length], ["REJECTED", "Not approved", all.filter((r) => r.status === "REJECTED").length], ["ALL", "All", all.length]].map(([k, l, n]) => `<button class="hchip ${cur === k ? "on" : ""}" data-a="tab" data-k="leave" data-v="${k}">${l} <span>${n}</span></button>`).join("")}</div>`
      + cardFlush("", table(["Person", "Type", "Dates", ">Hours", "Status", "Waiting on / decided by"], list.map((r) => { const e = byId(S.employees, r.employeeId); return `<tr><td><strong>${esc(empName(e))}</strong><div class="hint">${coTag(e.companyId)}</div></td><td>${esc(byId(S.leaveTypes, r.leaveTypeId)?.name)}</td><td>${dLong(r.startDate)}${r.endDate !== r.startDate ? ` → ${dLong(r.endDate)}` : ""}${r.notes ? `<div class="hint">“${esc(r.notes)}”</div>` : ""}${fileChips("LeaveRequest", r.id)}</td>${td(hrs(r.totalHours), 1)}<td>${badge(r.status)}</td><td>${esc(r.decidedByName || (r.status === "PENDING_APPROVAL" ? "Waiting for " + whoIsNext(S, byId(S.approvals, r.approvalInstanceId) || {}) : "—"))}</td></tr>`; }), "No requests here."));
  }
  return ph("Time Off", "Every request in scope and everyone's balances. Approvals happen in Approvals, following each person's reporting line; HR can adjust a balance here.") + flashHtml()
    + `<div class="stats">${stat("Waiting for approval", String(waiting.length), waiting.length ? `${hrs(waiting.reduce((s, r) => s + r.totalHours, 0))} h asked for` : "nothing waiting", waiting.length ? "warn" : "")}${stat("Away today", String(away.length), away.length ? away.map((r) => empName(byId(S.employees, r.employeeId)).split(" ")[0]).join(", ") : "everyone's in")}${stat("Approved this year", `${hrs(all.filter((r) => r.status === "APPROVED" && r.startDate.startsWith(today.slice(0, 4))).reduce((s, r) => s + r.totalHours, 0))} h`)}${stat("Balance adjustments", String((S.leaveAdjustments || []).filter((a) => scopeIds(S, A).includes(a.companyId)).length), "recorded by HR")}</div>`
    + hr3Tabs("hr3leave", [["requests", "Requests", all.length], ["balances", "Balances", null]], view) + body;
}

/* ==========================================================================
   Hiring — new opening (form page) sent to the hiring manager for approval
   ========================================================================== */
function vHr3NewOpening() {
  const cos = S.companies.filter((c) => scopeIds(S, A).includes(c.id));
  const cid = cos.some((c) => c.id === UI.filters.hr2newCo) ? UI.filters.hr2newCo : cos[0]?.id;
  const deps = S.departments.filter((d) => d.companyId === cid);
  const depSel = deps.some((d) => d.id === UI.filters.hr3newDep) ? UI.filters.hr3newDep : deps[0]?.id;
  const dep = byId(S.departments, depSel);
  const mgrs = S.employees.filter((x) => (x.companyId === cid || x.companyId === "HAICO") && hr2Active(x) && x.id !== A.employee?.id).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const defMgr = dep?.managerId && dep.managerId !== A.employee?.id ? dep.managerId : "";
  return ph("New opening", "Fill in the opening and send it to the hiring manager — the department's manager — for approval. It appears in their Approvals; once approved the posting goes live and takes applicants.", "", crumb("/hr/hiring", "Hiring")) + flashHtml()
    + card("", `<form data-f="hr3Opening" class="form-grid"><div class="fld"><label for="jpCo">Company</label><select class="in" id="jpCo" name="companyId" data-a="hr2NewCo">${cos.map((c) => opt(c.id, c.displayName, c.id === cid)).join("")}</select></div><div class="fld"><label for="jpD">Department</label><select class="in" id="jpD" name="departmentId" required data-a="hr3NewDep">${deps.map((d) => opt(d.id, `${d.code} — ${d.name}`, d.id === depSel)).join("")}</select></div>
    <div class="fld" style="grid-column:1/-1"><label for="jpT">Title</label><input class="in" id="jpT" name="title" required placeholder="e.g. Seasonal Deckhand"></div>
    <div class="fld"><label for="jpM">Hiring manager (approves the opening)</label><select class="in" id="jpM" name="hiringManagerId">${mgrs.map((x) => opt(x.id, `${empName(x)} · ${byId(S.positions, x.positionId)?.title || ""}`, x.id === defMgr)).join("")}</select></div><div class="fld"><label for="jpO">Headcount</label><input class="in num" type="number" min="1" id="jpO" name="openings" value="1"></div>
    <div class="fld"><label for="jpE">Employment</label><select class="in" id="jpE" name="employmentType">${Object.entries(EMPLOYMENT).map(([k, l]) => opt(k, l)).join("")}</select></div><div class="fld"><label for="jpStart">Target start date</label><input class="in" type="date" id="jpStart" name="startDate" value="${addDays(todayStr(), 45)}"></div>
    <div class="fld"><label for="jpS1">Salary range from ($)</label><input class="in num" id="jpS1" name="salaryMin" inputmode="decimal" placeholder="hourly or yearly"></div><div class="fld"><label for="jpS2">Salary range to ($)</label><input class="in num" id="jpS2" name="salaryMax" inputmode="decimal"></div>
    <div class="fld"><label for="jpWhy">Reason for hire</label><select class="in" id="jpWhy" name="reason">${["New position", "Replacement", "Seasonal", "Backfill for leave", "Growth"].map((r) => opt(r, r)).join("")}</select></div><div class="fld"><label for="jpL">Location</label><input class="in" id="jpL" name="locationText" placeholder="e.g. Masset"></div>
    <div class="fld" style="grid-column:1/-1"><label for="jpDesc">Description</label><textarea class="in" id="jpDesc" name="description" rows="3" placeholder="What the job is and what you're looking for"></textarea></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:space-between"><span class="hint">${dep?.managerId ? `${esc(empName(byId(S.employees, dep.managerId)))} manages ${esc(dep.name)}.` : ""}</span><span class="form-row"><button class="btn" data-x="DRAFT">Save as draft</button><button class="btn pri" data-x="SUBMIT">Send for approval</button></span></div></form>`);
}

/* ==========================================================================
   Certificates — HR view (files for HR Manager only, reminders) and My profile
   ========================================================================== */
function hr3CertRow(c, { showPerson = true, manage = false, own = false, hr = false } = {}) {
  const e = byId(S.employees, c.employeeId), st = hr2CertStatus(c.expiryDate), files = certCurrentFiles(c);
  const fileCell = files.length ? files.map((f) => `<button type="button" class="lnk" style="font-size:12px" data-a="openFile" data-id="${f.id}">📎 ${esc(f.fileName)}</button>`).join("<br>") : `<span class="hint">no file</span>`;
  const acts = `${manage || own ? `<button class="btn sm ${st === "EXPIRED" || st === "EXPIRING" ? "pri" : ""}" data-a="hr3CertRenew" data-id="${c.id}">Renew…</button>` : ""}${manage && hr2Active(e) ? `<button class="btn sm" data-a="hr3CertRemind" data-id="${c.id}">Send reminder</button>` : ""}${manage ? `<button class="lnk" style="color:var(--t-red);font-size:12px" data-a="hr2CertRemove" data-id="${c.id}">remove</button>` : ""}`;
  return `<tr><td>${showPerson ? `<strong>${esc(empName(e))}</strong><div class="hint">${coTag(e.companyId)} ${esc(byId(S.departments, e.departmentId)?.name || "")}</div>` : `<strong>${esc(c.name)}</strong><div class="hint">${esc(CERT_KINDS[c.kind] || "")}${c.issuer ? ` · ${esc(c.issuer)}` : ""}${c.number ? ` · <span class="mono">${esc(c.number)}</span>` : ""}</div>`}</td>${showPerson ? `<td><strong>${esc(c.name)}</strong><div class="hint">${esc(CERT_KINDS[c.kind] || "")}${c.issuer ? ` · ${esc(c.issuer)}` : ""}${c.number ? ` · <span class="mono">${esc(c.number)}</span>` : ""}</div></td>` : ""}<td>${c.issuedDate ? dLong(c.issuedDate) : "—"}</td><td>${c.expiryDate ? `${dLong(c.expiryDate)}<div class="hint">${esc(dueWord(c.expiryDate))}</div>` : `<span class="hint">no expiry</span>`}</td><td>${hr2Badge(HR2_CERT_STATUS, st)}</td>${manage || own ? `<td>${fileCell}</td>` : ""}<td>${certHistoryHtml(c) || `<span class="hint">—</span>`}</td>${manage || own ? `<td class="r"><div class="form-row" style="justify-content:flex-end;gap:4px;flex-wrap:nowrap">${acts}</div></td>` : ""}</tr>`;
}
function hr3CertForm(e, byHr) {
  const people = byHr ? inScope(S.employees).filter((x) => hr2Active(x)).sort((a, b) => a.lastName.localeCompare(b.lastName)) : [];
  UI.files.certNew = [];
  return `<h3 style="margin:0 0 10px">Add a ticket, licence or training</h3><form data-f="hr3CertAdd" class="form-grid">${byHr ? `<div class="fld" style="grid-column:1/-1"><label for="ctWho">Person</label><select class="in" id="ctWho" name="employeeId">${people.map((x) => opt(x.id, `${empName(x)} · ${co(x.companyId).displayName}`, x.id === e?.id)).join("")}</select></div>` : `<input type="hidden" name="employeeId" value="${e.id}">`}
    <div class="fld" style="grid-column:1/-1"><label for="ctName">Name</label><input class="in" id="ctName" name="name" required placeholder="e.g. Occupational First Aid Level 1" list="certNames"><datalist id="certNames">${["Occupational First Aid Level 1", "Occupational First Aid Level 3", "Faller Certification", "Forklift Operator", "Fall Protection", "FoodSafe Level 1", "HACCP Fundamentals", "Pesticide Applicator Licence", "Class 5 driver's licence", "WHMIS", "Chainsaw Safety", "Boat Operator Card"].map((n) => `<option value="${esc(n)}">`).join("")}</datalist></div>
    <div class="fld"><label for="ctKind">Kind</label><select class="in" id="ctKind" name="kind">${Object.entries(CERT_KINDS).map(([k, l]) => opt(k, l, k === "CERTIFICATION")).join("")}</select></div><div class="fld"><label for="ctIss">Issued by</label><input class="in" id="ctIss" name="issuer" placeholder="e.g. WorkSafeBC"></div>
    <div class="fld"><label for="ctFrom">Issued on</label><input class="in" type="date" id="ctFrom" name="issuedDate" value="${todayStr()}" required></div><div class="fld"><label for="ctTo">Expires on <span class="hint" style="font-weight:400">— blank if never</span></label><input class="in" type="date" id="ctTo" name="expiryDate"></div>
    <div class="fld"><label for="ctNum">Certificate number</label><input class="in" id="ctNum" name="number" placeholder="optional"></div><div class="fld"><label for="ctR">Remind (days before expiry)</label><input class="in num" type="number" min="0" id="ctR" name="reminderDays" value="60"></div>
    ${hr3FileDrop("certNew", "Photo or PDF of the certificate", byHr ? "PDF, JPG or PNG — kept on the record; only HR sees it" : "PDF, JPG or PNG — HR keeps it on your record", !byHr)}
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Add certificate</button></div></form>`;
}
function hr3CertRenewForm(c) {
  const e = byId(S.employees, c.employeeId), own = A.employee?.id === e.id;
  UI.files.certRenew = [];
  return `<h3 style="margin:0 0 4px">Renew ${esc(c.name)}</h3><p class="hint" style="margin:0 0 12px">${esc(empName(e))} · ${c.expiryDate ? `currently expires ${esc(dLong(c.expiryDate))}` : "no expiry on file"}. The old certificate stays on file as history.</p><form data-f="hr3CertRenew" data-id="${c.id}" class="form-grid"><div class="fld"><label for="crFrom">Renewed on</label><input class="in" type="date" id="crFrom" name="issuedDate" value="${todayStr()}"></div><div class="fld"><label for="crTo">New expiry date</label><input class="in" type="date" id="crTo" name="expiryDate" value="${c.expiryDate ? addDays(c.expiryDate, 365 * 3 + 1) : addDays(todayStr(), 365 * 3)}" required></div><div class="fld" style="grid-column:1/-1"><label for="crNum">Certificate number</label><input class="in" id="crNum" name="number" value="${esc(c.number || "")}" placeholder="optional"></div>${hr3FileDrop("certRenew", "New certificate", "PDF, JPG or PNG", own)}<div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Save renewal</button></div></form>`;
}
function hr3CertRemindForm(c) {
  const e = byId(S.employees, c.employeeId), st = hr2CertStatus(c.expiryDate);
  const last = (c.history || []).filter((h) => h.kind === "REMINDED").slice(-1)[0];
  return `<h3 style="margin:0 0 4px">Remind ${esc(empName(e))}</h3><p class="hint" style="margin:0 0 12px">Sends an email and a notification asking them to renew <strong>${esc(c.name)}</strong> (${c.expiryDate ? `${st === "EXPIRED" ? "expired" : "expires"} ${esc(dLong(c.expiryDate))}` : "no expiry on file"}) and attach the new certificate.${last ? ` Last reminded by ${esc(last.by)} on ${esc(dLong(last.at.slice(0, 10)))}.` : ""}</p><form data-f="hr3CertRemind" data-id="${c.id}" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="crmNote">Add a line <span class="hint" style="font-weight:400">— optional</span></label><input class="in" id="crmNote" name="note" placeholder="e.g. The renewal course runs 14 October in Masset."></div><div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Send reminder</button></div></form>`;
}
function vHr3Certs() {
  const manage = can(A, "hr.employees.edit");
  const all = hr2CertRows();
  const cur = UI.tabs.hr3cert || "";
  const ord = { EXPIRED: 0, EXPIRING: 1, CURRENT: 2, NO_EXPIRY: 3 };
  const list = (cur ? all.filter((x) => x.st === cur) : all).sort((a, b) => ord[a.st] - ord[b.st] || ((a.c.expiryDate || "9999") < (b.c.expiryDate || "9999") ? -1 : 1));
  const n = (s) => all.filter((x) => x.st === s).length;
  const reminded = all.filter((x) => (x.c.history || []).some((h) => h.kind === "REMINDED")).length;
  return ph("Training & certificates", `Tickets, licences and training on file for each person${manage ? ", with the certificate itself" : ""}. Anything expired or expiring within 60 days is flagged here and on Home${manage ? "; send the person a reminder from the row" : ""}.`, `${dlButton("certifications", "Download", { variant: "outline" })}${manage ? `<button class="btn pri" data-a="hr3CertNew">Add a certificate</button>` : ""}`) + flashHtml()
    + `<div class="stats">${stat("Expired", String(n("EXPIRED")), n("EXPIRED") ? "renew before the next shift" : "none", n("EXPIRED") ? "warn" : "good")}${stat("Expiring within 60 days", String(n("EXPIRING")), n("EXPIRING") ? "book the renewal" : "none", n("EXPIRING") ? "warn" : "")}${stat("Current", String(n("CURRENT") + n("NO_EXPIRY")), `${n("NO_EXPIRY")} with no expiry`)}${stat("Reminders sent", String(reminded), `${all.length} on file · ${new Set(all.map((x) => x.e.id)).size} people`)}</div>`
    + `<div class="form-row" style="justify-content:space-between;margin-bottom:12px"><div class="hr2chips" style="margin:0">${[["", "All", all.length], ["EXPIRED", "Expired", n("EXPIRED")], ["EXPIRING", "Expiring soon", n("EXPIRING")], ["CURRENT", "Current", n("CURRENT")], ["NO_EXPIRY", "No expiry", n("NO_EXPIRY")]].map(([k, l, c]) => `<button class="hchip ${cur === k ? "on" : ""}" data-a="tab" data-k="hr3cert" data-v="${k}">${l} <span>${c}</span></button>`).join("")}</div><input class="in" data-filter="certT" placeholder="Find a person, certificate or issuer" aria-label="Find a certificate" style="max-width:300px;border-radius:999px"></div>`
    + cardFlush("", list.length ? `<div class="tw"><table class="t" id="certT"><thead><tr><th>Person</th><th>Certificate</th><th>Issued</th><th>Expires</th><th>Status</th>${manage ? "<th>File</th>" : ""}<th>Reminders &amp; renewals</th>${manage ? "<th></th>" : ""}</tr></thead><tbody>${list.map(({ c }) => hr3CertRow(c, { manage, hr: true })).join("")}</tbody></table></div>` : empty("Nothing here", cur ? "Try another filter." : "Add the first certificate with the button above."))
    + (manage ? "" : `<p class="hint">The certificate files themselves are visible to the HR Manager only.</p>`);
}
function vHr3MeCerts() {
  const head = bigTitle("My certificates", "Your tickets, licences and training on file. Add anything that's missing — attach the certificate itself — and renew it here when it's time.");
  const e = A.employee;
  if (!e) return head + card("", empty("This account isn't linked to an employee"));
  const list = (S.certifications || []).filter((c) => c.employeeId === e.id).sort((a, b) => ((a.expiryDate || "9999") < (b.expiryDate || "9999") ? -1 : 1));
  const expired = list.filter((c) => hr2CertStatus(c.expiryDate) === "EXPIRED"), expiring = list.filter((c) => hr2CertStatus(c.expiryDate) === "EXPIRING");
  return head + flashHtml()
    + (expired.length || expiring.length ? `<div class="msg warn">${expired.length ? `${expired.length} certificate${expired.length === 1 ? " has" : "s have"} expired: ${esc(expired.map((c) => c.name).join(", "))}. ` : ""}${expiring.length ? `Expiring soon: ${esc(expiring.map((c) => `${c.name} (${dLong(c.expiryDate)})`).join(", "))}. ` : ""}Renew it and attach the new certificate — HR is told.</div>` : "")
    + cardFlush(`Your tickets, licences and training <span class="hint">${list.length}</span>`, list.length ? `<div class="tw"><table class="t"><thead><tr><th>Certificate</th><th>Issued</th><th>Expires</th><th>Status</th><th>File</th><th>History</th><th></th></tr></thead><tbody>${list.map((c) => hr3CertRow(c, { showPerson: false, own: true })).join("")}</tbody></table></div>` : empty("Nothing on file yet", "Add your tickets so HR gets a reminder before they expire."), `<button class="btn sm pri" data-a="hr3CertNew" data-emp="${e.id}">Add a certificate</button>`);
}
EXPORTS.certifications = () => { const rows = hr2CertRows().sort((a, b) => ((a.c.expiryDate || "9999") < (b.c.expiryDate || "9999") ? -1 : 1)); const hr = can(A, "hr.employees.edit"); return { base: `haico-certificates-${todayStr()}`, title: "Training & certificates", rows: [["Company", "Employee #", "Person", "Department", "Certificate", "Kind", "Issued by", "Number", "Issued", "Expires", "Days left", "Status", "Last reminded", ...(hr ? ["Files"] : [])], ...rows.map(({ c, e, st }) => [co(e.companyId).displayName, e.employeeNumber, empName(e), byId(S.departments, e.departmentId)?.name || "", c.name, CERT_KINDS[c.kind] || c.kind, c.issuer || "", c.number || "", c.issuedDate || "", c.expiryDate || "", c.expiryDate ? String(hr2DaysUntil(c.expiryDate)) : "", HR2_CERT_STATUS[st][0], c.lastRemindedAt ? `${c.lastRemindedAt.slice(0, 10)} by ${c.lastRemindedBy}` : "", ...(hr ? [certCurrentFiles(c).map((f) => f.fileName).join("; ")] : [])])] }; };

/* ==========================================================================
   Routes, forms, actions
   ========================================================================== */
hr3Route("/hr/employees", "hr.employees.view", vHr3Employees);
hr3Route("/hr/employees/:id", "hr.employees.view", vHr3Employee);
hr3Route("/hr/employees/new", "hr.employees.create", vNewEmployee);
hr3Route("/payroll/roe/:id", () => can(A, "payroll.view") || can(A, "hr.employees.edit"), vHr3Roe);
hr3Route("/payroll/roe", () => can(A, "payroll.view") || can(A, "hr.employees.edit"), vHr3Roes);
hr3Route("/hr/benefits", "hr.employees.edit", vHr3Benefits);
hr3Route("/me/profile/benefits", null, vHr3MeBenefits);
hr3Route("/hr/leave", "leave.view", vHr3Leave);
hr3Route("/hr/hiring/:id", "hr.employees.edit", vHr2Posting);
hr3Route("/hr/hiring/new", "hr.employees.edit", vHr3NewOpening);
hr3Route("/hr/certifications", "hr.employees.view", vHr3Certs);
hr3Route("/me/certifications", null, vHr3MeCerts);

window.FORMS_EXT.push({
  hr3Terminate(f) { const d = fd(f); const e = byId(S.employees, f.dataset.id); if (act("employee.terminate", { employeeId: e.id, lastDay: d.lastDay, reasonCode: d.reasonCode, vacationPayCents: toCents(d.vacation) || 0, recall: d.recall, notes: d.notes })) { UI.flash = { kind: "ok", text: `${empName(e)}'s employment ended — the Record of Employment is drafted for Payroll to issue.` }; toast("Employment ended", `${empName(e)} · last day ${dLong(d.lastDay)} · ROE drafted`, "ok"); UI.tabs.hr3emp = "overview"; safeRender(); } },
  hr3BenSet(f) { const d = fd(f); const e = byId(S.employees, d.employeeId), plan = byId(S.benefitPlans, d.planId); act("benefit.enroll", { employeeId: d.employeeId, planId: d.planId, action: d.action, coverage: d.coverage, effectiveDate: d.effectiveDate, note: d.note }, `Saved — ${empName(e)}: ${(BEN_ACTIONS[d.action] || "").toLowerCase()} ${plan?.name || ""} from ${dLong(d.effectiveDate)}. They've been told.`); },
  hr3BenEnd(f) { const d = fd(f); const b = byId(S.benefits, f.dataset.id); if (act("benefit.end", { id: f.dataset.id, endDate: d.endDate, note: d.note }, `${b ? empName(byId(S.employees, b.employeeId)) : "Their"} ${byId(S.benefitPlans, b?.planId)?.name || "coverage"} ends ${dLong(d.endDate)}.`)) { UI.modal = null; safeRender(); } },
  hr3Adjust(f) { const d = fd(f); const e = byId(S.employees, d.employeeId), lt = byId(S.leaveTypes, d.leaveTypeId); if (act("leave.adjust", { employeeId: d.employeeId, leaveTypeId: d.leaveTypeId, hours: Number(d.hours), reason: d.reason, year: d.year }, `${empName(e)}'s ${lt?.name || ""} balance adjusted by ${Number(d.hours) > 0 ? "+" : ""}${hrs(Number(d.hours))} h.`)) { UI.modal = null; safeRender(); } },
  hr3ReviewAck(f) { const d = fd(f); act("review.ack", { id: f.dataset.id, comment: d.comment }, "Acknowledged — thank you. Your manager and HR can see it."); },
  hr3Opening(f, ev) { const d = fd(f); const submit = ev.submitter?.dataset.x === "SUBMIT"; const before = S.jobPostings.length; if (act("job.create", { companyId: d.companyId, departmentId: d.departmentId, title: d.title, hiringManagerId: d.hiringManagerId, openings: Number(d.openings) || 1, employmentType: d.employmentType, startDate: d.startDate, salaryMinCents: toCents(d.salaryMin) || null, salaryMaxCents: toCents(d.salaryMax) || null, reason: d.reason, locationText: d.locationText, description: d.description, submit })) { const j = S.jobPostings[before]; go(`/hr/hiring/${j.id}`); UI.flash = { kind: "ok", text: submit ? `Opening “${d.title}” sent to ${j.approvalInstanceId ? byId(S.approvals, j.approvalInstanceId)?.approverName : "the hiring manager"} for approval — it goes live once approved.` : `Opening “${d.title}” saved as a draft — send it for approval when it's ready.` }; safeRender(); } },
  hr3CertAdd(f) { const d = fd(f); const files = UI.files.certNew || []; if (!files.length && A.employee?.id === d.employeeId) { toast("Not added", "Attach the certificate (PDF or photo) first — it's required.", "err"); return; } if (act("cert.add", { employeeId: d.employeeId, name: d.name, kind: d.kind, issuer: d.issuer, number: d.number, issuedDate: d.issuedDate, expiryDate: d.expiryDate, reminderDays: d.reminderDays, files }, `Added “${d.name}”${d.expiryDate ? ` — expires ${dLong(d.expiryDate)}` : ""}${files.length ? ` · ${files.length} file${files.length === 1 ? "" : "s"} attached` : ""}.`)) { takeFiles("certNew"); UI.modal = null; safeRender(); } },
  hr3CertRenew(f) { const d = fd(f); const c = byId(S.certifications || [], f.dataset.id); const files = UI.files.certRenew || []; if (!files.length && A.employee?.id === c?.employeeId) { toast("Not renewed", "Attach the renewed certificate (PDF or photo) first — it's required.", "err"); return; } if (act("cert.renew", { id: f.dataset.id, expiryDate: d.expiryDate, issuedDate: d.issuedDate, number: d.number, files }, `“${c?.name || "Certificate"}” renewed — now expires ${dLong(d.expiryDate)}. The old certificate is kept as history.`)) { takeFiles("certRenew"); UI.modal = null; safeRender(); } },
  hr3CertRemind(f) { const d = fd(f); const c = byId(S.certifications || [], f.dataset.id); const e = c && byId(S.employees, c.employeeId); if (act("cert.remind", { id: f.dataset.id, note: d.note }, `Reminder sent to ${e ? empName(e) : "the person"} (bell + email) — recorded on the certificate.`)) { UI.modal = null; safeRender(); } },
});
window.ACTIONS_EXT.push({
  hr3RoeIssue(el) { const r = byId(S.roes || [], el.dataset.id); act("roe.issue", { id: el.dataset.id }, `ROE issued for ${r ? empName(byId(S.employees, r.employeeId)) : "the employee"} — file it through ROE Web.`); },
  hr3BenEndOpen(el) { const b = byId(S.benefits, el.dataset.id); if (b) { UI.modal = hr3BenEndForm(b); safeRender(); } },
  hr3AdjustOpen(el) { UI.modal = hr3AdjustForm(el.dataset.id); safeRender(); },
  hr3NewDep(el) { UI.filters.hr3newDep = el.value; safeRender(); },
  hr3CertNew(el) { UI.modal = hr3CertForm(el.dataset.emp ? byId(S.employees, el.dataset.emp) : null, can(A, "hr.employees.edit") && el.dataset.emp !== A.employee?.id); safeRender(); },
  hr3CertRenew(el) { const c = byId(S.certifications || [], el.dataset.id); if (c) { UI.modal = hr3CertRenewForm(c); safeRender(); } },
  hr3CertRemind(el) { const c = byId(S.certifications || [], el.dataset.id); if (c) { UI.modal = hr3CertRemindForm(c); safeRender(); } },
  hr3JobSubmit(el) { const j = byId(S.jobPostings, el.dataset.id); if (act("job.submit", { id: el.dataset.id })) { const inst = byId(S.approvals, byId(S.jobPostings, el.dataset.id)?.approvalInstanceId); UI.flash = { kind: "ok", text: `“${j?.title}” sent to ${inst?.approverName || "the hiring manager"} for approval.` }; safeRender(); } },
});

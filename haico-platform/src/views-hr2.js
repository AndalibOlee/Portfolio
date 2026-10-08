/* ==========================================================================
   views-hr2.js — HR depth: benefits enrolment requests & HR decisions,
   performance review cycles, hiring pipeline (postings + applicant board,
   hire → employee record), training & certifications with expiry tracking,
   and CRA source-deduction remittances (PD7A). Mirrors hr/benefits, hr/reviews,
   hr/hiring, hr/certifications, me/*, payroll/remittances and src/lib/hr-*.ts
   in the live app.
   ========================================================================== */
injectCss(`
.hr2stars{color:#c98500;letter-spacing:1px;font-size:13px;white-space:nowrap}.hr2stars .off{color:var(--border)}
.hr2chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}
.hr2goal{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--border);font-size:13.5px}.hr2goal:first-child{border-top:0}
.hr2goal .ttl{flex:1;min-width:0}
.hr2goal select.in{height:30px;font-size:12px;width:auto}
.hr2rate{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);background:var(--card);border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer}
.hr2rate:has(:checked){background:var(--t-green-bg);border-color:var(--t-green);font-weight:600}
.hr2rate input{margin:0}
.hr2board{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:12px;margin-bottom:12px}
.hr2col{border:1px solid var(--border);background:var(--card);border-radius:16px;padding:12px;min-height:140px}
.hr2col.off{background:color-mix(in srgb,var(--muted) 40%,transparent)}
.hr2col .och b{display:flex;justify-content:space-between;align-items:center}
.hr2col .och .cnt{font-family:var(--mono);font-size:11.5px;color:var(--muted-fg);font-weight:600;background:var(--muted);border-radius:999px;padding:1px 8px;margin:0;vertical-align:0}
.hr2card{border:1px solid var(--border);background:var(--bg);border-radius:12px;padding:9px 10px;margin-bottom:8px;font-size:12.5px}
.hr2card .nm{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:13.5px;font-weight:600}
.hr2card small{display:block;color:var(--muted-fg);font-size:11.5px;margin-top:2px}
.hr2card p{margin:6px 0 0;font-size:12.5px;color:var(--fg)}
.hr2card .mv{display:flex;gap:6px;margin-top:8px}.hr2card .mv select{flex:1;min-width:0;height:30px;font-size:12px}
.hr2card details{margin-top:6px}.hr2card summary{cursor:pointer;font-size:11.5px;font-weight:600;color:var(--muted-fg);user-select:none}
.hr2card details .in{height:30px;font-size:12px}.hr2card details textarea.in{height:auto;min-height:52px}
.hr2card .hire{border-top:1px dashed var(--border);margin-top:8px;padding-top:8px}
.hr2pd{border:2px solid #c4dae0;border-radius:16px;padding:16px 18px;margin-bottom:14px;background:var(--card)}
.hr2pd h3{margin:0 0 10px;font-size:15px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.hr2dl{display:grid;grid-template-columns:1fr auto;gap:6px 16px;font-size:13px;margin:0}
.hr2dl dt{color:var(--muted-fg)}.hr2dl dd{margin:0;font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right}
.hr2dl .tot{border-top:1px solid var(--border);padding-top:6px;font-weight:700}.hr2dl dd.tot{font-size:15px}
.hr2box{border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:color-mix(in srgb,var(--t-amber-bg) 40%,transparent)}
.hr2req{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--border);font-size:13px}.hr2req:first-child{border-top:0}
.hr2req .grow{flex:1;min-width:0}
.hr2req form.row{margin-top:8px}
.hr2bar{display:inline-block;width:90px;height:6px;border-radius:99px;background:var(--muted);overflow:hidden;vertical-align:middle;margin-left:6px}.hr2bar i{display:block;height:100%;background:var(--t-green)}
`);

/* ---------------- labels ---------------- */
const HR2_COVERAGE = { EMPLOYEE: "Employee only", EMPLOYEE_PLUS_ONE: "Employee + 1", FAMILY: "Family" };
const HR2_ACTION = { ENROL: "Enrol", CHANGE: "Change coverage", WAIVE: "Waive (opt out)" };
const HR2_ENROL_STATUS = { REQUESTED: ["Waiting for HR", "amber"], APPROVED: ["Approved", "green"], DECLINED: ["Declined", "red"], CANCELLED: ["Withdrawn", "grey"] };
const HR2_REVIEW_STATUS = { SELF_REVIEW: ["Self-review", "amber"], MANAGER_REVIEW: ["Manager review", "blue"], COMPLETED: ["Completed", "green"] };
const HR2_GOAL = { ON_TRACK: ["On track", "teal"], AT_RISK: ["At risk", "amber"], DONE: ["Done", "green"] };
const HR2_STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
const HR2_STAGE = { APPLIED: "Applied", SCREENING: "Screening", INTERVIEW: "Interview", OFFER: "Offer", HIRED: "Hired", REJECTED: "Not selected" };
const HR2_POSTING = { DRAFT: ["Draft", "grey"], OPEN: ["Open", "teal"], ON_HOLD: ["On hold", "amber"], FILLED: ["Filled", "green"], CLOSED: ["Closed", "ink"] };
const HR2_KIND = { CERTIFICATION: "Certification", TRAINING: "Training", LICENCE: "Licence" };
const HR2_CERT_STATUS = { EXPIRED: ["Expired", "red"], EXPIRING: ["Expiring soon", "amber"], CURRENT: ["Current", "green"], NO_EXPIRY: ["No expiry", "grey"] };
const HR2_REMIT_STATUS = { DUE: ["Due", "amber"], PAID: ["Paid", "green"] };
const HR2_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ---------------- small helpers ---------------- */
const hr2Badge = (map, k) => { const m = map[k] || [k, "grey"]; return `<span class="badge tone-${m[1]}">${esc(m[0])}</span>`; };
const hr2Stars = (n) => (n ? `<span class="hr2stars" title="${n} of 5" aria-label="${n} of 5 stars">${"★".repeat(n)}<span class="off">${"★".repeat(5 - n)}</span></span>` : `<span class="hint">not rated</span>`);
const hr2Emp = (id) => byId(S.employees, id);
const hr2Name = (id) => empName(hr2Emp(id));
const hr2ListEmp = () => scopeIds(S, A);
const hr2Active = (e) => e && !["TERMINATED", "INACTIVE"].includes(e.status);
const hr2MonthLabel = (ymdStr) => { const [y, m] = String(ymdStr).split("-").map(Number); return `${HR2_MONTHS[m - 1]} ${y}`; };
function hr2FirstOfNextMonth(from = todayStr()) { const [y, m] = from.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1, 2)}-01`; }
function hr2PrevMonth(from = todayStr()) { const [y, m] = from.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1, 2)}`; }
const hr2Lines = (text) => esc(text || "").replace(/\n/g, "<br>");
/** the employee's active enrolment in a plan as of a date (latest first) */
function hr2ActiveBenefit(S, employeeId, planId, asOf) {
  return S.benefits.filter((b) => b.employeeId === employeeId && b.planId === planId && (!b.endDate || b.endDate >= asOf)).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0] || null;
}
function hr2HrFor(auth, companyId) { return can(auth, "hr.employees.edit") && canSee(auth, companyId); }
/** days until a date (negative when already past) */
const hr2DaysUntil = (d) => Math.round((D(d) - D(todayStr())) / MS_DAY);
function hr2CertStatus(expiryDate, windowDays = 60) {
  if (!expiryDate) return "NO_EXPIRY";
  const n = hr2DaysUntil(expiryDate);
  if (n < 0) return "EXPIRED";
  if (n <= windowDays) return "EXPIRING";
  return "CURRENT";
}
/** certifications already expired or expiring within `days`, for the companies in view — soonest first (Home tile) */
function hr2ExpiringCerts(days = 60) {
  const ids = scopeIds(S, A);
  return (S.certifications || []).map((c) => ({ c, e: hr2Emp(c.employeeId) })).filter(({ c, e }) => e && ids.includes(e.companyId) && hr2Active(e) && c.expiryDate && hr2DaysUntil(c.expiryDate) <= days)
    .sort((a, b) => (a.c.expiryDate < b.c.expiryDate ? -1 : 1))
    .map(({ c, e }) => ({ id: c.id, name: c.name, kind: c.kind, issuer: c.issuer, expiryDate: c.expiryDate, daysLeft: hr2DaysUntil(c.expiryDate), status: hr2CertStatus(c.expiryDate, days), employeeId: e.id, person: empName(e), company: co(e.companyId)?.displayName, colorTag: co(e.companyId)?.colorTag }));
}
/* ---- who may see / edit a review (same rules as hr-reviews.ts) ---- */
const hr2IsSubject = (r, auth = A) => !!auth.employee && auth.employee.id === r.employeeId;
const hr2IsReviewer = (r, auth = A) => !!auth.employee && !!r.reviewerId && auth.employee.id === r.reviewerId;
const hr2IsHr = (r, auth = A) => { const e = hr2Emp(r.employeeId); return can(auth, "hr.employees.edit") && (!e || canSee(auth, e.companyId)); };
function hr2CanSeeReview(r, auth = A) {
  if (!auth) return false;
  if (hr2IsSubject(r, auth) || hr2IsReviewer(r, auth)) return true;
  const e = hr2Emp(r.employeeId);
  return can(auth, "hr.employees.view") && (!e || canSee(auth, e.companyId));
}
const hr2CanSelf = (r, auth = A) => (hr2IsSubject(r, auth) && r.status === "SELF_REVIEW") || hr2IsHr(r, auth);
const hr2CanManager = (r, auth = A) => (hr2IsReviewer(r, auth) && r.status === "MANAGER_REVIEW") || hr2IsHr(r, auth);
const hr2Overdue = (r) => r.status !== "COMPLETED" && r.dueDate < todayStr();

/* ---- PD7A maths (same as hr-remittance.ts): posted runs paid in the month ---- */
function hr2MonthBounds(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { periodStart: `${year}-${pad(month, 2)}-01`, periodEnd: `${year}-${pad(month, 2)}-${pad(last, 2)}`, dueDate: month === 12 ? `${year + 1}-01-15` : `${year}-${pad(month + 1, 2)}-15` };
}
function hr2Remit(S, companyId, year, month) {
  const b = hr2MonthBounds(year, month);
  const runs = S.payrollRuns.filter((r) => r.companyId === companyId && r.status === "POSTED" && r.payDate >= b.periodStart && r.payDate <= b.periodEnd).sort((a, c) => (a.payDate < c.payDate ? -1 : 1));
  if (!runs.length) return null;
  const t = { cppEmployeeCents: 0, cppEmployerCents: 0, eiEmployeeCents: 0, eiEmployerCents: 0, taxCents: 0, grossPayCents: 0 };
  const people = new Set();
  for (const r of runs) for (const e of S.payrollEntries.filter((x) => x.payrollRunId === r.id)) {
    people.add(e.employeeId);
    for (const l of S.payrollLines.filter((x) => x.payrollEntryId === e.id)) {
      if (l.kind === "EARNING") t.grossPayCents += l.amountCents;
      else if (l.kind === "DEDUCTION" && l.typeCode === "CPP") t.cppEmployeeCents += l.amountCents;
      else if (l.kind === "EMPLOYER_COST" && l.typeCode === "CPP") t.cppEmployerCents += l.amountCents;
      else if (l.kind === "DEDUCTION" && l.typeCode === "EI") t.eiEmployeeCents += l.amountCents;
      else if (l.kind === "EMPLOYER_COST" && l.typeCode === "EI") t.eiEmployerCents += l.amountCents;
      else if (l.kind === "DEDUCTION" && /TAX/.test(l.typeCode || "")) t.taxCents += l.amountCents;
    }
  }
  return { ...b, ...t, totalCents: t.cppEmployeeCents + t.cppEmployerCents + t.eiEmployeeCents + t.eiEmployerCents + t.taxCents, employeeCount: people.size, runIds: runs.map((r) => r.id), runNumbers: runs.map((r) => r.runNumber) };
}

/* ---- new employee from a hire (same steps as the employee.create reducer) ---- */
function hr2CreateEmployee(S, ctx, p) {
  const prefix = { HAICO: "EMP-3", TAAN: "EMP-2", TOUR: "EMP-1", SEAF: "EMP-4" }[p.companyId] || "EMP-9";
  let max = 0;
  for (const e of S.employees) if (e.employeeNumber.startsWith(prefix)) max = Math.max(max, parseInt(e.employeeNumber.slice(4), 10) || 0);
  const employeeNumber = `EMP-${(max || Number(prefix.slice(4) + "000")) + 1}`;
  const rate = Number(p.rateCents) || 0;
  const hourly = rate > 0 && rate < 50000;
  const group = S.payGroups.find((g) => g.companyId === p.companyId && g.code.endsWith(hourly ? "-HR" : "-SAL")) || S.payGroups.find((g) => g.companyId === p.companyId);
  const e = { id: ctx.id("e"), companyId: p.companyId, employeeNumber, firstName: p.firstName, lastName: p.lastName, workEmail: `${p.firstName}.${p.lastName}@demo.example`.toLowerCase().replace(/[^a-z0-9.@]/g, ""), personalEmail: p.personalEmail || undefined, phone: p.phone || undefined, departmentId: p.departmentId, managerId: p.managerId || undefined, employmentType: p.employmentType || "FULL_TIME", startDate: p.startDate, status: "ONBOARDING", avatarColor: byId(S.companies, p.companyId).colorTag, province: "BC" };
  S.employees.push(e);
  if (rate > 0) S.compensations.push({ id: ctx.id("cmp"), employeeId: e.id, payType: hourly ? "HOURLY" : "SALARY", hourlyRateCents: hourly ? rate : undefined, annualSalaryCents: hourly ? undefined : rate, effectiveDate: p.startDate, payFrequency: "BIWEEKLY", changeReason: "Hired" });
  S.payProfiles.push({ id: ctx.id("pp"), employeeId: e.id, provinceOfEmployment: "BC", payGroupId: group?.id, directDepositActive: false, cppExempt: false, eiExempt: false, additionalTaxCents: 0 });
  for (const lt of S.leaveTypes) if (lt.defaultAnnualHours > 0) S.leaveBalances.push({ id: ctx.id("lb"), employeeId: e.id, leaveTypeId: lt.id, year: 2026, entitledHours: lt.defaultAnnualHours, carriedOverHours: 0, usedHours: 0 });
  const tasks = [["Signed employment agreement returned", "HR", 3], ["TD1 federal & BC forms collected", "PAYROLL", 4], ["Direct deposit details entered", "PAYROLL", 5], ["Site orientation & safety walkthrough", "MANAGER", 6]];
  tasks.forEach(([title, role, d], i) => S.onboardingTasks.push({ id: ctx.id("ob"), employeeId: e.id, category: "ONBOARDING", title, assigneeRole: role, dueDate: addDays(p.startDate, d), status: "PENDING", sortOrder: i }));
  ctx.notifyPerm("payroll.admin", p.companyId, { type: "SYSTEM", title: `New hire: ${p.firstName} ${p.lastName}`, body: `${employeeNumber} · starts ${dLong(p.startDate)} — TD1 and direct deposit needed`, linkUrl: "/hr/onboarding" }, ctx.actor.id);
  return e;
}

/* ==========================================================================
   Reducers
   ========================================================================== */
Object.assign(R, {
  /* ---- benefits ---- */
  "benefit.request"(S, p, ctx) {
    const emp = ctx.auth.employee;
    if (!emp) fail("This account isn't linked to an employee record.");
    S.benefitEnrollments = S.benefitEnrollments || [];
    if (!HR2_ACTION[p.action]) fail("Choose what you'd like to do: enrol, change, or waive.");
    if (!HR2_COVERAGE[p.coverage]) fail("Choose who the coverage is for.");
    if (!p.effectiveDate) fail("Pick the date the change should take effect.");
    const plan = S.benefitPlans.find((x) => x.id === p.planId && x.isActive !== false && (!x.companyId || x.companyId === emp.companyId));
    if (!plan) fail("That plan isn't offered to you.");
    const active = hr2ActiveBenefit(S, emp.id, plan.id, ctx.now.slice(0, 10));
    if (p.action === "ENROL" && active) fail(`You're already enrolled in ${plan.name} — choose "Change coverage" instead.`);
    if (p.action !== "ENROL" && !active) fail(`You're not enrolled in ${plan.name} yet — choose "Enrol" instead.`);
    if (S.benefitEnrollments.some((b) => b.employeeId === emp.id && b.planId === plan.id && b.status === "REQUESTED")) fail(`You already have a request waiting for ${plan.name}. HR will get to it soon.`);
    const row = { id: ctx.id("be"), employeeId: emp.id, planId: plan.id, action: p.action, coverage: p.coverage, effectiveDate: p.effectiveDate, status: "REQUESTED", notes: (p.notes || "").trim() || undefined, createdAt: ctx.now };
    S.benefitEnrollments.push(row);
    ctx.notifyPerm("hr.employees.edit", emp.companyId, { type: "APPROVAL_REQUIRED", title: `Benefits request: ${empName(emp)} — ${HR2_ACTION[p.action].toLowerCase()} ${plan.name}`, body: `${HR2_COVERAGE[p.coverage]} · from ${dLong(p.effectiveDate)}`, linkUrl: "/hr/benefits" }, ctx.actor.id);
    ctx.audit({ module: "hr", action: "SUBMIT", companyId: emp.companyId, entityType: "BenefitEnrollment", entityId: row.id, summary: `${empName(emp)} asked to ${HR2_ACTION[p.action].toLowerCase()} ${plan.name} (${HR2_COVERAGE[p.coverage]}) from ${p.effectiveDate}.` });
  },
  "benefit.withdraw"(S, p, ctx) {
    const row = byId(S.benefitEnrollments || [], p.id);
    if (!row || row.employeeId !== ctx.auth.employee?.id) fail("That request isn't yours.");
    if (row.status !== "REQUESTED") fail("HR has already decided this one, so it can't be withdrawn.");
    row.status = "CANCELLED";
    const plan = byId(S.benefitPlans, row.planId);
    ctx.audit({ module: "hr", action: "STATUS_CHANGE", companyId: ctx.auth.employee.companyId, entityType: "BenefitEnrollment", entityId: row.id, summary: `${ctx.actor.displayName} withdrew their ${plan?.name || "benefit"} request.` });
  },
  "benefit.decide"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const row = byId(S.benefitEnrollments || [], p.id);
    if (!row) fail("That request no longer exists.");
    const emp = hr2Emp(row.employeeId), plan = byId(S.benefitPlans, row.planId);
    ctx.company(emp.companyId);
    if (row.status !== "REQUESTED") fail("That request has already been decided.");
    const person = empName(emp);
    if (p.decision === "DECLINED") {
      const reason = (p.reason || "").trim();
      if (!reason) fail("Give the person a short reason so they know what to do next.");
      Object.assign(row, { status: "DECLINED", decidedByName: ctx.actor.displayName, decidedAt: ctx.now, decisionNote: reason });
      ctx.notify(userOfEmployee(S, emp.id)?.id, { type: "REJECTED", title: `Benefits request declined: ${plan.name}`, body: reason, linkUrl: "/me/profile/benefits" });
      ctx.audit({ module: "hr", action: "REJECT", companyId: emp.companyId, entityType: "BenefitEnrollment", entityId: row.id, summary: `${ctx.actor.displayName} declined ${person}'s ${plan.name} request: ${reason}` });
      return;
    }
    const active = hr2ActiveBenefit(S, emp.id, plan.id, row.effectiveDate);
    const dayBefore = addDays(row.effectiveDate, -1);
    if (row.action === "WAIVE") {
      if (!active) fail(`${person} isn't enrolled in ${plan.name}, so there's nothing to waive. Decline the request instead.`);
      active.endDate = dayBefore;
    } else {
      if (row.action === "ENROL" && active) fail(`${person} is already enrolled in ${plan.name} from ${active.effectiveDate}.`);
      if (row.action === "CHANGE") {
        if (!active) fail(`${person} isn't enrolled in ${plan.name} yet — this should be an Enrol request.`);
        if (active.effectiveDate === row.effectiveDate) S.benefits.splice(S.benefits.indexOf(active), 1); else active.endDate = dayBefore;
      }
      S.benefits.push({ id: ctx.id("ben"), employeeId: emp.id, planId: plan.id, effectiveDate: row.effectiveDate, coverage: row.coverage });
    }
    Object.assign(row, { status: "APPROVED", decidedByName: ctx.actor.displayName, decidedAt: ctx.now, decisionNote: undefined });
    ctx.notify(userOfEmployee(S, emp.id)?.id, { type: "APPROVED", title: `Benefits request approved: ${plan.name}`, body: `${row.action === "WAIVE" ? "Coverage ends" : "Coverage starts"} ${dLong(row.effectiveDate)}`, linkUrl: "/me/profile/benefits" });
    ctx.audit({ module: "hr", action: "APPROVE", companyId: emp.companyId, entityType: "BenefitEnrollment", entityId: row.id, summary: `${ctx.actor.displayName} approved ${person}'s request to ${HR2_ACTION[row.action].toLowerCase()} ${plan.name} (${HR2_COVERAGE[row.coverage] || row.coverage}) from ${row.effectiveDate}.` });
  },

  /* ---- performance reviews ---- */
  "review.cycle"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const cycle = (p.cycle || "").trim();
    if (!cycle) fail("Give the cycle a name, e.g. “2026 Year-end”.");
    if (!p.dueDate) fail("Pick a due date for the cycle.");
    if (p.companyId) ctx.company(p.companyId);
    const people = S.employees.filter((e) => e.status === "ACTIVE" && e.managerId && (p.companyId ? e.companyId === p.companyId : canSee(ctx.auth, e.companyId)));
    const skip = new Set(S.reviews.filter((r) => r.cycle === cycle).map((r) => r.employeeId));
    const todo = people.filter((e) => !skip.has(e.id));
    if (!todo.length) fail(skip.size ? `Everyone eligible already has a “${cycle}” review.` : "No active employees with a manager in that company — nothing to start.");
    for (const e of todo) {
      S.reviews.push({ id: ctx.id("rv"), employeeId: e.id, reviewerId: e.managerId, cycle, dueDate: p.dueDate, status: "SELF_REVIEW", goals: [], createdAt: ctx.now });
      ctx.notify(userOfEmployee(S, e.id)?.id, { type: "SYSTEM", title: `Your ${cycle} review has started`, body: `Write your self-review by ${dLong(p.dueDate)}.`, linkUrl: "/me/reviews" });
    }
    const skipped = people.length - todo.length;
    ctx.audit({ module: "hr", action: "CREATE", companyId: p.companyId || null, entityType: "PerformanceReview", summary: `${ctx.actor.displayName} started the “${cycle}” review cycle for ${todo.length} ${todo.length === 1 ? "person" : "people"} (due ${p.dueDate})${skipped ? `, skipping ${skipped} already in it` : ""}.` });
  },
  "review.self"(S, p, ctx) {
    const r = byId(S.reviews, p.id);
    if (!r) fail("That review no longer exists.");
    if (!hr2CanSeeReview(r, ctx.auth)) fail("You don't have access to that review.");
    if (!hr2CanSelf(r, ctx.auth)) fail(r.status === "SELF_REVIEW" ? "Only the person being reviewed can write this part." : "The self-review part is locked now that it's with the manager.");
    const sum = (p.selfSummary || "").trim();
    if (p.submit && r.status !== "SELF_REVIEW") fail("This review has already gone to the manager.");
    if (p.submit && !sum) fail("Write a short self-summary before sending it to your manager.");
    r.goals = (r.goals || []).map((g, i) => ({ title: g.title, status: HR2_GOAL[p.goalStatuses?.[i]] ? p.goalStatuses[i] : g.status }));
    r.selfSummary = sum || undefined;
    const e = hr2Emp(r.employeeId);
    if (p.submit) {
      r.status = "MANAGER_REVIEW";
      ctx.notify(userOfEmployee(S, r.reviewerId)?.id, { type: "APPROVAL_REQUIRED", title: `Review to complete: ${empName(e)} — ${r.cycle}`, body: `Self-review submitted · due ${dLong(r.dueDate)}`, linkUrl: `/hr/reviews/${r.id}` });
    }
    ctx.audit({ module: "hr", action: p.submit ? "SUBMIT" : "UPDATE", companyId: e.companyId, entityType: "PerformanceReview", entityId: r.id, summary: p.submit ? `${ctx.actor.displayName} submitted the ${r.cycle} self-review for ${empName(e)} to ${r.reviewerId ? hr2Name(r.reviewerId) : "the reviewer"}.` : `${ctx.actor.displayName} saved the ${r.cycle} self-review for ${empName(e)}.` });
  },
  "review.manager"(S, p, ctx) {
    const r = byId(S.reviews, p.id);
    if (!r) fail("That review no longer exists.");
    if (!hr2CanSeeReview(r, ctx.auth)) fail("You don't have access to that review.");
    if (!hr2CanManager(r, ctx.auth)) fail(r.status === "SELF_REVIEW" ? "Wait for the self-review first — the manager part opens once it's submitted." : r.status === "COMPLETED" ? "This review is completed and locked." : "Only the reviewer can write this part.");
    const sum = (p.managerSummary || "").trim();
    const rating = Number(p.rating) >= 1 && Number(p.rating) <= 5 ? Math.round(Number(p.rating)) : undefined;
    if (p.complete && r.status === "COMPLETED") fail("This review is already completed.");
    if (p.complete && (!sum || !rating)) fail("Add a manager summary and a rating from 1 to 5 before completing the review.");
    r.managerSummary = sum || undefined; r.rating = rating;
    const e = hr2Emp(r.employeeId);
    if (p.complete) {
      r.status = "COMPLETED"; r.completedAt = ctx.now;
      ctx.notify(userOfEmployee(S, e.id)?.id, { type: "SYSTEM", title: `Your ${r.cycle} review is complete`, body: `Rating ${rating}/5 — open it to read your manager's summary.`, linkUrl: "/me/reviews" });
    }
    ctx.audit({ module: "hr", action: p.complete ? "APPROVE" : "UPDATE", companyId: e.companyId, entityType: "PerformanceReview", entityId: r.id, summary: p.complete ? `${ctx.actor.displayName} completed the ${r.cycle} review for ${empName(e)} — rating ${rating}/5.` : `${ctx.actor.displayName} saved the manager part of the ${r.cycle} review for ${empName(e)}.` });
  },
  "review.goal.add"(S, p, ctx) {
    const r = byId(S.reviews, p.id);
    if (!r) fail("That review no longer exists.");
    if (!hr2CanSeeReview(r, ctx.auth)) fail("You don't have access to that review.");
    const ok = hr2IsHr(r, ctx.auth) || (hr2IsSubject(r, ctx.auth) && r.status === "SELF_REVIEW") || (hr2IsReviewer(r, ctx.auth) && r.status !== "COMPLETED");
    if (!ok) fail("Goals can't be added at this stage.");
    const title = (p.title || "").trim();
    if (!title) fail("Type the goal first.");
    r.goals = r.goals || [];
    if (r.goals.length >= 12) fail("Twelve goals is plenty — finish some before adding more.");
    r.goals.push({ title, status: "ON_TRACK" });
    const e = hr2Emp(r.employeeId);
    ctx.audit({ module: "hr", action: "UPDATE", companyId: e.companyId, entityType: "PerformanceReview", entityId: r.id, summary: `${ctx.actor.displayName} added the goal “${title}” to ${empName(e)}'s ${r.cycle} review.` });
  },
  "review.hr"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const r = byId(S.reviews, p.id);
    if (!r) fail("That review no longer exists.");
    const e = hr2Emp(r.employeeId);
    ctx.company(e.companyId);
    if (!HR2_REVIEW_STATUS[p.status]) fail("Unknown status.");
    if (!p.dueDate) fail("Pick a due date.");
    if (p.reviewerId) {
      const rev = hr2Emp(p.reviewerId);
      if (!rev || !canSee(ctx.auth, rev.companyId)) fail("That reviewer isn't available.");
      if (p.reviewerId === r.employeeId) fail("Someone can't review themselves.");
    }
    if (p.status === "COMPLETED" && (!r.rating || !r.managerSummary)) fail("A completed review needs a manager summary and a rating — fill those in first.");
    r.reviewerId = p.reviewerId || undefined; r.dueDate = p.dueDate; r.status = p.status;
    r.completedAt = p.status === "COMPLETED" ? (r.completedAt || ctx.now) : undefined;
    ctx.audit({ module: "hr", action: "UPDATE", companyId: e.companyId, entityType: "PerformanceReview", entityId: r.id, summary: `${ctx.actor.displayName} updated ${empName(e)}'s ${r.cycle} review (${HR2_REVIEW_STATUS[p.status][0].toLowerCase()}, due ${p.dueDate}).` });
  },

  /* ---- hiring ---- */
  "job.create"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const title = (p.title || "").trim();
    if (!p.companyId || !title) fail("A posting needs a company and a job title.");
    ctx.company(p.companyId);
    const dep = p.departmentId ? byId(S.departments, p.departmentId) : null;
    if (p.departmentId && (!dep || dep.companyId !== p.companyId)) fail("That department belongs to a different company.");
    if (p.hiringManagerId && !hr2Emp(p.hiringManagerId)) fail("Pick a hiring manager from the list.");
    const openings = Math.max(1, Math.round(Number(p.openings) || 1));
    const status = p.status === "DRAFT" ? "DRAFT" : "OPEN";
    const row = { id: ctx.id("jp"), companyId: p.companyId, title, departmentId: dep?.id || undefined, hiringManagerId: p.hiringManagerId || undefined, openings, locationText: (p.locationText || "").trim() || undefined, employmentType: p.employmentType || "FULL_TIME", salaryMinCents: p.salaryMinCents || undefined, salaryMaxCents: p.salaryMaxCents || undefined, description: (p.description || "").trim() || undefined, status, postedAt: status === "OPEN" ? ctx.now : undefined, createdAt: ctx.now };
    S.jobPostings.push(row);
    ctx.audit({ module: "hr", action: "CREATE", companyId: p.companyId, entityType: "JobPosting", entityId: row.id, summary: `${ctx.actor.displayName} created the posting “${title}” (${openings} opening${openings === 1 ? "" : "s"}, ${status.toLowerCase()}).` });
  },
  "job.status"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const j = byId(S.jobPostings, p.id);
    if (!j) fail("That posting no longer exists.");
    ctx.company(j.companyId);
    if (!HR2_POSTING[p.status]) fail("Unknown status.");
    if (j.status === p.status) fail(`The posting is already ${HR2_POSTING[p.status][0].toLowerCase()}.`);
    if (j.status === "PENDING_APPROVAL") fail("This opening is with the hiring manager — wait for their decision.");
    if (p.status === "OPEN" && !j.approvedAt && !j.postedAt) fail("An opening has to be approved by the hiring manager before it goes live — use “Send for approval”.");
    if (p.status === "FILLED" && !S.applicants.some((a) => a.jobPostingId === j.id && a.stage === "HIRED")) fail("Mark at least one applicant as hired before filling the posting.");
    j.status = p.status;
    if (p.status === "OPEN" && !j.postedAt) j.postedAt = ctx.now;
    j.closedAt = p.status === "CLOSED" || p.status === "FILLED" ? ctx.now : undefined;
    ctx.audit({ module: "hr", action: "STATUS_CHANGE", companyId: j.companyId, entityType: "JobPosting", entityId: j.id, summary: `${ctx.actor.displayName} set the posting “${j.title}” to ${HR2_POSTING[p.status][0].toLowerCase()}.` });
  },
  "applicant.add"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const j = byId(S.jobPostings, p.postingId);
    if (!j) fail("That posting no longer exists.");
    ctx.company(j.companyId);
    const name = (p.name || "").trim();
    if (!name) fail("The applicant needs a name.");
    if (j.status === "CLOSED" || j.status === "FILLED") fail("This posting is closed — reopen it to add applicants.");
    const rating = Number(p.rating) >= 1 && Number(p.rating) <= 5 ? Math.round(Number(p.rating)) : undefined;
    const appliedAt = p.appliedAt ? `${p.appliedAt}T12:00:00.000Z` : ctx.now;
    const a = { id: ctx.id("apc"), jobPostingId: j.id, name, email: (p.email || "").trim() || undefined, phone: (p.phone || "").trim() || undefined, source: (p.source || "").trim() || undefined, rating, notes: (p.notes || "").trim() || undefined, appliedAt, stageChangedAt: appliedAt, stage: "APPLIED" };
    S.applicants.push(a);
    ctx.audit({ module: "hr", action: "CREATE", companyId: j.companyId, entityType: "Applicant", entityId: a.id, summary: `${ctx.actor.displayName} added applicant ${name} to “${j.title}”${a.source ? ` (via ${a.source})` : ""}.` });
  },
  "applicant.move"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const a = byId(S.applicants, p.id);
    if (!a) fail("That applicant no longer exists.");
    const j = byId(S.jobPostings, a.jobPostingId);
    ctx.company(j.companyId);
    if (!HR2_STAGES.includes(p.stage)) fail("Unknown stage.");
    if (a.stage === p.stage) fail(`${a.name} is already in ${HR2_STAGE[p.stage]}.`);
    if (a.stage === "HIRED" && a.hiredEmployeeId) fail(`${a.name} already has an employee record — change it from Employee records instead.`);
    if (p.stage === "HIRED") fail(`Use “Mark hired” on ${a.name}'s card — it creates their employee record at the same time.`);
    if (j.status !== "OPEN" && p.stage !== "REJECTED") fail("The posting isn't open — reopen it to move applicants forward.");
    const from = a.stage;
    a.stage = p.stage; a.stageChangedAt = ctx.now;
    ctx.audit({ module: "hr", action: "STATUS_CHANGE", companyId: j.companyId, entityType: "Applicant", entityId: a.id, summary: `${ctx.actor.displayName} moved ${a.name} from ${HR2_STAGE[from] || from} to ${HR2_STAGE[p.stage]} on “${j.title}”.` });
  },
  "applicant.note"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const a = byId(S.applicants, p.id);
    if (!a) fail("That applicant no longer exists.");
    const j = byId(S.jobPostings, a.jobPostingId);
    ctx.company(j.companyId);
    a.rating = Number(p.rating) >= 1 && Number(p.rating) <= 5 ? Math.round(Number(p.rating)) : undefined;
    a.notes = (p.notes || "").trim() || undefined;
    ctx.audit({ module: "hr", action: "UPDATE", companyId: j.companyId, entityType: "Applicant", entityId: a.id, summary: `${ctx.actor.displayName} updated notes/rating for ${a.name} on “${j.title}”${a.rating ? ` (rating ${a.rating}/5)` : ""}.` });
  },
  "applicant.hire"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const a = byId(S.applicants, p.id);
    if (!a) fail("That applicant no longer exists.");
    const j = byId(S.jobPostings, a.jobPostingId);
    ctx.company(j.companyId);
    if (a.hiredEmployeeId) fail(`${a.name} already has an employee record.`);
    if (j.status !== "OPEN") fail("The posting isn't open — reopen it before hiring.");
    const hiredSoFar = S.applicants.filter((x) => x.jobPostingId === j.id && x.stage === "HIRED").length;
    if (hiredSoFar >= j.openings) fail(`All ${j.openings} opening${j.openings === 1 ? " is" : "s are"} already filled — add an opening first.`);
    if (!j.departmentId) fail("Give the posting a department first — the new employee record needs one.");
    const startDate = p.startDate || ctx.now.slice(0, 10);
    const parts = a.name.trim().split(/\s+/);
    const firstName = parts[0], lastName = parts.slice(1).join(" ") || "—";
    const e = hr2CreateEmployee(S, ctx, { companyId: j.companyId, firstName, lastName, personalEmail: a.email, phone: a.phone, departmentId: j.departmentId, managerId: j.hiringManagerId, employmentType: j.employmentType, startDate, rateCents: j.salaryMinCents });
    a.stage = "HIRED"; a.stageChangedAt = ctx.now; a.hiredEmployeeId = e.id;
    const filled = hiredSoFar + 1 >= j.openings;
    if (filled) { j.status = "FILLED"; j.closedAt = ctx.now; }
    ctx.audit({ module: "hr", action: "CREATE", companyId: j.companyId, entityType: "Employee", entityId: e.id, summary: `${ctx.actor.displayName} hired ${a.name} for “${j.title}” — employee ${e.employeeNumber} created, onboarding started${filled ? "; posting filled" : ""}.` });
  },

  /* ---- certifications ---- */
  "cert.add"(S, p, ctx) {
    const emp = hr2Emp(p.employeeId);
    const name = (p.name || "").trim();
    if (!emp || !name) fail("Pick the person and type the certification name.");
    if (!can(ctx.auth, "hr.employees.edit")) { if (ctx.auth.employee?.id !== emp.id) fail("You can only add certifications to your own file."); } else ctx.company(emp.companyId);
    if (p.issuedDate && p.expiryDate && p.expiryDate < p.issuedDate) fail("The expiry date can't be before the issue date.");
    const kind = HR2_KIND[p.kind] ? p.kind : "CERTIFICATION";
    S.certifications = S.certifications || [];
    const row = { id: ctx.id("cert"), employeeId: emp.id, name, kind, issuer: (p.issuer || "").trim() || undefined, issuedDate: p.issuedDate || undefined, expiryDate: p.expiryDate || undefined, reminderDays: Math.max(0, Math.round(Number(p.reminderDays) || 60)), notes: (p.notes || "").trim() || undefined, createdAt: ctx.now };
    S.certifications.push(row);
    ctx.audit({ module: "hr", action: "CREATE", companyId: emp.companyId, entityType: "Certification", entityId: row.id, summary: `${ctx.actor.displayName} recorded ${HR2_KIND[kind].toLowerCase()} “${name}” for ${empName(emp)}${row.expiryDate ? `, expires ${row.expiryDate}` : ""}.` });
  },
  "cert.renew"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const c = byId(S.certifications || [], p.id);
    if (!c) fail("That certification no longer exists.");
    const emp = hr2Emp(c.employeeId);
    ctx.company(emp.companyId);
    if (!p.expiryDate) fail("Pick the new expiry date.");
    if (c.expiryDate && p.expiryDate <= c.expiryDate) fail("The new expiry date has to be after the current one.");
    const note = `Renewed ${ctx.now.slice(0, 10)} (was ${c.expiryDate || "no expiry"}).`;
    c.notes = c.notes ? `${c.notes}\n${note}` : note;
    c.expiryDate = p.expiryDate; c.issuedDate = p.issuedDate || ctx.now.slice(0, 10);
    ctx.audit({ module: "hr", action: "UPDATE", companyId: emp.companyId, entityType: "Certification", entityId: c.id, summary: `${ctx.actor.displayName} renewed “${c.name}” for ${empName(emp)} — now expires ${p.expiryDate}.` });
  },
  "cert.remove"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const c = byId(S.certifications || [], p.id);
    if (!c) fail("That certification no longer exists.");
    const emp = hr2Emp(c.employeeId);
    ctx.company(emp.companyId);
    S.certifications.splice(S.certifications.indexOf(c), 1);
    ctx.audit({ module: "hr", action: "DELETE", companyId: emp.companyId, entityType: "Certification", entityId: c.id, summary: `${ctx.actor.displayName} removed “${c.name}” from ${empName(emp)}'s file.` });
  },

  /* ---- CRA remittances (PD7A) ---- */
  "remit.generate"(S, p, ctx) {
    ctx.need("payroll.post");
    const m = /^(\d{4})-(\d{2})$/.exec(p.month || "");
    if (!p.companyId) fail("Choose the company.");
    if (!m) fail("Pick the month to remit for.");
    ctx.company(p.companyId);
    const year = Number(m[1]), mon = Number(m[2]);
    if (mon < 1 || mon > 12) fail("That isn't a valid month.");
    const company = byId(S.companies, p.companyId);
    const t = hr2Remit(S, p.companyId, year, mon);
    if (!t) fail(`No posted payroll runs with a pay date in ${HR2_MONTHS[mon - 1]} ${year} for ${company.displayName} — post the payroll first.`);
    S.remittances = S.remittances || [];
    const existing = S.remittances.find((r) => r.companyId === p.companyId && r.periodStart === t.periodStart && r.periodEnd === t.periodEnd);
    if (existing?.status === "PAID") fail(`${hr2MonthLabel(t.periodStart)} has already been paid (${existing.paidByName || "—"}) — the figures are locked.`);
    const data = { dueDate: t.dueDate, cppEmployeeCents: t.cppEmployeeCents, cppEmployerCents: t.cppEmployerCents, eiEmployeeCents: t.eiEmployeeCents, eiEmployerCents: t.eiEmployerCents, taxCents: t.taxCents, totalCents: t.totalCents, grossPayCents: t.grossPayCents, employeeCount: t.employeeCount, runIds: t.runIds, status: "DUE", generatedAt: ctx.now, generatedByName: ctx.actor.displayName };
    let row = existing;
    if (row) Object.assign(row, data); else { row = { id: ctx.id("rem"), companyId: p.companyId, periodStart: t.periodStart, periodEnd: t.periodEnd, ...data }; S.remittances.push(row); }
    ctx.audit({ module: "payroll", action: existing ? "UPDATE" : "CREATE", companyId: p.companyId, entityType: "PayrollRemittance", entityId: row.id, summary: `${ctx.actor.displayName} ${existing ? "refreshed" : "generated"} the ${hr2MonthLabel(t.periodStart)} PD7A for ${company.displayName}: ${money(t.totalCents)} due ${t.dueDate} from ${t.runNumbers.join(", ")}.` });
  },
  "remit.pay"(S, p, ctx) {
    ctx.need("payroll.post");
    const rem = byId(S.remittances || [], p.id);
    if (!rem) fail("That remittance no longer exists.");
    ctx.company(rem.companyId);
    if (rem.status === "PAID") fail(`${hr2MonthLabel(rem.periodStart)} is already marked paid.`);
    if (!(rem.totalCents > 0)) fail("There's nothing to remit for that month.");
    const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(p.paidOn || "") ? p.paidOn : ctx.now.slice(0, 10);
    const label = hr2MonthLabel(rem.periodStart);
    const je = postJournal(S, ctx, { companyId: rem.companyId, date: paidOn, memo: `CRA remittance PD7A ${label}`, source: "PAYROLL", sourceType: "PayrollRemittance", sourceId: rem.id, reference: `PD7A ${rem.periodEnd.slice(0, 7)}`, lines: [
      { accountNumber: GL.PAYROLL_LIAB, debitCents: rem.totalCents, creditCents: 0, description: `CPP, EI and income tax remitted — ${label}` },
      { accountNumber: GL.BANK, debitCents: 0, creditCents: rem.totalCents, description: `Payment to Receiver General — ${label}` },
    ] });
    bankTxn(S, ctx, rem.companyId, paidOn, `CRA remittance PD7A — ${label}`, -rem.totalCents, "WITHDRAWAL");
    Object.assign(rem, { status: "PAID", paidAt: `${paidOn}T12:00:00.000Z`, paidByName: ctx.actor.displayName, journalEntryId: je.id });
    ctx.audit({ module: "payroll", action: "POST", companyId: rem.companyId, entityType: "PayrollRemittance", entityId: rem.id, summary: `${ctx.actor.displayName} marked the ${label} PD7A for ${byId(S.companies, rem.companyId).displayName} paid — ${money(rem.totalCents)} posted to 2300 / 1010 (${je.entryNumber}).` });
  },
});

/* ==========================================================================
   Views — benefits
   ========================================================================== */
PROFILE_PILLS.push(["/me/reviews", "My reviews"], ["/me/certifications", "My certificates"]);
/* benefits views now live in views-hr3.js (HR enrols directly) */

/* ==========================================================================
   Views — performance reviews
   ========================================================================== */
function hr2ReviewsInScope() { const ids = scopeIds(S, A); return S.reviews.filter((r) => { const e = hr2Emp(r.employeeId); return e && ids.includes(e.companyId); }); }
function vHr2Reviews() {
  const f = UI.filters.rv || (UI.filters.rv = {});
  const all = hr2ReviewsInScope();
  const shown = all.filter((r) => (f.status === "OVERDUE" ? hr2Overdue(r) : f.status ? r.status === f.status : true)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  const cnt = (k) => (k === "OVERDUE" ? all.filter(hr2Overdue).length : k ? all.filter((r) => r.status === k).length : all.length);
  const chips = [["", "All"], ["SELF_REVIEW", "Self-review"], ["MANAGER_REVIEW", "Manager review"], ["COMPLETED", "Completed"], ["OVERDUE", "Overdue"]].map(([k, l]) => `<button class="hchip ${(f.status || "") === k ? "on" : ""}" data-a="hr2Chip" data-k="rv" data-f="status" data-v="${k}">${l} <span>${cnt(k)}</span></button>`).join("");
  const edit = can(A, "hr.employees.edit");
  const cos = S.companies.filter((c) => scopeIds(S, A).includes(c.id));
  const start = edit ? card("Start a review cycle", `<form data-f="hr2Cycle" class="form-grid"><div class="fld"><label for="cyName">Cycle name</label><input class="in" id="cyName" name="cycle" required placeholder="e.g. 2026 Year-end"></div><div class="fld"><label for="cyDue">Due date</label><input class="in" type="date" id="cyDue" name="dueDate" required value="${addDays(todayStr(), 30)}"></div><div class="fld"><label for="cyCo">Company</label><select class="in" id="cyCo" name="companyId">${cos.length > 1 ? opt("", "Every company in view") : ""}${cos.map((c) => opt(c.id, c.displayName)).join("")}</select></div><div class="form-row" style="grid-column:1/-1;justify-content:space-between"><span class="hint">One review per active employee who has a manager. People already in a cycle with this name are skipped.</span><button class="btn pri">Start cycle</button></div></form>`) : "";
  const rows = shown.map((r) => { const e = hr2Emp(r.employeeId); const od = hr2Overdue(r); return `<tr><td><button class="lnk" data-go="/hr/reviews/${r.id}"><strong>${esc(empName(e))}</strong></button><div class="hint">${coTag(e.companyId)} ${esc(byId(S.departments, e.departmentId)?.name || "")}</div></td><td>${r.reviewerId ? esc(hr2Name(r.reviewerId)) : "—"}</td><td>${esc(r.cycle)}</td><td>${esc(dLong(r.dueDate))}${od ? ` <span class="badge tone-red">Overdue</span>` : ""}</td><td>${hr2Badge(HR2_REVIEW_STATUS, r.status)}${r.status === "COMPLETED" ? `<div class="hint">${r.ackAt ? `acknowledged ${esc(dShort(r.ackAt.slice(0, 10)))}` : "not yet acknowledged"}</div>` : ""}</td><td>${(r.goals || []).length ? `${(r.goals || []).filter((g) => g.status === "DONE").length}/${r.goals.length} done<span class="hr2bar"><i style="width:${Math.round(((r.goals || []).filter((g) => g.status === "DONE").length / r.goals.length) * 100)}%"></i></span>` : `<span class="hint">no goals yet</span>`}</td><td>${hr2Stars(r.rating)}</td><td class="r"><button class="btn sm" data-go="/hr/reviews/${r.id}">Open</button></td></tr>`; });
  const byStatus = Object.entries(HR2_REVIEW_STATUS).map(([k, [l]]) => ({ label: l, v: all.filter((r) => r.status === k).length, d: `${all.filter((r) => r.status === k).length}` }));
  return ph("Performance reviews", "Each person writes a self-review first, then their manager adds a summary and rating and the person acknowledges it. HR starts the cycles and can step in on any review.") + flashHtml()
    + `<div class="stats">${stat("Reviews in view", String(all.length))}${stat("Waiting on the person", String(cnt("SELF_REVIEW")), "self-review stage")}${stat("Waiting on managers", String(cnt("MANAGER_REVIEW")), "manager review stage")}${stat("Overdue", String(cnt("OVERDUE")), "past due date, not completed", cnt("OVERDUE") ? "warn" : "")}</div>`
    + `<div class="hr2chips">${chips}</div>`
    + cardFlush("", table(["Person", "Reviewer", "Cycle", "Due", "Status", "Goals", "Rating", ""], rows, "No reviews match this filter."))
    + `<div class="grid g2" style="align-items:start;margin-top:14px">${start}${card("Where things stand", donut(byStatus, { title: "Reviews by stage", caption: "Reviews", total: String(all.length) }))}</div>`;
}

function vHr2Review(q, id) {
  const r = byId(S.reviews, id);
  if (!r) return vNotFound();
  if (!hr2CanSeeReview(r)) return vDenied("review access (the person, their reviewer, or HR)");
  const e = hr2Emp(r.employeeId), person = empName(e), reviewer = r.reviewerId ? hr2Emp(r.reviewerId) : null;
  const fromMe = q.from === "me" || !can(A, "hr.employees.view");
  const canSelf = hr2CanSelf(r), canMgr = hr2CanManager(r), hr = hr2IsHr(r);
  const canGoal = hr || (hr2IsSubject(r) && r.status === "SELF_REVIEW") || (hr2IsReviewer(r) && r.status !== "COMPLETED");
  const yourPart = hr2IsSubject(r) ? (r.status === "SELF_REVIEW" ? "Your part: update your goals, write a short self-summary and send it to your manager." : r.status === "MANAGER_REVIEW" ? `Your self-review is with ${reviewer ? empName(reviewer) : "your manager"} — nothing more to do until it's completed.` : "Completed — your manager's summary and rating are below.")
    : hr2IsReviewer(r) ? (r.status === "MANAGER_REVIEW" ? "Your part: read the self-review, add your summary and a rating, then complete the review." : r.status === "SELF_REVIEW" ? `${person} is still writing their self-review.` : "Completed.") : hr ? "As HR you can edit any part of this review." : "Read-only.";
  const goals = r.goals || [];
  const goalRows = goals.map((g, i) => `<div class="hr2goal"><span class="ttl">${esc(g.title)}</span>${canSelf && r.status !== "COMPLETED" ? `<select class="in" name="goal_${i}" aria-label="Status of ${esc(g.title)}" form="hr2SelfForm">${Object.entries(HR2_GOAL).map(([k, [l]]) => opt(k, l, g.status === k)).join("")}</select>` : hr2Badge(HR2_GOAL, g.status)}</div>`).join("") || `<p class="hint">No goals yet.</p>`;
  const addGoal = canGoal ? `<form data-f="hr2Goal" data-id="${r.id}" class="row" style="margin-top:10px"><input class="in" name="title" required placeholder="Add a goal…" aria-label="New goal" style="flex:1;min-width:0"><button class="btn sm">Add goal</button></form>` : "";
  const selfCard = card("Self-review", `<p class="hint" style="margin-top:0">${esc(hr2IsSubject(r) ? "How did the period go, in your own words?" : `${person}'s own account of the period.`)}</p>` + (canSelf && r.status !== "COMPLETED"
    ? `<form data-f="hr2Self" data-id="${r.id}" id="hr2SelfForm" data-from="${fromMe ? "me" : ""}"><textarea class="in" name="selfSummary" rows="5" placeholder="Wins, challenges, what you'd like next…" aria-label="Self summary">${esc(r.selfSummary || "")}</textarea><div class="form-row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-x="save">Save</button>${r.status === "SELF_REVIEW" ? `<button class="btn pri" data-x="submit">Submit to manager</button>` : ""}</div></form>`
    : r.selfSummary ? `<p style="font-size:13.5px;white-space:pre-wrap;margin:0">${hr2Lines(r.selfSummary)}</p>` : empty("Not written yet")));
  const ratingPick = `<div class="form-row" role="radiogroup" aria-label="Rating" style="margin-top:10px">${[1, 2, 3, 4, 5].map((n) => `<label class="hr2rate"><input type="radio" name="rating" value="${n}" ${r.rating === n ? "checked" : ""}> ${n} ${["Needs work", "Developing", "Solid", "Strong", "Exceptional"][n - 1]}</label>`).join("")}</div>`;
  const mgrCard = card("Manager review", `<p class="hint" style="margin-top:0">${reviewer ? `Reviewer: <strong>${esc(empName(reviewer))}</strong>` : "No reviewer assigned."}${r.completedAt ? ` · completed ${esc(dTime(r.completedAt))}` : ""}</p>` + (canMgr && r.status !== "COMPLETED"
    ? `<form data-f="hr2Manager" data-id="${r.id}" data-from="${fromMe ? "me" : ""}"><textarea class="in" name="managerSummary" rows="5" placeholder="Strengths, growth areas, what's next…" aria-label="Manager summary">${esc(r.managerSummary || "")}</textarea>${ratingPick}<div class="form-row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-x="save">Save</button><button class="btn pri" data-x="complete">Complete review</button></div></form>`
    : `${r.managerSummary ? `<p style="font-size:13.5px;white-space:pre-wrap;margin:0 0 10px">${hr2Lines(r.managerSummary)}</p>` : empty(r.status === "SELF_REVIEW" ? "Opens once the self-review is submitted" : "Not written yet")}<div>Rating: ${hr2Stars(r.rating)}</div>${hr2AckHtml(r)}`));
  const hrCard = hr ? card("HR controls", `<form data-f="hr2ReviewHr" data-id="${r.id}" class="form-grid"><div class="fld"><label for="rhRev">Reviewer</label><select class="in" id="rhRev" name="reviewerId">${opt("", "— none —", !r.reviewerId)}${S.employees.filter((x) => x.id !== r.employeeId && hr2Active(x) && canSee(A, x.companyId)).sort((a, b) => a.lastName.localeCompare(b.lastName)).map((x) => opt(x.id, `${empName(x)} · ${co(x.companyId).code}`, x.id === r.reviewerId)).join("")}</select></div><div class="fld"><label for="rhDue">Due date</label><input class="in" type="date" id="rhDue" name="dueDate" value="${r.dueDate}" required></div><div class="fld"><label for="rhSt">Status</label><select class="in" id="rhSt" name="status">${Object.entries(HR2_REVIEW_STATUS).map(([k, [l]]) => opt(k, l, r.status === k)).join("")}</select></div><div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button class="btn">Update review</button></div></form>`) : "";
  return ph(`${r.cycle} · ${person}`, yourPart, `${hr2Badge(HR2_REVIEW_STATUS, r.status)}${hr2Overdue(r) ? ` <span class="badge tone-red">Overdue</span>` : ""}`, crumb(fromMe ? "/me/reviews" : "/hr/reviews", fromMe ? "My reviews" : "Performance reviews")) + flashHtml()
    + `<div class="stats">${stat("Person", person, `${co(e.companyId).displayName} · ${byId(S.departments, e.departmentId)?.name || ""}`)}${stat("Due", dLong(r.dueDate), hr2Overdue(r) ? "past due" : "")}${stat("Goals", `${goals.filter((g) => g.status === "DONE").length} / ${goals.length}`, "done")}${stat("Rating", r.rating ? `${r.rating} / 5` : "—", r.rating ? ["Needs work", "Developing", "Solid", "Strong", "Exceptional"][r.rating - 1] : "not rated yet")}</div>`
    + `<div class="grid g2" style="align-items:start">${card("Goals", goalRows + addGoal)}<div style="display:grid;gap:14px">${selfCard}${mgrCard}${hrCard}</div></div>`;
}

/** acknowledgement block on a completed review: the person reads it and clicks Acknowledge; HR and the reviewer see the date */
function hr2AckHtml(r) {
  if (r.status !== "COMPLETED") return "";
  if (r.ackAt) return `<div class="msg ok" style="margin:10px 0 0">${hr2IsSubject(r) ? "You acknowledged this review" : `Acknowledged by ${esc(hr2Name(r.employeeId))}`} · ${esc(dTime(r.ackAt))}${r.ackComment ? ` — “${esc(r.ackComment)}”` : ""}</div>`;
  if (hr2IsSubject(r)) return `<form data-f="hr3ReviewAck" data-id="${r.id}" class="form-row" style="margin-top:10px"><input class="in" name="comment" placeholder="A comment for your manager (optional)" aria-label="Comment" style="flex:1;min-width:180px;height:34px"><button class="btn pri">Acknowledge</button></form><p class="hint" style="margin:6px 0 0">Acknowledging means you've read it — not that you agree with every word. Your comment goes to your manager and HR.</p>`;
  return `<div class="hint" style="margin-top:10px">Not yet acknowledged by ${esc(hr2Name(r.employeeId))}.</div>`;
}
function vHr2MeReviews() {
  const head = pillNav("My profile", PROFILE_PILLS, "/me/reviews") + bigTitle("My reviews", "Your performance reviews, and the ones you give as a manager.");
  const e = A.employee;
  if (!e) return head + card("", empty("This account isn't linked to an employee"));
  const mine = S.reviews.filter((r) => r.employeeId === e.id).sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
  const give = S.reviews.filter((r) => r.reviewerId === e.id).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const row = (r, who) => `<div class="hr2req"><div class="grow"><div><strong>${esc(r.cycle)}</strong>${who ? ` · ${esc(who)}` : ""}</div><div class="hint">Due ${esc(dLong(r.dueDate))}${hr2Overdue(r) ? " · overdue" : ""} · ${(r.goals || []).length} goal${(r.goals || []).length === 1 ? "" : "s"}${r.rating ? ` · ${r.rating}/5` : ""}</div></div>${hr2Badge(HR2_REVIEW_STATUS, r.status)}${r.status === "COMPLETED" && !who ? (r.ackAt ? `<span class="badge tone-green">Acknowledged ${esc(dShort(r.ackAt.slice(0, 10)))}</span>` : `<span class="badge tone-amber">Read &amp; acknowledge</span>`) : ""}<button class="btn sm pri" data-go="/hr/reviews/${r.id}?from=me">${r.status === "SELF_REVIEW" && !who ? "Write self-review" : r.status === "MANAGER_REVIEW" && who ? "Complete" : r.status === "COMPLETED" && !who && !r.ackAt ? "Read & acknowledge" : "Open"}</button></div>`;
  return head + flashHtml() + `<div class="grid g2" style="align-items:start">${card("About me", mine.map((r) => row(r)).join("") || empty("No reviews yet", "HR starts review cycles; yours will show here."))}${give.length || S.employees.some((x) => x.managerId === e.id) ? card("Reviews I give", give.map((r) => row(r, hr2Name(r.employeeId))).join("") || empty("Nothing to review right now")) : ""}</div>`;
}

/* ==========================================================================
   Views — hiring
   ========================================================================== */
function vHr2Hiring() {
  const f = UI.filters.hr2hire || (UI.filters.hr2hire = {});
  const ORD = { OPEN: 0, PENDING_APPROVAL: 1, DRAFT: 2, ON_HOLD: 3, FILLED: 4, CLOSED: 5 };
  const all = inScope(S.jobPostings).sort((a, b) => (ORD[a.status] ?? 9) - (ORD[b.status] ?? 9) || ((a.postedAt || a.createdAt || "") < (b.postedAt || b.createdAt || "") ? 1 : -1));
  const shown = all.filter((j) => (f.status ? j.status === f.status : true));
  const apps = (j) => S.applicants.filter((a) => a.jobPostingId === j.id);
  const chips = [["", "All"], ...["OPEN", "PENDING_APPROVAL", "DRAFT", "ON_HOLD", "FILLED", "CLOSED"].map((k) => [k, HR2_POSTING[k][0]])].filter(([k]) => !k || all.some((j) => j.status === k)).map(([k, l]) => `<button class="hchip ${(f.status || "") === k ? "on" : ""}" data-a="hr2Chip" data-k="hr2hire" data-f="status" data-v="${k}">${l} <span>${k ? all.filter((j) => j.status === k).length : all.length}</span></button>`).join("");
  const openings = all.filter((j) => j.status === "OPEN").reduce((s, j) => s + j.openings, 0);
  const allApps = all.flatMap(apps);
  const live = allApps.filter((a) => !["HIRED", "REJECTED"].includes(a.stage));
  const funnel = HR2_STAGES.map((k) => ({ label: HR2_STAGE[k], v: allApps.filter((a) => a.stage === k).length, d: String(allApps.filter((a) => a.stage === k).length) }));
  const rows = shown.map((j) => { const as = apps(j); const hired = as.filter((a) => a.stage === "HIRED").length; const inst = j.approvalInstanceId ? byId(S.approvals, j.approvalInstanceId) : null; const stages = HR2_STAGES.filter((k) => as.some((a) => a.stage === k)).map((k) => `<span class="pillx">${HR2_STAGE[k]} ${as.filter((a) => a.stage === k).length}</span>`).join(" ");
    return `<tr class="click" data-go="/hr/hiring/${j.id}"><td><strong>${esc(j.title)}</strong><div class="hint">${esc(EMPLOYMENT[j.employmentType] || "")} · ${esc(hr3PayRange(j))}${j.locationText ? ` · ${esc(j.locationText)}` : ""}</div></td><td>${coTag(j.companyId)}</td><td>${esc(byId(S.departments, j.departmentId)?.name || "—")}</td>${td(`${hired} of ${j.openings}`, 1)}<td style="font-size:11.5px">${stages || `<span class="hint">no candidates</span>`}</td><td>${j.hiringManagerId ? esc(hr2Name(j.hiringManagerId)) : "—"}</td><td>${hr2Badge(HR2_POSTING, j.status)}${j.status === "PENDING_APPROVAL" && inst ? `<div class="hint">waiting for ${esc(whoIsNext(S, inst))}</div>` : j.postedAt ? `<div class="hint">posted ${esc(dShort(j.postedAt.slice(0, 10)))}</div>` : ""}</td></tr>`; });
  return ph("Hiring", "From an approved opening to a new employee: a new opening goes to the hiring manager for approval, candidates then move through the stages, and marking someone hired creates their employee record with onboarding tasks.", `<button class="btn pri" data-go="/hr/hiring/new">New opening</button>`) + flashHtml()
    + `<div class="stats">${stat("Open positions", String(openings), `${all.filter((j) => j.status === "OPEN").length} openings`)}${stat("Waiting for approval", String(all.filter((j) => j.status === "PENDING_APPROVAL").length), "with the hiring manager", all.some((j) => j.status === "PENDING_APPROVAL") ? "warn" : "")}${stat("Candidates in play", String(live.length))}${stat("Offers out", String(live.filter((a) => a.stage === "OFFER").length), "", "good")}</div>`
    + `<div class="hr2chips">${chips}</div>`
    + cardFlush("", table(["Opening", "Company", "Department", ">Filled", "Pipeline", "Hiring manager", "Status"], rows, "No openings match this filter."))
    + `<div class="grid g2" style="align-items:start;margin-top:14px">${card("Applicant funnel", donut(funnel, { title: "Candidates by stage", caption: "Candidates", total: String(allApps.length) }))}${card("How an opening is filled", `<ol style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.7"><li><strong>New opening</strong> — title, department, headcount, salary range, reason and start date.</li><li><strong>Send for approval</strong> — it lands in the hiring manager's Approvals (and on their Home).</li><li><strong>Approved</strong> — the posting goes live; add candidates and move them through the stages.</li><li><strong>Mark hired</strong> — creates the employee record and onboarding checklist.</li></ol>`)}</div>`;
}

function vHr2Posting(q, id) {
  const j = byId(S.jobPostings, id);
  if (!j || !canSee(A, j.companyId)) return vNotFound();
  const as = S.applicants.filter((a) => a.jobPostingId === j.id).sort((a, b) => (a.appliedAt < b.appliedAt ? -1 : 1));
  const hired = as.filter((a) => a.stage === "HIRED").length;
  const pay = j.salaryMinCents ? (j.salaryMinCents < 50000 ? `${money(j.salaryMinCents)}–${money(j.salaryMaxCents || j.salaryMinCents)} / hour` : `${money(j.salaryMinCents)}–${money(j.salaryMaxCents || j.salaryMinCents)} / year`) : "pay not set";
  const inst = j.approvalInstanceId ? byId(S.approvals, j.approvalInstanceId) : null;
  const statusBtns = (j.status === "PENDING_APPROVAL" ? [] : j.status === "DRAFT" ? [["SUBMIT", "Send for approval"], ["CLOSED", "Close"]] : [["ON_HOLD", "On hold"], ["OPEN", "Reopen"], ["CLOSED", "Close"]].filter(([k]) => k !== j.status && !(k === "OPEN" && !j.approvedAt && !j.postedAt))).map(([k, l]) => (k === "SUBMIT" ? `<button class="btn sm pri" data-a="hr3JobSubmit" data-id="${j.id}">${l}</button>` : `<button class="btn sm" data-a="hr2PostingStatus" data-id="${j.id}" data-st="${k}">${l}</button>`)).join("");
  const cardOf = (a) => `<div class="hr2card"><div class="nm"><span>${esc(a.name)}</span>${hr2Stars(a.rating)}</div><small>${esc(a.source || "Direct")} · applied ${esc(dShort(a.appliedAt.slice(0, 10)))}${a.email ? ` · ${esc(a.email)}` : ""}</small>${a.notes ? `<p>${esc(a.notes)}</p>` : ""}
    ${a.hiredEmployeeId ? `<small>Employee record: ${goLink(`/hr/employees/${a.hiredEmployeeId}`, hr2Emp(a.hiredEmployeeId)?.employeeNumber || "open")}</small>` : `<form class="mv" data-f="hr2Move" data-id="${a.id}"><select class="in" name="stage" aria-label="Move ${esc(a.name)} to">${(() => { const opts = HR2_STAGES.filter((k) => k !== a.stage && k !== "HIRED"); const nxt = HR2_STAGES[HR2_STAGES.indexOf(a.stage) + 1]; const def = opts.includes(nxt) ? nxt : opts[0]; return opts.map((k) => opt(k, HR2_STAGE[k], k === def)).join(""); })()}</select><button class="btn sm">Move</button></form>
    <details><summary>Notes &amp; rating</summary><form data-f="hr2ApplicantNote" data-id="${a.id}" style="display:grid;gap:6px;margin-top:6px"><select class="in" name="rating" aria-label="Rating">${opt("", "Not rated", !a.rating)}${[1, 2, 3, 4, 5].map((n) => opt(n, `${"★".repeat(n)} ${n}/5`, a.rating === n)).join("")}</select><textarea class="in" name="notes" placeholder="Interview notes, references…">${esc(a.notes || "")}</textarea><button class="btn sm">Save</button></form></details>
    ${a.stage !== "REJECTED" ? `<details class="hire"><summary>Mark hired → create employee record</summary><form data-f="hr2Hire" data-id="${a.id}" style="display:grid;gap:6px;margin-top:6px"><label class="hint">Start date<input class="in" type="date" name="startDate" value="${addDays(todayStr(), 14)}" required></label><button class="btn pri sm">Hire ${esc(a.name.split(" ")[0])}</button></form></details>` : ""}`}</div>`;
  const cols = HR2_STAGES.map((k) => { const list = as.filter((a) => a.stage === k); return `<div class="hr2col ${k === "REJECTED" ? "off" : ""}"><div class="och"><b>${HR2_STAGE[k]}<span class="cnt">${list.length}</span></b></div>${list.map(cardOf).join("") || `<div class="oempty">—</div>`}</div>`; }).join("");
  const funnel = HR2_STAGES.map((k) => ({ label: HR2_STAGE[k], v: as.filter((a) => a.stage === k).length, d: String(as.filter((a) => a.stage === k).length) }));
  const add = `<form data-f="hr2Applicant" data-id="${j.id}" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="fld" style="grid-column:1/-1"><label for="apN">Name</label><input class="in" id="apN" name="name" required placeholder="Full name"></div><div class="fld"><label for="apE">Email</label><input class="in" id="apE" name="email" type="email"></div><div class="fld"><label for="apP">Phone</label><input class="in" id="apP" name="phone"></div><div class="fld"><label for="apS">Source</label><select class="in" id="apS" name="source">${["Referral", "Job board", "Website", "Walk-in", "Agency", "Internal"].map((s) => opt(s, s)).join("")}</select></div><div class="fld"><label for="apD">Applied on</label><input class="in" type="date" id="apD" name="appliedAt" value="${todayStr()}"></div><div class="fld"><label for="apR">First impression</label><select class="in" id="apR" name="rating">${opt("", "Not rated")}${[1, 2, 3, 4, 5].map((n) => opt(n, `${n}/5`)).join("")}</select></div><div class="fld" style="grid-column:1/-1"><label for="apNo">Notes</label><input class="in" id="apNo" name="notes" placeholder="Résumé highlights…"></div><div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button class="btn pri" ${j.status !== "OPEN" ? "disabled" : ""}>Add applicant</button></div></form>`;
  return ph(j.title, `${co(j.companyId).displayName} · ${byId(S.departments, j.departmentId)?.name || "no department"}${j.locationText ? ` · ${j.locationText}` : ""} · ${EMPLOYMENT[j.employmentType] || j.employmentType} · ${pay}${j.hiringManagerId ? ` · hiring manager ${hr2Name(j.hiringManagerId)}` : ""}`, `${hr2Badge(HR2_POSTING, j.status)} ${statusBtns}`, crumb("/hr/hiring", "Hiring")) + flashHtml()
    + (j.description ? `<p class="hint" style="margin:-4px 0 12px">${esc(j.description)}</p>` : "")
    + `<div class="stats">${stat("Openings", `${hired} / ${j.openings}`, "hired so far")}${stat("Applicants", String(as.length))}${stat("In the pipeline", String(as.filter((a) => !["HIRED", "REJECTED"].includes(a.stage)).length), "still being considered")}${stat("Posted", j.postedAt ? dLong(j.postedAt.slice(0, 10)) : "—", j.closedAt ? `closed ${dLong(j.closedAt.slice(0, 10))}` : "")}</div>`
    + (j.status === "PENDING_APPROVAL" && inst ? `<div class="msg info">Waiting for <strong>${esc(whoIsNext(S, inst))}</strong> to approve this opening (${esc(activeSteps(S, inst).find((s) => s.sequence === inst.currentStep)?.name || "Hiring manager approval")}). It goes live, and takes applicants, once approved.</div>` : j.status === "DRAFT" ? `<div class="msg warn">Draft — ${j.returnedAt ? `sent back by ${esc(j.returnedByName || "the hiring manager")} ${esc(ago(j.returnedAt))}. Fix it and ` : ""}send it for approval before adding candidates.</div>` : j.status !== "OPEN" ? `<div class="msg info">This posting is ${HR2_POSTING[j.status][0].toLowerCase()} — applicants can only be moved forward or hired while it's open.</div>` : j.approvedByName ? `<div class="msg ok">Approved by ${esc(j.approvedByName)} · ${esc(dLong(j.approvedAt.slice(0, 10)))} — live and taking applicants.</div>` : "")
    + (j.reason || j.startDate || j.createdByName ? `<p class="hint" style="margin:-4px 0 12px">${[j.reason ? `Reason: ${esc(j.reason)}` : "", j.startDate ? `target start ${esc(dLong(j.startDate))}` : "", j.createdByName ? `opened by ${esc(j.createdByName)}` : ""].filter(Boolean).join(" · ")}</p>` : "")
    + `<div class="hr2board">${cols}</div>`
    + `<div class="grid g2" style="align-items:start">${card("Add applicant", add)}${card("Funnel", donut(funnel, { title: "Applicants by stage", caption: "Applicants", total: String(as.length) }))}</div>`;
}

/* certificate views now live in views-hr3.js (files, renewals, reminders) */
function hr2CertRows() { const ids = scopeIds(S, A); return (S.certifications || []).map((c) => ({ c, e: hr2Emp(c.employeeId) })).filter((x) => x.e && ids.includes(x.e.companyId) && hr2Active(x.e)).map((x) => ({ ...x, st: hr2CertStatus(x.c.expiryDate) })); }

/* ==========================================================================
   Views — CRA remittances (PD7A)
   ========================================================================== */
function vHr2Remittances() {
  const ids = scopeIds(S, A);
  const cos = S.companies.filter((c) => ids.includes(c.id));
  const all = (S.remittances || []).filter((r) => ids.includes(r.companyId)).sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));
  const due = all.filter((r) => r.status === "DUE").sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const post = can(A, "payroll.post");
  const focus = byId(all, UI.filters.hr2pd) || null;
  const rowsFor = (c) => all.filter((r) => r.companyId === c.id).map((r) => `<tr class="${r.id === focus?.id ? "on" : ""}"><td><strong>${esc(hr2MonthLabel(r.periodStart))}</strong><div class="hint">${esc(dShort(r.periodStart))} – ${esc(dShort(r.periodEnd))} · ${(r.runIds || []).length} run${(r.runIds || []).length === 1 ? "" : "s"}</div></td><td>${esc(dLong(r.dueDate))}${r.status === "DUE" && r.dueDate < todayStr() ? ` <span class="badge tone-red">Late</span>` : ""}</td>${td(amount(r.cppEmployeeCents), 1)}${td(amount(r.cppEmployerCents), 1)}${td(amount(r.eiEmployeeCents), 1)}${td(amount(r.eiEmployerCents), 1)}${td(amount(r.taxCents), 1)}${td(`<strong>${amount(r.totalCents)}</strong>`, 1)}${td(amount(r.grossPayCents), 1)}${td(String(r.employeeCount), 1)}<td>${hr2Badge(HR2_REMIT_STATUS, r.status)}${r.paidByName ? `<div class="hint">${esc(r.paidByName)} · ${esc(dLong((r.paidAt || "").slice(0, 10)))}</div>` : ""}</td><td class="r"><div class="form-row" style="justify-content:flex-end;flex-wrap:nowrap"><button class="btn sm" data-a="hr2Pd7a" data-id="${r.id}">PD7A</button>${r.status === "DUE" && post ? `<form class="row" data-f="hr2RemitPay" data-id="${r.id}" style="gap:4px"><input class="in" type="date" name="paidOn" value="${todayStr()}" aria-label="Paid on" style="height:30px;width:140px"><button class="btn pri sm">Mark paid</button></form>` : ""}${r.journalEntryId ? goLink(`/finance/journals/${r.journalEntryId}`, byId(S.journalEntries, r.journalEntryId)?.entryNumber || "Journal") : ""}</div></td></tr>`);
  const heads = ["Period", "Due", ">CPP employee", ">CPP employer", ">EI employee", ">EI employer", ">Income tax", ">Total to remit", ">Gross payroll", ">Employees", "Status", ""];
  const withRows = cos.filter((c) => all.some((r) => r.companyId === c.id)), without = cos.filter((c) => !withRows.includes(c));
  const lists = withRows.map((c) => cardFlush(`${coTag(c.id)} <span class="hint" style="font-weight:400">· payroll account ${esc(c.businessNumber || "—")}</span>`, table(heads, rowsFor(c), "No remittances generated yet for this company."))).join("")
    + (without.length ? `<p class="hint">Nothing generated yet for ${without.map((c) => c.displayName).join(", ")} — ${post ? "use “Generate for a month” once their payroll is posted." : "there are no posted payroll runs to remit on."}</p>` : "");
  const pd = focus ? (() => { const c = co(focus.companyId); const row = (k, v, cls = "") => `<dt class="${cls}">${k}</dt><dd class="${cls}">${v}</dd>`; return `<section class="hr2pd" id="pd7a"><h3><span>Statement of account for current source deductions (PD7A) — ${esc(hr2MonthLabel(focus.periodStart))}</span><button class="lnk" data-a="hr2Pd7a" data-id="">Close</button></h3><div class="grid g2"><dl class="hr2dl">${row("Employer", `<strong>${esc(c.legalName || c.displayName)}</strong>`)}${row("Payroll program account number", esc(c.businessNumber || "—"))}${row("End of remitting period", esc(focus.periodEnd))}${row("Due date", esc(focus.dueDate))}${row("Gross payroll in remitting period", money(focus.grossPayCents))}${row("Number of employees in last pay period", String(focus.employeeCount))}</dl><dl class="hr2dl hr2box">${row("CPP contributions (employee)", money(focus.cppEmployeeCents))}${row("CPP contributions (employer)", money(focus.cppEmployerCents))}${row("EI premiums (employee)", money(focus.eiEmployeeCents))}${row("EI premiums (employer, 1.4×)", money(focus.eiEmployerCents))}${row("Income tax deducted (federal + BC)", money(focus.taxCents))}${row("Amount of remittance", money(focus.totalCents), "tot")}</dl></div><p class="hint" style="margin:10px 0 0">Built from ${(focus.runIds || []).length} posted payroll run${(focus.runIds || []).length === 1 ? "" : "s"}${(focus.runIds || []).length ? ` (${(focus.runIds || []).map((id) => byId(S.payrollRuns, id)?.runNumber || id).join(", ")})` : ""}. Status: ${focus.status === "PAID" ? `paid ${dLong((focus.paidAt || "").slice(0, 10))} by ${esc(focus.paidByName || "—")}` : "not yet paid"}. The CRA copy is what you file through My Business Account or your bank.</p></section>`; })() : "";
  const gen = post ? card("Generate for a month", `<form data-f="hr2Remit" class="form-grid"><div class="fld"><label for="rmCo">Company</label><select class="in" id="rmCo" name="companyId" data-a="hr2RemCo">${cos.map((c) => opt(c.id, c.displayName, c.id === (UI.filters.hr2remCo || cos[0]?.id))).join("")}</select></div><div class="fld"><label for="rmM">Month</label><input class="in" type="month" id="rmM" name="month" value="${hr2PrevMonth()}" required></div><div class="form-row" style="grid-column:1/-1;justify-content:space-between"><span class="hint">Sums CPP, EI and tax over the posted payroll runs paid in that month. Re-running a month that isn't paid yet refreshes its figures.</span><button class="btn pri">Generate PD7A</button></div></form>`) : "";
  return ph("CRA remittances · PD7A", "What's owed to the Receiver General each month for CPP, EI and income tax — built from the posted payroll runs. Regular remitters pay by the 15th of the following month.", dlButton("remittances", "Download", { variant: "outline" })) + flashHtml()
    + `<div class="stats">${stat("Next due", due[0] ? dLong(due[0].dueDate) : "—", due[0] ? `${hr2MonthLabel(due[0].periodStart)} · ${co(due[0].companyId).displayName}` : "nothing outstanding", due[0] && due[0].dueDate < todayStr() ? "warn" : "")}${stat("Total due", money(due.reduce((s, r) => s + r.totalCents, 0)), `${due.length} remittance${due.length === 1 ? "" : "s"} unpaid`, due.length ? "warn" : "good")}${stat("Paid this year", money(all.filter((r) => r.status === "PAID" && r.periodStart.startsWith(todayStr().slice(0, 4))).reduce((s, r) => s + r.totalCents, 0)))}${stat("Gross payroll remitted on", money(all.reduce((s, r) => s + r.grossPayCents, 0)), "all months on file")}</div>`
    + pd
    + `<div class="grid g2" style="align-items:start;margin-bottom:14px">${gen}${card("How it works", `<p class="hint" style="margin:0 0 8px"><strong>Generate</strong> builds the month's PD7A from every posted payroll run with a pay date in that month — nothing is estimated.</p><p class="hint" style="margin:0 0 8px"><strong>Mark paid</strong> records the payment to the Receiver General: debit 2300 Payroll liabilities, credit 1010 Bank, and a bank line for reconciliation.</p><p class="hint" style="margin:0">Open <strong>PD7A</strong> on any month to see the statement laid out the way the CRA form reads.</p>`)}</div><div style="display:grid;gap:14px">${lists || card("", empty("No companies in this view"))}</div>`;
}

/* ==========================================================================
   Routes, forms, actions, exports
   ========================================================================== */
route("/hr/reviews", "hr.employees.view", vHr2Reviews);
route("/hr/reviews/:id", null, vHr2Review);
route("/me/reviews", null, vHr2MeReviews);
route("/hr/hiring", "hr.employees.edit", vHr2Hiring);
route("/hr/hiring/:id", "hr.employees.edit", vHr2Posting);
route("/payroll/remittances", "payroll.view", vHr2Remittances);

window.FORMS_EXT.push({
  hr2Cycle(f) { const d = fd(f); const before = S.reviews.length; if (act("review.cycle", { cycle: d.cycle, dueDate: d.dueDate, companyId: d.companyId || null }, `Started “${d.cycle}”. Each person writes their self-review first, then their manager completes it.`)) { UI.filters.rv = { status: "SELF_REVIEW" }; toast("Reviews created", `${S.reviews.length - before} people are now in the cycle.`, "ok"); safeRender(); } },
  hr2Self(f, ev) { const d = fd(f); const submit = ev.submitter?.dataset.x === "submit"; const r = byId(S.reviews, f.dataset.id); const goalStatuses = (r?.goals || []).map((g, i) => d[`goal_${i}`] || g.status); act("review.self", { id: f.dataset.id, selfSummary: d.selfSummary, goalStatuses, submit }, submit ? "Sent to your manager — they'll add their summary and rating." : "Saved."); },
  hr2Manager(f, ev) { const d = fd(f); const complete = ev.submitter?.dataset.x === "complete"; act("review.manager", { id: f.dataset.id, managerSummary: d.managerSummary, rating: d.rating ? Number(d.rating) : null, complete }, complete ? "Review completed — thank you." : "Saved."); },
  hr2Goal(f) { const d = fd(f); act("review.goal.add", { id: f.dataset.id, title: d.title }, `Goal added: “${d.title}”.`); },
  hr2ReviewHr(f) { const d = fd(f); act("review.hr", { id: f.dataset.id, reviewerId: d.reviewerId, dueDate: d.dueDate, status: d.status }, "Review details updated."); },
  hr2Applicant(f) { const d = fd(f); act("applicant.add", { postingId: f.dataset.id, name: d.name, email: d.email, phone: d.phone, source: d.source, rating: d.rating ? Number(d.rating) : null, notes: d.notes, appliedAt: d.appliedAt }, `${d.name} added to the Applied column.`); },
  hr2Move(f) { const d = fd(f); const a = byId(S.applicants, f.dataset.id); act("applicant.move", { id: f.dataset.id, stage: d.stage }, `${a?.name || "Applicant"} moved to ${HR2_STAGE[d.stage] || d.stage}.`); },
  hr2ApplicantNote(f) { const d = fd(f); const a = byId(S.applicants, f.dataset.id); act("applicant.note", { id: f.dataset.id, rating: d.rating ? Number(d.rating) : null, notes: d.notes }, `Saved ${a?.name || "the applicant"}'s rating and notes.`); },
  hr2Hire(f) { const d = fd(f); const a = byId(S.applicants, f.dataset.id); const before = S.employees.length; if (act("applicant.hire", { id: f.dataset.id, startDate: d.startDate })) { const e = S.employees[before]; const j = byId(S.jobPostings, a?.jobPostingId); UI.flash = { kind: "ok", text: `${a?.name || "Applicant"} hired — employee record ${e?.employeeNumber || ""} created with 4 onboarding tasks${j?.status === "FILLED" ? ". All openings filled, posting closed" : ""}.` }; toast("Employee record created", `${e?.employeeNumber} · ${empName(e)} is onboarding — Payroll has been told about TD1 and direct deposit.`, "ok"); safeRender(); } },
  hr2Remit(f) { const d = fd(f); const before = (S.remittances || []).length; if (act("remit.generate", { companyId: d.companyId, month: d.month }, `${hr2MonthLabel(d.month + "-01")} PD7A ready for ${co(d.companyId)?.displayName || ""} — check the figures, then mark it paid once the payment goes out.`)) { const rem = (S.remittances || []).find((r) => r.companyId === d.companyId && r.periodStart === `${d.month}-01`); UI.filters.hr2pd = rem?.id || null; safeRender(); } },
  hr2RemitPay(f) { const d = fd(f); const rem = byId(S.remittances || [], f.dataset.id); const before = S.journalEntries.length; if (act("remit.pay", { id: f.dataset.id, paidOn: d.paidOn })) { const je = S.journalEntries[before]; UI.flash = { kind: "ok", text: `${rem ? hr2MonthLabel(rem.periodStart) : "The"} remittance marked paid — ${rem ? money(rem.totalCents) : ""} posted from the bank against payroll liabilities${je ? ` (journal ${je.entryNumber})` : ""}.` }; toast("Done", UI.flash.text, "ok"); UI.filters.hr2pd = rem?.id || null; safeRender(); } },
});
window.ACTIONS_EXT.push({
  hr2Chip(el) { const f = UI.filters[el.dataset.k] || (UI.filters[el.dataset.k] = {}); f[el.dataset.f] = el.dataset.v; safeRender(); },
  hr2PostingStatus(el) { const st = el.dataset.st; act("job.status", { id: el.dataset.id, status: st }, st === "OPEN" ? "Posting is open — applicants can be added." : st === "ON_HOLD" ? "Posting put on hold." : st === "CLOSED" ? "Posting closed." : "Posting marked filled."); },
  hr2NewCo(el) { UI.filters.hr2newCo = el.value; safeRender(); },
  hr2RemCo(el) { UI.filters.hr2remCo = el.value; },
  hr2CertRemove(el) { const c = byId(S.certifications || [], el.dataset.id); act("cert.remove", { id: el.dataset.id }, `Removed “${c?.name || "certification"}”.`); },
  hr2Pd7a(el) { UI.filters.hr2pd = el.dataset.id || null; safeRender(); if (el.dataset.id) setTimeout(() => document.getElementById("pd7a")?.scrollIntoView({ block: "start", behavior: "smooth" }), 30); },
});

EXPORTS.remittances = () => { const ids = scopeIds(S, A); const rows = (S.remittances || []).filter((r) => ids.includes(r.companyId)).sort((a, b) => (a.companyId < b.companyId ? -1 : a.companyId > b.companyId ? 1 : a.periodStart < b.periodStart ? -1 : 1)); const m = (c) => (c / 100).toFixed(2); return { base: `demo-remittances-${todayStr()}`, title: "CRA remittances (PD7A)", rows: [["Company", "Payroll account", "Period start", "Period end", "Due", "CPP employee", "CPP employer", "EI employee", "EI employer", "Income tax", "Total", "Gross payroll", "Employees", "Runs", "Status", "Paid on", "Paid by", "Journal"], ...rows.map((r) => [co(r.companyId).displayName, co(r.companyId).businessNumber || "", r.periodStart, r.periodEnd, r.dueDate, m(r.cppEmployeeCents), m(r.cppEmployerCents), m(r.eiEmployeeCents), m(r.eiEmployerCents), m(r.taxCents), m(r.totalCents), m(r.grossPayCents), String(r.employeeCount), (r.runIds || []).map((id) => byId(S.payrollRuns, id)?.runNumber || id).join(" "), r.status === "DUE" ? "Due" : "Paid", (r.paidAt || "").slice(0, 10), r.paidByName || "", byId(S.journalEntries, r.journalEntryId)?.entryNumber || ""])] }; };

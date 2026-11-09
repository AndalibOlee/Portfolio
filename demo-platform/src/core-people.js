/* ==========================================================================
   core-people.js — attachments, org changes, HR status & pay changes,
   timesheet reminders (reducers; mirrors the Next.js server actions)
   ========================================================================== */
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const FILE_KEEP_MAX = 180 * 1024; // files up to this size are kept whole so approvers can open them

/** Files posted with a request / claim. Big files keep their name and size only (demo). */
function attachFiles(S, ctx, entityType, entityId, files, companyId, employeeId) {
  S.files = S.files || [];
  for (const f of (files || []).slice(0, 8)) {
    if (!f || !f.name) continue;
    if (!FILE_TYPES.includes(f.type)) fail(`${f.name}: only PDF, JPG and PNG files can be attached.`);
    S.files.push({ id: ctx.id("fl"), entityType, entityId, companyId, employeeId, fileName: String(f.name).slice(0, 120), mimeType: f.type, sizeBytes: Number(f.size) || 0, data: f.data && String(f.data).length < FILE_KEEP_MAX * 1.4 ? f.data : undefined, uploadedByName: ctx.actor.displayName, createdAt: ctx.now });
  }
  const n = (files || []).length;
  if (n) ctx.audit({ module: "documents", action: "ATTACH", companyId, summary: `${ctx.actor.displayName} attached ${n} file${n === 1 ? "" : "s"} to ${entityType.replace(/([A-Z])/g, " $1").trim().toLowerCase()}.` });
}
const filesOf = (entityType, entityId) => (S.files || []).filter((f) => f.entityType === entityType && f.entityId === entityId);
const latestComp = (empId) => S.compensations.filter((c) => c.employeeId === empId).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0];

/* wrap the existing reducers so the files land on the record they created */
(function () {
  const wrap = (type, entityType, list, pick) => {
    const orig = R[type];
    R[type] = function (S, p, ctx) {
      const before = S[list].length;
      orig(S, p, ctx);
      const rec = S[list][before];
      if (rec && p.files?.length) attachFiles(S, ctx, entityType, rec.id, p.files, rec.companyId, pick(rec, ctx));
    };
  };
  wrap("leave.request", "LeaveRequest", "leaveRequests", (r) => r.employeeId);
  wrap("expense.submit", "ExpenseClaim", "expenseClaims", (r) => r.employeeId);
  wrap("request.create", "EmployeeRequest", "requests", (r) => r.employeeId);
  wrap("pr.create", "PurchaseRequest", "purchaseRequests", (r, ctx) => ctx.auth.employee?.id);
})();

Object.assign(R, {
  "file.attach"(S, p, ctx) {
    const list = { EmployeeRequest: S.requests, LeaveRequest: S.leaveRequests, ExpenseClaim: S.expenseClaims, PurchaseRequest: S.purchaseRequests }[p.entityType];
    const rec = list && byId(list, p.entityId);
    if (!rec) fail("That record no longer exists.");
    ctx.company(rec.companyId);
    attachFiles(S, ctx, p.entityType, rec.id, p.files, rec.companyId, rec.employeeId);
  },
  "employee.move"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const e = byId(S.employees, p.employeeId), d = byId(S.departments, p.departmentId);
    if (!e || !d) fail("That person or department no longer exists.");
    ctx.company(e.companyId);
    if (d.companyId !== e.companyId) fail(`${d.name} belongs to another company — people can only move within their own company.`);
    if (e.departmentId === d.id) return;
    const from = byId(S.departments, e.departmentId)?.name || "no department";
    e.departmentId = d.id;
    ctx.audit({ module: "hr", action: "UPDATE", entityType: "Employee", entityId: e.id, companyId: e.companyId, summary: `${ctx.actor.displayName} moved ${empName(e)} from ${from} to ${d.name}.` });
  },
  "employee.setActive"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const e = byId(S.employees, p.employeeId);
    if (!e) fail("That person no longer exists.");
    ctx.company(e.companyId);
    const u = S.users.find((x) => x.employeeId === e.id);
    if (!p.active && u?.id === ctx.actor.id) fail("You can't deactivate yourself.");
    if (!p.active && u?.isDemoUser) fail("This person is one of the demo sign-ins on the login page, so they stay active. Deactivate anyone else to see how it works.");
    const from = e.status;
    e.status = p.active ? "ACTIVE" : "INACTIVE";
    if (u) u.isActive = !!p.active;
    ctx.audit({ module: "hr", action: "STATUS_CHANGE", entityType: "Employee", entityId: e.id, companyId: e.companyId, summary: `${ctx.actor.displayName} ${p.active ? "reactivated" : "deactivated"} ${empName(e)} (was ${from.toLowerCase()})${u ? ` — sign-in ${p.active ? "on" : "off"}` : ""}.` });
  },
  "employee.salary"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const e = byId(S.employees, p.employeeId);
    if (!e) fail("That person no longer exists.");
    ctx.company(e.companyId);
    const payType = p.payType === "HOURLY" ? "HOURLY" : "SALARY";
    const amt = Number(p.amountCents);
    if (!p.effectiveDate) fail("Pick the date the new pay starts.");
    if (!(amt > 0)) fail("Enter the new salary or hourly rate.");
    if (payType === "HOURLY" && amt > 50000) fail("That hourly rate looks too high — did you mean an annual salary?");
    if (payType === "SALARY" && amt < 1000000) fail("That salary looks too low — did you mean an hourly rate?");
    const prev = latestComp(e.id);
    const reason = (p.reason || "").trim() || "Pay change";
    S.compensations.push({ id: ctx.id("cmp"), employeeId: e.id, effectiveDate: p.effectiveDate, payType, annualSalaryCents: payType === "SALARY" ? amt : undefined, hourlyRateCents: payType === "HOURLY" ? amt : undefined, payFrequency: p.payFrequency || prev?.payFrequency || "BIWEEKLY", overtimeEligible: p.overtimeEligible ? 1 : 0, bonusEligible: prev?.bonusEligible || 0, changeReason: reason });
    const fmt = (c) => (c ? (c.payType === "HOURLY" ? `${money(c.hourlyRateCents)}/h` : `${money(c.annualSalaryCents)}/yr`) : "—");
    ctx.audit({ module: "hr", action: "UPDATE", entityType: "Employee", entityId: e.id, companyId: e.companyId, summary: `${ctx.actor.displayName} changed ${empName(e)}'s pay from ${fmt(prev)} to ${payType === "HOURLY" ? `${money(amt)}/h` : `${money(amt)}/yr`}, effective ${dLong(p.effectiveDate)} — ${reason}.` });
  },
  "timesheet.remind"(S, p, ctx) {
    if (!can(ctx.auth, "payroll.view") && !can(ctx.auth, "hr.employees.edit")) fail("Your role doesn't allow this.");
    const rows = periodStatusRows(S, ctx.auth, p.periodStart);
    const late = rows.filter((r) => ["NOT_STARTED", "DRAFT", "REJECTED"].includes(r.status));
    for (const r of late) { const u = userOfEmployee(S, r.e.id); if (u) ctx.notify(u.id, { type: "TIMESHEET", title: "Please send in your timesheet", body: `${periodLabel(p.periodStart, periodEndFor(p.periodStart))} — payroll is waiting on it.`, linkUrl: "/me/time" }); }
    ctx.audit({ module: "timesheets", action: "UPDATE", summary: `${ctx.actor.displayName} reminded ${late.length} people to send in their ${periodLabel(p.periodStart, periodEndFor(p.periodStart))} timesheet.` });
  },
});

/* ---------------- timesheet status (HR / payroll) ---------------- */
const TS_LABEL = { NOT_STARTED: "Not started", DRAFT: "Draft", REJECTED: "Sent back", SUBMITTED: "Waiting for approval", APPROVED: "Approved", LOCKED: "In payroll" };
const tsDone = (s) => s === "APPROVED" || s === "LOCKED";
function periodStatusRows(S, auth, start) {
  const ids = scopeIds(S, auth);
  const end = periodEndFor(start);
  return S.employees.filter((e) => ids.includes(e.companyId) && ["ACTIVE", "ON_LEAVE", "ONBOARDING"].includes(e.status) && e.startDate <= end)
    .sort((a, b) => a.companyId.localeCompare(b.companyId) || a.lastName.localeCompare(b.lastName))
    .map((e) => { const sheet = S.timesheets.find((t) => t.employeeId === e.id && t.periodStart === start) || null; return { e, sheet, status: sheet?.status || "NOT_STARTED" }; });
}

"use strict";
/* ==========================================================================
   HAICO Group platform — live browser edition
   core.js: utilities, permissions, and the event engine.
   Every change anyone makes is an EVENT; state = demo seed + events replayed
   in order. Reducers mirror the platform's server rules (approvals follow
   the reporting line, the ledger only accepts balanced entries in open
   periods, payroll uses the editable 2026 tax table).
   ========================================================================== */

const SEED = JSON.parse(document.getElementById("seed").textContent);

/* ---------------- extension points (benchmark modules add themselves here) ---------------- */
function injectCss(css) { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }
window.FORMS_EXT = []; window.ACTIONS_EXT = [];
/* ---------------- formatting ---------------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CAD = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const CAD0 = new Intl.NumberFormat("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (c) => (c == null ? "—" : CAD.format(c / 100));
const amount = (c) => (c == null ? "—" : CAD0.format(c / 100));
const hrs = (h) => (h == null ? "—" : Number(h).toFixed(2));
function moneyCompact(c) {
  const d = c / 100, a = Math.abs(d);
  if (a >= 1e6) return `$${(d / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `$${(d / 1e3).toFixed(1)}K`;
  return CAD.format(d);
}
function toCents(v) {
  const s = String(v ?? "").replace(/[$,\s]/g, "");
  if (!s || s === "-") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/* ---------------- dates (date-only values are "YYYY-MM-DD", pinned to UTC noon) ---------------- */
const MS_DAY = 86400000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const D = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
const ymd = (dt) => dt.toISOString().slice(0, 10);
const addDays = (s, n) => ymd(new Date(D(s).getTime() + n * MS_DAY));
const dowOf = (s) => D(s).getUTCDay();
const isWeekend = (s) => { const w = dowOf(s); return w === 0 || w === 6; };
function todayStr() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; }
function eachDate(a, b) { const out = []; for (let s = a; s <= b; s = addDays(s, 1)) out.push(s); return out; }
const PERIOD_ANCHOR = "2026-01-05";
function periodStartFor(s, cadence = "BIWEEKLY") {
  const monday = addDays(s, -((dowOf(s) + 6) % 7));
  if (cadence === "WEEKLY") return monday;
  const diff = Math.round((D(monday) - D(PERIOD_ANCHOR)) / MS_DAY);
  return addDays(monday, -(((diff % 14) + 14) % 14));
}
const periodEndFor = (start, cadence = "BIWEEKLY") => addDays(start, cadence === "WEEKLY" ? 6 : 13);
const dShort = (s) => { const d = D(s); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const dLong = (s) => { if (!s) return "—"; const d = D(s); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const periodLabel = (a, b) => `${dShort(a)} – ${dLong(b)}`;
function dTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-CA", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return dTime(iso);
}

/* ---------------- statuses ---------------- */
const STATUS = {
  ACTIVE: ["Active", "green"], INACTIVE: ["Inactive", "grey"], ONBOARDING: ["Onboarding", "blue"], ON_LEAVE: ["On leave", "amber"],
  TERMINATED: ["Ended", "grey"], DRAFT: ["Draft", "grey"], SUBMITTED: ["Submitted", "amber"], PENDING_APPROVAL: ["Waiting for approval", "amber"],
  PENDING: ["Waiting", "amber"], APPROVED: ["Approved", "green"], REJECTED: ["Not approved", "red"], CANCELLED: ["Cancelled", "grey"],
  LOCKED: ["Locked", "ink"], OPEN: ["Open", "teal"], IN_PROGRESS: ["In progress", "blue"], RESOLVED: ["Done", "green"], COMPLETE: ["Done", "green"],
  CONVERTED: ["Converted to PO", "teal"], WITHDRAWN: ["Withdrawn", "grey"], CALCULATED: ["Calculated", "teal"], POSTED: ["Posted", "blue"],
  ISSUED: ["Issued", "green"], REVERSED: ["Reversed", "red"], SENT: ["Sent", "teal"], PARTIALLY_PAID: ["Partly paid", "blue"], PAID: ["Paid", "green"],
  REIMBURSED: ["Paid back", "green"], OVERDUE: ["Overdue", "red"], VOID: ["Void", "grey"], RECEIVED: ["Received", "green"], CLOSED: ["Closed", "ink"],
  UNMATCHED: ["Not matched", "amber"], MATCHED: ["Matched", "teal"], RECONCILED: ["Reconciled", "green"], COMPLETED: ["Completed", "green"],
  FULLY_DEPRECIATED: ["Fully depreciated", "grey"], DISPOSED: ["Disposed", "grey"], NEW: ["New", "amber"],
};
const badge = (s, extra = "") => { const m = STATUS[s] || [s, "grey"]; return `<span class="badge tone-${m[1]} ${extra}">${esc(m[0])}</span>`; };
const EMPLOYMENT = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", SEASONAL: "Seasonal" };

/* ---------------- permissions (same catalog as src/lib/permissions.ts) ---------------- */
const PERMS = ["ess.access", "hr.employees.view", "hr.employees.create", "hr.employees.edit", "hr.employees.delete", "hr.org.manage", "hr.onboarding.manage",
  "timesheets.view", "timesheets.approve", "leave.view", "leave.approve", "leave.manage", "payroll.view", "payroll.run", "payroll.approve", "payroll.post", "payroll.admin",
  "finance.view", "finance.post", "finance.periods", "finance.coa.manage", "ap.view", "ap.create", "ap.approve", "ap.pay", "ar.view", "ar.create", "ar.receive",
  "banking.view", "banking.reconcile", "expenses.view", "expenses.approve", "expenses.reimburse", "assets.view", "assets.manage", "budgets.view", "budgets.manage",
  "interco.manage", "procurement.view", "procurement.create", "procurement.approve", "procurement.receive", "projects.view", "projects.manage",
  "documents.view", "documents.manage", "reports.view", "reports.exec", "admin.users", "admin.roles", "admin.companies", "admin.workflows", "admin.settings", "audit.view"];
const ROLES = {
  SUPER_ADMIN: { name: "Super Administrator", grants: ["*"] },
  GROUP_ADMIN: { name: "Group Administrator", grants: ["*"], minus: ["admin.roles", "admin.settings"] },
  COMPANY_ADMIN: { name: "Company Administrator", grants: ["ess.access", "hr.*", "timesheets.*", "leave.*", "payroll.view", "payroll.run", "payroll.approve", "finance.view", "ap.*", "ar.*", "banking.*", "expenses.*", "assets.view", "budgets.view", "procurement.*", "projects.*", "documents.*", "reports.view"] },
  HR_MANAGER: { name: "HR Manager", grants: ["ess.access", "hr.*", "timesheets.view", "timesheets.approve", "leave.*", "documents.*", "expenses.view", "reports.view"] },
  PAYROLL_ADMIN: { name: "Payroll Administrator", grants: ["ess.access", "payroll.*", "timesheets.view", "leave.view", "hr.employees.view", "documents.view", "reports.view"] },
  FINANCE_MANAGER: { name: "Finance Manager", grants: ["ess.access", "finance.*", "ap.*", "ar.*", "banking.*", "expenses.*", "assets.*", "budgets.*", "interco.manage", "procurement.view", "procurement.create", "procurement.approve", "payroll.view", "payroll.run", "payroll.approve", "payroll.post", "payroll.admin", "timesheets.view", "leave.view", "hr.employees.view", "projects.view", "projects.manage", "documents.*", "reports.view", "reports.exec"] },
  ACCOUNTANT: { name: "Accountant", grants: ["ess.access", "finance.view", "finance.post", "ap.view", "ap.create", "ar.view", "ar.create", "ar.receive", "banking.view", "banking.reconcile", "expenses.view", "assets.view", "budgets.view", "documents.view", "reports.view"] },
  AP_CLERK: { name: "AP Clerk", grants: ["ess.access", "ap.view", "ap.create", "documents.view", "documents.manage"] },
  AR_CLERK: { name: "AR Clerk", grants: ["ess.access", "ar.view", "ar.create", "ar.receive", "documents.view"] },
  MANAGER: { name: "Manager", grants: ["ess.access", "hr.employees.view", "timesheets.view", "timesheets.approve", "leave.view", "leave.approve", "expenses.view", "expenses.approve", "procurement.view", "procurement.create", "projects.view", "reports.view"] },
  EMPLOYEE: { name: "Employee", grants: ["ess.access"] },
  AUDITOR: { name: "Auditor", grants: ["hr.employees.view", "timesheets.view", "leave.view", "payroll.view", "finance.view", "ap.view", "ar.view", "banking.view", "expenses.view", "assets.view", "budgets.view", "procurement.view", "projects.view", "documents.view", "reports.view", "audit.view"] },
  EXECUTIVE: { name: "Executive Director", grants: ["reports.view", "reports.exec", "finance.view", "payroll.view", "ap.view", "ar.view", "hr.employees.view", "projects.view", "budgets.view", "documents.view"] },
};
function expandGrants(role) {
  const out = new Set();
  for (const g of role.grants) {
    if (g === "*") PERMS.forEach((p) => out.add(p));
    else if (g.endsWith(".*")) { const pre = g.slice(0, -1); PERMS.filter((p) => p.startsWith(pre)).forEach((p) => out.add(p)); }
    else if (PERMS.includes(g)) out.add(g);
  }
  (role.minus || []).forEach((p) => out.delete(p));
  return out;
}
const ROLE_PERMS = Object.fromEntries(Object.entries(ROLES).map(([k, r]) => [k, expandGrants(r)]));

/* ---------------- lookups ---------------- */
const byId = (list, id) => list.find((x) => x.id === id);
const empName = (e) => (e ? `${e.firstName} ${e.lastName}` : "—");
const initials = (name) => String(name).split(" ").map((w) => w[0]).slice(0, 2).join("");
const pad = (n, w) => String(n).padStart(w, "0");
function nextNum(values, prefix, width) {
  let max = 0;
  for (const v of values) if (v && v.startsWith(prefix + "-")) { const n = parseInt(v.slice(prefix.length + 1), 10); if (n > max) max = n; }
  return `${prefix}-${pad(max + 1, width)}`;
}

/* ---------------- auth ---------------- */
function authFor(S, userId, activeCompanyId = null) {
  const user = byId(S.users, userId);
  if (!user) return null;
  const roles = S.userRoles.filter((r) => r.userId === userId);
  const perms = new Set();
  let all = !!user.isSuperAdmin;
  const cos = new Set();
  for (const r of roles) {
    (ROLE_PERMS[r.roleCode] || []).forEach((p) => perms.add(p));
    if (!r.companyId) all = true; else cos.add(r.companyId);
  }
  const employee = user.employeeId ? byId(S.employees, user.employeeId) : null;
  if (employee) cos.add(employee.companyId);
  const companyIds = all ? null : [...cos];
  const active = activeCompanyId && (companyIds == null || companyIds.includes(activeCompanyId)) ? activeCompanyId : null;
  return {
    user, employee, isSuper: !!user.isSuperAdmin, roleCodes: roles.map((r) => r.roleCode),
    roleNames: [...new Set(roles.map((r) => ROLES[r.roleCode]?.name || r.roleCode))], perms, companyIds, activeCompanyId: active,
    multiCompany: all || new Set(roles.map((r) => r.companyId).filter(Boolean)).size > 1,
  };
}
const can = (a, p) => !!a && (a.isSuper || a.perms.has(p));
const canSee = (a, companyId) => a.companyIds == null || a.companyIds.includes(companyId);
/** company ids the current view covers (active company, or everything accessible) */
function scopeIds(S, a) {
  if (a.activeCompanyId) return [a.activeCompanyId];
  return S.companies.filter((c) => canSee(a, c.id)).map((c) => c.id);
}
const inView = (S, a, companyId) => scopeIds(S, a).includes(companyId);
const userOfEmployee = (S, empId) => S.users.find((u) => u.employeeId === empId && u.isActive !== false);

/* ==========================================================================
   Engine
   ========================================================================== */
class ActionError extends Error {}
const fail = (msg) => { throw new ActionError(msg); };

let freshState = function () {
  const S = structuredClone(SEED);
  S.audit = []; S.feedback = []; S.purchaseRequests = []; S.purchaseOrders = S.purchaseOrders || []; S.approvalActions = [];
  S.applied = 0; S.rejected = []; S.emails = []; S.requests = []; S.files = [];
  // approval workflows for the request centre (group defaults)
  const addWf = (id, code, name, steps) => { S.workflows.push({ id, code, name, isActive: true }); steps.forEach(([seq, nm, type, role, min], i) => S.workflowSteps.push({ id: `${id}_s${i + 1}`, workflowId: id, sequence: seq, name: nm, approverType: type, roleCode: role || undefined, thresholdMinCents: min })); };
  addWf("wf_travel_request", "TRAVEL_REQUEST", "Travel requests", [[1, "Manager approval", "MANAGER", null, 0], [2, "Finance approval", "ROLE", "FINANCE_MANAGER", 200000]]);
  addWf("wf_credit_card", "CREDIT_CARD_PURCHASE", "Credit card purchases", [[1, "Manager approval", "MANAGER", null, 0], [2, "Finance approval", "ROLE", "FINANCE_MANAGER", 100000]]);
  addWf("wf_travel_claim", "TRAVEL_CLAIM", "Travel claims", [[1, "Manager approval", "MANAGER", null, 0], [2, "Finance approval", "ROLE", "FINANCE_MANAGER", 50000]]);
  for (const r of S.payrollRuns) r.warnings = r.warnings || [];
  // the seed export wrote a couple of timestamps as epoch milliseconds; the views expect ISO strings
  for (const b of S.apInvoices) if (typeof b.matchedAt === "number") b.matchedAt = new Date(b.matchedAt).toISOString();
  return S;
};

const EMAIL_INTRO = { APPROVAL_REQUIRED: "A request is waiting for your approval.", APPROVED: "Good news — this has been approved.", REJECTED: "This was not approved. The note from the approver, if any, is below.", PAYROLL: "Your pay has been processed.", TIMESHEET: "A timesheet needs your attention.", SYSTEM: "There is an update for you on the platform." };
function renderEmail(toName, n) {
  const subject = `[HAICO Group platform] ${n.title}`;
  const bodyText = [`Hi ${toName.split(" ")[0]},`, "", EMAIL_INTRO[n.type] || EMAIL_INTRO.SYSTEM, "", n.title, n.body || "", "", `Open it here: ${n.linkUrl || "/"}`, "", "— HAICO Group platform (automatic message; replies are not read)", "DEMO: this message was kept in the outbox and not delivered."].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
  return { subject, bodyText };
}

function mkCtx(S, ev) {
  let k = 0;
  const auth = authFor(S, ev.actor, null);
  if (!auth) fail("Unknown user.");
  const ctx = {
    ev, auth, actor: auth.user, now: new Date(ev.ts).toISOString(),
    id: (p) => `${p}_${ev.id}_${k++}`,
    audit(o) { S.audit.push({ id: ctx.id("au"), at: ctx.now, actorName: auth.user.displayName, ...o }); },
    notify(userId, n) {
      if (!userId) return;
      S.notifications.push({ id: ctx.id("n"), userId, isRead: false, createdAt: ctx.now, ...n });
      const u = byId(S.users, userId);
      if (u) S.emails.push({ id: ctx.id("em"), userId, toName: u.displayName, toEmail: u.email, kind: n.type, createdAt: ctx.now, ...renderEmail(u.displayName, n) });
    },
    notifyPerm(perm, companyId, n, exclude) {
      for (const u of S.users) {
        if (u.id === exclude || u.isActive === false) continue;
        const a = authFor(S, u.id);
        if (a && can(a, perm) && canSee(a, companyId)) ctx.notify(u.id, n);
      }
    },
    need(perm) { if (!can(auth, perm)) fail("Your role doesn't allow this."); },
    company(companyId) { if (!canSee(auth, companyId)) fail("That company is outside your access."); },
  };
  return ctx;
}

function applyEvent(S, ev) {
  const fn = R[ev.type];
  if (!fn) fail("This action isn't supported in this version.");
  fn(S, ev.p || {}, mkCtx(S, ev));
  S.applied++;
}

/* ---------------- ledger ---------------- */
function checkJournal(S, input) {
  const dr = input.lines.reduce((s, l) => s + (l.debitCents || 0), 0);
  const cr = input.lines.reduce((s, l) => s + (l.creditCents || 0), 0);
  if (dr !== cr) fail(`Journal is out of balance: debits ${money(dr)} ≠ credits ${money(cr)}.`);
  if (dr === 0) fail("Journal has no amounts.");
  const period = S.fiscalPeriods.find((p) => p.companyId === input.companyId && p.startDate <= input.date && p.endDate >= input.date);
  if (!period) fail("No accounting period exists for this date.");
  if (period.status !== "OPEN") fail(`Accounting period ${period.fiscalYear}-P${period.periodNumber} is closed.`);
  const accts = new Map();
  for (const l of input.lines) {
    const a = S.accounts.find((x) => x.companyId === input.companyId && x.number === l.accountNumber);
    if (!a) fail(`Account ${l.accountNumber} does not exist in this company's chart.`);
    if (a.isPostable === false || a.isActive === false) fail(`Account ${l.accountNumber} — ${a.name} is not postable.`);
    accts.set(l.accountNumber, a);
  }
  return { period, accts, dr };
}
function postJournal(S, ctx, input) {
  const { period, accts, dr } = checkJournal(S, input);
  const year = input.date.slice(0, 4);
  const entryNumber = nextNum(S.journalEntries.filter((j) => j.companyId === input.companyId).map((j) => j.entryNumber), `JE-${year}`, 5);
  const je = {
    id: ctx.id("je"), companyId: input.companyId, entryNumber, date: input.date, periodId: period.id, reference: input.reference, memo: input.memo,
    source: input.source, sourceType: input.sourceType, sourceId: input.sourceId, status: "POSTED", totalDebitCents: dr, totalCreditCents: dr,
    postedByName: ctx.actor.displayName, postedAt: ctx.now,
  };
  S.journalEntries.push(je);
  input.lines.forEach((l, i) => {
    if (!(l.debitCents || l.creditCents)) return;
    S.journalLines.push({ id: ctx.id("jl"), journalEntryId: je.id, accountId: accts.get(l.accountNumber).id, debitCents: l.debitCents || 0, creditCents: l.creditCents || 0, description: l.description, departmentId: l.departmentId, projectId: l.projectId, sortOrder: i });
  });
  return je;
}
const GL = { BANK: "1010", AR: "1200", GST_REC: "1310", AP: "2010", PAYROLL_LIAB: "2300", GST_PAY: "2410", REVENUE: "4000", WAGES: "5100", EMPLOYER: "5150" };
function bankTxn(S, ctx, companyId, date, description, amountCents, type) {
  const bank = S.bankAccounts.find((b) => b.companyId === companyId);
  if (bank) S.bankTransactions.push({ id: ctx.id("bt"), bankAccountId: bank.id, date, description, amountCents, type, status: "MATCHED" });
}

/* ---------------- approvals (same rules as src/lib/approvals.ts) ---------------- */
const STEP_ROLE_NOTIFY = { FINANCE_MANAGER: "ap.approve", HR_MANAGER: "leave.approve", EXECUTIVE: "reports.exec", PAYROLL_ADMIN: "payroll.approve" };
const activeSteps = (S, inst) => S.workflowSteps.filter((s) => s.workflowId === inst.workflowId && inst.amountCents >= (s.thresholdMinCents || 0)).sort((a, b) => a.sequence - b.sequence);

function resolveManager(S, requesterEmployeeId, requestedById) {
  if (!requesterEmployeeId) return null;
  let cur = byId(S.employees, requesterEmployeeId);
  let hops = 0;
  while (cur?.managerId && hops < 6) {
    const mgr = byId(S.employees, cur.managerId);
    if (!mgr) break;
    const u = userOfEmployee(S, mgr.id);
    if (u && u.id !== requestedById) return { userId: u.id, name: empName(mgr) };
    cur = mgr; hops++;
  }
  return null;
}

function canActOn(S, a, inst) {
  if (inst.status !== "PENDING") return null;
  const step = activeSteps(S, inst).find((s) => s.sequence === inst.currentStep);
  if (!step) return null;
  if (inst.requestedById === a.user.id && !a.isSuper) return null;
  if (a.isSuper) return step;
  if (step.approverType === "MANAGER") {
    const requester = byId(S.users, inst.requestedById);
    const res = resolveManager(S, requester?.employeeId, inst.requestedById);
    if (res && res.userId === a.user.id) return step;
    if (!res && a.roleCodes.some((r) => ["HR_MANAGER", "COMPANY_ADMIN", "GROUP_ADMIN"].includes(r))) return step;
    return null;
  }
  if (step.roleCode) {
    const holds = S.userRoles.some((r) => r.userId === a.user.id && r.roleCode === step.roleCode && (!r.companyId || r.companyId === inst.companyId));
    if (holds) return step;
  }
  return null;
}
function whoIsNext(S, inst) {
  const step = activeSteps(S, inst).find((s) => s.sequence === inst.currentStep);
  if (!step) return "";
  if (step.approverType === "MANAGER") {
    const requester = byId(S.users, inst.requestedById);
    const res = resolveManager(S, requester?.employeeId, inst.requestedById);
    return res ? res.name : "HR";
  }
  return ROLES[step.roleCode]?.name || step.name;
}

function notifyStep(S, ctx, inst) {
  const step = activeSteps(S, inst).find((s) => s.sequence === inst.currentStep);
  if (!step) return;
  const n = { type: "APPROVAL_REQUIRED", title: `Approval needed: ${inst.entityLabel}`, body: inst.amountCents > 0 ? `${money(inst.amountCents)} · step ${step.name}` : `Step: ${step.name}`, linkUrl: "/approvals" };
  if (step.approverType === "MANAGER") {
    const requester = byId(S.users, inst.requestedById);
    const res = resolveManager(S, requester?.employeeId, inst.requestedById);
    if (res) ctx.notify(res.userId, n);
    return;
  }
  ctx.notifyPerm(STEP_ROLE_NOTIFY[step.roleCode] || "reports.exec", inst.companyId, n, inst.requestedById);
}

function startApproval(S, ctx, o) {
  const wf = S.workflows.find((w) => w.code === o.workflowCode && w.companyId === o.companyId && w.isActive !== false)
    || S.workflows.find((w) => w.code === o.workflowCode && !w.companyId && w.isActive !== false);
  if (!wf) fail(`No approval workflow configured for ${o.workflowCode}.`);
  const amt = o.amountCents || 0;
  const steps = S.workflowSteps.filter((s) => s.workflowId === wf.id && amt >= (s.thresholdMinCents || 0)).sort((a, b) => a.sequence - b.sequence);
  if (!steps.length) return null;
  const inst = {
    id: ctx.id("ai"), workflowId: wf.id, companyId: o.companyId, entityType: o.entityType, entityId: o.entityId, entityLabel: o.entityLabel,
    amountCents: amt, requestedById: ctx.actor.id, currentStep: steps[0].sequence, totalSteps: steps.length, status: "PENDING", createdAt: ctx.now,
  };
  S.approvals.push(inst);
  notifyStep(S, ctx, inst);
  ctx.notify(ctx.actor.id, { type: "SYSTEM", title: `Sent for approval: ${o.entityLabel}`, body: `${steps.length} step${steps.length > 1 ? "s" : ""} · first: ${steps[0].name}. You'll get an email at each decision.`, linkUrl: "/me/requests" });
  ctx.audit({ module: "approvals", action: "SUBMIT", companyId: o.companyId, summary: `${ctx.actor.displayName} sent ${o.entityLabel} for approval (${steps.length} step${steps.length > 1 ? "s" : ""}).` });
  return inst;
}

/** the ledger entry a vendor bill posts when its approval finishes */
function billJournal(S, inv) {
  const vendor = byId(S.vendors, inv.vendorId);
  const lines = S.apLines.filter((l) => l.apInvoiceId === inv.id).map((l) => ({ accountNumber: l.accountNumber, debitCents: l.amountCents, description: l.description, departmentId: l.departmentId, projectId: l.projectId }));
  if (inv.taxCents > 0) lines.push({ accountNumber: GL.GST_REC, debitCents: inv.taxCents, description: "GST on purchases" });
  lines.push({ accountNumber: GL.AP, creditCents: inv.totalCents, description: `${vendor?.name} payable` });
  return { companyId: inv.companyId, date: inv.invoiceDate, memo: `Vendor bill ${inv.invoiceNumber} — ${vendor?.name}`, source: "AP", sourceType: "ApInvoice", sourceId: inv.id, reference: inv.invoiceNumber, lines };
}

function applyOutcome(S, ctx, inst, outcome) {
  const ok = outcome === "APPROVED";
  switch (inst.entityType) {
    case "LeaveRequest": {
      const lr = byId(S.leaveRequests, inst.entityId);
      if (!lr) return;
      Object.assign(lr, { status: ok ? "APPROVED" : "REJECTED", decidedByName: ctx.actor.displayName, decidedAt: ctx.now });
      if (ok) {
        const bal = S.leaveBalances.find((b) => b.employeeId === lr.employeeId && b.leaveTypeId === lr.leaveTypeId && b.year === Number(lr.startDate.slice(0, 4)));
        if (bal) bal.usedHours = (bal.usedHours || 0) + lr.totalHours;
        autofillLeave(S, ctx, lr);
      }
      return;
    }
    case "ExpenseClaim": { const x = byId(S.expenseClaims, inst.entityId); if (x) x.status = ok ? "APPROVED" : "REJECTED"; return; }
    case "PurchaseRequest": { const x = byId(S.purchaseRequests, inst.entityId); if (x) x.status = ok ? "APPROVED" : "REJECTED"; return; }
    case "EmployeeRequest": { const x = byId(S.requests, inst.entityId); if (x) Object.assign(x, { status: ok ? "APPROVED" : "REJECTED", decidedByName: ctx.actor.displayName, decidedAt: ctx.now }); return; }
    case "ApInvoice": {
      const inv = byId(S.apInvoices, inst.entityId);
      if (!inv) return;
      if (!ok) { inv.status = "DRAFT"; return; }
      if (inv.journalEntryId) return;
      const je = postJournal(S, ctx, billJournal(S, inv));
      Object.assign(inv, { status: "APPROVED", journalEntryId: je.id, postedAt: ctx.now });
      ctx.audit({ module: "finance.ap", action: "POST", companyId: inv.companyId, summary: `Bill ${inv.invoiceNumber} (${money(inv.totalCents)}) approved and posted to the ledger as ${je.entryNumber}.` });
      return;
    }
    case "PayrollRun": {
      const run = byId(S.payrollRuns, inst.entityId);
      if (!run) return;
      if (ok) Object.assign(run, { status: "APPROVED", approvedByName: ctx.actor.displayName, approvedAt: ctx.now });
      else run.status = "CALCULATED";
      return;
    }
  }
}

/* ---------------- time ---------------- */
const settingsFor = (S, companyId) => S.payrollSettings.find((s) => s.companyId === companyId) || { dailyOtThreshold: 8, dailyDoubleOtThreshold: 12, weeklyOtThreshold: 40, standardHoursPerDay: 8, timesheetCadence: "BIWEEKLY" };
const LEAVE_FIELD = { VACATION: "vacationHours", SICK: "sickHours", PERSONAL: "personalHours", BANKED_OT: "otherLeaveHours", OTHER: "otherLeaveHours" };
const HOUR_FIELDS = ["workedHours", "statHours", "bankedOtHours", "vacationHours", "sickHours", "personalHours", "otherLeaveHours"];

function recomputeSheet(S, sheet) {
  const es = S.timesheetEntries.filter((e) => e.timesheetId === sheet.id);
  for (const f of HOUR_FIELDS) sheet[f] = es.reduce((s, e) => s + (e[f] || 0), 0);
}
function classifyOvertime(daily, rules) {
  let regular = 0, ot = 0, dot = 0;
  const weeks = new Map();
  for (const d0 of daily) { const w = periodStartFor(d0.date, "WEEKLY"); if (!weeks.has(w)) weeks.set(w, []); weeks.get(w).push(d0); }
  for (const days of weeks.values()) {
    let wr = 0;
    for (const { hours } of days) {
      const dbl = Math.max(0, hours - rules.dailyDouble);
      const single = Math.max(0, Math.min(hours, rules.dailyDouble) - rules.dailyOt);
      dot += dbl; ot += single; wr += hours - single - dbl;
    }
    if (wr > rules.weeklyOt) { ot += wr - rules.weeklyOt; wr = rules.weeklyOt; }
    regular += wr;
  }
  return { regular, ot, dot };
}
const rulesOf = (st) => ({ dailyOt: st.dailyOtThreshold ?? 8, dailyDouble: st.dailyDoubleOtThreshold ?? 12, weeklyOt: st.weeklyOtThreshold ?? 40 });
function sheetOvertime(S, sheet) {
  const daily = new Map();
  for (const e of S.timesheetEntries) if (e.timesheetId === sheet.id) daily.set(e.date, (daily.get(e.date) || 0) + (e.workedHours || 0));
  return classifyOvertime([...daily].map(([date, hours]) => ({ date, hours })), rulesOf(settingsFor(S, sheet.companyId)));
}
function ensureSheet(S, ctx, emp, periodStart) {
  const st = settingsFor(S, emp.companyId);
  let sheet = S.timesheets.find((t) => t.employeeId === emp.id && t.periodStart === periodStart);
  if (!sheet) {
    sheet = { id: ctx.id("ts"), companyId: emp.companyId, employeeId: emp.id, periodStart, periodEnd: periodEndFor(periodStart, st.timesheetCadence), status: "DRAFT" };
    HOUR_FIELDS.forEach((f) => (sheet[f] = 0));
    S.timesheets.push(sheet);
  }
  return sheet;
}
function autofillLeave(S, ctx, lr) {
  const emp = byId(S.employees, lr.employeeId);
  const st = settingsFor(S, emp.companyId);
  const lt = byId(S.leaveTypes, lr.leaveTypeId);
  const field = LEAVE_FIELD[lt?.code] || "otherLeaveHours";
  const stats = new Set(S.statHolidays.map((h) => h.date));
  const days = eachDate(lr.startDate, lr.endDate).filter((d) => !isWeekend(d) && !stats.has(d));
  if (!days.length) return;
  const perDay = lr.hoursPerDay ?? Math.min(st.standardHoursPerDay ?? 8, lr.totalHours / days.length);
  const touched = new Set();
  for (const d of days) {
    const sheet = ensureSheet(S, ctx, emp, periodStartFor(d, st.timesheetCadence));
    if (sheet.status === "LOCKED") continue;
    const ex = S.timesheetEntries.find((e) => e.timesheetId === sheet.id && e.date === d && e.sourceLeaveRequestId === lr.id);
    if (ex) ex[field] = perDay;
    else S.timesheetEntries.push({ id: ctx.id("te"), timesheetId: sheet.id, date: d, [field]: perDay, isAutoFilled: true, sourceLeaveRequestId: lr.id });
    touched.add(sheet);
  }
  touched.forEach((s) => recomputeSheet(S, s));
}
function autofillStats(S, ctx, sheet) {
  const st = settingsFor(S, sheet.companyId);
  for (const h of S.statHolidays) {
    if (h.date < sheet.periodStart || h.date > sheet.periodEnd || isWeekend(h.date)) continue;
    const has = S.timesheetEntries.some((e) => e.timesheetId === sheet.id && e.date === h.date && (e.statHours || 0) > 0);
    if (!has) S.timesheetEntries.push({ id: ctx.id("te"), timesheetId: sheet.id, date: h.date, statHours: st.standardHoursPerDay ?? 8, isAutoFilled: true, notes: h.name });
  }
}

/* ---------------- payroll (same math as src/lib/payroll.ts) ---------------- */
const PERIODS_PER_YEAR = 26;
function bracketTax(annual, brackets) {
  let tax = 0, last = 0;
  for (const b of brackets) {
    const top = b.upToCents ?? Number.MAX_SAFE_INTEGER;
    const slice = Math.min(annual, top) - last;
    if (slice <= 0) break;
    tax += slice * b.rate; last = top;
  }
  return tax;
}
function calculateRun(S, ctx, run) {
  const cfg = S.taxConfigs.find((t) => t.year === Number(run.periodStart.slice(0, 4)) && t.isActive !== false);
  if (!cfg) fail(`No tax configuration for ${run.periodStart.slice(0, 4)}. Add one in Payroll Settings.`);
  const tax = cfg.data;
  const rules = rulesOf(settingsFor(S, run.companyId));
  const people = S.employees.filter((e) => e.companyId === run.companyId && ["ACTIVE", "ONBOARDING"].includes(e.status) && S.payProfiles.find((p) => p.employeeId === e.id)?.payGroupId === run.payGroupId);
  const warnings = [];
  // clear a previous calculation
  const oldIds = new Set(S.payrollEntries.filter((p) => p.payrollRunId === run.id).map((p) => p.id));
  S.payrollEntries = S.payrollEntries.filter((p) => !oldIds.has(p.id));
  S.payrollLines = S.payrollLines.filter((l) => !oldIds.has(l.payrollEntryId));
  let G = 0, Dd = 0, E = 0, N = 0, count = 0;
  for (const p of people) {
    const name = empName(p);
    const comp = S.compensations.filter((c) => c.employeeId === p.id).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0];
    const prof = S.payProfiles.find((x) => x.employeeId === p.id) || {};
    if (!comp) { warnings.push({ employee: name, code: "NO_PAY", message: `${name} has no pay set up — skipped.` }); continue; }
    const lines = [];
    let insurable = 0;
    if (comp.payType === "HOURLY") {
      const rate = comp.hourlyRateCents || 0;
      const sheets = S.timesheets.filter((t) => t.employeeId === p.id && ["APPROVED", "LOCKED"].includes(t.status) && t.periodStart >= run.periodStart && t.periodEnd <= run.periodEnd);
      if (!sheets.length) warnings.push({ employee: name, code: "NO_TIMESHEET", message: `${name} has no approved timesheet in this period.` });
      const daily = new Map();
      let stat = 0, vac = 0, sick = 0, pers = 0, other = 0, banked = 0;
      for (const s of sheets) for (const e of S.timesheetEntries.filter((x) => x.timesheetId === s.id)) {
        daily.set(e.date, (daily.get(e.date) || 0) + (e.workedHours || 0));
        stat += e.statHours || 0; vac += e.vacationHours || 0; sick += e.sickHours || 0; pers += e.personalHours || 0; other += e.otherLeaveHours || 0; banked += e.bankedOtHours || 0;
      }
      const ot = classifyOvertime([...daily].map(([date, hours]) => ({ date, hours })), rules);
      if (ot.ot + ot.dot > 12) warnings.push({ employee: name, code: "HIGH_OT", message: `${name} has unusually high overtime (${(ot.ot + ot.dot).toFixed(1)} h).` });
      const push = (typeCode, description, h, mult, order) => {
        if (h <= 0) return;
        const r = Math.round(rate * mult);
        lines.push({ kind: "EARNING", typeCode, description, hours: h, rateCents: r, amountCents: Math.round(h * r), sortOrder: order });
      };
      push("REG", "Regular", ot.regular, 1, 1); push("OT", "Overtime 1.5×", ot.ot, 1.5, 2); push("OT2", "Overtime 2×", ot.dot, 2, 3);
      push("STAT", "Stat holiday pay", stat, 1, 4); push("VAC", "Vacation pay", vac, 1, 5); push("SICK", "Paid sick leave", sick, 1, 6);
      push("PERSONAL", "Personal leave", pers, 1, 7); push("OTHER", "Other paid leave", other + banked, 1, 8);
      insurable = ot.regular + ot.ot + ot.dot + stat + vac + sick + pers + other;
    } else {
      lines.push({ kind: "EARNING", typeCode: "SAL", description: "Salary", amountCents: Math.round((comp.annualSalaryCents || 0) / PERIODS_PER_YEAR), sortOrder: 1 });
      insurable = 80;
    }
    const gross = lines.reduce((s, l) => s + l.amountCents, 0);
    if (gross === 0) { warnings.push({ employee: name, code: "ZERO_PAY", message: `${name} has nothing to pay this period.` }); continue; }
    let ytdP = 0, ytdI = 0;
    for (const pe of S.payrollEntries) {
      if (pe.employeeId !== p.id) continue;
      const r = byId(S.payrollRuns, pe.payrollRunId);
      if (r && r.status === "POSTED" && r.payDate < run.payDate) { ytdP += pe.cppPensionableCents || 0; ytdI += pe.eiInsurableCents || 0; }
    }
    let cpp = 0, ei = 0;
    if (!prof.cppExempt) {
      const pens = Math.max(0, Math.min(gross, tax.cpp.maxPensionableCents - ytdP));
      cpp = Math.max(0, Math.round((pens - Math.round(tax.cpp.exemptionCents / PERIODS_PER_YEAR)) * tax.cpp.rate));
    }
    if (!prof.eiExempt) ei = Math.round(Math.max(0, Math.min(gross, tax.ei.maxInsurableCents - ytdI)) * tax.ei.rate);
    const annual = gross * PERIODS_PER_YEAR;
    const fed = Math.max(0, Math.round((bracketTax(annual, tax.federal.brackets) - tax.federal.bpaCents * tax.federal.brackets[0].rate) / PERIODS_PER_YEAR));
    const pd = tax.provincial[prof.provinceOfEmployment || "BC"] || tax.provincial.BC;
    const prov = Math.max(0, Math.round((bracketTax(annual, pd.brackets) - pd.bpaCents * pd.brackets[0].rate) / PERIODS_PER_YEAR));
    const dLines = [
      { kind: "DEDUCTION", typeCode: "CPP", description: "CPP contribution", amountCents: cpp, sortOrder: 10 },
      { kind: "DEDUCTION", typeCode: "EI", description: "EI premium", amountCents: ei, sortOrder: 11 },
      { kind: "DEDUCTION", typeCode: "FED_TAX", description: "Federal income tax", amountCents: fed + (prof.additionalTaxCents || 0), sortOrder: 12 },
      { kind: "DEDUCTION", typeCode: "PROV_TAX", description: "BC provincial tax", amountCents: prov, sortOrder: 13 },
    ].filter((l) => l.amountCents > 0);
    const eLines = [];
    if (cpp > 0) eLines.push({ kind: "EMPLOYER_COST", typeCode: "CPP", description: "CPP — employer", amountCents: cpp, sortOrder: 20 });
    if (ei > 0) eLines.push({ kind: "EMPLOYER_COST", typeCode: "EI", description: `EI — employer ${tax.ei.employerMultiple}×`, amountCents: Math.round(ei * tax.ei.employerMultiple), sortOrder: 21 });
    for (const b of S.benefits.filter((x) => x.employeeId === p.id && !x.endDate)) {
      const plan = byId(S.benefitPlans, b.planId);
      if (!plan) continue;
      if (plan.employeeCostCentsPerPay > 0) dLines.push({ kind: "DEDUCTION", typeCode: "EHC", description: `${plan.name} — employee`, amountCents: b.employeeCostCentsOverride ?? plan.employeeCostCentsPerPay, sortOrder: 15 });
      if (plan.employerCostCentsPerPay > 0) eLines.push({ kind: "EMPLOYER_COST", typeCode: "BENEFIT", description: `${plan.name} — employer`, amountCents: b.employerCostCentsOverride ?? plan.employerCostCentsPerPay, sortOrder: 25 });
    }
    const ded = dLines.reduce((s, l) => s + l.amountCents, 0);
    const emp = eLines.reduce((s, l) => s + l.amountCents, 0);
    const net = gross - ded;
    if (net < 0) warnings.push({ employee: name, code: "NEGATIVE_NET", message: `${name} would take home less than zero — check deductions.` });
    if (!prof.directDepositActive || !prof.bankAccountMasked) warnings.push({ employee: name, code: "NO_BANK", message: `${name} has no direct deposit on file — a cheque will be needed.` });
    const pe = { id: ctx.id("pe"), payrollRunId: run.id, employeeId: p.id, grossCents: gross, totalDeductionsCents: ded, netCents: net, employerCostsCents: emp, taxableIncomeCents: gross, cppPensionableCents: prof.cppExempt ? 0 : gross, eiInsurableCents: prof.eiExempt ? 0 : gross, insurableHours: insurable };
    S.payrollEntries.push(pe);
    [...lines, ...dLines, ...eLines].forEach((l) => S.payrollLines.push({ id: ctx.id("pl"), payrollEntryId: pe.id, ...l }));
    G += gross; Dd += ded; E += emp; N += net; count++;
  }
  Object.assign(run, { status: "CALCULATED", employeeCount: count, grossCents: G, employeeDeductionsCents: Dd, employerCostsCents: E, netCents: N, calculatedAt: ctx.now, warnings });
  return { warnings, G, N };
}

/* ==========================================================================
   Reducers — one per event type
   ========================================================================== */
const myEmp = (S, ctx) => { const e = ctx.auth.employee; if (!e) fail("This sign-in isn't linked to an employee record."); return byId(S.employees, e.id); };

const R = {
  /* ---- time off ---- */
  "leave.request"(S, p, ctx) {
    const emp = myEmp(S, ctx);
    const lt = byId(S.leaveTypes, p.leaveTypeId);
    if (!lt) fail("Choose a type of time off.");
    if (!p.start) fail("Choose the first day.");
    const end = p.end || p.start;
    if (end < p.start) fail("Dates are reversed — the last day is before the first.");
    const st = settingsFor(S, emp.companyId);
    const stats = new Set(S.statHolidays.map((h) => h.date));
    const work = eachDate(p.start, end).filter((d) => !isWeekend(d) && !stats.has(d));
    if (!work.length) fail("Those dates have no working days.");
    const std = st.standardHoursPerDay ?? 8;
    const full = std * work.length;
    const asked = Number(p.hours) || 0;
    if (asked > full + 0.001) fail(`That's more than ${full.toFixed(2)} hours (${work.length} working day${work.length === 1 ? "" : "s"} × ${std}).`);
    const total = asked > 0 ? Math.round(asked * 4) / 4 : (Number(p.partialHours) > 0 ? Math.min(Number(p.partialHours), std) : std) * work.length;
    const perDay = total / work.length;
    const partial = total < full - 0.001 ? perDay : 0;
    const bal = S.leaveBalances.find((b) => b.employeeId === emp.id && b.leaveTypeId === lt.id && b.year === Number(p.start.slice(0, 4)));
    const pending = S.leaveRequests.filter((r) => r.employeeId === emp.id && r.leaveTypeId === lt.id && r.status === "PENDING_APPROVAL").reduce((s, r) => s + r.totalHours, 0);
    const avail = (bal ? bal.entitledHours + (bal.carriedOverHours || 0) - (bal.usedHours || 0) : 0) - pending;
    if (lt.code !== "OTHER" && total > avail + 0.01) fail(`That's ${total.toFixed(1)} hours but you only have ${avail.toFixed(1)} available.`);
    const lr = { id: ctx.id("lr"), companyId: emp.companyId, employeeId: emp.id, leaveTypeId: lt.id, startDate: p.start, endDate: end, totalHours: total, isPartialDay: partial > 0, notes: (p.notes || "").trim() || undefined, status: "PENDING_APPROVAL", createdAt: ctx.now };
    if (partial > 0) lr.hoursPerDay = perDay;
    S.leaveRequests.push(lr);
    const inst = startApproval(S, ctx, { workflowCode: "LEAVE_REQUEST", companyId: emp.companyId, entityType: "LeaveRequest", entityId: lr.id, entityLabel: `${lt.name} — ${empName(emp)} · ${dShort(p.start)}${end !== p.start ? "–" + dShort(end) : ""} (${total.toFixed(1)} h)` });
    if (inst) lr.approvalInstanceId = inst.id;
  },
  "leave.withdraw"(S, p, ctx) {
    const emp = myEmp(S, ctx);
    const lr = byId(S.leaveRequests, p.requestId);
    if (!lr || lr.employeeId !== emp.id || lr.status !== "PENDING_APPROVAL") fail("That request can no longer be withdrawn.");
    lr.status = "CANCELLED";
    const inst = byId(S.approvals, lr.approvalInstanceId);
    if (inst) Object.assign(inst, { status: "CANCELLED", completedAt: ctx.now });
    ctx.audit({ module: "leave", action: "STATUS_CHANGE", companyId: emp.companyId, summary: `${ctx.actor.displayName} withdrew a time-off request.` });
  },

  /* ---- approvals ---- */
  "approval.decide"(S, p, ctx) {
    const inst = byId(S.approvals, p.instanceId);
    if (!inst) fail("That approval no longer exists.");
    const step = canActOn(S, ctx.auth, inst);
    if (!step) fail(inst.status !== "PENDING" ? "Someone already decided this one." : "You are not the approver for this step.");
    const steps = activeSteps(S, inst);
    const decision = p.decision === "REJECTED" ? "REJECTED" : "APPROVED";
    const next = steps[steps.findIndex((s) => s.sequence === inst.currentStep) + 1];
    const final = decision === "REJECTED" ? "REJECTED" : next ? "PENDING" : "APPROVED";
    // validate ledger effects before changing anything
    if (final === "APPROVED" && inst.entityType === "ApInvoice") { const inv = byId(S.apInvoices, inst.entityId); if (inv && !inv.journalEntryId) checkJournal(S, billJournal(S, inv)); }
    const comment = (p.comment || "").trim() || undefined;
    S.approvalActions.push({ id: ctx.id("aa"), instanceId: inst.id, stepSequence: step.sequence, stepName: step.name, approverId: ctx.actor.id, approverName: ctx.actor.displayName, action: decision, comment, actedAt: ctx.now });
    if (final === "REJECTED") Object.assign(inst, { status: "REJECTED", completedAt: ctx.now });
    else if (final === "PENDING") { inst.currentStep = next.sequence; notifyStep(S, ctx, inst); }
    else Object.assign(inst, { status: "APPROVED", completedAt: ctx.now });
    ctx.audit({ module: "approvals", action: decision === "APPROVED" ? "APPROVE" : "REJECT", companyId: inst.companyId, summary: `${ctx.actor.displayName} ${decision === "APPROVED" ? "approved" : "declined"} ${inst.entityLabel} at step "${step.name}"${comment ? ` — "${comment}"` : ""}.` });
    ctx.notify(inst.requestedById, { type: decision, title: final === "APPROVED" ? `Approved: ${inst.entityLabel}` : final === "REJECTED" ? `Not approved: ${inst.entityLabel}` : `Step approved: ${inst.entityLabel}`, body: comment, linkUrl: "/approvals" });
    if (final !== "PENDING") applyOutcome(S, ctx, inst, final);
  },

  /* ---- timesheets ---- */
  "timesheet.save"(S, p, ctx) {
    const emp = myEmp(S, ctx);
    const st = settingsFor(S, emp.companyId);
    const start = periodStartFor(p.periodStart, st.timesheetCadence);
    const end = periodEndFor(start, st.timesheetCadence);
    let sheet = S.timesheets.find((t) => t.employeeId === emp.id && t.periodStart === start);
    if (sheet && ["APPROVED", "LOCKED"].includes(sheet.status)) fail(`This timesheet is ${sheet.status === "LOCKED" ? "locked by payroll" : "already approved"}.`);
    if (sheet && sheet.status === "SUBMITTED") fail("This timesheet is waiting for your manager — it can't be changed right now.");
    sheet = ensureSheet(S, ctx, emp, start);
    S.timesheetEntries = S.timesheetEntries.filter((e) => !(e.timesheetId === sheet.id && !e.isAutoFilled && !e.sourceLeaveRequestId));
    for (const e of p.entries || []) {
      const w = Math.min(24, Math.max(0, Number(e.worked) || 0)), b = Math.min(24, Math.max(0, Number(e.banked) || 0));
      if (w <= 0 && b <= 0) continue;
      if (e.date < start || e.date > end) continue;
      S.timesheetEntries.push({ id: ctx.id("te"), timesheetId: sheet.id, date: e.date, departmentId: e.departmentId || undefined, projectId: e.projectId || undefined, workedHours: w, bankedOtHours: b, isAutoFilled: false });
    }
    autofillStats(S, ctx, sheet);
    recomputeSheet(S, sheet);
    if (p.submit) {
      Object.assign(sheet, { status: "SUBMITTED", submittedAt: ctx.now, rejectedReason: undefined });
      const total = sheet.workedHours + sheet.statHours + sheet.vacationHours + sheet.sickHours + sheet.personalHours + sheet.otherLeaveHours;
      const mgrUser = emp.managerId ? userOfEmployee(S, emp.managerId) : null;
      if (mgrUser) ctx.notify(mgrUser.id, { type: "TIMESHEET", title: `Timesheet to approve: ${empName(emp)}`, body: `${periodLabel(start, end)} · ${total.toFixed(1)} h`, linkUrl: "/approvals" });
      ctx.audit({ module: "timesheets", action: "SUBMIT", companyId: emp.companyId, summary: `${empName(emp)} submitted their timesheet for ${periodLabel(start, end)}.` });
    } else sheet.status = "DRAFT";
  },
  "timesheet.decide"(S, p, ctx) {
    const sheet = byId(S.timesheets, p.timesheetId);
    if (!sheet || sheet.status !== "SUBMITTED") fail("That timesheet is not waiting for approval.");
    ctx.company(sheet.companyId);
    const emp = byId(S.employees, sheet.employeeId);
    if (ctx.auth.employee?.id === emp.id) fail("You can't approve your own timesheet.");
    const mine = emp.managerId && emp.managerId === ctx.auth.employee?.id;
    const hr = ctx.auth.isSuper || (can(ctx.auth, "timesheets.approve") && ctx.auth.roleCodes.some((r) => ["HR_MANAGER", "COMPANY_ADMIN", "GROUP_ADMIN", "PAYROLL_ADMIN"].includes(r)));
    if (!mine && !hr) fail("Only this person's manager (or HR) can approve their timesheet.");
    const reason = (p.reason || "").trim();
    if (p.decision === "APPROVED") Object.assign(sheet, { status: "APPROVED", approvedById: ctx.actor.id, approvedByName: ctx.actor.displayName, approvedAt: ctx.now, rejectedReason: undefined });
    else Object.assign(sheet, { status: "REJECTED", rejectedReason: reason || "Please review and resubmit." });
    ctx.audit({ module: "timesheets", action: p.decision === "APPROVED" ? "APPROVE" : "REJECT", companyId: sheet.companyId, summary: `${ctx.actor.displayName} ${p.decision === "APPROVED" ? "approved" : "sent back"} ${empName(emp)}'s timesheet (${periodLabel(sheet.periodStart, sheet.periodEnd)})${reason ? ` — "${reason}"` : ""}.` });
    const u = userOfEmployee(S, emp.id);
    if (u) ctx.notify(u.id, { type: p.decision, title: p.decision === "APPROVED" ? "Your timesheet was approved ✓" : "Your timesheet was sent back", body: reason || periodLabel(sheet.periodStart, sheet.periodEnd), linkUrl: "/me/time" });
  },

  /* ---- expenses ---- */
  "expense.submit"(S, p, ctx) {
    const emp = myEmp(S, ctx);
    const merchant = (p.merchant || "").trim();
    const amt = Number(p.amountCents);
    if (!merchant || !(amt > 0)) fail("Please give the store name and a dollar amount.");
    const cat = S.expenseCategories.find((c) => c.code === p.categoryCode) || S.expenseCategories[0];
    const claimNumber = nextNum(S.expenseClaims.map((c) => c.claimNumber), "EXP-2026", 4);
    const claim = { id: ctx.id("x"), companyId: emp.companyId, employeeId: emp.id, claimNumber, purpose: (p.purpose || "").trim() || merchant, totalCents: amt, status: "PENDING_APPROVAL", submittedAt: ctx.now, createdAt: ctx.now };
    S.expenseClaims.push(claim);
    S.expenseLines.push({ id: ctx.id("xl"), expenseClaimId: claim.id, date: p.date || ctx.now.slice(0, 10), merchant, categoryCode: cat.code, amountCents: amt, taxCents: 0, hasReceipt: !!p.receipt, receiptName: p.receipt || undefined });
    const inst = startApproval(S, ctx, { workflowCode: "EXPENSE_CLAIM", companyId: emp.companyId, entityType: "ExpenseClaim", entityId: claim.id, entityLabel: `Expense ${claimNumber} — ${empName(emp)} · ${merchant}`, amountCents: amt });
    if (inst) claim.approvalInstanceId = inst.id; else claim.status = "APPROVED";
  },
  "expense.reimburse"(S, p, ctx) {
    ctx.need("expenses.reimburse");
    const c = byId(S.expenseClaims, p.claimId);
    if (!c || c.status !== "APPROVED") fail("Only approved claims can be paid back.");
    ctx.company(c.companyId);
    const lines = S.expenseLines.filter((l) => l.expenseClaimId === c.id);
    const emp = byId(S.employees, c.employeeId);
    const jl = lines.map((l) => ({ accountNumber: S.expenseCategories.find((x) => x.code === l.categoryCode)?.glAccountNumber || "5900", debitCents: l.amountCents, description: `${l.merchant}` }));
    jl.push({ accountNumber: GL.BANK, creditCents: c.totalCents, description: `Reimburse ${empName(emp)}` });
    const date = p.date || ctx.now.slice(0, 10);
    const je = postJournal(S, ctx, { companyId: c.companyId, date, memo: `Expense ${c.claimNumber} — ${c.purpose}`, source: "EXPENSE", sourceType: "ExpenseClaim", sourceId: c.id, lines: jl });
    Object.assign(c, { status: "REIMBURSED", postedAt: ctx.now, journalEntryId: je.id });
    bankTxn(S, ctx, c.companyId, date, `Expense reimbursement — ${c.claimNumber}`, -c.totalCents, "WITHDRAWAL");
    const u = userOfEmployee(S, emp.id);
    if (u) ctx.notify(u.id, { type: "APPROVED", title: `Paid back: ${c.claimNumber}`, body: money(c.totalCents), linkUrl: "/me/expenses" });
    ctx.audit({ module: "finance.expenses", action: "POST", companyId: c.companyId, summary: `${ctx.actor.displayName} paid back ${c.claimNumber} (${money(c.totalCents)}) — ${je.entryNumber}.` });
  },

  /* ---- payroll ---- */
  "payroll.create"(S, p, ctx) {
    ctx.need("payroll.run");
    const g = byId(S.payGroups, p.payGroupId);
    if (!g) fail("Choose a pay group.");
    ctx.company(g.companyId);
    if (!p.periodStart || !p.periodEnd || !p.payDate) fail("Fill in the period and the pay day.");
    if (p.periodEnd < p.periodStart) fail("The period ends before it starts.");
    if (S.payrollRuns.some((r) => r.payGroupId === g.id && r.periodStart === p.periodStart && r.status !== "CANCELLED")) fail(`${g.name} already has a run for that period.`);
    const runNumber = nextNum(S.payrollRuns.filter((r) => r.companyId === g.companyId).map((r) => r.runNumber), "PR-2026", 4);
    const run = { id: ctx.id("run"), companyId: g.companyId, payGroupId: g.id, runNumber, periodStart: p.periodStart, periodEnd: p.periodEnd, payDate: p.payDate, status: "DRAFT", employeeCount: 0, grossCents: 0, employeeDeductionsCents: 0, employerCostsCents: 0, netCents: 0, warnings: [], createdAt: ctx.now };
    S.payrollRuns.push(run);
    ctx.audit({ module: "payroll", action: "CREATE", companyId: g.companyId, summary: `${ctx.actor.displayName} opened pay run ${runNumber} for ${g.name}.` });
    return run;
  },
  "payroll.calculate"(S, p, ctx) {
    ctx.need("payroll.run");
    const run = byId(S.payrollRuns, p.runId);
    if (!run) fail("Pay run not found.");
    ctx.company(run.companyId);
    if (!["DRAFT", "CALCULATED"].includes(run.status)) fail("Only draft runs can be calculated.");
    const r = calculateRun(S, ctx, run);
    ctx.audit({ module: "payroll", action: "UPDATE", companyId: run.companyId, summary: `${ctx.actor.displayName} calculated ${run.runNumber}: gross ${money(r.G)}, net ${money(r.N)}, ${r.warnings.length} warning${r.warnings.length === 1 ? "" : "s"}.` });
  },
  "payroll.send"(S, p, ctx) {
    ctx.need("payroll.run");
    const run = byId(S.payrollRuns, p.runId);
    if (!run || run.status !== "CALCULATED") fail("Calculate the run first.");
    ctx.company(run.companyId);
    if (!run.employeeCount) fail("Nobody is being paid in this run — check the warnings.");
    const co = byId(S.companies, run.companyId);
    const inst = startApproval(S, ctx, { workflowCode: "PAYROLL_RUN", companyId: run.companyId, entityType: "PayrollRun", entityId: run.id, entityLabel: `Payroll ${run.runNumber} — ${co.displayName} · net ${money(run.netCents)}`, amountCents: run.netCents });
    if (inst) Object.assign(run, { status: "PENDING_APPROVAL", approvalInstanceId: inst.id });
    else Object.assign(run, { status: "APPROVED", approvedByName: "Auto", approvedAt: ctx.now });
  },
  "payroll.post"(S, p, ctx) {
    ctx.need("payroll.post");
    const run = byId(S.payrollRuns, p.runId);
    if (!run) fail("Pay run not found.");
    ctx.company(run.companyId);
    if (run.status !== "APPROVED") fail("The run must be approved before posting.");
    const entries = S.payrollEntries.filter((e) => e.payrollRunId === run.id);
    if (!entries.length) fail("Nothing to post.");
    const co = byId(S.companies, run.companyId);
    const je = postJournal(S, ctx, {
      companyId: run.companyId, date: run.payDate, memo: `Payroll ${run.runNumber} — ${co.displayName}`, source: "PAYROLL", sourceType: "PayrollRun", sourceId: run.id,
      lines: [
        { accountNumber: GL.WAGES, debitCents: run.grossCents, description: "Wages & salaries" },
        { accountNumber: GL.EMPLOYER, debitCents: run.employerCostsCents, description: "Employer contributions & benefits" },
        { accountNumber: GL.PAYROLL_LIAB, creditCents: run.employeeDeductionsCents + run.employerCostsCents, description: "Source deductions & benefits payable" },
        { accountNumber: GL.BANK, creditCents: run.netCents, description: "Net pay" },
      ],
    });
    Object.assign(run, { status: "POSTED", postedByName: ctx.actor.displayName, postedAt: ctx.now, journalEntryId: je.id });
    const ids = new Set(entries.map((e) => e.employeeId));
    for (const t of S.timesheets) if (ids.has(t.employeeId) && t.periodStart >= run.periodStart && t.periodEnd <= run.periodEnd && t.status === "APPROVED") Object.assign(t, { status: "LOCKED", payrollRunId: run.id });
    bankTxn(S, ctx, run.companyId, run.payDate, `Payroll direct deposits — ${run.runNumber}`, -run.netCents, "WITHDRAWAL");
    for (const e of entries) { const u = userOfEmployee(S, e.employeeId); if (u) ctx.notify(u.id, { type: "PAYROLL", title: "Your pay statement is ready", body: `${run.runNumber} · deposited ${money(e.netCents)}`, linkUrl: "/me/pay" }); }
    ctx.audit({ module: "payroll", action: "POST", companyId: run.companyId, summary: `${ctx.actor.displayName} posted ${run.runNumber} — ${je.entryNumber} hit the ledger, ${entries.length} statement${entries.length === 1 ? "" : "s"} issued.` });
  },
  "payroll.settings"(S, p, ctx) {
    ctx.need("payroll.admin");
    const st = S.payrollSettings.find((s) => s.companyId === p.companyId);
    if (!st) fail("Company not found.");
    const n = (v, lo, hi) => { const x = Number(v); if (!Number.isFinite(x) || x < lo || x > hi) fail("Enter hours between " + lo + " and " + hi + "."); return x; };
    const dailyOt = n(p.dailyOt, 4, 16), dailyDouble = n(p.dailyDouble, dailyOt, 24), weeklyOt = n(p.weeklyOt, 20, 80);
    Object.assign(st, { dailyOtThreshold: dailyOt, dailyDoubleOtThreshold: dailyDouble, weeklyOtThreshold: weeklyOt });
    ctx.audit({ module: "payroll", action: "UPDATE", companyId: p.companyId, summary: `${ctx.actor.displayName} set overtime rules for ${byId(S.companies, p.companyId).displayName}: ${dailyOt} h/day, double after ${dailyDouble} h, ${weeklyOt} h/week.` });
  },

  /* ---- bills (AP) ---- */
  "ap.create"(S, p, ctx) {
    ctx.need("ap.create");
    const v = byId(S.vendors, p.vendorId);
    if (!v) fail("Choose a vendor.");
    ctx.company(v.companyId);
    const num = (p.invoiceNumber || "").trim();
    if (!num) fail("Enter the vendor's invoice number.");
    if (S.apInvoices.some((i) => i.vendorId === v.id && i.invoiceNumber.toLowerCase() === num.toLowerCase())) fail(`${v.name} already has a bill numbered ${num}.`);
    const sub = Number(p.subtotalCents);
    if (!(sub > 0)) fail("Enter the amount before tax.");
    if (!p.invoiceDate) fail("Enter the bill date.");
    const tax = p.gst ? Math.round(sub * 0.05) : 0;
    const acct = p.accountNumber || v.defaultExpenseAccountNumber || "5900";
    const inv = { id: ctx.id("ap"), companyId: v.companyId, vendorId: v.id, invoiceNumber: num, invoiceDate: p.invoiceDate, dueDate: addDays(p.invoiceDate, v.paymentTermsDays || 30), description: (p.description || "").trim() || "Vendor bill", subtotalCents: sub, taxCents: tax, totalCents: sub + tax, paidCents: 0, status: "DRAFT", attachments: p.attachment ? [{ ...p.attachment, by: ctx.actor.displayName, at: ctx.now }] : [], createdAt: ctx.now };
    S.apInvoices.push(inv);
    S.apLines.push({ id: ctx.id("apl"), apInvoiceId: inv.id, description: inv.description, accountNumber: acct, quantity: 1, unitCents: sub, amountCents: sub, taxCode: p.gst ? "GST" : "NONE", taxCents: tax });
    ctx.audit({ module: "finance.ap", action: "CREATE", companyId: v.companyId, summary: `${ctx.actor.displayName} entered bill ${num} from ${v.name} (${money(inv.totalCents)})${inv.attachments.length ? " with the vendor's PDF attached" : ""}.` });
    if (p.submit) R["ap.submit"](S, { invoiceId: inv.id }, ctx);
  },
  "ap.submit"(S, p, ctx) {
    ctx.need("ap.create");
    const inv = byId(S.apInvoices, p.invoiceId);
    if (!inv || inv.status !== "DRAFT") fail("Only draft bills can be sent for approval.");
    ctx.company(inv.companyId);
    const v = byId(S.vendors, inv.vendorId);
    const inst = startApproval(S, ctx, { workflowCode: "AP_INVOICE", companyId: inv.companyId, entityType: "ApInvoice", entityId: inv.id, entityLabel: `Bill ${inv.invoiceNumber} — ${v.name}`, amountCents: inv.totalCents });
    inv.status = "PENDING_APPROVAL";
    if (inst) inv.approvalInstanceId = inst.id;
  },
  "ap.pay"(S, p, ctx) {
    ctx.need("ap.pay");
    const inv = byId(S.apInvoices, p.invoiceId);
    if (!inv || !["APPROVED", "PARTIALLY_PAID"].includes(inv.status)) fail("Only approved bills can be paid.");
    ctx.company(inv.companyId);
    const due = inv.totalCents - (inv.paidCents || 0);
    const amt = Number(p.amountCents);
    if (!(amt > 0) || amt > due) fail(`Enter an amount up to ${money(due)}.`);
    const date = p.date || ctx.now.slice(0, 10);
    const v = byId(S.vendors, inv.vendorId);
    const je = postJournal(S, ctx, { companyId: inv.companyId, date, memo: `Payment ${inv.invoiceNumber} — ${v.name}`, source: "AP", sourceType: "Payment", reference: inv.invoiceNumber, lines: [{ accountNumber: GL.AP, debitCents: amt, description: `${v.name} payable` }, { accountNumber: GL.BANK, creditCents: amt, description: "EFT" }] });
    const num = nextNum(S.payments.filter((x) => x.type === "AP_PAYMENT").map((x) => x.paymentNumber), "PMT", 3);
    S.payments.push({ id: ctx.id("pay"), companyId: inv.companyId, paymentNumber: num, type: "AP_PAYMENT", date, method: "EFT", vendorId: v.id, amountCents: amt, status: "POSTED", journalEntryId: je.id, invoiceId: inv.id });
    bankTxn(S, ctx, inv.companyId, date, `EFT — ${inv.invoiceNumber}`, -amt, "WITHDRAWAL");
    inv.paidCents = (inv.paidCents || 0) + amt;
    inv.status = inv.paidCents >= inv.totalCents ? "PAID" : "PARTIALLY_PAID";
    ctx.audit({ module: "finance.ap", action: "POST", companyId: inv.companyId, summary: `${ctx.actor.displayName} paid ${money(amt)} on bill ${inv.invoiceNumber} (${v.name}) — ${je.entryNumber}.` });
  },

  /* ---- invoices (AR) ---- */
  "ar.create"(S, p, ctx) {
    ctx.need("ar.create");
    const cu = byId(S.customers, p.customerId);
    if (!cu) fail("Choose a customer.");
    ctx.company(cu.companyId);
    const sub = Number(p.subtotalCents);
    if (!(sub > 0)) fail("Enter the amount before tax.");
    const date = p.invoiceDate || ctx.now.slice(0, 10);
    const tax = p.gst ? Math.round(sub * 0.05) : 0;
    const num = nextNum(S.arInvoices.map((i) => i.invoiceNumber), "INV-2026", 4);
    const memo = (p.memo || "").trim() || "Services";
    const je = postJournal(S, ctx, { companyId: cu.companyId, date, memo: `Invoice ${num} — ${memo}`, source: "AR", sourceType: "ArInvoice", reference: num, lines: [{ accountNumber: GL.AR, debitCents: sub + tax, description: cu.name }, { accountNumber: GL.REVENUE, creditCents: sub, description: memo }, ...(tax ? [{ accountNumber: GL.GST_PAY, creditCents: tax, description: "GST collected" }] : [])] });
    const inv = { id: ctx.id("ar"), companyId: cu.companyId, customerId: cu.id, invoiceNumber: num, type: "INVOICE", invoiceDate: date, dueDate: addDays(date, cu.paymentTermsDays || 30), memo, subtotalCents: sub, taxCents: tax, totalCents: sub + tax, paidCents: 0, status: "SENT", journalEntryId: je.id, postedAt: ctx.now, sentAt: ctx.now };
    S.arInvoices.push(inv);
    S.arLines.push({ id: ctx.id("arl"), arInvoiceId: inv.id, description: memo, accountNumber: GL.REVENUE, quantity: 1, unitCents: sub, amountCents: sub, taxCents: tax });
    ctx.audit({ module: "finance.ar", action: "CREATE", companyId: cu.companyId, summary: `${ctx.actor.displayName} sent invoice ${num} to ${cu.name} (${money(inv.totalCents)}) — ${je.entryNumber}.` });
  },
  "ar.receive"(S, p, ctx) {
    ctx.need("ar.receive");
    const inv = byId(S.arInvoices, p.invoiceId);
    if (!inv || !["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) fail("That invoice isn't waiting for payment.");
    ctx.company(inv.companyId);
    const due = inv.totalCents - (inv.paidCents || 0);
    const amt = Number(p.amountCents);
    if (!(amt > 0) || amt > due) fail(`Enter an amount up to ${money(due)}.`);
    const date = p.date || ctx.now.slice(0, 10);
    const cu = byId(S.customers, inv.customerId);
    const je = postJournal(S, ctx, { companyId: inv.companyId, date, memo: `Receipt for ${inv.invoiceNumber}`, source: "AR", sourceType: "Payment", reference: inv.invoiceNumber, lines: [{ accountNumber: GL.BANK, debitCents: amt, description: `Deposit — ${cu.name}` }, { accountNumber: GL.AR, creditCents: amt, description: inv.invoiceNumber }] });
    const num = nextNum(S.payments.filter((x) => x.type === "AR_RECEIPT").map((x) => x.paymentNumber), "RCT", 4);
    S.payments.push({ id: ctx.id("pay"), companyId: inv.companyId, paymentNumber: num, type: "AR_RECEIPT", date, method: "EFT", customerId: cu.id, amountCents: amt, status: "POSTED", journalEntryId: je.id, invoiceId: inv.id });
    bankTxn(S, ctx, inv.companyId, date, `Deposit — ${inv.invoiceNumber}`, amt, "DEPOSIT");
    inv.paidCents = (inv.paidCents || 0) + amt;
    inv.status = inv.paidCents >= inv.totalCents ? "PAID" : "PARTIALLY_PAID";
    ctx.audit({ module: "finance.ar", action: "POST", companyId: inv.companyId, summary: `${ctx.actor.displayName} recorded ${money(amt)} from ${cu.name} on ${inv.invoiceNumber} — ${je.entryNumber}.` });
  },

  /* ---- ledger ---- */
  "journal.manual"(S, p, ctx) {
    ctx.need("finance.post");
    ctx.company(p.companyId);
    const lines = (p.lines || []).filter((l) => l.accountNumber && ((l.debitCents || 0) > 0 || (l.creditCents || 0) > 0));
    if (lines.length < 2) fail("A journal needs at least two lines.");
    if (!(p.memo || "").trim()) fail("Add a short description.");
    const je = postJournal(S, ctx, { companyId: p.companyId, date: p.date, memo: p.memo.trim(), source: "MANUAL", lines });
    ctx.audit({ module: "finance.gl", action: "POST", companyId: p.companyId, summary: `${ctx.actor.displayName} posted manual entry ${je.entryNumber} (${money(je.totalDebitCents)}).` });
  },
  "period.set"(S, p, ctx) {
    ctx.need("finance.periods");
    const fp = byId(S.fiscalPeriods, p.periodId);
    if (!fp) fail("Period not found.");
    ctx.company(fp.companyId);
    if (p.status === "CLOSED") Object.assign(fp, { status: "CLOSED", closedByName: ctx.actor.displayName, closedAt: ctx.now });
    else Object.assign(fp, { status: "OPEN", closedByName: undefined, closedAt: undefined });
    ctx.audit({ module: "finance.periods", action: "STATUS_CHANGE", companyId: fp.companyId, summary: `${ctx.actor.displayName} ${p.status === "CLOSED" ? "closed" : "reopened"} ${fp.fiscalYear}-P${fp.periodNumber} for ${byId(S.companies, fp.companyId).displayName}.` });
  },

  /* ---- people ---- */
  "employee.create"(S, p, ctx) {
    ctx.need("hr.employees.create");
    ctx.company(p.companyId);
    const first = (p.firstName || "").trim(), last = (p.lastName || "").trim();
    if (!first || !last) fail("Enter a first and last name.");
    if (!p.startDate) fail("Enter a start date.");
    const dep = byId(S.departments, p.departmentId);
    if (!dep || dep.companyId !== p.companyId) fail("Choose a department in that company.");
    const prefix = { HAICO: "EMP-3", TAAN: "EMP-2", TOUR: "EMP-1", SEAF: "EMP-4" }[p.companyId] || "EMP-9";
    let max = 0;
    for (const e of S.employees) if (e.employeeNumber.startsWith(prefix)) max = Math.max(max, parseInt(e.employeeNumber.slice(4), 10) || 0);
    const employeeNumber = `EMP-${max || Number(prefix.slice(4) + "000")}${max ? "" : ""}`.replace(/\d+$/, (n) => String(Number(n) + 1));
    const rate = Number(p.rateCents);
    if (!(rate > 0)) fail(p.payType === "HOURLY" ? "Enter the hourly rate." : "Enter the yearly salary.");
    const group = S.payGroups.find((g) => g.companyId === p.companyId && g.code.endsWith(p.payType === "HOURLY" ? "-HR" : "-SAL")) || S.payGroups.find((g) => g.companyId === p.companyId);
    const e = { id: ctx.id("e"), companyId: p.companyId, employeeNumber, firstName: first, lastName: last, workEmail: `${first}.${last}@haico.demo`.toLowerCase().replace(/\s+/g, ""), departmentId: dep.id, positionId: p.positionId || undefined, managerId: p.managerId || undefined, employmentType: p.employmentType || "FULL_TIME", startDate: p.startDate, status: "ONBOARDING", avatarColor: byId(S.companies, p.companyId).colorTag, province: "BC" };
    S.employees.push(e);
    S.compensations.push({ id: ctx.id("cmp"), employeeId: e.id, payType: p.payType === "HOURLY" ? "HOURLY" : "SALARY", hourlyRateCents: p.payType === "HOURLY" ? rate : undefined, annualSalaryCents: p.payType === "HOURLY" ? undefined : rate, effectiveDate: p.startDate });
    S.payProfiles.push({ id: ctx.id("pp"), employeeId: e.id, provinceOfEmployment: "BC", payGroupId: group?.id, directDepositActive: false, cppExempt: false, eiExempt: false, additionalTaxCents: 0 });
    for (const lt of S.leaveTypes) if (lt.defaultAnnualHours > 0) S.leaveBalances.push({ id: ctx.id("lb"), employeeId: e.id, leaveTypeId: lt.id, year: 2026, entitledHours: lt.defaultAnnualHours, carriedOverHours: 0, usedHours: 0 });
    const tasks = [["Signed employment agreement returned", "HR", 3], ["TD1 federal & BC forms collected", "PAYROLL", 4], ["Direct deposit details entered", "PAYROLL", 5], ["Site orientation & safety walkthrough", "MANAGER", 6]];
    tasks.forEach(([title, role, d], i) => S.onboardingTasks.push({ id: ctx.id("ob"), employeeId: e.id, category: "ONBOARDING", title, assigneeRole: role, dueDate: addDays(p.startDate, d), status: "PENDING", sortOrder: i }));
    ctx.notifyPerm("payroll.admin", p.companyId, { type: "SYSTEM", title: `New hire: ${first} ${last}`, body: `${employeeNumber} · starts ${dLong(p.startDate)} — TD1 and direct deposit needed`, linkUrl: "/hr/onboarding" }, ctx.actor.id);
    ctx.audit({ module: "hr", action: "CREATE", companyId: p.companyId, summary: `${ctx.actor.displayName} added ${first} ${last} (${employeeNumber}) to ${byId(S.companies, p.companyId).displayName} with 4 onboarding tasks.` });
  },
  "onboarding.toggle"(S, p, ctx) {
    ctx.need("hr.onboarding.manage");
    const t = byId(S.onboardingTasks, p.taskId);
    if (!t) fail("Task not found.");
    const emp = byId(S.employees, t.employeeId);
    ctx.company(emp.companyId);
    t.status = t.status === "COMPLETE" ? "PENDING" : "COMPLETE";
    if (t.status === "COMPLETE") { t.completedAt = ctx.now; t.completedByName = ctx.actor.displayName; }
    const open = S.onboardingTasks.filter((x) => x.employeeId === emp.id && x.status !== "COMPLETE").length;
    if (open === 0 && emp.status === "ONBOARDING") emp.status = "ACTIVE";
    ctx.audit({ module: "hr", action: "UPDATE", companyId: emp.companyId, summary: `${ctx.actor.displayName} marked "${t.title}" ${t.status === "COMPLETE" ? "done" : "not done"} for ${empName(emp)}${open === 0 ? " — onboarding complete" : ""}.` });
  },

  /* ---- buying ---- */
  "pr.create"(S, p, ctx) {
    if (!can(ctx.auth, "procurement.create") && !ctx.auth.employee) fail("Your role doesn't allow this.");
    const emp = ctx.auth.employee;
    const companyId = p.companyId || emp?.companyId;
    ctx.company(companyId);
    const desc = (p.description || "").trim();
    const amt = Number(p.amountCents);
    if (!desc || !(amt > 0)) fail("Describe what you need and the estimated cost.");
    const requestNumber = nextNum(S.purchaseRequests.map((r) => r.requestNumber), "REQ-2026", 4);
    const pr = { id: ctx.id("prq"), companyId, requestNumber, description: desc, vendorName: (p.vendorName || "").trim() || undefined, amountCents: amt, neededBy: p.neededBy || undefined, justification: (p.justification || "").trim() || undefined, requestedByName: ctx.actor.displayName, requestedById: ctx.actor.id, employeeId: emp?.id, status: "PENDING_APPROVAL", createdAt: ctx.now };
    S.purchaseRequests.push(pr);
    const inst = startApproval(S, ctx, { workflowCode: "PURCHASE_REQUEST", companyId, entityType: "PurchaseRequest", entityId: pr.id, entityLabel: `Purchase request ${requestNumber} — ${desc} · ${money(amt)}`, amountCents: amt });
    if (inst) pr.approvalInstanceId = inst.id; else pr.status = "APPROVED";
  },
  "po.create"(S, p, ctx) {
    ctx.need("procurement.create");
    const pr = byId(S.purchaseRequests, p.requestId);
    if (!pr || pr.status !== "APPROVED") fail("Only approved requests can become purchase orders.");
    ctx.company(pr.companyId);
    const poNumber = nextNum(S.purchaseOrders.map((r) => r.poNumber), "PO-2026", 4);
    S.purchaseOrders.push({ id: ctx.id("po"), companyId: pr.companyId, poNumber, requestId: pr.id, description: pr.description, vendorName: pr.vendorName, amountCents: pr.amountCents, status: "SENT", createdByName: ctx.actor.displayName, createdAt: ctx.now });
    pr.status = "CONVERTED";
    ctx.audit({ module: "procurement", action: "CREATE", companyId: pr.companyId, summary: `${ctx.actor.displayName} turned ${pr.requestNumber} into ${poNumber} (${money(pr.amountCents)}).` });
  },
  "po.receive"(S, p, ctx) {
    ctx.need("procurement.receive");
    const po = byId(S.purchaseOrders, p.poId);
    if (!po || po.status !== "SENT") fail("That order isn't waiting to be received.");
    ctx.company(po.companyId);
    Object.assign(po, { status: "RECEIVED", receivedAt: ctx.now, receivedByName: ctx.actor.displayName });
    ctx.audit({ module: "procurement", action: "RECEIVE", companyId: po.companyId, summary: `${ctx.actor.displayName} received everything on ${po.poNumber}.` });
  },

  /* ---- admin ---- */
  "workflow.threshold"(S, p, ctx) {
    ctx.need("admin.workflows");
    const st = byId(S.workflowSteps, p.stepId);
    if (!st) fail("Step not found.");
    const v = Number(p.thresholdMinCents);
    if (!Number.isFinite(v) || v < 0) fail("Enter a dollar amount of zero or more.");
    const old = st.thresholdMinCents || 0;
    st.thresholdMinCents = v;
    const wf = byId(S.workflows, st.workflowId);
    ctx.audit({ module: "admin", action: "UPDATE", summary: `${ctx.actor.displayName} changed "${wf.name} → ${st.name}" to start at ${money(v)} (was ${money(old)}).` });
  },
  "feedback.create"(S, p, ctx) {
    const text = (p.text || "").trim();
    if (!text) fail("Write a short note first.");
    const kinds = { SUGGESTION: "Suggestion", PROBLEM: "Something's wrong", QUESTION: "Question" };
    const f = { id: ctx.id("fb"), kind: kinds[p.kind] ? p.kind : "SUGGESTION", text: text.slice(0, 2000), page: p.page || "", byId: ctx.actor.id, byName: ctx.actor.displayName, status: "NEW", createdAt: ctx.now };
    S.feedback.push(f);
    ctx.notifyPerm("admin.users", null, { type: "SYSTEM", title: `Feedback: ${kinds[f.kind]}`, body: `${ctx.actor.displayName} · ${text.slice(0, 80)}`, linkUrl: "/admin/feedback" }, ctx.actor.id);
  },
  "feedback.resolve"(S, p, ctx) {
    ctx.need("admin.users");
    const f = byId(S.feedback, p.id);
    if (!f) fail("Not found.");
    f.status = f.status === "RESOLVED" ? "NEW" : "RESOLVED";
  },
};
// notifyPerm with a null company means "anyone with the permission"
const _canSee = canSee;

/* ==========================================================================
   AP / AR batch system
   - batch entry: many bills (or invoices) keyed in one grid, sent together
   - payment batch: many approved bills paid in one EFT run → ONE ledger entry
   - deposit batch: one bank deposit applied across many customer invoices
   ========================================================================== */
Object.assign(R, {
  "ap.batchEntry"(S, p, ctx) {
    ctx.need("ap.create");
    const rows = (p.rows || []).filter((r) => r.vendorId || r.invoiceNumber || r.subtotalCents);
    if (!rows.length) fail("Add at least one bill to the batch.");
    const seen = new Set();
    const made = [];
    // validate every row before creating any — a batch posts whole or not at all
    rows.forEach((r, i) => {
      const v = byId(S.vendors, r.vendorId);
      if (!v) fail(`Row ${i + 1}: choose a vendor.`);
      ctx.company(v.companyId);
      const num = (r.invoiceNumber || "").trim();
      if (!num) fail(`Row ${i + 1}: enter the invoice number.`);
      const key = v.id + "|" + num.toLowerCase();
      if (seen.has(key)) fail(`Row ${i + 1}: ${num} is listed twice for ${v.name}.`);
      if (S.apInvoices.some((x) => x.vendorId === v.id && x.invoiceNumber.toLowerCase() === num.toLowerCase())) fail(`Row ${i + 1}: ${v.name} already has bill ${num}.`);
      seen.add(key);
      if (!(Number(r.subtotalCents) > 0)) fail(`Row ${i + 1}: enter the amount before tax.`);
      if (!r.invoiceDate) fail(`Row ${i + 1}: enter the bill date.`);
    });
    const batchNumber = nextNum(S.apBatches.map((b) => b.batchNumber), "APB-2026", 4);
    const batch = { id: ctx.id("apb"), kind: "ENTRY", batchNumber, companyId: null, createdByName: ctx.actor.displayName, createdAt: ctx.now, items: [], totalCents: 0, status: p.submit ? "PENDING_APPROVAL" : "DRAFT" };
    for (const r of rows) {
      const v = byId(S.vendors, r.vendorId);
      const sub = Number(r.subtotalCents), tax = r.gst ? Math.round(sub * 0.05) : 0;
      const inv = { id: ctx.id("ap"), companyId: v.companyId, vendorId: v.id, invoiceNumber: r.invoiceNumber.trim(), invoiceDate: r.invoiceDate, dueDate: addDays(r.invoiceDate, v.paymentTermsDays || 30), description: (r.description || "").trim() || "Vendor bill", subtotalCents: sub, taxCents: tax, totalCents: sub + tax, paidCents: 0, status: "DRAFT", attachments: [], batchId: batch.id, createdAt: ctx.now };
      S.apInvoices.push(inv);
      S.apLines.push({ id: ctx.id("apl"), apInvoiceId: inv.id, description: inv.description, accountNumber: r.accountNumber || v.defaultExpenseAccountNumber || "5900", quantity: 1, unitCents: sub, amountCents: sub, taxCode: tax ? "GST" : "NONE", taxCents: tax });
      batch.items.push(inv.id); batch.totalCents += inv.totalCents; made.push(inv);
    }
    const cos = [...new Set(made.map((i) => i.companyId))];
    batch.companyId = cos.length === 1 ? cos[0] : null;
    S.apBatches.push(batch);
    if (p.submit) for (const inv of made) R["ap.submit"](S, { invoiceId: inv.id }, ctx);
    ctx.audit({ module: "finance.ap", action: "CREATE", companyId: batch.companyId, summary: `${ctx.actor.displayName} keyed batch ${batchNumber}: ${made.length} bill${made.length === 1 ? "" : "s"} totalling ${money(batch.totalCents)}${p.submit ? ", all sent for approval" : ""}.` });
  },
  "ap.batchSubmit"(S, p, ctx) {
    ctx.need("ap.create");
    const b = byId(S.apBatches, p.batchId);
    if (!b || b.kind !== "ENTRY" || b.status !== "DRAFT") fail("Only draft entry batches can be sent.");
    for (const id of b.items) { const inv = byId(S.apInvoices, id); if (inv && inv.status === "DRAFT") R["ap.submit"](S, { invoiceId: id }, ctx); }
    b.status = "PENDING_APPROVAL";
  },
  "ap.paymentBatch"(S, p, ctx) {
    ctx.need("ap.pay");
    ctx.company(p.companyId);
    const date = p.date || ctx.now.slice(0, 10);
    const items = (p.items || []).map((it) => ({ inv: byId(S.apInvoices, it.invoiceId), amt: Number(it.amountCents) })).filter((x) => x.inv);
    if (!items.length) fail("Pick at least one bill to pay.");
    const lines = [];
    let total = 0;
    for (const { inv, amt } of items) {
      if (inv.companyId !== p.companyId) fail(`${inv.invoiceNumber} belongs to another company — one batch pays from one bank account.`);
      if (!["APPROVED", "PARTIALLY_PAID"].includes(inv.status)) fail(`${inv.invoiceNumber} isn't approved for payment.`);
      const due = inv.totalCents - (inv.paidCents || 0);
      if (!(amt > 0) || amt > due + 0) fail(`${inv.invoiceNumber}: enter an amount up to ${money(due)}.`);
      const v = byId(S.vendors, inv.vendorId);
      lines.push({ accountNumber: GL.AP, debitCents: amt, description: `${v.name} · ${inv.invoiceNumber}` });
      total += amt;
    }
    lines.push({ accountNumber: GL.BANK, creditCents: total, description: "EFT payment batch" });
    const batchNumber = nextNum(S.apBatches.map((b) => b.batchNumber), "PAY-2026", 4);
    const je = postJournal(S, ctx, { companyId: p.companyId, date, memo: `Payment batch ${batchNumber} — ${items.length} bill${items.length === 1 ? "" : "s"}`, source: "AP", sourceType: "PaymentBatch", reference: batchNumber, lines });
    const batch = { id: ctx.id("apb"), kind: "PAYMENT", batchNumber, companyId: p.companyId, date, createdByName: ctx.actor.displayName, createdAt: ctx.now, items: [], totalCents: total, status: "POSTED", journalEntryId: je.id, method: "EFT" };
    for (const { inv, amt } of items) {
      const v = byId(S.vendors, inv.vendorId);
      const num = nextNum(S.payments.filter((x) => x.type === "AP_PAYMENT").map((x) => x.paymentNumber), "PMT", 3);
      S.payments.push({ id: ctx.id("pay"), companyId: inv.companyId, paymentNumber: num, type: "AP_PAYMENT", date, method: "EFT", vendorId: v.id, amountCents: amt, status: "POSTED", journalEntryId: je.id, invoiceId: inv.id, batchId: batch.id });
      inv.paidCents = (inv.paidCents || 0) + amt;
      inv.status = inv.paidCents >= inv.totalCents ? "PAID" : "PARTIALLY_PAID";
      batch.items.push({ invoiceId: inv.id, amountCents: amt, vendorName: v.name, invoiceNumber: inv.invoiceNumber });
    }
    S.apBatches.push(batch);
    bankTxn(S, ctx, p.companyId, date, `EFT batch ${batchNumber} — ${items.length} vendor payment${items.length === 1 ? "" : "s"}`, -total, "WITHDRAWAL");
    ctx.audit({ module: "finance.ap", action: "POST", companyId: p.companyId, summary: `${ctx.actor.displayName} paid ${items.length} bill${items.length === 1 ? "" : "s"} (${money(total)}) in batch ${batchNumber} — ${je.entryNumber}.` });
  },
  "ar.batchEntry"(S, p, ctx) {
    ctx.need("ar.create");
    const rows = (p.rows || []).filter((r) => r.customerId || r.subtotalCents || r.memo);
    if (!rows.length) fail("Add at least one invoice to the batch.");
    rows.forEach((r, i) => {
      const cu = byId(S.customers, r.customerId);
      if (!cu) fail(`Row ${i + 1}: choose a customer.`);
      ctx.company(cu.companyId);
      if (!(Number(r.subtotalCents) > 0)) fail(`Row ${i + 1}: enter the amount before tax.`);
      if (!r.invoiceDate) fail(`Row ${i + 1}: enter the invoice date.`);
      checkJournal(S, { companyId: cu.companyId, date: r.invoiceDate, lines: [{ accountNumber: GL.AR, debitCents: 1 }, { accountNumber: GL.REVENUE, creditCents: 1 }] });
    });
    const batchNumber = nextNum(S.arBatches.map((b) => b.batchNumber), "ARB-2026", 4);
    const batch = { id: ctx.id("arb"), kind: "ENTRY", batchNumber, createdByName: ctx.actor.displayName, createdAt: ctx.now, items: [], totalCents: 0, status: "POSTED" };
    for (const r of rows) {
      const before = S.arInvoices.length;
      R["ar.create"](S, { customerId: r.customerId, subtotalCents: Number(r.subtotalCents), gst: !!r.gst, invoiceDate: r.invoiceDate, memo: r.memo }, ctx);
      const inv = S.arInvoices[before];
      inv.batchId = batch.id; batch.items.push(inv.id); batch.totalCents += inv.totalCents;
    }
    const cos = [...new Set(batch.items.map((id) => byId(S.arInvoices, id).companyId))];
    batch.companyId = cos.length === 1 ? cos[0] : null;
    S.arBatches.push(batch);
    ctx.audit({ module: "finance.ar", action: "CREATE", companyId: batch.companyId, summary: `${ctx.actor.displayName} issued ${batch.items.length} invoice${batch.items.length === 1 ? "" : "s"} (${money(batch.totalCents)}) in batch ${batchNumber}.` });
  },
  "ar.depositBatch"(S, p, ctx) {
    ctx.need("ar.receive");
    ctx.company(p.companyId);
    const date = p.date || ctx.now.slice(0, 10);
    const items = (p.items || []).map((it) => ({ inv: byId(S.arInvoices, it.invoiceId), amt: Number(it.amountCents) })).filter((x) => x.inv);
    if (!items.length) fail("Pick at least one invoice the deposit covers.");
    const lines = [];
    let total = 0;
    for (const { inv, amt } of items) {
      if (inv.companyId !== p.companyId) fail(`${inv.invoiceNumber} belongs to another company — one deposit goes into one bank account.`);
      if (!["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) fail(`${inv.invoiceNumber} isn't waiting for payment.`);
      const due = inv.totalCents - (inv.paidCents || 0);
      if (!(amt > 0) || amt > due) fail(`${inv.invoiceNumber}: enter an amount up to ${money(due)}.`);
      lines.push({ accountNumber: GL.AR, creditCents: amt, description: `${byId(S.customers, inv.customerId)?.name} · ${inv.invoiceNumber}` });
      total += amt;
    }
    if (p.depositCents != null && Number(p.depositCents) !== total) fail(`The deposit is ${money(Number(p.depositCents))} but the invoices you applied add up to ${money(total)} — they must match.`);
    lines.unshift({ accountNumber: GL.BANK, debitCents: total, description: (p.reference || "").trim() || "Bank deposit" });
    const batchNumber = nextNum(S.arBatches.map((b) => b.batchNumber), "DEP-2026", 4);
    const je = postJournal(S, ctx, { companyId: p.companyId, date, memo: `Deposit batch ${batchNumber} — ${items.length} invoice${items.length === 1 ? "" : "s"}`, source: "AR", sourceType: "DepositBatch", reference: batchNumber, lines });
    const batch = { id: ctx.id("arb"), kind: "DEPOSIT", batchNumber, companyId: p.companyId, date, reference: (p.reference || "").trim() || undefined, createdByName: ctx.actor.displayName, createdAt: ctx.now, items: [], totalCents: total, status: "POSTED", journalEntryId: je.id };
    for (const { inv, amt } of items) {
      const cu = byId(S.customers, inv.customerId);
      const num = nextNum(S.payments.filter((x) => x.type === "AR_RECEIPT").map((x) => x.paymentNumber), "RCT", 4);
      S.payments.push({ id: ctx.id("pay"), companyId: inv.companyId, paymentNumber: num, type: "AR_RECEIPT", date, method: "EFT", customerId: cu.id, amountCents: amt, status: "POSTED", journalEntryId: je.id, invoiceId: inv.id, batchId: batch.id });
      inv.paidCents = (inv.paidCents || 0) + amt;
      inv.status = inv.paidCents >= inv.totalCents ? "PAID" : "PARTIALLY_PAID";
      batch.items.push({ invoiceId: inv.id, amountCents: amt, customerName: cu.name, invoiceNumber: inv.invoiceNumber });
    }
    S.arBatches.push(batch);
    bankTxn(S, ctx, p.companyId, date, `Deposit ${batchNumber}${batch.reference ? " — " + batch.reference : ""}`, total, "DEPOSIT");
    ctx.audit({ module: "finance.ar", action: "POST", companyId: p.companyId, summary: `${ctx.actor.displayName} applied a ${money(total)} deposit across ${items.length} invoice${items.length === 1 ? "" : "s"} in batch ${batchNumber} — ${je.entryNumber}.` });
  },
});
const _freshBase = freshState;
freshState = function () { const S = _freshBase(); S.apBatches = []; S.arBatches = []; return S; };

/* ==========================================================================
   Request centre: travel requests, credit-card purchases, travel claims
   ========================================================================== */
const REQUEST_TYPES = {
  TRAVEL_REQUEST: { label: "Travel request", prefix: "TRV", workflow: "TRAVEL_REQUEST", help: "Ask before you go: where, why, dates and the estimated cost. Your manager approves; Finance also approves trips of $2,000 or more." },
  CREDIT_CARD_PURCHASE: { label: "Credit card purchase request", prefix: "CCP", workflow: "CREDIT_CARD_PURCHASE", help: "Ask to put a purchase on a company card. Your manager approves; Finance also approves $1,000 or more." },
  TRAVEL_CLAIM: { label: "Travel claim", prefix: "TCL", workflow: "TRAVEL_CLAIM", help: "After the trip: per diems, mileage and receipts. Your manager approves; Finance approves $500 or more and pays you back." },
};
const TRAVEL_RATES = { perDiemCents: 7500, mileageCentsPerKm: 72 };
const requestTypeLabel = (t) => REQUEST_TYPES[t]?.label || t;

Object.assign(R, {
  "request.create"(S, p, ctx) {
    const emp = myEmp(S, ctx);
    const meta = REQUEST_TYPES[p.type];
    if (!meta) fail("Unknown request type.");
    const d = p.details || {};
    let title = "", amount = 0, start = d.startDate || null, end = d.endDate || d.startDate || null;
    if (p.type === "TRAVEL_REQUEST") {
      if (!d.destination || !d.purpose || !d.startDate) fail("Where, why and when are needed.");
      if (end < start) fail("The return date is before the departure date.");
      const nights = Math.max(0, Math.round((D(end) - D(start)) / MS_DAY));
      d.nights = nights; d.days = nights + 1;
      d.estimate = { airfare: d.airfare || 0, accommodation: d.accommodation || 0, groundTransport: d.groundTransport || 0, other: d.other || 0, perDiem: (nights + 1) * TRAVEL_RATES.perDiemCents };
      amount = Object.values(d.estimate).reduce((s, v) => s + v, 0);
      title = `${d.destination} · ${d.purpose}`;
    } else if (p.type === "CREDIT_CARD_PURCHASE") {
      if (!d.vendor || !d.description || !(d.amountCents > 0)) fail("Who you're buying from, what, and how much are needed.");
      amount = d.amountCents; title = `${d.description} — ${d.vendor}`; start = null; end = null;
    } else {
      if (!d.trip || !d.startDate) fail("Say which trip this is for and when it was.");
      if (end < start) fail("The return date is before the departure date.");
      d.lines = { perDiem: Math.round((d.perDiemDays || 0) * TRAVEL_RATES.perDiemCents), mileage: Math.round((d.km || 0) * TRAVEL_RATES.mileageCentsPerKm), airfare: d.airfare || 0, accommodation: d.accommodation || 0, other: d.other || 0 };
      amount = Object.values(d.lines).reduce((s, v) => s + v, 0);
      if (amount <= 0) fail("Add at least one amount — per diem days, kilometres or a receipt.");
      title = d.trip;
    }
    const requestNumber = nextNum(S.requests.filter((r) => r.type === p.type).map((r) => r.requestNumber), `${meta.prefix}-2026`, 4);
    const r = { id: ctx.id("rq"), companyId: emp.companyId, employeeId: emp.id, requestNumber, type: p.type, title, details: d, amountCents: amount, startDate: start || undefined, endDate: end || undefined, status: "PENDING_APPROVAL", createdAt: ctx.now };
    S.requests.push(r);
    const inst = startApproval(S, ctx, { workflowCode: meta.workflow, companyId: emp.companyId, entityType: "EmployeeRequest", entityId: r.id, entityLabel: `${meta.label} ${requestNumber} — ${empName(emp)} · ${title}${amount > 0 ? ` (${money(amount)})` : ""}`, amountCents: amount });
    if (inst) r.approvalInstanceId = inst.id; else Object.assign(r, { status: "APPROVED", decidedByName: "Auto", decidedAt: ctx.now });
    ctx.audit({ module: "requests", action: "SUBMIT", companyId: emp.companyId, summary: `${empName(emp)} sent ${meta.label.toLowerCase()} ${requestNumber} — ${title} (${money(amount)}).` });
  },
  "request.withdraw"(S, p, ctx) {
    const emp = myEmp(S, ctx);
    const list = p.kind === "purchase" ? S.purchaseRequests : S.requests;
    const r = byId(list, p.id);
    const mine = r && (p.kind === "purchase" ? r.requestedById === ctx.actor.id : r.employeeId === emp.id);
    if (!r || !mine || r.status !== "PENDING_APPROVAL") fail("That request can no longer be withdrawn.");
    r.status = "CANCELLED";
    const inst = byId(S.approvals, r.approvalInstanceId);
    if (inst) Object.assign(inst, { status: "CANCELLED", completedAt: ctx.now });
    ctx.audit({ module: "requests", action: "STATUS_CHANGE", companyId: emp.companyId, summary: `${ctx.actor.displayName} withdrew ${r.requestNumber}.` });
  },
  "request.pay"(S, p, ctx) {
    ctx.need("expenses.reimburse");
    const r = byId(S.requests, p.id);
    if (!r || r.type !== "TRAVEL_CLAIM" || r.status !== "APPROVED") fail("Only approved travel claims can be paid.");
    ctx.company(r.companyId);
    const emp = byId(S.employees, r.employeeId);
    const date = ctx.now.slice(0, 10);
    const je = postJournal(S, ctx, { companyId: r.companyId, date, memo: `Travel claim ${r.requestNumber} — ${empName(emp)}`, source: "EXPENSE", sourceType: "EmployeeRequest", sourceId: r.id, reference: r.requestNumber, lines: [{ accountNumber: "5300", debitCents: r.amountCents, description: r.title }, { accountNumber: GL.BANK, creditCents: r.amountCents, description: `Reimburse ${empName(emp)}` }] });
    Object.assign(r, { status: "PAID", paidAt: ctx.now, paidByName: ctx.actor.displayName, journalEntryId: je.id });
    bankTxn(S, ctx, r.companyId, date, `Travel claim ${r.requestNumber} — ${empName(emp)}`, -r.amountCents, "WITHDRAWAL");
    const u = userOfEmployee(S, emp.id);
    if (u) ctx.notify(u.id, { type: "APPROVED", title: `Paid back: travel claim ${r.requestNumber}`, body: `${money(r.amountCents)} deposited to your account.`, linkUrl: `/me/requests/${r.id}` });
    ctx.audit({ module: "finance.expenses", action: "POST", companyId: r.companyId, summary: `${ctx.actor.displayName} paid back travel claim ${r.requestNumber} (${money(r.amountCents)}) — ${je.entryNumber}.` });
  },
});

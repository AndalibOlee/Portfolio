/* ==========================================================================
   views-proj.js — Projects & time billing. Mirrors src/lib/proj-calc.ts,
   proj-billing.ts and app/(app)/projects/* in the live app.
   Plain-English rules (also shown in captions):
    - "Spent so far" = posted journal lines on expense accounts tagged with the
      project (bills, paid-back claims, manual journals) PLUS the cost of hours
      on timesheets (hours × hourly rate, or salary ÷ 2,080).
    - "Ready to bill" (time & materials) = approved billable hours × project rate
      + billable expense-claim lines not yet on an invoice.
   ========================================================================== */
injectCss(`
.pjbar{height:7px;border-radius:9px;background:var(--muted);overflow:hidden;margin-top:5px;width:150px}
.pjbar i{display:block;height:100%;border-radius:9px;background:#17566b}
.pjbar i.over{background:var(--t-red)}
.pjbar i.near{background:var(--t-amber)}
.pjbill{display:inline-block;border-radius:99px;padding:2px 9px;font-size:10.5px;font-weight:700;white-space:nowrap}
.pjbill.TIME_AND_MATERIALS{background:var(--t-teal-bg);color:var(--t-teal)}
.pjbill.FIXED_FEE{background:var(--t-blue-bg);color:var(--t-blue)}
.pjbill.NON_BILLABLE{background:var(--t-grey-bg);color:var(--t-grey)}
.pjvar.good{color:var(--t-green)}.pjvar.warn{color:var(--t-amber)}.pjvar.bad{color:var(--t-red);font-weight:600}.pjvar.none{color:var(--muted-fg)}
.pjgrid{display:grid;gap:14px;grid-template-columns:minmax(0,1fr) 340px;align-items:start}
@media (max-width:1000px){.pjgrid{grid-template-columns:minmax(0,1fr)}}
.pjnote{border-top:1px solid var(--border);padding:10px 14px;font-size:11.5px;color:var(--muted-fg)}
.pjlines{display:grid;gap:8px}
.pjline{display:grid;gap:8px;grid-template-columns:150px minmax(0,1fr) 130px 100px;align-items:end}
@media (max-width:720px){.pjline{grid-template-columns:1fr 1fr}}
.pjtoggle{border:1px solid var(--input);background:var(--card);border-radius:999px;padding:3px 10px;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;color:var(--muted-fg)}
.pjtoggle.on{background:var(--t-green-bg);border-color:transparent;color:var(--t-green)}
.pjtoggle[disabled]{cursor:not-allowed;opacity:.7}
.pjpend{display:flex;gap:8px;align-items:flex-start;border:1px solid #ead9b5;background:var(--t-amber-bg);color:var(--t-amber);border-radius:10px;padding:8px 10px;font-size:12px;margin-bottom:10px}
tr.pjmuted td{color:var(--muted-fg)}
.pjstatus{display:flex;flex-wrap:wrap;gap:8px}
`);

/* ---------------- constants ---------------- */
const PROJ_BILLING = { TIME_AND_MATERIALS: "Time & materials", FIXED_FEE: "Fixed fee", NON_BILLABLE: "Not billable" };
const PROJ_CATS = ["LABOUR", "MATERIALS", "EXPENSES", "OTHER"];
const PROJ_CAT_LABEL = { LABOUR: "Labour", MATERIALS: "Materials", EXPENSES: "Expenses", OTHER: "Other" };
const PROJ_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const PROJ_STATUS_LABEL = { ACTIVE: ["Active", "green"], ON_HOLD: ["On hold", "amber"], COMPLETED: ["Completed", "green"], CANCELLED: ["Cancelled", "grey"] };
const PROJ_APPROVED_TS = ["APPROVED", "LOCKED"], PROJ_PENDING_TS = ["SUBMITTED"], PROJ_LOGGED_TS = ["DRAFT", "SUBMITTED", "APPROVED", "LOCKED"], PROJ_BILLABLE_CLAIM = ["APPROVED", "REIMBURSED"];
const projBadge = (s) => { const m = PROJ_STATUS_LABEL[s] || [s, "grey"]; return `<span class="badge tone-${m[1]}">${esc(m[0])}</span>`; };
const projBillBadge = (t) => `<span class="pjbill ${esc(t)}">${esc(PROJ_BILLING[t] || t)}</span>`;
const projCustomer = (id) => (id ? byId(S.customers, id)?.name || "—" : "");

/** Which budget bucket a GL expense account falls into (uniform chart numbers). */
function projCategoryOfAccount(number) {
  const n = Number(number);
  if (n >= 5100 && n < 5200) return "LABOUR";
  if ((n >= 5200 && n < 5300) || (n >= 5400 && n < 5500)) return "MATERIALS";
  if ((n >= 5300 && n < 5400) || (n >= 5500 && n < 5600) || n === 5900) return "EXPENSES";
  return "OTHER";
}
/** cost of one hour of a person's time from the pay record in force on that date */
function projCostRate(S, employeeId, onDate) {
  const comps = S.compensations.filter((c) => c.employeeId === employeeId).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
  if (!comps.length) return 0;
  const c = comps.find((x) => x.effectiveDate <= onDate) || comps[comps.length - 1];
  if (c.payType === "HOURLY") return c.hourlyRateCents || 0;
  return Math.round((c.annualSalaryCents || 0) / 2080);
}
/** every worked timesheet row on the project, joined to its sheet and person */
function projEntries(S, pid) {
  const out = [];
  for (const e of S.timesheetEntries) {
    if (e.projectId !== pid || !((e.workedHours || 0) > 0)) continue;
    const sheet = byId(S.timesheets, e.timesheetId);
    if (!sheet || !PROJ_LOGGED_TS.includes(sheet.status)) continue;
    out.push({ e, sheet, emp: byId(S.employees, sheet.employeeId), billable: e.isBillable !== false });
  }
  return out.sort((a, b) => (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : 0));
}
/** expense-claim lines coded to the project */
function projExpLines(S, pid) {
  return (S.expenseLines || []).filter((l) => l.projectId === pid).map((l) => { const claim = byId(S.expenseClaims, l.expenseClaimId); return { l, claim, emp: claim ? byId(S.employees, claim.employeeId) : null, billable: l.isBillable !== false }; }).filter((x) => x.claim).sort((a, b) => (a.l.date < b.l.date ? -1 : 1));
}
/** posted journal lines on expense accounts tagged with the project */
function projGlLines(S, pid) {
  const out = [];
  for (const l of S.journalLines) {
    if (l.projectId !== pid) continue;
    const je = byId(S.journalEntries, l.journalEntryId), a = byId(S.accounts, l.accountId);
    if (!je || je.status !== "POSTED" || !a || a.type !== "EXPENSE") continue;
    out.push({ l, je, a, cat: projCategoryOfAccount(a.number), net: (l.debitCents || 0) - (l.creditCents || 0) });
  }
  return out.sort((a, b) => (a.je.date < b.je.date ? -1 : 1));
}
const projInvoices = (S, pid) => S.arInvoices.filter((i) => i.projectId === pid).sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : a.invoiceDate > b.invoiceDate ? -1 : b.invoiceNumber.localeCompare(a.invoiceNumber)));

/** the numbers every project screen agrees on (mirrors projectStats in proj-calc.ts) */
function projStats(S, p) {
  const z = () => ({ LABOUR: 0, MATERIALS: 0, EXPENSES: 0, OTHER: 0 });
  const s = { glByCategory: z(), glExpenseCents: 0, hoursLogged: 0, hoursApproved: 0, hoursPending: 0, labourCostApprovedCents: 0, labourCostPendingCents: 0, labourCostCents: 0, actualCents: 0, actualByCategory: z(),
    unbilledHours: 0, unbilledTimeCents: 0, unbilledExpenseCents: 0, unbilledCents: 0, pendingBillableHours: 0, pendingBillableCents: 0, billedSubtotalCents: 0, billedTotalCents: 0, paidCents: 0, invoiceCount: 0, percentComplete: 0, percentBasis: "none" };
  for (const g of projGlLines(S, p.id)) { s.glByCategory[g.cat] += g.net; s.glExpenseCents += g.net; }
  const tm = p.billingType === "TIME_AND_MATERIALS";
  for (const { e, sheet, billable } of projEntries(S, p.id)) {
    const cost = Math.round(e.workedHours * projCostRate(S, sheet.employeeId, e.date));
    s.hoursLogged += e.workedHours;
    if (PROJ_APPROVED_TS.includes(sheet.status)) {
      s.hoursApproved += e.workedHours; s.labourCostApprovedCents += cost;
      if (billable && !e.billedInvoiceId && tm) { s.unbilledHours += e.workedHours; s.unbilledTimeCents += Math.round(e.workedHours * (p.hourlyRateCents || 0)); }
    } else if (PROJ_PENDING_TS.includes(sheet.status)) {
      s.hoursPending += e.workedHours; s.labourCostPendingCents += cost;
      if (billable && !e.billedInvoiceId) { s.pendingBillableHours += e.workedHours; s.pendingBillableCents += Math.round(e.workedHours * (p.hourlyRateCents || 0)); }
    }
  }
  s.labourCostCents = s.labourCostApprovedCents + s.labourCostPendingCents;
  if (tm) for (const x of projExpLines(S, p.id)) if (x.billable && !x.l.billedInvoiceId && PROJ_BILLABLE_CLAIM.includes(x.claim.status)) s.unbilledExpenseCents += x.l.amountCents;
  s.unbilledCents = s.unbilledTimeCents + s.unbilledExpenseCents;
  for (const i of projInvoices(S, p.id)) { if (i.status === "CANCELLED") continue; s.invoiceCount++; s.billedSubtotalCents += i.subtotalCents; s.billedTotalCents += i.totalCents; s.paidCents += i.paidCents || 0; }
  s.actualByCategory = { ...s.glByCategory, LABOUR: s.glByCategory.LABOUR + s.labourCostCents };
  s.actualCents = s.glExpenseCents + s.labourCostCents;
  if (p.budgetHours > 0) { s.percentBasis = "hours"; s.percentComplete = Math.min(100, Math.round((s.hoursLogged / p.budgetHours) * 100)); }
  else if (p.budgetCents > 0) { s.percentBasis = "cost"; s.percentComplete = Math.min(100, Math.round((s.actualCents / p.budgetCents) * 100)); }
  return s;
}
/** plain words for a budget line's variance */
function projVariance(budgetCents, actualCents) {
  if (!(budgetCents > 0)) return actualCents > 0 ? { text: "No budget set for this", tone: "warn" } : { text: "Nothing yet", tone: "none" };
  const u = actualCents / budgetCents;
  if (u > 1) return { text: `Over budget by ${Math.round((u - 1) * 100)}%`, tone: "bad" };
  if (u >= 0.9) return { text: `${Math.round(u * 100)}% used — close to the limit`, tone: "warn" };
  if (u === 0) return { text: "Nothing spent yet", tone: "none" };
  return { text: `${Math.round(u * 100)}% used — on track`, tone: "good" };
}
function projBar(budget, actual, label) {
  const pct = budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : actual > 0 ? 100 : 0;
  const cls = budget > 0 && actual > budget ? "over" : pct >= 90 ? "near" : "";
  return `<div class="hint num" style="white-space:nowrap">${esc(label)}</div><div class="pjbar"><i class="${cls}" style="width:${pct}%"></i></div>`;
}
const projLines = (S, pid) => S.projectBudgetLines.filter((l) => l.projectId === pid);

/* ==========================================================================
   Reducers
   ========================================================================== */
const PROJ_MAX_LINES = 4;
/** read + check the header fields shared by create and edit (same guards as actions.ts) */
function projReadHeader(S, p, companyId) {
  const str = (k) => String(p[k] ?? "").trim();
  const code = str("code").toUpperCase(), name = str("name");
  if (!code) fail("Give the project a short code (for example TF-2026-09).");
  if (!name) fail("Give the project a name.");
  const customerId = str("customerId") || null, managerId = str("managerId") || null;
  if (customerId) { const c = byId(S.customers, customerId); if (!c || c.companyId !== companyId) fail("That customer belongs to a different company than the project."); }
  if (managerId && !byId(S.employees, managerId)) fail("Pick a project manager from the list.");
  const startDate = str("startDate") || null, endDate = str("endDate") || null;
  if (startDate && endDate && endDate < startDate) fail("The end date is before the start date.");
  const billingType = str("billingType");
  if (!PROJ_BILLING[billingType]) fail("Pick how this project is billed.");
  const hourlyRateCents = toCents(str("hourlyRate") || "0");
  const fixedFeeCents = str("fixedFee") ? toCents(str("fixedFee")) : null;
  if (!Number.isFinite(hourlyRateCents) || (fixedFeeCents != null && !Number.isFinite(fixedFeeCents))) fail("Rates and fees must be numbers.");
  if (billingType === "TIME_AND_MATERIALS" && hourlyRateCents <= 0) fail("Time & materials projects need an hourly rate to bill at.");
  if (billingType === "FIXED_FEE" && !(fixedFeeCents > 0)) fail("Fixed-fee projects need the agreed fee amount.");
  if (billingType !== "NON_BILLABLE" && !customerId) fail("A billable project needs a customer to send invoices to.");
  const budgetCents = str("budget") ? toCents(str("budget")) : null;
  const budgetHours = str("budgetHours") ? Number(str("budgetHours")) : null;
  if (budgetCents != null && !(budgetCents >= 0)) fail("The budget can't be negative.");
  if (budgetHours != null && !(budgetHours >= 0)) fail("Budget hours must be a number.");
  const lines = [];
  (p.lines || []).slice(0, PROJ_MAX_LINES).forEach((l, i) => {
    const category = String(l.category || "").trim(), amount = String(l.amount || "").trim(), hours = String(l.hours || "").trim(), description = String(l.description || "").trim();
    if (!category && !amount && !hours && !description) return;
    if (!PROJ_CATS.includes(category)) fail(`Budget line ${i + 1}: pick a category.`);
    const cents = amount ? toCents(amount) : 0;
    if (!(cents >= 0)) fail(`Budget line ${i + 1}: the amount can't be negative.`);
    const h = hours ? Number(hours) : null;
    if (h != null && !(h >= 0)) fail(`Budget line ${i + 1}: hours must be a number.`);
    lines.push({ category, description: description || null, budgetCents: cents, budgetHours: h });
  });
  return { code, name, description: str("description") || null, customerId, managerId, startDate, endDate, billingType, hourlyRateCents, fixedFeeCents: billingType === "FIXED_FEE" ? fixedFeeCents : null, budgetCents, budgetHours, lines };
}
const projLabel = (p) => `${p.code} ${p.name}`;

/** Project → customer invoice, posted like a sales-order invoice: Dr 1200 / Cr 4000 / Cr 2410 */
function projPostInvoice(S, ctx, p, memo, lines) {
  const cu = p.customerId ? byId(S.customers, p.customerId) : null;
  if (!cu) fail("This project has no customer to bill — set one on the Edit tab first.");
  const sub = lines.reduce((s, l) => s + l.amountCents, 0), tax = lines.reduce((s, l) => s + l.taxCents, 0), total = sub + tax;
  if (sub <= 0) fail("There is nothing to bill.");
  const date = ctx.now.slice(0, 10);
  const num = nextNum(S.arInvoices.map((i) => i.invoiceNumber), "INV-2026", 4);
  const je = postJournal(S, ctx, { companyId: p.companyId, date, memo: `Invoice ${num} — ${cu.name} (${p.code})`, source: "AR", sourceType: "ArInvoice", reference: num, lines: [
    { accountNumber: GL.AR, debitCents: total, description: "Receivable", projectId: p.id },
    { accountNumber: GL.REVENUE, creditCents: sub, description: `Project billing — ${p.code}`, projectId: p.id },
    ...(tax ? [{ accountNumber: GL.GST_PAY, creditCents: tax, description: "GST collected" }] : []),
  ] });
  const inv = { id: ctx.id("ar"), companyId: p.companyId, customerId: cu.id, invoiceNumber: num, type: "INVOICE", invoiceDate: date, dueDate: addDays(date, cu.paymentTermsDays || 30), projectId: p.id, memo, subtotalCents: sub, taxCents: tax, totalCents: total, paidCents: 0, status: "SENT", journalEntryId: je.id, postedAt: ctx.now, sentAt: ctx.now };
  S.arInvoices.push(inv);
  lines.forEach((l) => S.arLines.push({ id: ctx.id("arl"), arInvoiceId: inv.id, ...l }));
  return { inv, je, cu, sub, tax, total };
}
const projGst = (c) => Math.round(c * 0.05);

Object.assign(R, {
  "proj.create"(S, p, ctx) {
    ctx.need("projects.manage");
    const c = byId(S.companies, p.companyId);
    if (!c || c.isActive === false) fail("Pick the company this project belongs to.");
    ctx.company(c.id);
    const h = projReadHeader(S, p, c.id);
    if (S.projects.some((x) => x.companyId === c.id && x.code === h.code)) fail(`${c.displayName} already has a project with code ${h.code}.`);
    const { lines, ...header } = h;
    const prj = { id: ctx.id("prj"), companyId: c.id, ...header, status: "ACTIVE", createdAt: ctx.now };
    S.projects.push(prj);
    lines.forEach((l) => S.projectBudgetLines.push({ id: ctx.id("pbl"), projectId: prj.id, ...l }));
    ctx.audit({ module: "projects", action: "CREATE", companyId: c.id, entityType: "Project", entityId: prj.id, summary: `${ctx.actor.displayName} created project ${h.code} — ${h.name} (${c.displayName}).` });
  },
  "proj.edit"(S, p, ctx) {
    ctx.need("projects.manage");
    const prj = byId(S.projects, p.projectId);
    if (!prj) fail("That project no longer exists.");
    ctx.company(prj.companyId);
    const h = projReadHeader(S, p, prj.companyId);
    if (h.code !== prj.code && S.projects.some((x) => x.companyId === prj.companyId && x.code === h.code && x.id !== prj.id)) fail(`${co(prj.companyId)?.displayName} already has a project with code ${h.code}.`);
    if (h.billingType !== prj.billingType) { const n = projInvoices(S, prj.id).filter((i) => i.status !== "CANCELLED").length; if (n) fail(`This project already has ${n} invoice(s), so the billing type can't change. Set up a new project instead.`); }
    const { lines, ...header } = h;
    Object.assign(prj, header);
    S.projectBudgetLines = S.projectBudgetLines.filter((l) => l.projectId !== prj.id);
    lines.forEach((l) => S.projectBudgetLines.push({ id: ctx.id("pbl"), projectId: prj.id, ...l }));
    ctx.audit({ module: "projects", action: "UPDATE", companyId: prj.companyId, entityType: "Project", entityId: prj.id, summary: `${ctx.actor.displayName} updated project ${h.code} — ${h.name}: budget ${h.budgetCents != null ? money(h.budgetCents) : "none"}, ${h.budgetHours ?? 0} h, ${lines.length} budget line(s).` });
  },
  "proj.status"(S, p, ctx) {
    ctx.need("projects.manage");
    const prj = byId(S.projects, p.projectId);
    if (!prj) fail("That project no longer exists.");
    ctx.company(prj.companyId);
    const status = p.status;
    if (!PROJ_STATUSES.includes(status)) fail("Pick a status.");
    if (status === prj.status) fail(`The project is already ${status.toLowerCase().replace("_", " ")}.`);
    if (status === "COMPLETED" || status === "CANCELLED") {
      const s = projStats(S, prj);
      if (prj.billingType === "TIME_AND_MATERIALS" && s.unbilledCents > 0) fail(`${money(s.unbilledCents)} of time and expenses is still unbilled. Create the invoice on the Billing tab (or mark those rows not billable) before closing the project.`);
      if (status === "CANCELLED" && s.invoiceCount > 0) fail("This project has invoices, so it can be completed but not cancelled.");
    }
    const was = prj.status;
    prj.status = status;
    ctx.audit({ module: "projects", action: "STATUS_CHANGE", companyId: prj.companyId, entityType: "Project", entityId: prj.id, summary: `${ctx.actor.displayName} changed ${prj.code} from ${was} to ${status}.` });
  },
  "proj.time.billable"(S, p, ctx) {
    ctx.need("projects.manage");
    const e = byId(S.timesheetEntries, p.entryId);
    const prj = e?.projectId ? byId(S.projects, e.projectId) : null;
    if (!e || !prj) fail("That time entry no longer exists.");
    const sheet = byId(S.timesheets, e.timesheetId);
    ctx.company(sheet?.companyId || prj.companyId);
    if (e.billedInvoiceId) fail("That row is already on an invoice, so it can't be changed.");
    const next = e.isBillable === false;
    e.isBillable = next;
    ctx.audit({ module: "projects", action: "UPDATE", companyId: prj.companyId, entityType: "TimesheetEntry", entityId: e.id, summary: `${ctx.actor.displayName} marked ${e.workedHours} h by ${empName(byId(S.employees, sheet?.employeeId))} on ${e.date} (${prj.code}) as ${next ? "billable" : "not billable"}.` });
  },
  "proj.invoice"(S, p, ctx) {
    ctx.need("ar.create"); ctx.need("projects.view");
    const prj = byId(S.projects, p.projectId);
    if (!prj) fail("That project no longer exists.");
    ctx.company(prj.companyId);
    if (prj.status !== "ACTIVE") fail("Only active projects can be billed — set it back to active on the Edit tab first.");
    if (prj.billingType === "TIME_AND_MATERIALS") {
      if (!(prj.hourlyRateCents > 0)) fail("Set an hourly rate on the project before billing time.");
      const statuses = p.includePending ? [...PROJ_APPROVED_TS, ...PROJ_PENDING_TS] : PROJ_APPROVED_TS;
      const entries = projEntries(S, prj.id).filter((x) => x.billable && !x.e.billedInvoiceId && statuses.includes(x.sheet.status));
      const expenses = projExpLines(S, prj.id).filter((x) => x.billable && !x.l.billedInvoiceId && PROJ_BILLABLE_CLAIM.includes(x.claim.status));
      if (!entries.length && !expenses.length) fail("Nothing is waiting to be billed on this project.");
      const byPerson = new Map();
      for (const x of entries) { const n = empName(x.emp); byPerson.set(n, (byPerson.get(n) || 0) + x.e.workedHours); }
      const lines = [];
      for (const [name, hours] of byPerson) { const amountCents = Math.round(hours * prj.hourlyRateCents); lines.push({ description: `Labour — ${name}, ${hours.toFixed(2)} h @ ${money(prj.hourlyRateCents)}`, accountNumber: GL.REVENUE, quantity: hours, unitCents: prj.hourlyRateCents, amountCents, taxCode: "GST", taxCents: projGst(amountCents) }); }
      for (const x of expenses) lines.push({ description: `Expense — ${x.l.merchant} (${empName(x.emp)}, ${x.l.date})`, accountNumber: GL.REVENUE, quantity: 1, unitCents: x.l.amountCents, amountCents: x.l.amountCents, taxCode: "GST", taxCents: projGst(x.l.amountCents) });
      const hours = entries.reduce((s, x) => s + x.e.workedHours, 0);
      const memo = `Project ${prj.code} — ${prj.name}: ${hours.toFixed(2)} h of time${expenses.length ? ` and ${expenses.length} expense(s)` : ""}${p.includePending ? " (includes hours still awaiting approval)" : ""}`;
      const r = projPostInvoice(S, ctx, prj, memo, lines);
      for (const x of entries) x.e.billedInvoiceId = r.inv.id;
      for (const x of expenses) x.l.billedInvoiceId = r.inv.id;
      ctx.audit({ module: "finance.ar", action: "CREATE", companyId: prj.companyId, entityType: "ArInvoice", entityId: r.inv.id, summary: `${ctx.actor.displayName} billed ${r.cu.name} ${money(r.total)} (${r.inv.invoiceNumber}) for ${hours.toFixed(2)} h${expenses.length ? ` and ${expenses.length} expense(s)` : ""} on ${prj.code} and posted ${r.je.entryNumber}.` });
    } else if (prj.billingType === "FIXED_FEE") {
      const fee = prj.fixedFeeCents || 0;
      if (fee <= 0) fail("Set the fixed fee on the project before billing it.");
      const percent = Number(p.percent);
      if (!(percent > 0) || percent > 100) fail("Enter a percentage between 1 and 100.");
      const billedSoFar = projInvoices(S, prj.id).filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.subtotalCents, 0);
      const amountCents = Math.round((fee * percent) / 100);
      if (billedSoFar + amountCents > fee + 1) { const left = Math.max(0, fee - billedSoFar); fail(`That would bill more than the agreed fee. ${left > 0 ? `Only ${money(left)} (${Math.round((left / fee) * 100)}%) is left to bill.` : "The whole fee has already been billed."}`); }
      const r = projPostInvoice(S, ctx, prj, `Project ${prj.code} — ${prj.name}: ${percent}% of fixed fee`, [{ description: `${prj.name} — ${percent}% of fixed fee ${money(fee)}`, accountNumber: GL.REVENUE, quantity: 1, unitCents: amountCents, amountCents, taxCode: "GST", taxCents: projGst(amountCents) }]);
      ctx.audit({ module: "finance.ar", action: "CREATE", companyId: prj.companyId, entityType: "ArInvoice", entityId: r.inv.id, summary: `${ctx.actor.displayName} billed ${r.cu.name} ${percent}% of the ${money(fee)} fixed fee on ${prj.code} (${r.inv.invoiceNumber}, ${money(r.total)}) and posted ${r.je.entryNumber}.` });
    } else fail("This project is not billable — it tracks cost only.");
  },
});

/* ==========================================================================
   Views
   ========================================================================== */
const PROJ_CHIPS = [["all", "All", []], ["active", "Active", ["ACTIVE"]], ["hold", "On hold", ["ON_HOLD"]], ["done", "Completed", ["COMPLETED", "CANCELLED"]]];
const projFilters = () => (UI.filters.proj || (UI.filters.proj = { status: "all", co: "" }));

function vProjList() {
  UI.projDraft = null;
  const f = projFilters();
  const chip = PROJ_CHIPS.find((c) => c[0] === f.status) || PROJ_CHIPS[0];
  const all = inScope(S.projects).sort((a, b) => a.status.localeCompare(b.status) || a.code.localeCompare(b.code));
  const stats = new Map(all.map((p) => [p.id, projStats(S, p)]));
  const coOk = (p) => !f.co || p.companyId === f.co;
  const list = all.filter((p) => coOk(p) && (chip[2].length ? chip[2].includes(p.status) : true));
  const active = all.filter((p) => coOk(p) && p.status === "ACTIVE");
  const totalBudget = active.reduce((s, p) => s + (p.budgetCents || 0), 0), totalActual = active.reduce((s, p) => s + stats.get(p.id).actualCents, 0), totalUnbilled = active.reduce((s, p) => s + stats.get(p.id).unbilledCents, 0);
  const count = (sts) => all.filter((p) => coOk(p) && (sts.length ? sts.includes(p.status) : true)).length;
  const cos = scopeIds(S, A);
  const chips = PROJ_CHIPS.map(([k, t, sts]) => `<button class="hchip ${k === chip[0] ? "on" : ""}" data-a="projFilter" data-k="status" data-v="${k}">${esc(t)} <span class="mono">${count(sts)}</span></button>`).join("")
    + (cos.length > 1 ? `<span style="width:1px;height:20px;background:var(--border);margin:0 4px"></span><button class="hchip ${!f.co ? "on" : ""}" data-a="projFilter" data-k="co" data-v="">Every company</button>${cos.map((id) => `<button class="hchip ${f.co === id ? "on" : ""}" data-a="projFilter" data-k="co" data-v="${id}"><span class="sq" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${esc(co(id).colorTag)};margin-right:6px"></span>${esc(co(id).displayName)}</button>`).join("")}` : "");
  const acts = dlButton("projects", "Download", { variant: "outline" }) + (can(A, "projects.manage") ? `<button class="btn pri" data-go="/projects/new">+ New project</button>` : "");
  const rows = list.map((p) => {
    const s = stats.get(p.id);
    return `<tr class="click" data-go="/projects/${p.id}"><td><strong style="color:var(--primary)">${esc(p.name)}</strong><div class="hint"><span class="mono">${esc(p.code)}</span> · ${coTag(p.companyId)}</div></td><td>${p.customerId ? esc(projCustomer(p.customerId)) : `<span class="hint">Internal</span>`}</td><td>${esc(empName(byId(S.employees, p.managerId)))}</td><td>${projBillBadge(p.billingType)}</td><td>${projBar(p.budgetCents || 0, s.actualCents, `${moneyCompact(s.actualCents)} of ${p.budgetCents != null ? moneyCompact(p.budgetCents) : "—"}`)}</td>${td(`${hrs(s.hoursLogged)}${p.budgetHours ? `<div class="hint">of ${hrs(p.budgetHours)}</div>` : ""}`, 1)}${td(p.billingType === "TIME_AND_MATERIALS" ? money(s.unbilledCents) : `<span class="hint">—</span>`, 1)}${td(s.percentBasis === "none" ? "—" : `${s.percentComplete}%<div class="hint">by ${s.percentBasis}</div>`, 1)}<td>${projBadge(p.status)}</td></tr>`;
  });
  return ph("Projects", "Each job's budget, what has been spent, hours worked and what is ready to bill. Spending and hours flow in automatically from bills, expenses and timesheets.", acts) + flashHtml()
    + `<div class="pjgrid"><div class="grid g3" style="align-content:start">${stat("Active budgets", money(totalBudget), `${active.length} active project${active.length === 1 ? "" : "s"}`, "primary")}${stat("Spent so far", money(totalActual), totalBudget ? `${Math.round((totalActual / totalBudget) * 100)}% of active budgets` : "Across active projects", totalBudget && totalActual > totalBudget ? "warn" : "")}${stat("Ready to bill", money(totalUnbilled), "Approved time & expenses not yet invoiced", totalUnbilled ? "good" : "")}</div>
      ${card("Spent so far, by project", donut(active.map((p) => ({ label: p.name, v: stats.get(p.id).actualCents, d: money(stats.get(p.id).actualCents) })), { total: money(totalActual), caption: "Active projects", size: 150 }))}</div>
      <div class="form-row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:18px 0 10px">${chips}</div>`
    + cardFlush("", table(["Project", "Customer", "Run by", "Billing", "Budget vs spent", ">Hours", ">Ready to bill", ">Done", "Status"], rows, "No projects match this filter."));
}

/* ---------- create / edit form ---------- */
/** form values as strings (what the form shows and what the reducer receives) */
function projToVals(p, lines) {
  const dollars = (c) => (c == null || c === 0 ? "" : (c / 100).toFixed(2));
  return { code: p.code, name: p.name, description: p.description || "", customerId: p.customerId || "", managerId: p.managerId || "", startDate: p.startDate || "", endDate: p.endDate || "", billingType: p.billingType, hourlyRate: dollars(p.hourlyRateCents), fixedFee: dollars(p.fixedFeeCents), budget: dollars(p.budgetCents), budgetHours: p.budgetHours ?? "",
    lines: (lines || []).map((l) => ({ category: l.category, description: l.description || "", amount: dollars(l.budgetCents), hours: l.budgetHours ?? "" })) };
}
function projForm(p, v) {
  const cos = S.companies.filter((c) => scopeIds(S, A).includes(c.id));
  const cus = inScope(S.customers).sort((a, b) => a.name.localeCompare(b.name));
  const emps = inScope(S.employees).filter((e) => !["TERMINATED", "INACTIVE"].includes(e.status)).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const ls = [...(v.lines || [])]; while (ls.length < PROJ_MAX_LINES) ls.push({});
  return `<div class="form-grid">
    ${p ? `<div class="fld"><label>Company</label><div class="in" style="display:flex;align-items:center">${coTag(p.companyId)}</div></div>` : `<div class="fld"><label for="pjCo">Company</label><select class="in" id="pjCo" name="companyId" required>${cos.map((c) => opt(c.id, c.displayName, c.id === (v.companyId || A.activeCompanyId))).join("")}</select></div>`}
    <div class="fld"><label for="pjCode">Project code</label><input class="in mono" id="pjCode" name="code" value="${esc(v.code || "")}" placeholder="TF-2026-09" required></div>
    <div class="fld" style="grid-column:span 2"><label for="pjName">Name</label><input class="in" id="pjName" name="name" value="${esc(v.name || "")}" placeholder="What the job is called" required></div>
    <div class="fld" style="grid-column:1/-1"><label for="pjDesc">Description</label><input class="in" id="pjDesc" name="description" value="${esc(v.description || "")}" placeholder="One line on what this project covers (optional)"></div>
    <div class="fld"><label for="pjCu">Customer</label><select class="in" id="pjCu" name="customerId">${opt("", "— none (internal) —", !v.customerId)}${cus.map((c) => opt(c.id, `${c.name} · ${co(c.companyId).displayName}`, c.id === v.customerId)).join("")}</select></div>
    <div class="fld"><label for="pjMgr">Project manager</label><select class="in" id="pjMgr" name="managerId">${opt("", "— none —", !v.managerId)}${emps.map((e) => opt(e.id, `${empName(e)} · ${co(e.companyId).displayName}`, e.id === v.managerId)).join("")}</select></div>
    <div class="fld"><label for="pjStart">Start date</label><input class="in" type="date" id="pjStart" name="startDate" value="${esc(v.startDate || "")}"></div>
    <div class="fld"><label for="pjEnd">End date</label><input class="in" type="date" id="pjEnd" name="endDate" value="${esc(v.endDate || "")}"></div>
    <div class="fld"><label for="pjBill">How it's billed</label><select class="in" id="pjBill" name="billingType">${Object.entries(PROJ_BILLING).map(([k, l]) => opt(k, l, (v.billingType || "NON_BILLABLE") === k)).join("")}</select></div>
    <div class="fld"><label for="pjRate">Hourly rate (time & materials)</label><input class="in num" id="pjRate" name="hourlyRate" inputmode="decimal" value="${esc(v.hourlyRate || "")}" placeholder="95.00"></div>
    <div class="fld"><label for="pjFee">Fixed fee (before GST)</label><input class="in num" id="pjFee" name="fixedFee" inputmode="decimal" value="${esc(v.fixedFee || "")}" placeholder="80,000.00"></div>
    <div class="fld"><label for="pjBud">Budget (CAD)</label><input class="in num" id="pjBud" name="budget" inputmode="decimal" value="${esc(v.budget || "")}" placeholder="450,000.00"></div>
    <div class="fld"><label for="pjBudH">Budget hours</label><input class="in num" id="pjBudH" name="budgetHours" inputmode="decimal" value="${esc(v.budgetHours ?? "")}" placeholder="3200"></div>
  </div>
  <div class="sect-l">Budget lines (up to ${PROJ_MAX_LINES})</div><p class="hint" style="margin:-4px 0 10px">Split the budget by category so the Overview can say where the money is going. Leave a row blank to skip it.</p>
  <div class="pjlines">${ls.map((l, i) => `<div class="pjline"><div class="fld"><label for="pjCat${i}">Category</label><select class="in" id="pjCat${i}" name="cat-${i}">${opt("", "—", !l.category)}${PROJ_CATS.map((c) => opt(c, PROJ_CAT_LABEL[c], l.category === c)).join("")}</select></div><div class="fld"><label for="pjLd${i}">What it covers</label><input class="in" id="pjLd${i}" name="desc-${i}" value="${esc(l.description || "")}"></div><div class="fld"><label for="pjLa${i}">Amount</label><input class="in num" id="pjLa${i}" name="amt-${i}" inputmode="decimal" value="${esc(l.amount || "")}"></div><div class="fld"><label for="pjLh${i}">Hours</label><input class="in num" id="pjLh${i}" name="hrs-${i}" inputmode="decimal" value="${esc(l.hours ?? "")}"></div></div>`).join("")}</div>`;
}
function vProjNew() {
  return ph("New project", "Set up the job, how it is billed and its budget. Hours and spending start flowing in from timesheets, bills and expenses as soon as people code to it.", "", crumb("/projects", "Projects")) + flashHtml()
    + card("", `<form data-f="projCreate">${projForm(null, UI.projDraft?.id === "new" ? UI.projDraft : {})}<div class="form-row" style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button type="button" class="btn" data-go="/projects">Cancel</button><button class="btn pri">Create project</button></div></form>`);
}

/* ---------- detail shell ---------- */
function projShell(p, tab, body) {
  const canManage = can(A, "projects.manage");
  const items = [[`/projects/${p.id}`, "Overview"], [`/projects/${p.id}/time`, "Time"], [`/projects/${p.id}/expenses`, "Expenses"], [`/projects/${p.id}/billing`, "Billing"], ...(canManage ? [[`/projects/${p.id}/edit`, "Edit"]] : [])];
  const cur = tab ? `/projects/${p.id}/${tab}` : `/projects/${p.id}`;
  const mgr = byId(S.employees, p.managerId);
  return ph(p.name, `${p.code} · ${co(p.companyId)?.displayName} · ${p.customerId ? projCustomer(p.customerId) : "Internal"} · run by ${empName(mgr)}`, `${projBillBadge(p.billingType)} ${projBadge(p.status)}`, crumb("/projects", "Projects"))
    + pillNav("Project", items, cur) + flashHtml() + body;
}
function vProjDetail(q, id, tab) {
  const p = byId(S.projects, id);
  if (!p || !inView(S, A, p.companyId)) return ph("Project not found", "", "", crumb("/projects", "Projects")) + card("", `<p>That project doesn't exist or is outside your access.</p><button class="btn" data-go="/projects">Back to projects</button>`);
  const t = tab || "";
  if (t !== "edit") UI.projDraft = null; // leaving the form drops any unsaved draft
  if (t === "edit" && !can(A, "projects.manage")) return vDenied("projects.manage");
  const body = t === "time" ? projTimeTab(p) : t === "expenses" ? projExpensesTab(p) : t === "billing" ? projBillingTab(p) : t === "edit" ? projEditTab(p) : t === "" ? projOverviewTab(p) : vNotFound();
  return projShell(p, t, body);
}

function projOverviewTab(p) {
  const s = projStats(S, p), lines = projLines(S, p.id);
  const budgetBy = new Map();
  for (const l of lines) { const cur = budgetBy.get(l.category) || { cents: 0, hours: 0 }; budgetBy.set(l.category, { cents: cur.cents + l.budgetCents, hours: cur.hours + (l.budgetHours || 0) }); }
  const linesTotal = [...budgetBy.values()].reduce((x, v) => x + v.cents, 0);
  const budgetTotal = p.budgetCents ?? linesTotal, budgetHoursTotal = p.budgetHours ?? (budgetBy.get("LABOUR")?.hours || null);
  const totalVar = projVariance(budgetTotal, s.actualCents);
  const byWeek = new Map();
  for (const { e } of projEntries(S, p.id)) { const k = periodStartFor(e.date, "WEEKLY"); byWeek.set(k, (byWeek.get(k) || 0) + e.workedHours); }
  const weeks = [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, h]) => ({ label: `Week of ${dShort(k)}`, v: h, d: `${hrs(h)} h` }));
  const billingStat = p.billingType === "TIME_AND_MATERIALS" ? stat("Ready to bill", money(s.unbilledCents), s.pendingBillableHours > 0 ? `${hrs(s.pendingBillableHours)} h more once approved` : "Approved time & expenses not yet invoiced", s.unbilledCents > 0 ? "good" : "")
    : p.billingType === "FIXED_FEE" ? stat("Fee billed so far", money(s.billedSubtotalCents), p.fixedFeeCents ? `${Math.round((s.billedSubtotalCents / p.fixedFeeCents) * 100)}% of the ${money(p.fixedFeeCents)} fee` : "No fee set")
    : stat("Billing", "Not billable", "Internal project — costs only");
  const catRows = PROJ_CATS.map((cat) => {
    const b = budgetBy.get(cat), actual = s.actualByCategory[cat];
    if (!b && actual === 0) return "";
    const v = projVariance(b?.cents || 0, actual);
    const desc = lines.filter((l) => l.category === cat).map((l) => l.description).filter(Boolean).join(", ");
    return `<tr><td><strong>${esc(PROJ_CAT_LABEL[cat])}</strong>${desc ? `<div class="hint">${esc(desc)}</div>` : ""}${cat === "LABOUR" ? `<div class="hint">${hrs(s.hoursApproved)} h approved${s.hoursPending > 0 ? ` + ${hrs(s.hoursPending)} h awaiting approval` : ""}${b?.hours ? ` · ${hrs(b.hours)} h budgeted` : ""}</div>` : ""}</td>${td(b ? money(b.cents) : "—", 1)}${td(`<strong>${money(actual)}</strong>`, 1)}${td(b ? `<span ${b.cents - actual < 0 ? 'style="color:var(--t-red)"' : ""}>${money(b.cents - actual)}</span>` : "—", 1)}<td class="pjvar ${v.tone}">${esc(v.text)}</td></tr>`;
  }).join("") + `<tr style="background:var(--row-head)"><td><strong>Total</strong>${lines.length && p.budgetCents != null && p.budgetCents !== linesTotal ? `<div class="hint">header budget; lines add up to ${money(linesTotal)}</div>` : ""}</td>${td(`<strong>${budgetTotal ? money(budgetTotal) : "—"}</strong>`, 1)}${td(`<strong>${money(s.actualCents)}</strong>`, 1)}${td(`<strong ${budgetTotal && budgetTotal - s.actualCents < 0 ? 'style="color:var(--t-red)"' : ""}>${budgetTotal ? money(budgetTotal - s.actualCents) : "—"}</strong>`, 1)}<td class="pjvar ${totalVar.tone}">${esc(totalVar.text)}</td></tr>`;
  return (p.description ? `<p class="hint" style="font-size:13px;margin:0 0 14px">${esc(p.description)}</p>` : "")
    + `<div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${stat("Budget", budgetTotal ? money(budgetTotal) : "—", p.startDate ? `${dLong(p.startDate)}${p.endDate ? ` → ${dLong(p.endDate)}` : " → open-ended"}` : "No dates set", "primary")}${stat("Spent so far", money(s.actualCents), totalVar.text, totalVar.tone === "bad" ? "warn" : "")}${stat("Hours logged", `${hrs(s.hoursLogged)} h`, budgetHoursTotal ? `of ${hrs(budgetHoursTotal)} h budgeted · ${hrs(s.hoursApproved)} h approved` : `${hrs(s.hoursApproved)} h approved, ${hrs(s.hoursPending)} h awaiting approval`)}${billingStat}</div>
    <div class="pjgrid" style="margin-top:16px">${cardFlush("Budget vs actual", table(["Category", ">Budget", ">Spent so far", ">Left", "How it's going"], [catRows]) + `<div class="pjnote"><strong>Where these numbers come from.</strong> Labour is hours on timesheets × each person's pay rate (salary ÷ 2,080 for salaried staff); it includes approved timesheets and ones submitted but not yet approved, shown separately above. Materials, expenses and other are posted journal lines on expense accounts tagged with this project — vendor bills, paid-back expense claims and manual journals. Expense claims still waiting for approval are listed on the ${goLink(`/projects/${p.id}/expenses`, "Expenses")} tab but not counted here until they are paid back.</div>`)}
      <div>${card("Spent, by category", donut(PROJ_CATS.map((c) => ({ label: PROJ_CAT_LABEL[c], v: s.actualByCategory[c], d: money(s.actualByCategory[c]) })), { total: money(s.actualCents), caption: "Labour + posted spending", size: 150 }))}${card("Hours by week", weeks.length ? barList(weeks) : `<p class="hint">No hours logged yet.</p>`)}</div></div>`;
}

function projTimeTab(p) {
  const rows = projEntries(S, p.id), canManage = can(A, "projects.manage");
  const s = projStats(S, p);
  const html = rows.map(({ e, sheet, emp, billable }) => {
    const inv = e.billedInvoiceId ? byId(S.arInvoices, e.billedInvoiceId) : null;
    const toggle = canManage ? `<button class="pjtoggle ${billable ? "on" : ""}" data-a="projBillable" data-id="${e.id}" ${inv ? 'disabled title="Already on an invoice"' : ""}>${billable ? "Billable" : "Not billable"}</button>` : `<span class="badge ${billable ? "tone-green" : "tone-grey"}">${billable ? "Billable" : "Not billable"}</span>`;
    return `<tr class="${inv ? "pjmuted" : ""}"><td>${dLong(e.date)}</td><td>${esc(empName(emp))}<div class="hint">${esc(byId(S.departments, e.departmentId)?.name || "")}</div></td>${td(`${hrs(e.workedHours)} h`, 1)}<td>${badge(sheet.status)}<div class="hint">${periodLabel(sheet.periodStart, sheet.periodEnd)}</div></td><td>${toggle}</td><td>${inv ? `${goLink("/finance/ar", inv.invoiceNumber)} ${badge(inv.status)}` : `<span class="hint">${billable ? (PROJ_APPROVED_TS.includes(sheet.status) ? "ready to bill" : "waiting for timesheet approval") : "—"}</span>`}</td></tr>`;
  });
  return `<div class="grid g3" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${stat("Hours logged", `${hrs(s.hoursLogged)} h`, `${rows.length} timesheet row${rows.length === 1 ? "" : "s"}`)}${stat("Approved", `${hrs(s.hoursApproved)} h`, "On approved or locked timesheets", "good")}${stat("Awaiting approval", `${hrs(s.hoursPending)} h`, "Submitted, not yet approved", s.hoursPending ? "warn" : "")}${stat("Labour cost", money(s.labourCostCents), "Hours × each person's pay rate")}</div>
    <div class="sect-l" style="display:flex;justify-content:space-between;align-items:center">Time on this project ${dlButton("project-time", "Download", { arg: p.id, variant: "outline" })}</div>`
    + cardFlush("", table(["Date", "Person", ">Hours", "Timesheet", "Billable", "Billed on"], html, "No hours have been coded to this project yet. People pick the project on each timesheet row."))
    + `<p class="hint" style="margin-top:10px">${canManage ? "Click a row's billable chip to change it. Rows already on an invoice can't be changed." : "Only people who manage projects can change what is billable."}</p>`;
}

function projExpensesTab(p) {
  const exps = projExpLines(S, p.id), gl = projGlLines(S, p.id);
  const expTotal = exps.reduce((s, x) => s + x.l.amountCents, 0), glTotal = gl.reduce((s, x) => s + x.net, 0);
  return `<div class="grid g3" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${stat("Expense claims", money(expTotal), `${exps.length} line${exps.length === 1 ? "" : "s"} coded to this project`)}${stat("Posted spending", money(glTotal), `${gl.length} journal line${gl.length === 1 ? "" : "s"} on expense accounts`, "primary")}</div>
    <div class="sect-l">Expense claims</div>` + cardFlush("", table(["Date", "Who", "Merchant", "Category", "Claim", ">Amount", "Billable", "Billed on"], exps.map(({ l, claim, emp, billable }) => { const inv = l.billedInvoiceId ? byId(S.arInvoices, l.billedInvoiceId) : null; return `<tr><td>${dLong(l.date)}</td><td>${esc(empName(emp))}</td><td>${esc(l.merchant)}</td><td><span class="badge tone-grey">${esc(l.categoryCode || "—")}</span></td><td class="mono">${esc(claim.claimNumber)} ${badge(claim.status)}</td>${td(money(l.amountCents), 1)}<td>${billable ? `<span class="badge tone-green">Billable</span>` : `<span class="badge tone-grey">No</span>`}</td><td>${inv ? goLink("/finance/ar", inv.invoiceNumber) : `<span class="hint">—</span>`}</td></tr>`; }), "No expense-claim lines are coded to this project. Claims are tagged with a project when they are entered."))
    + `<div class="sect-l">Posted spending from the books</div>` + cardFlush("", table(["Date", "Entry", "Account", "Description", "Bucket", ">Amount"], gl.map(({ l, je, a, cat, net }) => `<tr><td>${dLong(je.date)}</td><td>${goLink(`/finance/journals/${je.id}`, je.entryNumber)}<div class="hint">${esc(je.memo || "")}</div></td><td><span class="mono">${esc(a.number)}</span> ${esc(a.name)}</td><td>${esc(l.description || "")}</td><td><span class="badge tone-teal">${esc(PROJ_CAT_LABEL[cat])}</span></td>${td(money(net), 1)}</tr>`), "Nothing has been posted to this project yet. Vendor bills, paid-back claims and manual journals coded to the project appear here."))
    + `<p class="hint" style="margin-top:10px">Posted spending is what the Overview counts as Materials, Expenses and Other. Expense claims only reach the books once they are paid back.</p>`;
}

function projBillingTab(p) {
  const s = projStats(S, p), canBill = can(A, "ar.create"), isActive = p.status === "ACTIVE", cu = p.customerId ? byId(S.customers, p.customerId) : null;
  const invoices = projInvoices(S, p.id);
  const invTable = `<div class="sect-l">Invoices on this project</div>` + cardFlush("", table(["Invoice", "Date", "Due", "What for", ">Total", ">Paid", ">Outstanding", "Status"], invoices.map((i) => `<tr><td class="mono"><strong>${esc(i.invoiceNumber)}</strong></td><td>${dLong(i.invoiceDate)}</td><td>${dLong(i.dueDate)}</td><td style="max-width:360px">${esc(i.memo || "")}</td>${td(money(i.totalCents), 1)}${td(money(i.paidCents || 0), 1)}${td(money(i.status === "CANCELLED" ? 0 : i.totalCents - (i.paidCents || 0)), 1)}<td>${badge(i.status)}</td></tr>`), "No invoices yet."))
    + (invoices.length ? `<p class="hint" style="margin-top:8px">${invoices.length} invoice${invoices.length === 1 ? "" : "s"} · ${money(s.billedTotalCents)} billed · ${money(s.paidCents)} paid. Record payments under ${goLink("/finance/ar", "Customer Invoices · AR")}.</p>` : "");
  const warn = (!cu ? `<p style="color:var(--t-red);font-weight:600">Set a customer on the Edit tab before billing.</p>` : "") + (!isActive ? `<p style="color:var(--t-amber);font-weight:600">The project is ${p.status.toLowerCase().replace("_", " ")} — only active projects can be billed.</p>` : "");
  const noPerm = `<p class="hint" style="border:1px solid var(--border);border-radius:10px;padding:8px 10px">You can see what is ready to bill, but creating invoices needs the "create invoices" permission (finance).</p>`;
  if (p.billingType === "TIME_AND_MATERIALS") {
    const rate = p.hourlyRateCents || 0;
    const per = new Map();
    for (const x of projEntries(S, p.id)) {
      if (!x.billable || x.e.billedInvoiceId) continue;
      const row = per.get(x.sheet.employeeId) || { name: empName(x.emp), approved: 0, pending: 0 };
      if (PROJ_APPROVED_TS.includes(x.sheet.status)) row.approved += x.e.workedHours; else if (PROJ_PENDING_TS.includes(x.sheet.status)) row.pending += x.e.workedHours;
      per.set(x.sheet.employeeId, row);
    }
    const people = [...per.values()].sort((a, b) => a.name.localeCompare(b.name));
    const exps = projExpLines(S, p.id).filter((x) => x.billable && !x.l.billedInvoiceId && PROJ_BILLABLE_CLAIM.includes(x.claim.status));
    const pendingHours = people.reduce((x, r) => x + r.pending, 0), expTotal = exps.reduce((x, e) => x + e.l.amountCents, 0);
    const ready = s.unbilledTimeCents + expTotal;
    const rows = [
      ...people.filter((r) => r.approved > 0).map((r) => `<tr><td>Labour — ${esc(r.name)}</td>${td(`${hrs(r.approved)} h`, 1)}${td(`${money(rate)}/h`, 1)}${td(`<strong>${money(Math.round(r.approved * rate))}</strong>`, 1)}</tr>`),
      ...exps.map((x) => `<tr><td>Expense — ${esc(x.l.merchant)} <span class="hint">(${esc(empName(x.emp))}, ${dShort(x.l.date)})</span></td>${td("1", 1)}${td("at cost", 1)}${td(`<strong>${money(x.l.amountCents)}</strong>`, 1)}</tr>`),
      ...people.filter((r) => r.pending > 0).map((r) => `<tr class="pjmuted"><td>Labour — ${esc(r.name)} <span class="badge tone-amber">awaiting timesheet approval</span></td>${td(`${hrs(r.pending)} h`, 1)}${td(`${money(rate)}/h`, 1)}${td(money(Math.round(r.pending * rate)), 1)}</tr>`),
    ];
    if (!rows.length) rows.push(`<tr><td colspan="4" class="hint" style="text-align:center;padding:24px">Nothing is waiting to be billed. Everything billable so far is already on an invoice.</td></tr>`);
    rows.push(`<tr style="background:var(--row-head)"><td colspan="3"><strong>Ready now (before GST)</strong></td>${td(`<strong>${money(ready)}</strong>`, 1)}</tr><tr><td colspan="3" class="hint">GST 5%</td>${td(`<span class="hint">${money(projGst(ready))}</span>`, 1)}</tr>`);
    const form = canBill ? `<form data-f="projTm" data-id="${p.id}">${pendingHours > 0 ? `<label class="pjpend"><input type="checkbox" name="includePending" style="margin-top:2px"><span>Also bill the <strong>${hrs(pendingHours)} h</strong> on timesheets that are submitted but not yet approved (${money(s.pendingBillableCents)} before GST). Normally you wait for the manager's approval first.</span></label>` : ""}<button class="btn pri" ${!cu || !isActive || (s.unbilledCents <= 0 && pendingHours <= 0) ? "disabled" : ""}>Create invoice${s.unbilledCents > 0 ? ` for ${money(s.unbilledCents + projGst(s.unbilledCents))}` : ""}</button></form>` : noPerm;
    return `<div class="pjgrid">${cardFlush("Waiting to be billed", table(["Line", ">Qty", ">Rate", ">Amount"], rows))}
      ${card("Create the invoice", `<p class="hint" style="font-size:12.5px;margin:0 0 10px">One invoice to <strong>${esc(cu?.name || "no customer yet")}</strong> with a line per person for their approved billable hours at ${money(rate)}/h, plus each billable expense at cost. GST is added at 5%. It is sent and posted to the books straight away (receivable, revenue, GST collected).</p>${warn}${form}`)}</div>` + invTable;
  }
  if (p.billingType === "FIXED_FEE") {
    const fee = p.fixedFeeCents || 0, left = Math.max(0, fee - s.billedSubtotalCents);
    const def = left > 0 ? Math.min(25, Math.round((left / fee) * 100)) : 0;
    const form = canBill ? `<form data-f="projFee" data-id="${p.id}"><div class="fld" style="max-width:220px"><label for="pjPct">Percent of fee</label><div style="display:flex;gap:8px;align-items:center"><input class="in num" id="pjPct" name="percent" type="number" min="1" max="100" step="1" value="${def}" style="width:90px"><span class="hint">% of ${money(fee)}</span></div><div class="hint">For example 25% = ${money(Math.round(fee * 0.25))} before GST.</div></div><button class="btn pri" style="margin-top:12px" ${!cu || !isActive || left <= 0 ? "disabled" : ""}>Bill fixed fee</button></form>` : noPerm;
    return `<div class="pjgrid"><div class="grid g3" style="align-content:start">${stat("Agreed fee", money(fee), "Before GST", "primary")}${stat("Billed so far", money(s.billedSubtotalCents), fee ? `${Math.round((s.billedSubtotalCents / fee) * 100)}% of the fee` : "No fee set")}${stat("Left to bill", money(left), left > 0 ? "Bill a percentage on the right" : "The whole fee has been billed", left > 0 ? "good" : "")}</div>
      ${card("Bill part of the fee", `<p class="hint" style="font-size:12.5px;margin:0 0 10px">Fixed-fee projects are billed in stages — enter the share of the ${money(fee)} fee to invoice now. Hours and expenses on this project are tracked for cost only.</p>${warn}${form}`)}</div>` + invTable;
  }
  return card("Not billable", `<p style="margin:0 0 6px">This is an internal project: hours and spending are tracked so you can see what it costs, but nothing is invoiced to a customer.</p><p class="hint" style="margin:0">If that changes, a project manager can switch it to time & materials or a fixed fee on the Edit tab${s.invoiceCount ? "" : " (allowed while it has no invoices)"}.</p>`) + invTable;
}

function projEditTab(p) {
  const s = projStats(S, p);
  const words = { ACTIVE: "Set active", ON_HOLD: "Put on hold", COMPLETED: "Mark completed", CANCELLED: "Cancel project" };
  const btns = PROJ_STATUSES.filter((st) => st !== p.status).map((st) => `<button class="btn sm ${st === "CANCELLED" ? "dng" : ""}" data-a="projStatus" data-id="${p.id}" data-s="${st}">${words[st]}</button>`).join("");
  const notes = [p.billingType === "TIME_AND_MATERIALS" && s.unbilledCents > 0 ? `${money(s.unbilledCents)} is still unbilled — bill it (or mark it not billable) before the project can be completed or cancelled.` : "", s.invoiceCount > 0 ? `This project has ${s.invoiceCount} invoice${s.invoiceCount === 1 ? "" : "s"}: it can be completed but not cancelled, and its billing type is locked.` : ""].filter(Boolean);
  return card("Status", `<div class="pjstatus"><span style="align-self:center">Now: ${projBadge(p.status)}</span>${btns}</div>${notes.length ? `<ul class="hint" style="margin:10px 0 0;padding-left:18px">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}`)
    + card("Project details", `<form data-f="projEdit" data-id="${p.id}">${projForm(p, UI.projDraft?.id === p.id ? UI.projDraft : projToVals(p, projLines(S, p.id)))}<div class="form-row" style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button type="button" class="btn" data-go="/projects/${p.id}">Cancel</button><button class="btn pri">Save changes</button></div></form>`);
}

/* ---------------- routes (registered before app.js, so these win over the stock /projects) ---------------- */
route("/projects", "projects.view", vProjList);
route("/projects/new", "projects.manage", vProjNew);
route("/projects/:id", "projects.view", (q, id) => vProjDetail(q, id, ""));
route("/projects/:id/:tab", "projects.view", vProjDetail);

/* ---------------- forms & actions ---------------- */
function projFormPayload(f) {
  const d = fd(f);
  const lines = []; for (let i = 0; i < PROJ_MAX_LINES; i++) lines.push({ category: d[`cat-${i}`], description: d[`desc-${i}`], amount: d[`amt-${i}`], hours: d[`hrs-${i}`] });
  return { companyId: d.companyId, code: d.code, name: d.name, description: d.description, customerId: d.customerId, managerId: d.managerId, startDate: d.startDate, endDate: d.endDate, billingType: d.billingType, hourlyRate: d.hourlyRate, fixedFee: d.fixedFee, budget: d.budget, budgetHours: d.budgetHours, lines };
}
window.FORMS_EXT.push({
  // a failed save keeps what was typed (the page re-renders on every action)
  projCreate(f) { const before = S.projects.length; const p = projFormPayload(f); UI.projDraft = { id: "new", ...p }; if (act("proj.create", p)) { UI.projDraft = null; const prj = S.projects[before]; go(`/projects/${prj.id}`); UI.flash = { kind: "ok", text: `${prj.code} — ${prj.name} is set up. Hours and spending will start flowing in from timesheets, bills and expenses.` }; safeRender(); } },
  projEdit(f) { const p = projFormPayload(f); UI.projDraft = { id: f.dataset.id, ...p }; if (act("proj.edit", { projectId: f.dataset.id, ...p }, "Project details saved.")) UI.projDraft = null; },
  projTm(f) { const d = fd(f); const before = S.arInvoices.length; if (act("proj.invoice", { projectId: f.dataset.id, includePending: !!d.includePending })) { const inv = S.arInvoices[before]; const je = byId(S.journalEntries, inv.journalEntryId); const n = S.timesheetEntries.filter((e) => e.billedInvoiceId === inv.id).length; UI.flash = { kind: "ok", text: `${inv.invoiceNumber} for ${money(inv.totalCents)} created and posted to the books (${je?.entryNumber}). ${n} timesheet row${n === 1 ? "" : "s"} now show as billed — see it under Customer Invoices · AR.` }; safeRender(); } },
  projFee(f) { const d = fd(f); const before = S.arInvoices.length; if (act("proj.invoice", { projectId: f.dataset.id, percent: d.percent })) { const inv = S.arInvoices[before]; const je = byId(S.journalEntries, inv.journalEntryId); const prj = byId(S.projects, f.dataset.id); const billed = projInvoices(S, prj.id).filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.subtotalCents, 0); UI.flash = { kind: "ok", text: `${inv.invoiceNumber} for ${money(inv.totalCents)} created and posted (${je?.entryNumber}). ${money(billed)} of the ${money(prj.fixedFeeCents)} fee has now been billed.` }; safeRender(); } },
});
window.ACTIONS_EXT.push({
  projFilter(el) { projFilters()[el.dataset.k] = el.dataset.v; safeRender(); },
  projBillable(el) { const e = byId(S.timesheetEntries, el.dataset.id); const next = e?.isBillable === false; act("proj.time.billable", { entryId: el.dataset.id }, e ? `${hrs(e.workedHours)} h on ${dLong(e.date)} is now ${next ? "billable" : "not billable"}.` : ""); },
  projStatus(el) { const words = { ACTIVE: "active again", ON_HOLD: "on hold", COMPLETED: "marked completed", CANCELLED: "cancelled" }; const p = byId(S.projects, el.dataset.id); act("proj.status", { projectId: el.dataset.id, status: el.dataset.s }, `${p?.code} is now ${words[el.dataset.s]}.`); },
});

/* ---------------- downloads ---------------- */
EXPORTS.projects = () => {
  const f = projFilters(), chip = PROJ_CHIPS.find((c) => c[0] === f.status) || PROJ_CHIPS[0];
  const list = inScope(S.projects).filter((p) => (!f.co || p.companyId === f.co) && (chip[2].length ? chip[2].includes(p.status) : true)).sort((a, b) => a.code.localeCompare(b.code));
  return { base: `haico-projects-${todayStr()}`, title: "Projects", rows: [["Code", "Project", "Company", "Customer", "Run by", "Billing", "Status", "Budget", "Spent so far", "Left", "Hours logged", "Hours approved", "Budget hours", "Ready to bill", "Billed", "Paid", "% done"],
    ...list.map((p) => { const s = projStats(S, p); return [p.code, p.name, co(p.companyId)?.displayName, projCustomer(p.customerId) || "Internal", empName(byId(S.employees, p.managerId)), PROJ_BILLING[p.billingType], PROJ_STATUS_LABEL[p.status]?.[0] || p.status, ((p.budgetCents || 0) / 100).toFixed(2), (s.actualCents / 100).toFixed(2), (((p.budgetCents || 0) - s.actualCents) / 100).toFixed(2), s.hoursLogged.toFixed(2), s.hoursApproved.toFixed(2), (p.budgetHours || 0).toFixed(2), (s.unbilledCents / 100).toFixed(2), (s.billedTotalCents / 100).toFixed(2), (s.paidCents / 100).toFixed(2), s.percentBasis === "none" ? "" : String(s.percentComplete)]; })] };
};
EXPORTS["project-time"] = (id) => {
  const p = byId(S.projects, id); if (!p) return null;
  return { base: `haico-project-time-${p.code}-${todayStr()}`, title: `${p.code} time`, rows: [["Date", "Person", "Department", "Hours", "Timesheet status", "Billable", "Cost rate", "Cost", "Billed on"],
    ...projEntries(S, p.id).map(({ e, sheet, emp, billable }) => { const rate = projCostRate(S, sheet.employeeId, e.date); return [e.date, empName(emp), byId(S.departments, e.departmentId)?.name || "", e.workedHours.toFixed(2), STATUS[sheet.status]?.[0] || sheet.status, billable ? "Yes" : "No", (rate / 100).toFixed(2), (Math.round(e.workedHours * rate) / 100).toFixed(2), e.billedInvoiceId ? byId(S.arInvoices, e.billedInvoiceId)?.invoiceNumber || "" : ""]; })] };
};

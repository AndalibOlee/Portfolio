/* ==========================================================================
   views-ops.js — dashboard, approvals, people, payroll
   ========================================================================== */
function ledgerIdx() {
  if (S._idx) return S._idx;
  const acct = new Map(S.accounts.map((a) => [a.id, a]));
  const je = new Map(S.journalEntries.map((j) => [j.id, j]));
  S._idx = { acct, je };
  return S._idx;
}
/** balances per account number, split by company (debits positive) */
function balances(companyIds, upTo) {
  const { acct, je } = ledgerIdx();
  const rows = new Map();
  for (const l of S.journalLines) {
    const j = je.get(l.journalEntryId);
    if (!j || j.status !== "POSTED" || !companyIds.includes(j.companyId) || (upTo && j.date > upTo)) continue;
    const a = acct.get(l.accountId);
    if (!rows.has(a.number)) rows.set(a.number, { number: a.number, name: a.name, type: a.type, by: new Map() });
    const r = rows.get(a.number);
    r.by.set(j.companyId, (r.by.get(j.companyId) || 0) + (l.debitCents || 0) - (l.creditCents || 0));
  }
  return [...rows.values()].sort((a, b) => a.number.localeCompare(b.number));
}
const rowTotal = (r) => [...r.by.values()].reduce((s, v) => s + v, 0);
function cashOf(ids) { const r = balances(ids).find((x) => x.number === "1010"); return r ? rowTotal(r) : 0; }

/* ---------------- chart (grouped bars, money in vs out) ---------------- */
function barChart(data) {
  const W = 640, H = 250, L = 56, Rm = 12, T = 14, B = 30;
  const max = Math.max(1, ...data.flatMap((d) => [d.inn, d.out]));
  const step = [1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6, 2e6].find((s) => max / s <= 5) || 5e6;
  const top = Math.ceil(max / step) * step;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const bw = Math.min(26, ((W - L - Rm) / data.length - 14) / 2);
  const gx = (i) => L + ((W - L - Rm) / data.length) * (i + 0.5);
  let g = "";
  for (let v = 0; v <= top; v += step) g += `<line class="gl" x1="${L}" x2="${W - Rm}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v === 0 ? "0" : "$" + (v >= 1e6 ? v / 1e6 + "M" : v / 1e3 + "K")}</text>`;
  data.forEach((d, i) => {
    const x = gx(i);
    const bar = (v, cls, dx) => { const h = Math.max(0, y(0) - y(v)); const r = Math.min(4, h); return `<path class="${cls}" d="M${x + dx},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${bw - 2 * r} q${r},0 ${r},${r} v${h - r} z"/>`; };
    g += bar(d.inn, "bar-in", -bw - 1) + bar(d.out, "bar-out", 1);
    g += `<text class="ax" x="${x}" y="${H - 10}" text-anchor="middle">${d.label}</text>`;
    g += `<rect x="${x - bw - 8}" y="${T}" width="${2 * bw + 16}" height="${H - T - B}" fill="transparent" data-i="${i}"/>`;
  });
  return `<div class="chart" data-chart='${esc(JSON.stringify(data))}'><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Money in and money out by month">${g}</svg>
    <div class="form-row" style="gap:16px;margin-top:6px;font-size:12px" class="muted"><span class="chip"><span class="sq" style="background:var(--chart-in)"></span>Money in (revenue)</span><span class="chip"><span class="sq" style="background:var(--chart-out)"></span>Money out (expenses)</span></div></div>`;
}
function wireChart(el) {
  const data = JSON.parse(el.dataset.chart);
  let tip = null;
  el.querySelectorAll("rect[data-i]").forEach((r) => {
    r.addEventListener("mousemove", (ev) => {
      const d = data[+r.dataset.i];
      if (!tip) { tip = document.createElement("div"); tip.className = "tip"; document.body.appendChild(tip); }
      tip.innerHTML = `<b>${esc(d.label)} 2026</b><div class="ln"><span class="chip"><span class="sq" style="background:var(--chart-in)"></span>Money in</span><span class="num">${moneyCompact(d.inn * 100)}</span></div><div class="ln"><span class="chip"><span class="sq" style="background:var(--chart-out)"></span>Money out</span><span class="num">${moneyCompact(d.out * 100)}</span></div><div class="ln" style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px"><span>Difference</span><span class="num">${moneyCompact((d.inn - d.out) * 100)}</span></div>`;
      tip.style.left = Math.min(window.innerWidth - 190, ev.clientX + 14) + "px"; tip.style.top = ev.clientY + 14 + "px";
    });
    r.addEventListener("mouseleave", () => { tip?.remove(); tip = null; });
  });
}

/* ---------------- Dashboard ---------------- */
function vDashboard() {
  // greeting, needs attention, quick actions, my open requests, waiting on you, activity + coming up;
  // Executive / Finance / HR add one compact "At a glance" strip (detail lives on each module's pages)
  return homeTop() + homeGlance();
}

/* ---------------- Approvals ---------------- */
const TYPE_LABEL = { LeaveRequest: "Time off", ExpenseClaim: "Expense", PurchaseRequest: "Purchase request", PurchaseOrder: "Purchase order", ApInvoice: "Vendor bill", PayrollRun: "Payroll run", EmployeeRequest: "Request" };
function stepsChips(inst) {
  const steps = activeSteps(S, inst);
  return `<div class="steps">${steps.map((s) => `<span class="${inst.status === "APPROVED" || s.sequence < inst.currentStep ? "done" : s.sequence === inst.currentStep && inst.status === "PENDING" ? "cur" : ""}">${s.sequence}. ${esc(s.name)}${s.thresholdMinCents ? ` · ≥ ${moneyCompact(s.thresholdMinCents)}` : ""}</span>`).join("")}</div>`;
}
function entityLink(inst) {
  const m = { ApInvoice: can(A, "ap.view") && `/finance/ap/${inst.entityId}`, PayrollRun: can(A, "payroll.view") && `/payroll/runs/${inst.entityId}` }[inst.entityType];
  return m ? `<button class="lnk" style="font-size:12px" data-go="${m}">Open ${esc(TYPE_LABEL[inst.entityType].toLowerCase())} →</button>` : "";
}
function entityDetail(inst) {
  if (inst.entityType === "LeaveRequest") { const r = byId(S.leaveRequests, inst.entityId); if (r?.notes) return `“${esc(r.notes)}”`; }
  if (inst.entityType === "ApInvoice") { const i = byId(S.apInvoices, inst.entityId); if (i) return `${esc(i.description)} · due ${dLong(i.dueDate)}${i.attachments?.length ? ` · 📎 ${esc(i.attachments[0].name)}` : ""}`; }
  if (inst.entityType === "ExpenseClaim") { const l = S.expenseLines.find((x) => x.expenseClaimId === inst.entityId); if (l) return `${esc(l.merchant)} · ${dLong(l.date)}`; }
  if (inst.entityType === "PayrollRun") { const r = byId(S.payrollRuns, inst.entityId); if (r) return `${r.employeeCount} people · gross ${money(r.grossCents)} · pay day ${dLong(r.payDate)}`; }
  if (inst.entityType === "PurchaseRequest") { const r = byId(S.purchaseRequests, inst.entityId); if (r) return `${r.vendorName ? esc(r.vendorName) + " · " : ""}asked by ${esc(r.requestedByName)}`; }
  return "";
}
/* B's Approvals: one centre with tabs by kind (All · Timesheets · Time off · Expenses · Purchases & bills · Other · Sent by me),
   two-column cards; A's type chips stay on "All"; every non-timesheet card opens a popup with the full request and the decision;
   timesheet cards keep "View full timesheet" + inline Approve / Send back. */
const APR_TABS = [["all", "All"], ["timesheets", "Timesheets"], ["timeoff", "Time off"], ["expenses", "Expenses"], ["purchases", "Purchases & bills"], ["other", "Other"], ["sent", "Sent by me"]];
const aprTab = (inst) => { const c = approvalCat(inst); return c === "bills" || c === "purchases" ? "purchases" : c === "payroll" ? "other" : c; };
const aprOpenRow = (inst) => (inst.status === "PENDING" && canActOn(S, A, inst) ? inst : null);
function aprCard(a) {
  const st = activeSteps(S, a).find((s) => s.sequence === a.currentStep), det = entityDetail(a), done = S.approvalActions.filter((x) => x.instanceId === a.id);
  return `<section class="card apr" data-a="aprOpen" data-id="${a.id}" role="button" tabindex="0" aria-label="Open ${esc(a.entityLabel)}"><div class="row" style="align-items:flex-start"><span class="sq" style="width:10px;height:10px;margin-top:5px;background:${esc(co(a.companyId).colorTag)}"></span><div class="grow"><div class="t1"><span class="kind">${esc((TYPE_LABEL[a.entityType] || a.entityType).toUpperCase())}</span>${esc(a.entityLabel)}</div>
    <div class="t2">${esc(co(a.companyId).displayName)} · asked by ${esc(byId(S.users, a.requestedById)?.displayName || "")} · ${esc(ago(a.createdAt))} · step ${a.currentStep} of ${a.totalSteps}: ${esc(st?.name || "")}</div>${det ? `<div class="t2">${det}</div>` : ""}${fileChips(a.entityType, a.entityId)}${done.length ? `<div class="t2">${done.map((x) => `${esc(x.approverName)} ${x.action === "APPROVED" ? "approved" : "declined"} (${esc(x.stepName)})`).join(" · ")}</div>` : ""}${stepsChips(a)}</div>
    ${a.amountCents > 0 ? `<div class="num" style="font-size:15px;font-weight:700">${money(a.amountCents)}</div>` : ""}</div>
    <div class="open">Open to review, approve or decline →</div></section>`;
}
/** the full request behind an approval: who, what, amounts / dates / lines, attachments, history — and the decision */
function aprDetailHtml(a) {
  const kv = (rows) => `<dl class="kv">${rows.filter((r) => r && r[1] != null && r[1] !== "").map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const lines = (heads, rows) => (rows.length ? table(heads, rows) : "");
  const requester = byId(S.users, a.requestedById);
  const emp = requester?.employeeId ? byId(S.employees, requester.employeeId) : null;
  const who = [["Asked by", esc(requester?.displayName || "")], emp ? ["Role", esc(byId(S.positions, emp.positionId)?.title || "—") + (emp.departmentId ? ` · ${esc(byId(S.departments, emp.departmentId)?.name || "")}` : "")] : null, ["Company", coTag(a.companyId)], ["Sent", esc(dTime(a.createdAt))], a.amountCents > 0 ? ["Amount", `<strong class="num">${money(a.amountCents)}</strong>`] : null];
  let what = "", attType = a.entityType, attId = a.entityId;
  if (a.entityType === "LeaveRequest") { const r = byId(S.leaveRequests, a.entityId); if (r) { const lt = byId(S.leaveTypes, r.leaveTypeId); const bal = r.employeeId && typeof leaveBalances === "function" ? leaveBalances(r.employeeId).find((b) => b.lt.id === r.leaveTypeId) : null;
    what = kv([["Type", esc(lt?.name || "Time off")], ["Dates", `${esc(dLong(r.startDate))}${r.endDate !== r.startDate ? ` → ${esc(dLong(r.endDate))}` : ""}${r.isPartialDay ? " (part day)" : ""}`], ["Hours", `${hrs(r.totalHours)} h`], bal ? ["Balance", `${hrs(bal.ent - bal.used)} h left of ${hrs(bal.ent)} h${bal.pending ? ` · ${hrs(bal.pending)} h waiting (this one included)` : ""}`] : null, r.notes ? ["Note", `“${esc(r.notes)}”`] : null]); } }
  else if (a.entityType === "ExpenseClaim") { const c = byId(S.expenseClaims, a.entityId); if (c) { const ls = S.expenseLines.filter((l) => l.expenseClaimId === c.id);
    what = kv([["Claim", esc(c.claimNumber)], ["Purpose", esc(c.purpose)], ["Submitted", esc(dTime(c.submittedAt || c.createdAt))]]) + lines(["Date", "Merchant", "Category", "Dept / project", ">Amount"], ls.map((l) => `<tr><td>${esc(dShort(l.date))}</td><td>${esc(l.merchant)}${l.hasReceipt ? ' <span class="hint">· receipt</span>' : ""}</td><td>${esc(byId(S.expenseCategories, l.categoryCode)?.name || l.categoryCode || "")}</td><td class="hint">${[l.departmentId ? byId(S.departments, l.departmentId)?.name : null, l.projectId ? byId(S.projects, l.projectId)?.code : null].filter(Boolean).map(esc).join(" / ") || "—"}</td>${td(money(l.amountCents + (l.taxCents || 0)), 1)}</tr>`)); } }
  else if (a.entityType === "PurchaseRequest") { const r = byId(S.purchaseRequests, a.entityId); if (r) what = kv([["Request", esc(r.requestNumber)], ["What", esc(r.description)], ["Vendor", esc(r.vendorName || "—")], ["Needed by", r.neededBy ? esc(dLong(r.neededBy)) : "—"], ["Asked by", esc(r.requestedByName || "")], r.justification ? ["Why", esc(r.justification)] : null, ["Status", badge(r.status)]]); }
  else if (a.entityType === "PurchaseOrder") { const p = byId(S.purchaseOrders, a.entityId); if (p) { const ls = (S.purchaseOrderLines || []).filter((l) => l.purchaseOrderId === p.id);
    what = kv([["Order", esc(p.poNumber)], ["Vendor", esc(p.vendorName || byId(S.vendors, p.vendorId)?.name || "—")], ["What", esc(p.description || "")], ["Ordered", esc(dLong(p.orderDate))], p.requiredDate ? ["Needed by", esc(dLong(p.requiredDate))] : null, ["Total", `${money(p.subtotalCents || 0)} + tax ${money(p.taxCents || 0)} = <strong class="num">${money(p.totalCents || p.amountCents || 0)}</strong>`]]) + lines(["Line", ">Qty", ">Unit", ">Amount"], ls.map((l) => `<tr><td>${esc(l.description || "")}</td>${td(l.quantity ?? "", 1)}${td(money(l.unitCents || 0), 1)}${td(money(l.amountCents || 0), 1)}</tr>`)); } }
  else if (a.entityType === "ApInvoice") { const i = byId(S.apInvoices, a.entityId); if (i) { const ls = S.apLines.filter((l) => l.apInvoiceId === i.id);
    what = kv([["Vendor", esc(byId(S.vendors, i.vendorId)?.name || "—")], ["Invoice", esc(i.invoiceNumber)], ["What", esc(i.description || "")], ["Dated", esc(dLong(i.invoiceDate))], ["Due", esc(dLong(i.dueDate))], i.poNumber || i.purchaseOrderId ? ["Purchase order", esc(i.poNumber || byId(S.purchaseOrders || [], i.purchaseOrderId)?.poNumber || "")] : null, ["Total", `${money(i.subtotalCents)} + tax ${money(i.taxCents || 0)} = <strong class="num">${money(i.totalCents)}</strong>`], can(A, "ap.view") ? ["", goLink(`/finance/ap/${i.id}`, "Open the bill →")] : null]) + lines(["Line", "Account", "Dept / project", ">Amount"], ls.map((l) => `<tr><td>${esc(l.description || "")}</td><td class="mono">${esc(l.accountNumber || "")}</td><td class="hint">${[l.departmentId ? byId(S.departments, l.departmentId)?.name : null, l.projectId ? byId(S.projects, l.projectId)?.code : null].filter(Boolean).map(esc).join(" / ") || "—"}</td>${td(money(l.amountCents), 1)}</tr>`)); } }
  else if (a.entityType === "PayrollRun") { const r = byId(S.payrollRuns, a.entityId); if (r) what = kv([["Run", esc(r.runNumber)], ["Pay period", esc(periodLabel(r.periodStart, r.periodEnd))], ["Pay day", esc(dLong(r.payDate))], ["People", String(r.employeeCount)], ["Gross", money(r.grossCents)], ["Deductions", money(r.employeeDeductionsCents || 0)], ["Employer costs", money(r.employerCostsCents || 0)], ["Net pay", `<strong class="num">${money(r.netCents)}</strong>`], (r.warnings || []).length ? ["Warnings", esc(r.warnings.join(" · "))] : null, can(A, "payroll.view") ? ["", goLink(`/payroll/runs/${r.id}`, "Open the pay run →")] : null]); }
  else if (a.entityType === "EmployeeRequest") { const r = byId(S.requests, a.entityId); if (r) { const rows = [["Request", esc(r.requestNumber)], ["Type", esc(requestTypeLabel(r.type))], ["Title", esc(r.title)], r.startDate ? ["Dates", `${esc(dLong(r.startDate))}${r.endDate && r.endDate !== r.startDate ? ` → ${esc(dLong(r.endDate))}` : ""}`] : null];
    for (const [k, v] of Object.entries(r.details || {})) { if (v == null || v === "" || v === 0 || ["startDate", "endDate", "rates"].includes(k)) continue; if (typeof v === "object") { for (const [k2, v2] of Object.entries(v)) if (v2) rows.push([`${pretty(k)} · ${pretty(k2)}`, money(Number(v2))]); } else rows.push([pretty(k), MONEY_KEYS.has(k) ? money(Number(v)) : esc(String(v))]); }
    rows.push(["Total", `<strong class="num">${money(r.amountCents)}</strong>`]); what = kv(rows); } }
  const files = fileChips(attType, attId);
  const steps = activeSteps(S, a), acts = S.approvalActions.filter((x) => x.instanceId === a.id);
  const hist = steps.map((s) => { const x = acts.find((y) => y.stepSequence === s.sequence); const cur = a.status === "PENDING" && a.currentStep === s.sequence;
    return `<li><strong>${s.sequence}. ${esc(s.name)}</strong>${s.thresholdMinCents ? ` <span class="hint">· from ${moneyCompact(s.thresholdMinCents)}</span>` : ""} — ${x ? `<span style="color:${x.action === "APPROVED" ? "var(--ok)" : "var(--bad)"};font-weight:600">${x.action === "APPROVED" ? "approved" : "declined"}</span> by ${esc(x.approverName)} · ${esc(dTime(x.actedAt))}${x.comment ? ` — “${esc(x.comment)}”` : ""}` : cur ? `<span style="color:var(--warn);font-weight:600">waiting</span> · ${esc(whoIsNext(S, a))}` : `<span class="hint">not yet</span>`}</li>`; }).join("");
  const mine = aprOpenRow(a);
  const decide = mine ? `<form data-f="aprDecide" data-id="${a.id}" style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px"><label class="hint" for="aprNote" style="display:block;margin-bottom:4px">Note to the requester (needed if you decline)</label><textarea class="in" id="aprNote" name="comment" rows="2" placeholder="e.g. Approved — please attach the receipt when you're back"></textarea><div class="form-row" style="justify-content:flex-end;margin-top:10px"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn danger" data-dec="REJECTED">Decline</button><button class="btn ok" data-dec="APPROVED">Approve</button></div></form>`
    : `<div class="form-row" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn" data-a="closeModal">Close</button></div>`;
  return `<div class="aprm"><div class="form-row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div><span class="kind">${esc((TYPE_LABEL[a.entityType] || a.entityType).toUpperCase())}</span><h3 style="margin:4px 0 0">${esc(a.entityLabel)}</h3><div class="hint">${badge(a.status)} · step ${a.currentStep} of ${a.totalSteps}</div></div><button type="button" class="iconbtn" data-a="closeModal" aria-label="Close">✕</button></div>
    <h4>Who</h4>${kv(who)}<h4>What</h4>${what || `<p class="hint" style="margin:0">${entityDetail(a) || "No further detail recorded."}</p>`}
    <h4>Attachments</h4>${files || `<p class="hint" style="margin:0">No files attached.</p>`}
    <h4>History</h4><ul class="hist">${hist}</ul>${decide}</div>`;
}
function vApprovals(q = {}) {
  const mine = myActionable(), sheets = myTimesheetsToApprove();
  const counts = { all: mine.length + sheets.length, timesheets: sheets.length, sent: S.approvals.filter((i) => i.requestedById === A.user.id && i.status === "PENDING").length };
  for (const [k] of APR_TABS) if (!(k in counts)) counts[k] = mine.filter((a) => aprTab(a) === k).length;
  const cur = APR_TABS.some(([k]) => k === q.tab) ? q.tab : "all";
  const bar = `<div class="tabs" role="tablist" aria-label="Approvals">${APR_TABS.map(([k, l]) => `<button role="tab" class="${k === cur ? "on" : ""}" aria-selected="${k === cur}" data-go="/approvals${k === "all" ? "" : `?tab=${k}`}">${esc(l)}${counts[k] ? `<span class="c">${counts[k]}</span>` : ""}</button>`).join("")}</div>`;
  const acts = (i) => S.approvalActions.filter((x) => x.instanceId === i.id);
  const sentRows = () => { const sent = S.approvals.filter((i) => i.requestedById === A.user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 40);
    return sent.length ? table(["What", "Status", "Where it is", ">Amount"], sent.map((a) => { const last = acts(a).slice(-1)[0]; return `<tr><td><strong>${esc(a.entityLabel)}</strong><div class="hint">${esc(TYPE_LABEL[a.entityType] || a.entityType)} · ${esc(co(a.companyId).displayName)} · ${esc(ago(a.createdAt))}</div></td><td>${badge(a.status)}</td><td class="hint">${a.status === "PENDING" ? `waiting at: ${esc(activeSteps(S, a).find((s) => s.sequence === a.currentStep)?.name || "")} · ${esc(whoIsNext(S, a))}` : last ? `${esc(last.approverName)} · ${esc(dTime(last.actedAt))}` : ""}</td>${td(a.amountCents > 0 ? money(a.amountCents) : "—", 1)}</tr>`; })) : empty("You haven't sent anything for approval yet"); };
  let body;
  if (cur === "sent") body = cardFlush("", sentRows());
  else {
    // A's type chips, on the All tab
    const catCounts = {}; for (const a of mine) { const c = approvalCat(a); catCounts[c] = (catCounts[c] || 0) + 1; }
    const chipF = cur === "all" && APPROVAL_CATS.some((c) => c[0] === q.type) ? q.type : null;
    const chip = (key, label, n) => `<button class="hchip ${chipF === key ? "on" : ""}" data-go="${key ? `/approvals?type=${key}` : "/approvals"}"${chipF === key ? ' aria-current="true"' : ""}>${esc(label)} <span class="num">${n}</span></button>`;
    const chips = cur === "all" && mine.length ? `<div class="fchips2" aria-label="Filter by type">${chip(null, "All types", mine.length)}${APPROVAL_CATS.filter(([k]) => catCounts[k] || chipF === k).map(([k, l]) => chip(k, l, catCounts[k] || 0)).join("")}</div>` : "";
    const list = cur === "timesheets" ? [] : cur === "all" ? (chipF ? mine.filter((a) => approvalCat(a) === chipF) : mine) : mine.filter((a) => aprTab(a) === cur);
    const cards = list.map(aprCard).join("") + (cur === "all" && !chipF || cur === "timesheets" ? tsApprovalCards("/approvals") || "" : "");
    body = chips + (cards ? `<div class="aprs">${cards}</div>` : `<div class="hcard"><p class="empty-s" style="display:flex;gap:8px;align-items:center"><span style="color:var(--ok);font-weight:700" aria-hidden="true">✓</span>All caught up — nothing ${cur === "all" && !chipF ? "" : "of this kind "}is waiting for you.</p></div>`);
  }
  return ph("Approvals", "Everything waiting for your decision — requests, expenses, purchases, bills and your team's timesheets. Approvals follow the org chart; nobody approves their own.", helpBtn("inbox")) + flashHtml() + bar + body
    + (cur !== "sent" ? `<div class="sect-l">Requests you sent</div>` + cardFlush("", sentRows()) : "");
}
window.ACTIONS_EXT.push({
  aprOpen(el) { const a = byId(S.approvals, el.dataset.id); if (!a) return; UI.modal = aprDetailHtml(a); UI.modalWide = true; safeRender(); },
});
window.FORMS_EXT.push({
  aprDecide(f, ev) {
    const dec = ev.submitter?.dataset.dec || "APPROVED", d = fd(f), box = f.querySelector("[name=comment]");
    if (dec === "REJECTED" && !String(d.comment || "").trim()) { if (box) { box.classList.add("need"); box.placeholder = "Please say why — the requester will see this"; box.focus(); } toast("Add a reason first", "Tell them why it's declined, so they know what to fix.", "err"); return; }
    UI.modal = null; UI.modalWide = false;
    act("approval.decide", { instanceId: f.dataset.id, decision: dec, comment: d.comment }, dec === "APPROVED" ? "Approved — the next person in line (or the requester) has been notified." : "Declined — the requester has been notified.");
  },
});
document.addEventListener("keydown", (ev) => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches?.(".apr[data-a=aprOpen]")) { ev.preventDefault(); ev.target.click(); } });

/* ---------------- People ---------------- */
function vEmployees() {
  const list = inScope(S.employees).sort((a, b) => a.lastName.localeCompare(b.lastName));
  return pillNav("People", peoplePills(), "/hr/employees") + ph("Employee records", `${list.length} people · ${scopeName()} · open someone to change their salary or activate / deactivate them`, can(A, "hr.employees.create") ? `<button class="btn pri" data-go="/hr/employees/new">Add employee</button>` : "") + flashHtml()
    + `<div class="form-row" style="margin-bottom:12px"><input class="in" style="max-width:320px" placeholder="Search name, number, position…" aria-label="Search employees" data-filter="empT"></div>`
    + cardFlush("", `<div class="tw"><table class="t" id="empT"><thead><tr><th>Name</th><th>Company</th><th>Department</th><th>Position</th><th>Manager</th><th>Type</th><th>Status</th></tr></thead><tbody>${list.map((e) => `<tr class="click" data-go="/hr/employees/${e.id}"><td><span style="display:flex;align-items:center;gap:10px">${avatar(e, 30)}<span><strong>${esc(empName(e))}</strong><span class="hint mono" style="display:block">${esc(e.employeeNumber)}</span></span></span></td><td>${coTag(e.companyId)}</td><td>${esc(byId(S.departments, e.departmentId)?.name || "—")}</td><td>${esc(byId(S.positions, e.positionId)?.title || "—")}</td><td>${esc(e.managerId ? empName(byId(S.employees, e.managerId)) : "—")}</td><td>${esc(EMPLOYMENT[e.employmentType] || e.employmentType)}</td><td>${badge(e.status)}</td></tr>`).join("")}</tbody></table></div>`);
}
function vEmployee(q, id) {
  const e = byId(S.employees, id);
  if (!e || !inView(S, A, e.companyId) && !canSee(A, e.companyId)) return ph("Employee not found") + card("", empty("This person isn't in the companies you can see"));
  const pos = byId(S.positions, e.positionId), dep = byId(S.departments, e.departmentId), loc = byId(S.locations, e.locationId);
  const mgr = e.managerId ? byId(S.employees, e.managerId) : null;
  const reports = S.employees.filter((x) => x.managerId === e.id);
  const chain = []; let c = mgr; while (c && chain.length < 6) { chain.push(c); c = c.managerId ? byId(S.employees, c.managerId) : null; }
  const comp = latestComp(e.id);
  const prof = S.payProfiles.find((x) => x.employeeId === e.id);
  const seePay = can(A, "payroll.view") || can(A, "hr.employees.edit");
  const bal = leaveBalances(e.id).filter((b) => b.has);
  const tasks = S.onboardingTasks.filter((t) => t.employeeId === e.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const user = userOfEmployee(S, e.id);
  return pillNav("People", peoplePills(), "/hr/employees") + `<div class="crumb">${crumb("/hr/employees", "Employee records")}</div>` + flashHtml()
    + `<div class="ph"><div style="display:flex;gap:14px;align-items:center">${avatar(e, 52)}<div><h1>${esc(empName(e))}</h1><p>${esc(pos?.title || "—")} · ${esc(co(e.companyId).displayName)} · <span class="mono">${esc(e.employeeNumber)}</span></p></div></div><div class="acts">${badge(e.status)}</div></div>`
    + `<div class="grid g3">${card("Job", `<dl class="kv"><dt>Department</dt><dd>${esc(dep?.name || "—")}</dd><dt>Location</dt><dd>${esc(loc?.name || "—")}</dd><dt>Type</dt><dd>${esc(EMPLOYMENT[e.employmentType] || "—")}</dd><dt>Started</dt><dd>${dLong(e.startDate)}</dd><dt>Email</dt><dd>${esc(e.workEmail || "—")}</dd><dt>Phone</dt><dd>${esc(e.phone || "—")}</dd><dt>Sign-in</dt><dd>${user ? esc(user.email) : "No sign-in yet"}</dd></dl>`)}
      ${card("Reporting line", `<div class="hint" style="margin-bottom:6px">Approvals climb this chain; nobody approves their own request.</div>${chain.length ? chain.map((m, i) => `<div style="display:flex;gap:8px;align-items:center;padding:5px 0;padding-left:${i * 12}px">${avatar(m, 26)}<span><button class="lnk" data-go="/hr/employees/${m.id}">${esc(empName(m))}</button><span class="hint" style="display:block">${esc(byId(S.positions, m.positionId)?.title || "")}</span></span></div>`).join("") : `<div class="hint">Top of the organization.</div>`}${reports.length ? `<div class="sect-l" style="margin:12px 0 4px">Direct reports (${reports.length})</div>${reports.map((r) => `<div style="padding:3px 0"><button class="lnk" data-go="/hr/employees/${r.id}">${esc(empName(r))}</button></div>`).join("")}` : ""}`)}
      ${card("Pay", seePay ? `<dl class="kv"><dt>Pay type</dt><dd>${comp ? (comp.payType === "HOURLY" ? "Hourly" : "Salary") : "—"}</dd><dt>Rate</dt><dd class="num">${comp ? (comp.payType === "HOURLY" ? `${money(comp.hourlyRateCents)}/h` : `${money(comp.annualSalaryCents)}/yr`) : "—"}</dd><dt>Pay group</dt><dd>${esc(byId(S.payGroups, prof?.payGroupId)?.name || "—")}</dd><dt>Province</dt><dd>${esc(prof?.provinceOfEmployment || "BC")}</dd><dt>Deposit</dt><dd>${prof?.directDepositActive ? `<span class="mono">${esc(prof.bankAccountMasked)}</span>` : `<span class="badge tone-amber">None on file</span>`}</dd><dt>SIN</dt><dd class="mono">••• ••• •••</dd></dl>` : `<div class="hint">Pay details are visible to Payroll and HR only.</div>`)}</div>`
    + `<div class="grid g2" style="margin-top:14px">${cardFlush("Time off balances · 2026", table(["Type", ">Entitled", ">Used", ">Waiting", ">Left"], bal.map((b) => `<tr><td>${esc(b.lt.name)}</td>${td(hrs(b.ent), 1)}${td(hrs(b.used), 1)}${td(hrs(b.pending), 1)}${td(`<strong>${hrs(b.avail)}</strong>`, 1)}</tr>`)))}
      ${cardFlush("Onboarding", table(["Task", "Owner", "Due", "Status"], tasks.map((t) => `<tr><td>${esc(t.title)}</td><td>${esc(t.assigneeRole)}</td><td>${dLong(t.dueDate)}</td><td>${badge(t.status)}</td></tr>`), "No onboarding tasks."))}</div>` + hrEmployeeControls(e);
}
function vNewEmployee() {
  const cos = S.companies.filter((c) => canSee(A, c.id));
  const cid = UI.filters.newEmpCo || (A.activeCompanyId || cos[0].id);
  const deps = S.departments.filter((d) => d.companyId === cid), pos = S.positions.filter((p) => p.companyId === cid);
  const mgrs = S.employees.filter((e) => e.companyId === cid || e.companyId === "HAICO");
  return `<div class="crumb">${crumb("/hr/employees", "Employees")}</div>` + ph("Add an employee", "They start as Onboarding with four standard tasks, their 2026 leave balances and a pay profile.") + flashHtml()
    + card("", `<form data-f="newEmp" class="form-grid">
      <div class="fld"><label for="neCo">Company</label><select class="in" id="neCo" name="companyId" data-a="newEmpCo">${cos.map((c) => opt(c.id, c.displayName, c.id === cid)).join("")}</select></div>
      <div class="fld"><label for="neFirst">First name</label><input class="in" id="neFirst" name="firstName" required></div>
      <div class="fld"><label for="neLast">Last name</label><input class="in" id="neLast" name="lastName" required></div>
      <div class="fld"><label for="neDep">Department</label><select class="in" id="neDep" name="departmentId">${deps.map((d) => opt(d.id, `${d.code} — ${d.name}`)).join("")}</select></div>
      <div class="fld"><label for="nePos">Position</label><select class="in" id="nePos" name="positionId">${pos.map((p) => opt(p.id, p.title)).join("")}</select></div>
      <div class="fld"><label for="neMgr">Reports to</label><select class="in" id="neMgr" name="managerId">${opt("", "— nobody —")}${mgrs.map((m) => opt(m.id, `${empName(m)} · ${byId(S.positions, m.positionId)?.title || ""}`)).join("")}</select></div>
      <div class="fld"><label for="neType">Employment</label><select class="in" id="neType" name="employmentType">${Object.entries(EMPLOYMENT).map(([k, v]) => opt(k, v)).join("")}</select></div>
      <div class="fld"><label for="neStart">Start date</label><input class="in" type="date" id="neStart" name="startDate" value="${addDays(todayStr(), 7)}"></div>
      <div class="fld"><label for="nePay">Paid</label><select class="in" id="nePay" name="payType">${opt("HOURLY", "Hourly")}${opt("SALARY", "Salary")}</select></div>
      <div class="fld"><label for="neRate">Rate (hourly or yearly, CAD)</label><input class="in num" id="neRate" name="rate" inputmode="decimal" placeholder="e.g. 29.50" required></div>
      <div class="form-row" style="grid-column:1/-1"><button class="btn pri">Add employee</button><button type="button" class="btn" data-go="/hr/employees">Cancel</button></div></form>`);
}
function vDepartments() {
  const cos = S.companies.filter((c) => inView(S, A, c.id));
  return ph("Departments & Roles", "How each company is organized.") + `<div class="grid g2">${cos.map((c) => cardFlush(`${coTag(c.id)}`, table(["Department", ">People", "Positions"], S.departments.filter((d) => d.companyId === c.id).map((d) => { const people = S.employees.filter((e) => e.departmentId === d.id); const titles = [...new Set(people.map((p) => byId(S.positions, p.positionId)?.title).filter(Boolean))]; return `<tr><td><span class="mono hint">${esc(d.code)}</span> <strong>${esc(d.name)}</strong></td>${td(people.length, 1)}<td style="font-size:12px">${esc(titles.join(", ") || "—")}</td></tr>`; })))).join("")}</div>`;
}
function vOnboarding() {
  const emps = inScope(S.employees).filter((e) => S.onboardingTasks.some((t) => t.employeeId === e.id));
  return ph("Onboarding", "New starters and what still needs doing. Ticking the last task makes them Active.") + flashHtml()
    + (emps.length ? `<div class="grid g2">${emps.map((e) => { const ts = S.onboardingTasks.filter((t) => t.employeeId === e.id).sort((a, b) => a.sortOrder - b.sortOrder); const done = ts.filter((t) => t.status === "COMPLETE").length;
      return card(`<span style="display:flex;gap:10px;align-items:center">${avatar(e, 28)}${esc(empName(e))}</span>`, `<div class="hint" style="margin-bottom:6px">${esc(co(e.companyId).displayName)} · starts ${dLong(e.startDate)} · ${done} of ${ts.length} done</div>${ts.map((t) => `<label style="display:flex;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--border);font-size:13px"><input type="checkbox" data-a="obToggle" data-id="${t.id}" ${t.status === "COMPLETE" ? "checked" : ""} ${can(A, "hr.onboarding.manage") ? "" : "disabled"}><span style="flex:1;${t.status === "COMPLETE" ? "text-decoration:line-through;color:var(--muted-fg)" : ""}">${esc(t.title)}</span><span class="badge tone-grey">${esc(t.assigneeRole)}</span><span class="hint">${dShort(t.dueDate)}</span></label>`).join("")}`, badge(e.status)); }).join("")}</div>`
      : card("", empty("Nobody is onboarding right now", "New employees appear here with their checklist.")));
}
function vTimesheets(q) {
  const cur = UI.tabs.ts || "SUBMITTED";
  const all = inScope(S.timesheets);
  const T = [["SUBMITTED", "Waiting"], ["APPROVED", "Approved"], ["DRAFT", "Drafts"], ["REJECTED", "Sent back"], ["LOCKED", "In payroll"]];
  const list = all.filter((t) => t.status === cur).sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));
  return ph("Timesheets", "Approve your team's hours. Approved sheets flow straight into the next payroll run.") + flashHtml()
    + tabs("ts", T.map(([k, l]) => [k, l, all.filter((t) => t.status === k).length]), cur)
    + (list.length ? `<div class="grid">${list.map((s) => { const e = byId(S.employees, s.employeeId); const ot = sheetOvertime(S, s); const paid = s.workedHours + s.statHours + s.vacationHours + s.sickHours + s.personalHours + s.otherLeaveHours;
      return `<section class="card"><div class="row">${avatar(e)}<div class="grow"><div class="t1">${esc(empName(e))} <span class="hint" style="font-weight:400">${esc(co(e.companyId).displayName)} · ${periodLabel(s.periodStart, s.periodEnd)}</span></div>
        <div class="t2">Worked <strong>${hrs(s.workedHours)}</strong>${s.statHours ? ` · stat <strong>${hrs(s.statHours)}</strong>` : ""}${s.sickHours ? ` · sick <strong>${hrs(s.sickHours)}</strong>` : ""}${s.vacationHours ? ` · vacation <strong>${hrs(s.vacationHours)}</strong>` : ""}${s.personalHours ? ` · personal <strong>${hrs(s.personalHours)}</strong>` : ""} · total <strong>${hrs(paid)}</strong>${ot.ot + ot.dot > 0 ? ` · <span style="color:var(--t-amber);font-weight:600">OT ${hrs(ot.ot + ot.dot)} auto</span>` : ""}</div>${s.rejectedReason && s.status === "REJECTED" ? `<div class="t2">Sent back: “${esc(s.rejectedReason)}”</div>` : ""}</div>${badge(s.status)}${s.status === "APPROVED" ? `<span class="hint">by ${esc(s.approvedByName)}</span>` : ""}<button class="btn sm" data-go="/hr/timesheets/${s.id}?back=/hr/timesheets">View timesheet</button></div>
        ${s.status === "SUBMITTED" && can(A, "timesheets.approve") ? `<form class="row" data-f="tsDecide" data-id="${s.id}" style="background:var(--row-head);border-radius:0 0 12px 12px"><input class="in" name="reason" placeholder="Note if sending back…" aria-label="Reason" style="flex:1;min-width:180px;height:34px"><button class="btn pri sm" data-dec="APPROVED">Approve</button><button class="btn sm" data-dec="REJECTED">Send back</button></form>` : ""}</section>`; }).join("")}</div>`
      : card("", empty(`No ${T.find((t) => t[0] === cur)[1].toLowerCase()} timesheets`, "Sheets appear here as your team sends them in.")));
}
function vLeave() {
  const cur = UI.tabs.leave || "PENDING_APPROVAL";
  const all = inScope(S.leaveRequests);
  const list = (cur === "ALL" ? all : all.filter((r) => r.status === cur)).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  return ph("Time Off", "Every request in scope. Approvals happen in the Approvals inbox, following each person's reporting line.")
    + tabs("leave", [["PENDING_APPROVAL", "Waiting", all.filter((r) => r.status === "PENDING_APPROVAL").length], ["APPROVED", "Approved", all.filter((r) => r.status === "APPROVED").length], ["ALL", "All", all.length]], cur)
    + cardFlush("", table(["Person", "Type", "Dates", ">Hours", "Status", "Decided by"], list.map((r) => { const e = byId(S.employees, r.employeeId); return `<tr><td><strong>${esc(empName(e))}</strong><div class="hint">${esc(co(e.companyId).displayName)}</div></td><td>${esc(byId(S.leaveTypes, r.leaveTypeId)?.name)}</td><td>${dLong(r.startDate)}${r.endDate !== r.startDate ? ` → ${dLong(r.endDate)}` : ""}${r.notes ? `<div class="hint">“${esc(r.notes)}”</div>` : ""}${fileChips("LeaveRequest", r.id)}</td>${td(hrs(r.totalHours), 1)}<td>${badge(r.status)}</td><td>${esc(r.decidedByName || (r.status === "PENDING_APPROVAL" ? "Waiting for " + whoIsNext(S, byId(S.approvals, r.approvalInstanceId) || {}) : "—"))}</td></tr>`; }), "No requests here."));
}

/* ---------------- Payroll ---------------- */
function suggestedPeriod(groups) {
  const today = todayStr();
  const cur = periodStartFor(today);
  const cands = [4, 3, 2, 1].map((k) => addDays(cur, -14 * k));
  for (const s of cands) {
    const e = periodEndFor(s);
    const hasSheets = inScope(S.timesheets).some((t) => t.periodStart >= s && t.periodEnd <= e && ["APPROVED", "SUBMITTED"].includes(t.status));
    const hasRun = inScope(S.payrollRuns).some((r) => r.periodStart === s && groups.some((g) => g.id === r.payGroupId));
    if (hasSheets && !hasRun) return s;
  }
  return addDays(cur, -14);
}
function vRuns() {
  const runs = inScope(S.payrollRuns).sort((a, b) => (a.payDate < b.payDate ? 1 : -1));
  const groups = inScope(S.payGroups).filter((g) => g.isActive !== false);
  const cur = periodStartFor(todayStr());
  const opts = [-6, -5, -4, -3, -2, -1, 0].map((k) => addDays(cur, 14 * k));
  const sug = suggestedPeriod(groups);
  const defGroup = groups.find((g) => g.code === "TAAN-HR") || groups[0];
  const form = can(A, "payroll.run") ? card("Start a pay run", `<form data-f="newRun" class="form-grid">
      <div class="fld"><label for="rGroup">Pay group</label><select class="in" id="rGroup" name="payGroupId">${groups.map((g) => opt(g.id, `${co(g.companyId).displayName} — ${g.name}`, g.id === defGroup?.id)).join("")}</select></div>
      <div class="fld"><label for="rPer">Pay period</label><select class="in" id="rPer" name="periodStart">${opts.map((s) => opt(s, periodLabel(s, periodEndFor(s)), s === sug)).join("")}</select></div>
      <div class="fld"><label for="rPay">Pay day</label><input class="in" type="date" id="rPay" name="payDate" value="${addDays(periodEndFor(sug), 5)}"></div>
      <div class="form-row" style="grid-column:1/-1"><button class="btn pri">Open pay run</button><span class="hint">Hourly people are paid from approved timesheets; salaried people get 1/26 of their salary.</span></div></form>`) : "";
  return ph("Payroll Runs", "Time in → calculate → approve → post to the ledger. Every step keeps its trail.") + flashHtml() + form
    + `<div class="sect-l">Pay runs</div>` + cardFlush("", table(["Run", "Company · group", "Period", "Pay day", ">People", ">Gross", ">Net", "Status"], runs.map((r) => `<tr class="click" data-go="/payroll/runs/${r.id}"><td class="mono"><strong>${esc(r.runNumber)}</strong></td><td>${coTag(r.companyId)}<div class="hint">${esc(byId(S.payGroups, r.payGroupId)?.name)}</div></td><td>${periodLabel(r.periodStart, r.periodEnd)}</td><td>${dLong(r.payDate)}</td>${td(r.employeeCount || 0, 1)}${td(money(r.grossCents), 1)}${td(money(r.netCents), 1)}<td>${badge(r.status)}</td></tr>`), "No pay runs yet."));
}
function vRun(q, id) {
  const r = byId(S.payrollRuns, id);
  if (!r || !canSee(A, r.companyId)) return ph("Pay run not found") + card("", empty("It may belong to a company outside your access."));
  const g = byId(S.payGroups, r.payGroupId);
  const entries = S.payrollEntries.filter((p) => p.payrollRunId === r.id).map((p) => ({ p, e: byId(S.employees, p.employeeId) })).sort((a, b) => a.e.lastName.localeCompare(b.e.lastName));
  const inst = r.approvalInstanceId ? byId(S.approvals, r.approvalInstanceId) : null;
  const flow = ["DRAFT", "CALCULATED", "PENDING_APPROVAL", "APPROVED", "POSTED"];
  const at = flow.indexOf(r.status);
  const labels = ["Open", "Calculated", "Director approval", "Approved", "Posted to ledger"];
  const je = r.journalEntryId ? byId(S.journalEntries, r.journalEntryId) : null;
  let acts = "";
  if (can(A, "payroll.run") && ["DRAFT", "CALCULATED"].includes(r.status)) acts += `<button class="btn ${r.status === "DRAFT" ? "pri" : ""}" data-a="runCalc" data-id="${r.id}">${r.status === "DRAFT" ? "Calculate" : "Recalculate"}</button>`;
  if (can(A, "payroll.run") && r.status === "CALCULATED") acts += `<button class="btn pri" data-a="runSend" data-id="${r.id}">Send for approval</button>`;
  if (can(A, "payroll.post") && r.status === "APPROVED") acts += `<button class="btn pri" data-a="runPost" data-id="${r.id}">Post to ledger</button>`;
  const warn = r.warnings || [];
  return `<div class="crumb">${crumb("/payroll/runs", "Payroll Runs")}</div>` + ph(`${r.runNumber} · ${g?.name}`, `${co(r.companyId).displayName} · ${periodLabel(r.periodStart, r.periodEnd)} · pay day ${dLong(r.payDate)}`, badge(r.status) + acts) + flashHtml()
    + `<div class="steps" style="margin:-4px 0 16px">${labels.map((l, i) => `<span class="${i < at || r.status === "POSTED" ? "done" : i === at ? "cur" : ""}">${i + 1}. ${l}</span>`).join("")}</div>`
    + (r.status === "PENDING_APPROVAL" && inst ? `<div class="msg info">Waiting for ${esc(whoIsNext(S, inst))} to approve (${esc(activeSteps(S, inst).find((s) => s.sequence === inst.currentStep)?.name)}).</div>` : "")
    + (r.status === "APPROVED" ? `<div class="msg ok">Approved by ${esc(r.approvedByName)}. Posting creates one balanced ledger entry, locks the timesheets and releases the statements.</div>` : "")
    + (je ? `<div class="msg ok">Posted by ${esc(r.postedByName)} · ledger entry ${goLink(`/finance/journals/${je.id}`, je.entryNumber)}${can(A, "finance.view") ? "" : ""}</div>` : "")
    + `<div class="stats">${stat("People paid", String(r.employeeCount || 0))}${stat("Gross pay", money(r.grossCents), "", "primary")}${stat("Taken off pay", money(r.employeeDeductionsCents))}${stat("Employer costs", money(r.employerCostsCents), "CPP, EI 1.4×, benefits")}${stat("Net deposits", money(r.netCents), "", "good")}</div>`
    + (warn.length ? card(`Checks · ${warn.length}`, warn.map((w) => `<div style="display:flex;gap:10px;padding:6px 0;border-top:1px solid var(--border);font-size:13px"><span class="badge ${w.code === "NO_TIMESHEET" || w.code === "ZERO_PAY" ? "tone-grey" : "tone-amber"}">${esc(w.code.replace(/_/g, " ").toLowerCase())}</span><span>${esc(w.message)}</span></div>`).join(""), "", "") + "<div style='height:14px'></div>" : "")
    + cardFlush("Pay register", r.status === "DRAFT" ? empty("Not calculated yet", "Calculate to pull approved timesheets and salaries into this run.") : table(["Employee", ">Hours", ">Gross", ">Taken off", ">Net", ">Employer", ""], entries.map(({ p, e }) => `<tr class="click" data-go="/payroll/statements/${p.id}"><td>${avatar(e, 26)} <strong style="margin-left:6px">${esc(empName(e))}</strong></td>${td(hrs(p.insurableHours), 1)}${td(money(p.grossCents), 1)}${td(money(p.totalDeductionsCents), 1)}${td(`<strong>${money(p.netCents)}</strong>`, 1)}${td(money(p.employerCostsCents), 1)}<td class="r"><span class="lnk" style="font-size:12px">Statement →</span></td></tr>`).concat(entries.length ? [`<tr class="tot"><td>Total</td><td></td>${td(money(r.grossCents), 1)}${td(money(r.employeeDeductionsCents), 1)}${td(money(r.netCents), 1)}${td(money(r.employerCostsCents), 1)}<td></td></tr>`] : []), "Nobody was paid in this run."));
}
function vStatements() {
  const ids = scopeIds(S, A);
  const list = S.payrollEntries.map((p) => ({ p, run: byId(S.payrollRuns, p.payrollRunId), e: byId(S.employees, p.employeeId) })).filter((x) => x.run && x.run.status === "POSTED" && ids.includes(x.run.companyId)).sort((a, b) => (a.run.payDate < b.run.payDate ? 1 : a.run.payDate > b.run.payDate ? -1 : a.e.lastName.localeCompare(b.e.lastName)));
  return ph("Pay Statements", "Every statement from posted runs.") + cardFlush("", table(["Employee", "Company", "Run", "Pay day", ">Gross", ">Net"], list.map(({ p, run, e }) => `<tr class="click" data-go="/payroll/statements/${p.id}"><td><strong>${esc(empName(e))}</strong></td><td>${coTag(e.companyId)}</td><td class="mono">${esc(run.runNumber)}</td><td>${dLong(run.payDate)}</td>${td(money(p.grossCents), 1)}${td(money(p.netCents), 1)}</tr>`), "No posted statements yet."));
}
function vYearEnd() {
  const ids = scopeIds(S, A);
  const map = new Map();
  for (const p of S.payrollEntries) {
    const run = byId(S.payrollRuns, p.payrollRunId);
    if (!run || run.status !== "POSTED" || !run.payDate.startsWith("2026") || !ids.includes(run.companyId)) continue;
    const m = map.get(p.employeeId) || { gross: 0, cpp: 0, ei: 0, tax: 0, ins: 0, pens: 0 };
    m.gross += p.grossCents; m.ins += p.eiInsurableCents || 0; m.pens += p.cppPensionableCents || 0;
    for (const l of S.payrollLines.filter((x) => x.payrollEntryId === p.id && x.kind === "DEDUCTION")) { if (l.typeCode === "CPP") m.cpp += l.amountCents; else if (l.typeCode === "EI") m.ei += l.amountCents; else if (l.typeCode.endsWith("TAX")) m.tax += l.amountCents; }
    map.set(p.employeeId, m);
  }
  const rows = [...map].map(([id, m]) => ({ e: byId(S.employees, id), m })).sort((a, b) => a.e.lastName.localeCompare(b.e.lastName));
  return ph("Year-End · T4 & ROE", "2026 slips build up from every posted pay run. Records of Employment are created when someone leaves.")
    + `<div class="msg info">T4 boxes below are running totals for 2026. CRA-format XML e-filing is part of the production roadmap, not this demo.</div>`
    + cardFlush("T4 running totals · 2026", table(["Employee", "Company", ">Box 14 · Income", ">Box 16 · CPP", ">Box 18 · EI", ">Box 22 · Tax", ">Box 24 · EI earnings", ">Box 26 · CPP earnings"], rows.map(({ e, m }) => `<tr><td><strong>${esc(empName(e))}</strong><div class="hint mono">${esc(e.employeeNumber)}</div></td><td>${coTag(e.companyId)}</td>${td(money(m.gross), 1)}${td(money(m.cpp), 1)}${td(money(m.ei), 1)}${td(money(m.tax), 1)}${td(money(m.ins), 1)}${td(money(m.pens), 1)}</tr>`), "No posted pay in 2026 yet."))
    + `<div class="sect-l">Records of Employment</div>` + card("", empty("No ROEs to issue", "An ROE is prepared automatically when an employee's last day is recorded."));
}
function vPayrollSettings() {
  const cfg = S.taxConfigs.find((t) => t.year === 2026);
  const tx = cfg.data;
  const br = (list) => table(["Taxable income up to", ">Rate"], list.map((b) => `<tr><td class="num">${b.upToCents == null ? "and above" : money(b.upToCents)}</td>${td((b.rate * 100).toFixed(2) + "%", 1)}</tr>`));
  const cos = S.companies.filter((c) => inView(S, A, c.id));
  return ph("Payroll Settings", "Overtime rules per company and the editable 2026 tax table. Changes apply to the next calculation.") + flashHtml()
    + `<div class="msg warn">${esc(cfg.description)}</div>`
    + `<div class="sect-l" style="margin-top:0">Overtime rules</div><div class="grid g2">${cos.map((c) => { const st = settingsFor(S, c.id); return card(coTag(c.id), `<form data-f="otRules" data-co="${c.id}" class="form-grid"><div class="fld"><label for="ot1${c.id}">Overtime after (h/day)</label><input class="in num" id="ot1${c.id}" name="dailyOt" value="${st.dailyOtThreshold}" ${can(A, "payroll.admin") ? "" : "disabled"}></div><div class="fld"><label for="ot2${c.id}">Double time after (h/day)</label><input class="in num" id="ot2${c.id}" name="dailyDouble" value="${st.dailyDoubleOtThreshold}" ${can(A, "payroll.admin") ? "" : "disabled"}></div><div class="fld"><label for="ot3${c.id}">Overtime after (h/week)</label><input class="in num" id="ot3${c.id}" name="weeklyOt" value="${st.weeklyOtThreshold}" ${can(A, "payroll.admin") ? "" : "disabled"}></div>${can(A, "payroll.admin") ? `<div class="form-row" style="grid-column:1/-1"><button class="btn sm">Save rules</button><span class="hint">${st.timesheetCadence === "BIWEEKLY" ? "Biweekly" : "Weekly"} timesheets · ${st.standardHoursPerDay} h standard day</span></div>` : ""}</form>`); }).join("")}</div>`
    + `<div class="sect-l">2026 tax table</div><div class="grid g3">${card("CPP & EI", `<dl class="kv"><dt>CPP rate</dt><dd class="num">${(tx.cpp.rate * 100).toFixed(2)}%</dd><dt>Basic exemption</dt><dd class="num">${money(tx.cpp.exemptionCents)}</dd><dt>Max pensionable</dt><dd class="num">${money(tx.cpp.maxPensionableCents)}</dd><dt>EI rate</dt><dd class="num">${(tx.ei.rate * 100).toFixed(2)}%</dd><dt>Max insurable</dt><dd class="num">${money(tx.ei.maxInsurableCents)}</dd><dt>Employer EI</dt><dd class="num">${tx.ei.employerMultiple}×</dd></dl>`)}
      ${cardFlush(`Federal · basic amount ${money(tx.federal.bpaCents)}`, br(tx.federal.brackets))}${cardFlush(`British Columbia · basic amount ${money(tx.provincial.BC.bpaCents)}`, br(tx.provincial.BC.brackets))}</div>`
    + `<div class="sect-l">Pay groups</div>` + cardFlush("", table(["Code", "Name", "Company", "Frequency", ">People"], inScope(S.payGroups).map((g) => `<tr><td class="mono">${esc(g.code)}</td><td>${esc(g.name)}</td><td>${coTag(g.companyId)}</td><td>Biweekly</td>${td(S.payProfiles.filter((p) => p.payGroupId === g.id).length, 1)}</tr>`)));
}

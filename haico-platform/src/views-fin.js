/* ==========================================================================
   views-fin.js — Money: overview, ledger, AP/AR with the batch system,
   banking, expenses, assets, budgets, periods, inter-company, reports
   ========================================================================== */
const vendorName = (id) => byId(S.vendors, id)?.name || "—";
const customerName = (id) => byId(S.customers, id)?.name || "—";
const dueOf = (i) => i.totalCents - (i.paidCents || 0);
const coScopeSelect = (id, name, sel) => { const cos = S.companies.filter((c) => canSee(A, c.id)); return `<select class="in" id="${id}" name="${name}">${cos.map((c) => opt(c.id, c.displayName, c.id === sel)).join("")}</select>`; };
const defCo = () => A.activeCompanyId || S.companies.find((c) => canSee(A, c.id))?.id;

function vFinance() {
  const ids = scopeIds(S, A);
  const rows = balances(ids);
  const sum = (type, flip) => rows.filter((r) => r.type === type).reduce((s, r) => s + (flip ? -rowTotal(r) : rowTotal(r)), 0);
  const rev = sum("REVENUE", true), exp = sum("EXPENSE", false);
  const ap = inScope(S.apInvoices).filter((i) => ["APPROVED", "PARTIALLY_PAID"].includes(i.status));
  const ar = inScope(S.arInvoices).filter((i) => ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(i.status));
  const overdue = (list) => list.filter((i) => i.dueDate < todayStr()).reduce((s, i) => s + dueOf(i), 0);
  const recent = S.journalEntries.filter((j) => ids.includes(j.companyId)).slice(-8).reverse();
  const open = inScope(S.fiscalPeriods).filter((p) => p.status === "OPEN").map((p) => p.periodNumber);
  return ph("Finance Overview", `${scopeName()} · 2026 to date`) + flashHtml()
    + `<div class="stats">${stat("Cash", moneyCompact(cashOf(ids)), "Posted bank balance", "primary")}${stat("Revenue YTD", moneyCompact(rev))}${stat("Expenses YTD", moneyCompact(exp))}${stat(rev - exp >= 0 ? "Profit YTD" : "Loss YTD", moneyCompact(Math.abs(rev - exp)), "", rev - exp >= 0 ? "good" : "warn")}${stat("Bills to pay", moneyCompact(ap.reduce((s, i) => s + dueOf(i), 0)), overdue(ap) ? `${moneyCompact(overdue(ap))} overdue` : `${ap.length} approved bill${ap.length === 1 ? "" : "s"}`)}${stat("Owed to us", moneyCompact(ar.reduce((s, i) => s + dueOf(i), 0)), overdue(ar) ? `${moneyCompact(overdue(ar))} overdue` : `${ar.length} open invoice${ar.length === 1 ? "" : "s"}`)}</div>`
    + `<div class="grid g-main">${cardFlush("Latest ledger entries", table(["Entry", "Date", "Memo", "Source", ">Amount"], recent.map((j) => `<tr class="click" data-go="/finance/journals/${j.id}"><td class="mono">${esc(j.entryNumber)}</td><td>${j.date}</td><td>${esc(j.memo)}<div class="hint">${esc(co(j.companyId).displayName)}</div></td><td><span class="badge tone-grey">${esc(j.source)}</span></td>${td(money(j.totalDebitCents), 1)}</tr>`)))}
      <div class="grid">${card("Batch work", `<div style="display:grid;gap:8px">${can(A, "ap.create") ? `<button class="btn" data-go="/finance/ap/batch">Key a batch of bills</button>` : ""}${can(A, "ap.pay") ? `<button class="btn" data-go="/finance/ap/pay">Payment batch · ${ap.length} approved</button>` : ""}${can(A, "ar.receive") ? `<button class="btn" data-go="/finance/ar/deposit">Deposit batch · ${ar.length} open</button>` : ""}${can(A, "ar.create") ? `<button class="btn" data-go="/finance/ar/batch">Key a batch of invoices</button>` : ""}${can(A, "finance.post") ? `<button class="btn" data-go="/finance/journals/new">Manual journal entry</button>` : ""}</div>`)}
      ${card("Accounting periods", `<div class="hint">Open in 2026: ${open.length ? "P" + Math.min(...open) + " – P" + Math.max(...open) : "none"}. Postings into a closed period are refused.</div>${can(A, "finance.periods") ? `<button class="lnk" style="margin-top:8px" data-go="/finance/periods">Manage periods →</button>` : ""}`)}</div></div>`;
}

/* ---------------- journals ---------------- */
function vJournals() {
  const list = inScope(S.journalEntries).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.entryNumber.localeCompare(a.entryNumber)));
  const cur = UI.tabs.jsrc || "ALL";
  const srcs = [...new Set(list.map((j) => j.source))];
  const show = cur === "ALL" ? list : list.filter((j) => j.source === cur);
  return ph("Journal Entries", "Every posting in the ledger. Each one balanced, dated in an open period.", can(A, "finance.post") ? `<button class="btn pri" data-go="/finance/journals/new">New manual entry</button>` : "") + flashHtml()
    + tabs("jsrc", [["ALL", "All", list.length], ...srcs.map((s) => [s, s, list.filter((j) => j.source === s).length])], cur)
    + cardFlush("", table(["Entry", "Date", "Company", "Memo", "Source", ">Debits", "Posted by"], show.map((j) => `<tr class="click" data-go="/finance/journals/${j.id}"><td class="mono"><strong>${esc(j.entryNumber)}</strong></td><td>${j.date}</td><td>${coTag(j.companyId)}</td><td>${esc(j.memo)}</td><td><span class="badge tone-grey">${esc(j.source)}</span></td>${td(money(j.totalDebitCents), 1)}<td>${esc(j.postedByName || "System")}</td></tr>`)));
}
function vJournal(q, id) {
  const j = byId(S.journalEntries, id);
  if (!j || !canSee(A, j.companyId)) return ph("Entry not found") + card("", empty("Not in your companies"));
  const { acct } = ledgerIdx();
  const lines = S.journalLines.filter((l) => l.journalEntryId === j.id).sort((a, b) => a.sortOrder - b.sortOrder);
  return `<div class="crumb">${crumb("/finance/journals", "Journal Entries")}</div>` + ph(`${j.entryNumber}`, `${co(j.companyId).displayName} · ${dLong(j.date)} · ${j.memo}`, `<span class="badge tone-grey">${esc(j.source)}</span>${badge(j.status)}`)
    + cardFlush("", table(["Account", "Description", ">Debit", ">Credit"], lines.map((l) => { const a = acct.get(l.accountId); return `<tr><td><span class="mono">${esc(a.number)}</span> ${esc(a.name)}</td><td>${esc(l.description || "")}</td>${td(l.debitCents ? amount(l.debitCents) : "", 1)}${td(l.creditCents ? amount(l.creditCents) : "", 1)}</tr>`; }).concat([`<tr class="tot"><td colspan="2">Totals — balanced</td>${td(amount(j.totalDebitCents), 1)}${td(amount(j.totalCreditCents), 1)}</tr>`])))
    + `<p class="hint" style="margin-top:10px">Posted by ${esc(j.postedByName || "System")} · ${dTime(j.postedAt)}${j.reference ? ` · ref ${esc(j.reference)}` : ""}</p>`;
}
function vNewJournal() {
  const cid = UI.je?.companyId || defCo();
  if (!UI.je || UI.je.companyId !== cid) UI.je = { companyId: cid, date: todayStr(), memo: "", lines: [{}, {}] };
  const accts = S.accounts.filter((a) => a.companyId === cid && a.isPostable !== false).sort((a, b) => a.number.localeCompare(b.number));
  return `<div class="crumb">${crumb("/finance/journals", "Journal Entries")}</div>` + ph("Manual journal entry", "Debits must equal credits, and the date must fall in an open period — the ledger refuses anything else.") + flashHtml()
    + card("", `<form data-f="journal" id="jeForm"><div class="form-grid" style="margin-bottom:12px"><div class="fld"><label for="jeCo">Company</label>${coScopeSelect("jeCo", "companyId", cid).replace('class="in"', 'class="in" data-a="jeCo"')}</div><div class="fld"><label for="jeDate">Date</label><input class="in" type="date" id="jeDate" name="date" value="${UI.je.date}"></div><div class="fld" style="grid-column:span 2"><label for="jeMemo">Description</label><input class="in" id="jeMemo" name="memo" value="${esc(UI.je.memo)}" placeholder="e.g. Accrue September audit fee"></div></div>
      <div class="tw"><table class="t"><thead><tr><th>Account</th><th>Line description</th><th class="r">Debit</th><th class="r">Credit</th><th></th></tr></thead><tbody>${UI.je.lines.map((l, i) => `<tr><td><select class="in" data-je="accountNumber" data-i="${i}" aria-label="Account ${i + 1}">${opt("", "— account —", !l.accountNumber)}${accts.map((a) => opt(a.number, `${a.number} — ${a.name}`, a.number === l.accountNumber)).join("")}</select></td><td><input class="in" data-je="description" data-i="${i}" value="${esc(l.description || "")}" aria-label="Description ${i + 1}"></td><td><input class="in num" style="text-align:right" inputmode="decimal" data-je="debit" data-i="${i}" value="${l.debit || ""}" aria-label="Debit ${i + 1}"></td><td><input class="in num" style="text-align:right" inputmode="decimal" data-je="credit" data-i="${i}" value="${l.credit || ""}" aria-label="Credit ${i + 1}"></td><td>${UI.je.lines.length > 2 ? `<button type="button" class="lnk" style="color:var(--danger);font-size:12px" data-a="jeDel" data-i="${i}">remove</button>` : ""}</td></tr>`).join("")}<tr class="tot"><td colspan="2"><button type="button" class="lnk" data-a="jeAdd">+ line</button></td><td class="r num" id="jeDr"></td><td class="r num" id="jeCr"></td><td id="jeBal"></td></tr></tbody></table></div>
      <div class="form-row" style="margin-top:12px"><button class="btn pri">Post entry</button><span class="hint" id="jeHint"></span></div></form>`);
}
function jeTotals() {
  const dr = UI.je.lines.reduce((s, l) => s + (toCents(l.debit) || 0), 0), cr = UI.je.lines.reduce((s, l) => s + (toCents(l.credit) || 0), 0);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
  set("jeDr", amount(dr)); set("jeCr", amount(cr)); set("jeBal", dr === cr && dr > 0 ? `<span class="badge tone-green">Balanced</span>` : `<span class="badge tone-amber">Off by ${amount(Math.abs(dr - cr))}</span>`);
}
function vAccounts() {
  const ids = scopeIds(S, A);
  const bal = balances(ids);
  const cid = ids.length === 1 ? ids[0] : "TAAN";
  const accts = S.accounts.filter((a) => a.companyId === cid).sort((a, b) => a.number.localeCompare(b.number));
  const types = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
  return ph("Chart of Accounts", "One uniform chart across every company, so reports line up side by side.")
    + cardFlush("", `<div class="tw"><table class="t"><thead><tr><th>Number</th><th>Account</th><th>Type</th>${ids.map((id) => `<th class="r">${esc(co(id).displayName)}</th>`).join("")}${ids.length > 1 ? `<th class="r">Group</th>` : ""}</tr></thead><tbody>${types.map((t) => `<tr class="sub"><td colspan="${3 + ids.length + (ids.length > 1 ? 1 : 0)}">${t}</td></tr>` + accts.filter((a) => a.type === t).map((a) => { const r = bal.find((x) => x.number === a.number); const nat = (v) => (["LIABILITY", "EQUITY", "REVENUE"].includes(t) ? -v : v); return `<tr><td class="mono">${esc(a.number)}</td><td>${esc(a.name)}</td><td class="hint">${esc(a.subtype || "")}</td>${ids.map((id) => td(r ? amount(nat(r.by.get(id) || 0)) : "—", 1)).join("")}${ids.length > 1 ? td(r ? `<strong>${amount(nat(rowTotal(r)))}</strong>` : "—", 1) : ""}</tr>`; }).join("")).join("")}</tbody></table></div>`);
}

/* ---------------- AP: bills + batch system ---------------- */
function vAP(q) {
  const cur = UI.tabs.ap || "OPEN";
  const all = inScope(S.apInvoices);
  const groups = { OPEN: (i) => ["APPROVED", "PARTIALLY_PAID"].includes(i.status), WAITING: (i) => ["PENDING_APPROVAL", "DRAFT"].includes(i.status), PAID: (i) => i.status === "PAID", ALL: () => true };
  const list = all.filter(groups[cur]).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const batches = inScope(S.apBatches).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8);
  const acts = [can(A, "ap.create") && `<button class="btn" data-a="newBill">New bill</button>`, can(A, "ap.create") && `<button class="btn" data-go="/finance/ap/batch">Batch entry</button>`, can(A, "ap.pay") && `<button class="btn pri" data-go="/finance/ap/pay">Payment batch</button>`].filter(Boolean).join("");
  const drop = can(A, "ap.create") ? `<div class="drop" id="billDrop" style="margin-bottom:14px">Drag a vendor's PDF or photo anywhere on this box to start a new bill with it attached — or <button type="button" class="lnk" data-a="newBill">enter one by hand</button>.<input type="file" id="billFile" accept="application/pdf,image/*" hidden></div>` : "";
  return ph("Bills to Pay · AP", "Vendor bills: enter, approve, pay. Approval posts the bill to the ledger; payment clears it from the bank.", acts) + flashHtml() + drop
    + tabs("ap", [["OPEN", "To pay", all.filter(groups.OPEN).length], ["WAITING", "In approval", all.filter(groups.WAITING).length], ["PAID", "Paid", all.filter(groups.PAID).length], ["ALL", "All", all.length]], cur)
    + cardFlush("", table(["Bill", "Vendor", "Company", "Due", ">Total", ">Still owed", "Status"], list.map((i) => `<tr class="click" data-go="/finance/ap/${i.id}"><td class="mono"><strong>${esc(i.invoiceNumber)}</strong>${i.attachments?.length ? " 📎" : ""}${i.batchId ? `<div class="hint">${esc(byId(S.apBatches, i.batchId)?.batchNumber || "")}</div>` : ""}</td><td>${esc(vendorName(i.vendorId))}<div class="hint">${esc(i.description)}</div></td><td>${coTag(i.companyId)}</td><td class="${i.dueDate < todayStr() && groups.OPEN(i) ? "" : ""}">${dLong(i.dueDate)}${i.dueDate < todayStr() && groups.OPEN(i) ? ` <span class="badge tone-red">overdue</span>` : ""}</td>${td(money(i.totalCents), 1)}${td(money(dueOf(i)), 1)}<td>${badge(i.status)}</td></tr>`), "No bills here."))
    + `<div class="sect-l">Recent batches</div>` + cardFlush("", table(["Batch", "Kind", "Company", "Created", ">Items", ">Total", "Status"], batches.map((b) => `<tr class="click" data-go="/finance/ap/batches/${b.id}"><td class="mono"><strong>${esc(b.batchNumber)}</strong></td><td>${b.kind === "ENTRY" ? "Bill entry" : "Payment run"}</td><td>${b.companyId ? coTag(b.companyId) : "Several"}</td><td>${esc(b.createdByName)} · ${esc(ago(b.createdAt))}</td>${td(b.items.length, 1)}${td(money(b.totalCents), 1)}<td>${badge(b.status)}</td></tr>`), "No batches yet — key several bills at once with Batch entry, or pay several with a Payment batch."));
}
function vBill(q, id) {
  const i = byId(S.apInvoices, id);
  if (!i || !canSee(A, i.companyId)) return ph("Bill not found") + card("", empty("Not in your companies"));
  const v = byId(S.vendors, i.vendorId);
  const lines = S.apLines.filter((l) => l.apInvoiceId === i.id);
  const pays = S.payments.filter((p) => p.invoiceId === i.id);
  const inst = i.approvalInstanceId ? byId(S.approvals, i.approvalInstanceId) : null;
  const je = i.journalEntryId ? byId(S.journalEntries, i.journalEntryId) : null;
  let acts = "";
  if (i.status === "DRAFT" && can(A, "ap.create")) acts += `<button class="btn pri" data-a="apSubmit" data-id="${i.id}">Send for approval</button>`;
  if (["APPROVED", "PARTIALLY_PAID"].includes(i.status) && can(A, "ap.pay")) acts += `<button class="btn pri" data-a="payBill" data-id="${i.id}">Pay ${money(dueOf(i))}</button>`;
  return `<div class="crumb">${crumb("/finance/ap", "Bills to Pay")}</div>` + ph(`Bill ${i.invoiceNumber}`, `${v.name} · ${co(i.companyId).displayName} · ${i.description}`, badge(i.status) + acts) + flashHtml()
    + (inst && inst.status === "PENDING" ? `<div class="msg info">Waiting for ${esc(whoIsNext(S, inst))} (${esc(activeSteps(S, inst).find((s) => s.sequence === inst.currentStep)?.name)}). ${stepsChips(inst)}</div>` : "")
    + `<div class="grid g3">${card("Details", `<dl class="kv"><dt>Bill date</dt><dd>${dLong(i.invoiceDate)}</dd><dt>Due</dt><dd>${dLong(i.dueDate)} (${v.paymentTermsDays || 30} days)</dd><dt>Vendor no.</dt><dd class="mono">${esc(v.vendorNumber)}</dd><dt>Tax no.</dt><dd class="mono">${esc(v.taxNumber || "—")}</dd>${i.batchId ? `<dt>Batch</dt><dd>${goLink(`/finance/ap/batches/${i.batchId}`, byId(S.apBatches, i.batchId)?.batchNumber || "")}</dd>` : ""}${je ? `<dt>Ledger</dt><dd>${goLink(`/finance/journals/${je.id}`, je.entryNumber)}</dd>` : ""}</dl>`)}
      ${card("Amounts", `<dl class="kv"><dt>Before tax</dt><dd class="num">${money(i.subtotalCents)}</dd><dt>GST</dt><dd class="num">${money(i.taxCents)}</dd><dt>Total</dt><dd class="num"><strong>${money(i.totalCents)}</strong></dd><dt>Paid</dt><dd class="num">${money(i.paidCents || 0)}</dd><dt>Still owed</dt><dd class="num"><strong>${money(dueOf(i))}</strong></dd></dl>`)}
      ${card("Attachments", i.attachments?.length ? i.attachments.map((a) => `<div style="display:flex;gap:8px;align-items:center;font-size:13px">📎 <span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</span><span class="hint">${Math.round((a.size || 0) / 1024)} KB · ${esc(a.by)}</span></div>`).join("") : `<div class="hint">No document attached. Attachments in this demo keep the file's name and size only.</div>`)}</div>`
    + `<div class="grid g2" style="margin-top:14px">${cardFlush("Lines", table(["Description", "Account", ">Amount", ">GST"], lines.map((l) => `<tr><td>${esc(l.description)}</td><td class="mono">${esc(l.accountNumber)} ${esc(S.accounts.find((a) => a.companyId === i.companyId && a.number === l.accountNumber)?.name || "")}</td>${td(money(l.amountCents), 1)}${td(money(l.taxCents || 0), 1)}</tr>`)))}
      ${cardFlush("Payments", table(["Payment", "Date", "Method", ">Amount"], pays.map((p) => `<tr><td class="mono">${esc(p.paymentNumber)}${p.batchId ? ` <span class="badge tone-teal">batch</span>` : ""}</td><td>${dLong(p.date)}</td><td>${esc(p.method)}</td>${td(money(p.amountCents), 1)}</tr>`), "Nothing paid yet."))}</div>`;
}
function billModal(draft) {
  const vendors = inScope(S.vendors).sort((a, b) => a.name.localeCompare(b.name));
  const d = draft || {};
  return `<h3>New vendor bill</h3><p class="hint" style="margin:0 0 12px">${d.attachment ? `📎 ${esc(d.attachment.name)} attached (${Math.round(d.attachment.size / 1024)} KB)` : "Enter the bill as the vendor wrote it."}</p>
    <form data-f="bill" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="bVendor">Vendor</label><select class="in" id="bVendor" name="vendorId">${vendors.map((v) => opt(v.id, `${v.name} · ${co(v.companyId).displayName}`)).join("")}</select></div>
    <div class="fld"><label for="bNum">Invoice number</label><input class="in" id="bNum" name="invoiceNumber" required value="${esc(d.invoiceNumber || "")}"></div><div class="fld"><label for="bDate">Bill date</label><input class="in" type="date" id="bDate" name="invoiceDate" value="${todayStr()}"></div>
    <div class="fld"><label for="bAmt">Amount before tax</label><input class="in num" id="bAmt" name="subtotal" inputmode="decimal" placeholder="0.00" required></div><div class="fld"><label for="bGst">GST</label><select class="in" id="bGst" name="gst">${opt("1", "Add 5% GST", true)}${opt("", "No GST")}</select></div>
    <div class="fld" style="grid-column:1/-1"><label for="bDesc">What is it for?</label><input class="in" id="bDesc" name="description" placeholder="e.g. Diesel — harvest fleet"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn" name="submit" value="0">Save draft</button><button class="btn pri" name="submit" value="1">Send for approval</button></div></form>`;
}
function payModal(inv) {
  return `<h3>Pay ${esc(inv.invoiceNumber)}</h3><p class="hint" style="margin:0 0 12px">${esc(vendorName(inv.vendorId))} · owed ${money(dueOf(inv))}. Need to pay several bills? Use a <button class="lnk" data-go="/finance/ap/pay">payment batch</button>.</p>
    <form data-f="pay" data-id="${inv.id}" class="form-grid"><div class="fld"><label for="pAmt">Amount</label><input class="in num" id="pAmt" name="amount" inputmode="decimal" value="${(dueOf(inv) / 100).toFixed(2)}"></div><div class="fld"><label for="pDate">Date</label><input class="in" type="date" id="pDate" name="date" value="${todayStr()}"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Record EFT</button></div></form>`;
}
/* batch entry grid for bills */
function vAPBatch() {
  if (!UI.apb) UI.apb = { rows: [{}, {}, {}], date: todayStr() };
  const vendors = inScope(S.vendors).sort((a, b) => a.name.localeCompare(b.name));
  const accts = [...new Map(S.accounts.filter((a) => a.type === "EXPENSE").map((a) => [a.number, a])).values()].sort((a, b) => a.number.localeCompare(b.number));
  const tot = UI.apb.rows.reduce((s, r) => { const sub = toCents(r.subtotal) || 0; return s + sub + (r.gst === false ? 0 : Math.round(sub * 0.05)); }, 0);
  return `<div class="crumb">${crumb("/finance/ap", "Bills to Pay")}</div>` + ph("Batch entry · bills", "Key a pile of vendor bills in one sitting. The batch is checked as a whole — if any row is wrong, nothing is created.") + flashHtml()
    + card("", `<form data-f="apBatch"><div class="tw"><table class="t"><thead><tr><th>#</th><th>Vendor</th><th>Invoice no.</th><th>Date</th><th>Description</th><th>Expense account</th><th class="r">Before tax</th><th>GST</th><th></th></tr></thead><tbody>${UI.apb.rows.map((r, i) => { const v = byId(S.vendors, r.vendorId); const acct = r.accountNumber || v?.defaultExpenseAccountNumber || ""; return `<tr><td class="hint">${i + 1}</td>
      <td><select class="in" style="min-width:190px" data-apb="vendorId" data-i="${i}" aria-label="Vendor ${i + 1}">${opt("", "— vendor —", !r.vendorId)}${vendors.map((x) => opt(x.id, `${x.name} · ${co(x.companyId).code}`, x.id === r.vendorId)).join("")}</select></td>
      <td><input class="in" style="min-width:110px" data-apb="invoiceNumber" data-i="${i}" value="${esc(r.invoiceNumber || "")}" aria-label="Invoice number ${i + 1}"></td>
      <td><input class="in" type="date" data-apb="invoiceDate" data-i="${i}" value="${r.invoiceDate || UI.apb.date}" aria-label="Date ${i + 1}"></td>
      <td><input class="in" style="min-width:160px" data-apb="description" data-i="${i}" value="${esc(r.description || "")}" aria-label="Description ${i + 1}"></td>
      <td><select class="in" style="min-width:170px" data-apb="accountNumber" data-i="${i}" aria-label="Account ${i + 1}">${accts.map((a) => opt(a.number, `${a.number} — ${a.name}`, a.number === acct)).join("")}</select></td>
      <td><input class="in num" style="text-align:right;min-width:100px" inputmode="decimal" data-apb="subtotal" data-i="${i}" value="${esc(r.subtotal || "")}" aria-label="Amount ${i + 1}"></td>
      <td style="text-align:center"><input type="checkbox" data-apb="gst" data-i="${i}" ${r.gst === false ? "" : "checked"} aria-label="GST ${i + 1}"></td>
      <td>${UI.apb.rows.length > 1 ? `<button type="button" class="lnk" style="color:var(--danger);font-size:12px" data-a="apbDel" data-i="${i}">remove</button>` : ""}</td></tr>`; }).join("")}
      <tr class="tot"><td colspan="6"><button type="button" class="lnk" data-a="apbAdd">+ add a row</button></td><td class="r num">${amount(tot)}</td><td colspan="2" class="hint">incl. GST</td></tr></tbody></table></div>
      <div class="form-row" style="margin-top:12px"><button class="btn" name="submit" value="0">Save batch as drafts</button><button class="btn pri" name="submit" value="1">Create and send all for approval</button><span class="hint">${esc(approvalSentence("AP_INVOICE"))}</span></div></form>`);
}
/* payment batch: pick approved bills, pay them in one EFT run */
function vPayBatch() {
  const cid = UI.filters.payCo || defCo();
  const bills = S.apInvoices.filter((i) => i.companyId === cid && ["APPROVED", "PARTIALLY_PAID"].includes(i.status)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  if (!UI.payb || UI.payb.cid !== cid) UI.payb = { cid, sel: Object.fromEntries(bills.map((b) => [b.id, b.dueDate <= addDays(todayStr(), 7)])), amt: Object.fromEntries(bills.map((b) => [b.id, (dueOf(b) / 100).toFixed(2)])), date: todayStr() };
  const P = UI.payb;
  const total = bills.filter((b) => P.sel[b.id]).reduce((s, b) => s + (toCents(P.amt[b.id]) || 0), 0);
  const nSel = bills.filter((b) => P.sel[b.id]).length;
  const bank = S.bankAccounts.find((b) => b.companyId === cid);
  const cash = cashOf([cid]);
  return `<div class="crumb">${crumb("/finance/ap", "Bills to Pay")}</div>` + ph("Payment batch", "Pay several approved bills in one EFT run. One ledger entry, one bank withdrawal, a payment record on every bill.") + flashHtml()
    + `<div class="form-row" style="margin-bottom:14px"><div class="fld"><label for="pbCo">Paying from</label>${coScopeSelect("pbCo", "companyId", cid).replace('class="in"', 'class="in" data-a="payCo"')}</div><div class="fld"><label for="pbDate">Payment date</label><input class="in" type="date" id="pbDate" value="${P.date}" data-a="payDate"></div><div class="fld"><label>Bank account</label><div style="height:38px;display:flex;align-items:center" class="mono">${esc(bank?.name || "—")} ${esc(bank?.accountNumberMasked || "")}</div></div></div>`
    + cardFlush("", table(["", "Bill", "Vendor", "Due", ">Still owed", ">Pay now"], bills.map((b) => `<tr><td><input type="checkbox" data-pb="sel" data-id="${b.id}" ${P.sel[b.id] ? "checked" : ""} aria-label="Pay ${esc(b.invoiceNumber)}"></td><td class="mono"><strong>${esc(b.invoiceNumber)}</strong><div class="hint">${esc(b.description)}</div></td><td>${esc(vendorName(b.vendorId))}</td><td>${dLong(b.dueDate)}${b.dueDate < todayStr() ? ` <span class="badge tone-red">overdue</span>` : b.dueDate <= addDays(todayStr(), 7) ? ` <span class="badge tone-amber">this week</span>` : ""}</td>${td(money(dueOf(b)), 1)}<td class="r"><input class="in num" style="width:120px;text-align:right;display:inline-block" inputmode="decimal" data-pb="amt" data-id="${b.id}" value="${esc(P.amt[b.id])}" ${P.sel[b.id] ? "" : "disabled"} aria-label="Amount for ${esc(b.invoiceNumber)}"></td></tr>`), `No approved bills to pay for ${co(cid).displayName}.`))
    + `<div class="bigsum"><div><div style="font-size:11px;letter-spacing:.08em;opacity:.8">EFT BATCH TOTAL · ${nSel} BILL${nSel === 1 ? "" : "S"}</div><b>${money(total)}</b><div style="font-size:12px;opacity:.85;margin-top:2px">Cash after payment: ${money(cash - total)}${cash - total < 0 ? " — overdrawn" : ""}</div></div><div class="form-row"><button class="btn" style="background:var(--card);color:var(--fg)" data-a="pbAll">${nSel === bills.length ? "Clear all" : "Select all"}</button><button class="btn" style="background:var(--card);color:var(--fg);font-weight:700" data-a="pbPost" ${nSel ? "" : "disabled"}>Post payment batch</button></div></div>`;
}
function vAPBatchDetail(q, id) {
  const b = byId(S.apBatches, id);
  if (!b) return ph("Batch not found") + card("", empty("This batch no longer exists"));
  const je = b.journalEntryId ? byId(S.journalEntries, b.journalEntryId) : null;
  const acts = b.kind === "ENTRY" && b.status === "DRAFT" && can(A, "ap.create") ? `<button class="btn pri" data-a="apbSubmit" data-id="${b.id}">Send all for approval</button>` : "";
  const rows = b.kind === "ENTRY" ? table(["Bill", "Vendor", "Company", ">Total", "Status"], b.items.map((iid) => { const i = byId(S.apInvoices, iid); return i ? `<tr class="click" data-go="/finance/ap/${i.id}"><td class="mono">${esc(i.invoiceNumber)}</td><td>${esc(vendorName(i.vendorId))}</td><td>${coTag(i.companyId)}</td>${td(money(i.totalCents), 1)}<td>${badge(i.status)}</td></tr>` : ""; }))
    : table(["Bill", "Vendor", ">Paid"], b.items.map((it) => `<tr class="click" data-go="/finance/ap/${it.invoiceId}"><td class="mono">${esc(it.invoiceNumber)}</td><td>${esc(it.vendorName)}</td>${td(money(it.amountCents), 1)}</tr>`).concat([`<tr class="tot"><td colspan="2">Batch total</td>${td(money(b.totalCents), 1)}</tr>`]));
  return `<div class="crumb">${crumb("/finance/ap", "Bills to Pay")}</div>` + ph(`${b.batchNumber} · ${b.kind === "ENTRY" ? "Bill entry batch" : "Payment run"}`, `${b.companyId ? co(b.companyId).displayName : "Several companies"} · ${b.items.length} item${b.items.length === 1 ? "" : "s"} · ${esc(b.createdByName)} · ${dTime(b.createdAt)}`, badge(b.status) + acts) + flashHtml()
    + (je ? `<div class="msg ok">Posted as one ledger entry: ${goLink(`/finance/journals/${je.id}`, je.entryNumber)} · bank withdrawal of ${money(b.totalCents)} on ${dLong(b.date)}.</div>` : "") + cardFlush("", rows);
}

/* ---------------- AR: invoices + batch system ---------------- */
function vAR() {
  const cur = UI.tabs.ar || "OPEN";
  const all = inScope(S.arInvoices);
  const groups = { OPEN: (i) => ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(i.status), PAID: (i) => i.status === "PAID", ALL: () => true };
  const list = all.filter(groups[cur]).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const batches = inScope(S.arBatches).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8);
  const acts = [can(A, "ar.create") && `<button class="btn" data-a="newInvoice">New invoice</button>`, can(A, "ar.create") && `<button class="btn" data-go="/finance/ar/batch">Batch entry</button>`, can(A, "ar.receive") && `<button class="btn pri" data-go="/finance/ar/deposit">Deposit batch</button>`].filter(Boolean).join("");
  return ph("Customer Invoices · AR", "What customers owe us. Sending an invoice posts it; a deposit clears it.", acts) + flashHtml()
    + tabs("ar", [["OPEN", "Owed to us", all.filter(groups.OPEN).length], ["PAID", "Paid", all.filter(groups.PAID).length], ["ALL", "All", all.length]], cur)
    + cardFlush("", table(["Invoice", "Customer", "Company", "Due", ">Total", ">Outstanding", "Status", ""], list.map((i) => `<tr><td class="mono"><strong>${esc(i.invoiceNumber)}</strong><div class="hint">${esc(i.memo)}</div></td><td>${esc(customerName(i.customerId))}</td><td>${coTag(i.companyId)}</td><td>${dLong(i.dueDate)}${i.dueDate < todayStr() && groups.OPEN(i) ? ` <span class="badge tone-red">overdue</span>` : ""}</td>${td(money(i.totalCents), 1)}${td(money(dueOf(i)), 1)}<td>${badge(i.status)}</td><td class="r">${groups.OPEN(i) && can(A, "ar.receive") ? `<button class="btn sm" data-a="receive" data-id="${i.id}">Record payment</button>` : ""}</td></tr>`), "No invoices here."))
    + `<div class="sect-l">Recent batches</div>` + cardFlush("", table(["Batch", "Kind", "Company", "Created", ">Items", ">Total", "Ledger"], batches.map((b) => { const je = b.journalEntryId ? byId(S.journalEntries, b.journalEntryId) : null; return `<tr><td class="mono"><strong>${esc(b.batchNumber)}</strong>${b.reference ? `<div class="hint">${esc(b.reference)}</div>` : ""}</td><td>${b.kind === "ENTRY" ? "Invoice entry" : "Deposit"}</td><td>${b.companyId ? coTag(b.companyId) : "Several"}</td><td>${esc(b.createdByName)} · ${esc(ago(b.createdAt))}</td>${td(b.items.length, 1)}${td(money(b.totalCents), 1)}<td>${je ? goLink(`/finance/journals/${je.id}`, je.entryNumber) : b.items.length + " entries"}</td></tr>`; }), "No batches yet — issue several invoices with Batch entry, or apply one deposit across invoices with a Deposit batch."));
}
function invoiceModal() {
  const cus = inScope(S.customers).sort((a, b) => a.name.localeCompare(b.name));
  return `<h3>New customer invoice</h3><p class="hint" style="margin:0 0 12px">Posts to the ledger as soon as it's sent.</p><form data-f="invoice" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="iCu">Customer</label><select class="in" id="iCu" name="customerId">${cus.map((c) => opt(c.id, `${c.name} · ${co(c.companyId).displayName}`)).join("")}</select></div>
    <div class="fld"><label for="iAmt">Amount before tax</label><input class="in num" id="iAmt" name="subtotal" inputmode="decimal" required></div><div class="fld"><label for="iDate">Invoice date</label><input class="in" type="date" id="iDate" name="invoiceDate" value="${todayStr()}"></div>
    <div class="fld"><label for="iGst">GST</label><select class="in" id="iGst" name="gst">${opt("1", "Charge 5% GST", true)}${opt("", "No GST")}</select></div><div class="fld"><label for="iMemo">Description</label><input class="in" id="iMemo" name="memo" placeholder="e.g. Cedar log sale — October"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Send invoice</button></div></form>`;
}
function receiveModal(inv) {
  return `<h3>Record payment on ${esc(inv.invoiceNumber)}</h3><p class="hint" style="margin:0 0 12px">${esc(customerName(inv.customerId))} · outstanding ${money(dueOf(inv))}. One deposit covering several invoices? Use a <button class="lnk" data-go="/finance/ar/deposit">deposit batch</button>.</p>
    <form data-f="receive" data-id="${inv.id}" class="form-grid"><div class="fld"><label for="rAmt">Amount received</label><input class="in num" id="rAmt" name="amount" inputmode="decimal" value="${(dueOf(inv) / 100).toFixed(2)}"></div><div class="fld"><label for="rDate">Date</label><input class="in" type="date" id="rDate" name="date" value="${todayStr()}"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Record deposit</button></div></form>`;
}
function vARBatch() {
  if (!UI.arb) UI.arb = { rows: [{}, {}, {}], date: todayStr() };
  const cus = inScope(S.customers).sort((a, b) => a.name.localeCompare(b.name));
  const tot = UI.arb.rows.reduce((s, r) => { const sub = toCents(r.subtotal) || 0; return s + sub + (r.gst === false ? 0 : Math.round(sub * 0.05)); }, 0);
  return `<div class="crumb">${crumb("/finance/ar", "Customer Invoices")}</div>` + ph("Batch entry · invoices", "Issue a run of customer invoices at once — month-end billing in one go. Each invoice posts to the ledger; the batch is checked as a whole first.") + flashHtml()
    + card("", `<form data-f="arBatch"><div class="tw"><table class="t"><thead><tr><th>#</th><th>Customer</th><th>Date</th><th>Description</th><th class="r">Before tax</th><th>GST</th><th></th></tr></thead><tbody>${UI.arb.rows.map((r, i) => `<tr><td class="hint">${i + 1}</td>
      <td><select class="in" style="min-width:200px" data-arb="customerId" data-i="${i}" aria-label="Customer ${i + 1}">${opt("", "— customer —", !r.customerId)}${cus.map((x) => opt(x.id, `${x.name} · ${co(x.companyId).code}`, x.id === r.customerId)).join("")}</select></td>
      <td><input class="in" type="date" data-arb="invoiceDate" data-i="${i}" value="${r.invoiceDate || UI.arb.date}" aria-label="Date ${i + 1}"></td>
      <td><input class="in" style="min-width:200px" data-arb="memo" data-i="${i}" value="${esc(r.memo || "")}" aria-label="Description ${i + 1}"></td>
      <td><input class="in num" style="text-align:right;min-width:110px" inputmode="decimal" data-arb="subtotal" data-i="${i}" value="${esc(r.subtotal || "")}" aria-label="Amount ${i + 1}"></td>
      <td style="text-align:center"><input type="checkbox" data-arb="gst" data-i="${i}" ${r.gst === false ? "" : "checked"} aria-label="GST ${i + 1}"></td>
      <td>${UI.arb.rows.length > 1 ? `<button type="button" class="lnk" style="color:var(--danger);font-size:12px" data-a="arbDel" data-i="${i}">remove</button>` : ""}</td></tr>`).join("")}
      <tr class="tot"><td colspan="4"><button type="button" class="lnk" data-a="arbAdd">+ add a row</button></td><td class="r num">${amount(tot)}</td><td colspan="2" class="hint">incl. GST</td></tr></tbody></table></div>
      <div class="form-row" style="margin-top:12px"><button class="btn pri">Issue all invoices</button></div></form>`);
}
function vDepositBatch() {
  const cid = UI.filters.depCo || defCo();
  const invs = S.arInvoices.filter((i) => i.companyId === cid && ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(i.status)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  if (!UI.depb || UI.depb.cid !== cid) UI.depb = { cid, sel: {}, amt: Object.fromEntries(invs.map((b) => [b.id, (dueOf(b) / 100).toFixed(2)])), date: todayStr(), deposit: "", reference: "" };
  const P = UI.depb;
  const applied = invs.filter((b) => P.sel[b.id]).reduce((s, b) => s + (toCents(P.amt[b.id]) || 0), 0);
  const dep = toCents(P.deposit) || 0;
  const nSel = invs.filter((b) => P.sel[b.id]).length;
  const bank = S.bankAccounts.find((b) => b.companyId === cid);
  const ok = nSel > 0 && (dep === 0 || dep === applied);
  return `<div class="crumb">${crumb("/finance/ar", "Customer Invoices")}</div>` + ph("Deposit batch", "One bank deposit, applied across the invoices it pays. The applied amounts must add up to the deposit before it will post.") + flashHtml()
    + `<div class="form-grid" style="margin-bottom:14px"><div class="fld"><label for="dbCo">Deposited into</label>${coScopeSelect("dbCo", "companyId", cid).replace('class="in"', 'class="in" data-a="depCo"')}<span class="hint mono">${esc(bank?.name || "")} ${esc(bank?.accountNumberMasked || "")}</span></div><div class="fld"><label for="dbDate">Deposit date</label><input class="in" type="date" id="dbDate" value="${P.date}" data-a="depDate"></div><div class="fld"><label for="dbAmt">Deposit amount (from the bank)</label><input class="in num" id="dbAmt" inputmode="decimal" placeholder="Leave blank to use the applied total" value="${esc(P.deposit)}" data-a="depAmt"></div><div class="fld"><label for="dbRef">Reference</label><input class="in" id="dbRef" placeholder="e.g. Westcoast EFT 4471" value="${esc(P.reference)}" data-a="depRef"></div></div>`
    + cardFlush("", table(["", "Invoice", "Customer", "Due", ">Outstanding", ">Apply"], invs.map((b) => `<tr><td><input type="checkbox" data-db="sel" data-id="${b.id}" ${P.sel[b.id] ? "checked" : ""} aria-label="Apply to ${esc(b.invoiceNumber)}"></td><td class="mono"><strong>${esc(b.invoiceNumber)}</strong><div class="hint">${esc(b.memo)}</div></td><td>${esc(customerName(b.customerId))}</td><td>${dLong(b.dueDate)}${b.dueDate < todayStr() ? ` <span class="badge tone-red">overdue</span>` : ""}</td>${td(money(dueOf(b)), 1)}<td class="r"><input class="in num" style="width:130px;text-align:right;display:inline-block" inputmode="decimal" data-db="amt" data-id="${b.id}" value="${esc(P.amt[b.id])}" ${P.sel[b.id] ? "" : "disabled"} aria-label="Amount for ${esc(b.invoiceNumber)}"></td></tr>`), `No open invoices for ${co(cid).displayName}.`))
    + `<div class="bigsum"><div><div style="font-size:11px;letter-spacing:.08em;opacity:.8">APPLIED TO ${nSel} INVOICE${nSel === 1 ? "" : "S"}</div><b>${money(applied)}</b><div style="font-size:12px;opacity:.85;margin-top:2px">${dep ? (dep === applied ? "Matches the deposit ✓" : `Deposit is ${money(dep)} — ${money(Math.abs(dep - applied))} ${dep > applied ? "still to apply" : "over-applied"}`) : "Deposit amount will equal the applied total"}</div></div><button class="btn" style="background:var(--card);color:var(--fg);font-weight:700" data-a="dbPost" ${ok ? "" : "disabled"}>Post deposit batch</button></div>`;
}

/* ---------------- banking, expenses, assets, budgets, periods, interco ---------------- */
function vBanking() {
  const accts = inScope(S.bankAccounts);
  const cur = UI.filters.bank && accts.some((a) => a.id === UI.filters.bank) ? UI.filters.bank : accts[0]?.id;
  const acc = byId(S.bankAccounts, cur);
  const txns = S.bankTransactions.filter((t) => t.bankAccountId === cur).sort((a, b) => (a.date < b.date ? 1 : -1));
  const gl = acc ? cashOf([acc.companyId]) : 0;
  const bankBal = acc ? acc.openingBalanceCents + txns.reduce((s, t) => s + t.amountCents, 0) : 0;
  const unmatched = txns.filter((t) => t.status === "UNMATCHED");
  return ph("Banking", "Bank activity next to the ledger's cash balance. Unmatched lines are what reconciliation still has to explain.")
    + `<div class="tabs">${accts.map((a) => `<button class="${a.id === cur ? "on" : ""}" data-a="bank" data-id="${a.id}">${esc(co(a.companyId).displayName)}</button>`).join("")}</div>`
    + (acc ? `<div class="stats">${stat("Bank balance", money(bankBal), `${acc.institution} ${acc.accountNumberMasked}`, "primary")}${stat("Ledger cash (1010)", money(gl), "All posted entries")}${stat("Difference", money(bankBal - gl), unmatched.length ? `${unmatched.length} unmatched line${unmatched.length === 1 ? "" : "s"}` : "Fully explained", bankBal - gl === 0 ? "good" : "warn")}</div>`
      + cardFlush("Transactions", table(["Date", "Description", "Type", ">Amount", "Status"], txns.map((t) => `<tr><td>${dLong(t.date)}</td><td>${esc(t.description)}</td><td><span class="badge tone-grey">${esc(t.type)}</span></td>${td(`<span style="color:${t.amountCents < 0 ? "var(--t-red)" : "var(--t-green)"}">${money(t.amountCents)}</span>`, 1)}<td>${badge(t.status)}</td></tr>`))) : card("", empty("No bank accounts in scope")));
}
function vExpenses() {
  const list = inScope(S.expenseClaims).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  return ph("Expense Claims", "Employee claims across the group. Approved claims are paid back here and posted to the ledger.") + flashHtml()
    + cardFlush("", table(["Claim", "Employee", "Company", "Purpose", "Submitted", ">Amount", "Status", ""], list.map((x) => { const e = byId(S.employees, x.employeeId); const l = S.expenseLines.find((y) => y.expenseClaimId === x.id); return `<tr><td class="mono">${esc(x.claimNumber)}</td><td>${esc(empName(e))}</td><td>${coTag(x.companyId)}</td><td>${esc(x.purpose)}${fileChips("ExpenseClaim", x.id)}<div class="hint">${esc(l?.merchant || "")}${l?.hasReceipt ? " · receipt ✓" : ""}</div></td><td>${dTime(x.submittedAt)}</td>${td(money(x.totalCents), 1)}<td>${badge(x.status)}</td><td class="r">${x.status === "APPROVED" && can(A, "expenses.reimburse") ? `<button class="btn sm pri" data-a="reimburse" data-id="${x.id}">Pay back</button>` : ""}</td></tr>`; }), "No claims."));
}
function vAssets() {
  const list = inScope(S.fixedAssets);
  const monthsHeld = (a) => { const p = D(a.purchaseDate), n = D(todayStr()); return Math.max(0, (n.getUTCFullYear() - p.getUTCFullYear()) * 12 + n.getUTCMonth() - p.getUTCMonth()); };
  return ph("Fixed Assets", "Straight-line depreciation, computed from cost, residual value and useful life.")
    + cardFlush("", table(["Asset", "Company", "Category", "Bought", ">Cost", ">Monthly dep.", ">Book value", "Status"], list.map((a) => { const m = Math.round((a.costCents - a.residualCents) / a.usefulLifeMonths); const held = Math.min(monthsHeld(a), a.usefulLifeMonths); return `<tr><td class="mono">${esc(a.assetNumber)}<div style="font-family:var(--font)"><strong>${esc(a.description)}</strong></div></td><td>${coTag(a.companyId)}</td><td>${esc(a.category)}</td><td>${dLong(a.purchaseDate)}</td>${td(money(a.costCents), 1)}${td(money(m), 1)}${td(money(a.costCents - m * held), 1)}<td>${badge(a.status)}</td></tr>`; })));
}
function vBudgets() {
  const b = inScope(S.budgets)[0];
  if (!b) return ph("Budgets") + card("", empty("No budget in scope", "Taan Forest has the 2026 operating budget."));
  const { acct } = ledgerIdx();
  const lines = S.budgetLines.filter((l) => l.budgetId === b.id);
  const byAcct = new Map();
  for (const l of lines) { const a = acct.get(l.accountId); const r = byAcct.get(a.number) || { a, months: Array(12).fill(0) }; r.months[l.month - 1] += l.amountCents; byAcct.set(a.number, r); }
  const actual = balances([b.companyId], "2026-09-30");
  const m = 9;
  return ph(`${b.name}`, `${co(b.companyId).displayName} · budget vs actual through September`)
    + cardFlush("", table(["Account", ">Budget YTD", ">Actual YTD", ">Variance", ">Full-year budget"], [...byAcct.values()].sort((x, y) => x.a.number.localeCompare(y.a.number)).map(({ a, months }) => { const bud = months.slice(0, m).reduce((s, v) => s + v, 0); const full = months.reduce((s, v) => s + v, 0); const act = actual.find((r) => r.number === a.number); const av = act ? (a.type === "REVENUE" ? -rowTotal(act) : rowTotal(act)) : 0; const varc = a.type === "REVENUE" ? av - bud : bud - av; return `<tr><td><span class="mono">${esc(a.number)}</span> ${esc(a.name)}</td>${td(money(bud), 1)}${td(money(av), 1)}${td(`<span style="color:${varc >= 0 ? "var(--t-green)" : "var(--t-red)"}">${varc >= 0 ? "+" : "−"}${money(Math.abs(varc))}</span>`, 1)}${td(money(full), 1)}</tr>`; })));
}
function vPeriods() {
  const cos = S.companies.filter((c) => inView(S, A, c.id));
  return ph("Accounting Periods", "Close a month to stop postings into it. The ledger refuses any entry dated in a closed period.") + flashHtml()
    + `<div class="grid g2">${cos.map((c) => cardFlush(coTag(c.id), table(["Period", "Dates", "Status", "Closed by", ""], S.fiscalPeriods.filter((p) => p.companyId === c.id).sort((a, b) => a.periodNumber - b.periodNumber).map((p) => `<tr><td class="mono">${p.fiscalYear}-P${String(p.periodNumber).padStart(2, "0")}</td><td>${dShort(p.startDate)} – ${dShort(p.endDate)}</td><td>${badge(p.status)}</td><td>${esc(p.closedByName || "")}</td><td class="r">${can(A, "finance.periods") ? `<button class="btn sm" data-a="period" data-id="${p.id}" data-st="${p.status === "OPEN" ? "CLOSED" : "OPEN"}">${p.status === "OPEN" ? "Close" : "Reopen"}</button>` : ""}</td></tr>`)))).join("")}</div>`;
}
function vInterco() {
  const list = S.interco.filter((t) => canSee(A, t.fromCompanyId) || canSee(A, t.toCompanyId));
  return ph("Inter-company", "Charges between Haico companies post a mirrored entry in each company's books.")
    + cardFlush("", table(["Number", "From", "To", "Type", "Date", ">Amount", "Status"], list.map((t) => `<tr><td class="mono">${esc(t.transactionNumber)}</td><td>${coTag(t.fromCompanyId)}</td><td>${coTag(t.toCompanyId)}</td><td>${esc(t.type.replace(/_/g, " ").toLowerCase())}</td><td>${dLong(t.date)}</td>${td(money(t.amountCents), 1)}<td>${badge(t.status)}</td></tr>`)));
}

/* ---------------- reports ---------------- */
function reportTable(rows, ids, flip) {
  const cols = ids.map((id) => co(id));
  const total = ids.map((id) => rows.reduce((s, r) => s + (flip ? -(r.by.get(id) || 0) : r.by.get(id) || 0), 0));
  return `<div class="tw"><table class="t"><thead><tr><th>Account</th>${cols.map((c) => `<th class="r">${esc(c.displayName)}</th>`).join("")}${ids.length > 1 ? `<th class="r">Group</th>` : ""}</tr></thead><tbody>${rows.map((r) => `<tr><td><span class="mono">${esc(r.number)}</span> ${esc(r.name)}</td>${ids.map((id) => td(amount(flip ? -(r.by.get(id) || 0) : r.by.get(id) || 0), 1)).join("")}${ids.length > 1 ? td(`<strong>${amount(flip ? -rowTotal(r) : rowTotal(r))}</strong>`, 1) : ""}</tr>`).join("")}<tr class="tot"><td>Total</td>${total.map((t) => td(amount(t), 1)).join("")}${ids.length > 1 ? td(amount(total.reduce((s, v) => s + v, 0)), 1) : ""}</tr></tbody></table></div>`;
}
function vReports() {
  const items = [["/reports/income-statement", "Profit & Loss", "Money in and money out, every company side by side."], ["/reports/balance-sheet", "Balance Sheet", "What we own, what we owe, and what's left."], ["/reports/trial-balance", "Trial Balance", "Every account's balance — debits equal credits."], ["/reports/headcount", "Headcount", "People by company, department and type."]];
  return ph("Reports", `Built live from every posted ledger entry · ${scopeName()}`) + `<div class="grid g2">${items.map(([go, t, d]) => `<button class="cocard" data-go="${go}"><b>${esc(t)}</b><small>${esc(d)}</small></button>`).join("")}</div>`;
}
function vPL() {
  const ids = scopeIds(S, A); const rows = balances(ids);
  const rev = rows.filter((r) => r.type === "REVENUE"), exp = rows.filter((r) => r.type === "EXPENSE");
  const tr = rev.reduce((s, r) => s - rowTotal(r), 0), te = exp.reduce((s, r) => s + rowTotal(r), 0);
  return `<div class="crumb">${crumb("/reports", "Reports")}</div>` + ph("Profit & Loss · 2026 to date", "Each company side by side, plus the whole group added together.")
    + `<div class="sect-l" style="margin-top:0">Money in</div>` + cardFlush("", reportTable(rev, ids, true)) + `<div class="sect-l">Money out</div>` + cardFlush("", reportTable(exp, ids, false))
    + `<div class="bigsum"><div><div style="font-size:11px;letter-spacing:.08em;opacity:.8">${tr - te >= 0 ? "PROFIT SO FAR" : "LOSS SO FAR"} · ${A.activeCompanyId ? esc(co(A.activeCompanyId).displayName.toUpperCase()) : "WHOLE GROUP"}</div><b>${money(Math.abs(tr - te))}</b></div><div style="font-size:12.5px;opacity:.9">${money(tr)} in − ${money(te)} out</div></div>`;
}
function vBS() {
  const ids = scopeIds(S, A); const rows = balances(ids);
  const assets = rows.filter((r) => r.type === "ASSET"), liab = rows.filter((r) => r.type === "LIABILITY"), eq = rows.filter((r) => r.type === "EQUITY");
  const ta = assets.reduce((s, r) => s + rowTotal(r), 0), tl = liab.reduce((s, r) => s - rowTotal(r), 0), teq = eq.reduce((s, r) => s - rowTotal(r), 0);
  const earn = rows.filter((r) => r.type === "REVENUE" || r.type === "EXPENSE").reduce((s, r) => s - rowTotal(r), 0);
  return `<div class="crumb">${crumb("/reports", "Reports")}</div>` + ph("Balance Sheet", `As of ${dLong(todayStr())} · assets = liabilities + equity`)
    + `<div class="sect-l" style="margin-top:0">What we own</div>` + cardFlush("", reportTable(assets, ids, false)) + `<div class="sect-l">What we owe</div>` + cardFlush("", reportTable(liab, ids, true)) + `<div class="sect-l">Equity</div>` + cardFlush("", reportTable(eq, ids, true))
    + `<div class="bigsum"><div><div style="font-size:11px;letter-spacing:.08em;opacity:.8">TOTAL ASSETS</div><b>${money(ta)}</b></div><div style="font-size:12.5px;opacity:.9">Liabilities ${money(tl)} + equity ${money(teq)} + earnings this year ${money(earn)} = ${money(tl + teq + earn)} ${Math.abs(ta - (tl + teq + earn)) < 1 ? "✓ balanced" : ""}</div></div>`;
}
function vTB() {
  const ids = scopeIds(S, A); const rows = balances(ids);
  const dr = rows.reduce((s, r) => s + Math.max(0, rowTotal(r)), 0), cr = rows.reduce((s, r) => s + Math.max(0, -rowTotal(r)), 0);
  return `<div class="crumb">${crumb("/reports", "Reports")}</div>` + ph("Trial Balance", `${scopeName()} · every account, debits equal credits`)
    + cardFlush("", table(["Account", "Type", ">Debit", ">Credit"], rows.map((r) => { const t = rowTotal(r); return `<tr><td><span class="mono">${esc(r.number)}</span> ${esc(r.name)}</td><td class="hint">${esc(r.type)}</td>${td(t > 0 ? amount(t) : "", 1)}${td(t < 0 ? amount(-t) : "", 1)}</tr>`; }).concat([`<tr class="tot"><td colspan="2">Totals${dr === cr ? " — balanced ✓" : ""}</td>${td(amount(dr), 1)}${td(amount(cr), 1)}</tr>`])));
}
function vHeadcount() {
  const emps = inScope(S.employees).filter((e) => ["ACTIVE", "ON_LEAVE", "ONBOARDING"].includes(e.status));
  const byCo = S.companies.filter((c) => inView(S, A, c.id)).map((c) => ({ c, list: emps.filter((e) => e.companyId === c.id) }));
  return `<div class="crumb">${crumb("/reports", "Reports")}</div>` + ph("Headcount", `${emps.length} active people · ${scopeName()}`)
    + `<div class="grid g2">${byCo.map(({ c, list }) => cardFlush(`${coTag(c.id)} <span class="hint">${list.length}</span>`, table(["Department", ">People", "Full-time", "Hourly"], S.departments.filter((d) => d.companyId === c.id).map((d) => { const l = list.filter((e) => e.departmentId === d.id); return `<tr><td>${esc(d.name)}</td>${td(l.length, 1)}<td>${l.filter((e) => e.employmentType === "FULL_TIME").length}</td><td>${l.filter((e) => S.compensations.find((x) => x.employeeId === e.id)?.payType === "HOURLY").length}</td></tr>`; })))).join("")}</div>`;
}

/* ==========================================================================
   views-requests.js — request centre (all employees), request forms,
   detail pages, the HR/Finance list, and the email outbox
   ========================================================================== */
const PENDING_STATES = new Set(["PENDING_APPROVAL", "SUBMITTED", "OPEN"]);

function waitingOn(inst) {
  if (!inst || inst.status !== "PENDING") return null;
  const step = activeSteps(S, inst).find((s) => s.sequence === inst.currentStep);
  return step ? `${step.name} · ${whoIsNext(S, inst)}` : null;
}
const instOf = (x) => (x?.approvalInstanceId ? byId(S.approvals, x.approvalInstanceId) : null);

/** everything an employee has asked for, newest first */
function statusRows(empId) {
  const rows = [];
  for (const r of S.leaveRequests.filter((x) => x.employeeId === empId)) {
    const lt = byId(S.leaveTypes, r.leaveTypeId);
    rows.push({ kind: "Time off", number: lt?.name || "Leave", title: `${dLong(r.startDate)}${r.endDate !== r.startDate ? " → " + dLong(r.endDate) : ""} · ${hrs(r.totalHours)} h`, amount: null, status: r.status, at: r.createdAt || r.startDate, waiting: r.status === "PENDING_APPROVAL" ? waitingOn(instOf(r)) : null, decided: r.decidedByName, withdraw: r.status === "PENDING_APPROVAL" ? { kind: "leave", id: r.id } : null, ent: ["LeaveRequest", r.id] });
  }
  for (const x of S.expenseClaims.filter((c) => c.employeeId === empId)) rows.push({ kind: "Expense claim", number: x.claimNumber, title: x.purpose, amount: x.totalCents, status: x.status, at: x.submittedAt, waiting: x.status === "PENDING_APPROVAL" ? waitingOn(instOf(x)) : null, decided: null, href: "/me/expenses", ent: ["ExpenseClaim", x.id] });
  for (const p of S.purchaseRequests.filter((c) => c.employeeId === empId)) rows.push({ kind: "Purchase request", number: p.requestNumber, title: p.description, amount: p.amountCents, status: p.status, at: p.createdAt, waiting: p.status === "PENDING_APPROVAL" ? waitingOn(instOf(p)) : null, decided: null, withdraw: p.status === "PENDING_APPROVAL" ? { kind: "purchase", id: p.id } : null, ent: ["PurchaseRequest", p.id] });
  for (const q of S.requests.filter((c) => c.employeeId === empId)) rows.push({ kind: requestTypeLabel(q.type), number: q.requestNumber, title: q.title, amount: q.amountCents, status: q.status, at: q.createdAt, waiting: q.status === "PENDING_APPROVAL" ? waitingOn(instOf(q)) : null, decided: q.status === "PAID" ? q.paidByName : q.decidedByName, href: `/me/requests/${q.id}`, withdraw: q.status === "PENDING_APPROVAL" ? { kind: "request", id: q.id } : null, ent: ["EmployeeRequest", q.id] });
  return rows.sort((a, b) => (a.at < b.at ? 1 : -1));
}

function statusTable(rows, opts = {}) {
  if (!rows.length) return empty("Nothing here yet", "Pick a request type above and it shows up with its status.");
  return `<div class="tw"><table class="t"><thead><tr><th>Type</th>${opts.who ? "<th>Who</th>" : ""}<th>Request</th><th class="r">Amount</th><th>Status</th><th>Waiting on / decided by</th><th>Sent</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td><strong>${esc(r.kind)}</strong></td>${opts.who ? `<td>${esc(r.who)}<div class="hint">${esc(r.company)}</div></td>` : ""}<td>${r.href ? `<button class="lnk" data-go="${esc(r.href)}">${esc(r.title)}</button>` : `<span style="font-weight:500">${esc(r.title)}</span>`}<div class="hint mono">${esc(r.number)}</div>${r.ent ? fileChips(r.ent[0], r.ent[1]) : ""}</td>${td(r.amount != null ? money(r.amount) : "—", 1)}<td>${badge(r.status)}</td><td style="font-size:12px">${r.waiting ? `<span style="color:var(--t-amber)">${esc(r.waiting)}</span>` : r.decided ? esc(r.decided) : `<span class="muted">—</span>`}</td><td style="white-space:nowrap;font-size:12px" class="muted">${esc(dTime(r.at))}</td><td class="r">${r.withdraw ? `<button class="btn sm" data-a="withdrawReq" data-kind="${r.withdraw.kind}" data-id="${r.withdraw.id}">Withdraw</button>` : r.payable ? `<button class="btn sm pri" data-a="payClaim" data-id="${r.id}">Pay back</button>` : r.payExpense ? `<button class="btn sm pri" data-a="reimburse" data-id="${r.id}">Pay back</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}

const TILES = [
  ["/me/requests/new/travel-request", "✈️", "Travel request", "Before a trip: where, why, dates, estimate"],
  ["/me/requests/new/credit-card-purchase", "💳", "Credit card purchase", "Put a purchase on a company card"],
  ["/me/requests/new/purchase", "🛒", "Purchase request", "Ask to buy something for work"],
  ["/me/expenses", "🧾", "Expense claim", "Get paid back for something you bought"],
  ["/me/requests/new/travel-claim", "🧭", "Travel claim", "After a trip: per diems, mileage, receipts"],
];

function vMyRequests(q) {
  const e = A.employee;
  if (!e) return ph("My Requests & Expenses") + card("", empty("This account isn't linked to an employee"));
  const mgr = e.managerId ? empName(byId(S.employees, e.managerId)) : "your approver";
  return ph("My Requests & Expenses", `Travel, purchases, expenses and time off — one place to ask, one place to see where everything stands. Your requests go to ${mgr} first.`) + flashHtml()
    + requestCentre(e);
}

/** stat tiles + one tile per request type + status of everything — on My Requests and the Dashboard */
function requestCentre(e) {
  const rows = statusRows(e.id);
  const filter = UI.tabs.req || "";
  const shown = filter === "waiting" ? rows.filter((r) => PENDING_STATES.has(r.status)) : filter === "done" ? rows.filter((r) => !PENDING_STATES.has(r.status)) : rows;
  const pending = rows.filter((r) => PENDING_STATES.has(r.status));
  return `<div class="stats">${stat("Waiting for a decision", String(pending.length), `${money(pending.reduce((s, r) => s + (r.amount || 0), 0))} in requests still open`, pending.length ? "warn" : "")}${stat("Approved", String(rows.filter((r) => r.status === "APPROVED").length), "Ready to act on", "good")}${stat("Everything you've asked for", String(rows.length), "All types, newest first")}</div>`
    + `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px">${TILES.map(([href, em, t, h]) => `<button class="cocard" data-go="${href}" style="gap:3px"><span style="font-size:20px" aria-hidden>${em}</span><b style="font-size:13px">${esc(t)}</b><small style="font-size:11px;line-height:1.3">${esc(h)}</small></button>`).join("")}</div>`
    + cardFlush(`Status of everything`, statusTable(shown), tabs("req", [["", "All", rows.length], ["waiting", "Waiting", pending.length], ["done", "Decided", rows.length - pending.length]], filter).replace('class="tabs"', 'class="tabs" style="border:0;margin:0"'));
}

/* ---------------- forms ---------------- */
const F = (id, title, inner, hint = "", span = false) => `<div class="fld"${span ? ' style="grid-column:1/-1"' : ""}><label for="${id}">${esc(title)}</label>${inner}${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</div>`;
const inp = (id, name, extra = "") => `<input class="in" id="${id}" name="${name}" ${extra}>`;
const moneyIn = (id, name) => `<input class="in num" style="text-align:right" inputmode="decimal" placeholder="0.00" id="${id}" name="${name}">`;
const chainNote = (steps) => `<span class="hint">Approval path: ${esc(steps)}. You and ${esc(A.employee?.managerId ? empName(byId(S.employees, A.employee.managerId)) : "your manager")} both get an email at every step.</span>`;

function vNewRequest(q, type) {
  const e = A.employee;
  if (!e) return ph("New request") + card("", empty("This account isn't linked to an employee"));
  const back = `<div class="crumb">${crumb("/me/requests", "My Requests & Claims")}</div>`;
  const today = todayStr();
  const projects = S.projects.filter((p) => p.companyId === e.companyId && p.status === "ACTIVE");
  if (type === "travel-request") {
    const m = REQUEST_TYPES.TRAVEL_REQUEST;
    return back + ph(m.label, `${m.help} ${approvalSentence(m.workflow)}`) + flashHtml() + card("", `<form data-f="travelRequest" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${F("tDest", "Where to?", inp("tDest", "destination", 'required placeholder="e.g. Vancouver — CHN finance meeting"'), "", true)}
      ${F("tPur", "Purpose of the trip", inp("tPur", "purpose", 'required placeholder="e.g. Year-end audit planning with the auditors"'), "", true)}
      ${F("tStart", "Leaving", inp("tStart", "startDate", `type="date" required value="${today}"`))}${F("tEnd", "Returning", inp("tEnd", "endDate", 'type="date"'))}
      ${F("tMode", "How are you travelling?", `<select class="in" id="tMode" name="mode">${["Air", "Ferry + own vehicle", "Ferry + company vehicle", "Own vehicle", "Company vehicle", "Other"].map((o) => opt(o, o)).join("")}</select>`)}
      ${F("tAdv", "Cash advance requested (optional)", moneyIn("tAdv", "advance"))}
      <div style="grid-column:1/-1;border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--bg)"><div class="sect-l" style="margin:0 0 8px">Estimated cost</div><div class="form-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${F("tAir", "Airfare / ferry", moneyIn("tAir", "airfare"))}${F("tAcc", "Accommodation", moneyIn("tAcc", "accommodation"))}${F("tGrd", "Ground transport", moneyIn("tGrd", "groundTransport"))}${F("tOth", "Other", moneyIn("tOth", "other"))}</div><div class="hint" style="margin-top:6px">Per diem is added automatically: ${money(TRAVEL_RATES.perDiemCents)} per day away.</div></div>
      ${F("tNotes", "Anything else the approver should know?", `<textarea class="in" id="tNotes" name="notes"></textarea>`, "", true)}
      ${fileDrop("travelRequest", "Attachments", "Agenda, invitation, quotes — PDF, JPG or PNG")}
      <div class="form-row" style="grid-column:1/-1;justify-content:space-between">${chainNote(approvalChain("TRAVEL_REQUEST", empName(byId(S.employees, e.managerId)) || "Your manager"))}<button class="btn pri">Send travel request</button></div></form>`);
  }
  if (type === "credit-card-purchase") {
    const m = REQUEST_TYPES.CREDIT_CARD_PURCHASE;
    return back + ph(m.label, `${m.help} ${approvalSentence(m.workflow)}`) + flashHtml() + card("", `<form data-f="cardRequest" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${F("cVen", "Buying from", inp("cVen", "vendor", 'required placeholder="e.g. Amazon Business"'))}${F("cAmt", "Amount (incl. tax)", moneyIn("cAmt", "amount"))}
      ${F("cDesc", "What are you buying?", inp("cDesc", "description", 'required placeholder="e.g. 2 × safety headsets for the crew"'), "", true)}
      ${F("cCat", "What is it for?", `<select class="in" id="cCat" name="category">${[["SUPPLIES", "Supplies & materials"], ["SAFETY", "Safety gear"], ["TRAVEL", "Travel"], ["MEALS", "Meals & hosting"], ["SOFTWARE", "Software / subscriptions"], ["OTHER", "Other"]].map(([v, l]) => opt(v, l)).join("")}</select>`)}
      ${F("cCard", "Which card?", `<select class="in" id="cCard" name="cardholder">${["Department card", "My manager's card", "Finance card (one-time)"].map((o) => opt(o, o)).join("")}</select>`)}
      ${F("cBy", "Needed by", inp("cBy", "neededBy", 'type="date"'))}
      ${F("cPrj", "Project (optional)", `<select class="in" id="cPrj" name="projectCode">${opt("", "— none —")}${projects.map((p) => opt(p.code, `${p.code} — ${p.name}`)).join("")}</select>`)}
      ${F("cJust", "Why is it needed?", `<textarea class="in" id="cJust" name="justification"></textarea>`, "", true)}
      ${fileDrop("cardRequest", "Attachments", "Quote, cart screenshot, invoice — PDF, JPG or PNG")}
      <div class="form-row" style="grid-column:1/-1;justify-content:space-between">${chainNote(approvalChain("CREDIT_CARD_PURCHASE", empName(byId(S.employees, e.managerId)) || "Your manager"))}<button class="btn pri">Send purchase request</button></div></form>`);
  }
  if (type === "purchase") {
    return back + ph("Purchase / PO request", `Ask to buy goods or services through a purchase order. ${approvalSentence("PURCHASE_REQUEST")} Approved requests become POs in Buying.`) + flashHtml() + card("", `<form data-f="poRequest" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${F("pDesc", "What do you need?", inp("pDesc", "description", 'required placeholder="e.g. Replacement chainsaw chains × 12"'), "", true)}
      ${F("pAmt", "Estimated cost", moneyIn("pAmt", "amount"))}${F("pBy", "Needed by", inp("pBy", "neededBy", 'type="date"'))}
      ${F("pVen", "Preferred supplier (optional)", inp("pVen", "vendorName", ""), "", true)}
      ${F("pJust", "Why is it needed?", `<textarea class="in" id="pJust" name="justification"></textarea>`, "", true)}
      ${fileDrop("poRequest", "Attachments", "Quotes, spec sheets — PDF, JPG or PNG")}
      <div class="form-row" style="grid-column:1/-1;justify-content:space-between">${chainNote(approvalChain("PURCHASE_REQUEST", empName(byId(S.employees, e.managerId)) || "Your manager"))}<button class="btn pri">Send purchase request</button></div></form>`);
  }
  if (type === "travel-claim") {
    const m = REQUEST_TYPES.TRAVEL_CLAIM;
    const trips = S.requests.filter((r) => r.employeeId === e.id && r.type === "TRAVEL_REQUEST" && r.status === "APPROVED");
    return back + ph(m.label, `${m.help} ${approvalSentence(m.workflow)}`) + flashHtml() + card("", `<form data-f="travelClaim" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${F("kTrip", "Which trip?", inp("kTrip", "trip", 'required placeholder="e.g. Vancouver — CHN finance meeting"'), "", true)}
      ${F("kRel", "Approved travel request (optional)", `<select class="in" id="kRel" name="relatedRequest">${opt("", "— none / not required —")}${trips.map((t) => opt(t.requestNumber, `${t.requestNumber} · ${t.title}`)).join("")}</select>`, "", true)}
      ${F("kStart", "Left on", inp("kStart", "startDate", 'type="date" required'))}${F("kEnd", "Returned on", inp("kEnd", "endDate", 'type="date"'))}
      <div style="grid-column:1/-1;border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--bg)"><div class="sect-l" style="margin:0 0 8px">What you're claiming</div><div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${F("kDays", `Per diem days × ${money(TRAVEL_RATES.perDiemCents)}`, `<input class="in num" style="text-align:right" inputmode="numeric" placeholder="0" id="kDays" name="perDiemDays">`)}${F("kKm", `Kilometres × $${(TRAVEL_RATES.mileageCentsPerKm / 100).toFixed(2)}`, `<input class="in num" style="text-align:right" inputmode="decimal" placeholder="0" id="kKm" name="km">`)}${F("kAir", "Airfare / ferry (receipt)", moneyIn("kAir", "airfare"))}${F("kAcc", "Accommodation (receipt)", moneyIn("kAcc", "accommodation"))}${F("kOth", "Other (receipt)", moneyIn("kOth", "other"))}</div></div>
      ${F("kNotes", "Notes (optional)", `<textarea class="in" id="kNotes" name="notes"></textarea>`, "", true)}
      ${fileDrop("travelClaim", "Receipts", "Receipts, boarding passes, hotel folio — PDF, JPG or PNG")}
      <div class="form-row" style="grid-column:1/-1;justify-content:space-between">${chainNote(`${approvalChain("TRAVEL_CLAIM", empName(byId(S.employees, e.managerId)) || "Your manager")} → paid back by Finance`)}<button class="btn pri">Send travel claim</button></div></form>`);
  }
  if (type === "time-off") return vMyTimeOff(q);
  return vNotFound();
}

/* ---------------- My Time Off (request-centre style) ---------------- */
function timeOffForm(e) {
  const bal = leaveBalances(e.id).filter((b) => b.has || b.lt.code === "OTHER").filter((b) => b.lt.code !== "BANKED_OT"); // banked overtime is used on the timesheet, never requested
  const mgr = e.managerId ? byId(S.employees, e.managerId) : null;
  return `<form data-f="leave" class="to-form" style="display:grid;gap:14px">
      ${F("lvType", "Type", `<select class="in" id="lvType" name="leaveTypeId" data-lv="1">${bal.map((b) => `<option value="${b.lt.id}" data-have="${b.ent - b.used}" data-pend="${b.pending}" data-free="${b.lt.code === "OTHER" ? 1 : 0}">${esc(b.lt.name)}</option>`).join("")}</select>`)}
      ${F("lvHours", "Hours", `<input class="in num" style="text-align:right" inputmode="decimal" id="lvHours" name="hours" data-lv="1" placeholder="Pick your days" required>`)}
      ${F("lvStart", "First day", inp("lvStart", "start", 'type="date" required data-lv="1"'))}
      ${F("lvEnd", "Last day", inp("lvEnd", "end", 'type="date" data-lv="1"'))}
      <div class="fld"><label for="lvNotes">Description <span class="muted" style="font-weight:400">— optional, shows on the request</span></label>${inp("lvNotes", "notes", 'placeholder="Family trip"')}</div>
      ${fileDrop("leave", "Attachment", "e.g. a doctor's note or booking — PDF, JPG or PNG")}
      <div id="lvBox" class="lv-box" data-std="${settingsFor(S, e.companyId).standardHoursPerDay ?? 8}"></div>
      <div><button class="btn pri" id="lvSend" style="height:44px;padding:0 28px;border-radius:999px;font-size:14.5px">Send to ${esc(mgr ? mgr.firstName : "your manager")}</button></div></form>`;
}
function vMyTimeOff() {
  const e = A.employee;
  if (!e) return ph("My Time Off") + card("", empty("This account isn't linked to an employee"));
  const mgr = e.managerId ? empName(byId(S.employees, e.managerId)) : "your approver";
  const today = todayStr();
  const show = UI.tabs.to || "upcoming";
  const all = S.leaveRequests.filter((r) => r.employeeId === e.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  let shown = all.filter((r) => show === "waiting" ? r.status === "PENDING_APPROVAL" : show === "past" ? r.endDate < today : show === "all" ? true : r.endDate >= today && !["CANCELLED", "REJECTED"].includes(r.status));
  if (show === "upcoming") shown = shown.reverse();
  const bal = leaveBalances(e.id).filter((b) => b.has || b.lt.code === "BANKED_OT");
  const cards = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:16px">${bal.map((b) => { const pct = b.ent > 0 ? Math.min(100, ((b.used + b.pending) / b.ent) * 100) : 0; const col = esc(b.lt.color || "#17566b");
    return `<div class="card" style="padding:14px 16px"><div class="row" style="gap:7px;font-size:12px;font-weight:600;color:var(--muted-fg)"><span class="sq" style="width:10px;height:10px;background:${col}"></span>${esc(b.lt.name)}</div><div class="num" style="font-size:24px;font-weight:700;margin-top:4px">${hrs(b.ent - b.used)} <span style="font-size:13px;color:var(--muted-fg);font-weight:600">hours</span></div><div style="height:6px;border-radius:9px;background:var(--bg);overflow:hidden;margin-top:8px"><i style="display:block;height:100%;width:${pct}%;background:${col}"></i></div><div class="hint" style="margin-top:6px">Entitlement ${hrs(b.ent)} h · used ${hrs(b.used)} h · pending ${hrs(b.pending)} h · <strong style="color:var(--fg)">${hrs(b.ent - b.used - b.pending)} h remaining</strong>${b.lt.code === "BANKED_OT" ? `<br>No request needed — use it on ${goLink("/me/time", "your timesheet")}.` : ""}</div></div>`; }).join("")}</div>`;
  const list = shown.length ? shown.map((r) => { const lt = byId(S.leaveTypes, r.leaveTypeId);
    const who = r.status === "PENDING_APPROVAL" ? `Waiting on ${esc(waitingOn(instOf(r)) || mgr)} · sent ${esc(dTime(r.createdAt || r.startDate))}` : r.decidedByName ? `${r.status === "APPROVED" ? "Approved" : r.status === "REJECTED" ? "Declined" : "Decided"} by ${esc(r.decidedByName)}${r.decidedAt ? " · " + esc(dTime(r.decidedAt)) : ""}` : `Sent ${esc(dTime(r.createdAt || r.startDate))}`;
    return `<div class="row" style="gap:12px;border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:var(--bg);margin-bottom:8px;flex-wrap:wrap"><span style="width:6px;height:38px;border-radius:9px;background:${esc(lt?.color || "#17566b")};flex:none"></span><div class="grow" style="min-width:0"><div style="font-weight:600;font-size:13.5px">${esc(dLong(r.startDate))}${r.endDate !== r.startDate ? " → " + esc(dLong(r.endDate)) : ""}</div><div class="hint">${esc(lt?.name || "Leave")} · ${hrs(r.totalHours)} h${r.notes ? ` · “${esc(r.notes)}”` : ""}</div><div class="hint">${who}</div>${fileChips("LeaveRequest", r.id)}</div>${badge(r.status)}${r.status === "PENDING_APPROVAL" ? `<button class="btn sm" data-a="withdraw" data-id="${r.id}">Withdraw</button>` : ""}</div>`; }).join("")
    : `<p class="muted" style="text-align:center;padding:26px 0;margin:0">Nothing here — requests you send show up with their status.</p>`;
  const hols = S.statHolidays.filter((h) => h.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 4);
  const tabsHtml = tabs("to", [["upcoming", "Upcoming"], ["waiting", "Waiting", all.filter((r) => r.status === "PENDING_APPROVAL").length], ["past", "Past"], ["all", "All", all.length]], show).replace('class="tabs"', 'class="tabs" style="border:0;margin:0"');
  return ph("My Time Off", `See what you have, ask for time off, and follow every request. Requests go to ${mgr}; once approved the hours fill into your timesheet.`) + flashHtml() + cards
    + `<div class="grid" style="grid-template-columns:minmax(0,420px) minmax(0,1fr);align-items:start" id="toGrid">${card("Request time off", timeOffForm(e))}<div class="grid">${card("My requests", list, tabsHtml)}${hols.length ? card("Coming stat holidays", hols.map((h) => `<div class="row" style="justify-content:space-between;font-size:13px;padding:3px 0"><span>${esc(h.name)}</span><span class="muted">${esc(dLong(h.date))}</span></div>`).join("") + `<p class="hint" style="margin:8px 0 0">Stat holidays and weekends are never taken from your balance.</p>`) : ""}</div></div>`;
}

/** live hours + balance check on the time-off form */
function leaveCalc(changed) {
  const $ = (id) => document.getElementById(id);
  const box = $("lvBox"), sel = $("lvType"), hIn = $("lvHours"), s = $("lvStart"), en = $("lvEnd"), send = $("lvSend");
  if (!box || !sel) return;
  if (changed && (changed === s || changed === en)) {
    if (s.value && en.value && en.value < s.value) en.value = s.value;
    en.min = s.value || "";
    hIn.dataset.touched = "";
  }
  const std = Number(box.dataset.std) || 8;
  const stats = new Set(S.statHolidays.map((x) => x.date));
  const days = s.value ? eachDate(s.value, en.value || s.value).filter((d) => !isWeekend(d) && !stats.has(d)).length : 0;
  const auto = days * std;
  if (!hIn.dataset.touched) hIn.value = auto ? String(auto) : "";
  hIn.value = hIn.value.replace(/[^0-9.]/g, "");
  const h = Number(hIn.value) || 0;
  const o = sel.selectedOptions[0];
  const name = o ? o.textContent : "";
  const have = Number(o?.dataset.have) || 0, pend = Number(o?.dataset.pend) || 0, unlimited = o?.dataset.free === "1";
  const after = have - pend - h;
  const over = !unlimited && h > have - pend + 0.001;
  const tooMany = days > 0 && h > auto + 0.001;
  const f2 = (n) => n.toFixed(2);
  let msg = unlimited
    ? `No balance is kept for ${esc(name)}${h ? ` — this request is <b>${f2(h)}</b> hours.` : "."}`
    : `You have <b>${f2(have)}</b> hours of ${esc(name)}${pend > 0 ? ` (${f2(pend)} already awaiting approval)` : ""}.${h > 0 ? (over ? ` This request needs <b>${f2(h)}</b> hours — that's <b>${f2(-after)}</b> more than you have free.` : ` After this request: <b>${f2(after)}</b> hours remaining.`) : ""}`;
  if (s.value && days === 0) msg += `<div style="margin-top:4px">Those dates have no working days.</div>`;
  if (tooMany) msg += `<div style="margin-top:4px">That's more than ${f2(auto)} hours (${days} working day${days === 1 ? "" : "s"} × ${std}).</div>`;
  box.innerHTML = msg;
  box.classList.toggle("bad", over || tooMany || (!!s.value && days === 0));
  if (send) send.disabled = !s.value || h <= 0 || over || tooMany || days <= 0;
}

const MONEY_KEYS = new Set(["airfare", "accommodation", "groundTransport", "other", "perDiem", "mileage", "advance", "amountCents"]);
const pretty = (k) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
function vRequestDetail(q, id) {
  const r = byId(S.requests, id);
  if (!r) return ph("Request not found") + card("", empty("This request no longer exists"));
  const mine = r.employeeId === A.employee?.id;
  const reviewer = can(A, "hr.employees.view") || can(A, "finance.view") || can(A, "expenses.view") || can(A, "reports.exec");
  const theirMgr = !!A.employee && byId(S.employees, r.employeeId)?.managerId === A.employee.id;
  if (!mine && !theirMgr && !(reviewer && canSee(A, r.companyId))) return vDenied("hr.employees.view");
  const emp = byId(S.employees, r.employeeId);
  const inst = instOf(r);
  const rows = [];
  for (const [k, v] of Object.entries(r.details || {})) {
    if (v == null || v === "" || v === 0 || ["startDate", "endDate", "rates"].includes(k)) continue;
    if (typeof v === "object") { for (const [k2, v2] of Object.entries(v)) if (v2) rows.push([`${pretty(k)} · ${pretty(k2)}`, money(Number(v2))]); }
    else rows.push([pretty(k), MONEY_KEYS.has(k) ? money(Number(v)) : String(v)]);
  }
  const acts = inst ? S.approvalActions.filter((a) => a.instanceId === inst.id) : [];
  const banner = r.status === "PENDING_APPROVAL" && inst ? `<div class="msg warn">Waiting on: <strong>${esc(waitingOn(inst))}</strong></div>` : r.status === "APPROVED" ? `<div class="msg ok">Approved by ${esc(r.decidedByName)} · ${esc(dTime(r.decidedAt))}${r.type === "TRAVEL_CLAIM" ? " — Finance will pay it back." : ""}</div>` : r.status === "PAID" ? `<div class="msg ok">Paid back by ${esc(r.paidByName)} · ${esc(dTime(r.paidAt))}</div>` : r.status === "REJECTED" ? `<div class="msg err">Not approved by ${esc(r.decidedByName)} · ${esc(dTime(r.decidedAt))}</div>` : "";
  return `<div class="crumb">${crumb(mine ? "/me/requests" : "/hr/requests", mine ? "My Requests & Expenses" : "Requests & Expenses")}</div>` + ph(`${requestTypeLabel(r.type)} ${r.requestNumber}`, `${empName(emp)} · ${co(r.companyId).displayName} · sent ${dTime(r.createdAt)}`, badge(r.status) + (r.type === "TRAVEL_CLAIM" && r.status === "APPROVED" && can(A, "expenses.reimburse") ? `<button class="btn pri" data-a="payClaim" data-id="${r.id}">Pay back ${money(r.amountCents)}</button>` : "")) + flashHtml() + banner
    + `<div class="grid g-main">${card(esc(r.title), `<dl class="kv">${r.startDate ? `<dt>Dates</dt><dd class="mono">${r.startDate}${r.endDate && r.endDate !== r.startDate ? ` → ${r.endDate}` : ""}</dd>` : ""}${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}<dt><strong>Total</strong></dt><dd class="num"><strong>${money(r.amountCents)}</strong></dd></dl>`)}
      ${card("Approval trail", inst ? activeSteps(S, inst).map((s) => { const a = acts.find((x) => x.stepSequence === s.sequence); const cur = inst.status === "PENDING" && inst.currentStep === s.sequence; return `<div class="msg ${a ? (a.action === "APPROVED" ? "ok" : "err") : cur ? "warn" : "info"}" style="margin-bottom:8px"><strong>${s.sequence}. ${esc(s.name)}</strong><div style="font-size:12px">${a ? `${esc(a.approverName)} ${a.action === "APPROVED" ? "approved" : "declined"} · ${esc(dTime(a.actedAt))}${a.comment ? ` — “${esc(a.comment)}”` : ""}` : cur ? "Waiting" : "Not yet"}</div></div>`; }).join("") + `<div class="hint">Requester and each approver received an email at every step (see the Email button in the footer).</div>` : `<div class="hint">Approved automatically — no approval step applied.</div>`)}</div>` + card("Attachments", `${fileChips("EmployeeRequest", r.id) || `<p class="hint" style="margin:0">No files yet.</p>`}<div class="form-grid" style="margin-top:10px">${fileDrop(`more_${r.id}`, "Add files", "PDF, JPG or PNG")}<div class="form-row" style="grid-column:1/-1"><button class="btn sm" data-a="attachMore" data-k="more_${r.id}" data-t="EmployeeRequest" data-id="${r.id}">Attach</button><span class="hint">Everyone on the approval path — and Finance when it's paid — can open these.</span></div></div>`);
}

function vEmployeeRequests() {
  const timeOffOnly = !seesMoneyRequests();
  const rows = [];
  if (!timeOffOnly) {
    for (const r of inScope(S.requests)) { const e = byId(S.employees, r.employeeId); rows.push({ id: r.id, kind: requestTypeLabel(r.type), number: r.requestNumber, who: empName(e), company: co(r.companyId).displayName, title: r.title, amount: r.amountCents, status: r.status, at: r.createdAt, waiting: waitingOn(instOf(r)), decided: r.status === "PAID" ? r.paidByName : r.decidedByName, href: `/me/requests/${r.id}`, payable: r.type === "TRAVEL_CLAIM" && r.status === "APPROVED" && can(A, "expenses.reimburse"), ent: ["EmployeeRequest", r.id] }); }
    for (const p of inScope(S.purchaseRequests)) rows.push({ id: p.id, kind: "Purchase request", number: p.requestNumber, who: p.requestedByName, company: co(p.companyId).displayName, title: p.description, amount: p.amountCents, status: p.status, at: p.createdAt, waiting: waitingOn(instOf(p)), decided: null, ent: ["PurchaseRequest", p.id] });
    for (const x of inScope(S.expenseClaims)) { const l = S.expenseLines.find((y) => y.expenseClaimId === x.id); rows.push({ id: x.id, kind: "Expense claim", number: x.claimNumber, who: empName(byId(S.employees, x.employeeId)), company: co(x.companyId).displayName, title: `${x.purpose}${l ? ` — ${l.merchant}` : ""}`, amount: x.totalCents, status: x.status, at: x.submittedAt || x.createdAt, waiting: x.status === "PENDING_APPROVAL" ? waitingOn(instOf(x)) : null, decided: null, payExpense: x.status === "APPROVED" && can(A, "expenses.reimburse"), ent: ["ExpenseClaim", x.id] }); }
  }
  for (const l of inScope(S.leaveRequests)) rows.push({ id: l.id, kind: "Time off", number: byId(S.leaveTypes, l.leaveTypeId)?.name || "Leave", who: empName(byId(S.employees, l.employeeId)), company: co(l.companyId).displayName, title: `${dLong(l.startDate)}${l.endDate !== l.startDate ? ` → ${dLong(l.endDate)}` : ""} · ${hrs(l.totalHours)} h${l.notes ? ` · “${l.notes}”` : ""}`, amount: null, status: l.status, at: l.createdAt || l.startDate, waiting: l.status === "PENDING_APPROVAL" ? waitingOn(instOf(l)) : null, decided: l.decidedByName, ent: ["LeaveRequest", l.id] });
  rows.sort((a, b) => (a.at < b.at ? 1 : -1));
  const f = UI.tabs.ereq || "";
  const shown = f === "waiting" ? rows.filter((r) => r.status === "PENDING_APPROVAL") : f === "approved" ? rows.filter((r) => r.status === "APPROVED") : f === "done" ? rows.filter((r) => ["PAID", "REIMBURSED", "CONVERTED", "REJECTED", "CANCELLED"].includes(r.status)) : rows;
  const waiting = rows.filter((r) => r.status === "PENDING_APPROVAL"), toPay = rows.filter((r) => r.payable || r.payExpense);
  return ph(timeOffOnly ? "Time off requests" : "Requests & Expenses", timeOffOnly ? "Time off from everyone in scope — where each one sits and the files people attached." : "Time off, travel, card and purchase requests, expense and travel claims from everyone in scope — where each one sits in its approval chain, with the files people attached.") + flashHtml()
    + `<div class="stats">${stat("Waiting for a decision", String(waiting.length), timeOffOnly ? "Time off" : money(waiting.reduce((s, r) => s + (r.amount || 0), 0)) + " requested", waiting.length ? "warn" : "")}${timeOffOnly ? stat("Approved", String(rows.filter((r) => r.status === "APPROVED").length), "Time off", "good") : stat("Claims to pay back", String(toPay.length), money(toPay.reduce((s, r) => s + (r.amount || 0), 0)), toPay.length ? "primary" : "")}${stat("All requests", String(rows.length), "In the companies you can see")}</div>`
    + tabs("ereq", [["", "All", rows.length], ["waiting", "Waiting", waiting.length], ["approved", "Approved", rows.filter((r) => r.status === "APPROVED").length], ["done", "Paid / done", null]], f)
    + cardFlush("", statusTable(shown, { who: true }));
}

/* ---------------- email outbox (footer) ---------------- */
const EMAIL_TONE = { APPROVAL_REQUIRED: "amber", APPROVED: "green", REJECTED: "red", PAYROLL: "blue", TIMESHEET: "teal", SYSTEM: "grey" };
function emailPanel() {
  const inbox = UI.emailInbox || "me";
  const users = [...S.users].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const counts = new Map(); for (const e of S.emails) counts.set(e.userId, (counts.get(e.userId) || 0) + 1);
  const list = S.emails.filter((e) => inbox === "all" ? true : e.userId === (inbox === "me" ? A.user.id : inbox)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 60);
  const title = inbox === "me" ? "Your email notifications" : inbox === "all" ? `Everyone's email · ${S.emails.length}` : `${byId(S.users, inbox)?.displayName}'s inbox`;
  return `<div class="modal" role="dialog" aria-label="Email notifications" style="width:min(760px,calc(100vw - 32px))"><div class="form-row" style="justify-content:space-between"><h3 style="margin:0">${esc(title)}</h3><span class="form-row"><label class="hint" for="emailInbox">Inbox</label><select class="in" id="emailInbox" style="height:32px;max-width:260px" data-a="emailInbox">${opt("me", `Me · ${A.user.displayName} (${counts.get(A.user.id) || 0})`, inbox === "me")}${opt("all", `Everyone (${S.emails.length})`, inbox === "all")}${users.filter((u) => u.id !== A.user.id).map((u) => opt(u.id, `${u.displayName} (${counts.get(u.id) || 0})`, inbox === u.id)).join("")}</select><button class="btn sm" data-a="closeModal">Close</button></span></div><p class="hint" style="margin:6px 0 12px">Every request, every approval waiting on someone, and every decision produces an email to the requester and the approver. This demo keeps them here instead of delivering them — pick any inbox to see what that person received.</p>
    ${list.length ? `<div class="card" style="overflow:hidden">${list.map((e) => `<div style="border-top:1px solid var(--border)"><button class="lnk" style="display:flex;gap:10px;width:100%;padding:10px 14px;align-items:flex-start;color:inherit;font-weight:400" data-a="emailOpen" data-id="${e.id}"><span class="badge tone-${EMAIL_TONE[e.kind] || "grey"}" style="flex:none;font-size:10px">${esc(e.kind.replace(/_/g, " "))}</span><span style="min-width:0;flex:1"><span style="display:block;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.subject.replace(/^\[[^\]]+\]\s*/, ""))}</span><span class="hint" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">To: ${esc(e.toName)} &lt;${esc(e.toEmail)}&gt; · ${esc(ago(e.createdAt))}</span></span><span class="muted">${UI.emailOpen === e.id ? "▴" : "▾"}</span></button>${UI.emailOpen === e.id ? `<pre style="white-space:pre-wrap;margin:0;padding:12px 16px;border-top:1px solid var(--border);background:var(--row-head);font:12.5px/1.6 var(--font)">Subject: ${esc(e.subject)}\n\n${esc(e.bodyText)}</pre>` : ""}</div>`).join("")}</div>` : empty("No emails yet", "Send a request or approve one and it appears here.")}
    <p class="hint" style="margin:12px 0 0">Production delivery: Microsoft 365 or Resend, plugged into src/lib/notify.ts.</p></div>`;
}

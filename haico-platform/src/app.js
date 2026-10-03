/* ==========================================================================
   app.js — live sync (shared event log), actions, and event wiring
   ========================================================================== */
const SYNC = { mode: "connecting", why: "", db: null, events: [], resetAt: null, unsub: null, seenIds: new Set(), booted: false };
const LOCAL_EVENTS_KEY = "haico-live-events-v1";

function eventKey(e) { return `${e.ts}|${e.id}`; }
function rebuild() {
  const prevIdx = S._idx;
  S = freshState();
  const list = SYNC.events.filter((e) => !SYNC.resetAt || e.ts > SYNC.resetAt).sort((a, b) => (eventKey(a) < eventKey(b) ? -1 : 1));
  for (const e of list) {
    try { applyEvent(S, e); } catch (err) { S.rejected.push({ id: e.id, why: err.message }); }
  }
  S._idx = null;
}
function newId() { return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }

async function boot() {
  render();
  let db = null;
  try { db = await window.claude?.use?.("db"); } catch { db = null; }
  if (!db) { startLocal("Shared data isn't available in this view — changes stay in this browser."); return; }
  SYNC.db = db;
  try {
    db.doc("control/state").onSnapshot((snap) => { const d = snap.data(); SYNC.resetAt = d?.resetAt || null; if (SYNC.booted) { rebuild(); if (d?.resetAt && d.resetAt > (SYNC.lastResetSeen || "")) { SYNC.lastResetSeen = d.resetAt; toast("Demo reset", "The company is back to its original demo data.", "live"); } UI.flash = null; safeRender(); } }, () => {});
    SYNC.unsub = db.collection("events").onSnapshot((snap) => {
      let fresh = 0, mine = 0;
      const names = [];
      for (const ch of snap.docChanges()) {
        if (ch.type === "removed") { SYNC.events = SYNC.events.filter((e) => e.id !== ch.doc.id); continue; }
        const d = ch.doc.data();
        if (!d || !d.type || SYNC.seenIds.has(ch.doc.id)) continue;
        SYNC.seenIds.add(ch.doc.id);
        SYNC.events.push({ id: ch.doc.id, ...d });
        if (d.client === CLIENT_ID) mine++; else { fresh++; if (d.actorName && !names.includes(d.actorName)) names.push(d.actorName); }
      }
      SYNC.mode = "live";
      const first = !SYNC.booted;
      SYNC.booted = true;
      if (first || fresh || mine) {
        rebuild();
        if (!first && fresh && A) {
          const lastOther = SYNC.events.filter((e) => e.client !== CLIENT_ID).sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];
          if (lastOther && lastOther.summary) toast(`${lastOther.actorName} · just now`, lastOther.summary, "live");
        }
        if (UI.dirty && !first) { UI.stale = true; const b = document.querySelector(".top .sp"); if (b && !document.querySelector(".stale")) b.insertAdjacentHTML("afterend", `<button class="stale" data-a="refresh">New activity · Refresh</button>`); }
        else safeRender();
      }
    }, (err) => { console.warn("events subscription ended", err); if (!SYNC.booted) startLocal("Couldn't reach the shared data — changes stay in this browser."); });
  } catch (e) { console.warn(e); startLocal("Couldn't reach the shared data — changes stay in this browser."); }
  setTimeout(() => { if (!SYNC.booted) startLocal("Shared data is taking too long — changes stay in this browser for now."); }, 12000);
}
function startLocal(why) {
  if (SYNC.mode === "local") return;
  SYNC.mode = "local"; SYNC.why = why; SYNC.booted = true;
  try { SYNC.events = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]"); } catch { SYNC.events = []; }
  rebuild(); safeRender();
}
const CLIENT_ID = newId();
async function persist(ev) {
  if (SYNC.mode === "live" && SYNC.db) {
    try { await SYNC.db.collection("events").doc(ev.id).set(ev); return true; }
    catch (err) {
      console.warn("write refused", err);
      if (err?.code === "quota_exceeded") toast("Storage is full", "The shared demo can't record more actions until an administrator resets it.", "err");
      else { SYNC.mode = "local"; SYNC.why = "You can view the live data but your changes stay in this browser (view-only access)."; toast("Saved in this browser only", "Your role on this link is view-only, so your changes aren't shared.", "err"); }
    }
  }
  if (SYNC.mode === "local") { try { const list = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]"); list.push(ev); localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(list)); } catch { /* no storage */ } }
  return false;
}

/** Run an action as the signed-in user. Returns true when it applied. */
function act(type, p, okMsg) {
  if (!A) return false;
  const ev = { id: newId(), ts: new Date().toISOString(), actor: A.user.id, actorName: A.user.displayName, client: CLIENT_ID, type, p };
  try {
    applyEvent(S, ev);
  } catch (err) {
    rebuild();
    if (err instanceof ActionError) { UI.flash = { kind: "err", text: err.message }; toast("Not done", err.message, "err"); safeRender(); return false; }
    console.error(err); UI.flash = { kind: "err", text: "Something went wrong applying that." }; safeRender(); return false;
  }
  ev.summary = S.audit.length ? S.audit[S.audit.length - 1].summary : `${A.user.displayName} did ${type}`;
  SYNC.events.push(ev); SYNC.seenIds.add(ev.id);
  S._idx = null;
  if (okMsg) { UI.flash = { kind: "ok", text: okMsg }; toast("Done", okMsg, "ok"); }
  UI.dirty = false;
  safeRender();
  persist(ev);
  return true;
}
function applyTheme() { const r = document.documentElement; if (UI.theme === "dark" || UI.theme === "light") r.setAttribute("data-theme", UI.theme); else r.removeAttribute("data-theme"); r.setAttribute("data-look", ["cedar", "harbour", "navy", "moss", "graphite"].includes(UI.look) ? UI.look : "cedar"); }
function safeRender() { try { render(); } catch (e) { console.error(e); } }
function go(path) { UI.route = path; UI.flash = null; UI.pop = null; UI.sideOpen = false; UI.modal = null; savePrefs(); safeRender(); const c = document.querySelector(".content"); if (c) c.scrollTop = 0; }

/* ---------------- toasts ---------------- */
function toast(title, body, kind = "") {
  let host = document.querySelector(".toasts");
  if (!host) { host = document.createElement("div"); host.className = "toasts"; document.body.appendChild(host); }
  const el = document.createElement("div"); el.className = `toast ${kind}`; el.setAttribute("role", "status");
  el.innerHTML = `<small>${esc(title)}</small>${esc(body)}`;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, kind === "live" ? 6500 : 4500);
}

/* ---------------- routes ---------------- */
route("/me", null, () => { UI.route = "/dashboard"; return vDashboard(); }); route("/me/profile", null, (q) => vProfile(q, "overview")); route("/me/profile/employment", null, (q) => vProfile(q, "employment")); route("/me/profile/time", null, (q) => vProfile(q, "time")); route("/me/profile/documents", null, (q) => vProfile(q, "documents")); route("/me/profile/benefits", null, vBenefits); route("/me/profile/events", null, vEvents);
route("/people/directory", () => !!A.employee || can(A, "hr.employees.view"), vDirectory); route("/people/org-chart", () => !!A.employee || can(A, "hr.employees.view"), vOrgChart);
route("/payroll/timesheet-status", () => can(A, "payroll.view") || can(A, "hr.employees.edit"), vTimesheetStatus); route("/me/time", null, vMyTime); route("/me/requests", null, vMyRequests); route("/me/time-off", null, vMyTimeOff); route("/me/pay", null, vMyPay);
route("/me/pay/:id", null, (q, id) => vStatement(id, "/me/pay")); route("/me/requests/new/:type", null, vNewRequest); route("/me/requests/:id", null, vRequestDetail);
route("/hr/requests", () => can(A, "hr.employees.view") || can(A, "leave.view") || seesMoneyRequests(), vEmployeeRequests); route("/me/expenses", null, vMyExpenses); route("/me/documents", null, vMyDocs);
route("/dashboard", () => !!A.employee || can(A, "reports.view") || can(A, "finance.view") || can(A, "hr.employees.view"), vDashboard);
route("/approvals", null, vApprovals); route("/history", null, vHistory); route("/help", null, vHelp);
route("/hr/employees", "hr.employees.view", vEmployees); route("/hr/employees/new", "hr.employees.create", vNewEmployee); route("/hr/employees/:id", "hr.employees.view", vEmployee);
route("/hr/departments", "hr.org.manage", vDepartments); route("/hr/onboarding", "hr.onboarding.manage", vOnboarding); route("/hr/timesheets", "timesheets.view", vTimesheets); route("/hr/leave", "leave.view", vLeave);
route("/payroll/runs", "payroll.view", vRuns); route("/payroll/runs/:id", "payroll.view", vRun); route("/payroll/statements", "payroll.view", vStatements); route("/payroll/statements/:id", "payroll.view", (q, id) => vStatement(id, "/payroll/statements"));
route("/payroll/yearend", "payroll.view", vYearEnd); route("/payroll/settings", "payroll.view", vPayrollSettings);
route("/finance", "finance.view", vFinance); route("/finance/journals", "finance.view", vJournals); route("/finance/journals/new", "finance.post", vNewJournal); route("/finance/journals/:id", "finance.view", vJournal); route("/finance/accounts", "finance.view", vAccounts);
route("/finance/ap", "ap.view", vAP); route("/finance/ap/batch", "ap.create", vAPBatch); route("/finance/ap/pay", "ap.pay", vPayBatch); route("/finance/ap/batches/:id", "ap.view", vAPBatchDetail); route("/finance/ap/:id", "ap.view", vBill);
route("/finance/ar", "ar.view", vAR); route("/finance/ar/batch", "ar.create", vARBatch); route("/finance/ar/deposit", "ar.receive", vDepositBatch);
route("/finance/banking", "banking.view", vBanking); route("/finance/expenses", "expenses.view", vExpenses); route("/finance/assets", "assets.view", vAssets); route("/finance/budgets", "budgets.view", vBudgets); route("/finance/periods", "finance.periods", vPeriods); route("/finance/interco", "interco.manage", vInterco);
route("/procurement/requests", "procurement.view", vPurchaseRequests); route("/procurement/pos", "procurement.view", vPOs); route("/procurement/receiving", "procurement.view", vReceiving);
route("/projects", "projects.view", vProjects); route("/documents", "documents.view", vDocuments);
route("/reports", () => can(A, "reports.view") || Object.values(REP).some((r) => r.allowed()), vReportsHub); route("/reports/income-statement", "reports.view", vPL); route("/reports/balance-sheet", "reports.view", vBS); route("/reports/trial-balance", "reports.view", vTB); route("/reports/headcount", "reports.view", vHeadcount); route("/reports/:key", null, vReport);
route("/admin/users", "admin.users", vUsers); route("/admin/feedback", "admin.users", vFeedback); route("/admin/companies", "admin.companies", vCompanies); route("/admin/workflows", "admin.workflows", vWorkflows); route("/admin/audit", "audit.view", vAudit); route("/admin/settings", "admin.settings", vSettings);

/* ---------------- sign-in ---------------- */
function signIn(userId) {
  const u = byId(S.users, userId);
  if (!u) return;
  UI.userId = u.id; UI.activeCompanyId = null; UI.chosenCompany = false; UI.loginError = false; UI.flash = null; UI.ts = null; UI.je = null; UI.apb = null; UI.arb = null; UI.payb = null; UI.depb = null; UI.tabs = {}; UI.filters = {};
  const a = authFor(S, u.id);
  A = a; UI.route = homeFor();
  if (!a.multiCompany) UI.chosenCompany = true;
  savePrefs(); safeRender();
}
function signOut() { UI.userId = null; UI.chosenCompany = false; UI.pop = null; UI.modal = null; savePrefs(); safeRender(); }

/* ---------------- forms ---------------- */
const fd = (form) => Object.fromEntries(new FormData(form).entries());
const FORMS = {
  login(f) { const d = fd(f); if (!d.userId) { UI.loginError = true; safeRender(); return; } signIn(d.userId); },
  feedback(f) { const d = fd(f); if (act("feedback.create", { kind: d.kind, text: d.text, page: d.page }, "Thanks — your note went to the administrators.")) UI.pop = null; safeRender(); },
  leave(f) { const d = fd(f); if (act("leave.request", { leaveTypeId: d.leaveTypeId, start: d.start, end: d.end || d.start, hours: d.hours, partialHours: d.partialHours, notes: d.notes, files: takeFiles("leave") }, `Request sent to ${A.employee?.managerId ? empName(byId(S.employees, A.employee.managerId)) : "your approver"}.`)) go("/me/time-off"); },
  expense(f) { const d = fd(f); const file = f.querySelector('input[type=file]')?.files?.[0]; if (act("expense.submit", { merchant: d.merchant, categoryCode: d.categoryCode, amountCents: toCents(d.amount), date: d.date, purpose: d.purpose, receipt: file?.name || UI.files.expense?.[0]?.name, files: takeFiles("expense") }, "Claim sent for approval.")) safeRender(); },
  decide(f, ev) { const dec = ev.submitter?.dataset.dec || "APPROVED"; const d = fd(f); act("approval.decide", { instanceId: f.dataset.id, decision: dec, comment: d.comment }, dec === "APPROVED" ? "Approved — the next person in line (or the requester) has been notified." : "Declined — the requester has been notified."); },
  tsDecide(f, ev) { const dec = ev.submitter?.dataset.dec || "APPROVED"; const d = fd(f); act("timesheet.decide", { timesheetId: f.dataset.id, decision: dec, reason: d.reason }, dec === "APPROVED" ? "Timesheet approved." : "Timesheet sent back."); },
  newRun(f) { const d = fd(f); const before = S.payrollRuns.length; if (act("payroll.create", { payGroupId: d.payGroupId, periodStart: d.periodStart, periodEnd: periodEndFor(d.periodStart), payDate: d.payDate }, "Pay run opened.")) go(`/payroll/runs/${S.payrollRuns[before].id}`); },
  otRules(f) { const d = fd(f); act("payroll.settings", { companyId: f.dataset.co, dailyOt: d.dailyOt, dailyDouble: d.dailyDouble, weeklyOt: d.weeklyOt }, "Overtime rules saved."); },
  bill(f, ev) { const d = fd(f); const submit = ev.submitter?.value === "1"; const before = S.apInvoices.length; if (act("ap.create", { vendorId: d.vendorId, invoiceNumber: d.invoiceNumber, invoiceDate: d.invoiceDate, subtotalCents: toCents(d.subtotal), gst: !!d.gst, description: d.description, submit, attachment: UI.apDraft?.attachment }, submit ? "Bill sent for approval." : "Bill saved as a draft.")) { UI.modal = null; UI.apDraft = null; go(`/finance/ap/${S.apInvoices[before].id}`); } },
  pay(f) { const d = fd(f); if (act("ap.pay", { invoiceId: f.dataset.id, amountCents: toCents(d.amount), date: d.date }, "Payment recorded and posted.")) { UI.modal = null; safeRender(); } },
  invoice(f) { const d = fd(f); if (act("ar.create", { customerId: d.customerId, subtotalCents: toCents(d.subtotal), gst: !!d.gst, invoiceDate: d.invoiceDate, memo: d.memo }, "Invoice sent and posted.")) { UI.modal = null; safeRender(); } },
  receive(f) { const d = fd(f); if (act("ar.receive", { invoiceId: f.dataset.id, amountCents: toCents(d.amount), date: d.date }, "Deposit recorded and posted.")) { UI.modal = null; safeRender(); } },
  apBatch(f, ev) { const submit = ev.submitter?.value === "1"; const rows = UI.apb.rows.map((r) => ({ vendorId: r.vendorId, invoiceNumber: r.invoiceNumber, invoiceDate: r.invoiceDate || UI.apb.date, description: r.description, accountNumber: r.accountNumber, subtotalCents: toCents(r.subtotal), gst: r.gst !== false })); const before = S.apBatches.length; if (act("ap.batchEntry", { rows, submit }, submit ? "Batch created — every bill is now in approval." : "Batch saved as drafts.")) { UI.apb = null; go(`/finance/ap/batches/${S.apBatches[before].id}`); } },
  arBatch(f) { const rows = UI.arb.rows.map((r) => ({ customerId: r.customerId, invoiceDate: r.invoiceDate || UI.arb.date, memo: r.memo, subtotalCents: toCents(r.subtotal), gst: r.gst !== false })); if (act("ar.batchEntry", { rows }, "Invoices issued and posted.")) { UI.arb = null; go("/finance/ar"); } },
  journal(f) { const d = fd(f); const lines = UI.je.lines.map((l) => ({ accountNumber: l.accountNumber, description: l.description, debitCents: toCents(l.debit) || 0, creditCents: toCents(l.credit) || 0 })); const before = S.journalEntries.length; if (act("journal.manual", { companyId: UI.je.companyId, date: d.date, memo: d.memo, lines }, "Entry posted.")) { UI.je = null; go(`/finance/journals/${S.journalEntries[before].id}`); } },
  newEmp(f) { const d = fd(f); const before = S.employees.length; if (act("employee.create", { companyId: d.companyId, firstName: d.firstName, lastName: d.lastName, departmentId: d.departmentId, positionId: d.positionId, managerId: d.managerId, employmentType: d.employmentType, startDate: d.startDate, payType: d.payType, rateCents: toCents(d.rate) }, "Employee added with onboarding tasks.")) go(`/hr/employees/${S.employees[before].id}`); },
  pr(f) { const d = fd(f); if (act("pr.create", { description: d.description, vendorName: d.vendorName, amountCents: toCents(d.amount), neededBy: d.neededBy, companyId: d.companyId }, "Request sent for approval.")) safeRender(); },
  travelRequest(f) { const d = fd(f); if (act("request.create", { type: "TRAVEL_REQUEST", details: { destination: d.destination, purpose: d.purpose, startDate: d.startDate, endDate: d.endDate || d.startDate, mode: d.mode, advance: toCents(d.advance) || 0, airfare: toCents(d.airfare) || 0, accommodation: toCents(d.accommodation) || 0, groundTransport: toCents(d.groundTransport) || 0, other: toCents(d.other) || 0, notes: d.notes }, files: takeFiles("travelRequest") }, `Travel request sent to ${A.employee?.managerId ? empName(byId(S.employees, A.employee.managerId)) : "your approver"}.`)) go("/me/requests"); },
  cardRequest(f) { const d = fd(f); if (act("request.create", { type: "CREDIT_CARD_PURCHASE", details: { vendor: d.vendor, description: d.description, amountCents: toCents(d.amount) || 0, category: d.category, cardholder: d.cardholder, neededBy: d.neededBy, projectCode: d.projectCode, justification: d.justification }, files: takeFiles("cardRequest") }, "Credit card purchase request sent for approval.")) go("/me/requests"); },
  travelClaim(f) { const d = fd(f); if (act("request.create", { type: "TRAVEL_CLAIM", details: { trip: d.trip, relatedRequest: d.relatedRequest, startDate: d.startDate, endDate: d.endDate || d.startDate, perDiemDays: Number(d.perDiemDays) || 0, km: Number(d.km) || 0, airfare: toCents(d.airfare) || 0, accommodation: toCents(d.accommodation) || 0, other: toCents(d.other) || 0, receipts: d.receipts, notes: d.notes }, files: takeFiles("travelClaim") }, "Travel claim sent for approval.")) go("/me/requests"); },
  poRequest(f) { const d = fd(f); if (act("pr.create", { description: d.description, vendorName: d.vendorName, amountCents: toCents(d.amount), neededBy: d.neededBy, justification: d.justification, files: takeFiles("poRequest") }, "Purchase request sent up the chain.")) go("/me/requests"); },
  salary(f) { const d = fd(f); if (act("employee.salary", { employeeId: f.dataset.id, effectiveDate: d.effectiveDate, payType: d.payType, amountCents: toCents(d.amount), payFrequency: d.payFrequency, overtimeEligible: !!d.overtimeEligible, reason: d.reason }, `Pay change saved: ${d.payType === "HOURLY" ? "$" + d.amount + "/h" : "$" + d.amount + "/yr"} from ${d.effectiveDate}.`)) safeRender(); },
  histSearch(f) { const d = fd(f); Object.assign(UI.filters.hist, { q: d.q, who: d.who, from: d.from, to: d.to, limit: 60 }); safeRender(); },
  repFilter(f) { const d = fd(f); UI.filters[`rep_${f.dataset.k}`] = { from: d.from, to: d.to, kind: d.kind, status: d.status, who: d.who }; safeRender(); },
  threshold(f) { const d = fd(f); act("workflow.threshold", { stepId: f.dataset.id, thresholdMinCents: toCents(d.threshold) }, "Threshold saved."); },
};

/* ---------------- click actions ---------------- */
const ACTIONS = {
  switchRole() { signOut(); },
  histSet(el) { const h = UI.filters.hist || (UI.filters.hist = {}); h[el.dataset.k] = el.dataset.v; h.limit = 60; safeRender(); },
  histClear() { Object.assign(UI.filters.hist, { q: "", who: "", from: "", to: "" }); safeRender(); },
  histMore() { UI.filters.hist.limit = (UI.filters.hist.limit || 60) + 100; safeRender(); },
  dlMenu(el) { openDlMenu(el); },
  repReset(el) { UI.filters[`rep_${el.dataset.k}`] = {}; safeRender(); },
  repPreset(el) { UI.filters[`rep_${el.dataset.k}`] = { ...(UI.filters[`rep_${el.dataset.k}`] || {}), from: el.dataset.from, to: el.dataset.to }; safeRender(); },
  helpRole(el) { UI.tabs.help = el.dataset.v; UI.helpTopic = null; safeRender(); },
  helpZoom(el) { const g = HOWTO.flatMap((r) => r[4]).find((x) => x[0] === el.dataset.id); UI.modal = `<h3 style="margin:0 0 10px">${esc(g?.[1] || "")}</h3><img src="${HOWTO_IMG[el.dataset.id]}" alt="" style="width:100%;border-radius:10px;border:1px solid var(--border)"><div class="form-row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-a="closeModal">Close</button></div>`; UI.modalWide = true; safeRender(); },
  fileRemove(el) { (UI.files[el.dataset.k] || []).splice(+el.dataset.i, 1); const h = document.getElementById(`fchips-${el.dataset.k}`); if (h) h.innerHTML = pendingChips(el.dataset.k); },
  openFile(el) { openFile(el.dataset.id); },
  setDept(el) { act("employee.move", { employeeId: el.dataset.id, departmentId: el.value }, `${empName(byId(S.employees, el.dataset.id))} now works in ${byId(S.departments, el.value)?.name}.`); },
  empActive(el) { const on = el.dataset.on === "1"; const e = byId(S.employees, el.dataset.id); act("employee.setActive", { employeeId: el.dataset.id, active: on }, on ? `${empName(e)} is active again and can sign in.` : `${empName(e)} is deactivated — no sign-in, left off the directory and new payroll runs.`); },
  tsPeriod(el) { UI.filters.tsPeriod = el.value; safeRender(); },
  tsRemind(el) { const late = periodStatusRows(S, A, el.dataset.p).filter((r) => ["NOT_STARTED", "DRAFT", "REJECTED"].includes(r.status)).length; act("timesheet.remind", { periodStart: el.dataset.p }, late ? `Reminder sent to ${late} ${late === 1 ? "person" : "people"} (bell + email).` : "Everyone has already sent theirs in."); },
  attachMore(el) { const files = takeFiles(el.dataset.k); if (!files.length) { toast("Nothing to attach", "Drop or choose a file first.", "err"); return; } act("file.attach", { entityType: el.dataset.t, entityId: el.dataset.id, files }, `${files.length} file${files.length === 1 ? "" : "s"} attached.`); },
  signout() { signOut(); },
  demoLogin(el) { signIn(el.dataset.id); },
  pickCo(el) { UI.activeCompanyId = el.dataset.id === "ALL" ? null : el.dataset.id; UI.chosenCompany = true; A = authFor(S, UI.userId, UI.activeCompanyId); UI.route = homeFor(); savePrefs(); safeRender(); },
  openSide() { UI.sideOpen = true; safeRender(); }, closeSide() { UI.sideOpen = false; safeRender(); },
  notifs() { UI.pop = UI.pop === "notifs" ? null : "notifs"; safeRender(); },
  readAll() { const latest = myNotifs()[0]; if (latest) UI.readUpTo[A.user.id] = latest.createdAt; UI.pop = null; savePrefs(); safeRender(); },
  feedback() { UI.pop = UI.pop === "feedback" ? null : "feedback"; safeRender(); setTimeout(() => document.getElementById("fbText")?.focus(), 30); },
  closePop() { UI.pop = null; safeRender(); }, closeModal() { UI.modal = null; UI.modalWide = false; UI.apDraft = null; safeRender(); },
  refresh() { UI.dirty = false; UI.stale = false; UI.ts = null; safeRender(); },
  tab(el) { UI.tabs[el.dataset.k] = el.dataset.v; safeRender(); },
  withdraw(el) { act("leave.withdraw", { requestId: el.dataset.id }, "Request withdrawn."); },
  withdrawReq(el) { if (el.dataset.kind === "leave") act("leave.withdraw", { requestId: el.dataset.id }, "Request withdrawn."); else act("request.withdraw", { kind: el.dataset.kind, id: el.dataset.id }, "Request withdrawn."); },
  payClaim(el) { act("request.pay", { id: el.dataset.id }, "Paid back and posted."); },
  navToggle(el) { UI.navOpen[el.dataset.g] = !UI.navOpen[el.dataset.g]; savePrefs(); safeRender(); },
  emails() { UI.modal = "EMAILS"; UI.emailOpen = null; UI.emailInbox = "me"; safeRender(); },
  emailInbox(el) { UI.emailInbox = el.value; UI.emailOpen = null; safeRender(); },
  theme() { UI.theme = UI.theme === "dark" ? "light" : "dark"; applyTheme(); savePrefs(); safeRender(); },
  emailOpen(el) { UI.emailOpen = UI.emailOpen === el.dataset.id ? null : el.dataset.id; safeRender(); },
  tsAdd(el) { UI.ts.days[+el.dataset.d].rows.push({ dep: A.employee?.departmentId || "", prj: "", worked: 0, banked: 0 }); UI.dirty = true; safeRender(); },
  tsDel(el) { UI.ts.days[+el.dataset.d].rows.splice(+el.dataset.r, 1); UI.dirty = true; safeRender(); },
  tsSave(el) { if (typeof tsTotals === "function") tsTotals(); if (UI.ts?.invalid) { toast("Check your banked hours", "Fix the banked overtime marked in red before saving.", "err"); return; } const submit = el.dataset.submit === "1"; const entries = UI.ts.days.flatMap((d) => d.rows.filter((r) => (Number(r.worked) || 0) > 0 || (Number(r.banked) || 0) > 0).map((r) => ({ date: d.date, departmentId: r.dep || null, projectId: r.prj || null, worked: Number(r.worked) || 0, banked: Number(r.banked) || 0 }))); if (act("timesheet.save", { periodStart: UI.ts.start, submit, entries }, submit ? "Sent to your manager for approval." : "Draft saved.")) { UI.ts = null; safeRender(); } },
  runCalc(el) { act("payroll.calculate", { runId: el.dataset.id }, "Calculated."); },
  runSend(el) { act("payroll.send", { runId: el.dataset.id }, "Sent to the Executive Director for approval."); },
  runPost(el) { act("payroll.post", { runId: el.dataset.id }, "Posted to the ledger. Statements are out."); },
  obToggle(el) { act("onboarding.toggle", { taskId: el.dataset.id }); },
  newEmpCo(el) { UI.filters.newEmpCo = el.value; safeRender(); },
  newBill() { UI.modal = billModal(UI.apDraft); safeRender(); },
  apSubmit(el) { act("ap.submit", { invoiceId: el.dataset.id }, "Sent for approval."); },
  payBill(el) { UI.modal = payModal(byId(S.apInvoices, el.dataset.id)); safeRender(); },
  newInvoice() { UI.modal = invoiceModal(); safeRender(); },
  receive(el) { UI.modal = receiveModal(byId(S.arInvoices, el.dataset.id)); safeRender(); },
  apbAdd() { UI.apb.rows.push({}); UI.dirty = true; safeRender(); }, apbDel(el) { UI.apb.rows.splice(+el.dataset.i, 1); safeRender(); },
  arbAdd() { UI.arb.rows.push({}); UI.dirty = true; safeRender(); }, arbDel(el) { UI.arb.rows.splice(+el.dataset.i, 1); safeRender(); },
  apbSubmit(el) { act("ap.batchSubmit", { batchId: el.dataset.id }, "Every bill in the batch is now in approval."); },
  payCo(el) { UI.filters.payCo = el.value; UI.payb = null; safeRender(); }, payDate(el) { UI.payb.date = el.value; },
  pbAll() { const P = UI.payb; const bills = S.apInvoices.filter((i) => i.companyId === P.cid && ["APPROVED", "PARTIALLY_PAID"].includes(i.status)); const all = bills.every((b) => P.sel[b.id]); bills.forEach((b) => (P.sel[b.id] = !all)); safeRender(); },
  pbPost() { const P = UI.payb; const items = Object.entries(P.sel).filter(([, v]) => v).map(([id]) => ({ invoiceId: id, amountCents: toCents(P.amt[id]) })); const before = S.apBatches.length; if (act("ap.paymentBatch", { companyId: P.cid, date: P.date, items }, "Payment batch posted — one EFT run, one ledger entry.")) { UI.payb = null; go(`/finance/ap/batches/${S.apBatches[before].id}`); } },
  depCo(el) { UI.filters.depCo = el.value; UI.depb = null; safeRender(); }, depDate(el) { UI.depb.date = el.value; }, depAmt(el) { UI.depb.deposit = el.value; safeRenderKeepFocus(el); }, depRef(el) { UI.depb.reference = el.value; },
  dbPost() { const P = UI.depb; const items = Object.entries(P.sel).filter(([, v]) => v).map(([id]) => ({ invoiceId: id, amountCents: toCents(P.amt[id]) })); const dep = toCents(P.deposit); if (act("ar.depositBatch", { companyId: P.cid, date: P.date, items, depositCents: dep || null, reference: P.reference }, "Deposit batch posted — invoices cleared, bank updated.")) { UI.depb = null; go("/finance/ar"); } },
  jeCo(el) { UI.je = null; UI.filters.jeCo = el.value; UI.je = { companyId: el.value, date: todayStr(), memo: "", lines: [{}, {}] }; safeRender(); },
  jeAdd() { UI.je.lines.push({}); safeRender(); }, jeDel(el) { UI.je.lines.splice(+el.dataset.i, 1); safeRender(); },
  bank(el) { UI.filters.bank = el.dataset.id; safeRender(); },
  reimburse(el) { act("expense.reimburse", { claimId: el.dataset.id }, "Paid back and posted."); },
  period(el) { act("period.set", { periodId: el.dataset.id, status: el.dataset.st }, el.dataset.st === "CLOSED" ? "Period closed." : "Period reopened."); },
  makePO(el) { if (act("po.create", { requestId: el.dataset.id }, "Purchase order created.")) go("/procurement/pos"); },
  receivePO(el) { act("po.receive", { poId: el.dataset.id }, "Marked as received."); },
  fbResolve(el) { act("feedback.resolve", { id: el.dataset.id }); },
  company(el) { UI.activeCompanyId = el.value === "ALL" ? null : el.value; A = authFor(S, UI.userId, UI.activeCompanyId); UI.payb = null; UI.depb = null; savePrefs(); safeRender(); },
  async resetAll() { if (!SYNC.db || !A?.isSuper) return; UI.modal = `<h3>Reset the demo for everyone?</h3><p>Every action taken by anyone on this link is discarded and the original demo company comes back. This can't be undone.</p><div class="form-row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">Keep the data</button><button class="btn dng" data-a="resetConfirm">Reset everything</button></div>`; safeRender(); },
  async resetConfirm() { UI.modal = null; try { await SYNC.db.doc("control/state").set({ resetAt: new Date().toISOString(), by: A.user.displayName }); toast("Demo reset", "Back to the original demo company for everyone.", "ok"); } catch (e) { toast("Couldn't reset", e.message || "The reset was refused.", "err"); } },
};
function safeRenderKeepFocus(el) { const id = el.id, pos = el.selectionStart; safeRender(); const n = id && document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* not a text field */ } } }

/* ---------------- wiring ---------------- */
document.addEventListener("click", (ev) => {
  const goEl = ev.target.closest("[data-go]");
  if (goEl) { ev.preventDefault(); if (goEl.dataset.sec) UI.section = goEl.dataset.sec; UI.helpTopic = goEl.dataset.topic || null; if (goEl.dataset.go === "/help" && goEl.dataset.topic) UI.tabs.help = null; go(goEl.dataset.go); if (UI.helpTopic) setTimeout(() => document.getElementById(`g-${UI.helpTopic}`)?.scrollIntoView({ block: "start" }), 60); return; }
  const fz = ev.target.closest("[data-fzone]");
  if (fz) { document.querySelector(`input[data-fdrop="${fz.dataset.fzone}"]`)?.click(); return; }
  const a = ev.target.closest("[data-a]");
  if (a && ACTIONS[a.dataset.a] && !(a.tagName === "SELECT" || a.tagName === "INPUT")) { ev.preventDefault(); ACTIONS[a.dataset.a](a, ev); return; }
  if (UI.pop && !ev.target.closest(".pop, .fb-panel, [data-a=notifs], [data-a=feedback], [data-a=lookMenu]")) { UI.pop = null; safeRender(); }
});
document.addEventListener("change", (ev) => {
  const el = ev.target;
  if (el.dataset.fdrop) { addFiles(el.dataset.fdrop, el.files); el.value = ""; return; }
  if (el.dataset.lv) { leaveCalc(el); return; }
  if (el.dataset.a && ACTIONS[el.dataset.a] && (el.tagName === "SELECT" || el.type === "date" || el.type === "checkbox")) { ACTIONS[el.dataset.a](el, ev); return; }
  if (el.dataset.ts) { const r = UI.ts.days[+el.dataset.d].rows[+el.dataset.r]; r[el.dataset.ts] = el.dataset.ts === "worked" || el.dataset.ts === "banked" ? Math.min(24, Math.max(0, parseFloat(el.value) || 0)) : el.value; UI.dirty = true; if (el.dataset.ts === "worked" || el.dataset.ts === "banked") el.value = r[el.dataset.ts] || ""; tsTotals(); return; }
  if (el.dataset.apb) { const r = UI.apb.rows[+el.dataset.i]; r[el.dataset.apb] = el.type === "checkbox" ? el.checked : el.value; UI.dirty = true; if (el.dataset.apb === "vendorId" || el.dataset.apb === "subtotal" || el.type === "checkbox") safeRenderKeepFocus(el); return; }
  if (el.dataset.arb) { const r = UI.arb.rows[+el.dataset.i]; r[el.dataset.arb] = el.type === "checkbox" ? el.checked : el.value; UI.dirty = true; if (el.dataset.arb === "subtotal" || el.type === "checkbox") safeRenderKeepFocus(el); return; }
  if (el.dataset.pb) { if (el.dataset.pb === "sel") UI.payb.sel[el.dataset.id] = el.checked; else UI.payb.amt[el.dataset.id] = el.value; safeRender(); return; }
  if (el.dataset.db) { if (el.dataset.db === "sel") UI.depb.sel[el.dataset.id] = el.checked; else UI.depb.amt[el.dataset.id] = el.value; safeRender(); return; }
  if (el.dataset.je) { const l = UI.je.lines[+el.dataset.i]; l[el.dataset.je] = el.value; UI.dirty = true; jeTotals(); return; }
});
document.addEventListener("input", (ev) => {
  const el = ev.target;
  if (el.dataset.lv) { if (el.id === "lvHours") el.dataset.touched = "1"; leaveCalc(el); }
  if (el.dataset.je && (el.dataset.je === "debit" || el.dataset.je === "credit")) { UI.je.lines[+el.dataset.i][el.dataset.je] = el.value; jeTotals(); }
  if (el.dataset.ts && (el.dataset.ts === "worked" || el.dataset.ts === "banked")) { UI.ts.days[+el.dataset.d].rows[+el.dataset.r][el.dataset.ts] = Math.min(24, Math.max(0, parseFloat(el.value) || 0)); UI.dirty = true; tsTotals(); }
  if (el.dataset.a === "depAmt") { UI.depb.deposit = el.value; }
  if (el.dataset.a === "depRef") { UI.depb.reference = el.value; }
  if (el.dataset.filter) { const q = el.value.toLowerCase(); document.querySelectorAll(`#${el.dataset.filter} tbody tr`).forEach((tr) => { tr.hidden = q && !tr.textContent.toLowerCase().includes(q); }); }
});
Object.assign(FORMS, ...window.FORMS_EXT); Object.assign(ACTIONS, ...window.ACTIONS_EXT);
document.addEventListener("submit", (ev) => {
  const f = ev.target.closest("form[data-f]");
  if (!f) { ev.preventDefault(); return; }
  ev.preventDefault();
  const fn = FORMS[f.dataset.f];
  if (fn) fn(f, ev);
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && (UI.modal || UI.pop || UI.sideOpen)) { UI.modal = null; UI.pop = null; UI.sideOpen = false; safeRender(); } });
// drag-and-drop a vendor PDF onto Bills to Pay
document.addEventListener("dragover", (ev) => { const z = ev.target.closest("#billDrop"); if (z) { ev.preventDefault(); z.classList.add("over"); } });
document.addEventListener("dragleave", (ev) => { const z = ev.target.closest("#billDrop"); if (z) z.classList.remove("over"); });
document.addEventListener("drop", (ev) => { const z = ev.target.closest("#billDrop"); if (!z) return; ev.preventDefault(); z.classList.remove("over"); const file = ev.dataTransfer?.files?.[0]; if (!file) return; const m = file.name.match(/(?:INV|inv|#)?[-_ ]?(\d{3,})/); UI.apDraft = { attachment: { name: file.name, size: file.size, type: file.type }, invoiceNumber: m ? m[1] : "" }; UI.modal = billModal(UI.apDraft); safeRender(); });
document.addEventListener("click", (ev) => { if (ev.target.closest("#billDrop") && !ev.target.closest("[data-a]")) document.getElementById("billFile")?.click(); });
document.addEventListener("change", (ev) => { if (ev.target.id === "billFile") { const file = ev.target.files?.[0]; if (!file) return; UI.apDraft = { attachment: { name: file.name, size: file.size, type: file.type } }; UI.modal = billModal(UI.apDraft); safeRender(); } });

applyTheme();
boot();

/* ---------------- drag & drop: attachments and the org chart ---------------- */
let DRAG_EMP = null;
document.addEventListener("dragstart", (ev) => { const c = ev.target.closest?.("[data-drag]"); if (!c) return; DRAG_EMP = c.dataset.drag; c.classList.add("dragging"); ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", DRAG_EMP); } catch { /* ignore */ } });
document.addEventListener("dragend", (ev) => { ev.target.closest?.("[data-drag]")?.classList.remove("dragging"); document.querySelectorAll(".ocol.over,.ocol.blocked").forEach((n) => n.classList.remove("over", "blocked")); DRAG_EMP = null; });
document.addEventListener("dragover", (ev) => {
  const z = ev.target.closest?.("[data-fzone]"); if (z) { ev.preventDefault(); z.classList.add("over"); return; }
  const col = ev.target.closest?.("[data-dropdept]"); if (col && DRAG_EMP) { ev.preventDefault(); const e = byId(S.employees, DRAG_EMP); col.classList.add(e && e.companyId === col.dataset.co ? "over" : "blocked"); }
});
document.addEventListener("dragleave", (ev) => { const z = ev.target.closest?.("[data-fzone]"); if (z && !z.contains(ev.relatedTarget)) z.classList.remove("over"); const col = ev.target.closest?.("[data-dropdept]"); if (col && !col.contains(ev.relatedTarget)) col.classList.remove("over", "blocked"); });
document.addEventListener("drop", (ev) => {
  const z = ev.target.closest?.("[data-fzone]"); if (z) { ev.preventDefault(); z.classList.remove("over"); addFiles(z.dataset.fzone, ev.dataTransfer.files); return; }
  const col = ev.target.closest?.("[data-dropdept]");
  if (col && DRAG_EMP) { ev.preventDefault(); const id = DRAG_EMP; DRAG_EMP = null; const e = byId(S.employees, id), d = byId(S.departments, col.dataset.dropdept); if (e && d && e.departmentId !== d.id) act("employee.move", { employeeId: id, departmentId: d.id }, `${empName(e)} now works in ${d.name}.`); else safeRender(); }
});

/* ---- what each Download ▾ button produces (header row first) ---- */
EXPORTS.history = () => { const { rows } = historyRowsA(UI.filters.hist || {}); return { base: `haico-history-${todayStr()}`, title: "History", rows: [["When", "Done by", "Area", "What happened"], ...rows.map((r) => [r.at.replace("T", " ").slice(0, 16), r.actorName, H_AREAS[areaOfModule(r.module)]?.[0] || r.module, r.summary])] }; };
EXPORTS.report = (key) => { const d = reportData(key, UI.filters[`rep_${key}`] || {}); return { base: `haico-${key}-report-${todayStr()}`, title: `${REP[key]?.title || key} report`, rows: [d.cols.map((c) => c[1]), ...d.rows.map((r) => d.cols.map(([k, , kind]) => kind === "money" ? (r[k] / 100).toFixed(2) : kind === "hours" ? Number(r[k]).toFixed(2) : r[k]))] }; };
EXPORTS["timesheet-period"] = (start) => timesheetReportRows(start);

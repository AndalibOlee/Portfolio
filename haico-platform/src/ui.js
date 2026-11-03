/* ==========================================================================
   ui.js — per-viewer UI state, shared helpers, the shell and the router
   ========================================================================== */
let S = freshState();          // current shared state (seed + events)
let A = null;                  // auth for the signed-in demo user

const LS_KEY = "demo-erp-prefs-v1";
function loadPrefs() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } }
function savePrefs() { try { localStorage.setItem(LS_KEY, JSON.stringify({ userId: UI.userId, activeCompanyId: UI.activeCompanyId, route: UI.route, readUpTo: UI.readUpTo, navOpen: UI.navOpen, theme: UI.theme, look: UI.look, section: UI.section })); } catch { /* storage unavailable */ } }
const prefs = loadPrefs();
const UI = {
  userId: prefs.userId || null, activeCompanyId: prefs.activeCompanyId || null, chosenCompany: !!prefs.userId,
  route: prefs.route || "/", readUpTo: prefs.readUpTo || {}, flash: null, pop: null, sideOpen: false, modal: null,
  dirty: false, stale: false, loginError: false, ts: null, je: null, apDraft: null, tabs: {}, filters: {}, navOpen: prefs.navOpen || {}, emailOpen: null, emailInbox: "me", theme: prefs.theme || "system", look: prefs.look || "cedar", section: prefs.section || null,
};

/* ---------------- tiny html helpers ---------------- */
const attr = (o) => Object.entries(o).filter(([, v]) => v != null && v !== false).map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(" ");
const ph = (title, desc, acts = "", crumb = "") => `${crumb ? `<div class="crumb">${crumb}</div>` : ""}<div class="ph"><div><h1>${esc(title)}</h1>${desc ? `<p>${esc(desc)}</p>` : ""}</div>${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
const crumb = (path, label) => `<button data-go="${esc(path)}">← ${esc(label)}</button>`;
const flashHtml = () => (UI.flash ? `<div class="msg ${UI.flash.kind}" role="status">${esc(UI.flash.text)}</div>` : "");
const empty = (t, h = "") => `<div class="empty"><b>${esc(t)}</b>${esc(h)}</div>`;
const card = (title, body, right = "", cls = "") => `<section class="card ${cls}">${title ? `<div class="card-h"><span>${title}</span>${right}</div>` : ""}<div class="card-b">${body}</div></section>`;
const cardFlush = (title, body, right = "") => `<section class="card">${title ? `<div class="card-h" style="padding-bottom:12px"><span>${title}</span>${right}</div>` : ""}${body}</section>`;
function table(heads, rows, emptyMsg = "Nothing here yet.") {
  if (!rows.length) return empty(emptyMsg);
  return `<div class="tw"><table class="t"><thead><tr>${heads.map((h) => { const r = typeof h === "string" && h.startsWith(">"); return `<th class="${r ? "r" : ""}">${esc(r ? h.slice(1) : h)}</th>`; }).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
const td = (v, r = false) => `<td class="${r ? "r num" : ""}">${v}</td>`;
const goLink = (path, label) => `<button class="lnk" data-go="${esc(path)}">${esc(label)}</button>`;
const co = (id) => byId(S.companies, id);
const coTag = (id) => { const c = co(id); return c ? `<span class="chip"><span class="sq" style="background:${esc(c.colorTag)}"></span>${esc(c.displayName)}</span>` : "—"; };
const avatar = (e, size = 34) => `<span class="av" style="width:${size}px;height:${size}px;background:${esc(e?.avatarColor || co(e?.companyId)?.colorTag || "#17566B")}">${esc(initials(empName(e)))}</span>`;
const stat = (label, value, hint = "", tone = "") => `<div class="stat ${tone}"><div class="l">${esc(label)}</div><div class="v">${esc(value)}</div>${hint ? `<div class="h">${esc(hint)}</div>` : ""}</div>`;
const tabs = (key, list, cur) => `<div class="tabs" role="tablist">${list.map(([k, label, count]) => `<button role="tab" data-a="tab" data-k="${esc(key)}" data-v="${esc(k)}" class="${k === cur ? "on" : ""}" aria-selected="${k === cur}">${esc(label)}${count != null ? `<span class="c">${count}</span>` : ""}</button>`).join("")}</div>`;
const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
const inScope = (list) => { const ids = scopeIds(S, A); return list.filter((x) => ids.includes(x.companyId)); };
const scopeName = () => (A.activeCompanyId ? co(A.activeCompanyId).displayName : A.companyIds == null ? "all companies" : A.companyIds.map((id) => co(id).displayName).join(", "));

/* ---------------- icons (Lucide-style strokes) ---------------- */
const ICON_PATHS = {
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  tag: '<path d="M20 12 12 20l-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  help: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m4.9 4.9 4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  directory: '<path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z"/><circle cx="12" cy="10" r="2.5"/><path d="M8.5 16c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4"/>',
  sheet: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 16h7M12 10v8"/>',
  paperclip: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2"/><path d="M3 9h18"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 14 4-4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
  network: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 12h6M9 16h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  filetext: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  scroll: '<path d="M8 21h11a2 2 0 0 0 2-2v-1H10v1a2 2 0 0 1-2 2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h12a2 2 0 0 1 2 2v13"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  landmark: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v14a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3"/><path d="M20 4v14.5h-6.5A2.5 2.5 0 0 0 11 21"/>',
  listtree: '<path d="M9 5h12M13 12h8M13 19h8"/><path d="M4 5v11a3 3 0 0 0 3 3h2M4 12h5"/>',
  piggybank: '<path d="M5 11a7 6 0 0 1 13-1h2v4h-2a7 6 0 0 1-3 3v3h-3v-2H9v2H6v-3.5A6 6 0 0 1 5 11z"/><path d="M16 10h.01"/>',
  handcoins: '<circle cx="15" cy="7" r="3"/><path d="M3 15h4l4 2h5a2 2 0 0 0 0-4h-4"/><path d="m16 15 4-2.5a1.6 1.6 0 0 1 2 2.4L16 20H3"/>',
  boxes: '<rect x="3" y="12" width="8" height="8" rx="1"/><rect x="13" y="12" width="8" height="8" rx="1"/><rect x="8" y="3" width="8" height="8" rx="1"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  calendarlock: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><rect x="9.5" y="14" width="5" height="4" rx="1"/>',
  arrows: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11.5l2-8H6.2"/>',
  package: '<path d="m12 3 9 5v8l-9 5-9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
  gitbranch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M18 10c0 4-6 3-11 7"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/><path d="M12 8v5M9.5 10.5h5"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  tasks: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/>',
  calendarclock: '<path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h5"/><path d="M8 2v4M16 2v4M3 10h7"/><circle cx="17" cy="17" r="5"/><path d="M17 15v2.2l1.4.9"/>',
  palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3.5-4 3.5h-2a2 2 0 0 0-1.5 3.3A1.4 1.4 0 0 1 12 21z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  chevright: '<path d="m9 6 6 6-6 6"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  tick: '<path d="m5 12 5 5 9-10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[n] || ICON_PATHS.gauge}</svg>`;

/* ---------------- approvals helpers for the shell ---------------- */
function myActionable() {
  return S.approvals.filter((i) => i.status === "PENDING" && (A.companyIds == null || A.companyIds.includes(i.companyId)) && canActOn(S, A, i))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
const myNotifs = () => S.notifications.filter((n) => n.userId === A.user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
const isUnread = (n) => !n.isRead && !(UI.readUpTo[A.user.id] && n.createdAt <= UI.readUpTo[A.user.id]);

/* ---------------- sections: one config for sidebar items and the level-3 tab bar
   (B's naming: groups My work / Me / Team / People / Payroll / Finance / Operations / Reports / Administration;
   "@employee" = has an employee record; perm may also be a function) ---------------- */
const REPORT_PERMS = ["reports.view", "finance.view", "procurement.view", "expenses.approve", "expenses.reimburse", "leave.view", "timesheets.view", "payroll.view", "ap.view", "ar.view", "hr.employees.view"];
const MONEY_REQUEST_PERMS = ["finance.view", "procurement.view", "expenses.approve", "expenses.reimburse"];
/** HR, payroll and administrators work everyone's time under People › Time & Attendance; a manager works the team's under Team */
const attendanceAdmin = () => !!A && (A.isSuper || can(A, "payroll.view") || A.roleCodes.some((r) => ["HR_MANAGER", "PAYROLL_ADMIN", "COMPANY_ADMIN", "GROUP_ADMIN"].includes(r)));
const teamLeads = () => !!A && (A.isSuper || can(A, "hr.employees.edit") || (!!A.employee && S.employees.some((e) => e.managerId === A.employee.id && e.status !== "TERMINATED")));
const SECTIONS = [
  { key: "home", label: "Home", tabs: [{ href: "/dashboard", label: "Home", match: ["/me"] }] },
  { key: "approvals", label: "Approvals", tabs: [{ href: "/approvals", label: "Approvals" }] },
  { key: "my-time", label: "My Time", tabs: [{ href: "/me/time", label: "My Time", perm: "@employee" }] },
  { key: "my-timeoff", label: "My Time Off", tabs: [{ href: "/me/time-off", label: "Time off", perm: "@employee" }, { href: "/me/profile/events", label: "Calendar", perm: "@employee" }] },
  { key: "my-requests", label: "My Requests & Expenses", tabs: [{ href: "/me/requests", label: "My Requests & Expenses", match: ["/me/expenses"], perm: "@employee" }] },
  { key: "my-tasks", label: "My Tasks", tabs: [{ href: "/me/tasks", label: "My Tasks", perm: "@employee" }] },
  { key: "my-profile", label: "My Profile", tabs: [
    { href: "/me/profile", label: "Overview", perm: "@employee" }, { href: "/me/profile/employment", label: "Employment", perm: "@employee" }, { href: "/me/profile/benefits", label: "Pension & Benefits", perm: "@employee" },
    { href: "/me/reviews", label: "Reviews", perm: "@employee" }, { href: "/me/certifications", label: "Certificates", perm: "@employee" }] },
  { key: "my-pay", label: "My Pay", tabs: [{ href: "/me/pay", label: "My Pay", perm: "@employee" }] },
  { key: "my-documents", label: "My Documents", tabs: [{ href: "/me/documents", label: "My Documents", perm: "@employee" }] },
  { key: "team", label: "My Team", tabs: [
    { href: "/team", label: "Team", perm: () => !!A.employee || teamLeads() },
    { href: "/hr/timesheets", label: "Timesheets", perm: () => can(A, "timesheets.view") && !attendanceAdmin() },
    { href: "/hr/leave", label: "Time off", perm: () => can(A, "leave.view") && !attendanceAdmin() },
    { href: "/hr/requests", label: "Requests", perm: () => seesMoneyRequests() && !can(A, "ap.view") },
    { href: "/finance/expenses", label: "Expense claims", perm: () => can(A, "expenses.view") && can(A, "expenses.approve") && !can(A, "ap.view") },
    { href: "/team/hiring", label: "Create New Hiring", perm: () => typeof hireCanRequest === "function" && hireCanRequest() }] },
  { key: "people", label: "People", tabs: [
    { href: "/hr/employees", label: "Employees", perm: "hr.employees.view" }, { href: "/people/directory", label: "Directory", perm: ["@employee", "hr.employees.view"] }, { href: "/people/org-chart", label: "Org chart", perm: ["@employee", "hr.employees.view"] },
    { href: "/hr/departments", label: "Departments", perm: "hr.org.manage" }, { href: "/hr/onboarding", label: "Onboarding", perm: "hr.onboarding.manage" }, { href: "/hr/hiring", label: "Hiring", perm: "hr.employees.edit" },
    { href: "/hr/certifications", label: "Certificates", perm: "hr.employees.view" }, { href: "/hr/hiring-requests", label: "Hiring requests", perm: () => typeof hireIsHr === "function" && hireIsHr() }] },
  { key: "hr-time", label: "Time & Attendance", tabs: [
    { href: "/hr/timesheets", label: "Timesheets", perm: () => can(A, "timesheets.view") && attendanceAdmin() }, { href: "/payroll/timesheet-status", label: "By pay period", perm: () => (can(A, "payroll.view") || can(A, "hr.employees.edit")) && attendanceAdmin() },
    { href: "/hr/leave", label: "Time off", perm: () => can(A, "leave.view") && attendanceAdmin() }] },
  { key: "hr-talent", label: "Reviews, Benefits & Pension", tabs: [
    { href: "/hr/reviews", label: "Performance Reviews", perm: () => typeof rbpReviewsView === "function" && rbpReviewsView() },
    { href: "/hr/benefits", label: "Benefits", perm: () => typeof rbpView === "function" && rbpView() },
    { href: "/hr/pension", label: "Pension", perm: () => typeof rbpView === "function" && rbpView() }] },
  { key: "ops-payroll", label: "Payroll", tabs: [
    { href: "/payroll/runs", label: "Pay runs", perm: "payroll.view" }, { href: "/payroll/statements", label: "Statements", perm: "payroll.view" }, { href: "/payroll/yearend", label: "Year-end", perm: "payroll.view" },
    { href: "/payroll/remittances", label: "CRA remittances", perm: "payroll.view" }, { href: "/payroll/roe", label: "Records of Employment", perm: ["payroll.view", "hr.employees.edit"] }, { href: "/payroll/settings", label: "Settings", perm: "payroll.view" }] },
  { key: "fin-accounting", label: "Accounting", tabs: [
    { href: "/finance", label: "Overview", perm: "finance.view" }, { href: "/finance/journals", label: "Journal entries", perm: "finance.view" }, { href: "/finance/recurring", label: "Recurring", perm: "finance.view" },
    { href: "/finance/periods", label: "Month-end", perm: "finance.periods" }, { href: "/finance/assets", label: "Fixed assets", perm: "assets.view" }, { href: "/finance/budgets", label: "Budgets", perm: "budgets.view" },
    { href: "/finance/accounts", label: "Chart of accounts", perm: "finance.view" }, { href: "/finance/interco", label: "Inter-company", perm: "interco.manage" }] },
  { key: "fin-ap", label: "Accounts Payable", tabs: [
    { href: "/finance/ap", label: "Bills", perm: "ap.view" }, { href: "/finance/ap/vendors", label: "Vendors", perm: "ap.view" }, { href: "/finance/ap/attachments", label: "Files", perm: "ap.view", match: ["/finance/ap-files"] },
    { href: "/finance/expenses", label: "Employee claims", perm: () => can(A, "ap.view") && can(A, "expenses.view") }, { href: "/hr/requests", label: "Employee requests", perm: () => can(A, "ap.view") && seesMoneyRequests() }] },
  { key: "fin-ar", label: "Accounts Receivable", tabs: [{ href: "/finance/ar", label: "Invoices", perm: "ar.view" }] },
  { key: "fin-banking", label: "Banking", tabs: [{ href: "/finance/banking", label: "Bank activity", perm: "banking.view" }] },
  { key: "ops-purchasing", label: "Purchasing", tabs: [
    { href: "/procurement/requests", label: "Requests", perm: "procurement.view" }, { href: "/procurement/pos", label: "Purchase orders", perm: "procurement.view" }, { href: "/procurement/receiving", label: "Receiving", perm: "procurement.receive" },
    { href: "/procurement/match", label: "Matching", perm: ["procurement.view", "ap.view"] }] },
  { key: "ops-sales", label: "Sales & Stock", tabs: [
    { href: "/sales/orders", label: "Sales orders", perm: "ar.view" }, { href: "/sales/shipments", label: "Shipments", perm: "ar.view" }, { href: "/inventory/stock", label: "Stock", perm: ["ar.view", "procurement.view"], match: ["/inventory/count"] }, { href: "/inventory/items", label: "Items & stock", perm: ["ar.view", "procurement.view"] }] },
  { key: "ops-projects", label: "Projects", tabs: [{ href: "/projects", label: "Projects", perm: "projects.view" }] },
  { key: "documents", label: "Documents", tabs: [{ href: "/documents", label: "Documents", perm: "documents.view" }] },
  { key: "reports", label: "Reports", tabs: [{ href: "/reports", label: "Reports", perm: REPORT_PERMS }, { href: "/history", label: "History" }] },
  { key: "admin", label: "Administration", tabs: [
    { href: "/admin/users", label: "Users & access", perm: "admin.users" }, { href: "/admin/companies", label: "Companies", perm: "admin.companies" }, { href: "/admin/workflows", label: "Approval rules", perm: "admin.workflows" },
    { href: "/admin/audit", label: "Audit log", perm: "audit.view" }, { href: "/admin/feedback", label: "Feedback", perm: "admin.users" }, { href: "/admin/settings", label: "Settings", perm: "admin.settings" }] },
  { key: "help", label: "How-to", tabs: [{ href: "/help", label: "How-to" }] },
];
const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((x) => [x.key, x]));
function hasPermA(perm) { if (!perm) return true; if (typeof perm === "function") { try { return !!perm(); } catch { return false; } } return (Array.isArray(perm) ? perm : [perm]).some((p) => (p === "@employee" ? !!A.employee : can(A, p))); }
const visibleTabs = (sec) => sec.tabs.filter((t) => hasPermA(t.perm));
const sectionHref = (key) => { const sec = SECTION_BY_KEY[key]; return sec ? visibleTabs(sec)[0]?.href || null : null; };
const underPath = (path, prefix) => path === prefix || path.startsWith(prefix + "/");
function tabMatch(tab, path) { let best = 0; for (const p of [tab.href, ...(tab.match || [])]) if (underPath(path, p) && p.length > best) best = p.length; return best; }
function activeTabOf(tabs, path) { let best = null, len = 0; for (const t of tabs) { const m = tabMatch(t, path); if (m > len) { best = t; len = m; } } return best; }
/** the section a path belongs to: longest matching tab wins; ties go to the section the person came from, else the one with 2+ tabs */
function sectionFor(path) {
  let len = 0, tied = [];
  for (const sec of SECTIONS) {
    let m = 0;
    for (const t of sec.tabs) { if (!hasPermA(t.perm)) continue; m = Math.max(m, tabMatch(t, path)); }
    if (m > len) { len = m; tied = [sec]; } else if (m > 0 && m === len) tied.push(sec);
  }
  if (tied.length <= 1) return tied[0] || null;
  const pref = tied.find((x) => x.key === UI.section); if (pref) return pref;
  return tied.find((x) => visibleTabs(x).length >= 2) || tied[0];
}
/** the level-3 tab bar for the current route (hidden when the section has fewer than two tabs for this person) */
function sectionTabsHtml(path) {
  const sec = sectionFor(path);
  if (!sec) return "";
  const tabs = visibleTabs(sec);
  if (tabs.length < 2) return "";
  const cur = activeTabOf(tabs, path);
  return `<nav class="stabs" aria-label="${esc(sec.label)}">${tabs.map((t) => `<button class="${cur?.href === t.href ? "on" : ""}" data-go="${esc(t.href)}" data-sec="${sec.key}"${cur?.href === t.href ? ' aria-current="page"' : ""}>${esc(t.label)}</button>`).join("")}</nav>`;
}
/** true when the shell already shows a tab bar for this route — pages then skip their own pill bar */
const shellTabsShown = () => !!sectionTabsHtml(parseRoute(UI.route).path);

/* ---------------- navigation: B's grouped menu (My work / Me / Team / People / Payroll / Finance / Operations / Reports / Administration)
   with a count badge where there is something to do, filtered by what this person may open ---------------- */
const TEAM_ROLES = ["MANAGER", "HR_MANAGER", "COMPANY_ADMIN", "GROUP_ADMIN", "SUPER_ADMIN"];
const navSafe = (fn) => { try { return fn() || 0; } catch { return 0; } };
/** my open tasks that are overdue or due by tomorrow (B's My Tasks badge) */
const myTasksDue = () => (A.employee ? (S.tasks || []).filter((t) => t.assigneeId === A.employee.id && t.status !== "DONE" && t.dueDate && t.dueDate <= addDays(todayStr(), 1)).length : 0);
/** other people's tasks that are late or blocked (B's Team badge) */
const teamTasksLate = () => (typeof teamScope === "function" ? teamScope().filter((t) => t.assigneeId !== A.employee?.id && t.status !== "DONE" && ((t.dueDate && t.dueDate < todayStr()) || t.status === "BLOCKED")).length : 0);
function buildNav() {
  const has = (p) => can(A, p);
  const groups = [];
  const push = (label, items, flat = false) => { if (items.length) groups.push({ label, items, flat }); };
  const item = (list, key, title, ic, badge) => { const href = sectionHref(key); if (href) list.push({ title, href, icon: ic, section: key, badge: badge || 0 }); };
  const waiting = myActionable().length + myTimesheetsToApprove().length;
  const directReports = A.employee ? S.employees.filter((e) => e.managerId === A.employee.id && e.status !== "TERMINATED").length : 0;
  // ---- Home, Approvals: no heading ----
  const home = [{ title: "Home", href: "/dashboard", icon: "home", section: "home" }];
  const approver = waiting > 0 || directReports > 0 || A.roleCodes.includes("MANAGER") || ["timesheets.approve", "leave.approve", "expenses.approve", "procurement.approve", "ap.approve", "payroll.approve"].some(has);
  if (approver) home.push({ title: "Approvals", href: "/approvals", icon: "check", badge: waiting, section: "approvals" });
  push("Home", home, true);
  // ---- My work / Me: everyone with an employee record ----
  if (A.employee && has("ess.access")) {
    const work = [];
    item(work, "my-time", "My Time", "clock");
    item(work, "my-timeoff", "My Time Off", "calendar", navSafe(() => S.leaveRequests.filter((r) => r.employeeId === A.employee.id && r.status === "REJECTED" && (r.decidedAt || "") >= addDays(todayStr(), -14) + "T00:00:00Z").length));
    item(work, "my-requests", "My Requests & Expenses", "inbox");
    item(work, "my-tasks", "My Tasks", "tasks", navSafe(myTasksDue));
    push("My work", work);
    const me = [];
    item(me, "my-profile", "My Profile", "user");
    item(me, "my-pay", "My Pay", "wallet");
    item(me, "my-documents", "My Documents", "folder");
    push("Me", me);
  }
  // ---- Team: managers, HR and administrators ----
  const team = [];
  if (teamLeads()) item(team, "team", "My Team", "users", navSafe(teamTasksLate) + navSafe(() => (can(A, "timesheets.view") && !attendanceAdmin() ? myTimesheetsToApprove().length : 0)));
  push("Team", team);
  // ---- People ----
  const people = [];
  item(people, "people", "People", "directory", (has("hr.onboarding.manage") ? navSafe(() => inScope(S.employees).filter((e) => e.status === "ONBOARDING").length) : 0) + (has("hr.employees.view") ? navSafe(() => (typeof hr2ExpiringCerts === "function" ? hr2ExpiringCerts(60).length : 0)) : 0));
  if (attendanceAdmin()) item(people, "hr-time", "Time & Attendance", "calendarclock", navSafe(() => (has("timesheets.view") ? inScope(S.timesheets).filter((t) => t.status === "SUBMITTED").length : 0) + (has("leave.view") ? inScope(S.leaveRequests).filter((r) => r.status === "PENDING_APPROVAL").length : 0)));
  item(people, "hr-talent", typeof rbpView === "function" && !rbpView() ? "Performance Reviews" : "Reviews, Benefits & Pension", "star", navSafe(() => (has("hr.employees.edit") ? (S.benefitEnrollments || []).filter((b) => b.status === "REQUESTED").length + (S.pensionRemittances || []).filter((r) => r.status === "DUE" && inView(S, A, r.companyId)).length : 0)));
  push("People", people);
  // ---- Payroll ----
  const pay = [];
  item(pay, "ops-payroll", "Payroll", "banknote", navSafe(() => inScope(S.remittances || []).filter((r) => r.status === "DUE").length));
  push("Payroll", pay);
  // ---- Finance ----
  const fin = [];
  item(fin, "fin-accounting", "Accounting", "book", navSafe(() => inScope(S.recurringJournals || []).filter((r) => r.isActive !== false && r.nextRunDate <= todayStr()).length));
  item(fin, "fin-ap", "Accounts Payable", "receipt", navSafe(() => inScope(S.apInvoices).filter((i) => i.status === "PENDING_APPROVAL").length + (seesMoneyRequests() ? inScope(S.requests).filter((r) => r.status === "PENDING_APPROVAL").length : 0)));
  item(fin, "fin-ar", "Accounts Receivable", "filetext", navSafe(() => inScope(S.arInvoices).filter((i) => ["SENT", "APPROVED", "PARTIALLY_PAID"].includes(i.status) && i.dueDate < todayStr()).length));
  item(fin, "fin-banking", "Banking", "piggybank");
  push("Finance", fin);
  // ---- Operations ----
  const ops = [];
  item(ops, "ops-purchasing", "Purchasing", "cart", navSafe(() => inScope(S.apInvoices).filter((i) => i.matchStatus === "VARIANCE").length));
  item(ops, "ops-sales", "Sales & Stock", "boxes");
  item(ops, "ops-projects", "Projects", "briefcase");
  item(ops, "documents", "Documents", "folder");
  push("Operations", ops);
  // ---- Reports, Administration ----
  const rep = [];
  const reportsPeople = ["reports.view", "finance.view", "hr.employees.view", "payroll.view", "leave.view", "timesheets.view"].some(has) || seesMoneyRequests();
  if (reportsPeople) item(rep, "reports", "Reports", "chart");
  push("Reports", rep);
  const adm = [];
  item(adm, "admin", "Administration", "shield", has("admin.users") ? S.feedback.filter((f) => f.status === "NEW").length : 0);
  push("Administration", adm);
  return groups;
}
/** who works the money-side requests (travel, card, purchase, expense & travel claims) */
const seesMoneyRequests = () => ["finance.view", "procurement.view", "expenses.approve", "expenses.reimburse"].some((p) => can(A, p));
const TS_ADMIN_ROLES = ["HR_MANAGER", "COMPANY_ADMIN", "GROUP_ADMIN", "PAYROLL_ADMIN"];
const approvesAnyTimesheet = () => A.isSuper || (can(A, "timesheets.approve") && A.roleCodes.some((r) => TS_ADMIN_ROLES.includes(r)));
/** submitted timesheets this person can approve: their team's, plus everyone's for HR / admins (never their own) */
function myTimesheetsToApprove() {
  const me = A.employee?.id, any = approvesAnyTimesheet();
  if (!me && !any) return [];
  return S.timesheets.filter((t) => t.status === "SUBMITTED" && t.employeeId !== me && (A.companyIds == null || A.companyIds.includes(t.companyId)) && (any || byId(S.employees, t.employeeId)?.managerId === me))
    .map((t) => ({ ...t, isMyReport: !!me && byId(S.employees, t.employeeId)?.managerId === me }))
    .sort((a, b) => Number(b.isMyReport) - Number(a.isMyReport) || (a.periodStart < b.periodStart ? 1 : -1));
}
function homeFor() {
  // everyone with an employee record lands on the dashboard, which opens with their request centre
  if (A.employee) return "/dashboard";
  if (can(A, "reports.view") || can(A, "finance.view") || can(A, "hr.employees.view")) return "/dashboard";
  return "/approvals";
}

/* ---------------- routes ---------------- */
const ROUTES = [];
function route(pattern, perm, view) { ROUTES.push({ re: new RegExp("^" + pattern.replace(/:(\w+)/g, "([^/]+)") + "$"), perm, view }); }
function parseRoute(r) { const [path, qs] = String(r || "/").split("?"); return { path, q: Object.fromEntries(new URLSearchParams(qs || "")) }; }

function roleLabel() { return A.user.demoLabel || A.roleNames.join(", ") || "User"; }

/* ---------------- rendering ---------------- */
const $app = () => document.getElementById("app");
function render() {
  const app = $app();
  const prevScroll = document.querySelector(".content")?.scrollTop || 0;
  const prevRoute = render._route;
  A = UI.userId ? authFor(S, UI.userId, UI.activeCompanyId) : null;
  if (!A) { app.innerHTML = vLogin(); render._route = "login"; return; }
  if (!UI.chosenCompany && A.multiCompany) { app.innerHTML = banner() + `<div style="flex:1;overflow-y:auto">${vChoose()}</div>`; render._route = "choose"; return; }
  let { path, q } = parseRoute(UI.route);
  if (path === "/" || path === "/login") { path = homeFor(); UI.route = path; }
  const r = ROUTES.find((x) => x.re.test(path));
  const sec = sectionFor(path); if (sec && UI.section !== sec.key) UI.section = sec.key;
  let body;
  try {
    if (!r) body = vNotFound();
    else if (r.perm && !(typeof r.perm === "function" ? r.perm() : can(A, r.perm))) body = vDenied(r.perm);
    else body = r.view(q, ...path.match(r.re).slice(1));
  } catch (e) { console.error(e); body = `<div class="msg err">This page couldn't be drawn: ${esc(e.message)}</div>`; }
  app.innerHTML = banner() + `<div class="shell">${sidebar(path)}<div class="main">${topbar()}<main class="content" id="content"><div class="wrap">${sectionTabsHtml(path)}${body}</div></main>${footerHtml()}</div></div>${feedbackUi(path)}${modalHtml()}${UI.sideOpen ? '<div class="scrim" data-a="closeSide"></div>' : ""}`;
  // the page rises in only when you arrive on it; a redraw of the same page (a click, a save) stays still
  if (prevRoute === UI.route) { const c = document.querySelector(".content"); if (c) { c.scrollTop = prevScroll; c.classList.add("still"); } }
  render._route = UI.route;
  UI.dirty = false; UI.stale = false;
  afterRender();
}
function afterRender() { document.querySelectorAll("[data-chart]").forEach((el) => wireChart(el)); if (typeof tsTotals === "function" && document.getElementById("tsg")) tsTotals(); if (document.getElementById("jeForm")) jeTotals(); if (document.getElementById("lvBox")) leaveCalc(); if (typeof animateCharts === "function") animateCharts(); }

function banner() {
  return `<div class="banner"><div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="tag">DEMO MODE</span><span class="note">Fictional data for demonstration. Payroll figures are illustrative — not certified calculations.</span></div>${A ? `<div style="display:flex;gap:6px;align-items:center;white-space:nowrap">Role: <strong>${esc(roleLabel())}</strong> · <button data-a="switchRole">Switch role</button></div>` : ""}</div>`;
}
function sidebar(path) {
  const cur = sectionFor(path)?.key;
  const itemHtml = (i) => `<button class="item ${i.section === cur ? "on" : ""}" data-go="${esc(i.href)}" data-sec="${esc(i.section || "")}"${i.section === cur ? ' aria-current="page"' : ""}>${icon(i.icon)}<span>${esc(i.title)}</span>${i.badge ? `<span class="bdg">${i.badge}</span>` : ""}</button>`;
  const groups = buildNav().map((g) => g.flat ? `<div class="grp">${g.items.map(itemHtml).join("")}</div>` : `<div class="grp"><div class="grp-l">${esc(g.label)}</div>${g.items.map(itemHtml).join("")}</div>`).join("");
  return `<aside class="side ${UI.sideOpen ? "open" : ""}" aria-label="Main menu"><div class="brand" style="display:flex;align-items:center;gap:10px"><div><b style="font-size:15px;letter-spacing:.06em">DEMO</b><small style="margin:0">ENTERPRISE PLATFORM</small></div></div><nav>${groups}</nav><div class="me"><span class="av">${esc(initials(A.user.displayName))}</span><div style="min-width:0"><b>${esc(A.user.displayName)}</b><small>${esc(A.roleNames.join(", ") || "User")}</small></div></div></aside>`;
}
function topbar() {
  const cos = S.companies.filter((c) => canSee(A, c.id)).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const act = A.activeCompanyId ? co(A.activeCompanyId) : null;
  const unread = myNotifs().filter(isUnread).length;
  const sw = cos.length > 1 ? `<label class="sr" style="position:absolute;left:-9999px" for="coSel">Company</label><select id="coSel" class="co-select" data-a="company">${A.companyIds == null || cos.length > 1 ? opt("ALL", "All companies", !act) : ""}${cos.map((c) => opt(c.id, c.displayName, act?.id === c.id)).join("")}</select>` : "";
  const live = SYNC.mode === "live" ? `<span class="live on" title="Everyone with this link sees the same data, live"><i></i><span class="lt">Live · shared</span></span>`
    : SYNC.mode === "connecting" ? `<span class="live"><i></i><span class="lt">Connecting…</span></span>`
    : `<span class="live local" title="${esc(SYNC.why || "Changes stay in this browser")}"><i></i><span class="lt">This browser only</span></span>`;
  return `<header class="top"><button class="iconbtn menu-btn" data-a="openSide" aria-label="Open menu">${icon("menu")}</button>
    <div class="co">${act ? `<span class="sq" style="background:${esc(act.colorTag)}"></span><span>${esc(act.displayName)}</span>` : `<span>${cos.length === 1 ? esc(cos[0].displayName) : A.companyIds == null ? "All companies" : esc(scopeName())}</span>`}</div>
    <button class="topsrch" data-a="searchOpen" aria-label="Search" title="Search — or press / anywhere">${icon("search")}<span>Search people, bills, vendors…</span><kbd>/</kbd></button>
    <div class="sp"></div>${UI.stale ? `<button class="stale" data-a="refresh">New activity · Refresh</button>` : ""}${live}${sw}
    <button class="helpbtn top" data-go="/help"><span aria-hidden>?</span>How-to</button>
    <button class="iconbtn" data-a="lookMenu" aria-label="Choose a look" title="Choose a look" aria-haspopup="dialog">${icon("palette")}</button>
    <button class="iconbtn" data-a="theme" aria-label="Switch light or dark" title="${UI.theme === "dark" ? "Dark — click for light" : UI.theme === "light" ? "Light — click for dark" : "Following your device — click for dark"}">${icon(UI.theme === "dark" ? "moon" : "sun")}</button>
    <button class="iconbtn" data-a="notifs" aria-label="Notifications">${icon("bell")}${unread ? `<span class="dot">${unread}</span>` : ""}</button>
    <button class="iconbtn" data-a="signout" aria-label="Sign out" title="Sign out">${icon("logout")}</button>
    ${UI.pop === "notifs" ? notifPanel() : ""}</header>`;
}
function notifPanel() {
  const list = myNotifs().slice(0, 30);
  return `<div class="pop" role="dialog" aria-label="Notifications"><h4>Notifications <button class="lnk" data-a="readAll">Mark all read</button></h4><div class="list">${list.length ? list.map((n) => `<button class="n ${isUnread(n) ? "unread" : ""}" data-go="${esc(n.linkUrl || "/")}"><b>${esc(n.title)}</b><span>${esc(n.body || "")}${n.body ? " · " : ""}${esc(ago(n.createdAt))}</span></button>`).join("") : empty("You're all caught up")}</div></div>`;
}
/** footer: Feedback and Email centred with the copyright line */
const HGWEB_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAuCAYAAABNhcu5AAAHGUlEQVR4nM2Y229bSR3HP3N87ONz4ktSO3aupk2yaXOjarbbdqHaFd0uLFoQQkhIIP4GJF74A3jgBSHeQCAtEi9chNCuKLtCoO2Wy2q7FCiFQJt0e02cxHc7jq/H9vDgS2L7JKndSvCzRvLMeGY+853f/GY8Ip9L8v9gyv8aoGl1EAmpQoGb4U2JrOePTM8cRNb7rVRrciOdIV0oPBnLMwZTm33c2tzi6toD7sUycsbv43Eiw9JYgIszIQHwOLkjQ8c8Yn/jZttsoYxbd9BW2WmHVoLa/OJ1OknkCmQLUR7GMhRKFdK5MoO6Lm9vJlnbSvH1V8/g1rVW43AiJ2+sxTgz7cetO8RBwpQTMYmi4BjyteHsz7RAkrkCSIFZqZExSwip8Dixwy9vrLKTNykUK/zo6r/l1LAXj66xGc8RSRVJZMp8ennCcr6RP1+T8Q8/oJxOAeAMjsjAhU/iO3teQPuKqs3sjfVNRMenUpFspXIoKAgpuLedIZIsoNns5ItVKqbEo2sYmtoFsfHOFbn5299QiEWQlQoA2fv32L3/EZV8TgZfutQGrwBkiiUeJtIIWR+QRhKNhBTQgMkXq6R3y5hmDSEV5kNDdLpy9t6a3LjyJvmtcAsCoFYukVt/zKNf/YJidFt2gThVFV11dCly1MdtOLh0eqRLjfiNDynGo1arBUB+M0zy1s22MgVAU234B4zGhESbKlb5ZpqbHCQ4pHf5R+7RgwMhWr9Zf9SmYmtxP3FigmS2xG7BRCBg38xHB13MBAfZLVT414NUq/yF5/yWgygOzbJ8v9kcjm5FAM4eHxeLo8MIqUDDV4QUuJ0OvnR+hssfn+SzyyGCg0ajTiEUHBBW8WxwfuFIEM+p+W4QCXidGkvjAdxOrWPnQDiR46OtDBvxHMVSDYHApas47HtH1X53Pfb8ObxziwdC+J4/h/fkfNuStiIrEry6k0pV7vMDhVK5yrWVME7VjoIgmzMRUmF23LsnRYeXaP5hceIrX5Prv36T9MotqsUiAHa3h6HTZ5j83Bewu91tbdTWdBpWKlcRKG2q7ORNsrVqPZ406gJefa+RBZB3bkEoDk36z12gFI2CoqAHg7iOTzEQ+liXg7dFooDHEAvjPnl7Pd3wlboqzcFplAkpMDRbt+YdQO7pGeGenqGyu4tQFGyG0Tlva5Ahw8nrp6eYH81yeyPFRjxHvlCzjCH5YtWiu31A++asulwH/9YKBGAqMCimAoMcH/bI7VSB63cirEcLXZG2ZNaO7LwXO/CGli2YKEJQrTYiimxXxGnvPl+exg7srVyp8ru/b5DaMVtO2vIZqTA2rB/UtC87UJGlkE8MuZoRst3Jx/w6Y34nW/GiLJYP8ZWeQUTXWOgOldeWJzEcatfSKEJw/Z9J3rsRp1iyADniNmZlqmDfdmp20CgIDbuEIhSJrAc50bgKhKNFNiNlbMDspCGXZr1Cs9rOB5gVp9KsaBOlkZFIZM36CqAgsAHXbya4fTdz6PVZYDGGFYhVIwBdU7kw5yc0PIDuUNuuBQoSBTA0G+md8qGDP4kd6KzNTl5ZHhWvnh1h1Gd0KAKKAJduY8CpPtGs+wJp2oBTZf64V4z79Q41JIqU3H+YZfVupo+hewRpWiho4LTbWr7RVEQR4HU/fXB7YpDZkFuEgsaeGvvS9AnPswB5slUd0G1cWBrC53W0lFDqHZBMFDHbzp5Ojzk6Kb00XpjxiIvLPjRVoMg9RdZWU9y/l5apZFH256r1ifVkZ5eOibkZL5pdQQFsQKlg8uH7W9y9k+gLAhqHXifMUX/uX7k4Ihw25N21FJg1FAlCyvoV4RA7rFa1ojhKpQFd5bVLEyKbKslELIeKZG7Bx/iEq8+Fsdo1PfjY4sIxxkYMXIbK2IQLX8AQvbTfn8TTvqGtP96R//lHjGg4y/mL40xODQpVVbD3cAjCMwABSMby8v13H1HJl5me8+EPuhibGuxplZ7JY96xYUOMjrko5U1W/7ZFNpXvuY++Y3MqsyPDW9sA2O12bEYNw7Bj5kpomkoyuiNNysSSSex2O0NeDwH/3ouRaZrY7fZWf30tTWYnK3/61hV+8JOfYberDHm8vPTiC3xm+TJrfw0z8pyL1ZUHRG0R3r76HkPeev1Xv/h5vG4Xmewum9sRzp5eFIauN0FSPYP8/o9/kt/5/hvoupPxkSDh7QiRWJzXL3+KjbUEdzbWqFRMDIeTqZkQ24kYiVQap6bx8ovn+MMHf2E3l+ON736bhZOzom+QaCIhV+6ssnjqJAGfT0QTCfm9H/6Ymyu3ARjxBZgfnubMxCle/vI5kS7typ+/9TbvvHsNs1JBdzpZXpzjW9/8xt6lsGAB0s+zaTQel9F4PcQvnjopSrkS2kD7O8nKnVUZiSdYOjVLwO9vf2G0AnlaqH7syF3Tb8ju1f4LZLHfNZN3P4AAAAAASUVORK5CYII=";
function footerHtml() {
  let btns = "";
  if (A) {
    const today = todayStr();
    const nEmails = S.emails.filter((e) => e.userId === A.user.id && e.createdAt.slice(0, 10) === today).length;
    btns = `<div class="fb-btn"><button class="fbb fbb-fb" data-a="feedback" aria-expanded="${UI.pop === "feedback"}">${icon("message")} Feedback</button><button class="fbb fbb-mail" data-a="emails">${icon("bell")} Email${nEmails ? ` <span class="fbb-n">${nEmails}</span>` : ""}</button></div><span class="foot-sep" aria-hidden="true"></span>`;
  }
  return `<footer class="foot">${btns}<img src="${HGWEB_LOGO}" alt="HG Web logo" width="22" height="30"><span>© 2026 <strong>HG Web</strong>. All rights reserved. Content, design and logo may not be copied without permission.</span></footer>`;
}
function feedbackUi(path) {
  const open = UI.pop === "feedback";
  return `${open ? `<form class="fb-panel" data-f="feedback"><div style="font-weight:600;margin-bottom:8px">Send feedback</div>
    <div class="form-row" style="margin-bottom:8px">${[["SUGGESTION", "Suggestion"], ["PROBLEM", "Something's wrong"], ["QUESTION", "Question"]].map(([k, l], i) => `<label class="chip"><input type="radio" name="kind" value="${k}" ${i === 0 ? "checked" : ""}> ${l}</label>`).join("")}</div>
    <textarea class="in" id="fbText" name="text" placeholder="What would make this better?" required></textarea><input type="hidden" name="page" value="${esc(path)}">
    <div class="form-row" style="margin-top:10px;justify-content:flex-end"><button type="button" class="btn sm" data-a="closePop">Cancel</button><button class="btn sm pri">Send</button></div>
    <div class="hint" style="margin-top:6px">Administrators see it in Administration → Feedback, with this page attached.</div></form>` : ""}`;
}
function modalHtml() { if (UI.modal === "EMAILS") return `<div class="scrim" data-a="closeModal"></div>${emailPanel()}`; if (UI.modal === "LOOKS") return `<div class="scrim" data-a="closeModal"></div><div class="modal lookm" role="dialog" aria-modal="true" aria-label="Choose a look">${looksModalHtml()}</div>`; if (UI.modal === "SEARCH") return `<div class="scrim" data-a="closeModal"></div><div class="modal srchm" role="dialog" aria-modal="true" aria-label="Search">${searchModalHtml()}</div>`; return UI.modal ? `<div class="scrim" data-a="closeModal"></div><div class="modal" role="dialog" aria-modal="true"${UI.modalWide ? ' style="width:min(1100px,calc(100vw - 32px))"' : ""}>${UI.modal}</div>` : ""; }

function vDenied(perm) { return ph("Not available for your role", "") + card("", `<p>This page needs the <span class="mono">${esc(typeof perm === "string" ? perm : "right")}</span> permission. Menus only show what the server would allow — switch role from the yellow bar to see it.</p><button class="btn" data-go="${homeFor()}">Go to my home page</button>`); }
function vNotFound() { return ph("Page not found", "") + card("", `<button class="btn" data-go="${homeFor()}">Go to my home page</button>`); }

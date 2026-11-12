/* ==========================================================================
   views-modules.js — the client picks the modules to see. The first page
   asks which modules to include (and, in the full build, one company or a
   group). Only the chosen modules appear: menus, pages, approvals, reports
   and the Home page links follow the choice. Home, Approvals, Email,
   Calendar, Reports, the audit log and How-to are always there.
   A build made with `build.py --lock single` shows one company only and
   never offers the group.
   Loads after views-setup.js, just before app.js.
   ========================================================================== */
if (window.DEMO_LOCK === "single" || window.DEMO_LOCK === "group") {
  DEMO_SETUP = window.DEMO_LOCK;
  try { localStorage.setItem("demo-erp-setup", DEMO_SETUP); } catch { /* this visit only */ }
}
const DEMO_MODULE_LIST = [
  { k: "hr", name: "HR", icon: "👥", points: ["Timesheets, overtime and banked time", "Time off and balances", "Payroll and pay statements", "Performance reviews", "Certificates and expiry tracking", "Benefits and pension"] },
  { k: "requests", name: "Requests", icon: "📨", points: ["Travel requests and credit card purchases", "Travel and expense claims", "Purchase orders", "Attachments, approval routes and history"] },
  { k: "team", name: "Team", icon: "🧭", points: ["My Team: who is in, who is away", "Tasks: assign, track and report progress", "Team timesheets, time off and requests in one place"] },
  { k: "ops", name: "Operations", icon: "🏗️", points: ["Purchasing, receiving and matching", "Sales orders, shipments and stock", "Projects and contracts"] },
  { k: "finance", name: "Finance", icon: "📊", points: ["Accounting, month-end and budgets", "Bills, invoices and banking", "Can be completely customized to your finance team's needs"] },
];
const DEMO_MODULE_KEYS = DEMO_MODULE_LIST.map((m) => m.k);
let DEMO_MODULES = (() => { try { const v = JSON.parse(localStorage.getItem("demo-erp-modules") || "null"); return Array.isArray(v) ? v.filter((k) => DEMO_MODULE_KEYS.includes(k)) : null; } catch { return null; } })();
const modOn = (k) => !k || k === "core" || !DEMO_MODULES || DEMO_MODULES.includes(k);
const modName = (k) => DEMO_MODULE_LIST.find((m) => m.k === k)?.name || k;

/** which module a page belongs to: the longest matching path wins */
const MOD_PATHS = [
  ["/me/time", "hr"], ["/me/time-off", "hr"], ["/me/profile/events", "hr"], ["/me/profile/employment", "hr"], ["/me/profile/benefits", "hr"], ["/me/reviews", "hr"], ["/me/certifications", "hr"], ["/me/pay", "hr"],
  ["/hr", "hr"], ["/payroll", "hr"], ["/team/hiring", "hr"], ["/reports/timeoff", "hr"], ["/reports/timesheets", "hr"], ["/reports/headcount", "hr"],
  ["/requests", "requests"], ["/me/requests", "requests"], ["/me/expenses", "requests"], ["/hr/requests", "requests"], ["/finance/expenses", "requests"], ["/finance/pos", "requests"], ["/reports/requests", "requests"],
  ["/team", "team"], ["/me/tasks", "team"], ["/team/request-access", "core"],
  ["/procurement", "ops"], ["/sales", "ops"], ["/inventory", "ops"], ["/projects", "ops"], ["/documents/contracts", "ops"], ["/reports/po-history", "ops"],
  ["/finance", "finance"], ["/reports/income-statement", "finance"], ["/reports/balance-sheet", "finance"], ["/reports/trial-balance", "finance"],
];
function modOfPath(path) {
  let best = "core", len = 0;
  for (const [p, k] of MOD_PATHS) if ((path === p || path.startsWith(p + "/")) && p.length > len) { best = k; len = p.length; }
  return best;
}
const modPathOn = (path) => modOn(modOfPath(String(path || "").split("?")[0]));
const MOD_OF_APPROVAL = { PurchaseRequest: "ops", EmployeeRequest: "requests", ApInvoice: "finance", Bill: "finance", JournalEntry: "finance", LeaveRequest: "hr", Timesheet: "hr", PayrollRun: "hr", ExpenseClaim: "requests", RcRequest: "requests", Project: "ops", PurchaseRequisition: "ops", PurchaseOrder: "ops", SalesOrder: "ops" };

/* ---- menus: a tab outside the chosen modules is not shown ---- */
/** a whole menu that belongs to one module (its tabs may also need their own module) */
const MOD_OF_SECTION = { team: "team", "my-tasks": "team", "hr-time": "hr", "hr-talent": "hr", "ops-payroll": "hr", "my-time": "hr", "my-timeoff": "hr", "my-pay": "hr",
  "fin-accounting": "finance", "fin-ap": "finance", "fin-ar": "finance", "fin-banking": "finance", "fin-po": "finance",
  "ops-purchasing": "ops", "ops-sales": "ops", "ops-projects": "ops", "my-requests": "requests" };
for (const s of SECTIONS) for (const t of s.tabs) {
  const k = modOfPath(t.href), ks = MOD_OF_SECTION[s.key] || "core"; if (k === "core" && ks === "core") continue;
  const p = t._xmPerm ?? t.perm;
  t.perm = t._xmPerm = () => modOn(k) && modOn(ks) && hasPermA(p);
}

/* ---- approvals: only what belongs to a chosen module ---- */
{
  const _myActionableMod = myActionable;
  myActionable = function () { return _myActionableMod.apply(this, arguments).filter((i) => modOn(MOD_OF_APPROVAL[i.entityType])); };
  const _myTsMod = myTimesheetsToApprove;
  myTimesheetsToApprove = function () { return modOn("hr") ? _myTsMod.apply(this, arguments) : []; };
  if (typeof tsApprovalCards === "function") { const _tsCardsMod = tsApprovalCards; tsApprovalCards = function () { return modOn("hr") ? _tsCardsMod.apply(this, arguments) : ""; }; }
  const _vApprovalsMod = vApprovals;
  vApprovals = function (q) {
    const html = _vApprovalsMod.call(this, q);
    // "Requests you sent" lists every kind: keep only rows of chosen modules
    if (!DEMO_MODULES) return html;
    return html.replace(/<tr><td><strong>[\s\S]*?<\/tr>/g, (row) => { const t = Object.keys(MOD_OF_APPROVAL).find((k) => row.includes(`<div class="hint">${esc(TYPE_LABEL[k] || k)} ·`)); return t && !modOn(MOD_OF_APPROVAL[t]) ? "" : row; });
  };
}

/* ---- reports: only report cards of chosen modules ---- */
{
  const _vReportsHubMod = vReportsHub;
  vReportsHub = function () {
    const html = _vReportsHubMod.apply(this, arguments);
    if (!DEMO_MODULES) return html;
    const box = document.createElement("div"); box.innerHTML = html;
    box.querySelectorAll(".rcard[data-go]").forEach((c) => { if (!modPathOn(c.dataset.go)) c.remove(); });
    box.querySelectorAll(".grid").forEach((g) => {
      if (g.children.length) return;
      let p = g.previousElementSibling; g.remove();
      while (p && (p.tagName === "P" || p.tagName === "H2")) { const q = p.previousElementSibling; const stop = p.tagName === "H2"; p.remove(); if (stop) break; p = q; }
    });
    return box.innerHTML;
  };
}

/* ---- pages: a page outside the chosen modules says so, with a way to add it ---- */
function vModuleOff(k) {
  return `<div class="ph"><div><h1>${esc(modName(k))} is not in this demo</h1><p>This page belongs to the ${esc(modName(k))} module, which was not chosen on the first page.</p></div></div>
    <div class="hcard"><p style="margin:0 0 12px">You can add it at any time: the people, data and approvals stay the same.</p><button class="btn pri" data-a="setupOpen">Choose modules</button> <button class="btn" data-go="/dashboard">Go to Home</button></div>`;
}
{
  const _renderMod = render;
  render = function () {
    if (DEMO_MODULES) for (const r of ROUTES) if (!r._mod) {
      r._mod = true; const view = r.view;
      r.view = function () { const k = modOfPath(parseRoute(UI.route).path); return modOn(k) ? view.apply(this, arguments) : vModuleOff(k); };
    }
    return _renderMod.apply(this, arguments);
  };
  // Home and other pages: links and cards that lead into a module that is not chosen are left out
  const _afterRenderMod = afterRender;
  afterRender = function () {
    const r = _afterRenderMod.apply(this, arguments);
    if (DEMO_MODULES) try {
      const main = document.querySelector(".content .wrap"); const path = parseRoute(UI.route).path;
      if (main) main.querySelectorAll("[data-go]").forEach((el) => {
        if (modPathOn(el.dataset.go)) return;
        if (path === "/dashboard" || path === "/me") { const card = el.closest(".hcard, .card, .stat, .rcard, .kpi, li, .qa, .tile") || el; if (card !== main && !card.contains(main)) card.remove(); return; }
        // a record that belongs to a module not chosen: leave the row out of shared lists, elsewhere keep the text without the link
        const row = el.closest("tr"); if (row && path.startsWith("/documents")) { row.remove(); return; }
        const span = document.createElement("span"); span.innerHTML = el.innerHTML; span.className = (el.className || "").replace(/\b(btn|link|lnk)\b/g, "").trim(); el.replaceWith(span);
      });
    } catch { /* links only */ }
    return r;
  };
}

/* ---- the first page: setup and modules ---- */
injectCss(`
.setup .mods{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.setup .mod{display:grid;gap:8px;align-content:start;text-align:left;border:1px solid var(--border);border-radius:14px;background:var(--card);color:var(--fg);padding:16px 16px 14px;cursor:pointer;font:inherit;position:relative}
.setup .mod:hover{border-color:var(--primary)}
.setup .mod:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.setup .mod.on{box-shadow:inset 0 0 0 2px var(--primary)}
.setup .mod .mh{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700}
.setup .mod .ck{margin-left:auto;width:22px;height:22px;border-radius:6px;border:2px solid var(--border);display:grid;place-items:center;font-size:14px;color:#fff}
.setup .mod.on .ck{background:var(--primary);border-color:var(--primary)}
.setup .mod ul{margin:0;padding-left:18px;display:grid;gap:3px;font-size:13px;color:var(--muted-fg)}
.setup .step{font-size:12px;letter-spacing:.14em;font-weight:700;color:var(--muted-fg);margin:6px 0 -8px}
.setup .opt.sel{box-shadow:inset 0 0 0 2px var(--primary)}
.setup .always{font-size:12.5px;color:var(--muted-fg);text-align:center;margin:0}
.setup .gobar{display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap}
.setup .gobar .btn{padding:10px 22px;font-size:15px}
.setup .need{color:var(--danger,#b3402a);font-size:13px;font-weight:600}
`);
const SETUP_POINTS = {
  single: ["Alderbrook Holdings · 8 departments · 19 people", "One set of books, no company switching", "Managers approve their own team; director level above $5,000"],
  group: ["Alderbrook Group · 4 companies · 19 people", "Each company keeps its own books", "Switch between companies or see the whole group"],
};
vSetup = function () {
  const d = UI.setupDraft || (UI.setupDraft = { mode: DEMO_SETUP || (window.DEMO_LOCK || "single"), mods: (DEMO_MODULES || DEMO_MODULE_KEYS).slice() });
  const locked = !!window.DEMO_LOCK;
  const opt = (k, title) => `<button type="button" class="opt ${d.mode === k ? "sel" : ""}" data-a="setupMode" data-v="${k}" aria-pressed="${d.mode === k}"><b>${title}</b><ul>${SETUP_POINTS[k].map((p) => `<li>${p}</li>`).join("")}</ul></button>`;
  const mod = (m) => { const on = d.mods.includes(m.k); return `<button type="button" class="mod ${on ? "on" : ""}" data-a="setupMod" data-v="${m.k}" aria-pressed="${on}"><span class="mh"><span aria-hidden="true">${m.icon}</span>${esc(m.name)}<span class="ck" aria-hidden="true">${on ? "✓" : ""}</span></span><ul>${m.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></button>`; };
  const n = (s) => `<div class="step">${s}</div>`;
  return `<div class="setup"><div class="box" style="width:min(1040px,100%)">
    <div class="wm" role="img" aria-label="DEMO ERP"><b>DEMO ERP</b><small>ENTERPRISE RESOURCE PLANNING</small></div>
    <h1>Set up your demo</h1>
    <p class="lead">${locked ? "Choose the modules you want to see." : "Choose how your organization is set up, then the modules you want to see."} The same people, approvals and audit trail run through all of them.</p>
    ${locked ? "" : `${n("STEP 1 · YOUR ORGANIZATION")}<div class="opts">${opt("single", "One company")}${opt("group", "One or more companies")}</div>`}
    ${n(locked ? "CHOOSE YOUR MODULES" : "STEP 2 · CHOOSE YOUR MODULES")}
    <div class="mods">${DEMO_MODULE_LIST.map(mod).join("")}</div>
    <p class="always">Always included: Home, Approvals, Email, Calendar, Reports, the audit log and How-to guides.</p>
    <div class="gobar">${d.mods.length ? "" : `<span class="need">Pick at least one module.</span>`}<button type="button" class="btn pri" data-a="setupGo" ${d.mods.length ? "" : "disabled"}>Open the demo</button>${DEMO_SETUP && DEMO_MODULES ? `<button type="button" class="btn" data-a="setupBack">Back</button>` : ""}</div>
    <p class="setup-note">You can change this later from the sign-in page. All names, figures and identifiers are fictional.</p>
  </div></div>`;
};
{
  const _renderSetupMod = render;
  render = function () {
    if (!DEMO_MODULES && !UI.setupPicking) UI.setupPicking = true;
    return _renderSetupMod.apply(this, arguments);
  };
  const label = () => `${esc(SETUP_LABEL[DEMO_SETUP] || "")} · ${DEMO_MODULES && DEMO_MODULES.length < DEMO_MODULE_KEYS.length ? DEMO_MODULES.map(modName).join(", ") : "All modules"}`;
  const _vLoginMod = vLogin;
  vLogin = function () {
    return _vLoginMod.apply(this, arguments).replace(/Showing: <b>[^<]*<\/b>/, `Showing: <b>${label()}</b>`);
  };
}
function setupCommitModules(mods) {
  DEMO_MODULES = mods.slice();
  try { localStorage.setItem("demo-erp-modules", JSON.stringify(DEMO_MODULES)); } catch { /* this visit only */ }
}
window.ACTIONS_EXT.push({
  setupMode(el) { if (window.DEMO_LOCK) return; UI.setupDraft.mode = el.dataset.v; safeRender(); },
  setupMod(el) { const d = UI.setupDraft, k = el.dataset.v; d.mods = d.mods.includes(k) ? d.mods.filter((x) => x !== k) : DEMO_MODULE_KEYS.filter((x) => x === k || d.mods.includes(x)); safeRender(); },
  setupGo() {
    const d = UI.setupDraft; if (!d || !d.mods.length) return;
    const modsChanged = JSON.stringify(d.mods) !== JSON.stringify(DEMO_MODULES);
    setupCommitModules(d.mods); UI.setupDraft = null;
    if (modsChanged) { UI.route = "/dashboard"; UI.section = null; }
    setupSwitch(window.DEMO_LOCK || d.mode);
  },
  setupOpen() { UI.setupPicking = true; UI.setupDraft = null; UI.modal = null; UI.pop = null; safeRender(); },
  setupBack() { UI.setupPicking = false; UI.setupDraft = null; safeRender(); },
});

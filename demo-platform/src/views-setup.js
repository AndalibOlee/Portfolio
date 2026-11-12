/* ==========================================================================
   views-setup.js — one file, two demos. The first page asks how to show the
   platform: as one company (Alderbrook Holdings with all eight departments,
   the same people, managers and approval chains, one set of books) or as a
   group of four companies. The choice is kept in this browser and can be
   changed from the sign-in page or the demo banner. Each setup keeps its own
   saved activity, so the two demos never mix.
   The one-company data is the group data folded into one company: the same
   chart of accounts (one copy), one set of accounting periods and payroll
   settings, the four bank accounts kept apart, department codes made unique.
   Loads after views-refresh.js, just before app.js.
   ========================================================================== */
injectCss(`
.setup{min-height:100%;display:flex;align-items:center;justify-content:center;padding-block:40px;padding-inline:max(16px,env(safe-area-inset-left,0px));background:var(--bg)}
.setup .box{width:min(860px,100%);display:grid;gap:22px}
.setup .wm{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.setup .wm b{font-size:34px;letter-spacing:.14em;font-weight:800;line-height:1}
.setup .wm small{font-size:11px;letter-spacing:.22em;color:var(--muted-fg);font-weight:600}
.setup h1{font-size:22px;margin:6px 0 0;text-align:center;text-wrap:balance}
.setup .lead{color:var(--muted-fg);text-align:center;margin:0}
.setup .opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.setup .opt{display:grid;gap:10px;align-content:start;text-align:left;border:1px solid var(--border);border-radius:14px;background:var(--card);color:var(--fg);padding:20px;cursor:pointer;font:inherit}
.setup .opt:hover{border-color:var(--primary)}
.setup .opt:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.setup .opt.cur{box-shadow:inset 0 0 0 2px var(--primary)}
.setup .opt b{font-size:17px}
.setup .opt .who{font-size:13px;color:var(--muted-fg)}
.setup .opt ul{margin:0;padding-left:18px;display:grid;gap:4px;font-size:13.5px}
.setup .opt .go{justify-self:start;margin-top:4px}
.setup .setup-note{text-align:center;font-size:12.5px;color:var(--muted-fg);margin:0}
.setup-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:var(--muted-fg);margin:0 0 14px;padding:8px 10px;border:1px solid var(--border);border-radius:9px;background:var(--bg)}
.setup-bar b{color:var(--fg)}
.setup-bar button,.banner .setup-b{border:0;background:none;color:var(--primary);font:inherit;font-weight:600;cursor:pointer;padding:0;text-decoration:underline}
@media (max-width:760px){.banner .setup-w{display:none}}
`);
const SETUP_LABEL = { single: "One company", group: "Group of companies" };

/* ---- the one-company data: the group folded into Alderbrook Holdings ---- */
{
  const KEEP = "ALD", SHORT = { RDG: "Timber", SLL: "Lodges", NBS: "Seafoods" };
  const DEPT_CODES = { dep1: "100", dep2: "110", dep3: "200", dep4: "210", dep5: "300", dep6: "310", dep7: "400", dep8: "410" };
  const TEXT = [["Ridgeline Hourly", "Timber Hourly"], ["Ridgeline Salaried", "Timber Salaried"], ["Ridgeline hourly", "timber hourly"],
    ["Ridgeline Timber", "Alderbrook Holdings"], ["Silver Lake Lodges", "Alderbrook Holdings"], ["Northbay Seafoods", "Alderbrook Holdings"], ["Alderbrook Group", "Alderbrook Holdings"], ["Intercompany management fee", "Internal management fee"]];
  const fold = (S0) => {
    const map = new Map();
    // journal entries were numbered per company: number them again as one book, and keep the audit log in step
    const jeNo = new Map(), perYear = {};
    for (const j of [...S0.journalEntries].sort((x, y) => String(x.date).localeCompare(String(y.date)) || String(x.postedAt || "").localeCompare(String(y.postedAt || "")) || String(x.entryNumber).localeCompare(String(y.entryNumber)))) {
      const y = String(j.date || "").slice(0, 4) || "2026"; perYear[y] = (perYear[y] || 0) + 1;
      const n = `JE-${y}-${String(perYear[y]).padStart(5, "0")}`; jeNo.set(`${j.companyId}|${j.entryNumber}`, n); j.entryNumber = n;
    }
    for (const x of S0.audit || []) if (x.summary && x.companyId) x.summary = x.summary.replace(/JE-\d{4}-\d{5}/g, (m) => jeNo.get(`${x.companyId}|${m}`) || m);
    // the same post in several operations gets the operation in its title
    const titles = new Map(); for (const p of S0.positions) titles.set(p.title, (titles.get(p.title) || 0) + 1);
    for (const p of S0.positions) if (titles.get(p.title) > 1 && p.companyId !== KEEP && SHORT[p.companyId]) p.title = `${p.title} — ${SHORT[p.companyId]}`;
    for (const c of S0.companies) if (c.id !== KEEP) map.set(c.id, KEEP);
    // accounts: one chart; each company's bank keeps its own ledger account
    const bankGl = new Set(S0.bankAccounts.filter((b) => b.companyId !== KEEP).map((b) => b.glAccountId));
    const keepNo = new Map(S0.accounts.filter((a) => a.companyId === KEEP).map((a) => [a.number, a.id]));
    let bankNo = 1010;
    const goneAcct = new Set();
    for (const a of S0.accounts) {
      if (a.companyId === KEEP) continue;
      if (bankGl.has(a.id)) { a.number = String(++bankNo); a.name = `${a.name} — ${SHORT[a.companyId] || a.companyId}`; continue; }
      const k = keepNo.get(a.number); if (k) { map.set(a.id, k); goneAcct.add(a.id); }
    }
    for (const b of S0.bankAccounts) if (b.companyId !== KEEP) b.name = `${SHORT[b.companyId] || ""} Operating`.trim();
    // one set of accounting periods and payroll settings
    const keepFp = new Map(S0.fiscalPeriods.filter((p) => p.companyId === KEEP).map((p) => [`${p.fiscalYear}|${p.periodNumber}`, p.id]));
    const goneFp = new Set(); for (const p of S0.fiscalPeriods) if (p.companyId !== KEEP) { const k = keepFp.get(`${p.fiscalYear}|${p.periodNumber}`); if (k) { map.set(p.id, k); goneFp.add(p.id); } }
    const keepPs = (S0.payrollSettings || []).find((p) => p.companyId === KEEP);
    const gonePs = new Set(); for (const p of S0.payrollSettings || []) if (keepPs && p.companyId !== KEEP) { map.set(p.id, keepPs.id); gonePs.add(p.id); }
    S0.companies = S0.companies.filter((c) => c.id === KEEP);
    S0.accounts = S0.accounts.filter((a) => !goneAcct.has(a.id));
    S0.fiscalPeriods = S0.fiscalPeriods.filter((p) => !goneFp.has(p.id));
    S0.payrollSettings = (S0.payrollSettings || []).filter((p) => !gonePs.has(p.id));
    // every reference to a folded company, account, period or setting now points at the kept one; names follow
    const swap = (x) => { if (map.has(x)) return map.get(x); let t = x; for (const [a, b] of TEXT) if (t.includes(a)) t = t.split(a).join(b); return t; };
    const walk = (v) => {
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const x = v[i]; if (typeof x === "string") v[i] = swap(x); else if (x && typeof x === "object") walk(x); } return; }
      for (const k of Object.keys(v)) {
        const x = v[k];
        if (typeof x === "string") v[k] = swap(x); else if (x && typeof x === "object") walk(x);
        if (map.has(k)) { const nk = map.get(k); if (!(nk in v)) v[nk] = v[k]; delete v[k]; }
      }
    };
    for (const k of Object.keys(S0)) { const v = S0[k]; if (v && typeof v === "object") walk(v); }
    // the kept company describes the whole business
    const c = S0.companies[0]; if (c) c.industry = "Head office, timber, lodges & seafood";
    for (const d of S0.departments) if (DEPT_CODES[d.id]) d.code = DEPT_CODES[d.id];
    // no duplicate role rows after the fold
    const seen = new Set(); S0.userRoles = S0.userRoles.filter((r) => { const k = `${r.userId}|${r.companyId}|${r.roleCode}`; if (seen.has(k)) return false; seen.add(k); return true; });
    return S0;
  };
  const _freshStateSetup = freshState;
  freshState = function () { const S0 = _freshStateSetup(); return DEMO_SETUP === "single" ? fold(S0) : S0; };
}

/* ---- wording on the screens: one company, not a group ---- */
{
  const ONE = [[/all your companies/g, () => S.companies[0]?.displayName || "the company"], [/the whole group/g, () => S.companies[0]?.displayName || "the company"],
    [/All companies/g, () => "All"], [/all companies/g, () => S.companies[0]?.displayName || "the company"],
    [/across the group/g, () => "across the company"], [/in the group\b/g, () => "in the company"], [/How each company is organized/g, () => "How the company is organized"],
    [/What each company sells/g, () => "What the company sells"], [/each company's/g, () => "the company's"]];
  const _afterRenderSetup = afterRender;
  afterRender = function () {
    const r = _afterRenderSetup.apply(this, arguments);
    if (DEMO_SETUP === "single") try {
      const w = document.createTreeWalker(document.getElementById("app"), NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) { let t = n.nodeValue; if (!/compan|group/i.test(t)) continue; for (const [re, f] of ONE) t = t.replace(re, f); if (t !== n.nodeValue) n.nodeValue = t; }
      document.querySelectorAll("#app option").forEach((o) => { if (o.textContent === "All companies") o.textContent = "All"; });
    } catch { /* wording only */ }
    return r;
  };
}

/* ---- inter-company charges only exist in the group setup ---- */
{
  for (const s of SECTIONS) for (const t of s.tabs) if (t.href === "/finance/interco") { const p = t._xmPerm ?? t.perm; t.perm = t._xmPerm = () => DEMO_SETUP !== "single" && hasPermA(p); }
}

/* ---- the first page: how do you want to see the demo? ---- */
function vSetup() {
  const cur = DEMO_SETUP;
  const card = (k, title, who, points) => `<button type="button" class="opt ${cur === k ? "cur" : ""}" data-a="setupPick" data-v="${k}"><b>${title}</b><span class="who">${who}</span><ul>${points.map((p) => `<li>${p}</li>`).join("")}</ul><span class="btn pri go">${cur === k ? "Continue" : "Show this"}</span></button>`;
  return `<div class="setup"><div class="box">
    <div class="wm" role="img" aria-label="DEMO ERP"><b>DEMO ERP</b><small>ENTERPRISE RESOURCE PLANNING</small></div>
    <h1>How do you want to see the demo?</h1>
    <p class="lead">Both use the same people, departments and approvals. Pick the one that looks like your organization.</p>
    <div class="opts">
      ${card("single", "One company", "Alderbrook Holdings · 8 departments · 19 people", ["One set of books, one bank feed per operation", "Managers approve their own team's requests", "Director level above $5,000, Finance processes and pays", "No company switching"])}
      ${card("group", "Group of companies", "Alderbrook Group · 4 companies · 19 people", ["Each company keeps its own books and bank account", "Inter-company charges and group reports", "Switch between companies or see the whole group", "Same managers and approval chains"])}
    </div>
    ${cur ? `<p class="setup-note"><button type="button" class="btn" data-a="setupBack">Back</button></p>` : `<p class="setup-note">You can change this later from the sign-in page. All names, figures and identifiers are fictional.</p>`}
  </div></div>`;
}
{
  const _renderSetup = render;
  render = function () {
    if (!DEMO_SETUP || UI.setupPicking) { A = null; $app().innerHTML = vSetup(); render._route = "setup"; return; }
    return _renderSetup.apply(this, arguments);
  };
  const _vLoginSetup = vLogin;
  vLogin = function () {
    const h = _vLoginSetup.apply(this, arguments);
    const bar = `<div class="setup-bar">Showing: <b>${SETUP_LABEL[DEMO_SETUP] || ""}</b><button type="button" data-a="setupOpen">Change</button></div>`;
    return h.replace('<div class="formp"><div class="box">', `<div class="formp"><div class="box">${bar}`);
  };
  const _bannerSetup = banner;
  banner = function () {
    const h = _bannerSetup.apply(this, arguments);
    return h.replace('<button data-a="switchRole">Switch role</button>', `<button data-a="switchRole">Switch role</button><span class="setup-w"> · ${esc(SETUP_LABEL[DEMO_SETUP] || "")} <button class="setup-b" data-a="setupOpen">change</button></span>`);
  };
}
function setupSwitch(mode) {
  const changed = mode !== DEMO_SETUP;
  DEMO_SETUP = mode; try { localStorage.setItem("demo-erp-setup", mode); } catch { /* kept for this visit */ }
  UI.setupPicking = false;
  if (changed) {
    Object.assign(UI, { userId: null, activeCompanyId: null, chosenCompany: false, route: "/", modal: null, pop: null, section: null });
    savePrefs();
    if (SYNC.db) { try { SYNC.unsub?.(); } catch { /* already closed */ } SYNC.events = []; SYNC.seenIds = new Set(); SYNC.booted = false; subscribeEvents(); }
    else if (SYNC.mode === "local") { try { SYNC.events = JSON.parse(localStorage.getItem(localEventsKey()) || "[]"); } catch { SYNC.events = []; } }
    rebuild();
  }
  safeRender();
}
window.ACTIONS_EXT.push({
  setupPick(el) { setupSwitch(el.dataset.v); },
  setupOpen() { UI.setupPicking = true; UI.modal = null; UI.pop = null; safeRender(); },
  setupBack() { UI.setupPicking = false; safeRender(); },
});

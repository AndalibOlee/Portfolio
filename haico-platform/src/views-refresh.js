/* ==========================================================================
   views-refresh.js — demo data dated for the presentation, and a sidebar that
   keeps its scroll position when you pick a page.
   The demo records were written around 2 Oct 2026. Every operational date in
   the starting data moves forward three weeks (whole weeks, so weekdays stay
   the same); the pay-period anchor moves with them so pay periods still line
   up. Calendar facts stay put: stat holidays, fiscal periods, tax tables,
   birth dates, and anything dated before June 2026 (hire dates, assets).
   Loads last, just before app.js.
   ========================================================================== */
const DEMO_SHIFT_DAYS = 21;
{
  const KEEP_LISTS = new Set(["statHolidays", "statHolidaysRemoved", "fiscalPeriods", "taxConfigs", "payrollSettings", "leaveTypes", "budgets", "budgetLines"]);
  const KEEP_KEYS = new Set(["birthDate", "dateOfBirth", "dob"]);
  const re = /^(\d{4}-\d{2}-\d{2})(.*)$/s;
  const move = (s) => {
    const m = re.exec(s); if (!m || m[1] < "2026-06-01" || m[1] > "2027-12-31") return s;
    const t = m[2];
    if (t && !/^T\d{2}:\d{2}/.test(t)) return s; // only plain dates and timestamps
    return addDays(m[1], DEMO_SHIFT_DAYS) + t;
  };
  const walk = (v) => {
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { if (typeof v[i] === "string") v[i] = move(v[i]); else if (v[i] && typeof v[i] === "object") walk(v[i]); } return; }
    for (const k of Object.keys(v)) {
      if (KEEP_KEYS.has(k)) continue;
      const x = v[k];
      if (typeof x === "string") v[k] = move(x);
      else if (x && typeof x === "object") walk(x);
    }
  };
  const _freshStateRefresh = freshState;
  freshState = function () {
    const S0 = _freshStateRefresh();
    for (const k of Object.keys(S0)) { if (KEEP_LISTS.has(k)) continue; const v = S0[k]; if (v && typeof v === "object") walk(v); }
    // stat days filled in on timesheets follow the real holidays, not the moved dates
    let n = 0; const ctx = { id: (p) => `${p}_rf${++n}` };
    const sheets = S0.timesheets.filter((t) => S0.timesheetEntries.some((e) => e.timesheetId === t.id && e.isAutoFilled && e.statHours && !e.sourceLeaveRequestId));
    if (sheets.length) {
      const ids = new Set(sheets.map((t) => t.id));
      S0.timesheetEntries = S0.timesheetEntries.filter((e) => !(ids.has(e.timesheetId) && e.isAutoFilled && e.statHours && !e.sourceLeaveRequestId));
      for (const t of sheets) { try { autofillStats(S0, ctx, t); recomputeSheet(S0, t); } catch { /* leave the sheet as it was */ } }
    }
    return S0;
  };
}

/* ---- the sidebar stays where you scrolled it when a page opens ---- */
{
  const SIDE = { nav: 0, side: 0 };
  document.addEventListener("scroll", (ev) => {
    const t = ev.target; if (!(t instanceof Element)) return;
    if (t.matches(".side nav")) SIDE.nav = t.scrollTop; else if (t.matches(".side")) SIDE.side = t.scrollTop;
  }, true);
  const _afterRenderSide = afterRender;
  afterRender = function () {
    const r = _afterRenderSide.apply(this, arguments);
    try { const nav = document.querySelector(".side nav"), side = document.querySelector(".side"); if (nav) nav.scrollTop = SIDE.nav; if (side) side.scrollTop = SIDE.side; } catch { /* no sidebar on this screen */ }
    return r;
  };
}

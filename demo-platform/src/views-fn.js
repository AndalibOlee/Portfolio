/* ==========================================================================
   views-fn.js — the demo's departments, job titles and expense codes read as
   a First Nation government: Administration, Finance & Human Resources,
   Public Works, Lands & Natural Resources, Housing, Health & Social
   Development, Education, and Culture & Recreation. Expense codes keep their
   numbers; their names follow, and a few community codes are added.
   Runs last inside freshState, so every record, request and log line made
   from the demo data uses the new names.
   ========================================================================== */
const FN_DEPTS = { dep1: "Administration", dep2: "Finance & Human Resources", dep3: "Public Works", dep4: "Lands & Natural Resources", dep5: "Housing", dep6: "Health & Social Development", dep7: "Education", dep8: "Culture & Recreation" };
const FN_TITLES = { e1: "Chief Executive Officer", e2: "Executive Director", e6: "Public Works Manager", e7: "Public Works Supervisor", e9: "Natural Resources Technician", e11: "Housing Manager", e12: "Health Programs Manager", e13: "Housing Officer", e15: "Director of Education", e16: "Education Coordinator", e17: "Education Assistant", e18: "Recreation Coordinator" };
const FN_TEXT = [["Guest Services Manager", "Health Programs Manager"], ["Guest Services", "Health & Social Development"], ["Harvest Operations", "Public Works"], ["Silviculture", "Lands & Natural Resources"], ["Lodge Operations", "Housing"],
  ["Forestry Technician", "Natural Resources Technician"], ["Cultural Guide", "Housing Officer"], ["Fish Processor", "Education Assistant"], ["Line Lead", "Education Coordinator"], ["Quality Technician", "Recreation Coordinator"], ["Field Supervisor", "Public Works Supervisor"]];
const FN_ACCOUNTS = { "5205": "Program Supplies", "5215": "Tools & Equipment", "5300": "Travel & Meals", "5320": "Honoraria (Elders & Guests)", "5330": "Training & Professional Development",
  "5410": "Building & Housing Maintenance", "5420": "Utilities", "5430": "Fuel & Vehicles", "5440": "Insurance", "5500": "Professional Fees", "5510": "Administration Fees", "5900": "Other Expenses" };
const FN_NEW_ACCOUNTS = [["5340", "Community Events & Gatherings"], ["5350", "Culture & Language Programs"], ["5360", "Elders Support"], ["5370", "Education Supplies"], ["5380", "Health Program Supplies"]];
{
  const _freshStateFn = freshState;
  freshState = function () {
    const S0 = _freshStateFn();
    const oldAcct = new Map(S0.accounts.filter((a) => FN_ACCOUNTS[a.number]).map((a) => [a.name, FN_ACCOUNTS[a.number]]));
    // text everywhere (requests, postings, job ads, log lines): old department, title and expense-code names
    const pairs = [...FN_TEXT, ...[...oldAcct].filter(([a, b]) => a !== b && a.length > 5)];
    const swap = (t) => { if (typeof t !== "string" || t.length < 4) return t; for (const [a, b] of pairs) if (t.includes(a)) t = t.split(a).join(b); return t; };
    const walk = (v) => {
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const x = v[i]; if (typeof x === "string") v[i] = swap(x); else if (x && typeof x === "object") walk(x); } return; }
      for (const k of Object.keys(v)) { const x = v[k]; if (typeof x === "string") v[k] = swap(x); else if (x && typeof x === "object") walk(x); }
    };
    for (const k of Object.keys(S0)) { const v = S0[k]; if (v && typeof v === "object") walk(v); }
    for (const d of S0.departments) if (FN_DEPTS[d.id]) d.name = FN_DEPTS[d.id];
    for (const [eid, title] of Object.entries(FN_TITLES)) { const e = byId(S0.employees, eid), p = e && byId(S0.positions, e.positionId); if (p) p.title = title; }
    for (const a of S0.accounts) if (FN_ACCOUNTS[a.number]) a.name = FN_ACCOUNTS[a.number];
    // community expense codes, in every company that has the training code
    for (const base of S0.accounts.filter((a) => a.number === "5330")) for (const [num, name] of FN_NEW_ACCOUNTS) {
      if (S0.accounts.some((a) => a.companyId === base.companyId && a.number === num)) continue;
      S0.accounts.push({ ...base, id: `${base.id}-fn${num}`, number: num, name });
    }
    return S0;
  };
}

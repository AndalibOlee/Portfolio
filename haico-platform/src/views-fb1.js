/* ==========================================================================
   views-fb1.js — review round 1: the changes written on the demo's pages
   with "Request a change" (Kiona, Tyler, Nadia, Shawna). Each block names
   the page and the note it answers. Additive: new fields and collections
   only; nothing existing is dropped.
   ========================================================================== */

/* ---------------- shared ---------------- */
const fbFinance = (a = A) => !!a && (can(a, "finance.view") || can(a, "ap.view"));
const fbRole = (a, ...codes) => !!a && (a.isSuper || a.roleCodes.some((r) => codes.includes(r)));
injectCss(`
.fb-grid3{display:grid;gap:14px;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 0 16px}
@media (max-width:900px){.fb-grid3{grid-template-columns:minmax(0,1fr)}}
.fb-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--border)}
.fb-bar input[type=search]{flex:1 1 240px;min-width:0}.fb-bar select{flex:0 1 200px;min-width:0}
.fb-sort{border:0;background:transparent;color:var(--muted-fg);cursor:pointer;font-size:10px;padding:0 0 0 4px;line-height:1;vertical-align:middle}
.fb-sort.on{color:var(--fg)}
th .fb-sort:focus-visible{outline:2px solid var(--ring);outline-offset:1px}
.fb-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border);border-radius:999px;padding:2px 4px 2px 9px;font-size:12px;margin:0 4px 4px 0;background:var(--card)}
.fb-chip button{border:0;background:transparent;color:var(--muted-fg);cursor:pointer;font-size:12px;padding:0 4px}
.fb-mail{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);height:min(72vh,720px);border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card)}
@media (max-width:760px){.fb-mail{grid-template-columns:minmax(0,1fr);height:auto}.fb-mail .fb-list{max-height:40vh}}
.fb-list{overflow-y:auto;border-right:1px solid var(--border);background:var(--bg)}
.fb-li{display:grid;gap:2px;width:100%;text-align:left;border:0;border-bottom:1px solid var(--border);background:transparent;color:var(--fg);padding:10px 12px;cursor:pointer;font:inherit}
.fb-li.on{background:var(--card);box-shadow:inset 3px 0 0 var(--primary)}
.fb-li .r1{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:600}.fb-li .r1 span:last-child{font-weight:400;color:var(--muted-fg);white-space:nowrap}
.fb-li .sj{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fb-li .pv{font-size:12px;color:var(--muted-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fb-read{overflow-y:auto;padding:18px 22px;min-width:0}
.fb-read h3{font-size:18px;margin:0 0 10px;line-height:1.3}
.fb-hdr{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 10px;font-size:13px;padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:12px}
.fb-hdr dt{color:var(--muted-fg)}.fb-hdr dd{margin:0;overflow-wrap:anywhere}
.fb-av{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--primary);color:var(--primary-fg);font-weight:700;font-size:13px;flex:none}
.fb-att{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.fb-att button{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--fg);padding:8px 12px;cursor:pointer;font:inherit;text-align:left}
.fb-att .ic{display:inline-grid;place-items:center;width:30px;height:36px;border-radius:4px;background:#b3261e;color:#fff;font-size:10px;font-weight:700}
.fb-body p{margin:0 0 10px;font-size:14px;line-height:1.55;overflow-wrap:anywhere}
`);

/* ---------------- menus: tab order, removed tabs, new tabs and the Finance › PO item ---------------- */
{
  const sec = (k) => SECTIONS.find((s) => s.key === k);
  // Shawna, Onboarding: "after Onboarding: Certificates, then Hiring, then Hiring requests"
  const ppl = sec("people");
  if (ppl) { const order = ["/hr/employees", "/people/directory", "/people/org-chart", "/hr/departments", "/hr/onboarding", "/hr/certifications", "/hr/hiring", "/hr/hiring-requests"]; ppl.tabs.sort((a, b) => (order.indexOf(a.href) < 0 ? 99 : order.indexOf(a.href)) - (order.indexOf(b.href) < 0 ? 99 : order.indexOf(b.href))); }
  // Nadia, Requests & Expenses: remove the "Employee requests" tab (the old requests stay on record)
  const ap = sec("fin-ap"); if (ap) ap.tabs = ap.tabs.filter((t) => t.href !== "/hr/requests");
  // Nadia, Accounts Receivable: a Customers tab
  const ar = sec("fin-ar"); if (ar) ar.tabs.push({ href: "/finance/ar/customers", label: "Customers", perm: "ar.view" });
  // Kiona, My Timesheet: stat holidays set by HR and payroll, under Payroll
  const pay = sec("ops-payroll"); if (pay) pay.tabs.push({ href: "/payroll/holidays", label: "Stat holidays", perm: () => fbRole(A, "HR_MANAGER", "PAYROLL_ADMIN", "GROUP_ADMIN", "SUPER_ADMIN") || can(A, "payroll.view") });
  // Nadia, sidebar: Finance › PO — every purchase order, view only, for Finance
  const po = { key: "fin-po", label: "PO", tabs: [{ href: "/finance/pos", label: "Purchase orders", perm: () => fbFinance() }] };
  SECTIONS.push(po); SECTION_BY_KEY[po.key] = po;
  const _buildNavFb = buildNav;
  buildNav = function () {
    const groups = _buildNavFb();
    const href = sectionHref("fin-po"); if (!href) return groups;
    const item = { title: "PO", href, icon: "cart", section: "fin-po", badge: 0 };
    let g = groups.find((x) => x.label === "Finance");
    if (!g) { g = { label: "Finance", flat: false, items: [] }; const at = groups.findIndex((x) => ["Operations", "Reports", "Administration"].includes(x.label)); groups.splice(at < 0 ? groups.length : at, 0, g); }
    g.items.push(item);
    return groups;
  };
}

/* ---------------- Stat holidays (Kiona, My Timesheet) ---------------- */
const fbHolidayEditor = (a = A) => fbRole(a, "HR_MANAGER", "PAYROLL_ADMIN", "GROUP_ADMIN", "SUPER_ADMIN");
Object.assign(R, {
  "stat.save"(S0, p, ctx) {
    if (!fbHolidayEditor(ctx.auth)) fail("Only HR, the payroll administrator or an administrator can change stat holidays.");
    const date = String(p.date || ""), name = String(p.name || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("Choose the date."); if (!name) fail("Name the holiday."); if (name.length > 80) fail("Keep the name under 80 characters.");
    if (S0.statHolidays.some((h) => h.date === date && h.id !== p.id)) fail(`${dLong(date)} is already a stat holiday.`);
    if (p.id) {
      const h = byId(S0.statHolidays, p.id); if (!h) fail("That holiday no longer exists.");
      const was = `${h.name} (${dLong(h.date)})`; Object.assign(h, { date, name, year: Number(date.slice(0, 4)), updatedByName: ctx.actor.displayName, updatedAt: ctx.now });
      ctx.audit({ module: "payroll", action: "UPDATE", summary: `${ctx.actor.displayName} changed stat holiday ${was} to ${name} (${dLong(date)}).` });
    } else {
      S0.statHolidays.push({ id: ctx.id("sh"), province: "BC", date, name, year: Number(date.slice(0, 4)), addedByName: ctx.actor.displayName, addedAt: ctx.now });
      ctx.audit({ module: "payroll", action: "CREATE", summary: `${ctx.actor.displayName} added stat holiday ${name} on ${dLong(date)}.` });
    }
  },
  "stat.remove"(S0, p, ctx) {
    if (!fbHolidayEditor(ctx.auth)) fail("Only HR, the payroll administrator or an administrator can change stat holidays.");
    const h = byId(S0.statHolidays, p.id); if (!h) fail("That holiday no longer exists.");
    S0.statHolidays = S0.statHolidays.filter((x) => x.id !== h.id);
    (S0.statHolidaysRemoved = S0.statHolidaysRemoved || []).push({ ...h, removedByName: ctx.actor.displayName, removedAt: ctx.now }); // kept on record
    ctx.audit({ module: "payroll", action: "STATUS_CHANGE", summary: `${ctx.actor.displayName} removed stat holiday ${h.name} (${dLong(h.date)}).` });
  },
});
function vFbHolidays() {
  const edit = fbHolidayEditor(), year = Number(UI.tabs.fbHolYear || todayStr().slice(0, 4));
  const years = [...new Set([year, ...S.statHolidays.map((h) => Number(h.year || h.date.slice(0, 4)))])].sort();
  const list = S.statHolidays.filter((h) => h.date.startsWith(String(year))).sort((a, b) => (a.date < b.date ? -1 : 1));
  const cur = UI.fbHol ? byId(S.statHolidays, UI.fbHol) : null, t = todayStr();
  const days = (d) => Math.round((new Date(d + "T00:00:00Z") - new Date(t + "T00:00:00Z")) / 86400000);
  const rows = list.map((h) => `<tr><td style="white-space:nowrap">${esc(dLong(h.date))}</td><td>${esc(DOW[dowOf(h.date)])}${isWeekend(h.date) ? ` <span class="badge tone-grey">weekend</span>` : ""}</td><td><strong>${esc(h.name)}</strong>${h.addedByName ? `<div class="hint">added by ${esc(h.addedByName)}</div>` : h.updatedByName ? `<div class="hint">changed by ${esc(h.updatedByName)}</div>` : ""}</td><td class="r">${days(h.date) < 0 ? `<span class="hint">past</span>` : days(h.date) === 0 ? "today" : `in ${days(h.date)} days`}</td>
    <td class="r" style="white-space:nowrap">${edit ? `<button class="btn sm" data-a="fbHolEdit" data-id="${h.id}">Edit</button> <button class="btn sm" data-a="fbHolDel" data-id="${h.id}">Remove</button>` : ""}</td></tr>`);
  const form = edit ? card(cur ? `Change ${esc(cur.name)}` : "Add a stat holiday", `<form data-f="fbHol" class="form-grid"${cur ? ` data-id="${cur.id}"` : ""}><div class="fld"><label for="fbHolD">Date</label><input class="in" type="date" id="fbHolD" name="date" required value="${esc(cur?.date || "")}"></div><div class="fld"><label for="fbHolN">Name</label><input class="in" id="fbHolN" name="name" required maxlength="80" placeholder="e.g. National Day for Truth and Reconciliation" value="${esc(cur?.name || "")}"></div><div class="form-row" style="grid-column:1/-1"><button class="btn pri">${cur ? "Save" : "Add holiday"}</button>${cur ? `<button type="button" class="btn" data-a="fbHolCancel">Cancel</button>` : ""}</div></form><p class="hint" style="margin:10px 0 0">Timesheets fill a stat holiday in for everyone (${settingsFor(S, A.employee?.companyId || "HAICO").standardHoursPerDay ?? 7} hours), and time off never counts it. Every change is in the audit log.</p>`) : "";
  return ph("Stat holidays", edit ? "The paid holidays every timesheet and time-off request works from. HR and the payroll administrator keep this list." : "The paid holidays every timesheet and time-off request works from. HR and the payroll administrator keep this list; you can view it.") + flashHtml()
    + `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px">${years.map((y) => `<button class="hchip ${y === year ? "on" : ""}" data-a="fbHolYear" data-v="${y}">${y} <span>${S.statHolidays.filter((h) => h.date.startsWith(String(y))).length}</span></button>`).join("")}${edit ? `<button class="hchip" data-a="fbHolYear" data-v="${years[years.length - 1] + 1}">+ ${years[years.length - 1] + 1}</button>` : ""}</div>`
    + `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,360px);align-items:start" id="fbHolGrid">${cardFlush(`${year} — ${list.length} holiday${list.length === 1 ? "" : "s"}`, table(["Date", "Day", "Holiday", ">When", ""], rows, `No stat holidays for ${year} yet.`))}${form}</div><style>@media (max-width:900px){#fbHolGrid{grid-template-columns:minmax(0,1fr)!important}}</style>`;
}
hr3Route("/payroll/holidays", () => fbHolidayEditor() || can(A, "payroll.view"), vFbHolidays);

/* ---------------- Customers (Nadia, Accounts Receivable) ---------------- */
Object.assign(R, {
  "customer.save"(S0, p, ctx) {
    ctx.need("ar.create");
    const name = String(p.name || "").trim(); if (!name) fail("Enter the customer's name.");
    const terms = Math.round(Number(p.paymentTermsDays)); if (!(terms >= 0 && terms <= 120)) fail("Payment terms must be between 0 and 120 days.");
    const email = String(p.email || "").trim(); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("That email address doesn't look right.");
    const fields = { name, contactName: String(p.contactName || "").trim(), email, phone: String(p.phone || "").trim(), address: String(p.address || "").trim(), paymentTermsDays: terms, status: p.status === "INACTIVE" ? "INACTIVE" : "ACTIVE" };
    if (p.id) {
      const c = byId(S0.customers, p.id); if (!c) fail("That customer no longer exists."); ctx.company(c.companyId);
      if (S0.customers.some((x) => x.id !== c.id && x.companyId === c.companyId && x.name.toLowerCase() === name.toLowerCase())) fail(`${co(c.companyId).displayName} already has a customer called ${name}.`);
      const was = c.status; Object.assign(c, fields, { updatedByName: ctx.actor.displayName, updatedAt: ctx.now });
      ctx.audit({ module: "finance.ar", action: "UPDATE", companyId: c.companyId, summary: `${ctx.actor.displayName} updated customer ${c.customerNumber} ${name}${was !== c.status ? ` (now ${c.status === "ACTIVE" ? "active" : "inactive"})` : ""}.` });
    } else {
      const cid = p.companyId; ctx.company(cid); if (!byId(S0.companies, cid)) fail("Choose the company.");
      if (S0.customers.some((x) => x.companyId === cid && x.name.toLowerCase() === name.toLowerCase())) fail(`${co(cid).displayName} already has a customer called ${name}.`);
      const num = nextNum(S0.customers.map((c) => c.customerNumber), "C-", 4);
      S0.customers.push({ id: ctx.id("cu"), companyId: cid, customerNumber: num, ...fields, createdByName: ctx.actor.displayName, createdAt: ctx.now });
      ctx.audit({ module: "finance.ar", action: "CREATE", companyId: cid, summary: `${ctx.actor.displayName} added customer ${num} ${name} (${co(cid).displayName}).` });
    }
  },
});
function vFbCustomers() {
  const canEdit = can(A, "ar.create"), list = inScope(S.customers).sort((a, b) => a.name.localeCompare(b.name));
  const owed = (c) => S.arInvoices.filter((i) => i.customerId === c.id && ["SENT", "PARTIALLY_PAID", "OVERDUE", "APPROVED"].includes(i.status)).reduce((s, i) => s + i.totalCents - (i.paidCents || 0), 0);
  const cur = UI.fbCu ? byId(S.customers, UI.fbCu) : null, cos = S.companies.filter((c) => scopeIds(S, A).includes(c.id));
  const rows = list.map((c) => `<tr data-fbq="${esc([c.customerNumber, c.name, c.contactName, c.email, co(c.companyId).displayName].join(" ").toLowerCase())}"><td class="mono">${esc(c.customerNumber)}</td><td><strong>${esc(c.name)}</strong>${c.address ? `<div class="hint">${esc(c.address)}</div>` : ""}</td><td>${coTag(c.companyId)}</td><td>${esc(c.contactName || "—")}${c.email || c.phone ? `<div class="hint">${esc([c.email, c.phone].filter(Boolean).join(" · "))}</div>` : ""}</td>${td(`${c.paymentTermsDays ?? 30} days`, 1)}${td(money(owed(c)), 1)}<td>${c.status === "INACTIVE" ? `<span class="badge tone-grey">Inactive</span>` : `<span class="badge tone-green">Active</span>`}</td><td class="r">${canEdit ? `<button class="btn sm" data-a="fbCuEdit" data-id="${c.id}">Edit</button>` : ""}</td></tr>`);
  const v = (k, d = "") => esc(cur?.[k] ?? d);
  const form = canEdit ? card(cur ? `Edit ${esc(cur.name)}` : "Add a customer", `<form data-f="fbCu" class="form-grid"${cur ? ` data-id="${cur.id}"` : ""}>
      <div class="fld" style="grid-column:1/-1"><label for="fbCuN">Customer name</label><input class="in" id="fbCuN" name="name" required value="${v("name")}"></div>
      ${cur ? `<div class="fld"><label>Company</label><div class="in" style="display:flex;align-items:center">${esc(co(cur.companyId).displayName)}</div></div>` : `<div class="fld"><label for="fbCuC">Company</label><select class="in" id="fbCuC" name="companyId" required>${cos.map((c) => opt(c.id, c.displayName, c.id === (A.activeCompanyId || cos[0]?.id))).join("")}</select></div>`}
      <div class="fld"><label for="fbCuTerm">Payment terms (days)</label><input class="in num" type="number" min="0" max="120" id="fbCuTerm" name="paymentTermsDays" value="${v("paymentTermsDays", 30)}"></div>
      <div class="fld"><label for="fbCuP">Contact person</label><input class="in" id="fbCuP" name="contactName" value="${v("contactName")}"></div><div class="fld"><label for="fbCuE">Email</label><input class="in" type="email" id="fbCuE" name="email" value="${v("email")}"></div>
      <div class="fld"><label for="fbCuPh">Phone</label><input class="in" id="fbCuPh" name="phone" value="${v("phone")}"></div><div class="fld"><label for="fbCuS">Status</label><select class="in" id="fbCuS" name="status">${opt("ACTIVE", "Active — can be invoiced", cur?.status !== "INACTIVE")}${opt("INACTIVE", "Inactive — kept, not invoiced", cur?.status === "INACTIVE")}</select></div>
      <div class="fld" style="grid-column:1/-1"><label for="fbCuA">Billing address</label><input class="in" id="fbCuA" name="address" value="${v("address")}"></div>
      <div class="form-row" style="grid-column:1/-1"><button class="btn pri">${cur ? "Save changes" : "Add customer"}</button>${cur ? `<button type="button" class="btn" data-a="fbCuCancel">Cancel</button>` : ""}</div></form><p class="hint" style="margin:10px 0 0">Customers are never deleted — mark one inactive and its invoices stay on record.</p>`) : "";
  return ph("Customers", "Who we invoice. Add a customer, update their details and terms, or mark one inactive.") + flashHtml()
    + `<div class="stats">${stat("Customers", String(list.filter((c) => c.status !== "INACTIVE").length), "active")}${stat("Owed to us", money(list.reduce((s, c) => s + owed(c), 0)), "unpaid invoices")}${stat("Inactive", String(list.filter((c) => c.status === "INACTIVE").length), "kept on record")}</div>`
    + `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,380px);align-items:start" id="fbCuGrid">${cardFlush("", `<div class="fb-bar"><input class="in" type="search" id="fbCuQ" data-fbfilter="fbCuT" placeholder="Search by name, number, contact or company" aria-label="Search customers"></div>` + table(["No.", "Customer", "Company", "Contact", ">Terms", ">Owed", "Status", ""], rows, "No customers yet.").replace('<table class="t">', '<table class="t" id="fbCuT">'))}${form}</div><style>@media (max-width:980px){#fbCuGrid{grid-template-columns:minmax(0,1fr)!important}}</style>`;
}
hr3Route("/finance/ar/customers", "ar.view", vFbCustomers);
/* simple in-place filter for [data-fbfilter] search boxes */
document.addEventListener("input", (ev) => {
  const id = ev.target.dataset?.fbfilter; if (!id) return;
  const words = ev.target.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  document.querySelectorAll(`#${id} tbody tr[data-fbq]`).forEach((tr) => { tr.hidden = !words.every((w) => tr.dataset.fbq.includes(w)); });
});

/* ---------------- Invoices and bills: department and account are required (Nadia, AR and AP) ---------------- */
function fbDeptSelect(id, companies) {
  return `<select class="in" id="${id}" name="departmentId" required>${opt("", "— choose a department —", true)}${companies.map((c) => `<optgroup label="${esc(c.displayName)}" data-co="${c.id}">${S.departments.filter((d) => d.companyId === c.id && d.isActive !== false).map((d) => opt(d.id, `${d.code} — ${d.name}`)).join("")}</optgroup>`).join("")}</select>`;
}
function fbAcctSelect(id, types, label) {
  const seen = new Map(); for (const a of S.accounts) if (types.includes(a.type) && a.isActive !== false && a.isPostable !== false && !seen.has(a.number)) seen.set(a.number, a);
  return `<select class="in" id="${id}" name="accountNumber" required>${opt("", `— choose ${label} —`, true)}${[...seen.values()].sort((a, b) => a.number.localeCompare(b.number)).map((a) => opt(a.number, `${a.number} — ${a.name}`)).join("")}</select>`;
}
invoiceModal = function () {
  const cus = inScope(S.customers).filter((c) => c.status !== "INACTIVE").sort((a, b) => a.name.localeCompare(b.name));
  const cos = S.companies.filter((c) => cus.some((x) => x.companyId === c.id));
  return `<h3>New customer invoice</h3><p class="hint" style="margin:0 0 12px">Posts to the ledger as soon as it's sent. The revenue account and department are required.</p><form data-f="invoice" class="form-grid" data-fbco="iCu:iDep"><div class="fld" style="grid-column:1/-1"><label for="iCu">Customer</label><select class="in" id="iCu" name="customerId">${cus.map((c) => `<option value="${c.id}" data-co="${c.companyId}">${esc(c.name)} · ${esc(co(c.companyId).displayName)}</option>`).join("")}</select></div>
    <div class="fld"><label for="iAcct">Revenue account</label>${fbAcctSelect("iAcct", ["REVENUE"], "a revenue account")}</div><div class="fld"><label for="iDep">Department</label>${fbDeptSelect("iDep", cos)}</div>
    <div class="fld"><label for="iAmt">Amount before tax</label><input class="in num" id="iAmt" name="subtotal" inputmode="decimal" required></div><div class="fld"><label for="iDate">Invoice date</label><input class="in" type="date" id="iDate" name="invoiceDate" value="${todayStr()}"></div>
    <div class="fld"><label for="iGst">GST</label><select class="in" id="iGst" name="gst">${opt("1", "Charge 5% GST", true)}${opt("", "No GST")}</select></div><div class="fld"><label for="iMemo">Description</label><input class="in" id="iMemo" name="memo" placeholder="e.g. Cedar log sale — October"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Send invoice</button></div></form>`;
};
billModal = function (draft) {
  const vendors = inScope(S.vendors).sort((a, b) => a.name.localeCompare(b.name)), d = draft || {};
  const cos = S.companies.filter((c) => vendors.some((x) => x.companyId === c.id));
  return `<h3>New vendor bill</h3><p class="hint" style="margin:0 0 12px">Enter the bill as the vendor wrote it, and attach the vendor's invoice. The expense account and department are required.</p>
    <form data-f="bill" class="form-grid" data-fbco="bVendor:bDep"><div class="fld" style="grid-column:1/-1"><label for="bVendor">Vendor</label><select class="in" id="bVendor" name="vendorId">${vendors.map((v) => `<option value="${v.id}" data-co="${v.companyId}"${v.id === d.vendorId ? " selected" : ""}>${esc(v.name)} · ${esc(co(v.companyId).displayName)}</option>`).join("")}</select></div>
    <div class="fld"><label for="bNum">Invoice number</label><input class="in" id="bNum" name="invoiceNumber" required value="${esc(d.invoiceNumber || "")}"></div><div class="fld"><label for="bDate">Bill date</label><input class="in" type="date" id="bDate" name="invoiceDate" value="${todayStr()}"></div>
    <div class="fld"><label for="bAcct">Expense account</label>${fbAcctSelect("bAcct", ["EXPENSE", "ASSET"], "an account")}</div><div class="fld"><label for="bDep">Department</label>${fbDeptSelect("bDep", cos)}</div>
    <div class="fld"><label for="bAmt">Amount before tax</label><input class="in num" id="bAmt" name="subtotal" inputmode="decimal" placeholder="0.00" required></div><div class="fld"><label for="bGst">GST</label><select class="in" id="bGst" name="gst">${opt("1", "Add 5% GST", true)}${opt("", "No GST")}</select></div>
    <div class="fld" style="grid-column:1/-1"><label for="bDesc">What is it for?</label><input class="in" id="bDesc" name="description" placeholder="e.g. Diesel — harvest fleet"></div>
    ${fileDrop("billNew", "Attachments", "The vendor's invoice, quotes or photos — PDF, JPG or PNG, one or more")}
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn" name="submit" value="0">Save draft</button><button class="btn pri" name="submit" value="1">Send for approval</button></div></form>`;
};
/* only the departments of the chosen customer's / vendor's company are offered */
function fbCoFilter(form) {
  const [src, dst] = (form?.dataset.fbco || "").split(":"), s = document.getElementById(src), dsel = document.getElementById(dst); if (!s || !dsel) return;
  const cid = s.selectedOptions[0]?.dataset.co;
  dsel.querySelectorAll("optgroup").forEach((g) => { const on = g.dataset.co === cid; g.hidden = !on; g.disabled = !on; });
  if (dsel.value && dsel.selectedOptions[0]?.parentElement?.dataset.co !== cid) dsel.value = "";
}
document.addEventListener("change", (ev) => { const f = ev.target.closest?.("form[data-fbco]"); if (f && ev.target.id === f.dataset.fbco.split(":")[0]) fbCoFilter(f); });
{ const _afterRenderCo = afterRender; afterRender = function () { const r = _afterRenderCo.apply(this, arguments); document.querySelectorAll("form[data-fbco]").forEach(fbCoFilter); return r; }; }

/* ---------------- Matching: one list, several POs per bill (Nadia, 3-way match) ---------------- */
const fbBillPos = (b) => (b.purchaseOrderIds?.length ? b.purchaseOrderIds : b.purchaseOrderId ? [b.purchaseOrderId] : []).map((id) => byId(S.purchaseOrders, id)).filter(Boolean);
function fbCombinedPo(pos, St = S) {
  if (pos.length === 1) return { po: pos[0], lines: invPoLines(pos[0].id, St) };
  return { po: { ...pos[0], id: pos.map((p) => p.id).join("+"), poNumber: pos.map((p) => p.poNumber).join(" + "), totalCents: pos.reduce((s, p) => s + (p.totalCents ?? p.amountCents ?? 0), 0), amountCents: pos.reduce((s, p) => s + (p.amountCents ?? p.totalCents ?? 0), 0) }, lines: pos.flatMap((p) => invPoLines(p.id, St)) };
}
Object.assign(R, {
  "ap.addPo"(S0, p, ctx) {
    if (!can(ctx.auth, "ap.create") && !can(ctx.auth, "ap.approve")) fail("Your role doesn't allow this.");
    const inv = byId(S0.apInvoices, p.invoiceId); if (!inv) fail("That bill no longer exists."); ctx.company(inv.companyId);
    const po = byId(S0.purchaseOrders, p.poId);
    if (!po || po.companyId !== inv.companyId) fail("Choose a purchase order from the same company as the bill.");
    if (po.status === "CANCELLED") fail(`${po.poNumber} was cancelled — pick another order.`);
    if (po.vendorId && inv.vendorId && po.vendorId !== inv.vendorId) fail(`${po.poNumber} is with ${po.vendorName || vendorName(po.vendorId)}, not ${vendorName(inv.vendorId)}.`);
    const ids = inv.purchaseOrderIds?.length ? [...inv.purchaseOrderIds] : inv.purchaseOrderId ? [inv.purchaseOrderId] : [];
    if (ids.includes(po.id)) fail(`${inv.invoiceNumber} already includes ${po.poNumber}.`);
    ids.push(po.id);
    Object.assign(inv, { purchaseOrderIds: ids, purchaseOrderId: ids[0] }); delete inv.matchStatus; delete inv.matchNote; delete inv.matchedAt;
    ctx.audit({ module: "procurement", action: "UPDATE", companyId: inv.companyId, entityType: "ApInvoice", entityId: inv.id, summary: `${ctx.actor.displayName} added ${po.poNumber} to bill ${inv.invoiceNumber} (${ids.length} purchase order${ids.length === 1 ? "" : "s"} now).` });
  },
  "ap.removePo"(S0, p, ctx) {
    if (!can(ctx.auth, "ap.create") && !can(ctx.auth, "ap.approve")) fail("Your role doesn't allow this.");
    const inv = byId(S0.apInvoices, p.invoiceId); if (!inv) fail("That bill no longer exists."); ctx.company(inv.companyId);
    const ids = (inv.purchaseOrderIds?.length ? inv.purchaseOrderIds : inv.purchaseOrderId ? [inv.purchaseOrderId] : []).filter((id) => id !== p.poId);
    if (ids.length) Object.assign(inv, { purchaseOrderIds: ids, purchaseOrderId: ids[0] }); else { delete inv.purchaseOrderIds; delete inv.purchaseOrderId; }
    delete inv.matchStatus; delete inv.matchNote; delete inv.matchedAt;
    ctx.audit({ module: "procurement", action: "UPDATE", companyId: inv.companyId, entityType: "ApInvoice", entityId: inv.id, summary: `${ctx.actor.displayName} took ${byId(S0.purchaseOrders, p.poId)?.poNumber || "a purchase order"} off bill ${inv.invoiceNumber}.` });
  },
});
{
  // a bill tied to several orders is checked against all of them together
  const _matchRunFb = R["match.run"];
  R["match.run"] = function (S0, p, ctx) {
    _matchRunFb(S0, p, ctx);
    const bills = p.billId ? [byId(S0.apInvoices, p.billId)].filter(Boolean) : S0.apInvoices.filter((b) => b.purchaseOrderIds?.length > 1 && b.status !== "CANCELLED" && canSee(ctx.auth, b.companyId));
    for (const b of bills) {
      if (!(b.purchaseOrderIds?.length > 1) || (!p.billId && invMatchAccepted(b))) continue;
      const pos = b.purchaseOrderIds.map((id) => byId(S0.purchaseOrders, id)).filter(Boolean), c = fbCombinedPo(pos, S0);
      const r = invComputeMatch(c.po, c.lines, b, S0.apLines.filter((l) => l.apInvoiceId === b.id));
      Object.assign(b, { matchStatus: r.status, matchNote: `Against ${c.po.poNumber} together: ${r.note}`, matchedAt: ctx.now });
    }
  };
  const _invMatchRowsFb = invMatchRows;
  invMatchRows = function (St = S) {
    return _invMatchRowsFb(St).map((x) => { if (!(x.b.purchaseOrderIds?.length > 1)) return x; const c = fbCombinedPo(fbBillPos(x.b), St); return { ...x, po: c.po, r: invComputeMatch(c.po, c.lines, x.b, St.apLines.filter((l) => l.apInvoiceId === x.b.id)) }; });
  };
}
function vFbMatch() {
  const full = vMatch().replace("<h1>3-Way Match</h1>", "<h1>3-way match</h1>");
  const k = full.indexOf('<div class="sect-l">Workbench</div>'), head = k > 0 ? full.slice(0, k) : full;
  const canLink = can(A, "ap.create") || can(A, "ap.approve"), canAct = can(A, "ap.approve"), t = todayStr();
  const bills = inScope(S.apInvoices).filter((i) => !["PAID", "CANCELLED", "VOID"].includes(i.status)).sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1));
  const rows = bills.map((i) => {
    const pos = fbBillPos(i), c = pos.length ? fbCombinedPo(pos) : null, r = c ? invComputeMatch(c.po, c.lines, i, S.apLines.filter((l) => l.apInvoiceId === i.id)) : null;
    const poTotal = pos.reduce((s, p) => s + (p.totalCents ?? p.amountCents ?? 0), 0), diff = pos.length ? i.totalCents - poTotal : 0;
    const stored = i.matchStatus === "MATCHED" || i.matchStatus === "VARIANCE" ? i.matchStatus : "UNMATCHED";
    const avail = S.purchaseOrders.filter((p) => p.companyId === i.companyId && p.status !== "CANCELLED" && (!p.vendorId || p.vendorId === i.vendorId) && !pos.some((x) => x.id === p.id)).sort((a, b) => (a.poNumber < b.poNumber ? 1 : -1));
    const q = [i.invoiceNumber, vendorName(i.vendorId), i.description, ...pos.map((p) => p.poNumber)].join(" ").toLowerCase();
    return `<tr data-fbq="${esc(q)}" style="vertical-align:top"><td class="mono"><strong>${goLink(`/finance/ap/${i.id}`, i.invoiceNumber)}</strong><div class="hint" style="font-family:var(--font)">${dLong(i.invoiceDate)} · ${coTag(i.companyId)}</div></td><td>${esc(vendorName(i.vendorId))}<div class="hint">${esc(i.description)}</div></td>${td(money(i.totalCents), 1)}
      <td>${pos.map((p) => `<span class="fb-chip">${esc(p.poNumber)} · ${money(p.totalCents ?? p.amountCents ?? 0)}${canLink ? `<button type="button" data-a="fbPoOff" data-id="${i.id}" data-po="${p.id}" aria-label="Take ${esc(p.poNumber)} off this bill">✕</button>` : ""}</span>`).join("") || `<span class="hint">No purchase order yet</span>`}
        ${canLink && avail.length ? `<div class="form-row" style="gap:6px;margin-top:4px"><select class="in" style="height:30px;max-width:280px" id="fbPo_${i.id}" aria-label="Add a purchase order to ${esc(i.invoiceNumber)}">${avail.map((p) => opt(p.id, `${p.poNumber} · ${p.description || ""} · ${money(p.amountCents ?? p.totalCents ?? 0)}`)).join("")}</select><button class="btn sm" data-a="fbPoAdd" data-id="${i.id}">${pos.length ? "Add another" : "Add PO"}</button></div>` : ""}</td>
      ${td(pos.length ? money(poTotal) : "—", 1)}${td(!pos.length ? "—" : diff === 0 ? "—" : `<strong class="${Math.abs(diff) <= (r?.toleranceCents || 0) ? "inv-pos" : "inv-neg"}">${diff > 0 ? "+" : "−"}${money(Math.abs(diff))}</strong>`, 1)}
      <td>${pos.length ? invBadge(stored) : `<span class="badge tone-grey">No PO</span>`}${i.matchNote ? `<div class="hint" style="max-width:260px">${esc(i.matchNote)}</div>` : r ? `<div class="hint">Not checked yet</div>` : ""}${canAct && pos.length ? `<div style="margin-top:6px"><button class="btn sm" data-a="matchRun" data-id="${i.id}">Run match</button></div>` : ""}
        ${canAct && stored === "VARIANCE" ? `<form data-f="matchAccept" data-id="${i.id}" class="form-row" style="margin-top:6px"><input class="in" name="reason" required minlength="5" placeholder="Why it's OK to pay" aria-label="Reason" style="height:30px;font-size:12px;flex:1;min-width:140px"><button class="btn sm">Accept variance</button></form>` : ""}</td></tr>`;
  });
  return head + `<div class="sect-l">Bills and their purchase orders</div>` + cardFlush("", `<div class="fb-bar"><input class="in" type="search" id="fbMatchQ" data-fbfilter="fbMatchT" placeholder="Search by bill, vendor or PO number" aria-label="Search bills"><span class="hint">A bill can take several purchase orders — the check compares the bill with all of them together.</span></div>`
    + table(["Bill", "Vendor", ">Bill total", "Purchase orders", ">PO total", ">Difference", "Result"], rows, "No open vendor bills.").replace('<table class="t">', '<table class="t" id="fbMatchT">'))
    + card("How the check works", `<p class="hint" style="margin:0"><strong>Received value</strong> = quantity received on each PO line × the PO price, plus the same share of GST. A bill is <strong>matched</strong> when it is within the larger of $5 or 1% of the received value and does not exceed the total of its purchase orders. With several purchase orders, their lines and totals are added together first.</p>`);
}
hr3Route("/procurement/match", () => can(A, "procurement.view") || can(A, "ap.view"), vFbMatch);

/* ---------------- Documents: policies live in My Documents (Nadia, Documents) ---------------- */
{
  const _apDocRowsFb = apDocRows, _vDocumentsFb = vDocuments;
  let noPolicies = false;
  apDocRows = function () { const r = _apDocRowsFb.apply(this, arguments); return noPolicies ? r.filter((x) => x.type !== "policies") : r; };
  vDocuments = function () {
    noPolicies = true; if (UI.filters?.ap?.docs?.type === "policies") UI.filters.ap.docs.type = "";
    try { return _vDocumentsFb.apply(this, arguments).replace(/<button class="hchip[^"]*" data-a="apChip" data-k="docs" data-f="type" data-v="policies">[\s\S]*?<\/button>/, "").replace("Policies, vendor invoices and documents", "Vendor invoices and documents") + `<p class="hint" style="margin-top:10px">Policies and handbooks are in Me › My Documents.</p>`; }
    finally { noPolicies = false; }
  };
}

/* ---------------- Home: hiring requests in Needs your attention (Shawna) ---------------- */
{
  const _naiFb = needsAttentionItems;
  needsAttentionItems = function () {
    const out = _naiFb.apply(this, arguments);
    try {
      if (typeof hireIsHr === "function" && hireIsHr()) {
        const rs = (S.hiringRequests || []).filter((r) => canSee(A, r.companyId)), pend = rs.filter((r) => r.status === "PENDING"), ok = rs.filter((r) => r.status === "APPROVED");
        if (pend.length) out.unshift({ key: "hire-pending", icon: "users", tone: "warn", title: `${pend.length} hiring request${pend.length === 1 ? "" : "s"} waiting for HR`, detail: pend.slice(0, 2).map((r) => `${r.number} · ${r.title}`).join(" · "), go: "/hr/hiring-requests", count: pend.length });
        if (ok.length) out.push({ key: "hire-post", icon: "users", tone: "info", title: `${ok.length} approved hiring request${ok.length === 1 ? "" : "s"} to post as a job`, detail: ok.slice(0, 2).map((r) => `${r.number} · ${r.title}`).join(" · "), go: "/hr/hiring-requests", count: ok.length });
      }
    } catch { /* never break Home */ }
    return out;
  };
}

/* ---------------- Email: an Outlook-style reading pane (Tyler, Home) ---------------- */
emailPanel = function () {
  const inbox = UI.emailInbox || "me";
  const users = [...S.users].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const counts = new Map(); for (const e of S.emails) counts.set(e.userId, (counts.get(e.userId) || 0) + 1);
  const list = S.emails.filter((e) => (inbox === "all" ? true : e.userId === (inbox === "me" ? A.user.id : inbox))).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 200);
  const sel = list.find((e) => e.id === UI.emailOpen) || list[0];
  const subj = (e) => String(e.subject || "").replace(/^\[[^\]]+\]\s*/, "");
  const lines = (e) => String(e.bodyText || "").split("\n");
  const preview = (e) => (e.rcIntro || lines(e).filter((l) => l.trim() && !/^Hi /.test(l))[0] || "").slice(0, 120);
  const when = (iso) => { const d = iso.slice(0, 10); return d === todayStr() ? new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }) : dShort(d); };
  const initials = (n) => String(n || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const items = list.map((e) => `<button type="button" class="fb-li ${sel && e.id === sel.id ? "on" : ""}" data-a="fbMailPick" data-id="${e.id}"><span class="r1"><span>${inbox === "all" ? `To ${esc(e.toName)}` : "HaiCo Notifications"}</span><span>${e.attachments?.length ? `📎 ` : ""}${esc(when(e.createdAt))}</span></span><span class="sj">${esc(subj(e))}</span><span class="pv">${esc(preview(e))}</span></button>`).join("");
  const body = sel ? lines(sel).map((l) => { const m = /^Open it here:\s*(\S+)/.exec(l); return m ? `<p><button type="button" class="btn sm pri" data-a="fbMailGo" data-go2="${esc(m[1])}">Open it in HaiCo</button></p>` : l.trim() ? `<p>${esc(l)}</p>` : ""; }).join("") : "";
  const att = sel?.attachments?.length ? `<div class="fb-att">${sel.attachments.map((x) => `<button type="button" data-a="rcPoPdf" data-id="${esc(x.rcId || "")}" title="Download ${esc(x.name)}"><span class="ic">PDF</span><span><b style="display:block;font-size:13px">${esc(x.name)}</b><span class="hint">PDF document · download</span></span></button>`).join("")}</div>` : "";
  const read = sel ? `<div class="fb-read"><h3>${esc(subj(sel))}</h3><div style="display:flex;gap:10px;align-items:flex-start;margin:0 0 12px"><span class="fb-av" aria-hidden="true">HC</span><dl class="fb-hdr" style="flex:1;border:0;padding:0;margin:0"><dt>From</dt><dd><b>HaiCo Notifications</b> &lt;notifications@haico.example&gt;</dd><dt>To</dt><dd>${esc(sel.toName)} &lt;${esc(sel.toEmail || "")}&gt;</dd><dt>Sent</dt><dd>${esc(dTime(sel.createdAt))}</dd></dl></div>${att}<div class="fb-body" style="border-top:1px solid var(--border);padding-top:12px">${body}</div></div>`
    : `<div class="fb-read">${empty("No email yet", "Send a request or approve one and it appears here.")}</div>`;
  const title = inbox === "me" ? "Inbox" : inbox === "all" ? `Everyone's email · ${S.emails.length}` : `${byId(S.users, inbox)?.displayName}'s inbox`;
  return `<div class="modal" role="dialog" aria-label="Email" style="width:min(1180px,calc(100vw - 32px));max-height:calc(100vh - 32px)"><div class="form-row" style="justify-content:space-between;margin-bottom:10px"><h3 style="margin:0">${esc(title)}</h3><span class="form-row"><label class="hint" for="emailInbox">Inbox</label><select class="in" id="emailInbox" style="height:32px;max-width:260px" data-a="emailInbox">${opt("me", `Me · ${A.user.displayName} (${counts.get(A.user.id) || 0})`, inbox === "me")}${opt("all", `Everyone (${S.emails.length})`, inbox === "all")}${users.filter((u) => u.id !== A.user.id).map((u) => opt(u.id, `${u.displayName} (${counts.get(u.id) || 0})`, inbox === u.id)).join("")}</select><button class="btn sm" data-a="closeModal">Close</button></span></div>
    <div class="fb-mail">${list.length ? `<div class="fb-list" role="listbox" aria-label="Messages">${items}</div>` : `<div class="fb-list"></div>`}${read}</div>
    <p class="hint" style="margin:10px 0 0">Demo: messages are kept here instead of being sent. In production they go out through Microsoft 365, with the same attachments.</p></div>`;
};

/* ---------------- My Tasks as a dashboard (Kiona) — same tasks, same rules ---------------- */
function vFbMyTasks() {
  const html = vMyTasks(), e = A.employee;
  if (!e) return html;
  const mine = S.tasks.filter((t) => t.assigneeId === e.id && scopeIds(S, A).includes(t.companyId)); if (!mine.length) return html;
  const t0 = todayStr(), open = mine.filter((t) => t.status !== "DONE");
  const ST = [["TODO", "To do", "var(--c1)"], ["IN_PROGRESS", "In progress", "var(--c2)"], ["BLOCKED", "Blocked", "var(--c3)"], ["DONE", "Done", "var(--c4)"]];
  const byStatus = donut(ST.map(([k, l, c]) => { const v = mine.filter((t) => t.status === k).length; return { label: l, v, d: String(v), color: c }; }), { title: "My tasks by status", caption: "tasks", size: 130, thick: 16 });
  const wk = addDays(t0, 7), wk2 = addDays(t0, 14);
  const due = [["Overdue", (t) => t.dueDate && t.dueDate < t0], ["This week", (t) => t.dueDate && t.dueDate >= t0 && t.dueDate <= wk], ["Next week", (t) => t.dueDate && t.dueDate > wk && t.dueDate <= wk2], ["Later", (t) => t.dueDate && t.dueDate > wk2], ["No due date", (t) => !t.dueDate]].map(([l, f]) => { const v = open.filter(f).length; return { label: l, v, d: `${v} task${v === 1 ? "" : "s"}` }; });
  const prog = open.slice().sort((a, b) => (b.percentDone || 0) - (a.percentDone || 0)).slice(0, 6).map((t) => ({ label: t.title, v: t.percentDone || 0, d: `${t.percentDone || 0}%` }));
  const avg = open.length ? Math.round(open.reduce((s, t) => s + (t.percentDone || 0), 0) / open.length) : 100;
  const board = `<div class="fb-grid3"><section class="card" style="padding:14px 16px">${byStatus}</section><section class="card" style="padding:14px 16px">${barList(due, { title: "Open tasks by due date" })}</section><section class="card" style="padding:14px 16px">${barList(prog, { title: `Progress on open tasks · average ${avg}%` })}</section></div>`;
  const at = html.indexOf('<div class="mtask">') >= 0 ? html.indexOf('<div class="mtask">') : html.indexOf('<section class="card');
  return at > 0 ? html.slice(0, at) + board + html.slice(at) : html + board;
}
hr3Route("/me/tasks", null, vFbMyTasks);

/* ---------------- Downloads take only what the search shows (Nadia, Benefits — everywhere) ---------------- */
function fbActiveSearch() {
  const box = document.querySelector(".content"); if (!box) return null;
  const qs = [...box.querySelectorAll('input[type="search"]')].filter((i) => !i.closest("#crPanel")).map((i) => i.value.trim()).filter(Boolean);
  if (!qs.length) return null;
  const col = document.getElementById("tsCol"), tq = document.getElementById("tsQ")?.value.trim();
  return { q: qs.join(" "), words: qs.join(" ").toLowerCase().split(/\s+/).filter(Boolean), colName: col && Number(col.value) >= 0 && tq ? col.selectedOptions[0]?.text : null };
}
{
  const _saveTableFb = saveTable;
  saveTable = async function (base, rows, title, fmt) {
    const f = fbActiveSearch();
    if (f && rows.length > 1) {
      const head = rows[0], ci = f.colName ? head.findIndex((h) => String(h).toLowerCase() === f.colName.toLowerCase()) : -1;
      const keep = rows.slice(1).filter((r) => { const t = (ci >= 0 ? String(r[ci] ?? "") : r.join(" ")).toLowerCase(); return f.words.every((w) => t.includes(w)); });
      if (!keep.length) { toast("Nothing to download", `No rows match “${f.q}”. Clear the search to download everything.`, "err"); return; }
      rows = [head, ...keep]; title = `${title} — matching “${f.q}”`; base = `${base}-search`;
    }
    return _saveTableFb(base, rows, title, fmt);
  };
}

/* ---------------- Sortable columns: small ▲▼ on the headers (Kiona, Time off; Nadia, Invoice Files and PO) ---------------- */
const FB_SORT_PAGES = new Set(["/me/time-off", "/finance/ap/attachments", "/finance/pos", "/requests", "/requests/all", "/requests/finance", "/finance/ar/customers", "/payroll/holidays", "/procurement/match"]);
function fbCellKey(td) {
  const t = (td?.innerText || "").trim(), first = t.split("\n")[0];
  const n = /^[−-]?\$?\s?[\d,]+(\.\d+)?/.exec(first.replace(/^[^\d$−-]+/, "")); const dt = Date.parse(first.split(/ – | → /)[0]);
  if (/^[A-Z][a-z]{2} \d{1,2}, \d{4}/.test(first) && !Number.isNaN(dt)) return { n: dt };
  if (n && /^[−-]?\$?\s?[\d,]/.test(first.replace(/^[^\d$−-]+/, "")) && !/[A-Za-z]{3,}-?\d/.test(first)) return { n: Number(n[0].replace(/[$,\s]/g, "").replace("−", "-")) };
  return { s: t.toLowerCase() };
}
function fbSortApply(table, ci, dir) {
  const tb = table.tBodies[0]; if (!tb) return;
  const rows = [...tb.rows].filter((r) => !r.classList.contains("rc-none") && !r.classList.contains("tot") && !r.querySelector("td[colspan]"));
  const tail = [...tb.rows].filter((r) => !rows.includes(r));
  rows.sort((a, b) => { const x = fbCellKey(a.cells[ci]), y = fbCellKey(b.cells[ci]); const v = x.n != null && y.n != null ? x.n - y.n : String(x.s ?? x.n).localeCompare(String(y.s ?? y.n), undefined, { numeric: true }); return dir * v; });
  rows.concat(tail).forEach((r) => tb.appendChild(r));
}
function fbSortWire() {
  const path = parseRoute(UI.route || "/").path; if (!FB_SORT_PAGES.has(path)) return;
  const st = (UI.fbSort = UI.fbSort || {})[path] || {};
  document.querySelectorAll(".content table").forEach((table, ti) => {
    const ths = table.tHead?.rows[0]?.cells; if (!ths || table.dataset.fbsort) return; table.dataset.fbsort = "1";
    [...ths].forEach((th, ci) => { if (!th.textContent.trim()) return; const on = st.ti === ti && st.ci === ci; const b = document.createElement("button"); b.type = "button"; b.className = "fb-sort" + (on ? " on" : ""); b.dataset.fbti = ti; b.dataset.fbci = ci; b.textContent = on ? (st.dir > 0 ? "▲" : "▼") : "▲▼"; b.setAttribute("aria-label", `Sort by ${th.textContent.trim()}`); th.appendChild(b); });
    if (st.ti === ti) fbSortApply(table, st.ci, st.dir);
  });
}
document.addEventListener("click", (ev) => {
  const b = ev.target.closest?.(".fb-sort"); if (!b) return; ev.preventDefault(); ev.stopPropagation();
  const path = parseRoute(UI.route || "/").path, s = (UI.fbSort = UI.fbSort || {}), ti = Number(b.dataset.fbti), ci = Number(b.dataset.fbci);
  const cur = s[path] || {}; s[path] = { ti, ci, dir: cur.ti === ti && cur.ci === ci ? -cur.dir : 1 };
  const table = document.querySelectorAll(".content table")[ti];
  table.querySelectorAll(".fb-sort").forEach((x) => { const on = Number(x.dataset.fbci) === ci; x.classList.toggle("on", on); x.textContent = on ? (s[path].dir > 0 ? "▲" : "▼") : "▲▼"; });
  fbSortApply(table, ci, s[path].dir);
}, true);
{ const _afterRenderSort = afterRender; afterRender = function () { const r = _afterRenderSort.apply(this, arguments); try { fbSortWire(); } catch {} return r; }; }

/* ---------------- Finance › PO: every purchase order, by company, view only (Nadia) ---------------- */
function fbPoTotal(p) { return p.totalCents ?? p.amountCents ?? 0; }
/* Nadia, round 2: where each PO is — including the ones still being approved in Requests — and its code and department */
function fbPoRows() {
  const ids = scopeIds(S, A);
  const real = S.purchaseOrders.filter((p) => ids.includes(p.companyId));
  const pending = (S.rcRequests || []).filter((it) => it.kind === "po" && ids.includes(it.companyId) && ["submitted", "awaiting_director", "returned"].includes(it.status) && !it.purchaseOrderId)
    .map((it) => ({ id: `rc:${it.id}`, rcId: it.id, pending: true, poNumber: it.ref, companyId: it.companyId, vendorName: it.po.vendorName, description: it.po.description, totalCents: it.po.estimateCents || 0, status: "PENDING_APPROVAL", departmentId: it.departmentId, accountNumber: it.accountNumber, requesterName: rcForName(it), createdAt: it.createdAt, notes: it.po.notes }));
  return [...pending, ...real];
}
function fbPoWhere(p) {
  const rc = p.rcId ? byId(S.rcRequests, p.rcId) : p.sourceRcId ? byId(S.rcRequests || [], p.sourceRcId) : null;
  if (p.pending && rc) {
    const inst = byId(S.approvals, rc.currentApprovalId);
    if (rc.status === "returned") return ["Returned to the requester for a fix", "amber"];
    if (rc.status === "awaiting_director") return ["Waiting for director level (Executive Director or CEO)", "amber"];
    return [`Waiting for ${inst?.approverUserIds ? rcOrList(rcNames(S, inst.approverUserIds)) : "the supervisor"}'s approval`, "amber"];
  }
  if (rc?.status === "reapproval") return ["Back for reapproval — the invoice is over the tolerance", "amber"];
  const by = (p.approverNames || []).join(" and ");
  const inst = p.approvalInstanceId ? byId(S.approvals, p.approvalInstanceId) : null;
  return ({ DRAFT: ["Draft — not sent for approval", "grey"], PENDING_APPROVAL: [`Waiting for approval${inst ? ` — ${whoIsNext(S, inst)}` : ""}`, "amber"], APPROVED: [`Approved${by ? ` by ${by}` : ""} — not sent to the supplier yet`, "teal"], SENT: [`Approved${by ? ` by ${by}` : ""} — sent to the supplier`, "teal"], PARTIALLY_RECEIVED: ["Approved — partly received", "blue"], RECEIVED: ["Approved — received in full", "green"], CLOSED: ["Closed against the invoice", "green"], CANCELLED: ["Cancelled", "grey"] })[p.status] || [invLabel(p.status), "grey"];
}
const fbPoCode = (p) => p.accountNumber || invPoLines(p.id)[0]?.accountNumber || "";
const fbPoDept = (p) => p.departmentId || invPoLines(p.id).find((l) => l.departmentId)?.departmentId || "";
function vFbPos() {
  const ids = scopeIds(S, A), cos = S.companies.filter((c) => ids.includes(c.id)), f = UI.tabs.fbPoCo || "";
  const all = fbPoRows(), list = all.filter((p) => !f || p.companyId === f).sort((a, b) => ((a.orderDate || a.createdAt || "") < (b.orderDate || b.createdAt || "") ? 1 : -1));
  const billed = (p) => (p.pending ? 0 : S.apInvoices.filter((i) => i.status !== "CANCELLED" && (i.purchaseOrderId === p.id || i.purchaseOrderIds?.includes(p.id))).reduce((s, i) => s + i.totalCents, 0));
  const waiting = list.filter((p) => fbPoWhere(p)[1] === "amber"), open = list.filter((p) => !p.pending && !["CLOSED", "CANCELLED", "RECEIVED"].includes(p.status));
  const rows = list.map((p) => { const [w, tone] = fbPoWhere(p), dep = byId(S.departments, fbPoDept(p)), code = fbPoCode(p); return `<tr class="click" data-a="fbPoOpen" data-id="${p.id}" data-fbq="${esc([p.poNumber, p.vendorName || vendorName(p.vendorId), p.description, co(p.companyId).displayName, w, code, dep?.name].join(" ").toLowerCase())}"><td class="mono"><strong>${esc(p.poNumber)}</strong></td><td>${esc(p.orderDate ? dLong(p.orderDate) : p.createdAt ? dLong(p.createdAt.slice(0, 10)) : "—")}</td><td>${esc(p.vendorName || vendorName(p.vendorId) || "—")}</td><td>${coTag(p.companyId)}</td><td>${esc(p.description || "—")}<div class="hint">${esc([dep ? `${dep.code} ${dep.name}` : "", code].filter(Boolean).join(" · ") || "no code yet")}</div></td>${td(p.pending && !fbPoTotal(p) ? "No estimate" : money(fbPoTotal(p)), 1)}${td(p.pending ? "—" : money(billed(p)), 1)}<td><span class="badge tone-${tone}">${esc(w)}</span></td></tr>`; });
  return ph("Purchase orders", "Every purchase order in the organization, by company — including the ones still being approved. Click one to see its details — view only.") + flashHtml()
    + `<div class="stats">${stat("Purchase orders", String(list.length), f ? co(f).displayName : "all your companies")}${stat("Waiting for approval", String(waiting.length), waiting.length ? "see “Where it is”" : "nothing waiting", waiting.length ? "warn" : "")}${stat("Approved and open", String(open.length), money(open.reduce((s, p) => s + fbPoTotal(p), 0)))}${stat("Billed against them", money(list.reduce((s, p) => s + billed(p), 0)), "vendor bills")}</div>`
    + `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px"><button class="hchip ${!f ? "on" : ""}" data-a="fbPoCo" data-v="">All companies <span>${all.length}</span></button>${cos.map((c) => `<button class="hchip ${f === c.id ? "on" : ""}" data-a="fbPoCo" data-v="${c.id}">${esc(c.displayName)} <span>${all.filter((p) => p.companyId === c.id).length}</span></button>`).join("")}</div>`
    + cardFlush("", `<div class="fb-bar"><input class="in" type="search" id="fbPoQ" data-fbfilter="fbPoT" placeholder="Search by PO number, supplier, description, code, department or where it is" aria-label="Search purchase orders"></div>` + table(["PO", "Date", "Supplier", "Company", "What", ">Amount", ">Billed", "Where it is"], rows, "No purchase orders yet.").replace('<table class="t">', '<table class="t" id="fbPoT">'));
}
function fbPoModal(p) {
  const lines = p.pending ? [] : invPoLines(p.id), recs = p.pending ? [] : S.goodsReceipts.filter((g) => g.purchaseOrderId === p.id), bills = p.pending ? [] : S.apInvoices.filter((i) => i.purchaseOrderId === p.id || i.purchaseOrderIds?.includes(p.id));
  const rc = p.rcId ? byId(S.rcRequests, p.rcId) : p.sourceRcId ? byId(S.rcRequests || [], p.sourceRcId) : null, pr = p.purchaseRequestId ? byId(S.purchaseRequests || [], p.purchaseRequestId) : null;
  const dep = byId(S.departments, fbPoDept(p)), code = fbPoCode(p), acct = code ? S.accounts.find((a) => a.companyId === p.companyId && a.number === code) : null, [w, tone] = fbPoWhere(p);
  const kv = [["Where it is", `<span class="badge tone-${tone}">${esc(w)}</span>`], ["Department", esc(dep ? `${dep.code} — ${dep.name}` : "—")], ["Expense code", esc(acct ? `${acct.number} — ${acct.name}` : code || "—")], ["Supplier", esc(p.vendorName || vendorName(p.vendorId) || "—")], ["Company", esc(co(p.companyId).displayName)], ["Ordered", esc(p.orderDate ? dLong(p.orderDate) : p.pending ? "not yet — still being approved" : "—")], ["Amount", esc(p.pending && !fbPoTotal(p) ? "No estimate" : money(fbPoTotal(p)))], ["Requested by", esc(p.requesterName || p.createdByName || "—")], ["Approved by", esc((p.approverNames || []).join(", ") || (p.pending ? "not yet" : "—"))], ["Notes", esc(p.notes || "—")]];
  return `<h3 style="margin:0 0 4px">${esc(p.poNumber)} <span class="hint" style="font-weight:400">· view only</span></h3><p class="hint" style="margin:0 0 12px">${esc(p.description || "")}</p>
    <dl class="kv">${kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>
    ${lines.length ? `<h4 style="margin:14px 0 6px">Lines</h4>` + table(["Item", "Expense code", ">Qty", ">Received", ">Price"], lines.map((l) => `<tr><td>${esc(l.description)}</td><td>${esc(l.accountNumber || "—")}</td>${td(String(l.quantity), 1)}${td(String(l.receivedQuantity || 0), 1)}${td(money(l.unitCents || l.unitPriceCents || 0), 1)}</tr>`)) : ""}
    ${p.pending ? "" : `<h4 style="margin:14px 0 6px">Received</h4>${recs.length ? `<ul style="margin:0;padding-left:18px">${recs.map((g) => `<li>${esc(g.receiptNumber || "Receipt")} · ${esc(dLong(g.receivedDate))}${g.receivedByName ? ` · ${esc(g.receivedByName)}` : ""}</li>`).join("")}</ul>` : `<p class="hint" style="margin:0">Nothing received yet.</p>`}
    <h4 style="margin:14px 0 6px">Vendor bills</h4>${bills.length ? `<ul style="margin:0;padding-left:18px">${bills.map((b) => `<li>${esc(b.invoiceNumber)} · ${money(b.totalCents)} · ${esc(invLabel(b.status))}</li>`).join("")}</ul>` : `<p class="hint" style="margin:0">No bills yet.</p>`}`}
    ${rc || pr ? `<p class="hint" style="margin:12px 0 0">Started as ${rc ? `request ${esc(rc.ref)} (${esc(rcForName(rc))})` : `purchase request ${esc(pr.requestNumber)}`}.</p>` : ""}
    <div class="form-row" style="justify-content:flex-end;margin-top:14px">${rc && !p.pending ? `<button class="btn" data-a="rcPoPdf" data-id="${rc.id}">⬇ Download the PO (PDF)</button>` : ""}<button class="btn pri" data-a="closeModal">Close</button></div>`;
}
hr3Route("/finance/pos", () => fbFinance(), vFbPos);

/* ---------------- Rates & coding: a change history, and approval for changes below Finance Manager (Nadia) ---------------- */
const fbRatesDirect = (a) => fbRole(a, "FINANCE_MANAGER", "EXECUTIVE", "GROUP_ADMIN", "SUPER_ADMIN");
{
  const _fresh = freshState;
  freshState = function () {
    const S0 = _fresh(); S0.rcSettingsLog = []; S0.rcSettingsPending = [];
    if (!S0.workflows.some((w) => w.code === "RC_SETTINGS")) { S0.workflows.push({ id: "wfRcSet", code: "RC_SETTINGS", name: "Rates & coding changes", isActive: true }); S0.workflowSteps.push({ id: "wfRcSet_s1", workflowId: "wfRcSet", sequence: 1, name: "Finance Manager approval", approverType: "ROLE", roleCode: "FINANCE_MANAGER", thresholdMinCents: 0 }); }
    return S0;
  };
}
function fbRateView(s) {
  const pct = (v) => `${v}%`, onoff = (v) => (v === false ? "off" : "on");
  return [["Mileage per km", money(s.mileageCents)], ["Breakfast", money(s.meals.b)], ["Lunch", money(s.meals.l)], ["Dinner", money(s.meals.d)], ["GST", pct(s.gstPct)], ["PST", pct(s.pstPct)], ["Honoraria account", s.coding.honorarium], ["Mileage and meals account", s.coding.travel], ["Expense codes offered", (s.formAccounts || []).join(", ")],
    ["Travel — training question", onoff(s.fields.travel_training)], ["Card — product link", onoff(s.fields.card_link)], ["Card — order reference", onoff(s.fields.card_ref)], ["PO — notes on the order", onoff(s.fields.po_notes)], ["PO director level over", money(s.poThresholdCents)], ["Invoice tolerance", pct(s.tolerancePct)]];
}
function fbRateDiff(a, b) { const x = fbRateView(a), y = fbRateView(b); return x.map(([k, v], i) => [k, v, y[i][1]]).filter(([, v, w]) => v !== w); }
{
  const _rcSettingsFb = R["rc.settings"];
  R["rc.settings"] = function (S0, p, ctx) {
    const before = JSON.parse(JSON.stringify(S0.rcSettings));
    const poWf = S0.workflows.find((w) => w.code === "PURCHASE_ORDER"), step = poWf && S0.workflowSteps.find((x) => x.workflowId === poWf.id && x.roleCode === "EXECUTIVE"), stepWas = step?.thresholdMinCents;
    _rcSettingsFb(S0, p, ctx);
    const changes = fbRateDiff(before, S0.rcSettings);
    if (!changes.length) fail("Nothing was changed.");
    const log = (S0.rcSettingsLog = S0.rcSettingsLog || []);
    if (fbRatesDirect(ctx.auth)) {
      log.push({ id: ctx.id("rsl"), at: ctx.now, byName: p.__byName || ctx.actor.displayName, changes, status: p.__pendingId ? "Approved and applied" : "Applied", approvedByName: p.__pendingId ? ctx.actor.displayName : null });
      if (p.__pendingId) { const old = log.find((x) => x.pendingId === p.__pendingId); if (old) old.status = "Approved — see the next line"; }
      return;
    }
    // below Finance Manager: nothing changes yet — the change waits for the Finance Manager's approval
    S0.rcSettings = before; if (step) step.thresholdMinCents = stepWas;
    if (S0.audit[S0.audit.length - 1]?.action === "SETTINGS") S0.audit.pop();
    const id = ctx.id("rcs"), rec = { id, p: { ...p }, changes, byUserId: ctx.actor.id, byName: ctx.actor.displayName, at: ctx.now, status: "PENDING" };
    (S0.rcSettingsPending = S0.rcSettingsPending || []).push(rec);
    const inst = startApproval(S0, ctx, { workflowCode: "RC_SETTINGS", companyId: ctx.auth.employee?.companyId || S0.companies[0].id, entityType: "RcSettings", entityId: id, entityLabel: `Rates & coding change by ${ctx.actor.displayName}: ${changes.map((c) => c[0]).join(", ")}` });
    rec.approvalId = inst?.id;
    log.push({ id: ctx.id("rsl"), at: ctx.now, byName: ctx.actor.displayName, changes, status: "Waiting for the Finance Manager", pendingId: id });
    ctx.audit({ module: "requests", action: "SUBMIT", entityType: "RcSettings", entityId: id, summary: `${ctx.actor.displayName} asked to change rates and coding (${changes.map(([k, v, w]) => `${k}: ${v} → ${w}`).join("; ")}) — waiting for the Finance Manager.` });
  };
  const _applyOutcomeFb = applyOutcome;
  applyOutcome = function (S0, ctx, inst, outcome) {
    if (inst.entityType !== "RcSettings") return _applyOutcomeFb(S0, ctx, inst, outcome);
    const rec = byId(S0.rcSettingsPending || [], inst.entityId); if (!rec) return;
    const logRow = (S0.rcSettingsLog || []).find((x) => x.pendingId === rec.id);
    if (outcome === "APPROVED") { rec.status = "APPROVED"; R["rc.settings"](S0, { ...rec.p, __pendingId: rec.id, __byName: rec.byName }, ctx); }
    else { rec.status = "DECLINED"; if (logRow) { logRow.status = "Declined"; logRow.approvedByName = ctx.actor.displayName; } ctx.audit({ module: "requests", action: "REJECT", entityType: "RcSettings", entityId: rec.id, summary: `${ctx.actor.displayName} declined ${rec.byName}'s rates and coding change.` }); }
  };
  if (typeof TYPE_LABEL === "object") TYPE_LABEL.RcSettings = "Rates change";
  const _entityLinkFb = entityLink; entityLink = function (inst) { return inst.entityType === "RcSettings" ? `<button class="lnk" style="font-size:12px" data-go="/requests/rates">Open Rates &amp; coding →</button>` : _entityLinkFb(inst); };
  const _entityDetailFb = entityDetail; entityDetail = function (inst) { if (inst.entityType === "RcSettings") { const r = byId(S.rcSettingsPending || [], inst.entityId); if (r) return r.changes.map(([k, v, w]) => `${esc(k)}: ${esc(v)} → <strong>${esc(w)}</strong>`).join(" · "); } return _entityDetailFb(inst); };
}
{
  const ratesRoute = ROUTES.find((r) => r.re.test("/requests/rates"));
  const _vRates = ratesRoute ? ratesRoute.view : null;
  hr3Route("/requests/rates", () => rcIsFinance(A) || rcIsAdmin(A), () => {
    let h = _vRates ? _vRates() : "";
    const direct = fbRatesDirect(A), pend = (S.rcSettingsPending || []).filter((x) => x.status === "PENDING");
    const note = direct ? "" : `<div class="rc-note warn">Your changes go to the Finance Manager for approval. Nothing changes until they approve.</div>`;
    const pendHtml = pend.length ? card("Waiting for approval", `<ul class="rc-hist">${pend.map((r) => `<li><b>${esc(r.byName)}</b> asked ${esc(ago(r.at))}<div>${r.changes.map(([k, v, w]) => `${esc(k)}: ${esc(v)} → <strong>${esc(w)}</strong>`).join("<br>")}</div></li>`).join("")}</ul>`) : "";
    const log = (S.rcSettingsLog || []).slice().reverse();
    const hist = card("Change history", log.length ? `<ul class="rc-hist">${log.map((x) => `<li><b>${esc(x.byName)}</b> · ${esc(dTime(x.at))} · <span class="badge ${/Applied/.test(x.status) ? "tone-green" : /Declined/.test(x.status) ? "tone-red" : "tone-amber"}">${esc(x.status)}</span>${x.approvedByName ? ` <span class="hint">by ${esc(x.approvedByName)}</span>` : ""}<div>${x.changes.map(([k, v, w]) => `${esc(k)}: ${esc(v)} → <strong>${esc(w)}</strong>`).join("<br>")}</div></li>`).join("")}</ul>` : `<p class="hint" style="margin:0">No changes yet. Every change — who, when, and what it was before — is listed here.</p>`);
    const k = h.indexOf('<section class="card');
    h = k > 0 ? h.slice(0, k) + note + h.slice(k) : h + note;
    return h + `<div style="height:14px"></div>` + pendHtml + (pendHtml ? `<div style="height:14px"></div>` : "") + hist;
  });
}

/* ---------------- Timesheet: overtime goes to the banked balance at 1.5×, live (Kiona, My Timesheet) ---------------- */
/* overtime banked at 1.5× counts in Banked OT as soon as the timesheet is submitted (Kiona); it comes off again if the sheet is sent back */
const fbOtCredit = (S0, empId, year = 2026, statuses = ["SUBMITTED", "APPROVED", "LOCKED"]) => S0.timesheets.filter((t) => t.employeeId === empId && statuses.includes(t.status) && String(t.periodStart).startsWith(String(year))).reduce((s, t) => s + (t.otBankCreditHours || 0), 0);
function fbBankSheet(S0, ctx, sheet) {
  const o = sheetOvertime(S0, sheet), h = Math.round(((o.ot || 0) + (o.dot || 0)) * 100) / 100;
  if ((sheet.otChoice || "BANK") === "BANK" && h > 0) Object.assign(sheet, { otBankedHours: h, otBankCreditHours: Math.round(h * 150) / 100 });
  else { delete sheet.otBankedHours; delete sheet.otBankCreditHours; }
  return sheet.otBankCreditHours || 0;
}
{
  const _bankedAvailFb = bankedAvail;
  bankedAvail = function (S0, empId, excludeSheetId, year = 2026) { return _bankedAvailFb(S0, empId, excludeSheetId, year) + fbOtCredit(S0, empId, year); };
  const _leaveBalancesFb = leaveBalances;
  leaveBalances = function (empId, year = 2026) {
    const out = _leaveBalancesFb(empId, year), c = fbOtCredit(S, empId, year);
    const waiting = fbOtCredit(S, empId, year, ["SUBMITTED"]);
    return out.map((b) => (b.lt.code === "BANKED_OT" && c ? { ...b, ent: b.ent + c, avail: b.avail + c, has: true, credited: c, creditWaiting: waiting } : b));
  };
  Object.assign(R, {
    "timesheet.otChoice"(S0, p, ctx) {
      const emp = myEmp(S0, ctx), st = settingsFor(S0, emp.companyId);
      const sheet = ensureSheet(S0, ctx, emp, periodStartFor(p.periodStart, st.timesheetCadence));
      if (!["DRAFT", "REJECTED"].includes(sheet.status)) fail("This timesheet has been sent — the overtime choice can't change now.");
      sheet.otChoice = p.choice === "PAY" ? "PAY" : "BANK";
      ctx.audit({ module: "timesheets", action: "UPDATE", companyId: emp.companyId, summary: `${empName(emp)} chose to ${sheet.otChoice === "BANK" ? "bank" : "be paid for"} this period's overtime (${periodLabel(sheet.periodStart, sheet.periodEnd)}).` });
    },
  });
  const _saveTs = R["timesheet.save"];
  R["timesheet.save"] = function (S0, p, ctx) {
    _saveTs(S0, p, ctx);
    if (!p.submit) return;
    const emp = myEmp(S0, ctx), st = settingsFor(S0, emp.companyId), sheet = S0.timesheets.find((t) => t.employeeId === emp.id && t.periodStart === periodStartFor(p.periodStart, st.timesheetCadence));
    if (sheet && fbBankSheet(S0, ctx, sheet)) ctx.audit({ module: "timesheets", action: "UPDATE", companyId: sheet.companyId, summary: `${empName(emp)} submitted ${sheet.otBankedHours.toFixed(2)} h of overtime to bank — ${sheet.otBankCreditHours.toFixed(2)} h added to Banked OT (comes off if the timesheet is sent back).` });
  };
  const _decideTs = R["timesheet.decide"];
  R["timesheet.decide"] = function (S0, p, ctx) {
    _decideTs(S0, p, ctx);
    const sheet = byId(S0.timesheets, p.timesheetId); if (!sheet) return;
    const who = empName(byId(S0.employees, sheet.employeeId));
    if (sheet.status === "APPROVED") { if (fbBankSheet(S0, ctx, sheet)) ctx.audit({ module: "timesheets", action: "UPDATE", companyId: sheet.companyId, summary: `Approved: ${sheet.otBankedHours.toFixed(2)} h of ${who}'s overtime stays banked at 1.5× (${sheet.otBankCreditHours.toFixed(2)} h).` }); }
    else if (sheet.otBankCreditHours) { const was = sheet.otBankCreditHours; delete sheet.otBankedHours; delete sheet.otBankCreditHours; ctx.audit({ module: "timesheets", action: "UPDATE", companyId: sheet.companyId, summary: `${who}'s timesheet was sent back — the ${was.toFixed(2)} h of banked overtime comes off Banked OT until it is submitted again.` }); }
  };
  const _vMyTimeFb = vMyTime;
  vMyTime = function (q) {
    const html = _vMyTimeFb(q), T = UI.ts, e = A.employee; if (!e || !T) return html;
    const sheet = S.timesheets.find((t) => t.employeeId === e.id && t.periodStart === T.start), choice = sheet?.otChoice || "BANK", editable = T.editable;
    const box = `<div class="rc-note" id="fbOtBox" style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:0 0 10px"><span>Overtime this period <strong class="num" id="fbOtNow">—</strong></span>
      <label style="display:flex;gap:6px;align-items:center">Goes to ${editable ? `<select class="in" id="fbOtChoice" data-a="fbOtChoice" style="height:30px"><option value="BANK"${choice === "BANK" ? " selected" : ""}>Banked OT — 1.5 h for every hour</option><option value="PAY"${choice === "PAY" ? " selected" : ""}>My pay — at 1.5×</option></select>` : `<strong>${choice === "BANK" ? "Banked OT (1.5 h for every hour)" : "pay at 1.5×"}</strong>`}</label>
      <span id="fbOtGain"></span></div>`;
    const k = html.indexOf('<section class="card" id="tsg">');
    return k > 0 ? html.slice(0, k) + box + html.slice(k) : html;
  };
  const _tsTotalsFb = tsTotals;
  tsTotals = function () {
    const r = _tsTotalsFb.apply(this, arguments);
    try {
      const T = UI.ts; if (!T?.meta) return r;
      const wb = T.weekBreak, w1 = tsWeek(wb > 0 ? T.days.slice(0, wb) : T.days, wb > 0 ? T.meta.slice(0, wb) : T.meta, T.rules), w2 = wb > 0 ? tsWeek(T.days.slice(wb), T.meta.slice(wb), T.rules) : null;
      const ot = w1.ot + w1.dot + (w2 ? w2.ot + w2.dot : 0), used = T.days.reduce((s, d) => s + d.rows.reduce((t, x) => t + (Number(x.banked) || 0), 0), 0);
      const sheet = S.timesheets.find((t) => t.employeeId === T.empId && t.periodStart === T.start);
      const choice = document.getElementById("fbOtChoice")?.value || sheet?.otChoice || "BANK", gain = choice === "BANK" ? ot * 1.5 : 0;
      const credited = sheet?.otBankCreditHours, now = (T.bankAvail || 0) - used;
      const a = document.getElementById("fbOtNow"); if (a) a.textContent = `${ot.toFixed(2)} h`;
      const g = document.getElementById("fbOtGain");
      const sent = ["SUBMITTED", "APPROVED", "LOCKED"].includes(sheet?.status);
      if (g) g.innerHTML = sent ? (credited ? `${sheet.status === "SUBMITTED" ? "Submitted" : "Approved"}: <strong class="num">${credited.toFixed(2)} h</strong> added to Banked OT in Time off${sheet.status === "SUBMITTED" ? " — it comes off again if the timesheet is sent back" : ""}.` : `<span class="hint">No overtime banked on this timesheet.</span>`)
        : choice === "BANK" ? `Banked OT <strong class="num">${now.toFixed(2)} h</strong> → <strong class="num">${(now + gain).toFixed(2)} h</strong> when you submit <span class="hint">(${ot.toFixed(2)} h × 1.5 = ${gain.toFixed(2)} h)</span>` : `<span class="hint">Paid on the next pay run at 1.5×. Your banked OT stays at ${now.toFixed(2)} h.</span>`;
      const left = document.getElementById("ts-bk-left"); if (left && gain > 0 && !(credited != null)) left.title += ` · +${gain.toFixed(2)} h from this period's overtime once approved`;
    } catch { /* the sheet still works without the preview */ }
    return r;
  };
}

/* ---------------- forms & actions ---------------- */
window.FORMS_EXT.push({
  fbHol(f) { const d = fd(f); if (act("stat.save", { id: f.dataset.id || null, date: d.date, name: d.name }, f.dataset.id ? "Holiday saved." : "Holiday added — timesheets fill it in.")) { UI.fbHol = null; safeRender(); } },
  fbCu(f) { const d = fd(f); if (act("customer.save", { id: f.dataset.id || null, ...d }, f.dataset.id ? "Customer saved." : "Customer added.")) { UI.fbCu = null; safeRender(); } },
  invoice(f) { const d = fd(f); if (act("ar.create", { customerId: d.customerId, subtotalCents: toCents(d.subtotal), gst: !!d.gst, invoiceDate: d.invoiceDate, memo: d.memo, accountNumber: d.accountNumber, departmentId: d.departmentId, coded: true }, "Invoice sent and posted.")) { UI.modal = null; safeRender(); } },
  bill(f, ev) { const d = fd(f); const submit = ev.submitter?.value === "1"; const before = S.apInvoices.length; if (act("ap.create", { vendorId: d.vendorId, invoiceNumber: d.invoiceNumber, invoiceDate: d.invoiceDate, subtotalCents: toCents(d.subtotal), gst: !!d.gst, description: d.description, accountNumber: d.accountNumber, departmentId: d.departmentId, coded: true, submit, files: UI.files.billNew || [] }, submit ? "Bill sent for approval." : "Bill saved as a draft.")) { UI.modal = null; UI.apDraft = null; takeFiles("billNew"); go(`/finance/ap/${S.apInvoices[before].id}`); } },
  rcRates(f) {
    const d = fd(f), fields = {}; for (const k of ["travel_training", "card_link", "card_ref", "po_notes"]) fields[k] = !!d["f_" + k];
    const formAccounts = [...f.querySelectorAll('input[name="acct"]:checked')].map((x) => x.value);
    const p = { mileage: d.mileage, meals: { b: d.b, l: d.l, d: d.d }, gst: d.gst, pst: d.pst, coding: { honorarium: d.honorarium, travel: d.travel }, formAccounts, fields, threshold: d.threshold, tolerance: d.tolerance };
    rcAct(f, "rc.settings", p, fbRatesDirect(A) ? "Saved. Every new request uses these rates and codes; ones already sent keep theirs." : "Sent to the Finance Manager for approval. Nothing changes until they approve.");
  },
});
window.ACTIONS_EXT.push({
  apNewBillFor(el) { UI.apDraft = null; UI.files.billNew = []; UI.modal = billModal({ vendorId: el.dataset.id }); safeRender(); },
  fbHolEdit(el) { UI.fbHol = el.dataset.id; safeRender(); },
  fbHolCancel() { UI.fbHol = null; safeRender(); },
  fbHolYear(el) { UI.tabs.fbHolYear = el.dataset.v; safeRender(); },
  fbHolDel(el) { if (el.dataset.sure !== "1") { el.dataset.sure = "1"; el.textContent = "Remove — sure?"; return; } act("stat.remove", { id: el.dataset.id }, "Holiday removed. It stays in the audit log."); },
  fbCuEdit(el) { UI.fbCu = el.dataset.id; safeRender(); },
  fbCuCancel() { UI.fbCu = null; safeRender(); },
  fbPoAdd(el) {
    const po = document.getElementById(`fbPo_${el.dataset.id}`)?.value; if (!po) return;
    if (act("ap.addPo", { invoiceId: el.dataset.id, poId: po })) { if (can(A, "ap.approve")) act("match.run", { billId: el.dataset.id }); const b = byId(S.apInvoices, el.dataset.id); toast("Purchase order added", `${b.invoiceNumber} now has ${fbBillPos(b).length} purchase order${fbBillPos(b).length === 1 ? "" : "s"}${b.matchNote ? ` — ${b.matchStatus === "MATCHED" ? "matched" : "variance"}` : ""}.`, "ok"); safeRender(); }
  },
  fbPoOff(el) { if (act("ap.removePo", { invoiceId: el.dataset.id, poId: el.dataset.po }, "Purchase order taken off the bill.") && can(A, "ap.approve") && fbBillPos(byId(S.apInvoices, el.dataset.id)).length) act("match.run", { billId: el.dataset.id }); },
  fbPoCo(el) { UI.tabs.fbPoCo = el.dataset.v; safeRender(); },
  fbPoOpen(el) { const p = fbPoRows().find((x) => x.id === el.dataset.id); if (!p) return; UI.modal = fbPoModal(p); UI.modalWide = true; safeRender(); },
  fbMailPick(el) { UI.emailOpen = el.dataset.id; safeRender(); },
  fbMailGo(el) { UI.modal = null; go(el.dataset.go2); },
  fbOtChoice(el) { if (UI.ts?.start && act("timesheet.otChoice", { periodStart: UI.ts.start, choice: el.value })) { if (typeof tsTotals === "function") tsTotals(); } },
});

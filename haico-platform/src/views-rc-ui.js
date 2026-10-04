/* ==========================================================================
   views-rc-ui.js — the Requests menu: forms, My requests, request detail,
   Finance queue, All requests, Rates & coding, Request access, Email
   templates, and the one-page purchase order (print + PDF).
   ========================================================================== */

injectCss(`
.rc-route{display:flex;flex-wrap:wrap;gap:0;margin:0 0 14px;padding:0;list-style:none;counter-reset:rc}
.rc-route li{flex:1 1 140px;min-width:0;border-top:4px solid var(--border);padding:6px 8px 0 0;font-size:12.5px;color:var(--muted-fg)}
.rc-route li b{display:block;color:var(--fg);font-size:13px}
.rc-route li.done{border-color:var(--ok, #3e6b34)}.rc-route li.now{border-color:var(--warn, #b07d12)}.rc-route li.now b{color:var(--warn, #8a5a10)}.rc-route li.stop{border-color:var(--t-red,#9e2b2b)}
.rc-sec{border-top:1px solid var(--border);padding-top:14px;margin-top:14px}.rc-sec:first-child{border-top:0;margin-top:0;padding-top:0}
.rc-sec h3{display:flex;align-items:center;gap:8px;font-size:15px;margin:0 0 10px}
.rc-sec h3 .n{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--primary);color:var(--primary-fg,#fff);font-size:12px}
.rc-note{background:var(--row-head);border-radius:8px;padding:8px 12px;font-size:13px;margin:6px 0 12px}
.rc-note.warn{background:var(--t-amber-bg,#f8efd9);color:var(--t-amber,#7a5410)}
.rc-note.ok{background:var(--t-green-bg,#e7f0e3)}
.rc-lines .rc-line{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1.4fr) 70px minmax(0,1.2fr) minmax(0,1.2fr) auto;gap:8px;align-items:end;margin-bottom:8px}
.rc-lines .rc-line.rb{grid-template-columns:130px minmax(0,2fr) minmax(0,1.4fr) 110px auto}
@media (max-width:760px){.rc-lines .rc-line,.rc-lines .rc-line.rb{grid-template-columns:1fr 1fr}}
.rc-hist{list-style:none;margin:0;padding:0}.rc-hist li{border-left:2px solid var(--border);padding:0 0 10px 10px;font-size:13px}
.rc-paper{background:#fff;color:#16202b;border:1px solid #cfd6de;border-radius:6px;padding:22px 26px;max-width:820px}
.rc-paper .hd{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #a03c28;padding-bottom:10px;margin-bottom:12px}
.rc-paper table{width:100%;border-collapse:collapse}.rc-paper th,.rc-paper td{text-align:left;padding:7px 8px;border-bottom:1px solid #e3e8ee;font-size:13.5px;vertical-align:top}.rc-paper th{color:#5d6b79;font-weight:600;width:150px}
@media print{aside.side,.top,.topbar,header,.banner,.demo-bar,.foot,.crumb,.ph .acts,.rc-noprint,.fb-panel,.toasts{display:none!important}.main,.content{margin:0!important;padding:0!important}.rc-paper{border:0;max-width:none}}
`);

/* ---------------- menu: "Requests" replaces "My Requests & Expenses" ---------------- */
const rcCanRaise = () => !!A && (!!A.employee || rcForWhoGroups(S, A).length > 0);
{
  const sec = SECTIONS.find((s) => s.key === "my-requests");
  if (sec) {
    sec.label = "Requests";
    sec.tabs = [
      { href: "/requests/new/travel", label: "New Travel Request", perm: rcCanRaise },
      { href: "/requests/new/card", label: "New Credit Card Purchase", perm: rcCanRaise },
      { href: "/requests/new/expense", label: "New Expense Claim", perm: rcCanRaise },
      { href: "/requests/new/po", label: "New Purchase Order", perm: rcCanRaise },
      { href: "/requests/new/reimbursement", label: "New Reimbursement Claim", perm: rcCanRaise },
      { href: "/requests", label: "My requests", match: ["/me/requests", "/me/expenses"] },
      { href: "/approvals", label: "Waiting on me" },
      { href: "/requests/finance", label: "Finance queue", perm: () => rcIsFinance(A) },
      { href: "/requests/all", label: "All requests", perm: () => rcIsFinance(A) || rcIsExec(A) || A.roleCodes.includes("COMPANY_ADMIN") },
      { href: "/requests/rates", label: "Rates & coding", perm: () => rcIsFinance(A) || rcIsAdmin(A) },
    ];
  }
  const team = SECTIONS.find((s) => s.key === "team");
  if (team) team.tabs.push({ href: "/team/request-access", label: "Request access", perm: () => rcIsAdmin(A) || (!!A.employee && S.employees.some((e) => e.managerId === A.employee.id && e.status !== "TERMINATED")) });
  const adm = SECTIONS.find((s) => s.key === "admin");
  if (adm) adm.tabs.push({ href: "/admin/email-templates", label: "Email templates", perm: () => rcIsAdmin(A) });
  const _buildNavRc = buildNav;
  /* a top-level "Requests" menu of its own, right under Home, for everyone who can raise or follow a request */
  buildNav = function () {
    const groups = _buildNavRc();
    for (const g of groups) g.items = g.items.filter((it) => it.section !== "my-requests");
    const href = sectionHref("my-requests");
    if (href && A) {
      const back = navSafe(() => rcMine().filter((x) => x.status === "returned").length) + (rcIsFinance(A) ? navSafe(() => (S.rcRequests || []).filter((x) => x.status === "approved" && canSee(A, x.companyId)).length) : 0);
      const at = groups.findIndex((g) => g.label === "Home");
      groups.splice(at + 1, 0, { label: "Requests", flat: false, items: [{ title: "Requests", href, icon: "inbox", section: "my-requests", badge: back }] });
    }
    return groups.filter((g) => g.items.length);
  };
}
setTimeout(() => { if (typeof TS_PAGES !== "undefined") ["/requests", "/requests/all", "/requests/finance"].forEach((p) => TS_PAGES.add(p)); }, 0);

/* ---------------- lists ---------------- */
function rcMine() {
  const me = A.user.id, myEmp = A.employee?.id;
  return (S.rcRequests || []).filter((it) => it.requestedByUserId === me || it.preparedByUserId === me || (myEmp && it.forEmployeeId === myEmp && !it.external)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
function rcRowsTable(list, opts = {}) {
  return table(["Reference", "Type", "What it is", ...(opts.who ? ["For"] : []), ">Amount", "Status"], list.map((it) => {
    const tag = it.preparedByUserId && it.preparedByUserId === A.user.id && it.forEmployeeId !== A.employee?.id ? `<span class="badge tone-grey" style="margin-left:6px">For ${esc(rcForName(it).split(" (")[0])}</span>` : it.preparedByUserId && it.forEmployeeId === A.employee?.id && it.preparedByUserId !== A.user.id ? `<span class="badge tone-grey" style="margin-left:6px">Prepared by ${esc(byId(S.users, it.preparedByUserId)?.displayName || "")}</span>` : "";
    const amt = it.kind === "travel" || it.kind === "card" ? (it.finance ? money(it.finance.totalCents) : `<span class="hint">Set by Finance</span>`) : it.kind === "po" && !rcAmount(it) ? `<span class="hint">No estimate</span>` : money(rcAmount(it));
    return `<tr class="click" data-go="/requests/${it.id}"><td class="mono" style="white-space:nowrap">${esc(it.ref)}</td><td>${esc(RC_KINDS[it.kind].label)}</td><td>${esc(it.title)}${tag}</td>${opts.who ? `<td>${esc(rcForName(it))}${it.preparedByUserId ? `<div class="hint">via ${esc(byId(S.users, it.preparedByUserId)?.displayName || "")}</div>` : ""}</td>` : ""}${td(amt, 1)}<td>${rcPill(it.status)}</td></tr>`;
  }), opts.empty || "Nothing here yet.");
}
function vRcMine() {
  const mine = rcMine();
  const open = mine.filter((x) => ["submitted", "awaiting_director", "returned", "reapproval", "approved"].includes(x.status));
  const route = A.employee ? rcRoute(S, A.employee.id, todayStr(), [A.user.id]) : { ids: [], away: [] };
  const earlier = A.employee && typeof statusRows === "function" ? statusRows(A.employee.id).filter((r) => r.kind !== "Time off") : [];
  return ph("My requests", "Everything you raised — for yourself, or for someone else — and where each one is sitting now.", "") + flashHtml()
    + (route.away.length ? `<div class="rc-note warn">${esc(rcNames(S, route.away).join(", "))} ${route.away.length > 1 ? "are" : "is"} on time off today, so anything you send also goes to ${esc(rcNames(S, route.ids.filter((x) => !route.away.includes(x))).join(", "))}. Whoever decides first, decides.</div>` : "")
    + `<div class="stats">${stat("Open", String(open.length), "waiting on someone, or with Finance", open.length ? "warn" : "")}${stat("Returned to you", String(mine.filter((x) => x.status === "returned").length), "fix and resubmit")}${stat("Done", String(mine.filter((x) => ["processed", "ready", "closed"].includes(x.status)).length), "processed, paid or PO ready", "good")}${stat("Everything", String(mine.length), "")}</div>`
    + `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:0 0 16px">${Object.entries(RC_KINDS).map(([k, v]) => `<button class="cocard" data-go="${v.href}" style="gap:3px;text-align:left"><b style="font-size:13.5px">New ${esc(v.label.toLowerCase())}</b><small style="font-size:11.5px">${esc({ travel: "Flights, ferries, hotel. Finance books it.", card: "Bought on the company card. No card details here.", expense: "Honorarium, mileage and meals for a meeting.", po: "A commitment to a supplier. Prints on one page.", reimb: "Something you paid for yourself — we pay you back." }[k])}</small></button>`).join("")}</div>`
    + cardFlush("Your requests", rcRowsTable(mine, { empty: "You haven't raised anything yet. Start with one of the boxes above." }))
    + (earlier.length ? `<div style="height:14px"></div>` + cardFlush("Earlier requests (before the Request Centre)", statusTable(earlier)) : "");
}
function vRcAll() {
  const f = UI.tabs.rcAll || "";
  const list = (S.rcRequests || []).filter((it) => rcCanSee(A, it) && (!f || it.kind === f)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const chips = [["", "Everything"], ...Object.entries(RC_KINDS).map(([k, v]) => [k, v.label])].map(([k, l]) => `<button class="hchip ${k === f ? "on" : ""}" data-a="rcAllTab" data-v="${k}">${esc(l)}</button>`).join("");
  return ph("All requests", rcIsExec(A) && !rcIsFinance(A) ? "Every request in the group, read only." : A.roleCodes.includes("COMPANY_ADMIN") && !rcIsFinance(A) ? "Every request for your company." : "Every request, whoever raised it.") + flashHtml()
    + `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px">${chips}</div>` + cardFlush("", rcRowsTable(list, { who: true, empty: "No requests yet." }));
}
function vRcFinance() {
  const q = (S.rcRequests || []).filter((it) => it.status === "approved" && canSee(A, it.companyId)).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const pos = (S.rcRequests || []).filter((it) => it.kind === "po" && ["ready", "reapproval"].includes(it.status) && canSee(A, it.companyId));
  return ph("Finance queue", "Approved and waiting. Travel and card purchases: record what was charged with GST and PST and attach the confirmation. Claims: record as paid. Purchase orders: record the invoice amount, then close.") + flashHtml()
    + `<div class="stats">${stat("To process", String(q.length), q.length ? "oldest first" : "nothing waiting", q.length ? "warn" : "good")}${stat("Open purchase orders", String(pos.filter((x) => x.status === "ready").length), money(pos.reduce((s, x) => s + (x.po.approvedCents || 0), 0)))}${stat("Reapproval", String(pos.filter((x) => x.status === "reapproval").length), "invoice beyond tolerance")}</div>`
    + cardFlush("Approved — waiting for Finance", rcRowsTable(q, { who: true, empty: "Nothing is waiting for Finance." })) + `<div style="height:14px"></div>`
    + cardFlush("Purchase orders — invoice amount and close", rcRowsTable(pos, { who: true, empty: "No open purchase orders." }));
}

/* ---------------- the forms ---------------- */
const rcDraft = (kind) => { if (!UI.rcDraft || UI.rcDraft.kind !== kind) UI.rcDraft = { kind, v: {}, lines: kind === "card" ? [{}, {}] : kind === "reimb" ? [{}] : [] }; return UI.rcDraft; };
function rcKeep(form) {
  const d = UI.rcDraft; if (!d || !form) return;
  for (const [k, v] of new FormData(form)) { const m = /^l(\d+)_(\w+)$/.exec(k); if (m) { d.lines[+m[1]] = d.lines[+m[1]] || {}; d.lines[+m[1]][m[2]] = v; } else d.v[k] = v; }
}
function rcAcctOpts(companyId, sel) {
  const nums = S.rcSettings.formAccounts;
  return S.accounts.filter((a) => a.companyId === companyId && nums.includes(a.number) && a.isActive !== false).sort((a, b) => a.number.localeCompare(b.number)).map((a) => opt(a.number, `${a.number} — ${a.name}`, a.number === sel)).join("");
}
const rcDeptOpts = (companyId, sel) => S.departments.filter((d) => d.companyId === companyId && d.isActive !== false).map((d) => opt(d.id, `${d.code} — ${d.name}`, d.id === sel)).join("");
function rcForWhoField(kind, v) {
  const groups = rcForWhoGroups(S, A);
  const meOpt = A.employee ? opt("", `Myself — ${A.user.displayName}`, !v.forWho) : "";
  return `<div class="fld" style="grid-column:1/-1"><label for="rcFor">Who is this for</label><select class="in" id="rcFor" name="forWho" data-a="rcForWho">${meOpt}${groups.map(([t, l]) => `<optgroup label="${esc(t)}">${l.map((e) => opt(e.id, `${empName(e)} · ${co(e.companyId).displayName} · ${byId(S.departments, e.departmentId)?.name || ""}`, v.forWho === e.id)).join("")}</optgroup>`).join("")}${kind === "expense" && A.employee ? `<optgroup label="Outside the organization">${opt("external", "Someone outside the organization — an Elder, a guest speaker…", v.forWho === "external")}</optgroup>` : ""}</select>
    <span class="hint">${groups.length ? "Raise it on someone's behalf and the record shows both names. Not listed? Your supervisor can add them under My Team › Request access." : "You can raise requests for yourself."}</span></div>`;
}
function rcSubject(v) { const id = v.forWho && v.forWho !== "external" ? v.forWho : A.employee?.id; return id ? byId(S.employees, id) : null; }
function rcRoutePreview(kind, v) {
  const e = rcSubject(v); if (!e) return "";
  const r = rcRoute(S, e.id, todayStr(), [A.user.id, rcUser(S, e.id)?.id].filter(Boolean));
  const names = rcNames(S, r.ids);
  const dir = kind === "po" ? ` If the estimate is over ${money(S.rcSettings.poThresholdCents)}, director level is asked next.` : kind === "expense" && v.forWho === "external" ? " Because it is for someone outside the organization, director level is asked next." : kind === "travel" || kind === "card" ? " From $5,000, director level is asked next." : kind === "reimb" ? " From $5,000, director level is asked next." : "";
  return `<div class="rc-note ${r.away.length ? "warn" : "ok"}">${r.away.length ? `${esc(rcNames(S, r.away).join(", "))} ${r.away.length > 1 ? "are" : "is"} on time off today, so it goes to <b>${esc(rcOrList(names))}</b> — whoever decides first.` : `Goes to <b>${esc(names[0] || "the Executive Director")}</b>.`}${esc(dir)} You don't choose the approver — the system knows who it is.</div>`;
}
function rcSec(n, title, body) { return `<section class="rc-sec"><h3><span class="n">${n}</span>${esc(title)}</h3>${body}</section>`; }
function vRcForm(kindParam, editId) {
  const kind = { travel: "travel", card: "card", expense: "expense", po: "po", reimbursement: "reimb" }[kindParam];
  if (!kind) return vNotFound();
  const editing = editId ? byId(S.rcRequests, editId) : null;
  if (editId && (!editing || editing.status !== "returned" || ![editing.requestedByUserId, editing.preparedByUserId].includes(A.user.id))) return ph("Not available") + card("", "<p>Only a returned request can be corrected, by the person who raised it.</p>");
  if (!editing && !rcCanRaise()) return ph("Not available") + card("", "<p>This sign-in isn't linked to an employee, and has nobody to raise requests for.</p>");
  const d = rcDraft(kind + (editing ? ":" + editing.id : ""));
  if (editing && !d.loaded) { d.loaded = true; Object.assign(d.v, rcFormValues(editing)); d.lines = rcFormLines(editing); }
  const v = d.v, e = editing ? byId(S.employees, editing.forEmployeeId) : rcSubject(v);
  const cid = editing ? editing.companyId : e?.companyId || defCo();
  const dep = v.departmentId && byId(S.departments, v.departmentId)?.companyId === cid ? v.departmentId : e?.departmentId;
  const set = S.rcSettings, fieldOn = (k) => set.fields[k] !== false;
  const defAcct = { travel: "5300", card: "5205", po: "5215", reimb: "5205" }[kind];
  const deptCode = `<div class="fld"><label for="rcDep">Department</label><select class="in" id="rcDep" name="departmentId" required>${rcDeptOpts(cid, dep)}</select></div>${kind !== "expense" && kind !== "card" && kind !== "reimb" ? `<div class="fld"><label for="rcAcct">Expense code</label><select class="in" id="rcAcct" name="accountNumber" required>${rcAcctOpts(cid, v.accountNumber || defAcct)}</select></div>` : ""}`;
  const val = (k, dflt = "") => esc(v[k] ?? dflt);
  const files = `<div class="form-grid">${fileDrop("rc_" + kind, "Attachments", kind === "reimb" ? "Receipts — PDF, JPG or PNG" : kind === "po" ? "Quotes — PDF, JPG or PNG" : "Quotes, an agenda, an itinerary — PDF, JPG or PNG")}</div>`;
  let secs = [];
  const forWho = editing ? `<div class="rc-note">For <b>${esc(rcForName(editing))}</b>${editing.preparedByUserId ? ` · prepared by ${esc(byId(S.users, editing.preparedByUserId)?.displayName || "")}` : ""}. Same reference (${esc(editing.ref)}), history kept.</div>` : `<div class="form-grid">${rcForWhoField(kind, v)}</div>`;
  if (kind === "travel") secs = [
    ["Who it is for, and the details", `${forWho}<div class="form-grid"><div class="fld"><label for="rcFrom">Travelling from</label><input class="in" id="rcFrom" name="from" value="${val("from", co(cid)?.city ? co(cid).city + ", BC" : "")}"></div><div class="fld"><label for="rcTo">Destination</label><input class="in" id="rcTo" name="to" required placeholder="Vancouver, BC" value="${val("to")}"></div>
      <div class="fld" style="grid-column:1/-1"><label for="rcWhy">Reason for travel</label><textarea class="in" id="rcWhy" name="reason" rows="2" required placeholder="What the trip is for, and who else is going.">${val("reason")}</textarea></div>${deptCode}</div>`],
    ["Travel and dates", `<div class="form-grid"><div class="fld"><label for="rcOut">Departing</label><input class="in" type="date" id="rcOut" name="out" required value="${val("out")}"></div><div class="fld"><label for="rcBack">Returning</label><input class="in" type="date" id="rcBack" name="back" required value="${val("back")}"></div>
      <div class="fld"><label for="rcTr">Transportation</label><select class="in" id="rcTr" name="transport">${["Ferry and vehicle", "Flight", "Vehicle only"].map((x) => opt(x, x, v.transport === x)).join("")}</select></div><div class="fld"><label for="rcAc">Accommodation</label><select class="in" id="rcAc" name="accommodation">${["Hotel, booked by Finance", "Not required"].map((x) => opt(x, x, v.accommodation === x)).join("")}</select></div>
      ${fieldOn("travel_training") ? `<div class="fld"><label for="rcTrn">Training or conference?</label><select class="in" id="rcTrn" name="training">${["No", "Yes"].map((x) => opt(x, x, v.training === x)).join("")}</select></div>` : ""}<div class="fld"><label for="rcEst">Estimated cost</label><input class="in num" id="rcEst" name="estimate" inputmode="decimal" required placeholder="0.00" value="${val("estimate")}"><span class="hint">Only decides whether director level is needed. Finance records the actual amount, with GST and PST.</span></div></div>`],
    ["Attachments", files]];
  if (kind === "card") secs = [
    ["Who it is for, and the supplier", `${forWho}<div class="form-grid"><div class="fld"><label for="rcSup">Supplier</label><input class="in" id="rcSup" name="supplier" required placeholder="Example Office Supply Co." value="${val("supplier")}"></div>${fieldOn("card_ref") ? `<div class="fld"><label for="rcRef">Order reference <span class="hint" style="font-weight:400">— optional</span></label><input class="in" id="rcRef" name="orderRef" value="${val("orderRef")}"></div>` : ""}
      <div class="fld" style="grid-column:1/-1"><label for="rcWhy">What it is for</label><textarea class="in" id="rcWhy" name="reason" rows="2" required>${val("reason")}</textarea></div></div>`],
    ["Items", `<div class="rc-lines">${d.lines.map((l, i) => `<div class="rc-line"><div class="fld"><label for="l${i}d">Item ${i + 1}${i ? ` <span class="hint" style="font-weight:400">— optional</span>` : ""}</label><input class="in" id="l${i}d" name="l${i}_description" value="${esc(l.description || "")}"${i ? "" : " required"}></div>${fieldOn("card_link") ? `<div class="fld"><label for="l${i}u">Product link</label><input class="in" id="l${i}u" name="l${i}_link" placeholder="https://" value="${esc(l.link || "")}"></div>` : "<div></div>"}<div class="fld"><label for="l${i}q">Qty</label><input class="in num" type="number" min="1" id="l${i}q" name="l${i}_qty" value="${esc(l.qty || 1)}"></div><div class="fld"><label for="l${i}p">Department</label><select class="in" id="l${i}p" name="l${i}_departmentId" required>${rcDeptOpts(cid, l.departmentId || dep)}</select></div><div class="fld"><label for="l${i}c">Expense code</label><select class="in" id="l${i}c" name="l${i}_accountNumber" required>${rcAcctOpts(cid, l.accountNumber || defAcct)}</select></div>${d.lines.length > 1 ? `<button type="button" class="lnk" style="color:var(--t-red);font-size:12px;margin-bottom:10px" data-a="rcLineDel" data-i="${i}">remove</button>` : "<span></span>"}</div>`).join("")}</div>
      ${d.lines.length < 6 ? `<button type="button" class="lnk" data-a="rcLineAdd">+ add an item</button>` : ""}<div class="form-grid" style="margin-top:10px"><div class="fld"><label for="rcEst">Estimated cost</label><input class="in num" id="rcEst" name="estimate" inputmode="decimal" required placeholder="0.00" value="${val("estimate")}"><span class="hint">Only decides whether director level is needed.</span></div></div>
      <div class="rc-note">No prices or card details to enter. Finance records what was charged, with GST and PST, and attaches the receipt. Each item can carry its own department and expense code.</div>`],
    ["Attachments", files]];
  if (kind === "expense") {
    const ext = v.forWho === "external";
    const saved = A.employee ? rcAccessOf(S, A.employee.id).outside || [] : [];
    secs = [
      ["Who it is for, and the meeting", `${forWho}${ext ? `<div class="rc-note warn">A claim for someone outside the organization takes one more approval: your supervisor, then director level, before Finance pays it.</div>${saved.length ? `<div class="hint" style="margin:-4px 0 8px">People you often claim for: ${saved.map((n) => `<button type="button" class="chip" data-a="rcPickOutside" data-v="${esc(n)}">${esc(n)}</button>`).join(" ")}</div>` : ""}<div class="form-grid"><div class="fld"><label for="rcXn">Their full name</label><input class="in" id="rcXn" name="xname" required placeholder="As it should appear on the payment" value="${val("xname")}"></div><div class="fld"><label for="rcXr">Why they attended</label><select class="in" id="rcXr" name="xrole">${RC_OUTSIDE_ROLES.map((r) => opt(r, r, v.xrole === r)).join("")}</select></div><div class="fld"><label for="rcXa">Mailing address</label><input class="in" id="rcXa" name="xaddr" placeholder="For the cheque or the receipt" value="${val("xaddr")}"></div><div class="fld"><label for="rcXp">Paid by</label><select class="in" id="rcXp" name="xpay">${["Cheque", "Direct deposit"].map((x) => opt(x, x === "Direct deposit" ? "Direct deposit — details held by Finance" : x, v.xpay === x)).join("")}</select></div></div>` : ""}
        <div class="form-grid"><div class="fld"><label for="rcEv">Meeting or event</label><input class="in" id="rcEv" name="event" required placeholder="Fisheries technical committee" value="${val("event")}"></div><div class="fld"><label for="rcLoc">Location</label><input class="in" id="rcLoc" name="location" value="${val("location")}"></div>
        <div class="fld"><label for="rcF1">First day</label><input class="in" type="date" id="rcF1" name="from" required value="${val("from")}"></div><div class="fld"><label for="rcF2">Last day</label><input class="in" type="date" id="rcF2" name="to" required value="${val("to")}"></div>${deptCode}
        <div class="fld"><label for="rcHa">Expense code — honorarium</label><select class="in" id="rcHa" name="honorariumAccount" required>${rcAcctOpts(cid, v.honorariumAccount || set.coding.honorarium)}</select></div><div class="fld"><label for="rcTa">Expense code — mileage and meals</label><select class="in" id="rcTa" name="travelAccount" required>${rcAcctOpts(cid, v.travelAccount || set.coding.travel)}</select></div></div>
        <div class="rc-note">Both codes start the way Finance has set them. Change them if this claim belongs somewhere else.</div>`],
      ["Honorarium and mileage", `<div class="form-grid"><div class="fld"><label for="rcHon">Honorarium</label><input class="in num" id="rcHon" name="honorarium" inputmode="decimal" placeholder="0.00" value="${val("honorarium")}" data-rc-calc></div><div class="fld"><label for="rcKm">Kilometres driven</label><input class="in num" type="number" min="0" id="rcKm" name="km" value="${val("km")}" data-rc-calc></div></div><div class="rc-note">Mileage is paid at ${money(set.mileageCents)} a kilometre — the rate Finance has set: <b data-rc-out="mile">${money(Math.round((Number(v.km) || 0) * set.mileageCents))}</b>.</div>`],
      ["Meals", `<div class="form-grid"><div class="fld"><label for="rcB">Breakfasts — ${money(set.meals.b)} each</label><input class="in num" type="number" min="0" id="rcB" name="breakfasts" value="${val("breakfasts")}" data-rc-calc></div><div class="fld"><label for="rcL">Lunches — ${money(set.meals.l)} each</label><input class="in num" type="number" min="0" id="rcL" name="lunches" value="${val("lunches")}" data-rc-calc></div><div class="fld"><label for="rcD">Dinners — ${money(set.meals.d)} each</label><input class="in num" type="number" min="0" id="rcD" name="dinners" value="${val("dinners")}" data-rc-calc></div></div><div class="rc-note">Meals: <b data-rc-out="meals">—</b> · Total: <b data-rc-out="total">—</b></div>`]];
  }
  if (kind === "po") {
    const vendors = S.vendors.filter((x) => x.companyId === cid && x.status !== "INACTIVE").sort((a, b) => a.name.localeCompare(b.name));
    secs = [["Who it is for, the supplier and the order", `${forWho}<div class="form-grid"><div class="fld"><label for="rcVen">Supplier</label><select class="in" id="rcVen" name="vendorId" data-a="rcVendor">${opt("", "— a new supplier (type it) —", !v.vendorId)}${vendors.map((x) => opt(x.id, x.name, x.id === v.vendorId)).join("")}</select></div>${!v.vendorId ? `<div class="fld"><label for="rcVn">New supplier's name</label><input class="in" id="rcVn" name="vendorName" placeholder="Island Safety Equipment" value="${val("vendorName")}"><span class="hint">Finance adds them to the vendor list.</span></div>` : ""}
      <div class="fld"><label for="rcEst">Estimated amount <span class="hint" style="font-weight:400">— optional</span></label><input class="in num" id="rcEst" name="estimate" inputmode="decimal" placeholder="Leave blank if you don't know yet" value="${val("estimate")}"></div>${deptCode}
      <div class="fld" style="grid-column:1/-1"><label for="rcDesc">What is being ordered</label><textarea class="in" id="rcDesc" name="description" rows="2" required placeholder="Describe it the way the supplier will recognise it.">${val("description")}</textarea></div>
      ${fieldOn("po_notes") ? `<div class="fld" style="grid-column:1/-1"><label for="rcNotes">Notes printed on the order <span class="hint" style="font-weight:400">— optional</span></label><input class="in" id="rcNotes" name="notes" placeholder="Deliver to the Masset office." value="${val("notes")}"></div>` : ""}</div>`], ["Attachments", files]];
  }
  if (kind === "reimb") secs = [
    ["Who it is for, and what it was for", `${forWho}<div class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="rcPur">What you paid for, and why</label><input class="in" id="rcPur" name="purpose" required placeholder="Supplies for the community open house" value="${val("purpose")}"></div>${deptCode}</div>`],
    ["What you paid", `<div class="rc-lines">${d.lines.map((l, i) => `<div class="rc-line rb"><div class="fld"><label for="l${i}t">Date</label><input class="in" type="date" id="l${i}t" name="l${i}_date" value="${esc(l.date || "")}"></div><div class="fld"><label for="l${i}w">What it was</label><input class="in" id="l${i}w" name="l${i}_what" value="${esc(l.what || "")}"></div><div class="fld"><label for="l${i}c">Expense code</label><select class="in" id="l${i}c" name="l${i}_accountNumber" required>${rcAcctOpts(cid, l.accountNumber || defAcct)}</select></div><div class="fld"><label for="l${i}a">Amount paid</label><input class="in num" id="l${i}a" name="l${i}_amount" inputmode="decimal" placeholder="incl. tax" value="${esc(l.amount || "")}" data-rc-calc></div>${d.lines.length > 1 ? `<button type="button" class="lnk" style="color:var(--t-red);font-size:12px;margin-bottom:10px" data-a="rcLineDel" data-i="${i}">remove</button>` : "<span></span>"}</div>`).join("")}</div>
      ${d.lines.length < 8 ? `<button type="button" class="lnk" data-a="rcLineAdd">+ add a line</button>` : ""}<div class="form-grid" style="margin-top:10px"><div class="fld"><label for="rcKm">Kilometres driven <span class="hint" style="font-weight:400">— optional</span></label><input class="in num" type="number" min="0" id="rcKm" name="km" value="${val("km")}" data-rc-calc></div><div class="fld"><label for="rcMa">Expense code — mileage</label><select class="in" id="rcMa" name="mileageAccount" required>${rcAcctOpts(cid, v.mileageAccount || set.coding.travel)}</select></div></div>
      <div class="rc-note">Mileage at ${money(set.mileageCents)} a km · Total to pay back: <b data-rc-out="total">—</b>. Attach the receipts below.</div>`],
    ["Receipts", files]];
  const sumN = secs.length + 1;
  const body = secs.map(([t, b], i) => rcSec(i + 1, t, b)).join("") + rcSec(sumN, "Check and submit", `${editing ? "" : rcRoutePreview(kind, v)}<div class="form-row"><button class="btn pri">${editing ? "Resubmit" : "Submit request"}</button>${editing ? `<button type="button" class="btn" data-go="/requests/${editing.id}">Cancel</button>` : ""}<span class="hint">Everything is on this one page. Check it once, then submit.</span></div>`);
  const t = { travel: ["New travel request", "Flights, ferries, accommodation. Supervisor, then Finance books it and records the cost."], card: ["New credit card purchase", "Items to buy on the company card. Each line carries its own department and expense code."], expense: ["New expense claim", "Honorarium, mileage and meals for a meeting you attended. Supervisor, then Finance pays it."], po: ["New purchase order", `Your supervisor approves it, and director level too if it's over ${money(S.rcSettings.poThresholdCents)}. The last approval produces the printed order.`], reimb: ["New reimbursement claim", "Something you bought with your own money for work. Supervisor, then Finance pays you back."] }[kind];
  return ph(editing ? `Correct ${editing.ref}` : t[0], editing ? "Fix what was asked, then resubmit. The reference and the history stay the same." : t[1], "", crumb(editing ? `/requests/${editing.id}` : "/requests", editing ? editing.ref : "My requests")) + flashHtml()
    + card("", `<form data-f="rcSubmit" data-kind="${kind}"${editing ? ` data-id="${editing.id}"` : ""}>${body}</form>`);
}
const rcAcctName = (cid, n) => { const a = S.accounts.find((x) => x.companyId === cid && x.number === n); return a ? `${a.number} — ${a.name}` : n; };
function rcFormValues(it) {
  const c = (x) => (x == null ? "" : (x / 100).toFixed(2));
  const base = { departmentId: it.departmentId, accountNumber: it.accountNumber };
  if (it.kind === "travel") return { ...base, ...it.travel, training: it.travel.training ? "Yes" : "No", estimate: c(it.travel.estimateCents) };
  if (it.kind === "card") return { ...base, supplier: it.card.supplier, orderRef: it.card.orderRef, reason: it.card.reason, estimate: c(it.card.estimateCents) };
  if (it.kind === "expense") return { ...base, honorariumAccount: it.expense.coding.honorarium, travelAccount: it.expense.coding.travel, event: it.expense.event, location: it.expense.location, from: it.expense.from, to: it.expense.to, honorarium: c(it.expense.honorariumCents), km: it.expense.km, breakfasts: it.expense.breakfasts, lunches: it.expense.lunches, dinners: it.expense.dinners };
  if (it.kind === "po") return { ...base, vendorId: it.po.vendorId || "", vendorName: it.po.vendorName, estimate: c(it.po.estimateCents), description: it.po.description, notes: it.po.notes };
  return { ...base, purpose: it.reimb.purpose, km: it.reimb.km, mileageAccount: it.reimb.mileageAccount || S.rcSettings.coding.travel };
}
function rcFormLines(it) {
  if (it.kind === "card") return it.card.lines.map((l) => ({ ...l }));
  if (it.kind === "reimb") return it.reimb.lines.map((l) => ({ ...l, amount: (l.amountCents / 100).toFixed(2) }));
  return [];
}
/* live totals on claims */
function rcCalc(form) {
  const s = S.rcSettings, g = (n) => Number(form.querySelector(`[name="${n}"]`)?.value) || 0, out = (k, v) => { const el = form.querySelector(`[data-rc-out="${k}"]`); if (el) el.textContent = v; };
  if (form.dataset.kind === "expense") { const mile = Math.round(g("km") * s.mileageCents), meals = g("breakfasts") * s.meals.b + g("lunches") * s.meals.l + g("dinners") * s.meals.d; out("mile", money(mile)); out("meals", money(meals)); out("total", money(Math.round(g("honorarium") * 100) + mile + meals)); }
  if (form.dataset.kind === "reimb") { let t = Math.round(g("km") * s.mileageCents); form.querySelectorAll('[name$="_amount"]').forEach((el) => { t += Math.round((Number(el.value) || 0) * 100); }); out("total", money(t)); }
}
document.addEventListener("input", (ev) => { if (ev.target.hasAttribute?.("data-rc-calc")) { const f = ev.target.closest("form"); if (f) rcCalc(f); } });

/* ---------------- one request ---------------- */
function rcRouteStrip(it) {
  const inst = byId(S.approvals, it.currentApprovalId);
  const steps = inst ? activeSteps(S, inst) : [];
  const fin = { travel: ["Finance", "Books it, records the cost"], card: ["Finance", "Buys it, records the cost"], expense: ["Finance", "Pays it"], reimb: ["Finance", "Pays you back"], po: ["PO ready", "Print or download"] }[it.kind];
  const items = [["Submitted", byId(S.users, it.requestedByUserId)?.displayName || ""], ...steps.map((s) => [s.approverType === "MANAGER" ? "Supervisor" : s.name, s.approverType === "MANAGER" ? rcOrList(rcNames(S, inst.approverUserIds || [])) || whoIsNext(S, inst) : "Executive Director or CEO"]), fin, ...(it.kind === "po" ? [] : [["Processed", it.kind === "expense" || it.kind === "reimb" ? "Recorded as paid" : "Confirmation attached"]])];
  const doneIdx = ["processed", "closed"].includes(it.status) ? 99 : it.status === "ready" ? items.length - 1 : it.status === "approved" ? steps.length + 1 : inst && inst.status === "PENDING" ? inst.currentStep : 1;
  const stop = ["declined", "returned", "withdrawn"].includes(it.status);
  return `<ol class="rc-route">${items.map(([t, s], i) => `<li class="${stop && i === (inst?.currentStep || 1) ? "stop" : i < doneIdx || doneIdx === 99 ? "done" : i === doneIdx ? "now" : ""}"><b>${esc(t)}</b>${esc(s)}</li>`).join("")}</ol>`;
}
function rcDetailKv(it) {
  const kv = (rows) => `<dl class="kv">${rows.filter((r) => r && r[1] != null && r[1] !== "").map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const d = byId(S.departments, it.departmentId);
  const rows = [["Reference", `<span class="mono">${esc(it.ref)}</span>`], ["For", `${esc(rcForName(it))} · raised ${esc(dLong(it.createdAt.slice(0, 10)))}`], it.preparedByUserId ? ["Prepared by", esc(byId(S.users, it.preparedByUserId)?.displayName || "")] : null, ["Company", coTag(it.companyId)], ["Department", d ? esc(`${d.code} — ${d.name}`) : "—"], it.accountNumber && ["travel", "po"].includes(it.kind) ? ["Expense code", esc(rcAcctName(it.companyId, it.accountNumber))] : null];
  if (it.kind === "travel") { const t = it.travel; rows.push(["Route", esc(`${t.from || "—"} → ${t.to}`)], ["Dates", esc(`${dLong(t.out)} to ${dLong(t.back)}`)], ["Reason", esc(t.reason)], ["Travelling by", esc(`${t.transport} · ${t.accommodation}`)], t.training ? ["Training or conference", "Yes"] : null, ["Estimated cost", money(t.estimateCents)]); }
  if (it.kind === "card") rows.push(["What it is for", esc(it.card.reason)], it.card.orderRef ? ["Order reference", esc(it.card.orderRef)] : null, ["Estimated cost", money(it.card.estimateCents)]);
  if (it.kind === "expense") { const x = it.expense; rows.push(["Meeting", esc(x.event)], ["Where", esc(x.location || "—")], ["Dates", esc(`${dLong(x.from)} to ${dLong(x.to)}`)]); if (it.external) rows.push(["Claimant", `${esc(it.external.name)} <span class="badge tone-amber">Outside the organization</span><div class="hint">${esc(it.external.role)} · ${esc(it.external.address || "address to follow")} · ${esc(it.external.payBy)}</div>`]); }
  if (it.kind === "po") rows.push(["Supplier", `${esc(it.po.vendorName)}${it.po.newSupplier ? ' <span class="badge tone-amber">New supplier</span>' : ""}`], ["What is ordered", esc(it.po.description)], it.po.notes ? ["Notes on the order", esc(it.po.notes)] : null, ["Estimated amount", it.po.estimateCents ? money(it.po.estimateCents) : "No estimate"], it.po.invoice ? ["Invoice amount", `${money(it.po.invoice.amountCents)} <span class="hint">— ${esc(it.po.invoice.reason)}</span>`] : null);
  if (it.kind === "reimb") rows.push(["What for", esc(it.reimb.purpose)]);
  rows.push(["Amount", it.finance ? `<strong>${money(it.finance.totalCents)}</strong> <span class="hint">(${money(it.finance.subtotalCents)} + GST ${money(it.finance.gstCents)} + PST ${money(it.finance.pstCents)})</span>` : it.kind === "travel" || it.kind === "card" ? `<span class="hint">Recorded by Finance, with GST and PST, when processed</span>` : `<strong>${money(rcAmount(it))}</strong>`]);
  let lines = "";
  if (it.kind === "card") lines = table(["Item", ">Qty", "Department", "Expense code", "Link"], it.card.lines.map((l, i) => `<tr><td>${esc(l.description)}</td>${td(String(l.qty), 1)}<td>${esc(byId(S.departments, l.departmentId)?.name || "")}</td><td>${esc(rcAcctName(it.companyId, l.accountNumber))}</td><td>${l.link ? `<a href="${esc(l.link)}" target="_blank" rel="noopener">Product page</a>` : "—"}</td></tr>`));
  if (it.kind === "expense") { const x = it.expense; lines = table(["Line", "Expense code", ">Amount"], [x.honorariumCents ? `<tr><td>Honorarium</td><td>${esc(rcAcctName(it.companyId, x.coding.honorarium))}</td>${td(money(x.honorariumCents), 1)}</tr>` : "", x.mileageCents ? `<tr><td>Mileage — ${x.km} km × ${money(x.mileageRateCents)}</td><td>${esc(rcAcctName(it.companyId, x.coding.travel))}</td>${td(money(x.mileageCents), 1)}</tr>` : "", x.mealsCents ? `<tr><td>Meals — ${x.breakfasts} breakfast, ${x.lunches} lunch, ${x.dinners} dinner</td><td>${esc(rcAcctName(it.companyId, x.coding.travel))}</td>${td(money(x.mealsCents), 1)}</tr>` : "", `<tr class="tot"><td>Total</td><td></td>${td(money(x.totalCents), 1)}</tr>`].filter(Boolean)); }
  if (it.kind === "reimb") { const x = it.reimb; lines = table(["Date", "What", "Expense code", ">Amount"], [...x.lines.map((l) => `<tr><td>${esc(dLong(l.date))}</td><td>${esc(l.what)}</td><td>${esc(rcAcctName(it.companyId, l.accountNumber))}</td>${td(money(l.amountCents), 1)}</tr>`), x.mileageCents ? `<tr><td></td><td>Mileage — ${x.km} km × ${money(x.mileageRateCents)}</td><td>${esc(rcAcctName(it.companyId, x.mileageAccount || S.rcSettings.coding.travel))}</td>${td(money(x.mileageCents), 1)}</tr>` : "", `<tr class="tot"><td>Total</td><td></td><td></td>${td(money(x.totalCents), 1)}</tr>`].filter(Boolean)); }
  return kv(rows) + lines;
}
function vRcDetail(q, id) {
  const it = byId(S.rcRequests || [], id);
  if (!it || !rcCanSee(A, it)) return ph("Not available", "", "", crumb("/requests", "My requests")) + card("", "<p>You can see your own requests, the ones you prepared or approved, and anything waiting on you. Finance, Executives and company administrators see more.</p>");
  const inst = byId(S.approvals, it.currentApprovalId);
  const mineToDecide = inst && inst.status === "PENDING" && canActOn(S, A, inst);
  const raisedByMe = [it.requestedByUserId, it.preparedByUserId].includes(A.user.id);
  const fin = rcIsFinance(A) && canSee(A, it.companyId);
  let act = "";
  if (mineToDecide) {
    const step = activeSteps(S, inst).find((s) => s.sequence === inst.currentStep);
    const why = step?.roleCode === "EXECUTIVE" ? "Director level. Approving finishes it." : it.kind === "po" && (it.po.invoice?.amountCents ?? it.po.estimateCents ?? 0) > S.rcSettings.poThresholdCents && !rcHoldsExec(S, A.user.id) ? `This is over ${money(S.rcSettings.poThresholdCents)}, so your approval sends it to director level.` : it.kind === "expense" && it.external ? "For someone outside the organization: your approval sends it to director level before Finance." : it.kind === "po" ? "Your approval produces the purchase order — it can be printed at once." : "Approving sends it to Finance. Returning sends it back with your comment.";
    act = card("Your decision", `<p class="hint" style="margin:0 0 10px">${esc(why)}${inst.awayUserIds?.length ? ` ${esc(rcNames(S, inst.awayUserIds).join(", "))} ${inst.awayUserIds.includes(A.user.id) ? "(you) were" : "was"} on time off when it was sent, so it went to ${esc(rcOrList(rcNames(S, inst.approverUserIds)))} — the first decision counts.` : ""}</p><form data-f="rcDecide" data-id="${it.id}" data-inst="${inst.id}"><div class="fld"><label for="rcNote">Comment <span class="hint" style="font-weight:400">— required to return or decline</span></label><textarea class="in" id="rcNote" name="note" rows="2"></textarea></div><div class="form-row" style="margin-top:10px"><button class="btn pri" data-x="approve">Approve</button><button class="btn" data-x="return">Return for correction</button><button class="btn danger" data-x="decline">Decline</button></div></form>`);
  }
  if (fin && it.status === "approved" && (it.kind === "travel" || it.kind === "card")) {
    const lines = it.kind === "card" ? it.card.lines : [{ description: `Travel — ${it.travel.to}` }];
    act += card("Finance — record what was charged", `<p class="hint" style="margin:0 0 10px">The requester entered no price. Record the amount charged before tax${lines.length > 1 ? " for each item" : ""}, GST and PST (pre-filled at ${S.rcSettings.gstPct}% and ${S.rcSettings.pstPct}%, correct them if needed), and attach the confirmation. Posts to the ledger: expense${lines.length > 1 ? "s by item" : ""} + GST receivable, against Corporate Card Payable.</p>
      <form data-f="rcProcess" data-id="${it.id}"><div class="form-grid">${lines.map((l, i) => `<div class="fld"><label for="rcS${i}">${lines.length > 1 ? `Before tax — ${esc(l.description)}` : "Before tax"}</label><input class="in num" id="rcS${i}" name="sub${i}" inputmode="decimal" required data-rc-tax></div>`).join("")}<div class="fld"><label for="rcGst">GST (${S.rcSettings.gstPct}%)</label><input class="in num" id="rcGst" name="gst" inputmode="decimal"></div><div class="fld"><label for="rcPst">PST (${S.rcSettings.pstPct}%)</label><input class="in num" id="rcPst" name="pst" inputmode="decimal"></div><div class="fld"><label>Total</label><div class="in num" id="rcTot" style="display:flex;align-items:center">—</div></div></div>
      <div class="form-grid">${fileDrop("rcConf", "Confirmation file", "Booking confirmation or receipt — PDF, JPG or PNG")}<div class="fld" style="grid-column:1/-1"><label for="rcLink">…or a link to the confirmation email</label><input class="in" id="rcLink" name="link" placeholder="https://outlook.office.com/mail/…"></div><div class="fld" style="grid-column:1/-1"><label for="rcFn">Note for the file <span class="hint" style="font-weight:400">— optional</span></label><input class="in" id="rcFn" name="note" placeholder="Booked on the company card"></div></div>
      <div class="form-row" style="margin-top:10px"><button class="btn pri">Mark processed and send the confirmation</button></div></form>`);
  }
  if (fin && it.status === "approved" && (it.kind === "expense" || it.kind === "reimb")) act += card("Finance — record as paid", `<p class="hint" style="margin:0 0 10px">Pay it, then record it. Posts to the ledger against the bank, or Employee Reimbursements Payable when it goes through payroll.</p><form data-f="rcPay" data-id="${it.id}"><div class="form-grid"><div class="fld"><label for="rcVia">Paid through</label><select class="in" id="rcVia" name="via">${["Payroll — next run", "Direct deposit", "Cheque"].map((x) => opt(x, x, it.external ? x === "Cheque" : x === "Payroll — next run")).join("")}</select></div><div class="fld"><label for="rcPref">Reference</label><input class="in" id="rcPref" name="ref" placeholder="PR-2026-0020 or cheque no."></div><div class="fld" style="grid-column:1/-1"><label for="rcPn">Note for the file <span class="hint" style="font-weight:400">— optional</span></label><input class="in" id="rcPn" name="note"></div></div><div class="form-row" style="margin-top:10px"><button class="btn pri">Record as paid</button></div></form>`);
  if (fin && it.kind === "po" && it.status === "ready") act += card("Finance — invoice amount", `<p class="hint" style="margin:0 0 10px">Within ${S.rcSettings.tolerancePct}% of the approved amount it is simply recorded. Beyond it, the order goes back for reapproval.</p><form data-f="rcPoAmount" data-id="${it.id}"><div class="form-grid"><div class="fld"><label for="rcInv">Invoice amount</label><input class="in num" id="rcInv" name="amount" inputmode="decimal" required></div><div class="fld"><label for="rcInvWhy">Reason</label><input class="in" id="rcInvWhy" name="reason" required placeholder="Freight not in the quote"></div></div><div class="form-row" style="margin-top:10px"><button class="btn">Save amount</button><button type="button" class="btn pri" data-a="rcPoClose" data-id="${it.id}">Close against the invoice</button></div></form>`);
  if (raisedByMe && it.status === "returned") act += card("Returned to you", `<p class="hint" style="margin:0 0 10px">Fix what was asked and send it back. Same reference, whole history kept.</p><div class="form-row"><button class="btn pri" data-go="/requests/${it.id}/edit">Correct and resubmit</button><button class="btn" data-a="rcWithdraw" data-id="${it.id}">Withdraw it</button></div>`);
  else if (raisedByMe && ["submitted", "awaiting_director"].includes(it.status)) act += `<div class="form-row" style="margin:0 0 14px"><button class="btn sm" data-a="rcWithdraw" data-id="${it.id}">Withdraw this request</button></div>`;
  const canPrint = it.kind === "po" && ["ready", "closed"].includes(it.status);
  const files = filesOf("RcRequest", it.id);
  const conf = it.finance ? card("Confirmation from Finance", `${it.finance.confirmationLink ? `<a class="btn sm" href="${esc(it.finance.confirmationLink)}" target="_blank" rel="noopener">Open the confirmation email</a>` : ""}${it.finance.confirmationFileId ? `<button class="btn sm" data-a="openFile" data-id="${it.finance.confirmationFileId}">Open the confirmation</button>` : ""}<p class="hint" style="margin:8px 0 0">Processed by ${esc(it.finance.by)} · ${esc(dTime(it.finance.at))}${it.finance.note ? ` · ${esc(it.finance.note)}` : ""}. Emailed to ${esc(rcNames(S, rcForAndBy(S, it)).join(" and "))}.</p>`) : it.paid ? card("Paid", `<p style="margin:0">${esc(it.paid.via)}${it.paid.reference ? ` · <span class="mono">${esc(it.paid.reference)}</span>` : ""} · ${money(it.paid.totalCents)} · recorded by ${esc(it.paid.by)} ${esc(dTime(it.paid.at))}</p>`) : "";
  const hist = `<ul class="rc-hist">${it.history.slice().reverse().map((h) => `<li><b>${esc(h.by)}</b> — ${esc(h.what)}<div class="hint">${esc(dTime(h.at))}</div>${h.note ? `<div>“${esc(h.note)}”</div>` : ""}</li>`).join("")}</ul><p class="hint" style="margin:8px 0 0">Every step is kept. Nothing here can be edited or removed.</p>`;
  const comments = `${it.comments.length ? `<ul class="rc-hist" style="margin-bottom:10px">${it.comments.map((c) => `<li><b>${esc(c.by)}</b><div class="hint">${esc(dTime(c.at))}</div><div>${esc(c.text)}</div></li>`).join("")}</ul>` : `<p class="hint" style="margin:0 0 8px">Anyone who can see the request can leave one. The others on it are emailed.</p>`}<form data-f="rcComment" data-id="${it.id}" class="form-row"><input class="in" name="text" aria-label="Comment" placeholder="Write a comment" required style="flex:1;min-width:160px"><button class="btn pri">Add</button></form>`;
  return ph(it.title, `${RC_KINDS[it.kind].label} · ${(RC_STATUS[it.status] || [it.status])[0]}`, `${rcPill(it.status)}${canPrint ? ` <button class="btn pri" data-go="/requests/${it.id}/print">Print purchase order</button>` : ""}`, crumb("/requests", "My requests")) + flashHtml()
    + rcRouteStrip(it)
    + `<div class="grid g2" style="align-items:start"><div style="display:grid;gap:14px">${act}${card("Detail", rcDetailKv(it))}${conf}${card("Attachments", files.length ? fileChips("RcRequest", it.id) : `<p class="hint" style="margin:0">No files attached.</p>`)}</div><div style="display:grid;gap:14px">${card("History", hist)}${card("Comments", comments)}</div></div>`;
}

/* ---------------- the one-page purchase order ---------------- */
function rcPoData(it) {
  const c = co(it.companyId), d = byId(S.departments, it.departmentId);
  const approvers = it.po.approverNames?.length ? it.po.approverNames : S.approvalActions.filter((x) => (it.approvalIds || []).includes(x.instanceId) && x.action === "APPROVED").map((x) => x.approverName);
  return { c, d, approvers: [...new Set(approvers)], amount: it.po.approvedCents || it.po.estimateCents || 0, date: (it.po.approvedAt || it.createdAt).slice(0, 10) };
}
function vRcPrint(q, id) {
  const it = byId(S.rcRequests || [], id);
  if (!it || it.kind !== "po" || !rcCanSee(A, it)) return ph("Not available") + card("", "<p>That purchase order isn't available to you.</p>");
  if (!["ready", "closed"].includes(it.status)) return ph("Not ready to print", "", "", crumb(`/requests/${it.id}`, it.ref)) + card("", "<p>The purchase order prints once the last approval is recorded.</p>");
  const x = rcPoData(it);
  return ph("Printed purchase order", `${it.ref} on one page, ready to send to the supplier.`, `<button class="btn" data-a="rcPrint">Print</button><button class="btn pri" data-a="rcPoPdf" data-id="${it.id}">⬇ Download PDF</button>`, crumb(`/requests/${it.id}`, it.ref))
    + `<div class="rc-paper"><div class="hd"><div style="display:flex;gap:12px;align-items:center"><img src="${HAICO_MARK}" alt="HaiCo" style="height:46px;width:auto"><div><div style="font-size:21px;font-weight:700">Purchase Order</div><div style="color:#5d6b79">${esc(x.c.legalName)}</div><div style="color:#5d6b79;font-size:12.5px">${esc(x.c.city || "")}, BC · BN ${esc(x.c.businessNumber || "")}</div></div></div><div style="text-align:right"><div class="mono" style="font-size:17px;font-weight:700">${esc(it.ref)}</div><div style="color:#5d6b79">Date approved ${esc(dLong(x.date))}</div>${it.status === "closed" ? `<div style="color:#5d6b79">Closed ${esc(dLong(it.po.closedAt.slice(0, 10)))}</div>` : ""}</div></div>
      <table><tbody><tr><th>Supplier</th><td colspan="3">${esc(it.po.vendorName)}</td></tr><tr><th>Department</th><td>${esc(x.d ? `${x.d.code} — ${x.d.name}` : "—")}</td><th>Expense code</th><td>${esc(rcAcctName(it.companyId, it.accountNumber))}</td></tr><tr><th>Description</th><td colspan="3">${esc(it.po.description)}</td></tr><tr><th>Amount</th><td colspan="3" style="font-size:15px;font-weight:700">${x.amount ? money(x.amount) : "To be confirmed by invoice"}</td></tr>${it.po.notes ? `<tr><th>Notes</th><td colspan="3">${esc(it.po.notes)}</td></tr>` : ""}</tbody></table>
      <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:12px;color:#5d6b79;font-size:12.5px"><span>Approved through the HaiCo Request Centre by ${esc(x.approvers.join(" and ") || "—")}</span><span>Raised by ${esc(byId(S.users, it.requestedByUserId)?.displayName || "")}${it.preparedByUserId ? ` for ${esc(rcForName(it))}` : ""}</span></div></div>`;
}
function rcPoPdfBytes(it) {
  const x = rcPoData(it), P = docPdf(`Purchase order ${it.ref}`), L = P.M, Rr = P.W - P.M;
  P.rect(L, 40, 44, 44, "#a03c28"); P.text(L + 22, 68, 11, "HaiCo", { bold: true, color: "#ffffff", align: "c" });
  P.text(L + 56, 58, 18, "Purchase Order", { bold: true }); P.text(L + 56, 74, 10, x.c.legalName, { color: "#5d6b79" }); P.text(L + 56, 87, 8.5, `${x.c.city || ""}, BC - BN ${x.c.businessNumber || ""}`, { color: "#5d6b79" });
  P.text(Rr, 58, 15, it.ref, { bold: true, align: "r" }); P.text(Rr, 74, 9.5, `Date approved ${dLong(x.date)}`, { align: "r", color: "#5d6b79" });
  P.line(L, 100, Rr, 100, "#a03c28", 1.6);
  let y = 122;
  const row = (k, v, bold) => { P.text(L, y, 9, k, { bold: true, color: "#5d6b79" }); const ls = P.wrap(v, Rr - L - 130, 10.5); ls.forEach((l, i) => P.text(L + 130, y + i * 14, bold ? 13 : 10.5, l, { bold })); y += Math.max(1, ls.length) * 14 + 10; P.line(L, y - 6, Rr, y - 6, "#e3e8ee", 0.6); };
  row("Supplier", it.po.vendorName); row("Department", x.d ? `${x.d.code} - ${x.d.name}` : "-"); row("Expense code", rcAcctName(it.companyId, it.accountNumber)); row("Description", it.po.description); row("Amount", x.amount ? money(x.amount) : "To be confirmed by invoice", true); if (it.po.notes) row("Notes", it.po.notes);
  y += 8; P.wrap(`Approved through the HaiCo Request Centre by ${x.approvers.join(" and ") || "-"}. Raised by ${byId(S.users, it.requestedByUserId)?.displayName || ""}${it.preparedByUserId ? ` for ${rcForName(it)}` : ""}.`, Rr - L, 9).forEach((l) => { P.text(L, y, 9, l, { color: "#5d6b79" }); y += 13; });
  docPdfFoot(P, `${x.c.legalName} - purchase order ${it.ref}. Please quote this number on your invoice.`);
  return P.bytes();
}

/* ---------------- Finance: rates and coding ---------------- */
function vRcRates() {
  const s = S.rcSettings, accts = [...new Map(S.accounts.filter((a) => a.type === "EXPENSE" && a.isActive !== false).map((a) => [a.number, a])).values()].sort((a, b) => a.number.localeCompare(b.number));
  const d2 = (c) => (c / 100).toFixed(2);
  return ph("Rates and coding", "The rates every form uses, how claims are coded, which expense codes the forms offer, and the purchase-order limits. Claims already sent keep the rates they were made with.") + flashHtml()
    + card("", `<form data-f="rcRates"><h3 style="margin:0 0 8px;font-size:15px">Meals and mileage</h3><div class="form-grid"><div class="fld"><label for="rrB">Breakfast</label><input class="in num" id="rrB" name="b" value="${d2(s.meals.b)}"></div><div class="fld"><label for="rrL">Lunch</label><input class="in num" id="rrL" name="l" value="${d2(s.meals.l)}"></div><div class="fld"><label for="rrD">Dinner</label><input class="in num" id="rrD" name="d" value="${d2(s.meals.d)}"></div><div class="fld"><label for="rrM">Mileage per km</label><input class="in num" id="rrM" name="mileage" value="${d2(s.mileageCents)}"></div></div>
      <h3 style="margin:14px 0 8px;font-size:15px">Tax pre-filled when Finance records an amount</h3><div class="form-grid"><div class="fld"><label for="rrG">GST %</label><input class="in num" id="rrG" name="gst" value="${s.gstPct}"></div><div class="fld"><label for="rrP">PST %</label><input class="in num" id="rrP" name="pst" value="${s.pstPct}"></div></div>
      <h3 style="margin:14px 0 8px;font-size:15px">Expense claim coding</h3><div class="form-grid"><div class="fld"><label for="rrH">Honoraria go to</label><select class="in" id="rrH" name="honorarium">${accts.map((a) => opt(a.number, `${a.number} — ${a.name}`, a.number === s.coding.honorarium)).join("")}</select></div><div class="fld"><label for="rrT">Mileage and meals go to</label><select class="in" id="rrT" name="travel">${accts.map((a) => opt(a.number, `${a.number} — ${a.name}`, a.number === s.coding.travel)).join("")}</select></div></div>
      <h3 style="margin:14px 0 8px;font-size:15px">Expense codes the forms offer</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:4px 14px">${accts.map((a) => `<label style="display:flex;gap:8px;align-items:center;font-size:13.5px"><input type="checkbox" name="acct" value="${a.number}"${s.formAccounts.includes(a.number) ? " checked" : ""}> ${esc(a.number)} — ${esc(a.name)}</label>`).join("")}</div>
      <h3 style="margin:14px 0 8px;font-size:15px">Optional questions on the forms</h3><div style="display:grid;gap:4px">${[["travel_training", "Travel — Training or conference?"], ["card_link", "Credit card — Product link"], ["card_ref", "Credit card — Order reference"], ["po_notes", "Purchase order — Notes printed on the order"]].map(([k, l]) => `<label style="display:flex;gap:8px;align-items:center;font-size:13.5px"><input type="checkbox" name="f_${k}"${s.fields[k] !== false ? " checked" : ""}> ${esc(l)}</label>`).join("")}</div>
      <h3 style="margin:14px 0 8px;font-size:15px">Purchase-order approval</h3><div class="form-grid"><div class="fld"><label for="rrTh">Director level for orders over ($)</label><input class="in num" id="rrTh" name="threshold" value="${d2(s.poThresholdCents)}"></div><div class="fld"><label for="rrTo">Reapproval if the invoice moves by more than (%)</label><input class="in num" id="rrTo" name="tolerance" value="${s.tolerancePct}"></div></div>
      <p class="hint">Supervisor routing follows the organization chart. When a supervisor is on time off for the whole day, the request also goes to their supervisor; the first decision counts. Every change here is in the audit log.</p><div class="form-row"><button class="btn pri">Save rates and coding</button></div></form>`);
}

/* ---------------- My Team › Request access ---------------- */
function vRcAccess() {
  const admin = rcIsAdmin(A);
  const people = (admin ? inScope(S.employees) : S.employees.filter((e) => e.managerId === A.employee?.id)).filter((e) => !["TERMINATED", "INACTIVE"].includes(e.status)).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const all = inScope(S.employees).filter((e) => !["TERMINATED", "INACTIVE"].includes(e.status)).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const rows = people.map((e) => { const acc = rcAccessOf(S, e.id); return `<tr><td><strong>${esc(empName(e))}</strong><div class="hint">${esc(byId(S.positions, e.positionId)?.title || "")} · ${esc(byId(S.departments, e.departmentId)?.name || "")}</div></td>
    <td><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-a="rcAccDept" data-id="${e.id}"${acc.ownDept ? " checked" : ""}> Everyone in ${esc(byId(S.departments, e.departmentId)?.name || "their department")}</label></td>
    <td>${(acc.extra || []).map((x) => `<span class="chip">${esc(empName(byId(S.employees, x)))} <button class="lnk" data-a="rcAccDel" data-id="${e.id}" data-x="${x}" aria-label="Remove">✕</button></span>`).join(" ")}${(acc.outside || []).map((n) => `<span class="chip">${esc(n)} · outside <button class="lnk" data-a="rcAccDelOut" data-id="${e.id}" data-x="${esc(n)}" aria-label="Remove">✕</button></span>`).join(" ")}
      <div class="form-row" style="margin-top:6px;gap:6px"><select class="in" id="rcAccAdd-${e.id}" aria-label="Add a colleague for ${esc(empName(e))}" style="max-width:220px">${opt("", "— add a colleague —", true)}${all.filter((x) => x.id !== e.id && !(acc.extra || []).includes(x.id)).map((x) => opt(x.id, empName(x), false)).join("")}</select><button class="btn sm" data-a="rcAccAdd" data-id="${e.id}">Add</button><input class="in" id="rcAccOut-${e.id}" placeholder="Someone outside — name" style="max-width:200px" aria-label="Add someone outside the organization"><button class="btn sm" data-a="rcAccAddOut" data-id="${e.id}">Save</button></div></td>
    <td class="hint">${acc.by ? `${esc(acc.by)}<br>${esc(dLong(acc.at.slice(0, 10)))}` : "Default"}</td></tr>`; });
  return ph("Request access", admin ? "Who each person can raise requests for. Supervisors manage their own staff; administrators see everyone." : "Who the people reporting to you can raise requests for. Their own department is on by default; add anyone else they regularly prepare requests for.") + flashHtml()
    + cardFlush("", table(["Person", "Their department", "Also allowed", "Last change"], rows, "Nobody reports to you."))
    + `<p class="hint" style="margin-top:10px">This only changes who someone can raise a request for. It never changes who approves it — that always follows the organization chart. Every change is in the audit log.</p>`;
}

/* ---------------- Administration › Email templates ---------------- */
function vRcTemplates() {
  const k = RC_TPL[UI.tabs.rcTpl] ? UI.tabs.rcTpl : "approval", t = rcTpl(S, k);
  return ph("Email templates", "The wording of every email the Request Centre, time off and timesheets send. Words in {braces} are filled in by the system. Card numbers never appear in an email.") + flashHtml()
    + `<div class="grid" style="grid-template-columns:minmax(0,280px) minmax(0,1fr);align-items:start" id="rcTplGrid">${card("", Object.entries(RC_TPL).map(([x, v]) => `<button class="lnk" style="display:block;text-align:left;width:100%;padding:6px 8px;border-radius:8px;${x === k ? "background:var(--row-head);" : ""}" data-a="rcTplPick" data-v="${x}"><b style="display:block;font-size:13px;color:var(--fg)">${esc(v.name)}</b><span class="hint">To: ${esc(v.to)}</span></button>`).join(""))}
      ${card(esc(RC_TPL[k].name), `<p class="hint" style="margin:-4px 0 10px">Goes to: ${esc(RC_TPL[k].to)}</p><form data-f="rcTpl" data-k="${k}"><div class="fld"><label for="rtS">Subject</label><input class="in" id="rtS" name="subject" value="${esc(t.subject)}"></div><div class="fld" style="margin-top:8px"><label for="rtI">Opening paragraph</label><textarea class="in" id="rtI" name="intro" rows="4">${esc(t.intro)}</textarea></div><p class="hint">Available words: {ref} {title} {requester} {approver} {approvers} {away} {decision} {next} {due}. The facts, attachments and the link are added by the system.</p><div class="form-row"><button class="btn pri">Save template</button></div></form>`)}</div><style>@media (max-width:760px){#rcTplGrid{grid-template-columns:1fr!important}}</style>`;
}

/* ---------------- routes (the old My Requests addresses lead here) ---------------- */
/* hr3Route puts each route first, so the catch-all /requests/:id goes in before the named pages */
hr3Route("/requests/:id", null, vRcDetail);
hr3Route("/requests/:id/print", null, vRcPrint);
hr3Route("/requests/:id/edit", null, (q, id) => { const it = byId(S.rcRequests || [], id); return it ? vRcForm(it.kind === "reimb" ? "reimbursement" : it.kind, id) : vNotFound(); });
hr3Route("/requests/new/:kind", null, (q, k) => vRcForm(k));
hr3Route("/requests", null, vRcMine);
hr3Route("/requests/all", () => rcIsFinance(A) || rcIsExec(A) || A.roleCodes.includes("COMPANY_ADMIN"), vRcAll);
hr3Route("/requests/finance", () => rcIsFinance(A), vRcFinance);
hr3Route("/requests/rates", () => rcIsFinance(A) || rcIsAdmin(A), vRcRates);
hr3Route("/team/request-access", () => rcIsAdmin(A) || (!!A.employee && S.employees.some((e) => e.managerId === A.employee.id)), vRcAccess);
hr3Route("/admin/email-templates", () => rcIsAdmin(A), vRcTemplates);
hr3Route("/me/requests", null, () => { UI.route = "/requests"; return vRcMine(); });
hr3Route("/me/expenses", null, () => { UI.route = "/requests/new/expense"; return vRcForm("expense"); });
hr3Route("/me/requests/new/:type", null, (q, t) => { if (t === "time-off") { UI.route = "/me/time-off"; return vMyTimeOff(); } const k = { "travel-request": "travel", "credit-card-purchase": "card", purchase: "po", "travel-claim": "reimbursement" }[t]; if (!k) return vNotFound(); UI.route = `/requests/new/${k}`; return vRcForm(k); });

/* Purchasing › Requests: the old "Ask to buy something" form is retired — new orders start as a New Purchase Order.
   Requests already raised stay listed, and approved ones can still become purchase orders. */
{
  const _vPurchaseRequestsRc = vPurchaseRequests;
  vPurchaseRequests = function () {
    return _vPurchaseRequestsRc().replace(/<section class="card "><div class="card-h"><span>Ask to buy something<\/span>[\s\S]*?<\/form><\/div><\/section>/, card("", `<div class="form-row" style="justify-content:space-between"><span>New orders start in <b>Requests › New Purchase Order</b> — supervisor approval, director level over ${money(S.rcSettings.poThresholdCents)}, then a one-page order to print.</span>${rcCanRaise() ? `<button class="btn pri" data-go="/requests/new/po">New purchase order</button>` : ""}</div>`));
  };
}

/* ---------------- forms & actions ---------------- */
/* a refused action redraws the page: put back what was typed, so nobody re-enters amounts or comments */
function rcAct(form, type, p, msg) {
  const sel = `form[data-f="${form.dataset.f}"]${form.dataset.id ? `[data-id="${form.dataset.id}"]` : ""}${form.dataset.k ? `[data-k="${form.dataset.k}"]` : ""}`;
  const keep = [...form.elements].filter((el) => el.name && el.type !== "file" && el.type !== "submit").map((el) => [el.name, el.type === "checkbox" ? el.checked : el.value, el.dataset.touched]);
  const ok = act(type, p, msg);
  if (!ok) { const f = document.querySelector(sel); if (f) for (const [n, v, t] of keep) { const el = f.elements[n]; if (!el || el.length) continue; if (el.type === "checkbox") el.checked = v; else el.value = v; if (t) el.dataset.touched = t; } if (f) f.querySelector("#rcTot") && f.dispatchEvent(new Event("input", { bubbles: true })); }
  return ok;
}
async function rcSaveBytes(name, bytes) { if (typeof docSave === "function") return docSave(name, bytes); }
window.FORMS_EXT.push({
  rcSubmit(f) {
    rcKeep(f);
    const kind = f.dataset.kind, d = UI.rcDraft, v = d.v, editId = f.dataset.id;
    const lines = d.lines.map((l, i) => ({ ...l, ...Object.fromEntries([...new FormData(f)].filter(([k]) => k.startsWith(`l${i}_`)).map(([k, x]) => [k.slice(String(i).length + 2), x])) }));
    const p = { ...v, lines, departmentId: v.departmentId, accountNumber: v.accountNumber };
    if (kind === "expense" && v.forWho === "external") p.external = { name: v.xname, role: v.xrole, address: v.xaddr, payBy: v.xpay };
    const files = UI.files["rc_" + kind] || [];
    if (kind === "reimb" && !files.length && !editId) { toast("Receipt needed", "Attach the receipts for what you paid.", "err"); return; }
    if (editId) {
      if (act("rc.resubmit", { id: editId, fields: p }, "Resubmitted. Same reference, whole history kept.")) { UI.rcDraft = null; takeFiles("rc_" + kind); go(`/requests/${editId}`); }
      return;
    }
    const before = (S.rcRequests || []).length;
    if (act("rc.submit", { kind, forWho: v.forWho || "", ...p, files })) {
      const it = S.rcRequests[before]; const inst = byId(S.approvals, it.currentApprovalId);
      UI.rcDraft = null; takeFiles("rc_" + kind);
      go(`/requests/${it.id}`);
      UI.flash = { kind: "ok", text: `${it.ref} submitted. It is with ${rcOrList(rcNames(S, inst?.approverUserIds || [])) || whoIsNext(S, inst)} now${inst?.awayUserIds?.length ? ` — ${rcNames(S, inst.awayUserIds).join(", ")} is on time off, so whoever decides first, decides` : ""}. You didn't have to choose who.` };
      safeRender();
    }
  },
  rcDecide(f, ev) {
    const d = fd(f), x = ev.submitter?.dataset.x, note = (d.note || "").trim();
    if ((x === "return" || x === "decline") && !note) { toast("Comment needed", "Say what needs fixing, or why it is declined — the requester sees it.", "err"); return; }
    if (x === "return") { rcAct(f, "rc.return", { id: f.dataset.id, note }, "Returned with your comment."); return; }
    rcAct(f, "approval.decide", { instanceId: f.dataset.inst, decision: x === "decline" ? "REJECTED" : "APPROVED", comment: note }, x === "decline" ? "Declined — the requester has been emailed." : "Approved.");
  },
  rcProcess(f) {
    const d = fd(f), subs = Object.keys(d).filter((k) => /^sub\d+$/.test(k)).sort().map((k) => d[k]);
    const file = (UI.files.rcConf || [])[0] || null;
    if (!subs.length || subs.some((x) => !(Number(x) > 0))) { toast("Amount needed", subs.length > 1 ? "Enter the amount before tax for every item." : "Enter the amount charged before tax.", "err"); return; }
    if (!file && !String(d.link || "").trim()) { toast("Confirmation needed", "Attach the confirmation — a file, or a link to the confirmation email.", "err"); return; }
    if (rcAct(f, "rc.process", { id: f.dataset.id, subtotals: subs, gst: d.gst, pst: d.pst, link: d.link, note: d.note, file }, "Processed. The confirmation is saved on the request and emailed.")) takeFiles("rcConf");
  },
  rcPay(f) { const d = fd(f); rcAct(f, "rc.pay", { id: f.dataset.id, via: d.via, ref: d.ref, note: d.note }, "Recorded as paid. The requester has been emailed."); },
  rcPoAmount(f) { const d = fd(f); rcAct(f, "rc.po.amount", { id: f.dataset.id, amount: d.amount, reason: d.reason }, "Amount saved."); },
  rcComment(f) { const d = fd(f); if (rcAct(f, "rc.comment", { id: f.dataset.id, text: d.text }, "Comment added — the others on the request were emailed.")) f.reset(); },
  rcRates(f) {
    const d = fd(f);
    const fields = {}; for (const k of ["travel_training", "card_link", "card_ref", "po_notes"]) fields[k] = !!d["f_" + k];
    const formAccounts = [...f.querySelectorAll('input[name="acct"]:checked')].map((x) => x.value);
    const p = { mileage: d.mileage, meals: { b: d.b, l: d.l, d: d.d }, gst: d.gst, pst: d.pst, coding: { honorarium: d.honorarium, travel: d.travel }, formAccounts, fields, threshold: d.threshold, tolerance: d.tolerance };
    rcAct(f, "rc.settings", p, "Saved. Every new request uses these rates and codes; ones already sent keep theirs.");
  },
  rcTpl(f) { const d = fd(f); rcAct(f, "rc.template", { key: f.dataset.k, subject: d.subject, intro: d.intro }, "Saved. The next email of this kind uses this wording."); },
});
window.ACTIONS_EXT.push({
  rcForWho(el) { const f = el.closest("form"); rcKeep(f); UI.rcDraft.v.forWho = el.value; UI.rcDraft.v.departmentId = ""; safeRender(); },
  rcVendor(el) { const f = el.closest("form"); rcKeep(f); UI.rcDraft.v.vendorId = el.value; safeRender(); },
  rcLineAdd(el) { rcKeep(el.closest("form")); UI.rcDraft.lines.push({}); safeRender(); },
  rcLineDel(el) { rcKeep(el.closest("form")); UI.rcDraft.lines.splice(+el.dataset.i, 1); safeRender(); },
  rcPickOutside(el) { rcKeep(el.closest("form")); UI.rcDraft.v.xname = el.dataset.v; safeRender(); },
  rcAllTab(el) { UI.tabs.rcAll = el.dataset.v; safeRender(); },
  rcTplPick(el) { UI.tabs.rcTpl = el.dataset.v; safeRender(); },
  rcWithdraw(el) { act("rc.withdraw", { id: el.dataset.id }, "Withdrawn. It stays on record."); },
  rcPoClose(el) { act("rc.po.close", { id: el.dataset.id }, "Closed against the invoice."); },
  rcPrint() { try { window.print(); } catch (e) { toast("Can't print here", "Use Download PDF and print the file.", "err"); } },
  rcPoPdf(el) { const it = byId(S.rcRequests || [], el.dataset.id); if (!it || !rcCanSee(A, it) || !["ready", "closed"].includes(it.status)) { toast("Not available", "That purchase order isn't ready or isn't yours to open.", "err"); return; } rcSaveBytes(`${it.ref}.pdf`, rcPoPdfBytes(it)); },
  rcReturnFromPopup(el) {
    const inst = byId(S.approvals, el.dataset.id), note = (document.getElementById("aprNote")?.value || "").trim();
    if (!note) { toast("Comment needed", "Say what needs fixing — the requester sees it.", "err"); return; }
    if (act("rc.return", { id: inst.entityId, note }, "Returned with your comment.")) { UI.modal = null; UI.modalWide = false; safeRender(); }
  },
  rcAccDept(el) { act("rc.access", { employeeId: el.dataset.id, ownDept: el.checked }, "Saved."); },
  rcAccAdd(el) { const v = document.getElementById(`rcAccAdd-${el.dataset.id}`)?.value; if (!v) { toast("Pick someone", "Choose a colleague from the list first.", "err"); return; } act("rc.access", { employeeId: el.dataset.id, addExtra: v }, "Saved."); },
  rcAccDel(el) { act("rc.access", { employeeId: el.dataset.id, removeExtra: el.dataset.x }, "Removed."); },
  rcAccAddOut(el) { const v = (document.getElementById(`rcAccOut-${el.dataset.id}`)?.value || "").trim(); if (!v) { toast("Type a name", "Enter the person's name first.", "err"); return; } act("rc.access", { employeeId: el.dataset.id, addOutside: v }, "Saved for their expense claims."); },
  rcAccDelOut(el) { act("rc.access", { employeeId: el.dataset.id, removeOutside: el.dataset.x }, "Removed."); },
});
/* GST / PST fill in from the amount before tax and can be corrected */
document.addEventListener("input", (ev) => {
  const f = ev.target.closest?.('form[data-f="rcProcess"]'); if (!f) return;
  const s = S.rcSettings, subs = [...f.querySelectorAll("[data-rc-tax]")].reduce((t, el) => t + (Number(el.value) || 0), 0);
  const g = f.querySelector("#rcGst"), p = f.querySelector("#rcPst");
  if (ev.target.hasAttribute("data-rc-tax")) { if (!g.dataset.touched) g.value = ((subs * s.gstPct) / 100).toFixed(2); if (!p.dataset.touched) p.value = ((subs * s.pstPct) / 100).toFixed(2); }
  else if (ev.target === g || ev.target === p) ev.target.dataset.touched = "1";
  const t = f.querySelector("#rcTot"); if (t) t.textContent = money(Math.round((subs + (Number(g.value) || 0) + (Number(p.value) || 0)) * 100));
});

/* ==========================================================================
   views-contracts.js — Documents › Contracts.
   Managers and above upload contracts with their details, an optional amount and
   the team they belong to. A contract can be opened by the person who uploaded it,
   by the team's managers, by everyone above the team in the reporting line, and by
   executives and administrators. Every upload, change and added file is recorded
   in the audit log and shown on the contract's own history.
   ========================================================================== */

const CT_TYPES = [["SERVICE", "Service agreement"], ["SUPPLY", "Supply / purchase"], ["LEASE", "Lease / rental"], ["EMPLOYMENT", "Employment / contractor"], ["NDA", "Confidentiality (NDA)"], ["PARTNERSHIP", "Partnership / MOU"], ["OTHER", "Other"]];
const CT_TYPE_LABEL = Object.fromEntries(CT_TYPES);
const CT_MANAGER_ROLES = ["MANAGER", "HR_MANAGER", "FINANCE_MANAGER", "PAYROLL_ADMIN", "EXECUTIVE", "COMPANY_ADMIN", "GROUP_ADMIN", "SUPER_ADMIN"];
const CT_EXPIRING_DAYS = 60;

/** managers and above: a management role, or anyone with people reporting to them */
function ctManagerPlus(S, a) {
  if (!a) return false;
  if (a.isSuper || a.roleCodes.some((r) => CT_MANAGER_ROLES.includes(r))) return true;
  return !!a.employee && S.employees.some((e) => e.managerId === a.employee.id && e.status !== "TERMINATED");
}
/** everyone above an employee in the reporting line (their manager, that manager's manager, …) */
function ctChainUp(S, empId) {
  const out = []; let cur = byId(S.employees, empId); let hops = 0;
  while (cur?.managerId && hops++ < 12) { const m = byId(S.employees, cur.managerId); if (!m || out.includes(m.id)) break; out.push(m.id); cur = m; }
  return out;
}
const ctTeamMembers = (S, c) => S.employees.filter((e) => e.companyId === c.companyId && e.departmentId === c.departmentId && e.status !== "TERMINATED");
/** the people above the team (and above the uploader) — the "ladder" that may open the contract */
function ctLadder(S, c) {
  const team = new Set(ctTeamMembers(S, c).map((e) => e.id));
  const dept = byId(S.departments, c.departmentId);
  const starts = [...team, c.uploadedByEmployeeId, dept?.managerId].filter(Boolean);
  const up = new Set(); for (const id of starts) for (const m of ctChainUp(S, id)) if (!team.has(m)) up.add(m);
  if (dept?.managerId && !team.has(dept.managerId)) up.add(dept.managerId);
  return [...up];
}
/** may this person open this contract? (the page itself is for managers and above) */
function ctCanSee(S, a, c) {
  if (!a || !c) return false;
  if (a.isSuper || a.roleCodes.some((r) => r === "GROUP_ADMIN" || r === "SUPER_ADMIN" || r === "EXECUTIVE")) return true;
  if (S.userRoles.some((r) => r.userId === a.user.id && r.roleCode === "COMPANY_ADMIN" && r.companyId === c.companyId)) return true;
  if (c.uploadedById === a.user.id) return true;
  const me = a.employee?.id; if (!me) return false;
  if (ctTeamMembers(S, c).some((e) => e.id === me)) return true;
  if (byId(S.departments, c.departmentId)?.managerId === me) return true;
  return ctLadder(S, c).includes(me);
}
function ctStatus(c, today = todayStr()) {
  if (c.archivedAt) return "ARCHIVED";
  if (c.endDate && c.endDate < today) return "EXPIRED";
  if (c.endDate && c.endDate <= addDays(today, CT_EXPIRING_DAYS)) return "EXPIRING";
  return "ACTIVE";
}
const CT_STATUS = { ACTIVE: ["Active", "green"], EXPIRING: ["Expiring soon", "amber"], EXPIRED: ["Expired", "red"], ARCHIVED: ["Archived", "grey"] };
const ctBadge = (c) => { const [l, t] = CT_STATUS[ctStatus(c)]; return `<span class="badge tone-${t}">${esc(l)}</span>`; };
const ctTeamName = (S, c) => `${byId(S.departments, c.departmentId)?.name || "—"} · ${byId(S.companies, c.companyId)?.displayName || ""}`;
const ctVisible = () => (S.contracts || []).filter((c) => scopeIds(S, A).includes(c.companyId) && ctCanSee(S, A, c));
const ctTerm = (c) => `${c.startDate ? dLong(c.startDate) : "—"}${c.endDate ? ` → ${dLong(c.endDate)}` : " → open-ended"}`;

/* ---------------- state + seed contracts (fictional) ---------------- */
{
  const _fsCt = freshState;
  freshState = function () {
    const S = _fsCt();
    S.contracts = [];
    const seed = [
      ["ct1", "CT-2026-0001", "Log hauling services — 2026 season", "North Island Trucking Ltd.", "SERVICE", "TAAN", "dep3", 18400000, "2026-04-01", "2026-11-30", "NIT-2026-14", "Rates per load, fuel surcharge capped at 6%.", "u2", "2026-03-20T16:10:00Z", ["NIT hauling agreement 2026 (signed).pdf", "Rate schedule A.pdf"]],
      ["ct2", "CT-2026-0002", "Port Clements yard lease", "Village of Port Clements", "LEASE", "TAAN", "dep4", 3600000, "2025-01-01", "2026-11-15", "VPC-L-0031", "Two-year lease of the log yard; renewal notice due 60 days before the end.", "u8", "2025-12-04T18:30:00Z", ["Yard lease 2025-2026.pdf"]],
      ["ct3", "CT-2026-0003", "Lodge linen & laundry service", "Skeena Linen Co.", "SERVICE", "TOUR", "dep6", null, "2026-05-01", "2027-04-30", "", "Priced per room-night; no fixed contract value.", "u12", "2026-04-22T21:05:00Z", ["Skeena Linen service agreement.pdf"]],
      ["ct4", "CT-2026-0004", "Seasonal processing crew agreement", "Hecate Strait Labour Co-op", "EMPLOYMENT", "SEAF", "dep7", 9250000, "2026-03-01", "2026-09-30", "HSL-26-02", "Season ended Sep 30; keep for the year-end file.", "u10", "2026-02-18T17:45:00Z", ["Crew agreement 2026.pdf"]],
      ["ct5", "CT-2026-0005", "External audit engagement 2026", "Sterling & Pike LLP", "SERVICE", "HAICO", "dep2", 4800000, "2026-06-01", "2027-05-31", "SP-ENG-2026", "Group audit of the four companies; interim visit in January.", "u4", "2026-05-27T15:20:00Z", ["Engagement letter 2026.pdf"]],
    ];
    for (const [id, number, title, counterparty, type, companyId, departmentId, amountCents, startDate, endDate, reference, notes, userId, at, files] of seed) {
      const u = byId(S.users, userId);
      S.contracts.push({ id, number, title, counterparty, type, companyId, departmentId, amountCents, startDate, endDate, reference, notes, uploadedById: userId, uploadedByName: u?.displayName || "", uploadedByEmployeeId: u?.employeeId || null, createdAt: at, updatedAt: at });
      files.forEach((fn, i) => S.files.push({ id: `fl_${id}_${i}`, entityType: "Contract", entityId: id, companyId, fileName: fn, mimeType: "application/pdf", sizeBytes: 240000 + i * 61000, uploadedByName: u?.displayName || "", createdAt: at }));
      S.audit.push({ id: `au_seed_${id}`, at, actorName: u?.displayName || "", module: "documents", action: "CREATE", entityType: "Contract", entityId: id, companyId, summary: `Uploaded contract ${number} “${title}” with ${counterparty} for ${byId(S.departments, departmentId)?.name} · ${amountCents ? money(amountCents) : "no amount stated"} · ${files.length} file${files.length === 1 ? "" : "s"}.` });
    }
    return S;
  };
}

/* ---------------- reducers ---------------- */
function ctNeed(S, ctx) { if (!ctManagerPlus(S, ctx.auth)) fail("Contracts are for managers and above."); }
function ctAttach(S, ctx, c, files) {
  let n = 0;
  for (const f of (files || []).slice(0, 8)) {
    if (!f || !f.name) continue;
    if (!FILE_TYPES.includes(f.type)) fail(`${f.name}: only PDF, JPG and PNG files can be attached.`);
    S.files.push({ id: ctx.id("fl"), entityType: "Contract", entityId: c.id, companyId: c.companyId, fileName: String(f.name).slice(0, 120), mimeType: f.type, sizeBytes: Number(f.size) || 0, data: f.data && String(f.data).length < FILE_KEEP_MAX * 1.4 ? f.data : undefined, uploadedByName: ctx.actor.displayName, createdAt: ctx.now });
    n++;
  }
  return n;
}
function ctClean(S, ctx, p) {
  const title = String(p.title || "").trim().slice(0, 120), counterparty = String(p.counterparty || "").trim().slice(0, 120);
  if (!title) fail("Give the contract a title.");
  if (!counterparty) fail("Who is the contract with?");
  const dept = byId(S.departments, p.departmentId);
  if (!dept) fail("Choose the team the contract belongs to.");
  ctx.company(dept.companyId);
  if (!p.startDate) fail("Enter the date the contract starts.");
  if (p.endDate && p.endDate < p.startDate) fail("The end date is before the start date.");
  const amt = p.amountCents == null || p.amountCents === "" ? null : Number(p.amountCents);
  if (amt != null && (!Number.isFinite(amt) || amt < 0)) fail("The amount must be zero or more — or leave it empty.");
  return { title, counterparty, type: CT_TYPE_LABEL[p.type] ? p.type : "OTHER", companyId: dept.companyId, departmentId: dept.id, amountCents: amt, startDate: p.startDate, endDate: p.endDate || "", reference: String(p.reference || "").trim().slice(0, 60), notes: String(p.notes || "").trim().slice(0, 600) };
}
Object.assign(R, {
  "contract.create"(S, p, ctx) {
    ctNeed(S, ctx);
    const d = ctClean(S, ctx, p);
    if (!(p.files || []).length) fail("Attach the contract itself (PDF, JPG or PNG).");
    S.contracts = S.contracts || [];
    const number = nextNum(S.contracts.map((c) => c.number), "CT-2026", 4);
    const c = { id: ctx.id("ct"), number, ...d, uploadedById: ctx.actor.id, uploadedByName: ctx.actor.displayName, uploadedByEmployeeId: ctx.auth.employee?.id || null, createdAt: ctx.now, updatedAt: ctx.now };
    S.contracts.push(c);
    const n = ctAttach(S, ctx, c, p.files);
    ctx.audit({ module: "documents", action: "CREATE", entityType: "Contract", entityId: c.id, companyId: c.companyId, summary: `Uploaded contract ${number} “${c.title}” with ${c.counterparty} for ${byId(S.departments, c.departmentId)?.name} · ${c.amountCents != null ? money(c.amountCents) : "no amount stated"} · ${n} file${n === 1 ? "" : "s"}.` });
  },
  "contract.update"(S, p, ctx) {
    ctNeed(S, ctx);
    const c = byId(S.contracts || [], p.id); if (!c) fail("That contract no longer exists.");
    if (!ctCanSee(S, ctx.auth, c)) fail("You can't open this contract.");
    const d = ctClean(S, ctx, p);
    const label = { title: "title", counterparty: "counterparty", type: "type", departmentId: "team", amountCents: "amount", startDate: "start date", endDate: "end date", reference: "reference", notes: "notes" };
    const show = (k, v) => (k === "amountCents" ? (v == null ? "not stated" : money(v)) : k === "departmentId" ? byId(S.departments, v)?.name || "—" : k === "type" ? CT_TYPE_LABEL[v] : k.endsWith("Date") ? (v ? dLong(v) : "none") : k === "notes" ? "updated" : v || "none");
    const changes = Object.keys(label).filter((k) => String(c[k] ?? "") !== String(d[k] ?? "")).map((k) => (k === "notes" ? "notes updated" : `${label[k]} ${show(k, c[k])} → ${show(k, d[k])}`));
    if (!changes.length) fail("Nothing has changed.");
    Object.assign(c, d, { updatedAt: ctx.now });
    ctx.audit({ module: "documents", action: "UPDATE", entityType: "Contract", entityId: c.id, companyId: c.companyId, summary: `Changed contract ${c.number}: ${changes.join("; ")}.` });
  },
  "contract.attach"(S, p, ctx) {
    ctNeed(S, ctx);
    const c = byId(S.contracts || [], p.id); if (!c) fail("That contract no longer exists.");
    if (!ctCanSee(S, ctx.auth, c)) fail("You can't open this contract.");
    const n = ctAttach(S, ctx, c, p.files); if (!n) fail("Drop or choose a file first.");
    c.updatedAt = ctx.now;
    ctx.audit({ module: "documents", action: "ATTACH", entityType: "Contract", entityId: c.id, companyId: c.companyId, summary: `Added ${n} file${n === 1 ? "" : "s"} to contract ${c.number}: ${(p.files || []).slice(0, 8).map((f) => f.name).join(", ")}.` });
  },
  "contract.archive"(S, p, ctx) {
    ctNeed(S, ctx);
    const c = byId(S.contracts || [], p.id); if (!c) fail("That contract no longer exists.");
    if (!ctCanSee(S, ctx.auth, c)) fail("You can't open this contract.");
    if (p.archived) { if (c.archivedAt) fail("Already archived."); Object.assign(c, { archivedAt: ctx.now, archivedByName: ctx.actor.displayName, archiveReason: String(p.reason || "").trim().slice(0, 200) }); }
    else { if (!c.archivedAt) fail("This contract isn't archived."); delete c.archivedAt; delete c.archivedByName; delete c.archiveReason; }
    c.updatedAt = ctx.now;
    ctx.audit({ module: "documents", action: "STATUS_CHANGE", entityType: "Contract", entityId: c.id, companyId: c.companyId, summary: p.archived ? `Archived contract ${c.number}${p.reason ? ` — ${String(p.reason).trim().slice(0, 120)}` : ""}.` : `Restored contract ${c.number} from the archive.` });
  },
});

/* ---------------- the submenu: Documents › Contracts (managers and above) ---------------- */
SECTION_BY_KEY.documents.tabs.push({ href: "/documents/contracts", label: "Contracts", perm: () => ctManagerPlus(S, A) });

injectCss(`
.ct-who{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.ct-who span{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;padding:2px 10px 2px 3px;font-size:12px;background:var(--card)}
.ct-who .av{width:22px;height:22px;font-size:9.5px}
`);
function ctTeamOptions(sel) {
  const ids = scopeIds(S, A);
  return S.companies.filter((c) => ids.includes(c.id)).map((c) => `<optgroup label="${esc(c.displayName)}">${S.departments.filter((d) => d.companyId === c.id && d.isActive !== false).map((d) => opt(d.id, `${d.name} — ${c.displayName}`, d.id === sel)).join("")}</optgroup>`).join("");
}
function ctForm(c = null, draft = null) {
  const isNew = !c; const v = c || draft || { type: "SERVICE", departmentId: A.employee?.departmentId || "", startDate: todayStr() };
  return `<h3 style="margin:0 0 4px">${isNew ? "Upload a contract" : `Edit ${esc(c.number)}`}</h3><p class="hint" style="margin:0 0 12px">${isNew ? "The team decides who can open it: the team's managers, everyone above the team in the reporting line, and executives." : "Every change is recorded in the contract's history."}</p>
  <form data-f="${isNew ? "ctNew" : "ctEdit"}" ${isNew ? "" : `data-id="${c.id}"`} class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
    <div class="fld" style="grid-column:1/-1"><label for="ctT">Contract title</label><input class="in" id="ctT" name="title" required maxlength="120" value="${esc(v.title || "")}" placeholder="e.g. Log hauling services — 2027 season"></div>
    <div class="fld"><label for="ctCp">With (counterparty)</label><input class="in" id="ctCp" name="counterparty" required maxlength="120" value="${esc(v.counterparty || "")}" placeholder="Company or person"></div>
    <div class="fld"><label for="ctTy">Type</label><select class="in" id="ctTy" name="type">${CT_TYPES.map(([k, l]) => opt(k, l, k === v.type)).join("")}</select></div>
    <div class="fld"><label for="ctTeam">Team</label><select class="in" id="ctTeam" name="departmentId" required>${ctTeamOptions(v.departmentId)}</select></div>
    <div class="fld"><label for="ctAmt">Amount (CAD) <span class="hint" style="font-weight:400">— optional</span></label><input class="in num" id="ctAmt" name="amount" inputmode="decimal" value="${v.amountCents != null ? (v.amountCents / 100).toFixed(2) : ""}" placeholder="Leave empty if there is no fixed value"></div>
    <div class="fld"><label for="ctS">Starts</label><input class="in" type="date" id="ctS" name="startDate" required value="${esc(v.startDate || "")}"></div>
    <div class="fld"><label for="ctE">Ends <span class="hint" style="font-weight:400">— empty if open-ended</span></label><input class="in" type="date" id="ctE" name="endDate" value="${esc(v.endDate || "")}"></div>
    <div class="fld"><label for="ctRef">Their reference <span class="hint" style="font-weight:400">— optional</span></label><input class="in" id="ctRef" name="reference" maxlength="60" value="${esc(v.reference || "")}"></div>
    <div class="fld" style="grid-column:1/-1"><label for="ctN">Notes <span class="hint" style="font-weight:400">— optional</span></label><textarea class="in" id="ctN" name="notes" rows="3" style="height:auto;padding:8px 10px" maxlength="600">${esc(v.notes || "")}</textarea></div>
    ${isNew ? `<div class="fld fdrop-wrap" style="grid-column:1/-1"><label>The signed contract <span class="hr3req">— required</span></label><div class="fdrop" data-fzone="ctNew" role="button" tabindex="0" aria-label="Attach the contract"><b>Drag &amp; drop the contract here, or click to choose</b><small>PDF, JPG or PNG — add schedules and amendments too</small></div><input type="file" multiple accept="application/pdf,image/jpeg,image/png" data-fdrop="ctNew" style="display:none"><div id="fchips-ctNew" class="fchips">${pendingChips("ctNew")}</div></div>` : ""}
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">${isNew ? "Upload contract" : "Save changes"}</button></div></form>`;
}
function vContracts() {
  const F = UI.filters.ct || (UI.filters.ct = { st: "" });
  const all = ctVisible().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const counts = { "": all.length }; for (const c of all) { const s = ctStatus(c); counts[s] = (counts[s] || 0) + 1; }
  const list = all.filter((c) => !F.st || ctStatus(c) === F.st);
  const active = all.filter((c) => ["ACTIVE", "EXPIRING"].includes(ctStatus(c)));
  const value = active.reduce((s, c) => s + (c.amountCents || 0), 0), noAmt = active.filter((c) => c.amountCents == null).length;
  const month = todayStr().slice(0, 7);
  const tiles = `<div class="grid g4" style="margin-bottom:14px">${stat("Active contracts", String(active.length), `${counts.EXPIRING || 0} expiring within ${CT_EXPIRING_DAYS} days`)}${stat("Stated value (active)", moneyCompact(value), noAmt ? `${noAmt} without an amount` : "every active contract has an amount")}${stat("Expired", String(counts.EXPIRED || 0), "kept for the record")}${stat("Uploaded this month", String(all.filter((c) => c.createdAt.slice(0, 7) === month).length), "by you and the people above you")}</div>`;
  const chips = [["", "All"], ["ACTIVE", "Active"], ["EXPIRING", "Expiring soon"], ["EXPIRED", "Expired"], ["ARCHIVED", "Archived"]].map(([k, l]) => `<button class="hchip ${(F.st || "") === k ? "on" : ""}" data-a="ctChip" data-v="${k}">${esc(l)} <span>${counts[k] || 0}</span></button>`).join("");
  const rows = list.map((c) => { const files = filesOf("Contract", c.id).length; return `<tr class="click" data-go="/documents/contracts/${c.id}"><td><strong>${esc(c.title)}</strong><div class="hint mono">${esc(c.number)} · ${esc(CT_TYPE_LABEL[c.type] || "")}</div></td><td>${esc(c.counterparty)}</td><td>${esc(byId(S.departments, c.departmentId)?.name || "—")}<div class="hint">${esc(co(c.companyId)?.displayName || "")}</div></td>${td(c.amountCents != null ? money(c.amountCents) : `<span class="muted">—</span>`, 1)}<td style="white-space:nowrap">${esc(c.startDate ? dShort(c.startDate) : "—")} → ${esc(c.endDate ? dLong(c.endDate) : "open")}</td><td>${esc(c.uploadedByName)}<div class="hint">${esc(dLong(c.createdAt.slice(0, 10)))}</div></td><td class="r">${files ? `📎 ${files}` : ""}</td><td>${ctBadge(c)}</td></tr>`; });
  return ph("Contracts", "Agreements by team. You see the contracts of your own team and of every team below you in the reporting line.", `${dlButton("contracts", "Download", { variant: "outline" })}<button class="btn pri" data-a="ctNewOpen">Upload a contract</button>`)
    + flashHtml() + tiles
    + `<div class="apx-bar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px"><input class="in" type="search" placeholder="Search title, counterparty, team, number…" aria-label="Search contracts" data-filter="ctT" style="max-width:340px">${chips}</div>`
    + cardFlush("", rows.length ? table(["Contract", "With", "Team", ">Amount", "Term", "Uploaded by", "", "Status"], rows).replace(`<table class="t">`, `<table class="t" id="ctT">`) : empty(all.length ? "Nothing with this status." : "No contracts yet", all.length ? "" : " Upload the first one — it is shared with your team's managers and everyone above them."));
}
function vContract(q, id) {
  const c = byId(S.contracts || [], id);
  if (!c || !ctCanSee(S, A, c)) return ph("Contract not available", "") + card("", `<p style="margin-top:0">This contract doesn't exist, or it belongs to a team outside your part of the reporting line.</p><button class="btn" data-go="/documents/contracts">Back to Contracts</button>`);
  const files = filesOf("Contract", c.id).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const team = ctTeamMembers(S, c), ladder = ctLadder(S, c).map((x) => byId(S.employees, x)).filter(Boolean);
  const leads = team.filter((e) => { const u = userOfEmployee(S, e.id); const a = u && authFor(S, u.id); return a && ctManagerPlus(S, a); });
  const person = (e) => `<span>${avatar(e, 22)}${esc(empName(e))}<small class="hint">${esc(byId(S.positions, e.positionId)?.title || "")}</small></span>`;
  const hist = S.audit.filter((x) => x.entityType === "Contract" && x.entityId === c.id).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  const acts = `<button class="btn" data-a="ctEditOpen" data-id="${c.id}">Edit details</button>${c.archivedAt ? `<button class="btn" data-a="ctArchive" data-id="${c.id}" data-v="0">Restore</button>` : `<button class="btn" data-a="ctArchive" data-id="${c.id}" data-v="1">Archive</button>`}`;
  return ph(c.title, `${c.number} · ${c.counterparty} · ${ctTeamName(S, c)}`, ctBadge(c) + acts, crumb("/documents/contracts", "Contracts")) + flashHtml()
    + (c.archivedAt ? `<div class="msg warn">Archived ${esc(dTime(c.archivedAt))} by ${esc(c.archivedByName || "")}${c.archiveReason ? ` — ${esc(c.archiveReason)}` : ""}.</div>` : "")
    + `<div class="grid g2" style="align-items:start">${card("Details", `<dl class="kv"><dt>Type</dt><dd>${esc(CT_TYPE_LABEL[c.type] || "")}</dd><dt>With</dt><dd>${esc(c.counterparty)}</dd><dt>Team</dt><dd>${esc(byId(S.departments, c.departmentId)?.name || "—")} ${coTag(c.companyId)}</dd><dt>Amount</dt><dd class="num">${c.amountCents != null ? `<strong>${money(c.amountCents)}</strong>` : `<span class="muted">Not stated</span>`}</dd><dt>Term</dt><dd>${esc(ctTerm(c))}</dd>${c.reference ? `<dt>Their reference</dt><dd class="mono">${esc(c.reference)}</dd>` : ""}<dt>Uploaded by</dt><dd>${esc(c.uploadedByName)} · ${esc(dTime(c.createdAt))}</dd><dt>Last change</dt><dd>${esc(dTime(c.updatedAt || c.createdAt))}</dd>${c.notes ? `<dt>Notes</dt><dd style="white-space:pre-wrap">${esc(c.notes)}</dd>` : ""}</dl>`)}
      ${card("Files", `${files.length ? `<ul class="hlist" style="margin:0 0 10px">${files.map((f) => `<li class="wrow" style="padding:6px 0;display:flex;gap:10px;align-items:center;justify-content:space-between"><button type="button" class="fchip link" data-a="openFile" data-id="${f.id}">📎 ${esc(f.fileName)}</button><span class="hint">${esc(f.uploadedByName)} · ${esc(dTime(f.createdAt))} · ${fmtSize(f.sizeBytes)}</span></li>`).join("")}</ul>` : `<p class="hint">No files.</p>`}
        <div class="fdrop" data-fzone="ctMore" role="button" tabindex="0" aria-label="Add files"><b>Add a schedule, amendment or renewal</b><small>Drag &amp; drop or click — PDF, JPG or PNG</small></div><input type="file" multiple accept="application/pdf,image/jpeg,image/png" data-fdrop="ctMore" style="display:none"><div id="fchips-ctMore" class="fchips">${pendingChips("ctMore")}</div><div class="form-row" style="margin-top:8px"><button class="btn sm pri" data-a="ctAttach" data-id="${c.id}">Upload files</button></div>`)}</div>`
    + `<div class="grid g2" style="align-items:start;margin-top:14px">${card("Who can open this contract", `<p class="hint" style="margin:0 0 6px">Decided by the team and the reporting line — not by a share list.</p><div class="sect-l" style="margin:8px 0 4px">The team's managers</div><div class="ct-who">${leads.map(person).join("") || `<span class="hint">No managers inside the team.</span>`}</div><div class="sect-l" style="margin:10px 0 4px">Above the team</div><div class="ct-who">${ladder.map(person).join("") || `<span class="hint">—</span>`}</div><p class="hint" style="margin:10px 0 0">Plus the person who uploaded it, the company's administrator, executives and system administrators.</p>`)}
      ${cardFlush("History", table(["When", "Who", "What happened"], hist.map((x) => `<tr><td style="white-space:nowrap">${esc(dTime(x.at))}</td><td>${esc(x.actorName)}</td><td>${esc(x.summary)}</td></tr>`), "Nothing recorded yet."))}</div>`;
}
route("/documents/contracts", () => ctManagerPlus(S, A), vContracts);
route("/documents/contracts/:id", () => ctManagerPlus(S, A), vContract);

window.ACTIONS_EXT.push({
  ctChip(el) { (UI.filters.ct = UI.filters.ct || {}).st = el.dataset.v; safeRender(); },
  ctNewOpen() { UI.modal = ctForm(); UI.modalWide = true; safeRender(); setTimeout(() => document.getElementById("ctT")?.focus(), 30); },
  ctEditOpen(el) { const c = byId(S.contracts || [], el.dataset.id); if (c) { UI.modal = ctForm(c); UI.modalWide = true; safeRender(); } },
  ctAttach(el) { const files = takeFiles("ctMore"); if (!files.length) { toast("Nothing to upload", "Drop or choose a file first.", "err"); return; } act("contract.attach", { id: el.dataset.id, files }, `${files.length} file${files.length === 1 ? "" : "s"} added.`); },
  ctArchive(el) { const c = byId(S.contracts || [], el.dataset.id); if (!c) return; if (el.dataset.v === "0") { act("contract.archive", { id: c.id, archived: false }, `${c.number} restored.`); return; } UI.modal = `<h3 style="margin:0 0 8px">Archive ${esc(c.number)}?</h3><p class="hint">It stays in the record and its history; it just leaves the active list.</p><form data-f="ctArchive" data-id="${c.id}"><div class="fld"><label for="ctAr">Reason (optional)</label><input class="in" id="ctAr" name="reason" maxlength="200" placeholder="e.g. Replaced by CT-2026-0007"></div><div class="form-row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Archive</button></div></form>`; UI.modalWide = false; safeRender(); },
});
const ctPayload = (f) => { const d = fd(f); return { title: d.title, counterparty: d.counterparty, type: d.type, departmentId: d.departmentId, amountCents: String(d.amount || "").trim() === "" ? null : toCents(d.amount), startDate: d.startDate, endDate: d.endDate, reference: d.reference, notes: d.notes }; };
window.FORMS_EXT.push({
  ctNew(f) {
    const p = ctPayload(f); const files = UI.files.ctNew || [];
    if (!files.length) { toast("Attach the contract", "Drop or choose the signed contract (PDF, JPG or PNG) before uploading.", "err"); return; }
    const before = (S.contracts || []).length;
    if (act("contract.create", { ...p, files }, "Contract uploaded — the team's managers and the people above them can open it.")) { takeFiles("ctNew"); UI.modal = null; UI.modalWide = false; const c = S.contracts[before]; if (c) go(`/documents/contracts/${c.id}`); }
    else { UI.modal = ctForm(null, p); UI.modalWide = true; safeRender(); }
  },
  ctEdit(f) { const p = ctPayload(f); const c = byId(S.contracts || [], f.dataset.id); if (act("contract.update", { id: f.dataset.id, ...p }, "Contract details saved.")) { UI.modal = null; UI.modalWide = false; safeRender(); } else if (c) { UI.modal = ctForm({ ...c, ...p }); UI.modalWide = true; safeRender(); } },
  ctArchive(f) { const d = fd(f); if (act("contract.archive", { id: f.dataset.id, archived: true, reason: d.reason }, "Contract archived.")) { UI.modal = null; safeRender(); } },
});
EXPORTS.contracts = () => ({ base: `haico-contracts-${todayStr()}`, title: "Contracts", rows: [["Number", "Title", "With", "Type", "Company", "Team", "Amount", "Starts", "Ends", "Status", "Uploaded by", "Uploaded", "Files"], ...ctVisible().map((c) => [c.number, c.title, c.counterparty, CT_TYPE_LABEL[c.type] || "", co(c.companyId)?.displayName || "", byId(S.departments, c.departmentId)?.name || "", c.amountCents != null ? (c.amountCents / 100).toFixed(2) : "", c.startDate || "", c.endDate || "", CT_STATUS[ctStatus(c)][0], c.uploadedByName, c.createdAt.slice(0, 10), filesOf("Contract", c.id).length])] });

/* ---------------- keep contracts inside the ladder everywhere else too ---------------- */
{ const _hist = historyRowsA; historyRowsA = function (f = {}) { const r = _hist(f); const hide = (x) => x.entityType === "Contract" && !ctCanSee(S, A, byId(S.contracts || [], x.entityId)); if (Array.isArray(r.rows)) r.rows = r.rows.filter((x) => !hide(x)); return r; }; }
{ const _search = searchResults; searchResults = function (q) { const out = _search(q); const t = String(q || "").trim().toLowerCase(); if (t.length < 2 || !ctManagerPlus(S, A)) return out; const hits = ctVisible().filter((c) => [c.number, c.title, c.counterparty, c.reference].some((s) => String(s || "").toLowerCase().includes(t))).slice(0, 6).map((c) => ({ t: `${c.number} — ${c.title}`, s: `${c.counterparty} · ${ctTeamName(S, c)} · ${CT_STATUS[ctStatus(c)][0]}`, go: `/documents/contracts/${c.id}` })); if (hits.length) out.push(["Contracts", hits]); return out; }; }
{ const _attn = needsAttentionItems; needsAttentionItems = function () { const out = _attn(); try { if (A && ctManagerPlus(S, A)) { const soon = ctVisible().filter((c) => ctStatus(c) === "EXPIRING"); if (soon.length) out.push({ key: "contracts-expiring", icon: "filetext", tone: "warn", title: `${soon.length} contract${soon.length === 1 ? "" : "s"} expire within ${CT_EXPIRING_DAYS} days`, detail: soon.slice(0, 3).map((c) => `${c.title} (${dShort(c.endDate)})`).join(" · "), go: "/documents/contracts", count: soon.length }); } } catch (e) { console.error(e); } return out; }; }
if (typeof HOWTO !== "undefined") { const mgr = HOWTO.find((r) => r[0] === "manager"); if (mgr) mgr[4].push(["contracts", "Upload a contract and see who can open it", "Contracts are shared by team and reporting line — no share lists.", ["Open Operations › Documents › Contracts.", "Upload a contract: title, who it's with, team, dates, an optional amount, and the signed file.", "Open it to see who can read it, add amendments, edit details or archive it.", "Every upload, change and file is listed in the contract's History, with who did it and when."], "/documents/contracts", "Open Contracts"]); }

/* ==========================================================================
   views-hiring.js — hiring requests.
   Managers and above: My Team › Create New Hiring — the same fields as HR's
   new-opening form, sent to the HR Manager, with the history and status of
   their own department's requests. HR Manager: People › Hiring requests —
   every request, Approve / Reject (with a note) and Post job (opens the
   posting under Hiring).
   ========================================================================== */

const HIRE_STATUS = { PENDING: ["Pending", "amber"], APPROVED: ["Approved", "teal"], REJECTED: ["Rejected", "red"], POSTED: ["Posted", "green"] };
const HIRE_REQUESTER_ROLES = ["MANAGER", "FINANCE_MANAGER", "HR_MANAGER", "COMPANY_ADMIN", "GROUP_ADMIN", "EXECUTIVE"];
const HIRE_REASONS = ["New position", "Replacement", "Seasonal", "Backfill for leave", "Growth"];
const hireBadge = (s) => { const m = HIRE_STATUS[s] || [s, "grey"]; return `<span class="badge tone-${m[1]}">${esc(m[0])}</span>`; };

/* ---------------- who may do what (auth object = A or ctx.auth) ---------------- */
const hireCanRequestA = (a) => !!a && (a.isSuper || (!!a.employee && a.roleCodes.some((r) => HIRE_REQUESTER_ROLES.includes(r))));
const hireIsHrA = (a) => !!a && (a.isSuper || a.roleCodes.some((r) => r === "HR_MANAGER" || r === "GROUP_ADMIN"));
function hireCanRequest() { return hireCanRequestA(A); }
function hireIsHr() { return hireIsHrA(A); }
/** the departments a requester can ask for — their own and any they run */
function hireMyDeps(S0, a) {
  if (!a) return [];
  if (a.isSuper) { const ids = scopeIds(S0, a); return S0.departments.filter((d) => ids.includes(d.companyId) && d.isActive !== false).map((d) => d.id); }
  const e = a.employee; if (!e) return [];
  return [...new Set([e.departmentId, ...S0.departments.filter((d) => d.managerId === e.id && d.isActive !== false).map((d) => d.id)].filter(Boolean))];
}
const hireSees = (a, r) => hireIsHrA(a) ? scopeIds(S, a).includes(r.companyId) : hireMyDeps(S, a).includes(r.departmentId);
const hireReqs = () => (S.hiringRequests || []).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

/* ---------------- demo requests in each status ---------------- */
{
  const _fsHire = freshState;
  freshState = function () {
    const S = _fsHire();
    const H = (at, by, action, note) => ({ at, by, action, note });
    const base = { openings: 1, employmentType: "FULL_TIME", reason: "New position" };
    S.hiringRequests = [
      { ...base, id: "hrq1", number: "HRQ-2026-0001", companyId: "SEAF", departmentId: "dep7", title: "Fish Processor", hiringManagerId: "e15", openings: 3, employmentType: "SEASONAL", reason: "Seasonal", startDate: "2026-10-05", salaryMinCents: 2200, salaryMaxCents: 2500, locationText: "Masset plant", description: "Line processing for the fall halibut and salmon run. Food-safe training provided.", status: "POSTED", requestedByUserId: "u10", requestedByName: "Marcus Gladue", createdAt: "2026-08-25T16:10:00Z", decidedAt: "2026-08-27T17:30:00Z", decidedByName: "Shawna Laboucan", decisionNote: "Approved — within the seasonal budget.", postedAt: "2026-08-28T15:00:00Z", postedByName: "Shawna Laboucan", jobPostingId: "jpq1",
        history: [H("2026-08-25T16:10:00Z", "Marcus Gladue", "REQUESTED"), H("2026-08-27T17:30:00Z", "Shawna Laboucan", "APPROVED", "Approved — within the seasonal budget."), H("2026-08-28T15:00:00Z", "Shawna Laboucan", "POSTED")] },
      { ...base, id: "hrq2", number: "HRQ-2026-0002", companyId: "TAAN", departmentId: "dep4", title: "Tree Planter", hiringManagerId: "e7", openings: 6, employmentType: "SEASONAL", reason: "Seasonal", startDate: "2027-03-15", salaryMinCents: 2600, salaryMaxCents: 3000, locationText: "Port Clements", description: "Spring planting crew for the 2027 silviculture blocks. Camp provided.", status: "APPROVED", requestedByUserId: "u2", requestedByName: "Tyler Bigstone", createdAt: "2026-09-10T15:20:00Z", decidedAt: "2026-09-12T18:05:00Z", decidedByName: "Shawna Laboucan", decisionNote: "Approved — post once the spring contract is signed.",
        history: [H("2026-09-10T15:20:00Z", "Tyler Bigstone", "REQUESTED"), H("2026-09-12T18:05:00Z", "Shawna Laboucan", "APPROVED", "Approved — post once the spring contract is signed.")] },
      { ...base, id: "hrq3", number: "HRQ-2026-0003", companyId: "TOUR", departmentId: "dep5", title: "Assistant Lodge Manager", hiringManagerId: "e11", startDate: "2026-11-02", salaryMinCents: 6200000, salaryMaxCents: 6800000, locationText: "Lodge — Masset", description: "Second-in-charge for lodge operations year round.", status: "REJECTED", requestedByUserId: "u9", requestedByName: "Kaya Delorme", createdAt: "2026-09-15T14:00:00Z", decidedAt: "2026-09-18T16:40:00Z", decidedByName: "Shawna Laboucan", decisionNote: "Not in the 2026 budget — raise it again in the 2027 plan.",
        history: [H("2026-09-15T14:00:00Z", "Kaya Delorme", "REQUESTED"), H("2026-09-18T16:40:00Z", "Shawna Laboucan", "REJECTED", "Not in the 2026 budget — raise it again in the 2027 plan.")] },
      { ...base, id: "hrq4", number: "HRQ-2026-0004", companyId: "TAAN", departmentId: "dep3", title: "Equipment Operator", hiringManagerId: "e7", openings: 2, reason: "Growth", startDate: "2026-11-16", salaryMinCents: 3400, salaryMaxCents: 3900, locationText: "Port Clements", description: "Loader and processor operators for Block 12. Valid Class 5 and Level 1 first aid.", status: "PENDING", requestedByUserId: "u2", requestedByName: "Tyler Bigstone", createdAt: "2026-09-29T15:45:00Z",
        history: [H("2026-09-29T15:45:00Z", "Tyler Bigstone", "REQUESTED")] },
      { ...base, id: "hrq5", number: "HRQ-2026-0005", companyId: "HAICO", departmentId: "dep2", title: "Accounts Payable Clerk", hiringManagerId: "e3", reason: "Replacement", startDate: "2026-11-30", salaryMinCents: 5200000, salaryMaxCents: 5800000, locationText: "Skidegate", description: "Keys vendor bills, matches POs and runs the weekly payment batch.", status: "PENDING", requestedByUserId: "u4", requestedByName: "Wesley Desjarlais", createdAt: "2026-10-01T16:30:00Z",
        history: [H("2026-10-01T16:30:00Z", "Wesley Desjarlais", "REQUESTED")] },
    ];
    S.jobPostings.push({ id: "jpq1", companyId: "SEAF", title: "Fish Processor", departmentId: "dep7", locationText: "Masset plant", employmentType: "SEASONAL", openings: 3, salaryMinCents: 2200, salaryMaxCents: 2500, reason: "Seasonal", startDate: "2026-10-05", description: "Line processing for the fall halibut and salmon run. Food-safe training provided.", status: "OPEN", hiringManagerId: "e15", postedAt: "2026-08-28T15:00:00Z", approvedAt: "2026-08-27T17:30:00Z", approvedByName: "Shawna Laboucan", createdByName: "Shawna Laboucan", createdAt: "2026-08-28T15:00:00Z", hiringRequestId: "hrq1" });
    return S;
  };
}

/* ---------------- reducers ---------------- */
function hireNotifyHr(S, ctx, r, n) {
  const ids = new Set(S.userRoles.filter((x) => x.roleCode === "HR_MANAGER" && (!x.companyId || x.companyId === r.companyId)).map((x) => x.userId));
  for (const id of ids) if (id !== ctx.actor.id) ctx.notify(id, n);
}
Object.assign(R, {
  "hire.request"(S, p, ctx) {
    if (!hireCanRequestA(ctx.auth)) fail("Only managers and above can ask for a new hire.");
    S.hiringRequests = S.hiringRequests || [];
    const dep = byId(S.departments, p.departmentId);
    if (!dep) fail("Choose the department the person will join.");
    if (!hireMyDeps(S, ctx.auth).includes(dep.id)) fail("You can only ask for hires in your own department.");
    ctx.company(dep.companyId);
    const title = String(p.title || "").trim();
    if (!title) fail("Give the job a title.");
    const openings = Math.max(1, Math.round(Number(p.openings) || 1));
    if (openings > 50) fail("Headcount looks too high — 50 at most per request.");
    if (p.hiringManagerId && !byId(S.employees, p.hiringManagerId)) fail("Pick a hiring manager from the list.");
    const min = Number(p.salaryMinCents) || 0, max = Number(p.salaryMaxCents) || 0;
    if (min < 0 || max < 0) fail("The salary range can't be negative.");
    if (min && max && max < min) fail("The top of the salary range is below the bottom.");
    if (p.startDate && p.startDate < ctx.now.slice(0, 10)) fail("The target start date is in the past.");
    const r = { id: ctx.id("hrq"), number: nextNum(S.hiringRequests.map((x) => x.number), "HRQ-2026", 4), companyId: dep.companyId, departmentId: dep.id, title, hiringManagerId: p.hiringManagerId || dep.managerId || undefined, openings, employmentType: EMPLOYMENT[p.employmentType] ? p.employmentType : "FULL_TIME", startDate: p.startDate || undefined, salaryMinCents: min || undefined, salaryMaxCents: max || undefined, reason: HIRE_REASONS.includes(p.reason) ? p.reason : "New position", locationText: String(p.locationText || "").trim() || undefined, description: String(p.description || "").trim() || undefined, status: "PENDING", requestedByUserId: ctx.actor.id, requestedByName: ctx.actor.displayName, createdAt: ctx.now, history: [{ at: ctx.now, by: ctx.actor.displayName, action: "REQUESTED" }] };
    S.hiringRequests.push(r);
    hireNotifyHr(S, ctx, r, { type: "APPROVAL_REQUIRED", title: `Hiring request: ${title} × ${openings}`, body: `${ctx.actor.displayName} · ${dep.name} · ${co(dep.companyId).displayName}`, linkUrl: `/hr/hiring-requests/${r.id}` });
    ctx.audit({ module: "hr", action: "SUBMIT", companyId: r.companyId, entityType: "HiringRequest", entityId: r.id, summary: `${ctx.actor.displayName} asked HR to hire ${openings} × ${title} (${dep.name}) — ${r.number}.` });
  },
  "hire.decide"(S, p, ctx) {
    if (!hireIsHrA(ctx.auth)) fail("Only the HR Manager can approve or reject hiring requests.");
    const r = byId(S.hiringRequests || [], p.id);
    if (!r) fail("That hiring request no longer exists.");
    ctx.company(r.companyId);
    if (r.status !== "PENDING") fail(`This request is already ${HIRE_STATUS[r.status][0].toLowerCase()}.`);
    const decision = p.decision === "REJECTED" ? "REJECTED" : "APPROVED";
    const note = String(p.note || "").trim();
    if (decision === "REJECTED" && !note) fail("Say why it's rejected — the manager sees the note.");
    Object.assign(r, { status: decision, decidedAt: ctx.now, decidedByName: ctx.actor.displayName, decisionNote: note || undefined });
    r.history.push({ at: ctx.now, by: ctx.actor.displayName, action: decision, note: note || undefined });
    ctx.notify(r.requestedByUserId, { type: decision, title: `${decision === "APPROVED" ? "Approved" : "Not approved"}: hiring ${r.title} × ${r.openings}`, body: note || (decision === "APPROVED" ? "HR will post the job." : ""), linkUrl: `/team/hiring/${r.id}` });
    ctx.audit({ module: "hr", action: decision === "APPROVED" ? "APPROVE" : "REJECT", companyId: r.companyId, entityType: "HiringRequest", entityId: r.id, summary: `${ctx.actor.displayName} ${decision === "APPROVED" ? "approved" : "rejected"} hiring request ${r.number} (${r.title} × ${r.openings})${note ? ` — “${note}”` : ""}.` });
  },
  "hire.post"(S, p, ctx) {
    if (!hireIsHrA(ctx.auth)) fail("Only the HR Manager can post a job.");
    const r = byId(S.hiringRequests || [], p.id);
    if (!r) fail("That hiring request no longer exists.");
    ctx.company(r.companyId);
    if (r.status !== "APPROVED") fail(r.status === "POSTED" ? "This job is already posted." : "Approve the request before posting the job.");
    const j = { id: ctx.id("jp"), companyId: r.companyId, title: r.title, departmentId: r.departmentId, hiringManagerId: r.hiringManagerId, openings: r.openings, locationText: r.locationText, employmentType: r.employmentType, salaryMinCents: r.salaryMinCents, salaryMaxCents: r.salaryMaxCents, reason: r.reason, startDate: r.startDate, description: r.description, status: "OPEN", createdByName: ctx.actor.displayName, createdAt: ctx.now, postedAt: ctx.now, approvedAt: r.decidedAt, approvedByName: r.decidedByName, hiringRequestId: r.id };
    S.jobPostings.push(j);
    Object.assign(r, { status: "POSTED", postedAt: ctx.now, postedByName: ctx.actor.displayName, jobPostingId: j.id });
    r.history.push({ at: ctx.now, by: ctx.actor.displayName, action: "POSTED" });
    ctx.notify(r.requestedByUserId, { type: "SYSTEM", title: `Job posted: ${r.title} × ${r.openings}`, body: "The opening is live and takes applicants.", linkUrl: `/team/hiring/${r.id}` });
    ctx.audit({ module: "hr", action: "CREATE", companyId: r.companyId, entityType: "JobPosting", entityId: j.id, summary: `${ctx.actor.displayName} posted the job “${r.title}” from hiring request ${r.number}.` });
  },
});

/* ---------------- shared pieces ---------------- */
const HIRE_ACTION_WORD = { REQUESTED: "Sent to the HR Manager", APPROVED: "Approved", REJECTED: "Rejected", POSTED: "Job posted" };
function hireHistory(r) {
  return `<ol class="hire-tl">${(r.history || []).map((h) => `<li class="${esc(h.action)}"><b>${esc(HIRE_ACTION_WORD[h.action] || h.action)}</b> · ${esc(h.by)} · <span class="hint">${esc(dTime(h.at))}</span>${h.note ? `<div class="hire-note">“${esc(h.note)}”</div>` : ""}</li>`).join("")}</ol>`;
}
injectCss(`
.hire-tl{list-style:none;margin:0;padding:0 0 0 14px;border-left:2px solid var(--border)}
.hire-tl li{position:relative;padding:0 0 12px 10px;font-size:13px}
.hire-tl li::before{content:"";position:absolute;left:-21px;top:4px;width:10px;height:10px;border-radius:50%;background:var(--muted-fg);border:2px solid var(--card)}
.hire-tl li.APPROVED::before{background:#17566b}.hire-tl li.REJECTED::before{background:#9e2b2b}.hire-tl li.POSTED::before{background:#3e6b34}.hire-tl li.REQUESTED::before{background:#c99a2e}
.hire-note{margin-top:3px;padding:6px 9px;background:var(--muted);border-radius:6px;font-size:12.5px}
.hire-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px 18px}
.hire-kv div{font-size:13.5px}.hire-kv span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted-fg);font-weight:600}
`);
const hirePos = (r) => `<strong>${esc(r.title)}</strong> × ${r.openings}<div class="hint">${esc(EMPLOYMENT[r.employmentType] || "")} · ${esc(r.reason || "")}</div>`;
const hireDept = (r) => `${esc(byId(S.departments, r.departmentId)?.name || "—")}<div class="hint">${coTag(r.companyId)}</div>`;
function hireRow(r, base, acts) {
  return `<tr${acts == null ? ` class="click" data-go="${base}/${r.id}"` : ""}><td class="mono" style="white-space:nowrap">${acts == null ? esc(r.number) : `<button class="lnk mono" data-go="${base}/${r.id}">${esc(r.number)}</button>`}</td><td>${hirePos(r)}</td><td>${hireDept(r)}</td><td>${esc(r.requestedByName)}</td><td style="white-space:nowrap">${dLong(r.createdAt.slice(0, 10))}</td><td>${hireBadge(r.status)}${r.status === "REJECTED" && r.decisionNote ? `<div class="hint" style="max-width:220px">“${esc(r.decisionNote)}”</div>` : ""}</td>${acts == null ? "" : `<td class="r" style="white-space:nowrap">${acts}</td>`}</tr>`;
}
const HIRE_HEADS = ["Request", "Position", "Department", "Requested by", "Sent", "Status"];

/* ---------------- manager: Create New Hiring ---------------- */
function hireForm() {
  const depIds = hireMyDeps(S, A);
  const deps = S.departments.filter((d) => depIds.includes(d.id));
  const cos = S.companies.filter((c) => deps.some((d) => d.companyId === c.id));
  const cid = cos.some((c) => c.id === UI.filters.hireCo) ? UI.filters.hireCo : cos[0]?.id;
  const cdeps = deps.filter((d) => d.companyId === cid);
  const depSel = cdeps.some((d) => d.id === UI.filters.hireDep) ? UI.filters.hireDep : (cdeps.find((d) => d.id === A.employee?.departmentId) || cdeps[0])?.id;
  const dep = byId(S.departments, depSel);
  const mgrs = S.employees.filter((x) => (x.companyId === cid || x.companyId === "HAICO") && !["TERMINATED", "INACTIVE"].includes(x.status)).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const defMgr = dep?.managerId || A.employee?.id || "";
  if (!deps.length) return `<p class="hint">Your account isn't linked to a department, so there's nothing to request for.</p>`;
  return `<form data-f="hireRequest" class="form-grid"><div class="fld"><label for="hqCo">Company</label><select class="in" id="hqCo" name="companyId" data-a="hireCo">${cos.map((c) => opt(c.id, c.displayName, c.id === cid)).join("")}</select></div><div class="fld"><label for="hqD">Department</label><select class="in" id="hqD" name="departmentId" required data-a="hireDep">${cdeps.map((d) => opt(d.id, `${d.code} — ${d.name}`, d.id === depSel)).join("")}</select></div>
    <div class="fld" style="grid-column:1/-1"><label for="hqT">Title</label><input class="in" id="hqT" name="title" required placeholder="e.g. Seasonal Deckhand"></div>
    <div class="fld"><label for="hqM">Hiring manager</label><select class="in" id="hqM" name="hiringManagerId">${mgrs.map((x) => opt(x.id, `${empName(x)} · ${byId(S.positions, x.positionId)?.title || ""}`, x.id === defMgr)).join("")}</select></div><div class="fld"><label for="hqO">Headcount</label><input class="in num" type="number" min="1" max="50" id="hqO" name="openings" value="1"></div>
    <div class="fld"><label for="hqE">Employment</label><select class="in" id="hqE" name="employmentType">${Object.entries(EMPLOYMENT).map(([k, l]) => opt(k, l)).join("")}</select></div><div class="fld"><label for="hqStart">Target start date</label><input class="in" type="date" id="hqStart" name="startDate" value="${addDays(todayStr(), 45)}"></div>
    <div class="fld"><label for="hqS1">Salary range from ($)</label><input class="in num" id="hqS1" name="salaryMin" inputmode="decimal" placeholder="hourly or yearly"></div><div class="fld"><label for="hqS2">Salary range to ($)</label><input class="in num" id="hqS2" name="salaryMax" inputmode="decimal"></div>
    <div class="fld"><label for="hqWhy">Reason for hire</label><select class="in" id="hqWhy" name="reason">${HIRE_REASONS.map((r) => opt(r, r)).join("")}</select></div><div class="fld"><label for="hqL">Location</label><input class="in" id="hqL" name="locationText" placeholder="e.g. Masset"></div>
    <div class="fld" style="grid-column:1/-1"><label for="hqDesc">Description</label><textarea class="in" id="hqDesc" name="description" rows="3" placeholder="What the job is and what you're looking for"></textarea></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:space-between"><span class="hint">Goes to the HR Manager. You'll be notified when it's approved, rejected or posted.</span><button class="btn pri">Send to HR Manager</button></div></form>`;
}
function vHireTeam() {
  const deps = hireMyDeps(S, A);
  const mine = hireReqs().filter((r) => deps.includes(r.departmentId));
  const depNames = S.departments.filter((d) => deps.includes(d.id)).map((d) => d.name);
  const n = (s) => mine.filter((r) => r.status === s).length;
  return ph("Create New Hiring", "Ask HR to hire for your department. Fill in the opening — the HR Manager approves or rejects it and posts the job.") + flashHtml()
    + `<div class="stats">${stat("Pending", String(n("PENDING")), "waiting for the HR Manager", n("PENDING") ? "warn" : "")}${stat("Approved", String(n("APPROVED")), "HR will post the job")}${stat("Posted", String(n("POSTED")), "live and taking applicants", n("POSTED") ? "good" : "")}${stat("Rejected", String(n("REJECTED")), "see the HR note")}</div>`
    + card("New hiring request", hireForm())
    + cardFlush(`Your department's requests${depNames.length ? ` · ${depNames.join(", ")}` : ""}`, table(HIRE_HEADS, mine.map((r) => hireRow(r, "/team/hiring")), "No hiring requests for your department yet."));
}

/* ---------------- HR Manager: every request ---------------- */
function vHireHr() {
  const ids = scopeIds(S, A);
  const all = hireReqs().filter((r) => ids.includes(r.companyId));
  const cur = UI.tabs.hireHr || "";
  const list = cur ? all.filter((r) => r.status === cur) : all;
  const n = (s) => all.filter((r) => r.status === s).length;
  const chips = [["", "All", all.length], ...Object.entries(HIRE_STATUS).map(([k, [l]]) => [k, l, n(k)])].map(([k, l, c]) => `<button class="hchip ${k === cur ? "on" : ""}" data-a="hireTab" data-v="${k}">${esc(l)} <span class="mono">${c}</span></button>`).join("");
  return ph("Hiring requests", "Requests from managers for new hires. Approve or reject each one (the manager sees your note), then post the approved jobs — they open under Hiring and take applicants.", `<button class="btn" data-go="/hr/hiring">Open Hiring</button>`) + flashHtml()
    + `<div class="stats">${stat("Waiting for you", String(n("PENDING")), n("PENDING") ? "approve or reject" : "nothing waiting", n("PENDING") ? "warn" : "good")}${stat("Approved — not posted", String(n("APPROVED")), n("APPROVED") ? "post the job" : "all posted")}${stat("Posted", String(n("POSTED")), "openings live")}${stat("Rejected", String(n("REJECTED")), "with a note to the manager")}</div>`
    + `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px">${chips}</div>`
    + cardFlush("", table([...HIRE_HEADS, ">"], list.map((r) => hireRow(r, "/hr/hiring-requests", hireActs(r, true))), "No requests with this status."));
}
function hireActs(r, small) {
  if (!hireIsHr()) return "";
  const sm = small ? " sm" : "";
  if (r.status === "PENDING") return `<button class="btn${sm} pri" data-a="hireDecideOpen" data-id="${r.id}" data-d="APPROVED">Approve</button> <button class="btn${sm}" data-a="hireDecideOpen" data-id="${r.id}" data-d="REJECTED">Reject</button>`;
  if (r.status === "APPROVED") return `<button class="btn${sm} pri" data-a="hirePostOpen" data-id="${r.id}">Post job</button>`;
  if (r.status === "POSTED" && r.jobPostingId && can(A, "hr.employees.edit")) return `<button class="btn${sm}" data-go="/hr/hiring/${r.jobPostingId}">Open posting</button>`;
  return "";
}

/* ---------------- one request ---------------- */
function vHireDetail(back) {
  return (q, id) => {
    const r = byId(S.hiringRequests || [], id);
    const crumbTo = back === "/hr/hiring-requests" ? crumb(back, "Hiring requests") : crumb(back, "Create New Hiring");
    if (!r || !hireSees(A, r)) return ph("Request not found", "", "", crumbTo) + card("", `<p>That hiring request doesn't exist or is outside your department.</p><button class="btn" data-go="${back}">Back</button>`);
    const dep = byId(S.departments, r.departmentId), mgr = byId(S.employees, r.hiringManagerId);
    const kv = [["Company", co(r.companyId).displayName], ["Department", dep?.name || "—"], ["Hiring manager", mgr ? empName(mgr) : "—"], ["Headcount", String(r.openings)], ["Employment", EMPLOYMENT[r.employmentType] || "—"], ["Target start", r.startDate ? dLong(r.startDate) : "—"], ["Salary range", r.salaryMinCents ? hr3PayRange(r) : "not set"], ["Reason", r.reason || "—"], ["Location", r.locationText || "—"], ["Requested by", `${r.requestedByName} · ${dLong(r.createdAt.slice(0, 10))}`]];
    const acts = hireActs(r, false);
    return ph(`${r.title} × ${r.openings}`, `${r.number} · ${dep?.name || ""} · ${co(r.companyId).displayName}`, `${hireBadge(r.status)} ${acts}`, crumbTo) + flashHtml()
      + `<div class="grid g2" style="align-items:start">${card("The opening", `<div class="hire-kv">${kv.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join("")}</div>${r.description ? `<div class="sect-l" style="margin-top:14px">Description</div><p style="margin:4px 0 0;font-size:13.5px">${esc(r.description)}</p>` : ""}`)}
        ${card("History", hireHistory(r) + (r.status === "POSTED" && r.jobPostingId ? `<p class="hint" style="margin:6px 0 0">The job is live${can(A, "hr.employees.edit") ? ` — ${goLink(`/hr/hiring/${r.jobPostingId}`, "open the posting")}` : ""}.</p>` : r.status === "PENDING" ? `<p class="hint" style="margin:6px 0 0">Waiting for the HR Manager.</p>` : ""))}</div>`;
  };
}
function hireDecideModal(r, d) {
  const ok = d === "APPROVED";
  return `<h3 style="margin:0 0 4px">${ok ? "Approve" : "Reject"} ${esc(r.title)} × ${r.openings}</h3><p class="hint" style="margin:0 0 12px">${esc(r.number)} · asked by ${esc(r.requestedByName)} · ${esc(byId(S.departments, r.departmentId)?.name || "")}. ${ok ? "Once approved you can post the job." : "The manager sees your note."}</p>
    <form data-f="hireDecide" data-id="${r.id}" data-d="${d}"><div class="fld"><label for="hdNote">Note to the manager${ok ? ` <span class="hint" style="font-weight:400">— optional</span>` : ""}</label><textarea class="in" id="hdNote" name="note" rows="3" ${ok ? "" : "required"} placeholder="${ok ? "e.g. Approved — post after the budget review." : "Why it can't go ahead"}"></textarea></div>
    <div class="form-row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn ${ok ? "pri" : "dng"}">${ok ? "Approve" : "Reject"}</button></div></form>`;
}

hr3Route("/team/hiring", () => hireCanRequest(), vHireTeam);
hr3Route("/team/hiring/:id", () => hireCanRequest() || hireIsHr(), vHireDetail("/team/hiring"));
hr3Route("/hr/hiring-requests", () => hireIsHr(), vHireHr);
hr3Route("/hr/hiring-requests/:id", () => hireIsHr(), vHireDetail("/hr/hiring-requests"));

window.FORMS_EXT.push({
  hireRequest(f) {
    const d = fd(f); const before = (S.hiringRequests || []).length;
    if (act("hire.request", { departmentId: d.departmentId, title: d.title, hiringManagerId: d.hiringManagerId, openings: Number(d.openings) || 1, employmentType: d.employmentType, startDate: d.startDate, salaryMinCents: toCents(d.salaryMin) || null, salaryMaxCents: toCents(d.salaryMax) || null, reason: d.reason, locationText: d.locationText, description: d.description })) {
      const r = S.hiringRequests[before];
      UI.flash = { kind: "ok", text: `${r.number} — ${r.title} × ${r.openings} sent to the HR Manager. You'll see the status change here.` };
      f.reset(); safeRender();
    }
  },
  hireDecide(f) {
    const d = fd(f); const r = byId(S.hiringRequests || [], f.dataset.id); const ok = f.dataset.d === "APPROVED";
    if (act("hire.decide", { id: f.dataset.id, decision: f.dataset.d, note: d.note }, `${r?.number} ${ok ? "approved — post the job when you're ready" : "rejected — the manager has been told"}.`)) { UI.modal = null; safeRender(); }
  },
  hirePost(f) {
    const r = byId(S.hiringRequests || [], f.dataset.id);
    if (act("hire.post", { id: f.dataset.id }, `${r?.title} posted — it's open under Hiring.`)) { UI.modal = null; safeRender(); }
  },
});
window.ACTIONS_EXT.push({
  hireCo(el) { UI.filters.hireCo = el.value; UI.filters.hireDep = null; safeRender(); },
  hireDep(el) { UI.filters.hireDep = el.value; safeRender(); },
  hireTab(el) { UI.tabs.hireHr = el.dataset.v; safeRender(); },
  hireDecideOpen(el) { const r = byId(S.hiringRequests || [], el.dataset.id); if (r) { UI.modal = hireDecideModal(r, el.dataset.d); UI.modalWide = false; safeRender(); setTimeout(() => document.getElementById("hdNote")?.focus(), 30); } },
  hirePostOpen(el) {
    const r = byId(S.hiringRequests || [], el.dataset.id); if (!r) return;
    UI.modal = `<h3 style="margin:0 0 4px">Post ${esc(r.title)} × ${r.openings}?</h3><p class="hint" style="margin:0 0 12px">Opens the job under Hiring with the details from ${esc(r.number)} (${esc(byId(S.departments, r.departmentId)?.name || "")}, ${esc(EMPLOYMENT[r.employmentType] || "")}${r.salaryMinCents ? `, ${esc(hr3PayRange(r))}` : ""}). It starts taking applicants right away and ${esc(r.requestedByName)} is told.</p><form data-f="hirePost" data-id="${r.id}"><div class="form-row" style="justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Post job</button></div></form>`;
    UI.modalWide = false; safeRender();
  },
});

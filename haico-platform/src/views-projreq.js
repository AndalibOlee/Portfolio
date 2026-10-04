/* ==========================================================================
   views-projreq.js — new projects need the Director's approval.
   Managers and above create a project (name, department, budget, dates,
   description, attachments). It starts as "Pending Director Approval";
   the Director (Executive Director role) sees every detail and approves or
   rejects with a comment. Only approved projects become active, so only
   they show up for timesheets, bills and expenses.
   ========================================================================== */

PROJ_STATUS_LABEL.PENDING_APPROVAL = ["Pending Director Approval", "amber"];
PROJ_STATUS_LABEL.REJECTED = ["Rejected", "red"];
PROJ_CHIPS.push(["pending", "Pending approval", ["PENDING_APPROVAL"]], ["rejected", "Rejected", ["REJECTED"]]);
TYPE_LABEL.Project = "New project";
const PROJ_NOT_LIVE = ["PENDING_APPROVAL", "REJECTED"];

/* ---------------- who may create, and for which departments ---------------- */
const projCanPropose = (a) => !!a && (a.isSuper || can(a, "projects.manage") || (can(a, "projects.view") && a.roleCodes.some((r) => ["MANAGER", "EXECUTIVE", "COMPANY_ADMIN", "FINANCE_MANAGER"].includes(r))));
function projDeps(S0, a) {
  if (!a) return [];
  if (a.isSuper || can(a, "projects.manage")) { const ids = scopeIds(S0, a); return S0.departments.filter((d) => ids.includes(d.companyId) && d.isActive !== false).map((d) => d.id); }
  return hireMyDeps(S0, a);
}
const projInst = (S0, p) => (p.approvalInstanceId ? byId(S0.approvals, p.approvalInstanceId) : null);

/* ---------------- workflow + demo proposals ---------------- */
function projDemoPdf(title, rows) {
  const P = docPdf(title);
  let y = docPdfHead(P, "Project proposal", title, "Attachment");
  y = docPdfTable(P, y, [["Item", P.W - P.M * 2 - 120], ["Amount", 120, "r"]], rows, { totalLast: true });
  P.text(P.M, y + 10, 9.5, "Prepared for Director review. Figures are estimates for the demo.", { color: DOC_MUTED });
  docPdfFoot(P, "DEMO DOCUMENT - sample attachment for the Haico Group platform demo.");
  const b = P.bytes(); let bin = ""; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return { data: "data:application/pdf;base64," + btoa(bin), size: b.length };
}
{
  const _fsProj = freshState;
  freshState = function () {
    const S = _fsProj();
    S.workflows.push({ id: "wfPrj", code: "PROJECT", name: "New projects", isActive: true });
    S.workflowSteps.push({ id: "wsPrj1", workflowId: "wfPrj", sequence: 1, name: "Director approval", approverType: "ROLE", roleCode: "EXECUTIVE", thresholdMinCents: 0 });
    S.projects.push(
      { id: "prjq1", companyId: "TAAN", code: "TF-2026-14", name: "Block 14 Replanting", description: "Replant 120 ha of Block 14 after the 2026 harvest: seedlings, planting crew, survival survey. Keeps us on the reforestation obligation for the licence.", customerId: null, managerId: "e7", departmentId: "dep4", startDate: "2027-03-01", endDate: "2027-06-30", billingType: "NON_BILLABLE", hourlyRateCents: 0, fixedFeeCents: null, budgetCents: 18500000, budgetHours: null, status: "PENDING_APPROVAL", createdAt: "2026-09-30T16:20:00Z", proposedByUserId: "u2", proposedByName: "Tyler Bigstone", approvalInstanceId: "aiPrj1" },
      { id: "prjq2", companyId: "TOUR", code: "TR-2026-03", name: "Lodge Dock Extension", description: "Extend the lodge dock by 30 m for two more guest boats before the 2027 season.", customerId: null, managerId: "e11", departmentId: "dep5", startDate: "2027-01-11", endDate: "2027-04-30", billingType: "NON_BILLABLE", hourlyRateCents: 0, fixedFeeCents: null, budgetCents: 42000000, budgetHours: null, status: "REJECTED", createdAt: "2026-09-08T15:00:00Z", proposedByUserId: "u9", proposedByName: "Kaya Delorme", approvalInstanceId: "aiPrj2", rejectedAt: "2026-09-11T17:10:00Z", rejectedByName: "Tamara Sinclair", decisionComment: "Hold until the 2027 capital plan — get a second contractor quote first." },
    );
    S.approvals.push(
      { id: "aiPrj1", workflowId: "wfPrj", companyId: "TAAN", entityType: "Project", entityId: "prjq1", entityLabel: "New project — Block 14 Replanting · Taan Forest", amountCents: 18500000, requestedById: "u2", currentStep: 1, totalSteps: 1, status: "PENDING", createdAt: "2026-09-30T16:20:00Z" },
      { id: "aiPrj2", workflowId: "wfPrj", companyId: "TOUR", entityType: "Project", entityId: "prjq2", entityLabel: "New project — Lodge Dock Extension · Haida Gwaii Tourism", amountCents: 42000000, requestedById: "u9", currentStep: 1, totalSteps: 1, status: "REJECTED", createdAt: "2026-09-08T15:00:00Z", completedAt: "2026-09-11T17:10:00Z" },
    );
    S.approvalActions.push({ id: "aaPrj2", instanceId: "aiPrj2", stepSequence: 1, stepName: "Director approval", approverId: "u5", approverName: "Tamara Sinclair", action: "REJECTED", comment: "Hold until the 2027 capital plan — get a second contractor quote first.", actedAt: "2026-09-11T17:10:00Z" });
    try {
      const plan = projDemoPdf("Block 14 Replanting - cost estimate", [["Seedlings (Western red cedar, 145,000)", "$72,500.00"], ["Planting crew, 6 planters x 9 weeks", "$84,000.00"], ["Camp and transport", "$18,500.00"], ["Survival survey (year 1)", "$10,000.00"], ["Total", "$185,000.00"]]);
      S.files = S.files || [];
      S.files.push({ id: "flPrj1", entityType: "Project", entityId: "prjq1", companyId: "TAAN", fileName: "Block14-replanting-estimate.pdf", mimeType: "application/pdf", sizeBytes: plan.size, data: plan.data, uploadedByName: "Tyler Bigstone", createdAt: "2026-09-30T16:20:00Z" });
      const dock = projDemoPdf("Lodge Dock Extension - contractor quote", [["Piles and decking, 30 m", "$318,000.00"], ["Permits and engineering", "$46,000.00"], ["Contingency (15%)", "$56,000.00"], ["Total", "$420,000.00"]]);
      S.files.push({ id: "flPrj2", entityType: "Project", entityId: "prjq2", companyId: "TOUR", fileName: "Dock-extension-quote.pdf", mimeType: "application/pdf", sizeBytes: dock.size, data: dock.data, uploadedByName: "Kaya Delorme", createdAt: "2026-09-08T15:00:00Z" });
    } catch (e) { /* the demo attachments are optional */ }
    return S;
  };
}

/* ---------------- send to the Director ---------------- */
function projStartApproval(S, ctx, prj) {
  const wf = S.workflows.find((w) => w.code === "PROJECT");
  if (!wf) fail("No approval workflow configured for new projects.");
  const step = S.workflowSteps.filter((s) => s.workflowId === wf.id).sort((a, b) => a.sequence - b.sequence)[0];
  const label = `New project — ${prj.name} · ${co(prj.companyId).displayName}`;
  const inst = { id: ctx.id("ai"), workflowId: wf.id, companyId: prj.companyId, entityType: "Project", entityId: prj.id, entityLabel: label, amountCents: prj.budgetCents || 0, requestedById: ctx.actor.id, currentStep: step.sequence, totalSteps: 1, status: "PENDING", createdAt: ctx.now };
  S.approvals.push(inst);
  Object.assign(prj, { status: "PENDING_APPROVAL", approvalInstanceId: inst.id, proposedByUserId: ctx.actor.id, proposedByName: ctx.actor.displayName });
  const dirs = new Set(S.userRoles.filter((r) => r.roleCode === step.roleCode && (!r.companyId || r.companyId === prj.companyId)).map((r) => r.userId));
  for (const id of dirs) if (id !== ctx.actor.id) ctx.notify(id, { type: "APPROVAL_REQUIRED", title: `Approval needed: ${label}`, body: `Budget ${money(prj.budgetCents || 0)} · ${byId(S.departments, prj.departmentId)?.name || ""}`, linkUrl: `/projects/${prj.id}` });
  ctx.notify(ctx.actor.id, { type: "SYSTEM", title: `Sent for Director approval: ${prj.name}`, body: "The project becomes active once the Director approves it.", linkUrl: `/projects/${prj.id}` });
  ctx.audit({ module: "projects", action: "SUBMIT", companyId: prj.companyId, entityType: "Project", entityId: prj.id, summary: `${ctx.actor.displayName} sent new project ${prj.code} — ${prj.name} (${money(prj.budgetCents || 0)}) for Director approval.` });
}
function projCheckDept(S, ctx, companyId, departmentId) {
  const dep = byId(S.departments, departmentId);
  if (!dep) fail("Choose the department running the project.");
  if (companyId && dep.companyId !== companyId) fail("That department belongs to a different company than the project.");
  if (!projDeps(S, ctx.auth).includes(dep.id)) fail("You can only create projects for your own department.");
  return dep;
}
function projSaveFiles(S, ctx, prj, files) {
  const list = (files || []).filter((f) => f && f.name);
  if (list.length > 8) fail("Up to 8 attachments per project.");
  for (const f of list) if (!FILE_TYPES.includes(f.type)) fail(`${f.name}: only PDF, JPG and PNG files can be attached.`);
  S.files = S.files || [];
  list.forEach((f) => S.files.push({ id: ctx.id("fl"), entityType: "Project", entityId: prj.id, companyId: prj.companyId, fileName: String(f.name).slice(0, 120), mimeType: f.type, sizeBytes: Number(f.size) || 0, data: f.data && String(f.data).length < FILE_KEEP_MAX * 1.4 ? f.data : undefined, uploadedByName: ctx.actor.displayName, createdAt: ctx.now }));
}
{
  /* Finance / company admins keep the full form — the project now waits for the Director too */
  const _projCreate = R["proj.create"];
  R["proj.create"] = function (S, p, ctx) {
    const dep = projCheckDept(S, ctx, p.companyId, p.departmentId);
    const before = S.projects.length;
    _projCreate(S, p, ctx);
    const prj = S.projects[before];
    if (!prj) return;
    prj.departmentId = dep.id;
    projSaveFiles(S, ctx, prj, p.files);
    projStartApproval(S, ctx, prj);
  };
  const _projStatus = R["proj.status"];
  R["proj.status"] = function (S, p, ctx) {
    const prj = byId(S.projects, p.projectId);
    if (prj && PROJ_NOT_LIVE.includes(prj.status)) fail(prj.status === "REJECTED" ? "The Director rejected this project — it can't be made active." : "This project is waiting for Director approval — it becomes active once approved.");
    return _projStatus(S, p, ctx);
  };
  const _projEdit = R["proj.edit"];
  R["proj.edit"] = function (S, p, ctx) {
    const prj = byId(S.projects, p.projectId);
    if (prj && PROJ_NOT_LIVE.includes(prj.status)) fail("This project hasn't been approved, so it can't be edited.");
    return _projEdit(S, p, ctx);
  };
  /* a rejection needs a reason the manager can act on */
  const _decide = R["approval.decide"];
  R["approval.decide"] = function (S, p, ctx) {
    const inst = byId(S.approvals, p.instanceId);
    if (inst && inst.entityType === "Project" && p.decision === "REJECTED" && !String(p.comment || "").trim()) fail("Add a comment saying why the project is rejected.");
    return _decide(S, p, ctx);
  };
}
Object.assign(R, {
  /* managers: the short form — no billing set-up needed */
  "proj.propose"(S, p, ctx) {
    if (!projCanPropose(ctx.auth)) fail("Only managers and above can create projects.");
    const str = (k) => String(p[k] ?? "").trim();
    const name = str("name");
    if (!name) fail("Give the project a name.");
    const dep = projCheckDept(S, ctx, null, p.departmentId);
    ctx.company(dep.companyId);
    const budgetCents = toCents(str("budget"));
    if (!(budgetCents > 0)) fail("Enter the project budget.");
    const startDate = str("startDate"), endDate = str("endDate");
    if (!startDate || !endDate) fail("Enter the start and end dates.");
    if (endDate < startDate) fail("The end date is before the start date.");
    const description = str("description");
    if (!description) fail("Describe what the project is for — the Director reads this.");
    const c = co(dep.companyId);
    const pre = (S.projects.find((x) => x.companyId === c.id)?.code || c.code).split("-")[0];
    const code = nextNum(S.projects.filter((x) => x.companyId === c.id).map((x) => x.code), `${pre}-2026`, 2);
    const prj = { id: ctx.id("prj"), companyId: c.id, code, name, description, customerId: null, managerId: ctx.auth.employee?.id || null, departmentId: dep.id, startDate, endDate, billingType: "NON_BILLABLE", hourlyRateCents: 0, fixedFeeCents: null, budgetCents, budgetHours: null, status: "PENDING_APPROVAL", createdAt: ctx.now };
    S.projects.push(prj);
    projSaveFiles(S, ctx, prj, p.files);
    ctx.audit({ module: "projects", action: "CREATE", companyId: c.id, entityType: "Project", entityId: prj.id, summary: `${ctx.actor.displayName} created project ${code} — ${name} (${dep.name}).` });
    projStartApproval(S, ctx, prj);
  },
});
{
  const _applyOutcomeProj = applyOutcome;
  applyOutcome = function (S, ctx, inst, outcome) {
    if (inst.entityType !== "Project") return _applyOutcomeProj(S, ctx, inst, outcome);
    const prj = byId(S.projects, inst.entityId);
    if (!prj) return;
    const comment = S.approvalActions.filter((x) => x.instanceId === inst.id).slice(-1)[0]?.comment;
    if (outcome === "APPROVED") Object.assign(prj, { status: "ACTIVE", approvedAt: ctx.now, approvedByName: ctx.actor.displayName, decisionComment: comment });
    else Object.assign(prj, { status: "REJECTED", rejectedAt: ctx.now, rejectedByName: ctx.actor.displayName, decisionComment: comment });
    ctx.audit({ module: "projects", action: outcome === "APPROVED" ? "APPROVE" : "REJECT", companyId: prj.companyId, entityType: "Project", entityId: prj.id, summary: outcome === "APPROVED" ? `${ctx.actor.displayName} approved project ${prj.code} — ${prj.name}; it is now active.` : `${ctx.actor.displayName} rejected project ${prj.code} — ${prj.name}${comment ? ` — “${comment}”` : ""}.` });
  };
  const _entityLinkProj = entityLink;
  entityLink = function (inst) { if (inst.entityType === "Project") return can(A, "projects.view") ? `<button class="lnk" style="font-size:12px" data-go="/projects/${inst.entityId}">Open project →</button>` : ""; return _entityLinkProj(inst); };
  const _entityDetailProj = entityDetail;
  entityDetail = function (inst) {
    if (inst.entityType === "Project") {
      const p = byId(S.projects, inst.entityId);
      if (p) { const n = filesOf("Project", p.id).length; return `${esc(byId(S.departments, p.departmentId)?.name || "")} · ${dLong(p.startDate)} → ${dLong(p.endDate)} · budget ${money(p.budgetCents || 0)}${n ? ` · 📎 ${n} attachment${n === 1 ? "" : "s"}` : ""}${p.description ? `<div style="margin-top:4px">${esc(p.description)}</div>` : ""}`; }
    }
    return _entityDetailProj(inst);
  };
}

/* ---------------- create page ---------------- */
function projDeptSelect(sel, companyId) {
  const ids = projDeps(S, A);
  const deps = S.departments.filter((d) => ids.includes(d.id) && (!companyId || d.companyId === companyId));
  const groups = S.companies.filter((c) => deps.some((d) => d.companyId === c.id));
  const def = sel || (deps.find((d) => d.id === A.employee?.departmentId) || deps[0])?.id;
  return `<select class="in" id="pjDep" name="departmentId" required>${groups.map((c) => `<optgroup label="${esc(c.displayName)}">${deps.filter((d) => d.companyId === c.id).map((d) => opt(d.id, `${d.code} — ${d.name}`, d.id === def)).join("")}</optgroup>`).join("")}</select>`;
}
function vProjNew2() {
  const full = can(A, "projects.manage");
  const intro = "Fill in the project and send it to the Director. It shows as Pending Director Approval and becomes active — open for timesheets, bills and expenses — once the Director approves it.";
  const btns = `<div class="form-row" style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:16px;flex-wrap:wrap"><span class="hint">Goes to the Director (${esc(approverWord({ approverType: "ROLE", roleCode: "EXECUTIVE" }))}).</span><span class="form-row" style="gap:8px"><button type="button" class="btn" data-go="/projects">Cancel</button><button class="btn pri">Send for Director approval</button></span></div>`;
  if (full) {
    const v = UI.projDraft?.id === "new" ? UI.projDraft : {};
    return ph("New project", intro, "", crumb("/projects", "Projects")) + flashHtml()
      + card("", `<form data-f="projCreate">${projForm(null, v)}<div class="sect-l">Department &amp; attachments</div><div class="form-grid"><div class="fld"><label for="pjDep">Department</label>${projDeptSelect(v.departmentId)}</div>${fileDrop("projNew", "Attachments", "Quotes, plans, drawings — PDF, JPG or PNG · the Director sees them")}</div>${btns}</form>`);
  }
  const v = UI.projDraft?.id === "propose" ? UI.projDraft : {};
  return ph("New project", intro, "", crumb("/projects", "Projects")) + flashHtml()
    + card("", `<form data-f="projPropose"><div class="form-grid">
      <div class="fld" style="grid-column:1/-1"><label for="ppName">Project name</label><input class="in" id="ppName" name="name" required value="${esc(v.name || "")}" placeholder="What the project is called"></div>
      <div class="fld"><label for="pjDep">Department</label>${projDeptSelect(v.departmentId)}</div><div class="fld"><label for="ppBud">Budget (CAD)</label><input class="in num" id="ppBud" name="budget" inputmode="decimal" required value="${esc(v.budget || "")}" placeholder="185,000.00"></div>
      <div class="fld"><label for="ppStart">Start date</label><input class="in" type="date" id="ppStart" name="startDate" required value="${esc(v.startDate || "")}"></div><div class="fld"><label for="ppEnd">End date</label><input class="in" type="date" id="ppEnd" name="endDate" required value="${esc(v.endDate || "")}"></div>
      <div class="fld" style="grid-column:1/-1"><label for="ppDesc">Description</label><textarea class="in" id="ppDesc" name="description" rows="4" required placeholder="What the project does, why it's needed and what the budget covers">${esc(v.description || "")}</textarea></div>
      ${fileDrop("projNew", "Attachments", "Quotes, plans, drawings — PDF, JPG or PNG · the Director sees them")}</div>${btns}</form>`);
}

/* ---------------- a project waiting for (or turned down by) the Director ---------------- */
function vProjPending(p) {
  const inst = projInst(S, p);
  const dep = byId(S.departments, p.departmentId), mgr = byId(S.employees, p.managerId);
  const days = p.startDate && p.endDate ? Math.round((D(p.endDate) - D(p.startDate)) / 864e5) + 1 : null;
  const kv = [["Project name", p.name], ["Project code", p.code], ["Company", co(p.companyId).displayName], ["Department", dep?.name || "—"], ["Budget", money(p.budgetCents || 0)], ["Start date", dLong(p.startDate)], ["End date", dLong(p.endDate)], ["Length", days ? `${days} days` : "—"], ["Run by", mgr ? empName(mgr) : "—"], ["Created by", `${p.proposedByName || "—"} · ${dLong(String(p.createdAt || "").slice(0, 10))}`]];
  const files = filesOf("Project", p.id);
  const filesHtml = files.length ? `<div class="tw"><table class="t"><thead><tr><th>File</th><th>Added by</th><th class="r"></th></tr></thead><tbody>${files.map((f) => `<tr><td>📎 <button class="lnk" data-a="openFile" data-id="${f.id}">${esc(f.fileName)}</button><div class="hint">${f.mimeType === "application/pdf" ? "PDF" : "Image"} · ${fmtSize(f.sizeBytes)}</div></td><td>${esc(f.uploadedByName || "")}</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-a="openFile" data-id="${f.id}">Open</button>${f.data ? ` <button class="btn sm" data-a="fileDownload" data-id="${f.id}">⬇ Download</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint" style="margin:0">No attachments.</p>`;
  const acts = inst ? S.approvalActions.filter((x) => x.instanceId === inst.id) : [];
  const canDecide = inst && canActOn(S, A, inst);
  const banner = p.status === "PENDING_APPROVAL"
    ? `<div class="flash" style="background:var(--t-amber-bg,#f8efd9);color:#7a5410;border-radius:10px;padding:10px 14px;margin:0 0 14px">⏳ <strong>Pending Director Approval.</strong> ${canDecide ? "Review the details and attachments, then approve or reject below." : "This project becomes active — open for timesheets, bills and expenses — once the Director approves it."}</div>`
    : `<div class="flash" style="background:#f7e6e2;color:#9e2b2b;border-radius:10px;padding:10px 14px;margin:0 0 14px">✕ <strong>Rejected by ${esc(p.rejectedByName || "the Director")}${p.rejectedAt ? ` on ${esc(dLong(p.rejectedAt.slice(0, 10)))}` : ""}.</strong>${p.decisionComment ? ` “${esc(p.decisionComment)}”` : ""}</div>`;
  const decide = canDecide ? card("Director decision", `<form data-f="projDecide" data-id="${inst.id}"><div class="fld"><label for="pdNote">Comment <span class="hint" style="font-weight:400">— required to reject; the manager sees it</span></label><textarea class="in" id="pdNote" name="comment" rows="3" placeholder="e.g. Approved — keep the crew within the budget."></textarea></div><div class="form-row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn dng" data-x="REJECTED">Reject</button><button class="btn pri" data-x="APPROVED">Approve project</button></div></form>`) : "";
  const hist = `<ol class="hire-tl"><li class="REQUESTED"><b>Sent for Director approval</b> · ${esc(p.proposedByName || "—")} · <span class="hint">${esc(dTime(p.createdAt))}</span></li>${acts.map((x) => `<li class="${esc(x.action)}"><b>${x.action === "APPROVED" ? "Approved" : "Rejected"}</b> · ${esc(x.approverName)} · <span class="hint">${esc(dTime(x.actedAt))}</span>${x.comment ? `<div class="hire-note">“${esc(x.comment)}”</div>` : ""}</li>`).join("")}${p.status === "PENDING_APPROVAL" ? `<li><span class="hint">Waiting for the Director</span></li>` : ""}</ol>`;
  return ph(p.name, `${p.code} · ${co(p.companyId)?.displayName} · ${dep?.name || ""}`, projBadge(p.status), crumb("/projects", "Projects")) + flashHtml() + banner
    + `<div class="grid g2" style="align-items:start"><div style="display:grid;gap:14px">${card("Project details", `<div class="hire-kv">${kv.map(([k, val]) => `<div><span>${esc(k)}</span>${esc(val)}</div>`).join("")}</div><div class="sect-l" style="margin-top:14px">Description</div><p style="margin:4px 0 0;font-size:13.5px;white-space:pre-wrap">${esc(p.description || "—")}</p>`)}${cardFlush(`Attachments <span class="hint" style="font-weight:400">· ${files.length}</span>`, filesHtml)}</div><div style="display:grid;gap:14px">${decide}${card("History", hist)}</div></div>`;
}
function vProjDetail2(q, id, tab) {
  const p = byId(S.projects, id);
  if (p && inView(S, A, p.companyId) && PROJ_NOT_LIVE.includes(p.status)) return vProjPending(p);
  return vProjDetail(q, id, tab);
}
function vProjList2() {
  let h = vProjList();
  if (!can(A, "projects.manage") && projCanPropose(A)) h = h.replace(/(<span class="dlwrap">[\s\S]*?<\/button><\/span>)/, `$1<button class="btn pri" data-go="/projects/new">+ New project</button>`);
  const pend = inScope(S.projects).filter((p) => p.status === "PENDING_APPROVAL");
  if (pend.length) {
    const mine = pend.filter((p) => { const i = projInst(S, p); return i && canActOn(S, A, i); });
    const note = `<div class="card" style="margin:0 0 14px;padding:12px 16px;border-left:4px solid #c99a2e"><strong>${pend.length} project${pend.length === 1 ? "" : "s"} pending Director approval</strong>${mine.length ? " — waiting for you" : ""}: ${pend.map((p) => `<button class="lnk" data-go="/projects/${p.id}">${esc(p.name)}</button>`).join(", ")}</div>`;
    const k = h.indexOf(`<div class="pjgrid">`);
    if (k >= 0) h = h.slice(0, k) + note + h.slice(k);
  }
  return h;
}
hr3Route("/projects/:id/:tab", "projects.view", vProjDetail2);
hr3Route("/projects/:id", "projects.view", (q, id) => vProjDetail2(q, id, ""));
hr3Route("/projects/new", () => projCanPropose(A), vProjNew2);
hr3Route("/projects", "projects.view", vProjList2);

window.FORMS_EXT.push({
  projCreate(f) {
    const before = S.projects.length; const p = { ...projFormPayload(f), departmentId: fd(f).departmentId, files: UI.files.projNew || [] };
    UI.projDraft = { id: "new", ...p };
    if (act("proj.create", p)) { UI.projDraft = null; takeFiles("projNew"); const prj = S.projects[before]; go(`/projects/${prj.id}`); UI.flash = { kind: "ok", text: `${prj.code} — ${prj.name} sent to the Director. It becomes active once approved.` }; safeRender(); }
  },
  projPropose(f) {
    const d = fd(f); const before = S.projects.length;
    UI.projDraft = { id: "propose", ...d };
    if (act("proj.propose", { ...d, files: UI.files.projNew || [] })) { UI.projDraft = null; takeFiles("projNew"); const prj = S.projects[before]; go(`/projects/${prj.id}`); UI.flash = { kind: "ok", text: `${prj.code} — ${prj.name} sent to the Director. It becomes active once approved.` }; safeRender(); }
  },
  projDecide(f, ev) {
    const d = fd(f); const dec = ev.submitter?.dataset.x === "REJECTED" ? "REJECTED" : "APPROVED";
    const inst = byId(S.approvals, f.dataset.id); const p = inst && byId(S.projects, inst.entityId);
    act("approval.decide", { instanceId: f.dataset.id, decision: dec, comment: d.comment }, dec === "APPROVED" ? `${p?.name} approved — it's now active.` : `${p?.name} rejected — the manager sees your comment.`);
  },
});

/* ==========================================================================
   views-rules.js — Administration › Approval rules (editable).
   Every request goes to the requester's manager first; above an amount it goes
   to the Director. The Finance Manager approves only as the manager of finance-
   team requests (the reporting-line step), so "Finance Manager" is not offered
   as a separate approver. Administrators can change each step's approver and
   threshold, remove a step, or add one. Changes apply to new requests.
   ========================================================================== */
const WF_APPROVERS = [["MANAGER", "Reporting line (the requester's manager)", "Manager approval"], ["EXECUTIVE", "Director (Executive Director)", "Director approval"], ["HR_MANAGER", "HR Manager", "HR approval"], ["PAYROLL_ADMIN", "Payroll Administrator", "Payroll approval"]];
const wfApproverOf = (s) => (s.approverType === "MANAGER" ? "MANAGER" : s.roleCode);
function wfApply(step, approver) {
  const a = WF_APPROVERS.find((x) => x[0] === approver); if (!a) fail("Choose who approves this step.");
  step.approverType = approver === "MANAGER" ? "MANAGER" : "ROLE"; if (approver === "MANAGER") delete step.roleCode; else step.roleCode = approver; step.name = a[2];
}
Object.assign(R, {
  "workflow.stepSave"(S, p, ctx) {
    ctx.need("admin.workflows");
    const st = byId(S.workflowSteps, p.stepId); if (!st) fail("Step not found.");
    const v = Number(p.thresholdMinCents); if (!Number.isFinite(v) || v < 0) fail("Enter a dollar amount of zero or more.");
    const wf = byId(S.workflows, st.workflowId), before = `${st.name} from ${money(st.thresholdMinCents || 0)}`;
    wfApply(st, p.approver); st.thresholdMinCents = v;
    ctx.audit({ module: "admin", action: "UPDATE", summary: `${ctx.actor.displayName} changed "${wf.name}": ${before} → ${st.name} from ${money(v)}.` });
  },
  "workflow.stepAdd"(S, p, ctx) {
    ctx.need("admin.workflows");
    const wf = byId(S.workflows, p.workflowId); if (!wf) fail("Rule not found.");
    const v = Number(p.thresholdMinCents); if (!Number.isFinite(v) || v < 0) fail("Enter a dollar amount of zero or more.");
    const seq = Math.max(0, ...S.workflowSteps.filter((s) => s.workflowId === wf.id).map((s) => s.sequence)) + 1;
    const st = { id: ctx.id("ws"), workflowId: wf.id, sequence: seq, thresholdMinCents: v }; wfApply(st, p.approver); S.workflowSteps.push(st);
    ctx.audit({ module: "admin", action: "CREATE", summary: `${ctx.actor.displayName} added "${st.name}" from ${money(v)} to "${wf.name}".` });
  },
  "workflow.stepRemove"(S, p, ctx) {
    ctx.need("admin.workflows");
    const st = byId(S.workflowSteps, p.stepId); if (!st) fail("Step not found.");
    if (S.workflowSteps.filter((s) => s.workflowId === st.workflowId).length < 2) fail("A rule needs at least one approver.");
    const wf = byId(S.workflows, st.workflowId);
    S.workflowSteps = S.workflowSteps.filter((s) => s.id !== st.id);
    ctx.audit({ module: "admin", action: "DELETE", summary: `${ctx.actor.displayName} removed "${st.name}" (from ${money(st.thresholdMinCents || 0)}) from "${wf.name}".` });
  },
});
function vWorkflows2() {
  const can_ = can(A, "admin.workflows");
  const sel = (cur) => `<select class="in" name="approver" style="height:32px;min-width:300px">${WF_APPROVERS.map(([k, l]) => opt(k, l, k === cur)).join("")}</select>`;
  const money_ = (c) => `<input class="in num" style="width:110px;height:32px;text-align:right" inputmode="decimal" name="threshold" value="${(c || 0) / 100}" aria-label="Starts at (CAD)">`;
  return ph("Approval Rules", "Every request goes to the requester's manager first. Above the amount you set, it goes on to the Director. Change who approves, from what amount, or remove a step.") + flashHtml()
    + `<div class="msg info" style="margin-bottom:14px">The <b>Finance Manager</b> approves only requests from their own finance team — as the manager in the reporting line. Finance is not an approval step for other teams. Changes apply to new requests.</div>`
    + `<div class="grid" style="gap:14px">${S.workflows.filter((w) => w.isActive !== false).map((w) => { const steps = S.workflowSteps.filter((s) => s.workflowId === w.id).sort((a, b) => a.sequence - b.sequence);
      return cardFlush(`<strong>${esc(w.name)}</strong> <span class="hint mono">${esc(w.code)}</span>`, table(["Step", "Approver", "Starts at"], steps.map((s, i) => `<tr><td>${i + 1}</td><td colspan="2">${can_ ? `<form data-f="wfStep" data-id="${s.id}" class="form-row" style="gap:6px;flex-wrap:nowrap">${sel(wfApproverOf(s))}${money_(s.thresholdMinCents)}<button class="btn sm" data-x="save">Save</button>${steps.length > 1 ? `<button class="btn sm danger" data-x="remove" type="submit">Remove</button>` : ""}</form>` : `${esc(s.name)} · from <span class="num">${money(s.thresholdMinCents || 0)}</span>`}</td></tr>`))
        + (can_ ? `<form data-f="wfAdd" data-id="${w.id}" class="form-row" style="gap:6px;padding:10px 12px;border-top:1px solid var(--border);flex-wrap:nowrap">${sel("EXECUTIVE")}${money_(500000)}<button class="btn sm pri">+ Add step</button></form>` : "")); }).join("")}</div>`;
}
route("/admin/workflows", "admin.workflows", vWorkflows2);
window.FORMS_EXT.push({
  wfStep(f, ev) { const d = fd(f); if (ev.submitter?.dataset.x === "remove") act("workflow.stepRemove", { stepId: f.dataset.id }, "Step removed."); else act("workflow.stepSave", { stepId: f.dataset.id, approver: d.approver, thresholdMinCents: toCents(d.threshold) }, "Step saved."); },
  wfAdd(f) { const d = fd(f); act("workflow.stepAdd", { workflowId: f.dataset.id, approver: d.approver, thresholdMinCents: toCents(d.threshold) }, "Step added."); },
});
if (typeof HOWTO !== "undefined") { const adm = HOWTO.find((r) => r[0] === "admin"); const g = adm?.[4].find((x) => x[0] === "admin-rules"); if (g) { g[2] = "Every request goes to the manager, then to the Director above an amount."; g[3] = ["Open Administration › Approval rules.", "Pick who approves each step (reporting line or Director) and the amount it starts at; add or remove steps.", "Finance Manager approves only their own finance team's requests, as that team's manager.", "New requests follow the rule right away."]; } }

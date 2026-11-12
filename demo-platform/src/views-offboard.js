/* ==========================================================================
   views-offboard.js — HR offboarding beside onboarding. HR starts an
   offboarding with the last day and the reason; a checklist goes to HR, the
   manager, IT and Payroll (exit interview, equipment back, access closed,
   final pay, Record of Employment). When every step is ticked, HR ends the
   employment, which uses the same end-of-employment step as the employee
   record (benefits end, sign-in closed, ROE drafted for Payroll).
   Every step is written to the audit log. The page is People › Onboarding &
   offboarding.
   ========================================================================== */
const OFFBOARD_TASKS = [
  ["notice", "Resignation letter or notice on file", "HR", -14],
  ["exit", "Exit interview booked", "HR", -5],
  ["handover", "Work handed over and tasks reassigned", "MANAGER", -2],
  ["equipment", "Keys, laptop, phone and tools returned", "MANAGER", 0],
  ["access", "Email and system access closed on the last day", "ADMIN", 0],
  ["finalpay", "Final pay: hours, banked time and vacation paid out", "PAYROLL", 3],
  ["benefits", "Benefits and pension ended", "PAYROLL", 3],
];
Object.assign(R, {
  "offboarding.start"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const e = byId(S.employees, p.employeeId);
    if (!e) fail("Choose who is leaving.");
    ctx.company(e.companyId);
    if (e.status === "TERMINATED") fail(`${empName(e)}'s employment has already ended.`);
    S.offboarding = S.offboarding || [];
    if (S.offboarding.some((o) => o.employeeId === e.id && o.status === "OPEN")) fail(`${empName(e)} is already being offboarded.`);
    if (!p.lastDay) fail("Enter the last day.");
    if (p.lastDay < e.startDate) fail("The last day is before they started.");
    if (!ROE_REASONS[p.reasonCode]) fail("Choose the reason for leaving.");
    const o = { id: ctx.id("off"), employeeId: e.id, companyId: e.companyId, lastDay: p.lastDay, reasonCode: p.reasonCode, notes: String(p.notes || "").trim().slice(0, 500), status: "OPEN", startedAt: ctx.now, startedByName: ctx.actor.displayName,
      tasks: OFFBOARD_TASKS.map(([key, title, role, d]) => ({ key, title, role, dueDate: addDays(p.lastDay, d), done: false })) };
    S.offboarding.push(o);
    ctx.notifyPerm("payroll.admin", e.companyId, { type: "SYSTEM", title: `Leaving: ${empName(e)}`, body: `Last day ${dLong(p.lastDay)} — final pay and Record of Employment needed`, linkUrl: "/hr/onboarding" }, ctx.actor.id);
    ctx.audit({ module: "hr", action: "CREATE", companyId: e.companyId, entityType: "Offboarding", entityId: o.id, summary: `${ctx.actor.displayName} started offboarding for ${empName(e)} — last day ${p.lastDay}, reason: ${ROE_REASONS[p.reasonCode]}. ${OFFBOARD_TASKS.length} steps assigned.` });
  },
  "offboarding.toggle"(S, p, ctx) {
    ctx.need("hr.onboarding.manage");
    const o = byId(S.offboarding || [], p.id);
    if (!o || o.status !== "OPEN") fail("That offboarding is closed.");
    ctx.company(o.companyId);
    const t = o.tasks.find((x) => x.key === p.key); if (!t) fail("Step not found.");
    t.done = !t.done; t.doneAt = t.done ? ctx.now : null; t.doneByName = t.done ? ctx.actor.displayName : null;
    const e = byId(S.employees, o.employeeId), left = o.tasks.filter((x) => !x.done).length;
    ctx.audit({ module: "hr", action: "UPDATE", companyId: o.companyId, entityType: "Offboarding", entityId: o.id, summary: `${ctx.actor.displayName} marked "${t.title}" ${t.done ? "done" : "not done"} for ${empName(e)}${left ? ` — ${left} step${left === 1 ? "" : "s"} left` : " — every step done"}.` });
  },
  "offboarding.finish"(S, p, ctx) {
    ctx.need("hr.employees.edit");
    const o = byId(S.offboarding || [], p.id);
    if (!o || o.status !== "OPEN") fail("That offboarding is closed.");
    const left = o.tasks.filter((x) => !x.done);
    if (left.length) fail(`${left.length} step${left.length === 1 ? " is" : "s are"} still open: ${left.map((x) => x.title).join("; ")}.`);
    R["employee.terminate"](S, { employeeId: o.employeeId, lastDay: o.lastDay, reasonCode: o.reasonCode, vacationPayCents: 0, recall: "", notes: o.notes }, ctx);
    o.status = "DONE"; o.finishedAt = ctx.now; o.finishedByName = ctx.actor.displayName;
    ctx.audit({ module: "hr", action: "UPDATE", companyId: o.companyId, entityType: "Offboarding", entityId: o.id, summary: `${ctx.actor.displayName} completed offboarding for ${empName(byId(S.employees, o.employeeId))}: employment ended, Record of Employment drafted.` });
  },
});
{
  const t = SECTION_BY_KEY.people?.tabs.find((x) => x.href === "/hr/onboarding");
  if (t) { t.label = "Onboarding & offboarding"; t._xmLabel = t.label; }
  const _vOnboardingOff = vOnboarding;
  vOnboarding = function () {
    const html = _vOnboardingOff.apply(this, arguments)
      .replace(/<h1>Onboarding<\/h1>/, "<h1>Onboarding &amp; offboarding</h1>")
      .replace("New starters and what still needs doing. Ticking the last task makes them Active.", "People joining and people leaving, with each step and who does it. Every tick is written to the audit log.");
    const list = inScope(S.offboarding || []).sort((a, b) => (a.status === b.status ? a.lastDay.localeCompare(b.lastDay) : a.status === "OPEN" ? -1 : 1));
    const canEdit = can(A, "hr.employees.edit"), canTick = can(A, "hr.onboarding.manage");
    const leaving = list.map((o) => {
      const e = byId(S.employees, o.employeeId), done = o.tasks.filter((x) => x.done).length, open = o.status === "OPEN";
      const rows = o.tasks.map((t) => `<label style="display:flex;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--border);font-size:13px"><input type="checkbox" data-a="offToggle" data-id="${o.id}" data-k="${t.key}" ${t.done ? "checked" : ""} ${open && canTick ? "" : "disabled"}><span style="flex:1;${t.done ? "text-decoration:line-through;color:var(--muted-fg)" : ""}">${esc(t.title)}</span><span class="badge tone-grey">${esc(t.role)}</span><span class="hint">${dShort(t.dueDate)}</span></label>`).join("");
      const foot = open ? (canEdit ? `<div style="display:flex;justify-content:flex-end;padding-top:10px"><button class="btn ${done === o.tasks.length ? "pri" : ""}" data-a="offFinish" data-id="${o.id}" ${done === o.tasks.length ? "" : "disabled"} title="${done === o.tasks.length ? "" : "Tick every step first"}">End employment and draft the ROE</button></div>` : "")
        : `<p class="hint" style="margin:10px 0 0">Completed ${dLong(o.finishedAt.slice(0, 10))} by ${esc(o.finishedByName)}.</p>`;
      return card(`<span style="display:flex;gap:10px;align-items:center">${avatar(e, 28)}${esc(empName(e))}</span>`, `<div class="hint" style="margin-bottom:6px">${esc(co(e.companyId).displayName)} · last day ${dLong(o.lastDay)} · ${esc(ROE_REASONS[o.reasonCode] || "")} · ${done} of ${o.tasks.length} done</div>${rows}${foot}`, `<span class="badge ${open ? "tone-amber" : "tone-grey"}">${open ? "Leaving" : "Left"}</span>`);
    }).join("");
    const people = inScope(S.employees).filter((e) => e.status !== "TERMINATED" && !(S.offboarding || []).some((o) => o.employeeId === e.id && o.status === "OPEN")).sort((a, b) => a.lastName.localeCompare(b.lastName));
    const form = canEdit ? `<form class="hcard" data-f="offStart" style="padding:14px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end;margin-bottom:12px">
      <label style="display:grid;gap:4px;font-size:12px;font-weight:600;color:var(--muted-fg)">Who is leaving<select class="in" name="employeeId" required><option value="">Choose…</option>${people.map((e) => `<option value="${e.id}">${esc(empName(e))}</option>`).join("")}</select></label>
      <label style="display:grid;gap:4px;font-size:12px;font-weight:600;color:var(--muted-fg)">Last day<input class="in" type="date" name="lastDay" required></label>
      <label style="display:grid;gap:4px;font-size:12px;font-weight:600;color:var(--muted-fg)">Reason<select class="in" name="reasonCode" required>${Object.entries(ROE_REASONS).map(([k, l]) => `<option value="${k}" ${k === "E" ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <button class="btn pri">Start offboarding</button></form>` : "";
    return html + `<h2 class="h2" style="margin-top:22px">Offboarding</h2><p class="hint" style="margin:0 0 10px">When someone leaves: notice, exit interview, equipment back, access closed, final pay, benefits ended and the Record of Employment.</p>`
      + form + (leaving ? `<div class="grid g2">${leaving}</div>` : card("", empty("Nobody is leaving right now", "Start an offboarding above when someone gives notice.")));
  };
}
window.ACTIONS_EXT.push({
  offToggle(el) { act("offboarding.toggle", { id: el.dataset.id, key: el.dataset.k }); },
  offFinish(el) { const o = byId(S.offboarding || [], el.dataset.id), e = o && byId(S.employees, o.employeeId); if (act("offboarding.finish", { id: el.dataset.id })) toast("Employment ended", `${e ? empName(e) : ""} · Record of Employment drafted for Payroll`, "ok"); },
});
window.FORMS_EXT.push({
  offStart(f) { const d = fd(f); if (act("offboarding.start", { employeeId: d.employeeId, lastDay: d.lastDay, reasonCode: d.reasonCode }, "Offboarding started — the checklist is assigned.")) safeRender(); },
});

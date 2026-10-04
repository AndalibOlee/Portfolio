/* ==========================================================================
   views-rc-core.js — the Request Centre inside the ERP.
   Requests menu: New Travel Request · New Credit Card Purchase · New Expense
   Claim · New Purchase Order · New Reimbursement Claim · My requests ·
   Waiting on me (= Approvals), and for Finance: Finance queue · All requests ·
   Rates & coding. One engine for routing, approvals, emails, Finance
   processing (with ledger posting) and the one-page purchase order.

   Routing (for everything that starts with the supervisor, ERP-wide): the
   request goes to the supervisor of the person it is for. If that supervisor
   is on approved full-day time off on the day it is sent, it goes to BOTH the
   supervisor and the supervisor's supervisor (and on up to the next person
   who is in); the first decision closes the step for all of them.

   Never collected or stored: card numbers, expiry dates, CVV.
   ========================================================================== */

const RC_KINDS = {
  travel: { label: "Travel request", prefix: "TR", wf: "TRAVEL_REQUEST", href: "/requests/new/travel" },
  card: { label: "Credit card purchase", prefix: "CC", wf: "CREDIT_CARD_PURCHASE", href: "/requests/new/card" },
  expense: { label: "Expense claim", prefix: "EC", wf: "RC_EXPENSE", href: "/requests/new/expense" },
  po: { label: "Purchase order", prefix: "PO", wf: "PURCHASE_ORDER", href: "/requests/new/po" },
  reimb: { label: "Reimbursement claim", prefix: "RB", wf: "TRAVEL_CLAIM", href: "/requests/new/reimbursement" },
};
const RC_STATUS = {
  submitted: ["Awaiting approval", "amber"], awaiting_director: ["Awaiting director level", "amber"], approved: ["Approved — with Finance", "teal"],
  processed: ["Processed", "green"], ready: ["PO ready", "green"], closed: ["Closed", "grey"], returned: ["Returned for correction", "amber"],
  declined: ["Declined", "red"], reapproval: ["Reapproval needed", "amber"], withdrawn: ["Withdrawn", "grey"],
};
const RC_OUTSIDE_ROLES = ["Elder", "Community member", "Guest speaker", "Committee member", "Contractor"];
const RC_NEW_ACCOUNTS = [["5215", "Field Equipment"], ["5320", "Honoraria"], ["5330", "Training"], ["2140", "Corporate Card Payable"]];
const RC_FORM_ACCOUNTS = ["5205", "5215", "5300", "5320", "5330", "5410", "5430", "5500", "5900"];
const rcPill = (st) => { const m = RC_STATUS[st] || [st, "grey"]; return `<span class="badge tone-${m[1]}">${esc(m[0])}</span>`; };
const rcCents = (v) => Math.round((Number(v) || 0) * 100);

/* ---------------- seed: settings, accounts, workflows, collections (add only) ---------------- */
{
  const _fsRc = freshState;
  freshState = function () {
    const S = _fsRc();
    S.rcRequests = []; S.rcAccess = []; S.emailTemplates = {};
    S.rcSettings = { mileageCents: 72, meals: { b: 2665, l: 3380, d: 7915 }, gstPct: 5, pstPct: 7, poThresholdCents: 500000, tolerancePct: 10, coding: { honorarium: "5320", travel: "5300" }, formAccounts: RC_FORM_ACCOUNTS.slice(), fields: { travel_training: true, card_link: true, card_ref: true, po_notes: true } };
    for (const c of S.companies) for (const [number, name] of RC_NEW_ACCOUNTS) {
      if (S.accounts.some((a) => a.companyId === c.id && a.number === number)) continue;
      S.accounts.push({ id: `acc_rc_${c.id}_${number}`, companyId: c.id, number, name, type: number.startsWith("2") ? "LIABILITY" : "EXPENSE", isActive: true, isPostable: true });
    }
    const addWf = (id, code, name, steps) => { if (S.workflows.some((w) => w.code === code)) return; S.workflows.push({ id, code, name, isActive: true }); steps.forEach((s, i) => S.workflowSteps.push({ id: `${id}_s${i + 1}`, workflowId: id, sequence: i + 1, ...s })); };
    addWf("wfRcEc", "RC_EXPENSE", "Expense claims (meeting)", [{ name: "Supervisor approval", approverType: "MANAGER", thresholdMinCents: 0 }]);
    addWf("wfRcEcX", "RC_EXPENSE_EXT", "Expense claims for someone outside the organization", [{ name: "Supervisor approval", approverType: "MANAGER", thresholdMinCents: 0 }, { name: "Director level", approverType: "ROLE", roleCode: "EXECUTIVE", thresholdMinCents: 0 }]);
    // purchase orders: director level for amounts OVER the threshold
    const po = S.workflows.find((w) => w.code === "PURCHASE_ORDER");
    if (po) { const ex = S.workflowSteps.find((s) => s.workflowId === po.id && s.roleCode === "EXECUTIVE"); if (ex) Object.assign(ex, { thresholdMinCents: 500001, name: "Director level" }); }
    return S;
  };
}

/* ---------------- who is who ---------------- */
const rcUser = (S0, empId) => (empId ? userOfEmployee(S0, empId) : null);
const rcEmpOfUser = (S0, userId) => { const u = byId(S0.users, userId); return u?.employeeId ? byId(S0.employees, u.employeeId) : null; };
const rcIsFinance = (a) => !!a && (a.isSuper || a.roleCodes.some((r) => ["FINANCE_MANAGER", "ACCOUNTANT", "GROUP_ADMIN"].includes(r)));
const rcIsAdmin = (a) => !!a && (a.isSuper || a.roleCodes.includes("GROUP_ADMIN"));
const rcIsExec = (a) => !!a && a.roleCodes.includes("EXECUTIVE");
const rcHoldsExec = (S0, userId) => S0.userRoles.some((r) => r.userId === userId && r.roleCode === "EXECUTIVE");
/** sees every request: Finance processors, Executives (read only), group admins; company admins for their company */
function rcSeesAll(a, companyId) {
  if (!a) return false;
  if (rcIsFinance(a) || rcIsExec(a)) return true;
  return a.roleCodes.includes("COMPANY_ADMIN") && (!companyId || canSee(a, companyId));
}

/* ---------------- the away rule ---------------- */
/** on approved time off for the whole of that day (part days don't count) */
function rcFullDayAway(S0, empId, date) {
  return S0.leaveRequests.some((r) => r.employeeId === empId && r.status === "APPROVED" && !r.isPartialDay && r.startDate <= date && r.endDate >= date);
}
/** Executive Director first, then the top of the chart */
function rcExecFallback(S0) {
  return S0.users.filter((u) => u.isActive !== false && rcHoldsExec(S0, u.id)).map((u) => ({ u, e: rcEmpOfUser(S0, u.id) })).sort((a, b) => (a.e?.managerId ? 0 : 1) - (b.e?.managerId ? 0 : 1)).map((x) => x.u);
}
/**
 * Who decides the supervisor step for the person `empId` on `date`.
 * The supervisor; if away, also the supervisor's supervisor, and on up until someone who is in.
 * `exclude` = user ids that may never approve this (the requester, the person it is for, whoever prepared it).
 */
function rcRoute(S0, empId, date, exclude = []) {
  const ids = [], away = [], seen = new Set();
  let cur = empId ? byId(S0.employees, empId) : null;
  const tryAdd = (u, e) => { if (!u || exclude.includes(u.id) || seen.has(u.id)) return null; seen.add(u.id); ids.push(u.id); const off = e ? rcFullDayAway(S0, e.id, date) : false; if (off) away.push(u.id); return !off; };
  let guard = 0;
  while (cur && cur.managerId && guard++ < 20) {
    const m = byId(S0.employees, cur.managerId); if (!m) break;
    const u = rcUser(S0, m.id);
    if (u && u.isActive !== false && !["TERMINATED", "INACTIVE"].includes(m.status)) { const inToday = tryAdd(u, m); if (inToday) return { ids, away }; }
    cur = m;
  }
  for (const u of rcExecFallback(S0)) { const inToday = tryAdd(u, rcEmpOfUser(S0, u.id)); if (inToday) return { ids, away }; }
  return { ids, away };
}
const rcNames = (S0, ids) => ids.map((id) => byId(S0.users, id)?.displayName || "—");
const rcOrList = (list) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}`);

/* ---------------- approval engine hooks ---------------- */
{
  /* routing for every approval whose first step is the supervisor */
  const _startApprovalRc = startApproval;
  startApproval = function (S0, ctx, o) {
    const wf = S0.workflows.find((w) => w.code === o.workflowCode && (w.companyId === o.companyId || !w.companyId) && w.isActive !== false);
    const first = wf && S0.workflowSteps.filter((s) => s.workflowId === wf.id && (o.amountCents || 0) >= (s.thresholdMinCents || 0)).sort((a, b) => a.sequence - b.sequence)[0];
    if (!first || first.approverType !== "MANAGER" || o.entityType === "JobPosting") return _startApprovalRc(S0, ctx, o);
    const subject = o.forEmployeeId || ctx.auth.employee?.id || null;
    const forUser = subject ? rcUser(S0, subject)?.id : null;
    const route = rcRoute(S0, subject, ctx.now.slice(0, 10), [ctx.actor.id, forUser, ...(o.excludeUserIds || [])].filter(Boolean));
    const saved = notifyStep; notifyStep = () => {};
    let inst;
    try { inst = _startApprovalRc(S0, ctx, o); } finally { notifyStep = saved; }
    if (!inst) return inst;
    Object.assign(inst, { approverUserIds: route.ids, awayUserIds: route.away, subjectEmployeeId: subject, excludeUserIds: [ctx.actor.id, forUser, ...(o.excludeUserIds || [])].filter(Boolean) });
    if (route.away.length) ctx.audit({ module: "approvals", action: "ROUTE", companyId: o.companyId, summary: `${o.entityLabel}: ${rcNames(S0, route.away).join(", ")} on time off today — sent to ${rcNames(S0, route.ids).join(" and ")}.` });
    notifyStep(S0, ctx, inst);
    return inst;
  };
  const _canActOnRc = canActOn;
  canActOn = function (S0, a, inst) {
    if (inst.status !== "PENDING") return null;
    const step = activeSteps(S0, inst).find((s) => s.sequence === inst.currentStep);
    if (!step) return null;
    const ex = inst.excludeUserIds || [];
    if (step.approverType === "MANAGER" && inst.approverUserIds) return inst.approverUserIds.includes(a.user.id) && !ex.includes(a.user.id) ? step : null;
    if (inst.entityType === "RcRequest" && step.approverType === "ROLE" && step.roleCode === "EXECUTIVE") {
      if (!inst.__autoDirector && (ex.includes(a.user.id) || S0.approvalActions.some((x) => x.instanceId === inst.id && x.approverId === a.user.id))) return null;
      return rcHoldsExec(S0, a.user.id) ? step : null;
    }
    return _canActOnRc(S0, a, inst);
  };
  const _whoIsNextRc = whoIsNext;
  whoIsNext = function (S0, inst) {
    const step = inst && activeSteps(S0, inst).find((s) => s.sequence === inst.currentStep);
    if (step && step.approverType === "MANAGER" && inst.approverUserIds) return rcOrList(rcNames(S0, inst.approverUserIds)) || "HR";
    if (step && inst.entityType === "RcRequest" && step.roleCode === "EXECUTIVE") return "Director level";
    return _whoIsNextRc(S0, inst);
  };
  const _notifyStepRc = notifyStep;
  notifyStep = function (S0, ctx, inst) {
    const step = activeSteps(S0, inst).find((s) => s.sequence === inst.currentStep);
    if (!step) return;
    if (step.approverType === "MANAGER" && inst.approverUserIds) {
      if (inst.entityType === "RcRequest") { const it = byId(S0.rcRequests, inst.entityId); if (it) { rcMailApprovers(S0, ctx, it, inst); return; } }
      for (const id of inst.approverUserIds) ctx.notify(id, { type: "APPROVAL_REQUIRED", title: `Approval needed: ${inst.entityLabel}`, body: inst.awayUserIds?.length ? `${rcNames(S0, inst.awayUserIds).join(", ")} on time off today, so ${rcOrList(rcNames(S0, inst.approverUserIds))} can decide. The first decision counts.` : `Step: ${step.name}`, linkUrl: "/approvals" });
      return;
    }
    if (inst.entityType === "RcRequest" && step.roleCode === "EXECUTIVE") { const it = byId(S0.rcRequests, inst.entityId); if (it) { rcMailDirectors(S0, ctx, it, inst); return; } }
    return _notifyStepRc(S0, ctx, inst);
  };
  const _decideRc = R["approval.decide"];
  R["approval.decide"] = function (S0, p, ctx) {
    const inst = byId(S0.approvals, p.instanceId);
    const rc = inst && inst.entityType === "RcRequest";
    if (inst && (rc || inst.entityType === "LeaveRequest") && p.decision === "REJECTED" && !String(p.comment || "").trim()) fail("Add a comment saying why it is declined — the requester sees it.");
    const before = inst ? inst.currentStep : 0;
    _decideRc(S0, p, ctx);
    if (!inst) return;
    // a decision closes the step for everyone it was sent to; say who decided and who was away
    if (inst.approverUserIds && inst.awayUserIds?.length) { const last = S0.approvalActions.filter((x) => x.instanceId === inst.id).slice(-1)[0]; if (last) last.routeNote = `${rcNames(S0, inst.awayUserIds).join(", ")} on time off when it was sent`; }
    if (!rc) return;
    const it = byId(S0.rcRequests, inst.entityId);
    if (!it) return;
    const act = S0.approvalActions.filter((x) => x.instanceId === inst.id).slice(-1)[0];
    if (inst.status === "PENDING" && inst.currentStep !== before) {
      // moved on to director level: if the person who just approved is a director, that counts for director level too
      const step = activeSteps(S0, inst).find((s) => s.sequence === inst.currentStep);
      if (p.decision === "APPROVED" && step?.roleCode === "EXECUTIVE" && rcHoldsExec(S0, ctx.actor.id)) {
        rcHist(it, ctx, "Approved — counts for director level too", act?.comment);
        inst.__autoDirector = true;
        try { _decideRc(S0, { instanceId: inst.id, decision: "APPROVED", comment: "Director level — approved by the same director" }, ctx); } finally { delete inst.__autoDirector; }
        return;
      }
      it.status = "awaiting_director";
      rcHist(it, ctx, "Approved — sent to director level", act?.comment);
      rcMail(S0, ctx, "approved", rcForAndBy(S0, it), rcVars(S0, it, ctx, { next: "It now goes to director level." }), { note: act?.comment });
    }
  };
  const _applyOutcomeRc = applyOutcome;
  applyOutcome = function (S0, ctx, inst, outcome) {
    if (inst.entityType !== "RcRequest") return _applyOutcomeRc(S0, ctx, inst, outcome);
    const it = byId(S0.rcRequests, inst.entityId);
    if (!it) return;
    const act = S0.approvalActions.filter((x) => x.instanceId === inst.id).slice(-1)[0];
    if (outcome === "REJECTED") {
      it.status = "declined"; rcHist(it, ctx, "Declined", act?.comment);
      rcMail(S0, ctx, "declined", rcForAndBy(S0, it), rcVars(S0, it, ctx), { note: act?.comment });
      ctx.audit({ module: "requests", action: "REJECT", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${ctx.actor.displayName} declined ${it.ref}${act?.comment ? ` — “${act.comment}”` : ""}.` });
      return;
    }
    if (it.kind === "po") { rcPoReady(S0, ctx, it, act?.comment); return; }
    it.status = "approved"; rcHist(it, ctx, "Approved", act?.comment);
    rcMail(S0, ctx, "approved", rcForAndBy(S0, it), rcVars(S0, it, ctx, { next: "It is now with Finance." }), { note: act?.comment });
    rcMail(S0, ctx, "finance", rcFinanceUsers(S0, it.companyId), rcVars(S0, it, ctx));
    ctx.audit({ module: "requests", action: "APPROVE", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${it.ref} approved — now with Finance.` });
  };
  const _entityLinkRc = entityLink;
  entityLink = function (inst) { if (inst.entityType === "RcRequest") return `<button class="lnk" style="font-size:12px" data-go="/requests/${inst.entityId}">Open the request →</button>`; return _entityLinkRc(inst); };
  const _entityDetailRc = entityDetail;
  entityDetail = function (inst) {
    if (inst.entityType === "RcRequest") { const it = byId(S.rcRequests, inst.entityId); if (it) return `${esc(RC_KINDS[it.kind].label)} · for ${esc(rcForName(it))}${it.preparedByUserId ? ` · prepared by ${esc(byId(S.users, it.preparedByUserId)?.displayName || "")}` : ""}${inst.awayUserIds?.length ? ` · <strong>${esc(rcNames(S, inst.awayUserIds).join(", "))} on time off — ${esc(rcOrList(rcNames(S, inst.approverUserIds)))} can decide</strong>` : ""}`; }
    const base = _entityDetailRc(inst);
    if (inst.approverUserIds && inst.awayUserIds?.length && inst.status === "PENDING") return `${base ? base + " · " : ""}<strong>${esc(rcNames(S, inst.awayUserIds).join(", "))} on time off — ${esc(rcOrList(rcNames(S, inst.approverUserIds)))} can decide</strong>`;
    return base;
  };
  if (typeof TYPE_LABEL === "object") TYPE_LABEL.RcRequest = "Request";
  const _approvalCatRc = approvalCat;
  approvalCat = function (inst) { if (inst.entityType === "RcRequest") { const k = byId(S.rcRequests, inst.entityId)?.kind; return k === "card" || k === "po" ? "purchases" : "expenses"; } return _approvalCatRc(inst); };
  /* the approvals pop-up: request details, and Return for correction beside Approve / Decline */
  const _aprDetailRc = aprDetailHtml;
  aprDetailHtml = function (a) {
    let h = _aprDetailRc(a);
    if (a.entityType === "RcRequest") {
      const it = byId(S.rcRequests, a.entityId);
      if (it) {
        h = h.replace(/<h4>What<\/h4>[\s\S]*?<h4>Attachments<\/h4>/, `<h4>What</h4>${rcDetailKv(it)}<h4>Attachments</h4>`);
        h = h.replace('<button class="btn danger" data-dec="REJECTED">Decline</button>', '<button class="btn" type="button" data-a="rcReturnFromPopup" data-id="' + a.id + '">Return for correction</button><button class="btn danger" data-dec="REJECTED">Decline</button>');
        h = h.replace("Note to the requester (needed if you decline)", "Comment (needed to return or decline)");
      }
    }
    if (a.entityType === "LeaveRequest") h = h.replace("Note to the requester (needed if you decline)", "Comment (needed if you decline)");
    return h;
  };
}

/* ---------------- emails: wording from templates the administrator can edit ---------------- */
const RC_TPL = {
  approval: { name: "Approval needed", to: "The approver(s)", subject: "Approval needed: {ref} — {title}", intro: "{requester} has sent you something to approve. Open it to approve, return it with a comment, or decline it." },
  approval_away: { name: "Approval needed — supervisor away", to: "The supervisor and their supervisor", subject: "Approval needed: {ref} — {title}", intro: "{away} is on time off today, so {approvers} can decide {ref}. The first decision counts and it leaves everyone else’s list." },
  received: { name: "Request received", to: "Requester, and the person it is for", subject: "Received: {ref} — {title}", intro: "Your request is with {approver}. You will be emailed when it is decided." },
  approved: { name: "Approved", to: "Requester, and the person it is for", subject: "Approved: {ref} — {title}", intro: "{approver} approved {ref}. {next}" },
  returned: { name: "Returned for correction", to: "Requester, and the person it is for", subject: "Returned: {ref} — {title}", intro: "{approver} returned {ref} with a comment. Fix it and resubmit — the reference and the history stay the same." },
  declined: { name: "Declined", to: "Requester, and the person it is for", subject: "Declined: {ref} — {title}", intro: "{approver} declined {ref}. Their comment is below." },
  finance: { name: "Ready for Finance", to: "Finance", subject: "{ref} approved — ready for Finance", intro: "{requester} raised {ref} and it has been approved. It is waiting in the Finance queue." },
  po_ready: { name: "Purchase order ready", to: "Requester, and the person it is for", subject: "Purchase order ready: {ref}", intro: "The last approval is recorded. The purchase order is attached and ready to print or send to the supplier." },
  processed: { name: "Processed, with confirmation", to: "Requester, and the person it is for", subject: "Confirmed: {ref} — {title}", intro: "Finance has processed {ref}. The confirmation is attached, and it is saved on the request too." },
  paid: { name: "Claim paid", to: "Requester, and the person it is for", subject: "Paid: {ref} — {title}", intro: "Finance has recorded the payment for {ref}." },
  reapproval: { name: "Purchase order reapproval", to: "The approver", subject: "Reapproval needed: {ref}", intro: "Finance recorded an invoice amount for {ref} that moved by more than the tolerance. It needs your approval again." },
  comment: { name: "New comment", to: "Everyone on the request", subject: "New comment on {ref} — {title}", intro: "{approver} added a comment to {ref}." },
  access: { name: "Request access changed", to: "The employee", subject: "Change to who you can raise requests for", intro: "{approver} changed who you can raise requests for: {title}." },
  leave_req: { name: "Time off to approve", to: "The approver(s)", subject: "Time off to approve: {requester} — {title}", intro: "{requester} has asked for time off. Their balance was checked before it was sent." },
  leave_dec: { name: "Time off decided", to: "The employee", subject: "Time off {decision}: {title}", intro: "{approver} {decision} your time-off request." },
  ts_sub: { name: "Timesheet to approve", to: "The approver(s)", subject: "Timesheet to approve: {requester} — {title}", intro: "{requester} has submitted a timesheet. The overtime is already worked out." },
  ts_dec: { name: "Timesheet decided", to: "The employee", subject: "Timesheet {decision}: {title}", intro: "{approver} {decision} your timesheet." },
  reminder: { name: "Timesheet reminder", to: "Anyone who has not submitted", subject: "Reminder: your timesheet for {title}", intro: "Your timesheet for {title} has not been submitted yet. It is due {due}." },
  ts_change: { name: "Timesheet change requested", to: "Finance", subject: "Timesheet change requested: {requester} — {title}", intro: "{requester} has asked to change an approved timesheet. Approve it to reopen the timesheet, or decline it." },
  ts_change_dec: { name: "Timesheet change decided", to: "The employee", subject: "Your timesheet change was {decision}", intro: "{approver} has decided your request to change your timesheet for {title}: {decision}." },
  ts_all_sub: { name: "All timesheets submitted", to: "Finance", subject: "All timesheets are in — {title}", intro: "Every timesheet for {title} has been submitted. {next}" },
  ts_all_appr: { name: "Payroll report ready", to: "Finance and HR", subject: "Payroll report ready — {title}", intro: "Every timesheet for {title} is approved. The payroll report can be downloaded now." },
};
const rcTpl = (S0, key) => ({ ...RC_TPL[key], ...((S0.emailTemplates || {})[key] || {}) });
const rcFill = (t, v) => String(t || "").replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
const RC_MAIL_TYPE = { approval: "APPROVAL_REQUIRED", approval_away: "APPROVAL_REQUIRED", leave_req: "APPROVAL_REQUIRED", ts_sub: "TIMESHEET", reminder: "TIMESHEET", ts_change: "TIMESHEET", ts_dec: "TIMESHEET", ts_change_dec: "TIMESHEET", ts_all_sub: "TIMESHEET", ts_all_appr: "TIMESHEET", declined: "REJECTED", approved: "APPROVED", po_ready: "APPROVED", processed: "SYSTEM", paid: "SYSTEM" };
/** send one template to several people (each gets their own email + bell notification) */
function rcMail(S0, ctx, key, toUserIds, vars, opt = {}) {
  const t = rcTpl(S0, key);
  const list = [...new Set((toUserIds || []).filter((id) => id && byId(S0.users, id)))];
  for (const id of list) {
    ctx.notify(id, { type: RC_MAIL_TYPE[key] || "SYSTEM", title: rcFill(t.subject, vars), body: [opt.note ? `“${opt.note}”` : "", ...(opt.rows || []).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join("\n"), linkUrl: opt.link || vars.link || "/requests", rcIntro: rcFill(t.intro, vars), rcKey: key, attach: opt.attach || undefined });
  }
}
{
  /* the email body uses the template's opening paragraph */
  const _renderEmailRc = renderEmail;
  renderEmail = function (toName, n) {
    const r = _renderEmailRc(toName, n);
    if (!n.rcIntro) return r;
    const bodyText = [`Hi ${toName.split(" ")[0]},`, "", n.rcIntro, "", n.body || "", n.attach?.length ? `Attached: ${n.attach.map((x) => x.name).join(", ")}` : "", "", `Open it here: ${n.linkUrl || "/"}`, "", "— HAICO Group platform (automatic message; replies are not read). No card number ever appears in these emails.", "DEMO: this message was kept in the outbox and not delivered."].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
    return { subject: `[HAICO Group platform] ${n.title}`, bodyText, attachments: n.attach };
  };
  const _emailPanelRc = emailPanel;
  emailPanel = function () {
    let h = _emailPanelRc();
    const e = UI.emailOpen && S.emails.find((x) => x.id === UI.emailOpen);
    if (e?.attachments?.length) h = h.replace("</pre>", `</pre><div style="padding:8px 16px;display:flex;gap:8px;flex-wrap:wrap">${e.attachments.map((x) => `<button class="btn sm" data-a="rcPoPdf" data-id="${esc(x.rcId)}">⬇ ${esc(x.name)}</button>`).join("")}</div>`);
    return h;
  };
}
const rcForUserId = (S0, it) => (it.forEmployeeId ? rcUser(S0, it.forEmployeeId)?.id : null);
const rcForAndBy = (S0, it) => [...new Set([it.requestedByUserId, rcForUserId(S0, it)].filter(Boolean))];
function rcFinanceUsers(S0, companyId) {
  return S0.users.filter((u) => u.isActive !== false).filter((u) => { const a = authFor(S0, u.id); return a && rcIsFinance(a) && !a.isSuper && canSee(a, companyId); }).map((u) => u.id);
}
function rcForName(it, S0 = S) { return it.external ? `${it.external.name} (outside the organization)` : it.forEmployeeId ? empName(byId(S0.employees, it.forEmployeeId)) : byId(S0.users, it.requestedByUserId)?.displayName || "—"; }
function rcAmount(it) {
  if (it.finance) return it.finance.totalCents;
  if (it.kind === "expense") return it.expense.totalCents;
  if (it.kind === "reimb") return it.reimb.totalCents;
  if (it.kind === "po") return it.po.invoice?.amountCents ?? it.po.estimateCents ?? 0;
  return it[it.kind]?.estimateCents || 0;
}
function rcVars(S0, it, ctx, extra = {}) {
  return { ref: it.ref, title: it.title, requester: byId(S0.users, it.preparedByUserId || it.requestedByUserId)?.displayName || "", approver: ctx?.actor?.displayName || "", next: "", link: `/requests/${it.id}`, ...extra };
}
function rcRows(S0, it) {
  const d = byId(S0.departments, it.departmentId), acct = it.accountNumber ? S0.accounts.find((a) => a.companyId === it.companyId && a.number === it.accountNumber) : null;
  const r = [["Reference", it.ref], ["Type", RC_KINDS[it.kind].label], ["For", rcForName(it, S0)]];
  if (it.preparedByUserId) r.push(["Prepared by", byId(S0.users, it.preparedByUserId)?.displayName || ""]);
  r.push(["Company", co(it.companyId)?.displayName || ""], ["Department", d ? `${d.code} — ${d.name}` : "—"]);
  if (acct) r.push(["Expense code", `${acct.number} — ${acct.name}`]);
  const amt = rcAmount(it);
  r.push(["Amount", it.kind === "travel" || it.kind === "card" ? (it.finance ? money(it.finance.totalCents) : `estimate ${money(amt)} — Finance records the actual`) : money(amt)]);
  return r;
}
function rcMailApprovers(S0, ctx, it, inst) {
  const v = rcVars(S0, it, ctx, { away: rcNames(S0, inst.awayUserIds || []).join(", "), approvers: rcOrList(rcNames(S0, inst.approverUserIds)) });
  rcMail(S0, ctx, inst.awayUserIds?.length ? "approval_away" : "approval", inst.approverUserIds, v, { rows: rcRows(S0, it) });
}
function rcMailDirectors(S0, ctx, it, inst) {
  if (rcHoldsExec(S0, ctx.actor.id) && !inst.__autoDirector && S0.approvalActions.some((x) => x.instanceId === inst.id && x.approverId === ctx.actor.id)) return; // a director just approved: director level is covered at once
  const ex = inst.excludeUserIds || [];
  const decided = S0.approvalActions.filter((x) => x.instanceId === inst.id).map((x) => x.approverId);
  const dirs = rcExecFallback(S0).map((u) => u.id).filter((id) => !ex.includes(id) && !decided.includes(id));
  rcMail(S0, ctx, "approval", dirs, rcVars(S0, it, ctx), { rows: rcRows(S0, it), note: `Already approved by ${rcOrList(rcNames(S0, decided))}. Director level is asked next.` });
}
const rcHist = (it, ctx, what, note) => it.history.push({ at: ctx.now, by: ctx.actor.displayName, what, note: note || "" });

/* ---------------- who may raise for whom (My Team › Request access) ---------------- */
const rcAccessOf = (S0, empId) => (S0.rcAccess || []).find((x) => x.employeeId === empId) || { employeeId: empId, ownDept: true, extra: [], outside: [] };
/** groups of people this sign-in may raise requests for (besides themself) */
function rcForWhoGroups(S0, a) {
  const active = (e) => !["TERMINATED", "INACTIVE"].includes(e.status);
  const me = a.employee ? byId(S0.employees, a.employee.id) : null;
  if (rcIsFinance(a) || a.isSuper || a.roleCodes.includes("COMPANY_ADMIN")) {
    const ids = scopeIds(S0, a);
    return [["Everyone", S0.employees.filter((e) => active(e) && ids.includes(e.companyId) && e.id !== me?.id).sort((x, y) => x.lastName.localeCompare(y.lastName))]];
  }
  if (!me) return [];
  const seen = new Set([me.id]), out = [];
  const add = (title, list) => { const l = list.filter((e) => e && active(e) && !seen.has(e.id)); l.forEach((e) => seen.add(e.id)); if (l.length) out.push([title, l]); };
  const acc = rcAccessOf(S0, me.id);
  if (acc.ownDept) add(`Your department — ${byId(S0.departments, me.departmentId)?.name || ""}`, S0.employees.filter((e) => e.departmentId === me.departmentId));
  add("Reporting to you", S0.employees.filter((e) => e.managerId === me.id));
  add("Added by your supervisor", (acc.extra || []).map((id) => byId(S0.employees, id)));
  return out;
}
const rcMayRaiseFor = (S0, a, empId) => rcForWhoGroups(S0, a).some(([, l]) => l.some((e) => e.id === empId));

/* ---------------- visibility ---------------- */
function rcCanSee(a, it, S0 = S) {
  if (!a) return false;
  if (rcIsFinance(a) || rcIsExec(a)) return true;
  if (a.roleCodes.includes("COMPANY_ADMIN") && canSee(a, it.companyId)) return true;
  const me = a.user.id;
  if (it.requestedByUserId === me || it.preparedByUserId === me || rcForUserId(S0, it) === me) return true;
  for (const iid of it.approvalIds || []) {
    const inst = byId(S0.approvals, iid); if (!inst) continue;
    if ((inst.approverUserIds || []).includes(me) || canActOn(S0, a, inst)) return true;
    if (S0.approvalActions.some((x) => x.instanceId === iid && x.approverId === me)) return true;
  }
  return false;
}

/* ---------------- reducers ---------------- */
function rcNextRef(S0, kind) {
  if (kind === "po") return nextNum([...S0.purchaseOrders.map((p) => p.poNumber), ...S0.rcRequests.filter((r) => r.kind === "po").map((r) => r.ref)], "PO-2026", 4);
  return nextNum(S0.rcRequests.filter((r) => r.kind === kind).map((r) => r.ref), `${RC_KINDS[kind].prefix}-2026`, 4);
}
function rcCheckAccount(S0, companyId, number, label = "expense code") {
  const a = S0.accounts.find((x) => x.companyId === companyId && x.number === number && x.isActive !== false);
  if (!a) fail(`Choose an ${label} that exists in this company's chart.`);
  return a;
}
function rcCheckDept(S0, companyId, depId) { const d = byId(S0.departments, depId); if (!d || d.companyId !== companyId) fail("Choose a department in the company this is for."); return d; }
/** read and validate the form for one kind; returns the fields to store */
function rcReadForm(S0, kind, p, companyId) {
  const str = (v) => String(v ?? "").trim();
  const set = S0.rcSettings;
  if (kind === "travel") {
    const to = str(p.to), reason = str(p.reason);
    if (!to) fail("Enter the destination."); if (!reason) fail("Say what the trip is for.");
    if (!p.out || !p.back) fail("Enter the departing and returning dates."); if (p.back < p.out) fail("The return date is before the departure date.");
    const est = rcCents(p.estimate); if (!(est > 0)) fail("Enter an estimated cost — it decides whether director level is needed. Finance records the actual amount.");
    return { title: `${to} — ${reason.slice(0, 44)}`, travel: { from: str(p.from) || "", to, reason, out: p.out, back: p.back, transport: str(p.transport), accommodation: str(p.accommodation), training: p.training === "Yes", estimateCents: est } };
  }
  if (kind === "card") {
    const supplier = str(p.supplier), reason = str(p.reason);
    if (!supplier) fail("Enter the supplier."); if (!reason) fail("Say what the purchase is for.");
    const lines = (p.lines || []).filter((l) => str(l.description)).map((l, i) => {
      const qty = Math.max(1, Math.round(Number(l.qty) || 1));
      const link = str(l.link); if (link && !/^https?:\/\//i.test(link)) fail(`Item ${i + 1}: the product link must start with https://`);
      const dep = l.departmentId, acct = l.accountNumber;
      if (!dep) fail(`Item ${i + 1}: choose the department.`); if (!acct) fail(`Item ${i + 1}: choose the expense code.`);
      rcCheckDept(S0, companyId, dep); rcCheckAccount(S0, companyId, acct);
      return { description: str(l.description), qty, link, departmentId: dep, accountNumber: acct };
    });
    if (!lines.length) fail("Add at least one item.");
    if (lines.length > 6) fail("Up to six items per purchase.");
    const est = rcCents(p.estimate); if (!(est > 0)) fail("Enter an estimated cost — it decides whether director level is needed. Finance records the actual amount.");
    for (const k of Object.keys(p)) if (/card.?(number|no)|cvv|cvc|expiry|exp(iry)?date/i.test(k)) fail("Card details are never entered here.");
    return { title: supplier, card: { supplier, orderRef: str(p.orderRef), reason, lines, estimateCents: est }, departmentId: lines[0].departmentId, accountNumber: lines[0].accountNumber };
  }
  if (kind === "expense") {
    const event = str(p.event); if (!event) fail("Name the meeting or event.");
    if (!p.from || !p.to) fail("Enter the first and last day."); if (p.to < p.from) fail("The last day is before the first day.");
    const hon = rcCents(p.honorarium), km = Math.max(0, Number(p.km) || 0), b = Math.max(0, Math.round(Number(p.breakfasts) || 0)), l = Math.max(0, Math.round(Number(p.lunches) || 0)), d = Math.max(0, Math.round(Number(p.dinners) || 0));
    if (hon < 0) fail("The honorarium can't be negative.");
    const mileage = Math.round(km * set.mileageCents), meals = b * set.meals.b + l * set.meals.l + d * set.meals.d;
    const total = hon + mileage + meals; if (!(total > 0)) fail("Enter an honorarium, kilometres or meals.");
    const honAcct = str(p.honorariumAccount), trvAcct = str(p.travelAccount);
    if (!honAcct) fail("Choose the expense code for the honorarium."); if (!trvAcct) fail("Choose the expense code for mileage and meals.");
    rcCheckAccount(S0, companyId, honAcct); rcCheckAccount(S0, companyId, trvAcct);
    return { title: event, expense: { event, location: str(p.location), from: p.from, to: p.to, honorariumCents: hon, km, mileageRateCents: set.mileageCents, mileageCents: mileage, breakfasts: b, lunches: l, dinners: d, mealRates: { ...set.meals }, mealsCents: meals, coding: { honorarium: honAcct, travel: trvAcct }, totalCents: total }, accountNumber: trvAcct };
  }
  if (kind === "po") {
    const desc = str(p.description); if (!desc) fail("Describe what is being ordered.");
    let vendorId = str(p.vendorId) || null, vendorName = str(p.vendorName);
    if (vendorId) { const v = byId(S0.vendors, vendorId); if (!v || v.companyId !== companyId) fail("Pick a supplier from this company's vendor list, or type a new one."); vendorName = v.name; }
    if (!vendorName) fail("Choose or type the supplier.");
    const est = p.estimate === "" || p.estimate == null ? null : rcCents(p.estimate);
    if (est != null && est < 0) fail("The estimate can't be negative.");
    return { title: desc.slice(0, 80), po: { vendorId, vendorName, newSupplier: !vendorId, description: desc, notes: str(p.notes), estimateCents: est } };
  }
  if (kind === "reimb") {
    const purpose = str(p.purpose); if (!purpose) fail("Say what you paid for and why.");
    const lines = (p.lines || []).filter((x) => str(x.what) || Number(x.amount)).map((x, i) => {
      const amt = rcCents(x.amount); if (!(amt > 0)) fail(`Line ${i + 1}: enter the amount you paid.`);
      if (!str(x.what)) fail(`Line ${i + 1}: say what it was.`); if (!x.date) fail(`Line ${i + 1}: enter the date.`);
      if (!str(x.accountNumber)) fail(`Line ${i + 1}: choose the expense code.`);
      rcCheckAccount(S0, companyId, x.accountNumber);
      return { date: x.date, what: str(x.what), accountNumber: x.accountNumber, amountCents: amt };
    });
    const km = Math.max(0, Number(p.km) || 0), mileage = Math.round(km * set.mileageCents);
    if (!lines.length && !mileage) fail("Add at least one thing you paid for, or kilometres driven.");
    const mileAcct = str(p.mileageAccount);
    if (mileage) { if (!mileAcct) fail("Choose the expense code for the mileage."); rcCheckAccount(S0, companyId, mileAcct); }
    const total = lines.reduce((s, x) => s + x.amountCents, 0) + mileage;
    return { title: purpose.slice(0, 80), reimb: { purpose, lines, km, mileageRateCents: set.mileageCents, mileageCents: mileage, mileageAccount: mileage ? mileAcct : null, totalCents: total }, accountNumber: lines[0]?.accountNumber || mileAcct };
  }
  fail("Unknown request type.");
}
function rcStart(S0, ctx, it) {
  const amount = rcAmount(it);
  const wf = it.kind === "expense" && it.external ? "RC_EXPENSE_EXT" : RC_KINDS[it.kind].wf;
  const label = `${RC_KINDS[it.kind].label} ${it.ref} — ${it.title}`;
  const inst = startApproval(S0, ctx, { workflowCode: wf, companyId: it.companyId, entityType: "RcRequest", entityId: it.id, entityLabel: label, amountCents: amount, forEmployeeId: it.forEmployeeId || ctx.auth.employee?.id || null, excludeUserIds: [it.requestedByUserId, it.preparedByUserId].filter(Boolean) });
  if (!inst) fail("No approval route is set up for this kind of request.");
  it.approvalIds = [...(it.approvalIds || []), inst.id]; it.currentApprovalId = inst.id;
  it.status = "submitted"; it.submittedAt = ctx.now;
  const awayNote = inst.awayUserIds?.length ? `${rcNames(S0, inst.awayUserIds).join(", ")} on time off — also sent to ${rcNames(S0, inst.approverUserIds.filter((x) => !inst.awayUserIds.includes(x))).join(", ")}` : "";
  rcHist(it, ctx, "Submitted", awayNote);
  rcMail(S0, ctx, "received", rcForAndBy(S0, it), rcVars(S0, it, ctx, { approver: rcOrList(rcNames(S0, inst.approverUserIds || [])) || whoIsNext(S0, inst) }), { rows: rcRows(S0, it) });
  ctx.audit({ module: "requests", action: "SUBMIT", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${ctx.actor.displayName} submitted ${label} → ${rcOrList(rcNames(S0, inst.approverUserIds || [])) || whoIsNext(S0, inst)}${awayNote ? ` (${awayNote})` : ""}.` });
  return inst;
}
function rcPoReady(S0, ctx, it, note) {
  const dirs = S0.approvalActions.filter((x) => (it.approvalIds || []).includes(x.instanceId) && x.action === "APPROVED").map((x) => x.approverName);
  it.status = "ready"; it.po.approvedAt = ctx.now; it.po.approverNames = [...new Set(dirs)];
  if (it.po.invoice) it.po.approvedCents = it.po.invoice.amountCents; else it.po.approvedCents = it.po.estimateCents;
  let po = it.purchaseOrderId ? byId(S0.purchaseOrders, it.purchaseOrderId) : null;
  const amt = it.po.approvedCents || 0;
  if (!po) {
    po = { id: ctx.id("po"), companyId: it.companyId, poNumber: it.ref, description: it.po.description, vendorId: it.po.vendorId || undefined, vendorName: it.po.vendorName, amountCents: amt, subtotalCents: amt, taxCents: 0, totalCents: amt, status: "SENT", orderDate: ctx.now.slice(0, 10), requesterName: rcForName(it, S0), createdByName: ctx.actor.displayName, createdAt: ctx.now, notes: it.po.notes || undefined, departmentId: it.departmentId, accountNumber: it.accountNumber, sourceRcId: it.id, approvedAt: ctx.now, approverNames: it.po.approverNames };
    S0.purchaseOrders.push(po); it.purchaseOrderId = po.id;
  } else Object.assign(po, { amountCents: amt, subtotalCents: amt, totalCents: amt, approvedAt: ctx.now, approverNames: it.po.approverNames });
  rcHist(it, ctx, "Approved — PO ready", note);
  rcMail(S0, ctx, "po_ready", rcForAndBy(S0, it), rcVars(S0, it, ctx), { rows: rcRows(S0, it), note, attach: [{ name: `${it.ref}.pdf`, rcId: it.id }] });
  ctx.audit({ module: "procurement", action: "APPROVE", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${it.ref} approved — purchase order ready to print (${it.po.vendorName}, ${amt ? money(amt) : "amount to follow"}).` });
}
function rcGet(S0, id) { const it = byId(S0.rcRequests || [], id); if (!it) fail("That request no longer exists."); return it; }

Object.assign(R, {
  "rc.submit"(S0, p, ctx) {
    const kind = p.kind;
    if (!RC_KINDS[kind]) fail("Unknown request type.");
    let forEmp = null, external = null;
    if (p.forWho === "external") {
      if (kind !== "expense") fail("Only expense claims can be for someone outside the organization.");
      const name = String(p.external?.name || "").trim(); if (!name) fail("Enter the full name of the person outside the organization.");
      external = { name, role: RC_OUTSIDE_ROLES.includes(p.external.role) ? p.external.role : "Community member", address: String(p.external.address || "").trim(), payBy: p.external.payBy === "Direct deposit" ? "Direct deposit — details held by Finance" : "Cheque" };
      if (!ctx.auth.employee) fail("This sign-in isn't linked to an employee record.");
      forEmp = byId(S0.employees, ctx.auth.employee.id);
    } else if (p.forWho && p.forWho !== ctx.auth.employee?.id) {
      forEmp = byId(S0.employees, p.forWho);
      if (!forEmp) fail("Choose who this is for.");
      if (!rcMayRaiseFor(S0, ctx.auth, forEmp.id)) fail(`You can't raise requests for ${empName(forEmp)}. Your supervisor can add them for you.`);
    } else {
      if (!ctx.auth.employee) fail("This sign-in isn't linked to an employee record — choose who it is for.");
      forEmp = byId(S0.employees, ctx.auth.employee.id);
    }
    const companyId = forEmp.companyId;
    ctx.company(companyId);
    const f = rcReadForm(S0, kind, p, companyId);
    const depId = f.departmentId || p.departmentId;
    if (!depId) fail("Choose the department.");
    rcCheckDept(S0, companyId, depId);
    const acctNo = f.accountNumber || p.accountNumber;
    if (!acctNo) fail("Choose the expense code.");
    rcCheckAccount(S0, companyId, acctNo);
    const files = (p.files || []).filter((x) => x && x.name);
    for (const x of files) if (!FILE_TYPES.includes(x.type)) fail(`${x.name}: only PDF, JPG and PNG files can be attached.`);
    if (files.length > 8) fail("Up to 8 attachments.");
    const isMine = forEmp.id === ctx.auth.employee?.id;
    const it = { id: ctx.id("rq"), kind, ref: rcNextRef(S0, kind), companyId, departmentId: depId, accountNumber: acctNo || null, forEmployeeId: forEmp.id, external, requestedByUserId: ctx.actor.id, preparedByUserId: isMine ? null : ctx.actor.id, title: f.title, status: "draft", createdAt: ctx.now, history: [], comments: [], approvalIds: [] };
    delete f.title; delete f.departmentId; delete f.accountNumber; Object.assign(it, f);
    S0.rcRequests.push(it);
    S0.files = S0.files || [];
    files.forEach((x) => S0.files.push({ id: ctx.id("fl"), entityType: "RcRequest", entityId: it.id, companyId, fileName: String(x.name).slice(0, 120), mimeType: x.type, sizeBytes: Number(x.size) || 0, data: x.data && String(x.data).length < FILE_KEEP_MAX * 1.4 ? x.data : undefined, uploadedByName: ctx.actor.displayName, createdAt: ctx.now }));
    rcStart(S0, ctx, it);
  },
  "rc.return"(S0, p, ctx) {
    const it = rcGet(S0, p.id), inst = byId(S0.approvals, it.currentApprovalId);
    const note = String(p.note || "").trim(); if (!note) fail("A comment is required when you return something. Say what needs fixing.");
    if (!inst || !canActOn(S0, ctx.auth, inst)) fail("This isn't waiting on you.");
    S0.approvalActions.push({ id: ctx.id("aa"), instanceId: inst.id, stepSequence: inst.currentStep, stepName: activeSteps(S0, inst).find((s) => s.sequence === inst.currentStep)?.name || "", approverId: ctx.actor.id, approverName: ctx.actor.displayName, action: "RETURNED", comment: note, actedAt: ctx.now });
    Object.assign(inst, { status: "RETURNED", completedAt: ctx.now });
    it.status = "returned"; rcHist(it, ctx, "Returned for correction", note);
    rcMail(S0, ctx, "returned", rcForAndBy(S0, it), rcVars(S0, it, ctx), { note });
    ctx.audit({ module: "requests", action: "RETURN", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${ctx.actor.displayName} returned ${it.ref} — “${note}”.` });
  },
  "rc.resubmit"(S0, p, ctx) {
    const it = rcGet(S0, p.id);
    if (![it.requestedByUserId, it.preparedByUserId].includes(ctx.actor.id)) fail("Only the person who raised it can resubmit it.");
    if (it.status !== "returned") fail("Only a returned request can be resubmitted.");
    if (p.fields) { p = { ...p, fields: { ...rcFormValues(it), lines: rcFormLines(it), ...p.fields } }; const f = rcReadForm(S0, it.kind, { ...p.fields }, it.companyId); const dep = f.departmentId || p.fields.departmentId || it.departmentId; rcCheckDept(S0, it.companyId, dep); it.departmentId = dep; if (f.accountNumber || p.fields.accountNumber) { it.accountNumber = f.accountNumber || p.fields.accountNumber; rcCheckAccount(S0, it.companyId, it.accountNumber); } it.title = f.title; it[it.kind] = f[it.kind]; }
    rcHist(it, ctx, "Corrected and resubmitted", "");
    rcStart(S0, ctx, it);
  },
  "rc.withdraw"(S0, p, ctx) {
    const it = rcGet(S0, p.id);
    if (![it.requestedByUserId, it.preparedByUserId].includes(ctx.actor.id)) fail("Only the person who raised it can withdraw it.");
    if (!["submitted", "awaiting_director", "returned"].includes(it.status)) fail("It can't be withdrawn now — it has already been decided.");
    const inst = byId(S0.approvals, it.currentApprovalId); if (inst && inst.status === "PENDING") Object.assign(inst, { status: "CANCELLED", completedAt: ctx.now });
    it.status = "withdrawn"; rcHist(it, ctx, "Withdrawn", String(p.note || "").trim());
    ctx.audit({ module: "requests", action: "STATUS_CHANGE", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${ctx.actor.displayName} withdrew ${it.ref}. Kept on record.` });
  },
  "rc.comment"(S0, p, ctx) {
    const it = rcGet(S0, p.id), text = String(p.text || "").trim();
    if (!text) fail("Write the comment first."); if (text.length > 1000) fail("Keep comments under 1,000 characters.");
    if (!rcCanSee(ctx.auth, it, S0)) fail("You can't see this request.");
    it.comments.push({ at: ctx.now, by: ctx.actor.displayName, byUserId: ctx.actor.id, text });
    const inst = byId(S0.approvals, it.currentApprovalId);
    const others = [...rcForAndBy(S0, it), ...(inst?.approverUserIds || [])].filter((id) => id !== ctx.actor.id);
    rcMail(S0, ctx, "comment", others, rcVars(S0, it, ctx), { note: text });
    ctx.audit({ module: "requests", action: "COMMENT", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${ctx.actor.displayName} commented on ${it.ref}: “${text.slice(0, 80)}”` });
  },
  /* Finance: travel and card purchases — record what was charged (GST, PST), attach the confirmation, post to the ledger */
  "rc.process"(S0, p, ctx) {
    if (!rcIsFinance(ctx.auth)) fail("Only Finance can process requests.");
    const it = rcGet(S0, p.id); ctx.company(it.companyId);
    if (!["travel", "card"].includes(it.kind)) fail("Only travel and card purchases are processed this way.");
    if (it.status !== "approved") fail("It isn't waiting for Finance.");
    const lines = it.kind === "card" ? it.card.lines : [{ description: `Travel — ${it.travel.to}`, departmentId: it.departmentId, accountNumber: it.accountNumber }];
    const subs = (p.subtotals || []).map(rcCents);
    if (subs.length !== lines.length || subs.some((x) => !(x > 0))) fail(lines.length > 1 ? "Enter the amount before tax for every item." : "Enter the amount charged before tax.");
    const gst = rcCents(p.gst), pst = rcCents(p.pst);
    if (gst < 0 || pst < 0) fail("Taxes can't be negative.");
    const link = String(p.link || "").trim(), file = p.file && p.file.name ? p.file : null;
    if (!file && !link) fail("Attach the confirmation — a file, or a link to the confirmation email. It is required.");
    if (link && !/^https?:\/\//i.test(link)) fail("The confirmation link must start with https://");
    if (file && !FILE_TYPES.includes(file.type)) fail("The confirmation must be a PDF, JPG or PNG.");
    const sub = subs.reduce((s, x) => s + x, 0), total = sub + gst + pst;
    // PST is not recoverable: it is spread over the expense lines; GST goes to GST receivable
    let pstLeft = pst;
    const jl = lines.map((l, i) => { const share = i === lines.length - 1 ? pstLeft : Math.round((pst * subs[i]) / sub); pstLeft -= share; return { accountNumber: l.accountNumber, debitCents: subs[i] + share, description: `${it.ref} · ${l.description}`.slice(0, 120), departmentId: l.departmentId }; });
    if (gst) jl.push({ accountNumber: GL.GST_REC, debitCents: gst, description: `GST on ${it.ref}` });
    jl.push({ accountNumber: "2140", creditCents: total, description: `${it.ref} on the company card` });
    const je = postJournal(S0, ctx, { companyId: it.companyId, date: ctx.now.slice(0, 10), memo: `${RC_KINDS[it.kind].label} ${it.ref} — ${it.title}`, source: "REQUESTS", sourceType: "RcRequest", sourceId: it.id, reference: it.ref, lines: jl });
    let fileId = null;
    if (file) { fileId = ctx.id("fl"); S0.files.push({ id: fileId, entityType: "RcRequest", entityId: it.id, companyId: it.companyId, fileName: String(file.name).slice(0, 120), mimeType: file.type, sizeBytes: Number(file.size) || 0, data: file.data && String(file.data).length < FILE_KEEP_MAX * 1.4 ? file.data : undefined, uploadedByName: ctx.actor.displayName, createdAt: ctx.now, isConfirmation: true }); }
    it.finance = { subtotals: subs, subtotalCents: sub, gstCents: gst, pstCents: pst, totalCents: total, confirmationFileId: fileId, confirmationLink: link || null, note: String(p.note || "").trim(), by: ctx.actor.displayName, at: ctx.now, journalEntryId: je.id };
    it.status = "processed"; rcHist(it, ctx, "Processed — confirmation attached", `${money(total)} including GST ${money(gst)} and PST ${money(pst)} · ${je.entryNumber}`);
    rcMail(S0, ctx, "processed", rcForAndBy(S0, it), rcVars(S0, it, ctx), { rows: [...rcRows(S0, it), ["Before tax", money(sub)], ["GST", money(gst)], ["PST", money(pst)]] });
    ctx.audit({ module: "requests", action: "POST", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${ctx.actor.displayName} processed ${it.ref}: ${money(total)} incl. GST and PST, posted ${je.entryNumber}.` });
  },
  /* Finance: expense and reimbursement claims — record as paid, post to the ledger */
  "rc.pay"(S0, p, ctx) {
    if (!rcIsFinance(ctx.auth)) fail("Only Finance can record payments.");
    const it = rcGet(S0, p.id); ctx.company(it.companyId);
    if (!["expense", "reimb"].includes(it.kind)) fail("Only claims are paid this way.");
    if (it.status !== "approved") fail("It isn't waiting for Finance.");
    const via = ["Payroll — next run", "Direct deposit", "Cheque"].includes(p.via) ? p.via : fail("Choose how it was paid.");
    const ref = String(p.ref || "").trim();
    const jl = [];
    if (it.kind === "expense") {
      const x = it.expense;
      if (x.honorariumCents) jl.push({ accountNumber: x.coding.honorarium, debitCents: x.honorariumCents, description: `${it.ref} honorarium`, departmentId: it.departmentId });
      if (x.mileageCents + x.mealsCents) jl.push({ accountNumber: x.coding.travel, debitCents: x.mileageCents + x.mealsCents, description: `${it.ref} mileage and meals`, departmentId: it.departmentId });
    } else {
      const x = it.reimb;
      for (const l of x.lines) jl.push({ accountNumber: l.accountNumber, debitCents: l.amountCents, description: `${it.ref} · ${l.what}`.slice(0, 120), departmentId: it.departmentId });
      if (x.mileageCents) jl.push({ accountNumber: x.mileageAccount || S0.rcSettings.coding.travel, debitCents: x.mileageCents, description: `${it.ref} mileage`, departmentId: it.departmentId });
    }
    const total = jl.reduce((s, l) => s + l.debitCents, 0);
    jl.push({ accountNumber: via === "Payroll — next run" ? "2130" : GL.BANK, creditCents: total, description: `${it.ref} paid — ${via}` });
    const je = postJournal(S0, ctx, { companyId: it.companyId, date: ctx.now.slice(0, 10), memo: `${RC_KINDS[it.kind].label} ${it.ref} paid — ${rcForName(it, S0)}`, source: "REQUESTS", sourceType: "RcRequest", sourceId: it.id, reference: ref || it.ref, lines: jl });
    if (via !== "Payroll — next run") bankTxn(S0, ctx, it.companyId, ctx.now.slice(0, 10), `${it.ref} ${rcForName(it, S0)}`, -total, "PAYMENT");
    it.paid = { via, reference: ref, note: String(p.note || "").trim(), by: ctx.actor.displayName, at: ctx.now, journalEntryId: je.id, totalCents: total };
    it.status = "processed"; rcHist(it, ctx, "Recorded as paid", [via, ref, it.paid.note].filter(Boolean).join(" · "));
    rcMail(S0, ctx, "paid", rcForAndBy(S0, it), rcVars(S0, it, ctx), { rows: [...rcRows(S0, it), ["Paid through", via], ["Payment reference", ref || "—"]] });
    ctx.audit({ module: "requests", action: "POST", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${ctx.actor.displayName} recorded ${it.ref} as paid (${via}${ref ? `, ${ref}` : ""}), ${money(total)} posted ${je.entryNumber}.` });
  },
  /* Finance: the invoice amount for a purchase order — within tolerance it is recorded, beyond it needs reapproval */
  "rc.po.amount"(S0, p, ctx) {
    if (!rcIsFinance(ctx.auth)) fail("Only Finance records invoice amounts.");
    const it = rcGet(S0, p.id); ctx.company(it.companyId);
    if (it.kind !== "po" || it.status !== "ready") fail("Only a ready purchase order can take an invoice amount.");
    const amt = rcCents(p.amount), reason = String(p.reason || "").trim();
    if (!(amt > 0)) fail("Enter the invoice amount."); if (!reason) fail("Say why the amount is changing.");
    const base = it.po.approvedCents || 0, pct = base ? (Math.abs(amt - base) / base) * 100 : 0;
    it.po.invoice = { amountCents: amt, reason, by: ctx.actor.displayName, at: ctx.now };
    const po = byId(S0.purchaseOrders, it.purchaseOrderId);
    if (base && pct > S0.rcSettings.tolerancePct) {
      it.status = "reapproval"; rcHist(it, ctx, "Amount changed — reapproval required", `${money(base)} → ${money(amt)} (${pct.toFixed(1)}%) · ${reason}`);
      const inst = startApproval(S0, ctx, { workflowCode: "PURCHASE_ORDER", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, entityLabel: `Purchase order ${it.ref} — reapproval (${money(amt)})`, amountCents: amt, forEmployeeId: it.forEmployeeId, excludeUserIds: [it.requestedByUserId, it.preparedByUserId].filter(Boolean) });
      if (inst) { it.approvalIds.push(inst.id); it.currentApprovalId = inst.id; }
      ctx.audit({ module: "procurement", action: "UPDATE", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${it.ref} invoice ${money(amt)} is ${pct.toFixed(1)}% off the approved ${money(base)} — beyond the ${S0.rcSettings.tolerancePct}% tolerance, sent for reapproval.` });
    } else {
      it.po.approvedCents = amt; if (po) Object.assign(po, { amountCents: amt, subtotalCents: amt, totalCents: amt });
      rcHist(it, ctx, base ? "Amount changed" : "Amount recorded", `${base ? `${money(base)} → ` : ""}${money(amt)}${base ? ` (${pct.toFixed(1)}%)` : ""} · ${reason}`);
      ctx.audit({ module: "procurement", action: "UPDATE", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${it.ref} invoice amount ${money(amt)} recorded${base ? ` (${pct.toFixed(1)}%, within tolerance)` : ""}.` });
    }
  },
  "rc.po.close"(S0, p, ctx) {
    if (!rcIsFinance(ctx.auth)) fail("Only Finance closes purchase orders.");
    const it = rcGet(S0, p.id); ctx.company(it.companyId);
    if (it.kind !== "po" || it.status !== "ready") fail("Only a ready purchase order can be closed.");
    it.status = "closed"; it.po.closedAt = ctx.now; it.po.closedBy = ctx.actor.displayName;
    const po = byId(S0.purchaseOrders, it.purchaseOrderId); if (po && ["SENT", "PARTIALLY_RECEIVED", "RECEIVED"].includes(po.status)) Object.assign(po, { status: "CLOSED", closedAt: ctx.now });
    rcHist(it, ctx, "Closed against the invoice", String(p.note || "").trim());
    ctx.audit({ module: "procurement", action: "STATUS_CHANGE", companyId: it.companyId, entityType: "RcRequest", entityId: it.id, summary: `${ctx.actor.displayName} closed ${it.ref} against the invoice.` });
  },
  "rc.settings"(S0, p, ctx) {
    if (!rcIsFinance(ctx.auth) && !rcIsAdmin(ctx.auth)) fail("Only Finance or an administrator can change rates.");
    const s = S0.rcSettings, num = (v, min, max, label) => { const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) fail(`${label} must be between ${min} and ${max}.`); return n; };
    const next = { ...s, meals: { ...s.meals }, coding: { ...s.coding }, fields: { ...s.fields } };
    if (p.mileage != null) next.mileageCents = Math.round(num(p.mileage, 0, 5, "Mileage") * 100);
    if (p.meals) next.meals = { b: Math.round(num(p.meals.b, 0, 500, "Breakfast") * 100), l: Math.round(num(p.meals.l, 0, 500, "Lunch") * 100), d: Math.round(num(p.meals.d, 0, 500, "Dinner") * 100) };
    if (p.gst != null) next.gstPct = num(p.gst, 0, 20, "GST %");
    if (p.pst != null) next.pstPct = num(p.pst, 0, 20, "PST %");
    if (p.coding) { for (const k of ["honorarium", "travel"]) if (p.coding[k] && !S0.accounts.some((a) => a.number === p.coding[k])) fail("Choose an existing account."); next.coding = { ...next.coding, ...p.coding }; }
    if (p.formAccounts) { if (!p.formAccounts.length) fail("Offer at least one expense code."); next.formAccounts = p.formAccounts.filter((n) => S0.accounts.some((a) => a.number === n)); }
    if (p.fields) next.fields = { ...next.fields, ...p.fields };
    if (p.threshold != null || p.tolerance != null) {
      if (!rcIsAdmin(ctx.auth) && !rcIsFinance(ctx.auth)) fail("Only an administrator can change approval limits.");
      if (p.threshold != null) { next.poThresholdCents = Math.round(num(p.threshold, 0, 10000000, "Threshold") * 100); const wf = S0.workflows.find((w) => w.code === "PURCHASE_ORDER"); const st = wf && S0.workflowSteps.find((x) => x.workflowId === wf.id && x.roleCode === "EXECUTIVE"); if (st) st.thresholdMinCents = next.poThresholdCents + 1; }
      if (p.tolerance != null) next.tolerancePct = num(p.tolerance, 0, 100, "Tolerance");
    }
    S0.rcSettings = next;
    ctx.audit({ module: "requests", action: "SETTINGS", summary: `${ctx.actor.displayName} changed request rates and coding: mileage ${money(next.mileageCents)}/km, meals ${money(next.meals.b)} / ${money(next.meals.l)} / ${money(next.meals.d)}, GST ${next.gstPct}%, PST ${next.pstPct}%, honoraria → ${next.coding.honorarium}, travel → ${next.coding.travel}, PO director level over ${money(next.poThresholdCents)}, tolerance ${next.tolerancePct}%.` });
  },
  "rc.template"(S0, p, ctx) {
    if (!rcIsAdmin(ctx.auth)) fail("Only an administrator can change email wording.");
    if (!RC_TPL[p.key]) fail("Unknown email.");
    const subject = String(p.subject || "").trim(), intro = String(p.intro || "").trim();
    if (!subject || !intro) fail("Both the subject and the opening paragraph are needed.");
    if (/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/.test(subject + intro)) fail("Never put card numbers in an email.");
    S0.emailTemplates = { ...(S0.emailTemplates || {}), [p.key]: { subject, intro } };
    ctx.audit({ module: "admin", action: "SETTINGS", summary: `${ctx.actor.displayName} changed the “${RC_TPL[p.key].name}” email: ${subject}` });
  },
  "rc.access"(S0, p, ctx) {
    const emp = byId(S0.employees, p.employeeId); if (!emp) fail("That person no longer exists.");
    const isSup = ctx.auth.employee && emp.managerId === ctx.auth.employee.id;
    if (!isSup && !rcIsAdmin(ctx.auth)) fail("Only their supervisor or an administrator can change this.");
    const cur = rcAccessOf(S0, emp.id), next = { ...cur, extra: [...(cur.extra || [])], outside: [...(cur.outside || [])] };
    let what = "";
    if (p.ownDept != null) { next.ownDept = !!p.ownDept; what = next.ownDept ? `may raise for their department` : `no longer raises for their department`; }
    if (p.addExtra) { const x = byId(S0.employees, p.addExtra); if (!x) fail("Pick a person from the list."); if (!next.extra.includes(x.id)) next.extra.push(x.id); what = `may now raise requests for ${empName(x)}`; }
    if (p.removeExtra) { next.extra = next.extra.filter((id) => id !== p.removeExtra); what = `no longer raises requests for ${empName(byId(S0.employees, p.removeExtra))}`; }
    if (p.addOutside) { const n = String(p.addOutside).trim(); if (!n) fail("Type the person's name."); if (!next.outside.includes(n)) next.outside.push(n); what = `may now claim expenses for ${n} (outside the organization)`; }
    if (p.removeOutside) { next.outside = next.outside.filter((n) => n !== p.removeOutside); what = `no longer claims for ${p.removeOutside}`; }
    Object.assign(next, { by: ctx.actor.displayName, at: ctx.now });
    S0.rcAccess = [...(S0.rcAccess || []).filter((x) => x.employeeId !== emp.id), next];
    rcMail(S0, ctx, "access", [rcUser(S0, emp.id)?.id], { title: what, approver: ctx.actor.displayName });
    ctx.audit({ module: "requests", action: "UPDATE", companyId: emp.companyId, summary: `${ctx.actor.displayName}: ${empName(emp)} ${what}.` });
  },
});

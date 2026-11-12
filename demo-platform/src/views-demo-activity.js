/* ==========================================================================
   views-demo-activity.js — fictional everyday activity so every module has
   something to approve and a trail in the audit log: two pay periods of
   timesheets (approved, sent back, waiting), time-off requests (approved,
   declined, waiting), certificate renewals, task progress and notes, and an
   accountant's journal entry. It runs the real event handlers, so the
   approvals, notifications and audit entries are the same as when a person
   does it. Dates follow today's pay period, so the demo always looks current.
   Runs inside freshState after the one-company fold; ids are fixed so the
   replay is identical every time.
   ========================================================================== */
{
  const _freshStateAct = freshState;
  freshState = function () {
    const S0 = _freshStateAct();
    const nN = S0.notifications.length, nE = S0.emails.length;
    S0.actSeedErrors = [];
    let seq = 0;
    const today = todayStr();
    const at = (day, h = 0) => { const d = new Date(`${day}T16:00:00Z`); d.setUTCMinutes(d.getUTCMinutes() + h * 60 + (seq * 7) % 50); const lim = Date.now() - (300 - seq) * 60e3; return new Date(Math.min(d.getTime(), lim)).toISOString(); };
    const run = (actor, type, p, when) => { try { applyEvent(S0, { id: `act${String(++seq).padStart(4, "0")}`, ts: when, actor, actorName: "", type, p }); return true; } catch (e) { S0.actSeedErrors.push(`${type}: ${e.message}`); return false; } };
    const userOf = (empId) => S0.users.find((u) => u.employeeId === empId)?.id;
    const emp = (id) => byId(S0.employees, id);
    const cur = periodStartFor(today), p1 = addDays(cur, -14), p2 = addDays(cur, -28);
    const weekdays = (start, e, long) => { const out = []; for (let d = 0; d < 14; d++) { const dt = addDays(start, d), wd = new Date(dt + "T12:00:00Z").getUTCDay(); if (wd > 0 && wd < 6) out.push({ date: dt, worked: long === d ? 9 : 7, departmentId: e.departmentId }); } return out; };
    const people = S0.employees.filter((e) => ["ACTIVE", "ONBOARDING"].includes(e.status) && userOf(e.id)).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    // ---- HR: timesheets for the last two pay periods ----
    for (const [period, round] of [[p2, 2], [p1, 1]]) {
      people.forEach((e, i) => {
        if (S0.timesheets.some((t) => t.employeeId === e.id && t.periodStart === period)) return;
        const sentOn = addDays(period, 14);
        if (!run(userOf(e.id), "timesheet.save", { periodStart: period, entries: weekdays(period, e, i % 4 === 1 ? 2 : -1), submit: true }, at(sentOn, i * 0.1))) return;
        const sheet = S0.timesheets.find((t) => t.employeeId === e.id && t.periodStart === period), mgr = e.managerId ? userOf(e.managerId) : null;
        if (!sheet || !mgr) return;
        if (round === 1 && i % 7 === 3) run(mgr, "timesheet.decide", { timesheetId: sheet.id, decision: "REJECTED", reason: "Please add the hours for the safety training on the Wednesday." }, at(addDays(sentOn, 1), i * 0.1));
        else if (round === 2 || i % 5 !== 2) run(mgr, "timesheet.decide", { timesheetId: sheet.id, decision: "APPROVED" }, at(addDays(sentOn, 1), 1 + i * 0.1));
      });
    }

    // ---- HR: time off — approved, declined and waiting ----
    const vac = S0.leaveTypes.find((t) => t.code === "VACATION")?.id, sick = S0.leaveTypes.find((t) => t.code === "SICK")?.id;
    const leave = (empId, typeId, start, end, notes, when, decision, comment) => {
      if (!typeId || !run(userOf(empId), "leave.request", { leaveTypeId: typeId, start, end, notes, files: [] }, when)) return;
      const lr = S0.leaveRequests[S0.leaveRequests.length - 1], inst = S0.approvals.find((a) => a.entityType === "LeaveRequest" && a.entityId === lr.id && a.status === "PENDING");
      const e = emp(empId), mgr = e?.managerId ? userOf(e.managerId) : null;
      if (decision && inst && mgr) run(mgr, "approval.decide", { instanceId: inst.id, decision, comment: comment || "" }, at(addDays(when.slice(0, 10), 1)));
    };
    const nextMon = addDays(cur, 14 + 7);
    leave("e13", vac, addDays(nextMon, 0), addDays(nextMon, 2), "Family visit", at(addDays(cur, -3)), "APPROVED", "Enjoy the time off.");
    leave("e17", vac, addDays(nextMon, 7), addDays(nextMon, 11), "Hunting trip", at(addDays(cur, -2)), "REJECTED", "Two of the crew are already away that week. Could you take the week after?");
    leave("e12", sick, addDays(cur, 1), addDays(cur, 1), "Dentist appointment", at(addDays(cur, -1)));
    leave("e18", vac, addDays(nextMon, 14), addDays(nextMon, 18), "Holiday", at(addDays(cur, 0)));

    // ---- HR: a certificate renewed by HR ----
    const certs = (S0.certifications || []).filter((c) => c.expiryDate);
    const later = certs.filter((c) => c.expiryDate > today).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    if (later[3]) run("u3", "cert.renew", { id: later[3].id, expiryDate: addDays(later[3].expiryDate, 365 * 3), issuedDate: addDays(today, -4) }, at(addDays(today, -4)));

    // ---- HR: someone leaving — offboarding started, a few steps done ----
    if (R["offboarding.start"] && emp("e10") && run("u3", "offboarding.start", { employeeId: "e10", lastDay: addDays(today, 18), reasonCode: "E" }, at(addDays(today, -6)))) {
      const o = S0.offboarding[S0.offboarding.length - 1];
      run("u3", "offboarding.toggle", { id: o.id, key: "notice" }, at(addDays(today, -6), 0.5));
      run("u3", "offboarding.toggle", { id: o.id, key: "exit" }, at(addDays(today, -3)));
      run("u3", "offboarding.toggle", { id: o.id, key: "handover" }, at(addDays(today, -1)));
    }

    // ---- HR: the new starter's first onboarding steps ----
    for (const t of S0.onboardingTasks.filter((x) => x.employeeId === "e14" && x.status !== "COMPLETE").sort((x, y) => x.sortOrder - y.sortOrder).slice(0, 2)) run("u3", "onboarding.toggle", { taskId: t.id }, at(addDays(today, -5)));

    // ---- Team: progress and notes on tasks ----
    const tk = (id) => byId(S0.tasks || [], id);
    if (tk("tk1")) { run("u1", "task.progress", { taskId: "tk1", percent: 75 }, at(addDays(today, -2))); run("u1", "task.note", { taskId: "tk1", note: "North boundary walked and flagged. South side left for Monday." }, at(addDays(today, -2), 0.5)); }
    for (const t of (S0.tasks || []).filter((x) => x.status === "IN_PROGRESS" && x.id !== "tk1").slice(0, 2)) {
      const u = userOf(t.assigneeId); if (!u) continue;
      run(u, "task.note", { taskId: t.id, note: "Started on this. I will update the progress at the end of the week." }, at(addDays(today, -1)));
    }

    // ---- Finance: the accountant posts a month-end accrual ----
    {
      const co = S0.companies[0]?.id;
      const acct = (type, re) => S0.accounts.find((a) => a.companyId === co && a.type === type && a.isPostable !== false && !a.isIntercompany && re.test(a.name));
      const exp = acct("EXPENSE", /utilit|telephone|office|repair|maint/i) || acct("EXPENSE", /./), lia = acct("LIABILITY", /accrued/i) || acct("LIABILITY", /payable/i);
      if (co && exp && lia) run("u11", "journal.manual", { companyId: co, date: addDays(cur, -1), memo: "Month-end accrual: utilities used but not yet billed", lines: [
        { accountNumber: exp.number, description: "Utilities accrual", debitCents: 184500, creditCents: 0 },
        { accountNumber: lia.number, description: "Utilities accrual", debitCents: 0, creditCents: 184500 }] }, at(addDays(cur, -1), 2));
    }

    // the demo starts with clean inboxes: keep what the handlers recorded, not the messages they sent
    S0.notifications.length = nN; S0.emails.length = nE;
    return S0;
  };
}
